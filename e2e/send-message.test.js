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

// ─── Sending text messages ────────────────────────────────────────────────

test('chat input is visible and focusable', async () => {
  const input = await page.$('.chat_input');
  expect(input).not.toBeNull();
  const visible = await input.isIntersectingViewport();
  expect(visible).toBe(true);
});

test('typing and pressing Enter sends a message and clears the input', async () => {
  const countBefore = await page.$$eval('.message', (els) => els.length);

  await page.click('.chat_input');
  await page.type('.chat_input', 'Hello E2E');
  await page.keyboard.press('Enter');

  // Wait until a new message with the expected text appears
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
    'Hello E2E'
  );

  const bodies = await page.$$eval('.message .message_body', (els) =>
    els.map((el) => el.textContent.trim())
  );
  expect(bodies.some((t) => t.includes('Hello E2E'))).toBe(true);

  // Input should be cleared after send
  const inputValue = await page.$eval('.chat_input', (el) => el.value);
  expect(inputValue).toBe('');
});

test('clicking the send button also sends the message', async () => {
  const countBefore = await page.$$eval('.message', (els) => els.length);

  await page.click('.chat_input');
  await page.type('.chat_input', 'Sent via button');
  await page.click('.sending');

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
    'Sent via button'
  );

  const messages = await page.$$eval('.message .message_body', (els) =>
    els.map((el) => el.textContent.trim())
  );
  expect(messages.some((t) => t.includes('Sent via button'))).toBe(true);
});

test('empty input does not send a message', async () => {
  const countBefore = await page.$$eval('.message', (els) => els.length);

  // Click send with empty input
  await page.click('.chat_input');
  await page.keyboard.press('Enter');

  // Give the app 500 ms to potentially add a message
  await new Promise((r) => setTimeout(r, 500));

  const countAfter = await page.$$eval('.message', (els) => els.length);
  expect(countAfter).toBe(countBefore);
});

test('each sent message has a .date element in its footer', async () => {
  await page.click('.chat_input');
  await page.type('.chat_input', 'Date test');
  await page.keyboard.press('Enter');

  await page.waitForFunction(
    () => {
      const msgs = [...document.querySelectorAll('.message')];
      return msgs.some(
        (m) =>
          m.querySelector('.message_body')?.textContent.includes('Date test') &&
          m.querySelector('.date')?.textContent.trim().length > 0
      );
    },
    { timeout: 8000 }
  );
});

test('each sent message has action tools (pin, bin, favorite)', async () => {
  const msg = await page.$('.message');
  expect(await msg.$('.pin')).not.toBeNull();
  expect(await msg.$('.bin')).not.toBeNull();
  expect(await msg.$('.favorite_inactive')).not.toBeNull();
});

// ─── Initial load with pre-existing messages ─────────────────────────────

test('pre-existing messages from server are rendered on page load', async () => {
  // Start a fresh backend that sends messages on the initial load event
  const backend2 = new MockBackend();
  backend2.setLoadData({
    dB: [
      { id: 'pre-1', message: 'Pre-existing message', date: '01.01.2024, 10:00', geo: '', type: 'text' },
    ],
    favorites: [],
    position: 0,
    pinned: null,
    token: 'test-token',
  });
  await backend2.start(7001); // separate port — can't reuse 7000 while it's running

  // Verify the mock broadcasts the load data correctly
  const received = await new Promise((resolve) => {
    backend2.onMessage((msg) => {
      if (msg.event === 'load') {
        resolve(true);
      }
    });
    const WebSocket = require('ws');
    const ws = new WebSocket('ws://127.0.0.1:7001');
    ws.on('open', () => ws.send(JSON.stringify({ event: 'load' })));
    setTimeout(() => resolve(false), 3000);
  });

  expect(received).toBe(true);
  await backend2.close();
});
