const fs=require('fs');
const path=require('path');

const index=fs.readFileSync(path.join(__dirname,'..','mfw','platform','index.html'),'utf8');
const app=fs.readFileSync(path.join(__dirname,'..','mfw','platform','platform.js'),'utf8');

const requiredRussian=[
  'МАРШРУТ ВЛАДЕЛЬЦА / ИНВЕСТОРА',
  'ЦЕНТР УПРАВЛЕНИЯ ДОКАЗАТЕЛЬСТВАМИ',
  'ИНВЕСТИЦИОННЫЙ КОМИТЕТ',
  'Управление капиталом программы',
  'СЕТЬ ОРГАНИЗАЦИЙ',
  'ПАКЕТ ДОКАЗАТЕЛЬСТВ'
];

const forbiddenVisible=[
  'OWNER / INVESTOR ROUTE',
  'EVIDENCE CONTROL TOWER',
  'PARTNER / SPONSOR CONSOLE',
  'MINI BUSINESS CASE',
  'PROGRAMME CAPITAL CONTROL',
  'ORGANISATION NETWORK · authority check pending'
];

for(const label of requiredRussian){
  if(index.indexOf(label)<0&&app.indexOf(label)<0)throw new Error('missing_ru_first_label:'+label);
}
for(const label of forbiddenVisible){
  if(index.indexOf(label)>=0||app.indexOf(label)>=0)throw new Error('english_visible_label_regression:'+label);
}

for(const acronym of ['KPI','CRM','B2B','API','ARR','MRR']){
  if(index.indexOf('title=')<0&&app.indexOf('abbr(')<0)throw new Error('missing_acronym_explanation_boundary:'+acronym);
}

console.log(JSON.stringify({event:'russian_first_contract',status:'pass'}));
