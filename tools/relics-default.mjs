// The home view with the relics of writing layer on, desktop and phone,
// in both themes, to judge whether it should be on from the start.
//   node tools/relics-default.mjs <base>
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:5173';
fs.mkdirSync('.shots/relics', { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
const bytes = { img: 0, n: 0 };
page.on('response', async (r) => {
  if (r.url().includes('/img/relics/')) {
    bytes.n++;
    bytes.img += (await r.buffer().catch(() => Buffer.alloc(0))).length;
  }
});
for (const [name, vp] of [['desk', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]]) {
  await page.setViewport(vp);
  for (const theme of ['nocturne', 'atelier']) {
    await page.evaluateOnNewDocument((t) => {
      localStorage.setItem('glossa-theme', t);
      sessionStorage.setItem('glossa-view', JSON.stringify({ mode: '3d', layers: { relics: true } }));
    }, theme);
    await page.goto(`${base}/?lang=zh-Hans#/`, { waitUntil: 'networkidle0', timeout: 120000 });
    await new Promise((r) => setTimeout(r, 3500));
    await page.screenshot({ path: `.shots/relics/${name}_${theme}_home.png` });
    // after "start exploring"
    await page.evaluate(() => document.querySelector('#hero [data-act=start]')?.click());
    await new Promise((r) => setTimeout(r, 3000));
    await page.screenshot({ path: `.shots/relics/${name}_${theme}_explore.png` });
  }
}
console.log('relic images loaded', bytes);
await browser.close();
