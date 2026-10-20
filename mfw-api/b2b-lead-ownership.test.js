'use strict';
const assert=require('node:assert/strict');
const {LeadOwnershipError,inputForLead,upsertOwnedLead}=require('./b2b-lead-ownership');
const uuid='00000000-0000-4000-8000-000000000001';
assert.equal(inputForLead({meetingId:uuid,metadata:{verified:true,revenueRecognized:true,context:'buyer'}}).metadata.verified,undefined);
assert.equal(inputForLead({meetingId:uuid}).metadata.claimClass,'user_reported');
assert.throws(()=>inputForLead({meetingId:'forged'}),e=>e instanceof LeadOwnershipError&&e.code==='invalid_meeting_id');
assert.throws(()=>inputForLead({stage:'confirmed_revenue'}),/invalid_lead_stage/);
async function scenario(owner,existingOwner=null){
 const queries=[];let commits=0,rollbacks=0;
 const client={query:async(sql,args)=>{
  queries.push({sql,args});
  if(sql==='BEGIN'||sql==='ROLLBACK'||sql==='COMMIT'){
   if(sql==='COMMIT')commits++;
   if(sql==='ROLLBACK')rollbacks++;
   return {rows:[],rowCount:0};
  }
  if(sql.includes('FROM b2b_meetings WHERE')){
   return {rows:owner?[{id:uuid,eventBrand:'bfs'}]:[],rowCount:owner?1:0};
  }
  if(sql.includes('INSERT INTO b2b_leads')){
   return {rows:existingOwner?[ ]:[{id:uuid,stage:'follow_up'}],rowCount:existingOwner?0:1};
  }
  throw Error('unexpected_sql');
 },release:()=>{}};
 const pool={connect:async()=>client};
 try{await upsertOwnedLead({pool,userId:'00000000-0000-4000-8000-000000000002',body:{meetingId:uuid,stage:'follow_up'}});return {ok:true,queries,commits,rollbacks};}
 catch(e){return {ok:false,error:e.code,queries,commits,rollbacks};}
}
(async()=>{
 const denied=await scenario(false);
 assert.equal(denied.error,'meeting_not_owned_or_found');
 assert.equal(denied.commits,0);
 assert.equal(denied.rollbacks,1);
 assert(!denied.queries.some(x=>x.sql.includes('INSERT INTO b2b_leads')));
 const conflict=await scenario(true,true);
 assert.equal(conflict.error,'lead_not_owned_or_found');
 assert.equal(conflict.rollbacks,1);
 assert(conflict.queries.find(x=>x.sql.includes('INSERT INTO b2b_leads')).sql.includes('WHERE b2b_leads.owner_user_id=EXCLUDED.owner_user_id'));
 const good=await scenario(true);
 assert.equal(good.ok,true);assert.equal(good.commits,1);
 assert.equal(good.rollbacks,0);
 console.log('B2B lead ownership and fail-closed upsert PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
