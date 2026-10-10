const { test, expect } = require('@playwright/test');

// Production smoke coverage supplements (not replaces) the exhaustive local responsive suite.
// Run only against the deployed static site. Never write real registrations or payments.
test('live shell: all three event routes, account and discovery', async ({ page }) => {
  const exceptions = [];
  page.on('pageerror', e => exceptions.push(String(e.message)));
  const response = await page.goto('/platform/index.html', { waitUntil:'domcontentloaded', timeout:60000 });
  expect(response.status()).toBe(200);
  await expect(page.locator('#eventFrame')).toBeVisible();
  await expect(page.locator('[data-event="mfw"]')).toBeVisible();
  for (const [code,path] of [
    ['mfw','../mfw/index.html'],
    ['bfs','./bfs/index.html'],
    ['made','./made-in-moscow/index.html']
  ]) {
    await page.locator('[data-event="'+code+'"]').click();
    await expect(page.locator('#eventFrame')).toHaveAttribute('src',path);
    const frame = page.frameLocator('#eventFrame');
    await expect(frame.locator('body')).toBeVisible();
    const state=await frame.locator('body').evaluate(el=>({
      text:el.innerText.trim(),width:document.documentElement.scrollWidth,viewport:window.innerWidth
    }));
    expect(state.text.length,code+' has empty content').toBeGreaterThan(80);
    expect(state.width,code+' has horizontal overflow').toBeLessThanOrEqual(state.viewport+2);
  }
  await page.locator('#accountBtn').click();
  await expect(page.locator('#accountDrawer')).not.toHaveClass(/hidden/);
  await page.locator('#accountClose').click();
  await expect(page.locator('#accountDrawer')).toHaveClass(/hidden/);
  await page.locator('#hubBtn').click();
  await expect(page.locator('#hubModal')).not.toHaveClass(/hidden/);
  await page.locator('#hubClose').click();
  await expect(page.locator('#hubModal')).toHaveClass(/hidden/);
  expect(exceptions,'uncaught JavaScript exceptions').toEqual([]);
});
