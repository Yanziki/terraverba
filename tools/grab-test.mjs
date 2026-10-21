// Drag the globe and see where the ground that was under the pointer ends up:
// with a "grab" feel it lands under the pointer again.
//   node tools/grab-test.mjs <base>
import puppeteer from 'puppeteer-core';
import { quiet } from './quiet.mjs';

const base = process.argv[2] ?? 'http://localhost:5173';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
quiet(browser);
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const [name, dist] of [['home', null], ['middle', 2.6], ['zoomed', 1.6], ['close', 1.25]]) {
  await page.goto(`${base}/?lang=en#/`, { waitUntil: 'networkidle0', timeout: 120000 });
  await sleep(2500);
  // a first small drag puts the welcome text away (the globe then slides to the middle)
  await page.mouse.move(900, 450);
  await page.mouse.down();
  await page.mouse.move(905, 450);
  await page.mouse.up();
  await sleep(2500);
  // stop the idle spin and set the distance
  await page.evaluate((dist) => {
    const g = window.__glossa.globe;
    g.controls.autoRotate = false;
    if (dist) g.camera.position.setLength(dist);
  }, dist);
  await sleep(1500);
  // a point on the globe: the middle of the sphere as drawn
  const start = await page.evaluate(() => {
    const g = window.__glossa.globe;
    const c = g.sphere.position.clone().project(g.camera);
    const rect = g.renderer.domElement.getBoundingClientRect();
    return { x: rect.left + ((c.x + 1) / 2) * rect.width, y: rect.top + ((1 - c.y) / 2) * rect.height };
  });
  const world = await page.evaluate(({ x, y }) => {
    const g = window.__glossa.globe;
    const rect = g.renderer.domElement.getBoundingClientRect();
    const ndc = { x: ((x - rect.left) / rect.width) * 2 - 1, y: -((y - rect.top) / rect.height) * 2 + 1 };
    g.raycaster.setFromCamera(ndc, g.camera);
    const hit = g.raycaster.intersectObject(g.sphere)[0];
    return hit && hit.point.toArray();
  }, start);
  const dx = 120;
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) {
    await page.mouse.move(start.x + (dx * i) / 12, start.y);
    await sleep(16);
  }
  await page.mouse.up();
  await sleep(2500);
  const end = await page.evaluate((p) => {
    const g = window.__glossa.globe;
    const v = new g.camera.position.constructor(...p).project(g.camera);
    const rect = g.renderer.domElement.getBoundingClientRect();
    return { x: rect.left + ((v.x + 1) / 2) * rect.width, speed: g.controls.rotateSpeed };
  }, world);
  console.log(name, `pointer moved ${dx}px, ground moved ${Math.round(end.x - start.x)}px, rotateSpeed ${end.speed.toFixed(3)}`);
}
await browser.close();
