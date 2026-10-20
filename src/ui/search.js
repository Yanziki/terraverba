import { t } from '../i18n/index.js';
import { esc, dot } from './html.js';
import { familyColor, groupColor } from '../palette.js';

const fold = (s) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Searches every name we know — the interface language, English (Glottolog),
// the endonym, ISO 639-3 and Glottocode.
export function createSearch(app) {
  const { data } = app;
  const box = document.querySelector('.search');
  const input = box.querySelector('input');
  const results = box.querySelector('.results');
  let index = [];
  let hits = [];
  let cursor = 0;

  function reindex() {
    index = [
      ...data.languages.map((l) => ({ kind: 'lang', x: l, keys: [app.name(l), l.en, l.native, l.iso, l.id].filter(Boolean).map(fold), weight: l.speakers ?? 0 })),
      ...data.groups.filter((g) => g.n > 1).map((g) => ({ kind: 'group', x: g, keys: [app.name(g), g.en, g.id].map(fold), weight: g.n * 1e6 })),
    ];
  }

  function score(entry, q) {
    let best = Infinity;
    for (const k of entry.keys) {
      if (k === q) best = 0;
      else if (k.startsWith(q)) best = Math.min(best, 1);
      else if (k.split(/[\s\-–'·]/).some((w) => w.startsWith(q))) best = Math.min(best, 2);
      else if (q.length > 1 && k.includes(q)) best = Math.min(best, 3);
    }
    return best;
  }

  function run() {
    const q = fold(input.value.trim());
    if (!q) return close();
    hits = index
      .map((e) => [score(e, q), e])
      .filter(([s]) => s < Infinity)
      .sort((a, b) => a[0] - b[0] || b[1].weight - a[1].weight)
      .slice(0, 12)
      .map(([, e]) => e);
    cursor = 0;
    render();
  }

  function render() {
    results.innerHTML = hits.length
      ? hits.map((h, i) => {
          const x = h.x;
          const color = h.kind === 'lang' ? familyColor(x) : groupColor(data.topOf(x.id).id);
          const sub = h.kind === 'lang' ? app.familyName(x) : t('langsCount', x.n);
          return `<div class="result${i === cursor ? ' on' : ''}" data-i="${i}" role="option">
            <span class="r-kind">${t(h.kind === 'lang' ? 'searchKindLang' : 'searchKindGroup')}</span>${dot(color)}
            <span class="r-name">${esc(app.name(x))}${app.altName(x) ? ` <span class="muted" style="font-size:12px">${esc(app.altName(x))}</span>` : ''}</span>
            <span class="r-sub">${esc(sub)}</span></div>`;
        }).join('')
      : `<div class="result"><span class="muted">—</span></div>`;
    results.classList.add('on');
    results.querySelectorAll('.result[data-i]').forEach((el) => {
      el.onmousedown = (e) => {
        e.preventDefault();
        choose(hits[+el.dataset.i]);
      };
    });
  }

  function choose(h) {
    if (!h) return;
    close();
    input.value = '';
    input.blur();
    const id = h.x.id;
    const view = app.route.view;
    if (view === 'tree') {
      const top = data.topOf(id);
      return app.go({ view: 'tree', arg: top.kind === 'group' ? top.id : null, arg2: null, sel: id });
    }
    if (view === 'all' || view === 'space') return app.select(id);
    if (view !== 'globe') return app.go({ view: 'globe', arg: null, arg2: null, sel: id });
    app.select(id);
  }

  function close() {
    results.classList.remove('on');
    hits = [];
  }

  input.addEventListener('input', run);
  input.addEventListener('focus', run);
  input.addEventListener('blur', () => setTimeout(close, 120));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') cursor = Math.min(hits.length - 1, cursor + 1);
    else if (e.key === 'ArrowUp') cursor = Math.max(0, cursor - 1);
    else if (e.key === 'Enter') return choose(hits[cursor]);
    else if (e.key === 'Escape') return input.blur();
    else return;
    e.preventDefault();
    render();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === '/' && !['INPUT', 'SELECT'].includes(document.activeElement?.tagName)) {
      e.preventDefault();
      input.focus();
    }
  });
  reindex();
  return { reindex };
}
