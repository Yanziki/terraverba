// How steady the name labels are while the globe turns: the globe is turned
// at a steady pace for a few seconds, the visible labels are sampled every
// 100 ms, and each time a label goes away and comes back counts as a flicker.
//   node tools/label-stability.mjs <base> [seconds]
import puppeteer from 'puppeteer-core';

const [base = 'http://localhost:5173', secs = '6'] = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(`${base}/?lang=en#/?sel=@45,10,1`, { waitUntil: 'networkidle0', timeout: 120000 });
await page.goto(`${base}/?lang=en#/`, { waitUntil: 'networkidle0', timeout: 120000 });
await new Promise((r) => setTimeout(r, 2500));
const out = await page.evaluate((secs) => new Promise((resolve) => {
  const g = window.__glossa.globe;
  g.controls.autoRotate = false;
  g.flyTo(45, -10, 2.6, 1);
  const samples = [];
  const t0 = performance.now();
  let last = 0;
  const step = (now) => {
    // turn east at 6° a second
    const a = (6 * Math.PI) / 180 / 60;
    const p = g.camera.position;
    const x = p.x * Math.cos(a) - p.z * Math.sin(a);
    const z = p.x * Math.sin(a) + p.z * Math.cos(a);
    p.set(x, p.y, z);
    g.camera.lookAt(0, 0, 0);
    g.labelsDirty = true;
    if (now - last > 100) {
      last = now;
      samples.push([...document.querySelectorAll('#labels .glabel')].filter((e) => +getComputedStyle(e).opacity > 0.5).map((e) => e.textContent));
    }
    if (now - t0 < secs * 1000) requestAnimationFrame(step);
    else resolve(samples);
  };
  setTimeout(() => requestAnimationFrame(step), 300);
}), +secs);
const seen = new Map();
let flickers = 0;
const names = new Set(out.flat());
for (const name of names) {
  const row = out.map((s) => s.includes(name));
  for (let i = 1; i < row.length - 1; i++) {
    // gone for a short while (≤ 0.5 s) between two showings
    if (row[i - 1] && !row[i]) {
      let j = i;
      while (j < row.length && !row[j]) j++;
      if (j < row.length && j - i <= 5) {
        flickers++;
        seen.set(name, (seen.get(name) ?? 0) + 1);
      }
    }
  }
}
console.log({ samples: out.length, labels: names.size, flickers, worst: [...seen].sort((a, b) => b[1] - a[1]).slice(0, 6) });
await browser.close();
