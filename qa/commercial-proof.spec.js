const { test, expect } = require('@playwright/test');

async function openEconomics(page){
  await page.goto('/platform/index.html',{waitUntil:'domcontentloaded'});
  await page.locator('#hubBtn').click();
  await page.locator('[data-hub-tab="economics"]').click();
  await expect(page.locator('[data-commercial-schema="mfw-commercial-proof-ladder-v1"]')).toBeVisible();
}
async function noOverflow(page){
  const dimensions=await page.evaluate(()=>({
    width:document.documentElement.clientWidth,
    scroll:document.documentElement.scrollWidth
  }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width+2);
}

test('Investor proof ladder is eight-stage read-only and cannot claim real revenue',async({page},testInfo)=>{
  await openEconomics(page);
  await expect(page.locator('[data-commercial-stage]')).toHaveCount(8);
  await expect(page.locator('.commercial-evidence-state')).toHaveCount(8);
  await expect(page.locator('.commercial-evidence-state').first()).toHaveText('НЕ ПОДТВЕРЖДЕНО');
  await expect(page.getByText('PRODUCTION REVENUE · НЕ ПОДТВЕРЖДЕНО')).toBeVisible();
  await expect(page.locator('[data-commercial-kpi="monthlyPotential"]')).toContainText('0');
  await expect(page.getByText(/не ARR, MRR и не признанная выручка/)).toBeVisible();
  await noOverflow(page);
  const internal=await page.locator('.commercial-proof').evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth}));
  expect(internal.scroll).toBeLessThanOrEqual(internal.client+2);
  await page.locator('.commercial-proof').screenshot({path:testInfo.outputPath('commercial-proof-ladder.png')});
});

test('Investor can explore modelled economics; invalid values fail closed and reset works',async({page})=>{
  await openEconomics(page);
  const cases={
    paidBrands:'10',brandMonthlyFee:'1000',brandServiceCost:'200',
    partnerPackages:'2',packageMonthlyFee:'2500',packageServiceCost:'500',
    fixedMonthlyCost:'5000',horizonMonths:'12'
  };
  for(const [field,value] of Object.entries(cases)){
    await page.locator('[data-commercial-field="'+field+'"]').fill(value);
  }
  await expect(page.locator('[data-commercial-kpi="monthlyPotential"]')).toContainText(/15.000/);
  await expect(page.locator('[data-commercial-kpi="monthlyContribution"]')).toContainText(/12.000/);
  await expect(page.locator('[data-commercial-kpi="monthlyResult"]')).toContainText(/7.000/);
  await expect(page.locator('[data-commercial-kpi="breakEvenBrands"]')).toHaveText('2');
  await expect(page.locator('[data-commercial-kpi="horizonPotential"]')).toContainText(/180.000/);
  await expect(page.locator('#commercialSensitivity')).toBeVisible();
  await expect(page.locator('[data-sensitivity-case]')).toHaveCount(4);
  await expect(page.locator('[data-sensitivity-case="base"]')).toContainText(/7.000/);
  await expect(page.locator('[data-sensitivity-case="tariffs_down"]')).toContainText(/5.500/);
  await expect(page.locator('[data-sensitivity-case="costs_up"]')).toContainText(/6.200/);
  await expect(page.locator('[data-sensitivity-case="combined"]')).toContainText(/4.700/);
  await expect(page.locator('#commercialSensitivity')).toContainText('без вероятностей');
  await page.locator('[data-commercial-field="paidBrands"]').fill('-1');
  await expect(page.locator('.commercial-validation')).toContainText('Некорректные допущения');
  await expect(page.locator('[data-commercial-kpi]')).toHaveCount(0);
  await page.locator('[data-commercial-reset]').click();
  await expect(page.locator('[data-commercial-field="paidBrands"]')).toHaveValue('0');
  await expect(page.locator('[data-commercial-kpi="monthlyPotential"]')).toContainText('0');
  await page.locator('[data-commercial-open="brand"]').click();
  await expect(page.locator('[data-hub-tab="brand"]')).toHaveClass(/active/);
  await noOverflow(page);
});
