const { test, expect } = require('@playwright/test');

// Only the Made roster is mocked. No live Verified membership is created.
test.beforeEach(async ({ page }) => {
  await page.route('https://mfw-authority.onrender.com/v1/made-in-moscow/brands', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [{ id: 'masterpeace', name: 'Masterpeace', city: 'Москва' }],
        source: 'qa-fixture'
      })
    });
  });
  await page.route('https://mfw-authority.onrender.com/v1/made-in-moscow/overview', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { verifiedBrands: 1, productionAdmitted: false } })
    });
  });
});

test('root resolves to one platform shell and visible MFW opening', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/platform\/index\.html/);
  await expect(page.locator('#eventFrame')).toHaveAttribute('src', '../mfw/index.html');
  // A fixed-position opening does not confer a visible box on its #app wrapper.
  await expect(page.frameLocator('#eventFrame').locator('[data-action="enter-experience"]')).toBeVisible();
  expect(await page.locator('iframe').count()).toBe(1);
});

test('rapid switches retain final MFW route with visible UI', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mfwOpeningSeen', '1');
    localStorage.setItem('mfwOnboarded', '1');
  });
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  for (const code of ['bfs', 'made', 'mfw', 'made', 'bfs', 'mfw']) {
    await page.locator('[data-event="' + code + '"]').click();
  }
  await expect(page.locator('[data-event="mfw"]')).toHaveClass(/active/);
  await expect(page.locator('#eventFrame')).toHaveAttribute('src', '../mfw/index.html');
  await expect(page.frameLocator('#eventFrame').locator('.bottom-nav')).toBeVisible();
  expect(await page.locator('iframe').count()).toBe(1);
});

test('Made brand deep link resolves exact MFW brand on first visit', async ({ page }) => {
  await page.route('https://mfw-authority.onrender.com/v1/made-in-moscow/brands',async route=>{
    await route.fulfill({status:200,contentType:'application/json',
      body:JSON.stringify({data:[{id:'masterpeace',name:'Masterpeace',city:'Москва'}],
        source:'postgres',badge:'made_in_moscow_verified'})});
  });
  await page.route('https://mfw-authority.onrender.com/v1/made-in-moscow/overview',async route=>{
    await route.fulfill({status:200,contentType:'application/json',
      body:JSON.stringify({data:{verifiedBrands:1,productionAdmitted:true,persistence:'postgres'}})});
  });
  await page.goto('/platform/index.html?event=made', { waitUntil: 'domcontentloaded' });
  const made = page.frameLocator('#eventFrame');
  await expect(made.locator('[data-made-open-mfw="masterpeace"]')).toBeVisible();
  await made.locator('[data-made-open-mfw="masterpeace"]').click();
  await expect(page.locator('[data-event="mfw"]')).toHaveClass(/active/);
  await expect(page.locator('#eventFrame')).toHaveAttribute('src', '../mfw/index.html');
  await expect(page.frameLocator('#eventFrame').locator('#modal h1').getByText('Masterpeace', { exact: true })).toBeVisible();
});

test('top-level forged navigation message is ignored', async ({ page }) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-event="mfw"]')).toHaveClass(/active/);
  await page.evaluate(() => window.postMessage({ type: 'mfp-open-event', eventCode: 'bfs' }, location.origin));
  await expect(page.locator('[data-event="mfw"]')).toHaveClass(/active/);
});
