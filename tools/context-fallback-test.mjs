// The browser drops the globe's WebGL context and never gives it back (as
// Chrome on some Android phones does): the page must reload once in the low
// tier and draw the globe; if that is lost too, it must say so.
//   node tools/context-fallback-test.mjs <base>
import puppeteer from 'puppeteer-core';
import { quiet } from './quiet.mjs';
import fs from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:5173';
fs.mkdirSync('.shots/fallback', { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
quiet(browser);
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const state = () => page.evaluate(() => {
  const g = window.__glossa?.globe;
  return g && { ratio: g.renderer.getPixelRatio(), aa: g.renderer.getContextAttributes()?.antialias, tex: g.texSize, visible: g.renderer.domElement.style.visibility !== 'hidden', merged: !!g.syncDots, msg: !!document.getElementById('gfx-fail'), stored: sessionStorage.getItem('glossa-gfx') };
});
const lose = () => page.evaluate(() => window.__glossa.globe.renderer.getContext().getExtension('WEBGL_lose_context').loseContext());
await page.goto(`${base}/?lang=zh-Hans#/`, { waitUntil: 'networkidle0', timeout: 120000 });
await sleep(2500);
const first = await state();
await lose();
// the page reloads by itself after 3 s
await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 20000 }).catch(() => errors.push('no reload'));
await sleep(2500);
const second = await state();
await page.screenshot({ path: '.shots/fallback/after_reload.png' });
await lose();
await sleep(4000);
const third = await state();
await page.screenshot({ path: '.shots/fallback/message.png' });
console.log(JSON.stringify({ first, second, third, errors }, null, 1));
await browser.close();
