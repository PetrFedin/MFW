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
console.log(JSON.stringify({event:'mfw_bfs_browser_bindings_contract',status:'pass',
 navigation:6,collectionSelectorCrashes:0,delegatedCrmLead:true}));
