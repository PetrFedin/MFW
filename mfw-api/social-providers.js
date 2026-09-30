'use strict';

function activeTelegramStatus(member){
  if(!member)return false;
  if(['creator','administrator','member'].includes(member.status))return true;
  if(member.status==='restricted')return member.is_member===true;
  return false;
}

async function verifyProviderMembership({store,userId,channel,telegramBotToken,vkServiceToken,vkApiVersion='5.199'}){
  const connection=await store.socialConnection(userId,channel.platform);
  if(!connection)return {ok:false,error:'social_connection_required',platform:channel.platform};

  if(channel.platform==='telegram'){
    if(!telegramBotToken)return {ok:false,error:'provider_not_configured',platform:'telegram'};
    const chatId=encodeURIComponent(channel.externalChannelId);
    const externalUserId=encodeURIComponent(connection.externalUserId);
    const r=await fetch('https://api.telegram.org/bot'+telegramBotToken+'/getChatMember?chat_id='+chatId+'&user_id='+externalUserId);
    const data=await r.json().catch(()=>({}));
    if(!r.ok||!data.ok)return {ok:false,error:'provider_verification_failed',platform:'telegram',detail:data.description||r.status};
    return {
      ok:true,
      active:activeTelegramStatus(data.result),
      source:'telegram_getChatMember',
      providerJoinedAt:null,
      rawStatus:data.result&&data.result.status
    };
  }

  if(channel.platform==='vk'){
    if(!vkServiceToken)return {ok:false,error:'provider_not_configured',platform:'vk'};
    const q=new URLSearchParams({
      group_id:String(channel.externalChannelId),
      user_id:String(connection.externalUserId),
      access_token:vkServiceToken,
      v:String(vkApiVersion||'5.199')
    });
    const r=await fetch('https://api.vk.com/method/groups.isMember?'+q.toString());
    const data=await r.json().catch(()=>({}));
    if(!r.ok||data.error)return {ok:false,error:'provider_verification_failed',platform:'vk',detail:data.error&&data.error.error_msg||r.status};
    const member=typeof data.response==='object'&&data.response!==null?Number(data.response.member):Number(data.response);
    return {ok:true,active:member===1,source:'vk_groups.isMember',providerJoinedAt:null,rawStatus:member};
  }

  return {ok:false,error:'verification_not_supported',platform:channel.platform};
}

module.exports={activeTelegramStatus,verifyProviderMembership};
