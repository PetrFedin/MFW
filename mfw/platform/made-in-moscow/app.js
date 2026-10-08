(function(){
'use strict';
var nav=[].slice.call(document.querySelectorAll('[data-section]'));
var AUTHORITY='https://mfw-authority.onrender.com';
var MEDIA=window.MFP_MEDIA&&window.MFP_MEDIA.ecosystems&&window.MFP_MEDIA.ecosystems.made||{};
var accountState={profile:{},registrations:{mfw:null,bfs:null}};
var madeOverview=null;
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
  [].slice.call(root.querySelectorAll('[data-bridge-event]')).forEach(function(b){b.onclick=function(){parent.postMessage({type:'mfp-open-event',eventCode:b.dataset.bridgeEvent},'*');};});
  [].slice.call(root.querySelectorAll('[data-bridge-section]')).forEach(function(b){b.onclick=function(){go(b.dataset.bridgeSection);};});
}
function bindBrandActions(){
  [].slice.call(document.querySelectorAll('[data-made-open-mfw]')).forEach(function(b){b.onclick=function(){parent.postMessage({type:'mfp-open-event',eventCode:'mfw',route:{kind:'brand',id:b.dataset.madeOpenMfw,source:'made_in_moscow'}},'*');};});
  [].slice.call(document.querySelectorAll('[data-made-open-buyer]')).forEach(function(b){b.onclick=function(){parent.postMessage({type:'mfp-open-event',eventCode:'bfs',route:{kind:'brand-buyer',brandRef:b.dataset.madeOpenBuyer,source:'made_in_moscow'}},'*');};});
}
async function hydrateVerifiedRoster(){
  try{
    var responses=await Promise.all([
      fetch(AUTHORITY+'/v1/made-in-moscow/brands',{headers:{'Cache-Control':'no-cache'}}),
      fetch(AUTHORITY+'/v1/made-in-moscow/overview',{headers:{'Cache-Control':'no-cache'}})
    ]);
    var brandsBody=await responses[0].json();
    var overviewBody=await responses[1].json();
    var rows=Array.isArray(brandsBody.data)?brandsBody.data:[];
    madeOverview=overviewBody&&overviewBody.data||null;
    var count=document.getElementById('verifiedBrandCount');
    if(count)count.textContent=String(overviewBody&&overviewBody.data&&overviewBody.data.verifiedBrands!=null?overviewBody.data.verifiedBrands:rows.length);
    if(rows.length){
      var grid=document.getElementById('madeBrandGrid');
      if(grid)grid.innerHTML=rows.slice(0,12).map(function(b,i){
        var cls=['red','blue','cream'][i%3];
        return '<article class="brand-card '+cls+'"><div class="verified-pill">СДЕЛАНО В МОСКВЕ · VERIFIED</div><div><small>VERIFIED ROSTER</small><h3>'+esc(b.name)+'</h3><p>'+esc(b.city||'Москва')+' · canonical MFW brand</p><div class="brand-actions"><button data-made-open-mfw="'+esc(b.id)+'">ОТКРЫТЬ В MFW</button><button data-made-open-buyer="'+esc(b.id)+'">BUYER BRIDGE</button></div></div></article>';
      }).join('')+'<article class="brand-card cream preview-card"><div><small>DEMO SLOT · PREVIEW ONLY</small><h3>Московский бренд</h3><p>Неподтверждённый preview не получает Verified badge и не считается участником программы.</p></div></article>';
      bindBrandActions();
    }
    var admission=document.getElementById('madeAdmissionState');
    if(admission){
      var admitted=!!(madeOverview&&madeOverview.productionAdmitted);
      admission.innerHTML='<b>'+(admitted?'POSTGRESQL AUTHORITY · READY':'PRODUCTION ADMISSION · WAITING')+'</b><span>'+(admitted?'Verified roster и service applications читаются из admitted PostgreSQL authority.':'Раздел работает как связанный preview; реальные Verified бренды не публикуются без PostgreSQL admission и утверждённого roster.')+'</span>';
      admission.classList.toggle('ready',admitted);
    }
    renderAccountBridge();
  }catch(_){renderAccountBridge();}
}
function go(section){var el=document.getElementById(section);if(el)el.scrollIntoView({behavior:'smooth',block:'start'});nav.forEach(function(b){b.classList.toggle('active',b.dataset.section===section);});}
nav.forEach(function(b){b.addEventListener('click',function(){go(b.dataset.section);});});
[].slice.call(document.querySelectorAll('[data-action]')).forEach(function(b){b.addEventListener('click',function(){var a=b.dataset.action;if(a==='account')parent.postMessage({type:'mfp-open-account'},'*');if(a==='mfw')parent.postMessage({type:'mfp-open-event',eventCode:'mfw'},'*');if(a==='bfs')parent.postMessage({type:'mfp-open-event',eventCode:'bfs'},'*');});});
window.addEventListener('message',function(e){if(!e.data||typeof e.data!=='object')return;if(e.data.type==='made-open-section')go(e.data.section||'home');if(e.data.type==='mfp-account-state'){accountState=e.data.payload||accountState;var profile=accountState.profile||{};var btn=document.querySelector('[data-action="account"]');if(btn&&profile.firstName)btn.textContent=String(profile.firstName).toUpperCase()+' · ONE ID';renderAccountBridge();}});
try{parent.postMessage({type:'mfp-request-account-state'},'*');}catch(e){}
renderEditorialMedia();
renderAccountBridge();
hydrateVerifiedRoster();
})();