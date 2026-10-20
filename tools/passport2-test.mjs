// The passport as a booklet: name and Latin spelling, a photo through the
// cropper, a language set to "learning", each page exported, the share link,
// and the link opened by someone else (the friend banner).
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const dir = '.shots/passport2';
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
const lang = process.argv[2] ?? 'zh-Hans';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--accept-lang=zh-CN,en-US,ja'] });
const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const watch = (page) => {
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
};
const ctx = await browser.createBrowserContext();
const page = await ctx.newPage();
watch(page);
await page.setViewport({ width: 1440, height: 900 });
await page.goto(`http://localhost:5173/?lang=${lang}#/`, { waitUntil: 'networkidle0' });
// six languages, all three levels
await page.evaluate(() => localStorage.setItem('glossa-passport-2', JSON.stringify({ ids: ['mand1415', 'yuec1235', 'stan1293', 'nucl1643', 'stan1290', 'hind1269'],
  levels: { mand1415: 'native', yuec1235: 'native', stan1293: 'fluent', nucl1643: 'fluent', stan1290: 'learning', hind1269: 'learning' }, name: '', latin: '', photo: null, issued: '2026-10-20' })));
await page.goto(`http://localhost:5173/?lang=${lang}#/me`, { waitUntil: 'networkidle0' });
await sleep(2500);
await page.type('.pp-fields input[name=name]', process.argv[3] ?? '林小雨');
await page.type('.pp-fields input[name=latin]', process.argv[4] ?? 'Lin Xiaoyu');
await page.$eval('.pp-fields input[name=latin]', (i) => i.dispatchEvent(new Event('change')));
const file = await page.$('.pp-holder input[type=file]');
await file.uploadFile('public/img/people/zamenhof.jpg');
await page.waitForSelector('.crop-modal', { timeout: 10000 });
await sleep(500);
await page.evaluate(() => {
  const z = document.querySelector('.crop-zoom');
  z.value = 1.4;
  z.dispatchEvent(new Event('input'));
});
await page.screenshot({ path: `${dir}/0_crop.png` });
await page.click('.crop-modal [data-act=ok]');
await sleep(1500);
await sleep(1500);
await page.screenshot({ path: `${dir}/1_page.png` });
const grab = async (name) => {
  await page.waitForSelector('.pp-card img:not([hidden])', { timeout: 15000 });
  await sleep(1200);
  const b64 = await page.evaluate(async () => {
    const r = await fetch(document.querySelector('.pp-card img').src);
    const b = new Uint8Array(await r.arrayBuffer());
    let s = '';
    for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
    return btoa(s);
  });
  fs.writeFileSync(`${dir}/${name}.png`, Buffer.from(b64, 'base64'));
};
for (const p of ['cover', 'data', 'visa']) {
  await page.click(`[data-page=${p}]`);
  await grab(`card_${p}`);
}
await page.click('[data-act=share]');
await sleep(600);
const note = await page.$eval('.pp-saved', (e) => e.textContent);
const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('glossa-passport-2')));
const code = stored.ids.map((id) => id + stored.levels[id][0]).join('.');
// someone else opens the link
const other = await browser.createBrowserContext();
const p2 = await other.newPage();
watch(p2);
await p2.setViewport({ width: 1440, height: 900 });
await p2.goto(`http://localhost:5173/?lang=${lang}#/`, { waitUntil: 'networkidle0' });
await p2.evaluate(() => localStorage.setItem('glossa-passport-2', JSON.stringify({ ids: ['stan1288', 'stan1293'], levels: { stan1288: 'native', stan1293: 'fluent' }, name: '', latin: '', photo: null, issued: '2026-10-20' })));
await p2.goto(`http://localhost:5173/?lang=${lang}#/me/with/${code}`, { waitUntil: 'networkidle0' });
await sleep(2500);
const banner = await p2.$eval('.pp-friend', (e) => e.innerText).catch(() => null);
await p2.screenshot({ path: `${dir}/2_friend.png` });
// a phone
const p3 = await ctx.newPage();
watch(p3);
await p3.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await p3.goto(`http://localhost:5173/?lang=${lang}#/me`, { waitUntil: 'networkidle0' });
await sleep(2500);
await p3.screenshot({ path: `${dir}/3_phone.png` });
console.log(JSON.stringify({ stored: { ...stored, photo: stored.photo ? `${stored.photo.length} chars` : null }, note, banner, errors }, null, 1));
await browser.close();
