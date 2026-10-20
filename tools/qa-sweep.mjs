// Pre-launch sweep: every interface language × desktop and phone × the main
// views. For each page it records script errors, failed requests, horizontal
// overflow, elements running off the right edge, and lines of text that are
// identical to the English page (likely untranslated). Screenshots in .shots/qa/.
//   node tools/qa-sweep.mjs [locale…]     → .shots/qa/report.json
//   BASE=https://preview.terraverba.pages.dev node tools/qa-sweep.mjs …   (a deployed build)
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const LOCALES = process.argv.slice(2).length ? process.argv.slice(2) : ['en', 'zh-Hans', 'zh-Hant', 'ja', 'ko', 'es', 'fr', 'de', 'pt', 'ru'];
if (!LOCALES.includes('en')) LOCALES.unshift('en');
const ROUTES = [
  ['home', '#/'], ['lang', '#/?sel=nucl1643'], ['group', '#/?sel=aust1307'], ['near', '#/?sel=@48.85,2.35,300'],
  ['relic', '#/?sel=relic:rosetta'], ['words', '#/words/mother'], ['features', '#/features/tone'], ['stories', '#/stories'],
  ['people', '#/story/people/1'], ['untr', '#/story/untranslatable/2'], ['tree', '#/tree/indo1319'], ['space', '#/space/vocabulary'],
  ['all', '#/all'], ['daily', '#/daily'], ['me', '#/me'], ['about', '#/about'],
];
const VIEWS = [['desk', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]];
// words that are the same in every language: names, sources, codes
const SAME = /^(Terraverba|Glottolog.*|Wikipedia|Wikidata|Wiktionary|Wikimedia Commons|Lingua Libre|ASJP.*|Grambank.*|PHOIBLE.*|WALS|CLDR|UDHR.*|Natural Earth.*|Unicode.*|ISO 639-3.*|CC BY.*|CC0|MIT|kaikki\.org|UMAP|LDND|OK|[A-Z]{2,4}|.*@.*)$/;

const BASE = (process.env.BASE ?? 'http://localhost:5173').replace(/\/$/, '');
const dir = '.shots/qa';
fs.mkdirSync(dir, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new',
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars'],
});
const page = await browser.newPage();
let errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));
page.on('requestfailed', (r) => !/wikipedia|wikimedia/.test(r.url()) && errors.push(`failed: ${r.url()}`));
page.on('response', (r) => r.status() >= 400 && !/wikipedia|wikimedia/.test(r.url()) && errors.push(`${r.status()}: ${r.url()}`));

const english = {};
const report = [];
for (const [vname, vp] of VIEWS) {
  await page.setViewport(vp);
  for (const loc of LOCALES) {
    for (const [rname, hash] of ROUTES) {
      errors = [];
      await page.goto('about:blank');
      await page.goto(`${BASE}/?lang=${loc}${hash}`, { waitUntil: 'networkidle0', timeout: 60000 }).catch((e) => errors.push(`goto: ${e.message}`));
      await new Promise((r) => setTimeout(r, 2200));
      const info = await page.evaluate(() => {
        const vw = innerWidth;
        const visible = (el) => {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && +cs.opacity > 0.05;
        };
        // elements (with their own text) that run past the right edge
        const off = [];
        for (const el of document.querySelectorAll('body *')) {
          if (el.closest('#labels, #relics, #tooltip, #globe, svg, canvas, .crop-modal')) continue;
          if (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
          if (!visible(el)) continue;
          const r = el.getBoundingClientRect();
          // inside a horizontally scrolling box it is fine to be cut
          let p = el.parentElement, scroller = false;
          while (p) {
            const ox = getComputedStyle(p).overflowX;
            if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') { scroller = true; break; }
            p = p.parentElement;
          }
          if (!scroller && r.right > vw + 2) off.push(`${el.tagName.toLowerCase()}.${el.className}: “${el.textContent.trim().slice(0, 40)}” right=${Math.round(r.right)}`);
        }
        const lines = [];
        for (const root of document.querySelectorAll('.topbar, #hero, #panel.on, #sheet, #page, #layers')) {
          if (!visible(root)) continue;
          for (const line of root.innerText.split('\n')) {
            const s = line.trim();
            if (s) lines.push(s);
          }
        }
        return { overflow: document.documentElement.scrollWidth > vw + 1, off: off.slice(0, 8), lines: [...new Set(lines)] };
      });
      const key = `${vname}:${rname}`;
      let untranslated = [];
      if (loc === 'en') english[key] = new Set(info.lines);
      else {
        const en = english[key] ?? new Set();
        untranslated = info.lines.filter((s) => en.has(s) && /[A-Za-z]{3}/.test(s) && /\s/.test(s) && !SAME.test(s));
      }
      await page.screenshot({ path: `${dir}/${vname}_${loc}_${rname}.png` });
      report.push({ view: vname, loc, route: rname, errors: [...new Set(errors)], overflow: info.overflow, off: info.off, untranslated });
      const flags = [errors.length && `${errors.length} errors`, info.overflow && 'h-overflow', info.off.length && `${info.off.length} off-edge`, untranslated.length && `${untranslated.length} same-as-en`].filter(Boolean);
      console.log(vname, loc, rname, flags.join(', ') || 'ok');
    }
  }
}
fs.writeFileSync(`${dir}/report.json`, JSON.stringify(report, null, 1));
await browser.close();
