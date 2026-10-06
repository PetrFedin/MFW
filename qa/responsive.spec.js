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
  await expect(page.locator('#investorPilotStep')).toHaveText('01 / 14');

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
  await expect(page.locator('[data-hub-tab="committee"]')).toHaveClass(/active/);
  await page.locator('#investorPilotNext').click();
  await expect(page.locator('#valueModal')).not.toHaveClass(/hidden/);
  await expect(page.locator('#investorPilotStep')).toHaveText('14 / 14');
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
  await expect(page.getByText('СКВОЗНОЙ ГРАФ ИДЕНТИЧНОСТИ', { exact: false })).toBeVisible();
  await expect(page.locator('.identity-node')).toHaveCount(5);
  await expect(page.getByText('ОБЩИЙ USER ID')).toBeVisible();
  await expect(page.getByText(/статус бренда Verified остаётся отдельной authority/i)).toBeVisible();
  await expect(page.getByText(/не объединяет event credentials/i)).toBeVisible();
  await expectNoDocumentOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('cross-event-identity-graph.png') });
});

test('Evidence Control Tower distinguishes live dossier from synthetic dossier and portfolio', async ({ page }, testInfo) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#hubBtn').click();
  await page.locator('[data-hub-tab="proof"]').click();
  await expect(page.locator('.control-tower-top .drawer-kicker')).toContainText('EVIDENCE CONTROL TOWER');
  await expect(page.getByText('LIVE-ДАННЫЕ · ТЕКУЩИЙ АККАУНТ')).toBeVisible();
  await expect(page.locator('.dossier-timeline article')).toHaveCount(9);
  await expect(page.getByText('NOT EVIDENCED').first()).toBeVisible();

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
  await expect(page.locator('[data-portfolio-stage="RETENTION"] > b')).toHaveText('2');

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
  await expect(page.getByText('100', { exact: true })).toBeVisible();
  await expect(page.getByText(/условных points · не ₽/)).toBeVisible();
  await expect(page.locator('.allocation-evidence')).toHaveCount(3);
  await expect(page.locator('.allocation-governance > div')).toHaveCount(4);

  const points = await page.locator('.allocation-rank b').allTextContents();
  const sum = points.reduce((s, x) => s + Number((x.match(/\d+/) || ['0'])[0]), 0);
  expect(sum).toBe(100);

  await expect(page.getByText(/Priority score/)).toBeVisible();
  await expect(page.getByText(/Leverage\/effort — явные model assumptions/)).toBeVisible();
  await expect(page.getByText(/Реальный бюджет требует стоимости интервенций/)).toBeVisible();
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

  await expect(page.getByText(/ИНВЕСТИЦИОННЫЙ КОМИТЕТ · DEMO/)).toBeVisible();
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
  await expect(page.locator('.committee-case-grid article').filter({ hasText: 'DECISION' }).locator('b')).toHaveText(/SCALE|ITERATE|STOP/);
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
  await expect(page.getByText(/modelled budget points/)).toBeVisible();
  await expectNoDocumentOverflow(page);
});

test('Control Tower Russian labels remain the default surface language', async ({ page }) => {
  await page.goto('/platform/index.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await page.locator('#hubBtn').click();
  await page.locator('[data-hub-tab="proof"]').click();
  await expect(page.getByText('ЦЕНТР ДОКАЗАТЕЛЬСТВ · EVIDENCE CONTROL TOWER')).toBeVisible();
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
