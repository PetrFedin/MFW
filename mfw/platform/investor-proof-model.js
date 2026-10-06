(function(){
  'use strict';
  window.MFP_INVESTOR_MODEL={
    version:'2026-10-06-control-tower-v1',
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
    controlTower:{
      cases:[
        {
          id:'buyer-brand-alpha',
          label:'CASE 01 · BUYER × BRAND',
          participant:{id:'demo-buyer-a',name:'Demo Buyer A',role:'Buyer',organisation:'Demo Retail Group',market:'International retail',source:'MFW professional accreditation'},
          brand:{id:'demo-brand-a',name:'Demo Brand A',category:'Contemporary fashion',origin:'Moscow'},
          potentialRevenueStreams:['professional','brand','intelligence'],
          dossier:[
            {stage:'SOURCE',time:'D-14',event:'MFW',detail:'Buyer profile enters through professional accreditation.',reason:'Explicit buyer role and organisation.',evidence:'synthetic',ref:'demo://registration/mfw/demo-buyer-a'},
            {stage:'SEEN',time:'D0',event:'MFW',detail:'Buyer opens a runway show and brand profile.',reason:'Programme + collection discovery.',evidence:'synthetic',ref:'demo://event/show-view/demo-buyer-a'},
            {stage:'SAVED',time:'D0',event:'MFW',detail:'Buyer saves a collection look and favorites the brand.',reason:'Explicit user action.',evidence:'synthetic',ref:'demo://interest/look-07+brand-a'},
            {stage:'RECOMMENDED',time:'D0',event:'PLATFORM',detail:'Brand appears in professional recommendations.',reason:'Buyer role + category overlap + explicit saved look.',evidence:'synthetic',ref:'demo://recommendation/buyer-brand-alpha'},
            {stage:'MEETING PROPOSED',time:'D0',event:'BFS',detail:'A conflict-free bilateral meeting slot is proposed.',reason:'Mutual objective + market/category fit + availability.',evidence:'synthetic',ref:'demo://match/proposal-001'},
            {stage:'MEETING HELD',time:'D1',event:'BFS',detail:'Both parties attend the confirmed meeting.',reason:'Bilateral acceptance and attendance event.',evidence:'synthetic',ref:'demo://meeting/held-001'},
            {stage:'INTENT',time:'D1',event:'DEAL ROOM',detail:'Buyer requests line sheet and delivery window.',reason:'Explicit structured professional request.',evidence:'synthetic',ref:'demo://deal-room/request-001'},
            {stage:'DEAL ROOM',time:'D1',event:'PLATFORM',detail:'Authorised room stores shortlist, request and approved documents.',reason:'Confirmed bilateral relationship.',evidence:'synthetic',ref:'demo://deal-room/room-001'},
            {stage:'HANDOFF',time:'D3',event:'EXTERNAL',detail:'Approved wholesale handoff is created to an external system.',reason:'Both parties choose to continue outside MFW.',evidence:'synthetic',ref:'demo://handoff/ext-001'},
            {stage:'30 DAYS',time:'D30',event:'BRAND365',detail:'Buyer remains in the opted-in brand relationship layer.',reason:'Verified continuity event in the demo scenario.',evidence:'synthetic',ref:'demo://continuity/d30-001'},
            {stage:'90 DAYS',time:'D90',event:'PLATFORM',detail:'A repeat professional follow-up is recorded.',reason:'Explicit follow-up interaction.',evidence:'synthetic',ref:'demo://continuity/d90-001'},
            {stage:'365 DAYS',time:'D365',event:'CROSS-EVENT',detail:'Buyer returns in a later event cycle; longitudinal history persists.',reason:'Repeat participation with the same canonical identity.',evidence:'synthetic',ref:'demo://continuity/d365-001'}
          ]
        },
        {
          id:'delegate-made-beta',
          label:'CASE 02 · DELEGATE × MADE BRAND',
          participant:{id:'demo-delegate-b',name:'Demo Delegate B',role:'Delegate',organisation:'Demo Fashion Council',market:'BRICS market development',source:'BFS managed delegation'},
          brand:{id:'demo-made-b',name:'Demo Made Brand B',category:'Accessories',origin:'Moscow'},
          potentialRevenueStreams:['professional','brand','api'],
          dossier:[
            {stage:'SOURCE',time:'D-21',event:'BFS',detail:'Delegate is admitted through a managed delegation.',reason:'Verified organisation role in the synthetic scenario.',evidence:'synthetic',ref:'demo://registration/bfs/demo-delegate-b'},
            {stage:'SEEN',time:'D0',event:'BFS',detail:'Delegate saves an international retail session.',reason:'Explicit programme interest.',evidence:'synthetic',ref:'demo://session/save-002'},
            {stage:'SAVED',time:'D0',event:'MADE',detail:'Delegate opens and saves a Made in Moscow brand profile.',reason:'Explicit showroom action.',evidence:'synthetic',ref:'demo://made/save-brand-b'},
            {stage:'RECOMMENDED',time:'D0',event:'PLATFORM',detail:'Made brand is recommended for market-fit discussion.',reason:'Declared market objective + category overlap.',evidence:'synthetic',ref:'demo://recommendation/delegate-made-beta'},
            {stage:'MEETING PROPOSED',time:'D1',event:'BFS',detail:'Meeting proposal is generated with disclosed reason codes.',reason:'Organisation objective + brand market interest.',evidence:'synthetic',ref:'demo://match/proposal-002'},
            {stage:'MEETING HELD',time:'D1',event:'BFS',detail:'Meeting attendance is recorded.',reason:'Bilateral acceptance and attendance.',evidence:'synthetic',ref:'demo://meeting/held-002'},
            {stage:'INTENT',time:'D2',event:'DEAL ROOM',detail:'Delegate requests showroom appointment and wholesale materials.',reason:'Explicit request types.',evidence:'synthetic',ref:'demo://deal-room/request-002'},
            {stage:'DEAL ROOM',time:'D2',event:'PLATFORM',detail:'Approved materials are shared under room ACL.',reason:'Authorised bilateral room.',evidence:'synthetic',ref:'demo://deal-room/room-002'},
            {stage:'HANDOFF',time:'D5',event:'EXTERNAL',detail:'Showroom appointment handoff is recorded.',reason:'External continuation approved by both parties.',evidence:'synthetic',ref:'demo://handoff/ext-002'},
            {stage:'30 DAYS',time:'D30',event:'MADE',detail:'Brand relationship remains active in the shared graph.',reason:'Synthetic continuity event.',evidence:'synthetic',ref:'demo://continuity/d30-002'},
            {stage:'90 DAYS',time:'D90',event:'BFS',detail:'Market discussion resumes through a repeat professional action.',reason:'Synthetic follow-up event.',evidence:'synthetic',ref:'demo://continuity/d90-002'},
            {stage:'365 DAYS',time:'D365',event:'CROSS-EVENT',detail:'Organisation returns and the same trust history is reusable.',reason:'Canonical identity + portable event history.',evidence:'synthetic',ref:'demo://continuity/d365-002'}
          ]
        },
        {
          id:'buyer-brand-gamma',
          label:'CASE 03 · RETURNING BUYER',
          participant:{id:'demo-buyer-c',name:'Demo Buyer C',role:'Buyer',organisation:'Demo Concept Store',market:'CIS retail',source:'Returning cross-event professional identity'},
          brand:{id:'demo-brand-c',name:'Demo Brand C',category:'Womenswear',origin:'Moscow'},
          potentialRevenueStreams:['brand','professional','partner','intelligence'],
          dossier:[
            {stage:'SOURCE',time:'D-365',event:'CROSS-EVENT',detail:'Returning buyer already has verified prior participation history.',reason:'Previous event participation in the synthetic scenario.',evidence:'synthetic',ref:'demo://identity/returning-buyer-c'},
            {stage:'SEEN',time:'D0',event:'MFW',detail:'Buyer watches a new-season show.',reason:'Followed-brand programme relevance.',evidence:'synthetic',ref:'demo://show/view-003'},
            {stage:'SAVED',time:'D0',event:'MFW',detail:'Buyer adds the brand to shortlist.',reason:'Explicit buyer shortlist action.',evidence:'synthetic',ref:'demo://shortlist/brand-c'},
            {stage:'RECOMMENDED',time:'D0',event:'PLATFORM',detail:'Recommendation prioritises a repeat relationship.',reason:'Explicit prior relationship + current category fit.',evidence:'synthetic',ref:'demo://recommendation/buyer-brand-gamma'},
            {stage:'MEETING PROPOSED',time:'D0',event:'BFS',detail:'Optimizer proposes a slot around the buyer agenda.',reason:'Availability + relationship continuity.',evidence:'synthetic',ref:'demo://match/proposal-003'},
            {stage:'MEETING HELD',time:'D1',event:'BFS',detail:'Repeat meeting is held.',reason:'Bilateral confirmed attendance.',evidence:'synthetic',ref:'demo://meeting/held-003'},
            {stage:'INTENT',time:'D1',event:'DEAL ROOM',detail:'Buyer requests availability, MOQ and sample.',reason:'Explicit commercial intent.',evidence:'synthetic',ref:'demo://deal-room/request-003'},
            {stage:'DEAL ROOM',time:'D1',event:'PLATFORM',detail:'Room records documents and response status.',reason:'Authorised professional relationship.',evidence:'synthetic',ref:'demo://deal-room/room-003'},
            {stage:'HANDOFF',time:'D4',event:'EXTERNAL',detail:'External CRM/wholesale reference is attached.',reason:'Approved handoff contract.',evidence:'synthetic',ref:'demo://handoff/ext-003'},
            {stage:'30 DAYS',time:'D30',event:'BRAND365',detail:'Brand sends an opted-in professional update.',reason:'Consent + relationship continuity.',evidence:'synthetic',ref:'demo://continuity/d30-003'},
            {stage:'90 DAYS',time:'D90',event:'PLATFORM',detail:'Partner reports continued negotiation.',reason:'Partner-reported outcome remains non-verified.',evidence:'reported',ref:'demo://reported/outcome-003'},
            {stage:'365 DAYS',time:'D365',event:'CROSS-EVENT',detail:'Buyer returns; verified history supports future matchmaking.',reason:'Longitudinal network history.',evidence:'synthetic',ref:'demo://continuity/d365-003'}
          ]
        }
      ],
      syntheticPortfolio:{
        label:'ILLUSTRATIVE / SYNTHETIC PORTFOLIO',
        population:1200,
        funnel:[
          {stage:'AUDIENCE',count:1200,evidence:'synthetic'},
          {stage:'ENGAGEMENT',count:720,evidence:'synthetic'},
          {stage:'QUALIFIED BUYER',count:180,evidence:'synthetic'},
          {stage:'MEETING',count:108,evidence:'synthetic'},
          {stage:'INTENT',count:65,evidence:'synthetic'},
          {stage:'DEAL',count:31,evidence:'synthetic'},
          {stage:'RETENTION',count:22,evidence:'synthetic'},
          {stage:'REVENUE EVIDENCE',count:12,evidence:'synthetic'}
        ],
        ecosystems:[
          {id:'mfw',label:'MFW',journeys:640,qualifiedBuyers:96,meetings:54,intents:31},
          {id:'bfs',label:'BFS',journeys:360,qualifiedBuyers:72,meetings:46,intents:29},
          {id:'made',label:'MADE',journeys:200,qualifiedBuyers:12,meetings:8,intents:5}
        ],
        retention:[
          {period:'D30',eligible:65,retained:46},
          {period:'D90',eligible:46,retained:31},
          {period:'D365',eligible:31,retained:22}
        ],
        evidenceMix:[
          {class:'observed',count:0,note:'Synthetic portfolio has no production observed events.'},
          {class:'reported',count:7,note:'Illustrative partner-reported outcomes.'},
          {class:'verified',count:5,note:'Illustrative externally verified outcomes.'},
          {class:'synthetic',count:1200,note:'All portfolio counts are synthetic scenario data.'}
        ],
        potentialRevenueStreams:[
          {id:'brand',journeysTouched:220,note:'Potential Brand365 / CRM surface'},
          {id:'professional',journeysTouched:65,note:'Potential B2B / Deal Room surface'},
          {id:'partner',journeysTouched:1200,note:'Potential sponsor/activation delivery surface'},
          {id:'intelligence',journeysTouched:1200,note:'Potential privacy-safe aggregate intelligence surface'},
          {id:'api',journeysTouched:31,note:'Potential enterprise handoff/API surface'}
        ]
      }
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