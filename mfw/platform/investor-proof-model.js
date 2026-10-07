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
          primaryEcosystem:'mfw',
          portfolioTags:{period:'2026-Q3',ecosystem:'mfw',market:'Europe',category:'Contemporary',buyerType:'new',evidence:'synthetic',revenueSurface:'professional'},
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
          primaryEcosystem:'made',
          portfolioTags:{period:'2026-Q4',ecosystem:'made',market:'GCC',category:'Accessories',buyerType:'new',evidence:'synthetic',revenueSurface:'brand'},
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
          primaryEcosystem:'bfs',
          portfolioTags:{period:'2026-Q4',ecosystem:'bfs',market:'CIS',category:'Tech',buyerType:'returning',evidence:'reported',revenueSurface:'api'},
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
        filterOptions:{
          period:['all','2026-Q3','2026-Q4'],
          ecosystem:['all','mfw','bfs','made'],
          market:['all','CIS','Europe','GCC','Asia'],
          category:['all','Contemporary','Womenswear','Menswear','Accessories','Tech'],
          buyerType:['all','new','returning'],
          evidence:['all','verified','reported','synthetic'],
          retention:['D30','D90','D365'],
          revenueSurface:['all','brand','professional','partner','intelligence','api']
        },
        cohorts:[
          {id:'c01',period:'2026-Q3',ecosystem:'mfw',market:'CIS',category:'Contemporary',buyerType:'returning',evidence:'verified',revenueSurface:'brand',audience:120,engagement:75,qualifiedBuyer:20,meeting:12,intent:8,deal:4,revenueEvidence:1,retention:{D30:5,D90:3,D365:2}},
          {id:'c02',period:'2026-Q3',ecosystem:'mfw',market:'Europe',category:'Womenswear',buyerType:'new',evidence:'reported',revenueSurface:'professional',audience:110,engagement:70,qualifiedBuyer:18,meeting:11,intent:7,deal:3,revenueEvidence:1,retention:{D30:4,D90:3,D365:2}},
          {id:'c03',period:'2026-Q3',ecosystem:'mfw',market:'GCC',category:'Menswear',buyerType:'new',evidence:'synthetic',revenueSurface:'partner',audience:100,engagement:65,qualifiedBuyer:16,meeting:10,intent:6,deal:3,revenueEvidence:1,retention:{D30:4,D90:3,D365:2}},
          {id:'c04',period:'2026-Q4',ecosystem:'mfw',market:'Asia',category:'Contemporary',buyerType:'returning',evidence:'verified',revenueSurface:'professional',audience:90,engagement:55,qualifiedBuyer:12,meeting:7,intent:4,deal:2,revenueEvidence:0,retention:{D30:3,D90:2,D365:1}},
          {id:'c05',period:'2026-Q4',ecosystem:'mfw',market:'CIS',category:'Accessories',buyerType:'returning',evidence:'verified',revenueSurface:'brand',audience:120,engagement:70,qualifiedBuyer:18,meeting:8,intent:4,deal:1,revenueEvidence:1,retention:{D30:5,D90:3,D365:2}},
          {id:'c06',period:'2026-Q4',ecosystem:'mfw',market:'Europe',category:'Womenswear',buyerType:'new',evidence:'reported',revenueSurface:'intelligence',audience:100,engagement:65,qualifiedBuyer:12,meeting:6,intent:2,deal:1,revenueEvidence:1,retention:{D30:4,D90:3,D365:1}},
          {id:'c07',period:'2026-Q3',ecosystem:'bfs',market:'GCC',category:'Contemporary',buyerType:'returning',evidence:'verified',revenueSurface:'intelligence',audience:100,engagement:60,qualifiedBuyer:20,meeting:13,intent:8,deal:4,revenueEvidence:2,retention:{D30:5,D90:3,D365:3}},
          {id:'c08',period:'2026-Q3',ecosystem:'bfs',market:'Asia',category:'Accessories',buyerType:'new',evidence:'reported',revenueSurface:'professional',audience:90,engagement:55,qualifiedBuyer:18,meeting:12,intent:7,deal:4,revenueEvidence:2,retention:{D30:4,D90:3,D365:3}},
          {id:'c09',period:'2026-Q4',ecosystem:'bfs',market:'CIS',category:'Tech',buyerType:'returning',evidence:'verified',revenueSurface:'api',audience:90,engagement:55,qualifiedBuyer:18,meeting:11,intent:7,deal:3,revenueEvidence:1,retention:{D30:4,D90:3,D365:2}},
          {id:'c10',period:'2026-Q4',ecosystem:'bfs',market:'Europe',category:'Womenswear',buyerType:'new',evidence:'reported',revenueSurface:'intelligence',audience:80,engagement:50,qualifiedBuyer:16,meeting:10,intent:7,deal:3,revenueEvidence:1,retention:{D30:4,D90:3,D365:2}},
          {id:'c11',period:'2026-Q3',ecosystem:'made',market:'CIS',category:'Accessories',buyerType:'returning',evidence:'verified',revenueSurface:'brand',audience:110,engagement:55,qualifiedBuyer:8,meeting:5,intent:3,deal:2,revenueEvidence:1,retention:{D30:2,D90:1,D365:1}},
          {id:'c12',period:'2026-Q4',ecosystem:'made',market:'GCC',category:'Accessories',buyerType:'new',evidence:'synthetic',revenueSurface:'brand',audience:90,engagement:45,qualifiedBuyer:4,meeting:3,intent:2,deal:1,revenueEvidence:0,retention:{D30:2,D90:1,D365:1}}
        ],
        population:1200,
        stageCohorts:{
          'AUDIENCE':{total:1200,breakdown:{mfw:640,bfs:360,made:200},representativeCases:['buyer-brand-alpha','delegate-made-beta','buyer-brand-gamma']},
          'ENGAGEMENT':{total:720,breakdown:{mfw:400,bfs:220,made:100},representativeCases:['buyer-brand-alpha','delegate-made-beta','buyer-brand-gamma']},
          'QUALIFIED BUYER':{total:180,breakdown:{mfw:96,bfs:72,made:12},representativeCases:['buyer-brand-alpha','buyer-brand-gamma','delegate-made-beta']},
          'MEETING':{total:108,breakdown:{mfw:54,bfs:46,made:8},representativeCases:['buyer-brand-alpha','buyer-brand-gamma','delegate-made-beta']},
          'INTENT':{total:65,breakdown:{mfw:31,bfs:29,made:5},representativeCases:['buyer-brand-alpha','buyer-brand-gamma','delegate-made-beta']},
          'DEAL':{total:31,breakdown:{mfw:14,bfs:14,made:3},representativeCases:['buyer-brand-alpha','buyer-brand-gamma','delegate-made-beta']},
          'RETENTION':{total:22,breakdown:{mfw:10,bfs:10,made:2},representativeCases:['buyer-brand-gamma','buyer-brand-alpha','delegate-made-beta']},
          'REVENUE EVIDENCE':{total:12,breakdown:{mfw:5,bfs:6,made:1},representativeCases:['buyer-brand-gamma','buyer-brand-alpha','delegate-made-beta']}
        },
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
    interventionCatalog:[
      {
        id:'professional-discovery',
        metric:'qualifiedRate',
        stage:'AUDIENCE → QUALIFIED BUYER',
        action:'Усилить professional discovery и qualification',
        hypothesis:'Более точная роль, category intent и buyer objectives должны повысить долю квалифицированных профессиональных пользователей.',
        kpi:'Audience → Qualified Buyer',
        evidenceNeeded:['versioned qualification rules','explicit buyer-role / objective events','pre/post cohort assignment','qualified-buyer event with reason codes'],
        pilot:'A/B или phased rollout qualification rules',
        leverage:1.00,
        effort:2,
        owner:'Product + Professional Experience'
      },
      {
        id:'matchmaking-optimizer',
        metric:'meetingRate',
        stage:'QUALIFIED BUYER → MEETING',
        action:'Усилить matchmaking и agenda-slot optimizer',
        hypothesis:'Reason codes, bilateral objectives и conflict-free slots должны повысить долю qualified buyers, доходящих до подтверждённой встречи.',
        kpi:'Qualified Buyer → Meeting',
        evidenceNeeded:['match proposal event','reason codes','bilateral accept/decline','agenda conflict state','meeting held evidence'],
        pilot:'Controlled matcher/slotting experiment',
        leverage:1.15,
        effort:3,
        owner:'B2B Product + Operations'
      },
      {
        id:'meeting-intent-pack',
        metric:'intentRate',
        stage:'MEETING → INTENT',
        action:'Добавить buyer-ready meeting pack',
        hypothesis:'Line sheet, MOQ, delivery window, category fit и structured meeting brief должны увеличить явный commercial intent после встречи.',
        kpi:'Meeting → Commercial Intent',
        evidenceNeeded:['meeting held event','pack opened/version','structured request type','request timestamp','buyer/brand identities'],
        pilot:'Meeting pack pilot on eligible meetings',
        leverage:1.25,
        effort:2,
        owner:'Brand Success + Buyer Experience'
      },
      {
        id:'deal-room-sla',
        metric:'dealRate',
        stage:'INTENT → DEAL-STAGE',
        action:'Ввести Deal Room SLA и readiness checklist',
        hypothesis:'Структурированные документы, availability, MOQ и SLA ответа должны сократить потери между intent и deal-stage.',
        kpi:'Commercial Intent → Deal-stage',
        evidenceNeeded:['Deal Room opened','required-document checklist','response SLA timestamps','request/response state','external handoff or deal-stage evidence'],
        pilot:'SLA + readiness workflow pilot',
        leverage:1.30,
        effort:3,
        owner:'Commercial Product + Brand Operations'
      },
      {
        id:'brand365-retention',
        metric:'retentionRate',
        stage:'INTENT → D30/D90/D365',
        action:'Запустить сегментированные Brand365 follow-up journeys',
        hypothesis:'Opt-in follow-up, reminders и professional continuity должны увеличить удержание после intent.',
        kpi:'Intent → D30/D90/D365 Retention',
        evidenceNeeded:['consent/opt-in','journey assignment','follow-up delivery event','repeat professional action','canonical identity continuity'],
        pilot:'Holdout lifecycle experiment',
        leverage:1.10,
        effort:2,
        owner:'CRM + Brand365'
      },
      {
        id:'outcome-verification',
        metric:'revenueEvidenceRate',
        stage:'DEAL-STAGE → REVENUE EVIDENCE',
        action:'Встроить outcome verification и finance linkage',
        hypothesis:'Стандартизированный внешний outcome reference и billing linkage должны увеличить долю deal-stage кейсов с доказанным commercial outcome.',
        kpi:'Deal-stage → Revenue Evidence',
        evidenceNeeded:['external outcome reference','evidence class','contract/billing reference where applicable','verification actor','settlement/payment evidence where applicable'],
        pilot:'Verification workflow with selected partners',
        leverage:1.20,
        effort:4,
        owner:'Commercial Ops + Finance + Data Governance'
      }
    ],
    investmentCommittee:{
      label:'DEMO / SYNTHETIC WORKSPACE',
      budgetUnit:'pilot points',
      approvalRequirements:[
        'named owner',
        'explicit budget request',
        'baseline KPI and modelled target',
        'evidence plan',
        'pilot design',
        'risk / stop criteria'
      ],
      states:['DRAFT','IN_REVIEW','APPROVED','PILOT_RUNNING','MEASURED','DECIDED'],
      decisions:['SCALE','ITERATE','STOP'],
      resultProfiles:{
        'professional-discovery':1.05,
        'matchmaking-optimizer':0.72,
        'meeting-intent-pack':1.10,
        'deal-room-sla':0.55,
        'brand365-retention':0.65,
        'outcome-verification':-0.15
      },
      governance:{
        scale:'Measured KPI meets/exceeds modelled target and evidence gate is complete.',
        iterate:'Measured KPI improves vs baseline but misses modelled target, or evidence quality remains incomplete.',
        stop:'Measured KPI does not improve vs baseline, material guardrail breaks, or evidence quality is insufficient.'
      }
    },
    programmeCapital:{
      label:'DEMO / MODELLED PROGRAMME CAPITAL',
      envelopePoints:150,
      reservePoints:50,
      rules:{
        requested:'Requested pilot points are demand, not approval.',
        approved:'Approved points are an investment-committee decision in demo state.',
        committed:'Committed points are reserved to a pilot and are not available for reallocation.',
        spent:'Spent points represent modelled executed pilot resource, not currency.',
        measured:'Measured points are spent resource attached to a completed KPI measurement.',
        releasable:'Only uncommitted reserve and explicitly released STOP/closed commitments may be considered for reallocation.'
      },
      ecosystemWeights:{mfw:.46,bfs:.34,made:.20},
      defaultExecution:[
        {intervention:'professional-discovery',ecosystem:'mfw',requested:34,approved:30,committed:28,spent:22,status:'MEASURED',evidenceComplete:true,decision:'SCALE'},
        {intervention:'matchmaking-optimizer',ecosystem:'bfs',requested:31,approved:28,committed:25,spent:18,status:'MEASURED',evidenceComplete:false,decision:'ITERATE'},
        {intervention:'meeting-intent-pack',ecosystem:'made',requested:25,approved:22,committed:18,spent:12,status:'PILOT_RUNNING',evidenceComplete:false,decision:null},
        {intervention:'deal-room-sla',ecosystem:'mfw',requested:20,approved:12,committed:9,spent:6,status:'MEASURED',evidenceComplete:true,decision:'STOP'},
        {intervention:'brand365-retention',ecosystem:'bfs',requested:18,approved:8,committed:5,spent:0,status:'APPROVED',evidenceComplete:false,decision:null}
      ],
      blockers:[
        {id:'b1',intervention:'meeting-intent-pack',code:'EVIDENCE_PLAN_INCOMPLETE',label:'Evidence plan incomplete'},
        {id:'b2',intervention:'brand365-retention',code:'PILOT_NOT_STARTED',label:'Pilot approved but not started'},
        {id:'b3',intervention:'matchmaking-optimizer',code:'TARGET_MISSED',label:'Measured improvement below modelled target'}
      ],
      optimizer:{
        trancheOptions:[10,20,30],
        evidenceReadyThreshold:.80,
        conditionalThreshold:.60,
        scoreWeights:{riskRelief:.30,kpiLeverage:.25,evidenceReadiness:.30,absorption:.15},
        candidates:[
          {
            ecosystem:'mfw',
            intervention:'professional-discovery',
            mode:'SCALE',
            bottleneck:'Масштабирование qualified-buyer conversion после подтверждённого pilot result',
            metric:'qualifiedRate',
            riskAtRisk:0,
            riskReliefPer10:0,
            kpiLiftPer10:1.0,
            maxKpiLift:3.0,
            absorptionCap:30,
            evidenceReadiness:1.00,
            hardBlock:false,
            releaseGate:'READY',
            evidenceBeforeNext:[
              'versioned cohort assignment',
              'qualified-buyer event + reason codes',
              'post-tranche conversion snapshot',
              'false-positive qualification guardrail'
            ]
          },
          {
            ecosystem:'bfs',
            intervention:'matchmaking-optimizer',
            mode:'ITERATE',
            bottleneck:'Measured matcher improvement ниже modelled target; 12 points commitments требуют recovery plan',
            metric:'meetingRate',
            riskAtRisk:12,
            riskReliefPer10:6,
            kpiLiftPer10:1.4,
            maxKpiLift:3.5,
            absorptionCap:20,
            evidenceReadiness:.70,
            hardBlock:false,
            releaseGate:'CONDITIONAL',
            evidenceBeforeNext:[
              'match proposal + reason codes',
              'bilateral accept/decline completeness',
              'agenda conflict state',
              'held-meeting evidence + target-recovery snapshot'
            ]
          },
          {
            ecosystem:'made',
            intervention:'meeting-intent-pack',
            mode:'HOLD',
            bottleneck:'Meeting → intent pilot имеет незакрытый evidence plan; 6 committed-but-unspent points остаются under review',
            metric:'intentRate',
            riskAtRisk:6,
            riskReliefPer10:4,
            kpiLiftPer10:1.6,
            maxKpiLift:3.0,
            absorptionCap:10,
            evidenceReadiness:.40,
            hardBlock:true,
            releaseGate:'HOLD',
            evidenceBeforeNext:[
              'complete evidence plan',
              'meeting-held identity linkage',
              'pack version/open event',
              'structured commercial-intent event'
            ]
          }
        ],
        boundary:'Optimizer is a modelled decision aid. Scores, KPI lifts and risk relief are assumptions; no tranche is approved by the optimizer.',
        portfolioSimulator:{
          budgets:[10,20,30],
          step:10,
          weights:{riskReduction:.30,kpiLeverage:.25,evidenceConfidence:.20,diversification:.10,optionality:.15},
          reserveScorePerShare:1,
          rules:{
            hold:'Направления со статусом «ПАУЗА» не могут получать новый капитал в допустимом сценарии.',
            conditional:'Условные распределения требуют решения инвесткомитета и делают сценарий портфеля условным.',
            capacity:'Ни одно направление не может получить больше своей ёмкости освоения или текущей ёмкости перераспределения.',
            reserve:'Нераспределённый бюджет остаётся резервом и сохраняет гибкость.',
            approval:'Симулятор ранжирует варианты; он не одобряет и не резервирует капитал.'
          }
        }
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