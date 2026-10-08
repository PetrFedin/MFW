'use strict';
const fs=require('fs');
const path=require('path');
const assert=require('assert');

const source=fs.readFileSync(path.join(__dirname,'server-v2.js'),'utf8');
const start=source.indexOf("p.startsWith('/v1/brands/')&&p.endsWith('/relationship-timeline')");
const end=source.indexOf("p.startsWith('/v1/brands/')&&p.endsWith('/network-graph')",start);
assert(start>=0,'timeline_endpoint_missing');
assert(end>start,'timeline_endpoint_boundary_missing');
const block=source.slice(start,end);

for(const required of [
  "mfw-brand-relationship-timeline-v1",
  "mfw_brand_registry",
  "mfw_programme_authority",
  "made_in_moscow_programme_roster",
  "mfw_buyer_commerce_authority",
  "bfs_meeting_authority",
  "bfs_lead_authority",
  "brand365_authority",
  "brand_commerce_evidence",
  "readOnly:true",
  "noPii:true",
  "noRevenueInference:true",
  "verifiedOutcomeRequiresExternalOrderAndEvidenceRef:true",
  "external_order_ref",
  "metadata->>'evidenceRef'",
  "truthClass:'not_evidenced'"
]) assert(block.includes(required),'timeline_contract_missing:'+required);

for(const forbidden of [
  'buyer_email',
  'buyer_phone',
  'counterpart_email',
  'counterpart_phone',
  'private_buyer_note'
]) assert(!block.includes(forbidden),'timeline_forbidden_projection:'+forbidden);

assert(block.includes("state:age<=7?'fresh':age<=30?'aging':'stale'"),'timeline_freshness_policy_missing');
assert(block.includes("items.sort"),'timeline_chronological_sort_missing');

console.log(JSON.stringify({event:'brand_relationship_timeline_contract',status:'pass'}));
