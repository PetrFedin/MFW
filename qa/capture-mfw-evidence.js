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

async function prepareMfwPublicDemo(page){
 await choose(page,'mfw');
 // The MFW interface explicitly labels this as a CONCEPT DEMO.
 // These two flags affect this disposable Chromium profile only.
 // No backend signup, QR-pass issuing or stored personal identity.
 await page.locator('#eventFrame').evaluate(frame=>{
  const w=frame.contentWindow;
  w.localStorage.setItem('mfwOpeningSeen','1');
  w.localStorage.setItem('mfwOnboarded','1');
  w.location.reload();
 });
 await page.frameLocator('#eventFrame').locator('[data-tab="schedule"]')
   .first().waitFor({state:'visible',timeout:30000});
 await delay(950);
}
async function visitInside(page,selector,description){
 const button=page.frameLocator('#eventFrame').locator(selector).first();
 await button.click({timeout:20000});
 // Keep the actual BFS view in frame: otherwise mobile screenshots repeat
 // the static header rather than showing the changed programme or directory.
 if(selector.startsWith('[data-view=')||selector==='#orgDirectory'){
  const content=page.frameLocator('#eventFrame').locator('#content');
  await content.waitFor({state:'visible',timeout:20000});
  await content.evaluate(el=>el.scrollIntoView({behavior:'instant',block:'start'}));
  if((await content.innerText()).trim().length<60)throw Error('empty_bfs_content_'+description);
 }
 await delay(900);
 if(!(await page.locator('#eventFrame').count()))
  throw Error('frame_missing_'+description);
}
async function addFeatureScreen(page,out,record,selector,name){
 try{
  await visitInside(page,selector,name);
  record.screenshots.push(await screenshot(page,out,name));
 }catch(error){
  record.warnings.push({scene:name,error:String(error.message||error).slice(0,320)});
 }
}
async function captureInternalScreens(page,out,record,mobile){
 const prefix=mobile?'mobile-':'desktop-';
 try{
  await prepareMfwPublicDemo(page);
  for(const [slug,selector] of [
   ['mfw-schedule','[data-tab="schedule"]'],
   ['mfw-discover','[data-tab="discover"]'],
   ...(mobile?[]:[['mfw-live','[data-tab="live"]']])
  ])await addFeatureScreen(page,out,record,selector,prefix+slug);
 }catch(error){record.warnings.push({scene:prefix+'mfw-demo',error:String(error.message||error).slice(0,350)});}
 try{
  await choose(page,'bfs');
  for(const [slug,selector] of [
   ['bfs-programme','[data-view="programme"]'],
   ...(mobile?[]:[['bfs-speakers','[data-view="speakers"]']]),
   ['bfs-b2b','[data-view="b2b"]'],
   ...(mobile?[]:[['bfs-organisations','#orgDirectory']])
  ])await addFeatureScreen(page,out,record,selector,prefix+slug);
 }catch(error){record.warnings.push({scene:prefix+'bfs-interior',error:String(error.message||error).slice(0,350)});}
 try{
  await choose(page,'made');
  for(const [slug,selector] of [
   ['made-verified','[data-section="verified"]'],
   ...(mobile?[]:[['made-brands','[data-section="hub"]'],['made-market','[data-section="market"]']]),
   ['made-buyer','[data-section="buyer"]'],
   ...(mobile?[]:[['made-brand365','[data-section="brand365"]'],['made-evidence','[data-section="evidence"]']])
  ])await addFeatureScreen(page,out,record,selector,prefix+slug);
 }catch(error){record.warnings.push({scene:prefix+'made-interior',error:String(error.message||error).slice(0,350)});}
}
async function recordFeatureTour(browser,target,out,topic){
 const dir=path.join(OUTPUT,'_raw_video_'+target.id+'_'+topic);mkdir(dir);
 const context=await browser.newContext({
  viewport:{width:1280,height:720},deviceScaleFactor:1,locale:'ru-RU',
  reducedMotion:'reduce',recordVideo:{dir,size:{width:1280,height:720}}
 });
 let video=null;
 try{
  const page=await context.newPage();
  const started=Date.now();
  await enter(page,target);
  const progress=async(selector,atMs)=>{
   await visitInside(page,selector,topic);
   await delay(Math.max(0,atMs-(Date.now()-started)));
  };
  if(topic==='mfw'){
   await prepareMfwPublicDemo(page);
   await progress('[data-tab="schedule"]',7600);
   await progress('[data-tab="discover"]',15100);
   await progress('[data-tab="live"]',21000);
  }else if(topic==='bfs'){
   await choose(page,'bfs');
   await progress('[data-view="programme"]',6900);
   await progress('[data-view="speakers"]',12800);
   await progress('[data-view="b2b"]',19000);
   await progress('#orgDirectory',23200);
  }else if(topic==='made'){
   await choose(page,'made');
   await progress('[data-section="verified"]',7100);
   await progress('[data-section="hub"]',13200);
   await progress('[data-section="buyer"]',19200);
   await progress('[data-section="brand365"]',23200);
  }else throw Error('unsupported_recording_topic');
  await delay(Math.max(0,25800-(Date.now()-started)));
  video=page.video();
 }finally{await context.close();}
 if(!video)throw Error('missing_browser_recording_'+topic);
 const raw=await video.path();
 const mp4=path.join(out,topic+'-tour-25s.mp4');
 cp.execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y',
  '-i',raw,'-vf','fps=20,scale=1280:720:flags=lanczos,format=yuv420p',
  '-c:v','libx264','-preset','veryfast','-crf','24',
  '-movflags','+faststart','-an','-t','25',mp4],{timeout:120000});
 if(!fs.existsSync(mp4)||fs.statSync(mp4).size<25000)
  throw Error('missing_or_small_mp4_'+topic);
 const seconds=Number(cp.execFileSync('ffprobe',['-v','error','-show_entries',
  'format=duration','-of','default=noprint_wrappers=1:nokey=1',mp4],{encoding:'utf8'}).trim());
 if(!(seconds>=20&&seconds<=30))throw Error('invalid_video_duration_'+seconds);
 return {topic,file:topic+'-tour-25s.mp4',durationSeconds:seconds,
  bytes:fs.statSync(mp4).size,sha256:hash(mp4)};
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
  status:'failed',screenshots:[],video:null,extraVideos:[],warnings:[],pageErrors:[],error:null,
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
  await captureInternalScreens(page,out,record,false);
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
  await captureInternalScreens(phone,out,record,true);
  await ctx.close();ctx=null;
  record.video=await recordTour(browser,target,out);
  for(const topic of ['mfw','bfs','made']){
   try{record.extraVideos.push(await recordFeatureTour(browser,target,out,topic));}
   catch(error){record.warnings.push({scene:'video-'+topic,error:String(error.message||error).slice(0,420)});}
  }
  const seen=new Map();
  for(const shot of record.screenshots){
   if(seen.has(shot.sha256))
    record.warnings.push({scene:shot.file,error:'duplicate_visual_frame_of_'+seen.get(shot.sha256)});
   else seen.set(shot.sha256,shot.file);
  }
  if(record.screenshots.length!==26)
   record.warnings.push({scene:'screen_inventory',error:'expected_26_PNG_got_'+record.screenshots.length});
  if(record.extraVideos.length!==3)
   record.warnings.push({scene:'video_inventory',error:'expected_3_feature_tours_got_'+record.extraVideos.length});
  if(record.pageErrors.length)
   record.warnings.push({scene:'browser_javascript',error:'uncaught_'+record.pageErrors.join('; ').slice(0,500)});
  record.portfolioReady=record.warnings.length===0&&record.pageErrors.length===0&&!!record.video;
  record.status=record.portfolioReady?'portfolio_ready':'diagnostic_only';
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
 if(!report.sources.some(x=>x.portfolioReady===true))process.exitCode=1;
})().catch(err=>{console.error(err);process.exitCode=1;});
