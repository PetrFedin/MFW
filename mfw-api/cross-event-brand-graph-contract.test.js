'use strict';
const fs=require('fs');
const path=require('path');
const assert=require('assert');

const source=fs.readFileSync(path.join(__dirname,'server-v2.js'),'utf8');
const start=source.indexOf("p.startsWith('/v1/brands/')&&p.endsWith('/network-graph')");
const end=source.indexOf("p.startsWith('/v1/brands/')&&p.endsWith('/analytics')",start);
assert(start>=0,'brand_graph_endpoint_missing');
assert(end>start,'brand_graph_endpoint_boundary_missing');
const block=source.slice(start,end);

for(const required of [
  "mfw-cross-event-brand-graph-v2",
  "made_in_moscow_programme_roster",
  "mfw_programme_authority",
  "mfw_collection_authority",
  "mfw_buyer_commerce_authority",
  "bfs_meeting_authority",
  "bfs_lead_authority",
  "brand365_authority",
  "cross_event_brand_graph_projection",
  "noPii:true",
  "readOnly:true",
  "noRevenueInference:true",
  "noUniversalScore:true",
  "productionAdmitted"
]) assert(block.includes(required),'brand_graph_contract_missing:'+required);

for(const forbidden of [
  'brand_purchases',
  'external_order_ref',
  'value_hint',
  'buyer_email',
  'buyer_phone',
  'counterpart_email',
  'counterpart_phone'
]) assert(!block.includes(forbidden),'brand_graph_forbidden_projection:'+forbidden);

assert(block.includes("truthClass:madeVerified?'verified':'not_evidenced'"),'brand_graph_verified_truth_boundary_missing');
assert(block.includes("truthClass:Number(shortlist.count)>0?'observed':'not_evidenced'"),'brand_graph_shortlist_truth_boundary_missing');
assert(block.includes("truthClass:Number(meetings.count)>0?'observed':'not_evidenced'"),'brand_graph_meeting_truth_boundary_missing');
assert(block.includes("truthClass:Number(leads.count)>0?'observed':'not_evidenced'"),'brand_graph_lead_truth_boundary_missing');

console.log(JSON.stringify({event:'cross_event_brand_graph_contract',status:'pass'}));
