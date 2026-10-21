// The site's icons from public/favicon.svg: favicon.ico (16, 32, 48),
// icon-192.png and icon-512.png (search results, the web manifest) and
// apple-touch-icon.png (180, square: iOS rounds it itself). Run on the Mac:
//   node tools/icons.mjs   → public/
import puppeteer from 'puppeteer-core';
import { quiet } from './quiet.mjs';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PUB = new URL('../public/', import.meta.url).pathname;
const svg = fs.readFileSync(path.join(PUB, 'favicon.svg'), 'utf8');
const square = svg.replace(/<rect width="160" height="160" rx="35"/, '<rect width="160" height="160"');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tv-icons-'));
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
quiet(browser);
const page = await browser.newPage();
await page.setViewport({ width: 512, height: 512, deviceScaleFactor: 2 });
for (const [name, src] of [['round', svg], ['square', square]]) {
  await page.setContent(`<html><body style="margin:0;background:transparent">${src.replace('<svg ', '<svg width="512" height="512" ')}</body></html>`);
  await page.screenshot({ path: path.join(tmp, `${name}.png`), omitBackground: true, clip: { x: 0, y: 0, width: 512, height: 512 } });
}
await browser.close();
// resize and pack with Pillow (the data scripts' virtualenv)
execFileSync(path.join(os.homedir(), 'Glossa/data/.venv/bin/python'), ['-c', `
from PIL import Image
import sys
tmp, pub = sys.argv[1], sys.argv[2]
round_, square = Image.open(f"{tmp}/round.png").convert("RGBA"), Image.open(f"{tmp}/square.png").convert("RGBA")
for size, name in ((192, "icon-192.png"), (512, "icon-512.png")):
    round_.resize((size, size), Image.LANCZOS).save(f"{pub}/{name}", optimize=True)
square.convert("RGB").resize((180, 180), Image.LANCZOS).save(f"{pub}/apple-touch-icon.png", optimize=True)
round_.save(f"{pub}/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
`, tmp, PUB]);
fs.writeFileSync(path.join(PUB, 'site.webmanifest'), JSON.stringify({
  name: 'Terraverba',
  short_name: 'Terraverba',
  description: 'An atlas of the world’s languages',
  start_url: '/',
  display: 'standalone',
  background_color: '#0a0e13',
  theme_color: '#0a0e13',
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
  ],
}, null, 2) + '\n');
fs.rmSync(tmp, { recursive: true, force: true });
console.log('icons written to', PUB);
