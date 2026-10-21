// Play the daily quiz through every question type, with screenshots before
// and after each answer: node tools/daily-play.mjs [rounds] [width] [locale]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import { answer } from './daily-answer.mjs';
import { quiet } from './quiet.mjs';
const [rounds = 3, width = 1440, locale = 'zh-Hans'] = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal'] });
quiet(browser);
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const mobile = Number(width) < 600;
await page.setViewport({ width: Number(width), height: mobile ? 844 : 900, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync('.shots/daily', { recursive: true });
await page.evaluateOnNewDocument(() => localStorage.removeItem('glossa-daily-3'));
await page.goto(`http://localhost:5173/?lang=${locale}#/daily`, { waitUntil: 'networkidle0' });
await sleep(3500);
const shot = (name) => page.screenshot({ path: `.shots/daily/${mobile ? 'm_' : ''}${name}.png` });
const log = [];
const seen = new Set();
const click = async (sel) => { await page.$eval(sel, (e) => e.scrollIntoView({ block: 'center' })); await page.click(sel); };
try {
for (let r = 0; r < Number(rounds) && seen.size < 11; r++) {
  for (let i = 0; i < 7; i++) {
    const type = await page.$eval('.daily-body', (e) => [...e.classList].find((c) => c.startsWith('type-')).slice(5));
    const first = !seen.has(type);
    seen.add(type);
    if (first) await shot(`${type}_1`);
    await answer(page, { hint: r % 2 === 0, shot: async (k) => first && shot(`${type}_${k}`) });
    await sleep(2400);
    const result = await page.$eval('.daily-result', (e) => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => null);
    const tier = await page.$eval('.daily-type .tier', (e) => e.textContent).catch(() => null);
    log.push([r, i + 1, type, tier, result]);
    if (first) await shot(`${type}_3`);
    await click('[data-act=next]');
    await sleep(1200);
  }
  if (r === 0) await shot(`done_${r}`);
  if (r < Number(rounds) - 1 && seen.size < 11) { await click('[data-act=practice]'); await sleep(2500); }
}
} catch (e) {
  await shot('error');
  console.log(JSON.stringify({ failed: e.message, log, errors, html: await page.$eval('.daily-body', (x) => x.innerHTML.slice(0, 1500)).catch(() => null) }, null, 1));
  await browser.close();
  process.exit(1);
}
const card = await page.evaluate(async () => {
  const btn = document.querySelector('[data-act=card]');
  const { drawCard } = await import('/src/ui/daily/card.js');
  const tiles = [...document.querySelectorAll('.daily-tiles .tile')].map((t) => ({ points: Number(t.querySelector('b').textContent.replace(/\D/g, '')), label: t.querySelector('span').textContent, grade: t.classList[1] }));
  const blob = await drawCard({ kicker: '每日一题 #2 · 进阶 · 2026-10-20', score: 562, max: 700, stars: 2, best: '进阶最佳：512 分', tiles, url: 'terraverba.org/#/daily' });
  btn.click();
  return new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
});
fs.writeFileSync('.shots/daily/card.png', Buffer.from(card.split(',')[1], 'base64'));
await sleep(800);
console.log(JSON.stringify({ log, errors, seen: [...seen] }, null, 1));
await browser.close();
