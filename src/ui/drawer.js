// On a phone the language panel and the sheets (stories, the daily quiz, the
// tree…) are drawers over the bottom of the map. A grip at the top drags each
// one between three heights: a strip with just its title, so the map is free
// to look at and turn; half the screen; and the whole screen. A tap on the grip
// switches between the strip and half. The sheets also get a close button.
// A drawer opens at half height, and the panel comes back to half when it
// shows another language.
import { t } from '../i18n/index.js';
import { icon } from './html.js';

export const PEEK = 92; // px of drawer left showing as a strip
const narrow = () => window.innerWidth < 900;

export function createDrawers(app, { onClose }) {
  const els = [document.getElementById('panel'), document.getElementById('sheet')];
  const heightOf = (el) => el.getBoundingClientRect().height;
  // the heights of the three states, as laid out by the stylesheet
  const heights = (el) => {
    const was = el.dataset.snap;
    const out = {};
    el.classList.add('measuring');
    for (const s of ['peek', 'half', 'max']) {
      el.dataset.snap = s;
      out[s] = heightOf(el);
    }
    el.dataset.snap = was;
    // settle on the real height before transitions come back, or it would animate from the last one measured
    heightOf(el);
    el.classList.remove('measuring');
    return out;
  };
  const snap = (el, s) => {
    if (el.dataset.snap === s) return;
    el.dataset.snap = s;
    app.layout();
  };

  for (const el of els) {
    el.dataset.snap = 'half';
    // the content is rewritten often: keep a grip at the top whatever it is
    const grip = () => {
      if (el.querySelector(':scope > .grip')) return;
      const g = document.createElement('div');
      g.className = 'grip';
      if (el.id === 'sheet') g.innerHTML = `<button type="button" class="close grip-close" aria-label="${t('close')}">${icon.close}</button>`;
      el.prepend(g);
    };
    let wasOn = el.classList.contains('on');
    new MutationObserver((list) => {
      grip();
      const on = el.classList.contains('on');
      const opened = on && !wasOn;
      wasOn = on;
      const newContent = list.some((m) => m.type === 'childList' && [...m.addedNodes].some((n) => n.nodeType === 1 && !n.classList.contains('grip')));
      if (opened || (el.id === 'panel' && newContent && el.dataset.snap === 'peek')) snap(el, 'half');
    }).observe(el, { childList: true, attributes: true, attributeFilter: ['class'] });
    grip();

    // dragging: from the grip, or from a sheet's heading
    let drag = null;
    let dragEnded = 0;
    // taps are handled on click, not on pointerup: resizing the drawer any
    // earlier would land the click on whatever moved under the finger
    el.addEventListener('click', (e) => {
      if (performance.now() - dragEnded < 400) {
        e.stopPropagation();
        e.preventDefault();
      } else if (e.target.closest('.grip-close')) onClose(el);
      // a tap on the grip: strip ↔ half (from the full screen, back to half)
      else if (narrow() && e.target.closest('.grip')) snap(el, el.dataset.snap === 'half' ? 'peek' : 'half');
    }, true);
    el.addEventListener('pointerdown', (e) => {
      if (!narrow() || e.button > 0) return;
      const onGrip = e.target.closest('.grip') && !e.target.closest('.grip-close');
      const onHead = e.target.closest('.sheet-head') && !e.target.closest('button, a, input, select, textarea, label');
      if (!onGrip && !onHead) return;
      drag = { id: e.pointerId, y: e.clientY, t: performance.now(), h: heightOf(el), sizes: heights(el), moved: false, last: [e.clientY, performance.now()] };
    });
    el.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dy = e.clientY - drag.y;
      if (!drag.moved && Math.abs(dy) < 6) return;
      if (!drag.moved) {
        drag.moved = true;
        el.setPointerCapture(e.pointerId);
        el.classList.add('dragging');
      }
      const { peek, max } = drag.sizes;
      el.style.height = `${Math.min(max, Math.max(peek * 0.6, drag.h - dy))}px`;
      drag.prev = drag.last;
      drag.last = [e.clientY, performance.now()];
    });
    const end = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag;
      drag = null;
      if (!d.moved) return;
      dragEnded = performance.now();
      el.classList.remove('dragging');
      const h = heightOf(el);
      el.style.height = '';
      // where the flick was heading, a fifth of a second on
      const [y1, t1] = d.prev ?? [d.y, d.t];
      const [y2, t2] = d.last;
      const v = (y2 - y1) / Math.max(1, t2 - t1);
      const aim = h - v * 200;
      const order = Object.entries(d.sizes).sort((a, b) => Math.abs(a[1] - aim) - Math.abs(b[1] - aim));
      el.dataset.snap = '';
      snap(el, order[0][0]);
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }
}
