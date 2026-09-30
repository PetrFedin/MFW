import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve('mfw/platform');
const required=[
 'index.html','platform.css','platform.js',
 'bfs/index.html','bfs/styles.css','bfs/app.js'
];
for(const rel of required){
 const p=path.join(root,rel);
 if(!fs.existsSync(p))throw new Error('Missing '+rel);
 if(fs.statSync(p).size===0)throw new Error('Empty '+rel);
}
const platform=fs.readFileSync(path.join(root,'platform.js'),'utf8');
const bfs=fs.readFileSync(path.join(root,'bfs/app.js'),'utf8');
new vm.Script(platform,{filename:'platform.js'});
new vm.Script(bfs,{filename:'bfs/app.js'});
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const bfsHtml=fs.readFileSync(path.join(root,'bfs/index.html'),'utf8');
[
 ['platform event switcher',html,'data-event="mfw"'],
 ['platform BFS switcher',html,'data-event="bfs"'],
 ['account action',html,'id="accountBtn"'],
 ['investor action',html,'id="investorBtn"'],
 ['value action',html,'id="valueBtn"'],
 ['for you action',html,'id="forYouBtn"'],
 ['platform hub action',html,'id="hubBtn"'],
 ['platform hub',html,'id="hubModal"'],
 ['profile form',html,'id="profileForm"'],
 ['registration role explanation',html,'id="registrationRoleNote"'],
 ['event registration form',html,'id="registrationForm"'],
 ['BFS today',bfsHtml,'data-view="today"'],
 ['BFS programme',bfsHtml,'data-view="programme"'],
 ['BFS speakers',bfsHtml,'data-view="speakers"'],
 ['BFS B2B',bfsHtml,'data-view="b2b"'],
 ['BFS QR',bfsHtml,'data-view="pass"'],
 ['BFS account',bfsHtml,'data-view="profile"']
].forEach(([name,source,needle])=>{if(!source.includes(needle))throw new Error('Missing '+name)});
[
 'openRegistration','profileForm.onsubmit','registrationForm.onsubmit',
 "postMessage({type:'mfp-account-state'","data-investor-step"
].forEach(x=>{if(!platform.includes(x))throw new Error('Platform action not wired: '+x)});
[
 "data-save","discoverDelegates","data-meet","passRegister","manageAccount",
 "mfp-open-registration","mfp-open-account"
].forEach(x=>{if(!bfs.includes(x))throw new Error('BFS action not wired: '+x)});
console.log('dual-event interaction contract: PASS');

const mfw=fs.readFileSync(path.resolve('mfw/app.js'),'utf8');
const mfwCss=fs.readFileSync(path.resolve('mfw/styles.css'),'utf8');
['favorite-brand','mfwFavoriteBrands','brand-loyalty','loyalty-follow-brand','Slava Zaitsev','Ianis Chamalidy','Анна Горбунова'].forEach(x=>{if(!mfw.includes(x))throw new Error('MFW loyalty/favorite contract missing: '+x)});
['z-index:9999','visibility:visible!important','100dvh'].forEach(x=>{if(!mfwCss.includes(x))throw new Error('MFW mobile nav hardening missing: '+x)});
console.log('MFW navigation + loyalty contract: PASS');

const eventData=fs.readFileSync(path.join(root,'event-data.js'),'utf8');
['Slava Zaitsev','Ianis Chamalidy','bfs-3009-1100','Patrick Duffy','analyticsContract','continuousDays'].forEach(x=>{if(!eventData.includes(x))throw new Error('Event graph seed missing: '+x)});
console.log('cross-event graph contract: PASS');

const rootHtml=fs.readFileSync(path.join(root,'..','index.html'),'utf8');
const mfwDedicated=fs.readFileSync(path.join(root,'..','mfw','index.html'),'utf8');
if(!rootHtml.includes('./platform/index.html'))throw new Error('Root does not open platform shell');
if(!platformJs.includes("../mfw/index.html"))throw new Error('Platform does not route to dedicated MFW experience');
if(!mfwDedicated.includes('../styles.css?v=15')||!mfwDedicated.includes('../app.js?v=15'))throw new Error('Dedicated MFW assets are not preserved');
console.log('dedicated MFW route contract: PASS');

const appSource=fs.readFileSync(path.join(root,'..','app.js'),'utf8');
if(appSource.includes("favoriteBrands.indexOf(b.id)>=0;\\n"))throw new Error('MFW app contains escaped-newline syntax defect');
const platformCss=fs.readFileSync(path.join(root,'platform.css'),'utf8');
if(!platformCss.includes('body:not(.bfs-mode) .hub-card')||!platformCss.includes('#c8ff00'))throw new Error('MFW contextual platform theme missing');
console.log('MFW runtime + contextual theme regression contract: PASS');

const officialData=fs.readFileSync(path.join(root,'event-data.js'),'utf8');
['2026-10-01','Black Crown Label','Kazakhstan Fashion Week presents: Dinara Satzhan','China Fashion Week presents: Momiwei','World Fashion Shorts','Noir Fashion Week Global','Мода 0+','Сертификация и стандарты'].forEach(x=>{if(!officialData.includes(x))throw new Error('Official import missing: '+x)});
if(!officialData.includes('syncedAt:"2026-09-29"'))throw new Error('Official data provenance date missing');
console.log('official MFW/BFS data import contract: PASS');

const mfwExperience=fs.readFileSync(path.join(root,'..','mfw','index.html'),'utf8');
const bfsExperience=fs.readFileSync(path.join(root,'bfs','index.html'),'utf8');
const bfsApp=fs.readFileSync(path.join(root,'bfs','app.js'),'utf8');
if(!mfwExperience.includes('event-data.js?v=20260929'))throw new Error('MFW experience missing official data layer');
if(!bfsExperience.includes('event-data.js?v=20260929'))throw new Error('BFS experience missing official data layer');
['openSession','speakerIds','media:{live:"unconfirmed",replay:"unconfirmed"}'].forEach(x=>{if(!(bfsApp+officialData).includes(x))throw new Error('Entity graph contract missing: '+x)});
console.log('event-native official graph contract: PASS');

const sync=fs.readFileSync(path.join(root,'event-sync.js'),'utf8');
['time_changed','venue_changed','access_changed','mfp-official-sync','setReminder','notifyDue'].forEach(x=>{if(!sync.includes(x))throw new Error('Sync/reminder authority missing: '+x)});
['organisations','meeting_requested','qualified_lead'].forEach(x=>{if(!(officialData+bfsApp).includes(x))throw new Error('B2B CRM graph missing: '+x)});
console.log('sync + reminder + B2B CRM contract: PASS');

const authority=fs.readFileSync(path.join(root,'..','..','mfw-api','server-v2.js'),'utf8');
const store=fs.readFileSync(path.join(root,'..','..','mfw-api','brand365-store.js'),'utf8');
const mfwApp=fs.readFileSync(path.join(root,'..','app.js'),'utf8');
['brandAudience','averageFollowDays','eligible_30_59','verifiedSocial'].forEach(x=>{if(!store.includes(x))throw new Error('Brand audience authority missing: '+x)});
['qrDataUrl','MFW-LOYALTY:','one_time_server_verified','market_or_brand_showroom','/v1/loyalty/redeem'].forEach(x=>{if(!authority.includes(x))throw new Error('Reward QR contract missing: '+x)});
['openBrandComposer','brand-portal-compose-submit','brand-portal-invite','reward-qr','30+ verified'].forEach(x=>{if(!mfwApp.includes(x))throw new Error('MFW relationship UI missing: '+x)});
console.log('brand relationship + loyalty QR + blog contract: PASS');

const migration013=fs.readFileSync(path.join(root,'..','..','mfw-api','migrations','013_brand_crm.sql'),'utf8');
['brand_favorites','brand_campaigns','brand_campaign_audience','brand_campaign_events','brand_purchases'].forEach(x=>{if(!migration013.includes(x))throw new Error('Brand CRM migration missing: '+x)});
['brandCrmAudience','createBrandCampaign','campaignAnalytics','days30Plus','days60Plus','favorite','buyer'].forEach(x=>{if(!store.includes(x))throw new Error('Brand CRM store missing: '+x)});
['brand-campaign','brand-redemption-scanner','crm-funnel','Attributed revenue'].forEach(x=>{if(!mfwApp.includes(x))throw new Error('Brand CRM UI missing: '+x)});
['brand_purchase_attributed','brand_pos_redemption','claim_brand_mismatch'].forEach(x=>{if(!authority.includes(x))throw new Error('Brand CRM attribution missing: '+x)});
console.log('Brand CRM audience -> campaign -> redemption -> purchase attribution contract: PASS');

const migration014=fs.readFileSync(path.join(root,'..','..','mfw-api','migrations','014_brand_crm_hardening.sql'),'utf8');
['brand_saved_segments','frequency_cap','require_marketing_consent','brand_order_imports','idx_brand_campaigns_schedule'].forEach(x=>{if(!migration014.includes(x))throw new Error('Advanced CRM migration missing: '+x)});
['resolveSegmentAudience','queueCampaign','savedSegments','customerEconomics','repeatRate','ltv','retained_30d','retained_90d'].forEach(x=>{if(!store.includes(x))throw new Error('Advanced CRM authority missing: '+x)});
['notification_deliveries','paid_promotions_enabled','brand_campaign_queued','orders-import','brand_orders_imported'].forEach(x=>{if(!authority.includes(x))throw new Error('CRM delivery/import authority missing: '+x)});
['openNativeScanner(\'loyalty\')','navigator.mediaDevices.getUserMedia','MFW-LOYALTY:','Buyer + Favorite + 60+','crmCampaignAt','brand-order-import'].forEach(x=>{if(!mfwApp.includes(x))throw new Error('Advanced CRM UX missing: '+x)});
console.log('advanced Brand CRM quality contract: PASS');

const migration015=fs.readFileSync(path.join(root,'..','..','mfw-api','migrations','015_brand_cdp.sql'),'utf8');
['experiment_group','brand_customer_profiles','brand_journeys','brand_journey_enrollments','control_pct'].forEach(x=>{if(!migration015.includes(x))throw new Error('CDP migration missing: '+x)});
['campaignIncrementality','incrementalRevenue','refreshCustomerLifecycle','runJourneys','controlConversion','repeatRate'].forEach(x=>{if(!store.includes(x))throw new Error('CDP authority missing: '+x)});
['incrementality','lifecycle-refresh','journeys-run','brand_journey_created'].forEach(x=>{if(!authority.includes(x))throw new Error('CDP route missing: '+x)});
['Incrementality / ROI','Lifecycle / RFM','At-risk → Reactivation','brand-journeys-run'].forEach(x=>{if(!mfwApp.includes(x))throw new Error('CDP UX missing: '+x)});
console.log('Brand 365 CDP contract: PASS');

const migration016=fs.readFileSync(path.join(root,'..','..','mfw-api','migrations','016_brand_cdp_state_machine.sql'),'utf8');
['holdout_pct','next_run_at','churn_score','predicted_clv','next_best_action','brand_acquisition_events'].forEach(x=>{if(!migration016.includes(x))throw new Error('State machine/CDP migration missing: '+x)});
['advanceJourneyStateMachine','stopReason','experiment_group','scoreCustomerPredictions','acquisitionEconomics','audienceAssetSummary'].forEach(x=>{if(!store.includes(x))throw new Error('State machine/CDP authority missing: '+x)});
['journeys-tick','acquisition-economics','/v1/owner/audience-asset','brand_customer_acquired'].forEach(x=>{if(!authority.includes(x))throw new Error('State machine/CDP API missing: '+x)});
['Churn / Next Best Action','brand-journeys-tick','predicted_clv'].forEach(x=>{if(!mfwApp.includes(x))throw new Error('State machine/CDP Brand UI missing: '+x)});
const platformJs=fs.readFileSync(path.join(root,'platform.js'),'utf8');
['MFW AUDIENCE ASSET','IDENTIFIED CUSTOMERS','ATTRIBUTABLE GMV','PREDICTED CLV','/v1/owner/audience-asset'].forEach(x=>{if(!platformJs.includes(x))throw new Error('Owner Audience Asset UI missing: '+x)});
console.log('Brand 365 state machine + owner Audience Asset contract: PASS');

['ownerControlTower','incremental_gmv','cohort','prev_brand_name','cross_event_users','scenarioAssumptions'].forEach(x=>{if(!store.includes(x))throw new Error('Owner Control Tower authority missing: '+x)});
['/v1/owner/control-tower','retentionRate','clvRealization'].forEach(x=>{if(!authority.includes(x))throw new Error('Owner Control Tower API missing: '+x)});
const platformTower=fs.readFileSync(path.join(root,'platform.js'),'utf8');
['OWNER CONTROL TOWER','Brand-by-brand contribution','Cohort retention','Cross-brand migration','MFW ↔ BFS cross-event','Scenario valuation'].forEach(x=>{if(!platformTower.includes(x))throw new Error('Owner Control Tower UI missing: '+x)});
console.log('Owner Control Tower contract: PASS');

const migration017=fs.readFileSync(path.join(root,'..','..','mfw-api','migrations','017_mvp_persistence.sql'),'utf8');
const migration018=fs.readFileSync(path.join(root,'..','..','mfw-api','migrations','018_identity_interests_registration.sql'),'utf8');
const migration019=fs.readFileSync(path.join(root,'..','..','mfw-api','migrations','019_platform_registrations.sql'),'utf8');
['user_agenda','b2b_meetings','b2b_meeting_events'].forEach(x=>{if(!migration017.includes(x))throw new Error('MVP persistence migration missing: '+x)});
['user_interests','registration_type','submitted_payload'].forEach(x=>{if(!migration018.includes(x))throw new Error('Identity migration missing: '+x)});
['platform_registrations','event_brand','pending_review'].forEach(x=>{if(!migration019.includes(x))throw new Error('Platform registration migration missing: '+x)});
['/v1/me/profile','/v1/me/interests','/v1/platform/registrations/','/v1/agenda/conflicts'].forEach(x=>{if(!authority.includes(x))throw new Error('Persistent MVP authority missing: '+x)});
['syncProfileToAuthority','syncPlatformRegistration','hydrateAccountFromAuthority','https://mfw-authority.onrender.com'].forEach(x=>{if(!platformJs.includes(x))throw new Error('Platform authority sync missing: '+x)});
if(mfwApp.includes('https://moscow-fashion-week-authority.onrender.com'))throw new Error('legacy Moscow authority URL still present in MFW app');
if(!mfwApp.includes('https://mfw-authority.onrender.com'))throw new Error('canonical MFW authority URL missing');
console.log('persistent account + registrations + agenda + canonical authority contract: PASS');

const platformHtml=fs.readFileSync(path.join(root,'index.html'),'utf8');
['interestGrid','saveInterests'].forEach(x=>{if(!platformHtml.includes(x))throw new Error('Account interest UI missing: '+x)});
['INTEREST_OPTIONS','saveInterestsToAuthority','/v1/me/interests'].forEach(x=>{if(!platformJs.includes(x))throw new Error('Interest persistence UI missing: '+x)});
['platform_registrations','/v1/platform/registrations/','pending_review'].forEach(x=>{if(!(migration019+authority).includes(x))throw new Error('Platform registration authority missing: '+x)});
console.log('account interests + platform registrations contract: PASS');
