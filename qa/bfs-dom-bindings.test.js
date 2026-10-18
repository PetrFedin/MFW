'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'mfw/platform/bfs/app.js'),'utf8');
const shell=fs.readFileSync(path.join(root,'mfw/platform/bfs/index.html'),'utf8');
// querySelector returns ONE element; the previous code called .forEach on it
// inside BFS startup and on the programmes/organisations/speakers screens.
const wrongCollectionBindings=[...source.matchAll(/(?<!\$)\$\(['"][^'"]+['"]\)\.forEach\s*\(/g)];
assert.deepEqual(wrongCollectionBindings.map(m=>m[0]),[],
 'querySelector does not return an iterable; use $$ / querySelectorAll');
assert.match(source,/function \$\$\([^)]*\)\{return \[\]\.slice\.call\(document\.querySelectorAll/);
for(const key of ['today','programme','speakers','b2b','pass','profile']){
 assert(shell.includes('data-view="'+key+'"'),'BFS nav control missing: '+key);
}
assert(source.includes("$$('[data-view]').forEach"),'BFS nav must bind ALL buttons');
assert(source.includes("$$('[data-open-session]').forEach"),'speaker session links must be iterable');
assert(source.includes("$$('[data-org-meet]').forEach"),'organisation meeting buttons must be iterable');
assert.match(source,/bfsContent\.addEventListener\('click',[\s\S]*?data-org-lead/,
 'BFS CRM lead buttons must delegate to stable host across re-render');
assert.match(source,/async function leadStage\(/,'CRM lead handler missing');
assert.match(source,/function confirmed\(/,'PostgreSQL receipt qualification missing');
assert(!source.includes("marketingConsent:true,networkingVisible:true"),
 'Consent cannot be hardcoded');
// Canonical programme identifiers must agree with the PostgreSQL events.external_key
// roster; locally invented "s1" IDs caused seven cross-device agenda failures.
const officialData=fs.readFileSync(path.join(root,'mfw/platform/event-data.js'),'utf8');
const canonicalIds=[...officialData.matchAll(/\{id:"(bfs-[a-z0-9-]+)"/g)].map(match=>match[1]);
assert(canonicalIds.length>=20,'BFS canonical programme data missing');
assert.equal(new Set(canonicalIds).size,canonicalIds.length,'duplicate canonical BFS session ID');
assert(!source.includes("{id:'s1'"),'synthetic BFS fallback sessions cannot reach agenda writes');
assert(source.includes("var sessions=[];"),'BFS must fail closed without official programme data');
assert(source.includes("var speakers=[];"),'BFS must fail closed without official speakers');
assert(source.includes("Программа временно недоступна"),'BFS must explain missing official schedule');
assert(source.includes("agendaWriteRevision"),'late agenda hydration must not overwrite saved mutation');
assert(source.includes("startedAtRevision!==agendaWriteRevision"),'stale GET guard required');
assert(source.includes("confirmed(out)"),'BFS agenda cannot claim success from memory receipt');
console.log(JSON.stringify({event:'mfw_bfs_browser_bindings_contract',status:'pass',
 navigation:6,collectionSelectorCrashes:0,delegatedCrmLead:true}));
