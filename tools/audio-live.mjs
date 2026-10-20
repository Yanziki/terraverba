// Play recordings on a deployed site and see where each one came from: the
// mirror or Wikimedia Commons. With "nocommons", upload.wikimedia.org is
// blocked, so every play must come from the mirror.
//   node tools/audio-live.mjs https://preview.terraverba.pages.dev [nocommons]
import puppeteer from 'puppeteer-core';

const [base, mode] = process.argv.slice(2);
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new',
  args: ['--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const heard = [];
await page.setRequestInterception(true);
page.on('request', (r) => (mode === 'nocommons' && r.url().includes('upload.wikimedia.org') ? r.abort('blockedbyclient') : r.continue()));
page.on('response', (r) => /audio|upload\.wikimedia/.test(new URL(r.url()).host) && heard.push(`${r.status()} ${new URL(r.url()).host} ${decodeURIComponent(r.url().split('/').pop())}`));
page.on('requestfailed', (r) => /audio|upload\.wikimedia/.test(new URL(r.url()).host) && heard.push(`failed ${new URL(r.url()).host} ${decodeURIComponent(r.url().split('/').pop())}`));
// count the recordings that really started playing
await page.evaluateOnNewDocument(() => {
  window.__playing = [];
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    this.addEventListener('playing', () => window.__playing.push(this.currentSrc), { once: true });
    return play.call(this);
  };
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const playing = [];
for (const [hash, sel] of [['#/words/mother', '.listen .listen-chip'], ['#/?sel=czec1258', '.listen-lang .listen-chip'], ['#/story/tea/1', 'td .say']]) {
  await page.goto(`${base}/?lang=en${hash}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForSelector(sel, { timeout: 60000 }).catch(() => errors.push(`no ${sel} on ${hash}`));
  const chips = await page.$$(sel);
  for (const c of chips.slice(0, 3)) {
    await c.click().catch(() => {});
    await sleep(3500);
  }
  playing.push(...(await page.evaluate(() => window.__playing.map((u) => new URL(u).host))));
}
console.log(JSON.stringify({ playing, heard, errors }, null, 1));
await browser.close();
