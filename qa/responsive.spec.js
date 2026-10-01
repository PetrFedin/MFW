const { test, expect } = require('@playwright/test');

async function mockAuthorities(page) {
  const handler = async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data = [];
    if (path === '/v1/auth/demo') data = { accessToken: 'qa-token', user: { id: 'qa-user', role: 'Organizer' } };
    else if (path.includes('/profile')) data = { id: 'qa-user', firstName: 'QA', lastName: 'Agent', email: 'qa@example.test' };
    else if (path.includes('/agenda')) data = { items: [], conflicts: [] };
    else if (path.includes('/owner/')) data = {};
    else if (path.includes('/wallet')) data = [];
    else if (path.includes('/recommend')) data = [];
    else if (path.includes('/platform-registrations')) data = [];
    else if (path.includes('/b2b/leads')) data = [];
    else if (path.includes('/v1/admin')) data = {};
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data }) });
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
  await expectTarget(page.locator('#accountBtn'), 40);
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
  await expectNoDocumentOverflow(page);
  await expectTarget(page.locator('.sidebar .nav button').first(), 40);
  await page.screenshot({ path: testInfo.outputPath('admin-console.png') });
});
