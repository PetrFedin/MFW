'use strict';

// Exact migration history is an admission contract, not a minimum-version hint.
// Never infer that unknown migrations in a live database are safe.
function reconcileMigrations(requiredFiles,appliedFiles){
  if(!Array.isArray(requiredFiles)||!Array.isArray(appliedFiles)){
    throw new TypeError('migration_lists_required');
  }
  const required=requiredFiles.map(String);
  const applied=appliedFiles.map(String);
  const requiredSet=new Set(required);
  const appliedSet=new Set(applied);
  const repeatedRequired=required.filter((name,index)=>required.indexOf(name)!==index);
  const repeatedApplied=applied.filter((name,index)=>applied.indexOf(name)!==index);
  const missingMigrations=[...requiredSet].filter(name=>!appliedSet.has(name)).sort();
  const unexpectedMigrations=[...appliedSet].filter(name=>!requiredSet.has(name)).sort();
  const duplicateMigrations=[...new Set([...repeatedRequired,...repeatedApplied])].sort();
  return {
    ready:!missingMigrations.length&&!unexpectedMigrations.length&&!duplicateMigrations.length,
    missingMigrations,
    unexpectedMigrations,
    duplicateMigrations
  };
}

module.exports={reconcileMigrations};
