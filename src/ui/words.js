import { WORD_CATEGORIES, WORDS_INTRO, WORDS_METHOD, WORD_NOTES, WORD_COLORS, WORD_OTHER } from '../content/words.js';
import { conceptName } from './concepts.js';
import { t, tr, getLocale, formatNumber } from '../i18n/index.js';
import { esc, dot, icon } from './html.js';
import { localizeWords } from './wordscript.js';
import { loadAudio, play, stop, pageOf, creditOf } from '../audio.js';

const BASE = import.meta.env.BASE_URL;
const NON_LATIN = /[^\u0000-ɏḀ-ỿ\s'’-]/;

// The word map: one concept, every language that has a word for it.
export function createWords(app) {
  const { data } = app;
  let index = null;
  const cache = new Map();
  let token = 0;
  let tourRun = 0; // bumped to end a running tour

  const gloss = conceptName;
  const load = (id) => {
    if (!cache.has(id)) cache.set(id, fetch(`${BASE}data/words/${id}.json`).then((r) => r.json()));
    return cache.get(id);
  };
  // the label on the map: the word itself, with its romanisation when the script is not Latin
  const display = (word, roman) => (roman && NON_LATIN.test(word) ? `${word} ${roman}` : word);

  async function render(sheet, id) {
    const my = ++token;
    index ??= await fetch(`${BASE}data/words/index.json`).then((r) => r.json());
    const concept = index.find((c) => c.id === id) ?? index.find((c) => c.id === 'mother');
    const w = localizeWords(await load(concept.id), getLocale());
    if (my !== token) return;

    const values = new Map();
    const labels = new Map();
    const words = new Map();
    for (const [gid, word, roman, src, group] of w.forms) {
      if (!data.byId.has(gid)) continue;
      values.set(gid, String(group));
      labels.set(gid, display(word, roman));
      words.set(gid, { word, roman, src });
    }
    const legend = [
      ...w.groups.map((g, i) => ({ code: String(i), color: WORD_COLORS[i], g })),
      { code: '-1', color: WORD_OTHER, g: null },
    ];
    app.applyFeature({ values, legend: legend.map(({ code, color }) => ({ code, color })) }, { labels, words });

    const count = (code) => [...values.values()].filter((v) => v === code).length;
    const note = WORD_NOTES[concept.id];
    const cats = Object.keys(WORD_CATEGORIES);
    sheet.innerHTML = `
      <div class="sheet-head">
        <div class="kicker">${t('navWords')}</div>
        <h2>${t('wordsTitle')}</h2>
        <p>${esc(tr(WORDS_INTRO))}</p>
      </div>
      <div class="sheet-body">
        <div class="word-hero">
          <div class="word-big">${esc(gloss(concept))}</div>
          ${gloss(concept) !== concept.en ? `<div class="word-en">${esc(concept.en)}</div>` : ''}
          <div class="hint">${esc(t('wordsCount', w.n))}</div>
        </div>
        <div class="listen" hidden></div>
        ${note ? `<div class="note word-note">${esc(tr(note))}</div>` : ''}
        <ul class="flegend wlegend">${legend.map((e) => {
          const n = count(e.code);
          if (!n) return '';
          const ex = e.g ? e.g.examples.filter(([gid]) => data.byId.has(gid)).map(([gid, word]) => `<a href="#" data-sel="${gid}" data-hover="${gid}" title="${esc(app.name(data.byId.get(gid)))}">${esc(word)}</a>`).join(' · ') : esc(t('wordsOther'));
          return `<li data-code="${e.code}">${dot(e.color)}<span class="lbl">${ex}</span><span class="bar"><i style="width:${(100 * n) / values.size}%;background:${e.color}"></i></span><span class="n">${formatNumber(n)}</span></li>`;
        }).join('')}</ul>
        <div class="hint">${esc(tr(WORDS_METHOD))}</div>
        <div class="word-picker">
          ${cats.map((cat) => `<div class="index-h">${esc(tr(WORD_CATEGORIES[cat]))}</div>
            <div class="chips">${index.filter((c) => c.cat === cat).map((c) => `<a class="chip${c.id === concept.id ? ' on' : ''}" href="#/words/${c.id}">${esc(gloss(c))}</a>`).join('')}</div>`).join('')}
        </div>
        <div class="source">${esc(t('wordsSource'))}</div>
        <div class="report-link"><button type="button" class="linkish" data-act="report">${icon.flag}${t('reportWordPrompt')}</button></div>
      </div>`;
    app.state.wordConcept = gloss(concept);
    sheet.querySelector('[data-act=report]').onclick = () => {
      const sel = app.route.sel && words.get(app.route.sel);
      app.report({ concept: concept.id, conceptName: gloss(concept), lang: sel ? app.route.sel : null, word: sel ? (sel.roman ? `${sel.word} (${sel.roman})` : sel.word) : null });
    };
    sheet.querySelectorAll('.wlegend li[data-code]').forEach((li) => {
      li.onclick = (e) => {
        if (e.target.closest('[data-sel]')) return;
        const on = !li.classList.contains('on');
        sheet.querySelectorAll('.wlegend li').forEach((x) => x.classList.toggle('on', on && x === li));
        app.state.featureOnly = on ? new Set([...values].filter(([, v]) => v === li.dataset.code).map(([gid]) => gid)) : null;
        app.refreshFocus();
      };
    });
    sheet.querySelectorAll('[data-sel]').forEach((a) => (a.onclick = (e) => {
      e.preventDefault();
      app.select(a.dataset.sel);
    }));
    app.bindHover(sheet);
    fillListen(sheet, concept, words, my);
  }

  // Hear it: languages with a recording of this word, most spoken first, and a
  // tour that flies the globe from one to the next as each is played
  async function fillListen(sheet, concept, words, my) {
    const a = await loadAudio();
    const box = sheet.querySelector('.listen');
    if (my !== token || !a || !box) return;
    const list = Object.entries(a.words[concept.id] ?? {})
      .map(([g, entry]) => ({ l: data.byId.get(g), entry, w: words.get(g) }))
      .filter((x) => x.l && x.w)
      .sort((x, y) => (y.l.speakers ?? 0) - (x.l.speakers ?? 0));
    if (!list.length) return;
    const SHOWN = 16;
    const chip = (x, i) => `<button class="listen-chip" data-i="${i}">${icon.play}<span class="ln">${esc(app.name(x.l))}</span><span class="lw">${esc(display(x.w.word, x.w.roman))}</span></button>`;
    box.hidden = false;
    box.innerHTML = `
      <div class="listen-head"><h3>${t('listenTitle')}</h3><span class="hint">${esc(t('listenCount', list.length))}</span>
        <button class="btn small ghost" data-act="tour">${icon.play}${t('listenTour')}</button></div>
      <div class="listen-chips">${list.slice(0, SHOWN).map(chip).join('')}${list.length > SHOWN ? `<button class="more" data-act="more">+ ${formatNumber(list.length - SHOWN)}</button>` : ''}</div>
      <p class="hint listen-credit"></p>`;
    const credit = box.querySelector('.listen-credit');
    let touring = false;
    const hear = async (i, chipEl) => {
      const x = list[i];
      box.querySelectorAll('.listen-chip.on').forEach((c) => c.classList.remove('on'));
      chipEl?.classList.add('on');
      credit.innerHTML = `${esc(creditOf(x.entry))} · <a href="${pageOf(x.entry)}" target="_blank" rel="noopener">Wikimedia Commons</a>`;
      const ok = await play(x.entry);
      chipEl?.classList.remove('on');
      return ok;
    };
    const bindChips = () => box.querySelectorAll('.listen-chip').forEach((c) => (c.onclick = () => {
      touring = false;
      hear(+c.dataset.i, c);
    }));
    bindChips();
    box.querySelector('[data-act=more]')?.addEventListener('click', (e) => {
      e.currentTarget.outerHTML = list.slice(SHOWN).map((x, k) => chip(x, SHOWN + k)).join('');
      bindChips();
    });
    // the tour: up to ten languages, a different family each where possible
    const tourBtn = box.querySelector('[data-act=tour]');
    tourBtn.onclick = async () => {
      if (touring) {
        touring = false;
        stop();
        return;
      }
      const seen = new Set();
      const picks = [];
      for (const [i, x] of list.entries()) {
        const fam = x.l.family ?? x.l.id;
        if (seen.has(fam) && picks.length < list.length) continue;
        seen.add(fam);
        picks.push(i);
        if (picks.length === 10) break;
      }
      touring = true;
      const run = ++tourRun;
      tourBtn.innerHTML = `${icon.pause}${t('listenStop')}`;
      for (const i of picks) {
        if (!touring || run !== tourRun || my !== token) break;
        const x = list[i];
        app.globe.flyTo(x.l.lat, x.l.lon, Math.min(app.globe.camera.position.length(), 2.6), 900);
        await new Promise((r) => setTimeout(r, 700));
        if (!touring || run !== tourRun) break;
        await hear(i, box.querySelector(`.listen-chip[data-i="${i}"]`));
        await new Promise((r) => setTimeout(r, 450));
      }
      touring = false;
      if (my === token) tourBtn.innerHTML = `${icon.play}${t('listenTour')}`;
    };
  }

  return {
    render,
    leave() {
      tourRun++;
      stop();
    },
  };
}
