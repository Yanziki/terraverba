// Full-page screenshot of a page under tools/: node tools/shot-page.mjs <page.html> <name>
import puppeteer from 'puppeteer-core';
import { quiet } from './quiet.mjs';
const [page_, out] = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
quiet(browser);
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.setViewport({ width: 1500, height: 900, deviceScaleFactor: 2 });
await page.goto(`http://localhost:5173/tools/${page_}`, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 800));
await page.screenshot({ path: `/Users/yanziki/Glossa/.shots/${out}.png`, fullPage: true });
console.log(JSON.stringify({ errors }));
await browser.close();
