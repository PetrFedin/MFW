(function(){
'use strict';
var API='https://mfw-authority.onrender.com';
var state={tab:'overview',lang:localStorage.getItem('mfwAdminLang')||'ru',session:null,health:null,deep:null,overview:null,events:[],accreditations:[],streams:[],streamControl:null,commerce:null,sponsors:null,brandGrowth:null,retention:null,goldenPath:null,nativeReadiness:null};
function T(ru,en){return state.lang==='en'?en:ru;}

async function req(path,opts){
  opts=opts||{};
  opts.headers=Object.assign({'Content-Type':'application/json'},opts.headers||{});
  var controller=new AbortController();
  var timer=setTimeout(function(){controller.abort();},6500);
  opts.signal=controller.signal;
  var res;
  try{res=await fetch(API+path,opts);}finally{clearTimeout(timer);}
  var data=await res.json().catch(function(){return{};});
  if(!res.ok){
    var err=new Error(data.error||data.reason||('http_'+res.status));
    err.status=res.status;err.data=data;throw err;
  }
  return data;
}
async function getSession(){
  if(state.session)return state.session;
  var auth=await req('/v1/auth/demo',{method:'POST',body:JSON.stringify({name:'MFW Admin Demo',role:'Organizer'})});
  state.session=auth.session;
  return state.session;
}
async function admin(path,opts){
  var token=await getSession();
  opts=opts||{};
  opts.headers=Object.assign({},opts.headers||{},{Authorization:'Bearer '+token});
  return req('/v1/admin'+path,opts);
}
function esc(v){
  return String(v==null?'':v).replace(/[&<>"']/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];
  });
}
function badge(s){
  var c=(s==='live'||s==='published'||s==='approved')?'live':(s==='pending'||s==='delayed')?'wait':s==='rejected'?'red':'';
  return '<span class="badge '+c+'">'+esc(String(s||'').toUpperCase())+'</span>';
}
function toast(message){
  var old=document.querySelector('.toast');if(old)old.remove();
  var t=document.createElement('div');t.className='toast';t.textContent=message;
  document.body.appendChild(t);setTimeout(function(){t.remove();},1800);
}
function nav(){
  var tabs=[
    ['overview',T('Обзор','Overview')],
    ['programme',T('Программа','Programme')],
    ['streaming',T('Трансляции','Streaming')],
    ['commerce',T('Коммерция','Commerce')],
    ['sponsors',T('Партнёры','Sponsors')],
    ['brand365',T('Бренды 365','Brand 365')],
    ['retention',T('Retention 365','Retention 365')],
    ['native',T('iOS готовность','iOS readiness')],
    ['accreditation',T('Аккредитация','Accreditation')],
    ['communications',T('Коммуникации','Communications')],
    ['access',T('Контроль доступа','Access authority')]
  ];
  return tabs.map(function(t){
    return '<button class="'+(state.tab===t[0]?'active':'')+'" data-tab="'+t[0]+'">'+t[1]+'</button>';
  }).join('');
}
function shell(content){
  var title={
    overview:T('Операционный обзор','Operations overview'),
    programme:T('Управление программой','Programme CMS'),
    streaming:T('Управление трансляцией','Streaming control'),
    commerce:T('Байеры и бренды','Buyer & brand commerce'),
    sponsors:T('Эффективность партнёров','Sponsor performance'),
    brand365:T('Бренды 365 / CRM','Brand 365 / CRM'),
    retention:T('Retention / частота / push','Retention / frequency / push'),
    native:T('Готовность iOS / TestFlight','iOS / TestFlight readiness'),
    accreditation:T('Аккредитация','Accreditation'),
    communications:T('Коммуникации','Communications'),
    access:T('Контроль доступа','Access authority')
  }[state.tab];
  return '<div class="shell">'+
    '<aside class="sidebar"><div class="brand"><span>MOSCOW</span><span>FASHION WEEK</span></div>'+
      '<div class="season">Admin Console · Investor Build</div><div class="nav">'+nav()+'</div>'+
      '<div class="side-foot">Server-backed demo<br>ES256 · QR · check-in · live operations</div></aside>'+
    '<section class="main"><header class="top"><h1>'+title+'</h1>'+
      '<div class="status"><button class="btn" data-action="toggle-lang">'+(state.lang==='ru'?'RU / EN':'EN / RU')+'</button><span class="dot '+(state.health?'online':'')+'"></span><span>'+(state.health?T('AUTHORITY ONLINE','AUTHORITY ONLINE'):T('ПОДКЛЮЧЕНИЕ','CONNECTING'))+'</span>'+
      '<button class="btn" data-action="refresh">'+T('Обновить','Refresh')+'</button></div></header>'+
      '<div class="content">'+content+'</div></section></div>';
}
function overviewScreen(){
  var o=state.overview||{activeUsers:'—',programmeEngagementPct:'—',buyerActions:'—',live:{occupancyPct:0,checkedIn:'—',waitlist:'—'}};
  var d=state.deep||{};
  return '<div class="eyebrow">'+T('Командный слой организатора','Organizer command layer')+'</div><div class="hero-title">'+T('LIVE<br>ОПЕРАЦИИ','LIVE<br>OPERATIONS')+'</div>'+
    '<div class="console-banner"><div><b>'+T('Единая операционная система Недели моды','One operating system for Fashion Week')+'</b>'+
    '<p>'+T('Программа → доступ → посещение → контент → коммерция → отчёт партнёру.','Programme → access → attendance → content → commerce → sponsor reporting.')+'</p></div>'+
    '<div class="health"><span class="'+(d.status==='pass'?'ok':'')+'">Deep test '+esc(d.status||'…')+'</span>'+
    '<span class="'+(state.health&&state.health.es256?'ok':'')+'">ES256</span>'+
    '<span class="'+(state.health&&state.health.duplicateCheckin?'ok':'')+'">Duplicate gate</span></div></div>'+
    '<div class="grid4">'+
      '<div class="metric"><div class="eyebrow">Audience</div><strong>'+esc(o.activeUsers)+'</strong><span>demo active users</span></div>'+
      '<div class="metric"><div class="eyebrow">Engagement</div><strong>'+esc(o.programmeEngagementPct)+'%</strong><span>programme engagement</span></div>'+
      '<div class="metric"><div class="eyebrow">Commerce</div><strong>'+esc(o.buyerActions)+'</strong><span>buyer actions</span></div>'+
      '<div class="metric"><div class="eyebrow">Occupancy</div><strong>'+esc(o.live.occupancyPct)+'%</strong><span>Opening Runway</span></div>'+
    '</div>'+
    '<div class="columns"><div class="card"><div class="eyebrow">Opening Runway · LIVE</div><h2>Capacity & arrivals</h2>'+
      '<div class="capacity"><span style="width:'+esc(o.live.occupancyPct)+'%"></span></div>'+
      '<div class="row"><span>Checked in</span><strong>'+esc(o.live.checkedIn)+'</strong></div>'+
      '<div class="row"><span>Waitlist</span><strong>'+esc(o.live.waitlist)+'</strong></div>'+
      '<div class="actions"><button class="btn primary" data-action="release">Release 12 seats</button>'+
      '<button class="btn" data-action="push">Critical push</button><button class="btn" data-action="invite">Send invitation</button></div></div>'+
    '<div class="card"><div class="eyebrow">Investor proof</div><h2>Authoritative today</h2>'+
      '<div class="row"><span>Signed pass</span><b>ES256</b></div><div class="row"><span>QR</span><b>rotating</b></div>'+
      '<div class="row"><span>Offline verify</span><b>public JWK</b></div><div class="row"><span>Duplicate check-in</span><b>server</b></div>'+
      '<div class="row"><span>Persistence</span><b>'+esc(state.health?state.health.dataMode:'—')+'</b></div></div></div>';
}
function programmeScreen(){
  return '<div class="eyebrow">'+T('Управление программой','Programme authority')+'</div><div class="hero-title">'+T('ПРОГРАММА<br>CMS','PROGRAMME<br>CMS')+'</div>'+
    '<div class="card">'+state.events.map(function(e){
      return '<div class="event"><div class="event-head"><div><div class="eyebrow">'+esc(e.id)+' · '+esc(e.type)+'</div>'+
        '<div class="event-name">'+esc(e.title)+'</div><div class="sub">'+esc(e.venue)+' · '+esc(e.startsAt)+'</div></div>'+badge(e.status)+'</div>'+
        '<div class="actions"><button class="btn" data-action="delay" data-id="'+esc(e.id)+'">+15 min</button>'+
        '<button class="btn" data-action="move" data-id="'+esc(e.id)+'">Move hall</button>'+
        '<button class="btn primary" data-action="golive" data-id="'+esc(e.id)+'">Go live</button></div></div>';
    }).join('')+'</div>';
}
function streamingScreen(){
  var stream=state.streams[0]||{id:'stream_e1',status:'offline',currentLook:0,totalLooks:32,replayAvailable:false};
  var cp=state.streamControl||{sources:[],outputs:[],captions:[],replay:null,failover:[]};
  var pct=stream.totalLooks?Math.round((Number(stream.currentLook||0)/Number(stream.totalLooks))*100):0;
  var active=(cp.sources||[]).find(function(x){return x.id===stream.activeSourceId;})||(cp.sources||[])[0]||null;
  var backup=(cp.sources||[]).find(function(x){return x.sourceRole==='backup';})||null;
  function sourceCard(src){
    if(!src)return '<div class="source-card"><b>No source</b></div>';
    var h=src.health||{};
    return '<div class="source-card '+(src.status==='active'?'active':'')+'"><div class="source-head"><div><span>'+esc(src.sourceRole||'source')+'</span><b>'+esc(src.provider&&src.provider.name||src.providerId||'Provider')+'</b></div>'+badge(src.status)+'</div><div class="source-metrics"><span><b>'+esc(h.bitrateKbps||0)+'</b> kbps</span><span><b>'+esc(h.fps||0)+'</b> fps</span><span><b>'+esc(h.latencySec||0)+'</b> sec</span><span><b>'+esc(h.droppedFramesPct||0)+'</b>% drop</span></div></div>';
  }
  return '<div class="eyebrow">Runway control plane</div><div class="hero-title">STREAMING<br>AUTHORITY</div>'+
    '<div class="console-banner"><div><b>Provider boundary</b><p>Ingest → health → active source → outputs → captions → replay.</p></div><div class="health"><span class="ok">'+esc(stream.providerMode||'simulated')+'</span><span>'+esc((active&&active.sourceRole)||'no source')+' active</span></div></div>'+
    '<div class="stream-console"><div class="stream-preview" style="background-image:linear-gradient(180deg,transparent,rgba(0,0,0,.78)),url(https://static.tildacdn.com/tild3538-3661-4962-a431-363531303736/2026-03-15_215933.jpg)">'+
      '<div class="stream-preview-top">'+badge(stream.status)+'<span>EVENT e1 · HALL 1</span></div>'+
      '<div class="stream-preview-bottom"><div><span>NOW ON RUNWAY</span><strong>LOOK '+String(stream.currentLook||0).padStart(2,'0')+' / '+esc(stream.totalLooks||32)+'</strong></div><b>'+pct+'%</b></div>'+
    '</div>'+
    '<div class="card"><div class="eyebrow">DIRECTOR CONTROLS</div><h2>Opening Runway</h2>'+
      '<div class="row"><span>Status</span>'+badge(stream.status)+'</div>'+
      '<div class="row"><span>Current look</span><strong>'+esc(stream.currentLook||0)+'</strong></div>'+
      '<div class="row"><span>Replay</span><b>'+((cp.replay&&cp.replay.status)||'OFF')+'</b></div>'+
      '<div class="actions"><button class="btn primary" data-action="next-look" data-id="'+esc(stream.id)+'">NEXT LOOK</button>'+
      '<button class="btn" data-action="stream-live" data-id="'+esc(stream.id)+'">LIVE</button>'+
      '<button class="btn" data-action="stream-failover" data-id="'+esc(stream.id)+'">FAILOVER → BACKUP</button>'+
      '<button class="btn" data-action="stream-caption" data-id="'+esc(stream.id)+'">CAPTIONS EN</button>'+
      '<button class="btn" data-action="stream-archive" data-id="'+esc(stream.id)+'">ARCHIVE / REPLAY</button></div>'+
      '<div class="capacity"><span style="width:'+pct+'%"></span></div><p class="sub">currentLook syncs to iPhone. Failover changes the active ingest authority without changing the public playback contract.</p></div></div>'+
    '<div class="source-grid">'+sourceCard(active)+sourceCard(backup)+'</div>'+
    '<div class="columns"><div class="card"><div class="eyebrow">OUTPUTS</div><h2>Delivery</h2>'+
      (cp.outputs||[]).map(function(o){return '<div class="row"><div><b>'+esc(o.outputType.toUpperCase())+'</b><div class="sub">'+esc(o.resolution||'')+' · '+esc(o.bitrateKbps||0)+' kbps</div></div>'+badge(o.status)+'</div>';}).join('')+
    '</div><div class="card"><div class="eyebrow">CAPTIONS / REPLAY</div><h2>Archive readiness</h2>'+
      (cp.captions||[]).map(function(c){return '<div class="row"><span>'+esc(c.label)+' · '+esc(c.source)+'</span>'+badge(c.status)+'</div>';}).join('')+
      '<div class="row"><span>Replay asset</span>'+badge(cp.replay&&cp.replay.status||'processing')+'</div>'+
      '<div class="row"><span>Failovers</span><strong>'+esc((cp.failover||[]).length)+'</strong></div></div></div>';
}
function commerceScreen(){
  var c=state.commerce||{shortlistActions:0,lineSheetRequests:0,meetingRequests:0,leads:[],funnel:{brandViews:0,collectionOpens:0,savedLooks:0,shortlists:0,meetings:0,qualified:0}};
  var f=c.funnel||{};
  var max=Math.max(1,Number(f.brandViews||1));
  function funnelRow(label,value){
    var pct=Math.max(2,Math.round((Number(value||0)/max)*100));
    return '<div class="funnel-row"><span>'+label+'</span><div><i style="width:'+pct+'%"></i></div><strong>'+esc(value||0)+'</strong></div>';
  }
  return '<div class="eyebrow">Commercial operating layer</div><div class="hero-title">BUYER / BRAND<br>COMMERCE</div>'+
    '<div class="grid4"><div class="metric"><div class="eyebrow">Shortlists</div><strong>'+esc(c.shortlistActions)+'</strong><span>server actions</span></div>'+
    '<div class="metric"><div class="eyebrow">Line sheets</div><strong>'+esc(c.lineSheetRequests)+'</strong><span>requests</span></div>'+
    '<div class="metric"><div class="eyebrow">Meetings</div><strong>'+esc(c.meetingRequests)+'</strong><span>buyer requests</span></div>'+
    '<div class="metric"><div class="eyebrow">Qualified</div><strong>'+esc(f.qualified||0)+'</strong><span>leads</span></div></div>'+
    '<div class="columns"><div class="card"><div class="eyebrow">FUNNEL</div><h2>Attention → commercial intent</h2>'+
      funnelRow('Brand views',f.brandViews)+funnelRow('Collection opens',f.collectionOpens)+funnelRow('Saved looks',f.savedLooks)+funnelRow('Shortlists',f.shortlists)+funnelRow('Meetings',f.meetings)+funnelRow('Qualified',f.qualified)+
    '</div><div class="card"><div class="eyebrow">LATEST LEADS</div><h2>Buyer actions</h2>'+
      ((c.leads||[]).length?(c.leads||[]).slice(0,8).map(function(l){return '<div class="lead-row"><div><b>'+esc(l.brandId)+'</b><span>'+esc(l.source)+' · '+esc(l.stage)+'</span></div><small>'+esc(l.buyerId)+'</small></div>';}).join(''):'<div class="sub">No live leads yet.</div>')+
    '</div></div>';
}
function sponsorsScreen(){
  var data=state.sponsors||{sponsor:{name:'MFW Partner Demo'},campaign:{name:'Backstage Experience'},metrics:{},placements:[],recent:[]};
  var m=data.metrics||{};
  return '<div class="eyebrow">Native partner products</div><div class="hero-title">SPONSOR<br>EXPERIENCE</div>'+
    '<div class="console-banner"><div><b>'+esc(data.sponsor&&data.sponsor.name||'Partner')+'</b><p>'+esc(data.campaign&&data.campaign.name||'Campaign')+' · measurable native activation.</p></div><div class="health"><span class="ok">Attribution live</span><span>Clearly labelled</span></div></div>'+
    '<div class="grid4"><div class="metric"><div class="eyebrow">Reach</div><strong>'+esc(m.uniqueReach||0)+'</strong><span>unique users</span></div>'+
    '<div class="metric"><div class="eyebrow">Experience</div><strong>'+esc(m.experienceOpens||0)+'</strong><span>opens</span></div>'+
    '<div class="metric"><div class="eyebrow">CTA</div><strong>'+esc(m.ctaClicks||0)+'</strong><span>clicks</span></div>'+
    '<div class="metric"><div class="eyebrow">Intent</div><strong>'+esc(m.attributedIntents||0)+'</strong><span>attributed</span></div></div>'+
    '<div class="columns"><div class="card"><div class="eyebrow">PLACEMENTS</div><h2>Native inventory</h2>'+
      (data.placements||[]).map(function(p){return '<div class="row"><div><b>'+esc(p.title)+'</b><div class="sub">'+esc(p.surface)+' · '+esc(p.placementType)+'</div></div><span class="badge live">ACTIVE</span></div>';}).join('')+
    '</div><div class="card"><div class="eyebrow">ATTRIBUTION</div><h2>Recent interactions</h2>'+
      ((data.recent||[]).length?(data.recent||[]).slice(0,8).map(function(x){return '<div class="lead-row"><div><b>'+esc(x.interactionType)+'</b><span>'+esc(x.placementId)+' · '+esc(x.campaignId)+'</span></div><small>'+esc(x.userId)+'</small></div>';}).join(''):'<div class="sub">Interactions appear here after the mobile Sponsor Experience is opened.</div>')+
    '</div></div>';
}
function brand365Screen(){
  var d=state.brandGrowth||{brands:[],social:{channels:[],membershipsVerified:0,activeMemberships:0},offers:[],content:{posts:[],recentInteractions:[]},providers:[]};
  var b=(d.brands||[])[0]||{name:'MFW / NEW 01',followers:0,publishedPosts:0,activeOffers:0,issuedClaims:0};
  var offers=d.offers||[];
  var posts=(d.content&&d.content.posts)||[];
  var h=state.health||{},sp=h.socialProviders||{},tg=sp.telegram||{},vk=sp.vk||{},persist=h.brand365Persistence||{},schema=h.databaseSchema||{},guard=h.productionGuard||{},rev=h.reverification||{};
  function readyRow(label,ok,detail){
    return '<div class="foundation-row"><div><b>'+label+'</b><span>'+esc(detail||'')+'</span></div><span class="badge '+(ok?'live':'wait')+'">'+(ok?'ACTIVE':'DEPENDENCY')+'</span></div>';
  }
  var foundation='<div class="card foundation-card"><div class="eyebrow">PRODUCTION FOUNDATION</div><h2>'+T('Что реально подключено сейчас','What is actually connected now')+'</h2>'+
    readyRow('PostgreSQL',!!persist.configured,persist.configured?T('authoritative persistence','authoritative persistence'):T('memory demo · отдельная MFW DB ещё нужна','memory demo · dedicated MFW DB still required'))+
    readyRow('Schema contract',!!schema.ready,schema.ready?((schema.migrations||[]).length+' migrations · ready'):((schema.contractErrors||[])[0]||T('ждёт PostgreSQL','waiting for PostgreSQL')))+
    readyRow('Production guard',!!guard.satisfied,(guard.requirePostgres?T('PostgreSQL обязателен','PostgreSQL required'):T('demo fallback разрешён','demo fallback allowed')))+
    readyRow('Telegram Login',!!tg.loginConfigured,'OIDC + PKCE')+
    readyRow('Telegram Membership',!!tg.membershipConfigured,'Bot API getChatMember')+
    readyRow('Telegram Webhook',!!tg.webhookSecretConfigured,T('membership events','membership events'))+
    readyRow('VK ID Login',!!vk.loginConfigured,'OAuth 2.1 + PKCE')+
    readyRow('VK Membership',!!vk.membershipConfigured,'groups.isMember')+
    readyRow('Re-verification',!!rev.active,rev.active?String(rev.intervalMinutes)+' min':T('cron/store prepared · PostgreSQL required','cron/store prepared · PostgreSQL required'))+
    '<div class="brand365-note">'+T('Статус берётся из live /health. Секреты никогда не отображаются — только configured true/false.','Status comes from live /health. Secrets are never displayed — only configured true/false.')+'</div></div>';
  return '<div class="eyebrow">'+T('Годовая ценность бренда','Year-round brand value')+'</div><div class="hero-title">BRAND<br>365 CRM</div>'+
    '<div class="console-banner"><div><b>'+T('MFW остаётся полезным после последнего показа','MFW stays useful after the last runway')+'</b><p>'+T('Follow → новости → события → verified loyalty → подарок/скидка → возврат в приложение.','Follow → news → events → verified loyalty → reward → return to the app.')+'</p></div><div class="health"><span class="ok">'+esc(b.name)+'</span><span>'+esc(b.followers)+' followers</span></div></div>'+
    '<div class="grid4"><div class="metric"><div class="eyebrow">MFW followers</div><strong>'+esc(b.followers)+'</strong><span>'+T('внутренняя аудитория','owned audience')+'</span></div>'+
    '<div class="metric"><div class="eyebrow">Social verified</div><strong>'+esc(d.social&&d.social.activeMemberships||0)+'</strong><span>'+T('активные проверки','active proofs')+'</span></div>'+
    '<div class="metric"><div class="eyebrow">Offers</div><strong>'+esc(b.activeOffers)+'</strong><span>'+T('активные механики','active mechanics')+'</span></div>'+
    '<div class="metric"><div class="eyebrow">Claims</div><strong>'+esc(b.issuedClaims)+'</strong><span>'+T('выданные награды','issued rewards')+'</span></div></div>'+
    foundation+
    '<div class="columns"><div class="card"><div class="eyebrow">LOYALTY ENGINE</div><h2>'+T('Условия и награды','Conditions & rewards')+'</h2>'+
      offers.map(function(o){return '<div class="brand365-row"><div><b>'+esc(state.lang==='ru'?o.titleRu:o.titleEn)+'</b><span>'+esc(o.rewardType)+' · '+esc(o.rewardValue==null?'gift':o.rewardValue)+'</span></div><div>'+badge(o.status)+(o.status==='pending'?'<button class="btn primary small" data-action="brand-approve-offer" data-id="'+esc(o.id)+'">'+T('Одобрить','Approve')+'</button>':'')+'</div></div>';}).join('')+
      '<div class="brand365-note">'+T('Дата подписки не придумывается: provider timestamp → иначе first_verified_at MFW.','Subscription age is never invented: provider timestamp → otherwise MFW first_verified_at.')+'</div>'+      '<div class="actions"><button class="btn primary" data-action="brand-golden-path">'+T('Прогнать 30-дневный Golden Path','Run 30-day Golden Path')+'</button></div>'+      (state.goldenPath?'<div class="brand365-note"><b>Golden Path: '+(state.goldenPath.ok?'PASS':'FAIL')+'</b><br>'+        'fresh locked: '+esc(state.goldenPath.steps&&state.goldenPath.steps.freshFollowLocked)+' · 31d eligible: '+esc(state.goldenPath.steps&&state.goldenPath.steps.eligibleAfter31d)+' · claim: '+esc(state.goldenPath.steps&&state.goldenPath.steps.claimIssued)+' · unfollow loss: '+esc(state.goldenPath.steps&&state.goldenPath.steps.eligibilityLostAfterUnfollow)+' · revoked: '+esc(state.goldenPath.steps&&state.goldenPath.steps.claimRevoked)+' · '+esc(state.goldenPath.dataMode||'')+'</div>':'')+
    '</div><div class="card"><div class="eyebrow">SOCIAL ADAPTERS</div><h2>'+T('Что реально можно проверить','What can actually be verified')+'</h2>'+
      (d.providers||[]).map(function(p){return '<div class="brand365-row"><div><b>'+esc(p.platform.toUpperCase())+'</b><span>'+esc(p.verification)+'</span></div><span class="badge '+(p.status==='ready_for_credentials'?'live':'wait')+'">'+esc(p.status)+'</span></div>';}).join('')+
      '<div class="actions"><button class="btn" data-action="brand-social-reverify">'+T('Перепроверить подписки','Reverify memberships')+'</button></div>'+
    '</div></div>'+
    '<div class="columns"><div class="card"><div class="eyebrow">YEAR-ROUND CONTENT</div><h2>'+T('Контент бренда','Brand content')+'</h2>'+
      posts.slice(0,8).map(function(p){return '<div class="brand365-row"><div><b>'+esc(state.lang==='ru'?p.titleRu:p.titleEn)+'</b><span>'+esc(p.kind)+' · '+(p.isPaid?T('платное MFW-wide','paid MFW-wide'):T('органическое','organic'))+'</span></div><div>'+badge(p.status)+(p.status==='pending_review'?'<button class="btn primary small" data-action="brand-approve-post" data-id="'+esc(p.id)+'">'+T('Одобрить','Approve')+'</button>':'')+'</div></div>';}).join('')+
      '<div class="actions"><button class="btn primary" data-action="brand-news">+'+T(' Новость подписчикам',' Follower news')+'</button><button class="btn" data-action="brand-paid">+'+T(' Рекламная кампания',' Paid MFW-wide')+'</button></div>'+
    '</div><div class="card"><div class="eyebrow">AUDIENCE RULES</div><h2>'+T('Не превращаем платформу в рекламный шум','Do not turn MFW into ad noise')+'</h2><div class="row"><span>'+T('Органика','Organic')+'</span><b>brand_followers</b></div><div class="row"><span>'+T('Платное размещение','Paid placement')+'</span><b>all_mfw + label</b></div><div class="row"><span>Frequency cap</span><b>2 / 7 days</b></div><div class="row"><span>Moderation</span><b>required</b></div></div></div>';
}
function retentionScreen(){
  var d=state.retention||{feed:{impressions:0,organicImpressions:0,paidImpressions:0,opens:0,openRatePct:0},push:{scheduled:0,sent:0,brandNewsLast7d:0},policy:{}};
  var f=d.feed||{},p=d.push||{},policy=d.policy||{};
  var paidShare=Number(f.impressions||0)?Math.round(Number(f.paidImpressions||0)/Number(f.impressions||1)*1000)/10:0;
  return '<div class="eyebrow">'+T('Качество аудитории после события','Post-event audience quality')+'</div><div class="hero-title">RETENTION<br>365</div>'+
    '<div class="console-banner"><div><b>'+T('Аудитория важнее рекламного инвентаря','Audience value comes before ad inventory')+'</b><p>'+T('Органика подписанных брендов выше, реклама ограничена частотой, push контролирует пользователь.','Followed-brand organic content ranks first, ads are capped, and users control marketing push.')+'</p></div><div class="health"><span class="ok">organic first</span><span>paid '+esc(paidShare)+'%</span></div></div>'+
    '<div class="grid4"><div class="metric"><div class="eyebrow">Impressions</div><strong>'+esc(f.impressions||0)+'</strong><span>MFW 365 feed</span></div>'+
    '<div class="metric"><div class="eyebrow">Organic</div><strong>'+esc(f.organicImpressions||0)+'</strong><span>'+T('брендовые показы','brand impressions')+'</span></div>'+
    '<div class="metric"><div class="eyebrow">Paid</div><strong>'+esc(f.paidImpressions||0)+'</strong><span>'+esc(paidShare)+'% share</span></div>'+
    '<div class="metric"><div class="eyebrow">Open rate</div><strong>'+esc(f.openRatePct||0)+'%</strong><span>'+esc(f.opens||0)+' opens</span></div></div>'+
    '<div class="columns"><div class="card"><div class="eyebrow">FEED POLICY</div><h2>'+T('Почему лента не становится рекламой','Why the feed does not become an ad wall')+'</h2>'+
      '<div class="row"><span>'+T('Приоритет органики','Organic priority')+'</span><b>'+String(policy.organicPriority!==false)+'</b></div>'+
      '<div class="row"><span>'+T('Маркировка рекламы','Paid label')+'</span><b>'+String(policy.paidLabelRequired!==false)+'</b></div>'+
      '<div class="row"><span>'+T('Частота поста','Per-post cap')+'</span><b>'+esc(policy.paidFeedFrequencyCap||'—')+'</b></div>'+
      '<div class="row"><span>'+T('Плотность рекламы','Paid spacing')+'</span><b>'+esc(policy.paidFeedSpacing||'—')+'</b></div>'+
    '</div><div class="card"><div class="eyebrow">PUSH POLICY</div><h2>'+T('Контроль возврата аудитории','Return-channel control')+'</h2>'+
      '<div class="row"><span>Scheduled</span><b>'+esc(p.scheduled||0)+'</b></div><div class="row"><span>Sent</span><b>'+esc(p.sent||0)+'</b></div>'+
      '<div class="row"><span>'+T('Брендовые push за 7 дней','Brand pushes / 7d')+'</span><b>'+esc(p.brandNewsLast7d||0)+'</b></div>'+
      '<div class="row"><span>'+T('Лимит бренда','Brand cap')+'</span><b>'+esc(policy.brandPushFrequencyCap||'—')+'</b></div>'+
      '<div class="row"><span>'+T('Бренд может push всей базе','Brand can push all MFW')+'</span><b>'+String(policy.paidPushByBrand===true)+'</b></div>'+
    '</div></div>';
}
function nativeScreen(){
  var n=state.nativeReadiness||{};
  function statusRow(label,value,kind){
    var ok=String(value||'').indexOf('prepared')>=0;
    return '<div class="native-readiness-row"><div><span>'+label+'</span><b>'+esc(value||'—')+'</b></div><span class="badge '+(ok?'live':'wait')+'">'+(ok?'PREPARED':'DEPENDENCY')+'</span></div>';
  }
  return '<div class="eyebrow">'+T('Native execution layer','Native execution layer')+'</div><div class="hero-title">iOS /<br>TESTFLIGHT</div>'+
    '<div class="console-banner"><div><b>'+T('Код готовится отдельно от Apple-учётных данных','Code readiness is separated from Apple credentials')+'</b><p>'+T('Мы не называем TestFlight готовым, пока нет signing/provisioning.','We do not claim TestFlight readiness before signing/provisioning exists.')+'</p></div><div class="health"><span class="ok">Capacitor v8</span><span>RU default · EN</span></div></div>'+
    '<div class="card"><div class="eyebrow">CAPABILITIES</div><h2>'+T('Нативные возможности','Native capabilities')+'</h2>'+
      statusRow('Shell',n.shell&&n.shell.status,'shell')+
      statusRow('Haptics',n.haptics,'haptics')+
      statusRow('Camera / QR',n.camera,'camera')+
      statusRow('Push / APNs',n.push,'push')+
      statusRow('Universal Links',n.universalLinks,'links')+
      statusRow('Wallet / PassKit',n.wallet,'wallet')+
      statusRow('TestFlight',n.testflight,'testflight')+
    '</div>'+
    '<div class="columns"><div class="card"><div class="eyebrow">ROUTES</div><h2>Universal Links</h2><div class="row"><span>/event/:id</span><b>Event</b></div><div class="row"><span>/brand/:id</span><b>Brand</b></div><div class="row"><span>/pass</span><b>MFW ID</b></div><div class="row"><span>/meetup/:id</span><b>Networking</b></div></div>'+
    '<div class="card"><div class="eyebrow">WALLET RULE</div><h2>'+T('Wallet ≠ live QR','Wallet ≠ live QR')+'</h2><p class="sub">'+T('Wallet хранит безопасную карточку события и deep link. Rotating ES256 gate credential остаётся в приложении.','Wallet holds a safe event card and deep link. The rotating ES256 gate credential stays in the app.')+'</p></div></div>';
}
function accreditationScreen(){
  return '<div class="eyebrow">'+T('Люди и права','People & permissions')+'</div><div class="hero-title">'+T('АККРЕДИТАЦИЯ','ACCREDITATION')+'</div>'+
    '<div class="card"><table class="table"><thead><tr><th>Name</th><th>Role</th><th>Organisation</th><th>Status</th><th>Decision</th></tr></thead><tbody>'+
    state.accreditations.map(function(a){
      return '<tr><td><b>'+esc(a.name)+'</b></td><td>'+esc(a.kind)+'</td><td>'+esc(a.organisation)+'</td><td>'+badge(a.status)+'</td><td>'+
      (a.status==='pending'?'<button class="btn primary" data-action="approve" data-id="'+esc(a.id)+'">Approve</button> <button class="btn danger" data-action="reject" data-id="'+esc(a.id)+'">Reject</button>':'—')+
      '</td></tr>';
    }).join('')+'</tbody></table></div>';
}
function communicationsScreen(){
  return '<div class="eyebrow">'+T('Работа с аудиторией','Audience operations')+'</div><div class="hero-title">'+T('КОММУНИКАЦИИ','COMMUNICATIONS')+'</div>'+
    '<div class="columns"><div class="card"><div class="eyebrow">Critical update</div><h2>Operational push</h2>'+
    '<p class="sub">Перенос времени, смена зала и срочное сообщение аудитории.</p>'+
    '<div class="actions"><button class="btn primary" data-action="push">Send critical push</button></div></div>'+
    '<div class="card"><div class="eyebrow">Invitation</div><h2>Opening Runway</h2>'+
    '<p class="sub">Сервер создаёт и фиксирует приглашение для выбранного события.</p>'+
    '<div class="actions"><button class="btn primary" data-action="invite">Send demo invite</button></div></div></div>';
}
function accessScreen(){
  return '<div class="eyebrow">'+T('Контур пропусков','Credential authority')+'</div><div class="hero-title">'+T('КОНТРОЛЬ<br>ДОСТУПА','ACCESS<br>CONTROL')+'</div>'+
    '<div class="grid4"><div class="metric"><div class="eyebrow">Algorithm</div><strong>ES256</strong><span>asymmetric signing</span></div>'+
    '<div class="metric"><div class="eyebrow">Pass TTL</div><strong>120s</strong><span>rotating credential</span></div>'+
    '<div class="metric"><div class="eyebrow">Offline</div><strong>JWK</strong><span>cached public key</span></div>'+
    '<div class="metric"><div class="eyebrow">Duplicate</div><strong>409</strong><span>same user + event</span></div></div>'+
    '<div class="card" style="margin-top:14px"><div class="eyebrow">Release gate</div><h2>Deep authority self-test</h2>'+
    '<pre style="white-space:pre-wrap;color:#a8a8a8;font-size:12px">'+esc(JSON.stringify(state.deep||{},null,2))+'</pre></div>';
}
function render(){
  var body=state.tab==='overview'?overviewScreen():
    state.tab==='programme'?programmeScreen():
    state.tab==='streaming'?streamingScreen():
    state.tab==='commerce'?commerceScreen():
    state.tab==='sponsors'?sponsorsScreen():
    state.tab==='brand365'?brand365Screen():
    state.tab==='retention'?retentionScreen():
    state.tab==='native'?nativeScreen():
    state.tab==='accreditation'?accreditationScreen():
    state.tab==='communications'?communicationsScreen():accessScreen();
  document.getElementById('admin-app').innerHTML=shell(body);
  bind();
}
async function load(){
  document.getElementById('admin-app').innerHTML=shell('<div class="loading">Loading MFW authority…</div>');
  try{
    var result=await Promise.all([req('/health'),req('/health/deep'),admin('/overview'),admin('/events'),admin('/accreditations'),admin('/streams'),admin('/streams/stream_e1/control-plane'),admin('/commerce'),admin('/sponsors'),admin('/brand-growth'),admin('/retention'),admin('/native-readiness')]);
    state.health=result[0];state.deep=result[1];state.overview=result[2].data;
    state.events=result[3].data||[];state.accreditations=result[4].data||[];state.streams=result[5].data||[];state.streamControl=result[6].data||null;state.commerce=result[7].data||null;state.sponsors=result[8].data||null;state.brandGrowth=result[9].data||null;state.retention=result[10].data||null;state.nativeReadiness=result[11].data||null;
    render();
  }catch(err){
    document.getElementById('admin-app').innerHTML=shell('<div class="card"><h2>Authority unavailable</h2><div class="sub">'+esc(err.message)+'</div></div>');
    bind();
  }
}
async function action(name,id){
  try{
    if(name==='release')await admin('/waitlist/release',{method:'POST',body:JSON.stringify({eventId:'e1',count:12})});
    if(name==='push')await admin('/notifications',{method:'POST',body:JSON.stringify({category:'critical',title:'Programme update',body:'Opening Runway operational update'})});
    if(name==='invite')await admin('/invitations',{method:'POST',body:JSON.stringify({eventId:'e1',recipient:'investor-demo'})});
    if(name==='delay')await admin('/events/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({startsAt:'2026-09-26T17:15:00+03:00',status:'delayed'})});
    if(name==='move')await admin('/events/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({venue:'Manege · Hall 3'})});
    if(name==='golive')await admin('/events/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({status:'live'})});
    if(name==='approve'||name==='reject')await admin('/accreditations/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({status:name==='approve'?'approved':'rejected'})});
    if(name==='next-look')await admin('/streams/'+encodeURIComponent(id)+'/next-look',{method:'POST',body:JSON.stringify({})});
    if(name==='stream-live')await admin('/streams/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({status:'live'})});
    if(name==='stream-replay')await admin('/streams/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({status:'replay',replayAvailable:true})});
    if(name==='stream-failover')await admin('/streams/'+encodeURIComponent(id)+'/failover',{method:'POST',body:JSON.stringify({targetRole:'backup',reason:'investor_demo_manual'})});
    if(name==='stream-caption')await admin('/streams/'+encodeURIComponent(id)+'/captions',{method:'POST',body:JSON.stringify({language:'en',source:'translation',status:'live'})});
    if(name==='stream-archive')await admin('/streams/'+encodeURIComponent(id)+'/archive',{method:'POST',body:JSON.stringify({})});
    if(name==='brand-news')await admin('/brand-content',{method:'POST',body:JSON.stringify({brandId:'b1',kind:'news',titleRu:'Новости бренда для подписчиков',titleEn:'Brand news for followers',bodyRu:'Органическая публикация для аудитории, которая подписалась на бренд внутри MFW.',bodyEn:'Organic update for people who follow the brand inside MFW.',audienceScope:{kind:'brand_followers'},placementScope:['brand_profile','discover_feed'],isPaid:false})});
    if(name==='brand-paid')await admin('/brand-content',{method:'POST',body:JSON.stringify({brandId:'b1',kind:'campaign',titleRu:'MFW Select · новая кампания',titleEn:'MFW Select · new campaign',bodyRu:'Платное нативное размещение для широкой аудитории MFW с обязательной маркировкой.',bodyEn:'Paid native placement for the wider MFW audience with mandatory labelling.',audienceScope:{kind:'all_mfw'},placementScope:['discover_feed','today'],isPaid:true})});
    if(name==='brand-approve-post')await admin('/brand-content/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({status:'published',moderationNote:'Approved in MFW Admin'})});
    if(name==='brand-approve-offer')await admin('/loyalty-offers/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({status:'published'})});
    if(name==='brand-social-reverify')await admin('/social/reverify',{method:'POST',body:JSON.stringify({})});
    if(name==='brand-golden-path'){var gp=await admin('/golden-path/loyalty-30d',{method:'POST',body:JSON.stringify({})});state.goldenPath=gp.data;}
    toast('Server action: '+name);
    await load();
  }catch(err){toast('Action failed: '+err.message);}
}
function bind(){
  document.querySelectorAll('[data-tab]').forEach(function(b){
    b.onclick=function(){state.tab=b.getAttribute('data-tab');render();};
  });
  document.querySelectorAll('[data-action]').forEach(function(b){
    b.onclick=function(){var a=b.getAttribute('data-action');if(a==='refresh')load();else if(a==='toggle-lang'){state.lang=state.lang==='ru'?'en':'ru';localStorage.setItem('mfwAdminLang',state.lang);render();}else action(a,b.getAttribute('data-id'));};
  });
}
load();
})();