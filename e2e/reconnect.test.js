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

// ─── WebSocket reconnect ──────────────────────────────────────────────────────

test('page shows ws-connected on initial load', async () => {
  const el = await page.$('.ws-status.ws-connected');
  expect(el).not.toBeNull();
});

test('dropping all connections triggers ws-reconnecting state', async () => {
  // Register the selector watch BEFORE terminating connections so the brief
  // "reconnecting" state (lasts ~1000 ms) is not missed.
  const reconnectingPromise = page.waitForSelector('.ws-status.ws-reconnecting', {
    timeout: 10000,
  });

  backend.closeAllConnections();

  await reconnectingPromise;

  const el = await page.$('.ws-status.ws-reconnecting');
  expect(el).not.toBeNull();
});

test('client reconnects and returns to ws-connected', async () => {
  // The mock backend is still listening on port 7000, so the next
  // reconnect attempt (after ~1000 ms back-off) should succeed.
  await page.waitForSelector('.ws-status.ws-connected', { timeout: 15000 });

  const el = await page.$('.ws-status.ws-connected');
  expect(el).not.toBeNull();
});

test('messages sent after reconnect are delivered', async () => {
  const countBefore = await page.$$eval('.message', (els) => els.length);

  await page.click('.chat_input');
  await page.type('.chat_input', 'Post-reconnect message');
  await page.keyboard.press('Enter');

  await page.waitForFunction(
    (n, text) => {
      const msgs = [...document.querySelectorAll('.message .message_body')];
      return (
        document.querySelectorAll('.message').length > n &&
        msgs.some((el) => el.textContent.includes(text))
      );
    },
    { timeout: 8000 },
    countBefore,
    'Post-reconnect message'
  );

  const bodies = await page.$$eval('.message .message_body', (els) =>
    els.map((el) => el.textContent.trim())
  );
  expect(bodies.some((t) => t.includes('Post-reconnect message'))).toBe(true);
});

test('second disconnect/reconnect cycle also recovers', async () => {
  const reconnectingPromise = page.waitForSelector('.ws-status.ws-reconnecting', {
    timeout: 10000,
  });

  backend.closeAllConnections();

  await reconnectingPromise;
  await page.waitForSelector('.ws-status.ws-connected', { timeout: 15000 });

  const el = await page.$('.ws-status.ws-connected');
  expect(el).not.toBeNull();
});
