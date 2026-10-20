// The home page at several window heights: the hero must stay clear of the top bar.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const dir = '.shots/hero';
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const page = await browser.newPage();
const out = [];
for (const lang of ['zh-Hans', 'en', 'ru']) {
  for (const [w, h] of [[1440, 900], [1280, 720], [1366, 600], [1024, 500]]) {
    await page.setViewport({ width: w, height: h });
    await page.goto(`http://localhost:5173/?lang=${lang}#/`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1800));
    const r = await page.evaluate(() => {
      const top = document.querySelector('.topbar').getBoundingClientRect().bottom;
      const kids = [...document.querySelectorAll('#hero > *')].filter((e) => e.offsetParent);
      const first = kids[0].getBoundingClientRect().top;
      const last = Math.max(...kids.map((e) => e.getBoundingClientRect().bottom));
      return { top: Math.round(top), first: Math.round(first), last: Math.round(last), vh: innerHeight };
    });
    out.push([lang, `${w}x${h}`, r.first >= r.top ? 'ok' : 'OVERLAP', r.last <= r.vh ? 'ok' : 'CUT', r]);
    await page.screenshot({ path: `${dir}/${lang}_${w}x${h}.png` });
  }
}
for (const o of out) console.log(o.slice(0, 4).join(' '), JSON.stringify(o[4]));
await browser.close();
