// The general feedback dialog: opened from the About page and from the
// language menu, in two interface languages, desktop and phone; it must show
// the suggestion form (no language fields) and refuse to send without the
// human check. Nothing is actually sent.
//   node tools/feedback-test.mjs <base>
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:5173';
fs.mkdirSync('.shots/feedback', { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
let posted = 0;
await page.setRequestInterception(true);
page.on('request', (r) => {
  if (r.url().endsWith('/api/report')) {
    posted++;
    return r.respond({ status: 403, contentType: 'application/json', body: '{"error":"not verified"}' });
  }
  r.continue();
});
const out = [];
for (const [vname, vp] of [['desk', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]]) {
  await page.setViewport(vp);
  for (const lang of ['zh-Hans', 'en']) {
    await page.goto(`${base}/?lang=${lang}#/about`, { waitUntil: 'networkidle0', timeout: 120000 });
    await new Promise((r) => setTimeout(r, 1200));
    const about = await page.evaluate(() => {
      const b = document.querySelector('#sheet [data-act=feedback]');
      b?.click();
      return { button: b?.textContent, mail: !!document.querySelector('#sheet a[href^="mailto:contact@terraverba.org"]') };
    });
    await new Promise((r) => setTimeout(r, 600));
    const dialog = await page.evaluate(() => ({
      open: document.querySelector('#report')?.classList.contains('on'),
      title: document.querySelector('#report h2')?.textContent,
      fields: [...document.querySelectorAll('#report [name]')].map((e) => e.name).filter((n) => n !== 'cf-turnstile-response'),
    }));
    await page.screenshot({ path: `.shots/feedback/${vname}_${lang}.png` });
    // try to send without the human check
    await page.type('#report textarea[name=note]', 'test');
    await page.evaluate(() => document.querySelector('#report button[type=submit]').click());
    await new Promise((r) => setTimeout(r, 800));
    const status = await page.evaluate(() => document.querySelector('#report .report-status')?.textContent);
    await page.keyboard.press('Escape');
    // the same dialog from the language menu
    await page.evaluate(() => document.querySelector('.locale').click());
    await new Promise((r) => setTimeout(r, 300));
    const menu = await page.evaluate(() => {
      const b = document.querySelector('.locale-menu .menu-feedback');
      b?.click();
      return b?.textContent;
    });
    await new Promise((r) => setTimeout(r, 500));
    const fromMenu = await page.evaluate(() => document.querySelector('#report')?.classList.contains('on') && document.querySelector('#report h2')?.textContent);
    await page.keyboard.press('Escape');
    out.push({ vname, lang, about, dialog, status, menu, fromMenu });
  }
}
console.log(JSON.stringify({ out, posted, errors }, null, 1));
await browser.close();
