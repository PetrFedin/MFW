(function(){
  var frame=document.getElementById('eventFrame');
  var note=document.getElementById('eventNote');
  var buttons=[].slice.call(document.querySelectorAll('[data-event]'));
  var accountDrawer=document.getElementById('accountDrawer');
  var registrationModal=document.getElementById('registrationModal');
  var profileForm=document.getElementById('profileForm');
  var registrationForm=document.getElementById('registrationForm');
  var registrationGrid=document.getElementById('registrationGrid');
  var currentRegistrationEvent=null;
  var investorModal=document.getElementById('investorModal');
  var valueModal=document.getElementById('valueModal');
  var forYouModal=document.getElementById('forYouModal');
  var hubModal=document.getElementById('hubModal');
  var hubContent=document.getElementById('hubContent');
  var hubTab='directory';
  var investorDemoIndex=0;
  var investorDemoActive=false;
  var AUTHORITY='https://mfw-authority.onrender.com';
  var MEDIA=window.MFP_MEDIA&&window.MFP_MEDIA.ecosystems?window.MFP_MEDIA.ecosystems:{};
  var INVESTOR_MODEL=window.MFP_INVESTOR_MODEL||{};
  var proofMode='live';
  var controlTowerView='case';
  var selectedControlCase='buyer-brand-alpha';
  var selectedPortfolioStage='INTENT';
  var committeeSelectedId=null;
  var committeeCases={};
  var programmeReleased={};
  var programmeReallocationTarget='mfw';
  var programmeOptimizerTranche=10;
  var programmeScenarioBudget=30;
  var programmeScenarioProposal=null;
  var portfolioFilters={period:'all',ecosystem:'all',market:'all',category:'all',buyerType:'all',evidence:'all',retention:'D30',revenueSurface:'all'};
  var scenarioA={period:'all',ecosystem:'mfw',market:'all',category:'all',buyerType:'all',evidence:'all',retention:'D30',revenueSurface:'all'};
  var scenarioB={period:'all',ecosystem:'bfs',market:'all',category:'all',buyerType:'all',evidence:'all',retention:'D30',revenueSurface:'all'};
  var madeVerifiedBrands=[];
  var deferredInstallPrompt=null;
  function h(v){return String(v==null?'':v).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch];});}
  function formatWhen(v){try{return new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(v));}catch(e){return String(v||'');}}
  function accessToken(){try{return localStorage.getItem('mfwAccessToken')||'';}catch(e){return '';}}
  function setAccessToken(v){try{if(v)localStorage.setItem('mfwAccessToken',v);else localStorage.removeItem('mfwAccessToken');}catch(e){}}
  function sessionClaims(){
    var token=accessToken();if(!token)return null;
    try{
      var p=token.split('.')[1]||'',s=p.replace(/-/g,'+').replace(/_/g,'/');
      while(s.length%4)s+='=';
      return JSON.parse(atob(s));
    }catch(e){return null;}
  }
  function capitalAuthorityEligible(){
    var p=sessionClaims();
    return !!(p&&p.demo!==true&&['Organizer','Staff'].indexOf(String(p.role||''))>=0);
  }
  function displayName(){return ((accountState.profile.firstName||'')+' '+(accountState.profile.lastName||'')).trim()||'MFW User';}
  async function ensureAuthoritySession(role,force){
    var token=accessToken();
    if(token&&!force)return token;
    var identityKey=accountState.profile.email||accountState.profile.phone||displayName();
    var r=await fetch(AUTHORITY+'/v1/auth/demo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:displayName(),role:role||'Visitor',identityKey:identityKey})});
    var out=await r.json();if(!r.ok)throw new Error(out.error||'auth_failed');
    setAccessToken(out.session);try{localStorage.setItem('mfwUserId',out.user&&out.user.id||'');}catch(e){}
    return out.session;
  }
  async function authorityFetch(path,options){
    options=options||{};var headers=Object.assign({'Content-Type':'application/json'},options.headers||{});
    var token=accessToken();if(token)headers.Authorization='Bearer '+token;
    var r=await fetch(AUTHORITY+path,Object.assign({},options,{headers:headers}));
    var out=await r.json().catch(function(){return {};});
    if(!r.ok)throw Object.assign(new Error(out.error||('HTTP '+r.status)),{data:out,status:r.status});
    return out;
  }
  function eventRoleMode(code,roleId){
    var row=(EVENT_CONFIG[code].roles||[]).filter(function(x){return x.id===roleId;})[0];
    return row&&row.mode||'public';
  }
  async function syncProfileToAuthority(primaryRole){
    await ensureAuthoritySession(primaryRole||'Visitor',true);
    return authorityFetch('/v1/me/profile',{method:'PATCH',body:JSON.stringify({
      displayName:displayName(),primaryRole:String(primaryRole||'visitor').toLowerCase(),locale:'ru',
      organisation:accountState.profile.company||'',jobTitle:accountState.profile.title||'',
      country:accountState.profile.country||'',marketingConsent:true,networkingVisible:true
    })});
  }
  async function syncPlatformRegistration(code,reg){
    var role=reg.registrationType||'visitor';
    await syncProfileToAuthority(role);
    var out=await authorityFetch('/v1/platform/registrations/'+code,{method:'POST',body:JSON.stringify({
      registrationType:role,mode:eventRoleMode(code,role),company:reg.company||'',title:reg.title||'',
      purpose:reg.purpose||'',confirmedAt:reg.confirmedAt,confirm:true
    })});
    if(out&&out.data)accountState.registrations[code]=Object.assign({},reg,out.data);
    saveState();return out;
  }
  async function hydrateAccountFromAuthority(){
    if(!accessToken())return;
    try{
      var out=await authorityFetch('/v1/me',{method:'GET'}),d=out.data||{},p=d.profile||{};
      if(p.displayName){
        var parts=String(p.displayName).trim().split(/\s+/);
        accountState.profile.firstName=parts.shift()||accountState.profile.firstName;
        accountState.profile.lastName=parts.join(' ')||accountState.profile.lastName;
      }
      if(p.organisation!=null)accountState.profile.company=p.organisation||'';
      if(p.jobTitle!=null)accountState.profile.title=p.jobTitle||'';
      if(p.country!=null)accountState.profile.country=p.country||'';
      (d.platformRegistrations||[]).forEach(function(r){accountState.registrations[r.eventCode]=r;});
      if(Array.isArray(d.interests))setSelectedInterests(d.interests.map(function(x){return x.key;}));
      saveState();fillProfile();renderRegistrations();renderInterestPicker();
    }catch(e){}
  }

  var DEFAULT_PROFILE={firstName:'Alex',lastName:'Morgan',email:'alex@example.com',phone:'+7 900 000-00-00',company:'Fashion Industry',title:'Guest',country:'Russia'};
  var INTEREST_OPTIONS=[
    {id:'runway',label:'Показы'},
    {id:'emerging_brands',label:'Новые бренды'},
    {id:'womenswear',label:'Женская мода'},
    {id:'menswear',label:'Мужская мода'},
    {id:'accessories',label:'Аксессуары'},
    {id:'sustainable',label:'Устойчивая мода'},
    {id:'business',label:'Fashion business'},
    {id:'retail',label:'Retail / Buying'},
    {id:'technology',label:'Fashion Tech / AI'},
    {id:'international',label:'Международные рынки'},
    {id:'lectures',label:'Лекторий / дискуссии'},
    {id:'networking',label:'B2B / networking'}
  ];
  function selectedInterests(){return safeJson('mfpInterests.v1',[]);}
  function setSelectedInterests(v){try{localStorage.setItem('mfpInterests.v1',JSON.stringify(v));}catch(e){}}
  function renderInterestPicker(){
    var root=document.getElementById('interestGrid');if(!root)return;
    var selected=new Set(selectedInterests());
    root.innerHTML=INTEREST_OPTIONS.map(function(x){return '<button type="button" class="interest-chip '+(selected.has(x.id)?'active':'')+'" data-interest="'+x.id+'">'+x.label+'</button>';}).join('');
    [].slice.call(root.querySelectorAll('[data-interest]')).forEach(function(b){b.onclick=function(){b.classList.toggle('active');};});
  }
  async function saveInterestsToAuthority(){
    var root=document.getElementById('interestGrid'),chosen=[].slice.call(root.querySelectorAll('.interest-chip.active')).map(function(b){return b.dataset.interest;});
    setSelectedInterests(chosen);
    try{
      await ensureAuthoritySession((accountState.registrations.mfw&&accountState.registrations.mfw.registrationType)||(accountState.registrations.bfs&&accountState.registrations.bfs.registrationType)||'Visitor',false);
      await authorityFetch('/v1/me/interests',{method:'PUT',body:JSON.stringify({interests:chosen})});
    }catch(e){console.warn('interest authority sync failed',e);}
  }

  var EVENT_CONFIG={
    mfw:{
      name:'Moscow Fashion Week',short:'MFW',
      roles:[
        {id:'visitor',label:'Гость / посетитель',mode:'public',note:'Маркет, шоурум, лекторий и открытые форматы — по отдельной регистрации там, где она требуется.'},
        {id:'buyer',label:'Байер',mode:'accreditation',note:'Профессиональная аккредитация байера.'},
        {id:'stylist',label:'Стилист',mode:'accreditation',note:'Профессиональная аккредитация стилиста.'},
        {id:'media',label:'СМИ',mode:'accreditation',note:'Медиа-аккредитация.'},
        {id:'blogger',label:'Блогер / инфлюенсер',mode:'accreditation',note:'Медиа-аккредитация.'},
        {id:'photo_video',label:'Фото / видео',mode:'accreditation',note:'Фото/видео-аккредитация с правилами доступа в залы.'},
        {id:'volunteer',label:'Волонтёр',mode:'application',note:'Отдельная заявка волонтёра.'},
        {id:'designer_brand',label:'Дизайнер / бренд-участник',mode:'selection',note:'Участие через конкурсный или внеконкурсный отбор организатора.'},
        {id:'speaker',label:'Спикер / эксперт',mode:'managed',note:'Роль назначается или подтверждается организатором.'},
        {id:'partner',label:'Партнёр',mode:'managed',note:'Партнёрский контур оформляется организатором.'}
      ]
    },
    bfs:{
      name:'BRICS+ Fashion Summit',short:'BFS',
      roles:[
        {id:'visitor',label:'Посетитель деловой программы',mode:'public',note:'Публичная регистрация; после неё доступны личный кабинет, выбор сессий и QR.'},
        {id:'media',label:'СМИ',mode:'accreditation',note:'Медиа-аккредитация.'},
        {id:'blogger',label:'Блогер',mode:'accreditation',note:'Медиа-аккредитация.'},
        {id:'photo_video',label:'Фото / видео',mode:'accreditation',note:'Фото/видео-аккредитация.'},
        {id:'volunteer',label:'Волонтёр',mode:'application',note:'Отдельная заявка волонтёра.'},
        {id:'delegate',label:'Делегат',mode:'managed',note:'Профессиональная роль подтверждается организатором / делегацией.'},
        {id:'speaker',label:'Спикер',mode:'managed',note:'Спикерский статус подтверждается организатором, не является публичной self-registration.'},
        {id:'participant',label:'Участник / представитель организации',mode:'managed',note:'Участие в профессиональном контуре подтверждается организатором.'},
        {id:'partner',label:'Партнёр',mode:'managed',note:'Партнёрская роль подтверждается организатором.'}
      ]
    }
  };

  function loadState(){
    var state={profile:DEFAULT_PROFILE,registrations:{mfw:null,bfs:null}};
    try{
      var saved=JSON.parse(localStorage.getItem('mfp.account.v1')||'null');
      if(saved){state.profile=Object.assign({},DEFAULT_PROFILE,saved.profile||{});state.registrations=Object.assign({mfw:null,bfs:null},saved.registrations||{});}
    }catch(e){}
    return state;
  }
  var accountState=loadState();
  function saveState(){
    try{localStorage.setItem('mfp.account.v1',JSON.stringify(accountState));}catch(e){}
    notifyFrame();
  }
  function notifyFrame(){
    try{frame.contentWindow.postMessage({type:'mfp-account-state',payload:accountState},'*');}catch(e){}
  }
  function safeJson(key,fallback){try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}catch(e){return fallback;}}
  async function hydrateMadeDirectory(){
    try{
      var out=await authorityFetch('/v1/made-in-moscow/brands',{method:'GET'});
      madeVerifiedBrands=Array.isArray(out&&out.data)?out.data:[];
      if(!hubModal.classList.contains('hidden')&&hubTab==='directory')renderDirectory();
    }catch(e){madeVerifiedBrands=[];}
  }
  function getInterestState(){
    return {
      mfwFollowed:safeJson('mfwSavedBrands',[]),
      mfwFavorites:safeJson('mfwFavoriteBrands',[]),
      mfwEvents:safeJson('mfwMyEvents',[]),
      bfsFollowed:safeJson('bfsFollowedProjects',{}),
      bfsFavorites:safeJson('bfsFavoriteProjects',{}),
      bfsSaved:safeJson('bfsSavedSessions',{})
    };
  }
  async function renderForYou(){
    var grid=document.getElementById('forYouGrid');
    grid.innerHTML='<div class="hub-note">Собираем рекомендации из ваших интересов, подписок и любимых брендов…</div>';
    var recs=[],server=false;
    if(accessToken()){
      try{
        var out=await authorityFetch('/v1/me/recommendations',{method:'GET'});
        recs=(out.data||[]).map(function(r){
          var reason=(r.reasons||[]).map(function(x){return x.replace('interest:','интерес · ').replace('favorite_brand:','любимый бренд · ').replace('followed_brand:','подписка · ').replace(/_/g,' ');}).join(' · ');
          return {type:String(r.eventBrand||'mfw').toUpperCase()+' · RECOMMENDED',title:r.title,body:formatWhen(r.startsAt)+' · '+(r.metadata&&r.metadata.venueLabel||r.metadata&&r.metadata.hall||''),path:reason||'programme relevance',event:r.eventBrand||'mfw',id:r.id,score:r.score};
        });server=true;
      }catch(e){}
    }
    if(!recs.length){
      var data=window.MFP_DATA||{mfw:{brands:[],events:[]},bfs:{sessions:[],speakers:[]}},interests=getInterestState();
      (data.mfw.brands||[]).forEach(function(b){
        if((interests.mfwFavorites||[]).indexOf(b.id)>=0||(interests.mfwFollowed||[]).indexOf(b.id)>=0){
          var show=(data.mfw.events||[]).filter(function(e){return e.id===b.showId;})[0];
          recs.push({type:'MFW · BRAND',title:b.name,body:show?(show.date+' · '+show.time+' · '+show.venue):'Следите за обновлениями бренда',path:'Favorite / Follow → Show → Reminder → Replay → Reward',event:'mfw'});
        }
      });
      Object.keys(interests.bfsSaved||{}).filter(function(k){return interests.bfsSaved[k];}).forEach(function(id){
        var ss=(data.bfs.sessions||[]).filter(function(x){return x.id===id;})[0];
        if(ss)recs.push({type:'BFS · SESSION',title:ss.title,body:ss.date+' · '+ss.time+' · '+ss.hall,path:'Saved session → Speaker → Meeting → Lead',event:'bfs'});
      });
    }
    if(!recs.length){
      recs=[
        {type:'MFW · START HERE',title:'Добавьте любимый бренд',body:'MFW → Бренды → Follow или ♥ Favorite',path:'Brand → Show → LIVE / Replay → Reward',event:'mfw'},
        {type:'BFS · START HERE',title:'Сохраните интересную сессию',body:'BFS → Программа → добавьте сессию',path:'Session → Speaker → Meeting → Lead',event:'bfs'}
      ];
    }
    grid.innerHTML=recs.slice(0,8).map(function(r){
      return '<article class="rec-card"><div class="rec-type">'+h(r.type)+(server?' · SERVER':'')+'</div><h3>'+h(r.title)+'</h3><p>'+h(r.body)+'</p><div class="rec-path">'+h(r.path)+'</div><div class="rec-actions"><button data-rec-event="'+h(r.event)+'">ОТКРЫТЬ '+h(String(r.event).toUpperCase())+'</button>'+(r.id?'<button class="secondary" data-rec-agenda="'+h(r.id)+'" data-rec-kind="'+h(r.event)+'">В ПРОГРАММУ</button>':'')+'</div></article>';
    }).join('');
    [].slice.call(document.querySelectorAll('[data-rec-event]')).forEach(function(b){b.onclick=function(){forYouModal.classList.add('hidden');openEvent(b.dataset.recEvent);};});
    [].slice.call(document.querySelectorAll('[data-rec-agenda]')).forEach(function(b){b.onclick=function(){addAgenda(b.dataset.recKind,b.dataset.recAgenda);};});
    var interests=getInterestState(),counts={
      registered:(accountState.registrations.mfw?1:0)+(accountState.registrations.bfs?1:0),
      saved:(interests.mfwEvents||[]).length+Object.keys(interests.bfsSaved||{}).filter(function(k){return interests.bfsSaved[k];}).length,
      followed:(interests.mfwFollowed||[]).length+Object.keys(interests.bfsFollowed||{}).filter(function(k){return interests.bfsFollowed[k];}).length,
      favorite:(interests.mfwFavorites||[]).length+Object.keys(interests.bfsFavorites||{}).filter(function(k){return interests.bfsFavorites[k];}).length
    };
    document.getElementById('ownerFunnel').innerHTML='<h3>Ваш путь</h3><div class="funnel-grid">'+
      [['REGISTER',counts.registered],['SAVE',counts.saved],['FOLLOW',counts.followed],['FAVORITE',counts.favorite]].map(function(x){return '<div class="funnel-step"><b>'+x[1]+'</b><span>'+x[0]+'</span></div>';}).join('')+
      '</div><div class="funnel-note">'+(server?'Рекомендации рассчитаны server-side из explicit interests + follows + favorites.':'Локальный fallback до появления server-сессии.')+'</div>';
  }

  function agendaLoad(){return safeJson('mfpAgenda.v1',[]);}
  function agendaSave(items){try{localStorage.setItem('mfpAgenda.v1',JSON.stringify(items));}catch(e){}}
  function toMinutes(t){var p=String(t||'00:00').split(':');return Number(p[0])*60+Number(p[1]||0);}
  function planningEnd(item){
    if(item.end)return toMinutes(item.end);
    var mins=item.type==='Показ'?45:60;
    return toMinutes(item.time)+mins;
  }
  function agendaConflicts(items){
    var byDate={};items.forEach(function(x){(byDate[x.date]||(byDate[x.date]=[])).push(x);});
    var conflicts=[];
    Object.keys(byDate).forEach(function(date){
      var arr=byDate[date].slice().sort(function(a,b){return toMinutes(a.time)-toMinutes(b.time);});
      for(var i=0;i<arr.length;i++)for(var k=i+1;k<arr.length;k++){
        if(toMinutes(arr[k].time)<planningEnd(arr[i])){
          conflicts.push({a:arr[i],b:arr[k],date:date});
        }
      }
    });
    return conflicts;
  }
  async function addAgenda(kind,id){
    var data=window.MFP_DATA||{},entity=null,eventCode=String(kind||'').toLowerCase()==='bfs'?'BFS':'MFW';
    if(String(kind).toLowerCase()==='mfw')entity=(data.mfw&&data.mfw.events||[]).filter(function(x){return x.id===id;})[0];
    else entity=(data.bfs&&data.bfs.sessions||[]).filter(function(x){return x.id===id;})[0];
    var items=agendaLoad();
    if(entity&&!items.some(function(x){return x.id===id&&x.kind===String(kind).toLowerCase();})){
      items.push(Object.assign({},entity,{kind:String(kind).toLowerCase(),eventCode:eventCode}));agendaSave(items);
    }
    try{
      await ensureAuthoritySession('Visitor',false);
      await authorityFetch('/v1/agenda/'+encodeURIComponent(id)+'/save',{method:'POST',body:JSON.stringify({reminderEnabled:true,reminderMinutes:20})});
    }catch(e){}
    renderHub();
  }
  async function removeAgenda(kind,id){
    agendaSave(agendaLoad().filter(function(x){return !(x.kind===kind&&x.id===id);}));
    try{if(accessToken())await authorityFetch('/v1/agenda/'+encodeURIComponent(id),{method:'DELETE'});}catch(e){}
    renderHub();
  }
  function directoryEntities(){
    var data=window.MFP_DATA||{mfw:{brands:[],events:[]},bfs:{speakers:[],sessions:[]}}, out=[];
    (data.mfw.brands||[]).forEach(function(x){out.push({kind:'mfw-brand',event:'MFW',openEvent:'mfw',id:x.id,title:x.name,subtitle:x.city,meta:(x.tags||[]).join(' · '),showId:x.showId});});
    (data.mfw.events||[]).forEach(function(x){out.push({kind:'mfw-event',event:'MFW',openEvent:'mfw',id:x.id,title:x.title,subtitle:x.date+' · '+x.time,meta:x.type+' · '+x.venue});});
    (data.bfs.speakers||[]).forEach(function(x){out.push({kind:'bfs-speaker',event:'BFS',openEvent:'bfs',id:x.id,title:x.name,subtitle:x.role,meta:x.org});});
    (data.bfs.sessions||[]).forEach(function(x){out.push({kind:'bfs-session',event:'BFS',openEvent:'bfs',id:x.id,title:x.title,subtitle:x.date+' · '+x.time,meta:x.topic+' · '+x.hall});});
    madeVerifiedBrands.forEach(function(x){out.push({kind:'made-brand',event:'MADE',openEvent:'made',id:x.id,title:x.name,subtitle:x.city||'Москва',meta:'Made in Moscow Verified · canonical MFW brand'});});
    return out;
  }
  function sourceBadge(event){
    if(event==='MADE')return '<span class="source-badge made-source">VERIFIED ROSTER</span>';
    var s=(window.MFP_DATA&&window.MFP_DATA.sources||{})[event==='MFW'?'mfw':'bfs'];
    return s?'<span class="source-badge">OFFICIAL · '+h(window.MFP_DATA.syncedAt||'')+'</span>':'';
  }
  function isoDay(d){
    var x=d instanceof Date?d:new Date(d);
    var y=x.getFullYear(),m=String(x.getMonth()+1).padStart(2,'0'),day=String(x.getDate()).padStart(2,'0');
    return y+'-'+m+'-'+day;
  }
  function ecosystemLifecycle(now){
    var data=window.MFP_DATA||{mfw:{events:[]},bfs:{sessions:[]}};
    var days=[].concat((data.mfw.events||[]).map(function(x){return x.date;}),(data.bfs.sessions||[]).map(function(x){return x.date;})).filter(Boolean).sort();
    var start=days[0]||null,end=days[days.length-1]||null,today=isoDay(now||new Date());
    var phase=!start?'unknown':today<start?'before':today>end?'after':'live';
    return {phase:phase,start:start,end:end,today:today};
  }
  function renderToday(){
    var data=window.MFP_DATA||{mfw:{events:[],brands:[]},bfs:{sessions:[]}},life=ecosystemLifecycle(new Date()),interest=getInterestState();
    var saved=(interest.mfwEvents||[]).length+Object.keys(interest.bfsSaved||{}).filter(function(k){return interest.bfsSaved[k];}).length;
    var followed=(interest.mfwFollowed||[]).length+Object.keys(interest.bfsFollowed||{}).filter(function(k){return interest.bfsFollowed[k];}).length;
    var favorites=(interest.mfwFavorites||[]).length+Object.keys(interest.bfsFavorites||{}).filter(function(k){return interest.bfsFavorites[k];}).length;
    var replayConfirmed=[].concat(data.mfw.events||[],data.bfs.sessions||[]).filter(function(x){return x.media&&['available','replay','published'].indexOf(String(x.media.replay||'').toLowerCase())>=0;}).length;
    var phaseLabel=life.phase==='before'?'BEFORE EVENT':life.phase==='live'?'LIVE DAYS':life.phase==='after'?'AFTER EVENT':'PROGRAMME STATE';
    var phaseCopy=life.phase==='before'?'Соберите программу и интересы до начала событий.':life.phase==='live'?'Платформа приоритизирует события сегодняшнего дня и следующий шаг.':life.phase==='after'?'Событийная неделя завершена. Продолжаем отношения, контент и коммерческий follow-up.':'Даты программы ещё не определены.';
    var phaseCards='';
    if(life.phase==='live'){
      var todayRows=[].concat(
        (data.mfw.events||[]).filter(function(x){return x.date===life.today;}).map(function(x){return {...x,eventCode:'MFW',kind:'mfw'};}),
        (data.bfs.sessions||[]).filter(function(x){return x.date===life.today;}).map(function(x){return {...x,eventCode:'BFS',kind:'bfs'};})
      ).sort(function(a,b){return toMinutes(a.time)-toMinutes(b.time);}).slice(0,8);
      phaseCards='<div class="today-programme">'+todayRows.map(function(x){return '<article><span>'+h(x.eventCode)+' · '+h(x.time)+'</span><b>'+h(x.title)+'</b><small>'+h(x.venue||x.hall||'')+'</small><button data-today-agenda="'+h(x.id)+'" data-today-kind="'+h(x.kind)+'">В КАЛЕНДАРЬ</button></article>';}).join('')+'</div>';
      if(!todayRows.length)phaseCards='<div class="hub-note">На сегодня в текущем snapshot нет опубликованных событий.</div>';
    }else if(life.phase==='before'){
      phaseCards='<div class="today-action-grid">'+
        '<button data-today-action="access"><b>01</b><span>Проверить профиль и регистрации</span></button>'+
        '<button data-today-action="discover"><b>02</b><span>Найти бренды, показы и сессии</span></button>'+
        '<button data-today-action="agenda"><b>03</b><span>Собрать персональный план</span></button>'+
        '<button data-today-action="foryou"><b>04</b><span>Настроить интересы и рекомендации</span></button>'+
      '</div>';
    }else{
      phaseCards='<div class="today-action-grid">'+
        '<button data-today-action="discover"><b>'+h(followed+favorites)+'</b><span>relationships · продолжить Discover</span></button>'+
        '<button data-today-action="foryou"><b>'+h(saved)+'</b><span>saved items · открыть «Для вас»</span></button>'+
        '<button data-today-action="dealroom"><b>B2B</b><span>meeting → request → handoff preview</span></button>'+
        '<button data-today-action="made"><b>365</b><span>Made in Moscow + Brand365 continuity</span></button>'+
      '</div>';
    }
    hubContent.innerHTML=
      '<section class="today-hero" data-phase="'+h(life.phase)+'"><div><div class="drawer-kicker">'+h(phaseLabel)+' · '+h(life.start||'—')+' → '+h(life.end||'—')+'</div><h3>'+h(phaseCopy)+'</h3><p>Lifecycle определяется опубликованными датами MFW/BFS, а не вручную выбранным demo-state.</p></div><div class="lifecycle-rail"><span class="'+(life.phase==='before'?'active':'done')+'">BEFORE</span><i>→</i><span class="'+(life.phase==='live'?'active':life.phase==='after'?'done':'')+'">LIVE</span><i>→</i><span class="'+(life.phase==='after'?'active':'')+'">AFTER</span></div></section>'+
      '<div class="today-kpis"><div><b>'+h(saved)+'</b><span>saved</span></div><div><b>'+h(followed)+'</b><span>followed</span></div><div><b>'+h(favorites)+'</b><span>favorites</span></div><div><b>'+h(replayConfirmed)+'</b><span>confirmed replay assets</span></div></div>'+
      phaseCards+
      (life.phase==='after'?'<div class="today-truth"><b>POST-EVENT TRUTH</b><span>Replay показывается как доступный только при подтверждённом media state. Follow-up и Deal Room не считаются продажей без отдельного outcome evidence.</span></div>':'')+
      '<div class="hub-note">«Сейчас» — read-only lifecycle projection. Она не меняет agenda, access или коммерческую truth без соответствующего server action.</div>';
    [].slice.call(document.querySelectorAll('[data-today-agenda]')).forEach(function(b){b.onclick=function(){addAgenda(b.dataset.todayKind,b.dataset.todayAgenda);};});
    [].slice.call(document.querySelectorAll('[data-today-action]')).forEach(function(b){b.onclick=function(){
      var a=b.dataset.todayAction;
      if(a==='discover'){hubTab='directory';renderHub();return;}
      if(a==='agenda'){hubTab='agenda';renderHub();return;}
      if(a==='dealroom'){hubTab='dealroom';renderHub();return;}
      if(a==='access'){hubModal.classList.add('hidden');openAccount();return;}
      if(a==='made'){hubModal.classList.add('hidden');openEvent('made');return;}
      if(a==='foryou'){hubModal.classList.add('hidden');renderForYou();forYouModal.classList.remove('hidden');}
    };});
  }

  function renderDirectory(){
    hubContent.innerHTML=
      '<div class="companion-routes">'+
        '<button data-companion-route="plan"><b>PLAN</b><span>единый календарь MFW + BFS</span><i>01</i></button>'+
        '<button class="active" data-companion-route="discover"><b>DISCOVER</b><span>бренды, показы, сессии, спикеры</span><i>02</i></button>'+
        '<button data-companion-route="connect"><b>CONNECT</b><span>buyer / delegate / B2B контур</span><i>03</i></button>'+
        '<button data-companion-route="access"><b>ACCESS</b><span>профиль, регистрации и статусы</span><i>04</i></button>'+
      '</div>'+
      '<div class="discover-head"><div><div class="drawer-kicker">GLOBAL DISCOVERY · PUBLIC SNAPSHOTS + VERIFIED ROSTER</div><h3>Ищите по всей платформе</h3></div><kbd>⌘ / Ctrl + K</kbd></div>'+
      '<div class="directory-tools"><input class="directory-search" id="directorySearch" autocomplete="off" placeholder="Бренд, спикер, сессия, показ"><select class="directory-filter" id="directoryFilter"><option value="all">Все направления</option><option value="MFW">MFW</option><option value="BFS">BFS</option><option value="MADE">Сделано в Москве</option><option value="brand">Бренды</option><option value="speaker">Спикеры</option><option value="programme">Программа</option></select></div>'+
      '<div class="directory-summary" id="directorySummary"></div><div class="directory-grid" id="directoryGrid"></div>'+
      '<div class="hub-note">Discover — rebuildable read-only projection. MFW/BFS берутся из опубликованных snapshot-данных; «Сделано в Москве» появляется только из verified roster authority. Результаты поиска не меняют registration, access, CRM или Verified truth.</div>';
    function draw(){
      var input=document.getElementById('directorySearch'),filter=document.getElementById('directoryFilter');
      var q=(input.value||'').trim().toLowerCase(),f=filter.value;
      var rows=directoryEntities().filter(function(x){
        var text=(x.title+' '+x.subtitle+' '+x.meta).toLowerCase();
        var okF=f==='all'||x.event===f||(f==='brand'&&(x.kind==='mfw-brand'||x.kind==='made-brand'))||(f==='speaker'&&x.kind==='bfs-speaker')||(f==='programme'&&(x.kind==='mfw-event'||x.kind==='bfs-session'));
        return okF&&(!q||text.indexOf(q)>=0);
      });
      var counts=rows.reduce(function(m,x){m[x.event]=(m[x.event]||0)+1;return m;},{});
      document.getElementById('directorySummary').innerHTML='<span>'+rows.length+' результатов</span><span>MFW '+(counts.MFW||0)+'</span><span>BFS '+(counts.BFS||0)+'</span><span>MADE '+(counts.MADE||0)+'</span>';
      document.getElementById('directoryGrid').innerHTML=rows.slice(0,60).map(function(x){
        var action='<button data-open-result="'+h(x.openEvent)+'">ОТКРЫТЬ '+h(x.event==='MADE'?'РАЗДЕЛ':x.event)+'</button>';
        if(x.kind==='mfw-event')action+='<button class="secondary" data-agenda-kind="mfw" data-agenda-id="'+h(x.id)+'">В КАЛЕНДАРЬ</button>';
        if(x.kind==='bfs-session')action+='<button class="secondary" data-agenda-kind="bfs" data-agenda-id="'+h(x.id)+'">В КАЛЕНДАРЬ</button>';
        if(x.kind==='mfw-brand'&&x.showId)action+='<button class="secondary" data-link-show="'+h(x.showId)+'">СВЯЗАННЫЙ ПОКАЗ</button>';
        return '<article class="directory-card '+(x.event==='MADE'?'made-directory-card':'')+'"><div class="kind">'+h(x.event)+' · '+h(x.kind.replace('-',' ').toUpperCase())+' '+sourceBadge(x.event)+'</div><h3>'+h(x.title)+'</h3><p>'+h(x.subtitle)+'</p><div class="entity-meta">'+h(x.meta)+'</div><div class="directory-actions">'+action+'</div></article>';
      }).join('')||'<div class="hub-note empty-result">Ничего не найдено. Попробуйте название бренда, тему или имя спикера.</div>';
      [].slice.call(document.querySelectorAll('[data-agenda-kind]')).forEach(function(b){b.onclick=function(){addAgenda(b.dataset.agendaKind,b.dataset.agendaId);};});
      [].slice.call(document.querySelectorAll('[data-open-result]')).forEach(function(b){b.onclick=function(){hubModal.classList.add('hidden');openEvent(b.dataset.openResult);};});
      [].slice.call(document.querySelectorAll('[data-link-show]')).forEach(function(b){b.onclick=function(){
        var id=b.dataset.linkShow,e=(window.MFP_DATA.mfw.events||[]).filter(function(x){return x.id===id;})[0];
        if(e){input.value=e.title;filter.value='MFW';draw();}
      };});
    }
    [].slice.call(document.querySelectorAll('[data-companion-route]')).forEach(function(b){b.onclick=function(){
      var route=b.dataset.companionRoute;
      if(route==='plan'){hubTab='agenda';renderHub();return;}
      if(route==='discover'){document.getElementById('directorySearch').focus();return;}
      if(route==='connect'){hubModal.classList.add('hidden');openEvent('bfs');return;}
      if(route==='access'){hubModal.classList.add('hidden');openAccount();}
    };});
    document.getElementById('directorySearch').oninput=draw;
    document.getElementById('directoryFilter').onchange=draw;
    draw();
  }
  async function renderAgenda(){
    var items=agendaLoad().slice(),serverConflicts=null,server=false;
    if(accessToken()){
      try{
        var out=await authorityFetch('/v1/agenda',{method:'GET'});
        if(out.source==='postgres'){
          items=(out.data||[]).map(function(x){return {id:x.eventId,kind:x.eventBrand,eventCode:String(x.eventBrand||'mfw').toUpperCase(),title:x.title,startsAt:x.startsAt,endsAt:x.endsAt,reminderMinutes:x.reminderMinutes,venue:x.metadata&&x.metadata.venueLabel||''};});
          var co=await authorityFetch('/v1/agenda/conflicts',{method:'GET'});serverConflicts=co.data||[];server=true;
        }
      }catch(e){}
    }
    var conflicts=server?serverConflicts:agendaConflicts(items);
    var alert=conflicts&&conflicts.length?'<div class="agenda-alert"><b>Найдено пересечений: '+conflicts.length+'</b><br>'+conflicts.map(function(x){return server?(h(x.titleA)+' ↔ '+h(x.titleB)):(h(x.date)+': '+h(x.a.title)+' ↔ '+h(x.b.title));}).join('<br>')+'</div>':'<div class="agenda-alert agenda-ok"><b>Конфликтов не найдено.</b> '+(server?'SERVER CHECK':'LOCAL PLANNING')+'</div>';
    hubContent.innerHTML=alert+'<div class="agenda-list">'+items.map(function(x){
      var when=x.startsAt?formatWhen(x.startsAt):(h(x.date)+'<br>'+h(x.time)+(x.end?'–'+h(x.end):''));
      return '<article class="agenda-item"><div class="agenda-time"><span class="agenda-event">'+h(x.eventCode||String(x.kind||'').toUpperCase())+'</span><br>'+when+'</div><div><h3>'+h(x.title)+'</h3><p>'+h(x.venue||x.hall||'')+(x.reminderMinutes!=null?' · reminder '+h(x.reminderMinutes)+' min':'')+'</p></div><button class="agenda-action" data-remove-kind="'+h(x.kind)+'" data-remove-id="'+h(x.id)+'">УБРАТЬ</button></article>';
    }).join('')+'</div>'+(items.length?'':'<div class="hub-note">Добавьте показы MFW и сессии BFS — здесь появится единый маршрут.</div>');
    [].slice.call(document.querySelectorAll('[data-remove-id]')).forEach(function(b){b.onclick=function(){removeAgenda(b.dataset.removeKind,b.dataset.removeId);};});
  }
  async function renderWallet(){
    if(accessToken()){
      try{
        var out=await authorityFetch('/v1/me/wallet',{method:'GET'}),d=out.data||{},offers=d.offers||[],claims=d.claims||[];
        var offerCards=offers.map(function(o){
          var e=o.eligibility||{},progress=e.progress||[],days=progress.reduce(function(m,x){return Math.max(m,Number(x.currentDays||0));},0);
          return '<article class="wallet-card '+(e.eligible?'':'locked')+'"><div class="kind">MFW · '+(e.eligible?'ELIGIBLE':'PROGRESS')+'</div><h3>'+h(o.titleRu||o.titleEn||'Reward')+'</h3><div class="days">'+h(days)+' / '+h(o.minContinuousDays||30)+'</div><div class="wallet-progress"><i style="width:'+Math.min(100,Math.round(days/Math.max(1,Number(o.minContinuousDays||30))*100))+'%"></i></div><small>'+h((progress.filter(function(x){return !x.ok;})[0]||{}).detail||'Условия выполнены')+'</small>'+(e.eligible?'<button class="wallet-action" data-claim-offer="'+h(o.id)+'">ПОЛУЧИТЬ НАГРАДУ</button>':'')+'</article>';
        }).join('');
        var claimCards=claims.map(function(x){return '<article class="wallet-card"><div class="kind">CLAIM · '+h(String(x.status).toUpperCase())+'</div><h3>'+h(x.titleRu||x.titleEn||x.brandName||'Reward')+'</h3><small>'+h(x.brandName||'')+'</small>'+(x.status==='issued'?'<button class="wallet-action" data-wallet-qr="'+h(x.id)+'">ОТКРЫТЬ QR</button>':'')+'</article>';}).join('');
        hubContent.innerHTML='<div class="wallet-summary">'+h(d.summary&&d.summary.eligibleOffers||0)+' eligible · '+h(d.summary&&d.summary.issued||0)+' issued · '+h(d.summary&&d.summary.redeemed||0)+' redeemed</div><div class="wallet-grid">'+offerCards+claimCards+'</div>'+(offerCards||claimCards?'':'<div class="hub-note">Подпишитесь на бренд MFW и выполните условия loyalty campaign.</div>');
        [].slice.call(document.querySelectorAll('[data-claim-offer]')).forEach(function(b){b.onclick=async function(){try{await authorityFetch('/v1/loyalty/offers/'+encodeURIComponent(b.dataset.claimOffer)+'/claim',{method:'POST',body:'{}'});renderWallet();}catch(e){alert(e.message);}};});
        [].slice.call(document.querySelectorAll('[data-wallet-qr]')).forEach(function(b){b.onclick=async function(){try{var q=await authorityFetch('/v1/loyalty/claims/'+encodeURIComponent(b.dataset.walletQr)+'/qr',{method:'POST',body:'{}'});hubContent.innerHTML='<div class="wallet-qr-view"><button class="wallet-action" id="walletBack">← WALLET</button><h3>Одноразовая привилегия</h3><img alt="Reward QR" src="'+h(q.data.qrDataUrl)+'"><small>QR короткоживущий и повторно проверяется сервером при redemption.</small></div>';document.getElementById('walletBack').onclick=renderWallet;}catch(e){alert(e.message);}};});
        return;
      }catch(e){}
    }
    var i=getInterestState(),cards=[];
    (window.MFP_DATA.mfw.brands||[]).forEach(function(b){if((i.mfwFollowed||[]).indexOf(b.id)>=0)cards.push({name:b.name,event:'MFW'});});
    hubContent.innerHTML='<div class="wallet-grid">'+cards.map(function(x){return '<article class="wallet-card locked"><div class="kind">'+x.event+' · SERVER VERIFICATION REQUIRED</div><h3>'+h(x.name)+'</h3><small>После подключения server session здесь появится verified 30-day eligibility.</small></article>';}).join('')+'</div>'+(cards.length?'':'<div class="hub-note">Подпишитесь на бренд MFW — здесь появятся условия привилегий.</div>');
  }

  function money(v){return new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(Number(v||0));}
  function pct(v){return Math.round(Number(v||0)*100)+'%';}
  async function renderOwner(){
    hubContent.innerHTML='<div class="hub-note">Загружаем Owner Control Tower…</div>';
    try{
      var out=await authorityFetch('/v1/owner/control-tower',{method:'GET'});
      var x=out.data||{},s=x.summary||{},brands=x.brands||[],cohorts=x.cohorts||[],migration=x.migration||[],acq=x.acquisitionMix||[],scenarios=x.scenarios||[],ce=x.crossEvent||{},cb=x.crossBrand||{};
      var brandRows=brands.slice(0,10).map(function(b){return '<div class="tower-row"><b>'+b.name+'</b><span>'+b.customers+' customers</span><span>'+money(b.attributableGmv)+' attr. GMV</span><span>'+money(b.incrementalGmv)+' incr. GMV</span><span>'+money(b.predictedClv)+' CLV</span></div>';}).join('');
      var cohortRows=cohorts.slice(0,8).map(function(q){return '<div class="cohort-row"><b>'+q.cohort+'</b><span>'+q.customers+'</span><span>'+pct(q.customers?q.m1/q.customers:0)+'</span><span>'+pct(q.customers?q.m3/q.customers:0)+'</span><span>'+pct(q.customers?q.m6/q.customers:0)+'</span></div>';}).join('');
      var migrationRows=migration.slice(0,6).map(function(m){return '<div class="migration-row"><span>'+m.from+'</span><i>→</i><span>'+m.to+'</span><b>'+m.users+'</b></div>';}).join('');
      var acqRows=acq.slice(0,6).map(function(a){return '<div class="tower-row"><b>'+a.source+'</b><span>'+a.acquired+' acquired</span><span>CAC '+(a.cac==null?'—':money(a.cac))+'</span><span>ROI '+(a.roi==null?'—':pct(a.roi))+'</span><span>'+money(a.revenue)+' revenue</span></div>';}).join('');
      var scenarioRows=scenarios.map(function(v){return '<div class="scenario-card"><span>MODELLED · '+v.label+'</span><b>'+money(v.illustrativeValue)+'</b><small>illustrative ecosystem value</small><em>GMV uplift '+pct(v.gmvUplift)+' · retention uplift '+pct(v.retentionUplift)+' · CLV realization '+pct(v.clvRealization)+'</em></div>';}).join('');
      hubContent.innerHTML='<div class="drawer-kicker">OWNER CONTROL TOWER · SERVER AUTHORITY</div><h3 class="tower-title">MFW Audience → Commercial Asset</h3>'+
        '<div class="metric-legend"><span>OBSERVED</span><span>ATTRIBUTED</span><span>INCREMENTAL</span><span>MODELLED</span></div>'+
        '<div class="analytics-grid">'+
        [['BRANDS',s.brands||0],['CUSTOMERS',s.customers||0],['RETENTION',pct(s.ecosystemRetention)],['ATTR. GMV',money(s.attributableGmv)],['INCR. GMV',money(s.incrementalGmv)],['PREDICTED CLV',money(s.predictedClv)]].map(function(a){return '<div class="analytics-stat"><b>'+a[1]+'</b><span>'+a[0]+'</span></div>';}).join('')+'</div>'+
        '<div class="tower-section"><h3>Brand-by-brand contribution</h3><div class="tower-table">'+(brandRows||'<div class="hub-note">Нет коммерческих данных брендов.</div>')+'</div></div>'+
        '<div class="tower-split"><section><h3>Cohort retention</h3><div class="cohort-head"><b>COHORT</b><span>N</span><span>M1</span><span>M3</span><span>M6</span></div>'+(cohortRows||'<div class="hub-note">Нужна история покупок.</div>')+'</section><section><h3>Cross-brand migration</h3><div class="tower-mini"><b>'+pct(cb.migrationRate)+'</b><span>multi-brand buyers</span><small>'+Number(cb.avgBrandsPerBuyer||0).toFixed(1)+' brands / buyer</small></div>'+(migrationRows||'<div class="hub-note">Переходов пока нет.</div>')+'</section></div>'+
        '<div class="tower-split"><section><h3>MFW ↔ BFS cross-event</h3><div class="cross-event-ring"><b>'+pct(ce.overlapRate)+'</b><span>cross-event overlap</span></div><div class="tower-foot">'+(ce.mfwUsers||0)+' MFW · '+(ce.bfsUsers||0)+' BFS · '+(ce.crossEventUsers||0)+' both</div></section><section><h3>Acquisition-source mix</h3><div class="tower-table">'+(acqRows||'<div class="hub-note">Добавьте server acquisition events.</div>')+'</div></section></div>'+
        '<div class="tower-section"><h3>Scenario valuation</h3><div class="scenario-grid">'+scenarioRows+'</div><div class="hub-note">MODELLED: это сценарная продуктовая оценка создаваемой клиентской ценности, а не enterprise valuation компании. Она использует incremental GMV и predicted CLV с явными коэффициентами реализации.</div></div>';
    }catch(err){
      hubContent.innerHTML='<div class="hub-note">Owner Control Tower требует авторизованную owner-сессию и server-side данные. Локальные demo-метрики намеренно не подменяют агрегаты экосистемы.</div>';
    }
  }
  function renderDealRoomPreview(){
    var data=window.MFP_DATA||{mfw:{brands:[]}},interest=getInterestState();
    var preferredId=(interest.mfwFavorites||[])[0]||(interest.mfwFollowed||[])[0]||null;
    var preferred=(data.mfw.brands||[]).filter(function(x){return x.id===preferredId;})[0]||null;
    var context=preferred?preferred.name:'Выбранный бренд после подтверждённой встречи';
    hubContent.innerHTML=
      '<div class="dealroom-preview-banner"><b>PREVIEW · NO COMMERCIAL DATA SAVED</b><span>Workflow демонстрируется до durable PostgreSQL + ACL/policy. Ни цена, MOQ, заказ или приватный документ здесь не сохраняются.</span></div>'+
      '<div class="dealroom-hero"><div><div class="drawer-kicker">BUYER / BRAND DEAL ROOM</div><h3>Из встречи — в структурированный коммерческий follow-up.</h3><p>'+h(context)+'</p></div><div class="dealroom-chain"><span>MEETING</span><i>→</i><span>SHORTLIST</span><i>→</i><span>REQUEST</span><i>→</i><span>RESPONSE</span><i>→</i><span>HANDOFF</span></div></div>'+
      '<div class="dealroom-stage-grid">'+
        '<article><small>01 · RELATIONSHIP GATE</small><h4>Confirmed meeting</h4><p>Deal Room открывается только для авторизованной bilateral relationship.</p><span class="deal-status locked">SERVER ACL REQUIRED</span></article>'+
        '<article><small>02 · BUYER SHORTLIST</small><h4>Looks / collection</h4><p>Look, collection, replay timecode, buyer note и interest level.</p><span class="deal-status">CANONICAL IDS ONLY</span></article>'+
        '<article><small>03 · STRUCTURED REQUEST</small><h4>Что нужно байеру?</h4><p>Не письмо «пришлите всё», а типизированный запрос со сроком и ответственным.</p><span class="deal-status">AUDITABLE</span></article>'+
        '<article><small>04 · BRAND RESPONSE</small><h4>Response evidence</h4><p>Ответ, approved document reference и следующий шаг без превращения MFW в ERP.</p><span class="deal-status">PRIVATE SCOPE</span></article>'+
        '<article><small>05 · HANDOFF</small><h4>External commerce</h4><p>CRM / PLM / wholesale-system reference только после явного handoff.</p><span class="deal-status">NO SILENT ORDER</span></article>'+
      '</div>'+
      '<section class="dealroom-section"><div class="dealroom-section-head"><div><small>REQUEST TYPES</small><h4>Структурированный buyer intent</h4></div><span>DEMO TAXONOMY</span></div><div class="request-chip-grid">'+
        ['LINE SHEET','WHOLESALE PRICE','AVAILABILITY','MOQ','DELIVERY WINDOW','SAMPLE','SHOWROOM APPOINTMENT','DISTRIBUTION / MARKET'].map(function(x){return '<button disabled>'+x+'</button>';}).join('')+
      '</div></section>'+
      '<section class="dealroom-section"><div class="dealroom-section-head"><div><small>PRIVATE DOCUMENTS</small><h4>Контролируемый обмен</h4></div><span>ACL BEFORE DOWNLOAD</span></div><div class="deal-doc-grid">'+
        '<article><b>Line sheet</b><span>versioned · buyer-scoped</span><em>LOCKED PREVIEW</em></article>'+
        '<article><b>Lookbook</b><span>approved collection assets</span><em>LOCKED PREVIEW</em></article>'+
        '<article><b>Brand deck</b><span>commercial presentation</span><em>LOCKED PREVIEW</em></article>'+
        '<article><b>Sample / shipping</b><span>operational information</span><em>LOCKED PREVIEW</em></article>'+
      '</div></section>'+
      '<section class="dealroom-section evidence-classification"><div class="dealroom-section-head"><div><small>COMMERCIAL EVIDENCE</small><h4>Не считать запрос выручкой.</h4></div></div><div class="evidence-classes">'+
        '<div><b>OBSERVED</b><span>meeting / request / response inside MFW</span></div>'+
        '<div><b>REPORTED</b><span>commercial outcome voluntarily reported by partner</span></div>'+
        '<div><b>VERIFIED</b><span>outcome confirmed by admitted external integration</span></div>'+
      '</div></section>'+
      '<div class="dealroom-actions"><button data-deal-open="bfs">ОТКРЫТЬ BFS NETWORKING</button><button class="secondary" data-deal-open="mfw">ОТКРЫТЬ MFW BRANDS</button></div>'+
      '<div class="hub-note">PREVIEW boundary: Deal Room показывает будущий product contract. Production lifecycle, ACL, documents, due dates, idempotency и audit допускаются только после Phase 0 PostgreSQL и formal policy.</div>';
    [].slice.call(document.querySelectorAll('[data-deal-open]')).forEach(function(b){b.onclick=function(){hubModal.classList.add('hidden');openEvent(b.dataset.dealOpen);};});
  }

  function evidenceBadge(cls){
    var labels={observed:'OBSERVED',reported:'REPORTED',verified:'VERIFIED',modelled:'MODELLED',synthetic:'SYNTHETIC',not_evidenced:'NOT EVIDENCED'};
    return '<span class="evidence-badge evidence-'+h(cls)+'">'+h(labels[cls]||String(cls||'UNKNOWN').toUpperCase())+'</span>';
  }
  function liveProofChain(){
    var interest=getInterestState(),reg=(accountState.registrations.mfw||accountState.registrations.bfs),brandId=(interest.mfwFavorites||[])[0]||(interest.mfwFollowed||[])[0]||null;
    var brand=(window.MFP_DATA&&window.MFP_DATA.mfw&&window.MFP_DATA.mfw.brands||[]).filter(function(x){return x.id===brandId;})[0];
    var bfsMeeting=safeJson('bfsMeetingState',null);
    var followed=(interest.mfwFollowed||[]).length+Object.keys(interest.bfsFollowed||{}).filter(function(k){return interest.bfsFollowed[k];}).length;
    var favorite=(interest.mfwFavorites||[]).length+Object.keys(interest.bfsFavorites||{}).filter(function(k){return interest.bfsFavorites[k];}).length;
    var saved=(interest.mfwEvents||[]).length+Object.keys(interest.bfsSaved||{}).filter(function(k){return interest.bfsSaved[k];}).length;
    return [
      {stage:'IDENTITY',time:'NOW',value:reg?'Shared profile + event registration':'Shared profile only',evidence:reg?'observed':'not_evidenced'},
      {stage:'INTEREST',time:'NOW',value:(favorite||followed||saved)?((favorite+' favorite · '+followed+' follow · '+saved+' saved')):'No explicit signal yet',evidence:(favorite||followed||saved)?'observed':'not_evidenced'},
      {stage:'BRAND',time:'NOW',value:brand?brand.name:'No MFW brand selected',evidence:brand?'observed':'not_evidenced'},
      {stage:'MEETING',time:'NOW',value:bfsMeeting?((bfsMeeting.delegate||'BFS contact')+' · '+String(bfsMeeting.status||'requested').toUpperCase()):'No meeting evidence in current local state',evidence:bfsMeeting?'observed':'not_evidenced'},
      {stage:'INTENT',time:'NOW',value:'Requires explicit Deal Room / request evidence',evidence:'not_evidenced'},
      {stage:'HANDOFF',time:'NOW',value:'Requires admitted external reference',evidence:'not_evidenced'},
      {stage:'30 DAYS',time:'D30',value:'Requires verified continuity history',evidence:'not_evidenced'},
      {stage:'90 DAYS',time:'D90',value:'Requires repeat/follow-up history',evidence:'not_evidenced'},
      {stage:'365 DAYS',time:'D365',value:'Requires longitudinal cross-event history',evidence:'not_evidenced'}
    ];
  }
  function proofChain(){
    return proofMode==='synthetic'&&INVESTOR_MODEL.syntheticCase?INVESTOR_MODEL.syntheticCase.chain:liveProofChain();
  }
  function proofModeToggle(){
    return '<div class="proof-mode-toggle"><button data-proof-mode="live" class="'+(proofMode==='live'?'active':'')+'" >LIVE-ДАННЫЕ</button><button data-proof-mode="synthetic" class="'+(proofMode==='synthetic'?'active':'')+'" >СИНТЕТИЧЕСКИЙ КЕЙС</button></div>';
  }
  function bindProofMode(){
    [].slice.call(document.querySelectorAll('[data-proof-mode]')).forEach(function(b){b.onclick=function(){proofMode=b.dataset.proofMode;renderHub();};});
  }
  function renderIdentityGraph(){
    var interest=getInterestState(),mfwReg=accountState.registrations.mfw,bfsReg=accountState.registrations.bfs;
    var followed=(interest.mfwFollowed||[]).length+Object.keys(interest.bfsFollowed||{}).filter(function(k){return interest.bfsFollowed[k];}).length;
    var favorite=(interest.mfwFavorites||[]).length+Object.keys(interest.bfsFavorites||{}).filter(function(k){return interest.bfsFavorites[k];}).length;
    var saved=(interest.mfwEvents||[]).length+Object.keys(interest.bfsSaved||{}).filter(function(k){return interest.bfsSaved[k];}).length;
    hubContent.innerHTML=
      '<div class="drawer-kicker">СКВОЗНОЙ ГРАФ ИДЕНТИЧНОСТИ · ОДИН СУБЪЕКТ / РАЗДЕЛЬНЫЕ ПРАВА</div>'+
      '<div class="identity-graph">'+
        '<article class="identity-node center"><span>СУБЪЕКТ ПЛАТФОРМЫ</span><b>'+h(displayName())+'</b><small>'+h(accountState.profile.company||'No organisation')+' · '+h(accountState.profile.country||'—')+'</small></article>'+
        '<article class="identity-node mfw"><span>MFW</span><b>'+(mfwReg?h(String(mfwReg.registrationType||'registered').toUpperCase()) :'НЕТ РЕГИСТРАЦИИ')+'</b><small>доступ в рамках события · '+saved+' сохранённых сигналов</small></article>'+
        '<article class="identity-node bfs"><span>BFS</span><b>'+(bfsReg?h(String(bfsReg.registrationType||'registered').toUpperCase()) :'НЕТ РЕГИСТРАЦИИ')+'</b><small>доступ в рамках события · профессиональный слой встреч</small></article>'+
        '<article class="identity-node made"><span>MADE IN MOSCOW</span><b>ОБЩИЙ USER ID</b><small>статус бренда Verified остаётся отдельной authority</small></article>'+
        '<article class="identity-node signals"><span>ГРАФ ОТНОШЕНИЙ</span><b>'+h(followed)+' подписок · '+h(favorite)+' избранных</b><small>только явные сигналы · без вывода скрытого intent</small></article>'+
      '</div>'+
      '<div class="identity-edge-grid"><div><b>ОБЩЕЕ</b><span>профиль · интересы · поиск · continuity отношений</span></div><div><b>РАЗДЕЛЬНО</b><span>регистрация MFW/BFS · QR/access · верификация бренда Made</span></div><div><b>НАКАПЛИВАЕТСЯ</b><span>повторное участие · встречи · evidence Deal Room · trust history</span></div></div>'+
      '<div class="identity-principle"><b>ПОЧЕМУ ЭТО ВАЖНО</b><span>Без общего графа идентичности MFW, BFS и «Сделано в Москве» остаются тремя несвязанными продуктами. С ним каждое явно разрешённое взаимодействие усиливает одну долгосрочную fashion-связь, сохраняя отдельные права каждого события.</span></div>'+
      '<div class="hub-note">Это проекция поверх канонических identity и явных сигналов. Она не является authority прав доступа и не объединяет event credentials или права верификации брендов «Сделано в Москве».</div>';
  }

  function controlTowerModel(){return INVESTOR_MODEL.controlTower||{cases:[],syntheticPortfolio:{funnel:[]}};}
  function selectedControlTowerCase(){
    var rows=controlTowerModel().cases||[];
    return rows.filter(function(x){return x.id===selectedControlCase;})[0]||rows[0]||null;
  }
  function controlTowerTabs(){
    return '<div class="control-view-tabs"><button data-control-view="case" class="'+(controlTowerView==='case'?'active':'')+'">ДОСЬЕ КЕЙСА</button><button data-control-view="portfolio" class="'+(controlTowerView==='portfolio'?'active':'')+'">ПОРТФЕЛЬ</button><button data-control-view="comparison" class="'+(controlTowerView==='comparison'?'active':'')+'">СРАВНЕНИЕ</button></div>';
  }
  function bindControlTower(){
    [].slice.call(document.querySelectorAll('[data-control-view]')).forEach(function(b){b.onclick=function(){controlTowerView=b.dataset.controlView;renderInvestorProof();};});
    [].slice.call(document.querySelectorAll('[data-control-case]')).forEach(function(b){b.onclick=function(){selectedControlCase=b.dataset.controlCase;renderInvestorProof();};});
    [].slice.call(document.querySelectorAll('[data-proof-mode]')).forEach(function(b){b.onclick=function(){proofMode=b.dataset.proofMode;renderInvestorProof();};});
    [].slice.call(document.querySelectorAll('[data-proof-open]')).forEach(function(b){b.onclick=function(){hubTab=b.dataset.proofOpen;renderHub();};});
    [].slice.call(document.querySelectorAll('[data-portfolio-stage]')).forEach(function(b){b.onclick=function(){selectedPortfolioStage=b.dataset.portfolioStage;renderInvestorProof();};});
    [].slice.call(document.querySelectorAll('[data-open-dossier]')).forEach(function(b){b.onclick=function(){selectedControlCase=b.dataset.openDossier;controlTowerView='case';proofMode='synthetic';renderInvestorProof();};});
    [].slice.call(document.querySelectorAll('[data-close-drill]')).forEach(function(b){b.onclick=function(){selectedPortfolioStage='';renderInvestorProof();};});
  }
  function renderCaseDossier(){
    var synthetic=proofMode==='synthetic',tower=controlTowerModel(),rows=tower.cases||[],active=selectedControlTowerCase();
    var liveChain=liveProofChain();
    if(!synthetic){
      active={
        id:'live-current',
        label:'ТЕКУЩИЙ LIVE-КЕЙС',
        participant:{name:displayName(),role:(accountState.registrations.mfw&&accountState.registrations.mfw.registrationType)||(accountState.registrations.bfs&&accountState.registrations.bfs.registrationType)||'Visitor',organisation:accountState.profile.company||'—',market:accountState.profile.country||'—',source:'Текущее состояние общего аккаунта'},
        brand:{name:'Текущая явная связь с брендом',category:'Выведено только из явных saved/follow/favorite',origin:'MFW/BFS/Made'},
        potentialRevenueStreams:[],
        dossier:liveChain.map(function(x,i){return {stage:x.stage,time:x.time,event:i<3?'PLATFORM':'EVIDENCE',detail:x.value,reason:x.evidence==='not_evidenced'?'В текущем состоянии нет допустимого evidence.':'Явно зафиксированное текущее состояние продукта/аккаунта.',evidence:x.evidence,ref:x.evidence==='not_evidenced'?'—':'local://current-state/'+String(x.stage).toLowerCase().replace(/\s+/g,'-')};})
      };
    }
    var selector=synthetic?'<div class="case-selector">'+rows.map(function(x){return '<button data-control-case="'+h(x.id)+'" class="'+(active&&active.id===x.id?'active':'')+'"><span>'+h(x.label)+'</span><b>'+h(x.participant.role)+' × '+h(x.brand.category)+'</b></button>';}).join('')+'</div>':'';
    var streams=(INVESTOR_MODEL.revenueStreams||[]).filter(function(x){return (active.potentialRevenueStreams||[]).indexOf(x.id)>=0;});
    return '<div class="control-case">'+selector+
      '<section class="dossier-head"><div><div class="drawer-kicker">'+(synthetic?'ДЕМОНСТРАЦИОННЫЙ / СИНТЕТИЧЕСКИЙ КЕЙС':'LIVE-ДАННЫЕ · ТЕКУЩИЙ АККАУНТ')+'</div><h3>'+h(active.participant.name)+' → '+h(active.brand.name)+'</h3><p>'+h(active.participant.role)+' · '+h(active.participant.organisation)+' · '+h(active.participant.market)+'<br>'+h(active.participant.source)+'</p></div><div class="dossier-brand"><span>БРЕНД / КОНТРАГЕНТ</span><b>'+h(active.brand.name)+'</b><small>'+h(active.brand.category)+' · '+h(active.brand.origin)+'</small></div></section>'+
      '<div class="dossier-timeline">'+(active.dossier||[]).map(function(x,i){return '<article><div class="dossier-index">'+String(i+1).padStart(2,'0')+'</div><div class="dossier-main"><div><span>'+h(x.stage)+'</span><i>'+h(x.time)+' · '+h(x.event)+'</i></div><b>'+h(x.detail)+'</b><p>'+h(x.reason)+'</p><code>'+h(x.ref||'—')+'</code></div>'+evidenceBadge(x.evidence)+'</article>';}).join('')+'</div>'+
      '<section class="dossier-revenue"><div><span>ПОТЕНЦИАЛЬНО ЗАТРОНУТЫЕ REVENUE STREAMS</span><b>'+(streams.length?h(streams.map(function(x){return x.product;}).join(' · ')):'В текущем live-state revenue stream не подтверждён')+'</b></div><small>Потенциальный stream ≠ фактическая выручка. Признание выручки всё равно требует contract + billable event + payment evidence.</small></section>'+
      '<div class="proof-actions"><button data-proof-open="partner">КАБИНЕТ ПАРТНЁРА</button><button data-proof-open="brand">КАБИНЕТ БРЕНДА</button><button data-proof-open="economics">ЭКОНОМИКА</button><a href="./evidence-package.json" target="_blank" rel="noopener">EVIDENCE PACKAGE ↗</a></div>'+
    '</div>';
  }
  function pct(a,b){return b?Math.round((a/b)*100):0;}
  function portfolioCohortsFor(filters){
    filters=filters||portfolioFilters;
    var p=controlTowerModel().syntheticPortfolio||{},rows=(p.cohorts||[]).slice();
    return rows.filter(function(x){
      return (filters.period==='all'||x.period===filters.period)&&
        (filters.ecosystem==='all'||x.ecosystem===filters.ecosystem)&&
        (filters.market==='all'||x.market===filters.market)&&
        (filters.category==='all'||x.category===filters.category)&&
        (filters.buyerType==='all'||x.buyerType===filters.buyerType)&&
        (filters.evidence==='all'||x.evidence===filters.evidence)&&
        (filters.revenueSurface==='all'||x.revenueSurface===filters.revenueSurface);
    });
  }
  function portfolioCohorts(){return portfolioCohortsFor(portfolioFilters);}
  function sumField(rows,key){return rows.reduce(function(s,x){return s+Number(x[key]||0);},0);}
  function filteredPortfolioFor(filters){
    filters=filters||portfolioFilters;
    var rows=portfolioCohortsFor(filters),ret=filters.retention||'D30';
    var funnel=[
      {stage:'AUDIENCE',count:sumField(rows,'audience'),evidence:'synthetic'},
      {stage:'ENGAGEMENT',count:sumField(rows,'engagement'),evidence:'synthetic'},
      {stage:'QUALIFIED BUYER',count:sumField(rows,'qualifiedBuyer'),evidence:'synthetic'},
      {stage:'MEETING',count:sumField(rows,'meeting'),evidence:'synthetic'},
      {stage:'INTENT',count:sumField(rows,'intent'),evidence:'synthetic'},
      {stage:'DEAL',count:sumField(rows,'deal'),evidence:'synthetic'},
      {stage:'RETENTION',count:rows.reduce(function(s,x){return s+Number((x.retention||{})[ret]||0);},0),evidence:'synthetic'},
      {stage:'REVENUE EVIDENCE',count:sumField(rows,'revenueEvidence'),evidence:'synthetic'}
    ];
    var ecosystems=['mfw','bfs','made'].map(function(id){
      var sub=rows.filter(function(x){return x.ecosystem===id;});
      return {id:id,label:id==='mfw'?'MFW':id==='bfs'?'BFS':'MADE',journeys:sumField(sub,'audience'),qualifiedBuyers:sumField(sub,'qualifiedBuyer'),meetings:sumField(sub,'meeting'),intents:sumField(sub,'intent')};
    });
    var retention=['D30','D90','D365'].map(function(period){var eligible=sumField(rows,'intent');var retained=rows.reduce(function(s,x){return s+Number((x.retention||{})[period]||0);},0);return {period:period,eligible:eligible,retained:retained};});
    var revenue=(controlTowerModel().syntheticPortfolio&&controlTowerModel().syntheticPortfolio.potentialRevenueStreams||[]).map(function(x){
      var touched=rows.filter(function(r){return r.revenueSurface===x.id;}).reduce(function(s,r){return s+Number(r.audience||0);},0);
      return Object.assign({},x,{journeysTouched:touched});
    });
    return {rows:rows,population:sumField(rows,'audience'),funnel:funnel,ecosystems:ecosystems,retention:retention,revenue:revenue};
  }
  function filteredPortfolio(){return filteredPortfolioFor(portfolioFilters);}
  function ruOption(key,v){
    var maps={
      period:{all:'Все периоды'},
      ecosystem:{all:'Все',mfw:'MFW',bfs:'BRICS+ Fashion Summit',made:'Сделано в Москве'},
      market:{all:'Все рынки',CIS:'СНГ',Europe:'Европа',GCC:'GCC',Asia:'Азия'},
      category:{all:'Все категории',Contemporary:'Contemporary',Womenswear:'Женская одежда',Menswear:'Мужская одежда',Accessories:'Аксессуары',Tech:'Fashion Tech'},
      buyerType:{all:'Все',new:'Новый',returning:'Возвращающийся'},
      evidence:{all:'Все классы',verified:'Проверено',reported:'Заявлено партнёром',synthetic:'Синтетика'},
      retention:{D30:'D30',D90:'D90',D365:'D365'},
      revenueSurface:{all:'Все поверхности',brand:'Brand365 / CRM',professional:'B2B / Deal Room',partner:'Партнёр / спонсор',intelligence:'Аналитика',api:'API / Enterprise'}
    };
    return maps[key]&&maps[key][v]||String(v);
  }
  function portfolioFilterSelect(key,label,values){
    return '<label><span>'+h(label)+'</span><select data-portfolio-filter="'+h(key)+'">'+values.map(function(v){return '<option value="'+h(v)+'"'+(portfolioFilters[key]===v?' selected':'')+'>'+h(ruOption(key,v))+'</option>';}).join('')+'</select></label>';
  }
  function portfolioFilterBar(){
    var opt=(controlTowerModel().syntheticPortfolio&&controlTowerModel().syntheticPortfolio.filterOptions)||{};
    return '<div class="portfolio-filters">'+
      portfolioFilterSelect('period','Период',opt.period||['all'])+
      portfolioFilterSelect('ecosystem','Экосистема',opt.ecosystem||['all'])+
      portfolioFilterSelect('market','Рынок байера',opt.market||['all'])+
      portfolioFilterSelect('category','Категория бренда',opt.category||['all'])+
      portfolioFilterSelect('buyerType','Тип байера',opt.buyerType||['all'])+
      portfolioFilterSelect('evidence','Класс evidence',opt.evidence||['all'])+
      portfolioFilterSelect('retention','Горизонт retention',opt.retention||['D30'])+
      portfolioFilterSelect('revenueSurface','Revenue surface',opt.revenueSurface||['all'])+
      '<button data-reset-portfolio>СБРОСИТЬ</button>'+
    '</div>';
  }
  function bindPortfolioFilters(){
    [].slice.call(document.querySelectorAll('[data-portfolio-filter]')).forEach(function(s){s.onchange=function(){portfolioFilters[s.dataset.portfolioFilter]=s.value;renderInvestorProof();};});
    var reset=document.querySelector('[data-reset-portfolio]');if(reset)reset.onclick=function(){portfolioFilters={period:'all',ecosystem:'all',market:'all',category:'all',buyerType:'all',evidence:'all',retention:'D30',revenueSurface:'all'};renderInvestorProof();};
  }
  function scenarioLabel(filters){
    var parts=[];
    if(filters.ecosystem!=='all')parts.push(String(filters.ecosystem).toUpperCase());
    if(filters.market!=='all')parts.push(filters.market);
    if(filters.buyerType!=='all')parts.push(filters.buyerType==='new'?'новые':'возвращающиеся');
    if(filters.category!=='all')parts.push(filters.category);
    if(filters.period!=='all')parts.push(filters.period);
    return parts.length?parts.join(' · '):'Весь портфель';
  }
  function scenarioMetricSet(filters){
    var fp=filteredPortfolioFor(filters),f=fp.funnel||[],by={};
    f.forEach(function(x){by[x.stage]=Number(x.count||0);});
    var intentBase=by['MEETING']||0,meetingBase=by['QUALIFIED BUYER']||0,dealBase=by['INTENT']||0,revBase=by['DEAL']||0;
    return {
      label:scenarioLabel(filters),population:fp.population,
      qualifiedRate:pct(by['QUALIFIED BUYER']||0,by['AUDIENCE']||0),
      meetingRate:pct(by['MEETING']||0,meetingBase),
      intentRate:pct(by['INTENT']||0,intentBase),
      dealRate:pct(by['DEAL']||0,dealBase),
      retentionRate:pct(by['RETENTION']||0,by['INTENT']||0),
      revenueEvidenceRate:pct(by['REVENUE EVIDENCE']||0,revBase),
      intent:by['INTENT']||0,deal:by['DEAL']||0,retention:by['RETENTION']||0,revenueEvidence:by['REVENUE EVIDENCE']||0
    };
  }
  function scenarioSelect(side,key,label,values){
    var filters=side==='a'?scenarioA:scenarioB;
    return '<label><span>'+h(label)+'</span><select data-scenario-side="'+side+'" data-scenario-key="'+key+'">'+values.map(function(v){return '<option value="'+h(v)+'"'+(filters[key]===v?' selected':'')+'>'+h(ruOption(key,v))+'</option>';}).join('')+'</select></label>';
  }
  function scenarioPanel(side,title){
    var opt=(controlTowerModel().syntheticPortfolio&&controlTowerModel().syntheticPortfolio.filterOptions)||{};
    var filters=side==='a'?scenarioA:scenarioB,metrics=scenarioMetricSet(filters);
    return '<section class="scenario-panel scenario-'+side+'"><div class="scenario-title"><span>'+title+'</span><b>'+h(metrics.label)+'</b></div><div class="scenario-filters">'+
      scenarioSelect(side,'period','Период',opt.period||['all'])+
      scenarioSelect(side,'ecosystem','Экосистема',opt.ecosystem||['all'])+
      scenarioSelect(side,'market','Рынок',opt.market||['all'])+
      scenarioSelect(side,'category','Категория',opt.category||['all'])+
      scenarioSelect(side,'buyerType','Тип байера',opt.buyerType||['all'])+
      scenarioSelect(side,'evidence','Evidence',opt.evidence||['all'])+
      scenarioSelect(side,'retention','Retention',opt.retention||['D30'])+
      scenarioSelect(side,'revenueSurface','Revenue surface',opt.revenueSurface||['all'])+
      '</div><div class="scenario-kpis"><article><span>Популяция</span><b>'+h(metrics.population)+'</b></article><article><span>Qualified buyer</span><b>'+h(metrics.qualifiedRate)+'%</b></article><article><span>Встреча</span><b>'+h(metrics.meetingRate)+'%</b></article><article><span>Коммерческий интерес</span><b>'+h(metrics.intentRate)+'%</b></article><article><span>Deal-stage</span><b>'+h(metrics.dealRate)+'%</b></article><article><span>'+h(filters.retention)+'</span><b>'+h(metrics.retentionRate)+'%</b></article><article><span>Revenue evidence</span><b>'+h(metrics.revenueEvidenceRate)+'%</b></article></div></section>';
  }
  function diffPp(a,b){var d=a-b;return (d>0?'+':'')+d+' п.п.';}
  function comparisonInsight(){
    var a=scenarioMetricSet(scenarioA),b=scenarioMetricSet(scenarioB),metrics=[
      {key:'qualifiedRate',label:'конверсия в qualified buyer'},
      {key:'meetingRate',label:'конверсия qualified → meeting'},
      {key:'intentRate',label:'конверсия qualified → intent'},
      {key:'dealRate',label:'конверсия intent → deal'},
      {key:'retentionRate',label:'retention '+scenarioA.retention},
      {key:'revenueEvidenceRate',label:'deal → revenue evidence'}
    ];
    return metrics.map(function(m){
      var av=a[m.key],bv=b[m.key],winner=av===bv?'Равны':av>bv?'Сценарий A':'Сценарий B';
      return '<article><span>'+h(m.label)+'</span><b>'+h(av)+'% vs '+h(bv)+'%</b><small>'+h(winner)+' · '+h(diffPp(av,bv))+' A к B</small></article>';
    }).join('');
  }
  function rateRaw(n,d){return d?(Number(n||0)/Number(d)*100):0;}
  function metricSpecs(){
    return [
      {key:'qualifiedRate',label:'Audience → qualified buyer',num:'qualifiedBuyer',den:'audience',inspect:'Проверить discovery, capture явного интереса и критерии qualification.'},
      {key:'meetingRate',label:'Qualified buyer → meeting',num:'meeting',den:'qualifiedBuyer',inspect:'Проверить reason codes matchmaking, доступность слотов и bilateral acceptance.'},
      {key:'intentRate',label:'Meeting → intent',num:'intent',den:'meeting',inspect:'Проверить качество встречи, category fit, line sheet и delivery information.'},
      {key:'dealRate',label:'Intent → deal-stage',num:'deal',den:'intent',inspect:'Проверить Deal Room SLA, документы, MOQ, availability и скорость ответа бренда.'},
      {key:'retentionRate',label:'Intent → retention',num:'retention',den:'intent',inspect:'Проверить Brand365 opt-in, follow-up journeys и причины повторного профессионального действия.'},
      {key:'revenueEvidenceRate',label:'Deal-stage → revenue evidence',num:'revenueEvidence',den:'deal',inspect:'Проверить external outcome verification, contract/billing linkage и settlement evidence.'}
    ];
  }
  function rowValue(row,key,filters){
    if(key==='retention')return Number((row.retention||{})[(filters&&filters.retention)||'D30']||0);
    return Number(row[key]||0);
  }
  function metricRawForRows(rows,spec,filters){
    var n=rows.reduce(function(s,r){return s+rowValue(r,spec.num,filters);},0);
    var d=rows.reduce(function(s,r){return s+rowValue(r,spec.den,filters);},0);
    return {num:n,den:d,rate:rateRaw(n,d)};
  }
  function opportunityGap(){
    var rowsA=portfolioCohortsFor(scenarioA),rowsB=portfolioCohortsFor(scenarioB);
    var ranked=metricSpecs().map(function(spec){
      var a=metricRawForRows(rowsA,spec,scenarioA),b=metricRawForRows(rowsB,spec,scenarioB);
      return {spec:spec,a:a,b:b,gap:a.rate-b.rate,abs:Math.abs(a.rate-b.rate)};
    }).sort(function(x,y){return y.abs-x.abs;});
    return {ranked:ranked,target:ranked[0]||null};
  }
  function decompositionForDimension(dim,spec){
    var rowsA=portfolioCohortsFor(scenarioA),rowsB=portfolioCohortsFor(scenarioB);
    var all=(controlTowerModel().syntheticPortfolio&&controlTowerModel().syntheticPortfolio.cohorts)||[];
    var values=Array.from(new Set(all.map(function(x){return x[dim];}))).filter(Boolean);
    var totalA=metricRawForRows(rowsA,spec,scenarioA),totalB=metricRawForRows(rowsB,spec,scenarioB);
    return values.map(function(v){
      var aRows=rowsA.filter(function(x){return x[dim]===v;}),bRows=rowsB.filter(function(x){return x[dim]===v;});
      var a=metricRawForRows(aRows,spec,scenarioA),b=metricRawForRows(bRows,spec,scenarioB);
      var shareA=totalA.den?a.den/totalA.den:0,shareB=totalB.den?b.den/totalB.den:0;
      var ra=a.den?a.rate/100:0,rb=b.den?b.rate/100:0;
      var mix=(shareA-shareB)*((ra+rb)/2)*100;
      var within=((shareA+shareB)/2)*(ra-rb)*100;
      return {value:v,aRate:a.rate,bRate:b.rate,aDen:a.den,bDen:b.den,mix:mix,within:within,total:mix+within};
    }).filter(function(x){return x.aDen||x.bDen;}).sort(function(x,y){return Math.abs(y.total)-Math.abs(x.total);});
  }
  function formatOne(v){var n=Math.round(Number(v||0)*10)/10;return (n>0?'+':'')+n.toFixed(1)+' п.п.';}
  function explanationDimension(title,dim,target){
    if(!target)return '';
    var rows=decompositionForDimension(dim,target.spec),directA=scenarioA[dim],directB=scenarioB[dim];
    var axisNote=(directA!=='all'&&directB!=='all'&&directA!==directB)?'<div class="explain-axis-note">Эта размерность уже задаёт ось сравнения: A = '+h(ruOption(dim,directA))+'; B = '+h(ruOption(dim,directB))+'. Разложение ниже показывает математический вклад доступных сегментов, но не причинность.</div>':'';
    return '<section class="explain-dimension"><div class="drawer-kicker">'+h(title)+'</div>'+axisNote+
      '<div class="explain-driver-list">'+rows.map(function(x){return '<article><div><span>'+h(ruOption(dim,x.value))+'</span><b>'+Math.round(x.aRate)+'% A · '+Math.round(x.bRate)+'% B</b></div><div><small>mix '+h(formatOne(x.mix))+'</small><small>within '+h(formatOne(x.within))+'</small><em>'+h(formatOne(x.total))+'</em></div></article>';}).join('')+'</div></section>';
  }
  function retentionExplanation(){
    var rowsA=portfolioCohortsFor(scenarioA),rowsB=portfolioCohortsFor(scenarioB),periods=['D30','D90','D365'];
    var items=periods.map(function(period){
      var fa=Object.assign({},scenarioA,{retention:period}),fb=Object.assign({},scenarioB,{retention:period});
      var a=metricRawForRows(rowsA,{num:'retention',den:'intent'},fa),b=metricRawForRows(rowsB,{num:'retention',den:'intent'},fb);
      return {period:period,a:a.rate,b:b.rate,gap:a.rate-b.rate};
    });
    var top=items.slice().sort(function(x,y){return Math.abs(y.gap)-Math.abs(x.gap);})[0];
    return '<section class="explain-retention"><div class="drawer-kicker">RETENTION HORIZON</div><div class="retention-compare">'+items.map(function(x){return '<article class="'+(top&&top.period===x.period?'active':'')+'"><span>'+x.period+'</span><b>'+Math.round(x.a)+'% A · '+Math.round(x.b)+'% B</b><small>Δ '+h(formatOne(x.gap))+'</small></article>';}).join('')+'</div><div class="hub-note">Максимальный retention-gap в этом сравнении: '+h(top?top.period:'—')+'. Он рассчитан относительно intent cohort каждого сценария.</div></section>';
  }
  function caseMatchesScenario(x,filters){
    var t=x.portfolioTags||{};
    return (filters.period==='all'||t.period===filters.period)&&
      (filters.ecosystem==='all'||t.ecosystem===filters.ecosystem)&&
      (filters.market==='all'||t.market===filters.market)&&
      (filters.category==='all'||t.category===filters.category)&&
      (filters.buyerType==='all'||t.buyerType===filters.buyerType)&&
      (filters.evidence==='all'||t.evidence===filters.evidence)&&
      (filters.revenueSurface==='all'||t.revenueSurface===filters.revenueSurface);
  }
  function dossierStepForMetric(x,target,filters){
    if(!x||!target)return null;
    var wanted=target.spec.key==='qualifiedRate'?'RECOMMENDED':target.spec.key==='meetingRate'?'MEETING HELD':target.spec.key==='intentRate'?'INTENT':target.spec.key==='dealRate'?'DEAL ROOM':target.spec.key==='retentionRate'?((filters.retention||'D30').replace('D','')+' DAYS'):'HANDOFF';
    return (x.dossier||[]).filter(function(d){return d.stage===wanted;})[0]||(x.dossier||[])[x.dossier.length-1]||null;
  }
  function representativeExplanation(target){
    var cases=controlTowerModel().cases||[];
    function side(label,filters){
      var rows=cases.filter(function(x){return caseMatchesScenario(x,filters);}).slice(0,2);
      return '<div class="explain-dossiers-side"><div class="drawer-kicker">'+label+'</div>'+(rows.length?rows.map(function(x){var step=dossierStepForMetric(x,target,filters);return '<article><div><span>'+h(x.label)+'</span><b>'+h(x.participant.name)+' → '+h(x.brand.name)+'</b><small>'+h(step&&step.detail||'Representative journey')+'</small><code>'+h(step&&step.ref||'—')+'</code></div><button data-explanation-dossier="'+h(x.id)+'">ОТКРЫТЬ ДОСЬЕ →</button></article>';}).join(''):'<div class="explain-empty">Для этого synthetic slice нет материализованного representative dossier. Агрегат не превращается в выдуманные row-level кейсы.</div>')+'</div>';
    }
    return '<section class="explain-dossiers"><div class="drawer-kicker">REPRESENTATIVE EVIDENCE</div><div class="explain-dossiers-grid">'+side('СЦЕНАРИЙ A',scenarioA)+side('СЦЕНАРИЙ B',scenarioB)+'</div></section>';
  }
  function renderOpportunityExplanation(){
    var gap=opportunityGap(),target=gap.target;if(!target)return '';
    var leader=target.gap===0?'Разрыва нет':target.gap>0?'Сценарий A':'Сценарий B';
    return '<section class="opportunity-explanation">'+
      '<div class="opportunity-head"><div><div class="drawer-kicker">OPPORTUNITY EXPLANATION · МАТЕМАТИЧЕСКОЕ РАЗЛОЖЕНИЕ</div><h4>'+h(leader)+' · крупнейший gap: '+h(target.spec.label)+'</h4><p>A '+Math.round(target.a.rate)+'% · B '+Math.round(target.b.rate)+'% · Δ '+h(formatOne(target.gap))+'. Ниже показано, из каких наблюдаемых компонентов synthetic cohort cube складывается разница.</p></div><div class="opportunity-action"><span>ЧТО ПРОВЕРИТЬ</span><b>'+h(target.spec.inspect)+'</b></div></div>'+
      '<div class="gap-waterfall">'+gap.ranked.map(function(x){return '<article><span>'+h(x.spec.label)+'</span><b>'+Math.round(x.a.rate)+'% / '+Math.round(x.b.rate)+'%</b><small>'+h(formatOne(x.gap))+'</small><i style="width:'+Math.min(100,Math.round(x.abs))+'%"></i></article>';}).join('')+'</div>'+
      '<div class="explain-dim-grid">'+explanationDimension('ВКЛАД КАТЕГОРИЙ','category',target)+explanationDimension('ВКЛАД РЫНКОВ','market',target)+'</div>'+
      retentionExplanation()+representativeExplanation(target)+
      '<div class="explain-method"><b>Метод</b><span>Для категорий и рынков общий rate-gap раскладывается симметрично на composition/mix effect и within-segment rate effect. Их сумма воспроизводит разницу A−B с округлением. Это бухгалтерское математическое разложение, а не causal attribution.</span></div>'+
    '</section>';
  }
  function interventionForMetric(key){
    return (INVESTOR_MODEL.interventionCatalog||[]).filter(function(x){return x.metric===key;})[0]||null;
  }
  function strongestDriver(target){
    if(!target)return {label:'Весь выбранный cohort',detail:'Нет доступного segment decomposition'};
    var dims=[
      {name:'category',label:'Категория',rows:decompositionForDimension('category',target.spec)},
      {name:'market',label:'Рынок',rows:decompositionForDimension('market',target.spec)}
    ];
    var candidates=[];
    dims.forEach(function(d){(d.rows||[]).slice(0,2).forEach(function(x){candidates.push({dimension:d.name,dimensionLabel:d.label,value:x.value,total:x.total,abs:Math.abs(x.total),aRate:x.aRate,bRate:x.bRate});});});
    candidates.sort(function(a,b){return b.abs-a.abs;});
    var top=candidates[0];
    return top?{label:top.dimensionLabel+': '+ruOption(top.dimension,top.value),detail:Math.round(top.aRate)+'% A · '+Math.round(top.bRate)+'% B · вклад '+formatOne(top.total)}:{label:'Весь выбранный cohort',detail:'Нет segment decomposition'};
  }
  function recommendationSet(){
    var gap=opportunityGap(),ranked=gap.ranked||[];
    var rows=ranked.map(function(x){
      var intervention=interventionForMetric(x.spec.key);if(!intervention)return null;
      var weak=x.gap===0?'A/B':x.gap>0?'B':'A';
      var weakFilters=weak==='B'?scenarioB:scenarioA;
      var weakMetric=weak==='B'?x.b:x.a;
      var denominator=Math.max(Number(x.a.den||0),Number(x.b.den||0));
      var population=Math.max(1,scenarioMetricSet(scenarioA).population,scenarioMetricSet(scenarioB).population);
      var scale=Math.sqrt(denominator/population);
      var raw=x.abs*scale*Number(intervention.leverage||1)/Math.max(1,Number(intervention.effort||1));
      var driver=strongestDriver(x);
      var current=weakMetric.rate;
      var modelledLift=Math.min(5,Math.max(1,Math.round((x.abs/2)*10)/10));
      var pilotTarget=Math.min(100,current+modelledLift);
      return {gap:x,intervention:intervention,weak:weak,weakFilters:weakFilters,denominator:denominator,raw:raw,driver:driver,current:current,modelledLift:modelledLift,pilotTarget:pilotTarget};
    }).filter(Boolean).sort(function(a,b){return b.raw-a.raw;}).slice(0,3);
    var total=rows.reduce(function(s,x){return s+x.raw;},0);
    var allocated=0;
    rows.forEach(function(x,i){
      var points=i===rows.length-1?100-allocated:Math.round((total?x.raw/total:1/Math.max(1,rows.length))*100);
      x.points=Math.max(0,points);allocated+=x.points;
    });
    return rows;
  }
  function recommendationDossiers(rec){
    var cases=controlTowerModel().cases||[],filters=rec.weakFilters||scenarioA;
    var matched=cases.filter(function(x){return caseMatchesScenario(x,filters);}).slice(0,2);
    return matched.length?matched.map(function(x){var step=dossierStepForMetric(x,rec.gap,filters);return '<button data-capital-dossier="'+h(x.id)+'"><span>'+h(x.participant.name)+' → '+h(x.brand.name)+'</span><small>'+h(step&&step.ref||'—')+'</small></button>';}).join(''):'<div class="allocation-no-dossier">Нет materialised dossier для этого slice; recommendation остаётся aggregate/modelled.</div>';
  }
  function renderCapitalAllocation(){
    var recs=recommendationSet();
    return '<section class="capital-allocation">'+
      '<div class="allocation-head"><div><div class="drawer-kicker">RECOMMENDATION / CAPITAL ALLOCATION · MODELLED</div><h4>Куда направить следующий pilot-budget.</h4><p>Топ‑3 действий ранжируются по observed synthetic gap, масштабу denominator cohort и заранее объявленным leverage/effort assumptions.</p></div><div class="allocation-budget"><span>MODELLED PILOT BUDGET</span><b>100</b><small>условных points · не ₽</small></div></div>'+
      '<div class="allocation-cards">'+recs.map(function(r,i){
        var it=r.intervention;
        return '<article class="allocation-card"><div class="allocation-rank"><span>#0'+(i+1)+'</span><b>'+h(r.points)+' pts</b></div>'+
          '<div class="allocation-bar"><i style="width:'+h(r.points)+'%"></i></div>'+
          '<div class="allocation-stage">'+h(it.stage)+'</div><h5>'+h(it.action)+'</h5>'+
          '<p>'+h(it.hypothesis)+'</p>'+
          '<div class="allocation-meta"><div><span>ЦЕЛЕВОЙ СЦЕНАРИЙ</span><b>'+h(r.weak==='A'?'A':r.weak==='B'?'B':'A/B')+'</b></div><div><span>СЕГМЕНТ-ДРАЙВЕР</span><b>'+h(r.driver.label)+'</b><small>'+h(r.driver.detail)+'</small></div><div><span>KPI</span><b>'+h(it.kpi)+'</b></div><div><span>PILOT TARGET · MODELLED</span><b>'+Math.round(r.current*10)/10+'% → '+Math.round(r.pilotTarget*10)/10+'%</b><small>assumption: закрыть до '+h(r.modelledLift)+' п.п. gap, максимум +5 п.п.</small></div></div>'+
          '<div class="allocation-evidence"><span>EVIDENCE GATE</span>'+it.evidenceNeeded.map(function(x){return '<i>✓ '+h(x)+'</i>';}).join('')+'</div>'+
          '<div class="allocation-footer"><div><span>OWNER</span><b>'+h(it.owner)+'</b></div><div><span>PILOT</span><b>'+h(it.pilot)+'</b></div></div>'+
          '<div class="allocation-dossiers"><span>REPRESENTATIVE EVIDENCE</span>'+recommendationDossiers(r)+'</div><button class="allocation-open-case" data-open-committee="'+h(it.id)+'">ОТКРЫТЬ MINI BUSINESS CASE →</button>'+
        '</article>';
      }).join('')+'</div>'+
      '<div class="allocation-method"><b>Priority score</b><span>|gap, п.п.| × √(затронутый denominator / max population) × leverage ÷ effort. Затем scores нормализуются до 100 pilot-budget points. Leverage/effort — явные model assumptions из intervention catalog, не финансовая оценка.</span></div>'+
      '<div class="allocation-governance"><div><b>1 · PILOT</b><span>Запустить ограниченную интервенцию с заранее зафиксированным cohort.</span></div><div><b>2 · MEASURE</b><span>Собрать указанный evidence gate и KPI.</span></div><div><b>3 · VERIFY</b><span>Сравнить с baseline/holdout и проверить качество evidence.</span></div><div><b>4 · SCALE / STOP</b><span>Масштабировать только после подтверждения; иначе остановить или переработать.</span></div></div>'+
      '<div class="hub-note">100 points — только относительное распределение внимания/экспериментального ресурса внутри demo. Реальный бюджет требует стоимости интервенций, capacity, контрактов, risk limits и утверждения investment committee.</div>'+
    '</section>';
  }
  function renderComparisonMode(){
    return '<div class="comparison-warning"><b>СРАВНЕНИЕ СИНТЕТИЧЕСКИХ СЦЕНАРИЕВ</b><span>Сравнение показывает различия в cohort cube. Оно не доказывает причинность и не является production KPI.</span></div>'+
      '<div class="comparison-presets"><button data-comparison-preset="mfw-bfs">MFW vs BFS</button><button data-comparison-preset="cis-gcc">СНГ vs GCC</button><button data-comparison-preset="new-returning">Новые vs возвращающиеся</button><button data-comparison-reset>СБРОСИТЬ</button></div>'+
      '<div class="scenario-grid">'+scenarioPanel('a','СЦЕНАРИЙ A')+scenarioPanel('b','СЦЕНАРИЙ B')+'</div>'+
      '<section class="comparison-result"><div class="drawer-kicker">СРАВНЕНИЕ КЛЮЧЕВЫХ КОНВЕРСИЙ</div><div class="comparison-metrics">'+comparisonInsight()+'</div>'+
      '<div class="hub-note">«Сильнее» здесь означает более высокий рассчитанный показатель внутри выбранного synthetic slice. Это не причинный вывод о том, почему один рынок или event лучше другого.</div></section>'+renderOpportunityExplanation()+renderCapitalAllocation();
  }
  function bindComparison(){
    [].slice.call(document.querySelectorAll('[data-scenario-side]')).forEach(function(s){s.onchange=function(){var target=s.dataset.scenarioSide==='a'?scenarioA:scenarioB;target[s.dataset.scenarioKey]=s.value;renderInvestorProof();};});
    [].slice.call(document.querySelectorAll('[data-comparison-preset]')).forEach(function(b){b.onclick=function(){
      var base={period:'all',ecosystem:'all',market:'all',category:'all',buyerType:'all',evidence:'all',retention:'D30',revenueSurface:'all'};
      scenarioA=Object.assign({},base);scenarioB=Object.assign({},base);
      if(b.dataset.comparisonPreset==='mfw-bfs'){scenarioA.ecosystem='mfw';scenarioB.ecosystem='bfs';}
      if(b.dataset.comparisonPreset==='cis-gcc'){scenarioA.market='CIS';scenarioB.market='GCC';}
      if(b.dataset.comparisonPreset==='new-returning'){scenarioA.buyerType='new';scenarioB.buyerType='returning';}
      renderInvestorProof();
    };});
    var reset=document.querySelector('[data-comparison-reset]');if(reset)reset.onclick=function(){scenarioA={period:'all',ecosystem:'mfw',market:'all',category:'all',buyerType:'all',evidence:'all',retention:'D30',revenueSurface:'all'};scenarioB={period:'all',ecosystem:'bfs',market:'all',category:'all',buyerType:'all',evidence:'all',retention:'D30',revenueSurface:'all'};renderInvestorProof();};
    [].slice.call(document.querySelectorAll('[data-explanation-dossier]')).forEach(function(b){b.onclick=function(){selectedControlCase=b.dataset.explanationDossier;controlTowerView='case';proofMode='synthetic';renderInvestorProof();};});
    [].slice.call(document.querySelectorAll('[data-capital-dossier]')).forEach(function(b){b.onclick=function(){selectedControlCase=b.dataset.capitalDossier;controlTowerView='case';proofMode='synthetic';renderInvestorProof();};});
    [].slice.call(document.querySelectorAll('[data-open-committee]')).forEach(function(b){b.onclick=function(){committeeSelectedId=b.dataset.openCommittee;hubTab='committee';renderHub();};});
  }
  function portfolioStageData(stage){
    var fp=filteredPortfolio(),row=(fp.funnel||[]).filter(function(x){return x.stage===stage;})[0];
    if(!row)return null;
    var rows=fp.rows||[],breakdown={mfw:0,bfs:0,made:0};
    rows.forEach(function(x){
      var value=stage==='AUDIENCE'?x.audience:stage==='ENGAGEMENT'?x.engagement:stage==='QUALIFIED BUYER'?x.qualifiedBuyer:stage==='MEETING'?x.meeting:stage==='INTENT'?x.intent:stage==='DEAL'?x.deal:stage==='RETENTION'?((x.retention||{})[portfolioFilters.retention]||0):x.revenueEvidence;
      breakdown[x.ecosystem]=(breakdown[x.ecosystem]||0)+Number(value||0);
    });
    var cases=(controlTowerModel().cases||[]).filter(function(x){
      var t=x.portfolioTags||{};
      return (portfolioFilters.ecosystem==='all'||t.ecosystem===portfolioFilters.ecosystem)&&
        (portfolioFilters.market==='all'||t.market===portfolioFilters.market)&&
        (portfolioFilters.category==='all'||t.category===portfolioFilters.category)&&
        (portfolioFilters.buyerType==='all'||t.buyerType===portfolioFilters.buyerType)&&
        (portfolioFilters.evidence==='all'||t.evidence===portfolioFilters.evidence)&&
        (portfolioFilters.revenueSurface==='all'||t.revenueSurface===portfolioFilters.revenueSurface)&&
        (portfolioFilters.period==='all'||t.period===portfolioFilters.period);
    }).map(function(x){return x.id;});
    return {total:row.count,breakdown:breakdown,representativeCases:cases};
  }
  function renderPortfolioDrilldown(stage){
    var p=controlTowerModel().syntheticPortfolio||{},funnel=p.funnel||[],row=portfolioStageData(stage),cases=controlTowerModel().cases||[];
    if(!row)return '';
    var idx=funnel.findIndex(function(x){return x.stage===stage;}),prev=idx>0?funnel[idx-1]:null;
    var selectedCases=(row.representativeCases||[]).map(function(id){return cases.filter(function(x){return x.id===id;})[0];}).filter(Boolean);
    var b=row.breakdown||{};
    return '<section class="portfolio-drilldown">'+
      '<div class="portfolio-drill-head"><div><div class="drawer-kicker">DRILL-DOWN COHORT · СИНТЕТИКА</div><h4>'+h(stage)+' = '+h(row.total)+'</h4><p>'+(prev?('Конверсия из '+h(prev.stage)+': '+pct(Number(row.total||0),Number(prev.count||0))+'%'):'Базовый cohort портфеля')+'. Показан агрегат; representative dossiers ниже — примеры, а не полный row-level export.</p></div><button data-close-drill>×</button></div>'+
      '<div class="cohort-breakdown"><article><span>MFW</span><b>'+h(b.mfw||0)+'</b><small>'+pct(Number(b.mfw||0),Number(row.total||0))+'%</small></article><article><span>BFS</span><b>'+h(b.bfs||0)+'</b><small>'+pct(Number(b.bfs||0),Number(row.total||0))+'%</small></article><article><span>MADE</span><b>'+h(b.made||0)+'</b><small>'+pct(Number(b.made||0),Number(row.total||0))+'%</small></article></div>'+
      '<div class="representative-journeys"><div class="drawer-kicker">РЕПРЕЗЕНТАТИВНЫЕ ДОСЬЕ</div>'+selectedCases.map(function(x){var step=(x.dossier||[]).filter(function(d){return d.stage===stage|| (stage==='DEAL'&&d.stage==='DEAL ROOM') || (stage==='REVENUE EVIDENCE'&&['HANDOFF','90 DAYS','365 DAYS'].indexOf(d.stage)>=0);})[0]||x.dossier[x.dossier.length-1];return '<article><div><span>'+h(x.label)+' · '+h(String(x.primaryEcosystem||'platform').toUpperCase())+'</span><b>'+h(x.participant.name)+' → '+h(x.brand.name)+'</b><small>'+h(step&&step.detail||'Representative journey')+'</small></div><div>'+evidenceBadge(step&&step.evidence||'synthetic')+'<button data-open-dossier="'+h(x.id)+'">ОТКРЫТЬ ДОСЬЕ →</button></div></article>';}).join('')+'</div>'+
      '<div class="hub-note">Число '+h(row.total)+' — агрегат synthetic-сценария. Материализованы только показанные выше representative demo journeys.</div>'+
    '</section>';
  }
  function renderPortfolioView(){
    var portfolio=controlTowerModel().syntheticPortfolio||{},fp=filteredPortfolio(),funnel=fp.funnel||[];
    var max=funnel.length?Math.max.apply(null,funnel.map(function(x){return Number(x.count||0);})):1;
    var zero=fp.population===0;
    return '<div class="portfolio-warning"><b>ДЕМОНСТРАЦИОННЫЙ / СИНТЕТИЧЕСКИЙ ПОРТФЕЛЬ</b><span>Все значения пересчитываются из детерминированного synthetic cohort cube. Это не production KPI.</span></div>'+
      portfolioFilterBar()+
      '<section class="portfolio-head"><div><div class="drawer-kicker">EVIDENCE CONTROL TOWER · ФИЛЬТРУЕМЫЙ ПОРТФЕЛЬ</div><h3>Где именно сеть создаёт наиболее сильную конверсию и сетевую ценность.</h3><p>Все фильтры одновременно пересчитывают воронку, вклад экосистем, retention и покрытие revenue surfaces.</p></div><div class="portfolio-pop"><span>ОТОБРАННАЯ ПОПУЛЯЦИЯ</span><b>'+h(fp.population)+'</b><small>синтетических journeys</small></div></section>'+
      (zero?'<div class="portfolio-empty"><b>НЕТ ПОДХОДЯЩЕГО СИНТЕТИЧЕСКОГО COHORT</b><span>Для этого набора фильтров в demo cube нет данных. Значения не подменяются ближайшим сегментом.</span></div>':'')+
      '<div class="portfolio-funnel">'+funnel.map(function(x,i){var prev=i?Number(funnel[i-1].count||0):Number(x.count||0);return '<button class="portfolio-stage '+(selectedPortfolioStage===x.stage?'active':'')+'" data-portfolio-stage="'+h(x.stage)+'"><div class="portfolio-bar"><i style="width:'+Math.max(0,Math.round(Number(x.count||0)/(max||1)*100))+'%"></i></div><span>'+h(x.stage)+'</span><b>'+h(x.count)+'</b><small>'+(i?'conversion '+pct(Number(x.count||0),prev)+'%':'base cohort')+'</small>'+evidenceBadge(x.evidence)+'</button>';}).join('')+'</div>'+
      renderPortfolioDrilldown(selectedPortfolioStage)+
      '<div class="portfolio-lower"><section><div class="drawer-kicker">ВКЛАД ЭКОСИСТЕМ</div><div class="portfolio-table">'+(fp.ecosystems||[]).map(function(x){return '<div><b>'+h(x.label)+'</b><span>'+h(x.journeys)+' journeys</span><span>'+h(x.qualifiedBuyers)+' qualified</span><span>'+h(x.meetings)+' meetings</span><span>'+h(x.intents)+' intents</span></div>';}).join('')+'</div></section>'+
      '<section><div class="drawer-kicker">RETENTION</div><div class="retention-tower">'+(fp.retention||[]).map(function(x){return '<article class="'+(portfolioFilters.retention===x.period?'active':'')+'"><span>'+h(x.period)+'</span><b>'+h(x.retained)+'</b><small>'+pct(Number(x.retained||0),Number(x.eligible||0))+'% of intent cohort</small></article>';}).join('')+'</div></section></div>'+
      '<section class="portfolio-revenue"><div class="drawer-kicker">ЗАТРОНУТЫЕ REVENUE SURFACES · НЕ ВЫРУЧКА</div><div>'+(fp.revenue||[]).map(function(x){var stream=(INVESTOR_MODEL.revenueStreams||[]).filter(function(s){return s.id===x.id;})[0]||{};return '<article class="'+(portfolioFilters.revenueSurface===x.id?'active':'')+'"><span>'+h(stream.payer||x.id)+'</span><b>'+h(stream.product||x.id)+'</b><small>'+h(x.journeysTouched)+' filtered journeys touched</small></article>';}).join('')+'</div></section>'+
      '<div class="hub-note">Фильтры работают только на детерминированном synthetic cohort cube. Для реальных portfolio KPI потребуются admitted event facts, cohort governance и контроль свежести источников.</div>';
  }
  function renderInvestorProof(){
    var synthetic=proofMode==='synthetic';
    hubContent.innerHTML=
      '<div class="control-tower-top"><div><div class="drawer-kicker">ЦЕНТР ДОКАЗАТЕЛЬСТВ · EVIDENCE CONTROL TOWER</div><h3>Каждый переход должен иметь доказательство.</h3><p>Досье отвечает на вопрос «что произошло с конкретной связкой байер × бренд». Портфель — «что происходит со всей сетью». Сравнение — «какой срез сильнее по выбранным метрикам».</p></div><div>'+controlTowerTabs()+proofModeToggle()+'</div></div>'+
      (controlTowerView==='comparison'?renderComparisonMode():(controlTowerView==='portfolio'?renderPortfolioView():renderCaseDossier()))+
      '<div class="proof-rules">'+(INVESTOR_MODEL.proofRules||[]).map(function(x){return '<span>✓ '+h(x)+'</span>';}).join('')+'</div>';
    bindControlTower();
    bindPortfolioFilters();
    bindComparison();
  }
  function renderPartnerConsole(){
    var rows=INVESTOR_MODEL.partnerConsole||[];
    hubContent.innerHTML=
      '<div class="drawer-kicker">PARTNER / SPONSOR CONSOLE · PREVIEW</div>'+
      '<div class="operating-hero"><div><h3>Package → inventory → campaign → delivery → report → settlement.</h3><p>Партнёр видит не «охваты ради охватов», а контракт, активированный инвентарь, доказательство доставки и основание для расчётов.</p></div>'+proofModeToggle()+'</div>'+
      '<div class="partner-flow">'+rows.map(function(x,i){return '<article><span>0'+(i+1)+' · '+h(x.stage)+'</span><b>'+h(x.owner)+'</b><small>'+h(x.proof)+'</small><em>'+h(x.revenueGate)+'</em></article>';}).join('')+'</div>'+
      '<section class="console-boundary"><b>REVENUE BOUNDARY</b><span>Campaign impression, scan or lead handoff is delivery evidence; recognised revenue still requires the applicable contract/billing/payment evidence.</span></section>';
    bindProofMode();
  }
  function renderBrandCockpit(){
    var funnel=INVESTOR_MODEL.brandFunnel||[],chain=proofChain();
    var stageMap={};chain.forEach(function(x){stageMap[x.stage]=x;});
    hubContent.innerHTML=
      '<div class="drawer-kicker">BRAND BUSINESS COCKPIT · MVP PREVIEW</div>'+
      '<div class="operating-hero"><div><h3>Не «сколько лайков», а где именно бренд теряет buyer intent.</h3><p>Audience, professional signals, meeting, Deal Room и 365-day continuity собраны в одну управляемую воронку.</p></div>'+proofModeToggle()+'</div>'+
      '<div class="brand-funnel">'+funnel.map(function(x){var live=stageMap[x.stage]||null;return '<article><span>'+h(x.stage)+'</span><b>'+h(x.proof)+'</b>'+(live?evidenceBadge(live.evidence):evidenceBadge(proofMode==='synthetic'?'synthetic':'not_evidenced'))+'</article>';}).join('')+'</div>'+
      '<div class="continuity-grid"><article><span>D30</span><b>Relationship retained</b><small>Verified follow / campaign / reward / return evidence.</small></article><article><span>D90</span><b>Professional continuation</b><small>Follow-up, repeat meeting or brand action.</small></article><article><span>D365</span><b>Network compounding</b><small>Cross-event return and accumulated trust history.</small></article></div>'+
      '<div class="hub-note">В production бренд видит только свою first-party аудиторию и privacy-safe benchmark; competitor-level private data не раскрывается.</div>';
    bindProofMode();
  }
  function renderEconomics(){
    var streams=INVESTOR_MODEL.revenueStreams||[];
    hubContent.innerHTML=
      '<div class="drawer-kicker">INVESTMENT / ЭКОНОМИКА DASHBOARD · MODEL CONTRACT</div>'+
      '<div class="economics-hero"><h3>Кто платит → за какой продукт → по какой формуле → когда это становится выручкой.</h3><p>До появления договоров и платежных данных здесь нет фактических ARR/MRR. Формулы показывают экономическую архитектуру, а не результат.</p></div>'+
      '<div class="economics-table"><div class="economics-row head"><b>PAYER</b><b>PRODUCT</b><b>FORMULA</b><b>REVENUE GATE</b></div>'+
      streams.map(function(x){return '<div class="economics-row"><span>'+h(x.payer)+'</span><span>'+h(x.product)+'</span><code>'+h(x.formula)+'</code><em>'+h(x.recognition)+'</em></div>';}).join('')+'</div>'+
      '<div class="economics-proof-grid"><article><b>OBSERVED</b><span>Product actions and delivery events.</span></article><article><b>REPORTED</b><span>Partner-declared outcomes.</span></article><article><b>VERIFIED</b><span>Admitted external confirmation.</span></article><article><b>MODELLED</b><span>Scenario economics with explicit assumptions.</span></article></div>'+
      '<div class="hub-note">Unit economics, CAC, ROI, GMV, ARR and MRR are only factual when their source dataset and calculation period are available. Demo placeholders are intentionally absent.</div>';
  }

  function committeePolicy(){return INVESTOR_MODEL.investmentCommittee||{};}
  function recommendationByIntervention(id){
    return recommendationSet().filter(function(x){return x.intervention&&x.intervention.id===id;})[0]||null;
  }
  function ensureCommitteeCase(rec){
    if(!rec)return null;
    var id=rec.intervention.id;
    if(!committeeCases[id]){
      committeeCases[id]={
        status:'DRAFT',
        approval:'PENDING',
        pilotStatus:'NOT_STARTED',
        measured:null,
        evidenceCollected:0,
        decision:null,
        history:[{state:'DRAFT',label:'Business case создан в demo session'}]
      };
    }
    return committeeCases[id];
  }
  function measuredOutcome(rec){
    var factor=Number((committeePolicy().resultProfiles||{})[rec.intervention.id]);
    if(!Number.isFinite(factor))factor=.75;
    var lift=Number(rec.modelledLift||0)*factor;
    return Math.max(0,Math.min(100,Number(rec.current||0)+lift));
  }
  function committeeEvidenceState(rec,state){
    var total=(rec.intervention.evidenceNeeded||[]).length;
    if(state.measured===null)return {complete:0,total:total,ratio:0};
    var factor=Number((committeePolicy().resultProfiles||{})[rec.intervention.id]);
    var complete=factor>=1?total:factor>=.5?Math.max(0,total-1):Math.max(1,total-2);
    return {complete:complete,total:total,ratio:total?complete/total:0};
  }
  function committeeDecision(rec,state){
    var ev=committeeEvidenceState(rec,state);
    if(state.measured===null)return null;
    if(state.measured>=rec.pilotTarget&&ev.complete===ev.total)return 'SCALE';
    if(state.measured>rec.current&&ev.ratio>=.6)return 'ITERATE';
    return 'STOP';
  }
  function committeeAction(id,action){
    var rec=recommendationByIntervention(id);if(!rec)return;
    var state=ensureCommitteeCase(rec);if(!state)return;
    if(action==='submit'&&state.status==='DRAFT'){state.status='IN_REVIEW';state.history.push({state:'IN_REVIEW',label:'Отправлено на рассмотрение'});}
    else if(action==='approve'&&state.status==='IN_REVIEW'){state.status='APPROVED';state.approval='APPROVED_DEMO';state.history.push({state:'APPROVED',label:'Одобрено в demo workspace'});}
    else if(action==='start'&&state.status==='APPROVED'){state.status='PILOT_RUNNING';state.pilotStatus='RUNNING';state.history.push({state:'PILOT_RUNNING',label:'Пилот запущен'});}
    else if(action==='measure'&&state.status==='PILOT_RUNNING'){
      state.status='MEASURED';state.pilotStatus='MEASURED';state.measured=measuredOutcome(rec);
      var ev=committeeEvidenceState(rec,state);state.evidenceCollected=ev.complete;
      state.history.push({state:'MEASURED',label:'Результат измерен: '+Math.round(state.measured*10)/10+'%'});
    } else if(action==='decide'&&state.status==='MEASURED'){
      state.status='DECIDED';state.decision=committeeDecision(rec,state);
      state.history.push({state:'DECIDED',label:'Решение: '+state.decision});
    } else if(action==='reset'){
      delete committeeCases[id];
    }
    committeeSelectedId=id;renderInvestmentCommittee();
  }
  function committeeStatusLabel(v){
    return {DRAFT:'ЧЕРНОВИК',IN_REVIEW:'НА РАССМОТРЕНИИ',APPROVED:'ОДОБРЕНО · DEMO',PILOT_RUNNING:'ПИЛОТ ИДЁТ',MEASURED:'ИЗМЕРЕНО',DECIDED:'РЕШЕНИЕ ПРИНЯТО'}[v]||v;
  }
  function committeeActionButton(rec,state){
    if(state.status==='DRAFT')return '<button data-committee-action="submit" data-committee-id="'+h(rec.intervention.id)+'">ОТПРАВИТЬ НА REVIEW →</button>';
    if(state.status==='IN_REVIEW')return '<button data-committee-action="approve" data-committee-id="'+h(rec.intervention.id)+'">ОДОБРИТЬ DEMO PILOT →</button>';
    if(state.status==='APPROVED')return '<button data-committee-action="start" data-committee-id="'+h(rec.intervention.id)+'">ЗАПУСТИТЬ PILOT →</button>';
    if(state.status==='PILOT_RUNNING')return '<button data-committee-action="measure" data-committee-id="'+h(rec.intervention.id)+'">ЗАФИКСИРОВАТЬ РЕЗУЛЬТАТ →</button>';
    if(state.status==='MEASURED')return '<button data-committee-action="decide" data-committee-id="'+h(rec.intervention.id)+'">ПРИНЯТЬ SCALE / ITERATE / STOP →</button>';
    return '<button data-committee-action="reset" data-committee-id="'+h(rec.intervention.id)+'">СБРОСИТЬ DEMO CASE</button>';
  }
  function renderInvestmentCommittee(){
    var recs=recommendationSet();
    if(!committeeSelectedId&&recs[0])committeeSelectedId=recs[0].intervention.id;
    var rec=recommendationByIntervention(committeeSelectedId)||recs[0];
    if(!rec){hubContent.innerHTML='<div class="portfolio-empty"><b>НЕТ ДОСТУПНОЙ РЕКОМЕНДАЦИИ</b><span>Сначала сформируйте Comparison / Scenario Mode.</span></div>';return;}
    committeeSelectedId=rec.intervention.id;
    var state=ensureCommitteeCase(rec),ev=committeeEvidenceState(rec,state),decision=state.decision||committeeDecision(rec,state),policy=committeePolicy();
    var measured=state.measured===null?'—':(Math.round(state.measured*10)/10+'%');
    var proposalHtml='';
    if(programmeScenarioProposal){
      var ps=programmeScenarioProposal,sc=ps.scenario||{};
      proposalHtml='<section class="committee-portfolio-proposal"><div><div class="drawer-kicker">PORTFOLIO ALLOCATION PROPOSAL · DEMO</div><h4>'+h(scenarioLabelMix(sc))+'</h4><p>Budget '+h(ps.budget)+' pts · score '+h(sc.score)+' · risk relief '+Math.round(Number(sc.riskRelief||0)*10)/10+' pts · KPI +'+Math.round(Number(sc.kpi||0)*10)/10+' п.п.</p></div><div class="proposal-status"><span>STATUS</span><b>'+h(ps.status)+'</b><small>не approval authority</small></div><div class="proposal-actions">'+(ps.status==='DRAFT'?'<button data-portfolio-proposal-action="submit">ОТПРАВИТЬ НА REVIEW →</button>':ps.status==='IN_REVIEW'?'<button data-portfolio-proposal-action="approve">ОДОБРИТЬ DEMO ALLOCATION →</button>':'<span>Portfolio proposal сохранён только в demo session.</span>')+'<button class="secondary" data-portfolio-proposal-action="reset">СБРОСИТЬ</button></div></section>';
    }
    hubContent.innerHTML=proposalHtml+
      '<div class="committee-warning"><b>ИНВЕСТИЦИОННЫЙ КОМИТЕТ · DEMO / SYNTHETIC WORKSPACE</b><span>Все approvals, pilot status и measured results ниже существуют только в текущей demo-сессии и не являются реальными корпоративными решениями.</span></div>'+
      '<div class="committee-recommendations">'+recs.map(function(x){return '<button data-committee-select="'+h(x.intervention.id)+'" class="'+(x.intervention.id===committeeSelectedId?'active':'')+'"><span>'+h(x.points)+' pts</span><b>'+h(x.intervention.action)+'</b><small>'+h(x.intervention.stage)+'</small></button>';}).join('')+'</div>'+
      '<section class="committee-case-head"><div><div class="drawer-kicker">MINI BUSINESS CASE</div><h3>'+h(rec.intervention.action)+'</h3><p>'+h(rec.intervention.hypothesis)+'</p></div><div class="committee-status"><span>STATUS</span><b>'+h(committeeStatusLabel(state.status))+'</b><small>'+h(rec.points)+' modelled budget points</small></div></section>'+
      '<div class="committee-case-grid">'+
        '<article><span>OWNER</span><b>'+h(rec.intervention.owner)+'</b></article>'+
        '<article><span>BUDGET REQUEST</span><b>'+h(rec.points)+' pilot points</b><small>не ₽ · относительный demo allocation</small></article>'+
        '<article><span>BASELINE KPI</span><b>'+Math.round(rec.current*10)/10+'%</b><small>'+h(rec.intervention.kpi)+'</small></article>'+
        '<article><span>MODELLED TARGET</span><b>'+Math.round(rec.pilotTarget*10)/10+'%</b><small>assumption, не обещание результата</small></article>'+
        '<article><span>MEASURED RESULT</span><b>'+h(measured)+'</b><small>'+(state.measured===null?'ещё не измерено':'synthetic pilot result')+'</small></article>'+
        '<article><span>DECISION</span><b>'+h(decision||'PENDING')+'</b><small>'+(decision?h((policy.governance||{})[String(decision).toLowerCase()]||''):'решение ещё не принято')+'</small></article>'+
      '</div>'+
      '<section class="committee-evidence-plan"><div><div class="drawer-kicker">EVIDENCE PLAN</div><h4>'+h(ev.complete)+' / '+h(ev.total)+' собрано</h4></div><div>'+rec.intervention.evidenceNeeded.map(function(x,i){return '<span class="'+(i<ev.complete?'done':'pending')+'">'+(i<ev.complete?'✓':'○')+' '+h(x)+'</span>';}).join('')+'</div></section>'+
      '<section class="committee-pilot"><div><span>PILOT DESIGN</span><b>'+h(rec.intervention.pilot)+'</b></div><div><span>STOP / SCALE LOGIC</span><b>'+h((policy.governance||{}).scale||'')+'</b><small>'+h((policy.governance||{}).iterate||'')+' '+h((policy.governance||{}).stop||'')+'</small></div></section>'+
      '<div class="committee-state-flow">'+(policy.states||[]).map(function(x){var active=x===state.status;return '<span class="'+(active?'active':'')+'">'+h(committeeStatusLabel(x))+'</span>';}).join('<i>→</i>')+'</div>'+
      '<div class="committee-actions">'+committeeActionButton(rec,state)+'<button class="secondary" data-committee-action="reset" data-committee-id="'+h(rec.intervention.id)+'">RESET DEMO</button></div>'+
      '<section class="committee-history"><div class="drawer-kicker">DECISION LOG · CURRENT SESSION</div>'+state.history.map(function(x){return '<div><b>'+h(committeeStatusLabel(x.state))+'</b><span>'+h(x.label)+'</span></div>';}).join('')+'</section>'+
      '<div class="hub-note">Workspace демонстрирует governance contract. Реальный approval должен жить в серверной authority с actor identity, timestamps, immutable decision/evidence history и role-based permissions.</div>';
    [].slice.call(document.querySelectorAll('[data-portfolio-proposal-action]')).forEach(function(b){b.onclick=function(){
      if(!programmeScenarioProposal)return;
      var a=b.dataset.portfolioProposalAction;
      if(a==='submit'&&programmeScenarioProposal.status==='DRAFT'){programmeScenarioProposal.status='IN_REVIEW';programmeScenarioProposal.history.push({state:'IN_REVIEW',label:'Portfolio allocation отправлен на review'});}
      else if(a==='approve'&&programmeScenarioProposal.status==='IN_REVIEW'){programmeScenarioProposal.status='APPROVED_DEMO';programmeScenarioProposal.history.push({state:'APPROVED_DEMO',label:'Portfolio allocation одобрен только в demo workspace'});}
      else if(a==='reset'){programmeScenarioProposal=null;}
      renderInvestmentCommittee();
    };});
    [].slice.call(document.querySelectorAll('[data-committee-select]')).forEach(function(b){b.onclick=function(){committeeSelectedId=b.dataset.committeeSelect;renderInvestmentCommittee();};});
    [].slice.call(document.querySelectorAll('[data-committee-action]')).forEach(function(b){b.onclick=function(){committeeAction(b.dataset.committeeId,b.dataset.committeeAction);};});
  }

  function programmeCapitalModel(){return INVESTOR_MODEL.programmeCapital||{};}
  function programmeRows(){
    var model=programmeCapitalModel(),catalog=INVESTOR_MODEL.interventionCatalog||[];
    return (model.defaultExecution||[]).map(function(x){
      var it=catalog.filter(function(i){return i.id===x.intervention;})[0]||{};
      var remaining=Math.max(0,Number(x.committed||0)-Number(x.spent||0));
      var released=Number(programmeReleased[x.intervention]||0);
      var measured=x.status==='MEASURED'?Number(x.spent||0):0;
      return Object.assign({},x,{action:it.action||x.intervention,owner:it.owner||'—',remaining:remaining,released:released,measured:measured});
    });
  }
  function programmeTotals(){
    var model=programmeCapitalModel(),rows=programmeRows();
    var t={envelope:Number(model.envelopePoints||0),requested:0,approved:0,committed:0,spent:0,measured:0,scaled:0,stopped:0,released:0,blocked:0};
    rows.forEach(function(x){
      t.requested+=Number(x.requested||0);t.approved+=Number(x.approved||0);t.committed+=Number(x.committed||0);t.spent+=Number(x.spent||0);t.measured+=Number(x.measured||0);t.released+=Number(x.released||0);
      if(x.decision==='SCALE')t.scaled+=Number(x.spent||0);
      if(x.decision==='STOP')t.stopped+=Number(x.spent||0);
      if(x.status==='APPROVED'||x.status==='PILOT_RUNNING'||!x.evidenceComplete&&x.status==='MEASURED')t.blocked+=Number(x.committed||0)-Number(x.spent||0);
    });
    t.uncommitted=Math.max(0,t.envelope-t.approved);
    t.committedUnspent=Math.max(0,t.committed-t.spent-t.released);
    t.reallocationCapacity=t.uncommitted+t.released;
    return t;
  }
  function ecosystemCapital(){
    var rows=programmeRows(),ids=['mfw','bfs','made'];
    return ids.map(function(id){
      var rr=rows.filter(function(x){return x.ecosystem===id;}),sum=function(k){return rr.reduce(function(s,x){return s+Number(x[k]||0);},0);};
      return {id:id,label:id==='mfw'?'MFW':id==='bfs'?'BFS':'Сделано в Москве',requested:sum('requested'),approved:sum('approved'),committed:sum('committed'),spent:sum('spent'),measured:sum('measured')};
    });
  }
  function blockerRows(){
    var model=programmeCapitalModel(),rows=programmeRows();
    return (model.blockers||[]).map(function(b){
      var row=rows.filter(function(x){return x.intervention===b.intervention;})[0]||{};
      return Object.assign({},b,{ecosystem:row.ecosystem||'—',action:row.action||b.intervention,atRisk:Math.max(0,Number(row.committed||0)-Number(row.spent||0))});
    });
  }
  function releasableRows(){
    return programmeRows().filter(function(x){return x.decision==='STOP'&&x.remaining>0;});
  }
  function programmeRelease(id){
    var row=programmeRows().filter(function(x){return x.intervention===id;})[0];if(!row)return;
    programmeReleased[id]=Math.max(0,row.remaining);
    renderProgrammeCapital();
  }
  function optimizerPolicy(){return (programmeCapitalModel().optimizer)||{};}
  function optimizerMetricLabel(key){
    return {qualifiedRate:'Audience → Qualified Buyer',meetingRate:'Qualified Buyer → Meeting',intentRate:'Meeting → Intent',dealRate:'Intent → Deal-stage',retentionRate:'Intent → Retention',revenueEvidenceRate:'Deal-stage → Revenue Evidence'}[key]||key;
  }
  function optimizerCandidate(candidate,tranche){
    var policy=optimizerPolicy(),t=programmeTotals(),available=Math.min(Number(tranche||0),Number(candidate.absorptionCap||0),Number(t.reallocationCapacity||0));
    var readiness=Number(candidate.evidenceReadiness||0),hard=!!candidate.hardBlock;
    var gate=hard?'HOLD':readiness>=Number(policy.evidenceReadyThreshold||.8)?'READY':readiness>=Number(policy.conditionalThreshold||.6)?'CONDITIONAL':'HOLD';
    var riskRelief=Math.min(Number(candidate.riskAtRisk||0),Number(candidate.riskReliefPer10||0)*(available/10));
    var kpiLift=Math.min(Number(candidate.maxKpiLift||0),Number(candidate.kpiLiftPer10||0)*(available/10));
    var riskScore=Number(candidate.riskAtRisk||0)>0?(riskRelief/Number(candidate.riskAtRisk||1)):(candidate.mode==='SCALE'?.5:0);
    var kpiScore=Number(candidate.maxKpiLift||0)>0?(kpiLift/Number(candidate.maxKpiLift||1)):0;
    var absorption=Number(tranche||0)>0?available/Number(tranche):0;
    var w=policy.scoreWeights||{};
    var score=100*((Number(w.riskRelief||.3)*riskScore)+(Number(w.kpiLeverage||.25)*kpiScore)+(Number(w.evidenceReadiness||.3)*readiness)+(Number(w.absorption||.15)*absorption));
    if(gate==='HOLD')score=0;
    return Object.assign({},candidate,{requestedTranche:Number(tranche||0),available:available,gate:gate,riskRelief:riskRelief,kpiLift:kpiLift,absorption:absorption,score:Math.round(score*10)/10});
  }
  function optimizerRows(tranche){
    return (optimizerPolicy().candidates||[]).map(function(x){return optimizerCandidate(x,tranche);}).sort(function(a,b){return b.score-a.score;});
  }
  function optimizerRecommendation(tranche){
    var rows=optimizerRows(tranche),ready=rows.filter(function(x){return x.gate==='READY';}),conditional=rows.filter(function(x){return x.gate==='CONDITIONAL';});
    var pick=ready[0]||conditional[0]||null;
    return {rows:rows,pick:pick};
  }
  function simulatorPolicy(){return (optimizerPolicy().portfolioSimulator)||{};}
  function candidateMapForBudget(budget){
    var rows=optimizerRows(budget),map={};
    rows.forEach(function(x){map[x.ecosystem]=x;});
    return map;
  }
  function scenarioMixes(budget){
    var step=Number(simulatorPolicy().step||10),map=candidateMapForBudget(budget),out=[];
    for(var m=0;m<=budget;m+=step){
      for(var b=0;b<=budget-m;b+=step){
        for(var md=0;md<=budget-m-b;md+=step){
          var alloc={mfw:m,bfs:b,made:md};
          var reserve=Math.max(0,budget-m-b-md),eligible=true,conditional=false;
          ['mfw','bfs','made'].forEach(function(id){
            var cand=map[id];
            if(!cand){reserve+=alloc[id];alloc[id]=0;return;}
            if(cand.gate==='HOLD'&&alloc[id]>0){eligible=false;}
            if(cand.gate==='CONDITIONAL'&&alloc[id]>0){conditional=true;}
            var cap=Math.min(Number(cand.absorptionCap||0),Number(programmeTotals().reallocationCapacity||0));
            if(alloc[id]>cap){reserve+=alloc[id]-cap;alloc[id]=cap;}
          });
          if(!eligible)continue;
          var used=alloc.mfw+alloc.bfs+alloc.made;
          reserve=Math.max(reserve,budget-used);
        var riskRelief=0,kpi=0,evidenceWeighted=0,evidenceWeight=0,active=0;
        ['mfw','bfs','made'].forEach(function(id){
          var pts=alloc[id],cand=map[id];if(!cand||pts<=0)return;
          active++;
          var ratio=pts/10;
          riskRelief+=Math.min(Number(cand.riskAtRisk||0),Number(cand.riskReliefPer10||0)*ratio);
          kpi+=Math.min(Number(cand.maxKpiLift||0),Number(cand.kpiLiftPer10||0)*ratio);
          evidenceWeighted+=Number(cand.evidenceReadiness||0)*pts;
          evidenceWeight+=pts;
        });
        var evidence=evidenceWeight?evidenceWeighted/evidenceWeight:1;
        var diversification=Math.min(1,active/3);
        var optionality=budget?reserve/budget:1;
        var maxRisk=(optimizerPolicy().candidates||[]).reduce(function(s,x){return s+Number(x.riskAtRisk||0);},0)||1;
        var maxKpi=(optimizerPolicy().candidates||[]).reduce(function(s,x){return s+Number(x.maxKpiLift||0);},0)||1;
        var w=simulatorPolicy().weights||{};
        var score=100*((Number(w.riskReduction||.3)*(riskRelief/maxRisk))+(Number(w.kpiLeverage||.25)*(kpi/maxKpi))+(Number(w.evidenceConfidence||.2)*evidence)+(Number(w.diversification||.1)*diversification)+(Number(w.optionality||.15)*optionality));
          out.push({alloc:alloc,reserve:reserve,riskRelief:riskRelief,kpi:kpi,evidence:evidence,diversification:diversification,optionality:optionality,conditional:conditional,score:Math.round(score*10)/10});
        }
      }
    }
    var seen={};
    out=out.filter(function(x){var key=[x.alloc.mfw,x.alloc.bfs,x.alloc.made,x.reserve].join('|');if(seen[key])return false;seen[key]=true;return true;});
    return out.sort(function(a,b){return b.score-a.score;});
  }
  function scenarioLabelMix(x){
    var parts=[];
    if(x.alloc.mfw)parts.push(x.alloc.mfw+' MFW');
    if(x.alloc.bfs)parts.push(x.alloc.bfs+' BFS');
    if(x.alloc.made)parts.push(x.alloc.made+' MADE');
    if(x.reserve)parts.push(x.reserve+' RESERVE');
    return parts.length?parts.join(' + '):'100% RESERVE';
  }
  function renderPortfolioScenarioSimulator(){
    var policy=simulatorPolicy(),rows=scenarioMixes(programmeScenarioBudget),top=rows.slice(0,5),best=top[0]||null;
    return '<section class="portfolio-simulator">'+
      '<div class="simulator-head"><div><div class="drawer-kicker">PORTFOLIO SCENARIO SIMULATOR · MODELLED</div><h4>Как распределить '+h(programmeScenarioBudget)+' points между MFW / BFS / Made / Reserve.</h4><p>Перебираются допустимые mix-сценарии с шагом '+h(policy.step||10)+' points. HOLD-направления не получают новый capital; CONDITIONAL остаются committee-gated.</p></div><div class="simulator-best"><span>TOP SCENARIO SCORE</span><b>'+(best?h(best.score):'—')+'</b><small>/ 100 · modelled</small></div></div>'+
      '<div class="simulator-budgets">'+(policy.budgets||[10,20,30]).map(function(x){return '<button data-sim-budget="'+h(x)+'" class="'+(Number(x)===Number(programmeScenarioBudget)?'active':'')+'">'+h(x)+' POINTS</button>';}).join('')+'</div>'+
      '<div class="simulator-table"><div class="simulator-row head"><b>SCENARIO</b><b>SCORE</b><b>RISK ↓</b><b>KPI ↑</b><b>EVIDENCE</b><b>DIVERSIFICATION</b><b>OPTIONALITY</b><b>GATE</b></div>'+
      top.map(function(x,i){return '<div class="simulator-row '+(i===0?'best':'')+'"><span>#0'+(i+1)+' · '+h(scenarioLabelMix(x))+'</span><b>'+h(x.score)+'</b><b>'+Math.round(x.riskRelief*10)/10+'</b><b>+'+Math.round(x.kpi*10)/10+' п.п.</b><b>'+Math.round(x.evidence*100)+'%</b><b>'+Math.round(x.diversification*100)+'%</b><b>'+Math.round(x.optionality*100)+'%</b><em>'+(x.conditional?'CONDITIONAL':'READY')+'</em></div>';}).join('')+'</div>'+
      '<div class="simulator-recommendation"><div><span>BEST MIX</span><b>'+(best?h(scenarioLabelMix(best)):'—')+'</b><small>'+(best?('score '+h(best.score)+' · risk relief '+Math.round(best.riskRelief*10)/10+' pts · KPI +'+Math.round(best.kpi*10)/10+' п.п.'):'Нет допустимого сценария')+'</small></div><div><span>WHY</span><b>'+(best?(best.reserve>0?'Часть budget оставлена в reserve для optionality.':'Весь budget размещён в eligible направления.'):'—')+'</b><small>Сценарий ранжируется по risk reduction, KPI leverage, evidence confidence, diversification и optionality.</small></div></div>'+(best?'<button class="simulator-submit" data-sim-propose>ПЕРЕДАТЬ BEST MIX В INVESTMENT COMMITTEE →</button>':'')+
      '<div class="simulator-method"><b>Правила</b><span>'+Object.keys(policy.rules||{}).map(function(k){return h(policy.rules[k]);}).join(' · ')+'</span></div>'+
    '</section>';
  }

  function renderReallocationOptimizer(){
    var policy=optimizerPolicy(),t=programmeTotals(),result=optimizerRecommendation(programmeOptimizerTranche),pick=result.pick;
    return '<section class="reallocation-optimizer">'+
      '<div class="optimizer-head"><div><div class="drawer-kicker">CAPITAL REALLOCATION OPTIMIZER · MODELLED</div><h4>Куда направить следующие '+h(programmeOptimizerTranche)+' points.</h4><p>Сравнение учитывает capital-at-risk relief, modelled KPI leverage, evidence readiness и способность vertical принять выбранный tranche.</p></div><div class="optimizer-capacity"><span>AVAILABLE CAPACITY</span><b>'+h(t.reallocationCapacity)+'</b><small>reserve + explicit releases only</small></div></div>'+
      '<div class="optimizer-tranches">'+(policy.trancheOptions||[10,20,30]).map(function(x){return '<button data-optimizer-tranche="'+h(x)+'" class="'+(Number(x)===Number(programmeOptimizerTranche)?'active':'')+'">'+h(x)+' POINTS</button>';}).join('')+'</div>'+
      '<div class="optimizer-grid">'+result.rows.map(function(x){
        var label=x.ecosystem==='mfw'?'MFW':x.ecosystem==='bfs'?'BFS':'Сделано в Москве';
        return '<article class="optimizer-card '+String(x.gate).toLowerCase()+'"><div class="optimizer-card-head"><span>'+h(label)+' · '+h(x.mode)+'</span><b>'+h(x.gate)+'</b></div><h5>'+h(x.bottleneck)+'</h5>'+
          '<div class="optimizer-score"><span>DECISION SCORE</span><b>'+h(x.score)+'</b><small>/ 100 · modelled</small></div>'+
          '<div class="optimizer-metrics"><div><span>ABSORB</span><b>'+h(x.available)+' / '+h(x.requestedTranche)+'</b></div><div><span>AT-RISK RELIEF</span><b>'+Math.round(x.riskRelief*10)/10+' pts</b></div><div><span>KPI</span><b>'+h(optimizerMetricLabel(x.metric))+'</b></div><div><span>MODELLED KPI LIFT</span><b>+'+Math.round(x.kpiLift*10)/10+' п.п.</b></div><div><span>EVIDENCE READINESS</span><b>'+Math.round(Number(x.evidenceReadiness||0)*100)+'%</b></div></div>'+
          '<div class="optimizer-evidence"><span>ДО СЛЕДУЮЩЕГО ТРАНША</span>'+((x.evidenceBeforeNext||[]).map(function(e){return '<i>○ '+h(e)+'</i>';}).join(''))+'</div>'+
          '<div class="optimizer-gate-note">'+(x.gate==='READY'?'Можно выносить как modelled candidate на следующий committee review.':x.gate==='CONDITIONAL'?'Транш условный: сначала закрыть обозначенные evidence gaps.':'HOLD: новый tranche не рекомендован до снятия hard evidence blocker.')+'</div></article>';
      }).join('')+'</div>'+
      '<div class="optimizer-recommendation"><div><span>MODELLED RECOMMENDATION</span><b>'+(pick?(h(pick.ecosystem==='mfw'?'MFW':pick.ecosystem==='bfs'?'BFS':'Сделано в Москве')+' · '+h(pick.available)+' pts · '+h(pick.gate)):'HOLD / NO ELIGIBLE OPTION')+'</b><small>'+(pick?('score '+h(pick.score)+' · expected KPI +'+Math.round(pick.kpiLift*10)/10+' п.п. · at-risk relief '+Math.round(pick.riskRelief*10)/10+' pts'):'Нет варианта, прошедшего evidence gate.')+'</small></div><div><span>NEXT TRANCHE GATE</span><b>'+(pick?h((pick.evidenceBeforeNext||[])[0]||'Evidence review required'):'Evidence remediation required')+'</b><small>Optimizer не утверждает capital; он формирует кандидат для Investment Committee.</small></div></div>'+
      '<div class="optimizer-method"><b>Score</b><span>30% risk relief + 25% KPI leverage + 30% evidence readiness + 15% absorption. HOLD получает score 0 независимо от потенциального upside. Все эффекты — model assumptions.</span></div>'+
    '</section>';
  }

  async function hydrateCapitalAuthorityStatus(){
    var root=document.getElementById('capitalAuthorityStatus');if(!root||!capitalAuthorityEligible())return;
    try{
      var results=await Promise.all([
        authorityFetch('/v1/capital/projection?programmeKey=mfw_programme',{method:'GET'}),
        authorityFetch('/v1/capital/verify?programmeKey=mfw_programme',{method:'GET'})
      ]);
      var projection=results[0]&&results[0].data&&results[0].data.projection||{};
      var verify=results[1]&&results[1].data||{};
      root.innerHTML='<div><div class="drawer-kicker">SERVER CAPITAL AUTHORITY · LIVE PROJECTION</div><h4>POSTGRESQL AUTHORITY · '+(verify.ok?'CHAIN VERIFIED':'CHAIN VERIFICATION FAILED')+'</h4><p>'+h(results[0].data&&results[0].data.events||0)+' immutable events · requested '+h(projection.requested||0)+' · approved '+h(projection.approved||0)+' · net committed '+h(projection.netCommitted||0)+' · spent '+h(projection.spent||0)+'</p></div><div class="capital-authority-kpis"><span>'+h(verify.aggregates||0)+' aggregates</span><span>'+h(verify.events||0)+' verified events</span><span>'+(verify.ok?'INTEGRITY PASS':'INTEGRITY FAIL')+'</span></div>';
      root.classList.toggle('authority-fail',!verify.ok);
    }catch(e){
      root.innerHTML='<div><div class="drawer-kicker">SERVER CAPITAL AUTHORITY</div><h4>AUTHORITY NOT ADMITTED</h4><p>'+h(e&&e.message||'capital authority unavailable')+'</p></div><div class="capital-authority-kpis"><span>NO FALLBACK</span><span>POSTGRES REQUIRED</span></div>';
      root.classList.add('authority-fail');
    }
  }

  function renderProgrammeCapital(){
    var model=programmeCapitalModel(),rows=programmeRows(),t=programmeTotals(),eco=ecosystemCapital(),blockers=blockerRows(),releasable=releasableRows();
    var stages=[
      ['REQUESTED',t.requested],['APPROVED',t.approved],['COMMITTED',t.committed],['SPENT',t.spent],['MEASURED',t.measured],['SCALED',t.scaled],['STOPPED',t.stopped]
    ];
    hubContent.innerHTML=
      '<div class="programme-warning"><b>PROGRAMME CAPITAL CONTROL · DEMO / MODELLED</b><span>Все значения — modelled pilot points. Это не ₽, не фактические расходы и не утверждённый инвестиционный бюджет.</span></div>'+
      '<section class="programme-head"><div><div class="drawer-kicker">PORTFOLIO-LEVEL CAPITAL GOVERNANCE</div><h3>Где капитал запрошен, закреплён, потрачен, измерен — и что можно перераспределить.</h3><p>Committed-but-unspent отделён от свободного резерва. Освобождение STOP-кейса требует отдельного release decision.</p></div><div class="programme-envelope"><span>PROGRAMME ENVELOPE</span><b>'+h(t.envelope)+'</b><small>modelled points</small></div></section>'+'<section class="capital-authority-status" id="capitalAuthorityStatus"><div><div class="drawer-kicker">SERVER CAPITAL AUTHORITY</div><h4>'+(capitalAuthorityEligible()?'Проверяем authoritative ledger…':'DEMO MODE · AUTHORITY PROTECTED')+'</h4><p>'+(capitalAuthorityEligible()?'Чтение projection и hash-chain verification выполняется только для non-demo Organizer/Staff session.':'Modelled cockpit не подменяет PostgreSQL authority. Demo session не имеет доступа к /v1/capital/* endpoints.')+'</p></div><div class="capital-authority-kpis"><span>POSTGRES ONLY</span><span>APPEND ONLY</span><span>HASH CHAIN</span></div></section>'+
      '<div class="programme-stage-grid">'+stages.map(function(x){return '<article><span>'+h(x[0])+'</span><b>'+h(x[1])+'</b></article>';}).join('')+'</div>'+
      '<div class="programme-capacity-grid"><article><span>UNCOMMITTED RESERVE</span><b>'+h(t.uncommitted)+'</b><small>доступно без снятия commitment</small></article><article><span>COMMITTED · UNSPENT</span><b>'+h(t.committedUnspent)+'</b><small>не свободный капитал</small></article><article><span>EXPLICITLY RELEASED</span><b>'+h(t.released)+'</b><small>освобождено STOP/closed decision</small></article><article><span>REALLOCATION CAPACITY</span><b>'+h(t.reallocationCapacity)+'</b><small>reserve + explicit releases</small></article></div>'+
      '<section class="programme-ecosystems"><div class="drawer-kicker">MFW / BFS / MADE CAPITAL MAP</div><div>'+eco.map(function(x){return '<article><b>'+h(x.label)+'</b><span>requested '+h(x.requested)+'</span><span>approved '+h(x.approved)+'</span><span>committed '+h(x.committed)+'</span><span>spent '+h(x.spent)+'</span><span>measured '+h(x.measured)+'</span></article>';}).join('')+'</div></section>'+
      '<section class="programme-table"><div class="programme-row head"><b>PILOT</b><b>VERTICAL</b><b>REQ</b><b>APP</b><b>COM</b><b>SPENT</b><b>STATUS / DECISION</b></div>'+rows.map(function(x){return '<div class="programme-row"><span>'+h(x.action)+'</span><span>'+h(String(x.ecosystem).toUpperCase())+'</span><b>'+h(x.requested)+'</b><b>'+h(x.approved)+'</b><b>'+h(x.committed)+'</b><b>'+h(x.spent)+'</b><em>'+h(x.status)+(x.decision?' · '+h(x.decision):'')+'</em></div>';}).join('')+'</section>'+
      '<div class="programme-lower"><section class="programme-blockers"><div class="drawer-kicker">BLOCKED / AT RISK</div>'+blockers.map(function(x){return '<article><div><span>'+h(String(x.ecosystem).toUpperCase())+' · '+h(x.code)+'</span><b>'+h(x.action)+'</b><small>'+h(x.label)+'</small></div><em>'+h(x.atRisk)+' pts at risk</em></article>';}).join('')+'</section>'+
      '<section class="programme-evidence"><div class="drawer-kicker">EVIDENCE COMPLETENESS</div>'+rows.map(function(x){var done=x.evidenceComplete;return '<article><span>'+h(x.action)+'</span><b class="'+(done?'done':'pending')+'">'+(done?'COMPLETE':'INCOMPLETE')+'</b></article>';}).join('')+'</section></div>'+
      '<section class="programme-reallocation"><div><div class="drawer-kicker">REALLOCATION OPPORTUNITIES</div><h4>'+h(t.reallocationCapacity)+' points потенциальной ёмкости</h4><p>'+h(t.uncommitted)+' points — uncommitted reserve. '+h(t.released)+' points — явно released. Committed-unspent не включён.</p></div>'+
      '<div class="reallocation-actions">'+(releasable.length?releasable.map(function(x){var already=Number(programmeReleased[x.intervention]||0)>0;return '<article><span>'+h(x.action)+'</span><b>'+h(x.remaining)+' pts STOP остатка</b><button data-programme-release="'+h(x.intervention)+'" '+(already?'disabled':'')+'>'+(already?'RELEASED':'RELEASE TO POOL')+'</button></article>';}).join(''):'<div class="allocation-no-dossier">Нет STOP-кейсов с неиспользованным commitment.</div>')+'</div></section>'+
      '<section class="programme-decision"><div><span>RECOMMENDED NEXT MOVE</span><b>'+(t.reallocationCapacity>0?'Перераспределять только из доступной capacity, начиная с highest-ranked recommendation.':'Не перераспределять: свободной capacity нет.')+'</b></div><div><span>PROGRAMME SIGNAL</span><b>'+(blockers.length?'ITERATE / REVIEW':'CONTINUE')+'</b><small>'+h(blockers.length)+' blocker(s) требуют review</small></div></section>'+
      renderReallocationOptimizer()+renderPortfolioScenarioSimulator()+'<div class="programme-rules">'+Object.keys(model.rules||{}).map(function(k){return '<span>✓ '+h(model.rules[k])+'</span>';}).join('')+'</div>'+
      '<div class="hub-note">Production-версия должна считать это из immutable approvals, commitments, spend events, measurement snapshots и release decisions. Здесь показан model contract и demo state, а не бухгалтерский ledger.</div>';
    hydrateCapitalAuthorityStatus();
    [].slice.call(document.querySelectorAll('[data-programme-release]')).forEach(function(b){b.onclick=function(){programmeRelease(b.dataset.programmeRelease);};});
    [].slice.call(document.querySelectorAll('[data-optimizer-tranche]')).forEach(function(b){b.onclick=function(){programmeOptimizerTranche=Number(b.dataset.optimizerTranche||10);renderProgrammeCapital();};});
    [].slice.call(document.querySelectorAll('[data-sim-budget]')).forEach(function(b){b.onclick=function(){programmeScenarioBudget=Number(b.dataset.simBudget||30);renderProgrammeCapital();};});
    var propose=document.querySelector('[data-sim-propose]');if(propose)propose.onclick=function(){
      var top=scenarioMixes(programmeScenarioBudget)[0];if(!top)return;
      programmeScenarioProposal={budget:programmeScenarioBudget,scenario:top,status:'DRAFT',history:[{state:'DRAFT',label:'Portfolio allocation proposal создан из simulator'}]};
      hubTab='committee';renderHub();
    };
  }

  function renderTrustPassportPreview(){
    hubContent.innerHTML=
      '<div class="trust-preview-banner"><b>TRUST PASSPORT · READ-ONLY PREVIEW</b><span>Explainable trust dimensions only. No universal reputation score and no inferred private attributes.</span></div>'+
      '<section class="trust-hero"><div><div class="drawer-kicker">NETWORK TRUST PASSPORT</div><h3>Доверие как проверяемые факты, а не «магический рейтинг».</h3><p>Каждый статус связан с источником, периодом и возможностью ревокации. Новому участнику без истории показывается neutral / no-history, а не низкая оценка.</p></div><div class="trust-credential"><span>DEMO CREDENTIAL</span><b>MFW VERIFIED BUYER</b><small>issuer · scope · issued_at · review date · status</small></div></section>'+
      '<div class="trust-dimension-grid">'+
        '<article><small>IDENTITY</small><b>Verified identity</b><span>Source: registration authority</span><em>DEMO / EXPLAINABLE</em></article>'+
        '<article><small>ROLE</small><b>Buyer role</b><span>Source: event accreditation</span><em>EVENT-SCOPED</em></article>'+
        '<article><small>PARTICIPATION</small><b>Event history</b><span>MFW / BFS participation only when evidenced</span><em>HISTORICAL</em></article>'+
        '<article><small>MEETINGS</small><b>Reliability</b><span>Shown as numerator / denominator / period</span><em>NO OPAQUE SCORE</em></article>'+
        '<article><small>ORGANISATION</small><b>Verified affiliation</b><span>Organisation membership with freshness</span><em>REVOCABLE</em></article>'+
        '<article><small>COMMERCIAL</small><b>Outcome evidence</b><span>Observed / Reported / Verified remain separate</span><em>NO CREDIT INFERENCE</em></article>'+
      '</div>'+
      '<section class="trust-rules"><div><b>WHAT THIS ENABLES</b><span>Verified directory · trust-aware matchmaking · portable credential handoff</span></div><div><b>WHAT IT NEVER DOES</b><span>No wealth, creditworthiness, politics, ethnicity, hidden intent or universal reputation score.</span></div></section>'+
      '<div class="trust-flow"><span>IDENTITY / ORG</span><i>→</i><span>EVENT HISTORY</span><i>→</i><span>MEETING EVIDENCE</span><i>→</i><span>CREDENTIAL</span><i>→</i><span>VERIFIED DIRECTORY</span></div>'+
      '<div class="hub-note">Preview only: production issuer/status registry, revocation and portable credentials remain dependency-gated behind durable identity, PostgreSQL history and policy review.</div>';
  }

  function renderHub(){
    [].slice.call(document.querySelectorAll('[data-hub-tab]')).forEach(function(b){b.classList.toggle('active',b.dataset.hubTab===hubTab);});
    if(hubTab==='today')renderToday();
    else if(hubTab==='directory')renderDirectory();
    else if(hubTab==='agenda')renderAgenda();
    else if(hubTab==='wallet')renderWallet();
    else if(hubTab==='graph')renderIdentityGraph();
    else if(hubTab==='proof')renderInvestorProof();
    else if(hubTab==='partner')renderPartnerConsole();
    else if(hubTab==='brand')renderBrandCockpit();
    else if(hubTab==='dealroom')renderDealRoomPreview();
    else if(hubTab==='trust')renderTrustPassportPreview();
    else if(hubTab==='economics')renderEconomics();
    else if(hubTab==='committee')renderInvestmentCommittee();
    else if(hubTab==='capital')renderProgrammeCapital();
    else renderOwner();
  }
  function updateNetworkStatus(){
    var el=document.getElementById('networkStatus');if(!el)return;
    var online=navigator.onLine!==false;
    el.textContent=online?'ОНЛАЙН':'ОФЛАЙН · ТОЛЬКО ПУБЛИЧНЫЙ КЭШ';
    el.classList.toggle('offline',!online);
    document.body.classList.toggle('offline-mode',!online);
  }
  function registerServiceWorker(){
    if(!('serviceWorker' in navigator))return;
    window.addEventListener('load',function(){navigator.serviceWorker.register('../sw.js',{scope:'/'}).catch(function(e){console.warn('service worker registration failed',e);});});
  }
  function openDiscover(focusSearch){
    hubTab='directory';renderHub();hubModal.classList.remove('hidden');
    if(focusSearch)setTimeout(function(){var input=document.getElementById('directorySearch');if(input)input.focus();},0);
  }
  var INVESTOR_DEMO=[
    {title:'Moscow Fashion Platform',copy:'Один вход. Три разные fashion-вертикали. Один relationship graph.',action:function(){closeSharedOverlays();openEvent('mfw');}},
    {title:'01 · Moscow Fashion Week',copy:'Runway, content, brands and buyer workflow.',action:function(){closeSharedOverlays();openEvent('mfw');}},
    {title:'02 · BRICS+ Fashion Summit',copy:'Business programme, delegates, organisations and B2B.',action:function(){closeSharedOverlays();openEvent('bfs');}},
    {title:'03 · Сделано в Москве',copy:'Verified brands, showroom, Buyer Bridge and Brand365 continuity.',action:function(){closeSharedOverlays();openEvent('made');}},
    {title:'04 · One ID / separate rights',copy:'Shared identity with event-scoped registrations and separate verification boundaries.',action:function(){closeSharedOverlays();openAccount();}},
    {title:'05 · Cross-event Identity Graph',copy:'One subject connects three event contexts without collapsing their rights.',action:function(){closeSharedOverlays();hubTab='graph';renderHub();hubModal.classList.remove('hidden');}},
    {title:'06 · Investor Proof',copy:'User → signal → brand → meeting → intent → handoff → 30/90/365 evidence.',action:function(){closeSharedOverlays();hubTab='proof';renderHub();hubModal.classList.remove('hidden');}},
    {title:'07 · Partner Console',copy:'Package → inventory → delivery → reporting → settlement evidence.',action:function(){closeSharedOverlays();hubTab='partner';renderHub();hubModal.classList.remove('hidden');}},
    {title:'08 · Brand Cockpit',copy:'Audience → buyer conversion → relationship continuity.',action:function(){closeSharedOverlays();hubTab='brand';renderHub();hubModal.classList.remove('hidden');}},
    {title:'09 · Deal Room',copy:'Meeting → structured request → external handoff → outcome evidence.',action:function(){closeSharedOverlays();hubTab='dealroom';renderHub();hubModal.classList.remove('hidden');}},
    {title:'10 · Trust Passport',copy:'Explainable credentials and longitudinal trust history.',action:function(){closeSharedOverlays();hubTab='trust';renderHub();hubModal.classList.remove('hidden');}},
    {title:'11 · Economics',copy:'Payer → product → formula → revenue-recognition gate.',action:function(){closeSharedOverlays();hubTab='economics';renderHub();hubModal.classList.remove('hidden');}},
    {title:'12 · Investment Committee',copy:'Recommendation → approval → pilot → measure → scale / iterate / stop.',action:function(){closeSharedOverlays();hubTab='committee';renderHub();hubModal.classList.remove('hidden');}},
    {title:'13 · Programme Capital Control',copy:'Requested → approved → committed → spent → measured → scale / stop across MFW, BFS and Made.',action:function(){closeSharedOverlays();hubTab='capital';renderHub();hubModal.classList.remove('hidden');}},
    {title:'14 · Owner value',copy:'Commercial architecture and 365-day relationship value without invented ARR/MRR.',action:function(){closeSharedOverlays();valueModal.classList.remove('hidden');}}
  ];
  function closeSharedOverlays(){
    [accountDrawer,registrationModal,investorModal,valueModal,forYouModal,hubModal].forEach(function(el){if(el)el.classList.add('hidden');});
  }
  function renderInvestorPilot(){
    var pilot=document.getElementById('investorPilot');if(!pilot)return;
    pilot.classList.toggle('hidden',!investorDemoActive);
    if(!investorDemoActive)return;
    var step=INVESTOR_DEMO[investorDemoIndex]||INVESTOR_DEMO[0];
    document.getElementById('investorPilotStep').textContent=String(investorDemoIndex+1).padStart(2,'0')+' / '+String(INVESTOR_DEMO.length).padStart(2,'0');
    document.getElementById('investorPilotTitle').textContent=step.title;
    document.getElementById('investorPilotCopy').textContent=step.copy;
    document.getElementById('investorPilotPrev').disabled=investorDemoIndex===0;
    document.getElementById('investorPilotNext').textContent=investorDemoIndex===INVESTOR_DEMO.length-1?'ЗАВЕРШИТЬ':'ДАЛЬШЕ →';
  }
  function runInvestorStep(index){
    investorDemoIndex=Math.max(0,Math.min(INVESTOR_DEMO.length-1,index));
    investorDemoActive=true;
    var step=INVESTOR_DEMO[investorDemoIndex];
    if(step&&step.action)step.action();
    renderInvestorPilot();
  }
  function startInvestorDemo(){
    investorDemoIndex=0;investorDemoActive=true;runInvestorStep(0);
  }
  function nextInvestorDemo(){
    if(investorDemoIndex>=INVESTOR_DEMO.length-1){investorDemoActive=false;closeSharedOverlays();openEvent('mfw');renderInvestorPilot();return;}
    runInvestorStep(investorDemoIndex+1);
  }
  function previousInvestorDemo(){runInvestorStep(investorDemoIndex-1);}
  function stopInvestorDemo(){investorDemoActive=false;closeSharedOverlays();renderInvestorPilot();}
  function renderInvestorGallery(){
    var root=document.getElementById('investorEcosystemGallery');if(!root)return;
    var cards=[
      {event:'mfw',label:'MFW',title:'MOSCOW FASHION WEEK',copy:'Runway · city culture · brands · buyer journey',image:MEDIA.mfw&&MEDIA.mfw.images&&MEDIA.mfw.images.hero},
      {event:'bfs',label:'BFS',title:'BRICS+ FASHION SUMMIT',copy:'Business programme · delegates · international B2B',image:MEDIA.bfs&&MEDIA.bfs.images&&MEDIA.bfs.images.hero},
      {event:'made',label:'MADE',title:'СДЕЛАНО В МОСКВЕ',copy:'Verified · digital showroom · Buyer Bridge · Brand365',image:MEDIA.made&&MEDIA.made.images&&MEDIA.made.images.hero}
    ];
    root.innerHTML=cards.map(function(x){var style=x.image?' style="background-image:linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.86)),url(\''+h(x.image)+'\')"':'';return '<button class="investor-ecosystem-card" data-gallery-event="'+x.event+'"'+style+'><span>'+x.label+'</span><b>'+x.title+'</b><small>'+x.copy+'</small></button>';}).join('');
    [].slice.call(root.querySelectorAll('[data-gallery-event]')).forEach(function(b){b.onclick=function(){openEvent(b.dataset.galleryEvent);};});
  }
  function openEvent(event){
    var mfw=event==='mfw',bfs=event==='bfs',made=event==='made';
    document.body.classList.toggle('bfs-mode',bfs);
    document.body.classList.toggle('made-mode',made);
    buttons.forEach(function(b){b.classList.toggle('active',b.dataset.event===event);});
    frame.src=mfw?'../mfw/index.html':bfs?'./bfs/index.html':'./made-in-moscow/index.html';
    note.textContent=mfw?'MFW · ORIGINAL EXPERIENCE':bfs?'BFS · OFFICIAL-BRAND EXPERIENCE':'СДЕЛАНО В МОСКВЕ · ECOSYSTEM PARTNER EXPERIENCE';
    var theme=document.querySelector('meta[name="theme-color"]');if(theme)theme.setAttribute('content',mfw?'#070707':bfs?'#d4b448':'#ff4a43');
    try{localStorage.setItem('mfp.activeEvent',event);}catch(e){}
  }
  function fillProfile(){
    Object.keys(accountState.profile).forEach(function(key){
      if(profileForm.elements[key]) profileForm.elements[key].value=accountState.profile[key]||'';
    });
  }
  function statusLabel(reg){
    if(!reg)return 'НЕ ЗАРЕГИСТРИРОВАН';
    return ({submitted:'ОТПРАВЛЕНО',approved:'ОДОБРЕНО',draft:'ЧЕРНОВИК'})[reg.status]||reg.status.toUpperCase();
  }
  function renderRegistrations(){
    registrationGrid.innerHTML=['mfw','bfs'].map(function(code){
      var cfg=EVENT_CONFIG[code],reg=accountState.registrations[code];
      var other=code==='mfw'?'bfs':'mfw';
      var otherReg=accountState.registrations[other];
      return '<section class="registration-item"><div class="registration-item-head"><h3>'+cfg.name+'</h3><span class="reg-status">'+statusLabel(reg)+'</span></div>'+
      '<div class="reg-actions"><button data-register="'+code+'">'+(reg?'ПРОВЕРИТЬ / ИЗМЕНИТЬ':'ЗАРЕГИСТРИРОВАТЬСЯ')+'</button>'+
      (otherReg&&!reg?'<button class="secondary" data-copy="'+code+'">СКОПИРОВАТЬ ДАННЫЕ ИЗ '+EVENT_CONFIG[other].short+'</button>':'')+
      '</div></section>';
    }).join('')+
      '<section class="registration-item made-access-item"><div class="registration-item-head"><h3>Сделано в Москве</h3><span class="reg-status">ЕДИНЫЙ ID</span></div>'+
      '<p class="registration-copy">Покупатель, гость и байер используют общий профиль без повторной анкеты. Для бренда badge <b>Made in Moscow Verified</b> появляется только после подтверждения официального roster/status.</p>'+
      '<div class="reg-actions"><button type="button" data-open-made>ОТКРЫТЬ РАЗДЕЛ</button><button type="button" class="secondary" data-made-account>КАК РАБОТАЕТ VERIFIED</button></div></section>';
    [].slice.call(registrationGrid.querySelectorAll('[data-register]')).forEach(function(b){b.onclick=function(){openRegistration(b.dataset.register,false);};});
    [].slice.call(registrationGrid.querySelectorAll('[data-copy]')).forEach(function(b){b.onclick=function(){openRegistration(b.dataset.copy,true);};});
    var openMade=registrationGrid.querySelector('[data-open-made]');if(openMade)openMade.onclick=function(){closeAccount();openEvent('made');};
    var madeInfo=registrationGrid.querySelector('[data-made-account]');if(madeInfo)madeInfo.onclick=function(){closeAccount();openEvent('made');setTimeout(function(){try{frame.contentWindow.postMessage({type:'made-open-section',section:'verified'},'*');}catch(e){}},250);};
  }
  function openAccount(){
    fillProfile();renderRegistrations();renderInterestPicker();accountDrawer.classList.remove('hidden');accountDrawer.setAttribute('aria-hidden','false');hydrateAccountFromAuthority();
  }
  function closeAccount(){accountDrawer.classList.add('hidden');accountDrawer.setAttribute('aria-hidden','true');}
  function openRegistration(code,copied){
    currentRegistrationEvent=code;
    var cfg=EVENT_CONFIG[code],existing=accountState.registrations[code];
    document.getElementById('registrationKicker').textContent=cfg.short+' · SEPARATE EVENT REGISTRATION';
    document.getElementById('registrationTitle').textContent=cfg.name;
    document.getElementById('confirmLabel').textContent='Подтверждаю отдельную регистрацию именно на '+cfg.name;
    var select=document.getElementById('registrationType');
    select.innerHTML=cfg.roles.map(function(x){return '<option value="'+x.id+'">'+x.label+'</option>';}).join('');
    var roleNote=document.getElementById('registrationRoleNote');
    function updateRoleNote(){var role=cfg.roles.filter(function(x){return x.id===select.value;})[0];if(roleNote)roleNote.innerHTML='<b>'+role.label+'</b><span>'+role.note+'</span><small>FLOW: '+role.mode.toUpperCase()+'</small>';}
    select.onchange=updateRoleNote;updateRoleNote();
    registrationForm.elements.company.value=(existing&&existing.company)||accountState.profile.company||'';
    registrationForm.elements.title.value=(existing&&existing.title)||accountState.profile.title||'';
    registrationForm.elements.purpose.value=(existing&&existing.purpose)||'';
    registrationForm.elements.registrationType.value=(existing&&existing.registrationType)||cfg.roles[0].id; if(select.onchange)select.onchange();
    registrationForm.elements.confirm.checked=false;
    if(copied){
      registrationForm.elements.company.value=accountState.profile.company||'';
      registrationForm.elements.title.value=accountState.profile.title||'';
    }
    registrationModal.classList.remove('hidden');registrationModal.setAttribute('aria-hidden','false');
  }
  function closeRegistration(){registrationModal.classList.add('hidden');registrationModal.setAttribute('aria-hidden','true');currentRegistrationEvent=null;}
  profileForm.onsubmit=async function(e){
    e.preventDefault();
    var fd=new FormData(profileForm);
    accountState.profile=Object.assign({},accountState.profile,Object.fromEntries(fd.entries()));
    saveState();renderRegistrations();
    var preferred=(accountState.registrations.mfw&&accountState.registrations.mfw.registrationType)||(accountState.registrations.bfs&&accountState.registrations.bfs.registrationType)||'visitor';
    try{await syncProfileToAuthority(preferred);saveState();}catch(err){console.warn('profile authority sync failed',err);}
  };
  registrationForm.onsubmit=async function(e){
    e.preventDefault();if(!currentRegistrationEvent)return;
    var code=currentRegistrationEvent,fd=new FormData(registrationForm);
    var reg={
      eventCode:code,registrationType:fd.get('registrationType'),company:fd.get('company'),
      title:fd.get('title'),purpose:fd.get('purpose'),status:'submitted',confirmedAt:new Date().toISOString()
    };
    accountState.registrations[code]=reg;saveState();renderRegistrations();
    try{await syncPlatformRegistration(code,reg);}catch(err){console.warn('registration authority sync failed',err);}
    closeRegistration();renderRegistrations();
  };
  document.getElementById('saveInterests').onclick=saveInterestsToAuthority;
  document.getElementById('accountBtn').onclick=openAccount;
  document.getElementById('investorBtn').onclick=function(){renderInvestorGallery();investorModal.classList.remove('hidden');};
  document.getElementById('investorDemoStart').onclick=startInvestorDemo;
  document.getElementById('investorPilotNext').onclick=nextInvestorDemo;
  document.getElementById('investorPilotPrev').onclick=previousInvestorDemo;
  document.getElementById('investorPilotClose').onclick=stopInvestorDemo;
  document.getElementById('valueBtn').onclick=function(){valueModal.classList.remove('hidden');};
  document.getElementById('forYouBtn').onclick=function(){renderForYou();forYouModal.classList.remove('hidden');};
  document.getElementById('hubBtn').onclick=function(){openDiscover(true);};
  document.getElementById('hubClose').onclick=function(){hubModal.classList.add('hidden');};
  document.getElementById('forYouClose').onclick=function(){forYouModal.classList.add('hidden');};
  document.getElementById('valueClose').onclick=function(){valueModal.classList.add('hidden');};
  document.getElementById('investorClose').onclick=function(){investorModal.classList.add('hidden');};
  [].slice.call(document.querySelectorAll('[data-investor-step]')).forEach(function(b){b.onclick=function(){
    var step=b.dataset.investorStep,narrative=document.getElementById('investorNarrative');
    if(step==='1'){openEvent('mfw');narrative.textContent='MFW: runway, LIVE, brands, buyer workflow и Brand365.';}
    if(step==='2'){openEvent('bfs');narrative.textContent='BFS: programme, speakers, delegates и B2B.';}
    if(step==='3'){openEvent('made');narrative.textContent='Сделано в Москве: verified roster, digital showroom, buyer bridge и continuity.';}
    if(step==='4'){investorModal.classList.add('hidden');openAccount();}
    if(step==='5'){hubTab='graph';renderHub();investorModal.classList.add('hidden');hubModal.classList.remove('hidden');}
    if(step==='6'){hubTab='proof';renderHub();investorModal.classList.add('hidden');hubModal.classList.remove('hidden');}
    if(step==='7'){hubTab='partner';renderHub();investorModal.classList.add('hidden');hubModal.classList.remove('hidden');}
    if(step==='8'){hubTab='brand';renderHub();investorModal.classList.add('hidden');hubModal.classList.remove('hidden');}
    if(step==='9'){hubTab='dealroom';renderHub();investorModal.classList.add('hidden');hubModal.classList.remove('hidden');}
    if(step==='10'){hubTab='trust';renderHub();investorModal.classList.add('hidden');hubModal.classList.remove('hidden');}
    if(step==='11'){hubTab='economics';renderHub();investorModal.classList.add('hidden');hubModal.classList.remove('hidden');}
    if(step==='12'){hubTab='committee';renderHub();investorModal.classList.add('hidden');hubModal.classList.remove('hidden');}
    if(step==='13'){hubTab='capital';renderHub();investorModal.classList.add('hidden');hubModal.classList.remove('hidden');}
    if(step==='14'){investorModal.classList.add('hidden');valueModal.classList.remove('hidden');}
  };});
  document.getElementById('accountClose').onclick=closeAccount;
  document.getElementById('registrationClose').onclick=closeRegistration;
  accountDrawer.addEventListener('click',function(e){if(e.target===accountDrawer)closeAccount();});
  registrationModal.addEventListener('click',function(e){if(e.target===registrationModal)closeRegistration();});
  investorModal.addEventListener('click',function(e){if(e.target===investorModal)investorModal.classList.add('hidden');});
  valueModal.addEventListener('click',function(e){if(e.target===valueModal)valueModal.classList.add('hidden');});
  forYouModal.addEventListener('click',function(e){if(e.target===forYouModal)forYouModal.classList.add('hidden');});
  hubModal.addEventListener('click',function(e){if(e.target===hubModal)hubModal.classList.add('hidden');});
  [].slice.call(document.querySelectorAll('[data-hub-tab]')).forEach(function(b){b.onclick=function(){hubTab=b.dataset.hubTab;renderHub();};});
  buttons.forEach(function(b){b.addEventListener('click',function(){openEvent(b.dataset.event);});});
  window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferredInstallPrompt=e;document.body.classList.add('installable');});
  window.addEventListener('appinstalled',function(){deferredInstallPrompt=null;document.body.classList.remove('installable');});
  window.addEventListener('online',updateNetworkStatus);
  window.addEventListener('offline',updateNetworkStatus);
  document.addEventListener('keydown',function(e){
    if((e.metaKey||e.ctrlKey)&&String(e.key).toLowerCase()==='k'){e.preventDefault();openDiscover(true);return;}
    if(e.key==='Escape'){
      if(investorDemoActive){stopInvestorDemo();return;}
      [hubModal,forYouModal,valueModal,investorModal,registrationModal,accountDrawer].forEach(function(el){if(el&&!el.classList.contains('hidden'))el.classList.add('hidden');});
    }
  });
  window.addEventListener('message',function(e){
    if(!e.data||typeof e.data!=='object')return;
    if(e.data.type==='mfp-open-account')openAccount();
    if(e.data.type==='mfp-open-registration')openRegistration(e.data.eventCode||'bfs',false);
    if(e.data.type==='mfp-open-event'&&['mfw','bfs','made'].includes(e.data.eventCode))openEvent(e.data.eventCode);
    if(e.data.type==='mfp-request-account-state')notifyFrame();
  });
  frame.addEventListener('load',notifyFrame);
  updateNetworkStatus();
  registerServiceWorker();
  hydrateMadeDirectory();
  renderInvestorGallery();
  var saved='mfw';try{saved=localStorage.getItem('mfp.activeEvent')||'mfw';}catch(e){}
  var requested=null;try{requested=new URLSearchParams(location.search).get('event');}catch(e){}
  var initial=['mfw','bfs','made'].indexOf(requested)>=0?requested:(saved==='bfs'?'bfs':saved==='made'?'made':'mfw');
  openEvent(initial);
})();