// A browser with no WebGL at all (as Chrome on an Android phone after GPU
// crashes): the page must not stay on the loading screen; it must explain and
// offer the static language index. Also checks the 3D similarity view frees
// its context when left.
//   node tools/no-webgl-test.mjs <base>
import puppeteer from 'puppeteer-core';
import { quiet } from './quiet.mjs';
import fs from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:5173';
fs.mkdirSync('.shots/fallback', { recursive: true });
const out = {};
for (const lang of ['zh-Hans', 'en']) {
  const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--disable-webgl', '--disable-3d-apis'] });
  quiet(browser);
  const page = await browser.newPage();
  await page.setViewport({ width: 360, height: 800, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  await page.goto(`${base}/?lang=${lang}#/`, { waitUntil: 'networkidle0', timeout: 120000 });
  await new Promise((r) => setTimeout(r, 2000));
  out[lang] = await page.evaluate(() => ({
    loadingGone: document.getElementById('loading')?.classList.contains('off'),
    message: document.querySelector('#gfx-fail p')?.textContent,
    index: document.querySelector('#gfx-fail a')?.getAttribute('href'),
  }));
  await page.screenshot({ path: `.shots/fallback/nowebgl_${lang}.png` });
  if (out[lang].index) {
    await page.click('#gfx-fail a');
    await page.waitForNetworkIdle();
    out[lang].indexPage = await page.evaluate(() => `${location.pathname} · ${document.title}`);
  }
  await browser.close();
}
// the 3D cloud gives its context back when the view is left
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
quiet(browser);
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
// every WebGL context the page makes, kept to look at afterwards
await page.evaluateOnNewDocument(() => {
  window.__contexts = [];
  const get = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    const ctx = get.call(this, type, ...rest);
    if (ctx && /webgl/.test(type) && !window.__contexts.includes(ctx)) window.__contexts.push(ctx);
    return ctx;
  };
});
await page.goto(`${base}/?lang=en#/space/vocabulary`, { waitUntil: 'networkidle0', timeout: 120000 });
await page.waitForSelector('[data-dim="3d"]');
const before = await page.evaluate(() => window.__contexts.length);
await page.evaluate(() => document.querySelector('[data-dim="3d"]').click());
await new Promise((r) => setTimeout(r, 1500));
const opened = await page.evaluate(() => window.__contexts.length);
await page.evaluate(() => (location.hash = '#/'));
await new Promise((r) => setTimeout(r, 1500));
out.cloud = await page.evaluate(([b, o]) => ({ contextsBefore: b, afterOpening3d: o, cloudContextLost: window.__contexts.slice(b).map((c) => c.isContextLost()) }), [before, opened]);
out.globeStillDrawn = await page.evaluate(() => !window.__glossa.globe.renderer.getContext().isContextLost());
console.log(JSON.stringify(out, null, 1));
await browser.close();
