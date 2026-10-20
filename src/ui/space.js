import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { select } from 'd3-selection';
import 'd3-transition';
import { zoom as d3zoom, zoomIdentity } from 'd3-zoom';
import { familyColor, FAMILY, INK, ACCENT } from '../palette.js';
import { THEME } from '../theme.js';
import { GFX } from '../globe.js';
import { t, formatNumber } from '../i18n/index.js';
import { esc, icon } from './html.js';

// Language space: each language placed by how alike it is to the others
// (UMAP of vocabulary or grammar distances, computed in data/similarity.py).
// The 2D view is a pannable canvas; the 3D view is a slowly turning cloud.
const WIDE = /[ᄀ-ᇿ⺀-鿿가-힯]/;
// a thin ring in the ground colour keeps touching dots apart without washing them out
const RING = THEME.lift ? '#0a0e13' : '#f7f2e8';
// languages outside the family in focus
const MUTED = THEME.lift ? '#3a4552' : '#d6cfc2';
const REGIONS_KEY = 'glossa-space-regions';
const COLOR_KEY = 'glossa-space-color';
// the six Glottolog macroareas, for colouring by region: picked so every pair
// stays apart for normal and colour-blind vision on the dark ground (all-pairs
// ΔE ≥ 18 normal, ≥ 9.8 protan/deutan), with names on the map as well
const AREA_COLORS = { Africa: '#827a1c', Eurasia: '#e75e6e', Papunesia: '#10a6ad', Australia: '#a1388d', 'North America': '#0e66c8', 'South America': '#9d78ed' };
const LEGEND_SIZE = 12;

export function createSpace(app) {
  const { data } = app;
  let dim = '2d';
  let view = null; // the live 2D or 3D renderer
  let host = null;
  let selected = null;
  let focus = null; // a family shown on its own
  let setFocus = null; // the key's way of changing it
  let regions = (() => {
    try {
      return sessionStorage.getItem(REGIONS_KEY) !== '0';
    } catch {
      return true;
    }
  })();
  let colorBy = (() => {
    try {
      return sessionStorage.getItem(COLOR_KEY) === 'area' ? 'area' : 'family';
    } catch {
      return 'family';
    }
  })();
  let token = 0;

  // what a dot belongs to and how it is coloured: its family, or its region
  const keyOf = (l) => (colorBy === 'area' ? l.macroarea ?? null : l.family && l.family !== 'sign1238' ? l.family : null);
  const colorOf = (l) => (colorBy === 'area' ? AREA_COLORS[l.macroarea] ?? FAMILY.other : familyColor(l));
  const keyColor = (k) => (colorBy === 'area' ? AREA_COLORS[k] ?? FAMILY.other : familyColor({ family: k }));
  const keyName = (k) => (colorBy === 'area' ? t('macroareas')[k] ?? k : app.name(data.byId.get(k)));

  async function render(page, kind) {
    if (kind !== 'grammar') kind = 'vocabulary';
    host = page;
    dispose();
    const my = ++token;
    page.innerHTML = `
      <div class="page-head space-head">
        <div class="space-titlebar">
          <div><div class="kicker">${t('navSpace')}</div><h2>${t('spaceTitle')}</h2></div>
          <div class="atree-tools">
            <div class="seg">${['vocabulary', 'grammar'].map((k) => `<button data-kind="${k}" class="${k === kind ? 'on' : ''}">${t(k === 'vocabulary' ? 'spaceVocab' : 'spaceGrammar')}</button>`).join('')}</div>
            <div class="seg">${['2d', '3d'].map((d) => `<button data-dim="${d}" class="${d === dim ? 'on' : ''}">${t(d === '2d' ? 'space2d' : 'space3d')}</button>`).join('')}</div>
            <div class="seg">${['family', 'area'].map((c) => `<button data-color="${c}" class="${c === colorBy ? 'on' : ''}">${t(c === 'family' ? 'spaceByFamily' : 'spaceByArea')}</button>`).join('')}</div>
            ${dim === '2d' ? `<button class="btn small ghost toggle${regions ? ' on' : ''}" data-act="regions" aria-pressed="${regions}"><i></i>${t('spaceRegions')}</button>` : ''}
            ${fullButton()}
          </div>
        </div>
        <p class="space-intro">${esc(t('spaceIntro'))} <button class="linkish" data-act="how">${t('spaceAbout')}</button></p>
        <p class="space-how hint" hidden></p>
      </div>
      <div class="space-stage">
        <div class="space-labels"></div><div class="space-tip"></div>
        <details class="space-legend"${window.innerWidth > 700 ? ' open' : ''}><summary>${t(colorBy === 'area' ? 'spaceAreas' : 'spaceFamilies')}</summary><div class="space-legend-body"></div></details>
        <div class="space-hint hint">${t('spaceHint')}</div>
      </div>`;
    page.querySelectorAll('[data-kind]').forEach((b) => (b.onclick = () => app.go({ view: 'space', arg: b.dataset.kind, sel: app.route.sel })));
    page.querySelectorAll('[data-dim]').forEach((b) => (b.onclick = () => {
      dim = b.dataset.dim;
      render(page, kind);
    }));
    page.querySelectorAll('[data-color]').forEach((b) => (b.onclick = () => {
      if (b.dataset.color === colorBy) return;
      colorBy = b.dataset.color;
      focus = null;
      try {
        sessionStorage.setItem(COLOR_KEY, colorBy);
      } catch {}
      render(page, kind);
    }));
    page.querySelector('[data-act=full]').onclick = () => setFull(!page.classList.contains('full'));
    page.querySelector('[data-act=how]').onclick = () => {
      const how = page.querySelector('.space-how');
      how.hidden = !how.hidden;
    };
    page.querySelector('[data-act=regions]')?.addEventListener('click', (e) => {
      regions = !regions;
      try {
        sessionStorage.setItem(REGIONS_KEY, regions ? '1' : '0');
      } catch {}
      e.currentTarget.classList.toggle('on', regions);
      e.currentTarget.setAttribute('aria-pressed', regions);
      view?.regions(regions);
    });
    const sim = await data.similarity(kind);
    if (my !== token) return;
    // what was compared, what the middle of the vocabulary map is, and that only distances count
    page.querySelector('.space-how').textContent = [t(kind === 'vocabulary' ? 'spaceHowVocab' : 'spaceHowGrammar', sim.ids.length), kind === 'vocabulary' ? t('spaceCentre') : '', t('spaceAxes')].filter(Boolean).join(' ');
    const pts = sim.ids.map((id, i) => ({ l: data.byId.get(id), i })).filter((p) => p.l);
    const stage = page.querySelector('.space-stage');
    const counts = familyCounts(pts);
    if (focus && !counts.has(focus)) focus = null;
    legend(stage, counts);
    view = dim === '2d' ? canvas2d(stage, sim, pts) : cloud3d(stage, sim, pts);
    view.mark(selected);
    if (focus) view.focus(focus, true);
  }

  // full screen: the browser's own where it can, otherwise the page covers the top bar
  const fullButton = () => {
    const on = host?.classList.contains('full');
    return `<button class="btn small ghost" data-act="full">${on ? icon.shrink : icon.expand}<span>${on ? t('exitFullscreen') : t('fullscreen')}</span></button>`;
  };
  function setFull(on) {
    if (!host) return;
    host.classList.toggle('full', on);
    if (on && host.requestFullscreen && !document.fullscreenElement) host.requestFullscreen().catch(() => {});
    if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {});
    const b = host.querySelector('[data-act=full]');
    if (b) b.outerHTML = fullButton();
    host.querySelector('[data-act=full]').onclick = () => setFull(!host.classList.contains('full'));
    // the stage changed size without the window doing so
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  }
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && host?.classList.contains('full')) setFull(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && host?.classList.contains('full') && !document.fullscreenElement) setFull(false);
  });

  // ── the key: families by number of languages here, click to see one alone ──
  function familyCounts(pts) {
    const counts = new Map();
    for (const p of pts) {
      const k = keyOf(p.l);
      if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return counts;
  }

  function legend(stage, counts) {
    const body = stage.querySelector('.space-legend-body');
    const top = [...counts].sort((a, b) => b[1] - a[1]).slice(0, LEGEND_SIZE);
    if (focus && !top.some(([id]) => id === focus)) top.push([focus, counts.get(focus)]);
    body.innerHTML = `
      <ul>${top.map(([id, n]) => `<li><button data-fam="${id}" class="${id === focus ? 'on' : ''}"><i style="background:${keyColor(id)}"></i><span>${esc(keyName(id))}</span><b>${formatNumber(n)}</b></button></li>`).join('')}</ul>
      <p class="lg-hint">${t(colorBy === 'area' ? 'spaceAreaHint' : 'spaceLegendHint')}</p>
      <button class="linkish" data-act="all"${focus ? '' : ' hidden'}>${t('spaceShowAll')}</button>`;
    const set = (setFocus = (id) => {
      focus = id;
      body.querySelectorAll('[data-fam]').forEach((b) => b.classList.toggle('on', b.dataset.fam === focus));
      body.querySelector('[data-act=all]').hidden = !focus;
      view?.focus(focus);
    });
    body.querySelectorAll('[data-fam]').forEach((b) => {
      b.onclick = () => set(focus === b.dataset.fam ? null : b.dataset.fam);
      b.onmouseenter = () => !focus && view?.preview(b.dataset.fam);
      b.onmouseleave = () => view?.preview(null);
    });
    body.querySelector('[data-act=all]').onclick = () => set(null);
  }

  // shared: hover tooltip and click-through
  function tip(stage, p, x, y) {
    const el = stage.querySelector('.space-tip');
    if (!p) return el.classList.remove('on');
    el.innerHTML = `<b>${esc(app.name(p.l))}</b><span>${esc(app.familyName(p.l))}</span>`;
    el.style.transform = `translate(${x + 14}px, ${y + 12}px)`;
    el.classList.add('on');
  }

  // where to name a family: at its densest member, not the mean of all its
  // languages, which for a scattered family falls among other families' dots
  function familyAnchors(sim, pts, dims) {
    const key = `p${dims}`;
    const at = (p, k) => sim[key][p.i * dims + k];
    const groups = new Map();
    for (const p of pts) {
      const f = keyOf(p.l);
      if (!f) continue;
      (groups.get(f) ?? groups.set(f, []).get(f)).push(p);
    }
    const r2 = 0.06 * 0.06;
    const out = [];
    for (const [fam, list] of groups) {
      if (list.length < 12) continue;
      const step = Math.ceil(list.length / 300);
      let best = list[0];
      let most = -1;
      for (let a = 0; a < list.length; a += step) {
        let n = 0;
        for (const q of list) {
          let d = 0;
          for (let k = 0; k < dims; k++) d += (at(list[a], k) - at(q, k)) ** 2;
          if (d < r2) n++;
        }
        if (n > most) [most, best] = [n, list[a]];
      }
      out.push({ id: fam, name: keyName(fam), c: Array.from({ length: dims }, (_, k) => at(best, k)), n: list.length });
    }
    return out.sort((a, b) => b.n - a.n).slice(0, 18);
  }

  // Family areas: a soft density shape for each family, drawn where at least a
  // few of its languages sit together, so lone outliers don't stretch it.
  // Built once per family as a small image in data space, scaled when drawn.
  function regionMaker(sim, pts, bounds) {
    const { x0, x1, y0, y1, sigma } = bounds;
    const cell = Math.max(x1 - x0, y1 - y0) / 720;
    const gw = Math.ceil((x1 - x0) / cell);
    const gh = Math.ceil((y1 - y0) / cell);
    const s = sigma / cell;
    const R = Math.ceil(3 * s);
    const kernel = new Float32Array((2 * R + 1) ** 2);
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) kernel[(dy + R) * (2 * R + 1) + dx + R] = Math.exp(-(dx * dx + dy * dy) / (2 * s * s));
    const T0 = 2.4; // roughly three languages close together
    const smooth = (a, b, v) => {
      const k = Math.min(1, Math.max(0, (v - a) / (b - a)));
      return k * k * (3 - 2 * k);
    };
    const cache = new Map();
    const make = (fam) => {
      if (cache.has(fam)) return cache.get(fam);
      const grid = new Float32Array(gw * gh);
      for (const p of pts) {
        if (keyOf(p.l) !== fam) continue;
        const cx = Math.round((sim.p2[p.i * 2] - x0) / cell);
        const cy = Math.round((sim.p2[p.i * 2 + 1] - y0) / cell);
        for (let dy = -R; dy <= R; dy++) {
          const y = cy + dy;
          if (y < 0 || y >= gh) continue;
          for (let dx = -R; dx <= R; dx++) {
            const x = cx + dx;
            if (x >= 0 && x < gw) grid[y * gw + x] += kernel[(dy + R) * (2 * R + 1) + dx + R];
          }
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = gw;
      canvas.height = gh;
      const g = canvas.getContext('2d');
      const img = g.createImageData(gw, gh);
      const c = new THREE.Color(keyColor(fam));
      const [r, gr, b] = [c.r, c.g, c.b].map((v) => Math.round(v * 255));
      for (let y = 0; y < gh; y++) {
        for (let x = 0; x < gw; x++) {
          const d = grid[y * gw + x];
          if (d < T0 * 0.6) continue;
          // a soft fill, and a slightly stronger rim where the area ends
          const fill = smooth(T0 * 0.8, T0 * 1.3, d) * 0.15 + smooth(T0 * 1.3, T0 * 4, d) * 0.08;
          const rim = Math.exp(-(((d - T0) / (0.3 * T0)) ** 2)) * 0.24;
          const o = ((gh - 1 - y) * gw + x) * 4;
          img.data[o] = r;
          img.data[o + 1] = gr;
          img.data[o + 2] = b;
          img.data[o + 3] = Math.round(Math.min(0.5, fill + rim) * 255);
        }
      }
      g.putImageData(img, 0, 0);
      cache.set(fam, canvas);
      return canvas;
    };
    // the image's top-left corner and its size, in data units
    // (each pixel is centred on its grid point, hence the half cell)
    return { make, x0: x0 - cell / 2, y1: y0 + (gh - 0.5) * cell, w: gw * cell, h: gh * cell };
  }

  function canvas2d(stage, sim, pts) {
    const canvas = document.createElement('canvas');
    stage.prepend(canvas);
    const ctx = canvas.getContext('2d');
    const labels = stage.querySelector('.space-labels');
    let W = 0, H = 0, dpr = 1;
    let transform = zoomIdentity;
    let hover = null;
    let mark = null;
    let focused = null;
    let previewed = null;
    let showRegions = regions;
    let clicked = false;
    const xy = (p) => [sim.p2[p.i * 2], sim.p2[p.i * 2 + 1]];
    const fams = familyAnchors(sim, pts, 2);
    const byFamily = new Map();
    for (const p of pts) {
      const k = keyOf(p.l);
      if (k) (byFamily.get(k) ?? byFamily.set(k, []).get(k)).push(p);
    }

    // fit the middle 96% of languages to the stage; far outliers are a pan away
    const sorted = (k) => pts.map((p) => sim.p2[p.i * 2 + k]).sort((a, b) => a - b);
    const q = (a, f) => a[Math.floor(f * (a.length - 1))];
    const xs = sorted(0);
    const ys = sorted(1);
    const fit = { x0: q(xs, 0.02), x1: q(xs, 0.98), y0: q(ys, 0.02), y1: q(ys, 0.98) };
    const cx = (fit.x0 + fit.x1) / 2;
    const cy = (fit.y0 + fit.y1) / 2;
    const span = Math.max(fit.x1 - fit.x0, fit.y1 - fit.y0);
    const sigma = 0.012 * span;
    const region = regionMaker(sim, pts, { x0: xs[0] - 4 * sigma, x1: xs[xs.length - 1] + 4 * sigma, y0: ys[0] - 4 * sigma, y1: ys[ys.length - 1] + 4 * sigma, sigma });
    // the large named families (or every region) get areas; any family gets one when in focus
    const named = (colorBy === 'area' ? Object.keys(AREA_COLORS) : FAMILY.named).filter((f) => (byFamily.get(f)?.length ?? 0) >= 25);

    function size() {
      dpr = Math.min(2, window.devicePixelRatio);
      W = stage.clientWidth;
      H = stage.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
    }
    const scale = () => Math.min(W / (fit.x1 - fit.x0), H / (fit.y1 - fit.y0)) * 0.86;
    const base = ([x, y]) => [W / 2 + (x - cx) * scale(), H / 2 - (y - cy) * scale()];
    const toScreen = (p) => transform.apply(base(p));

    function drawRegions(f) {
      const list = f ? [f] : named;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      const [sx, sy] = toScreen([region.x0, region.y1]);
      const k = scale() * transform.k;
      for (const fam of list) {
        if ((byFamily.get(fam)?.length ?? 0) < 4) continue;
        ctx.globalAlpha = f ? 1 : 0.9;
        ctx.drawImage(region.make(fam), sx, sy, region.w * k, region.h * k);
      }
      ctx.globalAlpha = 1;
    }

    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const f = previewed ?? focused;
      if (showRegions) drawRegions(f);
      const r = Math.max(2.2, Math.min(5, 2.6 * Math.sqrt(transform.k)));
      const marked = mark ? new Set([mark.id, ...neighbours(mark)]) : null;
      const dot = (p, color, alpha) => {
        const [sx, sy] = toScreen(xy(p));
        if (sx < -10 || sy < -10 || sx > W + 10 || sy > H + 10) return;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = RING;
        ctx.stroke();
      };
      // a family in focus sits on top of the others, which fade to grey
      if (f) {
        for (const p of pts) if (keyOf(p.l) !== f) dot(p, MUTED, marked && !marked.has(p.l.id) ? 0.25 : 0.6);
        for (const p of byFamily.get(f) ?? []) dot(p, colorOf(p.l), 0.95);
      } else {
        for (const p of pts) dot(p, colorOf(p.l), marked && !marked.has(p.l.id) ? 0.25 : 0.9);
      }
      ctx.globalAlpha = 1;
      if (mark) {
        const mp = pts.find((p) => p.l === mark);
        if (mp) {
          const [mx, my] = toScreen(xy(mp));
          ctx.strokeStyle = ACCENT;
          ctx.lineWidth = 1.2;
          for (const id of neighbours(mark)) {
            const np = pts.find((p) => p.l.id === id);
            if (!np) continue;
            const [nx, ny] = toScreen(xy(np));
            ctx.beginPath();
            ctx.moveTo(mx, my);
            ctx.lineTo(nx, ny);
            ctx.stroke();
          }
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(mx, my, r + 5, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      if (hover) {
        const [hx, hy] = toScreen(xy(hover));
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = INK;
        ctx.beginPath();
        ctx.arc(hx, hy, r + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      placeLabels(f);
    }

    function neighbours(l) {
      const i = sim.index.get(l.id);
      return i == null ? [] : sim.nn.slice(i * 8, i * 8 + 6).map((j) => sim.ids[j]);
    }

    // family names first, then the most-spoken languages, never overlapping
    function placeLabels(f) {
      const boxes = [];
      const items = [];
      const tryPut = (text, x, y, cls) => {
        const size = cls === 'fam' ? 12 : 12.5;
        const w = [...text].reduce((s, ch) => s + (WIDE.test(ch) ? size : size * 0.58), 0) + 10;
        const b = { x0: x - w / 2, x1: x + w / 2, y0: y - 18, y1: y };
        if (b.x0 < 0 || b.x1 > W || b.y0 < 0 || b.y1 > H) return;
        if (boxes.some((o) => o.x0 < b.x1 && o.x1 > b.x0 && o.y0 < b.y1 && o.y1 > b.y0)) return;
        boxes.push(b);
        items.push(`<div class="slabel ${cls}" style="transform:translate(${x}px, ${y - 9}px) translate(-50%,-50%)">${esc(text)}</div>`);
      };
      if (mark) {
        const mp = pts.find((p) => p.l === mark);
        if (mp) tryPut(app.name(mark), ...toScreen(xy(mp)).map((v, k) => (k ? v - 10 : v)), 'strong');
      }
      for (const a of fams) if (!f || a.id === f) tryPut(a.name, ...toScreen(a.c), 'fam');
      const limit = 18 + Math.round(18 * Math.log2(transform.k + 1));
      let n = 0;
      for (const p of [...(f ? byFamily.get(f) ?? [] : pts)].sort((a, b) => (b.l.speakers ?? 0) - (a.l.speakers ?? 0))) {
        if (n++ > 400 || items.length > limit) break;
        const [x, y] = toScreen(xy(p));
        tryPut(app.name(p.l), x, y - 8, '');
      }
      labels.innerHTML = items.join('');
    }

    function nearest(mx, my) {
      let best = null;
      let bd = 12;
      const f = focused;
      for (const p of pts) {
        if (f && keyOf(p.l) !== f) continue;
        const [sx, sy] = toScreen(xy(p));
        const d = Math.hypot(sx - mx, sy - my);
        if (d < bd) {
          bd = d;
          best = p;
        }
      }
      return best;
    }

    const z = d3zoom().scaleExtent([0.6, 40]).on('zoom', (e) => {
      transform = e.transform;
      draw();
    });
    select(canvas).call(z);

    // zoom to the middle of a family's languages, or back out to everything
    function frame(f, instant) {
      let target = zoomIdentity;
      const list = f ? byFamily.get(f) ?? [] : [];
      if (list.length) {
        const fx = list.map((p) => xy(p)[0]).sort((a, b) => a - b);
        const fy = list.map((p) => xy(p)[1]).sort((a, b) => a - b);
        const [ax, ay] = base([q(fx, 0.02), q(fy, 0.98)]);
        const [bx, by] = base([q(fx, 0.98), q(fy, 0.02)]);
        const k = Math.max(1, Math.min(12, 0.85 * Math.min(W / Math.max(bx - ax, 1), H / Math.max(by - ay, 1))));
        target = zoomIdentity.translate(W / 2, H / 2).scale(k).translate(-(ax + bx) / 2, -(ay + by) / 2);
      }
      const sel = select(canvas);
      if (instant) sel.call(z.transform, target);
      else sel.transition().duration(700).call(z.transform, target);
    }

    canvas.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      const p = nearest(e.clientX - r.left, e.clientY - r.top);
      if (p !== hover) {
        hover = p;
        canvas.style.cursor = p ? 'pointer' : 'grab';
        draw();
      }
      tip(stage, p, e.clientX - r.left, e.clientY - r.top);
    });
    canvas.addEventListener('pointerleave', () => {
      hover = null;
      tip(stage, null);
      draw();
    });
    canvas.addEventListener('click', (e) => {
      const r = canvas.getBoundingClientRect();
      const p = nearest(e.clientX - r.left, e.clientY - r.top);
      if (!p) return;
      clicked = true;
      app.select(p.l.id);
    });
    // fly to a language picked from the search box or the panel
    function locate(l) {
      const p = pts.find((x) => x.l === l);
      if (!p) return;
      const [ux, uy] = base(xy(p));
      const k = Math.max(transform.k, 4);
      select(canvas).transition().duration(800).call(z.transform, zoomIdentity.translate(W / 2, H / 2).scale(k).translate(-ux, -uy));
    }
    const onResize = () => {
      size();
      draw();
    };
    window.addEventListener('resize', onResize);
    size();
    draw();
    return {
      mark(id) {
        const was = mark;
        mark = id ? data.byId.get(id) : null;
        if (mark && mark !== was && !clicked) {
          // a language outside the family in focus brings everything back
          if (focused && keyOf(mark) !== focused) setFocus?.(null);
          locate(mark);
        }
        clicked = false;
        draw();
      },
      focus(f, instant) {
        focused = f;
        previewed = null;
        frame(f, instant);
        draw();
      },
      preview(f) {
        previewed = f;
        draw();
      },
      regions(on) {
        showRegions = on;
        draw();
      },
      dispose() {
        window.removeEventListener('resize', onResize);
      },
    };
  }

  function cloud3d(stage, sim, pts) {
    const renderer = new THREE.WebGLRenderer({ antialias: GFX !== 'low', alpha: true });
    renderer.setPixelRatio(GFX === 'low' ? 1 : Math.min(2, window.devicePixelRatio));
    stage.prepend(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 50);
    camera.position.set(0.4, 0.5, 3.1);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = GFX !== 'low';
    controls.autoRotateSpeed = 0.5;
    controls.minDistance = 0.4;
    controls.maxDistance = 8;

    const pos = new Float32Array(pts.length * 3);
    const col = new Float32Array(pts.length * 3);
    const c = new THREE.Color();
    pts.forEach((p, k) => pos.set([sim.p3[p.i * 3], sim.p3[p.i * 3 + 1], sim.p3[p.i * 3 + 2]], k * 3));
    const paint = (f) => {
      pts.forEach((p, k) => {
        c.set(!f || keyOf(p.l) === f ? colorOf(p.l) : MUTED);
        col.set([c.r, c.g, c.b], k * 3);
      });
    };
    paint(null);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const size = new Float32Array(pts.length).fill(1);
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    const ring = new THREE.Color(RING);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uPx: { value: renderer.getPixelRatio() }, uRing: { value: new THREE.Vector3(ring.r, ring.g, ring.b) } },
      vertexShader: /* glsl */ `
        attribute float aSize;
        uniform float uPx;
        varying vec3 vColor;
        varying float vDim;
        void main() {
          vColor = color;
          vDim = aSize;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = (aSize > 1.5 ? 16.0 : 7.0) * uPx / -mv.z * 1.6;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uRing;
        varying vec3 vColor;
        varying float vDim;
        void main() {
          float r = length(gl_PointCoord - 0.5) * 2.0;
          if (r > 1.0) discard;
          vec3 col = mix(vColor, uRing, smoothstep(0.72, 0.8, r));
          float a = vDim < 0.5 ? 0.18 : 0.92;
          gl_FragColor = vec4(col, a);
          #include <colorspace_fragment>
        }`,
      vertexColors: true,
    });
    const cloud = new THREE.Points(geo, mat);
    scene.add(cloud);
    const lines = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.8 }));
    scene.add(lines);
    const labels = stage.querySelector('.space-labels');
    const fams = familyAnchors(sim, pts, 3);
    const bySpeakers = [...pts].sort((a, b) => (b.l.speakers ?? 0) - (a.l.speakers ?? 0));
    let top = bySpeakers.slice(0, 60);
    let focused = null;
    let hover = null;
    let markId = null;
    const v = new THREE.Vector3();
    const screen = (x, y, z) => {
      v.set(x, y, z).project(camera);
      return v.z > 1 ? null : [(v.x * 0.5 + 0.5) * stage.clientWidth, (-v.y * 0.5 + 0.5) * stage.clientHeight];
    };

    function resize() {
      renderer.setSize(stage.clientWidth, stage.clientHeight);
      camera.aspect = stage.clientWidth / stage.clientHeight;
      camera.updateProjectionMatrix();
    }
    function placeLabels() {
      const boxes = [];
      const items = [];
      const put = (text, s, cls) => {
        if (!s) return;
        const sizeF = 12.5;
        const w = [...text].reduce((a, ch) => a + (WIDE.test(ch) ? sizeF : sizeF * 0.58), 0) + 10;
        const b = { x0: s[0] - w / 2, x1: s[0] + w / 2, y0: s[1] - 26, y1: s[1] - 8 };
        if (boxes.some((o) => o.x0 < b.x1 && o.x1 > b.x0 && o.y0 < b.y1 && o.y1 > b.y0)) return;
        boxes.push(b);
        items.push(`<div class="slabel ${cls}" style="transform:translate(${s[0]}px, ${s[1] - 17}px) translate(-50%,-50%)">${esc(text)}</div>`);
      };
      if (markId) {
        const mp = pts.find((p) => p.l.id === markId);
        if (mp) put(app.name(mp.l), screen(sim.p3[mp.i * 3], sim.p3[mp.i * 3 + 1], sim.p3[mp.i * 3 + 2]), 'strong');
      }
      for (const f of fams) if (!focused || f.id === focused) put(f.name, screen(...f.c), 'fam');
      for (const p of top) {
        if (items.length > 34) break;
        put(app.name(p.l), screen(sim.p3[p.i * 3], sim.p3[p.i * 3 + 1], sim.p3[p.i * 3 + 2]), '');
      }
      labels.innerHTML = items.join('');
    }
    function nearest(mx, my) {
      let best = null;
      let bd = 12;
      pts.forEach((p, k) => {
        if (focused && keyOf(p.l) !== focused) return;
        const s = screen(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]);
        if (!s) return;
        const d = Math.hypot(s[0] - mx, s[1] - my);
        if (d < bd) {
          bd = d;
          best = p;
        }
      });
      return best;
    }
    let frame = 0;
    renderer.setAnimationLoop(() => {
      controls.update();
      renderer.render(scene, camera);
      if (frame++ % 3 === 0) placeLabels();
    });
    const el = renderer.domElement;
    let down = null;
    el.addEventListener('pointerdown', (e) => (down = [e.clientX, e.clientY]));
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      hover = nearest(e.clientX - r.left, e.clientY - r.top);
      el.style.cursor = hover ? 'pointer' : 'grab';
      tip(stage, hover, e.clientX - r.left, e.clientY - r.top);
    });
    el.addEventListener('pointerup', (e) => {
      if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 5 && hover) app.select(hover.l.id);
      down = null;
    });
    controls.addEventListener('start', () => (controls.autoRotate = false));
    window.addEventListener('resize', resize);
    resize();
    const show = (f) => {
      paint(f);
      geo.getAttribute('color').needsUpdate = true;
    };
    return {
      mark(id) {
        markId = id;
        const i = id ? sim.index.get(id) : null;
        const near = i != null ? new Set([id, ...sim.nn.slice(i * 8, i * 8 + 6).map((j) => sim.ids[j])]) : null;
        pts.forEach((p, k) => (size[k] = !near ? 1 : p.l.id === id ? 2 : near.has(p.l.id) ? 1 : 0));
        geo.getAttribute('aSize').needsUpdate = true;
        const seg = [];
        if (i != null) {
          for (const j of sim.nn.slice(i * 8, i * 8 + 6)) seg.push(sim.p3[i * 3], sim.p3[i * 3 + 1], sim.p3[i * 3 + 2], sim.p3[j * 3], sim.p3[j * 3 + 1], sim.p3[j * 3 + 2]);
          controls.autoRotate = false;
          controls.target.set(sim.p3[i * 3], sim.p3[i * 3 + 1], sim.p3[i * 3 + 2]);
        }
        lines.geometry.dispose();
        lines.geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
      },
      focus(f) {
        focused = f;
        top = (f ? bySpeakers.filter((p) => keyOf(p.l) === f) : bySpeakers).slice(0, 60);
        show(f);
        // turn towards the family's densest part
        const a = f && fams.find((x) => x.id === f);
        if (a) {
          controls.autoRotate = false;
          controls.target.set(...a.c);
        } else if (!f) controls.target.set(0, 0, 0);
      },
      preview(f) {
        show(f ?? focused);
      },
      regions() {},
      dispose() {
        renderer.setAnimationLoop(null);
        renderer.dispose();
        window.removeEventListener('resize', resize);
      },
    };
  }

  function dispose() {
    view?.dispose();
    view = null;
  }

  return {
    render,
    dispose,
    // leaving the view also leaves full screen
    leave() {
      if (host?.classList.contains('full')) setFull(false);
      dispose();
    },
    mark(sel) {
      const x = sel && data.byId.get(sel);
      // a family picked from the search box: show it on its own
      if (x?.kind === 'group' && !x.parent && colorBy === 'family' && setFocus) {
        if (selected) view?.mark((selected = null));
        return sel === focus ? null : setFocus(sel);
      }
      selected = x?.kind === 'lang' ? sel : null;
      view?.mark(selected);
    },
  };
}
