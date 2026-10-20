// "Languages near me": the hero button and the near-me button, with emulated positions.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal'] });
const ctx = browser.defaultBrowserContext();
await ctx.overridePermissions('http://localhost:5173', ['geolocation']);
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.setViewport({ width: 1440, height: 900 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync('.shots/near', { recursive: true });
const places = [['kunming', 25.04, 102.71, 'zh-Hans'], ['taipei', 25.03, 121.56, 'zh-Hant'], ['london', 51.51, -0.13, 'en']];
const out = [];
for (const [name, latitude, longitude, lang] of places) {
  await page.setGeolocation({ latitude, longitude });
  await page.goto(`http://localhost:5173/?lang=${lang}#/`, { waitUntil: 'networkidle0' });
  await sleep(2500);
  if (name === 'kunming') await page.screenshot({ path: '.shots/near/hero.png' });
  // the hero button the first time, the corner button after that
  if (await page.$('#hero:not(.off) [data-act=near]')) await page.click('#hero [data-act=near]');
  else await page.click('#nearme');
  await sleep(3500);
  await page.screenshot({ path: `.shots/near/${name}.png` });
  out.push([name, await page.evaluate(() => location.hash), await page.$eval('.near-summary', (e) => e.textContent).catch(() => null)]);
}
console.log(JSON.stringify({ out, errors }, null, 1));
await browser.close();
