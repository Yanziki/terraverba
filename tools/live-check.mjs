// The live site in a browser: script errors, whether the analytics beacon is
// accepted, and where recordings come from with Wikimedia blocked.
//   node tools/live-check.mjs https://terraverba.org
import puppeteer from 'puppeteer-core';

const base = process.argv[2] ?? 'https://terraverba.org';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const errors = [];
const beacon = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('response', (r) => r.url().includes('cloudflareinsights.com') && beacon.push(`${r.status()} ${r.url().split('?')[0]}`));
page.on('requestfailed', (r) => r.url().includes('cloudflareinsights.com') && beacon.push(`failed ${r.url().split('?')[0]} ${r.failure()?.errorText}`));
await page.goto(`${base}/?lang=zh-Hans#/`, { waitUntil: 'networkidle0', timeout: 120000 });
await new Promise((r) => setTimeout(r, 4000));
// a second view, so the beacon has a page change to report
await page.goto(`${base}/?lang=zh-Hans#/stories`, { waitUntil: 'networkidle0', timeout: 120000 });
await new Promise((r) => setTimeout(r, 4000));
console.log(JSON.stringify({ errors, beacon }, null, 1));
await browser.close();
