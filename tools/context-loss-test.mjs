// Lose the globe's WebGL context on purpose (as a phone short of graphics
// memory does), then let it come back: the canvas must hide while lost and
// draw the globe again, with smaller textures, once restored.
//   node tools/context-loss-test.mjs <base>
import puppeteer from 'puppeteer-core';
import { quiet } from './quiet.mjs';

const base = process.argv[2] ?? 'http://localhost:5173';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
quiet(browser);
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await page.goto(`${base}/?lang=en#/`, { waitUntil: 'networkidle0', timeout: 120000 });
await new Promise((r) => setTimeout(r, 3000));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const before = await page.evaluate(() => window.__glossa.globe.texSize);
await page.evaluate(() => { window.__lose = window.__glossa.globe.renderer.getContext().getExtension('WEBGL_lose_context'); window.__lose.loseContext(); });
await sleep(800);
const lost = await page.evaluate(() => window.__glossa.globe.renderer.domElement.style.visibility);
await page.screenshot({ path: '.shots/context-lost.png' });
await page.evaluate(() => window.__lose.restoreContext());
await sleep(3000);
const after = await page.evaluate(() => ({ vis: window.__glossa.globe.renderer.domElement.style.visibility, tex: window.__glossa.globe.texSize, w: window.__glossa.globe.sphere.material.map.image.width }));
await page.screenshot({ path: '.shots/context-restored.png' });
console.log({ before, lost, after, errors });
await browser.close();
