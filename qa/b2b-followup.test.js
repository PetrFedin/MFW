'use strict';
// Standalone, deterministic proof boundary for the personally-scoped
// follow-up projection. No HTTP, sample sales, external CRM or real users.
const assert=require('node:assert/strict');
const {build}=require('../mfw/platform/b2b-followup.js');
const now=Date.parse('2026-10-20T12:00:00.000Z');
const validLeads=[
  {id:'lead-b',eventBrand:'bfs',stage:'qualified',meetingId:'meeting-b',
   counterpartName:'Buyer B',nextAction:'Send updated approved linesheet',
   nextActionAt:'2026-10-19T11:00:00.000Z'},
  {id:'lead-a',eventBrand:'mfw',stage:'interest',meetingId:'meeting-a',
   counterpartName:'Buyer A',nextAction:'Schedule call',
   nextActionAt:'2026-10-24T11:00:00.000Z'},
  {id:'lead-c',eventBrand:'made_in_moscow',stage:'follow_up',meetingId:'',
   counterpartName:'Brand C',nextAction:'',nextActionAt:null},
  {id:'lead-d',eventBrand:'bfs',stage:'won',meetingId:'meeting-not-visible',
   counterpartName:'Buyer D',nextAction:'',nextActionAt:null},
  {id:'lead-e',eventBrand:'made_in_moscow',stage:'met',meetingId:'meeting-out-of-scope',
   counterpartName:'Atelier E',nextAction:'Follow up',nextActionAt:null}
];
const validMeetings=[
  {id:'meeting-b',status:'completed'},
  {id:'meeting-a',status:'confirmed'}
];
const p=x=>({source:'postgres',data:x});
const success=build(p(validLeads),p(validMeetings),now);
assert.equal(success.ready,true);
assert.deepEqual(success.totals,{
  all:5,overdue:1,missing:2,scheduled:1,closed:1,unlinkedMeetings:2
});
assert.deepEqual(success.rows.map(x=>x.id),[
  'lead-b','lead-c','lead-e','lead-a','lead-d'
]);
assert.equal(success.rows[0].meetingLinked,true);
assert.equal(success.rows[0].meetingStatus,'completed');
assert.equal(success.rows[1].eventLabel,'Сделано в Москве');
assert.equal(success.rows[2].meetingMissing,true);
assert.equal(success.rows[4].dueStatus,'closed');
assert.equal(success.rows[4].revenueVerified,false,'CRM win cannot be revenue');
assert.equal(success.truthBoundary.includes('no inferred revenue'),true);
assert.equal(build(p([]),p([]),now).totals.all,0,'empty trusted source is 0, not a fake pipeline');
assert.equal(build({source:'memory',data:validLeads},p(validMeetings),now).ready,false);
assert.equal(build(p(validLeads),{source:'memory',data:validMeetings},now).ready,false);
assert.equal(build({source:'postgres',demo:true,data:validLeads},p(validMeetings),now).ready,false);
assert.equal(build(p(validLeads),{source:'postgres',demo:true,data:validMeetings},now).ready,false);
assert.equal(build({source:'postgres',data:{}},p(validMeetings),now).ready,false);
assert.equal(build(p(validLeads),p(validMeetings),'not-a-date').reason,'invalid_clock');
assert.equal(build(p([...validLeads,validLeads[0]]),p(validMeetings),now).reason,
  'lead_identity_integrity_failed');
assert.equal(build(p(validLeads),p([...validMeetings,validMeetings[0]]),now).reason,
  'meeting_identity_integrity_failed');
assert.equal(build(p([{stage:'qualified',nextAction:'Required'}]),p([]),now).reason,
  'lead_identity_integrity_failed');
const unknown=build(p([{id:'unrecognized',stage:'new_private_stage',
  eventBrand:'untrusted_event',nextActionAt:'not a date',nextAction:'Hello'}]),p([]),now);
assert.equal(unknown.ready,true);
assert.equal(unknown.rows[0].dueStatus,'missing');
assert.equal(unknown.rows[0].event,'unknown');
assert.equal(unknown.rows[0].stage,'unknown');
// Text stays ordinary data in the projection and must be HTML-escaped at the UI boundary.
const unsafe=build(p([{id:'unsafe',stage:'interest',
  counterpartName:'<img src=x onerror=alert(1)>',
  nextAction:'<script>leak()</script>',nextActionAt:'2026-10-19T11:00:00.000Z'}]),p([]),now);
assert.equal(unsafe.rows[0].counterpart,'<img src=x onerror=alert(1)>');
assert.equal(unsafe.rows[0].revenueVerified,false);
console.log(JSON.stringify({
  event:'mfw_b2b_followup_projection',status:'pass',
  ownerScopedPostgresOnly:true,demoAndMemoryDenied:true,
  duplicateIdsDenied:true,overdueAndMissingComputed:true,
  CRMWinNeverRevenue:true,noNetworkOrMoney:true
}));
