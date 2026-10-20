// The phone layout of the sheets: what the atlas, a story and the daily quiz
// look like, and whether each can be closed or resized by hand.
//   node tools/phone-sheets.mjs <base> [prefix]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:5173';
const prefix = process.argv[3] ?? 'before';
fs.mkdirSync('.shots/phone', { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const info = () => page.evaluate(() => {
  const box = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return r.height && r.top < innerHeight ? { top: Math.round(r.top), h: Math.round(r.height) } : null;
  };
  const close = [...document.querySelectorAll('#sheet .close, #sheet [data-act=close], #panel .close, #hero .close')].filter((e) => e.offsetParent).length;
  return { hash: location.hash, hero: box('#hero'), sheet: document.querySelector('#sheet.on') && box('#sheet'), panel: document.querySelector('#panel.on') && box('#panel'), layers: box('#layers'), close };
});
await page.goto(`${base}/?lang=zh-Hans#/stories`, { waitUntil: 'networkidle0', timeout: 120000 });
await sleep(2500);
await page.screenshot({ path: `.shots/phone/${prefix}_1_stories.png` });
console.log('stories', JSON.stringify(await info()));
await page.tap('.nav a[data-nav=globe]');
await sleep(2500);
await page.screenshot({ path: `.shots/phone/${prefix}_2_atlas.png` });
console.log('atlas', JSON.stringify(await info()));
await page.goto(`${base}/?lang=zh-Hans#/story/tea/1`, { waitUntil: 'networkidle0', timeout: 120000 });
await sleep(3500);
await page.screenshot({ path: `.shots/phone/${prefix}_3_story.png` });
console.log('story', JSON.stringify(await info()));
await page.goto(`${base}/?lang=zh-Hans#/daily`, { waitUntil: 'networkidle0', timeout: 120000 });
await sleep(3500);
await page.screenshot({ path: `.shots/phone/${prefix}_4_daily.png` });
console.log('daily', JSON.stringify(await info()));
console.log({ errors });
await browser.close();
