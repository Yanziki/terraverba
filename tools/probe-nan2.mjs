import puppeteer from 'puppeteer-core';
import { quiet } from './quiet.mjs';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal'] });
quiet(browser);
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => {
  const orig = Element.prototype.setAttribute;
  window.__nanStacks = [];
  Element.prototype.setAttribute = function (k, v) {
    if (String(v) === 'NaN' && window.__nanStacks.length < 2) window.__nanStacks.push(new Error().stack);
    return orig.call(this, k, v);
  };
});
await page.setViewport({ width: 1440, height: 900 });
await page.goto('http://localhost:5173/?lang=en#/features/order', { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 4000));
console.log(await page.evaluate(() => window.__nanStacks.join('\n----\n')));
console.log(await page.evaluate(() => { const g = window.__glossa.globe; return JSON.stringify([g.camera.position.toArray(), g.width, g.height, g.disc()]); }));
await browser.close();
