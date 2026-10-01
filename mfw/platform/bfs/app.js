(function(){
var state={view:'today',lang:'ru',account:null,meeting:null,
saved:(function(){try{return JSON.parse(localStorage.getItem('bfsSavedSessions')||'{}')}catch(e){return {}}})(),
followedProjects:(function(){try{return JSON.parse(localStorage.getItem('bfsFollowedProjects')||'{}')}catch(e){return {}}})(),
favoriteProjects:(function(){try{return JSON.parse(localStorage.getItem('bfsFavoriteProjects')||'{}')}catch(e){return {}}})(),
rewardStarted:(function(){try{return JSON.parse(localStorage.getItem('bfsRewardStarted')||'{}')}catch(e){return {}}})()};
var AUTHORITY='https://mfw-authority.onrender.com';
function token(){try{return localStorage.getItem('mfwAccessToken')||''}catch(e){return ''}}
async function authority(path,options){
 var opts=options||{},headers=Object.assign({'Content-Type':'application/json'},opts.headers||{}),t=token();if(t)headers.Authorization='Bearer '+t;
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
var leadState=(function(){try{return JSON.parse(localStorage.getItem('bfsLeadState')||'{}')}catch(e){return {}}})();
function saveLeads(){try{localStorage.setItem('bfsLeadState',JSON.stringify(leadState))}catch(e){}}
function orgById(id){return (organisations||[]).filter(function(o){return o.id===id})[0]||null}
async function leadStage(id,stage){
 var old=leadState[id]||{},org=orgById(id),normalized=stage==='qualified_lead'?'qualified':stage;
 leadState[id]=Object.assign({},old,{stage:normalized,updatedAt:new Date().toISOString()});saveLeads();render();
 try{
   var body={eventBrand:'bfs',organisationRef:id,organisationName:org&&org.name||id,stage:normalized,nextAction:normalized==='met'?'Отправить follow-up':''};
   var out=old.serverId
     ?await authority('/v1/b2b/leads/'+encodeURIComponent(old.serverId),{method:'PATCH',body:JSON.stringify(body)})
     :await authority('/v1/b2b/leads',{method:'POST',body:JSON.stringify(body)});
   if(out.data&&out.data.id){leadState[id].serverId=out.data.id;leadState[id].stage=out.data.stage;saveLeads();}
 }catch(e){}
}

if(window.MFP_DATA&&window.MFP_DATA.bfs){
  sessions=(window.MFP_DATA.bfs.sessions||[]).map(function(s){
    return {id:s.id,date:s.date,time:s.time+(s.end?'–'+s.end:''),title:s.title,hall:s.hall,tag:s.topic||'Сессия',moderator:s.moderator||'',participants:s.speakers||[],source:'OFFICIAL'};
  });
  speakers=(window.MFP_DATA.bfs.speakers||[]).map(function(s){return [s.name,(s.role||'')+(s.org?' · '+s.org:'') ,s.id,s.org||'',s.role||''];});
  var orgMap={};(window.MFP_DATA.bfs.organisations||[]).forEach(function(o){orgMap[o.name]=o;});
  delegates=(window.MFP_DATA.bfs.speakers||[]).map(function(s){var o=orgMap[s.org]||{};return [o.country||'International',s.name,(s.role||'')+(s.org?' · '+s.org:''),s.id,s.org||''];}).slice(0,24);
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
async function syncProfessional(name){
 var k=projectKey(name),e=professionalEntity(name),following=!!state.followedProjects[k],favorite=!!state.favoriteProjects[k];
 try{await authority('/v1/professional/follows',{method:'POST',body:JSON.stringify({eventBrand:'bfs',entityType:e.type,entityRef:e.ref,displayName:e.name,favorite:favorite,action:following?'save':'remove'})});}catch(err){}
}
function followProject(name){var k=projectKey(name);state.followedProjects[k]=!state.followedProjects[k];if(state.followedProjects[k]&&!state.rewardStarted[k])state.rewardStarted[k]=Date.now();persistBfs();syncProfessional(name);render()}
function favoriteProject(name){var k=projectKey(name);state.favoriteProjects[k]=!state.favoriteProjects[k];if(state.favoriteProjects[k])state.followedProjects[k]=true;persistBfs();syncProfessional(name);render()}
function rewardProgress(name){var k=projectKey(name),start=state.rewardStarted[k];if(!start)return 0;return Math.min(30,Math.max(0,Math.floor((Date.now()-start)/86400000)))}
function projectActions(name){var k=projectKey(name),followed=!!state.followedProjects[k],fav=!!state.favoriteProjects[k],days=rewardProgress(name);return '<div class="project-actions"><button data-follow-project="'+name+'">'+(followed?'✓ Подписка':'＋ Подписаться')+'</button><button data-favorite-project="'+name+'">'+(fav?'♥ Любимый':'♡ В любимые')+'</button></div>'+(followed?'<div class="reward-progress"><b>'+days+' дней связи</b><span>Server relationship signal. Конкретные rewards появляются только в опубликованных campaign.</span><i style="width:'+Math.min(100,days/30*100)+'%"></i></div>':'')}
function bindProjectActions(){$$('[data-follow-project]').forEach(function(b){b.onclick=function(){followProject(b.dataset.followProject)}});$$('[data-favorite-project]').forEach(function(b){b.onclick=function(){favoriteProject(b.dataset.favoriteProject)}})}

function cards(){
 return '<div class="grid">'+sessions.map(function(x){var saved=!!state.saved[x.id];return '<article class="card"><div class="time">'+x.time+'</div><span class="tag">'+x.tag+'</span><h3>'+x.title+'</h3><div class="meta">'+x.hall+' · МКЗ «Зарядье»</div><div class="card-actions"><button class="small-action" data-open-session="'+x.id+'">ПОДРОБНЕЕ</button><button class="small-action" data-save="'+x.id+'">'+(saved?'✓ В МОЕЙ ПРОГРАММЕ':'+ ДОБАВИТЬ')+'</button></div></article>'}).join('')+'</div>';
}
function bindSessionActions(){bindProjectActions();$('[data-save]').forEach(function(b){b.onclick=function(){state.saved[b.dataset.save]=!state.saved[b.dataset.save];persistBfs();render();}})}
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
 $('#content').innerHTML='<div class="b2b-switch"><button id="orgDirectory">ОРГАНИЗАЦИИ</button></div><div class="section-head"><h2>Спикеры</h2><span>OFFICIAL DIRECTORY</span></div>'+speakers.map(function(s){var src=(window.MFP_DATA&&window.MFP_DATA.bfs.speakers||[]).filter(function(x){return x.id===s[2]})[0]||{};var linked=(src.sessionIds||[]).map(function(id){return sessions.filter(function(x){return x.id===id})[0]}).filter(Boolean);return '<div class="speaker"><div class="avatar"></div><div><b>'+s[0]+'</b><span>'+s[1]+'</span>'+(linked.length?'<div class="speaker-links">'+linked.map(function(x){return '<button class="small-action" data-open-session="'+x.id+'">'+x.time+' · '+x.title+'</button>'}).join(''):'<div class="meta">Связанные сессии ещё не подтверждены в текущем snapshot.</div>')+projectActions(s[0])+'</div></div>'}).join('');
 bindProjectActions();$('[data-open-session]').forEach(function(btn){btn.onclick=function(){openSession(btn.dataset.openSession)}})
}
function openSession(id){
 var s=sessions.filter(function(x){return x.id===id})[0];if(!s)return;
 var source=(window.MFP_DATA&&window.MFP_DATA.bfs.sessions||[]).filter(function(x){return x.id===id})[0]||{};
 var people=(source.speakerIds||[]).map(function(pid){return (window.MFP_DATA.bfs.speakers||[]).filter(function(x){return x.id===pid})[0]}).filter(Boolean);
 $('#content').innerHTML='<button class="small-action" id="backProgramme">← ПРОГРАММА</button><article class="card session-detail"><span class="tag">'+s.tag+'</span><h2>'+s.title+'</h2><div class="meta">'+s.date+' · '+s.time+' · '+s.hall+' · МКЗ «Зарядье»</div><h3>Участники</h3>'+(people.length?people.map(function(p){return '<div class="speaker"><div class="avatar"></div><div><b>'+p.name+'</b><span>'+p.role+' · '+p.org+'</span></div></div>'}).join(''):'<p class="meta">Состав участников ещё не связан в текущем официальном snapshot.</p>')+'<div class="media-status"><b>LIVE / REPLAY</b><span>На официальном источнике доступность трансляции или записи для этой сессии в текущем snapshot не подтверждена.</span></div><div class="card-actions"><button class="small-action" data-remind-session="'+s.id+'">🔔 НАПОМНИТЬ ЗА 20 МИН</button></div><button class="small-action" data-save="'+s.id+'">'+(state.saved[s.id]?'✓ В МОЕЙ ПРОГРАММЕ':'+ ДОБАВИТЬ')+'</button></article>';
 $('#backProgramme').onclick=programme;bindSessionActions();var rb=$('[data-remind-session]');if(rb)rb.onclick=function(){if(window.MFP_SYNC){window.MFP_SYNC.setReminder('bfs',rb.dataset.remindSession,20);window.MFP_SYNC.requestBrowserPermission();rb.textContent='✓ НАПОМИНАНИЕ УСТАНОВЛЕНО';}};
}
function delegateDiscovery(){
 $('#content').innerHTML='<div class="section-head"><h2>Делегаты</h2><span>4 SAMPLE PROFILES</span></div>'+delegates.map(function(d,i){return '<article class="delegate"><div><span class="tag">'+d[0]+'</span><h3>'+d[1]+'</h3><p>'+d[2]+'</p>'+projectActions(d[1])+'</div><button data-meet="'+i+'">ЗАПРОСИТЬ ВСТРЕЧУ</button></article>'}).join('');
 var od=$('#orgDirectory');if(od)od.onclick=organisationDirectory;bindProjectActions();$('[data-meet]').forEach(function(b){b.onclick=function(){var d=delegates[Number(b.dataset.meet)];state.meeting={delegate:d[1],slot:'29 SEP · 16:00',status:'requested'};try{localStorage.setItem('bfsMeetingRequested','1')}catch(e){}b2b();}});
}
function organisationDirectory(){
 $('#content').innerHTML='<div class="section-head"><h2>Организации</h2><span>PEOPLE → MEETING → LEAD</span></div>'+organisations.map(function(o){var people=(o.people||[]).map(function(id){return (window.MFP_DATA.bfs.speakers||[]).filter(function(p){return p.id===id})[0]}).filter(Boolean);var lead=leadState[o.id]||{stage:'new'};return '<article class="delegate"><div><span class="tag">'+o.type+'</span><h3>'+o.name+'</h3><p>'+o.country+'</p>'+people.map(function(p){return '<div class="org-person"><b>'+p.name+'</b><span>'+p.role+'</span></div>'}).join('')+'<div class="lead-stage">CRM · '+lead.stage.toUpperCase()+'</div></div><div class="org-actions"><button data-org-meet="'+o.id+'">ЗАПРОСИТЬ ВСТРЕЧУ</button><button data-org-lead="'+o.id+'">В LEAD</button></div></article>'}).join('');
 $('[data-org-meet]').forEach(function(btn){btn.onclick=function(){leadStage(btn.dataset.orgMeet,'meeting_requested')}});
 $('[data-org-lead]').forEach(function(btn){btn.onclick=function(){leadStage(btn.dataset.orgLead,'qualified_lead')}});
}
function b2b(){
 var meeting=state.meeting?'<div class="meeting-card"><b>'+state.meeting.delegate+'</b><span>'+state.meeting.slot+' · '+state.meeting.status.toUpperCase()+'</span><button id="cancelMeeting">CANCEL</button></div>':'';
 $('#content').innerHTML='<div class="section-head"><h2>B2B meetings</h2><span>DELEGATE MODE</span></div><div class="b2b"><div class="time">NETWORKING</div><h3>Найти делегата и запросить встречу</h3><p class="meta">Поиск по стране, организации и роли → доступные слоты → request → accept → встреча.</p><button class="lang" id="discoverDelegates">OPEN DELEGATE DISCOVERY</button></div>'+meeting;
 $('#discoverDelegates').onclick=delegateDiscovery;if($('#cancelMeeting'))$('#cancelMeeting').onclick=function(){state.meeting=null;try{localStorage.removeItem('bfsMeetingRequested')}catch(e){}b2b()};
}
function qr(){var out='';for(var i=0;i<81;i++)out+=((i*13+i*i)%7<3||i<9||i%9===0)?'<i></i>':'<span></span>';return out}
function pass(){
 if(!registration()){ $('#content').innerHTML='<div class="section-head"><h2>My QR</h2><span>REGISTRATION REQUIRED</span></div><div class="b2b"><h3>Сначала подтвердите отдельную регистрацию BFS</h3><p class="meta">Общий аккаунт уже существует. Данные можно использовать повторно.</p><button class="lang" id="passRegister">REGISTER FOR BFS</button></div>';$('#passRegister').onclick=function(){parent.postMessage({type:'mfp-open-registration',eventCode:'bfs'},'*')};return;}
 $('#content').innerHTML='<div class="section-head"><h2>My QR</h2><span>EVENT CREDENTIAL</span></div><div class="pass"><div class="eyebrow">BRICS+ FASHION SUMMIT</div><h2>'+registration().registrationType.toUpperCase()+'<br>PASS</h2><div class="meta">'+((state.account.profile.firstName||'')+' '+(state.account.profile.lastName||''))+' · Business programme + Exhibition</div><div class="qr">'+qr()+'</div><div class="meta">Действует только для BFS. Регистрация MFW хранится отдельно.</div></div>';
}
function profile(){
 var p=state.account&&state.account.profile||{};var r=registration();
 $('#content').innerHTML='<div class="section-head"><h2>Personal account</h2><span>ONE PLATFORM ID</span></div><div class="profile-row"><b>'+((p.firstName||'Guest')+' '+(p.lastName||''))+'</b><span>GLOBAL PROFILE</span></div><div class="profile-row"><b>BFS</b><span>'+(r?r.status:'NOT REGISTERED')+'</span></div><div class="profile-row"><b>MFW</b><span>'+(state.account&&state.account.registrations&&state.account.registrations.mfw?state.account.registrations.mfw.status:'NOT REGISTERED')+'</span></div><button class="small-action" id="manageAccount">MANAGE ACCOUNT & REGISTRATIONS</button>';
 $('#manageAccount').onclick=function(){parent.postMessage({type:'mfp-open-account'},'*')};
}
function render(){$$('[data-view]').forEach(function(b){b.classList.toggle('active',b.dataset.view===state.view)});({today:today,programme:programme,speakers:showSpeakers,b2b:b2b,pass:pass,profile:profile}[state.view]||today)()}
$$('[data-view]').forEach(function(b){b.onclick=function(){state.view=b.dataset.view;render()}});
$('.lang').onclick=function(){state.lang=state.lang==='ru'?'en':'ru';$('.lang').textContent=state.lang==='ru'?'RU / EN':'EN / RU';};
window.addEventListener('message',function(e){if(e.data&&e.data.type==='mfp-account-state'){state.account=e.data.payload;render();}});
parent.postMessage({type:'mfp-request-account-state'},'*');render();
})();