'use strict';

const path = require('path');
const { loadLockedMigrations, planMigrations } = require('./migration-preflight');

// One transaction-scoped advisory lock: safe with direct and transaction-pooled PostgreSQL.
// If any statement fails, neither schema changes nor new migration history entries commit.
async function runMigrations(pool, options = {}) {
  const dir = options.dir || path.join(__dirname, 'migrations');
  const lockPath = options.lockPath || path.join(__dirname, 'migration-lock.json');
  const { files, sql } = loadLockedMigrations(dir, lockPath);
  const client = await pool.connect();
  let inTransaction = false;
  try {
    await client.query('BEGIN');
    inTransaction = true;
    await client.query("SELECT pg_advisory_xact_lock(hashtext('mfw-authority-migrations-v1'))");
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
      await client.query(sql.get(file));
      await client.query('INSERT INTO public.schema_migrations(filename) VALUES($1)', [file]);
    }
    await client.query('COMMIT');
    inTransaction = false;
    // Progress signals only emitted after the entire transaction commits.
    if (options.onApplied) for (const file of plan.pendingFiles) options.onApplied(file);
    return { applied: plan.pendingFiles, total: plan.requiredFiles.length };
  } catch (error) {
    if (inTransaction) {
      try { await client.query('ROLLBACK'); }
      catch (rollbackError) { error.rollbackError = String(rollbackError.message || rollbackError); }
    }
    throw error;
  } finally { client.release(); }
}

module.exports = { runMigrations };
