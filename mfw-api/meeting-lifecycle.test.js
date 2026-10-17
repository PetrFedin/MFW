'use strict';
const assert=require('node:assert/strict');
const {STATES,MeetingLifecycleError,requestKey,fingerprint,transition}=require('./meeting-lifecycle');
for(const [a,b,noOp] of [['requested','confirmed',false],['confirmed','completed',false],
 ['confirmed','reschedule_requested',false],['reschedule_requested','confirmed',false],
 ['completed','completed',true],['cancelled','cancelled',true]])
 assert.equal(transition(a,b).noop,noOp);
for(const [a,b] of [['requested','completed'],['completed','requested'],
 ['declined','confirmed'],['cancelled','confirmed']])
 assert.throws(()=>transition(a,b),e=>e instanceof MeetingLifecycleError&&e.code==='invalid_meeting_transition');
assert.throws(()=>transition('requested','invalid'),e=>e.code==='invalid_meeting_status');
assert.equal(Object.keys(STATES).length,6);
assert.equal(requestKey('bfs_1234567890123456'),'bfs_1234567890123456');
for(const key of [null,'bad','has whitespace','x'.repeat(129)])
 assert.throws(()=>requestKey(key),e=>e.code==='idempotency_key_required');
const a={eventBrand:'bfs',organisation:'BFS buyer',organisationRef:'org1'};
const b={organisationRef:'org1',organisation:'BFS buyer',eventBrand:'bfs'};
assert.equal(fingerprint(a),fingerprint(b));
assert.notEqual(fingerprint(a),fingerprint({...a,organisationRef:'org2'}));
console.log(JSON.stringify({event:'mfw_meeting_lifecycle_contract',status:'pass',
 terminalStates:['completed','cancelled','declined'],idempotency:true}));
