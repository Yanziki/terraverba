import { FEATURES, FEATURE_INTRO, GENERIC, HAS, LACKS, SOUND_PICKS } from '../content/features.js';
import { t, tr, formatNumber } from '../i18n/index.js';
import { esc, dot } from './html.js';

// Feature maps. Three depths of the same idea: a dozen plain-language
// questions, every Grambank feature, and a search by sound (PHOIBLE).
// The route argument picks the map: "tone", "gb:GB057", "sound:θ", or a tab.
export function createFeatures(app) {
  const { data } = app;
  let token = 0;

  const examples = (langs) =>
    langs.sort((a, b) => (b.speakers ?? 0) - (a.speakers ?? 0)).slice(0, 4)
      .map((l) => `<a class="chip" href="#" data-sel="${l.id}" data-hover="${l.id}">${esc(app.name(l))}</a>`).join('');

  // a value per language → colours, legend counts and the lit set on the map
  function show(values, entries) {
    const byCode = new Map(entries.map((e) => [e.code, { ...e, langs: [] }]));
    for (const [id, code] of values) byCode.get(code)?.langs.push(data.byId.get(id));
    const legend = [...byCode.values()].filter((e) => e.langs.length);
    app.applyFeature({ values, legend });
    return legend;
  }

  function legendHtml(legend, total) {
    return `<ul class="flegend">${legend.map((e) => `<li data-code="${esc(e.code)}">
        ${dot(e.color)}<span class="lbl">${esc(e.label)}</span>
        <span class="bar"><i style="width:${(100 * e.langs.length) / total}%;background:${e.color}"></i></span>
        <span class="n">${formatNumber(e.langs.length)}</span></li>
        <li class="ex">${examples(e.langs)}</li>`).join('')}</ul>`;
  }

  function bindLegend(sheet, legend) {
    sheet.querySelectorAll('.flegend li[data-code]').forEach((li) => {
      const entry = legend.find((e) => e.code === li.dataset.code);
      li.onclick = () => {
        const on = !li.classList.contains('on');
        sheet.querySelectorAll('.flegend li[data-code]').forEach((x) => x.classList.toggle('on', on && x === li));
        app.state.featureOnly = on ? new Set(entry.langs.map((l) => l.id)) : null;
        app.refreshFocus();
      };
    });
  }

  async function curated(body, id) {
    const f = await data.features();
    const feature = FEATURES.find((x) => x.id === id) ?? FEATURES[0];
    const col = f.features[feature.id];
    const values = new Map();
    for (let i = 0; i < f.langs.length; i++) {
      const c = col.values[i];
      if (c !== '.' && data.byId.has(f.langs[i])) values.set(f.langs[i], col.codes[+c]);
    }
    const entries = col.codes.map((code) => ({ code, label: tr(feature.codes[code].label), color: feature.codes[code].color }));
    const legend = show(values, entries);
    body.innerHTML = `
      <ul class="fquestions">${FEATURES.map((x) => `<li class="${x === feature ? 'on' : ''}"><a href="#/features/${x.id}">${esc(tr(x.title))}</a>
        ${x === feature ? `<div class="fdetail">
          <p>${esc(tr(x.body))}</p>
          ${legendHtml(legend, values.size)}
          <div class="hint">${esc(t('featureCoverage', values.size))} · ${esc(tr(x.note))}</div>
        </div>` : ''}</li>`).join('')}</ul>`;
    return legend;
  }

  async function grambank(body, pid) {
    const gb = await data.grambank();
    const param = gb.params.find((p) => p.id === pid);
    body.innerHTML = `
      <p class="hint">${t('gbIntro')}</p>
      <input class="fsearch" type="search" placeholder="${esc(t('gbSearch'))}" />
      <div class="fpick"></div>
      <ul class="gblist"></ul>`;
    const list = body.querySelector('.gblist');
    const draw = (q) => {
      const ql = q.toLowerCase();
      list.innerHTML = gb.params.filter((p) => !q || p.id.toLowerCase().includes(ql) || p.name.toLowerCase().includes(ql))
        .map((p) => `<li class="${p === param ? 'on' : ''}"><a href="#/features/gb:${p.id}"><span class="mono">${p.id}</span> ${esc(p.name)}</a></li>`).join('');
    };
    body.querySelector('.fsearch').oninput = (e) => draw(e.target.value.trim());
    draw('');
    if (!param) return null;
    const col = gb.params.indexOf(param);
    const values = new Map();
    gb.langs.forEach((g, i) => {
      const v = gb.rows[i][col];
      if (v !== '.' && v !== '?' && data.byId.has(g)) values.set(g, v);
    });
    // the common binary codes read in the interface language; multistate ones keep Grambank's wording
    const word = (desc) => ({ absent: t('gbAbsent'), present: t('gbPresent') })[desc] ?? desc;
    const entries = Object.entries(param.codes).filter(([v]) => v !== '?').map(([v, desc]) => ({ code: v, label: `${v} · ${word(desc)}`, color: GENERIC[v] ?? GENERIC[0] }));
    const legend = show(values, entries);
    body.querySelector('.fpick').innerHTML = `<div class="fdetail"><h4><span class="mono">${param.id}</span> ${esc(param.name)}</h4>
      ${legendHtml(legend, values.size)}<div class="hint">${esc(t('featureCoverage', values.size))} · Grambank v1.0.3</div></div>`;
    // bring the chosen feature into view inside the list only, not the whole sheet
    const on = list.querySelector('li.on');
    if (on) list.scrollTop = on.offsetTop - list.offsetTop - 60;
    return legend;
  }

  async function sound(body, seg) {
    const ph = await data.phoible();
    body.innerHTML = `
      <p class="hint">${t('soundIntro')}</p>
      <form class="fsound"><input class="fsearch" type="search" placeholder="${esc(t('soundSearch'))}" value="${esc(seg ?? '')}" /></form>
      <div class="chips sound-picks">${SOUND_PICKS.map((s) => `<a class="chip ipa" href="#/features/sound:${encodeURIComponent(s)}">${esc(s)}</a>`).join('')}</div>
      <div class="fpick"></div>`;
    body.querySelector('.fsound').onsubmit = (e) => {
      e.preventDefault();
      const v = e.target.querySelector('input').value.trim();
      if (v) app.go({ view: 'features', arg: `sound:${v}`, sel: app.route.sel });
    };
    if (!seg) return null;
    const idx = ph.segs.indexOf(seg);
    const values = new Map();
    ph.langs.forEach((g, i) => {
      if (data.byId.has(g)) values.set(g, idx >= 0 && ph.inv[i].includes(idx) ? 'has' : 'lacks');
    });
    const legend = show(values, [
      { code: 'has', label: t('soundHas', seg), color: HAS },
      { code: 'lacks', label: t('soundLacks', seg), color: LACKS },
    ]);
    const n = legend.find((e) => e.code === 'has')?.langs.length ?? 0;
    body.querySelector('.fpick').innerHTML = `<div class="fdetail"><h4 class="ipa">/${esc(seg)}/</h4>
      <p>${esc(t('soundShare', n, values.size))}</p>
      ${legendHtml(legend, values.size)}<div class="hint">PHOIBLE 2.0 · ${esc(t('soundNote'))}</div></div>`;
    return legend;
  }

  async function render(sheet, arg) {
    const my = ++token;
    const [tab, key] = !arg ? ['curated', null] : arg.startsWith('gb') ? ['gb', arg.split(':')[1]] : arg.startsWith('sound') ? ['sound', arg.split(':').slice(1).join(':')] : ['curated', arg];
    sheet.innerHTML = `
      <div class="sheet-head">
        <div class="kicker">${t('navFeatures')}</div>
        <h2>${t('featuresTitle')}</h2>
        <p>${esc(tr(FEATURE_INTRO))}</p>
        <div class="seg ftabs">
          <a class="${tab === 'curated' ? 'on' : ''}" href="#/features">${t('tabCurated')}</a>
          <a class="${tab === 'gb' ? 'on' : ''}" href="#/features/gb">${t('tabGrambank')}</a>
          <a class="${tab === 'sound' ? 'on' : ''}" href="#/features/sound">${t('tabSound')}</a>
        </div>
      </div>
      <div class="sheet-body"><p class="muted">…</p></div>`;
    const body = sheet.querySelector('.sheet-body');
    const decoded = key ? decodeURIComponent(key) : null;
    const legend = tab === 'gb' ? await grambank(body, decoded) : tab === 'sound' ? await sound(body, decoded) : await curated(body, decoded ?? 'tone');
    if (my !== token) return;
    if (!legend) app.applyFeature(null, { keepMode: true });
    else bindLegend(sheet, legend);
    body.querySelectorAll('[data-sel]').forEach((a) => (a.onclick = (e) => {
      e.preventDefault();
      app.select(a.dataset.sel);
    }));
    app.bindHover(body);
  }

  // a compact profile for the language panel
  async function profile(l) {
    const f = await data.features();
    const i = f.index.get(l.id);
    if (i == null) return null;
    return FEATURES.map((x) => {
      const c = f.features[x.id].values[i];
      if (c === '.') return null;
      const code = f.features[x.id].codes[+c];
      return { id: x.id, label: tr(x.short), value: tr(x.codes[code].label), color: x.codes[code].color };
    }).filter(Boolean);
  }

  return { render, profile };
}
