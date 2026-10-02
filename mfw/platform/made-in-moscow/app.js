(function(){
'use strict';
var nav=[].slice.call(document.querySelectorAll('[data-section]'));
function go(section){var el=document.getElementById(section);if(el)el.scrollIntoView({behavior:'smooth',block:'start'});nav.forEach(function(b){b.classList.toggle('active',b.dataset.section===section);});}
nav.forEach(function(b){b.addEventListener('click',function(){go(b.dataset.section);});});
[].slice.call(document.querySelectorAll('[data-action]')).forEach(function(b){b.addEventListener('click',function(){var a=b.dataset.action;if(a==='account')parent.postMessage({type:'mfp-open-account'},'*');if(a==='mfw')parent.postMessage({type:'mfp-open-event',eventCode:'mfw'},'*');if(a==='bfs')parent.postMessage({type:'mfp-open-event',eventCode:'bfs'},'*');});});
window.addEventListener('message',function(e){if(!e.data||typeof e.data!=='object')return;if(e.data.type==='made-open-section')go(e.data.section||'home');if(e.data.type==='mfp-account-state'){var profile=e.data.payload&&e.data.payload.profile||{};var btn=document.querySelector('[data-action="account"]');if(btn&&profile.firstName)btn.textContent=String(profile.firstName).toUpperCase()+' · ONE ID';}});
try{parent.postMessage({type:'mfp-request-account-state'},'*');}catch(e){}
})();