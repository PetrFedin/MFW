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
    // Never interpret a server deadline as the browser's local wall time.
    // PostgreSQL timestamptz serializes with an explicit zone/offset.
    if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(v))return null;
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
    var meetings=new Map(),ids=new Set(),meetingClaims=new Set();
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
      var dueSoon=dueStatus==='scheduled'&&dueAt-current<=72*3600000;
      var overdueDays=dueStatus==='overdue'?Math.ceil((current-dueAt)/86400000):0;
      var meetingId=canonicalId(lead.meetingId);
      if(meetingId&&meetingClaims.has(meetingId))
        return {ready:false,reason:'meeting_lead_uniqueness_failed',rows:[],totals:null};
      if(meetingId)meetingClaims.add(meetingId);
      var meeting=meetingId?meetings.get(meetingId):null;
      var event=Object.prototype.hasOwnProperty.call(EVENTS,lead.eventBrand)?lead.eventBrand:'unknown';
      var missingMeeting=!!meetingId&&!meeting;
      var meetingConflict=!!meeting&&(
        (stage==='met'&&meeting.status!=='completed')||
        (stage==='meeting_confirmed'&&['cancelled','declined'].includes(meeting.status)));
      // Deterministic operational priority; not an AI prediction or client score.
      // 82 overdue, 62 missing step, 45 due in 72h, 24 scheduled, 0 terminal.
      var base=closed?0:dueStatus==='overdue'?82:dueStatus==='missing'?62:dueSoon?45:24;
      var priorityScore=Math.min(100,base+
        (closed?0:Math.min(10,overdueDays))+
        (missingMeeting?8:0)+(meetingConflict?8:0)+(stage==='unknown'?4:0));
      var priorityReasons=[];
      if(dueStatus==='overdue')priorityReasons.push('Срок следующего действия прошёл');
      if(dueStatus==='missing')priorityReasons.push('Нет действия с подтверждённым сроком');
      if(dueSoon)priorityReasons.push('Следующее действие в течение 72 часов');
      if(missingMeeting)priorityReasons.push('Связанная встреча отсутствует в доступной выборке');
      if(meetingConflict)priorityReasons.push('Этап CRM расходится со статусом встречи');
      if(stage==='unknown')priorityReasons.push('Нераспознанный этап CRM');
      rows.push({
        id:id,meetingId:meetingId,meetingStatus:meeting?String(meeting.status||'unknown'):'',
        meetingLinked:!!meeting,meetingMissing:missingMeeting,meetingConflict:meetingConflict,
        event:event,eventLabel:EVENTS[event]||'Неопределённое событие',
        organisation:typeof lead.organisationName==='string'?lead.organisationName.slice(0,200):'',
        counterpart:typeof lead.counterpartName==='string'?lead.counterpartName.slice(0,200):'',
        stage:stage,stageLabel:stageLabels[stage]||'Неизвестный этап CRM',
        nextAction:action,dueAt:dueAt,dueStatus:dueStatus,
        dueSoon:dueSoon,overdueDays:overdueDays,
        priorityScore:priorityScore,priorityReasons:priorityReasons,
        priorityBand:closed?'closed':priorityScore>=80?'urgent':priorityScore>=60?'attention':
          priorityScore>=40?'soon':'planned',
        // A CRM win is not a paid order. No financial data is inferred.
        revenueVerified:false,source:'user_scoped_b2b_lead'
      });
    }
    rows.sort(function(a,b){
      return b.priorityScore-a.priorityScore||
        (a.dueAt===null?Infinity:a.dueAt)-(b.dueAt===null?Infinity:b.dueAt)||
        a.id.localeCompare(b.id);
    });
    var active=rows.filter(function(r){return r.dueStatus!=='closed';});
    var scheduledActions=active.filter(function(r){return !!r.nextAction&&r.dueAt!==null;}).length;
    var leadLinks=rows.filter(function(r){return !!r.meetingId;});
    var linked=leadLinks.filter(function(r){return r.meetingLinked;}).length;
    var stageMix=Object.fromEntries(STAGES.concat(['unknown']).map(function(x){return [x,0];}));
    var eventMix={mfw:0,bfs:0,made_in_moscow:0,unknown:0};
    rows.forEach(function(row){stageMix[row.stage]++;eventMix[row.event]++;});
    function ratio(n,d){return d?Math.round(n*1000/d)/10:null;}
    var analytics={
      open:active.length,
      needsAttention:active.filter(function(r){return r.priorityScore>=60;}).length,
      dueSoon:active.filter(function(r){return r.dueSoon;}).length,
      overdueDaysTotal:active.reduce(function(sum,r){return sum+r.overdueDays;},0),
      plannedActions:scheduledActions,actionCoveragePct:ratio(scheduledActions,active.length),
      linkedMeetings:linked,meetingRefs:leadLinks.length,
      meetingLinkCoveragePct:ratio(linked,leadLinks.length),
      meetingConflicts:rows.filter(function(r){return r.meetingConflict;}).length,
      stageMix:stageMix,eventMix:eventMix,
      methodology:'Покрытие действий = открытые лиды с действием и сроком / открытые лиды. Доля связанных встреч = доступные встречи / лиды с meetingId. Приоритет = 82/62/45/24/0 по дедлайну + 1–10 за дни просрочки + 8 за недоступную встречу + 8 за расхождение этапов + 4 за неизвестный этап; максимум 100. Это правило очереди, не вероятность сделки.'
    };
    return {
      ready:true,reason:null,rows:rows,analytics:analytics,asOf:new Date(current).toISOString(),
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
