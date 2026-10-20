import { hierarchy, tree as d3tree } from 'd3-hierarchy';
import { select } from 'd3-selection';
import { zoom as d3zoom, zoomIdentity } from 'd3-zoom';
import 'd3-transition';
import { groupColor, FAMILY } from '../palette.js';
import { NOTES } from '../content/notes.js';
import { t, tr, formatNumber } from '../i18n/index.js';
import { esc, icon, dot } from './html.js';

const ROW = 24;
const COL = 250;
const MAX_LABEL = 28;
const clip = (s) => ([...s].length > MAX_LABEL ? `${[...s].slice(0, MAX_LABEL - 1).join('')}…` : s);
const firstSentence = (s) => (s.match(/^.*?[。！？]|^.*?[.!?](\s|$)/)?.[0] ?? s).trim();

export function createTree(app) {
  const { data } = app;
  let current = null;

  const hoverIds = (x) => ({ ids: new Set(x.kind === 'group' ? x.langs.map((l) => l.id) : [x.id]), strong: x.kind === 'lang' ? [x.id] : [] });
  const preview = (x) => {
    app.state.transient = x ? hoverIds(x) : null;
    app.refreshFocus();
  };

  function fullscreenButton(sheet) {
    const on = app.state.treeFull;
    return `<button class="btn small ghost" data-act="full" title="${on ? t('exitFullscreen') : t('fullscreen')}">${on ? icon.shrink : icon.expand}<span>${on ? t('exitFullscreen') : t('fullscreen')}</span></button>`;
  }
  function bindFullscreen(sheet, onChange) {
    sheet.querySelector('[data-act=full]').onclick = () => {
      app.state.treeFull = !app.state.treeFull;
      sheet.classList.toggle('full', app.state.treeFull);
      sheet.querySelector('[data-act=full]').outerHTML = fullscreenButton(sheet);
      bindFullscreen(sheet, onChange);
      app.layout();
      onChange?.();
    };
  }

  // ── index of all families ───────────────────────────────
  function renderIndex(sheet) {
    current = null;
    const families = data.families.filter((f) => f.n > 1);
    const singles = data.families.filter((f) => f.n === 1);
    const isolates = [...data.isolates, ...singles].sort((a, b) => app.name(a).localeCompare(app.name(b)));
    const max = families[0].n;
    sheet.innerHTML = `
      <div class="sheet-head">
        <div class="head-tools">${fullscreenButton(sheet)}</div>
        <div class="kicker">${t('navTree')}</div>
        <h2>${t('treeTitle')}</h2>
        <p>${esc(t('treeIntro', families.length, isolates.length))}</p>
        <a class="btn small ghost all-link" href="#/all">${icon.tree}${t('navAll')}${icon.arrow}</a>
      </div>
      <div class="sheet-body">
        <div class="index-h">${t('treeFamilies')}</div>
        <ul class="fam-index">${families.map((f) => {
          const c = groupColor(f.id);
          return `<li data-id="${f.id}">${dot(c)}
            <div><div class="fi-name">${esc(app.name(f))}${app.altName(f) ? `<small>${esc(app.altName(f))}</small>` : ''}</div>
            <div class="fi-bar"><i style="width:${Math.max(0.6, (100 * f.n) / max)}%;background:${c === FAMILY.other ? 'var(--ink-3)' : c}"></i></div></div>
            <span class="fi-n">${formatNumber(f.n)}</span></li>`;
        }).join('')}</ul>
        <div class="index-h">${t('treeIsolates')} · ${formatNumber(isolates.length)}</div>
        <div class="iso-cloud">${isolates.map((l) => {
          const lang = l.kind === 'group' ? l.langs[0] : l;
          return `<a data-sel="${lang.id}" class="${lang.aes === 6 ? 'ext' : ''}">${esc(app.name(l))}</a>`;
        }).join('')}</div>
        <div class="index-h">${t('treeOther')}</div>
        <ul class="fam-index">${data.pseudo.filter((p) => p.n > 0).map((p) => `<li data-id="${p.id}">${dot(groupColor(p.id))}
          <div><div class="fi-name">${esc(app.name(p))}</div></div><span class="fi-n">${formatNumber(p.n)}</span></li>`).join('')}</ul>
      </div>`;
    bindFullscreen(sheet);
    sheet.querySelectorAll('.fam-index li').forEach((li) => {
      li.onclick = () => app.go({ view: 'tree', arg: li.dataset.id, arg2: null, sel: null });
      li.onmouseenter = () => preview(data.byId.get(li.dataset.id));
      li.onmouseleave = () => preview(null);
    });
    sheet.querySelectorAll('.iso-cloud a').forEach((a) => {
      a.onclick = () => app.select(a.dataset.sel);
      a.onmouseenter = () => preview(data.byId.get(a.dataset.sel));
      a.onmouseleave = () => preview(null);
    });
  }

  // ── one family as a collapsible tree ────────────────────
  function build(id) {
    const node = (x) => {
      const kids = (data.children.get(x.id) ?? []).map((c) => data.byId.get(c));
      kids.sort((a, b) => (b.kind === 'group' ? b.n : 1) - (a.kind === 'group' ? a.n : 1) || app.name(a).localeCompare(app.name(b)));
      return { x, children: kids.map(node) };
    };
    const root = hierarchy(node(data.byId.get(id)));
    root.each((d) => {
      d.id = d.data.x.id;
      d._children = d.children;
    });
    // open the first level only (two when there is a whole screen to fill)
    const open = app.state.treeFull ? 2 : 1;
    root.each((d) => {
      if (d.depth >= open) d.children = null;
    });
    return root;
  }

  function expandTo(root, id) {
    // collapsed nodes are not visited by each(); walk the full structure
    const walk = (d) => {
      if (d.id === id) return d;
      for (const c of d._children ?? []) {
        const r = walk(c);
        if (r) return r;
      }
      return null;
    };
    const target = walk(root);
    if (!target) return null;
    for (let p = target.parent; p; p = p.parent) p.children = p._children;
    return target;
  }

  function renderFamily(sheet, familyId, selId) {
    const fam = data.byId.get(familyId);
    if (!fam) return renderIndex(sheet);
    const note = NOTES[familyId];
    const color = groupColor(data.topOf(familyId).id);
    sheet.innerHTML = `
      <div class="sheet-head">
        <div class="head-tools">${fullscreenButton(sheet)}</div>
        <a class="back" href="#/tree">${icon.back}${t('treeTitle')}</a>
        <h2>${esc(app.name(fam))}</h2>
        <p>${app.altName(fam) ? `${esc(app.altName(fam))} · ` : ''}${esc(t('langsCount', fam.n ?? 1))}${note ? ` — ${esc(firstSentence(tr(note)))}` : ''}</p>
      </div>
      <div class="sheet-body" style="padding:0">
        <div class="tree-tools">
          <button class="btn small ghost" data-act="expand">${t('expandAll')}</button>
          <button class="btn small ghost" data-act="collapse">${t('collapseAll')}</button>
        </div>
        <div class="tree-wrap"><svg></svg></div>
        <div class="tree-hint">${t('treeHint')}</div>
      </div>`;
    app.state.treeFocus = hoverIds(fam);
    app.refreshFocus();
    if (fam.kind === 'group') app.globe.framePoints(fam.langs, { duration: 1600 });

    const root = build(familyId);
    const svg = select(sheet.querySelector('.tree-wrap svg'));
    const g = svg.append('g');
    const linksG = g.append('g');
    const nodesG = g.append('g');
    const zoom = d3zoom().scaleExtent([0.2, 2.5]).on('zoom', (e) => g.attr('transform', e.transform));
    svg.call(zoom).on('dblclick.zoom', null);
    const layout = d3tree().nodeSize([ROW, COL]).separation((a, b) => (a.parent === b.parent ? 1 : 1.25));
    let selected = selId ?? null;
    let pathIds = new Set();
    const isLang = (d) => d.data.x.kind === 'lang';

    function setPath() {
      pathIds = new Set();
      let target = null;
      root.each((d) => {
        if (d.id === selected) target = d;
      });
      for (let p = target; p; p = p.parent) pathIds.add(p.id);
    }

    function update(source, { center = null } = {}) {
      layout(root);
      setPath();
      const nodes = root.descendants();
      const dur = 420;
      const elbow = (s, tg) => `M${s.y},${s.x}C${(s.y + tg.y) / 2},${s.x} ${(s.y + tg.y) / 2},${tg.x} ${tg.y},${tg.x}`;
      const from = source._pos ?? source;
      linksG.selectAll('path').data(root.links(), (d) => d.target.id).join(
        (enter) => enter.append('path').attr('class', 'tree-link').attr('d', () => elbow(from, from)),
        (upd) => upd,
        (exit) => exit.transition().duration(dur).attr('d', () => elbow(source, source)).remove(),
      )
        .classed('path', (d) => pathIds.has(d.target.id))
        .transition().duration(dur).attr('d', (d) => elbow(d.source, d.target));

      const node = nodesG.selectAll('g.tree-node').data(nodes, (d) => d.id);
      const enter = node.enter().append('g')
        .attr('class', (d) => `tree-node ${isLang(d) ? 'lang' : 'group'}`)
        .attr('transform', `translate(${from.y},${from.x})`)
        .style('opacity', 0);
      enter.append('circle');
      enter.append('text').attr('dy', '0.32em').attr('x', 9);
      enter.append('title');
      enter.on('click', (e, d) => {
        if (isLang(d)) return app.select(d.id);
        d.children = d.children ? null : d._children;
        update(d);
      });
      enter.on('mouseenter', (e, d) => preview(d.data.x));
      enter.on('mouseleave', () => preview(null));

      const all = enter.merge(node);
      all.classed('on', (d) => d.id === selected);
      all.select('title').text((d) => app.name(d.data.x));
      all.select('circle')
        .attr('r', (d) => (isLang(d) ? 4 : 4.5))
        .attr('class', (d) => (isLang(d) ? 'lang-dot' : 'g'))
        .attr('fill', (d) => {
          if (isLang(d)) return d.data.x.aes === 6 ? '#f8f4ec' : app.colorOf(d.data.x);
          return d._children && !d.children ? (color === FAMILY.other ? '#6d655a' : color) : '#f8f4ec';
        })
        .attr('stroke', (d) => (isLang(d) && d.data.x.aes === 6 ? app.colorOf(d.data.x) : null))
        .attr('stroke-width', (d) => (isLang(d) && d.data.x.aes === 6 ? 1.6 : null));
      all.select('text').each(function (d) {
        const el = select(this);
        el.text(clip(app.name(d.data.x)));
        if (!isLang(d)) el.append('tspan').attr('class', 'cnt').text(`  ${formatNumber(d.data.x.n)}`);
      });
      all.transition().duration(dur).attr('transform', (d) => `translate(${d.y},${d.x})`).style('opacity', 1);
      node.exit().transition().duration(dur).attr('transform', `translate(${source.y},${source.x})`).style('opacity', 0).remove();
      nodes.forEach((d) => (d._pos = { x: d.x, y: d.y }));
      if (center) {
        const box = svg.node().getBoundingClientRect();
        // zoom out a little so long lineages fit, but never past legibility
        const k = Math.max(0.6, Math.min(1, (box.width - 320) / Math.max(1, center.y)));
        const tx = Math.min(40, box.width - 300 - center.y * k);
        svg.transition().duration(600).call(zoom.transform, zoomIdentity.translate(tx, box.height / 2 - center.x * k).scale(k));
      }
    }

    root._pos = { x: 0, y: 0 };
    const target = selected ? expandTo(root, selected) : null;
    update(root, target ? { center: target } : {});
    const home = () => svg.call(zoom.transform, zoomIdentity.translate(40, svg.node().getBoundingClientRect().height / 2));
    if (!target) home();

    sheet.querySelector('[data-act=expand]').onclick = () => {
      const open = (d) => {
        d.children = d._children;
        (d._children ?? []).forEach(open);
      };
      open(root);
      update(root);
    };
    sheet.querySelector('[data-act=collapse]').onclick = () => {
      const close = (d) => {
        (d._children ?? []).forEach(close);
        if (d.depth >= 1) d.children = null;
      };
      close(root);
      update(root);
      home();
    };
    bindFullscreen(sheet, () => setTimeout(() => update(root, selected ? { center: expandTo(root, selected) } : {}), 420));

    current = {
      mark(sel) {
        selected = sel;
        const tg = sel ? expandTo(root, sel) : null;
        update(root, tg ? { center: tg } : {});
      },
    };
  }

  return {
    renderIndex,
    renderFamily,
    markSelection(sel) {
      current?.mark(sel);
    },
  };
}
