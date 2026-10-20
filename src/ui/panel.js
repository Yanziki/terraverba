import { NOTES } from '../content/notes.js';
import { STORIES } from '../content/stories.js';
import { RELICS } from '../content/relics.js';
import { RELIC_IMG } from './relics.js';
import { AES, familyColor, groupColor, FAMILY } from '../palette.js';
import { t, tr, getLocale, formatNumber, formatList } from '../i18n/index.js';
import { esc, icon, dot, bindHover } from './html.js';
import { summary } from './wiki.js';
import { forLanguage, play, pageOf, creditOf } from '../audio.js';
import { conceptName } from './concepts.js';
import { angle } from '../data.js';

// the static page built for each language and family (tools/build-pages.mjs);
// Chinese interfaces get the Chinese page, everyone else the English one
const slugify = (s) => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48).replace(/-+$/, '');
const slug = (x) => [slugify(x.en ?? ''), x.id].filter(Boolean).join('-');

export function createPanel(app) {
  const el = document.getElementById('panel');
  const { data } = app;
  let token = 0;
  let simTab = 'vocabulary';

  const langDot = (l) => dot(app.colorOf(l), { hollow: l.aes === 6, diamond: l.family === 'sign1238' });
  const wikiLanguage = (code) => {
    try {
      return new Intl.DisplayNames([getLocale()], { type: 'language' }).of(code);
    } catch {
      return code;
    }
  };

  function mount(html) {
    el.innerHTML = `<button class="close" aria-label="${t('close')}">${icon.close}</button><div class="panel-scroll">${html}</div>`;
    el.querySelector('.close').onclick = () => app.select(null);
    bindSel(el);
    el.classList.add('on');
    el.querySelector('.panel-scroll').scrollTop = 0;
    app.state.transient = null;
    return ++token;
  }

  function bindSel(root) {
    root.querySelectorAll('[data-sel]').forEach((a) =>
      a.addEventListener('click', (e) => {
        e.preventDefault();
        app.select(a.dataset.sel);
      }),
    );
    bindHover(root, app);
  }

  async function fillWiki(id, my) {
    const box = el.querySelector('.wiki');
    if (!box) return;
    const w = await summary(data, id);
    if (my !== token) return;
    if (w.failed) return (box.innerHTML = `<p class="muted">${t('wikiFailed')}</p>`);
    if (w.none) return (box.innerHTML = box.dataset.quiet ? '' : `<p class="muted">${t('noArticle')}</p>`);
    const paras = w.text.split(/\n+/).filter(Boolean).slice(0, 3);
    const own = { en: 'en', 'zh-Hans': 'zh', 'zh-Hant': 'zh' }[getLocale()] ?? getLocale();
    const source = w.wiki === own ? t('fromWiki') : t('fromWikiIn', wikiLanguage(w.wiki));
    box.innerHTML = `${paras.map((p) => `<p>${esc(p)}</p>`).join('')}
      <div class="src">${esc(source)} · <a href="${esc(w.url)}" target="_blank" rel="noopener">${esc(w.title)}</a> · ${t('wikiLicense')}</div>`;
  }

  function meter(l) {
    const a = AES[l.aes] ?? AES[0];
    return `<div class="meter">${[1, 2, 3, 4, 5, 6].map((i) => `<i class="${l.aes && i <= l.aes ? 'on' : ''}" style="--c:${a.color}"></i>`).join('')}</div>
      <div class="meter-label"><span>${t('aes')[1]}</span><span>${t('aes')[6]}</span></div>`;
  }

  function lineage(x) {
    const chain = [...data.ancestors(x.id), x];
    return `<ul class="lineage">${chain.map((g) => `<li class="${g === x ? 'self' : ''}">
        ${g === x ? esc(app.name(g)) : `<a href="#" data-sel="${g.id}" data-hover="${g.id}">${esc(app.name(g))}</a>`}
        ${g.kind === 'group' ? `<span class="n">${formatNumber(g.n)}</span>` : ''}</li>`).join('')}</ul>`;
  }

  function nearest(v, { exclude, n = 6 } = {}) {
    return data.languages.filter((l) => l !== exclude).map((l) => [angle(v, l.v), l]).sort((a, b) => a[0] - b[0]).slice(0, n);
  }

  const chips = (list) =>
    `<div class="chips">${list.map((l) => `<a class="chip" href="#" data-sel="${l.id}" data-hover="${l.id}">${langDot(l)}${esc(app.name(l))}</a>`).join('')}</div>`;

  // the languages under the smallest group that has others, most spoken first
  function treeKin(l, n = 6) {
    const chain = data.ancestors(l.id);
    for (let k = chain.length - 1; k >= 0; k--) {
      const kin = chain[k].langs.filter((x) => x !== l && x.kind === 'lang' && x.category === 0).sort((a, b) => (b.speakers ?? 0) - (a.speakers ?? 0));
      if (kin.length) return kin.slice(0, n);
    }
    return [];
  }

  // nearest neighbours in the vocabulary or grammar space
  async function fillSimilar(l, my) {
    const box = el.querySelector('.similar');
    if (!box) return;
    const sim = await data.similarity(simTab);
    if (my !== token) return;
    const i = sim.index.get(l.id);
    const tabs = `<div class="seg small">${['vocabulary', 'grammar'].map((k) => `<button data-tab="${k}" class="${k === simTab ? 'on' : ''}">${t(k === 'vocabulary' ? 'similarVocab' : 'similarGrammar')}</button>`).join('')}</div>`;
    let body = `<p class="muted">${t('notInData')}</p>`;
    let list = [];
    if (i == null) {
      // no word list or grammar sketch to compare: the nearest relatives in the
      // family tree instead, said plainly, so the globe still shows its kin
      const kin = treeKin(l);
      if (kin.length) {
        list = kin.map((x) => [x, null]);
        body = `<p class="muted">${t('similarByTree')}</p><ul class="row-list">${kin.map((x) => `<li data-sel="${x.id}" data-hover="${x.id}">${langDot(x)}<span class="rl-name">${esc(app.name(x))}</span>
          <span class="rl-sub">${esc(app.familyName(x))}</span></li>`).join('')}</ul>`;
      }
    } else {
      list = sim.nn.slice(i * 8, i * 8 + 6).map((j, k) => [data.byId.get(sim.ids[j]), sim.nd[i * 8 + k]]).filter(([x]) => x);
      body = `<ul class="row-list">${list.map(([x, d]) => `<li data-sel="${x.id}" data-hover="${x.id}">${langDot(x)}<span class="rl-name">${esc(app.name(x))}</span>
        <span class="rl-sub">${esc(app.familyName(x))}</span><span class="rl-right">${esc(t('similarity', Math.max(0, Math.round((1 - d) * 100))))}</span></li>`).join('')}</ul>`;
    }
    box.innerHTML = `${tabs}${body}<div class="hint" style="margin-top:8px">${t('similarNote')}</div>`;
    box.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => {
      simTab = b.dataset.tab;
      fillSimilar(l, my);
    }));
    bindSel(box);
    app.showLinks(l, list.map(([x]) => x));
  }

  function pageLink(x) {
    const top = data.topOf(x.id);
    const p = x.kind === 'lang' ? `languages/${slug(x)}/` : `families/${slug(top)}/${top === x ? '' : `#${x.id}`}`;
    const href = `${import.meta.env.BASE_URL}${getLocale().startsWith('zh') ? 'zh/' : ''}${p}`;
    return `<a class="btn small ghost" href="${href}" target="_blank" rel="noopener">${icon.page}${t('pageLink')}</a>`;
  }

  const reportLink = () => `<div class="report-link"><button type="button" class="linkish" data-act="report">${icon.flag}${t('reportPrompt')}</button></div>`;
  // on the word map, a report about a language is about its word
  function bindReport(x) {
    el.querySelector('[data-act=report]').onclick = () => {
      const w = app.route.view === 'words' ? app.state.words?.get(x.id) : null;
      app.report({ lang: x.id, ...(w ? { concept: app.route.arg, conceptName: app.state.wordConcept, word: w.roman ? `${w.word} (${w.roman})` : w.word } : {}) });
    };
  }

  // Hear it: the words of this language that have a recording, everyday ones first
  const FIRST = ['hello', 'thanks', 'yes', 'mother', 'father', 'water', 'sun', 'moon', 'one', 'two', 'three', 'love', 'friend', 'eat', 'tea', 'fire'];
  let wordIndex = null;
  async function fillListen(l, my) {
    const recs = await forLanguage(l.id);
    if (my !== token || !recs.length) return;
    wordIndex ??= await fetch(`${import.meta.env.BASE_URL}data/words/index.json`).then((r) => r.json()).catch(() => []);
    if (my !== token) return;
    const rank = (c) => (FIRST.includes(c) ? FIRST.indexOf(c) : 100);
    const list = recs.sort((a, b) => rank(a.concept) - rank(b.concept)).slice(0, 12);
    const box = el.querySelector('.listen-lang');
    if (!box) return;
    box.hidden = false;
    box.innerHTML = `<h3>${t('listenTitle')}</h3>
      <div class="listen-chips">${list.map((x, i) => {
        const c = wordIndex.find((w) => w.id === x.concept);
        // the meaning, unless it reads the same as the word (ありがとう in Japanese)
        const gloss = c ? conceptName(c) : '';
        return `<button class="listen-chip" data-i="${i}">${icon.play}<span class="lw">${esc(x.entry[4] ?? '')}</span>${gloss && gloss !== x.entry[4] ? `<span class="ln">${esc(gloss)}</span>` : ''}</button>`;
      }).join('')}</div>
      <p class="hint listen-credit"></p>`;
    box.querySelectorAll('.listen-chip').forEach((b) => (b.onclick = async () => {
      const x = list[+b.dataset.i];
      box.querySelectorAll('.listen-chip.on').forEach((c) => c.classList.remove('on'));
      b.classList.add('on');
      box.querySelector('.listen-credit').innerHTML = `${esc(creditOf(x.entry))} · <a href="${pageOf(x.entry)}" target="_blank" rel="noopener">Wikimedia Commons</a>`;
      await play(x.entry);
      b.classList.remove('on');
    }));
  }

  // the chapter of "The people behind the languages" about this language, if any
  const PEOPLE = STORIES.find((s) => s.id === 'people');
  function personCard(l) {
    const i = PEOPLE?.chapters.findIndex((ch) => ch.strong?.includes(l.id)) ?? -1;
    if (i < 0) return '';
    const ch = PEOPLE.chapters[i];
    return `<a class="person-card" href="#/story/people/${i}">${ch.portrait ? `<img src="${import.meta.env.BASE_URL}img/people/${ch.portrait.src}" alt="" loading="lazy">` : ''}
      <span><small>${esc(tr(PEOPLE.title))}</small>${esc(tr(ch.title))}</span>${icon.arrow}</a>`;
  }

  // a relic of writing: picture, story, the languages it belongs to, and on to the next
  function showRelic(r) {
    const langs = r.langs.map((id) => data.byId.get(id)).filter(Boolean);
    const story = r.story ? STORIES.find((s) => s.id === r.story[0]) : null;
    const next = RELICS[(RELICS.indexOf(r) + 1) % RELICS.length];
    mount(`
      <div class="p-kicker">${t('relicKicker')}</div>
      <h1 class="p-title">${esc(tr(r.name))}</h1>
      <div class="p-sub">${esc(tr(r.when))} · ${esc(tr(r.place))}</div>
      <figure class="relic-figure"><img src="${RELIC_IMG}${r.id}.jpg" alt="${esc(tr(r.name))}">
        <figcaption>${esc(r.credit)} · <a href="${r.page}" target="_blank" rel="noopener">Wikimedia Commons</a></figcaption></figure>
      <p class="relic-hook">${esc(tr(r.hook))}</p>
      ${langs.length ? `<div class="section"><h3>${t('relicLangs')}</h3>${chips(langs)}</div>` : ''}
      <div class="panel-actions">${story ? `<a class="btn small ghost" href="#/story/${story.id}/${r.story[1]}">${t('relicStory')}</a>` : ''}<button class="btn small ghost" data-sel="relic:${next.id}">${t('relicNext')}${icon.arrow}</button></div>
    `);
  }

  function showLang(l) {
    const top = data.topOf(l.id);
    const note = NOTES[l.id];
    const familyNote = l.isolate ? t('isolateNote') : l.family === 'sign1238' ? t('signNote') : null;
    const alt = [app.altName(l), l.native && l.native !== l.en && l.native !== app.name(l) ? l.native : null].filter(Boolean);
    const places = l.countries.map((a2) => data.countryName(a2)).filter(Boolean);
    const my = mount(`
      <div class="p-kicker">${langDot(l)}${esc(app.familyName(l))}</div>
      <h1 class="p-title">${esc(app.name(l))}</h1>
      ${alt.length ? `<div class="p-sub">${alt.map(esc).join(' · ')}</div>` : ''}
      <div class="facts">
        <div class="fact"><div class="k">${t('speakers')}</div><div class="v serif">${l.speakers ? esc(app.speakers(l)) : '—'}</div></div>
        <div class="fact"><div class="k">${t('status')}</div><div class="v">${esc(t('aes')[l.aes])}</div>${l.aes ? meter(l) : ''}</div>
        <div class="fact wide"><div class="k">${t('where')}</div><div class="v places">${places.length > 10
          ? `<span class="few">${esc(formatList(places.slice(0, 8)))}</span> <button class="more-places" type="button">${esc(t('morePlaces', places.length - 8))}</button><span class="all" hidden>${esc(formatList(places))}</span>`
          : esc(places.length ? formatList(places) : t('macroareas')[l.macroarea] ?? '—')}</div></div>
        <div class="fact wide"><div class="k">${t('codes')}</div><div class="v mono">${l.iso ? `ISO 639-3 ${esc(l.iso)} · ` : ''}Glottolog ${esc(l.id)}</div>${l.dialects ? `<div class="v"><small>${esc(t('dialectsNote', l.dialects))}</small></div>` : ''}</div>
      </div>
      <div class="section listen-lang" hidden></div>
      ${note ? `<div class="section"><h3>${t('didYouKnow')}</h3><div class="note">${esc(tr(note))}</div></div>` : ''}
      ${familyNote && !note ? `<div class="section"><div class="note">${esc(familyNote)}</div></div>` : ''}
      ${personCard(l)}
      ${top !== l ? `<div class="section"><h3>${t('classification')}</h3>${lineage(l)}</div>` : ''}
      <div class="section fprofile-wrap" hidden><h3>${t('featureSection')}</h3><ul class="fprofile"></ul></div>
      <div class="panel-actions">${l.family ? `<a class="btn small ghost" href="#/tree/${l.family}?sel=${l.id}">${icon.tree}${t('viewTree')}</a>` : ''}${pageLink(l)}</div>
      <div class="section"><div class="wiki"><p class="muted">…</p></div></div>
      <div class="section sample-wrap" hidden><h3>${t('sampleTitle')}</h3><blockquote class="udhr sample"></blockquote><div class="hint">${t('sampleCaption')}</div></div>
      <div class="section"><h3>${t('similar')}</h3><div class="similar"><p class="muted">…</p></div></div>
      <div class="section"><h3>${t('nearby')}</h3>${chips(nearest(l.v, { exclude: l }).map(([, x]) => x))}</div>
      ${reportLink()}
    `);
    fillListen(l, my);
    bindReport(l);
    el.querySelector('.more-places')?.addEventListener('click', (e) => {
      const v = e.target.closest('.places');
      v.querySelector('.few').hidden = true;
      v.querySelector('.all').hidden = false;
      e.target.remove();
    });
    fillWiki(l.id, my);
    fillSimilar(l, my);
    fillProfile(l, my);
    fillSample(l, my);
  }

  // what the language looks like written down: Article 1 of the UDHR
  async function fillSample(l, my) {
    const all = await data.udhr();
    const s = all[l.id];
    if (my !== token || !s) return;
    const wrap = el.querySelector('.sample-wrap');
    wrap.hidden = false;
    const q = wrap.querySelector('.sample');
    q.dir = s[2] === 'rtl' ? 'rtl' : 'ltr';
    q.textContent = s[0];
  }

  // a few grammar and sound facts, each a door into its world map
  async function fillProfile(l, my) {
    const rows = await app.featureProfile(l);
    if (my !== token || !rows?.length) return;
    const wrap = el.querySelector('.fprofile-wrap');
    wrap.hidden = false;
    wrap.querySelector('.fprofile').innerHTML = rows.map((r) => `<li><a href="#/features/${r.id}?sel=${l.id}">
      <span class="k">${esc(r.label)}</span>${dot(r.color)}<span class="v">${esc(r.value)}</span></a></li>`).join('');
  }

  function showGroup(g) {
    const note = NOTES[g.id];
    const kids = (data.children.get(g.id) ?? []).map((id) => data.byId.get(id));
    const subgroups = kids.filter((k) => k.kind === 'group').sort((a, b) => b.n - a.n);
    const direct = kids.filter((k) => k.kind === 'lang');
    const biggest = [...g.langs].sort((a, b) => (b.speakers ?? 0) - (a.speakers ?? 0)).slice(0, 8);
    const top = data.topOf(g.id);
    const color = groupColor(top.id);
    const bar = color === FAMILY.other ? 'var(--ink-3)' : color;
    const max = subgroups[0]?.n ?? 1;
    const my = mount(`
      <div class="p-kicker">${dot(color)}${esc(top === g ? t('colorFamily') : app.name(top))}</div>
      <h1 class="p-title">${esc(app.name(g))}</h1>
      <div class="p-sub">${app.altName(g) ? `${esc(app.altName(g))} · ` : ''}${esc(t('langsCount', g.n))}</div>
      ${note ? `<div class="section"><div class="note">${esc(tr(note))}</div></div>` : ''}
      ${top !== g ? `<div class="section"><h3>${t('classification')}</h3>${lineage(g)}</div>` : ''}
      <div class="panel-actions"><a class="btn small ghost" href="#/tree/${top.id}?sel=${g.id}">${icon.tree}${t('viewTree')}</a>${pageLink(g)}</div>
      ${subgroups.length ? `<div class="section"><h3>${esc(t('branches', subgroups.length))}</h3>
        <ul class="fam-list">${subgroups.slice(0, 14).map((s) => `<li data-sel="${s.id}" data-hover="${s.id}">
          <span class="name">${esc(app.name(s))}</span>
          <span class="bar"><i style="width:${(100 * s.n) / max}%;background:${bar}"></i></span>
          <span class="n">${formatNumber(s.n)}</span></li>`).join('')}</ul>
        ${subgroups.length > 14 ? `<div class="hint" style="margin-top:6px">+ ${subgroups.length - 14}</div>` : ''}</div>` : ''}
      ${direct.length && !subgroups.length ? `<div class="section">${chips(direct)}</div>` : ''}
      <div class="section"><h3>${t('speakers')}</h3>
        <ul class="row-list">${biggest.map((l) => `<li data-sel="${l.id}" data-hover="${l.id}">${langDot(l)}<span class="rl-name">${esc(app.name(l))}</span>
          <span class="rl-right">${l.speakers ? esc(app.speakers(l)) : '—'}</span></li>`).join('')}</ul></div>
      <div class="section"><div class="wiki" data-quiet="1"></div></div>
      ${reportLink()}
    `);
    bindReport(g);
    fillWiki(g.id, my);
  }

  function familyBreakdown(langs) {
    const counts = new Map();
    for (const l of langs) {
      const key = l.isolate ? `iso:${l.id}` : l.family ?? 'other';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([key, n]) => {
      const sample = langs.find((l) => (l.isolate ? `iso:${l.id}` : l.family ?? 'other') === key);
      const g = data.byId.get(key);
      return { n, color: familyColor(sample), name: sample.isolate ? `${app.name(sample)} · ${t('isolate')}` : g ? app.name(g) : t('other'), id: g?.id ?? sample.id };
    });
    return `<div class="stack">${rows.map((r) => `<i style="flex:${r.n};background:${r.color}"></i>`).join('')}</div>
      <ul class="fam-list">${rows.slice(0, 10).map((r) => `<li data-sel="${r.id}" data-hover="${r.id}">${dot(r.color)}<span class="name">${esc(r.name)}</span><span class="n">${formatNumber(r.n)}</span></li>`).join('')}</ul>
      ${rows.length > 10 ? `<div class="hint" style="margin-top:6px">+ ${rows.length - 10}</div>` : ''}`;
  }

  // what is spoken today where the reader is: the main languages of their country
  async function fillHere(lat, lon, my) {
    const a2 = await app.countryAt(lat, lon);
    const box = el.querySelector('.near-here');
    if (my !== token || !a2 || !box) return;
    const langs = data.languages.filter((l) => l.main.includes(a2)).sort((a, b) => (b.speakers ?? 0) - (a.speakers ?? 0)).slice(0, 6);
    if (!langs.length) return;
    box.innerHTML = `<p class="near-summary">${esc(t('nearCountry', data.countryName(a2), formatList(langs.map((l) => app.name(l)))))}</p>${chips(langs)}`;
    bindSel(box);
  }

  function showNearby({ lat, lon, km, near, me }) {
    const langs = near.map(([, l]) => l);
    // for the reader's own surroundings: a sentence first, then the lists
    const families = new Set(langs.map((l) => l.family ?? l.id)).size;
    const endangered = langs.filter((l) => l.aes >= 2 && l.aes <= 5);
    const biggest = [...langs].sort((a, b) => (b.speakers ?? 0) - (a.speakers ?? 0))[0];
    const frailest = [...endangered].sort((a, b) => b.aes - a.aes || (a.speakers ?? 0) - (b.speakers ?? 0))[0];
    const summary = me && langs.length
      ? `<p class="near-summary">${esc(t('nearSummary', langs.length, km, families, endangered.length))}${biggest?.speakers ? ` ${esc(t('nearBiggest', app.name(biggest)))}` : ''}${frailest ? ` ${esc(t('nearFrailest', app.name(frailest), t('aes')[frailest.aes]))}` : ''}</p>`
      : me ? `<p class="near-summary">${esc(t('nearNone', km))}</p>` : '';
    const shown = 30;
    const rows = (list) => list.map(([d, l]) => `<li data-sel="${l.id}" data-hover="${l.id}">${langDot(l)}<span class="rl-name">${esc(app.name(l))}</span>
      ${app.altName(l) ? `<span class="rl-sub">${esc(app.altName(l))}</span>` : ''}
      <span class="rl-right">${formatNumber(Math.round(d))} km</span></li>`).join('');
    const fallback = near.length ? [] : nearest([Math.cos((lat * Math.PI) / 180) * Math.cos((lon * Math.PI) / 180), Math.sin((lat * Math.PI) / 180), -Math.cos((lat * Math.PI) / 180) * Math.sin((lon * Math.PI) / 180)], { n: 8 });
    const my = mount(`
      <div class="p-kicker">${me ? esc(t('nearYou')) : `${lat.toFixed(1)}°, ${lon.toFixed(1)}°`}</div>
      <h1 class="p-title">${me ? t('nearTitle') : t('around')}</h1>
      <div class="p-sub">${esc(t('langsCount', langs.length))} · ${esc(t('within', km))}</div>
      ${me ? '<div class="near-here"></div>' : ''}
      ${summary}
      ${me ? `<p class="hint near-privacy">${esc(t('nearPrivacy'))}</p>` : ''}
      ${langs.length ? `<div class="section"><h3>${t('familiesHere')}</h3>${familyBreakdown(langs)}</div>
        <div class="section"><h3>${t('nearby')}</h3><ul class="row-list" data-list>${rows(near.slice(0, shown))}</ul>
        ${near.length > shown ? `<button class="more" data-more>+ ${formatNumber(near.length - shown)}</button>` : ''}</div>`
        : `<div class="section"><h3>${t('nearby')}</h3><ul class="row-list">${rows(fallback.map(([a, l]) => [a * 6371, l]))}</ul></div>`}
    `);
    if (me) fillHere(lat, lon, my);
    const more = el.querySelector('[data-more]');
    if (more) {
      more.onclick = () => {
        const list = el.querySelector('[data-list]');
        list.innerHTML = rows(near);
        more.remove();
        bindSel(list);
      };
    }
  }

  return {
    showRelic,
    showLang,
    showGroup,
    showNearby,
    close() {
      el.classList.remove('on');
      token++;
    },
  };
}
