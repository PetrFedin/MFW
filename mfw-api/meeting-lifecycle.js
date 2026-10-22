'use strict';
// PostgreSQL-owned MFW/BFS meeting lifecycle. Do not treat requester
// status changes as independently verified counterparty attendance.
const crypto=require('node:crypto');
const STATES=Object.freeze({
 requested:Object.freeze(['confirmed','cancelled','declined']),
 confirmed:Object.freeze(['reschedule_requested','completed','cancelled']),
 reschedule_requested:Object.freeze(['confirmed','cancelled','declined']),
 completed:Object.freeze([]),cancelled:Object.freeze([]),declined:Object.freeze([])
});
class MeetingLifecycleError extends Error{
 constructor(code,status=409,details={}){super(code);this.name='MeetingLifecycleError';
  this.code=code;this.httpStatus=status;this.details=details;}
}
function requestKey(value){
 if(typeof value!=='string'||!/^[A-Za-z0-9_-]{16,128}$/.test(value))
  throw new MeetingLifecycleError('idempotency_key_required',400);
 return value;
}
function dateValue(value){
 if(value===undefined||value===null||value==='')return null;
 if(typeof value!=='string'||value.length>64||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(value)||!Number.isFinite(Date.parse(value)))
  throw new MeetingLifecycleError('invalid_meeting_time',400);
 return new Date(value).toISOString();
}
function str(v,max){return v==null?null:(String(v).slice(0,max)||null);}
function normalizedInput(b={}){
 const eventBrand=String(b.eventBrand||'bfs').toLowerCase();
 if(!['bfs','mfw'].includes(eventBrand))
  throw new MeetingLifecycleError('invalid_event_brand',400);
 return {eventBrand,brandId:str(b.brandId,160),eventId:str(b.eventId,160),
  organisation:str(b.organisation,200),organisationRef:str(b.organisationRef,160),
  organisationName:str(b.organisationName||b.organisation,200),
  counterpartRef:str(b.counterpartRef,160),counterpartName:str(b.counterpartName,200),
  startsAt:dateValue(b.startsAt),note:str(b.note,1000),slot:str(b.slot,100)};
}
function fingerprint(b){
 return crypto.createHash('sha256').update(JSON.stringify(normalizedInput(b))).digest('hex');
}
function transition(current,next){
 if(!Object.prototype.hasOwnProperty.call(STATES,next))
  throw new MeetingLifecycleError('invalid_meeting_status',400);
 if(!Object.prototype.hasOwnProperty.call(STATES,current))
  throw new MeetingLifecycleError('unknown_current_meeting_status',409,{current});
 if(current===next)return {noop:true};
 if(!STATES[current].includes(next))
  throw new MeetingLifecycleError('invalid_meeting_transition',409,{current,requested:next});
 return {noop:false};
}
async function atomic(pool,work){
 const client=await pool.connect();let begun=false;
 try{await client.query('BEGIN');begun=true;const result=await work(client);
   await client.query('COMMIT');begun=false;return result;}
 catch(error){if(begun){try{await client.query('ROLLBACK')}catch(_){}}throw error;}
 finally{client.release();}
}
async function createMeeting({pool,userId,body,key,brandStorageId=null,eventStorageId=null,failAt=null}){
 requestKey(key);
 const input=normalizedInput(body),hash=fingerprint(body);
 return atomic(pool,async(client)=>{
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1::text,0))',[userId+':'+key]);
  const prior=await client.query(`SELECT id,event_id AS "eventStorageId",
   brand_id AS "brandStorageId",requester_user_id AS "requesterUserId",
   organisation,starts_at AS "startsAt",status,note,metadata,
   created_at AS "createdAt" FROM b2b_meetings
   WHERE requester_user_id::text=$1 AND metadata->>'idempotencyKey'=$2 LIMIT 1`,[userId,key]);
  if(prior.rowCount){
   const existing=prior.rows[0];
   if(!existing.metadata||existing.metadata.requestFingerprint!==hash)
    throw new MeetingLifecycleError('idempotency_key_payload_conflict',409);
   delete existing.metadata;
   return {data:existing,replayed:true};
  }
  const active=await client.query("SELECT id FROM users WHERE id::text=$1 AND status='active' LIMIT 1",[userId]);
  if(!active.rowCount)throw new MeetingLifecycleError('user_not_found',404);
  const metadata={eventBrand:input.eventBrand,organisationRef:input.organisationRef,
   organisationName:input.organisationName,counterpartRef:input.counterpartRef,
   counterpartName:input.counterpartName,slot:input.slot,idempotencyKey:key,requestFingerprint:hash};
  const inserted=await client.query(`INSERT INTO b2b_meetings(event_id,brand_id,requester_user_id,
   organisation,starts_at,status,note,source,metadata)
   VALUES($1,$2,$3,$4,$5,'requested',$6,'app',$7::jsonb)
   RETURNING id,event_id AS "eventStorageId",brand_id AS "brandStorageId",
   requester_user_id AS "requesterUserId",organisation,starts_at AS "startsAt",
   status,note,created_at AS "createdAt"`,
   [eventStorageId,brandStorageId,userId,input.organisation,input.startsAt,input.note,JSON.stringify(metadata)]);
  const data=inserted.rows[0];
  if(failAt==='meeting')throw Error('ci_fail_after_meeting');
  await client.query(`INSERT INTO b2b_meeting_events(meeting_id,actor_user_id,event_type,payload)
   VALUES($1,$2,'requested',$3::jsonb)`,
   [data.id,userId,JSON.stringify({eventBrand:input.eventBrand,organisationRef:input.organisationRef})]);
  if(failAt==='history')throw Error('ci_fail_after_history');
  if(input.eventBrand==='bfs'){
   await client.query(`INSERT INTO b2b_leads(meeting_id,owner_user_id,event_brand,organisation_ref,
    organisation_name,counterpart_ref,counterpart_name,stage,next_action,metadata)
    VALUES($1,$2,'bfs',$3,$4,$5,$6,'meeting_requested','Подтвердить встречу',$7::jsonb)`,
    [data.id,userId,input.organisationRef,input.organisationName,input.counterpartRef,
     input.counterpartName,JSON.stringify({source:'meeting_request'})]);
  }
  if(failAt==='lead')throw Error('ci_fail_after_lead');
  await client.query('INSERT INTO analytics_events(user_id,event_name,properties) VALUES($1,$2,$3::jsonb)',
   [userId,'meeting_requested',JSON.stringify({meetingId:String(data.id),eventBrand:input.eventBrand})]);
  if(failAt==='analytics')throw Error('ci_fail_after_analytics');
  return {data,replayed:false};
 });
}
async function updateMeeting({pool,userId,id,status,startsAt=null,note=null,failAt=null}){
 return atomic(pool,async(client)=>{
  const prev=await client.query(`SELECT id,status,starts_at AS "startsAt",
   organisation,metadata FROM b2b_meetings
   WHERE id::text=$1 AND requester_user_id::text=$2 FOR UPDATE`,[id,userId]);
  if(!prev.rowCount)throw new MeetingLifecycleError('meeting_not_found',404);
  const row=prev.rows[0],result=transition(row.status,status),nextTime=dateValue(startsAt)||row.startsAt;
  if(result.noop){
   if(startsAt!==null||note!==null)
    throw new MeetingLifecycleError('meeting_already_in_status',409,{current:row.status});
   const unchanged=await client.query(`SELECT id,organisation,starts_at AS "startsAt",
    status,note,metadata,updated_at AS "updatedAt"
    FROM b2b_meetings WHERE id=$1`,[row.id]);
   return {data:unchanged.rows[0],noop:true};
  }
  if(status==='confirmed'&&!nextTime)
   throw new MeetingLifecycleError('meeting_time_required',409);
  const changed=await client.query(`UPDATE b2b_meetings
   SET status=$2,starts_at=COALESCE($3,starts_at),note=COALESCE($4,note),updated_at=now()
   WHERE id=$1 RETURNING id,organisation,starts_at AS "startsAt",
   status,note,metadata,updated_at AS "updatedAt"`,
   [row.id,status,dateValue(startsAt),str(note,1000)]);
  if(failAt==='status')throw Error('ci_fail_after_status');
  await client.query('INSERT INTO b2b_meeting_events(meeting_id,actor_user_id,event_type,payload) VALUES($1,$2,$3,$4::jsonb)',
    [row.id,userId,status,JSON.stringify({from:row.status,to:status,startsAt:nextTime||null})]);
  if(failAt==='history')throw Error('ci_fail_after_history');
  const meta=row.metadata||{},stage={confirmed:'meeting_confirmed',completed:'met'}[status];
  if(stage&&meta.eventBrand==='bfs'){
   await client.query(`INSERT INTO b2b_leads(meeting_id,owner_user_id,event_brand,
    organisation_ref,organisation_name,counterpart_ref,counterpart_name,stage,next_action,metadata)
    VALUES($1,$2,'bfs',$3,$4,$5,$6,$7,$8,$9::jsonb)
    ON CONFLICT(meeting_id) DO UPDATE SET stage=EXCLUDED.stage,
    next_action=COALESCE(EXCLUDED.next_action,b2b_leads.next_action),updated_at=now()`,
    [row.id,userId,meta.organisationRef||null,row.organisation||meta.organisationName||null,
     meta.counterpartRef||null,meta.counterpartName||null,stage,
     status==='completed'?'Отправить follow-up после встречи':null,
     JSON.stringify({source:'meeting_state_machine'})]);
  }
  if(failAt==='lead')throw Error('ci_fail_after_lead');
  await client.query('INSERT INTO analytics_events(user_id,event_name,properties) VALUES($1,$2,$3::jsonb)',
   [userId,'meeting_status_changed',JSON.stringify({meetingId:String(row.id),from:row.status,to:status,
     eventBrand:meta.eventBrand||'unverified'})]);
  if(failAt==='analytics')throw Error('ci_fail_after_analytics');
  return {data:changed.rows[0],noop:false};
 });
}
module.exports={STATES,MeetingLifecycleError,requestKey,fingerprint,
 normalizedInput,transition,createMeeting,updateMeeting};
