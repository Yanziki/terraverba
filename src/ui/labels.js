// Atlas-style name labels: the most-spoken visible languages get a label,
// placed greedily so none overlap. Selection is recomputed a few times a
// second; positions follow the map every frame. To keep them steady while the
// globe turns, a label already showing keeps its place unless a far more
// spoken language needs the room, and each language keeps its own element
// (fading in where it appears, fading out where it leaves).
const POOL = 56;
const FADE = 300; // ms, as .glabel's opacity transition
const WIDE = /[ᄀ-ᇿ⺀-鿿가-힯豈-﫿＀-￯]/;

export function createLabels(app) {
  const layer = document.getElementById('labels');
  const ring = document.getElementById('instrument');
  const els = Array.from({ length: POOL }, () => {
    const el = document.createElement('div');
    el.className = 'glabel';
    el.style.opacity = 0;
    layer.appendChild(el);
    return el;
  });
  let placed = [];
  let lastPick = 0;
  const shownBy = new Map(); // language id → its element
  drawInstrument(ring);

  function pick() {
    const { globe, data, state } = app;
    if (!state.layers.labels || !state.layers.dots || state.dailyHide) return (placed = []);
    const zoom = globe.mode === '2d' ? (globe.homeFlat - globe.altitude()) / globe.homeFlat : (globe.homeDist - globe.camera.position.length()) / (globe.homeDist - 1.4);
    const max = Math.round(Math.min(POOL, 14 + 26 * Math.max(0, zoom)));
    const strong = new Set(state.selStrong ?? []);
    for (const id of state.story?.strong ?? []) strong.add(id);
    const focus = globe.focus;
    // pictures pinned on the map take their space first
    const boxes = [...(app.relicBoxes?.() ?? [])];
    const out = [];
    const tryPlace = (l, cls) => {
      const p = globe.project(l, 0.08);
      // keep clear of the top bar
      if (!p || p.y < 92) return;
      const name = app.labelFor(l);
      const size = cls ? 14 : 12.5;
      const w = [...name].reduce((s, ch) => s + (WIDE.test(ch) ? size : size * 0.56), 0) + 8;
      const box = { x0: p.x - w / 2, x1: p.x + w / 2, y0: p.y - size - 14, y1: p.y - 4 };
      if (cls !== 'strong' && boxes.some((b) => b.x0 < box.x1 && b.x1 > box.x0 && b.y0 < box.y1 && b.y1 > box.y0)) return;
      boxes.push(box);
      out.push({ l, name, cls });
    };
    for (const id of strong) {
      const l = data.byId.get(id);
      if (l?.kind === 'lang') tryPlace(l, 'strong');
    }
    // languages are stored most-spoken first; one already labelled counts as
    // four times as spoken, so it is not pushed out by a slightly bigger neighbour
    const before = new Set(placed.map((x) => x.l.id));
    const cands = [];
    for (let i = 0; i < data.languages.length && (focus || i < 1600); i++) {
      const l = data.languages[i];
      if (strong.has(l.id) || (focus && !focus.has(l.id))) continue;
      if (!focus && !l.speakers) break;
      cands.push([before.has(l.id) ? i / 4 : i, i, l]);
    }
    cands.sort((a, b) => a[0] - b[0]);
    for (const [, i, l] of cands) {
      if (out.length >= max) break;
      tryPlace(l, i < 12 ? 'big' : '');
    }
    placed = out;
  }

  function position() {
    const { globe } = app;
    const now = performance.now();
    const at = (el, p) => (el.style.transform = `translate(${p.x.toFixed(1)}px, ${(p.y - 13).toFixed(1)}px) translate(-50%, -50%)`);
    const want = new Set(placed.map((x) => x.l.id));
    // labels that left fade out where their language is
    for (const [id, el] of shownBy) {
      if (want.has(id)) continue;
      shownBy.delete(id);
      el._freed = now;
      el.style.opacity = 0;
    }
    for (const el of els) {
      if (el._freed && now - el._freed < FADE && el._l) {
        const p = globe.project(el._l, 0.04);
        if (p) at(el, p);
      }
    }
    for (const item of placed) {
      let el = shownBy.get(item.l.id);
      if (!el) {
        // the element that has been free the longest, so nothing is still fading in it
        el = els.filter((e) => ![...shownBy.values()].includes(e)).sort((a, b) => (a._freed ?? 0) - (b._freed ?? 0))[0];
        if (!el) continue;
        shownBy.set(item.l.id, el);
        el._l = item.l;
        el._freed = 0;
        el._fresh = true;
      }
      const p = globe.project(item.l, 0.04);
      if (!p) {
        el.style.opacity = 0;
        continue;
      }
      if (el._name !== item.name) {
        el._name = item.name;
        el.textContent = item.name;
      }
      el.className = `glabel ${item.cls}`;
      at(el, p);
      if (el._fresh) {
        // appear in place, from nothing
        el._fresh = false;
        el.style.transition = 'none';
        el.style.opacity = 0;
        void el.offsetWidth;
        el.style.transition = '';
      }
      // fade toward the limb of the globe
      el.style.opacity = Math.min(1, (p.facing - 0.3) * 2.2).toFixed(2);
    }
    updateInstrument(ring, globe);
  }

  return {
    update(force = false) {
      const now = performance.now();
      if (force || now - lastPick > 140) {
        lastPick = now;
        pick();
      }
      position();
    },
  };
}

// a hairline meridian ring with degree ticks, and a soft contact shadow
function drawInstrument(svg) {
  const ticks = [];
  for (let d = 0; d < 360; d += 5) ticks.push(`<line class="tick${d % 30 === 0 ? ' major' : ''}" data-d="${d}"/>`);
  svg.innerHTML = `
    <defs>
      <radialGradient id="globe-shadow">
        <stop offset="0" stop-color="#3b2f20" stop-opacity="0.22"/>
        <stop offset="0.55" stop-color="#3b2f20" stop-opacity="0.08"/>
        <stop offset="1" stop-color="#3b2f20" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <ellipse class="shadow"/>
    <circle class="ring"/>
    <g class="ticks">${ticks.join('')}</g>`;
}

function updateInstrument(svg, globe) {
  const disc = globe.disc();
  const show = globe.flat < 0.02 && disc.r < Math.min(globe.width, globe.height) * 0.6;
  svg.style.opacity = show ? 1 : 0;
  if (!show) return;
  const R = disc.r * 1.07;
  const ring = svg.querySelector('.ring');
  ring.setAttribute('cx', disc.x);
  ring.setAttribute('cy', disc.y);
  ring.setAttribute('r', R);
  const sh = svg.querySelector('.shadow');
  sh.setAttribute('cx', disc.x);
  sh.setAttribute('cy', disc.y + disc.r * 1.13);
  sh.setAttribute('rx', disc.r * 0.82);
  sh.setAttribute('ry', disc.r * 0.075);
  svg.querySelectorAll('.tick').forEach((el) => {
    const d = (+el.dataset.d * Math.PI) / 180;
    const len = +el.dataset.d % 30 === 0 ? 9 : 4;
    const c = Math.cos(d), s = Math.sin(d);
    el.setAttribute('x1', disc.x + c * R);
    el.setAttribute('y1', disc.y + s * R);
    el.setAttribute('x2', disc.x + c * (R + len));
    el.setAttribute('y2', disc.y + s * (R + len));
  });
}
