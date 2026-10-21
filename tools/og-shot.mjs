// The social preview images (1200×630): the atlas at night, the mark and name
// large, the headline and the four counts. og.jpg in English for the app and
// the English pages, og-zh.jpg for the Chinese pages.
//   node tools/og-shot.mjs   (dev server on :5173; writes public/og*.png, convert with sips)
import puppeteer from 'puppeteer-core';
import { quiet } from './quiet.mjs';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
quiet(browser);
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 2 });
for (const [lang, out] of [['en', 'og'], ['zh-Hans', 'og-zh']]) {
  await page.goto(`http://localhost:5173/?lang=${lang}&theme=nocturne#/`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 3500));
  await page.evaluate(() => {
    const css = document.createElement('style');
    css.textContent = `
      .topbar, #coords, #layers, #random, #nearme, #hero .actions, #hero .hero-link, #hero p { display: none !important; }
      #hero { top: 0 !important; padding: 0 !important; }
      .og-lock { display: flex; align-items: center; gap: 16px; margin-bottom: 34px; }
      .og-lock .mark { width: 74px; height: 74px; }
      .og-lock b { font-family: var(--serif); font-weight: 650; font-size: 56px; letter-spacing: -0.025em; color: var(--ink); }
      #hero .stats { margin-top: 30px; }`;
    document.head.appendChild(css);
    const lock = document.createElement('div');
    lock.className = 'og-lock';
    lock.innerHTML = `${document.querySelector('.topbar .mark').outerHTML}<b>Terraverba</b>`;
    document.querySelector('#hero').prepend(lock);
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: `public/${out}.png` });
}
await browser.close();
