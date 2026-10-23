import { FAMILY, AES } from '../palette.js';
import { SCRIPT_GROUPS, NO_SCRIPT, mainScript, scriptGroup } from '../scripts.js';
import { t, formatNumber } from '../i18n/index.js';
import { esc, dot, icon } from './html.js';

// Bottom-left control card: globe/map switch, stackable layers, colouring and
// the key. Clicking a key entry isolates it on the map; hovering previews.
export function createLayers(app) {
  const el = document.getElementById('layers');
  const { data } = app;
  let open = window.innerWidth >= 900;

  const familyEntries = () => [
    ...FAMILY.named.map((id) => ({ key: id, color: FAMILY.colors[id], label: app.name(data.byId.get(id)), test: (l) => l.family === id })),
    { key: 'other', color: FAMILY.other, label: t('other'), test: (l) => !l.isolate && l.family !== 'sign1238' && !FAMILY.named.includes(l.family), swatches: true },
    { key: 'isolate', color: FAMILY.isolate, label: t('isolate'), test: (l) => l.isolate },
    { key: 'sign', color: FAMILY.sign, label: t('sign'), test: (l) => l.family === 'sign1238', diamond: true },
  ];
  const statusEntries = () =>
    AES.slice(1).concat(AES[0]).map((a) => ({ key: `aes${a.level}`, color: a.color, label: t('aes')[a.level], test: (l) => l.aes === a.level, hollow: a.level === 6 }));
  const scriptOf = (l) => scriptGroup(mainScript(app.state.scripts, l.id))?.key ?? 'noScript';
  const scriptEntries = () => [
    ...SCRIPT_GROUPS.map((g) => ({ key: g.key, color: g.color, label: t(g.key), test: (l) => l.family !== 'sign1238' && scriptOf(l) === g.key })),
    { key: 'noScript', color: NO_SCRIPT, label: t('noScript'), test: (l) => l.family !== 'sign1238' && scriptOf(l) === 'noScript' },
    { key: 'sign', color: FAMILY.sign, label: t('sign'), test: (l) => l.family === 'sign1238', diamond: true },
  ];
  const entries = () => {
    const m = app.state.colorMode;
    return m === 'status' ? statusEntries() : m === 'script' ? scriptEntries() : m === 'feature' ? [] : familyEntries();
  };
  const idsFor = (entry) => new Set(data.languages.filter(entry.test).map((l) => l.id));
  const counts = new Map();
  const count = (entry) => {
    const k = `${app.state.colorMode}:${entry.key}`;
    if (!counts.has(k)) counts.set(k, data.languages.filter(entry.test).length);
    return counts.get(k);
  };
  // a few of the muted secondary hues, to show what "other families" look like
  const secondary = () => [...new Set(Object.values(FAMILY.colors))].filter((c) => !FAMILY.named.some((id) => FAMILY.colors[id] === c)).slice(0, 5);

  function render() {
    const s = app.state;
    const list = entries();
    const toggle = (name, label, cls = '') =>
      `<label class="toggle${cls}"><input type="checkbox" data-layer="${name}" ${s.layers[name] ? 'checked' : ''}/><span class="box"></span>${esc(label)}</label>`;
    el.innerHTML = `
      <button class="layers-head" type="button" aria-expanded="${open}">${icon.layers}<span>${t('layers')}</span>${open ? `<i class="layers-x" aria-hidden="true">${icon.close}</i>` : ''}</button>
      <div class="layers-body ${open ? '' : 'closed'}">
        <div class="seg">
          <button class="${s.mode === '3d' ? 'on' : ''}" data-mode="3d">${t('view3d')}</button>
          <button class="${s.mode === '2d' ? 'on' : ''}" data-mode="2d">${t('view2d')}</button>
        </div>
        <div class="toggles">
          ${toggle('dots', t('layerDots'))}${toggle('regions', t('layerRegions'))}${toggle('lineage', t('layerLineage'))}${toggle('labels', t('layerLabels'))}${toggle('relics', t('layerRelics'), ' wide')}
        </div>
        <div class="row-label">${t('colorBy')}</div>
        <div class="seg small">
          <button class="${s.colorMode === 'family' ? 'on' : ''}" data-color="family">${t('colorFamily')}</button>
          <button class="${s.colorMode === 'status' ? 'on' : ''}" data-color="status">${t('colorStatus')}</button>
          <button class="${s.colorMode === 'script' ? 'on' : ''}" data-color="script">${t('colorScript')}</button>
          <button class="${s.colorMode === 'feature' ? 'on' : ''}" data-color="feature">${t('colorFeature')}</button>
        </div>
        <ul class="legend-list">
          ${list.map((e) => `<li data-key="${e.key}" class="${s.legendFilter === e.key ? 'on' : s.legendFilter ? 'muted' : ''}">
            ${e.swatches ? `<span class="swatches">${secondary().map((c) => `<i style="background:${c}"></i>`).join('')}</span>` : dot(e.color, e)}
            <span class="lbl">${esc(e.label)}</span><span class="n">${formatNumber(count(e))}</span></li>`).join('')}
        </ul>
        <div class="legend-note">${s.colorMode === 'status' ? t('aesNote') : s.colorMode === 'script' ? t('scriptNote') : `${t('otherNote')} ${t('extinctHollow')}`} ${t('dotMeaning')}</div>
      </div>`;

    el.querySelector('.layers-head').onclick = () => {
      open = !open;
      render();
    };
    el.querySelectorAll('[data-mode]').forEach((b) => (b.onclick = () => app.setMode(b.dataset.mode)));
    el.querySelectorAll('[data-layer]').forEach((c) => (c.onchange = () => app.setLayer(c.dataset.layer, c.checked)));
    el.querySelectorAll('[data-color]').forEach((b) => (b.onclick = () => {
      if (b.dataset.color === 'feature') return app.go({ view: 'features', arg: null, arg2: null });
      app.state.legendFilter = null;
      app.setColorMode(b.dataset.color);
      app.refreshFocus();
    }));
    el.querySelectorAll('.legend-list li').forEach((li) => {
      const entry = list.find((e) => e.key === li.dataset.key);
      li.onclick = () => {
        app.state.legendFilter = app.state.legendFilter === entry.key ? null : entry.key;
        app.state.transient = null;
        render();
        app.refreshFocus();
      };
      li.onmouseenter = () => {
        app.state.transient = { ids: idsFor(entry) };
        app.refreshFocus();
      };
      li.onmouseleave = () => {
        app.state.transient = null;
        app.refreshFocus();
      };
    });
  }

  // on a phone the open card covers much of the map: a tap on the map closes
  // it, and only closes it (the tap does not also pick a language)
  document.addEventListener('pointerdown', (e) => {
    if (!open || window.innerWidth >= 900 || el.contains(e.target) || el.classList.contains('off')) return;
    if (e.target.closest('.topbar, #panel, #sheet, #report, .crop-modal')) return;
    open = false;
    render();
    if (e.target.closest('#globe, #labels')) e.stopPropagation();
  }, true);

  return {
    render,
    show(on) {
      el.classList.toggle('off', !on);
    },
    focus() {
      const key = app.state.legendFilter;
      const entry = key && entries().find((e) => e.key === key);
      return entry ? { ids: idsFor(entry) } : null;
    },
  };
}
