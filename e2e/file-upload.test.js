const path = require('path');
const fs = require('fs');
const os = require('os');
const MockBackend = require('./helpers/mockBackend');
const { launchBrowser, openPage } = require('./helpers/browser');

const BACKEND_PORT = 7000;

let browser;
let page;
let backend;
let tmpFile;

beforeAll(async () => {
  backend = new MockBackend();
  await backend.start(BACKEND_PORT);

  browser = await launchBrowser();
  page = await openPage(browser);

  // Create a small temporary text file to upload
  tmpFile = path.join(os.tmpdir(), 'e2e-test-upload.txt');
  fs.writeFileSync(tmpFile, 'E2E upload test content');
});

afterAll(async () => {
  await browser?.close();
  await backend?.close();
  if (tmpFile && fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
});

// ─── File upload ─────────────────────────────────────────────────────────────

test('clip button is present in the chat footer', async () => {
  const clip = await page.$('.clip');
  expect(clip).not.toBeNull();
});

test('uploading a file via clip adds a file message to the chat', async () => {
  const countBefore = await page.$$eval('.message', (els) => els.length);

  // Open the clip attachment menu
  await page.click('.clip');
  await page.waitForSelector('.clip_body.clip_active', { timeout: 3000 });

  // Click the file option — FileLoader replaces .chat_input with <input.input_file>
  await page.click('.clip_file');

  // Wait for the file input to appear in the DOM
  const fileInput = await page.waitForSelector('input.input_file', { timeout: 5000 });

  // Upload the file directly — this fires the change event on the input
  await fileInput.uploadFile(tmpFile);

  // FileLoader resolves its promise → Chat.send(file) → XHR to /upload
  // → mock broadcasts showFile WS event → message appended to DOM
  await page.waitForFunction(
    (n) => document.querySelectorAll('.message').length > n,
    { timeout: 10000 },
    countBefore
  );

  const messages = await page.$$eval('.message', (els) => els.length);
  expect(messages).toBeGreaterThan(countBefore);
});

test('uploaded file message contains a file link or name', async () => {
  // The mock backend echoes 'test-file.txt' as the message name
  const bodies = await page.$$eval('.message .message_body', (els) =>
    els.map((el) => el.textContent.trim())
  );
  const lastBody = bodies[bodies.length - 1];
  expect(lastBody).toMatch(/test-file\.txt/i);
});

test('uploaded file message has the standard action tools', async () => {
  const messages = await page.$$('.message');
  const last = messages[messages.length - 1];
  expect(await last.$('.pin')).not.toBeNull();
  expect(await last.$('.bin')).not.toBeNull();
});
