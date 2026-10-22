(function(){
'use strict';
var nav=[].slice.call(document.querySelectorAll('[data-section]'));
var AUTHORITY='https://mfw-authority.onrender.com';
var MEDIA=window.MFP_MEDIA&&window.MFP_MEDIA.ecosystems&&window.MFP_MEDIA.ecosystems.made||{};
var accountState={profile:{},registrations:{mfw:null,bfs:null}};
var madeOverview=null;
// Empty state is an editorial explanation, never fabricated brand cards.
var unverifiedPreview=(document.getElementById('madeBrandGrid')||{}).innerHTML||'';
function renderEditorialMedia(){
  var images=MEDIA.images||{},videos=Array.isArray(MEDIA.videos)?MEDIA.videos:[];
  var hero=document.getElementById('madeHeroVisual');
  if(hero&&images.hero)hero.style.backgroundImage="linear-gradient(180deg,rgba(0,0,0,.02),rgba(0,0,0,.22)),url('"+images.hero+"')";
  var story=document.getElementById('madeMediaStory');if(!story)return;
  story.innerHTML='<article class="made-photo-card"'+(images.brands?' style="background-image:linear-gradient(180deg,rgba(0,0,0,.02),rgba(0,0,0,.78)),url(\''+images.brands+'\')"':'')+'><span>OFFICIAL MFW COVERAGE</span><b>Московские бренды в fashion-контексте</b><small>Редакционный visual layer, без автоматического присвоения Verified.</small></article>'+
   (videos[0]?'<a class="made-video-card" href="'+videos[0].url+'" target="_blank" rel="noopener"><span>VIDEO</span><b>'+videos[0].label+'</b><small>Открыть ↗</small></a>':'');
}
function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,function(ch){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch];});}
function statusLabel(reg){if(!reg)return 'НЕ ЗАРЕГИСТРИРОВАН';return String(reg.status||'active').toUpperCase();}
function renderAccountBridge(){
  var root=document.getElementById('madeAccountBridge');if(!root)return;
  var p=accountState.profile||{},mfw=accountState.registrations&&accountState.registrations.mfw,bfs=accountState.registrations&&accountState.registrations.bfs;
  root.innerHTML='<div class="bridge-head"><span>ONE PLATFORM ID</span><b>'+esc(p.firstName||'ГОСТЬ')+(p.lastName?' '+esc(p.lastName):'')+'</b></div>'+
    '<div class="bridge-status-grid">'+
      '<article><small>MFW</small><b>'+esc(statusLabel(mfw))+'</b><span>показы · бренды · коллекции</span><button data-bridge-event="mfw">ОТКРЫТЬ MFW</button></article>'+
      '<article><small>BFS</small><b>'+esc(statusLabel(bfs))+'</b><span>сессии · делегаты · B2B</span><button data-bridge-event="bfs">ОТКРЫТЬ BFS</button></article>'+
      '<article><small>СДЕЛАНО В МОСКВЕ</small><b>'+((madeOverview&&madeOverview.productionAdmitted)?'AUTHORITY READY':'VERIFIED STATUS SEPARATE')+'</b><span>общий ID, отдельная верификация бренда</span><button data-bridge-section="verified">VERIFIED</button></article>'+
    '</div>';
  [].slice.call(root.querySelectorAll('[data-bridge-event]')).forEach(function(b){b.onclick=function(){parent.postMessage({type:'mfp-open-event',eventCode:b.dataset.bridgeEvent},location.origin);};});
  [].slice.call(root.querySelectorAll('[data-bridge-section]')).forEach(function(b){b.onclick=function(){go(b.dataset.bridgeSection);};});
}
function bindBrandActions(){
  [].slice.call(document.querySelectorAll('[data-made-open-mfw]')).forEach(function(b){b.onclick=function(){parent.postMessage({type:'mfp-open-event',eventCode:'mfw',route:{kind:'brand',id:b.dataset.madeOpenMfw,source:'made_in_moscow'}},location.origin);};});
  [].slice.call(document.querySelectorAll('[data-made-open-buyer]')).forEach(function(b){b.onclick=function(){parent.postMessage({type:'mfp-open-event',eventCode:'bfs',route:{kind:'brand-buyer',brandRef:b.dataset.madeOpenBuyer,source:'made_in_moscow'}},location.origin);};});
}
function resetVerifiedRoster(){
  madeOverview=null;
  var grid=document.getElementById('madeBrandGrid');
  if(grid)grid.innerHTML=unverifiedPreview;
  var count=document.getElementById('verifiedBrandCount');
  if(count)count.textContent='—';
  var admission=document.getElementById('madeAdmissionState');
  if(admission){
    admission.classList.remove('ready');
    admission.innerHTML='<b>PRODUCTION ADMISSION · WAITING</b><span>Статус брендов не подтверждён: нужен действующий PostgreSQL Authority и утверждённый реестр. В интерфейсе не показываются неподтверждённые бренды.</span>';
  }
  renderAccountBridge();
}
function admittedRoster(brands,overview){
  return !!(brands&&brands.source==='postgres'&&
    brands.badge==='made_in_moscow_verified'&&brands.demo!==true&&
    Array.isArray(brands.data)&&overview&&overview.data&&
    overview.data.persistence==='postgres'&&overview.data.productionAdmitted===true);
}
async function hydrateVerifiedRoster(){
  resetVerifiedRoster();
  try{
    var responses=await Promise.all([
      fetch(AUTHORITY+'/v1/made-in-moscow/brands',{headers:{'Cache-Control':'no-cache'}}),
      fetch(AUTHORITY+'/v1/made-in-moscow/overview',{headers:{'Cache-Control':'no-cache'}})
    ]);
    if(!responses[0].ok||!responses[1].ok)throw Error('made_roster_http_unavailable');
    var payloads=await Promise.all(responses.map(function(response){return response.json();}));
    var brandsBody=payloads[0],overviewBody=payloads[1];
    // A successful HTTP 200 with rows, a mock source or a demo claim
    // is not evidence of an approved programme membership.
    if(!admittedRoster(brandsBody,overviewBody))return;
    var rows=brandsBody.data,seen=Object.create(null);
    if(!rows.every(function(row){
      if(!row||typeof row.id!=='string'||typeof row.name!=='string'||
         !row.id.trim()||!row.name.trim()||seen[row.id])return false;
      seen[row.id]=true;return true;
    }))return;
    var grid=document.getElementById('madeBrandGrid');
    if(grid&&rows.length){
      grid.innerHTML=rows.slice(0,12).map(function(b,i){
        var cls=['red','blue','cream'][i%3];
        return '<article class="brand-card '+cls+'"><div class="verified-pill">СДЕЛАНО В МОСКВЕ · VERIFIED</div><div><small>APPROVED POSTGRESQL ROSTER</small><h3>'+esc(b.name)+'</h3><p>'+esc(b.city||'Москва')+' · canonical MFW brand</p><div class="brand-actions"><button data-made-open-mfw="'+esc(b.id)+'">ОТКРЫТЬ В MFW</button><button data-made-open-buyer="'+esc(b.id)+'">BUYER BRIDGE</button></div></div></article>';
      }).join('');
      bindBrandActions();
    }
    if(grid&&!rows.length){
      grid.innerHTML='<article class="made-roster-empty" data-roster-empty="empty">'+
        '<div class="made-roster-empty-kicker"><span class="preview-pill">УТВЕРЖДЁННЫЙ РЕЕСТР · 0</span></div>'+
        '<div class="made-roster-empty-copy"><h3>Опубликованных брендов пока нет</h3>'+
        '<p>Authority допустил реестр, но не вернул опубликованных участников. Это не демонстрационные карточки.</p></div></article>';
    }
    madeOverview=overviewBody.data;
    var count=document.getElementById('verifiedBrandCount');
    if(count)count.textContent=String(rows.length);
    var admission=document.getElementById('madeAdmissionState');
    if(admission){
      admission.classList.add('ready');
      admission.innerHTML='<b>POSTGRESQL AUTHORITY · READY</b><span>Получена допущенная серверная выборка брендов. Количество отражает реестр, а не демонстрационные данные.</span>';
    }
    renderAccountBridge();
  }catch(_){resetVerifiedRoster();}
}
function go(section){var el=document.getElementById(section);if(el)el.scrollIntoView({behavior:'smooth',block:'start'});nav.forEach(function(b){b.classList.toggle('active',b.dataset.section===section);});}
nav.forEach(function(b){b.addEventListener('click',function(){go(b.dataset.section);});});
[].slice.call(document.querySelectorAll('[data-action]')).forEach(function(b){b.addEventListener('click',function(){var a=b.dataset.action;if(a==='account')parent.postMessage({type:'mfp-open-account'},location.origin);if(a==='mfw')parent.postMessage({type:'mfp-open-event',eventCode:'mfw'},location.origin);if(a==='bfs')parent.postMessage({type:'mfp-open-event',eventCode:'bfs'},location.origin);});});
window.addEventListener('message',function(e){if(e.origin!==location.origin||e.source!==parent||!e.data||typeof e.data!=='object')return;if(e.data.type==='made-open-section')go(e.data.section||'home');if(e.data.type==='mfp-account-state'){accountState=e.data.payload||accountState;var profile=accountState.profile||{};var btn=document.querySelector('[data-action="account"]');if(btn&&profile.firstName)btn.textContent=String(profile.firstName).toUpperCase()+' · ONE ID';renderAccountBridge();}});
try{parent.postMessage({type:'mfp-request-account-state'},location.origin);}catch(e){}
renderEditorialMedia();
renderAccountBridge();
hydrateVerifiedRoster();
})();
try{if(parent!==window)parent.postMessage({type:'mfp-frame-ready',eventCode:'made'},location.origin);}catch(_){}