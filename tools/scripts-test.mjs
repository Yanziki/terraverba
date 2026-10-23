// The "written in" fact and the colour-by-script mode: panel text for a few
// languages, the legend, and screenshots (desktop and phone) in .shots/scripts/.
//   node tools/scripts-test.mjs [base]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import { quiet } from './quiet.mjs';

const base = process.argv[2] ?? 'http://localhost:5173';
const OUT = '.shots/scripts';
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
quiet(browser);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
const page = await browser.newPage();
page.on('pageerror', (e) => errors.push(e.message));
await page.setViewport({ width: 1440, height: 900 });
for (const [lang, id] of [['zh-Hans', 'kaza1248'], ['zh-Hans', 'mand1415'], ['en', 'sout1528'], ['ja', 'jpn'], ['zh-Hans', 'uigh1240'], ['en', 'sume1241'], ['zh-Hans', 'goro1259'], ['en', 'amer1248']]) {
  const sel = id === 'jpn' ? 'nucl1643' : id;
  await page.goto(`${base}/?lang=${lang}#/?sel=${sel}`, { waitUntil: 'networkidle0', timeout: 120000 });
  await sleep(1500);
  console.log(lang, sel, JSON.stringify(await page.evaluate(() => {
    const f = document.querySelector('#panel .scripts-fact');
    return { title: document.querySelector('#panel .p-title')?.textContent, shown: f && !f.hidden, text: f?.querySelector('.v')?.textContent };
  })));
}
// colour by script
await page.goto(`${base}/?lang=zh-Hans#/`, { waitUntil: 'networkidle0', timeout: 120000 });
await page.waitForFunction(() => window.__glossa?.globe, { timeout: 60000 });
await page.evaluate(() => { window.__glossa.state.hero = false; window.__glossa.layout(); });
await sleep(800);
await page.evaluate(() => document.querySelector('#layers [data-color="script"]').click());
await sleep(2500);
console.log('legend', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('#layers .legend-list li')].map((li) => li.textContent.replace(/\s+/g, ' ').trim()))));
console.log('note', await page.evaluate(() => document.querySelector('#layers .legend-note')?.textContent));
await page.evaluate(() => window.__glossa.globe.flyTo(30, 60, 3.2, 1));
await sleep(3000);
await page.screenshot({ path: `${OUT}/desktop.png` });
await page.evaluate(() => document.querySelector('#layers .legend-list li[data-key="eastAsian"]').click());
await sleep(1500);
await page.screenshot({ path: `${OUT}/desktop-east.png` });
// phone
const phone = await browser.newPage();
phone.on('pageerror', (e) => errors.push(e.message));
await phone.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await phone.goto(`${base}/?lang=zh-Hans#/`, { waitUntil: 'networkidle0', timeout: 120000 });
await sleep(2000);
await phone.evaluate(() => { window.__glossa.state.hero = false; window.__glossa.layout(); });
await phone.evaluate(() => document.querySelector('#layers .layers-head').click());
await sleep(600);
await phone.evaluate(() => document.querySelector('#layers [data-color="script"]').click());
await sleep(2500);
console.log('phone seg overflow', await phone.evaluate(() => [...document.querySelectorAll('#layers .seg.small button')].map((b) => b.scrollWidth > b.clientWidth + 1)));
await phone.screenshot({ path: `${OUT}/phone.png` });
console.log('errors', errors);
await browser.close();
