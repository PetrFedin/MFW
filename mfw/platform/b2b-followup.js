/* MFW B2B Follow-up · deterministic read-only projection.
   Accept only owner-scoped postgres responses. No network, revenue guesses,
   contact export or automatic business messages. */
(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.MFP_B2B_FOLLOWUP=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  var STAGES=['interest','meeting_requested','meeting_confirmed','met','follow_up','qualified','won','lost'];
  var CLOSED=['won','lost'];
  var EVENTS={mfw:'MFW',bfs:'BFS',made_in_moscow:'Сделано в Москве'};
  var stageLabels={interest:'Первичный интерес',meeting_requested:'Запрос встречи',
    meeting_confirmed:'Встреча согласована',met:'Встреча проведена',
    follow_up:'Сопровождение',qualified:'Квалифицированный лид',
    won:'Положительный итог по данным CRM',lost:'Закрыто без результата'};
  function canonicalId(v){
    var s=String(v==null?'':v).trim();
    return s.length&&s.length<=160?s:'';
  }
  function timestamp(v){
    if(typeof v!=='string'||!/\d{4}-\d{2}-\d{2}T/.test(v))return null;
    var t=Date.parse(v);
    return Number.isFinite(t)?t:null;
  }
  function build(leadsResponse,meetingsResponse,now){
    if(!leadsResponse||!meetingsResponse||
       leadsResponse.source!=='postgres'||meetingsResponse.source!=='postgres'||
       leadsResponse.demo===true||meetingsResponse.demo===true||
       !Array.isArray(leadsResponse.data)||!Array.isArray(meetingsResponse.data))
      return {ready:false,reason:'postgres_session_evidence_required',rows:[],totals:null};
    var current=typeof now==='number'?now:Date.parse(String(now||new Date().toISOString()));
    if(!Number.isFinite(current))
      return {ready:false,reason:'invalid_clock',rows:[],totals:null};
    var meetings=new Map(),ids=new Set();
    for(var m of meetingsResponse.data){
      var mid=canonicalId(m&&m.id);
      if(!mid||meetings.has(mid))
        return {ready:false,reason:'meeting_identity_integrity_failed',rows:[],totals:null};
      meetings.set(mid,m);
    }
    var rows=[];
    for(var lead of leadsResponse.data){
      var id=canonicalId(lead&&lead.id);
      if(!id||ids.has(id))
        return {ready:false,reason:'lead_identity_integrity_failed',rows:[],totals:null};
      ids.add(id);
      var stage=STAGES.includes(lead.stage)?lead.stage:'unknown';
      var closed=CLOSED.includes(stage);
      var action=typeof lead.nextAction==='string'?lead.nextAction.trim().slice(0,500):'';
      var dueAt=timestamp(lead.nextActionAt);
      var hasDue=dueAt!==null;
      var dueStatus=closed?'closed':(!action||!hasDue?'missing':dueAt<current?'overdue':'scheduled');
      var meetingId=canonicalId(lead.meetingId);
      var meeting=meetingId?meetings.get(meetingId):null;
      var event=Object.prototype.hasOwnProperty.call(EVENTS,lead.eventBrand)?lead.eventBrand:'unknown';
      rows.push({
        id:id,meetingId:meetingId,meetingStatus:meeting?String(meeting.status||'unknown'):'',
        meetingLinked:!!meeting,meetingMissing:!!meetingId&&!meeting,
        event:event,eventLabel:EVENTS[event]||'Неопределённое событие',
        organisation:typeof lead.organisationName==='string'?lead.organisationName.slice(0,200):'',
        counterpart:typeof lead.counterpartName==='string'?lead.counterpartName.slice(0,200):'',
        stage:stage,stageLabel:stageLabels[stage]||'Неизвестный этап CRM',
        nextAction:action,dueAt:dueAt,dueStatus:dueStatus,
        // A CRM win is not a paid order. No financial data is inferred.
        revenueVerified:false,source:'user_scoped_b2b_lead'
      });
    }
    var weights={overdue:0,missing:1,scheduled:2,closed:3};
    rows.sort(function(a,b){
      return weights[a.dueStatus]-weights[b.dueStatus]||
        (a.dueAt===null?Infinity:a.dueAt)-(b.dueAt===null?Infinity:b.dueAt)||
        a.id.localeCompare(b.id);
    });
    return {
      ready:true,reason:null,rows:rows,asOf:new Date(current).toISOString(),
      totals:{all:rows.length,overdue:rows.filter(r=>r.dueStatus==='overdue').length,
        missing:rows.filter(r=>r.dueStatus==='missing').length,
        scheduled:rows.filter(r=>r.dueStatus==='scheduled').length,
        closed:rows.filter(r=>r.dueStatus==='closed').length,
        unlinkedMeetings:rows.filter(r=>r.meetingMissing).length},
      truthBoundary:'Only owner-scoped PostgreSQL leads and meetings; no inferred revenue or verified counterpart consent.'
    };
  }
  return Object.freeze({build:build});
});
