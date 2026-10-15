'use strict';
const { Pool } = require('pg');
const { runMigrations } = require('./migration-runner');

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const pool = new Pool({ connectionString:process.env.DATABASE_URL, max:5 });
  try {
    await runMigrations(pool,{ onApplied:file=>console.log('applied',file) });
  } finally { await pool.end(); }
}
main().catch(error=>{ console.error(error); process.exit(1); });
