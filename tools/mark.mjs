// The Terraverba mark: a sparse halftone globe lit from the upper left, with
// one dot — a language — in the accent colour. Five rows at large sizes;
// four at 32 px and under, so the dots never crowd.
//   node tools/mark.mjs [rows] [--favicon]
const C = 16, R = 14;
const L = (() => { const v = [-0.5, -0.55, 0.67]; const n = Math.hypot(...v); return v.map((x) => x / n); })();
export function mark(rows = 5, { favicon = false } = {}) {
  const step = (2 * R) / rows;
  const dots = [];
  let best = null;
  for (let i = 0; i < rows; i++) {
    const y = C - R + step * (i + 0.5);
    const half = Math.sqrt(Math.max(0, R * R - (y - C) ** 2));
    const n = Math.max(1, Math.round((2 * half) / step));
    for (let j = 0; j < n; j++) {
      const x = C - half + ((2 * half) / n) * (j + 0.5);
      const dx = (x - C) / R, dy = (y - C) / R;
      const nz = Math.sqrt(Math.max(0, 1 - dx * dx - dy * dy));
      const lit = Math.max(0, dx * L[0] + dy * L[1] + nz * L[2]);
      dots.push([x, y, step * 0.5 * (0.3 + 0.48 * lit ** 0.8) * (0.85 + 0.15 * nz)]);
      const d = Math.hypot(x - (C - 4.6), y - (C - 4.2));
      if (!best || d < best.d) best = { d, k: dots.length - 1 };
    }
  }
  const f = (v) => +v.toFixed(2);
  const body = dots.map(([x, y, r], k) => (k === best.k ? '' : `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}"/>`)).join('');
  const [ax, ay, ar] = dots[best.k];
  const accent = `<circle cx="${f(ax)}" cy="${f(ay)}" r="${f(ar * 1.12)}"${favicon ? ' fill="#8fc3ff"' : ' class="accent"'}/>`;
  return favicon
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#0a0e13"/><g fill="#e6edf3">${body}</g>${accent}</svg>`
    : `<g class="dots">${body}</g>${accent}`;
}
if (process.argv[1].endsWith('mark.mjs')) {
  const rows = +(process.argv.find((a) => /^\d+$/.test(a)) ?? 5);
  console.log(mark(rows, { favicon: process.argv.includes('--favicon') }));
}
