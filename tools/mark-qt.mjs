// The Terraverba mark: the quotation T. A squared serif T whose crossbar
// ends in two of Newsreader Bold's own closing quotation marks — ’T’ — so the
// letter of Terra is held in quotes, the words of Verba; the right half of the
// stem is in the accent colour. The body (crossbar, stem, foot) is the
// delivered "C-restructured" 02 drawing (tools/logo-codex/, 160-unit grid);
// its hooked ends are replaced by the quote glyph from tools/nr-glyphs.json
// (Newsreader, SIL Open Font License, weight 800 at optical size 18). Both
// quotes hang head up, so each grows out of the crossbar's end without a notch.
//   node tools/mark-qt.mjs          print the inline mark
//   node tools/mark-qt.mjs --write  put it in index.html, the static pages and public/favicon.svg
import fs from 'node:fs';

const ROOT = new URL('..', import.meta.url);
const QUOTE = JSON.parse(fs.readFileSync(new URL('tools/nr-glyphs.json', ROOT), 'utf8'))['800-18']['’'];

// the 160-unit grid of the delivered drawing
const P = { k: 0.071, x0: 22, x1: 138, top: 34, bar: 22 };
const STEM = 'M66 55.4H94V118Q94 130 108 132V140H52V132Q66 130 66 118Z';
const ACCENT = 'M80 56H94V118Q94 130 108 132V140H80Z';
const VIEW = '14 21 132 132';
const r1 = (s) => s.replace(/-?\d+\.\d+/g, (n) => String(+(+n).toFixed(1)));
const r2 = (v) => +v.toFixed(2);

function parts() {
  const { k, x0, x1, top, bar } = P;
  const [qx0, , qx1, qy1] = QUOTE.bounds;
  const qw = (qx1 - qx0) * k;
  const quote = (x) => `<path transform="translate(${r2(x - qx0 * k)} ${r2(top + qy1 * k)}) scale(${k} ${-k})" d="${r1(QUOTE.d)}"/>`;
  return {
    ink: `<rect x="${r2(x0 + qw * 0.5)}" y="${top}" width="${r2(x1 - x0 - qw)}" height="${bar}"/>${quote(x0)}${quote(x1 - qw)}<path d="${STEM}"/>`,
    accent: `<path d="${ACCENT}"/>`,
  };
}

// inline, coloured by CSS (.mark .ink: currentColor, .mark .accent: the accent)
export function inlineMark(cls = 'mark') {
  const { ink, accent } = parts();
  return `<svg class="${cls}" viewBox="${VIEW}" aria-hidden="true"><g class="ink">${ink}</g><g class="accent">${accent}</g></svg>`;
}

// standalone, on a rounded night tile: the browser tab icon
export function faviconMark({ ground = '#0a0e13', ink = '#f3efe6', accent = '#8fc3ff' } = {}) {
  const p = parts();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><rect width="160" height="160" rx="35" fill="${ground}"/><g transform="translate(80 80) scale(1.08) translate(-80 -87)"><g fill="${ink}">${p.ink}</g><g fill="${accent}">${p.accent}</g></g></svg>`;
}

if (process.argv.includes('--write')) {
  const MARK = /<svg class="mark" viewBox="[^"]*" aria-hidden="true">[\s\S]*?<\/svg>/g;
  const index = new URL('index.html', ROOT);
  const html = fs.readFileSync(index, 'utf8');
  const n = (html.match(MARK) ?? []).length;
  fs.writeFileSync(index, html.replace(MARK, inlineMark()));
  const pages = new URL('tools/build-pages.mjs', ROOT);
  fs.writeFileSync(pages, fs.readFileSync(pages, 'utf8').replace(MARK, inlineMark()));
  fs.writeFileSync(new URL('public/favicon.svg', ROOT), faviconMark());
  console.log(`index.html: ${n} marks; build-pages.mjs and public/favicon.svg written`);
} else {
  console.log(inlineMark());
}
