// Switch through the four daily levels, reload mid-quiz, and check that
// progress and per-level bests survive.
import puppeteer from 'puppeteer-core';
import { answer } from './daily-answer.mjs';
import { quiet } from './quiet.mjs';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
quiet(browser);
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.setViewport({ width: 1440, height: 900 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.goto('http://localhost:5173/?lang=zh-Hans#/daily', { waitUntil: 'networkidle0' });
await page.evaluate(() => { localStorage.removeItem('glossa-daily-3'); localStorage.removeItem('glossa-daily-level'); });
await page.reload({ waitUntil: 'networkidle0' });
await sleep(3000);
const out = [];
for (const lv of ['easy', 'normal', 'hard', 'expert']) {
  await page.click(`[data-level=${lv}]`);
  await sleep(1800);
  out.push([lv, await page.$eval('.daily-level-hint', (e) => e.textContent), await page.$eval('.daily-type', (e) => e.textContent), await page.$eval('.daily-q', (e) => e.textContent)]);
}
// answer the first expert question, reload, and see it kept
const before = await page.$eval('.daily-q', (e) => e.textContent);
await answer(page);
await sleep(800);
await page.reload({ waitUntil: 'networkidle0' });
await sleep(3500);
const kept = { level: await page.$eval('[data-level].on', (e) => e.dataset.level), sameQuestion: (await page.$eval('.daily-q', (e) => e.textContent)) === before, answered: !!(await page.$('.daily-result')) };
const store = await page.evaluate(() => JSON.parse(localStorage.getItem('glossa-daily-3')));
console.log(JSON.stringify({ out, kept, storeKeys: Object.keys(store), errors }, null, 1));
await browser.close();
