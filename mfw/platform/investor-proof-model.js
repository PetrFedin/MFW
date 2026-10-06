(function(){
  'use strict';
  window.MFP_INVESTOR_MODEL={
    version:'2026-10-06-proof-v1',
    evidenceClasses:[
      {id:'observed',label:'OBSERVED',definition:'Recorded by an MFW/BFS/Made product surface or authority.'},
      {id:'reported',label:'REPORTED',definition:'Reported by an authorised partner but not independently verified.'},
      {id:'verified',label:'VERIFIED',definition:'Confirmed by an admitted external or canonical authority.'},
      {id:'modelled',label:'MODELLED',definition:'Scenario output derived from explicit assumptions.'},
      {id:'synthetic',label:'SYNTHETIC',definition:'Illustrative investor-demo data. Never presented as production performance.'},
      {id:'not_evidenced',label:'NOT EVIDENCED',definition:'The expected business event has not been proven yet.'}
    ],
    syntheticCase:{
      label:'ILLUSTRATIVE / SYNTHETIC',
      participant:{id:'demo-buyer-a',name:'Demo Buyer A',role:'Buyer',market:'International retail'},
      brand:{id:'demo-brand-a',name:'Demo Brand A',category:'Fashion brand'},
      chain:[
        {stage:'IDENTITY',time:'D0',value:'One platform profile',evidence:'synthetic'},
        {stage:'INTEREST',time:'D0',value:'Favorite + collection interest',evidence:'synthetic'},
        {stage:'MATCH',time:'D0',value:'Buyer ↔ brand relevance',evidence:'synthetic'},
        {stage:'MEETING',time:'D1',value:'Bilateral meeting held',evidence:'synthetic'},
        {stage:'INTENT',time:'D1',value:'Line sheet + delivery window request',evidence:'synthetic'},
        {stage:'HANDOFF',time:'D3',value:'External wholesale handoff',evidence:'synthetic'},
        {stage:'30 DAYS',time:'D30',value:'Brand365 retained relationship',evidence:'synthetic'},
        {stage:'90 DAYS',time:'D90',value:'Follow-up / repeat professional action',evidence:'synthetic'},
        {stage:'365 DAYS',time:'D365',value:'Cross-event return / persistent network history',evidence:'synthetic'}
      ]
    },
    partnerConsole:[
      {stage:'PACKAGE',owner:'Partner / organiser',proof:'Signed scope / package',revenueGate:'Contract'},
      {stage:'INVENTORY',owner:'Organiser',proof:'Approved placement inventory',revenueGate:'No revenue yet'},
      {stage:'CAMPAIGN',owner:'Partner + organiser',proof:'Approved campaign / activation',revenueGate:'Delivery terms'},
      {stage:'DELIVERY',owner:'Platform',proof:'Placement / attendance / scan / engagement events',revenueGate:'Delivery evidence'},
      {stage:'HANDOFF',owner:'Partner',proof:'Approved lead or action handoff',revenueGate:'Commercial terms if applicable'},
      {stage:'REPORT',owner:'Platform',proof:'Auditable performance summary',revenueGate:'Invoice eligibility'},
      {stage:'SETTLEMENT',owner:'Finance',proof:'Invoice / payment evidence',revenueGate:'Recognised revenue'}
    ],
    brandFunnel:[
      {stage:'EXPOSURE',proof:'show / profile / replay view'},
      {stage:'RELATIONSHIP',proof:'follow / favorite'},
      {stage:'BUYER SIGNAL',proof:'buyer shortlist / explicit interest'},
      {stage:'MATCH',proof:'match proposal + reason codes'},
      {stage:'MEETING',proof:'bilateral accepted / held'},
      {stage:'DEAL ROOM',proof:'authorised room opened'},
      {stage:'REQUEST',proof:'structured buyer request'},
      {stage:'HANDOFF',proof:'external reference'},
      {stage:'OUTCOME',proof:'reported or verified commercial outcome'}
    ],
    revenueStreams:[
      {id:'partner',payer:'Sponsor / strategic partner',product:'Partner & activation product',formula:'contracted packages × net contract value',recognition:'Contract + delivery + billing/payment evidence'},
      {id:'brand',payer:'Brand / designer organisation',product:'Brand365 / CRM / professional tools',formula:'active paid brand accounts × annual plan',recognition:'Paid subscription contract + billing evidence'},
      {id:'professional',payer:'Professional participant / organisation',product:'B2B / Deal Room services',formula:'paid plans + approved service/transaction fees',recognition:'Contract/fee terms + billable event + payment evidence'},
      {id:'intelligence',payer:'Brand / sponsor / industry organisation',product:'Fashion Intelligence',formula:'subscribed organisations × annual intelligence plan',recognition:'Subscription contract + governed report/API delivery'},
      {id:'api',payer:'Enterprise / technology / media partner',product:'Partner API / enterprise integration',formula:'enterprise contracts + approved metered usage',recognition:'Contract + usage/delivery record + billing evidence'}
    ],
    proofRules:[
      'Interest is not a lead unless an explicit professional action exists.',
      'Meeting is not revenue.',
      'Deal Room request is not an order.',
      'Reported outcome remains REPORTED until external verification exists.',
      'MODELLED economics never appears as realised revenue.',
      'SYNTHETIC demo data is always visually labelled.'
    ]
  };
})();