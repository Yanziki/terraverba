// Build many days of the daily quiz at every level in the browser (the same
// steps as build() in src/ui/daily.js) and report failures, tier fallbacks and
// sample questions per tier: node tools/daily-gen.mjs [days] [locale]
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:5173/?lang=${process.argv[3] ?? 'zh-Hans'}#/`, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 2500));
const out = await page.evaluate(async (days) => {
  const Q = await import('/src/ui/daily/questions.js');
  const { localizeWords } = await import('/src/ui/wordscript.js');
  const app = window.__glossa;
  const cache = new Map();
  const get = (p) => cache.get(p) ?? cache.set(p, fetch(`/data/${p}`).then((r) => r.json())).get(p);
  const sources = { words: (id) => get(`words/${id}.json`).then((w) => localizeWords(w, 'zh-Hans')), udhr: await get('udhr.json'), wordIndex: await get('words/index.json'), audio: () => get('audio.json') };
  const makers = Q.createMakers(app.data, sources);
  const name = (id) => (app.data.byId.get(id) ? app.name(app.data.byId.get(id)) : id);
  const stats = { fallback: 0, short: 0, types: {} };
  const byTier = { 1: [], 2: [], 3: [], 4: [] };
  const fails = [];
  for (let d = 0; d < days; d++) {
    const date = new Date(Date.UTC(2026, 9, 20 + d)).toISOString().slice(0, 10);
    for (const level of Object.keys(Q.LEVELS)) {
      const rand = Q.rng(`${date}:${level}`);
      const kinds = [];
      for (const slot of Q.PLAN) {
        const free = Q.shuffle(rand, slot).filter((k) => !kinds.includes(k));
        if (free.length) kinds.push(free[0]);
      }
      const order = Q.shuffle(rand, kinds);
      const used = new Set();
      const qs = [];
      for (const [i, tier] of Q.LEVELS[level].entries()) {
        let got = null;
        ask: for (const type of [order[i], ...Q.shuffle(rand, Q.FALLBACK)]) {
          if (!type || used.has(type)) continue;
          for (let tt = tier; tt >= 1; tt--) {
            let q = null;
            try { q = await makers[type](rand, tt); } catch (e) { fails.push(`${date} ${level} ${type}@${tt}: ${e.message}`); }
            if (!q) continue;
            if (tt < tier || type !== order[i]) stats.fallback++;
            used.add(type);
            got = { ...q, tier: tt };
            break ask;
          }
        }
        if (got) qs.push(got);
      }
      if (qs.length < 7) stats.short++;
      for (const q of qs) {
        stats.types[q.type] = (stats.types[q.type] ?? 0) + 1;
        if (byTier[q.tier].filter((x) => x.type === q.type).length < 3) {
          const s = { type: q.type };
          if (q.type === 'where') s.q = name(q.answer);
          else if (q.type === 'script') s.q = `${q.answer} [${q.choices.join(' ')}] sample ${name(q.lang)}`;
          else if (q.type === 'tree') s.q = `${name(q.target)} in ${name(q.root)}: ${q.choices.map((b) => `${name(b)}(${q.examples[b].map(name).join('/')})`).join(' | ')} ✓${name(q.answer)}`;
          else if (q.type === 'relative') s.q = `${name(q.target)}? [${q.choices.map(name).join(', ')}] ✓${name(q.answer)}`;
          else if (q.type === 'match') s.q = `${q.conceptName.zh}: ${q.langs.map((g) => `${name(g)}=${q.words[g][0]}`).join(', ')}`;
          else if (q.type === 'sort') s.q = `${q.by}: ${q.answer.map(name).join(' > ')}`;
          else if (q.type === 'lightning') s.q = q.items.map((i) => `${name(i.lang)}:${i.feature}=${i.yes ? 'Y' : 'N'}`).join(', ');
          else if (q.type === 'numbers') s.q = `${q.words.map((w) => w[0]).join(' ')} [${q.choices.map(name).join(', ')}] ✓${name(q.answer)}`;
          else s.q = `[${q.choices.map(name).join(', ')}] ✓${name(q.answer)}`;
          byTier[q.tier].push(s);
        }
      }
    }
  }
  return { stats, byTier, fails };
}, Number(process.argv[2] ?? 30));
console.log(JSON.stringify({ ...out, errors }, null, 1));
await browser.close();
