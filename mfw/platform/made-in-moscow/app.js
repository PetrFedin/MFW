(function(){
'use strict';
var nav=[].slice.call(document.querySelectorAll('[data-section]'));
var AUTHORITY='https://mfw-authority.onrender.com';
var MEDIA=window.MFP_MEDIA&&window.MFP_MEDIA.ecosystems&&window.MFP_MEDIA.ecosystems.made||{};
function renderEditorialMedia(){
  var images=MEDIA.images||{},videos=Array.isArray(MEDIA.videos)?MEDIA.videos:[];
  var hero=document.getElementById('madeHeroVisual');
  if(hero&&images.hero)hero.style.backgroundImage="linear-gradient(180deg,rgba(0,0,0,.02),rgba(0,0,0,.22)),url('"+images.hero+"')";
  var story=document.getElementById('madeMediaStory');if(!story)return;
  story.innerHTML='<article class="made-photo-card"'+(images.brands?' style="background-image:linear-gradient(180deg,rgba(0,0,0,.02),rgba(0,0,0,.78)),url(\''+images.brands+'\')"':'')+'><span>OFFICIAL MFW COVERAGE</span><b>Московские бренды в fashion-контексте</b><small>Редакционный visual layer, без автоматического присвоения Verified.</small></article>'+
   (videos[0]?'<a class="made-video-card" href="'+videos[0].url+'" target="_blank" rel="noopener"><span>VIDEO</span><b>'+videos[0].label+'</b><small>Открыть ↗</small></a>':'');
}
function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,function(ch){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch];});}
async function hydrateVerifiedRoster(){
  try{
    var responses=await Promise.all([
      fetch(AUTHORITY+'/v1/made-in-moscow/brands',{headers:{'Cache-Control':'no-cache'}}),
      fetch(AUTHORITY+'/v1/made-in-moscow/overview',{headers:{'Cache-Control':'no-cache'}})
    ]);
    var brandsBody=await responses[0].json();
    var overviewBody=await responses[1].json();
    var rows=Array.isArray(brandsBody.data)?brandsBody.data:[];
    var count=document.getElementById('verifiedBrandCount');
    if(count)count.textContent=String(overviewBody&&overviewBody.data&&overviewBody.data.verifiedBrands!=null?overviewBody.data.verifiedBrands:rows.length);
    if(rows.length){
      var grid=document.getElementById('madeBrandGrid');
      if(grid)grid.innerHTML=rows.slice(0,12).map(function(b,i){
        var cls=['red','blue','cream'][i%3];
        return '<article class="brand-card '+cls+'"><div class="verified-pill">СДЕЛАНО В МОСКВЕ · VERIFIED</div><div><small>VERIFIED ROSTER</small><h3>'+esc(b.name)+'</h3><p>'+esc(b.city||'Москва')+' · canonical MFW brand</p></div></article>';
      }).join('');
    }
  }catch(_){}
}
function go(section){var el=document.getElementById(section);if(el)el.scrollIntoView({behavior:'smooth',block:'start'});nav.forEach(function(b){b.classList.toggle('active',b.dataset.section===section);});}
nav.forEach(function(b){b.addEventListener('click',function(){go(b.dataset.section);});});
[].slice.call(document.querySelectorAll('[data-action]')).forEach(function(b){b.addEventListener('click',function(){var a=b.dataset.action;if(a==='account')parent.postMessage({type:'mfp-open-account'},'*');if(a==='mfw')parent.postMessage({type:'mfp-open-event',eventCode:'mfw'},'*');if(a==='bfs')parent.postMessage({type:'mfp-open-event',eventCode:'bfs'},'*');});});
window.addEventListener('message',function(e){if(!e.data||typeof e.data!=='object')return;if(e.data.type==='made-open-section')go(e.data.section||'home');if(e.data.type==='mfp-account-state'){var profile=e.data.payload&&e.data.payload.profile||{};var btn=document.querySelector('[data-action="account"]');if(btn&&profile.firstName)btn.textContent=String(profile.firstName).toUpperCase()+' · ONE ID';}});
try{parent.postMessage({type:'mfp-request-account-state'},'*');}catch(e){}
renderEditorialMedia();
hydrateVerifiedRoster();
})();