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

test('guided investor demo traverses all three ecosystems and shared layers', async ({ page }) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#investorBtn').click();
  await page.locator('#investorDemoStart').click();
  await expect(page.locator('#investorPilot')).toBeVisible();
  await expect(page.locator('#investorPilotStep')).toHaveText('01 / 13');

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
  await expect(page.getByText('NO OPAQUE SCORE')).toBeVisible();
  await page.locator('#investorPilotNext').click();
  await expect(page.locator('[data-hub-tab="economics"]')).toHaveClass(/active/);
  await page.locator('#investorPilotNext').click();
  await expect(page.locator('#valueModal')).not.toHaveClass(/hidden/);
  await expect(page.locator('#investorPilotStep')).toHaveText('13 / 13');
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
  await expect(page.getByText('CROSS-EVENT IDENTITY GRAPH', { exact: false })).toBeVisible();
  await expect(page.locator('.identity-node')).toHaveCount(5);
  await expect(page.getByText('SHARED USER ID')).toBeVisible();
  await expect(page.getByText(/brand Verified status remains a separate roster authority/i)).toBeVisible();
  await expect(page.getByText(/does not merge event credentials/i)).toBeVisible();
  await expectNoDocumentOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('cross-event-identity-graph.png') });
});

test('Evidence Control Tower distinguishes live dossier from synthetic dossier and portfolio', async ({ page }, testInfo) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#hubBtn').click();
  await page.locator('[data-hub-tab="proof"]').click();
  await expect(page.getByText('EVIDENCE CONTROL TOWER', { exact: false })).toBeVisible();
  await expect(page.getByText('LIVE PROOF · CURRENT ACCOUNT')).toBeVisible();
  await expect(page.locator('.dossier-timeline article')).toHaveCount(9);
  await expect(page.getByText('NOT EVIDENCED').first()).toBeVisible();

  await page.locator('[data-proof-mode="synthetic"]').click();
  await expect(page.getByText('ILLUSTRATIVE / SYNTHETIC CASE')).toBeVisible();
  await expect(page.locator('.case-selector button')).toHaveCount(3);
  await expect(page.locator('.dossier-timeline article')).toHaveCount(12);
  await expect(page.locator('.dossier-timeline .evidence-synthetic')).toHaveCount(12);

  await page.locator('[data-control-view="portfolio"]').click();
  await expect(page.getByText('ILLUSTRATIVE / SYNTHETIC PORTFOLIO')).toBeVisible();
  await expect(page.locator('.portfolio-funnel article')).toHaveCount(8);
  await expect(page.locator('.retention-tower article')).toHaveCount(3);
  await expect(page.getByText('REVENUE SURFACES TOUCHED · NOT REVENUE')).toBeVisible();
  await expectNoDocumentOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('evidence-control-tower-portfolio.png') });
});

test('Evidence Control Tower synthetic case exposes reason evidence ref and revenue boundary', async ({ page }) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#hubBtn').click();
  await page.locator('[data-hub-tab="proof"]').click();
  await page.locator('[data-proof-mode="synthetic"]').click();
  await expect(page.getByText(/Buyer role \+ category overlap \+ explicit saved look/)).toBeVisible();
  await expect(page.getByText('demo://recommendation/buyer-brand-alpha')).toBeVisible();
  await expect(page.getByText(/Potential stream ≠ realised revenue/)).toBeVisible();
  await page.locator('[data-control-case="buyer-brand-gamma"]').click();
  await expect(page.getByText('Demo Buyer C → Demo Brand C')).toBeVisible();
  await expect(page.getByText('REPORTED')).toBeVisible();
  await expectNoDocumentOverflow(page);
});

test('Partner Console keeps revenue recognition behind evidence gates', async ({ page }) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#hubBtn').click();
  await page.locator('[data-hub-tab="partner"]').click();
  await expect(page.locator('.partner-flow article')).toHaveCount(7);
  await expect(page.getByText('REVENUE BOUNDARY')).toBeVisible();
  await expect(page.getByText(/recognised revenue still requires/i)).toBeVisible();
  await expectNoDocumentOverflow(page);
});

test('Brand Cockpit exposes buyer conversion and 30 90 365 continuity', async ({ page }) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#hubBtn').click();
  await page.locator('[data-hub-tab="brand"]').click();
  await expect(page.locator('.brand-funnel article')).toHaveCount(9);
  await expect(page.locator('.continuity-grid article')).toHaveCount(3);
  await expect(page.getByText('D30')).toBeVisible();
  await expect(page.getByText('D90')).toBeVisible();
  await expect(page.getByText('D365')).toBeVisible();
  await expectNoDocumentOverflow(page);
});

test('Economics maps payer product formula and revenue gate without fake KPI', async ({ page }) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#hubBtn').click();
  await page.locator('[data-hub-tab="economics"]').click();
  await expect(page.locator('.economics-row:not(.head)')).toHaveCount(5);
  await expect(page.getByText(/нет фактических ARR\/MRR/i)).toBeVisible();
  await expect(page.getByText(/Demo placeholders are intentionally absent/)).toBeVisible();
  await expectNoDocumentOverflow(page);
});

test('Trust Passport preview is explainable and avoids a universal score', async ({ page }, testInfo) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#hubBtn').click();
  await page.locator('[data-hub-tab="trust"]').click();
  await expect(page.getByText('TRUST PASSPORT · READ-ONLY PREVIEW')).toBeVisible();
  await expect(page.locator('.trust-dimension-grid article')).toHaveCount(6);
  await expect(page.getByText('NO OPAQUE SCORE')).toBeVisible();
  await expect(page.getByText('No wealth, creditworthiness, politics, ethnicity, hidden intent or universal reputation score.')).toBeVisible();
  await expectNoDocumentOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('trust-passport-preview.png') });
});

test('investor value layer separates monetisation hypotheses from revenue truth', async ({ page }, testInfo) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#valueBtn').click();
  await expect(page.locator('.revenue-grid article')).toHaveCount(5);
  await expect(page.getByText('Revenue truth rule')).toBeVisible();
  await expect(page.getByText(/Engagement, meeting or request is not revenue/)).toBeVisible();
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
  await expect(page.getByText('POST-EVENT TRUTH')).toBeVisible();
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
  await expect(page.getByText('PREVIEW · NO COMMERCIAL DATA SAVED')).toBeVisible();
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
  expect(await swResponse.text()).toContain('mfp-shell-2026-10-06-p1');

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
