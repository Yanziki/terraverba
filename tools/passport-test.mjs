// The language passport: guessed from browser languages, one added by search, the card it previews.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--accept-lang=zh-CN,en-US,ja'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.setViewport({ width: 1440, height: 900 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync('.shots/passport', { recursive: true });
await page.evaluateOnNewDocument(() => ['glossa-passport', 'glossa-passport-2'].forEach((k) => localStorage.removeItem(k)));
await page.goto(`http://localhost:5173/?lang=${process.argv[2] ?? 'zh-Hans'}#/me`, { waitUntil: 'networkidle0' });
await sleep(3000);
const langs = await page.evaluate(() => navigator.languages);
await page.screenshot({ path: '.shots/passport/1.png' });
await page.type('.pp-add input', process.argv[3] ?? '粤', { delay: 40 });
await sleep(600);
await page.screenshot({ path: '.shots/passport/2_search.png' });
await page.keyboard.press('Enter');
await sleep(1500);
await page.screenshot({ path: '.shots/passport/3.png', fullPage: false });
// the card the page draws and previews (passport-card.js)
await page.waitForSelector('.pp-card img:not([hidden])', { timeout: 15000 });
const card = await page.evaluate(async () => {
  const blob = await (await fetch(document.querySelector('.pp-card img').src)).blob();
  return new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
});
fs.writeFileSync('.shots/passport/card.png', Buffer.from(card.split(',')[1], 'base64'));
console.log(JSON.stringify({ langs, chips: await page.$$eval('.pp-chip a', (els) => els.map((e) => e.textContent)), errors }));
await browser.close();
