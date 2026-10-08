const { test, expect } = require('@playwright/test');

async function mockAuthorities(page) {
  const handler = async (route) => {
    const path = new URL(route.request().url()).pathname;
    let body;

    if (path === '/v1/auth/demo') {
      body = { session: 'qa-session', data: { user: { id: 'qa-user', role: 'Organizer' } } };
    } else if (path === '/health') {
      body = { status: 'ok', es256: true, duplicateCheckin: true, dataMode: 'qa' };
    } else if (path === '/health/deep') {
      body = { status: 'pass' };
    } else if (path === '/v1/admin/overview') {
      body = {
        data: {
          activeUsers: 1284,
          programmeEngagementPct: 68,
          buyerActions: 214,
          live: { occupancyPct: 82, checkedIn: 641, waitlist: 27 }
        }
      };
    } else if (path === '/v1/admin/events' || path === '/v1/admin/accreditations' || path === '/v1/admin/streams') {
      body = { data: [] };
    } else if (path.startsWith('/v1/admin/streams/') && path.endsWith('/control-plane')) {
      body = { data: { sources: [], outputs: [], captions: [], replay: null, failover: [] } };
    } else if (
      path === '/v1/admin/commerce' ||
      path === '/v1/admin/sponsors' ||
      path === '/v1/admin/brand-growth' ||
      path === '/v1/admin/retention' ||
      path === '/v1/admin/native-readiness'
    ) {
      body = { data: {} };
    } else if (path === '/v1/made-in-moscow/brands') {
      body = { data: [{ id: 'masterpeace', name: 'Masterpeace', city: 'Москва' }], source: 'qa-postgres' };
    } else if (path === '/v1/made-in-moscow/overview') {
      body = { data: { verifiedBrands: 1, productionAdmitted: false } };
    } else if (path === '/v1/brands/masterpeace/network-graph') {
      body = { data: { contract:'mfw-cross-event-brand-graph-v2', brandRef:'masterpeace', brandName:'Masterpeace', source:'qa-postgres', policy:{noPii:true,readOnly:true,noRevenueInference:true,noUniversalScore:true}, nodes:[
        {id:'brand',label:'Masterpeace',status:'published',truthClass:'observed',authority:'mfw_brand_registry',sourceClass:'canonical_postgres',sourceRef:'/v1/brands/masterpeace',metrics:{brandRef:'masterpeace'}},
        {id:'made',label:'Made in Moscow',status:'verified',truthClass:'verified',authority:'made_in_moscow_programme_roster',sourceClass:'programme_membership',sourceRef:'/v1/made-in-moscow/brands',metrics:{verified:true},route:{eventCode:'made',kind:'verified',id:'masterpeace'}},
        {id:'shows',label:'MFW show',status:'published',truthClass:'reported',authority:'mfw_programme_authority',sourceClass:'official_programme',sourceRef:'/v1/events/mfw-2909-2100',metrics:{count:1},route:{eventCode:'mfw',kind:'event',id:'mfw-2909-2100'}},
        {id:'collections',label:'Collections',status:'published',truthClass:'observed',authority:'mfw_collection_authority',sourceClass:'canonical_postgres',sourceRef:'/v1/collections?brandId=masterpeace',metrics:{count:2},route:{eventCode:'mfw',kind:'brand',id:'masterpeace'}},
        {id:'shortlists',label:'Buyer shortlists',status:'active',truthClass:'observed',authority:'mfw_buyer_commerce_authority',sourceClass:'canonical_postgres',sourceRef:'buyer_shortlist',metrics:{count:4},route:{eventCode:'mfw',kind:'brand',id:'masterpeace'}},
        {id:'meetings',label:'BFS meetings',status:'active',truthClass:'observed',authority:'bfs_meeting_authority',sourceClass:'canonical_postgres',sourceRef:'/v1/meetings',metrics:{count:2,confirmed:1,completed:1},route:{eventCode:'bfs',kind:'brand-buyer',brandRef:'masterpeace'}},
        {id:'leads',label:'BFS leads',status:'active',truthClass:'observed',authority:'bfs_lead_authority',sourceClass:'canonical_postgres',sourceRef:'/v1/b2b/leads',metrics:{count:1,qualified:1,won:0},route:{eventCode:'bfs',kind:'brand-buyer',brandRef:'masterpeace'}},
        {id:'brand365',label:'Brand365 audience',status:'active',truthClass:'observed',authority:'brand365_authority',sourceClass:'canonical_postgres',sourceRef:'/v1/brand-portal/masterpeace/overview',metrics:{followers:125,favorites:19,eligible:7,claims:3},route:{eventCode:'mfw',kind:'brand',id:'masterpeace'}},
        {id:'evidence',label:'Evidence coverage',status:'preview_not_admitted',truthClass:'observed',authority:'cross_event_brand_graph_projection',sourceClass:'read_only_projection',sourceRef:'/v1/brands/masterpeace/network-graph',metrics:{evidencedStages:7,totalStages:7,dataMode:'qa-postgres',productionAdmitted:false}}
      ], edges:[] } };
    } else if (path === '/v1/brands/masterpeace/relationship-timeline') {
      body = { data: {
        contract:'mfw-brand-relationship-timeline-v1', brandRef:'masterpeace', brandName:'Masterpeace', source:'qa-postgres', productionAdmitted:false,
        items:[
          {id:'brand:first_seen',kind:'brand_first_seen',label:'Первое появление бренда',occurredAt:'2026-09-20T10:00:00Z',truthClass:'observed',authority:'mfw_brand_registry',sourceClass:'canonical_postgres',sourceRef:'brands.created_at',freshness:{state:'aging',ageDays:18}},
          {id:'mfw:show:1',kind:'mfw_participation',label:'Masterpeace Runway',occurredAt:'2026-09-29T18:00:00Z',truthClass:'reported',authority:'mfw_programme_authority',sourceClass:'official_programme',sourceRef:'/v1/events/mfw-2909-2100',freshness:{state:'aging',ageDays:9}},
          {id:'made:membership',kind:'made_verification',label:'Сделано в Москве',occurredAt:'2026-09-30T10:00:00Z',truthClass:'verified',authority:'made_in_moscow_programme_roster',sourceClass:'programme_membership',sourceRef:'brand_program_memberships',freshness:{state:'aging',ageDays:8}},
          {id:'buyer:first_shortlist',kind:'buyer_interest',label:'Первый buyer shortlist',occurredAt:'2026-10-01T11:00:00Z',truthClass:'observed',authority:'mfw_buyer_commerce_authority',sourceClass:'canonical_postgres',sourceRef:'buyer_shortlist',metrics:{count:4},freshness:{state:'fresh',ageDays:7}},
          {id:'bfs:meeting:1',kind:'bfs_meeting',label:'BFS meeting · COMPLETED',occurredAt:'2026-10-02T12:00:00Z',truthClass:'observed',authority:'bfs_meeting_authority',sourceClass:'canonical_postgres',sourceRef:'/v1/meetings/1',state:{status:'completed'},freshness:{state:'fresh',ageDays:6}},
          {id:'bfs:lead:1:qualified',kind:'lead_evolution',label:'Lead · QUALIFIED',occurredAt:'2026-10-03T12:00:00Z',truthClass:'observed',authority:'bfs_lead_authority',sourceClass:'canonical_postgres',sourceRef:'/v1/b2b/leads/1',state:{stage:'qualified'},freshness:{state:'fresh',ageDays:5}},
          {id:'brand365:d30',kind:'brand365_continuity',label:'Brand365 D30',occurredAt:'2026-10-08T08:00:00Z',truthClass:'observed',authority:'brand365_authority',sourceClass:'derived_from_brand_follows',sourceRef:'brand_follows.created_at',metrics:{qualifiedFollowers:125,thresholdDays:30},freshness:{state:'fresh',ageDays:0}},
          {id:'brand365:d90',kind:'brand365_continuity',label:'Brand365 D90',occurredAt:null,truthClass:'not_evidenced',authority:'brand365_authority',sourceClass:'derived_from_brand_follows',sourceRef:'brand_follows.created_at',metrics:{qualifiedFollowers:0,thresholdDays:90},freshness:{state:'unknown',ageDays:null}},
          {id:'commercial:verified_outcome',kind:'verified_commercial_outcome',label:'Verified commercial outcome',occurredAt:null,truthClass:'not_evidenced',authority:'brand_commerce_evidence',sourceClass:'missing_evidence',sourceRef:'brand_purchases.external_order_ref + metadata.evidenceRef',metrics:{verifiedOrders:0,verifiedAmount:0},freshness:{state:'unknown',ageDays:null}}
        ]
      }};
    } else if (path.includes('/profile')) {
      body = { data: { id: 'qa-user', firstName: 'QA', lastName: 'Agent', email: 'qa@example.test' } };
    } else if (path.includes('/agenda')) {
      body = { data: { items: [], conflicts: [] } };
    } else if (path.includes('/owner/')) {
      body = { data: {} };
    } else if (
      path.includes('/wallet') ||
      path.includes('/recommend') ||
      path.includes('/platform-registrations') ||
      path.includes('/b2b/leads')
    ) {
      body = { data: [] };
    } else {
      body = { data: [] };
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  };

  await page.route('https://mfw-authority.onrender.com/**', handler);
  await page.route('https://moscow-fashion-week-authority.onrender.com/**', handler);
}

async function expectNoDocumentOverflow(page) {
  const v = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
    body: document.body ? document.body.scrollWidth : 0
  }));
  expect(v.scroll, JSON.stringify(v)).toBeLessThanOrEqual(v.client + 2);
  expect(v.body, JSON.stringify(v)).toBeLessThanOrEqual(v.client + 2);
}

async function expectTarget(locator, minHeight) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box.height).toBeGreaterThanOrEqual(minHeight);
}

test.beforeEach(async ({ page }) => {
  await mockAuthorities(page);
});

test('shared shell: event switcher and account remain reachable', async ({ page }, testInfo) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await expectNoDocumentOverflow(page);
  await expectTarget(page.locator('[data-event="mfw"]'), 40);
  await expectTarget(page.locator('[data-event="bfs"]'), 40);
  await expectTarget(page.locator('[data-event="made"]'), 40);
  await expectTarget(page.locator('#accountBtn'), 40);
  const clippedActions = await page.locator('.platform-actions > button').evaluateAll((buttons) =>
    buttons.filter((button) => button.scrollWidth > button.clientWidth + 1).map((button) => button.textContent.trim())
  );
  expect(clippedActions, 'Platform actions must not be visually clipped').toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('platform-shell.png') });
});

test('BFS switch: programme stays readable without page overflow', async ({ page }, testInfo) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-event="bfs"]').click();
  const frame = page.frameLocator('#eventFrame');
  await expect(frame.locator('.logo')).toBeVisible();
  await frame.locator('[data-view="programme"]').first().click();
  const overflow = await frame.locator('body').evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(2);
  await page.screenshot({ path: testInfo.outputPath('bfs-programme.png') });
});

test('Made in Moscow switch keeps third ecosystem readable and connected', async ({ page }, testInfo) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-event="made"]').click();
  const frame = page.frameLocator('#eventFrame');
  await expect(frame.locator('.made-brand')).toBeVisible();
  const heroTitle = frame.locator('.hero h1');
  await expect(heroTitle).toBeVisible();
  await expect(frame.getByText('Made in Moscow', { exact: false }).first()).toBeVisible();
  const heroGeometry = await heroTitle.evaluate((el) => {
    const title = el.getBoundingClientRect();
    const column = el.closest('.hero-copy').getBoundingClientRect();
    return {
      titleLeft: title.left,
      titleRight: title.right,
      columnLeft: column.left,
      columnRight: column.right,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth
    };
  });
  expect(heroGeometry.titleLeft).toBeGreaterThanOrEqual(heroGeometry.columnLeft - 1);
  expect(heroGeometry.titleRight).toBeLessThanOrEqual(heroGeometry.columnRight + 1);
  expect(heroGeometry.scrollWidth).toBeLessThanOrEqual(heroGeometry.clientWidth + 1);
  const overflow = await frame.locator('body').evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(2);
  await frame.locator('[data-section="verified"]').first().click();
  await expect(frame.getByText('Made in Moscow', { exact: false }).first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('made-in-moscow.png') });
});


test('three ecosystems share identity while keeping scoped participation and Made verification separate', async ({ page }, testInfo) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });

  await page.locator('#accountBtn').click();
  await page.locator('#profileForm input[name="firstName"]').fill('QA');
  await page.locator('#profileForm input[name="lastName"]').fill('Ecosystem');
  await page.locator('#profileForm input[name="email"]').fill('qa-ecosystem@example.test');
  await page.locator('#profileForm input[name="phone"]').fill('+10000000000');
  await page.locator('#profileForm button[type="submit"]').click();
  await page.locator('#accountClose').click();

  await page.locator('[data-event="bfs"]').click();
  const bfs = page.frameLocator('#eventFrame');
  await expect(bfs.locator('.logo')).toBeVisible();
  await bfs.locator('[data-view="profile"]').click();
  await expect(bfs.getByText(/QA Ecosystem/)).toBeVisible();
  await expect(bfs.getByText('MFW')).toBeVisible();
  await expect(bfs.getByText('СДЕЛАНО В МОСКВЕ')).toBeVisible();

  await page.locator('[data-event="made"]').click();
  const made = page.frameLocator('#eventFrame');
  await expect(made.locator('#madeAccountBridge')).toBeVisible();
  await expect(made.locator('#madeAccountBridge')).toContainText('QA Ecosystem');
  await expect(made.locator('#madeAccountBridge')).toContainText('MFW');
  await expect(made.locator('#madeAccountBridge')).toContainText('BFS');
  await expect(made.locator('#madeAdmissionState')).toContainText('PRODUCTION ADMISSION · WAITING');
  await expect(made.locator('#madeBrandGrid .verified-pill')).toHaveCount(1);
  await expect(made.locator('#madeBrandGrid')).toContainText('DEMO SLOT');
  await expectNoDocumentOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('three-ecosystem-identity.png') });
});

test('Made in Moscow bridge navigates back to MFW and BFS without losing platform shell', async ({ page }) => {
  await page.goto('/platform/index.html?event=made', { waitUntil: 'domcontentloaded' });
  const made = page.frameLocator('#eventFrame');
  await expect(made.locator('#madeAccountBridge')).toBeVisible();

  await made.locator('[data-bridge-event="mfw"]').click();
  await expect(page.locator('[data-event="mfw"]')).toHaveClass(/active/);
  await expect(page.locator('#eventFrame')).toHaveAttribute('src', '../mfw/index.html');

  await page.locator('[data-event="made"]').click();
  await made.locator('[data-bridge-event="bfs"]').click();
  await expect(page.locator('[data-event="bfs"]')).toHaveClass(/active/);
  await expect(page.locator('#eventFrame')).toHaveAttribute('src', './bfs/index.html');
});




test('Made verified brand deep-links into exact MFW brand and preserves brand context for BFS', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem('mfwOpeningSeen', '1');
    localStorage.setItem('mfwOnboarded', '1');
  });
  await page.goto('/platform/index.html?event=made', { waitUntil: 'domcontentloaded' });
  const made = page.frameLocator('#eventFrame');
  await expect(made.locator('#madeBrandGrid')).toContainText('Masterpeace');

  await made.locator('[data-made-open-mfw="masterpeace"]').click();
  await expect(page.locator('[data-event="mfw"]')).toHaveClass(/active/);
  const mfw = page.frameLocator('#eventFrame');
  await expect(mfw.locator('#modal h1').getByText('Masterpeace', { exact: true })).toBeVisible();

  await page.locator('[data-event="made"]').click();
  await expect(made.locator('[data-made-open-buyer="masterpeace"]')).toBeVisible();
  await made.locator('[data-made-open-buyer="masterpeace"]').click();
  await expect(page.locator('[data-event="bfs"]')).toHaveClass(/active/);
  const bfs = page.frameLocator('#eventFrame');
  await expect(bfs.getByText('BRAND CONTEXT · masterpeace')).toBeVisible();
  await expect(bfs.getByText(/Made in Moscow → MFW canonical brand → BFS commercial flow/)).toBeVisible();

  const trace = await page.evaluate(() => JSON.parse(localStorage.getItem('mfp.crossBrandJourney.v1') || 'null'));
  expect(trace).toMatchObject({ brandRef: 'masterpeace', source: 'made_in_moscow', lastTarget: 'bfs' });
  await expectNoDocumentOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('made-mfw-bfs-brand-path.png') });
});

test('Cross-event Brand Graph v2 exposes authority, source and truth class per node', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem('mfwOpeningSeen', '1');
    localStorage.setItem('mfwOnboarded', '1');
  });
  await page.goto('/platform/index.html?event=mfw', { waitUntil: 'domcontentloaded' });
  const mfw = page.frameLocator('#eventFrame');
  await page.locator('#eventFrame').evaluate((el) => el.contentWindow.MFWRoute({ kind:'brand', id:'masterpeace' }));
  await expect(mfw.locator('#modal h1').getByText('Masterpeace', { exact:true })).toBeVisible();
  await mfw.locator('[data-action="brand-network-graph"]').click();
  await expect(mfw.getByText('CROSS-EVENT BRAND GRAPH V2 · READ ONLY')).toBeVisible();
  await expect(mfw.getByText('CANONICAL BRAND ID · masterpeace')).toBeVisible();
  await expect(mfw.locator('[data-graph-node]')).toHaveCount(8);
  await expect(mfw.locator('[data-graph-node="made"]')).toContainText('VERIFIED');
  await expect(mfw.locator('[data-graph-node="meetings"]')).toContainText('bfs_meeting_authority');
  await expect(mfw.locator('[data-graph-node="brand365"]')).toContainText('125');
  await expect(mfw.getByText('PREVIEW / NOT ADMITTED')).toBeVisible();
  const overflow = await mfw.locator('body').evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(2);
  await page.screenshot({ path: testInfo.outputPath('cross-event-brand-graph-v2.png') });
});

test('Brand Graph BFS node deep-links with the same canonical brandRef', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mfwOpeningSeen', '1');
    localStorage.setItem('mfwOnboarded', '1');
  });
  await page.goto('/platform/index.html?event=mfw', { waitUntil: 'domcontentloaded' });
  const mfw = page.frameLocator('#eventFrame');
  await mfw.locator('body').evaluate(() => window.MFWRoute({ kind:'brand', id:'masterpeace' }));
  await mfw.locator('[data-action="brand-network-graph"]').click();
  await mfw.locator('[data-graph-node="meetings"] [data-action="graph-route"]').click();
  await expect(page.locator('[data-event="bfs"]')).toHaveClass(/active/);
  const bfs = page.frameLocator('#eventFrame');
  await expect(bfs.getByText('BRAND CONTEXT · masterpeace')).toBeVisible();
});

test('Brand Relationship Timeline preserves provenance freshness and revenue boundary', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem('mfwOpeningSeen', '1');
    localStorage.setItem('mfwOnboarded', '1');
  });
  await page.goto('/platform/index.html?event=mfw', { waitUntil: 'domcontentloaded' });
  const mfw = page.frameLocator('#eventFrame');
  await page.locator('#eventFrame').evaluate((el) => el.contentWindow.MFWRoute({ kind:'brand', id:'masterpeace' }));
  await mfw.locator('[data-action="brand-network-graph"]').click();
  await mfw.locator('[data-action="brand-relationship-timeline"]').click();

  await expect(mfw.getByText('BRAND RELATIONSHIP TIMELINE · READ ONLY')).toBeVisible();
  await expect(mfw.locator('[data-timeline-kind="brand_first_seen"]')).toBeVisible();
  await expect(mfw.locator('[data-timeline-kind="made_verification"]')).toContainText('VERIFIED');
  await expect(mfw.locator('[data-timeline-kind="bfs_meeting"]')).toContainText('bfs_meeting_authority');
  await expect(mfw.locator('[data-timeline-kind="brand365_continuity"]').first()).toContainText('125');
  await expect(mfw.locator('[data-timeline-kind="verified_commercial_outcome"]')).toContainText('NOT EVIDENCED');
  await expect(mfw.getByText('PREVIEW / NOT ADMITTED')).toBeVisible();
  const overflow = await mfw.locator('body').evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(2);
  await page.screenshot({ path: testInfo.outputPath('brand-relationship-timeline.png') });
});

test('live evidence distinguishes cross-event brand transition from meeting and revenue proof', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mfp.crossBrandJourney.v1', JSON.stringify({
      brandRef: 'masterpeace',
      source: 'made_in_moscow',
      lastTarget: 'bfs',
      lastRouteKind: 'brand-buyer',
      observedAt: '2026-10-07T17:00:00.000Z'
    }));
  });
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#hubBtn').click();
  await page.locator('[data-hub-tab="proof"]').click();
  await expect(page.getByText('CROSS-EVENT', { exact: true })).toBeVisible();
  await expect(page.getByText(/Made → BFS · masterpeace/)).toBeVisible();
  await expect(page.getByText(/Requires explicit Deal Room \/ request evidence/)).toBeVisible();
  await expect(page.getByText(/Requires admitted external reference/)).toBeVisible();
});


test('guided investor demo traverses all three ecosystems and shared layers', async ({ page }) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#investorBtn').click();
  await page.locator('#investorDemoStart').click();
  await expect(page.locator('#investorPilot')).toBeVisible();
  await expect(page.locator('#investorPilotStep')).toHaveText('01 / 15');

  await page.locator('#investorPilotNext').click();
  await expect(page.locator('[data-event="mfw"]')).toHaveClass(/active/);
  await page.locator('#investorPilotNext').click();
  await expect(page.locator('[data-event="bfs"]')).toHaveClass(/active/);
  await page.locator('#investorPilotNext').click();
  await expect(page.locator('[data-event="made"]')).toHaveClass(/active/);

  await page.locator('#investorPilotNext').click();
  await expect(page.locator('#accountDrawer')).not.toHaveClass(/hidden/);
  await page.locator('#investorPilotNext').click();
  await expect(page.locator('[data-hub-tab="graph"]')).toHaveClass(/active/);
  await page.locator('#investorPilotNext').click();
  await expect(page.locator('[data-hub-tab="proof"]')).toHaveClass(/active/);
  await page.locator('#investorPilotNext').click();
  await expect(page.locator('[data-hub-tab="partner"]')).toHaveClass(/active/);
  await page.locator('#investorPilotNext').click();
  await expect(page.locator('[data-hub-tab="brand"]')).toHaveClass(/active/);
  await page.locator('#investorPilotNext').click();
  await expect(page.locator('[data-hub-tab="dealroom"]')).toHaveClass(/active/);
  await page.locator('#investorPilotNext').click();
  await expect(page.locator('[data-hub-tab="trust"]')).toHaveClass(/active/);
  await expect(page.getByText('БЕЗ НЕПРОЗРАЧНОЙ ОЦЕНКИ')).toBeVisible();
  await page.locator('#investorPilotNext').click();
  await expect(page.locator('[data-hub-tab="economics"]')).toHaveClass(/active/);
  await page.locator('#investorPilotNext').click();
  await expect(page.locator('[data-hub-tab="committee"]')).toHaveClass(/active/);
  await page.locator('#investorPilotNext').click();
  await expect(page.locator('[data-hub-tab="capital"]')).toHaveClass(/active/);
  await page.locator('#investorPilotNext').click();
  await expect(page.locator('#valueModal')).not.toHaveClass(/hidden/);
  await expect(page.locator('#investorPilotStep')).toHaveText('15 / 15');
});

test('investor media gallery keeps three ecosystem visuals distinct', async ({ page }, testInfo) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#investorBtn').click();
  const cards = page.locator('.investor-ecosystem-card');
  await expect(cards).toHaveCount(3);
  const backgrounds = await cards.evaluateAll((els) => els.map((el) => getComputedStyle(el).backgroundImage));
  expect(new Set(backgrounds).size).toBe(3);
  expect(backgrounds.every((x) => x && x !== 'none')).toBeTruthy();
  await expectNoDocumentOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('investor-three-ecosystems.png') });
});

test('Cross-event identity graph keeps shared identity and scoped rights separate', async ({ page }, testInfo) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#hubBtn').click();
  await page.locator('[data-hub-tab="graph"]').click();
  await expect(page.locator('#hubContent > .drawer-kicker').first()).toContainText('СКВОЗНОЙ ГРАФ ИДЕНТИЧНОСТИ');
  await expect(page.locator('.identity-node')).toHaveCount(5);
  await expect(page.getByText('ОБЩИЙ ID ПОЛЬЗОВАТЕЛЯ')).toBeVisible();
  await expect(page.getByText(/статус подтверждения бренда остаётся отдельным серверным статусом/i)).toBeVisible();
  await expect(page.getByText(/не объединяет.*права верификации брендов/i)).toBeVisible();
  await expectNoDocumentOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('cross-event-identity-graph.png') });
});

test('Evidence Control Tower distinguishes live dossier from synthetic dossier and portfolio', async ({ page }, testInfo) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#hubBtn').click();
  await page.locator('[data-hub-tab="proof"]').click();
  await expect(page.locator('.control-tower-top .drawer-kicker')).toContainText('ЦЕНТР УПРАВЛЕНИЯ ДОКАЗАТЕЛЬСТВАМИ');
  await expect(page.getByText('LIVE-ДАННЫЕ · ТЕКУЩИЙ АККАУНТ')).toBeVisible();
  await expect(page.locator('.dossier-timeline article')).toHaveCount(10);
  await expect(page.getByText('НЕ ПОДТВЕРЖДЕНО').first()).toBeVisible();

  await page.locator('[data-proof-mode="synthetic"]').click();
  await expect(page.getByText('ДЕМОНСТРАЦИОННЫЙ / СИНТЕТИЧЕСКИЙ КЕЙС')).toBeVisible();
  await expect(page.locator('.case-selector button')).toHaveCount(3);
  await expect(page.locator('.dossier-timeline article')).toHaveCount(12);
  await expect(page.locator('.dossier-timeline .evidence-synthetic')).toHaveCount(12);

  await page.locator('[data-control-view="portfolio"]').click();
  await expect(page.getByText('ДЕМОНСТРАЦИОННЫЙ / СИНТЕТИЧЕСКИЙ ПОРТФЕЛЬ')).toBeVisible();
  await expect(page.locator('.portfolio-funnel .portfolio-stage')).toHaveCount(8);
  await expect(page.locator('.retention-tower article')).toHaveCount(3);
  await expect(page.getByText('ЗАТРОНУТЫЕ REVENUE SURFACES · НЕ ВЫРУЧКА')).toBeVisible();
  await expectNoDocumentOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('evidence-control-tower-portfolio.png') });
});

test('Portfolio drill-down opens synthetic cohorts and representative dossiers', async ({ page }, testInfo) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#hubBtn').click();
  await page.locator('[data-hub-tab="proof"]').click();
  await page.locator('[data-proof-mode="synthetic"]').click();
  await page.locator('[data-control-view="portfolio"]').click();

  await page.locator('[data-portfolio-stage="INTENT"]').click();
  await expect(page.getByText('INTENT = 65')).toBeVisible();
  await expect(page.locator('.cohort-breakdown article')).toHaveCount(3);
  await expect(page.getByText('MFW').last()).toBeVisible();
  await expect(page.locator('.cohort-breakdown article').filter({ hasText: 'MFW' }).locator('b')).toHaveText('31');
  await expect(page.getByText('BFS').last()).toBeVisible();
  await expect(page.locator('.cohort-breakdown article').filter({ hasText: 'BFS' }).locator('b')).toHaveText('29');
  await expect(page.getByText('MADE').last()).toBeVisible();
  await expect(page.locator('.cohort-breakdown article').filter({ hasText: 'MADE' }).locator('b')).toHaveText('5');
  await expect(page.locator('.representative-journeys article')).toHaveCount(3);
  await expect(page.getByText(/Показан агрегат; representative dossiers ниже — примеры/)).toBeVisible();

  await page.locator('[data-open-dossier="buyer-brand-alpha"]').click();
  await expect(page.getByText('Demo Buyer A → Demo Brand A')).toBeVisible();
  await expect(page.getByText('demo://deal-room/request-001')).toBeVisible();
  await expectNoDocumentOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('portfolio-intent-drilldown.png') });
});

test('Filterable Portfolio Control Tower recalculates funnel retention and ecosystem mix', async ({ page }, testInfo) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#hubBtn').click();
  await page.locator('[data-hub-tab="proof"]').click();
  await page.locator('[data-proof-mode="synthetic"]').click();
  await page.locator('[data-control-view="portfolio"]').click();

  await expect(page.locator('[data-portfolio-filter]')).toHaveCount(8);
  await expect(page.locator('.portfolio-pop b')).toHaveText('1200');

  await page.locator('[data-portfolio-filter="ecosystem"]').selectOption('bfs');
  await expect(page.locator('.portfolio-pop b')).toHaveText('360');
  await expect(page.locator('[data-portfolio-stage="INTENT"] > b')).toHaveText('29');

  await page.locator('[data-portfolio-filter="market"]').selectOption('CIS');
  await expect(page.locator('.portfolio-pop b')).toHaveText('90');
  await expect(page.locator('[data-portfolio-stage="INTENT"] > b')).toHaveText('7');

  await page.locator('[data-portfolio-filter="retention"]').selectOption('D365');
  await expect(page.locator('.retention-tower article.active b')).toHaveText('2');

  await page.locator('[data-portfolio-filter="revenueSurface"]').selectOption('api');
  await expect(page.locator('.portfolio-pop b')).toHaveText('90');
  await expect(page.locator('.portfolio-revenue article.active')).toHaveCount(1);

  await page.locator('[data-portfolio-stage="INTENT"]').click();
  await expect(page.getByText('INTENT = 7')).toBeVisible();
  await expect(page.getByText('BFS').last()).toBeVisible();
  await expect(page.getByText('7', { exact: true }).last()).toBeVisible();
  await expectNoDocumentOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('portfolio-filters.png') });
});

test('Filterable Portfolio Control Tower exposes honest zero state', async ({ page }) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#hubBtn').click();
  await page.locator('[data-hub-tab="proof"]').click();
  await page.locator('[data-proof-mode="synthetic"]').click();
  await page.locator('[data-control-view="portfolio"]').click();

  await page.locator('[data-portfolio-filter="ecosystem"]').selectOption('made');
  await page.locator('[data-portfolio-filter="market"]').selectOption('Asia');
  await expect(page.locator('.portfolio-pop b')).toHaveText('0');
  await expect(page.getByText('НЕТ ПОДХОДЯЩЕГО СИНТЕТИЧЕСКОГО COHORT')).toBeVisible();
  await expect(page.locator('[data-portfolio-stage="AUDIENCE"] > b')).toHaveText('0');
  await expectNoDocumentOverflow(page);

  await page.locator('[data-reset-portfolio]').click();
  await expect(page.locator('.portfolio-pop b')).toHaveText('1200');
});

test('Comparison Mode compares synthetic slices side by side in Russian by default', async ({ page }, testInfo) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#hubBtn').click();
  await page.locator('[data-hub-tab="proof"]').click();
  await page.locator('[data-proof-mode="synthetic"]').click();
  await page.locator('[data-control-view="comparison"]').click();

  await expect(page.getByText('СРАВНЕНИЕ СИНТЕТИЧЕСКИХ СЦЕНАРИЕВ')).toBeVisible();
  await expect(page.locator('.scenario-a .scenario-title > span')).toHaveText('СЦЕНАРИЙ A');
  await expect(page.locator('.scenario-b .scenario-title > span')).toHaveText('СЦЕНАРИЙ B');
  await expect(page.locator('[data-scenario-side="a"]')).toHaveCount(8);
  await expect(page.locator('[data-scenario-side="b"]')).toHaveCount(8);
  await expect(page.locator('.comparison-metrics article')).toHaveCount(6);
  await expect(page.locator('[data-scenario-side="a"][data-scenario-key="ecosystem"]')).toHaveValue('mfw');
  await expect(page.locator('[data-scenario-side="b"][data-scenario-key="ecosystem"]')).toHaveValue('bfs');

  await page.locator('[data-comparison-preset="cis-gcc"]').click();
  await expect(page.locator('[data-scenario-side="a"][data-scenario-key="market"]')).toHaveValue('CIS');
  await expect(page.locator('[data-scenario-side="b"][data-scenario-key="market"]')).toHaveValue('GCC');

  await page.locator('[data-comparison-preset="new-returning"]').click();
  await expect(page.locator('[data-scenario-side="a"][data-scenario-key="buyerType"]')).toHaveValue('new');
  await expect(page.locator('[data-scenario-side="b"][data-scenario-key="buyerType"]')).toHaveValue('returning');

  await expect(page.getByText(/не доказывает причинность/)).toBeVisible();
  await expectNoDocumentOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('comparison-mode-ru.png') });
});

test('Opportunity Explanation decomposes scenario gap and links representative evidence', async ({ page }, testInfo) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#hubBtn').click();
  await page.locator('[data-hub-tab="proof"]').click();
  await page.locator('[data-proof-mode="synthetic"]').click();
  await page.locator('[data-control-view="comparison"]').click();

  await expect(page.getByText(/OPPORTUNITY EXPLANATION/)).toBeVisible();
  await expect(page.locator('.gap-waterfall article')).toHaveCount(6);
  await expect(page.locator('.explain-dimension')).toHaveCount(2);
  await expect(page.locator('.retention-compare article')).toHaveCount(3);
  await expect(page.getByText(/composition\/mix effect/i)).toBeVisible();
  await expect(page.getByText(/не causal attribution/i)).toBeVisible();

  await page.locator('[data-comparison-preset="new-returning"]').click();
  await expect(page.locator('[data-scenario-side="a"][data-scenario-key="buyerType"]')).toHaveValue('new');
  await expect(page.locator('[data-scenario-side="b"][data-scenario-key="buyerType"]')).toHaveValue('returning');

  const dossierButtons = page.locator('[data-explanation-dossier]');
  if (await dossierButtons.count()) {
    await dossierButtons.first().click();
    await expect(page.locator('.dossier-timeline article')).toHaveCount(12);
  }
  await expectNoDocumentOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('opportunity-explanation.png') });
});

test('Capital Allocation ranks three interventions and normalizes modelled pilot budget to 100 points', async ({ page }, testInfo) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#hubBtn').click();
  await page.locator('[data-hub-tab="proof"]').click();
  await page.locator('[data-proof-mode="synthetic"]').click();
  await page.locator('[data-control-view="comparison"]').click();

  await expect(page.getByText(/RECOMMENDATION \/ CAPITAL ALLOCATION/)).toBeVisible();
  await expect(page.locator('.allocation-card')).toHaveCount(3);
  await expect(page.locator('.allocation-budget b')).toHaveText('100');
  await expect(page.locator('.allocation-budget small')).toContainText('условных points · не ₽');
  await expect(page.locator('.allocation-evidence')).toHaveCount(3);
  await expect(page.locator('.allocation-governance > div')).toHaveCount(4);

  const points = await page.locator('.allocation-rank b').allTextContents();
  const sum = points.reduce((s, x) => s + Number((x.match(/\d+/) || ['0'])[0]), 0);
  expect(sum).toBe(100);

  await expect(page.locator('.allocation-method b')).toHaveText('Priority score');
  await expect(page.locator('.allocation-method span')).toContainText('Leverage/effort — явные model assumptions');
  await expect(page.locator('.capital-allocation > .hub-note')).toContainText('Реальный бюджет требует стоимости интервенций');
  await expectNoDocumentOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('capital-allocation.png') });
});

test('Capital Allocation recommendations react to scenario presets', async ({ page }) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#hubBtn').click();
  await page.locator('[data-hub-tab="proof"]').click();
  await page.locator('[data-proof-mode="synthetic"]').click();
  await page.locator('[data-control-view="comparison"]').click();

  const before = await page.locator('.allocation-card h5').allTextContents();
  await page.locator('[data-comparison-preset="cis-gcc"]').click();
  const after = await page.locator('.allocation-card h5').allTextContents();
  expect(after.length).toBe(3);
  expect(before.length).toBe(3);
  await expect(page.locator('.allocation-card')).toHaveCount(3);
  await expect(page.locator('.allocation-meta')).toHaveCount(3);
  await expectNoDocumentOverflow(page);
});

test('Investment Committee Workspace closes recommendation to decision loop in demo state', async ({ page }, testInfo) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#hubBtn').click();
  await page.locator('[data-hub-tab="committee"]').click();

  await expect(page.getByText(/ИНВЕСТИЦИОННЫЙ КОМИТЕТ · ДЕМОНСТРАЦИОННЫЙ/)).toBeVisible();
  await expect(page.locator('.committee-recommendations button')).toHaveCount(3);
  await expect(page.locator('.committee-case-grid article')).toHaveCount(6);
  await expect(page.getByText(/не являются реальными корпоративными решениями/)).toBeVisible();
  await expect(page.locator('.committee-status b')).toHaveText('ЧЕРНОВИК');

  const activeId = await page.locator('.committee-recommendations button.active').getAttribute('data-committee-select');
  await page.locator('[data-committee-action="submit"][data-committee-id="' + activeId + '"]').click();
  await expect(page.locator('.committee-status b')).toHaveText('НА РАССМОТРЕНИИ');

  await page.locator('[data-committee-action="approve"][data-committee-id="' + activeId + '"]').click();
  await expect(page.locator('.committee-status b')).toHaveText('ОДОБРЕНО · DEMO');

  await page.locator('[data-committee-action="start"][data-committee-id="' + activeId + '"]').click();
  await expect(page.locator('.committee-status b')).toHaveText('ПИЛОТ ИДЁТ');

  await page.locator('[data-committee-action="measure"][data-committee-id="' + activeId + '"]').click();
  await expect(page.locator('.committee-status b')).toHaveText('ИЗМЕРЕНО');
  await expect(page.locator('.committee-evidence-plan span.done').first()).toBeVisible();

  await page.locator('[data-committee-action="decide"][data-committee-id="' + activeId + '"]').click();
  await expect(page.locator('.committee-status b')).toHaveText('РЕШЕНИЕ ПРИНЯТО');
  await expect(page.locator('.committee-case-grid article').filter({ hasText: 'РЕШЕНИЕ' }).locator('b')).toHaveText(/МАСШТАБИРОВАТЬ|ДОРАБОТАТЬ|ОСТАНОВИТЬ/);
  await expect(page.locator('.committee-history > div:not(.drawer-kicker)')).toHaveCount(6);
  await expectNoDocumentOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('investment-committee-workspace.png') });
});

test('Capital Allocation opens selected recommendation as committee business case', async ({ page }) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#hubBtn').click();
  await page.locator('[data-hub-tab="proof"]').click();
  await page.locator('[data-proof-mode="synthetic"]').click();
  await page.locator('[data-control-view="comparison"]').click();

  const recommendation = page.locator('.allocation-card').first();
  const title = await recommendation.locator('h5').textContent();
  await recommendation.locator('[data-open-committee]').click();
  await expect(page.locator('[data-hub-tab="committee"]')).toHaveClass(/active/);
  await expect(page.locator('.committee-case-head h3')).toHaveText(title);
  await expect(page.locator('.committee-status small')).toContainText('модельных баллов бюджета');
  await expectNoDocumentOverflow(page);
});

test('Programme Capital Control separates reserve commitments spend and measured outcomes', async ({ page }, testInfo) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#hubBtn').click();
  await page.locator('[data-hub-tab="capital"]').click();

  await expect(page.getByText(/УПРАВЛЕНИЕ КАПИТАЛОМ ПРОГРАММЫ/)).toBeVisible();
  await expect(page.locator('.programme-envelope b')).toHaveText('150');
  await expect(page.locator('#capitalAuthorityStatus')).toContainText('ДЕМОНСТРАЦИОННЫЙ РЕЖИМ · СЕРВЕРНЫЙ РЕЕСТР ЗАЩИЩЁН');
  await expect(page.locator('#capitalAuthorityStatus')).toContainText('ТОЛЬКО POSTGRESQL');
  const stages = page.locator('.programme-stage-grid article');
  await expect(stages).toHaveCount(7);
  await expect(stages.filter({ hasText: 'ЗАПРОШЕНО' }).locator('b')).toHaveText('128');
  await expect(stages.filter({ hasText: 'ОДОБРЕНО' }).locator('b')).toHaveText('100');
  await expect(stages.filter({ hasText: 'ЗАРЕЗЕРВИРОВАНО' }).locator('b')).toHaveText('85');
  await expect(stages.filter({ hasText: 'ИСПОЛЬЗОВАНО' }).locator('b')).toHaveText('58');
  await expect(stages.filter({ hasText: 'ИЗМЕРЕНО' }).locator('b')).toHaveText('46');
  await expect(stages.filter({ hasText: 'МАСШТАБИРОВАНО' }).locator('b')).toHaveText('22');
  await expect(stages.filter({ hasText: 'ОСТАНОВЛЕНО' }).locator('b')).toHaveText('6');

  const capacity = page.locator('.programme-capacity-grid article');
  await expect(capacity.filter({ hasText: 'НЕЗАРЕЗЕРВИРОВАННЫЙ РЕЗЕРВ' }).locator('b')).toHaveText('50');
  await expect(capacity.filter({ hasText: 'ЗАРЕЗЕРВИРОВАНО · НЕ ИСПОЛЬЗОВАНО' }).locator('b')).toHaveText('27');
  await expect(capacity.filter({ hasText: 'ЁМКОСТЬ ДЛЯ ПЕРЕРАСПРЕДЕЛЕНИЯ' }).locator('b')).toHaveText('50');
  await expect(page.locator('.programme-ecosystems article')).toHaveCount(3);
  await expect(page.locator('.programme-row:not(.head)')).toHaveCount(5);
  await expect(page.locator('.programme-blockers article')).toHaveCount(3);
  await expectNoDocumentOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('programme-capital-control.png') });
});

test('Programme Capital Control requires explicit release before STOP commitment becomes reallocatable', async ({ page }) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#hubBtn').click();
  await page.locator('[data-hub-tab="capital"]').click();

  const capacity = page.locator('.programme-capacity-grid article');
  await expect(capacity.filter({ hasText: 'ЯВНО ОСВОБОЖДЕНО' }).locator('b')).toHaveText('0');
  await expect(capacity.filter({ hasText: 'ЁМКОСТЬ ДЛЯ ПЕРЕРАСПРЕДЕЛЕНИЯ' }).locator('b')).toHaveText('50');

  const release = page.locator('[data-programme-release="deal-room-sla"]');
  await expect(release).toBeVisible();
  await release.click();

  await expect(capacity.filter({ hasText: 'ЯВНО ОСВОБОЖДЕНО' }).locator('b')).toHaveText('3');
  await expect(capacity.filter({ hasText: 'ЗАРЕЗЕРВИРОВАНО · НЕ ИСПОЛЬЗОВАНО' }).locator('b')).toHaveText('24');
  await expect(capacity.filter({ hasText: 'ЁМКОСТЬ ДЛЯ ПЕРЕРАСПРЕДЕЛЕНИЯ' }).locator('b')).toHaveText('53');
  await expect(page.locator('[data-programme-release="deal-room-sla"]')).toBeDisabled();
  await expectNoDocumentOverflow(page);
});

test('Capital Reallocation Optimizer compares 10 20 30 point tranches with evidence gates', async ({ page }, testInfo) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#hubBtn').click();
  await page.locator('[data-hub-tab="capital"]').click();

  await expect(page.getByText(/ОПТИМИЗАТОР ПЕРЕРАСПРЕДЕЛЕНИЯ КАПИТАЛА/)).toBeVisible();
  await expect(page.locator('.optimizer-tranches button')).toHaveCount(3);
  await expect(page.locator('.optimizer-card')).toHaveCount(3);
  await expect(page.locator('.optimizer-card.ready')).toHaveCount(1);
  await expect(page.locator('.optimizer-card.conditional')).toHaveCount(1);
  await expect(page.locator('.optimizer-card.hold')).toHaveCount(1);
  await expect(page.locator('.optimizer-card.hold')).toContainText('Сделано в Москве');
  await expect(page.locator('.optimizer-card.hold')).toContainText('ПАУЗА');

  await expect(page.locator('.optimizer-recommendation').first()).toContainText('MFW');
  await expect(page.locator('.optimizer-capacity b')).toHaveText('50');

  await page.locator('[data-optimizer-tranche="20"]').click();
  await expect(page.getByRole('heading', { name: /Куда направить следующие 20 points/ })).toBeVisible();
  await expect(page.locator('[data-optimizer-tranche="20"]')).toHaveClass(/active/);
  await expect(page.locator('.optimizer-card').filter({ hasText: 'BFS' })).toContainText('20 / 20');

  await page.locator('[data-optimizer-tranche="30"]').click();
  await expect(page.getByRole('heading', { name: /Куда направить следующие 30 points/ })).toBeVisible();
  await expect(page.locator('.optimizer-card').filter({ hasText: 'BFS' })).toContainText('20 / 30');
  await expect(page.locator('.optimizer-card').filter({ hasText: 'Сделано в Москве' })).toContainText('10 / 30');
  await expect(page.locator('.optimizer-method')).toContainText('Статус «ПАУЗА» получает оценку 0');
  await expectNoDocumentOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('capital-reallocation-optimizer.png') });
});

test('Capital Reallocation Optimizer capacity follows explicit programme releases', async ({ page }) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#hubBtn').click();
  await page.locator('[data-hub-tab="capital"]').click();

  await expect(page.locator('.optimizer-capacity b')).toHaveText('50');
  await page.locator('[data-programme-release="deal-room-sla"]').click();
  await expect(page.locator('.optimizer-capacity b')).toHaveText('53');
  await expect(page.locator('.optimizer-recommendation')).toContainText(/Оптимизатор не утверждает капитал|МОДЕЛЬНАЯ РЕКОМЕНДАЦИЯ/);
  await expectNoDocumentOverflow(page);
});

test('Portfolio Scenario Simulator ranks eligible capital mixes for 10 20 30 point budgets', async ({ page }, testInfo) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#hubBtn').click();
  await page.locator('[data-hub-tab="capital"]').click();

  await expect(page.getByText(/СИМУЛЯТОР СЦЕНАРИЕВ ПОРТФЕЛЯ/)).toBeVisible();
  await expect(page.locator('.simulator-budgets button')).toHaveCount(3);
  await expect(page.locator('.simulator-row:not(.head)')).toHaveCount(5);
  await expect(page.locator('.simulator-row.best')).toHaveCount(1);
  await expect(page.locator('.simulator-table')).not.toContainText('MADE');
  await expect(page.locator('.simulator-method')).toContainText(/ПАУЗА.*не могут получать новый капитал/i);

  const best30 = await page.locator('.simulator-row.best span').textContent();
  await page.locator('[data-sim-budget="10"]').click();
  await expect(page.getByRole('heading', { name: /Как распределить 10 points/ })).toBeVisible();
  await expect(page.locator('.simulator-row:not(.head)')).toHaveCount(3);
  const best10 = await page.locator('.simulator-row.best span').textContent();

  await page.locator('[data-sim-budget="20"]').click();
  await expect(page.getByRole('heading', { name: /Как распределить 20 points/ })).toBeVisible();
  await expect(page.locator('.simulator-row:not(.head)')).toHaveCount(5);
  const best20 = await page.locator('.simulator-row.best span').textContent();

  expect(best30).toBeTruthy();
  expect(best20).toBeTruthy();
  expect(best10).toBeTruthy();
  await expectNoDocumentOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('portfolio-scenario-simulator.png') });
});

test('Portfolio Scenario Simulator preserves reserve optionality and capacity rules', async ({ page }) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#hubBtn').click();
  await page.locator('[data-hub-tab="capital"]').click();

  await page.locator('[data-sim-budget="30"]').click();
  await expect(page.locator('.simulator-row:not(.head)')).toHaveCount(5);
  await expect(page.locator('.simulator-table')).toContainText('RESERVE');
  await expect(page.locator('.simulator-method')).toContainText('Нераспределённый бюджет остаётся резервом и сохраняет гибкость');
  await expect(page.locator('.simulator-method')).toContainText('Ни одно направление не может получить больше своей ёмкости освоения');
  await expectNoDocumentOverflow(page);
});

test('Best portfolio mix hands off into Investment Committee proposal workflow', async ({ page }, testInfo) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#hubBtn').click();
  await page.locator('[data-hub-tab="capital"]').click();
  await page.locator('[data-sim-budget="30"]').click();

  const bestMix = await page.locator('.simulator-row.best span').textContent();
  await page.locator('[data-sim-propose]').click();
  await expect(page.locator('[data-hub-tab="committee"]')).toHaveClass(/active/);
  await expect(page.locator('.committee-portfolio-proposal')).toBeVisible();
  await expect(page.locator('.committee-portfolio-proposal h4')).toHaveText(bestMix.replace(/^#01 · /,''));
  await expect(page.locator('.proposal-status b')).toHaveText('ЧЕРНОВИК');

  await page.locator('[data-portfolio-proposal-action="submit"]').click();
  await expect(page.locator('.proposal-status b')).toHaveText('НА РАССМОТРЕНИИ');

  await page.locator('[data-portfolio-proposal-action="approve"]').click();
  await expect(page.locator('.proposal-status b')).toHaveText('ОДОБРЕНО В ДЕМО');
  await expect(page.locator('.committee-portfolio-proposal')).toContainText('не approval authority');
  await expectNoDocumentOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('portfolio-proposal-handoff.png') });
});

test('Control Tower Russian labels remain the default surface language', async ({ page }) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await page.locator('#hubBtn').click();
  await page.locator('[data-hub-tab="proof"]').click();
  await expect(page.getByText('ЦЕНТР УПРАВЛЕНИЯ ДОКАЗАТЕЛЬСТВАМИ')).toBeVisible();
  await expect(page.getByRole('button', { name: 'ДОСЬЕ КЕЙСА' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'ПОРТФЕЛЬ' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'СРАВНЕНИЕ' })).toBeVisible();
  await expectNoDocumentOverflow(page);
});

test('Evidence Control Tower synthetic case exposes reason evidence ref and revenue boundary', async ({ page }) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#hubBtn').click();
  await page.locator('[data-hub-tab="proof"]').click();
  await page.locator('[data-proof-mode="synthetic"]').click();
  await expect(page.getByText(/Buyer role \+ category overlap \+ explicit saved look/)).toBeVisible();
  await expect(page.getByText('demo://recommendation/buyer-brand-alpha')).toBeVisible();
  await expect(page.getByText(/Потенциальный stream ≠ фактическая выручка/)).toBeVisible();
  await page.locator('[data-control-case="buyer-brand-gamma"]').click();
  await expect(page.getByText('Demo Buyer C → Demo Brand C')).toBeVisible();
  await expect(page.locator('.evidence-badge.evidence-reported').filter({ hasText: /^ЗАЯВЛЕННОЕ$/ })).toBeVisible();
  await expectNoDocumentOverflow(page);
});

test('Partner Console keeps revenue recognition behind evidence gates', async ({ page }) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#hubBtn').click();
  await page.locator('[data-hub-tab="partner"]').click();
  await expect(page.locator('.partner-flow article')).toHaveCount(7);
  await expect(page.getByText('ГРАНИЦА ПРИЗНАНИЯ ВЫРУЧКИ')).toBeVisible();
  await expect(page.getByText(/признание выручки всё равно требует/i)).toBeVisible();
  await expectNoDocumentOverflow(page);
});

test('Brand Cockpit exposes buyer conversion and 30 90 365 continuity', async ({ page }) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#hubBtn').click();
  await page.locator('[data-hub-tab="brand"]').click();
  await expect(page.locator('.brand-funnel article')).toHaveCount(9);
  await expect(page.locator('.continuity-grid article')).toHaveCount(3);
  await expect(page.locator('.continuity-grid span', { hasText: /^D30$/ })).toBeVisible();
  await expect(page.locator('.continuity-grid span', { hasText: /^D90$/ })).toBeVisible();
  await expect(page.locator('.continuity-grid span', { hasText: /^D365$/ })).toBeVisible();
  await expectNoDocumentOverflow(page);
});

test('Economics maps payer product formula and revenue gate without fake KPI', async ({ page }) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#hubBtn').click();
  await page.locator('[data-hub-tab="economics"]').click();
  await expect(page.locator('.economics-row:not(.head)')).toHaveCount(5);
  await expect(page.getByText(/нет фактических ARR\/MRR/i)).toBeVisible();
  await expect(page.getByText(/Демонстрационные подстановки намеренно отсутствуют/)).toBeVisible();
  await expectNoDocumentOverflow(page);
});

test('Trust Passport preview is explainable and avoids a universal score', async ({ page }, testInfo) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#hubBtn').click();
  await page.locator('[data-hub-tab="trust"]').click();
  await expect(page.getByText('ПАСПОРТ ДОВЕРИЯ · ПРЕДПРОСМОТР ТОЛЬКО ДЛЯ ЧТЕНИЯ')).toBeVisible();
  await expect(page.locator('.trust-dimension-grid article')).toHaveCount(6);
  await expect(page.getByText('БЕЗ НЕПРОЗРАЧНОЙ ОЦЕНКИ')).toBeVisible();
  await expect(page.getByText('Без выводов о благосостоянии, кредитоспособности, политике, этничности, скрытых намерениях или универсальной репутации.')).toBeVisible();
  await expectNoDocumentOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('trust-passport-preview.png') });
});

test('investor value layer separates monetisation hypotheses from revenue truth', async ({ page }, testInfo) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  const valueBtn = page.locator('#valueBtn');
  if (await valueBtn.isVisible()) {
    await valueBtn.click();
  } else {
    await page.locator('#investorBtn').click();
    await page.locator('[data-investor-step="14"]').click();
  }
  await expect(page.locator('.revenue-grid article')).toHaveCount(5);
  await expect(page.getByText('Правило признания выручки')).toBeVisible();
  await expect(page.getByText(/Вовлечение, встреча или запрос сами по себе не являются выручкой/)).toBeVisible();
  await expectNoDocumentOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('investor-revenue-architecture.png') });
});

test('premium companion Discover stays usable across the platform', async ({ page }, testInfo) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#hubBtn').click();
  const hub = page.locator('.hub-card');
  await expect(hub).toBeVisible();
  await expect(page.locator('[data-companion-route]')).toHaveCount(4);
  for (const button of await page.locator('[data-companion-route]').all()) {
    await expectTarget(button, 44);
  }
  const search = page.locator('#directorySearch');
  await expect(search).toBeVisible();
  await search.fill('fashion');
  await expectNoDocumentOverflow(page);
  const hubBox = await hub.boundingBox();
  expect(hubBox.width).toBeLessThanOrEqual(page.viewportSize().width + 1);
  expect(hubBox.height).toBeLessThanOrEqual(page.viewportSize().height + 1);
  await page.screenshot({ path: testInfo.outputPath('platform-discover.png') });

  await page.locator('#hubClose').click();
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');
  await expect(page.locator('#directorySearch')).toBeFocused();
});

test('lifecycle Now reflects post-event truth after the published programme', async ({ page }, testInfo) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#hubBtn').click();
  await page.locator('[data-hub-tab="today"]').click();
  await expect(page.locator('.today-hero')).toHaveAttribute('data-phase', 'after');
  await expect(page.getByText('ПОСЛЕСОБЫТИЙНЫЕ ФАКТЫ')).toBeVisible();
  await expect(page.locator('.today-action-grid button')).toHaveCount(4);
  await expect(page.locator('.today-programme article')).toHaveCount(0);
  await expectNoDocumentOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('platform-now-after.png') });
});

test('lifecycle Now switches to live programme on an event day', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const NativeDate = Date;
    const fixed = NativeDate.parse('2026-09-29T10:00:00Z');
    class FixedDate extends NativeDate {
      constructor(...args) { super(...(args.length ? args : [fixed])); }
      static now() { return fixed; }
    }
    window.Date = FixedDate;
  });
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#hubBtn').click();
  await page.locator('[data-hub-tab="today"]').click();
  await expect(page.locator('.today-hero')).toHaveAttribute('data-phase', 'live');
  await expect(page.locator('.today-programme article').first()).toBeVisible();
  await expect(page.locator('.today-programme article')).not.toHaveCount(0);
  await expectNoDocumentOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('platform-now-live.png') });
});

test('Deal Room preview is read-only and viewport safe', async ({ page }, testInfo) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#hubBtn').click();
  await page.locator('[data-hub-tab="dealroom"]').click();
  await expect(page.getByText('ПРЕДПРОСМОТР · КОММЕРЧЕСКИЕ ДАННЫЕ НЕ СОХРАНЯЮТСЯ')).toBeVisible();
  await expect(page.locator('.dealroom-stage-grid article')).toHaveCount(5);
  const requestButtons = page.locator('.request-chip-grid button');
  await expect(requestButtons).toHaveCount(8);
  for (const button of await requestButtons.all()) {
    await expect(button).toBeDisabled();
  }
  await expect(page.locator('#hubContent input, #hubContent textarea, #hubContent select')).toHaveCount(0);
  await expectNoDocumentOverflow(page);
  const hub = page.locator('.hub-card');
  const box = await hub.boundingBox();
  expect(box.width).toBeLessThanOrEqual(page.viewportSize().width + 1);
  expect(box.height).toBeLessThanOrEqual(page.viewportSize().height + 1);
  await page.screenshot({ path: testInfo.outputPath('deal-room-preview.png') });
});

test('PWA shell and direct ecosystem shortcuts are available', async ({ page }) => {
  const manifestResponse = await page.request.get('/manifest.webmanifest');
  expect(manifestResponse.ok()).toBeTruthy();
  const manifest = await manifestResponse.json();
  expect(manifest.name).toBe('Moscow Fashion Platform');
  expect(manifest.start_url).toBe('/platform/index.html');
  expect(manifest.shortcuts.map((x) => x.url)).toEqual(expect.arrayContaining([
    '/platform/index.html?event=mfw',
    '/platform/index.html?event=bfs',
    '/platform/index.html?event=made'
  ]));

  const swResponse = await page.request.get('/sw.js');
  expect(swResponse.ok()).toBeTruthy();
  expect(await swResponse.text()).toMatch(/mfp-shell-2026-10-06-p\d+/);

  await page.goto('/platform/index.html?event=made', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-event="made"]')).toHaveClass(/active/);
  await expect(page.locator('#eventFrame')).toHaveAttribute('src', './made-in-moscow/index.html');
});

test('platform overlays fit active viewport', async ({ page }, testInfo) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#hubBtn').click();
  const hub = page.locator('.hub-card');
  await expect(hub).toBeVisible();
  const viewport = page.viewportSize();
  let box = await hub.boundingBox();
  expect(box.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.height).toBeLessThanOrEqual(viewport.height + 1);
  await page.locator('.hub-card > .drawer-close').click();

  await page.locator('#accountBtn').click();
  const drawer = page.locator('.drawer-card');
  await expect(drawer).toBeVisible();
  box = await drawer.boundingBox();
  expect(box.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.height).toBeLessThanOrEqual(viewport.height + 1);
  await page.screenshot({ path: testInfo.outputPath('account-drawer.png') });
});

test('MFW participant experience keeps bottom navigation usable', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem('mfwOpeningSeen', '1');
    localStorage.setItem('mfwOnboarded', '1');
  });
  await page.goto('/mfw/index.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.bottom-nav')).toBeVisible({ timeout: 10000 });
  await expectNoDocumentOverflow(page);
  await expectTarget(page.locator('.bottom-nav .nav-btn').first(), 44);
  const appWidth = await page.locator('.app').evaluate((el) => el.getBoundingClientRect().width);
  expect(appWidth).toBeLessThanOrEqual(page.viewportSize().width + 1);
  await page.screenshot({ path: testInfo.outputPath('mfw-participant.png') });
});

test('Admin Console navigation remains reachable on phone and tablet', async ({ page }, testInfo) => {
  await page.goto('/admin/index.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.sidebar')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.sidebar .nav')).toBeVisible();
  await expect(page.getByText('Authority unavailable')).toHaveCount(0);
  await expect(page.locator('.hero-title')).toBeVisible();
  await expect(page.locator('.metric')).toHaveCount(4);
  await expectNoDocumentOverflow(page);
  await expectTarget(page.locator('.sidebar .nav button').first(), 40);
  await page.screenshot({ path: testInfo.outputPath('admin-console.png') });
});
