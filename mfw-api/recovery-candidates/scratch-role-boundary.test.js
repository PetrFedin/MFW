'use strict';
const assert=require('node:assert/strict');
const {Pool}=require('pg');
// Disposable PG17 only, never accept a Render/Supabase URL.
if(process.env.GITHUB_ACTIONS!=='true'||
   process.env.MFW_DISPOSABLE_PG17_TEST!=='yes'||
   !process.env.DATABASE_URL)throw Error('isolated_ci_flag_required');
const u=new URL(process.env.DATABASE_URL);
if(u.hostname!=='127.0.0.1'||u.port!=='5432'||
   u.username!=='mfw_ci'||u.password!=='mfw_ci_disposable_only'||
   u.pathname!=='/mfw_ci')throw Error('non_scratch_database_forbidden');
const tables=['authority_outbox','authority_delivery_receipts'];
const roles=['mfw_ci_anon_probe','mfw_ci_authenticated_probe'];
async function main(){
  const pool=new Pool({connectionString:u.toString(),max:1});
  const client=await pool.connect();
  try {
    const version=await client.query("SELECT current_setting('server_version_num') AS v");
    assert.equal(Math.floor(Number(version.rows[0].v)/10000),17);
    for(const role of roles){
      // Validated fixed role names only: no external user input.
      await client.query('CREATE ROLE '+role+' NOLOGIN');
      await client.query('GRANT USAGE ON SCHEMA public TO '+role);
    }
    for(const table of tables){
      const result=await client.query(
        "SELECT c.relrowsecurity AS enabled,c.relforcerowsecurity AS forced FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=$1",
        [table]);
      assert.equal(result.rowCount,1);
      assert.equal(result.rows[0].enabled,true,'RLS must be enabled');
      const policies=await client.query(
        "SELECT count(*)::int AS n FROM pg_policies WHERE schemaname='public' AND tablename=$1",[table]);
      assert.equal(policies.rows[0].n,0,'unexpected broad public policy');
      for(const role of roles){
        for(const privilege of ['SELECT','INSERT','UPDATE','DELETE']){
          const grant=await client.query('SELECT has_table_privilege($1,$2,$3) AS granted',
            [role,'public.'+table,privilege]);
          assert.equal(grant.rows[0].granted,false,'unexpected '+privilege+' grant to '+role);
        }
      }
    }
    for(const role of roles){
      await client.query('SET ROLE '+role);
      try{
        for(const table of tables){
          let denied;
          try{await client.query('SELECT id FROM public.'+table+' LIMIT 1');}
          catch(e){denied=e;}
          assert(denied,'select unexpectedly permitted: '+role+' '+table);
          assert.equal(denied.code,'42501','expected insufficient_privilege');
        }
      }finally{
        await client.query('RESET ROLE');
      }
    }
    console.log(JSON.stringify({
      gate:'scratch_pg17_role_privilege_denials',
      status:'pass',
      roles:roles.length,
      tables:tables.length,
      tested:'direct SQL privileges and RLS in scratch only',
      jwtOrTenantVerified:false,
      productionAdmitted:false
    }));
  }finally{
    client.release();
    await pool.end();
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
