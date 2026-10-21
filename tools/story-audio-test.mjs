// Recordings in the stories' tables: which cells get a button, one played,
// "listen to all" started and stopped, no errors; screenshots in .shots/storyaudio/.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import { quiet } from './quiet.mjs';
const dir = '.shots/storyaudio';
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
const lang = process.argv[2] ?? 'zh-Hans';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] });
quiet(browser);
const page = await browser.newPage();
const errors = [];
const played = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('response', (r) => r.url().includes('upload.wikimedia.org') && played.push(`${r.status()} ${decodeURIComponent(r.url().split('/').pop())}`));
await page.setViewport({ width: 1440, height: 900 });
const out = [];
for (const [story, ch] of [['tea', 1], ['tea', 2], ['untranslatable', 0], ['isolates', 0], ['sinitic', 2], ['americas', 3]]) {
  await page.goto(`http://localhost:5173/?lang=${lang}#/story/${story}/${ch}`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 2500));
  const n = await page.$$eval('td .say', (b) => b.length);
  const cells = await page.$$eval('td[data-audio]', (b) => b.length);
  if (n) {
    await page.click('td .say');
    await new Promise((r) => setTimeout(r, 2200));
  }
  const credit = await page.$eval('.story-credit', (e) => e.textContent).catch(() => '');
  const all = await page.$('.story-listen [data-act=all]:not([hidden])');
  if (all) {
    await all.click();
    await new Promise((r) => setTimeout(r, 2500));
    await page.screenshot({ path: `${dir}/${story}_${ch}.png` });
    await all.click();
  } else await page.screenshot({ path: `${dir}/${story}_${ch}.png` });
  out.push(`${story}/${ch}: ${n}/${cells} cells · ${credit.slice(0, 70)}`);
}
// leaving the story stops the sound
await page.goto(`http://localhost:5173/?lang=${lang}#/`, { waitUntil: 'networkidle0' });
console.log(out.join('\n'));
console.log(JSON.stringify({ played: played.slice(0, 8), bad: played.filter((p) => !/^20[06]/.test(p)), errors }, null, 1));
await browser.close();
