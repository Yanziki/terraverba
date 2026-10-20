// The result card: a 1200×630 PNG to share, drawn on a canvas in the
// Nocturne palette with the sparse halftone mark (as in tools/mark.mjs).
const W = 1200;
const H = 630;
const ACCENT = '#8fc3ff';
const GRADE = { ok: '#5fb27c', mid: '#d3c57e', bad: '#2c3743' };

function mark(ctx, x0, y0, size, rows = 5) {
  const C = 16;
  const R = 14;
  const k = size / 32;
  const v = [-0.5, -0.55, 0.67];
  const n = Math.hypot(...v);
  const light = v.map((x) => x / n);
  const step = (2 * R) / rows;
  let best = null;
  const dots = [];
  for (let i = 0; i < rows; i++) {
    const y = C - R + step * (i + 0.5);
    const half = Math.sqrt(Math.max(0, R * R - (y - C) ** 2));
    const cols = Math.max(1, Math.round((2 * half) / step));
    for (let j = 0; j < cols; j++) {
      const x = C - half + ((2 * half) / cols) * (j + 0.5);
      const dx = (x - C) / R;
      const dy = (y - C) / R;
      const nz = Math.sqrt(Math.max(0, 1 - dx * dx - dy * dy));
      const lit = Math.max(0, dx * light[0] + dy * light[1] + nz * light[2]);
      dots.push([x, y, step * 0.5 * (0.3 + 0.48 * lit ** 0.8) * (0.85 + 0.15 * nz)]);
      const d = Math.hypot(x - (C - 4.6), y - (C - 4.2));
      if (!best || d < best.d) best = { d, i: dots.length - 1 };
    }
  }
  dots.forEach(([x, y, r], i) => {
    ctx.fillStyle = i === best.i ? ACCENT : '#e6edf3';
    ctx.beginPath();
    ctx.arc(x0 + x * k, y0 + y * k, (i === best.i ? r * 1.12 : r) * k, 0, Math.PI * 2);
    ctx.fill();
  });
}

function globe(ctx, cx, cy, r) {
  const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
  g.addColorStop(0, 'rgba(120, 156, 196, 0.16)');
  g.addColorStop(1, 'rgba(120, 156, 196, 0.03)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = 'rgba(200, 220, 240, 0.08)';
  ctx.lineWidth = 1.2;
  ctx.translate(cx, cy);
  ctx.rotate(-0.28);
  for (const k of [0.32, 0.68, 1]) {
    ctx.beginPath();
    ctx.ellipse(0, 0, r * k, r, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const y of [-0.66, -0.34, 0, 0.34, 0.66]) {
    const half = r * Math.sqrt(1 - y * y);
    ctx.beginPath();
    ctx.ellipse(0, y * r, half, half * 0.16, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(143, 195, 255, 0.28)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI * 0.62, Math.PI * 1.32);
  ctx.stroke();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

// { kicker, score, max, stars, tiles: [{ label, points, grade }], best, url, title, sans, serif }
export async function drawCard(o) {
  const serif = '"Newsreader Variable", "Newsreader", Georgia, serif';
  const sans = '"Inter Variable", "Inter", system-ui, "PingFang SC", "Hiragino Sans", "Noto Sans CJK SC", sans-serif';
  try {
    await Promise.all([document.fonts.load(`500 40px ${serif}`), document.fonts.load(`500 20px ${sans}`)]);
  } catch {}
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const bg = ctx.createRadialGradient(W * 0.72, H * 0.1, 40, W * 0.6, H * 0.4, W * 0.85);
  bg.addColorStop(0, '#17222e');
  bg.addColorStop(1, '#0a0e13');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // a large, faint globe bleeding off the right edge
  globe(ctx, W - 150, 250, 330);

  const L = 84;
  mark(ctx, L, 70, 44, 5);
  ctx.fillStyle = '#eef1f4';
  ctx.font = `500 34px ${serif}`;
  ctx.textBaseline = 'middle';
  ctx.fillText('Terraverba', L + 60, 93);

  ctx.font = `600 19px ${sans}`;
  ctx.fillStyle = ACCENT;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(o.kicker, L, 196);

  ctx.font = `500 168px ${serif}`;
  ctx.fillStyle = '#f2f5f8';
  const s = String(o.score);
  ctx.fillText(s, L - 6, 352);
  const sw = ctx.measureText(s).width;
  ctx.font = `400 46px ${serif}`;
  ctx.fillStyle = 'rgba(232, 237, 242, 0.45)';
  ctx.fillText(`/ ${o.max}`, L + sw + 8, 352);

  // stars
  for (let i = 0; i < 3; i++) {
    const cx = L + 18 + i * 44;
    const cy = 404;
    ctx.beginPath();
    for (let p = 0; p < 10; p++) {
      const r = p % 2 ? 7.5 : 17;
      const a = -Math.PI / 2 + (p * Math.PI) / 5;
      ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
    ctx.closePath();
    ctx.fillStyle = i < o.stars ? ACCENT : 'rgba(232, 237, 242, 0.14)';
    ctx.fill();
  }
  if (o.best) {
    ctx.font = `500 19px ${sans}`;
    ctx.fillStyle = 'rgba(232, 237, 242, 0.62)';
    ctx.fillText(o.best, L + 150, 411);
  }

  // one tile per question, as wide as the row allows
  const gap = 12;
  const tw = Math.min(156, (W - 2 * L - gap * (o.tiles.length - 1)) / o.tiles.length);
  const top = 462;
  o.tiles.forEach((tile, i) => {
    const x = L + i * (tw + gap);
    roundRect(ctx, x, top, tw, 92, 16);
    ctx.fillStyle = GRADE[tile.grade];
    ctx.globalAlpha = tile.grade === 'bad' ? 1 : 0.22;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = GRADE[tile.grade];
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#eef1f4';
    ctx.font = `500 34px ${serif}`;
    ctx.fillText(String(tile.points), x + 18, top + 46);
    ctx.font = `500 ${tw < 150 ? 14 : 15}px ${sans}`;
    ctx.fillStyle = 'rgba(232, 237, 242, 0.7)';
    let label = tile.label;
    while (ctx.measureText(label).width > tw - 30 && label.length > 2) label = `${label.slice(0, -2)}…`;
    ctx.fillText(label, x + 18, top + 74);
  });

  ctx.font = `500 17px ${sans}`;
  ctx.fillStyle = 'rgba(232, 237, 242, 0.5)';
  ctx.fillText(o.url, L, H - 34);

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}
