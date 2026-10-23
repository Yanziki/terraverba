import './style.css';
import './theme.css';
import { THEME_NAME } from './theme.js';
import { loadData, angle, toVec, EARTH_KM } from './data.js';
import { Globe } from './globe.js';
import { setPalette, familyColor, statusColor, FAMILY } from './palette.js';
import { NO_SCRIPT, mainScript, scriptGroup } from './scripts.js';
import { LOCALES, detectLocale, setLocale, getLocale, t, formatCount, formatNumber, onContent } from './i18n/index.js';
import { createPanel } from './ui/panel.js';
import { createTree } from './ui/tree.js';
import { createAllTree } from './ui/alltree.js';
import { createSpace } from './ui/space.js';
import { createStories } from './ui/stories.js';
import { createSearch } from './ui/search.js';
import { createLayers } from './ui/layers.js';
import { createLabels } from './ui/labels.js';
import { createFeatures } from './ui/features.js';
import { createWords } from './ui/words.js';
import { createDaily } from './ui/daily.js';
import { createPassport } from './ui/passport.js';
import { createReport } from './ui/report.js';
import { createRelics } from './ui/relics.js';
import { renderAbout } from './ui/about.js';
import { esc, icon, bindHover } from './ui/html.js';
import { NO_DATA, mergeFeatureText } from './content/features.js';
import { mergeWordText } from './content/words.js';
import { NOTES, mergeNoteText } from './content/notes.js';
import { RELICS, mergeRelicText } from './content/relics.js';
import { createDrawers, PEEK } from './ui/drawer.js';

// feature and word-map texts in the other interface languages
onContent(mergeFeatureText);
onContent(mergeWordText);
onContent(mergeNoteText);
onContent(mergeRelicText);

const $ = (s) => document.querySelector(s);
const isNarrow = () => window.innerWidth < 900;
const SHEET_VIEWS = new Set(['tree', 'stories', 'story', 'about', 'features', 'words', 'daily', 'me']);
const PAGE_VIEWS = new Set(['all', 'space']);

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, query] = raw.split('?');
  const parts = path.split('/').filter(Boolean);
  const params = new URLSearchParams(query ?? '');
  return { view: parts[0] ?? 'globe', arg: parts[1] ?? null, arg2: parts[2] ?? null, sel: params.get('sel'), report: params.has('report') };
}

function hashFor({ view = 'globe', arg, arg2, sel }) {
  const path = [view === 'globe' ? '' : view, arg, arg2].filter((x) => x != null && x !== '').join('/');
  return `#/${path}${sel ? `?sel=${encodeURIComponent(sel)}` : ''}`;
}

function loadViewPrefs() {
  const defaults = { mode: '3d', layers: { dots: true, regions: false, lineage: false, labels: true, relics: true } };
  try {
    // remembered for this tab only: a new visit always opens on the plain globe
    const saved = JSON.parse(sessionStorage.getItem('glossa-view') ?? 'null');
    return saved ? { mode: saved.mode ?? defaults.mode, layers: { ...defaults.layers, ...saved.layers } } : defaults;
  } catch {
    return defaults;
  }
}

async function boot() {
  const code = detectLocale();
  const [data] = await Promise.all([loadData(), setLocale(code)]);
  await data.loadLocale(code);
  setPalette(data.palette);
  const prefs = loadViewPrefs();
  // the welcome screen is always the globe, even after a flat-map session
  const first = parseHash();
  if (first.view === 'globe' && !first.sel) prefs.mode = '3d';

  const app = {
    data,
    state: { colorMode: 'family', legendFilter: null, hero: true, transient: null, story: null, treeFocus: null, treeFull: false, mode: prefs.mode, layers: prefs.layers },
    route: parseHash(),
  };

  app.name = (x) => data.names[x.id] ?? x.en;
  // the second name under a title: the English (Glottolog) name when the interface shows another
  app.altName = (x) => (getLocale() !== 'en' && app.name(x) !== x.en ? x.en : null);
  app.colorOf = (l) => {
    if (app.state.colorMode === 'status') return statusColor(l);
    if (app.state.colorMode === 'script') {
      if (l.family === 'sign1238') return FAMILY.sign;
      return scriptGroup(mainScript(app.state.scripts, l.id))?.color ?? NO_SCRIPT;
    }
    if (app.state.colorMode === 'feature' && app.state.feature) {
      const code = app.state.feature.values.get(l.id);
      return code == null ? NO_DATA : app.state.feature.colors.get(code) ?? NO_DATA;
    }
    return familyColor(l);
  };
  app.bindHover = (root) => bindHover(root, app);
  // on the word map, labels show the word instead of the language name
  app.labelFor = (l) => app.state.wordLabels?.get(l.id) ?? app.name(l);
  app.familyName = (l) => {
    if (l.isolate) return t('isolate');
    const top = l.family ? data.byId.get(l.family) : null;
    return top ? app.name(top) : t('unknown');
  };
  app.speakers = (l) => formatCount(l.speakers);
  app.saveView = () => {
    try {
      sessionStorage.setItem('glossa-view', JSON.stringify({ mode: app.state.mode, layers: app.state.layers }));
    } catch {}
  };

  app.go = (patch) => {
    const h = hashFor({ ...app.route, ...patch });
    if (h === location.hash) onRoute();
    else location.hash = h;
  };
  app.select = (sel) => app.go({ sel });

  // ── globe ─────────────────────────────────────────────
  const tooltip = $('#tooltip');
  const globe = new Globe($('#globe'), data, {
    onHover: (l, p) => {
      if (!l || !p) return tooltip.classList.remove('on');
      const sub = [app.altName(l), l.native && l.native !== l.en && l.native !== app.name(l) ? l.native : null].filter(Boolean);
      const w = app.state.words?.get(l.id);
      tooltip.innerHTML = `
        ${w ? `<div class="tt-word">${esc(w.word)}${w.roman ? ` <span>${esc(w.roman)}</span>` : ''}</div>` : ''}
        <div class="tt-name">${esc(app.name(l))}</div>
        ${sub.length ? `<div class="tt-sub">${esc(sub.join(' · '))}</div>` : ''}
        <div class="tt-fam"><span class="dot${l.aes === 6 ? ' hollow' : ''}" style="background:${app.colorOf(l)};color:${app.colorOf(l)}"></span>${esc(app.familyName(l))}${l.speakers ? ` · ${esc(app.speakers(l))}` : ''}</div>`;
      const r = globe.renderer.domElement.getBoundingClientRect();
      tooltip.style.left = `${Math.min(r.left + p.x + 16, window.innerWidth - tooltip.offsetWidth - 12)}px`;
      tooltip.style.top = `${Math.min(r.top + p.y + 14, window.innerHeight - tooltip.offsetHeight - 12)}px`;
      tooltip.classList.add('on');
    },
    onPick: (hit) => {
      dismissHero();
      // the daily quiz takes map clicks as answers
      if (app.state.pickHandler) return app.state.pickHandler(hit);
      if (hit.lang) return app.select(hit.lang.id);
      if (hit.empty) return app.select(null);
      // a place on the map: the languages around it, whatever the borders
      const km = Math.round(Math.min(900, Math.max(60, globe.kmPerPixel() * 110)) / 10) * 10;
      app.select(`@${hit.lat.toFixed(2)},${hit.lon.toFixed(2)},${km}`);
    },
    onMove: (kind) => {
      if (kind === 'start') dismissHero();
      else {
        labels.update();
        relics.update();
      }
    },
  });
  app.globe = globe;
  // the browser dropped the globe and would not give it back, even in the light tier
  globe.onGraphicsFailed = () => {
    if ($('#gfx-fail')) return;
    const box = document.createElement('div');
    box.id = 'gfx-fail';
    box.innerHTML = `<p>${esc(t('gfxFail'))}${esc(t('gfxChromeHint'))}</p><div class="actions"><button class="btn small" type="button" data-act="reload">${esc(t('gfxReload'))}</button><a class="btn small ghost" href="#/all">${esc(t('gfxBrowse'))}</a></div>`;
    box.querySelector('[data-act=reload]').onclick = () => location.reload();
    document.body.append(box);
  };
  globe.setColors(app.colorOf);
  // labels and relics are HTML overlays, not globe layers
  for (const [name, on] of Object.entries(app.state.layers)) if (name !== 'labels' && name !== 'relics') globe.setLayer(name, on);
  if (app.state.mode === '2d') globe.setMode('2d', 10);

  const labels = createLabels(app);
  const relics = createRelics(app);
  app.relicBoxes = () => relics.boxes();
  const panel = createPanel(app);
  const tree = createTree(app);
  const allTree = createAllTree(app);
  const space = createSpace(app);
  const stories = createStories(app);
  const layers = createLayers(app);
  const search = createSearch(app);
  const features = createFeatures(app);
  const words = createWords(app);
  const daily = createDaily(app);
  const passport = createPassport(app);
  const report = createReport(app);
  app.report = report.open;
  // phones: the panel and the sheets are drawers; closing a sheet goes back to the atlas
  createDrawers(app, {
    onClose: (el) => (el.id === 'panel' ? app.select(null) : app.go({ view: 'globe', arg: null, arg2: null })),
  });
  app.refreshLabels = () => labels.update(true);
  app.featureProfile = features.profile;

  // colour the map by one feature; languages without data stay faint
  app.applyFeature = (spec, { keepMode = false, labels: wordLabels = null, words: wordForms = null } = {}) => {
    app.state.featureOnly = null;
    app.state.wordLabels = wordLabels;
    app.state.words = wordForms;
    if (!spec) {
      app.state.feature = null;
      app.state.featureFocus = null;
      if (!keepMode && app.state.colorMode === 'feature') app.setColorMode('family');
      else if (keepMode) globe.setColors(app.colorOf);
      app.refreshFocus();
      return;
    }
    app.state.feature = { values: spec.values, colors: new Map(spec.legend.map((e) => [e.code, e.color])) };
    app.state.featureFocus = { ids: new Set(spec.values.keys()) };
    app.state.colorMode = 'feature';
    globe.setColors(app.colorOf);
    layers.render();
    labels.update(true);
    app.refreshFocus();
  };

  // ── focus: what stays lit on the globe ──────────────────
  app.refreshFocus = () => {
    const s = app.state;
    const only = s.featureOnly ? { ids: s.featureOnly } : null;
    const pick = s.transient ?? s.story ?? only ?? s.featureFocus ?? s.treeFocus ?? s.selFocus ?? layers.focus();
    const strong = new Set([...(pick?.strong ?? []), ...(s.selStrong ?? [])]);
    globe.setFocus(pick?.ids ?? null, { strong, mode: pick?.mode });
  };
  app.setColorMode = (mode) => {
    // the script table is fetched the first time it is asked for
    if (mode === 'script' && !app.state.scripts) {
      data.scripts().then((s) => {
        app.state.scripts = s;
        app.setColorMode('script');
      });
      return;
    }
    app.state.colorMode = mode;
    globe.setColors(app.colorOf);
    layers.render();
    labels.update(true);
  };
  app.setLayer = (name, on) => {
    app.state.layers[name] = on;
    if (name === 'labels') labels.update(true);
    else if (name === 'relics') {
      relics.update(true);
      labels.update(true);
    }
    else globe.setLayer(name, on);
    app.saveView();
  };
  app.setMode = (mode) => {
    app.state.mode = mode;
    globe.setMode(mode);
    app.saveView();
    layers.render();
    app.layout();
  };

  // ── layout: keep the picture centred in the free space ──
  app.layout = () => {
    const panelOn = $('#panel').classList.contains('on');
    const sheet = $('#sheet');
    const sheetOn = sheet.classList.contains('on');
    const pageOn = PAGE_VIEWS.has(app.route.view);
    // on a phone, the drawer in front may be pulled down to a strip
    const sheetFront = sheetOn && (!panelOn || app.state.front === 'sheet');
    sheet.classList.toggle('front', isNarrow() && sheetFront);
    const front = sheetFront ? sheet : panelOn ? $('#panel') : null;
    const strip = isNarrow() && front?.dataset.snap === 'peek';
    if (isNarrow()) {
      const covered = front ? (strip ? PEEK + 46 : window.innerHeight * 0.62) : 0;
      const heroLift = !covered && app.state.hero ? -window.innerHeight * 0.17 : 0;
      globe.setViewOffset(0, covered ? -(covered / 2) + 20 : heroLift);
    } else {
      let x = 0;
      if (panelOn) x -= ($('#panel').offsetWidth + 16) / 2;
      if (sheetOn && !app.state.treeFull) x += (sheet.offsetWidth + 16) / 2;
      if (!panelOn && !sheetOn && app.state.hero) x += window.innerWidth * 0.21;
      globe.setViewOffset(x, 0);
    }
    $('#coords').style.right = panelOn && !isNarrow() ? `${$('#panel').offsetWidth + 40}px` : '24px';
    $('#random').style.right = panelOn && !isNarrow() ? `${$('#panel').offsetWidth + 40}px` : '';
    $('#random').classList.toggle('off', app.state.hero || pageOn || (isNarrow() && sheetOn && !strip) || (isNarrow() && front?.dataset.snap === 'max'));
    $('#random').classList.toggle('raised', isNarrow() && panelOn && !strip);
    $('#random').classList.toggle('over-strip', strip);
    // "near me" sits just left of "random language" and follows it
    const near = $('#nearme');
    // (from where "random" is heading, not where its transition has got to)
    const randomRight = panelOn && !isNarrow() ? $('#panel').offsetWidth + 40 : isNarrow() ? 10 : 24;
    near.style.right = `${randomRight + $('#random').offsetWidth + 8}px`;
    near.classList.toggle('off', $('#random').classList.contains('off'));
    near.classList.toggle('raised', $('#random').classList.contains('raised'));
    near.classList.toggle('over-strip', strip);
    // the key sits where the sheets open, so it steps aside for them
    layers.show(!app.state.hero && !sheetOn && !pageOn && !(isNarrow() && panelOn));
    const wasPaused = globe.paused;
    globe.paused = pageOn || (sheetOn && app.state.treeFull);
    document.body.classList.toggle('page-open', globe.paused);
    // back from a full page: the pins are placed afresh for the globe as it is now
    if (wasPaused && !globe.paused) relics.update(true);
  };
  window.addEventListener('resize', () => app.layout());

  // ── hero ──────────────────────────────────────────────
  const hero = $('#hero');
  const renderHero = () => {
    const L = data.languages;
    hero.innerHTML = `
      <div class="kicker">${t('heroKicker')}</div>
      <h1>${t('heroTitle').split('\n').map(esc).join('<br>')}</h1>
      <p>${esc(t('heroBody'))}</p>
      <div class="actions">
        <button class="btn" data-act="start">${t('heroStart')}${icon.arrow}</button>
        <a class="btn ghost" href="#/stories">${t('heroStory')}</a>
        <button class="btn ghost" data-act="near">${icon.locate.replace('<svg', '<svg class="loc"')}${t('heroNear')}</button>
      </div>
      <a class="hero-link" href="#/me">${t('meHeroLink')} →</a>
      <div class="stats">
        <div class="stat"><b>${formatNumber(L.length)}</b><span>${t('statLangs')}</span></div>
        <div class="stat"><b>${formatNumber(data.families.filter((f) => f.n > 1).length)}</b><span>${t('statFamilies')}</span></div>
        <div class="stat"><b>${formatNumber(data.isolates.length)}</b><span>${t('statIsolates')}</span></div>
        <div class="stat"><b>${formatNumber(L.filter((l) => l.aes >= 2 && l.aes <= 5).length)}</b><span>${t('statEndangered')}</span></div>
      </div>`;
    hero.querySelector('[data-act=start]').onclick = () => dismissHero(true);
    hero.querySelector('[data-act=near]').onclick = locateMe;
  };
  // the Atlas tab, pressed while the welcome is up, means "show me the atlas"
  $('.nav a[data-nav=globe]').addEventListener('click', () => dismissHero(true));
  // on a phone the welcome covers half the screen: a swipe either way puts it away
  let heroSwipe = null;
  hero.addEventListener('pointerdown', (e) => {
    if (isNarrow() && !e.target.closest('button, a')) heroSwipe = { id: e.pointerId, y: e.clientY };
  });
  hero.addEventListener('pointermove', (e) => {
    if (heroSwipe?.id === e.pointerId && Math.abs(e.clientY - heroSwipe.y) > 40) {
      heroSwipe = null;
      dismissHero(true);
    }
  });
  hero.addEventListener('pointerup', () => (heroSwipe = null));

  // the country a point lies in, from the same outlines as the map question
  app.countryAt = async (lat, lon) => (await import('./ui/daily/area.js')).countryAt(lat, lon);

  // a short message at the bottom of the screen
  let toastTimer = 0;
  app.toast = (text) => {
    const el = $('#toast');
    el.textContent = text;
    el.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('on'), 5000);
  };

  // the languages around the reader: the position stays in the browser, and the
  // link carries it rounded to a tenth of a degree (about 10 km)
  function locateMe() {
    if (!navigator.geolocation) return app.toast(t('nearFail'));
    app.toast(t('nearAsking'));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        $('#toast').classList.remove('on');
        dismissHero();
        app.go({ view: 'globe', sel: `@${pos.coords.latitude.toFixed(1)},${pos.coords.longitude.toFixed(1)},150,me` });
      },
      () => app.toast(t('nearFail')),
      { timeout: 10000, maximumAge: 3600000 },
    );
  }
  function dismissHero(spin = false) {
    if (!app.state.hero) return;
    app.state.hero = false;
    hero.classList.add('off');
    app.layout();
    if (spin && app.state.mode === '3d') globe.flyTo(...globe.centerLatLon(), 3.3, 1400);
  }

  // ── chrome & interface language ─────────────────────────
  const localeBtn = $('.locale');
  const localeMenu = $('.locale-menu');
  const renderChrome = () => {
    document.querySelectorAll('[data-t]').forEach((el) => (el.textContent = t(el.dataset.t)));
    $('.search input').placeholder = t('search');
    $('.theme-toggle').dataset.tip = THEME_NAME === 'atelier' ? 'themeToDark' : 'themeToLight';
    document.querySelectorAll('[data-tip]').forEach((el) => {
      el.title = t(el.dataset.tip);
      el.setAttribute('aria-label', t(el.dataset.tip));
    });
    localeBtn.innerHTML = `${icon.globe}<span>${esc(LOCALES.find((l) => l.code === getLocale()).name)}</span>`;
    localeBtn.setAttribute('aria-label', t('interfaceLanguage'));
    localeMenu.innerHTML = LOCALES.map((l) => `<button role="menuitem" data-code="${l.code}" class="${l.code === getLocale() ? 'on' : ''}" lang="${l.code}">${esc(l.name)}</button>`).join('')
      + `<a class="menu-about" href="#/me">${t('navMe')}</a><a class="menu-about" href="#/about">${t('navAbout')}</a>`
      + `<button class="menu-about menu-feedback" type="button">${t('feedbackLink')}</button>`
      // on a phone the top bar has no room for the light/dark switch; it lives here too
      + `<button class="menu-about menu-theme" type="button">${t(THEME_NAME === 'atelier' ? 'themeToDark' : 'themeToLight')}</button>`;
    $('#random').textContent = t('random');
    $('#nearme').innerHTML = `${icon.locate}<span>${esc(t('nearMe'))}</span>`;
    document.title = `Terraverba · ${t('tagline')}`;
  };
  localeBtn.onclick = (e) => {
    e.stopPropagation();
    localeMenu.classList.toggle('on');
  };
  document.addEventListener('click', () => localeMenu.classList.remove('on'));
  localeMenu.addEventListener('click', async (e) => {
    if (e.target.closest('.menu-theme')) return switchTheme();
    if (e.target.closest('.menu-feedback')) {
      localeMenu.classList.remove('on');
      return app.report({ general: true });
    }
    const b = e.target.closest('[data-code]');
    if (!b) return;
    localeMenu.classList.remove('on');
    await setLocale(b.dataset.code, { remember: true });
    await data.loadLocale(b.dataset.code);
    renderChrome();
    renderHero();
    layers.render();
    search.reindex();
    labels.update(true);
    onRoute(true);
  });

  // ── routing ───────────────────────────────────────────
  let lastSel;
  let lastView = null;
  function onRoute(force = false) {
    const r = (app.route = parseHash());
    const sheet = $('#sheet');
    const page = $('#page');
    document.querySelectorAll('[data-nav]').forEach((a) => {
      const v = a.dataset.nav;
      a.classList.toggle('on', v === r.view || (v === 'stories' && r.view === 'story') || (v === 'tree' && r.view === 'all'));
    });
    if (r.view !== 'globe' || r.sel) dismissHero();
    // static pages link here with ?report to open the dialog for a language
    if (r.report) {
      history.replaceState(null, '', hashFor(r));
      setTimeout(() => app.report({ lang: r.sel && data.byId.has(r.sel) ? r.sel : null }), 600);
    }

    const viewKey = `${r.view}/${r.arg}/${r.arg2}`;
    // on a phone the panel and the sheet are drawers over each other: whichever
    // the reader opened last comes in front ("open in the family tree" from a
    // language brings the tree over it; a language picked in the tree, its panel)
    if (!force && viewKey !== lastView && SHEET_VIEWS.has(r.view)) app.state.front = 'sheet';
    else if (!force && r.sel && r.sel !== lastSel) app.state.front = 'panel';
    if (force || viewKey !== lastView) {
      const leavingStory = lastView?.startsWith('story/') && r.view !== 'story';
      if (/^(features|words)\//.test(lastView ?? '') && r.view !== lastView.split('/')[0]) app.applyFeature(null);
      if (lastView?.startsWith('daily/') && r.view !== 'daily') daily.leave();
      if (lastView?.startsWith('words/') && r.view !== 'words') words.leave();
      if (lastView?.startsWith('story/') && r.view !== 'story') stories.leave();
      lastView = viewKey;
      app.state.treeFocus = null;
      if (r.view !== 'story') {
        app.state.story = null;
        if (leavingStory) {
          globe.setArcs([]);
          // also clears any colours a story painted
          app.setColorMode('family');
        }
      }
      if (r.view !== 'tree') app.state.treeFull = false;
      sheet.classList.remove('wide');
      sheet.classList.toggle('full', app.state.treeFull);
      if (SHEET_VIEWS.has(r.view)) {
        sheet.classList.add('on');
        if (r.view === 'tree') {
          sheet.classList.add('wide');
          r.arg ? tree.renderFamily(sheet, r.arg, r.sel) : tree.renderIndex(sheet);
        } else if (r.view === 'features') features.render(sheet, r.arg);
        else if (r.view === 'words') words.render(sheet, r.arg);
        else if (r.view === 'daily') daily.render(sheet);
        else if (r.view === 'me') passport.render(sheet);
        else if (r.view === 'stories') stories.renderList(sheet);
        else if (r.view === 'story') stories.renderChapter(sheet, r.arg, +(r.arg2 ?? 0));
        else renderAbout(sheet, app);
      } else {
        sheet.classList.remove('on', 'full');
        sheet.innerHTML = '';
      }
      if (PAGE_VIEWS.has(r.view)) {
        page.classList.add('on');
        if (r.view === 'all') {
          space.leave();
          allTree.render(page);
        } else space.render(page, r.arg ?? 'vocabulary');
      } else if (page.classList.contains('on')) {
        page.classList.remove('on');
        space.leave();
        page.innerHTML = '';
      }
    } else if (r.view === 'tree' && r.arg) {
      tree.markSelection(r.sel);
    }

    if (force || r.sel !== lastSel) {
      // a forced re-render (language switch) keeps the camera where it is
      const quiet = force && r.sel === lastSel;
      lastSel = r.sel;
      applySelection(r.sel, quiet);
    }
    allTree.mark(r.view === 'all' ? r.sel : null);
    space.mark(r.view === 'space' ? r.sel : null);
    relics.update(true);
    app.refreshFocus();
    app.layout();
  }
  app.refreshSheet = () => onRoute(true);

  function applySelection(sel, quiet) {
    app.state.selFocus = null;
    app.state.selStrong = null;
    globe.setNearby(null);
    globe.setLinks(null);
    relics.mark(sel?.startsWith('relic:') ? sel.slice(6) : null);
    if (!sel) return panel.close();
    const inStory = app.route.view === 'story';
    const onPage = PAGE_VIEWS.has(app.route.view);
    const entity = data.byId.get(sel);
    if (entity?.kind === 'lang') {
      app.state.selStrong = [entity.id];
      panel.showLang(entity);
      if (!quiet && !inStory && !onPage) globe.flyTo(entity.lat, entity.lon, Math.min(globe.camera.position.length(), 2.6));
    } else if (entity?.kind === 'group') {
      app.state.selFocus = { ids: new Set(entity.langs.map((l) => l.id)) };
      panel.showGroup(entity);
      if (!quiet && !inStory && !onPage) globe.framePoints(entity.langs);
    } else if (sel.startsWith('relic:')) {
      // a relic of writing: its card, its languages lit, the globe brought round to it
      const relic = RELICS.find((x) => x.id === sel.slice(6));
      if (!relic) return panel.close();
      app.state.selStrong = relic.langs;
      panel.showRelic(relic);
      if (!quiet && !inStory && !onPage) globe.flyTo(relic.lat, relic.lon, Math.min(globe.camera.position.length(), 2.4));
    } else if (sel.startsWith('@')) {
      const [lat, lon, km = 300] = sel.slice(1).split(',').slice(0, 3).map(Number);
      const me = sel.endsWith(',me');
      const v = toVec(lat, lon);
      const near = data.languages
        .map((l) => [angle(v, l.v) * EARTH_KM, l])
        .filter(([d]) => d <= km)
        .sort((a, b) => a[0] - b[0]);
      app.state.selFocus = near.length ? { ids: new Set(near.map(([, l]) => l.id)) } : null;
      globe.setNearby({ lat, lon, km });
      panel.showNearby({ lat, lon, km, near, me });
      // the reader's own surroundings come in closer than a clicked point
      if (!quiet && !inStory && !onPage) globe.flyTo(lat, lon, me ? 1.9 : null, 900);
    } else {
      panel.close();
    }
  }
  app.showLinks = (lang, list) => {
    if (app.route.sel === lang.id && !PAGE_VIEWS.has(app.route.view)) globe.setLinks(lang, list);
  };

  window.addEventListener('hashchange', () => onRoute());
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && app.route.sel && document.activeElement?.tagName !== 'INPUT') app.select(null);
  });

  $('#nearme').onclick = locateMe;

  // light or dark: every colour, the globe's included, is fixed at load, so
  // the switch saves the choice and reloads where the reader is
  function switchTheme() {
    try {
      localStorage.setItem('glossa-theme', THEME_NAME === 'atelier' ? 'nocturne' : 'atelier');
    } catch {}
    const url = new URL(location.href);
    url.searchParams.delete('theme');
    location.replace(url.href);
    if (url.href === location.href) location.reload();
  }
  $('.theme-toggle').onclick = switchTheme;

  // "surprise me": half the time a language with a written note, otherwise one
  // with a Wikipedia article in the interface language
  $('#random').onclick = () => {
    const curated = data.languages.filter((l) => NOTES[l.id]);
    const documented = data.languages.filter((l) => data.wiki[l.id]);
    const pool = Math.random() < 0.5 && curated.length ? curated : documented;
    const l = pool[Math.floor(Math.random() * pool.length)];
    app.go(app.route.view === 'globe' ? { sel: l.id } : { view: 'globe', arg: null, arg2: null, sel: l.id });
  };

  // ── coordinates readout ─────────────────────────────────
  const coords = $('#coords');
  const fmtDeg = (v, pos, neg) => `${Math.abs(v).toFixed(1)}°${v >= 0 ? pos : neg}`;
  setInterval(() => {
    const [lat, lon] = globe.centerLatLon();
    coords.textContent = `${fmtDeg(lat, 'N', 'S')}  ${fmtDeg(lon, 'E', 'W')}`;
  }, 200);

  renderChrome();
  renderHero();
  layers.render();
  if (app.route.view !== 'globe' || app.route.sel) dismissHero();
  onRoute(true);
  requestAnimationFrame(() => $('#loading').classList.add('off'));
  window.__glossa = app;
}

// a start that fails (most often: no WebGL at all) must not leave the loading screen up
function failed(err) {
  console.error(err);
  const probe = document.createElement('canvas');
  const webgl = !!(probe.getContext('webgl2') || probe.getContext('webgl'));
  const zh = (document.documentElement.lang || '').startsWith('zh') || /^zh/.test(detectLocale());
  const index = `${import.meta.env.BASE_URL}${zh ? 'zh/' : ''}languages/`;
  $('#loading')?.classList.add('off');
  const box = document.createElement('div');
  box.id = 'gfx-fail';
  box.innerHTML = `<p>${esc(t(webgl ? 'loadFail' : 'gfxNone'))}</p><div class="actions">${webgl ? '' : `<a class="btn small" href="${index}">${esc(t('gfxCatalogue'))}</a>`}<button class="btn small ghost" type="button">${esc(t('gfxReload'))}</button></div>`;
  box.querySelector('button').onclick = () => location.reload();
  document.body.append(box);
}

boot().catch(failed);
