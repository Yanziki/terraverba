import { t, getLocale, formatNumber } from '../i18n/index.js';
import { esc, icon } from './html.js';
import { localizeWords } from './wordscript.js';
import { toVec } from '../data.js';
import { LEVELS, TIERS, PLAN, FALLBACK, createMakers, rng, shuffle } from './daily/questions.js';
import { createViews, TYPE_KEYS, withSpeed } from './daily/views.js';
import { drawCard } from './daily/card.js';
import { areaOf, measure } from './daily/area.js';
import { loadAudio } from '../audio.js';

const BASE = import.meta.env.BASE_URL;
const STORE = 'glossa-daily-3';
// earlier quizzes (five, then six questions) still count towards the streak
const OLD_STORES = [['glossa-daily', 5], ['glossa-daily-2', 6]];
const LEVEL_KEY = 'glossa-daily-level';
const LEVEL_NAMES = { easy: 'dailyLv1', normal: 'dailyLv2', hard: 'dailyLv3', expert: 'dailyLv4' };
// seconds a question may take before the speed bonus starts to fade
const PAR = { reveal: 10, where: 10, script: 8, match: 20, sort: 15, relative: 10, odd: 10, tree: 12, numbers: 10, etym: 10, listen: 18 };
// questions that offer "rule out one choice", for 40% of their points
const CUTTABLE = new Set(['script', 'relative', 'odd', 'tree', 'numbers', 'etym', 'listen']);
const CUT = 0.6;
const REGION = 0.7;

const today = () => new Date().toISOString().slice(0, 10);
const dayNumber = (d) => Math.floor((Date.parse(d) - Date.parse('2026-10-19')) / 864e5) + 1;
const grade = (a) => (a.score >= 80 ? 'ok' : a.score >= 40 ? 'mid' : 'bad');
const starsFor = (total, max) => (total >= max * 0.85 ? 3 : total >= max * 0.6 ? 2 : total >= max * 0.35 ? 1 : 0);

function loadStore(key = STORE) {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '{}');
  } catch {
    return {};
  }
}
function saveStore(s) {
  try {
    localStorage.setItem(STORE, JSON.stringify(s));
  } catch {}
}

// The daily quiz: six questions of ten kinds at four levels, the same for
// everyone on a given day. Map questions are answered by clicking the globe.
export function createDaily(app) {
  const { data, globe } = app;
  const V = createViews(app);
  let quiz = null; // { date, level, practice, questions, answers, step }
  let lives = []; // per-question state that isn't saved: timers, picks in progress
  let sheetEl = null;
  let mapped = null;

  const cache = new Map();
  const get = (path) => cache.get(path) ?? cache.set(path, fetch(`${BASE}data/${path}`).then((r) => r.json())).get(path);
  const sources = { words: (id) => get(`words/${id}.json`).then((w) => localizeWords(w, getLocale())), audio: loadAudio };
  const makers = createMakers(data, sources);

  async function build(date, level, practice) {
    sources.udhr ??= await get('udhr.json');
    sources.wordIndex ??= await get('words/index.json');
    const rand = rng(practice ? `${date}:${level}:${Math.random()}` : `${date}:${level}`);
    // one kind from each slot, in a random order; the level's tiers then run easiest first
    const kinds = [];
    for (const slot of PLAN) {
      const free = shuffle(rand, slot).filter((k) => !kinds.includes(k));
      if (free.length) kinds.push(free[0]);
    }
    const order = shuffle(rand, kinds);
    const questions = [];
    const used = new Set();
    for (const [i, tier] of LEVELS[level].entries()) {
      // a kind that can't make a question at this tier tries an easier one, then another kind
      ask: for (const type of [order[i], ...shuffle(rand, FALLBACK)]) {
        if (!type || used.has(type)) continue;
        for (let tt = tier; tt >= 1; tt--) {
          const q = await makers[type](rand, tt);
          if (!q) continue;
          used.add(type);
          questions.push({ ...q, tier: tt });
          break ask;
        }
      }
    }
    return { date, level, practice, questions, answers: [], step: 0 };
  }

  const total = () => quiz.answers.reduce((s, a) => s + (a?.score ?? 0), 0);
  const rounds = () => quiz.questions.length;
  const live = () => (lives[quiz.step] ??= {});
  const typeName = (q) => t(TYPE_KEYS[q.type]);

  // ── rendering ───────────────────────────────────────────
  function head() {
    const progress = quiz.questions.map((q, i) => {
      const a = quiz.answers[i];
      return `<i class="${a ? grade(a) : i === quiz.step ? 'now' : ''}" title="${esc(typeName(q))}"></i>`;
    }).join('');
    return `
      <div class="sheet-head">
        <div class="kicker">${t('navDaily')} · ${quiz.practice ? t('dailyPractice') : `#${dayNumber(quiz.date)} · ${quiz.date}`}</div>
        <h2>${t('dailyTitle')}</h2>
        <div class="seg daily-levels" role="tablist">${Object.keys(LEVELS).map((k) => `<button role="tab" data-level="${k}" class="${k === quiz.level ? 'on' : ''}" aria-selected="${k === quiz.level}">${t(LEVEL_NAMES[k])}</button>`).join('')}</div>
        <p class="hint daily-level-hint">${esc(mix(quiz.level))}</p>
        <div class="daily-progress">${progress}</div>
        <div class="daily-tally"><span>${t('dailyQuestion', Math.min(quiz.step + 1, rounds()), rounds())}</span><span>${t('dailyPoints', total())}</span></div>
      </div>`;
  }

  // "Easy ×6 · Medium ×1": a level is its mix of question tiers
  function mix(level) {
    const n = {};
    for (const tier of LEVELS[level]) n[tier] = (n[tier] ?? 0) + 1;
    return Object.entries(n).map(([tier, k]) => `${t(`dailyTier${tier}`)} ×${k}`).join(' · ');
  }

  function render() {
    if (!sheetEl) return;
    if (!quiz) {
      sheetEl.innerHTML = `<div class="sheet-head"><div class="kicker">${t('navDaily')}</div><h2>${t('dailyTitle')}</h2></div><div class="sheet-body"><p class="muted">…</p></div>`;
      return;
    }
    if (quiz.step >= rounds()) return renderDone();
    const q = quiz.questions[quiz.step];
    const a = quiz.answers[quiz.step];
    const v = V[q.type];
    const s = live();
    s.t0 ??= performance.now();
    const hint = !a && v.hint ? `<p class="hint">${esc(v.hint(q))}</p>` : '';
    const region = q.type === 'where' && s.region ? `<p class="daily-clue">${t('hintRegionShown', t('macroareas')[data.byId.get(q.answer).macroarea] ?? '—')}</p>` : '';
    const helps = a ? '' : [
      CUTTABLE.has(q.type) && !s.cut ? `<button class="btn small ghost" data-act="cut">${t('hintCut')}<span class="cost">−40%</span></button>` : '',
      q.type === 'where' && !s.region ? `<button class="btn small ghost" data-act="region">${t('hintRegion')}<span class="cost">−30%</span></button>` : '',
    ].join('');
    sheetEl.innerHTML = `${head()}
      <div class="sheet-body daily-body type-${q.type}">
        <div class="daily-type">${esc(typeName(q))}<span class="tier t${q.tier}">${t(`dailyTier${q.tier}`)}</span></div>
        <h3 class="daily-q">${esc(v.title(q))}</h3>
        ${hint}${region}
        ${v.body(q, a, s)}
        ${helps ? `<div class="daily-helps">${helps}</div>` : ''}
        ${a ? result(q, a, v) : ''}
      </div>`;
    if (!a) {
      v.bind?.(sheetEl, q, s, finish, render);
      for (const id of s.cut ?? []) sheetEl.querySelectorAll(`[data-id="${id}"]`).forEach((b) => ((b.disabled = true), b.classList.add('cut')));
      sheetEl.querySelector('[data-act=cut]')?.addEventListener('click', () => {
        const wrong = q.choices.filter((id) => id !== q.answer);
        s.cut = [wrong[Math.floor(Math.random() * wrong.length)]];
        render();
      });
      sheetEl.querySelector('[data-act=region]')?.addEventListener('click', () => {
        s.region = true;
        render();
      });
    } else {
      sheetEl.querySelector('[data-act=next]')?.addEventListener('click', next);
    }
    bindLevels();
    const key = `${quiz.date}:${quiz.level}:${quiz.step}:${!!a}`;
    if (mapped !== key) {
      mapped = key;
      setupMap(q, a);
    }
  }

  function result(q, a, v) {
    const raw = a.raw ?? a.base;
    const word = a.right || raw >= 90 ? t('dailyRight') : raw >= 40 ? t('dailyClose') : t('dailyWrong');
    const notes = [a.hint ? t('scoreHinted') : '', !a.timed && a.base && a.score < a.base ? t('scoreSlow', a.secs) : '', !a.timed && a.base && a.score >= a.base ? t('scoreFast') : ''].filter(Boolean);
    const f = v.focus?.(q, a);
    const more = f?.fly ?? (q.type === 'where' ? q.answer : null);
    const last = quiz.step === rounds() - 1;
    return `<div class="daily-result ${grade(a)}">
        <div class="daily-points"><b>${word}</b><span class="pts">+${formatNumber(a.score)}</span></div>
        ${notes.length ? `<div class="daily-notes">${notes.map((n) => `<span>${esc(n)}</span>`).join('')}</div>` : ''}
        <p>${esc(v.explain(q, a))}</p>
      </div>
      <div class="actions"><button class="btn" data-act="next">${last ? t('dailyFinish') : t('dailyNext')}${icon.arrow}</button>
        ${more ? `<a class="btn ghost" href="#/daily?sel=${more}">${t('dailyLearnMore')}</a>` : ''}</div>`;
  }

  function finish(res) {
    const q = quiz.questions[quiz.step];
    const s = live();
    if (quiz.answers[quiz.step]) return;
    const secs = (performance.now() - s.t0) / 1000;
    const hinted = !!(s.cut || s.region);
    const base = Math.round(res.base * (s.cut ? CUT : 1) * (s.region ? REGION : 1));
    const score = res.timed ? base : withSpeed(base, secs, PAR[q.type]);
    quiz.answers[quiz.step] = { ...res, raw: res.base, base, score, secs: Math.round(secs), hint: hinted };
    app.state.pickHandler = null;
    persist();
    render();
  }

  // map questions hide the dots and names, so the answer is not on screen
  function setupMap(q, a) {
    const v = V[q.type];
    if (q.type === 'where' && !a) {
      const answer = data.byId.get(q.answer);
      const L = TIERS[q.tier] ?? TIERS[1];
      app.state.dailyHide = true;
      app.state.story = { ids: new Set(), mode: 'hide' };
      // the outlines of its main countries load while the player looks
      const area = areaOf(answer);
      app.state.pickHandler = async (hit) => {
        if (!hit.lat && !hit.lang) return;
        const ll = hit.lang ? [hit.lang.lat, hit.lang.lon] : [hit.lat, hit.lon];
        const m = measure(await area, answer, ll);
        const base = m.km <= L.full ? 100 : Math.max(0, Math.round((100 * (L.zero - m.km)) / (L.zero - L.full)));
        finish({ pick: ll, km: m.km, to: m.to, place: m.a2, base });
      };
      globe.setArcs([]);
      // start from the whole world, so the previous answer gives nothing away
      globe.flyTo(20, globe.centerLatLon()[1], 4.8, 1200);
    } else if (q.type === 'where') {
      const answer = data.byId.get(q.answer);
      app.state.dailyHide = false;
      app.state.story = { ids: new Set([q.answer]), strong: [q.answer] };
      // a line from the pin to the nearest place the language is mainly spoken
      const to = a.to ?? [answer.lat, answer.lon];
      globe.setArcs(a.km > 1 ? [{ from: a.pick, to, color: '#8fc3ff', weight: 0.9 }] : []);
      // pull back far enough to see both the pin and the answer
      globe.framePoints([{ v: toVec(...to) }, { v: toVec(...a.pick) }], { minDist: Math.min(4.8, 2.4 + a.km / 2400), maxDist: 4.8, duration: 1400 });
    } else {
      app.state.dailyHide = false;
      app.state.pickHandler = null;
      globe.setArcs([]);
      const f = a ? v.focus?.(q, a) : null;
      app.state.story = f ? { ids: new Set(f.ids), strong: f.fly ? [f.fly] : f.frame ?? f.ids } : null;
      if (f?.fly) {
        const l = data.byId.get(f.fly);
        globe.flyTo(l.lat, l.lon, Math.min(globe.camera.position.length(), 3), 1400);
      } else if (f?.frame) {
        globe.framePoints(f.frame.map((id) => data.byId.get(id)), { minDist: 2.9, maxDist: 4.8, duration: 1400 });
      }
    }
    app.refreshFocus();
    app.refreshLabels();
  }

  function next() {
    stopLive();
    quiz.step++;
    persist();
    globe.setArcs([]);
    app.state.story = null;
    render();
    if (quiz.step >= rounds()) {
      app.state.dailyHide = false;
      app.refreshFocus();
      app.refreshLabels();
    }
  }

  function stopLive() {
    lives.forEach((s, i) => s && quiz?.questions[i] && V[quiz.questions[i].type].stop?.(s));
  }

  // ── results ─────────────────────────────────────────────
  function renderDone() {
    const max = rounds() * 100;
    const score = total();
    const stars = starsFor(score, max);
    const s = loadStore();
    const best = s.best?.[quiz.level];
    const fresh = !quiz.practice && quiz.newBest;
    sheetEl.innerHTML = `${head()}
      <div class="sheet-body daily-done">
        <div class="daily-score">${formatNumber(score)}<span>/ ${formatNumber(max)}</span></div>
        <div class="daily-stars" aria-label="${stars}/3">${[0, 1, 2].map((i) => `<i class="${i < stars ? 'on' : ''}"></i>`).join('')}</div>
        <p class="hint">${fresh ? `<b class="new-best">${t('dailyNewBest')}</b> ` : ''}${best != null ? t('dailyBest', t(LEVEL_NAMES[quiz.level]), best) : ''}${!quiz.practice ? ` · ${t('dailyStreak', streakCount())}` : ''}</p>
        <div class="daily-tiles">${quiz.questions.map((q, i) => `<div class="tile ${grade(quiz.answers[i])}"><b>${formatNumber(quiz.answers[i].score)}</b><span>${esc(typeName(q))}</span></div>`).join('')}</div>
        <div class="actions">
          <button class="btn" data-act="card">${t('dailyCard')}</button>
          <button class="btn ghost" data-act="share">${t('dailyShare')}</button>
          <button class="btn ghost" data-act="practice">${t('dailyMore')}</button>
        </div>
        <p class="hint daily-copied" hidden></p>
        <ol class="daily-review">${quiz.questions.map((q, i) => `<li><i class="sq ${grade(quiz.answers[i])}"></i><span><b>${esc(V[q.type].title(q))}</b> ${esc(V[q.type].explain(q, quiz.answers[i]))}</span></li>`).join('')}</ol>
        ${!quiz.practice ? `<p class="hint">${t('dailyNextIn', ...untilTomorrow())}</p>` : ''}
      </div>`;
    sheetEl.querySelector('[data-act=card]').onclick = card;
    sheetEl.querySelector('[data-act=share]').onclick = share;
    sheetEl.querySelector('[data-act=practice]').onclick = () => start(quiz.level, true);
    bindLevels();
  }

  // the quiz changes at midnight UTC
  function untilTomorrow() {
    const now = new Date();
    const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
    const m = Math.ceil((next - now) / 6e4);
    return [Math.floor(m / 60), m % 60];
  }

  function bindLevels() {
    sheetEl.querySelectorAll('[data-level]').forEach((b) => (b.onclick = () => {
      if (b.dataset.level === quiz.level && !quiz.practice) return;
      try {
        localStorage.setItem(LEVEL_KEY, b.dataset.level);
      } catch {}
      globe.setArcs([]);
      app.state.story = null;
      start(b.dataset.level);
    }));
  }

  function persist() {
    if (quiz.practice) return;
    const s = loadStore();
    s[`${quiz.date}:${quiz.level}`] = { answers: quiz.answers, step: quiz.step };
    if (quiz.step >= rounds()) {
      s.best ??= {};
      if (s.best[quiz.level] == null || total() > s.best[quiz.level]) {
        quiz.newBest = s.best[quiz.level] != null;
        s.best[quiz.level] = total();
      }
    }
    saveStore(s);
  }

  // days in a row with at least one quiz finished, at any level
  function streakCount() {
    const s = loadStore();
    const old = OLD_STORES.map(([key, rounds]) => [loadStore(key), rounds]);
    const levels = [...Object.keys(LEVELS), ''];
    let n = 0;
    for (let d = new Date(today()); ; d.setUTCDate(d.getUTCDate() - 1)) {
      const k = d.toISOString().slice(0, 10);
      const finished = (store, rounds) => levels.some((lv) => store[lv ? `${k}:${lv}` : k]?.step >= rounds);
      const done = finished(s, PLAN.length) || old.some(([store, rounds]) => finished(store, rounds));
      if (done) n++;
      else break;
    }
    return n;
  }

  const shareTitle = () => `${t('dailyShareTitle')} #${dayNumber(quiz.date)} · ${t(LEVEL_NAMES[quiz.level])}`;
  const pageUrl = () => `${location.origin}${location.pathname}#/daily`;
  const notice = (text) => {
    const el = sheetEl.querySelector('.daily-copied');
    el.textContent = text;
    el.hidden = false;
  };

  async function share() {
    const emoji = { ok: '🟩', mid: '🟨', bad: '⬛' };
    const max = rounds() * 100;
    const text = `${shareTitle()} · ${total()}/${max} ${'★'.repeat(starsFor(total(), max))}\n${quiz.answers.map((a) => emoji[grade(a)]).join('')}\n${pageUrl()}`;
    try {
      if (navigator.share && window.innerWidth < 900) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        notice(t('dailyCopied'));
      }
    } catch {}
  }

  async function card() {
    const max = rounds() * 100;
    const best = loadStore().best?.[quiz.level];
    const blob = await drawCard({
      kicker: `${t('dailyTitle')} #${dayNumber(quiz.date)} · ${t(LEVEL_NAMES[quiz.level])} · ${quiz.date}`.toUpperCase(),
      score: total(),
      max,
      stars: starsFor(total(), max),
      best: best != null && !quiz.practice ? t('dailyBest', t(LEVEL_NAMES[quiz.level]), best) : '',
      tiles: quiz.questions.map((q, i) => ({ label: typeName(q), points: quiz.answers[i].score, grade: grade(quiz.answers[i]) })),
      url: pageUrl().replace(/^https?:\/\//, ''),
    });
    const file = new File([blob], `terraverba-daily-${quiz.date}-${quiz.level}.png`, { type: 'image/png' });
    try {
      if (window.innerWidth < 900 && navigator.canShare?.({ files: [file] })) return await navigator.share({ files: [file], text: pageUrl() });
    } catch {
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    notice(t('dailyCardSaved'));
  }

  function savedLevel() {
    try {
      const v = localStorage.getItem(LEVEL_KEY);
      return LEVELS[v] ? v : 'easy';
    } catch {
      return 'easy';
    }
  }

  async function start(level = savedLevel(), practice = false) {
    stopLive();
    lives = [];
    mapped = null;
    const date = today();
    quiz = await build(date, level, practice);
    if (!practice) {
      const saved = loadStore()[`${date}:${level}`];
      if (saved) Object.assign(quiz, { answers: saved.answers ?? [], step: saved.step ?? 0 });
    }
    render();
  }

  return {
    async render(sheet) {
      sheetEl = sheet;
      mapped = null;
      render();
      if (!quiz || (!quiz.practice && quiz.date !== today())) await start();
    },
    leave() {
      stopLive();
      lives = [];
      app.state.pickHandler = null;
      app.state.dailyHide = false;
      globe.setArcs([]);
    },
  };
}
