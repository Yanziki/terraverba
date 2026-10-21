// Test browsers do not count as visitors: every page they open blocks the
// Cloudflare Web Analytics beacon (by URL, through the DevTools protocol, so it
// holds whatever proxy or DNS the machine uses). tools/live-check.mjs, which
// checks the beacon itself, does not use this.
//   import { quiet } from './quiet.mjs'; quiet(browser);
const BLOCK = ['*cloudflareinsights.com*'];

async function block(page) {
  const cdp = await page.createCDPSession();
  await cdp.send('Network.enable');
  await cdp.send('Network.setBlockedURLs', { urls: BLOCK });
}

export function quiet(browser) {
  const newPage = browser.newPage.bind(browser);
  browser.newPage = async (...args) => {
    const page = await newPage(...args);
    await block(page);
    return page;
  };
  const newContext = browser.createBrowserContext.bind(browser);
  browser.createBrowserContext = async (...args) => {
    const ctx = await newContext(...args);
    const ctxNewPage = ctx.newPage.bind(ctx);
    ctx.newPage = async (...a) => {
      const page = await ctxNewPage(...a);
      await block(page);
      return page;
    };
    return ctx;
  };
  return browser;
}
