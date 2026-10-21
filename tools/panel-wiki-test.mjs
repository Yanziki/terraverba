// A language panel's Wikipedia summary and similar languages, in several
// interface languages; with "nowiki" every Wikipedia request is blocked, so
// the stored copies (public/data/wiki) must stand in.
//   node tools/panel-wiki-test.mjs <base> <id,id> [nowiki]
import puppeteer from 'puppeteer-core';

const [base, ids, mode] = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.setRequestInterception(true);
page.on('request', (r) => (mode === 'nowiki' && /wikipedia\.org/.test(r.url()) ? r.abort('blockedbyclient') : r.continue()));
for (const id of ids.split(',')) {
  for (const lang of ['zh-Hans', 'en', 'ja', 'es']) {
    await page.goto(`${base}/?lang=${lang}#/?sel=${id}`, { waitUntil: 'networkidle0', timeout: 120000 });
    await new Promise((r) => setTimeout(r, 2500));
    const r = await page.evaluate(() => {
      const p = document.querySelector('#panel');
      const wiki = p.querySelector('.wiki, .p-wiki, [class*="wiki"]');
      const text = p.innerText;
      const sim = [...p.querySelectorAll('.rl-sub')].length;
      return { wiki: wiki ? wiki.innerText.replace(/\s+/g, ' ').slice(0, 70) : null, noArticle: /还没有这种语言的条目|no article|記事はまだ|todavía no/i.test(text), similarRows: sim };
    });
    console.log(id, lang, mode ?? 'live', JSON.stringify(r));
  }
}
await browser.close();
