const { defineConfig } = require('@playwright/test');

const matrix = [
  { name: 'phone-360x800', viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true },
  { name: 'iphone-375x667', viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true },
  { name: 'iphone-393x852', viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true },
  { name: 'iphone-large-430x932', viewport: { width: 430, height: 932 }, isMobile: true, hasTouch: true },
  { name: 'tablet-744x1133', viewport: { width: 744, height: 1133 }, isMobile: true, hasTouch: true },
  { name: 'tablet-1024x1366', viewport: { width: 1024, height: 1366 }, isMobile: true, hasTouch: true },
  { name: 'desktop-1440x900', viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false }
];

module.exports = defineConfig({
  testDir: '.',
  testMatch: ['responsive.spec.js','navigation-readiness.spec.js'],
  fullyParallel: true,
  retries: 1,
  timeout: 30000,
  expect: { timeout: 7000 },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  projects: matrix.map((p) => ({ name: p.name, use: { viewport: p.viewport, isMobile: p.isMobile, hasTouch: p.hasTouch } }))
});
