'use strict';

const {Pool}=require('pg');
const {Brand365Store}=require('./brand365-store');
const {verifyProviderMembership}=require('./social-providers');

const DATABASE_URL=process.env.DATABASE_URL||'';
const TELEGRAM_BOT_TOKEN=process.env.MFW_TELEGRAM_BOT_TOKEN||'';
const VK_SERVICE_TOKEN=process.env.MFW_VK_SERVICE_TOKEN||'';
const VK_API_VERSION=process.env.MFW_VK_API_VERSION||'5.199';
const BATCH_SIZE=Math.max(1,Math.min(1000,Number(process.env.MFW_REVERIFY_BATCH_SIZE||250)));

function emptyMemory(){
  return {
    brands:[],socialChannels:[],loyaltyOffers:[],brandPosts:[],
    socialConnections:new Map(),socialMemberships:new Map(),
    brandFollows:new Map(),brandAccess:new Map(),appInstallations:new Map(),
    loyaltyClaims:new Map(),notificationPreferences:new Map(),
    notifications:[],contentInteractions:[]
  };
}

async function main(){
  if(!DATABASE_URL)throw new Error('DATABASE_URL is required for social reverification cron');
  const pool=new Pool({connectionString:DATABASE_URL,max:3,connectionTimeoutMillis:5000,idleTimeoutMillis:15000});
  const store=new Brand365Store({pool,memory:emptyMemory()});
  let run=null;
  const result={
    triggerSource:'cron',
    checked:0,active:0,inactive:0,skipped:0,revokedClaims:0,
    errors:[],skippedReasons:{},startedAt:new Date().toISOString()
  };
  try{
    const schema=await pool.query("SELECT to_regclass('public.social_reverification_runs') AS runs, to_regclass('public.social_memberships') AS memberships");
    if(!schema.rows[0].runs||!schema.rows[0].memberships)throw new Error('Brand365 persistence migrations are not applied');

    run=await store.beginReverificationRun('cron');
    const candidates=await store.activeMembershipCandidates(BATCH_SIZE);

    for(const candidate of candidates){
      const membership=candidate.membership;
      const channel=candidate.channel;
      if(!channel){
        result.skipped++;
        result.skippedReasons.channel_missing=(result.skippedReasons.channel_missing||0)+1;
        continue;
      }
      try{
        const verification=await verifyProviderMembership({
          store,
          userId:membership.userId,
          channel,
          telegramBotToken:TELEGRAM_BOT_TOKEN,
          vkServiceToken:VK_SERVICE_TOKEN,
          vkApiVersion:VK_API_VERSION
        });
        if(!verification.ok){
          result.skipped++;
          const reason=String(verification.error||'verification_unavailable');
          result.skippedReasons[reason]=(result.skippedReasons[reason]||0)+1;
          if(!['provider_not_configured','social_connection_required','verification_not_supported'].includes(reason)){
            result.errors.push({userId:membership.userId,channelId:channel.id,error:reason});
          }
          continue;
        }

        result.checked++;
        const updated=await store.applyMembershipObservation(membership.userId,channel,verification,null);
        if(updated.status==='active'){
          result.active++;
        }else{
          result.inactive++;
          result.revokedClaims+=await store.revokeIssuedClaimsIfIneligible(membership.userId);
        }
      }catch(err){
        result.errors.push({
          userId:membership.userId,
          channelId:channel&&channel.id||null,
          error:String(err&&err.message||err)
        });
      }
    }

    result.completedAt=new Date().toISOString();
    await store.finishReverificationRun(run,result);
    await pool.query(
      'INSERT INTO analytics_events(event_name,properties) VALUES($1,$2)',
      ['social_reverification_cron',JSON.stringify({...result,errors:result.errors.slice(0,20)})]
    ).catch(()=>{});

    console.log(JSON.stringify({event:'mfw_social_reverification_cron',status:result.errors.length?'partial':'completed',...result}));
    if(result.errors.length&&result.checked===0)process.exitCode=2;
  }catch(err){
    result.completedAt=new Date().toISOString();
    result.errors.push({error:String(err&&err.message||err)});
    if(run)await store.finishReverificationRun(run,result).catch(()=>{});
    console.error(JSON.stringify({event:'mfw_social_reverification_cron',status:'failed',...result}));
    process.exitCode=1;
  }finally{
    await pool.end();
  }
}

main();
