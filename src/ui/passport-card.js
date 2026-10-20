// The language passport as three 1200×630 PNGs, laid out like a real
// passport — a novelty one, with no state, emblem or valid machine format:
//   cover      a navy booklet with the mark in gold, and who it belongs to
//   data page  photo, name, languages, issue date, reach, a machine-readable zone
//   visa page  an entry stamp per language, in the language's own script
// Pages are paper whatever the site's theme, as a passport's are.
const W = 1200;
const H = 630;

const serif = '"Newsreader Variable", "Newsreader", Georgia, "Songti SC", "Noto Serif CJK SC", serif';
const sans = '"Inter Variable", "Inter", system-ui, "PingFang SC", "Hiragino Sans", "Noto Sans CJK SC", sans-serif';
const mono = '"IBM Plex Mono", ui-monospace, "SF Mono", Menlo, monospace';
// a language's own name may be in any script; the system fills in what Newsreader lacks
const native = '"Newsreader Variable", "Noto Serif", "Songti SC", "Hiragino Mincho ProN", "Apple SD Gothic Neo", system-ui, serif';

const PAPER = {
  ground: ['#f5f1e6', '#ebe5d6'], ink: '#1d2433', muted: 'rgba(29, 36, 51, 0.66)', faint: 'rgba(29, 36, 51, 0.42)',
  rule: 'rgba(29, 36, 51, 0.14)', guilloche: 'rgba(52, 104, 138, 0.13)', accent: '#2c6db3', band: 'rgba(255, 255, 255, 0.62)',
};
const GOLD = ['#efd894', '#c7a052', '#a9832f'];

// ── helpers ─────────────────────────────────────────────────
function fit(ctx, text, max) {
  if (ctx.measureText(text).width <= max) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > max) s = s.slice(0, -1);
  return `${s.trimEnd()}…`;
}

function sizeFor(ctx, text, family, weight, size, min, max) {
  for (let px = size; px > min; px -= 1) {
    ctx.font = `${weight} ${px}px ${family}`;
    if (ctx.measureText(text).width <= max) return px;
  }
  return min;
}

// spaced capitals (upper case where the script has case)
function caps(ctx, text, x, y, { size = 12, color, spacing = 0.16, align = 'left', weight = 600, family = sans } = {}) {
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  const s = String(text).toUpperCase();
  const gap = size * spacing;
  const width = [...s].reduce((w, ch) => w + ctx.measureText(ch).width + gap, -gap);
  let cx = align === 'right' ? x - width : align === 'center' ? x - width / 2 : x;
  for (const ch of s) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + gap;
  }
  return width;
}

// fine interlacing waves, as engraved on passport pages
function waves(ctx, x0, x1, yc, amp, color, strands = 10, period = 120) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.8;
  for (let k = 0; k < strands; k++) {
    const phase = (k / strands) * Math.PI * 2;
    ctx.beginPath();
    for (let x = x0; x <= x1; x += 3) {
      const y = yc + amp * Math.sin((x / period) * Math.PI * 2 + phase) * Math.cos((x / (period * 4.3)) * Math.PI * 2 + phase / 2);
      if (x === x0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function rosette(ctx, cx, cy, R, color, waves_ = 24, depth = 0.07, strands = 12) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.8;
  for (let k = 0; k < strands; k++) {
    const phase = (k / strands) * Math.PI * 2;
    ctx.beginPath();
    for (let i = 0; i <= 900; i++) {
      const t = (i / 900) * Math.PI * 2;
      const r = R * (1 - depth + depth * Math.sin(waves_ * t + phase));
      const x = cx + r * Math.cos(t);
      const y = cy + r * Math.sin(t);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// the site's mark, read from the page, drawn in the given colours
async function mark(ctx, x, y, size, ink, accent, alpha = 1) {
  const svg = (document.querySelector('.topbar .mark') ?? document.querySelector('.mark'))?.cloneNode(true);
  if (!svg) return;
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.setAttribute('width', size * 2);
  svg.setAttribute('height', size * 2);
  svg.querySelector('.ink')?.setAttribute('fill', ink);
  svg.querySelector('.accent')?.setAttribute('fill', accent);
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
  try {
    await img.decode();
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, x, y, size, size);
    ctx.restore();
  } catch {}
}

async function fonts() {
  try {
    await Promise.all([
      document.fonts.load(`400 40px ${serif}`), document.fonts.load(`italic 400 20px ${serif}`), document.fonts.load(`600 40px ${serif}`),
      document.fonts.load(`500 20px ${sans}`), document.fonts.load(`600 20px ${sans}`), document.fonts.load(`400 18px ${mono}`),
    ]);
  } catch {}
}

function canvas2() {
  const c = document.createElement('canvas');
  c.width = W * 2;
  c.height = H * 2;
  const ctx = c.getContext('2d');
  ctx.scale(2, 2);
  ctx.textBaseline = 'alphabetic';
  return [c, ctx];
}
const blob = (c) => new Promise((resolve) => c.toBlob(resolve, 'image/png'));

async function photoImage(src) {
  if (!src) return null;
  const img = new Image();
  img.src = src;
  try {
    await img.decode();
    return img;
  } catch {
    return null;
  }
}

function paper(ctx) {
  const g = ctx.createLinearGradient(0, 0, W * 0.5, H);
  g.addColorStop(0, PAPER.ground[0]);
  g.addColorStop(1, PAPER.ground[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// "Name / NAME": the interface word, and the English one in small capitals
function label(ctx, o, key, x, y) {
  const [local, en] = o.labels[key];
  ctx.font = `500 12.5px ${sans}`;
  ctx.fillStyle = PAPER.faint;
  ctx.textAlign = 'left';
  let w = 0;
  if (local && local.toLowerCase() !== en.toLowerCase()) {
    ctx.fillText(local, x, y);
    w = ctx.measureText(local).width + 8;
    ctx.fillText('/', x + w, y);
    w += 12;
  }
  caps(ctx, en, x + w, y, { size: 10, color: PAPER.faint, weight: 600, spacing: 0.14 });
}

/* o = {
     labels: { key: [interface word, English] }, title, titleEn, tagline, ofName, coverLine,
     holder: { name, latin, photo }, number, issued, issuedShort, url,
     langs: [{ id, name, native, family, color, level, levelLabel, levelEn }],
     natives, others, reach, reachLabel, stats: [[value, labelKey], …],
     mrz: [line, line], more: (n) => text,
   } */

// ── cover ───────────────────────────────────────────────────
export async function drawCover(o) {
  await fonts();
  const [c, ctx] = canvas2();
  const bg = ctx.createRadialGradient(W * 0.3, H * 0.2, 40, W * 0.45, H * 0.5, W * 0.85);
  bg.addColorStop(0, '#17222e');
  bg.addColorStop(1, '#090d12');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // the booklet, tilted a touch, with a soft shadow
  const bx = 118, by = 52, bw = 372, bh = 526;
  ctx.save();
  ctx.translate(bx + bw / 2, by + bh / 2);
  ctx.rotate(-0.025);
  ctx.translate(-bw / 2, -bh / 2);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 18;
  const leather = ctx.createLinearGradient(0, 0, bw, bh);
  leather.addColorStop(0, '#23395c');
  leather.addColorStop(1, '#15243c');
  ctx.fillStyle = leather;
  ctx.beginPath();
  ctx.roundRect(0, 0, bw, bh, [8, 22, 22, 8]);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  // the spine's fold
  const fold = ctx.createLinearGradient(0, 0, 26, 0);
  fold.addColorStop(0, 'rgba(0, 0, 0, 0.35)');
  fold.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = fold;
  ctx.fillRect(0, 0, 26, bh);
  const gold = ctx.createLinearGradient(0, 80, 0, bh - 60);
  gold.addColorStop(0, GOLD[0]);
  gold.addColorStop(0.55, GOLD[1]);
  gold.addColorStop(1, GOLD[2]);
  // a blind-stamped frame
  ctx.strokeStyle = 'rgba(239, 216, 148, 0.28)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(22, 22, bw - 44, bh - 44, 12);
  ctx.stroke();
  caps(ctx, o.titleEn, bw / 2, 96, { size: 17, color: gold, align: 'center', spacing: 0.24, weight: 600 });
  if (o.title && o.title.toUpperCase() !== o.titleEn.toUpperCase()) {
    ctx.font = `600 30px ${serif}`;
    ctx.fillStyle = gold;
    ctx.textAlign = 'center';
    ctx.fillText(o.title, bw / 2, 140);
  }
  await mark(ctx, bw / 2 - 86, 176, 172, GOLD[0], GOLD[1]);
  caps(ctx, 'Terraverba', bw / 2, 412, { size: 19, color: gold, align: 'center', spacing: 0.32, weight: 600 });
  ctx.fillStyle = 'rgba(239, 216, 148, 0.5)';
  ctx.fillRect(bw / 2 - 30, 432, 60, 1);
  ctx.font = `italic 400 15px ${serif}`;
  ctx.fillStyle = 'rgba(239, 216, 148, 0.72)';
  ctx.textAlign = 'center';
  ctx.fillText(fit(ctx, o.tagline, bw - 80), bw / 2, 462);
  ctx.restore();

  // beside it: whose it is, and what it holds
  const x = 600;
  ctx.textAlign = 'left';
  caps(ctx, o.titleEn, x, 140, { size: 12.5, color: '#8fc3ff', spacing: 0.2 });
  const name = o.ofName;
  ctx.font = `600 ${sizeFor(ctx, name, serif, 600, 44, 26, W - x - 70)}px ${serif}`;
  ctx.fillStyle = '#eef1f4';
  ctx.fillText(fit(ctx, name, W - x - 70), x, 196);
  ctx.font = `400 21px ${sans}`;
  ctx.fillStyle = 'rgba(232, 237, 242, 0.7)';
  ctx.fillText(fit(ctx, o.coverLine, W - x - 70), x, 236);
  // the languages in their own words
  const shown = o.langs.slice(0, 6);
  shown.forEach((l, i) => {
    const y = 300 + i * 44;
    ctx.beginPath();
    ctx.arc(x + 5, y - 7, 5, 0, Math.PI * 2);
    ctx.fillStyle = l.color;
    ctx.fill();
    ctx.font = `400 27px ${native}`;
    ctx.fillStyle = '#eef1f4';
    ctx.textAlign = 'left';
    const own = fit(ctx, l.native || l.name, 320);
    ctx.fillText(own, x + 22, y);
    const w = ctx.measureText(own).width;
    ctx.font = `400 15px ${sans}`;
    ctx.fillStyle = 'rgba(232, 237, 242, 0.45)';
    if (l.native && l.native !== l.name) ctx.fillText(fit(ctx, l.name, W - 70 - (x + 22 + w + 12)), x + 22 + w + 12, y);
  });
  if (o.langs.length > shown.length) {
    ctx.font = `italic 400 19px ${serif}`;
    ctx.fillStyle = 'rgba(232, 237, 242, 0.55)';
    ctx.fillText(o.more(o.langs.length - shown.length), x + 22, 300 + shown.length * 44);
  }
  ctx.font = `400 13px ${mono}`;
  ctx.fillStyle = 'rgba(232, 237, 242, 0.4)';
  ctx.fillText(o.url, x, H - 52);
  return blob(c);
}

// ── data page ───────────────────────────────────────────────
export async function drawDataPage(o) {
  await fonts();
  const [c, ctx] = canvas2();
  paper(ctx);
  // the security print sits behind the fields, faint enough never to compete with them
  waves(ctx, 0, W, 18, 10, PAPER.guilloche, 12, 140);
  rosette(ctx, 1010, 330, 190, 'rgba(52, 104, 138, 0.075)');
  await mark(ctx, 930, 250, 160, 'rgba(44, 109, 179, 0.045)', 'rgba(44, 109, 179, 0.06)');

  // header
  const M = 60;
  caps(ctx, o.titleEn, M, 70, { size: 14, color: PAPER.accent, spacing: 0.22 });
  if (o.title && o.title.toUpperCase() !== o.titleEn.toUpperCase()) {
    ctx.font = `600 22px ${serif}`;
    ctx.fillStyle = PAPER.ink;
    ctx.textAlign = 'left';
    ctx.fillText(o.title, M, 102);
  }
  await mark(ctx, W - M - 168, 47, 30, PAPER.ink, PAPER.accent);
  caps(ctx, 'Terraverba', W - M, 70, { size: 13, color: PAPER.ink, align: 'right', spacing: 0.24 });
  // type, code, number
  const top = [['type', 'P', 0], ['code', 'TVB', 110], ['number', o.number, 230]];
  for (const [key, value, dx] of top) {
    const tx = W - M - 470 + dx;
    label(ctx, o, key, tx, 100);
    ctx.font = `500 17px ${mono}`;
    ctx.fillStyle = PAPER.ink;
    ctx.textAlign = 'left';
    ctx.fillText(value, tx, 122);
  }
  ctx.fillStyle = PAPER.rule;
  ctx.fillRect(M, 140, W - 2 * M, 1);

  // the photo, or a quiet silhouette
  const px = M, py = 162, pw = 204, ph = 272;
  const img = await photoImage(o.holder.photo);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, 6);
  ctx.clip();
  if (img) ctx.drawImage(img, px, py, pw, ph);
  else {
    ctx.fillStyle = '#dfe4e6';
    ctx.fillRect(px, py, pw, ph);
    ctx.fillStyle = 'rgba(29, 36, 51, 0.16)';
    ctx.beginPath();
    ctx.arc(px + pw / 2, py + 108, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(px + pw / 2, py + ph + 18, 92, 110, 0, Math.PI, 0);
    ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = PAPER.rule;
  ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);

  // the fields
  const fx = px + pw + 44;
  const colW = 380;
  const field = (key, value, x, y, { size = 25, family = serif, max = colW } = {}) => {
    label(ctx, o, key, x, y);
    ctx.font = `500 ${sizeFor(ctx, value, family, 500, size, 15, max)}px ${family}`;
    ctx.fillStyle = PAPER.ink;
    ctx.textAlign = 'left';
    ctx.fillText(fit(ctx, value, max), x, y + 31);
  };
  field('name', o.holder.name, fx, 178);
  if (o.holder.latin && o.holder.latin !== o.holder.name) {
    ctx.font = `500 13px ${mono}`;
    ctx.fillStyle = PAPER.muted;
    ctx.fillText(fit(ctx, o.holder.latin.toUpperCase(), colW), fx, 230);
  }
  field('native', o.natives || '—', fx, 256);
  field('other', o.others || '—', fx, 326, { size: 21 });
  // the languages still being learned, on a line of their own
  if (o.learning) {
    ctx.font = `500 15px ${sans}`;
    ctx.fillStyle = PAPER.muted;
    ctx.fillText(fit(ctx, o.learning, colW), fx, 381);
  }
  field('issued', o.issued, fx, 410, { size: 19, family: mono });
  // the right column: reach and counts
  const rx = fx + colW + 50;
  label(ctx, o, 'reach', rx, 186);
  ctx.font = `600 ${sizeFor(ctx, o.reach, serif, 600, 54, 30, W - M - rx)}px ${serif}`;
  ctx.fillStyle = PAPER.ink;
  ctx.textAlign = 'left';
  ctx.fillText(o.reach, rx, 240);
  ctx.font = `400 14px ${sans}`;
  ctx.fillStyle = PAPER.muted;
  ctx.fillText(fit(ctx, o.reachLabel, W - M - rx), rx, 262);
  o.stats.slice(0, 3).forEach(([value, key], i) => {
    const y = 300 + i * 52;
    label(ctx, o, key, rx, y);
    ctx.font = `500 24px ${serif}`;
    ctx.fillStyle = PAPER.ink;
    ctx.textAlign = 'left';
    ctx.fillText(String(value), rx, y + 28);
  });
  // the ghost portrait, faint, as on a real data page
  if (img) {
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.filter = 'grayscale(1)';
    ctx.drawImage(img, W - M - 66, 360, 66, 88);
    ctx.restore();
  }
  label(ctx, o, 'authority', fx, 470);
  ctx.font = `500 16px ${sans}`;
  ctx.fillStyle = PAPER.ink;
  ctx.textAlign = 'left';
  ctx.fillText(fit(ctx, `Terraverba · ${o.tagline}`, W - M - fx), fx, 496);

  // the machine-readable zone
  ctx.fillStyle = PAPER.band;
  ctx.fillRect(0, 524, W, H - 524);
  ctx.fillStyle = PAPER.rule;
  ctx.fillRect(0, 524, W, 1);
  ctx.font = `500 25px ${mono}`;
  ctx.fillStyle = PAPER.ink;
  ctx.textAlign = 'left';
  const pitch = (W - 2 * M) / 44;
  o.mrz.forEach((line, r) => [...line.padEnd(44, '<').slice(0, 44)].forEach((ch, i) => ctx.fillText(ch, M + i * pitch, 566 + r * 36)));
  return blob(c);
}

// ── visa page ───────────────────────────────────────────────
// each stamp's tilt and nudge come from its language, so a passport always looks the same
const seeded = (s) => {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
};

// the ink of a stamp: the family's colour, darkened toward the page's ink
function inkOf(hex) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v, i) => Math.round(v * 0.62 + [29, 36, 51][i] * 0.38));
  return `rgb(${c.join(',')})`;
}

function textOnArc(ctx, text, cx, cy, r, centre, size, color, below = false) {
  ctx.save();
  ctx.font = `600 ${size}px ${sans}`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  const chars = [...text.toUpperCase()];
  const widths = chars.map((ch) => ctx.measureText(ch).width + size * 0.16);
  const total = widths.reduce((a, b) => a + b, 0) / r;
  // above the centre the text runs clockwise; below, anticlockwise so it reads upright
  let a = below ? centre + total / 2 : centre - total / 2;
  chars.forEach((ch, i) => {
    const step = widths[i] / r;
    a += below ? -step / 2 : step / 2;
    ctx.save();
    ctx.translate(cx + r * Math.cos(a), cy + r * Math.sin(a));
    ctx.rotate(below ? a - Math.PI / 2 : a + Math.PI / 2);
    ctx.fillText(ch, 0, below ? size * 0.35 : 0);
    ctx.restore();
    a += below ? -step / 2 : step / 2;
  });
  ctx.restore();
}

function stamp(ctx, l, cx, cy, o, scale = 1) {
  const rand = seeded(l.id ?? l.name);
  const ink = inkOf(String(l.color).startsWith('#') ? l.color : '#2c6db3');
  ctx.save();
  ctx.translate(cx + (rand() - 0.5) * 30, cy + (rand() - 0.5) * 22);
  ctx.rotate((rand() - 0.5) * 0.36);
  ctx.scale(scale, scale);
  ctx.globalAlpha = 0.84 + rand() * 0.1;
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  const own = l.native || l.name;
  const date = o.issuedShort;
  // the level in English and in the reader's language (once, when they are the same)
  const kind = l.levelLabel.toLowerCase() === l.levelEn.toLowerCase() ? l.levelEn : `${l.levelEn} · ${l.levelLabel}`;
  ctx.textAlign = 'center';
  if (l.level === 'native') {
    // a round residence stamp: two rings, the kind around the top, the name of the atlas below
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 92, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, 70, 0, Math.PI * 2);
    ctx.stroke();
    textOnArc(ctx, kind, 0, 0, 78, -Math.PI / 2, 12, ink);
    textOnArc(ctx, 'Terraverba', 0, 0, 78, Math.PI / 2, 11, ink, true);
    ctx.font = `600 ${sizeFor(ctx, own, native, 600, 34, 16, 116)}px ${native}`;
    ctx.fillText(fit(ctx, own, 116), 0, 6);
    ctx.font = `500 11px ${mono}`;
    ctx.fillText(date, 0, 30);
  } else if (l.level === 'fluent') {
    // a rectangular entry stamp with clipped corners
    const w = 236, h = 146, k = 14;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + k, -h / 2);
    ctx.lineTo(w / 2 - k, -h / 2);
    ctx.lineTo(w / 2, -h / 2 + k);
    ctx.lineTo(w / 2, h / 2 - k);
    ctx.lineTo(w / 2 - k, h / 2);
    ctx.lineTo(-w / 2 + k, h / 2);
    ctx.lineTo(-w / 2, h / 2 - k);
    ctx.lineTo(-w / 2, -h / 2 + k);
    ctx.closePath();
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeRect(-w / 2 + 9, -h / 2 + 9, w - 18, h - 18);
    caps(ctx, kind, 0, -h / 2 + 32, { size: 11.5, color: ink, align: 'center', spacing: 0.16 });
    ctx.textAlign = 'center';
    ctx.font = `600 ${sizeFor(ctx, own, native, 600, 36, 16, w - 40)}px ${native}`;
    ctx.fillText(fit(ctx, own, w - 40), 0, 16);
    caps(ctx, `${o.labels.entry[1]} ${date}`, 0, h / 2 - 22, { size: 11, color: ink, align: 'center', family: mono, weight: 500, spacing: 0.08 });
  } else {
    // a dashed transit stamp, for languages still being learned
    const w = 224, h = 132;
    ctx.lineWidth = 2.4;
    ctx.setLineDash([9, 6]);
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 26);
    ctx.stroke();
    ctx.setLineDash([]);
    caps(ctx, kind, 0, -h / 2 + 30, { size: 11.5, color: ink, align: 'center', spacing: 0.16 });
    ctx.textAlign = 'center';
    ctx.font = `600 ${sizeFor(ctx, own, native, 600, 32, 16, w - 40)}px ${native}`;
    ctx.fillText(fit(ctx, own, w - 40), 0, 14);
    caps(ctx, `${o.labels.transit[1]} ${date}`, 0, h / 2 - 20, { size: 11, color: ink, align: 'center', family: mono, weight: 500, spacing: 0.08 });
  }
  ctx.restore();
}

export async function drawVisaPage(o) {
  await fonts();
  const [c, ctx] = canvas2();
  paper(ctx);
  waves(ctx, 0, W, H - 40, 14, PAPER.guilloche, 10, 160);
  rosette(ctx, W / 2, H / 2, 250, 'rgba(52, 104, 138, 0.06)');
  const M = 60;
  caps(ctx, o.labels.visas[1], M, 66, { size: 14, color: PAPER.accent, spacing: 0.24 });
  if (o.labels.visas[0] && o.labels.visas[0].toUpperCase() !== o.labels.visas[1].toUpperCase()) {
    ctx.font = `600 20px ${serif}`;
    ctx.fillStyle = PAPER.ink;
    ctx.textAlign = 'left';
    ctx.fillText(o.labels.visas[0], M, 96);
  }
  ctx.font = `italic 400 22px ${serif}`;
  ctx.fillStyle = PAPER.faint;
  ctx.textAlign = 'right';
  ctx.fillText('3', W - M, 66);
  ctx.font = `500 12px ${mono}`;
  ctx.fillText(o.number, W - M, 92);

  // up to eight stamps on a loose grid; native languages first
  const rank = (l) => ['native', 'fluent', 'learning'].indexOf(l.level);
  const order = [...o.langs].sort((a, b) => rank(a) - rank(b));
  const cap = 8;
  const shown = order.length > cap ? order.slice(0, cap - 1) : order;
  const n = shown.length + (order.length > cap ? 1 : 0);
  const cols = n <= 3 ? Math.max(n, 1) : n === 4 ? 2 : n <= 6 ? 3 : 4;
  const rows = Math.ceil(n / cols);
  const cellW = (W - 2 * M) / cols;
  const cellH = rows === 1 ? 380 : 236;
  const y0 = rows === 1 ? 130 : 118;
  // a few stamps are struck larger, so a short passport does not look empty
  const scale = n <= 2 ? 1.45 : n <= 4 ? 1.15 : 1;
  shown.forEach((l, i) => stamp(ctx, l, M + cellW * ((i % cols) + 0.5), y0 + cellH * (Math.floor(i / cols) + 0.5), o, scale));
  if (order.length > cap) {
    const i = shown.length;
    ctx.font = `italic 400 24px ${serif}`;
    ctx.fillStyle = PAPER.muted;
    ctx.textAlign = 'center';
    ctx.fillText(o.more(order.length - shown.length), M + cellW * ((i % cols) + 0.5), y0 + cellH * (Math.floor(i / cols) + 0.5));
  }
  return blob(c);
}
