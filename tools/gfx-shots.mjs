// Screenshots of the globe at each graphics level, to compare by eye.
//   node tools/gfx-shots.mjs <base> → .shots/gfx/
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:5173';
fs.mkdirSync('.shots/gfx', { recursive: true });
const runs = [
  ['low-soft', ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'], { width: 1440, height: 900 }, ''],
  ['full', ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'], { width: 1440, height: 900 }, ''],
  ['small-phone', ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'], { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, ''],
  ['low-light', ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'], { width: 1440, height: 900 }, 'atelier'],
];
for (const [name, args, vp, theme] of runs) {
  const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.setViewport(vp);
  if (theme) await page.evaluateOnNewDocument((t) => localStorage.setItem('glossa-theme', t), theme);
  for (const [r, hash] of [['home', '#/'], ['focus', '#/?sel=sini1245'], ['tone', '#/features/tone']]) {
    await page.goto(`${base}/?lang=en${hash}`, { waitUntil: 'networkidle0', timeout: 120000 });
    await new Promise((res) => setTimeout(res, 4000));
    await page.screenshot({ path: `.shots/gfx/${name}_${r}.png` });
  }
  const gfx = await page.evaluate(() => {
    const g = window.__glossa.globe;
    return { tex: g.texSize, bump: g.bumpSize, ratio: g.renderer.getPixelRatio(), aa: g.renderer.getContextAttributes().antialias, halo: !!g.halo };
  });
  console.log(name, JSON.stringify(gfx), errors.slice(0, 3));
  await browser.close();
}
