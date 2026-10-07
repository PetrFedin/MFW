const assert=require('assert');
const fs=require('fs');
const path=require('path');

const dir=path.join(__dirname,'migrations');
const files=fs.readdirSync(dir).filter(f=>f.endsWith('.sql')).sort();
const parsed=files.map(name=>{
  const m=name.match(/^(\d{3})_(.+)\.sql$/);
  assert(m,'invalid_migration_filename:'+name);
  return {name,number:Number(m[1])};
});

const seen=new Map();
for(const row of parsed){
  assert(!seen.has(row.number),'duplicate_migration_number:'+String(row.number).padStart(3,'0')+':'+seen.get(row.number)+':'+row.name);
  seen.set(row.number,row.name);
}

for(let n=1;n<=parsed.length;n++){
  assert(seen.has(n),'missing_migration_number:'+String(n).padStart(3,'0'));
}

assert.equal(parsed[0].number,1,'migration_sequence_must_start_at_001');
assert.equal(parsed[parsed.length-1].number,parsed.length,'migration_sequence_must_be_contiguous');

console.log(JSON.stringify({
  event:'migration_order_contract',
  status:'pass',
  migrations:parsed.length,
  first:parsed[0].name,
  last:parsed[parsed.length-1].name
}));
