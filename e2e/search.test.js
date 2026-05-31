const MockBackend = require('./helpers/mockBackend');
const { launchBrowser, openPage } = require('./helpers/browser');

const BACKEND_PORT = 7000;

let browser;
let page;
let backend;

beforeAll(async () => {
  backend = new MockBackend();
  await backend.start(BACKEND_PORT);

  browser = await launchBrowser();
  page = await openPage(browser);
});

afterAll(async () => {
  await browser?.close();
  await backend?.close();
});

// ─── AI search panel ─────────────────────────────────────────────────────────

test('AI toggle button is present', async () => {
  const btn = await page.$('.ai-toggle');
  expect(btn).not.toBeNull();
});

test('clicking AI toggle opens the left aside panel', async () => {
  await page.click('.ai-toggle');

  await page.waitForSelector('.left-aside.left-aside-active', { timeout: 5000 });

  const panel = await page.$('.left-aside.left-aside-active');
  expect(panel).not.toBeNull();
});

test('AI input and send button are visible in the panel', async () => {
  const input = await page.$('.ai_input');
  const btn = await page.$('.ai_send_btn');
  expect(input).not.toBeNull();
  expect(btn).not.toBeNull();
});

test('typing a query and clicking send shows results', async () => {
  // Ensure panel is open (may already be from previous test)
  const panelOpen = await page.$('.left-aside.left-aside-active');
  if (!panelOpen) {
    await page.click('.ai-toggle');
    await page.waitForSelector('.left-aside.left-aside-active', { timeout: 5000 });
  }

  await page.waitForSelector('.ai_input', { visible: true, timeout: 5000 });
  await page.click('.ai_input');
  await page.type('.ai_input', 'test query');

  // Use JS click to bypass any scroll / coverage issues the panel may cause
  await page.evaluate(() => document.querySelector('.ai_send_btn')?.click());

  // Wait for results, empty state, or error
  await page.waitForFunction(
    () =>
      document.querySelector('.ai-result-item') !== null ||
      document.querySelector('.ai-result-empty') !== null ||
      document.querySelector('.ai-error') !== null,
    { timeout: 10000 }
  );

  // Should have result items (not empty or error)
  const items = await page.$$('.ai-result-item');
  expect(items.length).toBeGreaterThan(0);
});

test('result item contains the expected text from mock backend', async () => {
  const text = await page.$eval('.ai-result-item', (el) => el.textContent);
  expect(text).toContain('Test search result');
});

test('pressing Enter in AI input also triggers search', async () => {
  // Clear and retype
  await page.click('.ai_input', { clickCount: 3 });
  await page.type('.ai_input', 'enter query');
  await page.keyboard.press('Enter');

  await page.waitForFunction(
    () =>
      document.querySelector('.ai-result-item') !== null ||
      document.querySelector('.ai-result-empty') !== null ||
      document.querySelector('.ai-error') !== null,
    { timeout: 10000 }
  );

  const items = await page.$$('.ai-result-item');
  expect(items.length).toBeGreaterThan(0);
});

test('clicking AI toggle again closes the panel', async () => {
  await page.click('.ai-toggle');

  await page.waitForFunction(
    () => !document.querySelector('.left-aside.left-aside-active'),
    { timeout: 5000 }
  );

  const panel = await page.$('.left-aside.left-aside-active');
  expect(panel).toBeNull();
});
