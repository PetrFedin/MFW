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
  var AUTHORITY='https://mfw-authority.onrender.com';
  function h(v){return String(v==null?'':v).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch];});}
  function formatWhen(v){try{return new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(v));}catch(e){return String(v||'');}}
  function accessToken(){try{return localStorage.getItem('mfwAccessToken')||'';}catch(e){return '';}}
  function setAccessToken(v){try{if(v)localStorage.setItem('mfwAccessToken',v);else localStorage.removeItem('mfwAccessToken');}catch(e){}}
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
    (data.mfw.brands||[]).forEach(function(x){out.push({kind:'mfw-brand',event:'MFW',id:x.id,title:x.name,subtitle:x.city,meta:(x.tags||[]).join(' · '),showId:x.showId});});
    (data.mfw.events||[]).forEach(function(x){out.push({kind:'mfw-event',event:'MFW',id:x.id,title:x.title,subtitle:x.date+' · '+x.time,meta:x.type+' · '+x.venue});});
    (data.bfs.speakers||[]).forEach(function(x){out.push({kind:'bfs-speaker',event:'BFS',id:x.id,title:x.name,subtitle:x.role,meta:x.org});});
    (data.bfs.sessions||[]).forEach(function(x){out.push({kind:'bfs-session',event:'BFS',id:x.id,title:x.title,subtitle:x.date+' · '+x.time,meta:x.topic+' · '+x.hall});});
    return out;
  }
  function sourceBadge(event){
    var s=(window.MFP_DATA&&window.MFP_DATA.sources||{})[event==='MFW'?'mfw':'bfs'];
    return s?'<span class="source-badge">OFFICIAL · '+(window.MFP_DATA.syncedAt||'')+'</span>':'';
  }
  function renderDirectory(){
    hubContent.innerHTML='<div class="directory-tools"><input class="directory-search" id="directorySearch" placeholder="Бренд, спикер, сессия, показ"><select class="directory-filter" id="directoryFilter"><option value="all">Все</option><option value="MFW">MFW</option><option value="BFS">BFS</option><option value="brand">Бренды</option><option value="speaker">Спикеры</option><option value="programme">Программа</option></select></div><div class="directory-grid" id="directoryGrid"></div><div class="hub-note">Данные программы и участников импортированы из официальных сайтов MFW и BRICS+ Fashion Summit; дата синхронизации указана на карточках. Production-версия должна перейти с snapshot на автоматическую CMS/API-синхронизацию.</div>';
    function draw(){
      var q=(document.getElementById('directorySearch').value||'').toLowerCase(),f=document.getElementById('directoryFilter').value;
      var rows=directoryEntities().filter(function(x){
        var text=(x.title+' '+x.subtitle+' '+x.meta).toLowerCase();
        var okF=f==='all'||x.event===f||(f==='brand'&&x.kind==='mfw-brand')||(f==='speaker'&&x.kind==='bfs-speaker')||(f==='programme'&&(x.kind==='mfw-event'||x.kind==='bfs-session'));
        return okF&&(!q||text.indexOf(q)>=0);
      });
      document.getElementById('directoryGrid').innerHTML=rows.map(function(x){
        var action='';
        if(x.kind==='mfw-event')action='<button data-agenda-kind="mfw" data-agenda-id="'+x.id+'">В КАЛЕНДАРЬ</button>';
        if(x.kind==='bfs-session')action='<button data-agenda-kind="bfs" data-agenda-id="'+x.id+'">В КАЛЕНДАРЬ</button>';
        if(x.kind==='mfw-brand'&&x.showId)action='<button class="secondary" data-link-show="'+x.showId+'">СВЯЗАННЫЙ ПОКАЗ</button>';
        return '<article class="directory-card"><div class="kind">'+x.event+' · '+x.kind.replace('-',' ').toUpperCase()+' '+sourceBadge(x.event)+'</div><h3>'+x.title+'</h3><p>'+x.subtitle+'</p><div class="entity-meta">'+x.meta+'</div><div class="directory-actions">'+action+'</div></article>';
      }).join('')||'<div class="hub-note">Ничего не найдено.</div>';
      [].slice.call(document.querySelectorAll('[data-agenda-kind]')).forEach(function(b){b.onclick=function(){addAgenda(b.dataset.agendaKind,b.dataset.agendaId);};});
      [].slice.call(document.querySelectorAll('[data-link-show]')).forEach(function(b){b.onclick=function(){
        var id=b.dataset.linkShow,e=(window.MFP_DATA.mfw.events||[]).filter(function(x){return x.id===id;})[0];
        if(e){document.getElementById('directorySearch').value=e.title;draw();}
      };});
    }
    document.getElementById('directorySearch').oninput=draw;document.getElementById('directoryFilter').onchange=draw;draw();
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
  function renderHub(){
    [].slice.call(document.querySelectorAll('[data-hub-tab]')).forEach(function(b){b.classList.toggle('active',b.dataset.hubTab===hubTab);});
    if(hubTab==='directory')renderDirectory();
    else if(hubTab==='agenda')renderAgenda();
    else if(hubTab==='wallet')renderWallet();
    else renderOwner();
  }
  function openEvent(event){
    var mfw=event==='mfw';
    document.body.classList.toggle('bfs-mode',!mfw);
    buttons.forEach(function(b){b.classList.toggle('active',b.dataset.event===event);});
    frame.src=mfw?'../mfw/index.html':'./bfs/index.html';
    note.textContent=mfw?'MFW · ORIGINAL EXPERIENCE':'BFS · OFFICIAL-BRAND EXPERIENCE';
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
    }).join('');
    [].slice.call(registrationGrid.querySelectorAll('[data-register]')).forEach(function(b){b.onclick=function(){openRegistration(b.dataset.register,false);};});
    [].slice.call(registrationGrid.querySelectorAll('[data-copy]')).forEach(function(b){b.onclick=function(){openRegistration(b.dataset.copy,true);};});
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
  document.getElementById('investorBtn').onclick=function(){investorModal.classList.remove('hidden');};
  document.getElementById('valueBtn').onclick=function(){valueModal.classList.remove('hidden');};
  document.getElementById('forYouBtn').onclick=function(){renderForYou();forYouModal.classList.remove('hidden');};
  document.getElementById('hubBtn').onclick=function(){renderHub();hubModal.classList.remove('hidden');};
  document.getElementById('hubClose').onclick=function(){hubModal.classList.add('hidden');};
  document.getElementById('forYouClose').onclick=function(){forYouModal.classList.add('hidden');};
  document.getElementById('valueClose').onclick=function(){valueModal.classList.add('hidden');};
  document.getElementById('investorClose').onclick=function(){investorModal.classList.add('hidden');};
  [].slice.call(document.querySelectorAll('[data-investor-step]')).forEach(function(b){b.onclick=function(){var step=b.dataset.investorStep;var narrative=document.getElementById('investorNarrative');if(step==='1'){openEvent('mfw');narrative.textContent='MFW сохранён без редизайна: показы, LIVE, Discover, pass, buyer и networking.';}if(step==='2'){openEvent('bfs');narrative.textContent='BFS открывается как самостоятельный бренд с business programme, speakers, exhibition и B2B.';}if(step==='3'){investorModal.classList.add('hidden');openAccount();}if(step==='4'){openEvent('bfs');narrative.textContent='В BFS показаны programme save, отдельная регистрация, QR credential и delegate meeting flow.';}if(step==='5'){narrative.textContent='Shared identity и event-scoped authorities позволяют подключать следующие события без унификации их бренда.';}};});
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
  window.addEventListener('message',function(e){
    if(!e.data||typeof e.data!=='object')return;
    if(e.data.type==='mfp-open-account')openAccount();
    if(e.data.type==='mfp-open-registration')openRegistration(e.data.eventCode||'bfs',false);
    if(e.data.type==='mfp-request-account-state')notifyFrame();
  });
  frame.addEventListener('load',notifyFrame);
  var saved='mfw';try{saved=localStorage.getItem('mfp.activeEvent')||'mfw';}catch(e){}
  openEvent(saved==='bfs'?'bfs':'mfw');
})();