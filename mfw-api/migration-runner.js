'use strict';

const path = require('path');
const { loadLockedMigrations, planMigrations } = require('./migration-preflight');

// This pins local SQL bytes, NOT historical statements already executed in another DB.
async function runMigrations(pool, options = {}) {
  const dir = options.dir || path.join(__dirname, 'migrations');
  const lockPath = options.lockPath || path.join(__dirname, 'migration-lock.json');
  const { files, sql } = loadLockedMigrations(dir, lockPath);
  const client = await pool.connect();
  let locked = false;
  try {
    await client.query("SELECT pg_advisory_lock(hashtext('mfw-authority-migrations-v1'))");
    locked = true;
    const existing = await client.query("SELECT to_regclass('public.schema_migrations') AS history_table");
    const hasHistory = !!(existing.rows[0] && existing.rows[0].history_table);
    const previous = hasHistory
      ? (await client.query('SELECT filename FROM public.schema_migrations ORDER BY filename')).rows.map(x => x.filename)
      : [];
    const plan = planMigrations(files, previous);
    if (!hasHistory) {
      const tables = await client.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname='public'");
      if (tables.rows.length) {
        const error = new Error('migration_history_missing_nonempty_schema');
        error.code = 'migration_history_missing_nonempty_schema';
        throw error;
      }
      await client.query('CREATE TABLE public.schema_migrations (filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    }
    for (const file of plan.pendingFiles) {
      await client.query('BEGIN');
      try {
        await client.query(sql.get(file));
        await client.query('INSERT INTO public.schema_migrations(filename) VALUES($1)', [file]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
      if (options.onApplied) options.onApplied(file);
    }
    return { applied: plan.pendingFiles, total: plan.requiredFiles.length };
  } finally {
    try {
      if (locked) await client.query("SELECT pg_advisory_unlock(hashtext('mfw-authority-migrations-v1'))");
    } finally { client.release(); }
  }
}

module.exports = { runMigrations };
