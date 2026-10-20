// Phones: open the layers box, check it fits and scrolls, and close it again.
//   node tools/phone-layers.mjs <base> [name]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:5173';
const name = process.argv[3] ?? 'layers';
fs.mkdirSync('.shots/phone', { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const out = {};
for (const [vname, vp] of [['phone', { width: 390, height: 844 }], ['small', { width: 360, height: 640 }]]) {
  await page.setViewport({ ...vp, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await page.goto(`${base}/?lang=zh-Hans#/?sel=@20,100,1`, { waitUntil: 'networkidle0', timeout: 120000 });
  await page.goto(`${base}/?lang=zh-Hans#/`, { waitUntil: 'networkidle0', timeout: 120000 });
  await new Promise((r) => setTimeout(r, 2500));
  await page.tap('#layers .layers-head');
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: `.shots/phone/${name}_${vname}_open.png` });
  const box = () => page.evaluate(() => {
    const el = document.querySelector('#layers');
    const r = el.getBoundingClientRect();
    const body = el.querySelector('.layers-body');
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), vh: innerHeight, open: !body.classList.contains('closed'), scrolls: el.scrollHeight > el.clientHeight + 2 || body.scrollHeight > body.clientHeight + 2 };
  });
  out[`${vname}Open`] = await box();
  // the close mark, then scrolling inside the card
  out[`${vname}X`] = await page.evaluate(() => !!document.querySelector('#layers .layers-x')?.offsetParent);
  await page.evaluate(() => { const el = document.querySelector('#layers'); el.scrollTop = 9999; });
  out[`${vname}ScrolledTo`] = await page.evaluate(() => document.querySelector('#layers').scrollTop);
  // close it: the heading again, and (separately) a tap on the map
  await page.tap('#layers .layers-head');
  await new Promise((r) => setTimeout(r, 1000));
  out[`${vname}HeadClosed`] = await box();
  await page.tap('#layers .layers-head');
  await new Promise((r) => setTimeout(r, 800));
  await page.touchscreen.tap(vp.width / 2, 120);
  await new Promise((r) => setTimeout(r, 1000));
  out[`${vname}MapTapClosed`] = await box();
  out[`${vname}MapTapSelected`] = await page.evaluate(() => location.hash);
}
console.log(JSON.stringify(out, null, 1), errors);
await browser.close();
