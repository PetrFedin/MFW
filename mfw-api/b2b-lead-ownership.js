'use strict';
// PostgreSQL-owned lead. A meeting is linked only to its authenticated
// requester; cross-user conflicts must never update another actor's CRM.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
class LeadOwnershipError extends Error{
 constructor(code,httpStatus=400){super(code);this.name='LeadOwnershipError';
  this.code=code;this.httpStatus=httpStatus;}
}
function inputForLead(body){
 const b=body||{},stage=String(b.stage||'interest');
 if(!['interest','meeting_requested','meeting_confirmed','met','follow_up','qualified','won','lost'].includes(stage))
  throw new LeadOwnershipError('invalid_lead_stage',400);
 const eventBrand=String(b.eventBrand||'bfs');
 if(!['mfw','bfs'].includes(eventBrand))throw new LeadOwnershipError('invalid_event_brand',400);
 const meetingId=b.meetingId==null||b.meetingId===''?null:String(b.meetingId);
 if(meetingId&&!UUID.test(meetingId))throw new LeadOwnershipError('invalid_meeting_id',400);
 const clean=(x,n)=>x==null?null:(String(x).slice(0,n)||null);
 const raw=b.metadata&&typeof b.metadata==='object'&&!Array.isArray(b.metadata)?b.metadata:{};
 const metadata=Object.fromEntries(Object.entries(raw)
  .filter(([k])=>!['claimClass','revenueRecognized','truthClass','verified'].includes(k)));
 metadata.claimClass='user_reported';
 return {meetingId,eventBrand,stage,
  organisationRef:clean(b.organisationRef,160),organisationName:clean(b.organisationName,200),
  counterpartRef:clean(b.counterpartRef,160),counterpartName:clean(b.counterpartName,200),
  nextAction:clean(b.nextAction,500),nextActionAt:b.nextActionAt||null,
  notes:clean(b.notes,2000),metadata};
}
async function upsertOwnedLead({pool,userId,body}){
 if(!pool||!userId)throw new LeadOwnershipError('authenticated_postgres_required',401);
 const b=inputForLead(body);
 const client=await pool.connect();let active=false;
 try{
  await client.query('BEGIN');active=true;
  if(b.meetingId){
   const scope=await client.query(`SELECT id,metadata->>'eventBrand' AS "eventBrand"
     FROM b2b_meetings WHERE id=$1::uuid AND requester_user_id=$2::uuid
     FOR KEY SHARE`,[b.meetingId,userId]);
   if(!scope.rowCount)throw new LeadOwnershipError('meeting_not_owned_or_found',404);
   if(scope.rows[0].eventBrand&&scope.rows[0].eventBrand!==b.eventBrand)
    throw new LeadOwnershipError('meeting_event_brand_mismatch',409);
  }
  const r=await client.query(`INSERT INTO b2b_leads(
      meeting_id,owner_user_id,event_brand,organisation_ref,organisation_name,
      counterpart_ref,counterpart_name,stage,next_action,next_action_at,notes,metadata)
    VALUES($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)
    ON CONFLICT(meeting_id) DO UPDATE SET
      stage=EXCLUDED.stage,next_action=EXCLUDED.next_action,
      next_action_at=EXCLUDED.next_action_at,notes=EXCLUDED.notes,updated_at=now()
    WHERE b2b_leads.owner_user_id=EXCLUDED.owner_user_id
    RETURNING id,meeting_id AS "meetingId",event_brand AS "eventBrand",
      organisation_ref AS "organisationRef",organisation_name AS "organisationName",
      counterpart_ref AS "counterpartRef",counterpart_name AS "counterpartName",
      stage,next_action AS "nextAction",next_action_at AS "nextActionAt",notes,
      created_at AS "createdAt",updated_at AS "updatedAt"`,[
    b.meetingId,userId,b.eventBrand,b.organisationRef,b.organisationName,
    b.counterpartRef,b.counterpartName,b.stage,b.nextAction,b.nextActionAt,
    b.notes,JSON.stringify(b.metadata)]);
  if(!r.rowCount)throw new LeadOwnershipError('lead_not_owned_or_found',404);
  await client.query('COMMIT');active=false;
  return {...r.rows[0],truthClass:'reported',revenueRecognized:false};
 }catch(e){
  if(active)await client.query('ROLLBACK').catch(()=>{});
  throw e;
 }finally{client.release();}
}
module.exports={LeadOwnershipError,inputForLead,upsertOwnedLead};
