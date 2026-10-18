(function(){
var state={view:'today',lang:'ru',account:null,meeting:null,
saved:{},followedProjects:{},favoriteProjects:{},rewardStarted:{}};
var AUTHORITY='https://mfw-authority.onrender.com';
var MEDIA=window.MFP_MEDIA&&window.MFP_MEDIA.ecosystems&&window.MFP_MEDIA.ecosystems.bfs||{};
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]});}
function token(){try{return localStorage.getItem('mfwAccessToken')||''}catch(e){return ''}}
async function ensureAuthorityToken(){
 var t=token();if(t)return t;
 var p=state.account&&state.account.profile||{},name=((p.firstName||'Guest')+' '+(p.lastName||'')).trim();
 var reg=state.account&&state.account.registrations&&state.account.registrations.bfs;
 var identityKey=p.email||p.phone||name,role=reg&&reg.registrationType||'visitor';
 var r=await fetch(AUTHORITY+'/v1/auth/demo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name,role:role,identityKey:identityKey})});
 var out=await r.json();if(!r.ok)throw new Error(out.error||'auth_failed');
 try{localStorage.setItem('mfwAccessToken',out.session);localStorage.setItem('mfwUserId',out.user&&out.user.id||'');}catch(e){}
 return out.session;
}
async function authority(path,options){
 var opts=options||{},headers=Object.assign({'Content-Type':'application/json'},opts.headers||{}),t=await ensureAuthorityToken();
 if(t)headers.Authorization='Bearer '+t;
 var r=await fetch(AUTHORITY+path,Object.assign({},opts,{headers:headers})),out=await r.json().catch(function(){return {}});
 if(!r.ok)throw Object.assign(new Error(out.error||('HTTP '+r.status)),{status:r.status,data:out});return out;
}

var sessions=[
{id:'s1',date:'28 сентября',time:'11:00–12:15',title:'Искусственный интеллект в творческом процессе: инструмент или соавтор?',hall:'Большой зал',tag:'Креативные индустрии',moderator:'Официальная программа BFS',participants:['Спикеры с официальной карточки сессии']},
{id:'s2',date:'28 сентября',time:'12:30–13:45',title:'Мода как символический капитал города',hall:'Большой зал',tag:'Предпринимательство и инвестиции',moderator:'Официальная программа BFS',participants:['Спикеры с официальной карточки сессии']},
{id:'s3',date:'29 сентября',time:'14:00–15:15',title:'Лицом к будущему: готова ли индустрия моды к глобальной трансформации?',hall:'Открытый зал',tag:'Маркетинг и продажи',moderator:'Официальная программа BFS',participants:['Спикеры с официальной карточки сессии']},
{id:'s4',date:'30 сентября',time:'15:30–16:45',title:'Мода как музейный артефакт: что выбирают и сохраняют ведущие музеи?',hall:'Малый зал',tag:'Креативные индустрии',moderator:'Официальная программа BFS',participants:['Спикеры с официальной карточки сессии']}
];
var speakers=[['Елена Ахмадуллина','Основатель бренда Alena Akhmadullina'],['Антон Алиханов','Министр промышленности и торговли РФ'],['Мустафа Джем Алтан','International Apparel Federation'],['Мадонна Мур','Основатель Fashion Paper']];
var delegates=[];
var organisations=(window.MFP_DATA&&window.MFP_DATA.bfs&&window.MFP_DATA.bfs.organisations)||[];
var madeVerifiedByBrandRef={};
var crossBrandContext=null;
// CRM state is hydrated from Authority, never from a stale localStorage claim.
var leadState={};
var meetingRequestPending=false;
var agendaInFlight=Object.create(null),professionalInFlight=Object.create(null);
var meetingKeys={};
function confirmed(out,requireId){
 if(!out||out.source!=='postgres'||out.demo===true||
   (requireId&&(!out.data||!out.data.id||out.data.demo===true)))
   throw new Error('postgres_confirmation_required');
 return out.data||null;
}
function actionNotice(message){
  // Keep server confirmation/errors OUTSIDE #content. Event/CRM views are
  // re-rendered by hydration and must never erase user-facing failure truth.
  var node=document.getElementById('bfsActionNotice');
  if(!node)return;
  node.textContent=String(message||'');
  node.hidden=!message;
}

// Server state alone qualifies an agenda/follow relation as persisted.
async function hydrateAgenda(){
 try{
  var out=await authority('/v1/agenda',{method:'GET'});confirmed(out);
  var rows=Array.isArray(out.data)?out.data:[],next={};
  rows.forEach(function(x){if(x&&x.eventId)next[String(x.eventId)]=true;});
  state.saved=next;
 }catch(e){state.saved={};}
 if(state.view==='today'||state.view==='programme')render();
}
async function hydrateProfessional(){
 try{
  var out=await authority('/v1/professional/follows?eventBrand=bfs',{method:'GET'});confirmed(out);
  var rows=Array.isArray(out.data)?out.data:[],follows={},favorites={},times={};
  rows.forEach(function(x){
    if(!x||!x.displayName||!x.entityRef)return;
    var key=projectKey(x.displayName);
    follows[key]=true;favorites[key]=x.favorite===true;
    var at=Date.parse(x.followedAt||'');
    if(Number.isFinite(at))times[key]=at;
  });
  state.followedProjects=follows;state.favoriteProjects=favorites;state.rewardStarted=times;
 }catch(e){state.followedProjects={};state.favoriteProjects={};state.rewardStarted={};}
 if(state.view==='speakers')render();
}
async function restoreLeads(){
 try{
  var out=await authority('/v1/b2b/leads',{method:'GET'});confirmed(out);
  var next={};
  (Array.isArray(out.data)?out.data:[]).forEach(function(row){
   if(row&&row.eventBrand==='bfs'&&row.organisationRef&&row.id)
    next[String(row.organisationRef)]={serverId:String(row.id),stage:String(row.stage||'interest')};
  });
  leadState=next;
 }catch(e){leadState={};}
}
async function restoreMeeting(){
 try{
  var out=await authority('/v1/meetings',{method:'GET'});confirmed(out);
  var rows=(Array.isArray(out.data)?out.data:[]).filter(function(x){return x&&x.id;});
  var latest=rows[0]||null;
  state.meeting=latest?{id:String(latest.id),
    delegate:latest.organisation||(latest.metadata&&latest.metadata.counterpartName)||'BFS contact',
    slot:'Время согласовывается',startsAt:latest.startsAt||null,status:latest.status,
    origin:'postgres'}:null;
 }catch(e){state.meeting=null;}
 if(state.view==='b2b')render();
}
function orgById(id){return (organisations||[]).filter(function(o){return o.id===id})[0]||null}
function orgByName(name){return (organisations||[]).filter(function(o){return o.name===name})[0]||null}
function madeBadgeForOrganisation(o){return o&&o.brandRef&&madeVerifiedByBrandRef[String(o.brandRef)]?'<span class="made-verified-bfs">СДЕЛАНО В МОСКВЕ · VERIFIED</span>':''}
async function hydrateMadeVerified(){
 try{
  var out=await authority('/v1/made-in-moscow/brands',{method:'GET'}),rows=out&&Array.isArray(out.data)?out.data:[];
  madeVerifiedByBrandRef={};rows.forEach(function(row){madeVerifiedByBrandRef[String(row.id)]=true;});
  organisations.forEach(function(o){o.madeInMoscowVerified=!!(o.brandRef&&madeVerifiedByBrandRef[String(o.brandRef)]);});
  render();
 }catch(e){}
}
async function leadStage(id,stage){
 var org=orgById(id),old=leadState[id]||{},normalized=stage==='qualified_lead'?'qualified':stage;
 if(!org){actionNotice('Организация отсутствует в официальном справочнике.');return;}
 try{
  var body={eventBrand:'bfs',organisationRef:id,organisationName:org.name,stage:normalized,
    nextAction:normalized==='met'?'Отправить follow-up':''};
  var out=old.serverId
    ?await authority('/v1/b2b/leads/'+encodeURIComponent(old.serverId),{method:'PATCH',body:JSON.stringify(body)})
    :await authority('/v1/b2b/leads',{method:'POST',body:JSON.stringify(body)});
  var row=confirmed(out,true);
  if(row.stage!==normalized)throw Error('unconfirmed_lead_state');
  leadState[id]={serverId:String(row.id),stage:row.stage};
  organisationDirectory(false);
  actionNotice('CRM · '+normalized.toUpperCase()+' подтверждён PostgreSQL.');
 }catch(e){actionNotice('CRM не обновлена: сервер не подтвердил изменение.');}
}

if(window.MFP_DATA&&window.MFP_DATA.bfs){
  sessions=(window.MFP_DATA.bfs.sessions||[]).map(function(s){
    return {id:s.id,date:s.date,time:s.time+(s.end?'–'+s.end:''),title:s.title,hall:s.hall,tag:s.topic||'Сессия',moderator:s.moderator||'',participants:s.speakers||[],source:'OFFICIAL'};
  });
  speakers=(window.MFP_DATA.bfs.speakers||[]).map(function(s){return [s.name,(s.role||'')+(s.org?' · '+s.org:'') ,s.id,s.org||'',s.role||''];});
  var orgMap={};(window.MFP_DATA.bfs.organisations||[]).forEach(function(o){orgMap[o.name]=o;});
  delegates=(window.MFP_DATA.bfs.speakers||[]).map(function(s){var o=orgMap[s.org]||{};return [o.country||'International',s.name,(s.role||'')+(s.org?' · '+s.org:''),s.id,s.org||''];}).slice(0,24);
}

function renderMediaDeck(){
 var root=document.getElementById('bfsMediaDeck');if(!root)return;
 var images=MEDIA.images||{},videos=Array.isArray(MEDIA.videos)?MEDIA.videos:[];
 var cards=[
  {label:'GLOBAL FORUM',title:'Business programme',image:images.hero},
  {label:'INDUSTRY',title:'Fashion dialogue',image:images.forum},
  {label:'NETWORK',title:'Delegations & B2B',image:images.network}
 ];
 root.innerHTML=cards.map(function(x){return '<article class="bfs-media-card"'+(x.image?' style="background-image:linear-gradient(180deg,rgba(3,7,14,.04),rgba(3,7,14,.84)),url(\''+x.image+'\')"':'')+'><span>'+x.label+'</span><b>'+x.title+'</b></article>';}).join('')+
  (videos[0]?'<a class="bfs-video-card" href="'+videos[0].url+'" target="_blank" rel="noopener"><span>VIDEO</span><b>'+videos[0].label+'</b><small>Открыть ↗</small></a>':'');
}
function $(s){return document.querySelector(s)}function $$(s){return [].slice.call(document.querySelectorAll(s))}
function registration(){return state.account&&state.account.registrations&&state.account.registrations.bfs}
function projectKey(name){return String(name||'').toLowerCase().replace(/[^a-z0-9а-я]+/gi,'-')}
function persistBfs(){try{localStorage.setItem('bfsSavedSessions',JSON.stringify(state.saved));localStorage.setItem('bfsFollowedProjects',JSON.stringify(state.followedProjects));localStorage.setItem('bfsFavoriteProjects',JSON.stringify(state.favoriteProjects));localStorage.setItem('bfsRewardStarted',JSON.stringify(state.rewardStarted));}catch(e){}}
function professionalEntity(name){
 var sp=(window.MFP_DATA&&window.MFP_DATA.bfs.speakers||[]).filter(function(x){return x.name===name})[0];
 if(sp)return {type:'speaker',ref:sp.id,name:sp.name};
 var org=(organisations||[]).filter(function(x){return x.name===name})[0];
 if(org)return {type:'organisation',ref:org.id,name:org.name};
 return {type:'project',ref:projectKey(name),name:name};
}
async function syncProfessional(name,action){
 var key=projectKey(name),entity=professionalEntity(name);
 if(professionalInFlight[key])return;
 professionalInFlight[key]=true;
 var following=state.followedProjects[key]===true,favorite=state.favoriteProjects[key]===true;
 if(action==='follow'){following=!following;if(!following)favorite=false;}
 else if(action==='favorite'){favorite=!favorite;if(favorite)following=true;}
 try{
  var out=await authority('/v1/professional/follows',{method:'POST',
   body:JSON.stringify({eventBrand:'bfs',entityType:entity.type,entityRef:entity.ref,
    displayName:entity.name,favorite:favorite,action:following?'save':'remove'})});
  confirmed(out);
  if(out.following!==following)throw Error('professional_confirmation_mismatch');
  if(following&&(!out.data||out.data.favorite!==favorite))
   throw Error('professional_favorite_not_confirmed');
  state.followedProjects[key]=following;
  state.favoriteProjects[key]=favorite;
  if(!following)delete state.rewardStarted[key];
  else if(out.data){
   var stamp=Date.parse(out.data.followedAt||'');
   if(Number.isFinite(stamp))state.rewardStarted[key]=stamp;
  }
  persistBfs();render();
  actionNotice('Подписка / избранное подтверждены PostgreSQL.');
 }catch(e){actionNotice('Подписка не сохранена: сервер не подтвердил действие.');}
 finally{delete professionalInFlight[key];}
}
function followProject(name){return syncProfessional(name,'follow');}
function favoriteProject(name){return syncProfessional(name,'favorite');}

function rewardProgress(name){var k=projectKey(name),start=state.rewardStarted[k];if(!start)return 0;return Math.min(30,Math.max(0,Math.floor((Date.now()-start)/86400000)))}
function projectActions(name){var k=projectKey(name),followed=!!state.followedProjects[k],fav=!!state.favoriteProjects[k],days=rewardProgress(name);return '<div class="project-actions"><button data-follow-project="'+name+'">'+(followed?'✓ Подписка':'＋ Подписаться')+'</button><button data-favorite-project="'+name+'">'+(fav?'♥ Любимый':'♡ В любимые')+'</button></div>'+(followed?'<div class="reward-progress"><b>'+days+' дней связи</b><span>Server relationship signal. Конкретные rewards появляются только в опубликованных campaign.</span><i style="width:'+Math.min(100,days/30*100)+'%"></i></div>':'')}
function bindProjectActions(){$$('[data-follow-project]').forEach(function(b){b.onclick=function(){followProject(b.dataset.followProject)}});$$('[data-favorite-project]').forEach(function(b){b.onclick=function(){favoriteProject(b.dataset.favoriteProject)}})}

function cards(){
 return '<div class="grid">'+sessions.map(function(x){var saved=!!state.saved[x.id];return '<article class="card"><div class="time">'+x.time+'</div><span class="tag">'+x.tag+'</span><h3>'+x.title+'</h3><div class="meta">'+x.hall+' · МКЗ «Зарядье»</div><div class="card-actions"><button class="small-action" data-open-session="'+x.id+'">ПОДРОБНЕЕ</button><button class="small-action" data-save="'+x.id+'">'+(saved?'✓ В МОЕЙ ПРОГРАММЕ':'+ ДОБАВИТЬ')+'</button></div></article>'}).join('')+'</div>';
}
function bindSessionActions(){
 bindProjectActions();
 $$('[data-open-session]').forEach(function(b){b.onclick=function(){openSession(b.dataset.openSession);};});
 $$('[data-save]').forEach(function(b){
  b.onclick=async function(){
   var id=b.dataset.save;
   if(agendaInFlight[id])return;
   agendaInFlight[id]=true;b.disabled=true;
   var desired=!state.saved[id];
   try{
    var out=desired
     ?await authority('/v1/agenda/'+encodeURIComponent(id)+'/save',
       {method:'POST',body:JSON.stringify({reminderEnabled:false,reminderMinutes:20})})
     :await authority('/v1/agenda/'+encodeURIComponent(id),{method:'DELETE'});
    confirmed(out);
    if(desired&&(!out.data||out.data.eventId!==id||out.data.demo===true))
     throw Error('agenda_confirmation_mismatch');
    if(!desired&&(out.ok!==true||out.eventId!==id))
     throw Error('agenda_delete_not_confirmed');
    if(desired)state.saved[id]=true;else delete state.saved[id];
    persistBfs();render();
    actionNotice('Расписание подтверждено PostgreSQL.');
   }catch(e){actionNotice('Расписание не изменено: запись PostgreSQL не подтверждена.');}
   finally{delete agendaInFlight[id];b.disabled=false;}
  };
 });
}

function today(){
 $('#content').innerHTML='<div class="registration-banner '+(registration()?'ok':'')+'"><b>'+(registration()?'BFS REGISTRATION · '+registration().status.toUpperCase():'Нужна отдельная регистрация BFS')+'</b><span>'+(registration()?'Общий профиль используется, участие BFS подтверждено отдельно.':'Профиль платформы можно использовать повторно — подтвердить BFS нужно отдельно.')+'</span><button id="registrationCta">'+(registration()?'ОТКРЫТЬ КАБИНЕТ':'ЗАРЕГИСТРИРОВАТЬСЯ')+'</button></div><div class="section-head"><h2>Сегодня</h2><span>28 SEPTEMBER</span></div>'+cards()+'<div class="section-head"><h2>Exhibition</h2><span>QR ACCESS</span></div><article class="card"><span class="tag">Khokhloma</span><h3>International exhibition access</h3><div class="meta">QR-код участника бизнес-программы также открывает доступ на выставку.</div></article>';
 $('#registrationCta').onclick=function(){parent.postMessage({type:registration()?'mfp-open-account':'mfp-open-registration',eventCode:'bfs'},'*')};bindSessionActions();
}
function programme(){
 var changes=(window.MFP_SYNC&&window.MFP_SYNC.changes().relevant)||[];
 var alert=changes.length?'<div class="schedule-alert"><b>ОФИЦИАЛЬНАЯ ПРОГРАММА ИЗМЕНИЛАСЬ</b>'+changes.map(function(x){return '<span>'+window.MFP_SYNC.changeText(x)+'</span>'}).join('')+'</div>':'';
 $('#content').innerHTML=alert+'<div class="section-head"><h2>Business programme</h2><span>GRAND · CHAMBER · OPEN HALL</span></div>'+cards();bindSessionActions()
}
function showSpeakers(){
 $('#content').innerHTML='<div class="b2b-switch"><button id="orgDirectory">ОРГАНИЗАЦИИ</button></div><div class="section-head"><h2>Спикеры</h2><span>OFFICIAL DIRECTORY</span></div>'+speakers.map(function(s){var src=(window.MFP_DATA&&window.MFP_DATA.bfs.speakers||[]).filter(function(x){return x.id===s[2]})[0]||{};var linked=(src.sessionIds||[]).map(function(id){return sessions.filter(function(x){return x.id===id})[0]}).filter(Boolean);var speakerOrg=orgByName(s[3]);return '<div class="speaker"><div class="avatar"></div><div><b>'+s[0]+'</b>'+madeBadgeForOrganisation(speakerOrg)+'<span>'+s[1]+'</span>'+(linked.length?'<div class="speaker-links">'+linked.map(function(x){return '<button class="small-action" data-open-session="'+x.id+'">'+x.time+' · '+x.title+'</button>'}).join(''):'<div class="meta">Связанные сессии ещё не подтверждены в текущем snapshot.</div>')+projectActions(s[0])+'</div></div>'}).join('');
 bindProjectActions();$$('[data-open-session]').forEach(function(btn){btn.onclick=function(){openSession(btn.dataset.openSession)}})
}
function openSession(id){
 var s=sessions.filter(function(x){return x.id===id})[0];if(!s)return;
 var source=(window.MFP_DATA&&window.MFP_DATA.bfs.sessions||[]).filter(function(x){return x.id===id})[0]||{};
 var people=(source.speakerIds||[]).map(function(pid){return (window.MFP_DATA.bfs.speakers||[]).filter(function(x){return x.id===pid})[0]}).filter(Boolean);
 $('#content').innerHTML='<button class="small-action" id="backProgramme">← ПРОГРАММА</button><article class="card session-detail"><span class="tag">'+s.tag+'</span><h2>'+s.title+'</h2><div class="meta">'+s.date+' · '+s.time+' · '+s.hall+' · МКЗ «Зарядье»</div><h3>Участники</h3>'+(people.length?people.map(function(p){return '<div class="speaker"><div class="avatar"></div><div><b>'+p.name+'</b><span>'+p.role+' · '+p.org+'</span></div></div>'}).join(''):'<p class="meta">Состав участников ещё не связан в текущем официальном snapshot.</p>')+'<div class="media-status"><b>LIVE / REPLAY</b><span>На официальном источнике доступность трансляции или записи для этой сессии в текущем snapshot не подтверждена.</span></div><div class="card-actions"><button class="small-action" data-remind-session="'+s.id+'">🔔 НАПОМНИТЬ ЗА 20 МИН</button></div><button class="small-action" data-save="'+s.id+'">'+(state.saved[s.id]?'✓ В МОЕЙ ПРОГРАММЕ':'+ ДОБАВИТЬ')+'</button></article>';
 $('#backProgramme').onclick=programme;bindSessionActions();
 var rb=$('[data-remind-session]');
 if(rb)rb.onclick=async function(){
   var id=rb.dataset.remindSession;
   if(agendaInFlight[id])return;
   agendaInFlight[id]=true;rb.disabled=true;
   try{
    var out=await authority('/v1/agenda/'+encodeURIComponent(id)+'/save',
      {method:'POST',body:JSON.stringify({reminderEnabled:true,reminderMinutes:20})});
    confirmed(out);
    if(!out.data||out.data.eventId!==id||out.data.reminderEnabled!==true)
     throw Error('reminder_confirmation_mismatch');
    state.saved[id]=true;persistBfs();
    if(window.MFP_SYNC){
      window.MFP_SYNC.setReminder('bfs',id,20);
      window.MFP_SYNC.requestBrowserPermission();
    }
    rb.textContent='✓ НАПОМИНАНИЕ СОХРАНЕНО';
    actionNotice('Напоминание подтверждено PostgreSQL.');
   }catch(e){actionNotice('Напоминание не установлено: запись PostgreSQL не подтверждена.');}
   finally{delete agendaInFlight[id];rb.disabled=false;}
 };

}
async function requestMeeting(input){
 if(meetingRequestPending)return;
 meetingRequestPending=true;
 try{
  var scope=[input.brandId||'',input.organisationRef||'',input.counterpartRef||'',input.counterpartName||''].join('|');
  if(!meetingKeys[scope])meetingKeys[scope]='bfs_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,15);
  var out=await authority('/v1/meetings',{method:'POST',headers:{'Idempotency-Key':meetingKeys[scope]},body:JSON.stringify({
    eventBrand:'bfs',organisation:input.organisationName||'',
    organisationRef:input.organisationRef||null,counterpartRef:input.counterpartRef||null,
    counterpartName:input.counterpartName||null,brandId:input.brandId||null,
    // The old September 2026 hard-coded appointment is already in the past.
    startsAt:input.startsAt||null,note:'BFS app meeting request · time to be agreed'
  })});
  var row=confirmed(out,true);
  if(row.status!=='requested')throw Error('unconfirmed_meeting_status');
  delete meetingKeys[scope];
  state.meeting={id:String(row.id),delegate:input.counterpartName||input.organisationName||'BFS contact',
    slot:'Время согласовывается',startsAt:row.startsAt||null,
    status:row.status,origin:'postgres',organisationRef:input.organisationRef||null};
  state.view='b2b';render();
  actionNotice('Запрос встречи подтверждён PostgreSQL. Время ещё не согласовано.');
 }catch(e){actionNotice('Запрос встречи не создан: PostgreSQL не подтвердил операцию.');}
 finally{meetingRequestPending=false;}
}

function delegateDiscovery(){
 $('#content').innerHTML='<div class="section-head"><h2>Делегаты и спикеры</h2><span>OFFICIAL PEOPLE DIRECTORY</span></div>'+
  delegates.map(function(d,i){var org=orgByName(d[4]);return '<article class="delegate"><div><span class="tag">'+d[0]+'</span><h3>'+d[1]+'</h3>'+madeBadgeForOrganisation(org)+'<p>'+d[2]+'</p>'+projectActions(d[1])+'</div><button data-meet="'+i+'">ЗАПРОСИТЬ ВСТРЕЧУ</button></article>'}).join('');
 bindProjectActions();
 $$('[data-meet]').forEach(function(b){b.onclick=function(){var d=delegates[Number(b.dataset.meet)];requestMeeting({counterpartRef:d[3],counterpartName:d[1],organisationName:d[4]});};});
}
async function organisationDirectory(reload){
 if(reload!==false)await restoreLeads();
 $('#content').innerHTML='<div class="section-head"><h2>Организации</h2><span>FOLLOW → MEETING → FOLLOW-UP → LEAD</span></div>'+
  organisations.map(function(o){
   var people=(window.MFP_DATA.bfs.speakers||[]).filter(function(p){return (o.people||[]).indexOf(p.id)>=0});
   var lead=leadState[o.id]||{stage:'interest'};
   return '<article class="delegate"><div><span class="tag">'+o.type+'</span><h3>'+o.name+'</h3>'+madeBadgeForOrganisation(o)+'<p>'+o.country+'</p>'+
    people.map(function(p){return '<div class="org-person"><b>'+p.name+'</b><span>'+p.role+'</span></div>'}).join('')+
    projectActions(o.name)+'<div class="lead-stage">CRM · '+String(lead.stage||'interest').toUpperCase()+'</div></div>'+
    '<div class="org-actions"><button data-org-meet="'+o.id+'">ЗАПРОСИТЬ ВСТРЕЧУ</button><button data-org-lead="'+o.id+'">QUALIFY LEAD</button></div></article>';
  }).join('');
 bindProjectActions();
 $$('[data-org-meet]').forEach(function(btn){btn.onclick=function(){var o=orgById(btn.dataset.orgMeet);if(!o)return;requestMeeting({organisationRef:o.id,organisationName:o.name});};});
 // CRM actions are delegated on the stable host to survive async view refresh.
}
async function refreshLeadPipeline(){
 var root=$('#leadPipeline');if(!root)return;
 try{
  var out=await authority('/v1/b2b/leads',{method:'GET'});confirmed(out);var rows=out.data||[];
  root.innerHTML=rows.length?'<div class="section-head"><h2>Follow-up pipeline</h2><span>SERVER LEADS</span></div>'+
   rows.slice(0,8).map(function(x){return '<article class="meeting-card"><b>'+esc(x.organisationName||x.counterpartName||'BFS lead')+'</b><span>'+String(x.stage||'interest').toUpperCase()+(x.nextAction?' · '+x.nextAction:'')+'</span>'+(x.stage==='met'?'<button data-followup-lead="'+x.id+'">FOLLOW-UP</button>':'')+'</article>';}).join('')
   :'<div class="meta">После запроса и проведения встречи здесь появится follow-up pipeline.</div>';
  $$('[data-followup-lead]').forEach(function(b){b.onclick=async function(){try{await authority('/v1/b2b/leads/'+encodeURIComponent(b.dataset.followupLead),{method:'PATCH',body:JSON.stringify({stage:'follow_up',nextAction:'Отправить материалы и согласовать следующий контакт'})});refreshLeadPipeline();}catch(e){}};});
 }catch(e){root.innerHTML='<div class="meta">Lead pipeline временно недоступен.</div>';}
}
function b2b(){
 var brandContext=crossBrandContext?'<div class="meeting-card cross-brand-context"><b>BRAND CONTEXT · '+esc(crossBrandContext.brandRef||'')+'</b><span>Источник: Made in Moscow → MFW canonical brand → BFS commercial flow</span><div class="card-actions"><button id="brandContextMeet">ЗАПРОСИТЬ ВСТРЕЧУ</button><button id="brandContextClear">СБРОСИТЬ</button></div></div>':'';
 var meeting=state.meeting?'<div class="meeting-card"><b>'+esc(state.meeting.delegate)+'</b><span>'+esc(state.meeting.startsAt||state.meeting.slot||'Время согласовывается')+' · '+esc(String(state.meeting.status||'requested').toUpperCase())+'</span>'+
  '<div class="card-actions">'+
   (['requested','reschedule_requested'].includes(state.meeting.status)
    ?'<label>Согласованная дата и время<input id="meetingScheduledTime" type="datetime-local" aria-label="Согласованная дата и время"></label><button id="meetingConfirm">CONFIRM</button>':'')+
   (state.meeting.status==='confirmed'?'<button id="meetingComplete">MEETING HELD</button>':'')+
   (!['completed','cancelled','declined'].includes(state.meeting.status)?'<button id="cancelMeeting">CANCEL</button>':'')+
   '</div></div>':'';
 $('#content').innerHTML='<div class="section-head"><h2>B2B meetings</h2><span>SERVER WORKFLOW</span></div>'+
  '<div class="b2b"><div class="time">NETWORKING</div><h3>People → meeting → follow-up → lead</h3><p class="meta">Встреча сохраняется в authority; после завершения создаётся follow-up lead.</p>'+
  '<div class="card-actions"><button class="lang" id="discoverDelegates">ЛЮДИ</button><button class="lang" id="orgDirectory">ОРГАНИЗАЦИИ</button></div></div>'+brandContext+meeting+'<div id="leadPipeline"></div>';
 $('#discoverDelegates').onclick=delegateDiscovery;$('#orgDirectory').onclick=organisationDirectory;refreshLeadPipeline();
 if($('#brandContextMeet'))$('#brandContextMeet').onclick=function(){requestMeeting({organisationName:'Made in Moscow Buyer Bridge',counterpartName:'Brand '+crossBrandContext.brandRef,brandId:crossBrandContext.brandRef});};
 if($('#brandContextClear'))$('#brandContextClear').onclick=function(){crossBrandContext=null;b2b();};
 async function setMeetingStatus(status){
  if(!state.meeting||!state.meeting.id)return;
  try{
   var selectedTime=null;
   if(status==='confirmed'){
     var timeInput=document.getElementById('meetingScheduledTime');
     if(!timeInput||!timeInput.value){actionNotice('Укажите согласованную дату и время встречи.');return;}
     var instant=new Date(timeInput.value);
     if(!Number.isFinite(instant.getTime())){actionNotice('Некорректная дата встречи.');return;}
     selectedTime=instant.toISOString();
   }
   var out=await authority('/v1/meetings/'+encodeURIComponent(state.meeting.id),{
     method:'PATCH',body:JSON.stringify({status:status,startsAt:selectedTime})});
   var updated=confirmed(out,true);
   if(updated.status!==status||String(updated.id)!==String(state.meeting.id))throw Error('unconfirmed_transition');
   state.meeting=Object.assign({},state.meeting,updated,{delegate:state.meeting.delegate,origin:'postgres'});
   try{localStorage.setItem('bfsMeetingState',JSON.stringify(state.meeting))}catch(e){}
   b2b();
  }catch(e){actionNotice('Статус встречи не изменён: сервер не подтвердил операцию.');}
 }
 if($('#meetingConfirm'))$('#meetingConfirm').onclick=function(){setMeetingStatus('confirmed')};
 if($('#meetingComplete'))$('#meetingComplete').onclick=function(){setMeetingStatus('completed')};
 if($('#cancelMeeting'))$('#cancelMeeting').onclick=function(){
  if(state.meeting&&state.meeting.id)setMeetingStatus('cancelled');
  else{state.meeting=null;try{localStorage.removeItem('bfsMeetingState')}catch(e){}b2b();}
 };
}
async function loadBfsPass(){
 var reg=registration(),root=$('#content');if(!reg)return;
 try{
  var out=await authority('/v1/passes/issue',{method:'POST',body:JSON.stringify({
   eventBrand:'bfs',eventId:'bfs-2026',role:reg.registrationType,entitlements:['business_programme','exhibition']
  })});
  var r=await fetch(AUTHORITY+'/v1/passes/qr',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:out.token})});
  var svg=await r.text();if(!r.ok)throw new Error('qr_unavailable');
  root.innerHTML='<div class="section-head"><h2>My QR</h2><span>ES256 · ROTATING</span></div><div class="pass"><div class="eyebrow">BRICS+ FASHION SUMMIT</div>'+
   '<h2>'+esc(String(reg.registrationType||'visitor').toUpperCase())+'<br>PASS</h2><div class="meta">'+esc(((state.account.profile.firstName||'')+' '+(state.account.profile.lastName||'')))+
   ' · Business programme + Exhibition</div><div class="qr server-qr">'+svg+'</div><div class="meta">Server-signed credential · BFS only · refresh on reopen.</div></div>';
 }catch(e){
  var msg=e.data&&e.data.error==='registration_not_credential_eligible'
   ?'Профессиональная регистрация ожидает подтверждения организатора.'
   :'Проверьте регистрацию BFS и server session.';
  root.innerHTML='<div class="section-head"><h2>My QR</h2><span>NOT READY</span></div><div class="b2b"><h3>Credential пока не может быть выдан</h3><p class="meta">'+msg+'</p></div>';
 }
}
function pass(){
 if(!registration()){
  $('#content').innerHTML='<div class="section-head"><h2>My QR</h2><span>REGISTRATION REQUIRED</span></div><div class="b2b"><h3>Сначала подтвердите отдельную регистрацию BFS</h3><p class="meta">Общий аккаунт уже существует. Данные можно использовать повторно.</p><button class="lang" id="passRegister">REGISTER FOR BFS</button></div>';
  $('#passRegister').onclick=function(){parent.postMessage({type:'mfp-open-registration',eventCode:'bfs'},'*')};return;
 }
 $('#content').innerHTML='<div class="section-head"><h2>My QR</h2><span>LOADING AUTHORITY</span></div><div class="pass"><div class="meta">Выпускаем короткоживущий server-signed credential…</div></div>';
 loadBfsPass();
}
function profile(){
 var p=state.account&&state.account.profile||{};var r=registration();
 $('#content').innerHTML='<div class="section-head"><h2>Personal account</h2><span>ONE PLATFORM ID</span></div><div class="profile-row"><b>'+esc(((p.firstName||'Guest')+' '+(p.lastName||'')))+'</b><span>GLOBAL PROFILE</span></div><div class="profile-row"><b>BFS</b><span>'+(r?r.status:'NOT REGISTERED')+'</span></div><div class="profile-row"><b>MFW</b><span>'+(state.account&&state.account.registrations&&state.account.registrations.mfw?state.account.registrations.mfw.status:'NOT REGISTERED')+'</span></div><div class="profile-row"><b>СДЕЛАНО В МОСКВЕ</b><span>SHARED ID · BRAND STATUS SEPARATE</span></div><button class="small-action" id="manageAccount">MANAGE ACCOUNT & REGISTRATIONS</button>';
 $('#manageAccount').onclick=function(){parent.postMessage({type:'mfp-open-account'},'*')};
}
function render(){$$('[data-view]').forEach(function(b){b.classList.toggle('active',b.dataset.view===state.view)});({today:today,programme:programme,speakers:showSpeakers,b2b:b2b,pass:pass,profile:profile}[state.view]||today)()}
$$('[data-view]').forEach(function(b){b.onclick=function(){state.view=b.dataset.view;render()}});
var bfsContent=document.getElementById('content');
if(bfsContent)bfsContent.addEventListener('click',function(event){
 var button=event.target&&event.target.closest&&event.target.closest('[data-org-lead]');
 if(!button||!bfsContent.contains(button)||button.disabled)return;
 event.preventDefault();button.disabled=true;
 Promise.resolve(leadStage(button.dataset.orgLead,'qualified')).finally(function(){
  if(button.isConnected)button.disabled=false;
 });
});
$('.lang').onclick=function(){state.lang=state.lang==='ru'?'en':'ru';$('.lang').textContent=state.lang==='ru'?'RU / EN':'EN / RU';};
window.addEventListener('message',function(e){
 if(e.origin!==location.origin||e.source!==parent||!e.data||typeof e.data!=='object')return;
 if(e.data.type==='mfp-account-state'){state.account=e.data.payload;render();}
 if(e.data.type==='mfp-route'&&e.data.route&&e.data.route.kind==='brand-buyer'){
   crossBrandContext={brandRef:String(e.data.route.brandRef||''),source:String(e.data.route.source||'platform')};
   state.view='b2b';render();
 }
});
// An old local meeting cache is not evidence of a PostgreSQL transaction.
parent.postMessage({type:'mfp-request-account-state'},location.origin);renderMediaDeck();render();hydrateMadeVerified();restoreMeeting();hydrateAgenda();hydrateProfessional();
try{if(parent!==window)parent.postMessage({type:'mfp-frame-ready',eventCode:'bfs'},location.origin);}catch(_){}
})();