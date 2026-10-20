import { groupColor, familyColor, FAMILY, AES } from '../palette.js';
import { t, formatNumber } from '../i18n/index.js';
import { esc } from './html.js';

// Every language and branch as one vertical outline, all unfolded. Only the
// rows on screen exist in the DOM, so 13,000 rows scroll smoothly.
const ROW = 28;
const INDENT = 18;
const fold = (s) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function createAllTree(app) {
  const { data } = app;
  let host = null;
  let rows = [];
  let collapsed = new Set();
  let filter = '';
  let selected = null;

  const roots = () => [...data.families, ...data.pseudo.filter((p) => p.n > 0), ...data.isolates];
  const kids = (x) => (data.children.get(x.id) ?? []).map((id) => data.byId.get(id))
    .sort((a, b) => (b.kind === 'group' ? b.n : 0) - (a.kind === 'group' ? a.n : 0) || (b.speakers ?? 0) - (a.speakers ?? 0) || app.name(a).localeCompare(app.name(b)));

  function flatten() {
    let keep = null;
    if (filter) {
      keep = new Set();
      for (const x of [...data.languages, ...data.groups]) {
        if (fold(app.name(x)).includes(filter) || fold(x.en).includes(filter)) {
          keep.add(x.id);
          for (const a of data.ancestors(x.id)) keep.add(a.id);
        }
      }
    }
    const out = [];
    const walk = (x, depth, guides, top) => {
      if (keep && !keep.has(x.id)) return;
      const row = { x, depth, guides, top };
      out.push(row);
      if (x.kind !== 'group' || (collapsed.has(x.id) && !keep)) return;
      const list = kids(x).filter((k) => !keep || keep.has(k.id));
      list.forEach((k, i) => walk(k, depth + 1, [...guides, i < list.length - 1], top));
    };
    for (const r of roots()) walk(r, 0, [], r);
    rows = out;
    return keep ? [...keep].filter((id) => data.byId.get(id)?.kind === 'lang').length : null;
  }

  function rowHtml(r, i) {
    const x = r.x;
    const isGroup = x.kind === 'group';
    const c = isGroup ? groupColor(r.top.id) : familyColor(x);
    // vertical guides for every ancestor level that still has siblings below
    const guides = r.guides.slice(0, -1).map((on, k) => (on ? `<i class="g" style="left:${k * INDENT + 9}px"></i>` : '')).join('');
    const elbow = r.depth ? `<i class="e${r.guides[r.guides.length - 1] ? '' : ' end'}" style="left:${(r.depth - 1) * INDENT + 9}px"></i>` : '';
    const open = isGroup && !collapsed.has(x.id);
    const meta = isGroup
      ? `<span class="n">${formatNumber(x.n)}</span>`
      : `${x.speakers ? `<span class="sp">${app.speakers(x)}</span>` : ''}<span class="st" title="${esc(t('aes')[x.aes])}" style="background:${AES[x.aes].color}"></span>`;
    return `<div class="arow ${isGroup ? 'grp' : 'lng'}${x.id === selected ? ' on' : ''}${r.depth === 0 ? ' root' : ''}" style="top:${i * ROW}px" data-i="${i}">
      <span class="stripe" style="background:${c === FAMILY.other ? 'var(--rule-strong)' : c}"></span>
      <span class="guides" style="width:${r.depth * INDENT + 8}px">${guides}${elbow}</span>
      ${isGroup ? `<span class="tw${open ? ' open' : ''}"></span>` : `<span class="dot${x.aes === 6 ? ' hollow' : ''}${x.family === 'sign1238' ? ' diamond' : ''}" style="background:${c};color:${c}"></span>`}
      <span class="nm">${esc(app.name(x))}</span>${app.altName(x) ? `<span class="alt">${esc(app.altName(x))}</span>` : ''}
      <span class="meta">${meta}</span></div>`;
  }

  function paint() {
    if (!host) return;
    const scroller = host.querySelector('.atree');
    const inner = host.querySelector('.atree-inner');
    inner.style.height = `${rows.length * ROW}px`;
    const first = Math.max(0, Math.floor(scroller.scrollTop / ROW) - 10);
    const last = Math.min(rows.length, Math.ceil((scroller.scrollTop + scroller.clientHeight) / ROW) + 10);
    let html = '';
    for (let i = first; i < last; i++) html += rowHtml(rows[i], i);
    inner.innerHTML = html;
    // which family the reader is in
    const top = rows[Math.min(rows.length - 1, Math.floor(scroller.scrollTop / ROW))]?.top;
    host.querySelector('.atree-where').textContent = top ? app.name(top) : '';
  }

  function refresh(keepScroll = true) {
    const matches = flatten();
    host.querySelector('.atree-count').textContent = matches != null ? t('allMatches', matches) : '';
    if (!keepScroll) host.querySelector('.atree').scrollTop = 0;
    paint();
  }

  function scrollTo(id) {
    const i = rows.findIndex((r) => r.x.id === id);
    if (i < 0) return;
    const scroller = host.querySelector('.atree');
    scroller.scrollTop = Math.max(0, i * ROW - scroller.clientHeight / 3);
    paint();
  }

  function render(page) {
    host = page;
    collapsed = new Set();
    filter = '';
    const families = data.families.filter((f) => f.n > 1);
    page.innerHTML = `
      <div class="page-head">
        <div class="kicker">${t('navAll')}</div>
        <h2>${t('allTitle')}</h2>
        <p>${esc(t('allIntro', data.languages.length, data.groups.length))}</p>
        <div class="atree-tools">
          <input class="atree-filter" type="search" placeholder="${esc(t('allFilter'))}" />
          <select class="atree-jump"><option value="">${esc(t('allJump'))}</option>${families.map((f) => `<option value="${f.id}">${esc(app.name(f))} · ${formatNumber(f.n)}</option>`).join('')}</select>
          <button class="btn small ghost" data-act="collapse">${t('collapseAll')}</button>
          <button class="btn small ghost" data-act="expand">${t('expandAll')}</button>
          <span class="atree-count hint"></span>
        </div>
      </div>
      <div class="atree-where"></div>
      <div class="atree"><div class="atree-inner"></div></div>`;
    const scroller = page.querySelector('.atree');
    let raf = 0;
    scroller.addEventListener('scroll', () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(paint);
    });
    let timer = 0;
    page.querySelector('.atree-filter').addEventListener('input', (e) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        filter = fold(e.target.value.trim());
        refresh(false);
      }, 160);
    });
    page.querySelector('.atree-jump').onchange = (e) => {
      if (!e.target.value) return;
      collapsed.delete(e.target.value);
      refresh();
      scrollTo(e.target.value);
      e.target.value = '';
    };
    page.querySelector('[data-act=collapse]').onclick = () => {
      collapsed = new Set(roots().filter((r) => r.kind === 'group').map((r) => r.id));
      refresh(false);
    };
    page.querySelector('[data-act=expand]').onclick = () => {
      collapsed = new Set();
      refresh(false);
    };
    page.querySelector('.atree-inner').addEventListener('click', (e) => {
      const row = e.target.closest('.arow');
      if (!row) return;
      const { x } = rows[+row.dataset.i];
      if (x.kind === 'group') {
        // the triangle folds; the name opens the branch
        if (e.target.closest('.tw') || !e.target.closest('.nm')) {
          collapsed.has(x.id) ? collapsed.delete(x.id) : collapsed.add(x.id);
          refresh();
          return;
        }
      }
      app.select(x.id);
    });
    refresh(false);
    if (app.route.sel) scrollTo(app.route.sel);
  }

  return {
    render,
    mark(sel) {
      if (!host || !host.querySelector('.atree')) return;
      if (sel === selected) return;
      selected = sel;
      paint();
    },
  };
}
