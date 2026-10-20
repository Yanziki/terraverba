// The mark in place: top bar (both themes), the phone top bar, the loading screen, the favicon.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const dir = '.shots/brand';
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const errors = [];
const page = await browser.newPage();
page.on('pageerror', (e) => errors.push(e.message));
for (const theme of ['nocturne', 'atelier']) {
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(`http://localhost:5173/?lang=zh-Hans&theme=${theme}#/`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 2500));
  await page.screenshot({ path: `${dir}/top_${theme}.png`, clip: { x: 0, y: 0, width: 1440, height: 520 } });
  await page.screenshot({ path: `${dir}/zoom_${theme}.png`, clip: { x: 20, y: 14, width: 210, height: 60 } });
}
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true });
await page.goto('http://localhost:5173/?lang=zh-Hans&theme=nocturne#/', { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 2500));
await page.screenshot({ path: `${dir}/phone.png`, clip: { x: 0, y: 0, width: 390, height: 300 } });
// the loading screen, held before the data arrives
await page.setViewport({ width: 900, height: 500, deviceScaleFactor: 2 });
await page.setRequestInterception(true);
page.on('request', (r) => (r.url().includes('/data/') ? null : r.continue()));
await page.goto('http://localhost:5173/?lang=zh-Hans&theme=nocturne#/', { waitUntil: 'domcontentloaded' });
await new Promise((r) => setTimeout(r, 1500));
await page.screenshot({ path: `${dir}/loading.png` });
await page.setRequestInterception(false);
// the favicon at tab sizes
const fav = fs.readFileSync('public/favicon.svg', 'utf8');
const p2 = await browser.newPage();
await p2.setViewport({ width: 300, height: 80, deviceScaleFactor: 2 });
await p2.setContent(`<body style="margin:0;background:#dee1e6;display:flex;gap:18px;align-items:center;padding:20px">${[16, 24, 32, 48].map((s) => `<img width="${s}" height="${s}" src="data:image/svg+xml;utf8,${encodeURIComponent(fav)}">`).join('')}</body>`);
await p2.screenshot({ path: `${dir}/favicon.png` });
console.log(JSON.stringify({ files: fs.readdirSync(dir), errors }));
await browser.close();
