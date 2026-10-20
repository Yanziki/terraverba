// Smoke test: hover/click a dot, click a place, search, switch view and
// interface language, then visit every route and collect page errors.
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.setViewport({ width: 1440, height: 900 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.goto('http://localhost:5173/?lang=zh-Hans#/', { waitUntil: 'networkidle0' });
await sleep(2000);
const at = (id) => page.evaluate((id) => {
  const a = window.__glossa; a.globe.controls.autoRotate = false;
  const p = a.globe.project(a.data.byId.get(id)); return p && { x: p.x, y: p.y };
}, id);
const state = () => page.evaluate(() => [location.hash, document.querySelector('#panel.on .p-title')?.textContent ?? null]);
await page.click('[data-act=start]');
await sleep(1800);
const out = {};
let p = await at('stan1290');
await page.mouse.move(p.x, p.y);
await sleep(400);
out.tooltip = await page.$eval('#tooltip', (el) => el.classList.contains('on') && el.textContent.replace(/\s+/g, ' ').trim());
await page.mouse.click(p.x, p.y);
await sleep(2500);
out.clickDot = await state();
out.wiki = await page.$eval('#panel .wiki', (el) => el.textContent.trim().slice(0, 60));
out.similar = await page.$$eval('#panel .similar .rl-name', (els) => els.map((e) => e.textContent).slice(0, 4));
const c = await page.evaluate(() => { const g = window.__glossa.globe; g.flyTo(23, 12, 2.6, 10); return true; });
await sleep(700);
const d = await page.evaluate(() => { const g = window.__glossa.globe.disc(); return { x: g.x, y: g.y }; });
await page.mouse.click(d.x + 3, d.y + 3);
await sleep(1500);
out.clickPlace = await state();
await page.click('[data-mode="2d"]');
await sleep(2200);
out.mode = await page.evaluate(() => [window.__glossa.globe.mode, window.__glossa.globe.flat]);
p = await at('stan1288');
await page.mouse.click(p.x, p.y);
await sleep(1500);
out.click2d = await state();
await page.type('.search input', 'euskara');
await sleep(300);
out.search = await page.$$eval('.result .r-name', (els) => els.slice(0, 2).map((e) => e.textContent.trim()));
await page.keyboard.press('Enter');
await sleep(1200);
out.afterSearch = await state();
await page.click('.locale');
await page.click('[data-code="zh-Hant"]');
await sleep(2500);
out.hant = await page.evaluate(() => [document.documentElement.lang, document.querySelector('#panel .p-title')?.textContent, document.querySelector('#panel .wiki')?.textContent.trim().slice(0, 40)]);
for (const route of ['#/tree', '#/tree/indo1319?sel=stan1293', '#/all', '#/space/vocabulary', '#/space/grammar', '#/stories', '#/story/tea/2', '#/story/americas/4', '#/about', '#/?sel=sino1245']) {
  await page.evaluate((r) => (location.hash = r), route);
  await sleep(1300);
}
out.errors = errors;
console.log(JSON.stringify(out, null, 1));
await browser.close();
