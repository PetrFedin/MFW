const { test, expect }=require('@playwright/test');
test('root resolves to a single platform shell and loads MFW',async({page})=>{
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await expect(page).toHaveURL(/\/platform\/index\.html/);
  await expect(page.locator('#eventFrame')).toHaveAttribute('src','../mfw/index.html');
  await expect(page.frameLocator('#eventFrame').locator('#app')).toBeVisible();
  expect(await page.locator('iframe').count()).toBe(1);
});
test('rapid MFW BFS Made navigation retains final selected route',async({page})=>{
  await page.goto('/platform/index.html',{waitUntil:'domcontentloaded'});
  for(const code of ['bfs','made','mfw','made','bfs','mfw']){
    await page.locator('[data-event="'+code+'"]').click();
  }
  await expect(page.locator('[data-event="mfw"]')).toHaveClass(/active/);
  await expect(page.locator('#eventFrame')).toHaveAttribute('src','../mfw/index.html');
  await expect(page.frameLocator('#eventFrame').locator('#app')).toBeVisible();
});
test('Made brand deep link opens exact MFW brand after child ready',async({page})=>{
  await page.goto('/platform/index.html?event=made',{waitUntil:'domcontentloaded'});
  const made=page.frameLocator('#eventFrame');
  await expect(made.locator('[data-made-open-mfw="masterpeace"]')).toBeVisible();
  await made.locator('[data-made-open-mfw="masterpeace"]').click();
  await expect(page.locator('[data-event="mfw"]')).toHaveClass(/active/);
  await expect(page.frameLocator('#eventFrame').locator('#modal h1').getByText('Masterpeace',{exact:true})).toBeVisible();
});
