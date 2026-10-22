'use strict';
// Build a portable media gallery only from verified Chromium recordings.
// This is never evidence of actual QR admission, revenue or live identities.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');

const SHA256=/^[0-9a-f]{64}$/,COMMIT=/^[0-9a-f]{40}$/;
const IMAGE=/^[a-z0-9-]+\.png$/,MOVIE=/^[a-z0-9-]+\.mp4$/;
const TOPICS=new Set(['mfw','bfs','made']);
const CAPTURE_COUNT=26;
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&#39;'}[ch]));
const label=name=>name.replace(/\.(png|mp4)$/,'').replace(/^(desktop|mobile)-/,'').replace(/-tour-25s$/,'').replace(/-/g,' ').toUpperCase();

function validFile(root,source,item,type){
  if(!item||typeof item.file!=='string'||!(type==='image'?IMAGE:MOVIE).test(item.file))return false;
  if(!Number.isInteger(item.bytes)||item.bytes<(type==='image'?1024:20480)||!SHA256.test(item.sha256||''))return false;
  const filename=path.join(root,source.id,item.file);
  if(!fs.existsSync(filename)||fs.statSync(filename).size!==item.bytes||hash(filename)!==item.sha256)return false;
  const header=Buffer.alloc(12),fd=fs.openSync(filename,'r');
  try{fs.readSync(fd,header,0,12,0);}finally{fs.closeSync(fd);}
  return type==='image'?header.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):
    header.toString('ascii',4,8)==='ftyp';
}
function qualified(root,manifest,source){
  const errors=[],images=Array.isArray(source.screenshots)?source.screenshots:[];
  const videos=[source.video].concat(Array.isArray(source.extraVideos)?source.extraVideos:[]);
  if(!['production','integration-preview'].includes(source.id))errors.push('unknown_environment');
  if(source.environment!==(source.id==='production'?'published-live':'unmerged-integration-preview'))errors.push('environment_mismatch');
  if(source.id==='integration-preview'&&(!COMMIT.test(manifest.captureCommit||'')||source.sourceSha!==manifest.captureCommit))errors.push('revision_mismatch');
  if(source.status!=='portfolio_ready'||source.portfolioReady!==true)errors.push('capture_not_portfolio_ready');
  if((source.warnings||[]).length||(source.pageErrors||[]).length||source.error)errors.push('capture_errors_present');
  if(images.length!==CAPTURE_COUNT)errors.push('screenshot_inventory');
  if(videos.length!==4||!source.video||!Array.isArray(source.extraVideos)||source.extraVideos.length!==3)errors.push('video_inventory');
  if(new Set(images.map(x=>x.file)).size!==images.length||new Set(images.map(x=>x.sha256)).size!==images.length)errors.push('duplicate_screen');
  for(const image of images)if(!validFile(root,source,image,'image')){errors.push('invalid_image_or_hash');break;}
  const topics=new Set();
  for(const video of videos){
    if(!validFile(root,source,video,'video')||!(video.durationSeconds>=20&&video.durationSeconds<=30)){errors.push('invalid_video_or_duration');break;}
    if(video!==source.video){
      if(!TOPICS.has(video.topic)||topics.has(video.topic))errors.push('invalid_video_topic');
      topics.add(video.topic);
    }
  }
  if(topics.size!==3)errors.push('missing_feature_tours');
  const ready=errors.length===0;
  return {
    id:source.id,environment:source.environment,url:source.url,
    sourceSha:source.sourceSha||null,capturedAt:source.capturedAt,
    portfolioReady:ready,errors:[...new Set(errors)],
    issueCount:(source.warnings||[]).length+(source.pageErrors||[]).length+(source.error?1:0),
    screenshots:ready?images.map(item=>({
      title:label(item.file),file:source.id+'/'+item.file,
      sha256:item.sha256,bytes:item.bytes,
      device:item.file.startsWith('mobile-')?'mobile':'desktop',
      ecosystem:item.file.includes('mfw')?'mfw':item.file.includes('bfs')?'bfs':item.file.includes('made')?'made':'platform'
    })):[],
    videos:ready?videos.map(item=>({
      title:item.topic?label(item.topic):'PLATFORM TOUR',
      file:source.id+'/'+item.file,sha256:item.sha256,bytes:item.bytes,
      durationSeconds:item.durationSeconds,ecosystem:item.topic||'platform'
    })):[]
  };
}
function renderHTML(catalog){
  const approved=catalog.sources.filter(s=>s.portfolioReady);
  const diagnostics=catalog.sources.filter(s=>!s.portfolioReady);
  function renderSource(source){
    const titles={mfw:'MOSCOW FASHION WEEK',bfs:'BRICS+ FASHION SUMMIT',made:'СДЕЛАНО В МОСКВЕ',platform:'ОБЩАЯ ПЛАТФОРМА'};
    const sections=['mfw','bfs','made','platform'].map(group=>{
      const shots=source.screenshots.filter(x=>x.ecosystem===group);
      const videos=source.videos.filter(x=>x.ecosystem===group);
      if(!shots.length&&!videos.length)return '';
      const movieCards=videos.map(v=>
        '<figure class="media video"><video controls playsinline preload="metadata" aria-label="'+esc(v.title)+'"><source src="'+esc(v.file)+'" type="video/mp4">Видео MP4 не поддерживается</video><figcaption><b>'+esc(v.title)+'</b><span>Chromium · '+esc(v.durationSeconds)+' с</span><a href="'+esc(v.file)+'">MP4 ↗</a></figcaption></figure>'
      ).join('');
      const screenCards=shots.map(x=>
        '<figure class="media"><a href="'+esc(x.file)+'"><img src="'+esc(x.file)+'" loading="lazy" alt="'+esc(x.title)+' · '+esc(source.environment)+'"></a><figcaption><b>'+esc(x.title)+'</b><span>'+esc(x.device)+' · PNG</span></figcaption></figure>'
      ).join('');
      return '<section class="section"><div class="section-header"><span>'+esc(group.toUpperCase())+'</span><h3>'+esc(titles[group])+'</h3></div>'+
        '<div class="videos">'+movieCards+'</div><div class="screenshots">'+screenCards+'</div></section>';
    }).join('');
    return '<section class="source"><div class="source-head"><div><span class="eyebrow">'+
      (source.id==='integration-preview'?'НЕОПУБЛИКОВАННАЯ ИНТЕГРАЦИОННАЯ ВЕРСИЯ':'ОПУБЛИКОВАННЫЙ САЙТ · SHA НЕ ПОДТВЕРЖДЁН')+
      '</span><h2>'+esc(source.id==='integration-preview'?'INTEGRATION PREVIEW':'PRODUCTION SCREEN CAPTURE')+
      '</h2><p>'+esc(source.url)+' · '+source.screenshots.length+' PNG · '+source.videos.length+' MP4</p></div><small>'+
      esc(source.sourceSha||'Production SHA not attested')+'</small></div>'+sections+'</section>';
  }
  const css=[
    ':root{color-scheme:dark;--bg:#090a0d;--card:#161820;--line:#343640;--white:#faf8f3;--muted:#a3a6b1;--accent:#ff5b47}',
    '*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--white);font:15px/1.5 Inter,"Helvetica Neue",Arial,sans-serif}a{color:inherit}',
    'header{padding:clamp(30px,6vw,80px) 5vw 50px;border-bottom:1px solid var(--line);background:radial-gradient(circle at 85% 5%,#6b221c 0,transparent 42%),var(--bg)}',
    '.kicker,.eyebrow,.section-header span{color:var(--accent);font-size:11px;letter-spacing:.2em;font-weight:800}',
    'h1{font-family:Georgia,serif;font-weight:400;font-size:clamp(45px,7.3vw,110px);line-height:1.02;letter-spacing:-.05em;max-width:1100px;margin:24px 0}header p{max-width:750px;color:#ddd}',
    'main{padding:0 5vw 80px}.source{padding-top:44px}.source-head{display:flex;align-items:end;justify-content:space-between;gap:20px;border-bottom:1px solid var(--line);padding-bottom:20px;flex-wrap:wrap}',
    '.source-head h2{font-size:clamp(25px,4vw,48px);letter-spacing:-.045em;margin:8px 0}.source-head p,.source-head small{color:var(--muted);overflow-wrap:anywhere}',
    '.section{margin:55px 0 65px}.section-header{border-bottom:1px solid var(--line);padding-bottom:20px;margin-bottom:22px}.section-header h3{font-size:clamp(18px,2vw,28px);letter-spacing:-.03em;margin:6px 0 0}',
    '.videos{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(360px,100%),1fr));gap:18px}.screenshots{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(250px,100%),1fr));gap:16px;margin-top:18px}',
    'figure{margin:0}.media{min-width:0;border:1px solid var(--line);background:var(--card);overflow:hidden;border-radius:12px}.media video,.media img{display:block;width:100%;aspect-ratio:16/10;object-fit:contain;background:#040506}.video video{aspect-ratio:16/9}',
    '.media figcaption{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;justify-content:space-between;padding:13px 15px}.media figcaption b{font-size:12px;letter-spacing:.03em}.media figcaption span{font-size:11px;color:var(--muted)}.media figcaption a{font-size:11px;color:var(--accent)}',
    '.warning{padding:18px 20px;border-left:3px solid var(--accent);background:#1a1a1e;margin-top:30px}.warning p{margin:.4em 0;color:var(--muted)}footer{padding:28px 5vw;border-top:1px solid var(--line);color:var(--muted);font-size:12px}',
    '@media(max-width:600px){header{padding-top:30px}.section{margin:32px 0}.media img{aspect-ratio:4/3}}'
  ].join('');
  return [
    '<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
    '<title>MFW · Портфолио экранов и видео</title><style>'+css+'</style></head>',
    '<body><header><div class="kicker">MOSCOW FASHION PLATFORM · VERIFIED BROWSER CAPTURE</div>',
    '<h1>Система в движении.<br>Экраны и рабочие сценарии.</h1>',
    '<p>Публичные экраны, снятые настоящим Chromium, и короткие видеопроходы по приложению. Интеграционный preview не является опубликованной production-версией. В архив не включены имитации платежей, выдачи QR-доступа или действий реальных участников.</p>',
    '<p>Версия захвата: <code>'+esc(catalog.captureCommit)+'</code> · '+esc(catalog.capturedAt)+'</p></header>',
    '<main>'+approved.map(renderSource).join('')+
      (diagnostics.length?'<div class="warning"><b>Отложено до исправления ошибок</b><p>'+
        diagnostics.map(s=>esc(s.id+': '+s.errors.join(', '))).join('; ')+
        '</p><p>Диагностические материалы сохранены отдельно, но исключены из презентационной галереи.</p></div>':'')+'</main>',
    '<footer>SHA-256 каждого файла — <a href="./portfolio-catalog.json">portfolio-catalog.json</a>. Лицензии внешних медиа необходимо проверить перед коммерческим размещением. Скриншоты подтверждают публичный интерфейс, а не фактическое исполнение приватных операций.</footer>',
    '</body></html>'
  ].join('\n');
}
function build(output){
  const root=path.resolve(output);
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
  if(manifest.schema!=='mfw-public-browser-evidence-v1'||!Array.isArray(manifest.sources)||!manifest.sources.length)throw Error('unsupported_capture_manifest');
  const catalog={
    schema:'mfw-portfolio-media-v1',capturedAt:manifest.capturedAt,
    captureCommit:manifest.captureCommit,
    evidenceBoundary:'Recorded public UI only, not proof of admission, participants, media rights, payments, QR issuance or accepted revenue.',
    sources:manifest.sources.map(s=>qualified(root,manifest,s))
  };
  fs.writeFileSync(path.join(root,'portfolio-catalog.json'),JSON.stringify(catalog,null,2)+'\n');
  fs.writeFileSync(path.join(root,'portfolio.html'),renderHTML(catalog));
  if(!catalog.sources.some(s=>s.portfolioReady))throw Error('no_qualified_portfolio_media');
  return catalog;
}
if(require.main===module){
  try{
    const root=process.env.MFW_CAPTURE_OUTPUT||path.join(__dirname,'..','_mfw_evidence');
    const catalog=build(root);
    console.log(JSON.stringify({captureCommit:catalog.captureCommit,sources:catalog.sources.map(s=>({
      id:s.id,ready:s.portfolioReady,photos:s.screenshots.length,videos:s.videos.length,errors:s.errors
    }))}));
  }catch(error){console.error(error);process.exitCode=1;}
}
module.exports={build,qualified,validFile,renderHTML};
