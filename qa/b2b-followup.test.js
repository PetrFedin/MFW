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
  'lead-b','lead-e','lead-c','lead-a','lead-d'
]);
assert.equal(success.rows[0].meetingLinked,true);
assert.equal(success.rows[0].meetingStatus,'completed');
assert.equal(success.rows[1].eventLabel,'Сделано в Москве');
assert.equal(success.rows[1].meetingMissing,true);
assert.equal(success.rows[2].meetingMissing,false);
assert.equal(success.rows[4].dueStatus,'closed');
assert.equal(success.rows[4].revenueVerified,false,'CRM win cannot be revenue');
assert.equal(success.truthBoundary.includes('no inferred revenue'),true);
assert.deepEqual({
 open:success.analytics.open,needsAttention:success.analytics.needsAttention,
 dueSoon:success.analytics.dueSoon,plannedActions:success.analytics.plannedActions,
 actionCoveragePct:success.analytics.actionCoveragePct,
 linkedMeetings:success.analytics.linkedMeetings,
 meetingRefs:success.analytics.meetingRefs,
 meetingLinkCoveragePct:success.analytics.meetingLinkCoveragePct,
 overdueDaysTotal:success.analytics.overdueDaysTotal,meetingConflicts:success.analytics.meetingConflicts
},{open:4,needsAttention:3,dueSoon:0,plannedActions:2,
 actionCoveragePct:50,linkedMeetings:2,meetingRefs:4,
 meetingLinkCoveragePct:50,overdueDaysTotal:2,meetingConflicts:0});
assert.equal(success.analytics.stageMix.qualified,1);
assert.equal(success.analytics.stageMix.won,1);
assert.equal(success.analytics.eventMix.made_in_moscow,2);
assert.equal(success.rows[0].priorityBand,'urgent');
assert.equal(success.rows[0].priorityScore,84);
assert(success.rows[0].priorityReasons.includes('Срок следующего действия прошёл'));
assert.equal(success.rows[1].priorityScore,70,'missing deadline and inaccessible meeting');
assert.equal(success.rows[2].priorityScore,62);
assert.equal(success.rows[3].priorityScore,24);
assert.equal(success.rows[4].priorityBand,'closed');
assert.equal(success.analytics.methodology.includes('не вероятность сделки'),true);
assert.equal(build(p([]),p([]),now).analytics.actionCoveragePct,null,'zero denominator is unknown');
assert.equal(build(p([]),p([]),now).analytics.meetingLinkCoveragePct,null);
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
assert.equal(build(p([{id:'z',meetingId:'same'},{id:'x',meetingId:'same'}]),p([]),now).reason,
  'meeting_lead_uniqueness_failed');
const soon=build(p([{id:'soon',meetingId:'x',eventBrand:'bfs',
  stage:'meeting_confirmed',nextAction:'Confirm counterpart availability',
  nextActionAt:'2026-10-22T12:00:00.000Z'}]),p([{id:'x',status:'declined'}]),now);
assert.equal(soon.ready,true);
assert.equal(soon.analytics.dueSoon,1);
assert.equal(soon.rows[0].meetingConflict,true,'declined meeting cannot confirm a lead');
assert.equal(soon.rows[0].priorityScore,53,'45 soon + 8 lifecycle conflict');
assert.equal(soon.analytics.meetingConflicts,1);
const urgent=build(p([{id:'urgent',stage:'met',meetingId:'m',
  nextAction:'Call',nextActionAt:'2026-10-09T12:00:00.000Z'}]),
  p([{id:'m',status:'requested'}]),now);
assert.equal(urgent.rows[0].priorityScore,100,'score capped at 100');
assert.equal(urgent.rows[0].priorityReasons.length,2);
const unknown=build(p([{id:'unrecognized',stage:'new_private_stage',
  eventBrand:'untrusted_event',nextActionAt:'not a date',nextAction:'Hello'}]),p([]),now);
assert.equal(unknown.ready,true);
assert.equal(unknown.rows[0].dueStatus,'missing');
assert.equal(unknown.rows[0].event,'unknown');
const ambiguousTime=build(p([{
  id:'tz-missing',stage:'qualified',nextAction:'Call',nextActionAt:'2026-10-18T12:00:00'
}]),p([]),now);
assert.equal(ambiguousTime.ready,true);
assert.equal(ambiguousTime.rows[0].dueStatus,'missing',
  'timezone-less deadline must not silently use client local time');
const offsetTime=build(p([{
  id:'tz-offset',stage:'qualified',nextAction:'Call',nextActionAt:'2026-10-19T14:00:00+03:00'
}]),p([]),now);
assert.equal(offsetTime.rows[0].dueStatus,'overdue',
  'explicit timezone offset gives deterministic classification');
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
  CRMWinNeverRevenue:true,explainablePriorities:true,actionCoverage:true,
  meetingLinkIntegrity:true,noNetworkOrMoney:true
}));
