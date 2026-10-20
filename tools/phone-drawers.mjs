// Phones: drag the drawers by hand. The welcome text goes away with a swipe or
// the Atlas tab; a story's sheet goes down to a strip, back to half, up to the
// whole screen, and closes; the language panel does the same and closes.
//   node tools/phone-drawers.mjs <base>
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:5173';
fs.mkdirSync('.shots/phone', { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const swipe = async (x, y0, y1) => {
  await page.touchscreen.touchStart(x, y0);
  for (let i = 1; i <= 10; i++) {
    await page.touchscreen.touchMove(x, y0 + ((y1 - y0) * i) / 10);
    await sleep(16);
  }
  await page.touchscreen.touchEnd();
  await sleep(900);
};
const state = (sel) => page.evaluate((sel) => {
  const el = document.querySelector(sel);
  const r = el.getBoundingClientRect();
  return { on: el.classList.contains('on'), snap: el.dataset.snap, top: Math.round(r.top), h: Math.round(r.height), hash: location.hash };
}, sel);
const out = {};

// the welcome text: a swipe down puts it away
await page.goto(`${base}/?lang=zh-Hans#/`, { waitUntil: 'networkidle0', timeout: 120000 });
await sleep(2500);
await swipe(195, 600, 720);
out.heroSwiped = await page.evaluate(() => document.querySelector('#hero').classList.contains('off'));
// … and so does the Atlas tab
await page.goto(`${base}/?lang=en#/`, { waitUntil: 'networkidle0', timeout: 120000 });
await page.evaluate(() => location.reload());
await page.waitForNetworkIdle();
await sleep(2500);
await page.tap('.nav a[data-nav=globe]');
await sleep(1200);
out.heroAtlasTab = await page.evaluate(() => document.querySelector('#hero').classList.contains('off'));

// a story's sheet
await page.goto(`${base}/?lang=zh-Hans#/story/tea/1`, { waitUntil: 'networkidle0', timeout: 120000 });
await sleep(3000);
out.sheetOpen = await state('#sheet');
let s = out.sheetOpen;
await swipe(195, s.top + 12, s.top + 400);
out.sheetDown = await state('#sheet');
await page.screenshot({ path: '.shots/phone/after_story_strip.png' });
s = out.sheetDown;
await page.touchscreen.tap(120, s.top + 12);
await sleep(900);
out.sheetTapped = await state('#sheet');
s = out.sheetTapped;
await swipe(195, s.top + 12, 80);
out.sheetUp = await state('#sheet');
await page.screenshot({ path: '.shots/phone/after_story_full.png' });
await page.tap('#sheet .grip-close');
await sleep(1200);
out.sheetClosed = await state('#sheet');

// the daily quiz, pulled down to look at the map
await page.goto(`${base}/?lang=zh-Hans#/daily`, { waitUntil: 'networkidle0', timeout: 120000 });
await sleep(3000);
s = await state('#sheet');
await swipe(195, s.top + 40, s.top + 420);
out.dailyDown = await state('#sheet');
await page.screenshot({ path: '.shots/phone/after_daily_strip.png' });

// the language panel
await page.goto(`${base}/?lang=zh-Hans#/?sel=nucl1643`, { waitUntil: 'networkidle0', timeout: 120000 });
await sleep(3000);
s = await state('#panel');
await swipe(195, s.top + 12, s.top + 380);
out.panelDown = await state('#panel');
await page.screenshot({ path: '.shots/phone/after_panel_strip.png' });
await page.tap('#panel .close');
await sleep(1000);
out.panelClosed = await state('#panel');
console.log(JSON.stringify(out, null, 1), errors);
await browser.close();
