// The daily quiz's question makers. Each takes a seeded random generator and
// a difficulty tier (1–4), and returns a plain question object (or null if the
// data can't support one); the same date and level always give the same quiz.
//
// Difficulty lives in the question, not the level: a tier decides which
// languages may be the answer, how alike the wrong choices are, and how
// forgiving the map is. A level is then a mix of easy and hard questions.
import { FEATURES } from '../../content/features.js';
import { ETYMOLOGY } from '../../content/etymology.js';
import { angle } from '../../data.js';

// tier 1: languages most people have at least heard of
const WELL_KNOWN = [
  'stan1293', 'stan1288', 'stan1290', 'stan1295', 'ital1282', 'port1283', 'russ1263', 'poli1260', 'ukra1253', 'dutc1256',
  'mode1248', 'swed1254', 'norw1258', 'dani1285', 'finn1318', 'hung1274', 'czec1258', 'roma1327', 'iris1253', 'icel1247',
  'basq1248', 'nucl1301', 'stan1318', 'hebr1245', 'west2369', 'hind1269', 'beng1280', 'urdu1245', 'tami1289', 'telu1262',
  'panj1256', 'nepa1254', 'mand1415', 'yuec1235', 'nucl1643', 'kore1280', 'viet1252', 'thai1261', 'nucl1310', 'cent1989',
  'indo1316', 'stan1306', 'taga1270', 'swah1253', 'haus1257', 'yoru1245', 'amha1245', 'zulu1248', 'soma1255', 'halh1238',
  'kaza1248', 'nort2690', 'nucl1302', 'nucl1235', 'hawa1245', 'maor1246',
];
// tier 2: familiar to the curious — big regional languages, and smaller ones
// known for their country, history or culture (speaker counts alone would put
// Saidi Arabic above Welsh)
const FAMILIAR = [
  'mara1378', 'guja1252', 'nucl1305', 'mala1464', 'oriy1255', 'nort2646', 'nort2641', 'nucl1417', 'west2721', 'tigr1271',
  'shon1251', 'kiny1244', 'nucl1347', 'ling1263', 'xhos1239', 'plat1254', 'java1254', 'sund1252', 'minn1241', 'stan1289',
  'wels1247', 'lith1251', 'latv1249', 'esto1258', 'sout1528', 'bulg1262', 'slov1269', 'slov1268', 'afri1274', 'bela1254',
  'tosk1239', 'malt1254', 'laoo1244', 'tibe1272', 'uigh1240', 'sinh1246', 'east2295', 'nava1243', 'cusc1236', 'para1311',
  'hait1244', 'samo1305', 'taji1245', 'turk1304', 'kirg1245', 'tata1255', 'gali1258', 'cebu1242',
];
// tier 3 also takes small languages that are famous in their own right
const NOTABLE = ['faro1244', 'bret1244', 'west2354', 'scot1245', 'kala1399', 'cors1241', 'occi1239', 'fiji1243', 'cher1273'];

// (the lightning round leaves out politeness: Grambank's coding of polite "you"
// says no for Italian Lei and Turkish siz, which a player would rightly dispute)
export const TIERS = {
  1: { full: 900, zero: 3600, sortN: 3, ratio: 3, deg: 25, branches: 3, matchScripts: 3, features: ['tone', 'gender', 'articles', 'clicks', 'classifiers'] },
  2: { full: 700, zero: 3000, sortN: 4, ratio: 2.2, deg: 15, branches: 3, matchScripts: 2, features: ['tone', 'gender', 'articles', 'clicks', 'classifiers', 'past'] },
  3: { full: 550, zero: 2400, sortN: 4, ratio: 1.8, deg: 12, branches: 4, matchScripts: 1, features: ['tone', 'gender', 'articles', 'clicks', 'classifiers', 'past', 'clusivity'] },
  4: { full: 450, zero: 2000, sortN: 4, ratio: 1.6, deg: 10, branches: 4, matchScripts: 1, features: ['tone', 'gender', 'articles', 'clicks', 'classifiers', 'past', 'clusivity'] },
};
// codings a well-read player would dispute: technical readings (Swedish common
// gender is not masculine/feminine, Hungarian "darab" as a classifier, Norwegian
// pitch accent as tone) or plain slips (Khmer and Min Nan have classifiers,
// Marathi has a past tense). The lightning round doesn't ask these.
const DISPUTED = {
  tone: ['norw1258', 'basq1248'],
  gender: ['swed1254', 'dani1285', 'dutc1256', 'hait1244'],
  articles: ['west2369', 'yuec1235', 'viet1252', 'oriy1255', 'java1254'],
  classifiers: ['poli1260', 'hung1274', 'hawa1245', 'samo1305', 'cent1989', 'minn1241'],
  past: ['mara1378', 'basq1248', 'nucl1310'],
};
// the tiers of a level's seven questions, asked easiest first
export const LEVELS = {
  easy: [1, 1, 1, 1, 1, 1, 2],
  normal: [1, 1, 1, 1, 2, 2, 3],
  hard: [1, 1, 2, 2, 2, 3, 3],
  expert: [1, 2, 2, 3, 3, 3, 4],
};

// scripts that look alike, for the hardest "which script is this?" choices
const SCRIPT_FAMILIES = [
  ['Deva', 'Beng', 'Guru', 'Gujr', 'Orya', 'Taml', 'Telu', 'Knda', 'Mlym', 'Sinh', 'Tibt', 'Cakm'],
  ['Thai', 'Laoo', 'Khmr', 'Mymr', 'Tavt', 'Lana'],
  ['Arab', 'Hebr', 'Syrc', 'Thaa'],
  ['Geor', 'Armn', 'Grek', 'Cyrl'],
  ['Hans', 'Jpan', 'Hang', 'Yiii'],
  ['Cans', 'Cher', 'Vaii', 'Ethi', 'Tfng'],
];
const COMMON_SCRIPTS = ['Latn', 'Cyrl', 'Arab', 'Deva', 'Hans', 'Jpan', 'Hang', 'Grek', 'Hebr', 'Thai', 'Geor', 'Armn', 'Ethi', 'Beng', 'Taml'];
const RARE_SCRIPTS = ['Cakm', 'Lana', 'Tavt', 'Vaii', 'Yiii', 'Cher', 'Cans', 'Tfng', 'Thaa', 'Syrc'];

export function rng(seed) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353), (h = (h << 13) | (h >>> 19));
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
export const pickFrom = (rand, list) => list[Math.floor(rand() * list.length)];
export function shuffle(rand, list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createMakers(data, sources) {
  // every language's tier: the hand-made lists, then speaker counts
  const tierOf = new Map();
  for (const id of WELL_KNOWN) tierOf.set(id, 1);
  for (const id of FAMILIAR) if (!tierOf.has(id)) tierOf.set(id, 2);
  for (const l of data.languages) {
    if (l.category !== 0 || tierOf.has(l.id)) continue;
    if ((l.speakers ?? 0) >= 5e6 || NOTABLE.includes(l.id)) tierOf.set(l.id, 3);
    else if ((l.speakers ?? 0) >= 1e6) tierOf.set(l.id, 4);
  }
  const tierOfLang = (l) => tierOf.get(l?.id) ?? 9;
  const known = (l, t) => tierOfLang(l) <= t;
  const tiered = data.languages.filter((l) => tierOf.has(l.id));
  const pool = (t) => tiered.filter((l) => known(l, t));
  // the answer comes from the tier's own band when it can, so a hard question is hard
  const choose = (rand, cands, t) => {
    const band = cands.filter((l) => tierOfLang(l) === t);
    return pickFrom(rand, band.length ? band : cands.filter((l) => known(l, t)));
  };
  const sameFamily = (a, b) => a.family && a.family === b.family;
  const near = (l, list, n) => list.filter((x) => x !== l).sort((a, b) => angle(a.v, l.v) - angle(b.v, l.v)).slice(0, n);
  const commonGroup = (a, b) => {
    const theirs = new Set(data.ancestors(b.id));
    return data.ancestors(a.id).filter((g) => theirs.has(g)).pop();
  };
  const shared = (list) => {
    let groups = data.ancestors(list[0].id);
    for (const l of list.slice(1)) {
      const theirs = new Set(data.ancestors(l.id));
      groups = groups.filter((g) => theirs.has(g));
    }
    return groups.pop();
  };
  const ids = (list) => list.map((l) => l.id);

  // three wrong choices for `answer` from `cands`, more alike as the tier rises:
  // 1 any, at most one relative · 2 any · 3 nearby or alike · 4 relatives or alike
  function wrong(rand, answer, cands, t, alike = () => false) {
    const others = cands.filter((l) => l !== answer && known(l, t));
    let prefer = [];
    if (t === 4) prefer = others.filter((l) => sameFamily(l, answer) || alike(l));
    if (t === 3 || (t === 4 && prefer.length < 3)) prefer = [...new Set([...near(answer, others, 8), ...others.filter(alike)])];
    if (t >= 3 && prefer.length >= 3) return shuffle(rand, prefer).slice(0, 3);
    const out = [];
    let kin = 0;
    for (const l of shuffle(rand, others)) {
      if (t === 1 && sameFamily(l, answer) && kin++ >= 1) continue;
      out.push(l);
      if (out.length === 3) break;
    }
    return out.length === 3 ? out : null;
  }

  // 看文字猜语言 — the UDHR, revealed a piece at a time
  function reveal(rand, t) {
    const { udhr } = sources;
    const cands = Object.keys(udhr).map((id) => data.byId.get(id)).filter((l) => l && known(l, t));
    if (cands.length < 4) return null;
    const answer = choose(rand, cands, t);
    const [text, script, dir] = udhr[answer.id];
    const distract = wrong(rand, answer, cands, t, (l) => udhr[l.id][1] === script);
    if (!distract) return null;
    return { type: 'reveal', answer: answer.id, choices: ids(shuffle(rand, [answer, ...distract])), chunks: chunk(text), dir };
  }

  // 地图定位 — click where it's spoken
  function where(rand, t) {
    const answer = choose(rand, pool(t), t);
    return answer ? { type: 'where', answer: answer.id, full: TIERS[t].full, zero: TIERS[t].zero } : null;
  }

  // 认文字系统 — name the script
  function script(rand, t) {
    const { udhr } = sources;
    const byScript = new Map();
    for (const [id, [, s]] of Object.entries(udhr)) {
      // Hani would read the same as Hans ("Han") among the choices
      if (s === 'Latn' || s === 'Hani' || !data.byId.has(id)) continue;
      (byScript.get(s) ?? byScript.set(s, []).get(s)).push(data.byId.get(id));
    }
    const allowed = (s) => (t === 1 ? COMMON_SCRIPTS.includes(s) : t === 2 ? !RARE_SCRIPTS.includes(s) : true);
    const scripts = [...byScript.keys()].filter(allowed);
    if (scripts.length < 4) return null;
    const answer = pickFrom(rand, scripts);
    const kin = SCRIPT_FAMILIES.find((f) => f.includes(answer)) ?? [];
    const rest = [...new Set([...byScript.keys(), 'Latn'])].filter((s) => s !== answer && allowed(s));
    // easier tiers: scripts that look nothing alike; the hardest: look-alikes first
    const unlike = t <= 2 ? rest.filter((s) => !kin.includes(s)) : rest;
    const alike = t === 4 ? shuffle(rand, kin.filter((s) => s !== answer && byScript.has(s))) : [];
    const distract = [...new Set([...alike, ...shuffle(rand, unlike)])].slice(0, 3);
    if (distract.length < 3) return null;
    // a sample in a language the player may know, when there is one
    const samples = byScript.get(answer);
    const familiar = samples.filter((l) => known(l, Math.max(t, 2)));
    const sample = pickFrom(rand, familiar.length ? familiar : samples);
    const [text, , dir] = udhr[sample.id];
    return { type: 'script', answer, choices: shuffle(rand, [answer, ...distract]), lang: sample.id, text: text.slice(0, 70), dir };
  }

  // 连连看 — four languages, four words for one thing
  const scriptClass = (w) => {
    const c = w.codePointAt(0);
    return c < 0x250 ? 'Latin' : c >> 7;
  };
  async function match(rand, t) {
    const concepts = sources.wordIndex.filter((c) => c.wiki >= 150 && !['one', 'two', 'three', 'four', 'five', 'ten', 'hundred'].includes(c.id));
    for (let tries = 0; tries < 16; tries++) {
      const concept = pickFrom(rand, concepts);
      const w = await sources.words(concept.id);
      const forms = w.forms.filter(([g, , , src]) => src === 0 && data.byId.has(g) && known(data.byId.get(g), t));
      const chosen = [];
      for (const f of shuffle(rand, forms)) {
        // four words that don't give each other away
        if (chosen.some((c) => c[1] === f[1] || c[1][0] === f[1][0])) continue;
        chosen.push(f);
        if (chosen.length === 4) break;
      }
      if (chosen.length < 4) continue;
      // easier tiers mix writing systems, which gives the player something to go on
      if (new Set(chosen.map((f) => scriptClass(f[1]))).size < TIERS[t].matchScripts) continue;
      return {
        type: 'match', concept: concept.id, conceptName: concept, langs: chosen.map((f) => f[0]),
        words: Object.fromEntries(chosen.map((f) => [f[0], [f[1], f[2]]])), order: shuffle(rand, chosen.map((f) => f[0])),
      };
    }
    return null;
  }

  // 排序 — by speakers, or west to east
  function sort(rand, t) {
    const T = TIERS[t];
    const bySpeakers = rand() < 0.55;
    const cands = pool(t).filter((l) => !bySpeakers || l.speakers);
    for (let tries = 0; tries < 60; tries++) {
      const set = [choose(rand, cands, t), ...shuffle(rand, cands)].filter((l, i, a) => a.indexOf(l) === i).slice(0, T.sortN);
      if (set.length < T.sortN) return null;
      const key = (l) => (bySpeakers ? -l.speakers : l.lon);
      const sorted = [...set].sort((a, b) => key(a) - key(b));
      // neighbours far enough apart that the order is fair to ask
      const fair = sorted.every((l, i) => !i || (bySpeakers ? sorted[i - 1].speakers / l.speakers >= T.ratio : l.lon - sorted[i - 1].lon >= T.deg));
      if (!fair) continue;
      return { type: 'sort', by: bySpeakers ? 'speakers' : 'east', choices: ids(shuffle(rand, set)), answer: ids(sorted) };
    }
    return null;
  }

  // 找亲戚 — which one is related
  function relative(rand, t) {
    const cands = pool(t).filter((l) => l.family && data.byId.get(l.family).n >= 3);
    for (let tries = 0; tries < 60; tries++) {
      const target = choose(rand, cands, t);
      const kin = cands.filter((l) => l !== target && sameFamily(l, target));
      if (!kin.length) continue;
      const depth = (l) => data.ancestors(l.id).indexOf(commonGroup(l, target));
      const deepest = Math.max(...kin.map(depth));
      // close relatives on the easier tiers, any relative on the harder ones
      const right = pickFrom(rand, t >= 3 ? kin : kin.filter((l) => depth(l) >= Math.min(deepest, 2)));
      // strangers: anywhere on the easiest tier, neighbours of the target above it
      const others = pool(t).filter((l) => !sameFamily(l, target));
      const strangers = shuffle(rand, t === 1 ? others : near(target, others, 10)).slice(0, 3);
      if (!right || strangers.length < 3) continue;
      return { type: 'relative', target: target.id, answer: right.id, group: commonGroup(right, target).id, choices: ids(shuffle(rand, [right, ...strangers])) };
    }
    return null;
  }

  // 找不同 — three relatives and one stranger
  function odd(rand, t) {
    const cands = pool(t).filter((l) => l.family);
    for (let tries = 0; tries < 80; tries++) {
      const seed = choose(rand, cands, t);
      const fam = cands.filter((l) => l !== seed && sameFamily(l, seed));
      // a close-knit trio (all Romance, all Bantu…) except on tier 3, where the family will do
      const pick = t === 3 ? fam : fam.filter((l) => data.ancestors(l.id).indexOf(commonGroup(l, seed)) >= 1);
      if (pick.length < 2) continue;
      const three = [seed, ...shuffle(rand, pick).slice(0, 2)];
      const group = shared(three);
      // the hardest stranger is a cousin from another branch of the same family
      const outsiders = t === 4 ? cands.filter((l) => sameFamily(l, seed) && !data.ancestors(l.id).includes(group)) : cands.filter((l) => !sameFamily(l, seed));
      const stranger = pickFrom(rand, t === 1 ? outsiders : near(seed, outsiders, 8));
      if (!stranger) continue;
      return { type: 'odd', answer: stranger.id, family: group.id, choices: ids(shuffle(rand, [...three, stranger])) };
    }
    return null;
  }

  // 谱系拼图 — which branch of its family
  function tree(rand, t) {
    const T = TIERS[t];
    const cands = pool(t).filter((l) => l.family);
    const kids = (g) => (data.children.get(g.id) ?? []).map((id) => data.byId.get(id)).filter((x) => x.kind === 'group').sort((a, b) => b.n - a.n);
    for (let tries = 0; tries < 60; tries++) {
      const target = choose(rand, cands, t);
      // the first level where the family really splits (as on the family pages)
      let split = data.byId.get(target.family);
      while (kids(split)[0]?.n > split.n * 0.75) split = kids(split)[0];
      // examples a player can recognise: on the easier tiers, familiar languages only
      const examples = (b) => b.langs.filter((l) => l !== target && l.category === 0 && (t >= 3 || known(l, 2))).sort((x, y) => (y.speakers ?? 0) - (x.speakers ?? 0)).slice(0, 2);
      const branches = kids(split).filter((b) => b.n >= 2 && !/unclassified/i.test(b.en ?? '') && (t >= 3 || examples(b).length));
      const mine = branches.find((b) => b.langs.includes(target));
      if (!mine || branches.length < T.branches) continue;
      const chosen = shuffle(rand, [mine, ...shuffle(rand, branches.filter((b) => b !== mine).slice(0, 6)).slice(0, T.branches - 1)]);
      return { type: 'tree', target: target.id, root: split.id, answer: mine.id, choices: chosen.map((b) => b.id), examples: Object.fromEntries(chosen.map((b) => [b.id, ids(examples(b))])) };
    }
    return null;
  }

  // 快问快答 — six yes/no questions against the clock
  async function lightning(rand, t) {
    const f = await data.features();
    const items = [];
    const used = new Set();
    for (let tries = 0; tries < 300 && items.length < 6; tries++) {
      const id = pickFrom(rand, TIERS[t].features);
      const feature = FEATURES.find((x) => x.id === id);
      const col = f.features[feature.id];
      const wantYes = rand() < 0.5;
      const yes = (i) => (feature.id === 'tone' ? col.values[i] !== '0' : col.values[i] === String(col.codes.indexOf('yes')));
      const skip = DISPUTED[feature.id] ?? [];
      const cands = f.langs.map((g, i) => [g, i]).filter(([g, i]) => col.values[i] !== '.' && yes(i) === wantYes && !used.has(g) && !skip.includes(g) && data.byId.has(g) && known(data.byId.get(g), t));
      if (!cands.length) continue;
      const [g] = pickFrom(rand, cands);
      used.add(g);
      items.push({ lang: g, feature: feature.id, yes: wantYes });
    }
    return items.length === 6 ? { type: 'lightning', items, seconds: 24 } : null;
  }

  // 数字猜语言 — one to five
  async function numbers(rand, t) {
    const nums = await Promise.all(['one', 'two', 'three', 'four', 'five'].map((c) => sources.words(c)));
    const table = new Map();
    nums.forEach((w, k) => {
      for (const [g, word, roman, src] of w.forms) {
        if (src) continue;
        if (!table.has(g)) table.set(g, []);
        table.get(g)[k] = [word, roman];
      }
    });
    const cands = [...table].filter(([g, row]) => row.filter(Boolean).length === 5 && data.byId.has(g) && known(data.byId.get(g), t)).map(([g]) => data.byId.get(g));
    if (cands.length < 4) return null;
    const answer = choose(rand, cands, t);
    const distract = wrong(rand, answer, cands, t, (l) => sameFamily(l, answer));
    if (!distract) return null;
    return { type: 'numbers', answer: answer.id, choices: ids(shuffle(rand, [answer, ...distract])), words: table.get(answer.id) };
  }

  // 听音猜语言 — three everyday words, spoken by a real speaker
  const HEARD = ['hello', 'thanks', 'one', 'two', 'three', 'mother', 'water', 'yes', 'sun', 'fire'];
  async function listen(rand, t) {
    const audio = await sources.audio?.();
    if (!audio) return null;
    const byLang = new Map();
    for (const c of HEARD) {
      for (const [g, entry] of Object.entries(audio.words[c] ?? {})) (byLang.get(g) ?? byLang.set(g, []).get(g)).push({ c, entry });
    }
    const cands = [...byLang].filter(([g, list]) => list.length >= 3 && data.byId.has(g) && known(data.byId.get(g), t)).map(([g]) => data.byId.get(g));
    if (cands.length < 4) return null;
    const answer = choose(rand, cands, t);
    const distract = wrong(rand, answer, pool(t), t);
    if (!distract) return null;
    const clips = shuffle(rand, byLang.get(answer.id)).slice(0, 3).map(({ c, entry }) => ({ concept: sources.wordIndex.find((w) => w.id === c), entry }));
    return { type: 'listen', answer: answer.id, choices: ids(shuffle(rand, [answer, ...distract])), clips };
  }

  // 词源侦探 — where an everyday word came from; Nahuatl, Taíno and the like are for tier 3 up
  function etym(rand, t) {
    const level = (k) => tierOfLang(data.byId.get(ETYMOLOGY[k].answer));
    const all = ETYMOLOGY.map((_, k) => k).filter((k) => [ETYMOLOGY[k].answer, ...ETYMOLOGY[k].choices].every((id) => data.byId.has(id)));
    const fits = all.filter((k) => level(k) <= t);
    const band = t >= 3 ? all.filter((k) => level(k) > 2) : fits.filter((k) => level(k) === t);
    const pick = band.length ? band : fits;
    if (!pick.length) return null;
    const k = pickFrom(rand, pick);
    return { type: 'etym', item: k, answer: ETYMOLOGY[k].answer, choices: shuffle(rand, [ETYMOLOGY[k].answer, ...ETYMOLOGY[k].choices]) };
  }

  return { reveal, where, script, match, sort, relative, odd, tree, lightning, numbers, etym, listen };
}

// UDHR text in three or four pieces: sentences if it has them, else even cuts
function chunk(text) {
  const t = text.length > 340 ? `${text.slice(0, 340).replace(/\s+\S*$/, '')}…` : text;
  let parts = t.split(/(?<=[.;:!?。；：！？،؛۔।॥])\s*/).filter((p) => p.trim());
  if (parts.length < 3) {
    const words = t.includes(' ') ? t.split(' ') : [...t];
    const per = Math.ceil(words.length / 3);
    parts = [0, 1, 2].map((k) => words.slice(k * per, (k + 1) * per).join(t.includes(' ') ? ' ' : '')).filter(Boolean);
  }
  return parts.slice(0, 4);
}

// seven question kinds a day, one from each slot: always a map question and a
// lightning round, the rest varied (word origins come up more often than not)
export const PLAN = [
  ['reveal', 'numbers', 'listen', 'listen'],
  ['where'],
  ['match', 'script'],
  ['lightning'],
  ['relative', 'odd'],
  ['tree', 'sort'],
  ['etym', 'etym', 'numbers', 'script', 'odd', 'sort'],
];
export const FALLBACK = ['reveal', 'where', 'relative', 'script', 'numbers', 'odd', 'sort', 'etym', 'tree', 'match', 'listen'];
