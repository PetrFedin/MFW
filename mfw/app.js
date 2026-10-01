(function(){
  'use strict';

  var API='https://mfw-authority.onrender.com';
  var VISUALS={
    runway:'https://static.tildacdn.com/tild3538-3661-4962-a431-363531303736/2026-03-15_215933.jpg',
    backstage:'https://static.tildacdn.com/tild3633-6561-4664-b432-343062643365/2026-03-16_144258.jpg',
    street:'https://static.tildacdn.com/tild3538-3661-4962-a431-363531303736/2026-03-15_215933.jpg',
    designer:'https://static.tildacdn.com/tild3537-3433-4464-a232-383839323139/VB1_09898.jpg'
  };
  var VISUAL_SOURCE='Moscow Fashion Week official published materials · March 2026';
  var DEMO_VIDEO='https://videos.pexels.com/video-files/19863106/19863106-uhd_2160_3840_30fps.mp4';
  var streamPollTimer=null;
  var passRefreshTimer=null;
  var scannerStream=null;
  var scannerFrame=null;
  var demoEvents = [
    {id:'e1',dateRu:'26 сентября',time:'13:30',nameRu:'Universal University x Британская высшая школа дизайна',nameEn:'Universal University x British Higher School of Art & Design',typeRu:'Показ',typeEn:'Runway',venueRu:'Манеж · Зал 2',venueEn:'Manege · Hall 2',status:'SCHEDULED',accessRu:'По приглашению Дома моды',accessEn:'Fashion house invitation',format:'PHYSICAL',participants:['Universal University','Британская высшая школа дизайна']},
    {id:'e2',dateRu:'26 сентября',time:'17:00',nameRu:'Версия 185 | Сбер',nameEn:'Version 185 | Sber',typeRu:'Показ',typeEn:'Runway',venueRu:'Манеж · Зал 1',venueEn:'Manege · Hall 1',status:'SCHEDULED',accessRu:'По приглашению Дома моды',accessEn:'Fashion house invitation',format:'PHYSICAL',participants:['Версия 185','Сбер']},
    {id:'e3',dateRu:'26 сентября',time:'19:00',nameRu:'Slava Zaitsev',nameEn:'Slava Zaitsev',typeRu:'Показ',typeEn:'Runway',venueRu:'Манеж · Зал 1+2',venueEn:'Manege · Hall 1+2',status:'SCHEDULED',accessRu:'По приглашению Дома моды',accessEn:'Fashion house invitation',format:'PHYSICAL',participants:['Slava Zaitsev']},
    {id:'e4',dateRu:'26 сентября',time:'21:00',nameRu:'Ianis Chamalidy',nameEn:'Ianis Chamalidy',typeRu:'Показ',typeEn:'Runway',venueRu:'Манеж · Зал 1+2',venueEn:'Manege · Hall 1+2',status:'SCHEDULED',accessRu:'По приглашению Дома моды',accessEn:'Fashion house invitation',format:'PHYSICAL',participants:['Ianis Chamalidy']},
    {id:'e5',dateRu:'26 сентября',time:'13:00',nameRu:'Ключи народной моды',nameEn:'Keys to Folk Fashion',typeRu:'Лекция',typeEn:'Talk',venueRu:'Манеж · Лекторий',venueEn:'Manege · Lecture Hall',status:'REGISTRATION',accessRu:'Предварительная регистрация',accessEn:'Pre-registration',format:'PHYSICAL',moderator:'',participants:['Андрей Боровский']},
    {id:'e6',dateRu:'26 сентября',time:'16:30',nameRu:'Не только продажи: как сегодня измеряется успех молодого дизайнера?',nameEn:'Beyond Sales: How Is a Young Designer’s Success Measured Today?',typeRu:'Дискуссия',typeEn:'Discussion',venueRu:'Манеж · Лекторий',venueEn:'Manege · Lecture Hall',status:'REGISTRATION',accessRu:'Предварительная регистрация',accessEn:'Pre-registration',format:'PHYSICAL',moderator:'Анна Горбунова',participants:['Леонид Алексеев','Настя Бурьян','Ксения Кудряшова','Алексей Аксенов']}
  ];
  function eventField(e,key){var suffix=state.lang==='en'?'En':'Ru';return e[key+suffix]||e[key]||'';}
  var brands = [
    {id:'b1',name:'Slava Zaitsev',cityRu:'Москва',cityEn:'Moscow',tag:'Runway · 26 SEP',descRu:'Участник официального расписания Московской недели моды 2026.',descEn:'Participant in the official Moscow Fashion Week 2026 schedule.'},
    {id:'b2',name:'Ianis Chamalidy',cityRu:'Санкт-Петербург',cityEn:'Saint Petersburg',tag:'Runway · 26 SEP',descRu:'Участник официального расписания Московской недели моды 2026.',descEn:'Participant in the official Moscow Fashion Week 2026 schedule.'},
    {id:'b3',name:'Brand Brama',cityRu:'Комсомольск-на-Амуре',cityEn:'Komsomolsk-on-Amur',tag:'Runway · 27 SEP',descRu:'Участник официального расписания Московской недели моды 2026.',descEn:'Participant in the official Moscow Fashion Week 2026 schedule.'},
    {id:'b4',name:'Gapanovich',cityRu:'Мурманск',cityEn:'Murmansk',tag:'Runway · 27 SEP',descRu:'Участник официального расписания Московской недели моды 2026.',descEn:'Participant in the official Moscow Fashion Week 2026 schedule.'},
    {id:'b5',name:'Addicted_to…',cityRu:'Москва',cityEn:'Moscow',tag:'Runway · 28 SEP',descRu:'Участник официального расписания Московской недели моды 2026.',descEn:'Participant in the official Moscow Fashion Week 2026 schedule.'},
    {id:'b6',name:'Lesel',cityRu:'Москва',cityEn:'Moscow',tag:'Runway · 28 SEP',descRu:'Участник официального расписания Московской недели моды 2026.',descEn:'Participant in the official Moscow Fashion Week 2026 schedule.'},
    {id:'b7',name:'Sergey Sysoev',cityRu:'Москва',cityEn:'Moscow',tag:'Runway · 28 SEP',descRu:'Участник официального расписания Московской недели моды 2026.',descEn:'Participant in the official Moscow Fashion Week 2026 schedule.'},
    {id:'b8',name:'Masterpeace',cityRu:'Москва',cityEn:'Moscow',tag:'Runway · 29 SEP',descRu:'Участник официального расписания Московской недели моды 2026.',descEn:'Participant in the official Moscow Fashion Week 2026 schedule.'},
    {id:'b9',name:'Kuchugova',cityRu:'Москва',cityEn:'Moscow',tag:'Runway · 30 SEP',descRu:'Участник официального расписания Московской недели моды 2026.',descEn:'Participant in the official Moscow Fashion Week 2026 schedule.'},
    {id:'b10',name:'Julia Dalakian',cityRu:'Москва',cityEn:'Moscow',tag:'Runway · 30 SEP',descRu:'Участник официального расписания Московской недели моды 2026.',descEn:'Participant in the official Moscow Fashion Week 2026 schedule.'},
    {id:'b11',name:'IgorGulyaev',cityRu:'Москва',cityEn:'Moscow',tag:'Runway · 1 OCT',descRu:'Участник официального расписания Московской недели моды 2026.',descEn:'Participant in the official Moscow Fashion Week 2026 schedule.'},
    {id:'b12',name:'Bitte_Ruhe',cityRu:'Москва',cityEn:'Moscow',tag:'Official participants',descRu:'Бренд присутствует в официальном каталоге участников Московской недели моды.',descEn:'Brand listed in the official Moscow Fashion Week participant catalogue.'}
  ];
  if(window.MFP_DATA&&window.MFP_DATA.mfw){
    var officialMfw=window.MFP_DATA.mfw;
    demoEvents=(officialMfw.events||[]).map(function(e){
      return {
        id:e.id,
        dateRu:(e.date||'').split('-').reverse().slice(0,2).join('.'),
        dateEn:e.date||'',
        time:e.time||'',
        nameRu:e.title||'',
        nameEn:e.title||'',
        typeRu:e.type||'Событие',
        typeEn:e.type||'Event',
        venueRu:e.venue||'',
        venueEn:e.venue||'',
        status:e.access==='Регистрация'?'REGISTRATION':'SCHEDULED',
        accessRu:e.access||'',
        accessEn:e.access||'',
        format:'PHYSICAL',
        city:e.city||'',
        moderator:e.moderator||'',
        participants:e.participants||[],
        source:'OFFICIAL'
      };
    });
    brands=(officialMfw.brands||[]).map(function(b){
      var linked=(officialMfw.events||[]).filter(function(e){return e.id===b.showId;})[0];
      return {
        id:b.id,
        name:b.name,
        cityRu:b.city||'',
        cityEn:b.city||'',
        tag:linked?('Runway · '+linked.date+' · '+linked.time):((b.tags||[]).join(' · ')||'Official participant'),
        descRu:'Участник официального каталога Московской недели моды 2026.',
        descEn:'Official Moscow Fashion Week 2026 participant.',
        showId:b.showId||null,
        source:'OFFICIAL'
      };
    });
  }
  function brandCity(b){return state.lang==='en'?b.cityEn:b.cityRu;}
  function brandDesc(b){return state.lang==='en'?b.descEn:b.descRu;}
  var I18N={
    ru:{
      today:'Сегодня',schedule:'Программа',discover:'Открыть',profile:'Я',investor:'ИНВЕСТОР',
      enter:'Войти в Moscow Fashion Week',openingTitle:'МОСКВА<br>ВЫХОДИТ<br>НА ПОДИУМ.',
      openingText:'Показы, LIVE, бренды, люди и ваш цифровой пропуск — в одном пространстве.',
      dayOne:'26 сентября · День 1',todayTitle:'СЕГОДНЯ<br>В MFW',watchLive:'Смотреть LIVE',
      yourEvening:'Ваш вечер',fullProgramme:'Вся программа',saved:'Сохранённые',
      programmeTitle:'ПРОГРАММА',calendar:'Ваш персональный календарь',
      all:'Все',mine:'Мои',shows:'Показы',talks:'Лекции',online:'Онлайн',available:'Доступно мне',
      add:'+ Добавить',added:'✓ В моей программе',route:'Маршрут',
      liveTitle:'RUNWAY<br>LIVE',lookByLook:'Look-by-look',synced:'Синхронизировано с эфиром',
      next:'Далее',openBrand:'Открыть бренд',replayReady:'После показа эфир станет<br>структурированным архивом.',
      brands:'Бренды',speakers:'Спикеры',people:'Люди',market:'Маркет',map:'Карта',
      profileTitle:'ВАШ<br>ПРОФИЛЬ',events:'События',looks:'Образы',contacts:'Контакты',
      settings:'Настройки',notifications:'Уведомления',passport:'MFW Passport',
      buyerWorkspace:'Buyer workspace',shortlist:'SHORTLIST · SERVER',meeting:'Встреча',
      connect:'Связаться',connectQr:'QR знакомства',boards:'Подборки',meetups:'Встречи по интересам',perks:'Привилегии',club:'MFW Club',brand365:'MFW 365',
      language:'Язык',russian:'Русский',english:'English',
      openCamera:'Открыть камеру',photoQr:'Фото QR',gateScanner:'Сканер прохода',
      adminConsole:'Открыть Admin Console',pressMode:'Press mode',brandDashboard:'Brand dashboard',
      continue:'Продолжить',follow:'Подписаться',lineSheet:'Line sheet',followup:'Follow-up',
      connectTitle:'ОБМЕН<br>КОНТАКТОМ',boardTitle:'ВАШИ<br>ПОДБОРКИ',meetupTitle:'FASHION<br>MEETUPS',perksTitle:'MFW<br>PRIVILEGES',
      addToBoard:'В подборку',newBoard:'Новая подборка',join:'Присоединиться',joined:'Вы участвуете',
      reschedule:'Перенести',confirm:'Подтвердить',cancel:'Отменить',showContactQr:'Показать Connect QR'
    },
    en:{
      today:'Today',schedule:'Schedule',discover:'Discover',profile:'Me',investor:'INVESTOR',
      enter:'Enter Moscow Fashion Week',openingTitle:'MOSCOW<br>TAKES<br>THE RUNWAY.',
      openingText:'Shows, LIVE, brands, people and your digital pass — in one experience.',
      dayOne:'September 26 · Day 1',todayTitle:'TODAY<br>AT MFW',watchLive:'Watch LIVE',
      yourEvening:'Your evening',fullProgramme:'Full schedule',saved:'Saved',
      programmeTitle:'SCHEDULE',calendar:'Your personal calendar',
      all:'All',mine:'Mine',shows:'Shows',talks:'Talks',online:'Online',available:'Available to me',
      add:'+ Add',added:'✓ In my schedule',route:'Route',
      liveTitle:'RUNWAY<br>LIVE',lookByLook:'Look-by-look',synced:'Synced with the live show',
      next:'Up next',openBrand:'Open brand',replayReady:'After the show, LIVE becomes<br>a structured archive.',
      brands:'Brands',speakers:'Speakers',people:'People',market:'Market',map:'Map',
      profileTitle:'YOUR<br>PROFILE',events:'Events',looks:'Looks',contacts:'Contacts',
      settings:'Settings',notifications:'Notifications',passport:'MFW Passport',
      buyerWorkspace:'Buyer workspace',shortlist:'SHORTLIST · SERVER',meeting:'Meeting',
      connect:'Connect',connectQr:'Connect QR',boards:'Boards',meetups:'Meetups',perks:'Perks',club:'MFW Club',brand365:'MFW 365',
      language:'Language',russian:'Русский',english:'English',
      openCamera:'Open camera',photoQr:'QR photo',gateScanner:'Gate scanner',
      adminConsole:'Open Admin Console',pressMode:'Press mode',brandDashboard:'Brand dashboard',
      continue:'Continue',follow:'Follow',lineSheet:'Line sheet',followup:'Follow-up',
      connectTitle:'EXCHANGE<br>CONTACT',boardTitle:'YOUR<br>BOARDS',meetupTitle:'FASHION<br>MEETUPS',perksTitle:'MFW<br>PRIVILEGES',
      addToBoard:'Add to board',newBoard:'New board',join:'Join',joined:'Joined',
      reschedule:'Reschedule',confirm:'Confirm',cancel:'Cancel',showContactQr:'Show Connect QR'
    }
  };
  function t(key){return (I18N[state&&state.lang||'ru']&&I18N[state&&state.lang||'ru'][key])||I18N.ru[key]||key;}
  function T(ru,en){return (state&&state.lang==='en')?en:ru;}

  var state = {
    tab:'today',
    lang:localStorage.getItem('mfwLang') || 'ru',
    discoverTab:'brands',
    role:localStorage.getItem('mfwRole') || 'Visitor',
    name:localStorage.getItem('mfwName') || 'Пётр Федин',
    savedLooks:JSON.parse(localStorage.getItem('mfwSavedLooks') || '["look-07"]'),
    savedBrands:JSON.parse(localStorage.getItem('mfwSavedBrands') || '[]'),
    favoriteBrands:JSON.parse(localStorage.getItem('mfwFavoriteBrands') || '[]'),
    myEvents:JSON.parse(localStorage.getItem('mfwMyEvents') || '["e2","e3"]'),
    connections:2,
    meeting:false,
    voted:false,
    scannerState:'idle',
    backendStatus:'checking',
    authStatus:'local',
    session:null,
    userId:null,
    passToken:null,
    passPayload:null,
    scannerReason:'',
    openingSeen:localStorage.getItem('mfwOpeningSeen') === '1',
    stream:null,
    streamLoading:false,
    buyerShortlist:[],
    commerceLoading:false,
    commerceLoaded:false,
    boards:JSON.parse(localStorage.getItem('mfwBoards') || '["Front Row","Buying SS27"]'),
    joinedMeetups:JSON.parse(localStorage.getItem('mfwMeetups') || '[]'),
    onboarding:localStorage.getItem('mfwOnboarded') === '1'
  };

  function persist(){
    localStorage.setItem('mfwRole',state.role);
    localStorage.setItem('mfwName',state.name);
    localStorage.setItem('mfwSavedLooks',JSON.stringify(state.savedLooks));
    localStorage.setItem('mfwSavedBrands',JSON.stringify(state.savedBrands));
    localStorage.setItem('mfwFavoriteBrands',JSON.stringify(state.favoriteBrands));
    localStorage.setItem('mfwMyEvents',JSON.stringify(state.myEvents));
    localStorage.setItem('mfwLang',state.lang);
    localStorage.setItem('mfwBoards',JSON.stringify(state.boards));
    localStorage.setItem('mfwMeetups',JSON.stringify(state.joinedMeetups));
  }

  async function api(path, options){
    var opts=options||{};
    var controller=new AbortController();
    var timer=setTimeout(function(){controller.abort();},6500);
    opts.signal=controller.signal;
    opts.headers=Object.assign({'Content-Type':'application/json'},opts.headers||{});
    if(state.session&&!opts.headers.Authorization)opts.headers.Authorization='Bearer '+state.session;
    var res;
    try{ res=await fetch(API+path,opts); }
    finally{ clearTimeout(timer); }
    var data=await res.json().catch(function(){return {};});
    if(!res.ok){
      var err=new Error(data.error||data.reason||('api_'+res.status));
      err.status=res.status;err.data=data;throw err;
    }
    return data;
  }

  function updateBackendIndicator(){
    var el=document.getElementById('backend-status');
    if(!el)return;
    el.textContent=state.backendStatus==='online'?'API ONLINE':state.backendStatus==='offline'?'API OFFLINE':'CHECKING';
    el.className='badge '+(state.backendStatus==='online'?'open':state.backendStatus==='offline'?'live':'');
  }

  async function cacheOfflineAuthority(){
    try{
      var key=await api('/v1/authority/public-key');
      localStorage.setItem('mfwAuthorityJwk',JSON.stringify(key.jwk));
      var rev=await api('/v1/authority/revocations');
      localStorage.setItem('mfwRevocations',JSON.stringify(rev.revoked||[]));
    }catch(_){}
  }

  async function loadStreamAuthority(){
    if(state.streamLoading)return;
    state.streamLoading=true;
    try{
      var out=await api('/v1/streams/e1');
      var changed=!state.stream||state.stream.currentLook!==out.data.currentLook||state.stream.status!==out.data.status||state.stream.replayAvailable!==out.data.replayAvailable;
      state.stream=out.data;
      if(changed&&state.tab==='live')setTimeout(function(){render();},0);
    }catch(_){}
    state.streamLoading=false;
    if(state.tab==='live'){
      if(streamPollTimer)clearTimeout(streamPollTimer);
      streamPollTimer=setTimeout(loadStreamAuthority,3500);
    }
  }

  async function checkBackend(){
    try{
      await api('/health');
      state.backendStatus='online';
      cacheOfflineAuthority();
    }catch(_){
      state.backendStatus='offline';
    }
    updateBackendIndicator();
  }

  function schedulePassRotation(ms){
    if(passRefreshTimer)clearTimeout(passRefreshTimer);
    passRefreshTimer=setTimeout(function(){
      state.passToken=null;state.passPayload=null;
      if(state.tab==='me')ensurePass();
    },Math.max(15000,Number(ms||45000)));
  }

  async function renderPassQR(){
    var el=document.getElementById('qr');if(!el||!state.passToken)return;
    try{
      var controller=new AbortController();
      var timer=setTimeout(function(){controller.abort();},6500);
      var res=await fetch(API+'/v1/passes/qr',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({token:state.passToken}),
        signal:controller.signal
      });
      clearTimeout(timer);
      if(!res.ok)throw new Error('qr_'+res.status);
      el.innerHTML=await res.text();
    }catch(_){
      el.innerHTML='<div style="color:#111;font-size:11px;padding:36px 12px;text-align:center">QR temporarily unavailable</div>';
    }
  }

  async function ensurePass(){
    if(state.passToken&&state.passPayload&&Number(state.passPayload.exp||0)>Date.now()+30000){
      renderPassQR();return;
    }
    try{
      var data=await userApi('/v1/passes/issue',{
        method:'POST',
        body:JSON.stringify({
          userId:state.userId||('demo_'+state.name.toLowerCase().replace(/[^a-z0-9а-я]+/gi,'_').slice(0,40)),
          role:state.role,
          eventId:'mfw-2026',
          eventBrand:'mfw',
          entitlements:[entitlementText()]
        })
      });
      state.passToken=data.token;
      state.passPayload=data.payload;
      renderPassQR();
      schedulePassRotation(data.refreshAfterMs);
      var el=document.getElementById('pass-authority');
      if(el)el.textContent='ES256 · rotating · '+String(data.payload.jti||'').slice(-8);
    }catch(_){
      var el2=document.getElementById('pass-authority');
      if(el2)el2.textContent='API unavailable · cached pass only';
    }
  }

  function track(type, meta){
    api('/v1/analytics/track',{method:'POST',body:JSON.stringify({type:type,meta:meta||{},at:new Date().toISOString()})}).catch(function(){});
  }

  function esc(s){
    return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];});
  }

  function badge(status){
    var cls = status==='LIVE'?'live':status==='OPEN'?'open':status.indexOf('WAIT')>=0?'wait':status.indexOf('INVITE')>=0?'invite':'';
    return '<span class="badge '+cls+'">'+esc(status)+'</span>';
  }

  function topbar(){
    return '<div class="topbar"><div class="wordmark"><span>MOSCOW</span><span>FASHION WEEK</span></div><div class="top-actions"><button class="lang-toggle" data-action="toggle-lang">'+(state.lang==='ru'?'RU / EN':'EN / RU')+'</button><button class="investor-pill" data-action="investor-tour">'+t('investor')+'</button><button class="icon-btn" data-action="notifications">●</button><button class="icon-btn pass" data-tab="me">QR</button></div></div>';
  }

  function nav(){
    var items=[
      ['today','◐',t('today')],
      ['schedule','▦',t('schedule')],
      ['live','▶','LIVE'],
      ['discover','◇',t('discover')],
      ['me','◎',t('profile')]
    ];
    return '<nav class="bottom-nav">'+items.map(function(x){
      return '<button class="nav-btn '+(state.tab===x[0]?'active':'')+'" data-tab="'+x[0]+'"><b>'+x[1]+'</b>'+x[2]+'</button>';
    }).join('')+'</nav>';
  }

  function demoNote(){
    return '<div class="demo-note"><b>CONCEPT DEMO.</b> '+T('Программа и каталог брендов синхронизированы с официальным snapshot MFW от 29.09.2026. Права доступа, LIVE и часть коммерческих сценариев остаются демонстрационными до подключения production authority.','Programme and brand catalogue use the official MFW snapshot synced on 29 Sep 2026. Access rights, LIVE and some commercial flows remain demo until production authority is connected.')+'</div>';
  }

  function lookVisual(n,label){
    var urls=[VISUALS.runway,VISUALS.backstage,VISUALS.street,VISUALS.designer];
    return '<div class="look-photo" style="background-image:url('+urls[(n-1)%urls.length]+')"><span class="look-number">'+esc(label||('LOOK '+String(n).padStart(2,'0')))+'</span></div>';
  }

  function openingExperience(){
    return '<div class="opening-experience">'+
      '<div class="opening-media" style="background-image:linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.82)),url('+VISUALS.runway+')"></div>'+
      '<div class="opening-grain"></div>'+
      '<div class="opening-copy"><div class="opening-mark"><span>MOSCOW</span><span>FASHION WEEK</span></div>'+
      '<div class="opening-season">26 SEP — 01 OCT · 2026</div>'+
      '<h1>'+t('openingTitle')+'</h1>'+
      '<p>'+t('openingText')+'</p>'+
      '<button class="opening-cta" data-action="enter-experience">'+t('enter')+' <span>→</span></button>'+
      '<button class="opening-ghost" data-action="investor-tour">Investor demo · 3 min</button></div>'+
      '<div class="opening-credit">Investor concept · '+esc(VISUAL_SOURCE)+'</div></div>';
  }

  function today(){
    var isNight=(new Date().getHours()>=19||new Date().getHours()<6);
    return '<main class="'+(isNight?'night-state':'day-state')+'">'+
      '<div class="today-masthead"><div><div class="eyebrow">'+t('dayOne')+'</div><h1>'+t('todayTitle')+'</h1></div><div class="day-orbit">'+(isNight?'NIGHT':'DAY')+'</div></div>'+
      '<section class="fashion-hero" style="background-image:linear-gradient(180deg,rgba(0,0,0,.04),rgba(0,0,0,.86)),url('+VISUALS.runway+')">'+
        '<div class="fashion-hero-top"><span class="live-tag"><span class="dot"></span> LIVE NOW</span><span class="native-partner">PARTNER EXPERIENCE · DEMO</span></div>'+
        '<div class="fashion-hero-bottom"><div class="eyebrow">MFW OPENING RUNWAY · HALL 1</div><div class="fashion-title">THE CITY<br>IS WATCHING.</div><div class="hero-meta">LOOK '+esc(String((state.stream&&state.stream.currentLook)||14).padStart(2,'0'))+' / '+esc((state.stream&&state.stream.totalLooks)||32)+'</div>'+
        '<div class="action-row"><button class="action light" data-tab="live">'+t('watchLive')+'</button><button class="action glass" data-action="sponsor-experience">Experience</button></div></div>'+
      '</section>'+
      '<div class="investor-strip premium"><div><div class="kicker">Investor path</div><b>Audience → access → commerce → organizer</b><p>Весь путь уже собран в одном vertical slice.</p></div><button class="action primary" data-action="investor-tour">3 min</button></div>'+
      '<div class="section-head"><h2>'+t('yourEvening')+'</h2><span class="link" data-tab="schedule">'+t('fullProgramme')+'</span></div>'+
      '<div class="timeline premium-timeline">'+demoEvents.slice(1,4).map(eventRow).join('')+'</div>'+
      '<div class="editorial-duo"><button class="editorial-story" data-action="brand" data-id="b1" style="background-image:linear-gradient(180deg,transparent,rgba(0,0,0,.78)),url('+VISUALS.backstage+')"><span class="eyebrow">BACKSTAGE</span><b>До выхода<br>30 секунд</b><small>Открыть историю бренда →</small></button>'+
      '<button class="editorial-story" data-discover="street" style="background-image:linear-gradient(180deg,transparent,rgba(0,0,0,.78)),url('+VISUALS.street+')"><span class="eyebrow">STREET STYLE</span><b>Москва<br>между показами</b><small>Смотреть feed →</small></button></div>'+
      '<div class="section-head"><h2>Runway now</h2><span class="link" data-action="saved-looks">'+t('saved')+'</span></div>'+
      '<div class="visual-look-rail">'+[11,12,13,14,15].map(function(n){var id='look-'+n;return '<button class="visual-look '+(state.savedLooks.indexOf(id)>=0?'saved':'')+'" data-action="save-look" data-look="'+id+'">'+lookVisual(n)+'</button>';}).join('')+'</div>'+
      '<div class="recap-teaser" data-action="post-show-recap"><div><div class="eyebrow">POST-SHOW RECAP</div><b>Ваш день в MFW,<br>собранный автоматически.</b><p>Показы · сохранённые образы · бренды · контакты.</p></div><span>→</span></div>'+
    '</main>';
  }

  function eventRow(e){
    return '<div class="event" data-action="event" data-id="'+e.id+'"><div class="time">'+e.time+'</div><div><h3>'+esc(eventField(e,'name'))+'</h3><div class="meta">'+esc(eventField(e,'venue'))+' · '+esc(eventField(e,'type'))+'</div></div>'+badge(e.status)+'</div>';
  }

  function eventPrimaryAction(e,mine){
    if(e.status==='INVITE ONLY'){
      return '<button class="action ghost" disabled>'+T('Только по приглашению','Invite only')+'</button>';
    }
    if(mine){
      return '<button class="action ghost" data-action="toggle-event" data-id="'+e.id+'">'+t('added')+'</button>';
    }
    if(e.status==='WAITLIST'){
      return '<button class="action primary" data-action="toggle-event" data-id="'+e.id+'">'+T('В лист ожидания','Join waitlist')+'</button>';
    }
    return '<button class="action primary" data-action="toggle-event" data-id="'+e.id+'">'+t('add')+'</button>';
  }

  function schedule(){
    return '<main>'+
      '<div class="eyebrow" style="margin-top:18px">'+t('calendar')+'</div><h1>'+t('programmeTitle')+'</h1>'+
      '<div class="filters">'+['26 SEP','27','28','29','30','01 OCT'].map(function(x,i){return '<button class="chip '+(i===0?'active':'')+'">'+x+'</button>';}).join('')+'</div>'+
      '<div class="filters">'+[t('all'),t('mine'),t('shows'),t('talks'),'B2B',t('online'),t('available')].map(function(x,i){return '<button class="chip '+(i===0?'active':'')+'">'+x+'</button>';}).join('')+'</div>'+
      demoEvents.map(function(e){
        var mine=state.myEvents.indexOf(e.id)>=0;
        return '<div class="card event-card" data-action="event" data-id="'+e.id+'"><div class="event-top"><div><div class="eyebrow">'+e.time+' · '+esc(eventField(e,'type'))+' · '+esc(e.format||'')+'</div><div class="event-name">'+esc(eventField(e,'name'))+'</div><div class="event-details">'+esc(eventField(e,'venue'))+' · '+esc(eventField(e,'access'))+'</div></div>'+badge(e.status)+'</div><div class="mini-actions">'+eventPrimaryAction(e,mine)+'<button class="action ghost" data-action="route" data-id="'+e.id+'">'+t('route')+'</button></div></div>';
      }).join('')+
    '</main>';
  }

  function live(){
    var stream=state.stream||{status:'live',currentLook:14,totalLooks:32,playbackUrl:DEMO_VIDEO,posterUrl:VISUALS.runway,replayAvailable:true};
    var current=Number(stream.currentLook||14);
    var saved=state.savedLooks.indexOf('look-'+current)>=0;
    return '<main class="live-screen"><div class="live-kicker"><span class="live-tag"><span class="dot"></span> '+esc(String(stream.status||'live').toUpperCase())+'</span><span class="stream-authority">STREAM AUTHORITY</span></div>'+
      '<h1>'+t('liveTitle')+'</h1>'+
      '<div class="cinema-player">'+
        '<video class="runway-video" autoplay muted loop playsinline poster="'+esc(stream.posterUrl||VISUALS.runway)+'"><source src="'+esc(stream.playbackUrl||DEMO_VIDEO)+'" type="video/mp4"></video>'+
        '<div class="cinema-vignette"></div>'+
        '<div class="cinema-top"><span>MFW · OPENING RUNWAY</span><span>CC · RU / EN</span></div>'+
        '<div class="cinema-bottom"><div><div class="look-index">LOOK '+String(current).padStart(2,'0')+' / '+esc(stream.totalLooks||32)+'</div><div class="live-brand">MFW / NEW 01</div></div>'+
        '<div class="live-actions"><button class="round-action '+(saved?'saved':'')+'" data-action="save-look" data-look="look-'+current+'">'+(saved?'♥':'♡')+'</button><button class="round-action" data-action="brand" data-id="b1">↗</button></div></div>'+
      '</div>'+
      '<div class="live-progress"><span style="width:'+(Math.max(4,Math.min(100,(current/Number(stream.totalLooks||32))*100)))+'%"></span></div>'+
      '<div class="section-head"><h2>'+t('lookByLook')+'</h2><span class="link">'+t('synced')+'</span></div>'+
      '<div class="visual-look-rail live-rail">'+[current-2,current-1,current,current+1,current+2].filter(function(n){return n>0&&n<=Number(stream.totalLooks||32);}).map(function(n){return '<button class="visual-look '+(n===current?'current':'')+'" data-action="save-look" data-look="look-'+n+'">'+lookVisual(n)+'</button>';}).join('')+'</div>'+
      '<div class="live-editorial-card" style="background-image:linear-gradient(90deg,rgba(0,0,0,.78),rgba(0,0,0,.22)),url('+VISUALS.backstage+')"><div><div class="eyebrow">BACKSTAGE · LIVE LAYER</div><b>'+T('Что происходит<br>за кулисами сейчас','What is happening<br>backstage right now')+'</b><button class="action light" data-action="brand" data-id="b1">'+t('openBrand')+'</button></div></div>'+
      '<div class="section-head"><h2>'+t('next')+'</h2><span class="link">18:00</span></div>'+
      '<div class="card premium-card"><div class="eyebrow">UP NEXT · HALL 2</div><div class="event-name">New Names: Moscow</div><div class="sub">Персональное напоминание за 10 минут · 4 минуты пешком.</div><div class="action-row"><button class="action primary" data-action="toggle-event" data-id="e2">Добавить</button><button class="action ghost" data-action="route">Маршрут</button></div></div>'+
      '<div class="replay-state"><div><div class="eyebrow">REPLAY READY</div><b>'+t('replayReady')+'</b><p>Video + looks + captions + brand story.</p></div><span class="replay-icon">▶</span></div>'+
    '</main>';
  }

  function discover(){
    var tabs=['brands','speakers','people','street','market','map'];
    var labels={brands:t('brands'),speakers:t('speakers'),people:t('people'),street:'Street',market:t('market'),map:t('map')};
    var content='';
    if(state.discoverTab==='brands'){
      content='<input class="input editorial-search" placeholder="Бренд, дизайнер, категория" />'+
      '<div class="editorial-brand-grid">'+brands.map(function(b,i){
        var img=[VISUALS.designer,VISUALS.runway,VISUALS.backstage,VISUALS.street][i%4];
        var fav=state.favoriteBrands.indexOf(b.id)>=0;
        return '<button class="editorial-brand-card" data-action="brand" data-id="'+b.id+'" style="background-image:linear-gradient(180deg,transparent 20%,rgba(0,0,0,.84)),url('+img+')"><span class="brand-tag">'+esc(b.tag)+'</span>'+(fav?'<span class="brand-favorite">♥</span>':'')+'<div><h3>'+esc(b.name)+'</h3><div class="sub">'+esc(brandCity(b))+'</div></div></button>';
      }).join('')+'</div>';
    } else if(state.discoverTab==='speakers'){
      content='<div class="speaker-card"><div class="speaker-photo" style="background-image:url('+VISUALS.designer+')"></div><div class="speaker-copy"><div class="eyebrow">RETAIL · BUYING</div><div class="event-name">Анна · Buyer Perspective</div><div class="sub">Как байер принимает решение о бренде и коллекции.</div><div class="action-row"><button class="action primary" data-action="questions">Live Q&A</button><button class="action ghost" data-action="toggle-event" data-id="e3">В программу</button></div></div></div>'+
      '<div class="speaker-card reverse"><div class="speaker-photo" style="background-image:url('+VISUALS.backstage+')"></div><div class="speaker-copy"><div class="eyebrow">TECH · FASHION</div><div class="event-name">AI в fashion-команде</div><div class="sub">Сессия, материалы, запись и ключевые выводы после выступления.</div><button class="action ghost" data-action="toast" data-message="Материалы будут доступны после сессии">Материалы</button></div></div>';
    } else if(state.discoverTab==='people'){
      content='<div class="filters">'+['Buyer','Designer','Retail','Media','Stylist','Creator'].map(function(x,i){return '<button class="chip '+(i===0?'active':'')+'">'+x+'</button>';}).join('')+'</div>'+
      '<div class="people-editorial"><div class="person-photo" style="background-image:url('+VISUALS.street+')"></div><div><div class="eyebrow">BUYER · MOSCOW</div><h2>Мария</h2><p class="sub">Premium Womenswear · ищет новые российские марки.</p><div class="action-row"><button class="action primary" data-action="connect">Connect</button><button class="action ghost" data-action="toast" data-message="QR exchange готов к сканированию">QR exchange</button></div></div></div>';
    } else if(state.discoverTab==='street'){
      content='<div class="street-feed">'+
        '<article class="street-post tall" style="background-image:url('+VISUALS.street+')"><span>STREET 001</span><b>Outside Manege</b></article>'+
        '<article class="street-post" style="background-image:url('+VISUALS.backstage+')"><span>DETAIL</span><b>Before the show</b></article>'+
        '<article class="street-post" style="background-image:url('+VISUALS.runway+')"><span>FRONT ROW</span><b>Seen at MFW</b></article>'+
      '</div><div class="demo-note"><b>Editorial moderation.</b> В production сюда попадают только одобренные official + UGC материалы с правами на публикацию.</div>';
    } else if(state.discoverTab==='market'){
      content='<div class="market-hero" style="background-image:linear-gradient(90deg,rgba(0,0,0,.84),rgba(0,0,0,.18)),url('+VISUALS.designer+')"><div><div class="eyebrow">MFW MARKET</div><b>Из офлайн-стенда<br>в цифровую витрину.</b><p>QR → бренд → коллекция → Follow → где купить.</p><button class="action light" data-action="brand" data-id="b2">Открыть бренд</button></div></div>';
    } else {
      content='<div class="indoor-map"><div class="map-zone hall1"><b>HALL 1</b><span>LIVE</span></div><div class="map-zone hall2"><b>HALL 2</b><span>18:00</span></div><div class="map-zone hall3"><b>HALL 3</b></div><div class="map-zone lecture"><b>LECTURE</b></div><div class="map-zone showroom"><b>SHOWROOM</b></div><div class="map-zone market"><b>MARKET</b></div><div class="you-are-here">● YOU</div></div>'+
      '<div class="card premium-card"><div class="eyebrow">NEXT · 18:00</div><div class="event-name">New Names: Moscow</div><div class="sub">Hall 2 · 4 минуты пешком · без конфликта с вашей программой.</div><button class="action primary" data-action="route">Построить маршрут</button></div>';
    }
    return '<main><div class="eyebrow" style="margin-top:18px">Discover MFW</div><h1>'+T('ОТКРЫТЬ','DISCOVER')+'</h1><div class="filters discover-tabs">'+tabs.map(function(tab){return '<button class="chip '+(state.discoverTab===tab?'active':'')+'" data-discover="'+tab+'">'+labels[tab]+'</button>';}).join('')+'</div>'+content+'</main>';
  }

  function me(){
    var roleContent='';
    if(state.role==='Buyer'){
      roleContent=buyerPanel();
      setTimeout(loadBuyerShortlist,0);
    } else if(state.role==='Media'){
      roleContent='<h2>'+t('pressMode')+'</h2><div class="card"><div class="eyebrow">APPROVED ASSETS · SERVER</div><div class="event-name">Press kit · Opening Runway</div><div class="sub">'+T('Press release · approved images · credits · press contact','Press release · approved images · credits · press contact')+'</div><button class="action primary" data-action="press-kit" data-id="e1">'+T('Открыть press kit','Open press kit')+'</button></div>';
    } else if(state.role==='Designer'){
      roleContent='<h2>'+t('brandDashboard')+'</h2><div class="stat-grid"><div class="stat"><b>82%</b><small>'+T('Профиль','Profile')+'</small></div><div class="stat"><b>148</b><small>'+T('Сохранения','Saves')+'</small></div><div class="stat"><b>17</b><small>Buyer interest</small></div></div><div class="card" style="margin-top:10px"><h3>'+T('Готовность коллекции','Collection readiness')+'</h3><div class="sub">'+T('Проверить порядок look, медиа и коммерческие данные перед публикацией.','Validate look order, media and commercial data before publishing.')+'</div><div class="action-row"><button class="action primary" data-action="designer-workspace" data-id="b1">'+t('continue')+'</button><button class="action ghost" data-action="brand-portal" data-id="b1">'+T('Brand 365 Studio','Brand 365 Studio')+'</button></div></div>';
    } else if(state.role==='Staff'){
      roleContent=staffPanel();
    } else if(state.role==='Organizer'){
      roleContent=organizerPanel();
    }

    return '<main><div class="eyebrow" style="margin-top:18px">MFW ID</div><h1>'+t('profileTitle')+'</h1>'+
      '<div class="profile-head"><div class="avatar"></div><div><h3>'+esc(state.name)+'</h3><div class="role">'+esc(state.role.toUpperCase())+'</div><div class="sub">Demo account</div></div></div>'+
      '<div class="pass-card"><div class="pass-top"><div><div class="pass-title">MOSCOW FASHION WEEK</div><div class="pass-role">'+esc(state.role)+' PASS · DEMO</div></div><b>01</b></div><div id="qr" class="qr" aria-label="Demo pass code"></div><div style="text-align:center;font-size:10px;font-weight:800;margin-top:-10px;margin-bottom:14px" id="pass-authority">Requesting server-signed pass…</div><div class="pass-top"><div><b>26 SEP — 01 OCT</b><div style="font-size:11px;margin-top:5px">Entitlements: '+entitlementText()+'</div></div><div class="offline"><span class="okdot"></span> Offline ready</div></div></div>'+
      '<h2>Demo role</h2><div class="role-switcher">'+['Visitor','Buyer','Media','Designer','Organizer','Staff'].map(function(r){return '<button class="role-btn '+(state.role===r?'active':'')+'" data-role="'+r+'">'+r+'</button>';}).join('')+'</div>'+
      '<div class="stat-grid"><div class="stat"><b>'+state.myEvents.length+'</b><small>'+t('events')+'</small></div><div class="stat"><b>'+state.savedLooks.length+'</b><small>'+t('looks')+'</small></div><div class="stat"><b>'+state.connections+'</b><small>'+t('contacts')+'</small></div></div>'+
      '<div class="world-feature-grid"><button data-action="contact-qr"><span>⌁</span><b>'+t('connectQr')+'</b></button><button data-action="boards"><span>◫</span><b>'+t('boards')+'</b></button><button data-action="meetups"><span>◎</span><b>'+t('meetups')+'</b></button><button data-action="perks"><span>✦</span><b>'+t('perks')+'</b></button><button data-action="mfw-365"><span>365</span><b>'+t('brand365')+'</b></button><button data-action="brand-loyalty" data-id="b1"><span>−10%</span><b>'+t('club')+'</b></button></div>'+
      roleContent+
      '<h2>'+t('passport')+'</h2><div class="progress"><span style="width:60%"></span></div><div class="passport" style="margin-top:10px"><div class="stamp done"><div class="symbol">✓</div><b>Первый показ</b><div class="sub">Получено</div></div><div class="stamp done"><div class="symbol">◇</div><b>Открыть бренд</b><div class="sub">Получено</div></div><div class="stamp"><div class="symbol">□</div><b>Fashion Film</b><div class="sub">Ещё не получено</div></div><div class="stamp done"><div class="symbol">◎</div><b>Лекция</b><div class="sub">Получено</div></div></div>'+
      '<h2>'+t('settings')+'</h2><div class="card"><div class="event" style="grid-template-columns:1fr auto;padding-top:0"><div><h3>'+t('notifications')+'</h3><div class="meta">'+T('Критические · LIVE · персональные','Critical · LIVE · personal')+'</div></div><span class="badge open">ON</span></div><div class="language-setting"><span>'+t('language')+'</span><button class="action ghost" data-action="toggle-lang">'+(state.lang==='ru'?'RU → EN':'EN → RU')+'</button></div><div class="language-setting"><span>Push / APNs</span><button class="action ghost" data-action="native-push">'+T('Подключить','Enable')+'</button></div><div class="language-setting"><span>MFW 365 push</span><button class="action ghost" data-action="notification-preferences">'+T('Настроить','Configure')+'</button></div><button class="action ghost" data-action="restart-onboarding">'+T('Перезапустить onboarding','Restart onboarding')+'</button></div>'+
    '</main>';
  }

  function entitlementText(){
    if(state.role==='Buyer') return 'Showroom · B2B · selected shows';
    if(state.role==='Media') return 'Media · Press Zone · selected shows';
    if(state.role==='Designer') return 'Backstage · Brand Zone · assigned show';
    if(state.role==='Staff') return 'Gate · Operations';
    if(state.role==='Organizer') return 'Programme · Access · Content · Analytics';
    return 'Public programme · registered events';
  }

  function buyerPanel(){
    var shortlist=state.buyerShortlist||[];
    return '<h2>Buyer workspace</h2>'+
      '<div class="buyer-workspace-hero"><div><div class="eyebrow">BUYER MODE</div><b>От интереса<br>к заказу.</b><p>Shortlist → line sheet → meeting → follow-up.</p></div><span>'+shortlist.length+'</span></div>'+
      '<div class="card"><div class="eyebrow">SHORTLIST · SERVER</div><div class="event-name">'+(shortlist.length?shortlist.length+' бренда сохранено':'Добавьте первый бренд')+'</div>'+
      '<div class="buyer-shortlist">'+(shortlist.length?shortlist.map(function(b){return '<button data-action="brand" data-id="'+esc(b.id)+'"><b>'+esc(b.name)+'</b><span>'+esc(b.city||'')+'</span></button>';}).join(''):'<div class="premium-empty"><div class="symbol">◇</div><b>Shortlist пуст</b><p>Откройте бренд и добавьте его для коммерческой работы.</p></div>')+'</div></div>'+
      '<div class="card"><div class="eyebrow">MEETING</div><div class="event-name">'+(state.meeting?'14:30 · MFW / NEW 01':'Запросить встречу')+'</div><div class="sub">'+(state.meeting?'Showroom Meeting Point 4 · подтверждено':'Выберите бренд и доступный слот.')+'</div><button class="action '+(state.meeting?'ghost':'primary')+'" data-action="meeting">'+(state.meeting?'Добавить private note':'Выбрать слот')+'</button></div>';
  }

  function organizerPanel(){
    return '<h2>Organizer cockpit</h2>'+
      '<div class="card"><div class="event-top"><div><div class="eyebrow">SYSTEM AUTHORITY</div><div class="event-name">MFW Authority</div><div class="sub">ES256 pass · check-in · CMS · accreditation · live operations</div></div><span id="backend-status" class="badge">CHECKING</span></div><div class="action-row"><button class="action primary" data-action="admin-console">Открыть Admin Console</button></div></div>'+
      '<div class="value-grid" style="margin-top:10px"><div class="value-card"><div class="n">8.4K</div><small>demo active users today</small></div><div class="value-card"><div class="n">71%</div><small>demo programme engagement</small></div><div class="value-card"><div class="n">312</div><small>demo buyer actions</small></div></div>'+
      '<div class="commercial-card"><div class="eyebrow">PARTNER VALUE · DEMO METRICS</div><div class="event-name">Из показа — в измеримый результат</div><div class="metric-row"><b>Sponsored LIVE reach</b><strong>24.8K</strong></div><div class="metric-row"><b>Brand profile opens</b><strong>6.1K</strong></div><div class="metric-row"><b>Saved looks</b><strong>1.9K</strong></div><div class="metric-row"><b>Shop / showroom intent</b><strong>487</strong></div></div>'+
      '<div class="card"><div class="eyebrow">WHY THIS SELLS</div><div class="event-name">Один слой данных для всего события</div><div class="sub">Регистрация → доступ → посещение → просмотр → сохранение → встреча → лид → отчёт партнёру.</div><div class="action-row"><button class="action ghost" data-action="investor-tour">Investor tour</button></div></div>';
  }

  function staffPanel(){
    var result='';
    if(state.scannerState==='valid') result='<div class="access-result valid">CHECK-IN ACCEPTED</div><div class="sub" style="margin-top:8px">'+esc(state.scannerReason||'ES256 + entitlement accepted')+'</div>';
    if(state.scannerState==='offline') result='<div class="access-result valid">OFFLINE VALID</div><div class="sub" style="margin-top:8px">'+esc(state.scannerReason||'signature verified on device')+'</div>';
    if(state.scannerState==='duplicate') result='<div class="access-result no" style="background:#3b2d12;color:#ffe08a">DUPLICATE CHECK-IN</div><div class="sub" style="margin-top:8px">'+esc(state.scannerReason||'already checked in')+'</div>';
    if(state.scannerState==='no') result='<div class="access-result no">ACCESS REJECTED</div><div class="sub" style="margin-top:8px">'+esc(state.scannerReason||'invalid pass')+'</div>';
    return '<h2>Gate scanner</h2>'+
      '<div class="scanner" data-action="camera-scan"></div>'+result+
      '<div class="action-row"><button class="action primary" data-action="camera-scan">Открыть камеру</button><label class="action ghost file-scan">Фото QR<input id="qr-file" type="file" accept="image/*" capture="environment"></label></div>'+
      '<div class="action-row"><button class="action ghost" data-action="checkin-current">Check-in текущего pass</button><button class="action ghost" data-action="checkin-current">Повторить → duplicate</button></div>'+
      '<div class="action-row"><button class="action ghost" data-action="offline-current">Offline verify</button><button class="action danger" data-action="tamper-current">Tampered</button></div>'+
      '<div class="action-row"><button class="action danger" data-action="test-revoked">Проверить revoked pass</button></div>'+
      '<div class="demo-note"><b>Authority.</b> ES256 signature · 2-minute rotating token · cached public key · cached revocation delta · server duplicate check-in.</div>';
  }

  function render(){
    var app=document.getElementById('app');
    if(!state.openingSeen){
      app.innerHTML=openingExperience();
      bind();
      return;
    }
    if(!state.onboarding){
      app.innerHTML=onboarding();
      bind();
      return;
    }
    var screen=state.tab==='today'?today():state.tab==='schedule'?schedule():state.tab==='live'?live():state.tab==='discover'?discover():me();
    if(state.tab==='live')loadStreamAuthority();
    else if(streamPollTimer){clearTimeout(streamPollTimer);streamPollTimer=null;}
    app.innerHTML='<div class="app">'+topbar()+screen+nav()+'</div>';
    if(state.tab==='me'){ ensurePass(); updateBackendIndicator(); }
    bind();
  }

  function onboarding(){
    return '<div class="app"><main style="padding-top:48px"><div class="onboarding-lang"><button class="lang-toggle" data-action="toggle-lang">'+(state.lang==='ru'?'RU / EN':'EN / RU')+'</button></div><div class="eyebrow">MOSCOW FASHION WEEK · CONCEPT DEMO</div><h1>'+T('ОДИН ID.<br>ВСЯ НЕДЕЛЯ<br>МОДЫ.','ONE ID.<br>THE WHOLE<br>FASHION WEEK.')+'</h1><p class="sub">'+T('Показы, пропуск, LIVE, бренды, networking и личная программа — в одном мобильном опыте.','Shows, pass, LIVE, brands, networking and your schedule — in one mobile experience.')+'</p>'+demoNote()+
      '<div class="card" style="margin-top:24px"><label class="eyebrow">'+T('Ваше имя','Your name')+'</label><input id="onboard-name" class="input" style="margin-top:8px" value="'+esc(state.name)+'" /><div class="eyebrow" style="margin-top:18px">'+T('Роль для демо','Demo role')+'</div><div class="role-switcher">'+['Visitor','Buyer','Media','Designer'].map(function(r){return '<button class="role-btn '+(state.role===r?'active':'')+'" data-onboard-role="'+r+'">'+r+'</button>';}).join('')+'</div><div class="eyebrow" style="margin-top:18px">'+T('Интересы','Interests')+'</div><div class="filters" style="margin-left:0;margin-right:0;padding:0">'+['Russian design','Luxury','Emerging','Retail','Technology'].map(function(x,i){return '<button class="chip '+(i<3?'active':'')+'">'+x+'</button>';}).join('')+'</div><button class="action primary" style="width:100%;margin-top:12px" data-action="finish-onboarding">'+T('Войти в MFW','Enter MFW')+'</button></div>'+
      '<p class="sub" style="font-size:11px;margin-top:16px">'+T('Продолжая, вы видите демонстрационный интерфейс. Реальные согласия и обработка данных будут подключаться отдельными юридическими сущностями.','This is a concept demo. Production consent and personal-data processing will use dedicated legal flows.')+'</p></main></div>';
  }

  function b64urlBytes(v){
    v=v.replace(/-/g,'+').replace(/_/g,'/');
    while(v.length%4)v+='=';
    var raw=atob(v),out=new Uint8Array(raw.length);
    for(var i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);
    return out;
  }

  function decodePayload(token){
    try{
      var p=token.split('.')[1];
      return JSON.parse(new TextDecoder().decode(b64urlBytes(p)));
    }catch(_){return null;}
  }

  async function verifyOfflineToken(token){
    token=String(token||'').replace(/^MFW:/,'');
    var jwk;
    try{jwk=JSON.parse(localStorage.getItem('mfwAuthorityJwk')||'null');}catch(_){}
    if(!jwk)return {ok:false,reason:'public_key_not_cached'};
    var parts=token.split('.');
    if(parts.length!==3)return {ok:false,reason:'malformed'};
    var payload=decodePayload(token);
    if(!payload)return {ok:false,reason:'bad_payload'};
    if(payload.exp&&Date.now()>=payload.exp)return {ok:false,reason:'expired',payload:payload};
    try{
      var key=await crypto.subtle.importKey('jwk',jwk,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
      var data=new TextEncoder().encode(parts[0]+'.'+parts[1]);
      var ok=await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,b64urlBytes(parts[2]),data);
      if(!ok)return {ok:false,reason:'bad_signature',payload:payload};
      var rev=[];try{rev=JSON.parse(localStorage.getItem('mfwRevocations')||'[]');}catch(_){}
      if(rev.some(function(x){return x.jti===payload.jti;}))return {ok:false,reason:'revoked_cached',payload:payload};
      return {ok:true,payload:payload};
    }catch(_){return {ok:false,reason:'offline_crypto_error',payload:payload};}
  }

  function openEvent(id){
    var e=demoEvents.filter(function(x){return x.id===id;})[0]; if(!e)return;
    var mine=state.myEvents.indexOf(id)>=0;
    openSheet('<div class="eyebrow">'+esc(e.dateRu||'')+' · '+e.time+' · '+esc(eventField(e,'type'))+' · '+esc(e.format||'')+'</div><h1 style="font-size:42px">'+esc(eventField(e,'name'))+'</h1><p class="sub">'+esc(eventField(e,'venue'))+' · '+esc(eventField(e,'access'))+'</p>'+badge(e.status)+'<div class="action-row">'+eventPrimaryAction(e,mine)+'<button class="action ghost" data-action="route">'+t('route')+'</button></div><h2>'+T('Доступ','Access')+'</h2><div class="card"><b>Credential → Entitlement → Event</b><p class="sub">'+T('Решение о входе принимает серверная модель прав, а не название роли пользователя.','Admission is decided by server-side entitlements, not by the user’s role label.')+'</p></div>');
  }

  async function toggleFavoriteBrand(id){
    var i=state.favoriteBrands.indexOf(id),favorite=i<0;
    if(favorite)state.favoriteBrands.push(id);else state.favoriteBrands.splice(i,1);
    persist();
    try{
      await userApi('/v1/brands/'+encodeURIComponent(id)+'/favorite',{method:'POST',body:JSON.stringify({action:favorite?'save':'remove'})});
      toast(favorite?T('Бренд добавлен в любимые','Brand added to favorites'):T('Убрано из любимых','Removed from favorites'));
    }catch(_){
      toast(T('Изменение сохранено локально — сервер временно недоступен','Saved locally — server temporarily unavailable'));
    }
    openBrand(id);
  }

  function openBrand(id){
    var b=brands.filter(function(x){return x.id===id;})[0]; if(!b)return;
    var saved=state.savedBrands.indexOf(id)>=0;
    var favorite=state.favoriteBrands.indexOf(id)>=0;
    var pro=(state.role==='Buyer'||state.role==='Media');
    var linkedShow=b.showId?demoEvents.filter(function(e){return e.id===b.showId;})[0]:null;
    openSheet('<div class="brand-editorial-hero" style="background-image:linear-gradient(180deg,transparent,rgba(0,0,0,.84)),url('+VISUALS.runway+')"><div><div class="eyebrow">'+esc(brandCity(b))+' · '+esc(b.tag)+'</div><h1>'+esc(b.name)+'</h1><p>Moscow Fashion Week · OFFICIAL</p></div></div>'+
      '<div class="brand-story"><div><div class="eyebrow">OFFICIAL PARTICIPANT</div><h2>'+T('Бренд в программе<br>Moscow Fashion Week.','Brand in the<br>Moscow Fashion Week programme.')+'</h2><p class="sub">'+esc(brandDesc(b))+'</p></div><div class="designer-portrait" style="background-image:url('+VISUALS.designer+')"><span>DESIGNER</span></div></div>'+
      '<div class="action-row"><button class="action primary" data-action="save-brand" data-id="'+b.id+'">'+(saved?'✓ '+T('Подписан в MFW','Following in MFW'):T('Подписаться в MFW','Follow in MFW'))+'</button><button class="action ghost" data-action="favorite-brand" data-id="'+b.id+'">'+(favorite?'♥ '+T('Любимый','Favorite'):'♡ '+T('В любимые','Favorite'))+'</button><button class="action ghost" data-action="brand-loyalty" data-id="'+b.id+'">✦ '+t('club')+'</button><button class="action ghost" data-action="brand-365" data-id="'+b.id+'">'+t('brand365')+'</button></div>'+
      (linkedShow?'<div class="section-head"><h2>'+T('Связанный показ','Linked show')+'</h2><span class="link">OFFICIAL</span></div><div class="card"><div class="eyebrow">'+esc(linkedShow.dateRu||'')+' · '+esc(linkedShow.time)+'</div><b>'+esc(eventField(linkedShow,'name'))+'</b><p class="sub">'+esc(eventField(linkedShow,'venue'))+' · '+esc(eventField(linkedShow,'access'))+'</p><button class="action primary" data-action="event" data-id="'+linkedShow.id+'">'+T('Открыть показ','Open show')+'</button></div>':'<div class="card"><b>'+T('Показ не привязан в текущем официальном snapshot','No linked show in the current official snapshot')+'</b></div>')+
      '<div class="brand-meta-grid"><div><span>STATUS</span><b>OFFICIAL 2026</b></div><div><span>CITY</span><b>'+esc(brandCity(b))+'</b></div><div><span>FOLLOW</span><b>'+T('Для ленты и rewards','Feed & rewards')+'</b></div></div>'+
      (pro?'<div class="buyer-commerce-card"><div><div class="eyebrow">BUYER MODE · SERVER</div><b>Из вдохновения — в коммерческий контакт.</b><p>Line sheet · shortlist · meeting · follow-up.</p></div><div class="action-row"><button class="action primary" data-action="line-sheet" data-id="'+b.id+'">Line sheet</button><button class="action light" data-action="toggle-shortlist" data-id="'+b.id+'">'+(state.buyerShortlist.some(function(x){return x.id===b.id;})?'✓ Shortlisted':'＋ Shortlist')+'</button><button class="action light" data-action="meeting">Встреча</button><button class="action ghost" data-action="buyer-followup" data-id="'+b.id+'">Follow-up</button></div></div>':''));
  }

  async function openPressKit(eventId){
    openSheet('<div class="eyebrow">MEDIA AUTHORITY</div><h1 style="font-size:42px">PRESS<br>KIT</h1><div class="card skeleton" style="height:180px"></div>');
    try{
      var out=await api('/v1/media/press-kit/'+encodeURIComponent(eventId||'e1'));
      var kit=out.data;
      var assets=(kit.assets||[]).map(function(a){return '<div class="press-asset"><div class="press-thumb" style="background-image:url('+esc(a.url)+')"></div><div><b>'+esc(a.title)+'</b><p>'+esc(a.type)+' · '+(a.approved?'APPROVED':'DRAFT')+'</p></div></div>';}).join('');
      openSheet('<div class="eyebrow">MEDIA AUTHORITY · APPROVED</div><h1 style="font-size:42px">PRESS<br>KIT</h1><div class="card"><div class="event-name">'+esc(kit.title)+'</div><p class="sub">'+esc(kit.releaseText)+'</p><div class="press-meta"><span>'+esc(kit.credits)+'</span><span>'+esc(kit.contactEmail)+'</span></div></div>'+assets+'<div class="demo-note">'+T('В production сюда входят только утверждённые файлы с правами и обязательными credits.','Production exposes only approved assets with rights and required credits.')+'</div>');
    }catch(_){toast(T('Press kit недоступен','Press kit unavailable'));}
  }

  async function brandPortalApi(brandId,path,options){
    var token=await ensureServerSession('Designer');
    var opts=options||{};
    opts.headers=Object.assign({},opts.headers||{},{Authorization:'Bearer '+token});
    return api('/v1/brand-portal/'+encodeURIComponent(brandId)+(path||''),opts);
  }

  async function openBrandPortal(brandId){
    openSheet('<div class="eyebrow">BRAND 365 STUDIO</div><h1 style="font-size:42px">'+T('ВАША<br>АУДИТОРИЯ<br>ВЕСЬ ГОД','YOUR<br>AUDIENCE<br>ALL YEAR')+'</h1><div class="card skeleton" style="height:190px"></div>');
    try{
      var out=await brandPortalApi(brandId,'/overview');
      var d=out.data||{},offers=d.offers||[],posts=d.posts||[],channels=d.channels||[],seg=d.audience&&d.audience.segments||{},ca=d.campaignAnalytics||{},funnel=ca.funnel||{},econ=d.economics||{},savedSegments=d.savedSegments||[],inc=d.incrementality&&d.incrementality.campaigns||[],life=d.lifecycle||[],journeys=d.journeys||[],pred=d.predictions&&d.predictions.customers||[],acq=d.acquisitionEconomics&&d.acquisitionEconomics.sources||[];
      var offerRows=offers.slice(0,5).map(function(o){return '<div class="brand-portal-row"><div><b>'+esc(state.lang==='ru'?o.titleRu:o.titleEn)+'</b><small>'+esc(o.rewardType)+' · '+esc(o.status)+'</small></div><span>'+esc(o.rewardValue==null?T('подарок','gift'):o.rewardValue)+'</span></div>';}).join('');
      var postRows=posts.slice(0,5).map(function(p){var canPush=!p.isPaid&&p.status==='published'&&p.audienceScope&&p.audienceScope.kind==='brand_followers';return '<div class="brand-portal-row"><div><b>'+esc(state.lang==='ru'?p.titleRu:p.titleEn)+'</b><small>'+esc(p.kind)+' · '+esc(p.status)+'</small></div><div class="brand-portal-tools"><span>'+(p.isPaid?'AD':'ORG')+'</span>'+(canPush?'<button class="action ghost compact" data-action="brand-portal-notify" data-brand="'+esc(brandId)+'" data-post="'+esc(p.id)+'">'+T('Push подписчикам','Push followers')+'</button>':'')+'</div></div>';}).join('');
      var channelRows=channels.map(function(ch){return '<div class="brand-portal-row"><div><b>'+esc(ch.platform.toUpperCase())+' · '+esc(ch.handle||ch.externalChannelId)+'</b><small>'+esc(ch.verificationMode)+'</small></div><span>'+esc(ch.status)+'</span></div>';}).join('');
      openSheet('<div class="eyebrow">BRAND 365 STUDIO · SERVER</div><h1 style="font-size:42px">'+T('СОБСТВЕННАЯ<br>АУДИТОРИЯ','OWNED<br>AUDIENCE')+'</h1>'+
        '<div class="stat-grid"><div class="stat"><b>'+esc(d.followers||0)+'</b><small>MFW followers</small></div><div class="stat"><b>'+esc(d.audience&&d.audience.verifiedSocial&&d.audience.verifiedSocial.days30Plus||0)+'</b><small>'+T('30+ дней verified','30+ verified days')+'</small></div><div class="stat"><b>'+esc((d.claims||[]).filter(function(x){return x.status==="redeemed"}).length)+'</b><small>'+T('Погашено','Redeemed')+'</small></div></div>'+
        '<div class="audience-age-grid"><div><b>'+esc(d.audience&&d.audience.buckets&&d.audience.buckets.new_0_6||0)+'</b><span>0–6 '+T('дней','days')+'</span></div><div><b>'+esc(d.audience&&d.audience.buckets&&d.audience.buckets.growing_7_29||0)+'</b><span>7–29</span></div><div><b>'+esc(d.audience&&d.audience.buckets&&d.audience.buckets.eligible_30_59||0)+'</b><span>30–59</span></div><div><b>'+esc(d.audience&&d.audience.buckets&&d.audience.buckets.loyal_60_plus||0)+'</b><span>60+</span></div></div>'+
        '<h2>'+T('CRM сегменты','CRM segments')+'</h2><div class="crm-segment-grid"><button data-action="brand-campaign" data-id="'+esc(brandId)+'" data-segment="days30Plus"><b>'+esc(seg.days30Plus||0)+'</b><span>30+</span></button><button data-action="brand-campaign" data-id="'+esc(brandId)+'" data-segment="days60Plus"><b>'+esc(seg.days60Plus||0)+'</b><span>60+</span></button><button data-action="brand-campaign" data-id="'+esc(brandId)+'" data-segment="favorite"><b>'+esc(seg.favorite||0)+'</b><span>♥ Favorite</span></button><button data-action="brand-campaign" data-id="'+esc(brandId)+'" data-segment="buyer"><b>'+esc(seg.buyer||0)+'</b><span>Buyer</span></button></div>'+
        '<h2>'+T('Сохранённые сегменты','Saved segments')+'</h2><div class="crm-saved">'+(savedSegments.length?savedSegments.slice(0,6).map(function(s){return '<span>'+esc(s.name)+'</span>'}).join(''):'<span>'+T('Создайте пересечение Buyer + Favorite + 60+','Create Buyer + Favorite + 60+ intersection')+'</span>')+'</div><button class="action ghost compact" data-action="brand-segment-power" data-id="'+esc(brandId)+'">'+T('+ Buyer ∩ Favorite ∩ 60+','+ Buyer ∩ Favorite ∩ 60+')+'</button>'+
        '<h2>'+T('Коммерческая экономика','Commercial economics')+'</h2><div class="crm-economics"><div><b>'+esc(Number(econ.aov||0).toFixed(0))+'</b><span>AOV</span></div><div><b>'+esc(Math.round(Number(econ.repeatRate||0)*100))+'%</b><span>Repeat</span></div><div><b>'+esc(Number(econ.ltv||0).toFixed(0))+'</b><span>LTV</span></div><div><b>'+esc(econ.customers||0)+'</b><span>Customers</span></div></div>'+
        '<h2>'+T('Incrementality / ROI','Incrementality / ROI')+'</h2><div class="crm-incrementality">'+(inc.length?inc.slice(0,4).map(function(x){return '<div><b>'+esc(x.name)+'</b><span>Lift '+esc(x.lift==null?'—':Math.round(x.lift*100)+'%')+' · Incremental '+esc(Number(x.incrementalRevenue||0).toFixed(0))+' '+esc(x.currency||'RUB')+' · ROI '+esc(x.roi==null?'—':Math.round(x.roi*100)+'%')+' · CAC '+esc(x.cac==null?'—':Number(x.cac).toFixed(0))+'</span></div>'}).join(''):'<div><b>'+T('Нужна treatment/control кампания','Treatment/control campaign required')+'</b></div>')+'</div>'+
        '<h2>'+T('Lifecycle / RFM','Lifecycle / RFM')+'</h2><div class="crm-lifecycle">'+(life.length?life.map(function(x){return '<span><b>'+esc(x.lifecycle)+'</b> '+esc(x.customers||0)+'</span>'}).join(''):'<span>'+T('Появится после импорта покупок','Appears after purchase import')+'</span>')+'</div>'+
        '<h2>'+T('Churn / Next Best Action','Churn / Next Best Action')+'</h2><div class="crm-incrementality">'+(pred.length?pred.slice(0,5).map(function(x){return '<div><b>'+esc(x.lifecycle)+' · '+esc(Math.round(Number(x.churn_score||0)*100))+'% risk</b><span>'+esc(x.next_best_action||'—')+' · CLV '+esc(Number(x.predicted_clv||0).toFixed(0))+'</span></div>'}).join(''):'<div><b>'+T('Обновите prediction scoring','Refresh prediction scoring')+'</b></div>')+'</div>'+
        '<h2>'+T('Acquisition economics','Acquisition economics')+'</h2><div class="crm-incrementality">'+(acq.length?acq.slice(0,5).map(function(x){return '<div><b>'+esc(x.source)+'</b><span>CAC '+esc(Number(x.cac||0).toFixed(0))+' · Revenue '+esc(Number(x.revenue||0).toFixed(0))+' · ROI '+esc(x.roi==null?'—':Math.round(Number(x.roi)*100)+'%')+'</span></div>'}).join(''):'<div><b>'+T('Нет acquisition events','No acquisition events')+'</b></div>')+'</div>'+
        '<div class="action-row"><button class="action ghost compact" data-action="brand-predictions-refresh" data-id="'+esc(brandId)+'">'+T('Обновить churn / CLV','Refresh churn / CLV')+'</button><button class="action ghost compact" data-action="brand-journeys-tick" data-id="'+esc(brandId)+'">'+T('Выполнить следующий шаг','Run next journey step')+'</button></div>'+
        '<h2>'+T('Automated journeys','Automated journeys')+'</h2><div class="crm-saved">'+(journeys.length?journeys.map(function(x){return '<span>'+esc(x.name)+' · '+esc(x.status)+'</span>'}).join(''):'<span>'+T('Нет активных сценариев','No active journeys')+'</span>')+'</div><div class="action-row"><button class="action ghost compact" data-action="brand-journey-reactivate" data-id="'+esc(brandId)+'">'+T('+ At-risk реактивация','+ At-risk reactivation')+'</button><button class="action ghost compact" data-action="brand-journeys-run" data-id="'+esc(brandId)+'">'+T('Запустить journeys','Run journeys')+'</button></div>'+
        '<h2>'+T('Воронка кампаний','Campaign funnel')+'</h2><div class="crm-funnel"><div><b>'+esc(funnel.audience||0)+'</b><span>Audience</span></div><i>→</i><div><b>'+esc(funnel.sent||0)+'</b><span>Sent</span></div><i>→</i><div><b>'+esc(funnel.visits||0)+'</b><span>Visit</span></div><i>→</i><div><b>'+esc(funnel.redeemed||0)+'</b><span>Redeem</span></div><i>→</i><div><b>'+esc(funnel.purchases||0)+'</b><span>Purchase</span></div></div><div class="crm-revenue"><span>'+T('Атрибутированная выручка','Attributed revenue')+'</span><b>'+esc(funnel.revenue||0)+' '+esc(ca.currency||'RUB')+'</b></div>'+
        '<div class="brand-portal-actions"><button class="action primary" data-action="brand-campaign" data-id="'+esc(brandId)+'" data-segment="all_followers">'+T('+ Кампания','+ Campaign')+'</button><button class="action ghost" data-action="brand-redemption-scanner" data-id="'+esc(brandId)+'">'+T('Сканер QR','QR scanner')+'</button><button class="action ghost" data-action="brand-order-import" data-id="'+esc(brandId)+'">'+T('Импорт POS','POS import')+'</button><button class="action ghost" data-action="brand-portal-news" data-id="'+esc(brandId)+'">'+T('+ Новость / фото','+ News / photo')+'</button><button class="action ghost" data-action="brand-portal-invite" data-id="'+esc(brandId)+'">'+T('+ Приглашение','+ Invitation')+'</button><button class="action ghost" data-action="brand-portal-paid" data-id="'+esc(brandId)+'">'+T('+ Реклама на MFW','+ MFW-wide ad')+'</button><button class="action ghost" data-action="brand-portal-discount" data-id="'+esc(brandId)+'">'+T('+ Скидка 10%','+ 10% reward')+'</button><button class="action ghost" data-action="brand-portal-gift" data-id="'+esc(brandId)+'">'+T('+ Подарок','+ Gift')+'</button></div>'+
        '<h2>'+T('Контент','Content')+'</h2>'+postRows+
        '<h2>'+T('Привилегии','Rewards')+'</h2>'+offerRows+
        '<h2>'+T('Соцсети бренда','Brand social channels')+'</h2>'+channelRows+
        '<div class="demo-note">'+T('Органический контент публикуется для своих подписчиков. MFW-wide реклама и новые reward-механики проходят модерацию организатора.','Organic content goes to brand followers. MFW-wide ads and new reward mechanics require organizer moderation.')+'</div>');
    }catch(err){toast(T('Brand 365 Studio недоступен','Brand 365 Studio unavailable'));}
  }

  async function refreshBrandPredictions(brandId){try{var x=await brandPortalApi(brandId,'/predictions',{method:'GET'});toast(T('Scoring обновлён: ','Scoring refreshed: ')+String(x.data.updated||0));openBrandPortal(brandId);}catch(_){toast(T('Scoring недоступен','Scoring unavailable'));}}
  async function tickBrandJourneys(brandId){try{var x=await brandPortalApi(brandId,'/journeys-tick',{method:'POST',body:'{}'});toast(T('Journey: processed ','Journey: processed ')+String(x.data.processed||0)+' · queued '+String(x.data.queued||0));openBrandPortal(brandId);}catch(_){toast(T('State machine недоступна','State machine unavailable'));}}
  async function createReactivationJourney(brandId){
    try{await brandPortalApi(brandId,'/journeys',{method:'POST',body:JSON.stringify({name:'At-risk → Reactivation',trigger:{lifecycle:'at_risk'},steps:[{type:'push',title:'Мы скучаем',body:'Новые коллекции и персональная привилегия уже в MFW.'},{type:'wait',days:7},{type:'reward',kind:'personal_offer'}],status:'active',frequencyCap:{per_user_per_30d:2},holdoutPct:10,stopConditions:{on_purchase:true}})});toast(T('Journey создан','Journey created'));openBrandPortal(brandId);}catch(_){toast(T('Journey не создан','Journey could not be created'));}
  }
  async function runBrandJourneys(brandId){try{var x=await brandPortalApi(brandId,'/journeys-run',{method:'POST',body:'{}'});toast(T('В очередь: ','Queued: ')+String(x.data.queued||0));openBrandPortal(brandId);}catch(_){toast(T('Journey engine недоступен','Journey engine unavailable'));}}
  async function createPowerSegment(brandId){
    try{await brandPortalApi(brandId,'/segments',{method:'POST',body:JSON.stringify({name:'Buyer + Favorite + 60+',definition:{op:'and',rules:[{field:'buyer',eq:true},{field:'favorite',eq:true},{field:'followDays',gte:60}]}})});toast(T('Динамический сегмент сохранён','Dynamic segment saved'));openBrandPortal(brandId);}catch(_){toast(T('Сегмент не сохранён','Segment could not be saved'));}
  }
  function openOrderImport(brandId){
    openSheet('<div class="eyebrow">BRAND CRM · POS IMPORT</div><h1 style="font-size:42px">'+T('ИМПОРТ<br>ПРОДАЖ','ORDER<br>IMPORT')+'</h1><p class="sub">'+T('Вставьте JSON-массив заказов из POS/CRM. До 1000 строк за batch.','Paste a JSON array of orders from POS/CRM. Up to 1000 rows per batch.')+'</p><textarea id="brandOrderImport" class="input crm-import" rows="8">[{"externalOrderRef":"ORDER-001","amount":15000,"currency":"RUB","locationType":"showroom","quantity":1,"skuCount":1}]</textarea><button class="action primary" data-action="brand-order-import-submit" data-id="'+esc(brandId)+'">'+T('Импортировать','Import')+'</button>');
  }
  async function submitOrderImport(brandId){
    try{var rows=JSON.parse((document.getElementById('brandOrderImport')||{}).value||'[]');var out=await brandPortalApi(brandId,'/orders-import',{method:'POST',body:JSON.stringify({source:'pos',orders:rows})});toast(T('Импортировано: ','Imported: ')+String(out.data.imported||0));openBrandPortal(brandId);}catch(_){toast(T('Ошибка формата или импорта','Invalid format or import error'));}
  }

  function openBrandCampaignBuilder(brandId,segment){
    var labels={all_followers:T('Все подписчики','All followers'),days30Plus:'30+ days',days60Plus:'60+ days',favorite:'♥ Favorite',buyer:'Buyer'};
    openSheet('<div class="eyebrow">BRAND CRM · CAMPAIGN</div><h1 style="font-size:42px">'+T('КАМПАНИЯ<br>БРЕНДА','BRAND<br>CAMPAIGN')+'</h1><div class="crm-selected-segment"><span>'+T('Сегмент','Segment')+'</span><b>'+esc(labels[segment]||segment)+'</b></div><label class="brand-compose-field"><span>'+T('Название','Name')+'</span><input id="crmCampaignName" class="input" value="'+T('Приглашение в шоурум','Showroom invitation')+'"></label><label class="brand-compose-field"><span>'+T('Сообщение','Message')+'</span><textarea id="crmCampaignMessage" class="input" rows="4">'+T('Приглашаем вас в шоурум бренда. Покажите персональный QR в приложении MFW.','We invite you to the brand showroom. Show your personal QR in the MFW app.')+'</textarea></label><label class="brand-compose-field"><span>'+T('Отправить','Send at')+'</span><input id="crmCampaignAt" class="input" type="datetime-local"></label><div class="demo-note">'+T('Marketing consent обязателен. Frequency cap: максимум 2 брендовые кампании на пользователя за 7 дней.','Marketing consent required. Frequency cap: max 2 brand campaigns per user per 7 days.')+'</div><button class="action primary" data-action="brand-campaign-submit" data-id="'+esc(brandId)+'" data-segment="'+esc(segment)+'">'+T('Создать кампанию','Create campaign')+'</button>');
  }
  async function submitBrandCampaign(brandId,segment){
    var name=(document.getElementById('crmCampaignName')||{}).value||'Campaign',msg=(document.getElementById('crmCampaignMessage')||{}).value||'',at=(document.getElementById('crmCampaignAt')||{}).value||'';
    try{var made=await brandPortalApi(brandId,'/campaigns',{method:'POST',body:JSON.stringify({name:name,campaignType:'invitation',segment:{kind:segment},channel:'push',messageRu:msg,messageEn:msg,scheduledAt:at?new Date(at).toISOString():null,frequencyCap:{per_user_per_7d:2},requireMarketingConsent:true,controlPct:10,costAmount:0,costCurrency:'RUB'})});var id=made.data&&(made.data.external_key||made.data.externalKey||made.data.id);if(id)await brandPortalApi(brandId,'/campaign-queue',{method:'POST',body:JSON.stringify({campaignId:String(id)})});toast(T('Кампания поставлена в очередь с consent и frequency cap','Campaign queued with consent and frequency cap'));openBrandPortal(brandId);}catch(_){toast(T('Кампания не создана','Campaign could not be created'));}
  }
  async function openBrandRedemptionScanner(brandId){
    if(window.MFWNative&&window.MFWNative.isNative&&window.MFWNative.isNative()){
      try{var nr=await window.MFWNative.openNativeScanner('loyalty');var nv=nr&&(nr.value||nr.data||nr.text);if(nv){await redeemBrandQr(brandId,String(nv));return;}}catch(_){}
    }
    openSheet('<div class="eyebrow">BRAND CRM · POS CAMERA</div><h1 style="font-size:42px">'+T('СКАНЕР<br>ПРОДАВЦА','SELLER<br>SCANNER')+'</h1><div class="scanner-camera"><video id="brand-redeem-video" playsinline muted></video><div class="frame"></div><div class="scan-line"></div></div><canvas id="brand-redeem-canvas" hidden></canvas><div id="brand-redeem-status" class="scan-status">'+T('Запрашиваем доступ к камере…','Requesting camera access…')+'</div><label class="brand-compose-field"><span>'+T('Резерв: QR / код вручную','Fallback: QR / code')+'</span><input id="brandRedeemCode" class="input" placeholder="MFW-LOYALTY:…"></label><button class="action ghost" data-action="brand-redeem-submit" data-id="'+esc(brandId)+'">'+T('Проверить код','Verify code')+'</button>');
    var video=document.getElementById('brand-redeem-video'),canvas=document.getElementById('brand-redeem-canvas'),status=document.getElementById('brand-redeem-status');
    try{
      scannerStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});video.srcObject=scannerStream;await video.play();status.textContent=T('Камера активна · ищем MFW Loyalty QR','Camera active · looking for MFW Loyalty QR');
      var ctx=canvas.getContext('2d',{willReadFrequently:true});
      function tick(){if(video.readyState===video.HAVE_ENOUGH_DATA){canvas.width=video.videoWidth;canvas.height=video.videoHeight;ctx.drawImage(video,0,0,canvas.width,canvas.height);var img=ctx.getImageData(0,0,canvas.width,canvas.height);var code=window.jsQR?window.jsQR(img.data,img.width,img.height,{inversionAttempts:'dontInvert'}):null;if(code&&String(code.data).startsWith('MFW-LOYALTY:')){stopCameraScanner();closeSheet();redeemBrandQr(brandId,String(code.data));return;}}scannerFrame=requestAnimationFrame(tick);}tick();
    }catch(err){status.textContent=T('Камера недоступна — используйте ввод кода','Camera unavailable — use manual code');}
  }
  async function redeemBrandQr(brandId,code){
    try{await brandPortalApi(brandId,'/redeem',{method:'POST',body:JSON.stringify({code:String(code||'').trim()})});toast(T('Привилегия погашена','Reward redeemed'));openBrandPortal(brandId);}catch(err){toast(err&&err.data&&err.data.error==='already_redeemed'?T('Этот QR уже использован','This QR was already redeemed'):T('QR не прошёл проверку','QR verification failed'));}
  }
  async function submitBrandRedemption(brandId){var code=(document.getElementById('brandRedeemCode')||{}).value||'';if(!code.trim()){toast(T('Отсканируйте QR или введите код','Scan QR or enter code'));return;}redeemBrandQr(brandId,code);}


  async function brandPortalNotify(brandId,postId){
    try{
      var out=await brandPortalApi(brandId,'/notify',{method:'POST',body:JSON.stringify({postId:postId})});
      toast(T('Push поставлен в очередь подписчикам бренда','Push queued for brand followers'));
      openBrandPortal(brandId);
    }catch(err){
      if(err&&err.data&&err.data.error==='brand_push_frequency_cap')toast(T('Лимит: не более 2 брендовых push за 7 дней','Limit: max 2 brand pushes per 7 days'));
      else toast(T('Push не создан','Push could not be created'));
    }
  }

  function openBrandComposer(brandId){
    openSheet('<div class="eyebrow">BRAND 365 · BLOG</div><h1 style="font-size:42px">'+T('НОВОСТЬ<br>БРЕНДА','BRAND<br>POST')+'</h1>'+
      '<label class="brand-compose-field"><span>'+T('Заголовок','Title')+'</span><input id="brandPostTitle" class="input" maxlength="120" placeholder="'+T('Новая коллекция / событие','New collection / event')+'"></label>'+
      '<label class="brand-compose-field"><span>'+T('Текст','Copy')+'</span><textarea id="brandPostBody" class="input" rows="5" maxlength="1200" placeholder="'+T('Расскажите подписчикам, что нового','Tell followers what is new')+'"></textarea></label>'+
      '<label class="brand-compose-field"><span>'+T('Фото · URL','Photo · URL')+'</span><input id="brandPostImage" class="input" inputmode="url" placeholder="https://…"></label>'+
      '<div class="demo-note">'+T('Органическая публикация видна подписчикам бренда. Платное расширение охвата остаётся отдельным модерируемым продуктом.','Organic posts are shown to brand followers. Paid reach remains a separate moderated product.')+'</div>'+
      '<button class="action primary" data-action="brand-portal-compose-submit" data-id="'+esc(brandId)+'">'+T('Опубликовать','Publish')+'</button>');
  }
  async function submitBrandComposer(brandId){
    var title=(document.getElementById('brandPostTitle')||{}).value||'';
    var body=(document.getElementById('brandPostBody')||{}).value||'';
    var image=(document.getElementById('brandPostImage')||{}).value||'';
    if(!title.trim()){toast(T('Добавьте заголовок','Add a title'));return;}
    try{
      await brandPortalApi(brandId,'/content',{method:'POST',body:JSON.stringify({
        kind:'news',titleRu:title.trim(),titleEn:title.trim(),bodyRu:body.trim(),bodyEn:body.trim(),imageUrl:image.trim(),
        ctaLabelRu:'Открыть бренд',ctaLabelEn:'Open brand',ctaUrl:'#brand-'+brandId,
        audienceScope:{kind:'brand_followers'},placementScope:['brand_profile','discover_feed'],isPaid:false
      })});
      toast(T('Новость опубликована в блоге бренда','Post published to the brand blog'));openBrandPortal(brandId);
    }catch(_){toast(T('Публикация не создана','Could not publish post'));}
  }

  async function brandPortalInvite(brandId){
    try{
      var out=await brandPortalApi(brandId,'/content',{method:'POST',body:JSON.stringify({
        kind:'event',
        titleRu:'Приглашение для подписчиков бренда',
        titleEn:'Invitation for brand followers',
        bodyRu:'Закрытое приглашение для аудитории бренда внутри MFW.',
        bodyEn:'Private invitation for the brand audience inside MFW.',
        audienceScope:{kind:'brand_followers'},
        placementScope:['brand_profile','discover_feed'],
        isPaid:false
      })});
      var post=out.data||{};
      if(post.id)await brandPortalApi(brandId,'/notify',{method:'POST',body:JSON.stringify({postId:post.id})});
      toast(T('Приглашение опубликовано и поставлено в очередь подписчикам','Invitation published and queued for followers'));
      openBrandPortal(brandId);
    }catch(_){toast(T('Приглашение не создано','Could not create invitation'));}
  }

  async function brandPortalPublish(brandId,paid){
    try{
      await brandPortalApi(brandId,'/content',{method:'POST',body:JSON.stringify({
        kind:paid?'campaign':'news',
        titleRu:paid?'Новая рекламная кампания бренда':'Новости бренда для подписчиков',
        titleEn:paid?'New brand campaign':'Brand news for followers',
        bodyRu:paid?'Платное размещение для аудитории MFW после модерации.':'Органическая публикация для тех, кто подписан на бренд внутри MFW.',
        bodyEn:paid?'Paid placement for the MFW audience after moderation.':'Organic update for people following the brand inside MFW.',
        audienceScope:{kind:paid?'all_mfw':'brand_followers'},
        placementScope:paid?['discover_feed','today']:['brand_profile','discover_feed'],
        isPaid:!!paid
      })});
      toast(paid?T('Кампания отправлена на модерацию','Campaign sent for review'):T('Новость опубликована подписчикам','News published to followers'));
      openBrandPortal(brandId);
    }catch(_){toast(T('Публикация не создана','Could not create post'));}
  }

  async function brandPortalCreateOffer(brandId,kind){
    try{
      var gift=kind==='gift';
      await brandPortalApi(brandId,'/offers',{method:'POST',body:JSON.stringify({
        titleRu:gift?'Подарок постоянному подписчику':'−10% после 30 дней',
        titleEn:gift?'Gift for a loyal follower':'10% off after 30 days',
        descriptionRu:gift?'Подарок после подтверждённой подписки на бренд 45 дней.':'Скидка после подтверждённых подписок на MFW и бренд в течение 30 дней.',
        descriptionEn:gift?'Gift after 45 verified days following the brand.':'Discount after 30 verified days following MFW and the brand.',
        rewardType:gift?'gift':'discount_percent',
        rewardValue:gift?null:10,
        minContinuousDays:gift?45:30,
        stockLimit:gift?100:1000,
        requirements:gift
          ?[{type:'brand_follow_in_mfw',required:true,minContinuousDays:0},{type:'brand_social_follow',channelId:'sc_b1_tg',required:true,minContinuousDays:45}]
          :[{type:'registered_user',required:true,minContinuousDays:0},{type:'app_installed',required:true,minContinuousDays:0},{type:'mfw_social_follow',channelId:'sc_mfw_tg',required:true,minContinuousDays:30},{type:'brand_social_follow',channelId:'sc_b1_tg',required:true,minContinuousDays:30}]
      })});
      toast(T('Новая механика отправлена на модерацию','New reward sent for review'));
      openBrandPortal(brandId);
    }catch(_){toast(T('Не удалось создать механику','Could not create reward'));}
  }

  async function openDesignerWorkspace(brandId){
    openSheet('<div class="eyebrow">DESIGNER WORKSPACE</div><h1 style="font-size:42px">COLLECTION<br>READINESS</h1><div class="card skeleton" style="height:180px"></div>');
    try{
      var out=await api('/v1/designer/workspace/'+encodeURIComponent(brandId||'b1'));
      var d=out.data,r=d.readiness||{},a=d.analytics||{};
      var issues=(r.issues||[]).map(function(x){return '<div class="readiness-issue">! '+esc(x)+'</div>';}).join('');
      openSheet('<div class="eyebrow">DESIGNER WORKSPACE · SERVER</div><h1 style="font-size:42px">'+esc(d.collection&&d.collection.season||'SS27')+'<br>'+esc(d.collection&&d.collection.title||'COLLECTION')+'</h1>'+
        '<div class="readiness-grid"><div class="'+(r.profileComplete?'done':'')+'"><span>01</span><b>'+T('Профиль','Profile')+'</b></div><div class="'+(r.lookOrderComplete?'done':'')+'"><span>02</span><b>Look order</b></div><div class="'+(r.mediaComplete?'done':'')+'"><span>03</span><b>Media</b></div><div class="'+(r.commercialDataComplete?'done':'')+'"><span>04</span><b>'+T('Коммерция','Commercial')+'</b></div></div>'+
        issues+
        '<div class="stat-grid"><div class="stat"><b>'+esc(a.profileViews||0)+'</b><small>Views</small></div><div class="stat"><b>'+esc(a.savedLooks||0)+'</b><small>Saves</small></div><div class="stat"><b>'+esc(a.buyerInterest||0)+'</b><small>Buyer interest</small></div></div>'+
        '<div class="action-row"><button class="action primary" data-action="designer-look-order" data-id="'+esc(brandId||'b1')+'">'+T('Подтвердить look order','Confirm look order')+'</button><button class="action ghost" data-action="designer-commercial" data-id="'+esc(brandId||'b1')+'">'+T('Подтвердить коммерческие данные','Confirm commercial data')+'</button></div>');
    }catch(_){toast(T('Designer workspace недоступен','Designer workspace unavailable'));}
  }

  async function designerAction(brandId,kind){
    try{
      await api('/v1/designer/workspace/'+encodeURIComponent(brandId)+'/'+(kind==='look'?'complete-look-order':'confirm-commercial'),{method:'POST',body:JSON.stringify({userId:state.userId||'demo_designer'})});
      toast(kind==='look'?T('Look order подтверждён','Look order confirmed'):T('Коммерческие данные подтверждены','Commercial data confirmed'));
      openDesignerWorkspace(brandId);
    }catch(_){toast(T('Не удалось обновить готовность','Could not update readiness'));}
  }

  function questions(){
    openSheet('<div class="eyebrow">LIVE Q&A · DEMO</div><h1 style="font-size:42px">ВОПРОСЫ<br>СПИКЕРУ</h1><div class="question"><button class="vote" data-action="upvote">▲ 127</button><b>Что байер оценивает в первые пять минут встречи?</b></div><div class="question"><button class="vote" data-action="upvote">▲ 84</button><b>Какие ошибки чаще всего мешают бренду получить заказ?</b></div><input class="input" style="margin-top:16px" placeholder="Ваш вопрос" /><button class="action primary" style="margin-top:10px" data-action="toast" data-message="Вопрос отправлен модератору">Отправить</button>');
  }

  function investorTour(){
    openSheet('<div class="kicker">Investor tour · 3 minutes</div><h1 style="font-size:42px">ПОКАЖИТЕ<br>НЕ ЭКРАНЫ,<br>А БИЗНЕС</h1>'+
      '<div class="demo-step"><span class="step-num">1</span><b>Audience experience</b><p>Откройте Today → LIVE → сохраните образ. Покажите, что трансляция превращается в структурированный fashion content.</p></div>'+
      '<div class="demo-step"><span class="step-num">2</span><b>Access authority</b><p>Откройте QR в профиле: роль и право входа разделены, пропуск готов к offline-проверке.</p></div>'+
      '<div class="demo-step"><span class="step-num">3</span><b>Buyer commerce</b><p>Переключите роль на Buyer → бренд → line sheet → meeting slot → private follow-up.</p></div>'+
      '<div class="demo-step"><span class="step-num">4</span><b>Organizer control</b><p>Переключите роль на Organizer: capacity, waitlist, push и partner-value analytics в одном cockpit.</p></div>'+
      '<div class="demo-step"><span class="step-num">5</span><b>Scale story</b><p>Объяснение инвестору: текущий стенд — front-end proof. Production подключает MFW ID, PostgreSQL, signed pass, CMS, streaming и analytics без смены UX-модели.</p></div>'+
      '<div class="phone-hint"><div class="symbol">＋</div><div><b>Для показа на iPhone</b><p>Откройте сайт в Safari → Поделиться → На экран «Домой». PWA запускается как отдельное приложение без браузерной панели.</p></div></div>'+
      '<div class="action-row"><button class="action primary" data-action="tour-start">Начать с Visitor</button><button class="action ghost" data-action="tour-organizer">Сразу Organizer</button></div>');
  }

  function postShowRecap(){
    openSheet('<div class="recap-hero" style="background-image:linear-gradient(180deg,rgba(0,0,0,.1),rgba(0,0,0,.88)),url('+VISUALS.street+')"><div><div class="eyebrow">YOUR MFW · DAY 1</div><h1>ВАШ ДЕНЬ<br>В МОДЕ.</h1><p>Персональный recap после завершения программы.</p></div></div>'+
      '<div class="recap-stats"><div><b>'+state.myEvents.length+'</b><span>события</span></div><div><b>'+state.savedLooks.length+'</b><span>looks</span></div><div><b>'+state.savedBrands.length+'</b><span>brands</span></div><div><b>'+state.connections+'</b><span>contacts</span></div></div>'+
      '<div class="section-head"><h2>Вы сохранили</h2><span class="link">Сегодня</span></div><div class="visual-look-rail">'+[11,14,15].map(function(n){return '<div class="visual-look">'+lookVisual(n)+'</div>';}).join('')+'</div>'+
      '<div class="card premium-card"><div class="eyebrow">TOMORROW FOR YOU</div><div class="event-name">New Russian Names · 12:00</div><div class="sub">Рекомендация на основе сохранённых вами образов и брендов.</div><button class="action primary" data-action="toast" data-message="Добавлено в программу">Добавить на завтра</button></div>');
  }

  function recordSponsorInteraction(type,placementId){
    api('/v1/sponsor/interactions',{method:'POST',body:JSON.stringify({
      campaignId:'cmp1',
      placementId:placementId||'pl1',
      userId:state.userId||'anonymous',
      interactionType:type,
      meta:{role:state.role,tab:state.tab}
    })}).catch(function(){});
  }

  function sponsorExperience(){
    recordSponsorInteraction('open','pl1');
    openSheet('<div class="sponsor-experience" style="background-image:linear-gradient(180deg,rgba(0,0,0,.14),rgba(0,0,0,.9)),url('+VISUALS.backstage+')"><div class="eyebrow">NATIVE PARTNER EXPERIENCE · DEMO</div><h1>БРЕНД<br>ВНУТРИ<br>СОБЫТИЯ.</h1><p>Не баннер, а отдельный fashion experience: backstage story, challenge, lounge, gift, AR/try-on и измеримый переход к бренду.</p><div class="sponsor-metrics"><span>24.8K reach</span><span>6.1K opens</span><span>487 intent</span></div><div class="action-row"><button class="action light" data-action="sponsor-challenge">Fashion challenge</button><button class="action primary" data-action="sponsor-cta">Открыть партнёра</button></div></div>');
  }

  function sponsorChallenge(){
    recordSponsorInteraction('challenge_start','pl2');
    openSheet('<div class="eyebrow">FASHION PASSPORT · PARTNER</div><h1 style="font-size:44px">BACKSTAGE<br>CHALLENGE</h1><div class="card premium-card"><div class="event-name">3 шага</div><div class="sub">Посмотрите backstage → сохраните look → откройте бренд-партнёр.</div><div class="action-row"><button class="action primary" data-action="sponsor-cta">Завершить challenge</button></div></div><div class="demo-note">В production reward может быть доступ в lounge, подарок, priority registration или digital collectible.</div>');
  }

  function sponsorCta(){
    recordSponsorInteraction('cta_click','pl1');
    toast('Partner intent recorded');
    track('sponsor_cta',{campaignId:'cmp1'});
  }

  async function notificationPreferences(){
    openSheet('<div class="eyebrow">MFW 365 · NOTIFICATIONS</div><h1 style="font-size:42px">'+T('ЧТО<br>ВАМ<br>ПРИСЫЛАТЬ','WHAT<br>TO<br>SEND YOU')+'</h1><div class="card skeleton" style="height:180px"></div>');
    try{
      var out=await userApi('/v1/notifications/preferences?userId='+encodeURIComponent(state.userId||'demo_user'));
      var p=out.data||{};
      function row(key,label,value){
        return '<div class="notification-pref"><div><b>'+label+'</b><small>'+(value?T('Включено','On'):T('Выключено','Off'))+'</small></div><button class="action '+(value?'primary':'ghost')+' compact" data-action="notification-pref-toggle" data-key="'+key+'" data-value="'+(value?'0':'1')+'">'+(value?'ON':'OFF')+'</button></div>';
      }
      openSheet('<div class="eyebrow">MFW 365 · NOTIFICATIONS</div><h1 style="font-size:42px">'+T('КОНТРОЛЬ<br>У ВАС','YOU<br>CONTROL IT')+'</h1>'+
        row('followedBrandNewsEnabled',T('Новости брендов, на которые я подписан','News from brands I follow'),!!p.followedBrandNewsEnabled)+
        row('loyaltyEnabled',T('Скидки и подарки','Discounts and gifts'),!!p.loyaltyEnabled)+
        row('brandEventsEnabled',T('События брендов','Brand events'),!!p.brandEventsEnabled)+
        row('paidPromotionsEnabled',T('Рекламные push MFW','Paid promotional pushes'),!!p.paidPromotionsEnabled)+
        '<div class="demo-note">'+T('Критические изменения программы и безопасности не смешиваются с рекламными сообщениями. Рекламные push выключены по умолчанию.','Critical programme and safety updates are separate from marketing. Paid promotional pushes are off by default.')+'</div>');
    }catch(_){toast(T('Настройки уведомлений недоступны','Notification settings unavailable'));}
  }

  async function toggleNotificationPreference(key,value){
    try{
      var body={userId:state.userId||'demo_user'};body[key]=value==='1';
      await userApi('/v1/notifications/preferences',{method:'PATCH',body:JSON.stringify(body)});
      notificationPreferences();
    }catch(_){toast(T('Не удалось сохранить настройку','Could not save preference'));}
  }

  async function notifications(){
    openSheet('<div class="eyebrow">Notification center</div><h1 style="font-size:42px">'+T('УВЕДОМЛЕНИЯ','NOTIFICATIONS')+'</h1><div class="card skeleton" style="height:150px"></div>');
    try{
      var out=await userApi('/v1/notifications?userId='+encodeURIComponent(state.userId||'demo_user'));
      var items=out.data||[];
      var html=items.length?items.map(function(n){return '<div class="card"><div class="eyebrow">'+esc(String(n.category||'update').toUpperCase())+'</div><b>'+esc(n.title||'MFW')+'</b><p class="sub">'+esc(n.body||'')+'</p></div>';}).join(''):'<div class="premium-empty"><b>'+T('Сейчас всё спокойно','Nothing needs your attention')+'</b><p>'+T('Здесь появятся изменения программы, LIVE и новости брендов по вашим настройкам.','Programme changes, LIVE and followed-brand updates appear here according to your preferences.')+'</p></div>';
      openSheet('<div class="eyebrow">Notification center</div><h1 style="font-size:42px">'+T('УВЕДОМЛЕНИЯ','NOTIFICATIONS')+'</h1>'+html+'<button class="action ghost" data-action="notification-preferences">'+T('Настроить MFW 365 push','Configure MFW 365 push')+'</button>');
    }catch(_){toast(T('Уведомления недоступны','Notifications unavailable'));}
  }

  function openSheet(html){
    closeSheet();
    var wrap=document.createElement('div');wrap.className='modal';wrap.id='modal';
    wrap.innerHTML='<div class="sheet"><div class="sheet-head"><div class="eyebrow">MFW</div><button class="close" data-action="close">×</button></div>'+html+'</div>';
    document.body.appendChild(wrap);bind();
  }
  function closeSheet(){
    stopCameraScanner();
    var m=document.getElementById('modal');if(m)m.remove();
  }

  function softHaptic(){
    document.documentElement.classList.remove('tap-feedback');
    void document.documentElement.offsetWidth;
    document.documentElement.classList.add('tap-feedback');
    if(window.MFWNative&&window.MFWNative.isNative&&window.MFWNative.isNative()){
      window.MFWNative.haptic('light').catch(function(){});
    }else if(navigator.vibrate){
      navigator.vibrate(8);
    }
  }

  function toast(msg){
    var old=document.querySelector('.toast');if(old)old.remove();
    var t=document.createElement('div');t.className='toast';t.textContent=msg;document.body.appendChild(t);
    setTimeout(function(){if(t.parentNode)t.remove();},1800);
  }

  function setRole(r){state.role=r;state.session=null;state.sessionRole=null;state.passToken=null;state.passPayload=null;state.buyerShortlist=[];state.commerceLoaded=false;persist();render();toast('Demo role: '+r);track('role_switched',{role:r});}
  async function toggleEvent(id){
    var i=state.myEvents.indexOf(id);
    try{
      if(i>=0){
        await userApi('/v1/events/'+encodeURIComponent(id)+'/cancel',{method:'POST',body:JSON.stringify({registrationType:'visitor'})});
        state.myEvents.splice(i,1);toast(T('Удалено из программы','Removed from schedule'));
      }else{
        var out=await userApi('/v1/events/'+encodeURIComponent(id)+'/register',{method:'POST',body:JSON.stringify({registrationType:'visitor'})});
        state.myEvents.push(id);toast(out.data.status==='waitlist'?T('Вы добавлены в лист ожидания','Added to waitlist'):T('Регистрация подтверждена','Registration confirmed'));
      }
      persist();closeSheet();render();track(i>=0?'event_removed':'event_registered',{eventId:id});
    }catch(err){
      if(err&&err.data&&err.data.error==='invitation_required'){
        toast(T('Доступ только по приглашению','Invitation required'));
      }else{
        toast(T('Регистрация временно недоступна','Registration temporarily unavailable'));
      }
    }
  }
  function saveLook(id){
    var i=state.savedLooks.indexOf(id);
    if(i>=0){state.savedLooks.splice(i,1);toast('Образ удалён из сохранённых');}
    else{state.savedLooks.push(id);toast('Образ сохранён');}
    persist();render();track(i>=0?'look_unsaved':'look_saved',{lookId:id});
  }
  async function saveBrand(id){
    var i=state.savedBrands.indexOf(id);
    var following=i<0;
    if(following)state.savedBrands.push(id);else state.savedBrands.splice(i,1);
    persist();
    try{
      await userApi('/v1/brands/'+encodeURIComponent(id)+'/follow',{method:'POST',body:JSON.stringify({userId:state.userId||'demo_user',action:following?'save':'remove'})});
      toast(following?T('Вы подписались на бренд в MFW','Following brand in MFW'):T('Подписка в MFW снята','Brand unfollowed in MFW'));
    }catch(_){
      toast(T('Изменение сохранено локально — сервер временно недоступен','Saved locally — server temporarily unavailable'));
    }
    closeSheet();render();track(following?'brand_followed':'brand_unfollowed',{brandId:id});
  }
  async function loadBuyerShortlist(){
    if(state.commerceLoading||state.commerceLoaded||state.role!=='Buyer')return;
    state.commerceLoading=true;
    try{
      var buyerId=state.userId||'demo_buyer';
      var out=await api('/v1/buyer/shortlist?buyerId='+encodeURIComponent(buyerId));
      state.buyerShortlist=out.data||[];
      state.commerceLoaded=true;
      if(state.tab==='me'&&state.role==='Buyer')setTimeout(function(){render();},0);
    }catch(_){}
    state.commerceLoading=false;
  }

  async function toggleShortlist(brandId){
    try{
      var exists=state.buyerShortlist.some(function(x){return x.id===brandId;});
      var out=await api('/v1/buyer/shortlist',{method:'POST',body:JSON.stringify({
        buyerId:state.userId||'demo_buyer',
        brandId:brandId,
        action:exists?'remove':'save'
      })});
      await loadBuyerShortlistForce();
      closeSheet();
      render();
      toast(out.saved?'Бренд добавлен в shortlist':'Бренд удалён из shortlist');
    }catch(err){toast('Shortlist unavailable');}
  }

  async function loadBuyerShortlistForce(){
    try{
      var out=await api('/v1/buyer/shortlist?buyerId='+encodeURIComponent(state.userId||'demo_buyer'));
      state.buyerShortlist=out.data||[];
      state.commerceLoaded=true;
    }catch(_){}
  }

  async function openLineSheet(brandId){
    openSheet('<div class="eyebrow">LINE SHEET · SERVER</div><h1 style="font-size:42px">LOADING<br>COLLECTION</h1><div class="card skeleton" style="height:180px"></div>');
    try{
      var out=await api('/v1/line-sheets/'+encodeURIComponent(brandId||'b1'));
      var sheet=out.data;
      var rows=(sheet.looks||[]).map(function(l){
        return '<div class="line-sheet-row"><div><b>'+esc(l.title)+'</b><span>Wholesale</span></div><strong>'+Number(l.wholesale||0).toLocaleString('ru-RU')+' ₽</strong><em>RRP '+Number(l.rrp||0).toLocaleString('ru-RU')+' ₽</em></div>';
      }).join('');
      openSheet('<div class="eyebrow">LINE SHEET · v'+esc(sheet.version)+'</div><h1 style="font-size:42px">SS27<br>BUYING</h1>'+
        '<div class="line-sheet-summary"><div><span>CURRENCY</span><b>'+esc(sheet.currency)+'</b></div><div><span>TERMS</span><b>'+esc(sheet.terms)+'</b></div></div>'+
        '<div class="line-sheet-list">'+rows+'</div>'+
        '<div class="action-row"><button class="action primary" data-action="toggle-shortlist" data-id="'+esc(brandId||'b1')+'">＋ Shortlist</button><button class="action ghost" data-action="meeting">Meeting</button></div>');
    }catch(err){
      openSheet('<div class="eyebrow">LINE SHEET</div><h1 style="font-size:42px">TEMPORARILY<br>UNAVAILABLE</h1><div class="premium-empty"><b>Не удалось загрузить данные</b><p>Server authority недоступен.</p></div>');
    }
  }

  async function buyerFollowup(brandId){
    try{
      var out=await api('/v1/leads',{method:'POST',body:JSON.stringify({
        brandId:brandId||'b1',
        buyerId:state.userId||'demo_buyer',
        source:'brand_profile',
        stage:'follow_up',
        note:'Investor demo follow-up'
      })});
      toast('Follow-up lead создан · '+out.data.id.slice(-6));
      track('buyer_followup',{brandId:brandId});
    }catch(_){toast('Follow-up unavailable');}
  }

  async function enableNativePush(){
    if(window.MFWNative&&window.MFWNative.isNative&&window.MFWNative.isNative()){
      try{
        var result=await window.MFWNative.registerPush();
        if(result&&result.granted){
          toast(T('Push-уведомления подключены','Push notifications enabled'));
          track('native_push_enabled',{platform:'ios'});
        }else{
          toast(T('Разрешение на push не предоставлено','Push permission not granted'));
        }
      }catch(_){toast(T('Не удалось подключить push','Could not enable push'));}
      return;
    }
    openSheet('<div class="eyebrow">NATIVE iOS</div><h1 style="font-size:42px">PUSH / APNs</h1><div class="card"><b>'+T('Готово к native shell','Ready for native shell')+'</b><p class="sub">'+T('В PWA push-кнопка не симулирует APNs. В iOS shell она вызывает системное разрешение и регистрацию APNs.','The PWA does not simulate APNs. In the iOS shell this action requests system permission and registers for APNs.')+'</p></div>');
  }

  window.MFWRoute=function(route){
    if(!route)return;
    if(route.kind==='event'&&route.id){state.openingSeen=true;state.onboarding=true;state.tab='schedule';localStorage.setItem('mfwOpeningSeen','1');localStorage.setItem('mfwOnboarded','1');render();setTimeout(function(){openEvent(route.id);},0);return;}
    if(route.kind==='brand'&&route.id){state.openingSeen=true;state.onboarding=true;state.tab='discover';localStorage.setItem('mfwOpeningSeen','1');localStorage.setItem('mfwOnboarded','1');render();setTimeout(function(){openBrand(route.id);},0);return;}
    if(route.kind==='profile'){state.openingSeen=true;state.onboarding=true;state.tab='me';localStorage.setItem('mfwOpeningSeen','1');localStorage.setItem('mfwOnboarded','1');render();return;}
  };

  function toggleLanguage(){
    state.lang=state.lang==='ru'?'en':'ru';
    persist();
  
  function handleSocialAuthReturn(){
    try{
      var params=new URLSearchParams(window.location.search);
      var provider=params.get('social'),status=params.get('social_status');
      if(!provider||!status)return;
      if(status==='connected')toast(provider.toUpperCase()+' · '+T('аккаунт подключён к MFW ID','account connected to MFW ID'));
      else toast(provider.toUpperCase()+' · '+T('подключение не завершено','connection was not completed'));
      params.delete('social');params.delete('social_status');
      var next=window.location.pathname+(params.toString()?'?'+params.toString():'')+window.location.hash;
      window.history.replaceState({},'',next);
    }catch(_){}
  }

  document.documentElement.lang=state.lang;
    render();
    toast(state.lang==='ru'?'Русский язык':'English');
    track('language_changed',{locale:state.lang});
  }

  async function contactQr(){
    openSheet('<div class="eyebrow">MFW NETWORKING</div><h1 style="font-size:42px">'+t('connectTitle')+'</h1><div class="card skeleton" style="height:210px"></div>');
    try{
      var out=await api('/v1/networking/qr',{method:'POST',body:JSON.stringify({userId:state.userId||'demo_user',name:state.name,role:state.role})});
      openSheet('<div class="eyebrow">MFW NETWORKING · SIGNED</div><h1 style="font-size:42px">'+t('connectTitle')+'</h1><div class="contact-qr">'+out.svg+'</div><p class="sub">'+T('Этот QR обменивает контакт. Он не даёт право входа на события.','This QR exchanges contact details. It never grants event access.')+'</p><div class="action-row"><button class="action primary" data-action="networking-scan">'+T('Сканировать Connect QR','Scan Connect QR')+'</button></div><div class="demo-note"><b>Separate authority.</b> typ=contact-card · 10 min TTL · ES256.</div>');
    }catch(_){toast(T('Connect QR недоступен','Connect QR unavailable'));}
  }

  async function connectContactToken(raw){
    var token=String(raw||'').trim();
    if(!token.startsWith('MFW-CONTACT:')){
      toast(T('Это не Connect QR','This is not a Connect QR'));
      return;
    }
    try{
      var out=await api('/v1/networking/connect',{method:'POST',body:JSON.stringify({
        token:token,
        requesterUserId:state.userId||'demo_requester'
      })});
      state.connections+=1;
      closeSheet();render();
      toast(T('Контакт сохранён: ','Contact saved: ')+String(out.data.name||'MFW guest'));
      track('networking_qr_connected',{role:out.data.role||null});
    }catch(err){
      var reason=err&&err.data&&err.data.error;
      toast(reason==='cannot_connect_self'?T('Нельзя добавить самого себя','You cannot connect to yourself'):T('Connect QR отклонён','Connect QR rejected'));
    }
  }

  async function networkingCameraScan(){
    if(window.MFWNative&&window.MFWNative.isNative&&window.MFWNative.isNative()){
      try{
        var nativeResult=await window.MFWNative.openNativeScanner('networking');
        var nativeValue=nativeResult&&(nativeResult.value||nativeResult.data||nativeResult.text);
        if(nativeValue){
          await connectContactToken(String(nativeValue));
          return;
        }
      }catch(_){}
    }
    openSheet('<div class="eyebrow">MFW NETWORKING · CAMERA</div><h1 style="font-size:40px">'+T('СКАНИРУЙТЕ<br>CONNECT QR','SCAN<br>CONNECT QR')+'</h1><div class="scanner-camera"><video id="network-video" playsinline muted></video><div class="frame"></div><div class="scan-line"></div></div><canvas id="network-canvas" hidden></canvas><div id="network-status" class="scan-status">'+T('Запрашиваем доступ к камере…','Requesting camera access…')+'</div><p class="sub">'+T('Сканер принимает только MFW-CONTACT. Пропуск MFW-PASS здесь никогда не сработает.','This scanner accepts MFW-CONTACT only. An MFW-PASS is never valid here.')+'</p>');
    var video=document.getElementById('network-video'),canvas=document.getElementById('network-canvas'),status=document.getElementById('network-status');
    try{
      scannerStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
      video.srcObject=scannerStream;await video.play();
      status.textContent=T('Камера активна · ищем Connect QR','Camera active · looking for Connect QR');
      var ctx=canvas.getContext('2d',{willReadFrequently:true});
      function tick(){
        if(video.readyState===video.HAVE_ENOUGH_DATA){
          canvas.width=video.videoWidth;canvas.height=video.videoHeight;
          ctx.drawImage(video,0,0,canvas.width,canvas.height);
          var img=ctx.getImageData(0,0,canvas.width,canvas.height);
          var code=window.jsQR?window.jsQR(img.data,img.width,img.height,{inversionAttempts:'dontInvert'}):null;
          if(code&&code.data){
            var value=String(code.data);
            if(value.startsWith('MFW-CONTACT:')){
              status.textContent=T('Connect QR найден','Connect QR found');
              stopCameraScanner();closeSheet();connectContactToken(value);return;
            }
            status.textContent=T('Это пропуск или другой QR — нужен Connect QR','Wrong QR type — Connect QR required');
          }
        }
        scannerFrame=requestAnimationFrame(tick);
      }
      tick();
    }catch(err){
      status.textContent=T('Камера недоступна: ','Camera unavailable: ')+String(err&&err.message||err);
    }
  }

  async function boards(){
    openSheet('<div class="eyebrow">VOGUE-RUNWAY INSPIRED</div><h1 style="font-size:42px">'+t('boardTitle')+'</h1><div class="card skeleton" style="height:160px"></div>');
    try{
      var userId=state.userId||'demo_user';
      var out=await api('/v1/boards?userId='+encodeURIComponent(userId));
      var list=out.data||[];
      if(!list.length){
        var created=await api('/v1/boards',{method:'POST',body:JSON.stringify({userId:userId,title:state.lang==='ru'?'Мой MFW SS27':'My MFW SS27'})});
        list=[created.data];
      }
      var html=list.map(function(b){return '<div class="board-card"><div><div class="eyebrow">PRIVATE BOARD</div><b>'+esc(b.title)+'</b><p>'+esc(String((b.looks||[]).length))+' '+T('образов','looks')+'</p></div><button class="action primary" data-action="board-add-look" data-id="'+esc(b.id)+'">'+t('addToBoard')+'</button></div>';}).join('');
      openSheet('<div class="eyebrow">MFW BOARDS</div><h1 style="font-size:42px">'+t('boardTitle')+'</h1>'+html+'<button class="action ghost" data-action="board-new">'+t('newBoard')+'</button>');
    }catch(_){toast(T('Подборки недоступны','Boards unavailable'));}
  }

  async function addLookToBoard(boardId){
    var lookId=state.savedLooks[state.savedLooks.length-1]||'look-14';
    try{
      await api('/v1/boards/'+encodeURIComponent(boardId)+'/looks',{method:'POST',body:JSON.stringify({userId:state.userId||'demo_user',lookId:lookId})});
      toast(T('Образ добавлен в подборку','Look added to board'));
      boards();
    }catch(_){toast(T('Не удалось добавить образ','Could not add look'));}
  }

  async function createBoard(){
    try{
      await api('/v1/boards',{method:'POST',body:JSON.stringify({userId:state.userId||'demo_user',title:state.lang==='ru'?'Новая подборка':'New board'})});
      boards();
    }catch(_){toast(T('Не удалось создать подборку','Could not create board'));}
  }

  async function meetups(){
    openSheet('<div class="eyebrow">INTEREST-BASED NETWORKING</div><h1 style="font-size:42px">'+t('meetupTitle')+'</h1><div class="card skeleton" style="height:180px"></div>');
    try{
      var out=await api('/v1/meetups');
      var html=(out.data||[]).map(function(m){
        var joined=state.joinedMeetups.indexOf(m.id)>=0;
        return '<div class="meetup-card"><div><div class="eyebrow">'+esc(m.topic)+'</div><b>'+esc(m.title)+'</b><p>'+esc(m.venue)+' · '+new Date(m.startsAt).toLocaleString(state.lang==='ru'?'ru-RU':'en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})+'</p></div><button class="action '+(joined?'ghost':'primary')+'" data-action="join-meetup" data-id="'+esc(m.id)+'">'+(joined?t('joined'):t('join'))+'</button></div>';
      }).join('');
      openSheet('<div class="eyebrow">MFW NETWORKING</div><h1 style="font-size:42px">'+t('meetupTitle')+'</h1>'+html);
    }catch(_){toast(T('Meetups недоступны','Meetups unavailable'));}
  }

  async function joinMeetup(id){
    try{
      await api('/v1/meetups/'+encodeURIComponent(id)+'/join',{method:'POST',body:JSON.stringify({userId:state.userId||'demo_user'})});
      if(state.joinedMeetups.indexOf(id)<0)state.joinedMeetups.push(id);
      persist();toast(T('Вы присоединились','You joined'));meetups();
    }catch(_){toast(T('Не удалось присоединиться','Could not join'));}
  }

  function requirementLabel(req){
    if(req.type==='registered_user')return T('Регистрация MFW','MFW registration');
    if(req.type==='app_installed')return T('Приложение установлено','App installed');
    if(req.type==='mfw_social_follow')return T('Подписка на соцсеть MFW','MFW social follow');
    if(req.type==='brand_social_follow')return T('Подписка на соцсеть бренда','Brand social follow');
    if(req.type==='brand_follow_in_mfw')return T('Подписка на бренд внутри MFW','Follow brand in MFW');
    if(req.type==='event_attended')return T('Посещение события','Event attended');
    return req.type;
  }

  function isStandaloneApp(){
    return !!((window.MFWNative&&window.MFWNative.isNative&&window.MFWNative.isNative())||(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||window.navigator.standalone===true);
  }

  async function registerLoyaltyInstall(forceDemo,silent){
    if(!forceDemo&&!isStandaloneApp()){
      if(!silent)toast(T('Для этого условия откройте установленное приложение MFW','Open the installed MFW app to satisfy this condition'));
      return false;
    }
    try{
      var token=state.session||await ensureServerSession(state.role);
      await api('/v1/app/install',{method:'POST',headers:{Authorization:'Bearer '+token},body:JSON.stringify({platform:(window.MFWNative&&window.MFWNative.isNative&&window.MFWNative.isNative())?'ios':(forceDemo?'investor_demo':'pwa'),installationId:'mfw-'+(state.userId||'demo')})});
      if(!silent)toast(T('Установка приложения подтверждена','App installation confirmed'));
      return true;
    }catch(_){if(!silent)toast(T('Не удалось подтвердить установку','Could not confirm installation'));return false;}
  }

  async function openBrandLoyalty(brandId){
    openSheet('<div class="eyebrow">MFW CLUB · LOYALTY AUTHORITY</div><h1 style="font-size:42px">'+T('БРЕНД<br>ВОЗНАГРАЖДАЕТ','BRAND<br>REWARDS')+'</h1><div class="card skeleton" style="height:180px"></div>');
    try{
      var userId=state.userId||'demo_user';
      var pair=await Promise.all([
        userApi('/v1/brands/'+encodeURIComponent(brandId)+'/loyalty?userId='+encodeURIComponent(userId)),
        api('/v1/social/auth/readiness').catch(function(){return {data:{}};})
      ]);
      var d=pair[0].data;
      var authReady=pair[1].data||{};
      var channelById={};
      (d.memberships||[]).forEach(function(x){channelById[x.channel.id]=x;});
      var offers=(d.offers||[]).map(function(o){
        var title=state.lang==='ru'?o.titleRu:o.titleEn;
        var desc=state.lang==='ru'?o.descriptionRu:o.descriptionEn;
        var terms=state.lang==='ru'?o.termsRu:o.termsEn;
        var reqs=(o.eligibility.progress||[]).map(function(r){
          var link=channelById[r.channelId];
          var ch=link&&link.channel;
          var unsupported=ch&&ch.verificationMode==='unsupported';
          var progressText=r.minContinuousDays?Math.min(r.currentDays||0,r.minContinuousDays)+' / '+r.minContinuousDays+' '+T('дней','days'):(r.ok?'OK':T('нужно выполнить','required'));
          var action='';
          if((r.type==='mfw_social_follow'||r.type==='brand_social_follow')&&ch&&!r.ok){
            action=unsupported
              ? '<span class="loyalty-unavailable">'+T('API не подтверждает автоматически','No automatic API proof')+'</span>'
              : '<div class="loyalty-actions"><button class="action ghost compact" data-action="loyalty-verify-live" data-brand="'+esc(brandId)+'" data-channel="'+esc(ch.id)+'">'+T('Проверить','Verify')+'</button>'+(d.dataMode==='memory'?'<button class="action ghost compact" data-action="loyalty-verify" data-brand="'+esc(brandId)+'" data-channel="'+esc(ch.id)+'" data-mode="'+esc(ch.verificationMode)+'">DEMO</button>':'')+'</div>';
          }else if(r.type==='app_installed'&&!r.ok){
            action='<button class="action ghost compact" data-action="loyalty-install" data-brand="'+esc(brandId)+'">'+(isStandaloneApp()?T('Подтвердить','Confirm'):T('DEMO · отметить установку','DEMO · mark installed'))+'</button>';
          }else if(r.type==='brand_follow_in_mfw'&&!r.ok){
            action='<button class="action ghost compact" data-action="loyalty-follow-brand" data-brand="'+esc(brandId)+'">'+T('Подписаться','Follow')+'</button>';
          }
          return '<div class="loyalty-requirement '+(r.ok?'done':'')+'"><span>'+(r.ok?'✓':'○')+'</span><div><b>'+esc(requirementLabel(r))+(ch?' · '+esc(ch.platform.toUpperCase()):'')+'</b><small>'+esc(progressText)+'</small></div>'+action+'</div>';
        }).join('');
        var reward=o.rewardType==='discount_percent'?'−'+esc(o.rewardValue)+'%':T('Подарок','Gift');
        return '<div class="loyalty-offer '+(o.eligibility.eligible?'eligible':'')+'"><div class="loyalty-offer-head"><div><div class="eyebrow">MFW CLUB · '+esc(o.status.toUpperCase())+'</div><h2>'+esc(title)+'</h2><p>'+esc(desc)+'</p></div><strong>'+reward+'</strong></div>'+reqs+
          '<div class="loyalty-terms">'+esc(terms)+'</div>'+
          (o.eligibility.eligible?'<button class="action primary" data-action="loyalty-claim" data-offer="'+esc(o.id)+'" data-brand="'+esc(brandId)+'">'+T('Получить награду','Claim reward')+'</button>':'<div class="loyalty-lock">'+T('Награда откроется автоматически после выполнения всех условий.','Reward unlocks automatically after all conditions are verified.')+'</div>')+
        '</div>';
      }).join('');
      var providerNote=(d.providers||[]).map(function(p){return '<span>'+esc(p.platform)+': '+esc(p.verification)+'</span>';}).join('');
      var tg=authReady.telegram||{},vk=authReady.vk||{};
      var connectPanel='<div class="social-connect-panel"><div><b>'+T('Подключите соцсеть к MFW ID','Connect social account to MFW ID')+'</b><small>'+T('Сначала подтверждаем, чей это аккаунт. Затем отдельно проверяем подписку на нужный канал.','First verify account ownership. Then separately verify membership in the required channel.')+'</small></div>'+
        '<div class="action-row"><button class="action '+(tg.ready?'primary':'ghost')+'" data-action="social-connect" data-platform="telegram">Telegram · '+(tg.ready?T('подключить','connect'):(authReady.postgres===false?T('нужна MFW БД','MFW DB required'):T('ожидает ключи','credentials needed')))+'</button>'+
        '<button class="action '+(vk.ready?'primary':'ghost')+'" data-action="social-connect" data-platform="vk">VK ID · '+(vk.ready?T('подключить','connect'):(authReady.postgres===false?T('нужна MFW БД','MFW DB required'):T('ожидает APP_ID','APP_ID needed')))+'</button></div></div>';
      openSheet('<div class="eyebrow">MFW CLUB · SERVER</div><h1 style="font-size:42px">'+T('ЛОЯЛЬНОСТЬ<br>БЕЗ СКРИНШОТОВ','LOYALTY<br>WITHOUT SCREENSHOTS')+'</h1>'+
        '<div class="loyalty-principle"><b>'+T('MFW хранит доказательство и непрерывный срок.','MFW stores proof and continuous duration.')+'</b><p>'+T('Если соцсеть не отдаёт историческую дату подписки, отсчёт начинается с первого подтверждения MFW.','If a social network does not expose historical join time, the clock starts at MFW first verification.')+'</p></div>'+connectPanel+offers+
        '<div class="provider-foot">'+providerNote+'</div>');
    }catch(err){toast(T('MFW Club временно недоступен','MFW Club temporarily unavailable'));}
  }


  function loadExternalScript(src,id){
    return new Promise(function(resolve,reject){
      if(id&&document.getElementById(id)){resolve();return;}
      var sc=document.createElement('script');if(id)sc.id=id;sc.src=src;sc.async=true;
      sc.onload=function(){resolve();};sc.onerror=function(){reject(new Error('script_load_failed'));};
      document.head.appendChild(sc);
    });
  }

  async function connectSocialProvider(platform){
    try{
      var token=state.session||await ensureServerSession(state.role);
      var out=await api('/v1/social/auth/'+encodeURIComponent(platform)+'/start',{
        method:'POST',
        headers:{Authorization:'Bearer '+token},
        body:JSON.stringify({})
      });
      var d=out.data||{};
      if(platform==='telegram'&&d.authorizationUrl){
        window.location.assign(d.authorizationUrl);return;
      }
      if(platform==='vk'&&d.mode==='vkid_sdk'){
        await loadExternalScript(d.sdkUrl,'mfw-vkid-sdk');
        var VKID=window.VKIDSDK;
        if(!VKID||!VKID.Config||!VKID.Auth)throw new Error('vkid_sdk_unavailable');
        VKID.Config.init(d.config);
        await VKID.Auth.login();
        return;
      }
      throw new Error('provider_flow_unavailable');
    }catch(err){
      if(err&&err.data&&err.data.error==='postgres_required'){
        toast(T('Интеграция готова — нужна отдельная PostgreSQL база MFW','Integration is ready — a dedicated MFW PostgreSQL database is required'));
      }else if(err&&err.data&&err.data.error==='provider_not_configured'){
        toast(T('Интеграция подготовлена — нужны credentials организатора','Integration is ready — organizer credentials are required'));
      }else{
        toast(T('Не удалось начать подключение соцсети','Could not start social connection'));
      }
    }
  }

  async function verifyLoyaltySocialLive(brandId,channelId){
    try{
      await userApi('/v1/social/verify',{method:'POST',body:JSON.stringify({userId:state.userId||'demo_user',channelId:channelId})});
      toast(T('Подписка подтверждена провайдером','Membership verified by provider'));
      openBrandLoyalty(brandId);
    }catch(err){
      var code=err&&err.data&&err.data.error;
      if(code==='social_connection_required')toast(T('Сначала подключите эту соцсеть к MFW ID','Connect this social account to MFW ID first'));
      else if(code==='provider_not_configured')toast(T('Провайдер пока не активирован credentials организатора','Provider credentials are not active yet'));
      else if(code==='verification_not_supported')toast(T('Автоматическая проверка этой сети недоступна','Automatic verification is unavailable for this network'));
      else toast(T('Подписка не подтверждена','Membership could not be verified'));
    }
  }

  async function verifyLoyaltySocial(brandId,channelId,mode){
    try{
      var days=mode==='membership_event'?34:0;
      await userApi('/v1/demo/social/verify',{method:'POST',body:JSON.stringify({userId:state.userId||'demo_user',channelId:channelId,active:true,continuousDays:days})});
      toast(days?T('DEMO: подтверждена непрерывная подписка 34 дня','DEMO: 34 days of continuous membership verified'):T('DEMO: текущая подписка подтверждена; срок начинается сегодня','DEMO: current membership verified; duration starts today'));
      openBrandLoyalty(brandId);
    }catch(err){
      toast(err&&err.data&&err.data.error==='verification_not_supported'?T('Эта сеть не даёт подтверждение через доступный API','This network cannot be verified through the available API'):T('Проверка не выполнена','Verification failed'));
    }
  }

  async function claimLoyaltyReward(brandId,offerId){
    try{
      var out=await userApi('/v1/loyalty/offers/'+encodeURIComponent(offerId)+'/claim',{method:'POST',body:JSON.stringify({userId:state.userId||'demo_user'})});
      var code=out.data&&out.data.code;
      var qr=out.data&&out.data.qrDataUrl;
      openSheet('<div class="eyebrow">MFW CLUB · CLAIM</div><h1 style="font-size:42px">'+T('НАГРАДА<br>ДОСТУПНА','REWARD<br>UNLOCKED')+'</h1>'+
        (qr?'<div class="reward-qr"><img src="'+esc(qr)+'" alt="MFW reward QR"><span>'+T('Покажите на маркете или в шоуруме бренда','Show at the market or brand showroom')+'</span></div>':'')+
        '<div class="reward-code"><span>'+T('Одноразовый код','One-time code')+'</span><b>'+esc(code||T('Уже выдано','Already issued'))+'</b></div><p class="sub">'+T('QR и код одноразовые. В момент применения бренд или касса повторно проверяют eligibility на сервере. Скриншот сам по себе не подтверждает скидку.','QR and code are one-time. At redemption the brand or POS re-checks eligibility server-side. A screenshot alone is not proof.')+'</p><button class="action ghost" data-action="brand-loyalty" data-id="'+esc(brandId)+'">'+T('Назад в MFW Club','Back to MFW Club')+'</button>');
    }catch(err){toast(T('Награда пока недоступна','Reward not available yet'));}
  }

  async function openBrand365(brandId){
    openSheet('<div class="eyebrow">MFW 365 · BRAND CRM</div><h1 style="font-size:42px">'+T('БРЕНД<br>ПОСЛЕ ПОКАЗА','BRAND<br>AFTER THE SHOW')+'</h1><div class="card skeleton" style="height:180px"></div>');
    try{
      var out=await api('/v1/brands/'+encodeURIComponent(brandId)+'/content');
      var html=(out.data||[]).map(function(p){
        var title=state.lang==='ru'?p.titleRu:p.titleEn;
        var body=state.lang==='ru'?p.bodyRu:p.bodyEn;
        var cta=state.lang==='ru'?p.ctaLabelRu:p.ctaLabelEn;
        var sponsor=p.isPaid?'<span class="paid-label">'+esc(state.lang==='ru'?(p.sponsorLabelRu||'Реклама'):(p.sponsorLabelEn||'Sponsored'))+'</span>':'';
        return '<article class="brand-365-post"><div class="brand-365-image" style="background-image:linear-gradient(180deg,transparent,rgba(0,0,0,.7)),url('+esc(p.imageUrl||VISUALS.runway)+')">'+sponsor+'<span>'+esc(String(p.kind||'news').toUpperCase())+'</span></div><div class="brand-365-copy"><b>'+esc(title)+'</b><p>'+esc(body)+'</p><button class="action ghost" data-action="brand-content-open" data-post="'+esc(p.id)+'">'+esc(cta||T('Открыть','Open'))+'</button></div></article>';
      }).join('');
      openSheet('<div class="eyebrow">MFW 365 · '+T('ГОДОВАЯ СВЯЗЬ','YEAR-ROUND RELATIONSHIP')+'</div><h1 style="font-size:42px">'+T('НОВОСТИ.<br>СОБЫТИЯ.<br>ЗАПУСКИ.','NEWS.<br>EVENTS.<br>LAUNCHES.')+'</h1>'+html+'<div class="demo-note">'+T('Бренд может публиковать органический контент для своих подписчиков и отдельно покупать MFW-wide placement. Платное размещение всегда маркируется.','Brands can publish organic content to followers and separately buy MFW-wide placement. Paid distribution is always labelled.')+'</div>');
    }catch(_){toast(T('Контент бренда недоступен','Brand content unavailable'));}
  }

  async function openMfw365Feed(){
    openSheet('<div class="eyebrow">MFW 365</div><h1 style="font-size:42px">'+T('ВАША<br>МОДА<br>ВЕСЬ ГОД','YOUR<br>FASHION<br>ALL YEAR')+'</h1><div class="card skeleton" style="height:180px"></div>');
    try{
      var out=await userApi('/v1/feed?userId='+encodeURIComponent(state.userId||'demo_user'));
      var posts=out.data||[];
      var html=posts.length?posts.map(function(p){
        var title=state.lang==='ru'?p.titleRu:p.titleEn;
        var body=state.lang==='ru'?p.bodyRu:p.bodyEn;
        var reason=p.feedReason==='followed_brand'?T('Вы подписаны на бренд','You follow this brand'):p.feedReason==='followed_brand_event'?T('Событие бренда, на который вы подписаны','Event from a followed brand'):p.feedReason==='sponsored'?T('Платное размещение MFW','Paid MFW placement'):T('Рекомендация MFW','MFW recommendation');
        return '<article class="brand-365-post"><div class="brand-365-image" style="background-image:linear-gradient(180deg,transparent,rgba(0,0,0,.7)),url('+esc(p.imageUrl||VISUALS.runway)+')">'+(p.isPaid?'<span class="paid-label">'+T('Реклама бренда','Brand promotion')+'</span>':'')+'<span>'+esc(String(p.kind||'news').toUpperCase())+'</span></div><div class="brand-365-copy"><div class="feed-reason">'+esc(reason)+'</div><b>'+esc(title)+'</b><p>'+esc(body)+'</p><div class="action-row"><button class="action ghost" data-action="brand" data-id="'+esc(p.brandId)+'">'+T('Открыть бренд','Open brand')+'</button><button class="action ghost" data-action="brand-content-open" data-post="'+esc(p.id)+'">'+T('Подробнее','Details')+'</button></div></div></article>';
      }).join(''):'<div class="premium-empty"><b>'+T('Лента станет персональной','Your feed will become personal')+'</b><p>'+T('Подпишитесь на бренды MFW — их события, запуски и новости будут жить здесь после недели моды.','Follow MFW brands to keep their events, launches and news here after fashion week.')+'</p></div>';
      openSheet('<div class="eyebrow">MFW 365 · PERSONAL FEED</div><h1 style="font-size:42px">'+T('МОДА<br>НЕ ЗАКАНЧИВАЕТСЯ','FASHION<br>DOESN’T END')+'</h1><div class="feed-policy">'+T('Сначала — бренды, на которые вы подписаны. Реклама ограничена по частоте и всегда маркируется.','Followed brands come first. Ads are frequency-capped and always labelled.')+'</div>'+html);
      posts.forEach(function(p){recordBrandContentImpression(p.id);});
    }catch(_){toast(T('MFW 365 временно недоступен','MFW 365 temporarily unavailable'));}
  }

  async function recordBrandContentImpression(postId){
    try{await userApi('/v1/content/interactions',{method:'POST',body:JSON.stringify({userId:state.userId||'demo_user',postId:postId,type:'impression',surface:'mfw_365'})});}catch(_){}
  }

  async function recordBrandContentOpen(postId){
    try{await userApi('/v1/content/interactions',{method:'POST',body:JSON.stringify({userId:state.userId||'demo_user',postId:postId,type:'open'})});}catch(_){}
    toast(T('Взаимодействие учтено','Interaction recorded'));
  }

  async function perks(){
    openSheet('<div class="eyebrow">PARTNER & LOYALTY</div><h1 style="font-size:42px">'+t('perksTitle')+'</h1><div class="card skeleton" style="height:160px"></div>');
    try{
      var out=await api('/v1/perks');
      var html=(out.data||[]).map(function(p){return '<div class="perk-card"><span>✦</span><div><b>'+esc(state.lang==='ru'?p.titleRu:p.titleEn)+'</b><p>'+esc(state.lang==='ru'?p.descRu:p.descEn)+'</p></div></div>';}).join('');
      openSheet('<div class="eyebrow">MFW PRIVILEGES</div><h1 style="font-size:42px">'+t('perksTitle')+'</h1>'+html+'<div class="demo-note">'+T('Привилегии выдаются entitlement-моделью, а не просто ролью.','Perks are entitlement-driven, not role-driven.')+'</div>');
    }catch(_){toast(T('Привилегии недоступны','Perks unavailable'));}
  }

  async function proposeReschedule(){
    if(!state.meeting||!state.meeting.id){toast(T('Сначала создайте встречу','Create a meeting first'));return;}
    try{
      var out=await api('/v1/meetings/'+encodeURIComponent(state.meeting.id)+'/proposals',{method:'POST',body:JSON.stringify({userId:state.userId||'demo_buyer',startsAt:'2026-09-26T15:20:00+03:00'})});
      state.meeting.proposalId=out.data.id;
      state.meeting.proposedStartsAt=out.data.proposedStartsAt;
      persist();render();toast(T('Новое время предложено','New time proposed'));
    }catch(_){toast(T('Перенос недоступен','Reschedule unavailable'));}
  }

  function meeting(){
    if(state.role!=='Buyer' && state.role!=='Media'){toast('В demo встреча доступна профессиональным ролям');return;}
    if(state.meeting){openSheet('<div class="eyebrow">PRIVATE NOTE</div><h1 style="font-size:40px">MFW / NEW 01</h1><textarea class="input" style="height:120px" placeholder="Private buyer note"></textarea><div class="action-row"><button class="action primary" data-action="toast" data-message="'+T('Private note сохранена','Private note saved')+'">'+T('Сохранить','Save')+'</button><button class="action ghost" data-action="reschedule-meeting">'+t('reschedule')+'</button></div>');return;}
    openSheet('<div class="eyebrow">REQUEST MEETING</div><h1 style="font-size:40px">ВЫБЕРИТЕ<br>СЛОТ</h1><div class="action-row"><button class="action ghost" data-action="confirm-meeting">14:10</button><button class="action primary" data-action="confirm-meeting">14:30</button><button class="action ghost" data-action="confirm-meeting">15:20</button></div>');
  }

  function sharedIdentityKey(){
    try{
      var x=JSON.parse(localStorage.getItem('mfp.account.v1')||'null'),p=x&&x.profile||{};
      return p.email||p.phone||state.name;
    }catch(e){return state.name;}
  }

  async function ensureServerSession(roleOverride){
    var wanted=roleOverride||state.role;
    if(state.session&&state.sessionRole===wanted)return state.session;
    var auth=await api('/v1/auth/demo',{method:'POST',body:JSON.stringify({name:state.name,role:wanted,identityKey:sharedIdentityKey()})});
    state.session=auth.session;state.userId=auth.user.id;state.sessionRole=wanted;state.authStatus='server';
    return state.session;
  }

  async function userApi(path,options){
    var token=state.session||await ensureServerSession(state.role);
    var opts=options||{};
    opts.headers=Object.assign({},opts.headers||{},{Authorization:'Bearer '+token});
    return api(path,opts);
  }

  async function adminApi(path, options){
    var token=await ensureServerSession('Organizer');
    var opts=options||{};
    opts.headers=Object.assign({},opts.headers||{},{Authorization:'Bearer '+token});
    return api('/v1/admin'+path,opts);
  }

  function adminEventRow(e){
    return '<div class="card" style="margin-top:10px"><div class="event-top"><div><div class="eyebrow">'+esc(e.id||'EVENT')+' · '+esc(e.status||'')+'</div><div class="event-name">'+esc(e.title||'Untitled')+'</div><div class="sub">'+esc(e.venue||'')+' · '+esc(e.startsAt||'')+'</div></div><span class="badge '+((e.status==='live'||e.status==='published')?'open':'wait')+'">'+esc(String(e.capacity||0))+' cap</span></div><div class="action-row"><button class="action ghost" data-action="admin-delay" data-id="'+esc(e.id)+'">+15 мин</button><button class="action ghost" data-action="admin-move" data-id="'+esc(e.id)+'">Сменить зал</button></div></div>';
  }

  function adminAccreditationRow(a){
    return '<div class="card" style="margin-top:10px"><div class="event-top"><div><div class="eyebrow">'+esc(a.kind)+' · '+esc(a.organisation)+'</div><div class="event-name">'+esc(a.name)+'</div><div class="sub">Status: '+esc(a.status)+'</div></div><span class="badge '+(a.status==='approved'?'open':a.status==='pending'?'wait':'live')+'">'+esc(a.status.toUpperCase())+'</span></div>'+(a.status==='pending'?'<div class="action-row"><button class="action primary" data-action="admin-approve" data-id="'+esc(a.id)+'">Approve</button><button class="action danger" data-action="admin-reject" data-id="'+esc(a.id)+'">Reject</button></div>':'')+'</div>';
  }

  async function openAdminConsole(){
    openSheet('<div class="eyebrow">MFW ADMIN CONSOLE</div><h1 style="font-size:40px">LIVE<br>OPERATIONS</h1><div class="card"><div class="sub">Загружаем серверное состояние…</div></div>');
    try{
      var data=await Promise.all([adminApi('/overview'),adminApi('/events'),adminApi('/accreditations')]);
      var o=data[0].data,events=data[1].data||[],acc=data[2].data||[];
      var html='<div class="eyebrow">MFW ADMIN CONSOLE · SERVER</div><h1 style="font-size:40px">LIVE<br>OPERATIONS</h1>'+
        '<div class="value-grid"><div class="value-card"><div class="n">'+esc(o.activeUsers)+'</div><small>active users</small></div><div class="value-card"><div class="n">'+esc(o.live.occupancyPct)+'%</div><small>occupancy</small></div><div class="value-card"><div class="n">'+esc(o.live.waitlist)+'</div><small>waitlist</small></div></div>'+
        '<h2>Programme CMS</h2>'+events.map(adminEventRow).join('')+
        '<div class="card" style="margin-top:10px"><div class="eyebrow">LIVE CONTROL</div><div class="metric-row"><b>Checked in</b><strong>'+esc(o.live.checkedIn)+'</strong></div><div class="metric-row"><b>Waitlist</b><strong>'+esc(o.live.waitlist)+'</strong></div><div class="action-row"><button class="action primary" data-action="admin-release">Release 12</button><button class="action ghost" data-action="admin-push">Critical push</button><button class="action ghost" data-action="admin-invite">Send invite</button></div><div class="action-row"><button class="action danger" data-action="admin-revoke">Revoke current pass</button></div></div>'+
        '<h2>Accreditation</h2>'+acc.map(adminAccreditationRow).join('')+
        '<div class="demo-note"><b>Server-backed demo.</b> Все кнопки выше меняют authority state и повторное открытие Console показывает результат.</div>';
      openSheet(html);
    }catch(err){
      openSheet('<div class="eyebrow">MFW ADMIN CONSOLE</div><h1 style="font-size:40px">CONTROL<br>UNAVAILABLE</h1><div class="card"><div class="sub">'+esc(String(err&&err.message||err))+'</div></div>');
    }
  }

  async function adminRelease(){
    try{await adminApi('/waitlist/release',{method:'POST',body:JSON.stringify({eventId:'e1',count:12})});toast('12 мест освобождены сервером');openAdminConsole();}catch(e){toast('Admin action failed');}
  }
  async function adminPush(){
    try{await adminApi('/notifications',{method:'POST',body:JSON.stringify({category:'critical',title:'Programme update',body:'Opening Runway: updated operational notice'})});toast('Critical push создан');}catch(e){toast('Push failed');}
  }
  async function adminInvite(){
    try{await adminApi('/invitations',{method:'POST',body:JSON.stringify({eventId:'e1',recipient:'investor-demo@mfw.local'})});toast('Invitation sent');}catch(e){toast('Invite failed');}
  }
  async function adminRevokeCurrent(){
    try{
      if(!state.passToken)await ensurePass();
      if(!state.passToken||!state.passPayload)throw new Error('pass_unavailable');
      var revokedToken=state.passToken;
      var jti=state.passPayload.jti;
      var session=await ensureServerSession('Organizer');
      await api('/v1/passes/revoke',{method:'POST',headers:{Authorization:'Bearer '+session},body:JSON.stringify({jti:jti,reason:'investor_demo_revoke'})});
      localStorage.setItem('mfwRevokedDemoToken',revokedToken);
      state.passToken=null;state.passPayload=null;
      await cacheOfflineAuthority();
      toast('Pass revoked · сохранён для Staff demo');
      openAdminConsole();
    }catch(e){toast('Revoke failed');}
  }
  async function adminChangeEvent(id,kind){
    var body=kind==='delay'?{startsAt:'2026-09-26T17:15:00+03:00',status:'delayed'}:{venue:'Manege · Hall 3'};
    try{await adminApi('/events/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify(body)});toast(kind==='delay'?'Показ перенесён на +15 мин':'Зал изменён');openAdminConsole();}catch(e){toast('Programme update failed');}
  }
  async function adminAccreditation(id,status){
    try{await adminApi('/accreditations/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({status:status})});toast('Accreditation '+status);openAdminConsole();}catch(e){toast('Accreditation update failed');}
  }

  async function completeOnboarding(){
    var input=document.getElementById('onboard-name');
    if(input&&input.value.trim())state.name=input.value.trim();
    try{
      var auth=await api('/v1/auth/demo',{method:'POST',body:JSON.stringify({name:state.name,role:state.role})});
      state.session=auth.session;
      state.sessionRole=state.role;
      state.userId=auth.user.id;
      state.authStatus='server';
    }catch(_){
      state.session=null;
      state.userId=null;
      state.authStatus='local';
    }
    state.onboarding=true;
    localStorage.setItem('mfwOnboarded','1');
    persist();
    if(state.authStatus==='server'&&isStandaloneApp())await registerLoyaltyInstall(false,true);
    render();
    toast(state.authStatus==='server'?'MFW ID создан сервером':'MFW ID создан локально · API warming');
    track('onboarding_completed',{role:state.role,authority:state.authStatus});
  }

  async function checkinToken(token){
    token=String(token||'').replace(/^MFW:/,'');
    try{
      var out=await api('/v1/checkins',{method:'POST',body:JSON.stringify({token:token,eventId:'e1',scannerId:'iphone-investor-demo'})});
      state.scannerState='valid';
      state.scannerReason='Server check-in · '+new Date(out.checkedInAt).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
    }catch(err){
      if(err.status===409){
        state.scannerState='duplicate';
        state.scannerReason='same user + event already checked in';
      }else{
        state.scannerState='no';
        state.scannerReason=String((err.data&&err.data.reason)||err.message||'rejected');
      }
    }
    render();
  }

  async function checkinCurrent(tamper){
    if(!state.passToken)await ensurePass();
    if(!state.passToken){state.scannerState='no';state.scannerReason='pass unavailable';render();return;}
    var token=state.passToken;
    if(tamper)token=token.slice(0,-2)+'xx';
    await checkinToken(token);
  }

  async function testRevokedPass(){
    var token=localStorage.getItem('mfwRevokedDemoToken');
    if(!token){state.scannerState='no';state.scannerReason='Сначала revoke pass в Organizer → Admin Console';render();return;}
    await checkinToken(token);
  }

  async function offlineCheckinCurrent(){
    if(!state.passToken)await ensurePass();
    if(!state.passToken){state.scannerState='no';state.scannerReason='pass unavailable';render();return;}
    var result=await verifyOfflineToken(state.passToken);
    if(!result.ok){state.scannerState='no';state.scannerReason=result.reason;render();return;}
    var key='e1:'+result.payload.sub;
    var offline=[];try{offline=JSON.parse(localStorage.getItem('mfwOfflineCheckins')||'[]');}catch(_){}
    if(offline.indexOf(key)>=0){
      state.scannerState='duplicate';state.scannerReason='duplicate detected in this device offline cache';render();return;
    }
    offline.push(key);localStorage.setItem('mfwOfflineCheckins',JSON.stringify(offline));
    state.scannerState='offline';
    state.scannerReason='ES256 valid · revocation cache checked · queued for sync';
    render();
  }

  function stopCameraScanner(){
    if(scannerFrame){cancelAnimationFrame(scannerFrame);scannerFrame=null;}
    if(scannerStream){scannerStream.getTracks().forEach(function(t){t.stop();});scannerStream=null;}
  }

  async function cameraScan(){
    if(window.MFWNative&&window.MFWNative.isNative&&window.MFWNative.isNative()){
      try{
        var nativeResult=await window.MFWNative.openNativeScanner('access');
        var nativeValue=nativeResult&&(nativeResult.value||nativeResult.data||nativeResult.text);
        if(nativeValue){
          await checkinToken(String(nativeValue).replace(/^MFW:/,''));
          return;
        }
      }catch(_){}
    }
    openSheet('<div class="eyebrow">GATE SCANNER · CAMERA</div><h1 style="font-size:40px">НАВЕДИТЕ<br>НА MFW PASS</h1><div class="scanner-camera"><video id="qr-video" playsinline muted></video><div class="frame"></div><div class="scan-line"></div></div><canvas id="qr-canvas" hidden></canvas><div id="camera-status" class="scan-status">Запрашиваем доступ к камере…</div>');
    var video=document.getElementById('qr-video'),canvas=document.getElementById('qr-canvas'),status=document.getElementById('camera-status');
    try{
      scannerStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
      video.srcObject=scannerStream;await video.play();
      status.textContent='Камера активна · ищем QR';
      var ctx=canvas.getContext('2d',{willReadFrequently:true});
      function tick(){
        if(video.readyState===video.HAVE_ENOUGH_DATA){
          canvas.width=video.videoWidth;canvas.height=video.videoHeight;
          ctx.drawImage(video,0,0,canvas.width,canvas.height);
          var img=ctx.getImageData(0,0,canvas.width,canvas.height);
          var code=window.jsQR?window.jsQR(img.data,img.width,img.height,{inversionAttempts:'dontInvert'}):null;
          if(code&&code.data){
            status.textContent='QR найден';
            var token=String(code.data).replace(/^MFW:/,'');
            stopCameraScanner();closeSheet();checkinToken(token);return;
          }
        }
        scannerFrame=requestAnimationFrame(tick);
      }
      tick();
    }catch(err){
      status.textContent='Камера недоступна: '+String(err&&err.message||err);
    }
  }

  async function scanImageFile(file){
    if(!file||!window.jsQR)return;
    try{
      var bitmap=await createImageBitmap(file);
      var canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
      var ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0);
      var img=ctx.getImageData(0,0,canvas.width,canvas.height);
      var code=window.jsQR(img.data,img.width,img.height,{inversionAttempts:'attemptBoth'});
      if(!code)throw new Error('QR не найден');
      checkinToken(String(code.data).replace(/^MFW:/,''));
    }catch(err){
      state.scannerState='no';state.scannerReason=String(err&&err.message||err);render();
    }
  }

  async function createMeeting(){
    try{
      var meetingOut=await api('/v1/meetings',{method:'POST',body:JSON.stringify({brandId:'b1',buyerId:state.userId||'demo_buyer',slot:'14:30'})});
      await api('/v1/leads',{method:'POST',body:JSON.stringify({brandId:'b1',buyerId:state.userId||'demo_buyer',source:'meeting',stage:'meeting',note:'Showroom meeting confirmed'})});
      state.meeting={id:meetingOut.data.id,slot:'14:30',status:'confirmed'};
      closeSheet();render();toast(T('Встреча подтверждена сервером: 14:30','Meeting confirmed by server: 14:30'));track('meeting_confirmed',{brandId:'b1',slot:'14:30'});
    }catch(_){
      toast(T('API недоступен — встреча не подтверждена','API unavailable — meeting not confirmed'));
    }
  }

  function bind(){
    document.querySelectorAll('[data-tab]').forEach(function(el){el.onclick=function(){state.tab=el.getAttribute('data-tab');closeSheet();render();window.scrollTo(0,0);};});
    document.querySelectorAll('[data-discover]').forEach(function(el){el.onclick=function(){state.discoverTab=el.getAttribute('data-discover');state.tab='discover';render();};});
    document.querySelectorAll('[data-role]').forEach(function(el){el.onclick=function(){setRole(el.getAttribute('data-role'));};});
    document.querySelectorAll('[data-onboard-role]').forEach(function(el){el.onclick=function(){state.role=el.getAttribute('data-onboard-role');render();};});
    document.querySelectorAll('[data-action]').forEach(function(el){el.onclick=function(ev){
      ev.stopPropagation();
      softHaptic();
      var a=el.getAttribute('data-action');
      if(a==='close')closeSheet();
      else if(a==='enter-experience'){state.openingSeen=true;localStorage.setItem('mfwOpeningSeen','1');render();}
      else if(a==='toggle-lang')toggleLanguage();
      else if(a==='native-push')enableNativePush();
      else if(a==='event')openEvent(el.getAttribute('data-id'));
      else if(a==='toggle-event')toggleEvent(el.getAttribute('data-id'));
      else if(a==='save-look')saveLook(el.getAttribute('data-look'));
      else if(a==='brand')openBrand(el.getAttribute('data-id'));
      else if(a==='save-brand')saveBrand(el.getAttribute('data-id'));
      else if(a==='favorite-brand')toggleFavoriteBrand(el.getAttribute('data-id'));
      else if(a==='notifications')notifications();
      else if(a==='notification-preferences')notificationPreferences();
      else if(a==='notification-pref-toggle')toggleNotificationPreference(el.getAttribute('data-key'),el.getAttribute('data-value'));
      else if(a==='investor-tour')investorTour();
      else if(a==='post-show-recap')postShowRecap();
      else if(a==='sponsor-experience')sponsorExperience();
      else if(a==='sponsor-challenge')sponsorChallenge();
      else if(a==='sponsor-cta')sponsorCta();
      else if(a==='admin-console')openAdminConsole();
      else if(a==='admin-release')adminRelease();
      else if(a==='admin-push')adminPush();
      else if(a==='admin-invite')adminInvite();
      else if(a==='admin-revoke')adminRevokeCurrent();
      else if(a==='admin-delay')adminChangeEvent(el.getAttribute('data-id'),'delay');
      else if(a==='admin-move')adminChangeEvent(el.getAttribute('data-id'),'move');
      else if(a==='admin-approve')adminAccreditation(el.getAttribute('data-id'),'approved');
      else if(a==='admin-reject')adminAccreditation(el.getAttribute('data-id'),'rejected');
      else if(a==='tour-start'){state.openingSeen=true;localStorage.setItem('mfwOpeningSeen','1');state.role='Visitor';state.tab='today';persist();closeSheet();render();toast('Investor tour: Visitor experience');}
      else if(a==='tour-organizer'){state.openingSeen=true;localStorage.setItem('mfwOpeningSeen','1');state.role='Organizer';state.tab='me';persist();closeSheet();render();toast('Investor tour: Organizer cockpit');}
      else if(a==='questions')questions();
      else if(a==='press-kit')openPressKit(el.getAttribute('data-id')||'e1');
      else if(a==='designer-workspace')openDesignerWorkspace(el.getAttribute('data-id')||'b1');
      else if(a==='brand-portal')openBrandPortal(el.getAttribute('data-id')||'b1');
      else if(a==='brand-predictions-refresh')refreshBrandPredictions(el.getAttribute('data-id')||'b1');
      else if(a==='brand-journeys-tick')tickBrandJourneys(el.getAttribute('data-id')||'b1');
      else if(a==='brand-journey-reactivate')createReactivationJourney(el.getAttribute('data-id')||'b1');
      else if(a==='brand-journeys-run')runBrandJourneys(el.getAttribute('data-id')||'b1');
      else if(a==='brand-segment-power')createPowerSegment(el.getAttribute('data-id')||'b1');
      else if(a==='brand-order-import')openOrderImport(el.getAttribute('data-id')||'b1');
      else if(a==='brand-order-import-submit')submitOrderImport(el.getAttribute('data-id')||'b1');
      else if(a==='brand-campaign')openBrandCampaignBuilder(el.getAttribute('data-id')||'b1',el.getAttribute('data-segment')||'all_followers');
      else if(a==='brand-campaign-submit')submitBrandCampaign(el.getAttribute('data-id')||'b1',el.getAttribute('data-segment')||'all_followers');
      else if(a==='brand-redemption-scanner')openBrandRedemptionScanner(el.getAttribute('data-id')||'b1');
      else if(a==='brand-redeem-submit')submitBrandRedemption(el.getAttribute('data-id')||'b1');
      else if(a==='brand-portal-news')openBrandComposer(el.getAttribute('data-id')||'b1');
      else if(a==='brand-portal-compose-submit')submitBrandComposer(el.getAttribute('data-id')||'b1');
      else if(a==='brand-portal-invite')brandPortalInvite(el.getAttribute('data-id')||'b1');
      else if(a==='brand-portal-notify')brandPortalNotify(el.getAttribute('data-brand')||'b1',el.getAttribute('data-post'));
      else if(a==='brand-portal-paid')brandPortalPublish(el.getAttribute('data-id')||'b1',true);
      else if(a==='brand-portal-discount')brandPortalCreateOffer(el.getAttribute('data-id')||'b1','discount');
      else if(a==='brand-portal-gift')brandPortalCreateOffer(el.getAttribute('data-id')||'b1','gift');
      else if(a==='designer-look-order')designerAction(el.getAttribute('data-id')||'b1','look');
      else if(a==='designer-commercial')designerAction(el.getAttribute('data-id')||'b1','commercial');
      else if(a==='meeting')meeting();
      else if(a==='confirm-meeting'){createMeeting();}
      else if(a==='connect'){state.connections+=1;render();toast(T('Запрос на связь отправлен','Connection request sent'));}
      else if(a==='contact-qr')contactQr();
      else if(a==='networking-scan')networkingCameraScan();
      else if(a==='boards')boards();
      else if(a==='board-add-look')addLookToBoard(el.getAttribute('data-id'));
      else if(a==='board-new')createBoard();
      else if(a==='meetups')meetups();
      else if(a==='join-meetup')joinMeetup(el.getAttribute('data-id'));
      else if(a==='perks')perks();
      else if(a==='mfw-365')openMfw365Feed();
      else if(a==='brand-365')openBrand365(el.getAttribute('data-id')||'b1');
      else if(a==='brand-loyalty')openBrandLoyalty(el.getAttribute('data-id')||'b1');
      else if(a==='loyalty-install'){registerLoyaltyInstall(!isStandaloneApp()).then(function(){openBrandLoyalty(el.getAttribute('data-brand')||'b1');});}
      else if(a==='loyalty-follow-brand'){saveBrand(el.getAttribute('data-brand')||'b1');setTimeout(function(){openBrandLoyalty(el.getAttribute('data-brand')||'b1');},150);}
      else if(a==='social-connect')connectSocialProvider(el.getAttribute('data-platform'));
      else if(a==='loyalty-verify-live')verifyLoyaltySocialLive(el.getAttribute('data-brand')||'b1',el.getAttribute('data-channel'));
      else if(a==='loyalty-verify')verifyLoyaltySocial(el.getAttribute('data-brand')||'b1',el.getAttribute('data-channel'),el.getAttribute('data-mode'));
      else if(a==='loyalty-claim')claimLoyaltyReward(el.getAttribute('data-brand')||'b1',el.getAttribute('data-offer'));
      else if(a==='brand-content-open')recordBrandContentOpen(el.getAttribute('data-post'));
      else if(a==='reschedule-meeting')proposeReschedule();
      else if(a==='line-sheet')openLineSheet(el.getAttribute('data-id')||'b1');
      else if(a==='toggle-shortlist')toggleShortlist(el.getAttribute('data-id')||'b1');
      else if(a==='buyer-followup')buyerFollowup(el.getAttribute('data-id')||'b1');
      else if(a==='route')toast('Demo: маршрут построен');
      else if(a==='toast')toast(el.getAttribute('data-message')||'Готово');
      else if(a==='saved-looks'){state.tab='me';render();}
      else if(a==='camera-scan'){cameraScan();}
      else if(a==='checkin-current'){checkinCurrent(false);}
      else if(a==='offline-current'){offlineCheckinCurrent();}
      else if(a==='tamper-current'){checkinCurrent(true);}
      else if(a==='test-revoked'){testRevokedPass();}
      else if(a==='restart-onboarding'){localStorage.removeItem('mfwOnboarded');state.onboarding=false;render();}
      else if(a==='finish-onboarding'){completeOnboarding();}
      else if(a==='upvote')toast('Голос учтён в demo');
    };});
    var fileInput=document.getElementById('qr-file');
    if(fileInput)fileInput.onchange=function(){if(fileInput.files&&fileInput.files[0])scanImageFile(fileInput.files[0]);};
  }

  document.documentElement.lang=state.lang;
  if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){});});}
  render();
  checkBackend();
  setTimeout(handleSocialAuthReturn,50);
})();