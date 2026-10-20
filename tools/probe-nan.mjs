import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal'] });
const page = await browser.newPage();
let first = null;
page.on('console', (m) => { if (!first && m.text().includes('NaN')) first = m.text(); });
await page.setViewport({ width: 1440, height: 900 });
await page.goto('http://localhost:5173/?lang=zh-Hans#/features/tone', { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 2000));
const before = await page.evaluate(() => window.__glossa.globe.camera.position.toArray());
await page.evaluate(() => (location.hash = '#/features/tone'));
const samples = [];
for (let i = 0; i < 8; i++) {
  await new Promise((r) => setTimeout(r, 250));
  samples.push(await page.evaluate(() => { const g = window.__glossa.globe; return [g.camera.position.toArray().map((x) => +x.toFixed(3)), g.flight ? 'flight' : '', g.offset, g.width, g.height]; }));
}
console.log(JSON.stringify({ before, samples, first }, null, 0));
await browser.close();
