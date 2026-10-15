'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const NAME_PATTERN = /^(\d{3})_[a-z0-9][a-z0-9_]*\.sql$/;
function fail(code, detail = '') {
  const err = new Error(detail ? code + ':' + detail : code);
  err.code = code;
  throw err;
}

function validateFiles(files) {
  if (!Array.isArray(files)) fail('migration_files_invalid');
  const sorted = [...files].sort();
  sorted.forEach((name, index) => {
    if (typeof name !== 'string') fail('migration_filename_invalid', String(name));
    const match = NAME_PATTERN.exec(name);
    if (!match) fail('migration_filename_invalid', name);
    if (Number(match[1]) !== index + 1) fail('migration_sequence_invalid', name);
  });
  return sorted;
}

function planMigrations(files, applied) {
  const required = validateFiles(files);
  if (!Array.isArray(applied) || applied.some(x => typeof x !== 'string')) {
    fail('migration_history_invalid');
  }
  const appliedSet = new Set(applied);
  if (appliedSet.size !== applied.length) fail('migration_history_duplicate');
  const requiredSet = new Set(required);
  const unknown = applied.filter(name => !requiredSet.has(name));
  if (unknown.length) fail('migration_history_unknown', unknown.sort().join(','));
  const prefix = required.slice(0, applied.length);
  if (prefix.some(name => !appliedSet.has(name))) fail('migration_history_not_prefix');
  return { requiredFiles: required, pendingFiles: required.slice(applied.length) };
}

function gitBlobSha(content) {
  const bytes = Buffer.isBuffer(content) ? content : Buffer.from(content);
  return crypto.createHash('sha1')
    .update(Buffer.from('blob ' + bytes.length + '\0'))
    .update(bytes)
    .digest('hex');
}

function loadLockedMigrations(dir, lockPath) {
  const files = validateFiles(fs.readdirSync(dir).filter(name => name.endsWith('.sql')));
  let lock;
  try { lock = JSON.parse(fs.readFileSync(lockPath, 'utf8')); }
  catch (_) { fail('migration_lock_unreadable'); }
  if (!lock || lock.format !== 'mfw-git-blob-lock-v1' || !lock.files ||
      typeof lock.files !== 'object' || Array.isArray(lock.files)) {
    fail('migration_lock_invalid');
  }
  const lockedFiles = Object.keys(lock.files).sort();
  if (JSON.stringify(lockedFiles) !== JSON.stringify(files)) fail('migration_lock_file_set_mismatch');
  const sql = new Map();
  for (const name of files) {
    const content = fs.readFileSync(path.join(dir, name));
    if (!content.length) fail('migration_sql_empty', name);
    if (!/^[a-f0-9]{40}$/.test(String(lock.files[name])) ||
        gitBlobSha(content) !== lock.files[name]) fail('migration_lock_hash_mismatch', name);
    sql.set(name, content.toString('utf8'));
  }
  return { files, sql };
}

module.exports = { validateFiles, planMigrations, gitBlobSha, loadLockedMigrations };
