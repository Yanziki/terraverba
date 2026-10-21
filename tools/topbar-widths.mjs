// The top bar at desktop widths in every language: nothing past the right edge,
// the search box wide enough to type in, nav items not squeezed into each other.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import { quiet } from './quiet.mjs';
fs.mkdirSync('.shots/topbar', { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
quiet(browser);
const page = await browser.newPage();
const bad = [];
for (const lang of ['en', 'zh-Hans', 'zh-Hant', 'ja', 'ko', 'es', 'fr', 'de', 'pt', 'ru']) {
  for (const w of [320, 360, 390, 430, 768, 900, 1024, 1152, 1280, 1366, 1440]) {
    await page.setViewport(w < 900 ? { width: w, height: 800, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { width: w, height: 800 });
    await page.goto(`http://localhost:5173/?lang=${lang}#/`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 700));
    const m = await page.evaluate(() => {
      const kids = [...document.querySelector('.topbar').children].filter((e) => e.offsetParent && getComputedStyle(e).position !== 'fixed');
      const right = Math.max(...kids.map((e) => e.getBoundingClientRect().right));
      const search = document.querySelector('.search').getBoundingClientRect().width;
      const nav = [...document.querySelectorAll('.nav a')].map((a) => a.getBoundingClientRect());
      const overlap = nav.some((r, i) => i && r.left < nav[i - 1].right - 1);
      return { right: Math.round(right), search: Math.round(search), overlap, vw: innerWidth };
    });
    // on phones the nav is a bar at the bottom; the search box only needs room to tap
    const passport = await page.evaluate(() => !!document.querySelector('.topbar .about-link[data-nav=me]')?.offsetParent);
    const ok = m.right <= m.vw - 8 && m.search >= (w < 900 ? 80 : 140) && (w < 900 || !m.overlap) && passport;
    m.passport = passport;
    if (!ok) bad.push([lang, w, m]);
    if ([360, 390, 900, 1024].includes(w)) await page.screenshot({ path: `.shots/topbar/${lang}_${w}.png`, clip: { x: 0, y: 0, width: w, height: 70 } });
  }
}
console.log(bad.length ? bad.map((b) => JSON.stringify(b)).join('\n') : 'all ok');
await browser.close();
