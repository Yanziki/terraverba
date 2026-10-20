// Screenshot the running site in headless Chrome (macOS, ANGLE/Metal for WebGL).
//   node tools/shot.mjs <url> <out.png> [width] [height] [waitMs] [js-to-eval]
import puppeteer from 'puppeteer-core';

const [url, out, w = '1440', h = '900', wait = '3500', js = ''] = process.argv.slice(2);
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars'],
});
const page = await browser.newPage();
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.setViewport({ width: +w, height: +h, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForSelector('#loading.off', { timeout: 30000 }).catch(() => logs.push('[shot] loading never finished'));
if (js) {
  await new Promise((r) => setTimeout(r, 800));
  await page.evaluate(js);
}
await new Promise((r) => setTimeout(r, +wait));
await page.screenshot({ path: out });
for (const l of logs) if (!l.includes('GPU stall')) console.log(l);
await browser.close();
