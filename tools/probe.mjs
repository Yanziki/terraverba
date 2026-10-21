// Evaluate an expression on a page after load: node tools/probe.mjs <url> <js>
import puppeteer from 'puppeteer-core';
import { quiet } from './quiet.mjs';
const [url, js] = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal'] });
quiet(browser);
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => m.type() === 'error' && console.log('[console]', m.text()));
await page.setViewport({ width: 1440, height: 900 });
await page.goto(url, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 3000));
console.log(JSON.stringify(await page.evaluate(js), null, 1));
await browser.close();
