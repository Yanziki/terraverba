// Drag the globe and check that the place names follow it.
// node tools/drag-test.mjs "<query+hash>" [layers-json]
import puppeteer from 'puppeteer-core';
import { quiet } from './quiet.mjs';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal'] });
quiet(browser);
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.setViewport({ width: 1440, height: 900 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
if (process.argv[3]) await page.evaluate((v) => localStorage.setItem('glossa-view', v), process.argv[3]);
await page.goto(`http://localhost:5173/${process.argv[2]}`, { waitUntil: 'networkidle0' });
await sleep(4000);
const where = () => page.evaluate(() => [...document.querySelectorAll('.glabel')].filter((e) => e.style.opacity !== '0').slice(0, 4).map((e) => `${e.textContent}@${e.style.transform.match(/translate\(([-\d.]+)px, ([-\d.]+)px/)?.slice(1, 3).join(',')}`));
const cam = () => page.evaluate(() => { const g = window.__glossa.globe; return { cam: g.camera.position.toArray().map((x) => +x.toFixed(3)), dirty: g.labelsDirty, paused: g.paused, frames: g.__frames ?? null }; });
const before = await where();
const c0 = await cam();
await page.mouse.move(700, 450);
await page.mouse.down();
for (let i = 1; i <= 20; i++) { await page.mouse.move(700 + i * 12, 450 + i * 3); await sleep(16); }
await page.mouse.up();
await sleep(1500);
const after = await where();
const c1 = await cam();
console.log(JSON.stringify({ c0, c1, before, after, errors: [...new Set(errors)].slice(0, 5) }, null, 1));
await browser.close();
