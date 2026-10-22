// Check fixes for readers' reports in the language panel: the Simplified name,
// the UDHR sample, and "where it is spoken".
//   node tools/report-fixes-test.mjs <base>
import puppeteer from 'puppeteer-core';
import { quiet } from './quiet.mjs';

const base = process.argv[2] ?? 'http://localhost:5173';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
quiet(browser);
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const checks = [['zh-Hans', 'ital1275'], ['zh-Hans', 'stan1290'], ['zh-Hans', 'espe1235'], ['en', 'espe1235'], ['ja', 'inte1239'], ['zh-Hans', 'swah1253'], ['zh-Hant', 'ital1275']];
for (const [lang, id] of checks) {
  await page.goto(`${base}/?lang=${lang}#/?sel=${id}`, { waitUntil: 'networkidle0', timeout: 120000 });
  await new Promise((r) => setTimeout(r, 1800));
  console.log(lang, id, JSON.stringify(await page.evaluate(() => {
    const p = document.querySelector('#panel');
    const fact = [...p.querySelectorAll('.fact')].find((f) => f.querySelector('.places'));
    return { title: p.querySelector('.p-title')?.textContent, where: fact?.querySelector('.places')?.textContent.trim(), sample: p.querySelector('blockquote, .udhr, .sample')?.textContent.trim().slice(0, 60) };
  })));
}
await browser.close();
