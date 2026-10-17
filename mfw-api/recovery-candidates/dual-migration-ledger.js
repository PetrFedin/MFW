'use strict';
// Review-only, never imported by runtime. Histories belong to two independent
// migration frameworks; matching ordinal numbers never prove SQL equivalence.
const VERSION='mfw-dual-migration-ledger-review-v1';
const APP=/^([0-9]{3})_[a-z0-9][a-z0-9_]*\.sql$/;
const TOOL=/^mfw_([0-9]{3})_[a-z0-9][a-z0-9_]*$/;
function deny(code){const error=new Error(code);error.code=code;throw error;}
function names(data,label){
  if(!Array.isArray(data))deny(label+'_not_array');
  const rows=data.map(x=>{
    const name=typeof x==='string'?x:x&&typeof x==='object'&&!Array.isArray(x)?x.filename:null;
    if(typeof name!=='string'||!APP.test(name))deny(label+'_invalid_filename');
    return name;
  });
  if(new Set(rows).size!==rows.length)deny(label+'_duplicate');
  return rows.sort();
}
function tools(data){
  if(!Array.isArray(data))deny('platform_history_not_array');
  const seen=new Set();
  return data.map(x=>{
    if(!x||typeof x!=='object'||Array.isArray(x)||
        typeof x.version!=='string'||!/^[0-9]{14}$/.test(x.version)||
        typeof x.name!=='string'||!/^[a-z][a-z0-9_]{1,160}$/.test(x.name))
      deny('platform_history_invalid');
    if(seen.has(x.version))deny('platform_history_duplicate_version');
    seen.add(x.version);
    return {version:x.version,name:x.name};
  }).sort((a,b)=>a.version.localeCompare(b.version));
}
function isSequence(rows){return rows.every((name,i)=>Number(APP.exec(name)[1])===i+1);}
function auditDualMigrationLedgers(input={}){
  const {executableFiles,recoveredGitFiles,appliedAppHistory,platformHistorySample}=input;
  const executable=names(executableFiles,'executable_files');
  const recovered=names(recoveredGitFiles,'recovered_git_files');
  const applied=names(appliedAppHistory,'applied_app_history');
  const platform=tools(platformHistorySample);
  const executableSet=new Set(executable);
  if(recovered.some(x=>executableSet.has(x)))deny('recovered_file_already_executable');
  const knownSet=new Set([...executable,...recovered]);
  const recoveredSet=new Set(recovered);
  const unknown=applied.filter(x=>!knownSet.has(x));
  const notApplied=[...knownSet].filter(x=>!applied.includes(x)).sort();
  const outside=applied.filter(x=>!executableSet.has(x));
  const recoveredOutside=outside.filter(x=>recoveredSet.has(x));
  const appByOrdinal=new Map(applied.map(x=>[APP.exec(x)[1],x]));
  const collisions=[],platformOnly=[];
  for(const row of platform){
    const match=TOOL.exec(row.name);
    if(!match)continue;
    const app=appByOrdinal.get(match[1]);
    if(!app){platformOnly.push(match[1]);continue;}
    if(row.name!=='mfw_'+app.slice(0,-4))
      collisions.push({ordinal:match[1],appFile:app,platformName:row.name});
  }
  const appSequenceValid=isSequence(applied);
  const executableSequenceValid=isSequence(executable);
  return Object.freeze({
    version:VERSION,scope:'supplied_read_only_metadata',
    executableCount:executable.length,appliedAppCount:applied.length,
    recoveredGitCount:recovered.length,platformSampleCount:platform.length,
    appSequenceValid,executableSequenceValid,
    appliedOutsideExecutable:outside,
    recoveredOutsideExecutable:recoveredOutside,
    unknownAppSources:unknown,
    knownSourcesNotApplied:notApplied,
    platformOrdinalCollisions:collisions,
    platformOnlyOrdinals:[...new Set(platformOnly)].sort(),
    knownSourceCoverage:unknown.length===0&&notApplied.length===0,
    independentHistories:true,
    executedSqlBytesVerified:false,
    independentSecurityAndDbaReviewAccepted:false,
    productionAdmitted:false,
    blockers:[
      ...(!appSequenceValid?['app_history_sequence_invalid']:[]),
      ...(!executableSequenceValid?['executable_history_sequence_invalid']:[]),
      ...(outside.length?['application_sql_not_in_executable_migration_lock']:[]),
      ...(unknown.length?['unknown_application_sql_source']:[]),
      ...(notApplied.length?['known_source_not_in_app_history']:[]),
      'live_executed_sql_bytes_unattested',
      'independent_dba_and_acl_review_required'
    ]
  });
}
module.exports={VERSION,auditDualMigrationLedgers};
