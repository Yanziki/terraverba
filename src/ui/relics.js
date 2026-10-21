// Relics of writing on the globe: small round pictures pinned where each
// object was made or found. Shown when the layer is on (and the selected one
// always), only on the side facing the viewer, and never two on top of each
// other; a click opens the relic's card in the panel.
import { RELICS } from '../content/relics.js';
import { toVec, toFlat } from '../data.js';
import { tr } from '../i18n/index.js';

export const RELIC_IMG = `${import.meta.env.BASE_URL}img/relics/`;
// the atlas and the stories; other views put their own things on the globe
const VIEWS = new Set(['globe', 'stories', 'story']);
const SIZE = 40;
const STEM = 12;

export function createRelics(app) {
  const layer = document.getElementById('relics');
  const pins = RELICS.map((r) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'relic-pin';
    el.title = tr(r.name);
    el.innerHTML = `<img src="${RELIC_IMG}${r.id}-pin.jpg" alt="" draggable="false"><i></i>`;
    el.onclick = () => app.select(`relic:${r.id}`);
    return { r, el, at: { v: toVec(r.lat, r.lon), f: toFlat(r.lat, r.lon) } };
  });
  let selected = null;
  let shown = [];
  let taken = [];
  let lastPick = 0;

  const active = () => VIEWS.has(app.route?.view) && !app.state.dailyHide;

  // which pins to show: the selected one first, then the rest in list order,
  // skipping any that would overlap one already placed
  function pick() {
    const { globe } = app;
    const all = active() && app.state.layers.relics;
    const boxes = [];
    shown = [];
    const order = [...pins].sort((a, b) => (b.r.id === selected) - (a.r.id === selected));
    for (const pin of order) {
      if (!all && pin.r.id !== selected) continue;
      if (!active()) continue;
      const p = globe.project(pin.at, 0.12);
      if (!p || p.y < 110) continue;
      const box = { x0: p.x - SIZE / 2 - 3, x1: p.x + SIZE / 2 + 3, y0: p.y - SIZE - STEM - 3, y1: p.y };
      if (pin.r.id !== selected && boxes.some((b) => b.x0 < box.x1 && b.x1 > box.x0 && b.y0 < box.y1 && b.y1 > box.y0)) continue;
      boxes.push(box);
      shown.push(pin);
    }
    taken = boxes;
    for (const pin of pins) {
      const on = shown.includes(pin);
      if (on && !pin.el.isConnected) layer.appendChild(pin.el);
      if (!on && pin.el.isConnected) pin.el.remove();
    }
  }

  function position() {
    const { globe } = app;
    for (const pin of shown) {
      const p = globe.project(pin.at, 0.04);
      // gone behind the globe: away at once (a fade would leave it where it was)
      if (!p) {
        pin.el.style.opacity = 0;
        pin.el.style.visibility = 'hidden';
        continue;
      }
      // fade toward the limb of the globe, as the labels do
      pin.el.style.visibility = '';
      pin.el.style.opacity = Math.min(1, (p.facing - 0.3) * 2.2).toFixed(2);
      pin.el.style.transform = `translate(${(p.x - SIZE / 2).toFixed(1)}px, ${(p.y - SIZE - STEM).toFixed(1)}px)`;
      pin.el.classList.toggle('on', pin.r.id === selected);
    }
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
    // where the pins are, so the name labels can keep clear of them
    boxes: () => taken,
    mark(id) {
      selected = id;
      for (const pin of pins) pin.el.title = tr(pin.r.name);
      this.update(true);
    },
  };
}
