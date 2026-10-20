// The people story: the card on the list, every chapter (portrait loads,
// no errors), and the link from a language's panel.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const lang = process.argv[2] ?? 'zh-Hans';
const story = process.argv[3] ?? 'people';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('response', (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
await page.setViewport({ width: 1440, height: 900 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync('.shots/people', { recursive: true });
await page.goto(`http://localhost:5173/?lang=${lang}#/stories`, { waitUntil: 'networkidle0' });
await sleep(2500);
await page.screenshot({ path: `.shots/people/${lang}_list.png` });
const out = [];
const n = await page.$$eval(`a[href^="#/story/${story}/"]`, (a) => a.length) && (await page.goto(`http://localhost:5173/?lang=${lang}#/story/${story}/0`, { waitUntil: 'networkidle0' }), await page.$$eval('.progress i', (x) => x.length));
for (let i = 0; i < n; i++) {
  await page.goto(`http://localhost:5173/?lang=${lang}#/story/${story}/${i}`, { waitUntil: 'networkidle0' });
  await sleep(2600);
  out.push(await page.evaluate(() => {
    const img = document.querySelector('.chapter .portrait img');
    return { title: document.querySelector('.chapter h3')?.textContent, rows: document.querySelectorAll('.chapter .words tr').length, gloss: document.querySelectorAll('.chapter .gloss').length, img: img ? [img.naturalWidth, img.complete] : null, len: document.querySelector('.chapter .body')?.textContent.length };
  }));
  await page.screenshot({ path: `.shots/people/${story}_${lang}_${i}.png` });
}
await page.goto(`http://localhost:5173/?lang=${lang}#/?sel=cher1273`, { waitUntil: 'networkidle0' });
await sleep(2500);
const card = await page.$eval('.person-card', (e) => e.textContent.trim()).catch(() => null);
await page.screenshot({ path: `.shots/people/${lang}_panel.png` });
console.log(JSON.stringify({ out, card, errors }, null, 1));
await browser.close();
