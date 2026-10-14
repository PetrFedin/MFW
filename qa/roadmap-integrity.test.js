'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'docs/mfw-execution-roadmap.json'),'utf8'));
assert.equal(manifest.schemaVersion,'mfw-execution-audit-v1');
assert.equal(manifest.productionAdmitted,false,'audit must not claim live PostgreSQL admission');
assert.equal(manifest.verified.original027Recovered,false);
assert.equal(manifest.verified.renderFreePostgresStatus,'suspended');
assert.equal(manifest.verified.renderAuthorityHealthCheckPath,'');
assert(manifest.items.length>=30,'missing master-plan workstreams');
const priorities=new Set(['P0','P1','P2']);
const statuses=new Set(manifest.states);
const entries=new Map();
for(const row of manifest.items){
 assert(/^P[012]-\d{2}$/.test(row.id),'invalid ID '+row.id);
 assert(!entries.has(row.id),'duplicate workstream '+row.id);
 entries.set(row.id,row);
 assert(priorities.has(row.priority),'invalid priority '+row.id);
 assert(row.id.startsWith(row.priority+'-'),'ID/priority mismatch '+row.id);
 assert(statuses.has(row.status),'invalid status '+row.id);
 assert(row.name.length>8&&row.acceptance.length>45,'missing actual acceptance '+row.id);
 assert(Array.isArray(row.dependsOn)&&Array.isArray(row.evidence)&&row.evidence.length>0);
 for(const evidence of row.evidence){
   assert(!path.isAbsolute(evidence)&&!evidence.includes('..'),'invalid evidence ref');
   assert(fs.existsSync(path.join(root,evidence)),'missing source evidence '+evidence);
 }
 if(row.tracking!==null)assert(/^https:\/\/github\.com\/PetrFedin\/MFW\/(issues|pull)\/\d+$/.test(row.tracking));
 assert.notEqual(row.status,'production_ready');
}
for(const row of manifest.items)for(const dep of row.dependsOn){
 assert(entries.has(dep),'unknown dependency '+dep+' for '+row.id);
 assert.notEqual(dep,row.id,'self dependency '+row.id);
}
const visiting=new Set(),visited=new Set();
function visit(id){
 if(visited.has(id))return;
 assert(!visiting.has(id),'dependency cycle at '+id);
 visiting.add(id);
 for(const dep of entries.get(id).dependsOn)visit(dep);
 visiting.delete(id);
 visited.add(id);
}
for(const id of entries.keys())visit(id);
for(const id of ['P0-01','P0-02','P0-03','P0-04','P0-05','P0-06','P1-01','P1-12','P1-13'])assert(entries.has(id));
const counts=Object.fromEntries([...priorities].map(p=>[p,manifest.items.filter(x=>x.priority===p).length]));
const noProof=manifest.items.filter(x=>x.status==='proposal_only').length;
console.log(JSON.stringify({event:'mfw_execution_roadmap_contract',status:'pass',items:manifest.items.length,priorityCounts:counts,proposalOnly:noProof,dependencyGraph:'acyclic',liveAdmission:false}));
