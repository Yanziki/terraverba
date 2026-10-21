// Relics of writing: the layer toggle, pins on the globe and the flat map,
// a pin's card, "next", and a link straight to one relic with the layer off.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import { quiet } from './quiet.mjs';
const lang = process.argv[2] ?? 'zh-Hans';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
quiet(browser);
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('response', (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
await page.setViewport({ width: 1440, height: 900 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = (n) => page.screenshot({ path: `.shots/relics/${lang}_${n}.png` });
fs.mkdirSync('.shots/relics', { recursive: true });
const pins = () => page.$$eval('#relics .relic-pin', (els) => els.filter((e) => +e.style.opacity > 0.3).map((e) => e.title));

// a link to one relic, layer off: only that pin
await page.goto(`http://localhost:5173/?lang=${lang}#/?sel=relic:rosetta`, { waitUntil: 'networkidle0' });
await sleep(3500);
const linkOnly = await pins();
const card = await page.$eval('#panel', (p) => ({ title: p.querySelector('.p-title')?.textContent, img: p.querySelector('.relic-figure img')?.naturalWidth, chips: [...p.querySelectorAll('.chip')].map((c) => c.textContent) }));
await shot('1_link');
// layer on: the pins around
await page.evaluate(() => document.querySelector('.layers-head')?.getAttribute('aria-expanded') === 'false' && document.querySelector('.layers-head').click());
await sleep(300);
await page.click('[data-layer=relics]');
await sleep(1200);
const withLayer = await pins();
await shot('2_layer');
// next relic from the card
await page.click('#panel [data-sel^="relic:"]');
await sleep(3000);
const nextTitle = await page.$eval('#panel .p-title', (e) => e.textContent);
await shot('3_next');
// click a pin
await page.goto(`http://localhost:5173/?lang=${lang}#/`, { waitUntil: 'networkidle0' });
await sleep(1500);
await page.evaluate(() => [...document.querySelectorAll('#relics .relic-pin')].find((e) => +e.style.opacity > 0.5)?.click());
await sleep(3000);
const clicked = await page.$eval('#panel .p-title', (e) => e.textContent).catch(() => null);
await shot('4_click');
// flat map
await page.click('[data-mode="2d"]');
await sleep(3500);
await page.goto(`http://localhost:5173/?lang=${lang}#/`, { waitUntil: 'networkidle0' });
await sleep(3000);
const flat = await pins();
await shot('5_flat');
await page.click('[data-mode="3d"]');
await sleep(1500);
console.log(JSON.stringify({ linkOnly, card, withLayer, nextTitle, clicked, flat, errors }, null, 1));
await browser.close();
