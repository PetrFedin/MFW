'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{Pool}=require('pg');
const raw=process.env.MFW_CI_PG_URL;
if(process.env.GITHUB_ACTIONS!=='true'||process.env.MFW_CI_DEFAULT_ACL!=='DISPOSABLE_ONLY'||!raw||process.env.DATABASE_URL)
  throw Error('refuse_nonisolated_default_acl_test');
const target=new URL(raw);
if(target.hostname!=='127.0.0.1'||target.port!=='5432'||target.username!=='postgres'||
   target.password!=='mfw_default_acl_scratch_only'||target.pathname!=='/mfw_acl_ci')
  throw Error('refuse_nonisolated_postgres_url');
async function canary(client,prefix,role){
 if(role==='supabase_admin')await client.query('SET ROLE supabase_admin');
 try{
  await client.query('CREATE TABLE public.'+prefix+'_table(id integer NOT NULL)');
  await client.query('CREATE SEQUENCE public.'+prefix+'_sequence');
  await client.query("CREATE FUNCTION public."+prefix+"_function() RETURNS integer LANGUAGE sql AS 'SELECT 1'");
 }finally{if(role==='supabase_admin')await client.query('RESET ROLE')}
}
async function assertCanary(client,prefix,allowed){
 for(const role of ['anon','authenticated']){
  const obj=await client.query("SELECT has_table_privilege($1,'public."+prefix+"_table','SELECT') AS read,"+
   "has_table_privilege($1,'public."+prefix+"_table','INSERT') AS write,"+
   "has_sequence_privilege($1,'public."+prefix+"_sequence','USAGE') AS sequence",[role]);
  for(const v of Object.values(obj.rows[0]))assert.equal(v,allowed,prefix+':'+role);
 }
}
(async()=>{
 const pool=new Pool({connectionString:raw,max:1,connectionTimeoutMillis:5000});
 const client=await pool.connect();
 try{
  const ver=Number((await client.query("SELECT current_setting('server_version_num') v")).rows[0].v);
  assert(ver>=170000&&ver<180000);
  assert.equal((await client.query("SELECT count(*)::int n FROM information_schema.tables WHERE table_schema='public'")).rows[0].n,0);
  for(const role of ['anon','authenticated','supabase_admin'])await client.query('CREATE ROLE '+role+' NOLOGIN');
  await client.query('GRANT CREATE ON SCHEMA public TO supabase_admin');
  for(const owner of ['postgres','supabase_admin'])
    for(const kind of ['TABLES','SEQUENCES','FUNCTIONS'])
      await client.query('ALTER DEFAULT PRIVILEGES FOR ROLE '+owner+
        ' IN SCHEMA public GRANT ALL ON '+kind+' TO anon, authenticated');
  await canary(client,'acl_before_pg','postgres');
  await canary(client,'acl_before_admin','supabase_admin');
  await assertCanary(client,'acl_before_pg',true);
  await assertCanary(client,'acl_before_admin',true);
  const sql=fs.readFileSync(path.join(__dirname,'future-object-default-privileges.sql'),'utf8');
  assert(sql.includes('NOT AUTHORISED FOR PRODUCTION'));
  await client.query(sql);
  await canary(client,'acl_after_pg','postgres');
  await canary(client,'acl_after_admin','supabase_admin');
  await assertCanary(client,'acl_after_pg',false);
  await assertCanary(client,'acl_after_admin',false);
  await assertCanary(client,'acl_before_pg',true);
  await assertCanary(client,'acl_before_admin',true);
  const fn=(await client.query("SELECT has_function_privilege('anon','public.acl_after_pg_function()','EXECUTE') AS allowed")).rows[0].allowed;
  console.log(JSON.stringify({test:'future_object_default_acl_pg17',status:'PASS_NEW_TABLES_AND_SEQUENCES',
   creators:['postgres','supabase_admin'],roles:['anon','authenticated'],
   oldObjectsUntouched:true,publicFunctionExecuteStillAccessible:fn,
   functionSecurity:'NOT_QUALIFIED',productionAdmitted:false}));
 }finally{client.release();await pool.end()}
})().catch(e=>{console.error(e);process.exitCode=1});
