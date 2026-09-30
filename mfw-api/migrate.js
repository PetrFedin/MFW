const fs=require('fs');
const path=require('path');
const {Pool}=require('pg');

async function main(){
  if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const pool=new Pool({connectionString:process.env.DATABASE_URL,max:5});
  try{
    await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    const dir=path.join(__dirname,'migrations');
    const files=fs.readdirSync(dir).filter(f=>f.endsWith('.sql')).sort();
    for(const file of files){
      const seen=await pool.query('SELECT 1 FROM schema_migrations WHERE filename=$1',[file]);
      if(seen.rowCount) continue;
      const sql=fs.readFileSync(path.join(dir,file),'utf8');
      const client=await pool.connect();
      try{
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations(filename) VALUES($1)',[file]);
        await client.query('COMMIT');
        console.log('applied',file);
      }catch(err){
        await client.query('ROLLBACK');
        throw err;
      }finally{
        client.release();
      }
    }
  }finally{
    await pool.end();
  }
}
main().catch(err=>{console.error(err);process.exit(1);});
