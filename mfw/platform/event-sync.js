(function(){
  'use strict';
  var KEY='mfp.official.snapshot.v2';
  var CHANGE_KEY='mfp.official.changes.v2';
  var REMINDER_KEY='mfp.reminders.v1';

  function clone(x){return JSON.parse(JSON.stringify(x||null));}
  function load(k,fallback){try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(fallback));}catch(e){return fallback;}}
  function save(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
  function flatCurrent(){
    var d=window.MFP_DATA||{};
    var out={version:d.syncedAt||'',entities:{}};
    ((d.mfw&&d.mfw.events)||[]).forEach(function(x){out.entities['mfw:'+x.id]={event:'mfw',id:x.id,title:x.title,date:x.date,time:x.time,venue:x.venue||'',access:x.access||'',media:x.media||null};});
    ((d.bfs&&d.bfs.sessions)||[]).forEach(function(x){out.entities['bfs:'+x.id]={event:'bfs',id:x.id,title:x.title,date:x.date,time:x.time,end:x.end||'',venue:x.hall||'',access:'',media:x.media||null};});
    return out;
  }
  function compare(prev,next){
    if(!prev||!prev.entities)return [];
    var fields=['title','date','time','end','venue','access'];
    var changes=[];
    Object.keys(next.entities).forEach(function(key){
      var n=next.entities[key],p=prev.entities[key];
      if(!p){changes.push({kind:'entity_added',event:n.event,id:n.id,after:n});return;}
      fields.forEach(function(field){
        if(String(p[field]||'')!==String(n[field]||'')){
          changes.push({kind:field+'_changed',event:n.event,id:n.id,field:field,before:p[field]||'',after:n[field]||'',entity:n});
        }
      });
    });
    Object.keys(prev.entities).forEach(function(key){
      if(!next.entities[key]){
        var p=prev.entities[key];changes.push({kind:'entity_removed',event:p.event,id:p.id,before:p});
      }
    });
    return changes;
  }
  function userSavedSet(){
    var set={};
    load('mfpAgenda.v1',[]).forEach(function(x){set[(x.kind||x.event||'')+':'+x.id]=true;set[(x.eventCode||'').toLowerCase()+':'+x.id]=true;});
    var bfs=load('bfsSavedSessions',{});
    Object.keys(bfs).forEach(function(id){if(bfs[id])set['bfs:'+id]=true;});
    var mfw=load('mfwMyEvents',[]);
    mfw.forEach(function(id){set['mfw:'+id]=true;});
    return set;
  }
  function relevant(changes){
    var saved=userSavedSet();
    return changes.filter(function(c){return saved[c.event+':'+c.id];});
  }
  function changeText(c){
    var title=(c.entity&&c.entity.title)||(c.before&&c.before.title)||c.id;
    if(c.kind==='time_changed')return title+': время изменено '+c.before+' → '+c.after;
    if(c.kind==='end_changed')return title+': время окончания изменено '+c.before+' → '+c.after;
    if(c.kind==='venue_changed')return title+': площадка изменена '+c.before+' → '+c.after;
    if(c.kind==='date_changed')return title+': дата изменена '+c.before+' → '+c.after;
    if(c.kind==='access_changed')return title+': условия доступа изменены';
    if(c.kind==='entity_removed')return title+': событие отсутствует в новом официальном snapshot';
    return title+': официальные данные обновлены';
  }
  function runSync(){
    var current=flatCurrent(),previous=load(KEY,null);
    var changes=compare(previous,current);
    var rel=relevant(changes);
    save(KEY,current);
    save(CHANGE_KEY,{at:new Date().toISOString(),sourceVersion:current.version,all:changes,relevant:rel});
    var detail={all:changes,relevant:rel,version:current.version};
    window.dispatchEvent(new CustomEvent('mfp-official-sync',{detail:detail}));
    return detail;
  }
  function reminders(){return load(REMINDER_KEY,[]);}
  function setReminder(eventCode,id,minutes){
    var list=reminders().filter(function(x){return !(x.event===eventCode&&x.id===id);});
    list.push({event:eventCode,id:id,minutes:Number(minutes||20),createdAt:new Date().toISOString(),enabled:true});
    save(REMINDER_KEY,list);
    return list;
  }
  function removeReminder(eventCode,id){
    var list=reminders().filter(function(x){return !(x.event===eventCode&&x.id===id);});save(REMINDER_KEY,list);return list;
  }
  function requestBrowserPermission(){
    if(!('Notification' in window))return Promise.resolve('unsupported');
    if(Notification.permission==='granted')return Promise.resolve('granted');
    return Notification.requestPermission();
  }
  function findEntity(eventCode,id){
    var d=window.MFP_DATA||{};
    if(eventCode==='mfw')return ((d.mfw&&d.mfw.events)||[]).filter(function(x){return x.id===id;})[0]||null;
    return ((d.bfs&&d.bfs.sessions)||[]).filter(function(x){return x.id===id;})[0]||null;
  }
  function checkDue(now){
    now=now||new Date();
    var out=[];
    reminders().forEach(function(r){
      if(!r.enabled)return;
      var e=findEntity(r.event,r.id);if(!e||!e.date||!e.time)return;
      var start=new Date(e.date+'T'+e.time+':00+03:00');
      var delta=(start.getTime()-now.getTime())/60000;
      if(delta<=r.minutes&&delta>0)out.push({reminder:r,entity:e,minutesUntil:Math.ceil(delta)});
    });
    return out;
  }
  function notifyDue(){
    var due=checkDue(new Date());
    if(!due.length)return due;
    if('Notification' in window&&Notification.permission==='granted'){
      due.forEach(function(x){new Notification((x.reminder.event==='mfw'?'MFW':'BFS')+' · '+x.entity.title,{body:'Начало через '+x.minutesUntil+' мин. · '+(x.entity.venue||x.entity.hall||'')});});
    }
    window.dispatchEvent(new CustomEvent('mfp-reminders-due',{detail:due}));
    return due;
  }
  window.MFP_SYNC={
    run:runSync,
    changes:function(){return load(CHANGE_KEY,{all:[],relevant:[]});},
    reminders:reminders,
    setReminder:setReminder,
    removeReminder:removeReminder,
    requestBrowserPermission:requestBrowserPermission,
    checkDue:checkDue,
    notifyDue:notifyDue,
    changeText:changeText
  };
  setTimeout(runSync,80);
  setInterval(notifyDue,60000);
})();