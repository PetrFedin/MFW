'use strict';
// Evidence from live public browser interactions only; no sign-in, mockups,
// fake Check-ins, or generated pictures.
const {chromium}=require('@playwright/test');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const cp=require('node:child_process');

const OUTPUT=path.resolve(process.env.MFW_CAPTURE_OUTPUT||path.join(__dirname,'..','_mfw_evidence'));
const SHA=process.env.GITHUB_SHA||'unknown';
const WHEN=new Date().toISOString();
const FRAME={
  mfw:'../mfw/index.html',
  bfs:'./bfs/index.html',
  made:'./made-in-moscow/index.html'
};
const TARGETS=[
  {id:'production',url:'https://mfw-platform.onrender.com/platform/index.html',sourceSha:null},
  {id:'integration-preview',url:'http://127.0.0.1:4173/platform/index.html',sourceSha:SHA}
];
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const mkdir=dir=>fs.mkdirSync(dir,{recursive:true});
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
async function enter(page,target){
 let last=null;
 for(let attempt=0;attempt<3;attempt++){
  try{
   const response=await page.goto(target.url,{waitUntil:'domcontentloaded',timeout:95000});
   if(!response||!response.ok())throw Error('navigation_http_'+(response&&response.status()));
   await page.locator('[data-event="mfw"]').waitFor({state:'visible',timeout:40000});
   return;
  }catch(error){last=error;if(attempt<2)await delay(4500);}
 }
 throw last;
}
async function choose(page,key){
 await page.locator('[data-event="'+key+'"]').click({timeout:30000});
 await page.waitForFunction(data=>{
   const el=document.getElementById('eventFrame');
   if(!el||el.getAttribute('src')!==data.expected)return false;
   const doc=el.contentDocument;
   return !!(doc&&doc.body&&(doc.body.innerText||'').trim().length>110);
 },{expected:FRAME[key]},{timeout:50000});
 await delay(900);
}
async function screenshot(page,out,name){
 const file=path.join(out,name+'.png');
 await page.screenshot({path:file,fullPage:false,animations:'disabled',timeout:35000});
 if(!fs.existsSync(file)||fs.statSync(file).size<1024)throw Error('missing_or_blank_png_'+name);
 return {file:name+'.png',bytes:fs.statSync(file).size,sha256:hash(file)};
}
async function recordTour(browser,target,out){
 const dir=path.join(OUTPUT,'_raw_video_'+target.id);mkdir(dir);
 const context=await browser.newContext({
  viewport:{width:1280,height:720},deviceScaleFactor:1,locale:'ru-RU',
  reducedMotion:'reduce',recordVideo:{dir,size:{width:1280,height:720}}
 });
 let webm=null;
 try{
  const page=await context.newPage();
  const start=Date.now();
  await enter(page,target);
  await choose(page,'mfw');
  await delay(Math.max(0,5600-(Date.now()-start)));
  await choose(page,'bfs');
  await delay(Math.max(0,11700-(Date.now()-start)));
  await choose(page,'made');
  await delay(Math.max(0,18200-(Date.now()-start)));
  await page.locator('#investorBtn').click({timeout:20000});
  await page.locator('#investorModal:not(.hidden)').waitFor({timeout:20000});
  await delay(Math.max(0,26500-(Date.now()-start)));
  webm=page.video();
 }finally{await context.close();}
 const raw=await webm.path();
 const mp4=path.join(out,'tour-25s.mp4');
 cp.execFileSync('ffmpeg',[
   '-hide_banner','-loglevel','error','-y','-i',raw,
   '-vf','fps=20,scale=1280:720:flags=lanczos,format=yuv420p',
   '-c:v','libx264','-preset','veryfast','-crf','26',
   '-movflags','+faststart','-an','-t','25',mp4
 ],{timeout:120000});
 if(!fs.existsSync(mp4)||fs.statSync(mp4).size<20480)throw Error('missing_video');
 const seconds=Number(cp.execFileSync('ffprobe',['-v','error','-show_entries',
   'format=duration','-of','default=noprint_wrappers=1:nokey=1',mp4],{encoding:'utf8'}).trim());
 if(!(seconds>=20&&seconds<=30))throw Error('incorrect_video_duration_'+seconds);
 return {file:'tour-25s.mp4',durationSeconds:seconds,
   bytes:fs.statSync(mp4).size,sha256:hash(mp4)};
}
async function capture(browser,target){
 const out=path.join(OUTPUT,target.id);mkdir(out);
 const record={
  id:target.id,url:target.url,sourceSha:target.sourceSha,
  capturedAt:WHEN,environment:target.id==='production'?'published-live':'unmerged-integration-preview',
  status:'failed',screenshots:[],video:null,pageErrors:[],error:null,
  method:'Public Chromium browser capture without authentication'
 };
 let ctx=null;
 try{
  ctx=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,
    locale:'ru-RU',reducedMotion:'reduce'});
  const page=await ctx.newPage();
  page.on('pageerror',err=>record.pageErrors.push(String(err.message).slice(0,250)));
  await enter(page,target);
  for(const key of ['mfw','bfs','made']){
   await choose(page,key);
   record.screenshots.push(await screenshot(page,out,'desktop-'+key));
  }
  await page.locator('#investorBtn').click({timeout:15000});
  await page.locator('#investorModal:not(.hidden)').waitFor({timeout:15000});
  record.screenshots.push(await screenshot(page,out,'desktop-investor'));
  await ctx.close();ctx=null;
  ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,
    locale:'ru-RU',isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const phone=await ctx.newPage();
  phone.on('pageerror',err=>record.pageErrors.push(String(err.message).slice(0,250)));
  await enter(phone,target);
  for(const key of ['mfw','bfs','made']){
   await choose(phone,key);
   record.screenshots.push(await screenshot(phone,out,'mobile-'+key));
  }
  await ctx.close();ctx=null;
  record.video=await recordTour(browser,target,out);
  record.status='captured';
 }catch(error){
  record.error=String(error&&error.stack||error).slice(0,1300);
 }finally{
  if(ctx)await ctx.close().catch(()=>{});
  fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(record,null,2)+'\n');
 }
 return record;
}
(async()=>{
 mkdir(OUTPUT);
 const report={
  schema:'mfw-public-browser-evidence-v1',capturedAt:WHEN,captureCommit:SHA,
  warning:'Production source SHA not attested: a branch build is not the published release.',
  consent:'Public screen only: no login, user registration, private data or simulated transactions',
  sources:[]
 };
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{for(const target of TARGETS)report.sources.push(await capture(browser,target));}
 finally{await browser.close();}
 fs.writeFileSync(path.join(OUTPUT,'manifest.json'),JSON.stringify(report,null,2)+'\n');
 process.stdout.write(JSON.stringify(report.sources.map(r=>({
  environment:r.id,status:r.status,shots:r.screenshots.length,
  seconds:r.video&&r.video.durationSeconds,error:r.error
 })))+'\n');
 if(!report.sources.some(x=>x.status==='captured'))process.exitCode=1;
})().catch(err=>{console.error(err);process.exitCode=1;});
