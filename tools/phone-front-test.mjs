// Phones: the drawer opened last is in front. A language panel → "open in the
// family tree" brings the tree over the panel; a language picked in the tree
// brings its panel over the tree; closing the tree leaves the panel.
//   node tools/phone-front-test.mjs <base>
import puppeteer from 'puppeteer-core';
import { quiet } from './quiet.mjs';
import fs from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:5173';
fs.mkdirSync('.shots/phone', { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
quiet(browser);
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// which drawer is drawn at the middle of the drawers' area
const top = () => page.evaluate(() => {
  const el = document.elementFromPoint(195, 700);
  return { hash: location.hash, top: el?.closest('#panel') ? 'panel' : el?.closest('#sheet') ? 'sheet' : el?.tagName, panelOn: document.querySelector('#panel').classList.contains('on'), sheetOn: document.querySelector('#sheet').classList.contains('on') };
});
const out = {};
await page.goto(`${base}/?lang=zh-Hans#/?sel=nucl1643`, { waitUntil: 'networkidle0', timeout: 120000 });
await sleep(2500);
out.panel = await top();
// scroll the panel down to the button, and tap it
await page.evaluate(() => document.querySelector('#panel .panel-actions a[href^="#/tree/"]').scrollIntoView({ block: 'center' }));
await sleep(400);
const btn = await page.evaluate(() => { const r = document.querySelector('#panel .panel-actions a[href^="#/tree/"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
await page.touchscreen.tap(btn.x, btn.y);
await sleep(2500);
out.afterTreeButton = await top();
await page.screenshot({ path: '.shots/phone/front_tree.png' });
// close the tree while it is in front: back to the atlas, the panel still there
await page.tap('#sheet .grip-close');
await sleep(1500);
out.closeTreeInFront = await top();
await page.goto(`${base}/?lang=zh-Hans#/?sel=nucl1643`, { waitUntil: 'networkidle0', timeout: 120000 });
await sleep(1500);
await page.evaluate(() => (location.hash = document.querySelector('#panel .panel-actions a[href^="#/tree/"]').getAttribute('href')));
await sleep(2500);
// pick another language in the tree: its panel comes in front
await page.evaluate(() => {
  const g = [...document.querySelectorAll('#sheet svg g.tree-node.lang')].find((x) => x.__data__?.data?.x?.id && x.__data__.data.x.id !== 'nucl1643');
  g?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
});
await sleep(2000);
out.afterPickInTree = await top();
// desktop is unchanged: panel on the right, sheet on the left
await page.setViewport({ width: 1440, height: 900 });
await page.goto(`${base}/?lang=zh-Hans#/tree/japo1237?sel=nucl1643`, { waitUntil: 'networkidle0', timeout: 120000 });
await sleep(2000);
out.desktop = await page.evaluate(() => ({ sheetFront: document.querySelector('#sheet').classList.contains('front'), panel: Math.round(document.querySelector('#panel').getBoundingClientRect().left), sheet: Math.round(document.querySelector('#sheet').getBoundingClientRect().left) }));
console.log(JSON.stringify({ out, errors }, null, 1));
await browser.close();
