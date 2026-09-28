import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { fileURLToPath } from "node:url";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dir=path.join(root,"db","migrations");
const client=new pg.Client({connectionString:process.env.DATABASE_URL,ssl:process.env.PGSSLMODE==="disable"?false:{rejectUnauthorized:false}});
await client.connect();
await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
const applied=new Set((await client.query("SELECT name FROM schema_migrations")).rows.map(x=>x.name));
for(const name of (await fs.readdir(dir)).filter(x=>x.endsWith(".sql")).sort()){
 if(applied.has(name)) continue;
 const sql=await fs.readFile(path.join(dir,name),"utf8");
 console.log("Applying",name);
 await client.query(sql);
 await client.query("INSERT INTO schema_migrations(name) VALUES($1)",[name]);
}
await client.end();
console.log("Migrations complete");
