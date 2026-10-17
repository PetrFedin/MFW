'use strict';
// Scoped to disposable PG17, never a real Supabase/Render database.
const assert=require('node:assert/strict');
const {Pool}=require('pg');
const uri=new URL(process.env.DATABASE_URL||'');
assert.equal(process.env.CI,'true');
assert.equal(process.env.MFW_ISOLATED_PG_CI,'true');
assert.equal(process.env.GITHUB_ACTIONS,'true');
for(const [field,value] of [
 ['protocol','postgresql:'],['hostname','127.0.0.1'],['port','5432'],
 ['username','mfw_ci'],['password','mfw_ci_local_only'],['pathname','/mfw_scratch_ci']
]) assert.equal(uri[field],value,'not_disposable_pg_'+field);

const owners=['ci_acl_creator_a','ci_acl_creator_b'];
const recipients=['ci_acl_anon','ci_acl_authenticated','ci_acl_service'];
const roles=[...owners,...recipients];
const suffix=['a','b'];
async function privileges(pool,kind,name,role){
 const sql=kind==='table'?'SELECT has_table_privilege($1,$2,$3) AS granted':
   kind==='sequence'?'SELECT has_sequence_privilege($1,$2,$3) AS granted':
   'SELECT has_function_privilege($1,$2,$3) AS granted';
 const action=kind==='function'?'EXECUTE':kind==='sequence'?'USAGE':'SELECT';
 const r=await pool.query(sql,[role,'public.'+name+(kind==='function'?'()':''),action]);
 return r.rows[0].granted;
}
async function makeCanaries(pool,owner,prefix){
 await pool.query('SET ROLE '+owner);
 try{
   await pool.query('CREATE TABLE public.'+prefix+'_table (id bigint PRIMARY KEY)');
   await pool.query('CREATE SEQUENCE public.'+prefix+'_seq');
   await pool.query('CREATE FUNCTION public.'+prefix+'_fn() RETURNS integer LANGUAGE sql AS $$ SELECT 1 $$');
 } finally {
   await pool.query('RESET ROLE');
 }
}
async function check(pool,prefix,hasGrant){
 for(const actor of recipients){
   for(const [type,name] of [
     ['table',prefix+'_table'],['sequence',prefix+'_seq'],['function',prefix+'_fn']
   ]) {
     const actual=await privileges(pool,type,name,actor);
     assert.equal(actual,hasGrant,type+': '+name+' '+actor);
   }
 }
}
async function main(){
 const pool=new Pool({connectionString:uri.toString(),max:1});
 try{
   const version=await pool.query("SELECT current_setting('server_version_num') AS n");
   assert.equal(Math.floor(Number(version.rows[0].n)/10000),17);
   for(const role of roles)await pool.query('CREATE ROLE '+role+' NOLOGIN');
   for(const role of owners)await pool.query('GRANT USAGE,CREATE ON SCHEMA public TO '+role);
   for(const role of recipients)await pool.query('GRANT USAGE ON SCHEMA public TO '+role);
   // Reproduce the observed dangerous per-schema automatic grants for each
   // creator role. Fixed test roles stand in for postgres and supabase_admin.
   for(const owner of owners){
     for(const kind of ['TABLES','SEQUENCES','FUNCTIONS']){
       await pool.query('ALTER DEFAULT PRIVILEGES FOR ROLE '+owner+
         ' IN SCHEMA public GRANT ALL ON '+kind+' TO '+recipients.join(','));
     }
   }
   for(let i=0;i<owners.length;i++){
     await makeCanaries(pool,owners[i],'ci_acl_before_'+suffix[i]);
     await check(pool,'ci_acl_before_'+suffix[i],true);
   }
   // Demonstrate PostgreSQL's important global-functions exception:
   // per-schema revoke alone does NOT eliminate public default EXECUTE.
   for(const owner of owners){
     await pool.query('ALTER DEFAULT PRIVILEGES FOR ROLE '+owner+
       ' IN SCHEMA public REVOKE ALL ON TABLES FROM '+recipients.join(','));
     await pool.query('ALTER DEFAULT PRIVILEGES FOR ROLE '+owner+
       ' IN SCHEMA public REVOKE ALL ON SEQUENCES FROM '+recipients.join(','));
     await pool.query('ALTER DEFAULT PRIVILEGES FOR ROLE '+owner+
       ' IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM '+recipients.join(','));
     // Crucial: no IN SCHEMA clause here; global PUBLIC EXECUTE is a default.
     await pool.query('ALTER DEFAULT PRIVILEGES FOR ROLE '+owner+
       ' REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC');
   }
   for(let i=0;i<owners.length;i++){
     await makeCanaries(pool,owners[i],'ci_acl_after_'+suffix[i]);
     await check(pool,'ci_acl_after_'+suffix[i],false);
     // Default ACL changes must not silently remove old object privileges.
     await check(pool,'ci_acl_before_'+suffix[i],true);
   }
   const drift=await pool.query(
     "SELECT pg_get_userbyid(d.defaclrole) AS creator, e.grantee::regrole::text AS grantee, d.defaclobjtype AS kind "+
     "FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) e "+
     "WHERE pg_get_userbyid(d.defaclrole)=ANY($1::text[]) "+
     "AND e.grantee::regrole::text=ANY($2::text[])",
     [owners,recipients]);
   assert.equal(drift.rowCount,0,'new default privileges remain exposed');
   console.log(JSON.stringify({event:'mfw_default_acl_canary_pg17',status:'pass',
     owners:owners.length,readers:recipients.length,
     tableSequenceFunctionDefaults:'denied_for_new_objects',
     existingObjectGrants:'unchanged',
     globalPublicFunctionExecute:'revoked_for_future_functions',
     productionAdmitted:false,liveDatabaseTouched:false}));
 }finally{await pool.end();}
}
main().catch(err=>{console.error(err);process.exitCode=1;});
