'use strict';
// CI-only, disposable PostgreSQL 17 with 27 migrations replayed and restored.
// Verifies the SQL used by real Authority read endpoints and rolls back fixtures.
// Never connects to Render or Supabase production.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {Pool}=require('pg');
assert.equal(process.env.CI,'true');
assert.equal(process.env.GITHUB_ACTIONS,'true');
assert.equal(process.env.MFW_ISOLATED_PG_CI,'true');
const source=fs.readFileSync(path.join(__dirname,'..','server-v2.js'),'utf8');
const input=new URL(process.env.DATABASE_URL||'postgresql://invalid');
for(const [key,val] of [['protocol','postgresql:'],['hostname','127.0.0.1'],
  ['port','5432'],['username','mfw_ci'],['password','mfw_ci_local_only'],
  ['pathname','/mfw_scratch_ci']])assert.equal(input[key],val,'non_scratch_pg_forbidden_'+key);
input.pathname='/mfw_restored_ci';
function routeBlock(route,next){
 const start="if(req.method==='GET'&&p==='/v1/"+route+"'){";
 const end="if(req.method==='GET'&&p==='/v1/"+next+"'){";
 const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
 assert(a>=0&&b>a,'missing_authority_endpoint_'+route);
 return source.slice(a,b);
}
function sql(block,expression,label){
 const result=block.match(expression);
 assert(result&&result[1],'missing_query_'+label);
 return result[1];
}
const overviewBlock=routeBlock('made-in-moscow/overview','made-in-moscow/brands');
const rosterBlock=routeBlock('made-in-moscow/brands','brands');
const brandBlock=routeBlock('brands','collections'); // Includes brand detail handlers: use first select only.
const overviewSql=sql(overviewBlock,/const stats=await pool\.query\(`([\s\S]*?)`\);/,'overview');
const rosterSql=sql(rosterBlock,/const r=await pool\.query\(`([\s\S]*?)`\);/,'roster');
const brandsSql=sql(brandBlock,/const r=await pool\.query\(`([\s\S]*?)`,\['published'\]\);/,'brand_list');
assert(overviewSql.includes("pp.status='active'")&&overviewSql.includes("b.status='published'"));
assert(rosterSql.includes("pp.status='active'")&&rosterSql.includes("b.status='published'"));
assert(brandsSql.includes("pp.status='active'"),'brand_list_must_respect_programme_pause');
assert(source.includes("made.programStatus==='active'&&made.brandStatus==='published'"),'network_graph_must_respect_status');
assert(source.includes("x.programStatus==='active'&&x.brandStatus==='published'"),'timeline_and_brand_detail_must_respect_status');

async function main(){
 const pool=new Pool({connectionString:input.toString(),max:2});
 const db=await pool.connect();
 let active=false;
 try{
  const ver=await db.query("SELECT current_setting('server_version_num') AS n");
  assert.equal(Math.floor(Number(ver.rows[0].n)/10000),17);
  const migrations=await db.query('SELECT COUNT(*)::int AS n FROM public.schema_migrations');
  assert.equal(migrations.rows[0].n,27);
  await db.query('BEGIN');active=true;
  const programme=await db.query("SELECT id FROM public.partner_programs WHERE external_key='made_in_moscow'");
  assert.equal(programme.rowCount,1);
  const programId=programme.rows[0].id;
  // Fixture-only changes, always rolled back: this is not a data repair.
  await db.query("UPDATE public.partner_programs SET status='active' WHERE id=$1",[programId]);
  const baselineRoster=await db.query(rosterSql);
  const baselineOverview=await db.query(overviewSql);
  assert.equal(Number(baselineOverview.rows[0].verifiedBrands),baselineRoster.rowCount,'baseline_count_list_drift');
  const token=crypto.randomBytes(6).toString('hex');
  const otherProgram=await db.query(
   "INSERT INTO public.partner_programs(external_key,name,status) VALUES($1,$2,'active') RETURNING id",
   ['ci_roster_other_'+token,'Other synthetic programme']);
  const otherId=otherProgram.rows[0].id;
  const fixture=[
   ['valid','published','verified','approved',programId],
   ['draft','draft','verified','approved',programId],
   ['archived','archived','verified','approved',programId],
   ['pending','published','pending','approved',programId],
   ['unreviewed','published','verified','pending',programId],
   ['revoked','published','revoked','approved',programId],
   ['suspended','published','verified','suspended',programId],
   ['wrong_program','published','verified','approved',otherId]
  ];
  const slugs={};
  for(const [code,status,membership,moderation,pid] of fixture){
   const slug='ci-roster-'+token+'-'+code;
   slugs[code]=slug;
   const r=await db.query(
    'INSERT INTO public.brands(slug,name,status) VALUES($1,$2,$3) RETURNING id',
    [slug,'Synthetic '+code,status]);
   await db.query(
    'INSERT INTO public.brand_program_memberships(brand_id,program_id,status,moderation_status) VALUES($1,$2,$3,$4)',
    [r.rows[0].id,pid,membership,moderation]);
  }
  async function observe(expected,label){
   const [overview,roster,all]=await Promise.all([
    db.query(overviewSql),db.query(rosterSql),db.query(brandsSql,['published'])
   ]);
   const count=Number(overview.rows[0].verifiedBrands);
   assert.equal(count,roster.rowCount,'count_roster_drift_'+label);
   assert.equal(count,baselineRoster.rowCount+expected,'count_delta_'+label);
   const relevant=roster.rows.filter(x=>x.slug&&x.slug.startsWith('ci-roster-'+token+'-'));
   assert.equal(relevant.length,expected,'unqualified_brand_entered_roster_'+label);
   const eligible=all.rows.filter(x=>String(x.slug||'').startsWith('ci-roster-'+token+'-'));
   assert.equal(eligible.length,6,'published_fixture_count_'+label);
   for(const row of eligible){
    assert.equal(row.madeInMoscowVerified,expected===1&&row.slug===slugs.valid,
      'brand_verified_projection_drift_'+label+'_'+row.slug);
   }
  }
  await observe(1,'only_valid');
  await db.query("UPDATE public.partner_programs SET status='paused' WHERE id=$1",[programId]);
  // Pausing a programme must immediately revoke public Verified claims.
  const paused=await db.query(rosterSql);
  const pausedOverview=await db.query(overviewSql);
  assert.equal(paused.rowCount,0,'paused_programme_still_listed');
  assert.equal(Number(pausedOverview.rows[0].verifiedBrands),0,'paused_programme_still_counted');
  const pausedBrands=await db.query(brandsSql,['published']);
  const validPaused=pausedBrands.rows.find(x=>x.slug===slugs.valid);
  assert(validPaused&&!validPaused.madeInMoscowVerified,'paused_programme_still_badged');
  await db.query("UPDATE public.partner_programs SET status='active' WHERE id=$1",[programId]);
  await observe(1,'resumed_programme');
  const valid=await db.query('SELECT id FROM public.brands WHERE slug=$1',[slugs.valid]);
  await db.query("UPDATE public.brand_program_memberships SET status='revoked' WHERE brand_id=$1 AND program_id=$2",
   [valid.rows[0].id,programId]);
  await observe(0,'revoked_membership');
  await db.query('ROLLBACK');active=false;
  console.log(JSON.stringify({event:'mfw_made_roster_parity_scratch_pg17',status:'pass',
   cases:8,pausedProgram:true,revocation:true,countRosterParity:true,
   brandsProjectionParity:true,productionAdmitted:false}));
 }finally{
  if(active)await db.query('ROLLBACK').catch(()=>{});
  db.release();
  await pool.end();
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
