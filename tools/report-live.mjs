// Send one correction through the real dialog on a deployed site, Turnstile
// included, and report what the endpoint answered.
//   node tools/report-live.mjs https://preview.terraverba.pages.dev [locale] [light]
import puppeteer from 'puppeteer-core';
import { quiet } from './quiet.mjs';

const [base, loc = 'en', light] = process.argv.slice(2);
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new',
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
});
quiet(browser);
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('error', (e) => console.log('page crashed:', e.message));
page.on('framenavigated', (f) => f === page.mainFrame() && console.log('navigated', f.url()));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
let answer = null;
page.on('response', async (r) => r.url().endsWith('/api/report') && (answer = `${r.status()} ${await r.text()}`));
if (light) await page.evaluateOnNewDocument(() => localStorage.setItem('glossa-theme', 'atelier'));
await page.goto(`${base}/?lang=${loc}#/?sel=nucl1643`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForSelector('#panel [data-act=report]', { timeout: 90000 });
await new Promise((r) => setTimeout(r, 1500));
await page.evaluate(() => document.querySelector('#panel [data-act=report]').click());
await page.waitForSelector('#report.on input[name=fix]', { timeout: 15000 }).catch(async (e) => {
  await page.screenshot({ path: '.shots/report-live-fail.png' });
  console.log({ errors });
  throw e;
});
await page.type('#report input[name=fix]', 'Automated test from tools/report-live.mjs, please ignore');
if (process.env.CONTACT) await page.type('#report input[name=contact]', process.env.CONTACT);
// wait for Turnstile to hand over its token
console.log('dialog open, waiting for Turnstile');
const token = await page.waitForFunction(() => document.querySelector('#report [name="cf-turnstile-response"]')?.value, { timeout: 45000 }).then(() => true).catch(() => false);
await page.screenshot({ path: `.shots/report-live-${loc}${light ? '-light' : ''}.png` });
await page.click('#report button[type=submit]');
await new Promise((r) => setTimeout(r, 4000));
const status = await page.evaluate(() => document.querySelector('#report .report-thanks, #report .report-status')?.textContent);
console.log({ token, answer, status, errors });
await browser.close();
