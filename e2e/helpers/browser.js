const puppeteer = require('puppeteer');

const FRONTEND_URL = 'http://localhost:3001';
const WS_CONNECTED_SELECTOR = '.ws-status.ws-connected';
const WS_RECONNECTING_SELECTOR = '.ws-status.ws-reconnecting';

/** Launch a headless Chromium browser. */
async function launchBrowser() {
  return puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  });
}

/**
 * Open a new page, navigate to the frontend and wait until the WebSocket
 * connection has been established (indicated by .ws-status.ws-connected).
 */
async function openPage(browser, opts = {}) {
  const page = await browser.newPage();

  if (opts.beforeNavigate) {
    await opts.beforeNavigate(page);
  }

  await page.goto(FRONTEND_URL, { waitUntil: 'domcontentloaded' });

  // Wait for the WS 'connected' indicator — set by Chat.js _setWsStatus()
  await page.waitForSelector(WS_CONNECTED_SELECTOR, { timeout: 10000 });

  return page;
}

/**
 * Wait for the next WS message of a given event type to arrive on the page.
 * Injects a one-shot listener via page.evaluate so no real WS spying is needed.
 */
function waitForMessage(page, selector, timeout = 8000) {
  return page.waitForSelector(selector, { timeout });
}

module.exports = {
  launchBrowser,
  openPage,
  waitForMessage,
  FRONTEND_URL,
  WS_CONNECTED_SELECTOR,
  WS_RECONNECTING_SELECTOR,
};
