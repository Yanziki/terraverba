// Similarity view: default, a family in focus, grammar, 3D — with screenshots.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const width = Number(process.argv[2] ?? 1440);
await page.setViewport({ width, height: width < 600 ? 844 : 900, deviceScaleFactor: width < 600 ? 2 : 1, isMobile: width < 600, hasTouch: width < 600 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync('.shots/space', { recursive: true });
const pre = width < 600 ? 'm_' : '';
const shot = (n) => page.screenshot({ path: `.shots/space/${pre}${n}.png` });
await page.goto(`http://localhost:5173/?lang=${process.argv[3] ?? 'zh-Hans'}#/space/vocabulary`, { waitUntil: 'networkidle0' });
await sleep(4000);
await shot('1_vocab');
if (width >= 600) {
  await page.click('[data-fam="aust1307"]');
  await sleep(1500);
  await shot('2_focus_austronesian');
  await page.click('[data-fam="aust1307"]');
  await sleep(1200);
  await page.click('[data-act=regions]');
  await sleep(600);
  await shot('3_no_regions');
  await page.click('[data-act=regions]');
  await page.click('[data-kind=grammar]');
  await sleep(4000);
  await shot('4_grammar');
  await page.click('[data-fam="indo1319"]');
  await sleep(1500);
  await shot('5_grammar_ie');
  await page.click('[data-act=all]');
  await page.click('[data-dim="3d"]');
  await sleep(3500);
  await page.click('[data-fam="sino1245"]');
  await sleep(2500);
  await shot('6_3d_sinotibetan');
}
if (width >= 600) {
  // colour by region, on the grammar map, with the caption open
  await page.goto(`http://localhost:5173/?lang=${process.argv[3] ?? 'zh-Hans'}#/space/grammar`, { waitUntil: 'networkidle0' });
  await sleep(3500);
  await page.click('[data-dim="2d"]');
  await sleep(2500);
  await page.click('[data-color=area]');
  await sleep(3000);
  await page.click('[data-act=how]');
  await sleep(500);
  await shot('7_grammar_by_region');
  await page.click('[data-color=family]');
  await sleep(3000);
  // the search box: a language flies into view, a family is shown alone
  const search = async (q) => {
    await page.click('.search input', { clickCount: 3 });
    await page.type('.search input', q, { delay: 30 });
    await sleep(700);
    await page.keyboard.press('Enter');
    await sleep(2000);
  };
  await search(process.argv[4] ?? '巴斯克语');
  await shot('8_search_language');
  await search(process.argv[5] ?? '汉藏语系');
  await shot('9_search_family');
}
console.log(JSON.stringify({ errors }));
await browser.close();
