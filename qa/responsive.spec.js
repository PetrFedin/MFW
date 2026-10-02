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
  await expect(frame.getByText('МОСКОВСКИЕ', { exact: false }).first()).toBeVisible();
  await expect(frame.getByText('Made in Moscow', { exact: false }).first()).toBeVisible();
  const overflow = await frame.locator('body').evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(2);
  await frame.locator('[data-section="verified"]').first().click();
  await expect(frame.getByText('Made in Moscow', { exact: false }).first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('made-in-moscow.png') });
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
