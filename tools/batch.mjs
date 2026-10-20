// Screenshot several states in one browser: node tools/batch.mjs <spec.json>
// spec: [{ name, url, w, h, wait, js }]
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'fs';

const specs = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars'],
});
// a few tabs at a time: WebGL pages starve each other otherwise
const shoot = async (s) => {
  const page = await browser.newPage();
  const logs = [];
  if (process.env.NANTRACE) {
    await page.evaluateOnNewDocument(() => {
      const orig = Element.prototype.setAttribute;
      let n = 0;
      Element.prototype.setAttribute = function (k, v) {
        if (String(v) === 'NaN' && n++ < 1) console.log('NANTRACE ' + new Error().stack.replace(/\n/g, ' | '));
        return orig.call(this, k, v);
      };
    });
    page.on('console', (m) => m.text().startsWith('NANTRACE') && logs.push(m.text()));
  }
  page.on('console', (m) => m.type() === 'error' && logs.push(`[console] ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  await page.setViewport({ width: s.w ?? 1440, height: s.h ?? 900, deviceScaleFactor: 2 });
  await page.goto(/^https?:/.test(s.url) ? s.url : `http://localhost:5173/${s.url}`, { waitUntil: 'networkidle0', timeout: 60000 });
  if (await page.$('#loading')) await page.waitForSelector('#loading.off', { timeout: 30000 }).catch(() => logs.push('loading never finished'));
  for (const step of [].concat(s.js ?? [])) {
    await new Promise((r) => setTimeout(r, 900));
    await page.evaluate(step);
  }
  await new Promise((r) => setTimeout(r, s.wait ?? 4000));
  await page.screenshot({ path: `.shots/${s.name}.png`, fullPage: !!s.full });
  for (const l of logs) if (!process.env.NANTRACE || l.startsWith('NANTRACE')) console.log(s.name, l);
  await page.close();
};
for (let i = 0; i < specs.length; i += 3) await Promise.all(specs.slice(i, i + 3).map(shoot));
await browser.close();
