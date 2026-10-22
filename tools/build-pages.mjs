// Static pages for search engines and link previews: one page per language,
// family, word, feature and story, in English and Simplified Chinese, plus indexes,
// a sitemap and robots.txt. The pages are plain HTML with no globe; each one
// links into the interactive atlas. Run after `vite build`:
//   SITE=https://terraverba.org node tools/build-pages.mjs
import fs from 'node:fs';
import path from 'node:path';
import { geoEquirectangular, geoPath } from 'd3';
import { feature } from 'topojson-client';
import { countryName } from '../src/countries.js';
import { WORLDWIDE } from '../src/content/places.js';
import { cldrLanguageName } from '../src/langnames.js';

// the locale files format numbers for document.documentElement.lang
globalThis.document = { documentElement: { lang: 'en' } };
const { default: en } = await import('../src/i18n/locales/en.js');
const { default: zh } = await import('../src/i18n/locales/zh-Hans.js');
const { NOTES } = await import('../src/content/notes.js');
const { FEATURES } = await import('../src/content/features.js');
const { WORD_CATEGORIES, WORDS_METHOD, WORD_NOTES, WORD_COLORS, WORD_OTHER } = await import('../src/content/words.js');
const { localizeWords } = await import('../src/ui/wordscript.js');
const { STORIES } = await import('./load-stories.mjs');

const SITE = (process.env.SITE ?? 'https://terraverba.org').replace(/\/$/, '');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PUB = path.join(ROOT, 'public', 'data');
const OUT = path.join(ROOT, 'dist');
const read = (f) => JSON.parse(fs.readFileSync(path.join(PUB, f), 'utf8'));

// ── data ────────────────────────────────────────────────────
const table = (t) => t.rows.map((r) => Object.fromEntries(t.fields.map((f, i) => [f, r[i]])));
const L = read('languages.json');
const languages = table(L);
const groups = table(read('groups.json'));
const palette = read('families.json');
const byId = new Map();
const children = new Map();
for (const g of groups) byId.set(g.id, Object.assign(g, { kind: 'group', langs: [] }));
for (const l of languages) {
  l.kind = 'lang';
  l.countries = l.countries ? l.countries.split(' ') : [];
  l.macroarea = L.macroareas[l.macroarea] ?? null;
  l.isolate = !l.family && l.category === 0;
  byId.set(l.id, l);
}
const addChild = (p, id) => (children.has(p) ? children.get(p).push(id) : children.set(p, [id]));
for (const g of groups) addChild(g.parent ?? 'root', g.id);
for (const l of languages) {
  addChild(l.parent ?? 'root', l.id);
  for (let p = l.parent; p; p = byId.get(p)?.parent) byId.get(p)?.langs.push(l);
}
const ancestors = (id) => {
  const out = [];
  for (let p = byId.get(id)?.parent; p; p = byId.get(p)?.parent) out.unshift(byId.get(p));
  return out;
};
const roots = (children.get('root') ?? []).map((id) => byId.get(id));
const families = roots.filter((x) => x.kind === 'group' && !x.pseudo).sort((a, b) => b.n - a.n);
const pseudo = roots.filter((x) => x.kind === 'group' && x.pseudo).sort((a, b) => b.n - a.n);
const isolates = roots.filter((x) => x.kind === 'lang').sort((a, b) => (b.speakers ?? 0) - (a.speakers ?? 0));
const bySpeakers = (a, b) => (b.speakers ?? 0) - (a.speakers ?? 0);
// pseudo-families say what kind of language something is, not what it descends from
const PSEUDO_KIND = { 'Sign Language': 'sign', Pidgin: 'pidgin', Unclassifiable: 'unclassified', 'Artificial Language': 'artificial', 'Mixed Language': 'mixed' };

// the app's Nocturne palette: data colours lifted toward white for a dark ground
const lift = (hex, k = 0.16) => {
  const n = parseInt(hex.slice(1), 16);
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(c + (255 - c) * k).toString(16).padStart(2, '0')).join('')}`;
};
palette.colors = Object.fromEntries(Object.entries(palette.colors).map(([k, v]) => [k, lift(v)]));
palette.isolate = '#d8d3ca';
palette.sign = lift(palette.sign);
palette.other = lift(palette.other);
const colorOf = (l) => (l.isolate ? palette.isolate : l.family === 'sign1238' ? palette.sign : palette.colors[l.family] ?? palette.other);
const rad = Math.PI / 180;
const vec = (l) => [Math.cos(l.lat * rad) * Math.cos(l.lon * rad), Math.cos(l.lat * rad) * Math.sin(l.lon * rad), Math.sin(l.lat * rad)];
for (const l of languages) l.v = vec(l);
const dist = (a, b) => 1 - (a.v[0] * b.v[0] + a.v[1] * b.v[1] + a.v[2] * b.v[2]);
// everything around a language, nearest first (computed once, shared by both locales)
const around = new Map();
const nearby = (l) => {
  if (!around.has(l.id)) around.set(l.id, languages.filter((x) => x !== l).map((x) => [dist(l, x), x]).sort((a, b) => a[0] - b[0]).slice(0, 500).map(([, x]) => x));
  return around.get(l.id);
};
const nearest = (l, n) => nearby(l).slice(0, n);

const similarity = Object.fromEntries(['vocabulary', 'grammar'].map((k) => {
  const s = read(`similarity-${k}.json`);
  return [k, { ...s, index: new Map(s.ids.map((id, i) => [id, i])) }];
}));
const feats = read('features.json');
const featIndex = new Map(feats.langs.map((g, i) => [g, i]));
const udhr = read('udhr.json');
const wiki = {};
for (const f of fs.readdirSync(path.join(PUB, 'wiki'))) Object.assign(wiki, JSON.parse(fs.readFileSync(path.join(PUB, 'wiki', f), 'utf8')));
const wordIndex = read('words/index.json');
const rawWords = Object.fromEntries(wordIndex.map((c) => [c.id, read(`words/${c.id}.json`)]));
// per page language: Chinese forms in simplified (zh) or each variety's usual script (en)
let words = {};
let wordsOf = new Map();
function useWords(code) {
  words = Object.fromEntries(Object.entries(rawWords).map(([id, w]) => [id, localizeWords(w, code)]));
  wordsOf = new Map();
  for (const c of wordIndex) {
    for (const [gid, word, roman, src] of words[c.id].forms) {
      if (!wordsOf.has(gid)) wordsOf.set(gid, []);
      wordsOf.get(gid).push({ concept: c, word, roman, src });
    }
  }
}

// ── locales ─────────────────────────────────────────────────
const STR = {
  en: {
    siteName: 'Terraverba', languages: 'Languages', words: 'Words', features: 'Features', openAtlas: 'Open the atlas',
    onGlobe: 'See it on the globe', inTree: 'Open in the family tree', wordMap: 'Open the word map', featureMap: 'Open the feature map',
    facts: 'At a glance', family: 'Family', macroarea: 'Region', coordinates: 'Coordinates', wordsIn: (n) => `Words in ${n}`,
    asjpNote: '* in the simplified ASJP transcription', word: 'Word', meaning: 'Meaning', romanization: 'Romanization', language: 'Language',
    largest: 'Largest languages', allMembers: 'All languages in the family', subgroupsMap: 'Colours mark the main branches.',
    familyLede: (n, count, places) => `${n} is a language family of ${count}${places ? `; the most are spoken in ${places}` : ''}.`,
    pseudoLede: (n, count) => `Glottolog lists ${count} under “${n}”: languages grouped by what they are rather than by where they descend from.`,
    familiesTitle: 'The world’s languages, family by family', familiesLede: (n, f, i) => `${n} languages, in ${f} families and ${i} isolates — languages with no known relatives.`,
    familiesH: 'Language families', otherH: 'Other kinds of language', isolatesH: 'Isolates', languagesCount: (n) => `${n.toLocaleString('en')} languages`,
    wordsTitle: 'One word, around the world', wordsLede: 'How basic words are said across the world’s languages: mother, water, tea, two…',
    wordTitle: (c) => `How to say “${c}” around the world`, wordSub: (n, w) => `${n.toLocaleString('en')} languages · ${w.toLocaleString('en')} in their own spelling`,
    wordLegend: 'Dots of one colour begin with a similar sound.', moreOnMap: (n) => `${n.toLocaleString('en')} more on the word map`,
    featuresTitle: 'How languages differ', featuresLede: 'Tones, word order, clicks, counting words: one question at a time, mapped across the world.',
    examples: 'Examples', featureCount: (n) => `${n.toLocaleString('en')} languages with data`,
    cite: 'Cite', sources: 'Sources', elsewhere: 'Elsewhere', glottolog: 'Glottolog', wikipedia: 'Wikipedia',
    langTitle: (n) => `${n}: where it’s spoken, family and words · Terraverba`, familyTitle: (n) => `${n} languages: map and family tree · Terraverba`,
    footer: 'Terraverba is an atlas of the world’s languages. Languages, families, locations and endangerment: Glottolog 5.3 (CC BY 4.0). Summaries: Wikipedia (CC BY-SA 4.0). Words: Wiktionary (CC BY-SA 4.0) and ASJP (CC BY 4.0). Features: Grambank (CC BY 4.0) and PHOIBLE (CC BY-SA 3.0). Writing samples: UDHR in Unicode.',
    about: 'About Terraverba', source: 'Source code', and: 'and',
    stories: 'Stories', storiesTitle: 'Stories of the world’s languages', storiesLede: 'Guided tours of the globe: how one word took two roads, the people who made scripts and saved languages, the words that need a whole sentence elsewhere…',
    readOnGlobe: 'Read it on the globe', chapterN: (n) => `Chapter ${n}`, chapters: (n) => `${n} chapters`,
  },
  zh: {
    siteName: 'Terraverba 世界语言地图集', languages: '语言', words: '词语', features: '语言特征', openAtlas: '打开地图集',
    onGlobe: '在地球仪上查看', inTree: '在语言树中查看', wordMap: '打开词语地图', featureMap: '打开特征地图',
    facts: '概览', family: '语系', macroarea: '地区', coordinates: '坐标', wordsIn: (n) => `${n}的常用词`,
    asjpNote: '* 为 ASJP 简化音标', word: '词', meaning: '意思', romanization: '转写', language: '语言',
    largest: '使用人口最多的语言', allMembers: '语系里的全部语言', subgroupsMap: '不同颜色表示语系的主要分支。',
    familyLede: (n, count, places) => `${n}共有 ${count}${places ? `，语言数量最多的地方是${places}` : ''}。`,
    pseudoLede: (n, count) => `Glottolog 把 ${count}归入“${n}”：这一类按语言的性质划分，而不是按亲缘关系。`,
    familiesTitle: '世界上的语言，按语系浏览', familiesLede: (n, f, i) => `共 ${n} 种语言，分属 ${f} 个语系，另有 ${i} 种孤立语言——找不到任何亲属的语言。`,
    familiesH: '语系', otherH: '其他类别', isolatesH: '孤立语言', languagesCount: (n) => `${n.toLocaleString('zh-Hans')} 种语言`,
    wordsTitle: '同一个词，全世界怎么说', wordsLede: '“妈妈”“水”“茶”“二”……基本词汇在世界各种语言里的说法。',
    wordTitle: (c) => `“${c}”在世界各地怎么说`, wordSub: (n, w) => `${n.toLocaleString('zh-Hans')} 种语言 · 其中 ${w.toLocaleString('zh-Hans')} 种用本族文字书写`,
    wordLegend: '颜色相同的点，表示读音开头相近。', moreOnMap: (n) => `另有 ${n.toLocaleString('zh-Hans')} 种语言，见词语地图`,
    featuresTitle: '语言之间有什么不同', featuresLede: '声调、语序、搭嘴音、量词……一次一个问题，画在世界地图上。',
    examples: '例子', featureCount: (n) => `${n.toLocaleString('zh-Hans')} 种语言有数据`,
    cite: '引用', sources: '资料来源', elsewhere: '其他资料', glottolog: 'Glottolog', wikipedia: '维基百科',
    langTitle: (n) => `${n}：分布、谱系与常用词 · Terraverba 世界语言地图集`, familyTitle: (n) => `${n}：分布地图与语言树 · Terraverba 世界语言地图集`,
    footer: 'Terraverba 是一部世界语言地图集。语言、谱系、位置与濒危程度：Glottolog 5.3（CC BY 4.0）。简介：维基百科（CC BY-SA 4.0）。词语：维基词典（CC BY-SA 4.0）与 ASJP（CC BY 4.0）。语言特征：Grambank（CC BY 4.0）与 PHOIBLE（CC BY-SA 3.0）。文字样例：UDHR in Unicode。',
    about: '关于 Terraverba', source: '源代码', and: '和',
    stories: '故事', storiesTitle: '世界语言的故事', storiesLede: '跟着地球仪读故事：一个字怎样走了两条路，造字和拯救语言的人，换一种语言就要用一整句话来解释的词……',
    readOnGlobe: '在地球仪上阅读', chapterN: (n) => `第 ${n} 章`, chapters: (n) => `${n} 章`,
  },
};
const i18n = (code) => read(`i18n/${code}.json`);
const LOCALES = [
  { key: 'en', code: 'en', og: 'en_US', dir: '', m: en, s: STR.en, ...i18n('en') },
  { key: 'zh', code: 'zh-Hans', og: 'zh_CN', dir: 'zh/', m: zh, s: STR.zh, ...i18n('zh-Hans') },
];
let loc = LOCALES[0];
const t = (key, ...args) => {
  const v = loc.m[key] ?? en[key];
  return typeof v === 'function' ? v(...args) : v;
};
const tr = (o) => (o ? (loc.key === 'en' ? o.en : o.zh ?? o.en) : '');
const isZh = () => loc.key === 'zh';
const name = (x) => loc.names[x.id] ?? (x.iso && cldrLanguageName(x.iso, x.en, loc.code)) ?? x.en;
const num = (n) => n.toLocaleString(loc.code);
const compact = (n) => (n < 10000 ? num(n) : new Intl.NumberFormat(loc.code, { notation: 'compact', compactDisplay: 'long', maximumFractionDigits: 1 }).format(n));
const list = (items) => new Intl.ListFormat(loc.code, { style: 'long', type: 'conjunction' }).format(items);
const place = (a2) => countryName(a2, loc.code, loc.countries[a2]);
const places = (l) => (WORLDWIDE.has(l.id) ? [] : l.countries.map(place).filter(Boolean));
const familyName = (l) => (l.isolate ? t('isolate') : l.family ? name(byId.get(l.family)) : t('unknown'));
const langCount = (n) => (isZh() ? `${num(n)} 种语言` : `${num(n)} ${n === 1 ? 'language' : 'languages'}`);

// ── paths ───────────────────────────────────────────────────
const slugify = (s) => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48).replace(/-+$/, '');
const slug = (x) => [slugify(x.en ?? ''), x.id].filter(Boolean).join('-');
const top = (x) => (x.kind === 'group' ? [...ancestors(x.id), x][0] : x.family ? byId.get(x.family) : null);
const P = {
  lang: (l) => `languages/${slug(l)}/`,
  // subgroups live as anchors on their family's page
  group: (g) => `families/${slug(top(g))}/${top(g) === g ? '' : `#${g.id}`}`,
  word: (id) => `words/${id}/`,
  feature: (id) => `features/${id}/`,
  story: (id) => `stories/${id}/`,
};
let here = '';
const rootRel = () => '../'.repeat(here.split('/').filter(Boolean).length + (loc.dir ? 1 : 0));
const href = (p) => rootRel() + loc.dir + p;
const app = (route = '') => `${rootRel()}?lang=${loc.code}#/${route}`;
const abs = (l, p) => `${SITE}/${l.dir}${p}`;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// ── maps: one shared world image, dots drawn as zero-length round-capped strokes
const W = 1000;
const LAT_TOP = 84;
const LAT_SPAN = 142;
const H = Math.round((W * LAT_SPAN) / 360);
const xy = (lat, lon) => [((lon + 180) / 360) * W, ((LAT_TOP - Math.max(lat, LAT_TOP - LAT_SPAN)) / LAT_SPAN) * H];
const dots = (pts, color, size) =>
  pts.length ? `<path d="${pts.map((p) => xy(p.lat, p.lon)).map(([x, y]) => `M${x.toFixed(1)} ${y.toFixed(1)}h0`).join('')}" stroke="${color}" stroke-width="${size}" stroke-linecap="round" fill="none"/>` : '';
// a viewBox around a set of points, keeping a fixed aspect ratio inside the world
function frame(pts, { minW = 180, aspect = 2.2 } = {}) {
  const ps = pts.map((p) => xy(p.lat, p.lon));
  const xs = ps.map((p) => p[0]);
  const ys = ps.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  let w = Math.max((x1 - x0) * 1.2, (y1 - y0) * 1.25 * aspect, minW);
  let h = w / aspect;
  if (h > H) [h, w] = [H, Math.min(W, H * aspect)];
  if (w > W) [w, h] = [W, W / aspect];
  const cx = Math.min(Math.max((x0 + x1) / 2, w / 2), W - w / 2);
  const cy = Math.min(Math.max((y0 + y1) / 2, h / 2), H - h / 2);
  return [cx - w / 2, cy - h / 2, w, h];
}
function map(layers, { box = [0, 0, W, H], label = '', caption = '' } = {}) {
  const k = box[2] / W;
  return `<figure class="map"><svg viewBox="${box.map((v) => v.toFixed(1)).join(' ')}" role="img" aria-label="${esc(label)}">
<image href="${rootRel()}assets/world.svg" width="${W}" height="${H}"/>${layers.map((f) => f(k)).join('')}</svg>${caption ? `<figcaption>${caption}</figcaption>` : ''}</figure>`;
}

// ── page shell ──────────────────────────────────────────────
const BRAND = `<svg class="mark" viewBox="14 21 132 132" aria-hidden="true"><g class="ink"><rect x="35.88" y="34" width="88.24" height="22"/><path transform="translate(16.75 130.84) scale(0.071 -0.071)" d="M80 838Q182 885 213 930Q244 975 244 1010Q244 1044 218.5 1067.5Q193 1091 159 1108.5Q125 1126 99.5 1141Q74 1156 74 1174Q74 1252 127 1308Q180 1364 268 1364Q360 1364 412.5 1309Q465 1254 465 1159Q465 1073 432.5 1002Q400 931 325 870Q250 809 120 753Z"/><path transform="translate(104.98 130.84) scale(0.071 -0.071)" d="M80 838Q182 885 213 930Q244 975 244 1010Q244 1044 218.5 1067.5Q193 1091 159 1108.5Q125 1126 99.5 1141Q74 1156 74 1174Q74 1252 127 1308Q180 1364 268 1364Q360 1364 412.5 1309Q465 1254 465 1159Q465 1073 432.5 1002Q400 931 325 870Q250 809 120 753Z"/><path d="M66 55.4H94V118Q94 130 108 132V140H52V132Q66 130 66 118Z"/></g><g class="accent"><path d="M80 56H94V118Q94 130 108 132V140H80Z"/></g></svg>`;
const ARROW = '<svg class="i" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg>';
const pages = [];

function write(p, { title, description, body, jsonld = [], image = loc.key === 'zh' ? 'og-zh.jpg' : 'og.jpg' }) {
  const other = LOCALES.find((x) => x !== loc);
  const html = `<!doctype html>
<html lang="${loc.code}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${abs(loc, p)}">
${LOCALES.map((l) => `<link rel="alternate" hreflang="${l.code}" href="${abs(l, p)}">`).join('\n')}
<link rel="alternate" hreflang="x-default" href="${abs(LOCALES[0], p)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${abs(loc, p)}">
<meta property="og:image" content="${SITE}/${image}">
<meta property="og:type" content="article">
<meta property="og:locale" content="${loc.og}">
<meta property="og:site_name" content="Terraverba">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0a0e13">
<link rel="icon" href="${rootRel()}favicon.ico" sizes="48x48">
<link rel="icon" href="${rootRel()}favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${rootRel()}apple-touch-icon.png">
<link rel="stylesheet" href="${rootRel()}assets/pages.css">
${jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n')}
</head>
<body>
<header class="bar">
<a class="brand" href="${app()}">${BRAND}<span><b>Terraverba</b><small>${esc(t('tagline'))}</small></span></a>
<nav><a href="${href('languages/')}">${loc.s.languages}</a><a href="${href('words/')}">${loc.s.words}</a><a href="${href('features/')}">${loc.s.features}</a><a href="${href('stories/')}">${loc.s.stories}</a></nav>
<span class="grow"></span>
<a class="switch" href="${rootRel()}${other.dir}${p}" hreflang="${other.code}" lang="${other.code}">${other.key === 'en' ? 'English' : '简体中文'}</a>
<a class="btn" href="${app()}">${loc.s.openAtlas}${ARROW}</a>
</header>
<main class="page">
${body}
</main>
<footer class="foot"><p>${esc(loc.s.footer)}</p><p><a href="${app('about')}">${loc.s.about}</a> · <a href="https://github.com/Yanziki/terraverba">${loc.s.source}</a></p></footer>
</body>
</html>
`;
  const file = path.join(OUT, loc.dir, p, 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  if (!loc.dir) pages.push(p);
}

const crumbs = (items) => `<nav class="crumbs">${items.map(([label, p]) => (p != null ? `<a href="${href(p)}">${esc(label)}</a>` : `<span>${esc(label)}</span>`)).join('<i>/</i>')}</nav>`;
const crumbLd = (items) => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: items.map(([label, p], i) => ({ '@type': 'ListItem', position: i + 1, name: label, ...(p != null ? { item: abs(loc, p) } : {}) })),
});
const swatch = (c, cls = '') => `<i class="dot${cls}" style="--c:${c}"></i>`;
const langLink = (l, extra = '') => `<a href="${href(P.lang(l))}">${swatch(colorOf(l), l.aes === 6 ? ' hollow' : '')}${esc(name(l))}${extra}</a>`;
const paras = (text, n = 3) => text.split(/\n+/).filter(Boolean).slice(0, n).map((p) => `<p>${esc(p)}</p>`).join('');
const firstSentence = (s) => (s ?? '').split(/(?<=[。.!?！？])\s*/)[0];
const clip = (s, n = 158) => (s.length <= n ? s : `${s.slice(0, n - 1).replace(/\s+\S*$/, '')}…`);

function wikiBlock(id) {
  const w = wiki[id];
  const entry = (isZh() && w?.zh) || w?.en;
  if (!entry) return '';
  const lang = entry === w?.zh ? 'zh' : 'en';
  const from = isZh() && lang === 'en' ? '摘自英文维基百科' : t('fromWiki');
  return `<section class="wiki" lang="${lang === 'zh' ? 'zh-Hans' : 'en'}">${paras(entry.text)}<p class="src">${esc(from)} · <a href="${esc(entry.url)}" rel="noopener">${esc(entry.title)}</a> · CC BY-SA 4.0</p></section>`;
}

// ── language pages ──────────────────────────────────────────
function kindOf(l) {
  if (l.isolate) return 'isolate';
  const p = l.family && byId.get(l.family);
  return p?.pseudo ? PSEUDO_KIND[p.en] ?? 'unclassified' : l.family ? 'family' : 'unclassified';
}

function lede(l) {
  const nm = name(l);
  const kind = kindOf(l);
  const where = places(l);
  const extinct = l.aes === 6;
  const aesLabel = t('aes')[l.aes];
  if (isZh()) {
    const what = { isolate: '一种孤立语言', sign: '一种手语', pidgin: '一种皮钦语', mixed: '一种混合语', artificial: '一种人造语言', unclassified: '一种尚未归类的语言', family: `${familyName(l)}的一种语言` }[kind];
    let s = `${nm}是${what}`;
    if (where.length) s += `，${extinct ? '过去' : '主要'}分布在${where.slice(0, 4).join('、')}`;
    else if (WORLDWIDE.has(l.id)) s += '，使用者分散在世界各地';
    else if (l.macroarea) s += `，分布在${t('macroareas')[l.macroarea]}`;
    if (l.speakers && !extinct) s += `，使用人口约 ${compact(l.speakers)}`;
    s += extinct ? '，现已消亡。' : '。';
    if (l.aes >= 2 && l.aes <= 5) s += `按 Glottolog 的评估，它的濒危程度为“${aesLabel}”。`;
    return s;
  }
  const fam = familyName(l);
  const an = (w) => (/^[aeio]|^u(?!r|ni|to)/i.test(w) ? 'an' : 'a');
  const what = { isolate: 'a language isolate', sign: 'a sign language', pidgin: 'a pidgin', mixed: 'a mixed language', artificial: 'an artificial language', unclassified: 'an unclassified language', family: `${an(fam)} ${fam} language` }[kind];
  let s = `${nm} ${extinct ? 'was' : 'is'} ${what}`;
  if (where.length) s += ` ${extinct ? 'once spoken' : 'spoken'} in ${list(where.slice(0, 4))}`;
  else if (WORLDWIDE.has(l.id)) s += ' spoken around the world';
  else if (l.macroarea) s += ` spoken in ${t('macroareas')[l.macroarea]}`;
  if (l.speakers && !extinct) s += `, by about ${compact(l.speakers)} people`;
  s += '.';
  if (l.aes >= 2 && l.aes <= 5) s += ` Glottolog rates it ${aesLabel.toLowerCase()}.`;
  return s;
}

function langPage(l) {
  here = P.lang(l);
  const nm = name(l);
  const fam = l.family ? byId.get(l.family) : null;
  const chain = ancestors(l.id);
  const alt = [isZh() && l.en !== nm ? l.en : null, l.native && l.native !== l.en && l.native !== nm ? l.native : null].filter(Boolean);
  const note = NOTES[l.id];
  const where = places(l);
  const intro = lede(l);

  // the map: the language among everything spoken around it
  const box = frame([l], { minW: 210 });
  const [bx, by, bw, bh] = box;
  // the 500 nearest are plenty, even where languages crowd (New Guinea)
  const inView = nearby(l).filter((x) => (([x0, y0]) => x0 >= bx && x0 <= bx + bw && y0 >= by && y0 <= by + bh)(xy(x.lat, x.lon)));
  const byColor = new Map();
  for (const x of inView) (byColor.get(colorOf(x)) ?? byColor.set(colorOf(x), []).get(colorOf(x))).push(x);
  const figure = map([
    (k) => [...byColor].map(([c, pts]) => dots(pts, c, 5.5 * k)).join(''),
    (k) => `<circle cx="${xy(l.lat, l.lon)[0].toFixed(1)}" cy="${xy(l.lat, l.lon)[1].toFixed(1)}" r="${(11 * k).toFixed(2)}" fill="none" stroke="#1d1b18" stroke-width="${(1.6 * k).toFixed(2)}"/>${dots([l], colorOf(l), 10 * k)}`,
  ], { box, label: nm, caption: `${esc(nm)} · ${Math.abs(l.lat).toFixed(1)}°${l.lat >= 0 ? 'N' : 'S'} ${Math.abs(l.lon).toFixed(1)}°${l.lon >= 0 ? 'E' : 'W'}` });

  const facts = [
    [t('speakers'), l.speakers ? compact(l.speakers) : '—'],
    [t('status'), t('aes')[l.aes]],
    [loc.s.family, fam ? `<a href="${href(P.group(fam))}">${esc(name(fam))}</a>` : esc(familyName(l)), true],
    [t('where'), esc(where.length ? list(where.slice(0, 8)) + (where.length > 8 ? ' …' : '') : WORLDWIDE.has(l.id) ? t('worldwide') : t('macroareas')[l.macroarea] ?? '—'), true],
    [t('codes'), `${l.iso ? `ISO 639-3 <b>${l.iso}</b> · ` : ''}Glottolog <b>${l.id}</b>`, true],
  ].filter(Boolean);
  if (l.dialects) facts.push([isZh() ? '方言' : 'Dialects', esc(t('dialectsNote', l.dialects)), true]);

  // words: readable spellings first; ASJP transcriptions only when that is all there is
  const ws = wordsOf.get(l.id) ?? [];
  const readable = ws.filter((w) => w.src === 0);
  const shown = (readable.length >= 6 ? readable : ws).slice(0, 30);
  const wordTable = shown.length
    ? `<section><h2>${esc(loc.s.wordsIn(nm))}</h2><table class="words"><thead><tr><th>${loc.s.meaning}</th><th>${loc.s.word}</th><th>${loc.s.romanization}</th></tr></thead><tbody>
${shown.map((w) => `<tr><td><a href="${href(P.word(w.concept.id))}">${esc(isZh() ? w.concept.zh : w.concept.en)}</a></td><td class="w">${esc(w.word)}${w.src ? '*' : ''}</td><td class="r">${esc(w.roman ?? '')}</td></tr>`).join('\n')}
</tbody></table>${shown.some((w) => w.src) ? `<p class="hint">${loc.s.asjpNote}</p>` : ''}</section>`
    : '';

  // a few grammar and sound facts
  const fi = featIndex.get(l.id);
  const profile = fi == null ? [] : FEATURES.map((f) => {
    const c = feats.features[f.id].values[fi];
    if (c === '.') return null;
    const code = feats.features[f.id].codes[+c];
    return `<li><a href="${href(P.feature(f.id))}"><span class="k">${esc(tr(f.short))}</span>${swatch(f.codes[code].color)}<span class="v">${esc(tr(f.codes[code].label))}</span></a></li>`;
  }).filter(Boolean);

  const similar = (k) => {
    const s = similarity[k];
    const i = s.index.get(l.id);
    if (i == null) return '';
    const rows = s.nn.slice(i * 8, i * 8 + 6).map((j, n) => [byId.get(s.ids[j]), s.nd[i * 8 + n]]).filter(([x]) => x);
    return `<div><h3>${t(k === 'vocabulary' ? 'similarVocab' : 'similarGrammar')}</h3><ul class="rows">${rows.map(([x, d]) => `<li>${langLink(x)}<span class="sub">${esc(familyName(x))}</span><span class="pct">${esc(t('similarity', Math.max(0, Math.round((1 - d) * 100))))}</span></li>`).join('')}</ul></div>`;
  };
  const sims = [similar('vocabulary'), similar('grammar')].filter(Boolean);
  const sample = udhr[l.id];
  const crumbItems = [[loc.s.languages, 'languages/'], ...(fam ? [[name(fam), P.group(fam)]] : []), [nm, null]];

  const body = `
${crumbs(crumbItems)}
<h1>${esc(nm)}</h1>
${alt.length ? `<p class="alt">${alt.map(esc).join(' · ')}</p>` : ''}
<p class="lede">${esc(intro)}</p>
<p class="cta"><a class="btn" href="${app(`?sel=${l.id}`)}">${loc.s.onGlobe}${ARROW}</a>${fam ? `<a class="btn ghost" href="${app(`tree/${fam.id}?sel=${l.id}`)}">${loc.s.inTree}</a>` : ''}</p>
${figure}
<div class="cols">
<div class="main">
${note ? `<section class="note"><h2>${t('didYouKnow')}</h2><p>${esc(tr(note))}</p></section>` : l.isolate ? `<section class="note"><p>${esc(t('isolateNote'))}</p></section>` : l.family === 'sign1238' ? `<section class="note"><p>${esc(t('signNote'))}</p></section>` : ''}
${wikiBlock(l.id)}
${sample ? `<section><h2>${t('sampleTitle')}</h2><blockquote class="udhr" dir="${sample[2] === 'rtl' ? 'rtl' : 'ltr'}">${esc(sample[0])}</blockquote><p class="hint">${t('sampleCaption')}</p></section>` : ''}
${wordTable}
</div>
<aside class="side">
<section><h2>${loc.s.facts}</h2><dl class="facts">${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl></section>
${profile.length ? `<section><h2>${t('featureSection')}</h2><ul class="profile">${profile.join('')}</ul></section>` : ''}
${chain.length ? `<section><h2>${t('classification')}</h2><ol class="lineage">${chain.map((g) => `<li><a href="${href(P.group(g))}">${esc(name(g))}</a><span class="n">${num(g.n)}</span></li>`).join('')}<li class="self">${esc(nm)}</li></ol></section>` : ''}
</aside>
</div>
${sims.length ? `<section><h2>${t('similar')}</h2><div class="pair">${sims.join('')}</div><p class="hint">${esc(t('similarNote'))}</p></section>` : ''}
<section><h2>${t('nearby')}</h2><div class="chips">${nearest(l, 10).map((x) => langLink(x)).join('')}</div></section>
<section class="cite"><h2>${loc.s.elsewhere}</h2><p class="report"><a href="${app(`?sel=${l.id}&report`)}">${esc(t('reportPrompt'))}</a></p><p><a href="https://glottolog.org/resource/languoid/id/${l.id}" rel="noopener">Glottolog · ${l.id}</a>${wiki[l.id]?.en ? ` · <a href="${esc(wiki[l.id].en.url)}" rel="noopener">${loc.s.wikipedia} (English)</a>` : ''}${isZh() && wiki[l.id]?.zh ? ` · <a href="${esc(wiki[l.id].zh.url)}" rel="noopener">维基百科（中文）</a>` : ''}${l.iso ? ` · <a href="https://www.ethnologue.com/language/${l.iso}" rel="noopener">Ethnologue · ${l.iso}</a>` : ''}</p></section>`;

  const description = clip(note ? `${intro} ${firstSentence(tr(note))}` : intro);
  write(here, {
    title: loc.s.langTitle(nm), description, body,
    jsonld: [
      {
        '@context': 'https://schema.org', '@type': 'Language', name: nm, url: abs(loc, here),
        ...(alt.length ? { alternateName: alt } : {}),
        description: intro,
        identifier: [{ '@type': 'PropertyValue', propertyID: 'Glottocode', value: l.id }, ...(l.iso ? [{ '@type': 'PropertyValue', propertyID: 'ISO 639-3', value: l.iso }] : [])],
        sameAs: [`https://glottolog.org/resource/languoid/id/${l.id}`, ...(wiki[l.id]?.en ? [wiki[l.id].en.url] : [])],
      },
      crumbLd(crumbItems),
    ],
  });
}

// ── family pages ────────────────────────────────────────────
function familyPage(g) {
  here = P.group(g);
  const nm = name(g);
  const members = [...g.langs].sort(bySpeakers);
  const kids = (children.get(g.id) ?? []).map((id) => byId.get(id));
  const branchesOf = (x) => (children.get(x.id) ?? []).map((id) => byId.get(id)).filter((k) => k.kind === 'group').sort((a, b) => b.n - a.n);
  // colour the first level that actually splits (Indo-European → Classical
  // Indo-European → Germanic, Italic, Indo-Iranian…)
  let split = g;
  while (branchesOf(split)[0]?.n > split.n * 0.75) split = branchesOf(split)[0];
  const branches = branchesOf(split);
  // the biggest branches get colours, the rest share the "other" grey
  const colored = branches.slice(0, WORD_COLORS.length).filter((b) => b.n >= 2);
  const branchOf = new Map();
  colored.forEach((b, i) => b.langs.forEach((l) => branchOf.set(l.id, WORD_COLORS[i])));
  const byColor = new Map();
  for (const l of members) {
    const c = g.pseudo ? colorOf(l) : branchOf.get(l.id) ?? WORD_OTHER;
    (byColor.get(c) ?? byColor.set(c, []).get(c)).push(l);
  }
  const box = frame(members, { minW: 240 });
  const k0 = box[2] / W;
  const order = [...byColor].sort((a, b) => (a[0] === WORD_OTHER) - (b[0] === WORD_OTHER) || b[1].length - a[1].length).reverse();
  const figure = map([(k) => order.map(([c, pts]) => dots(pts, c, Math.max(4.5, 7 - members.length / 400) * k)).join('')], {
    box, label: nm,
    caption: !g.pseudo && colored.length > 1 ? `<span class="legend">${colored.map((b, i) => `<span>${swatch(WORD_COLORS[i])}<a href="#${b.id}">${esc(name(b))}</a></span>`).join('')}${members.some((l) => !branchOf.has(l.id)) ? `<span>${swatch(WORD_OTHER)}${esc(t('wordsOther'))}</span>` : ''}</span>` : '',
  });
  void k0;

  const countryCount = new Map();
  for (const l of members) for (const a2 of l.countries) countryCount.set(a2, (countryCount.get(a2) ?? 0) + 1);
  const topPlaces = [...countryCount].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([a2]) => place(a2)).filter(Boolean);
  const intro = g.pseudo
    ? loc.s.pseudoLede(nm, langCount(g.n))
    : loc.s.familyLede(nm, langCount(g.n), topPlaces.length ? (isZh() ? topPlaces.join('、') : list(topPlaces)) : '');
  const note = NOTES[g.id];

  const tree = (node, depth) => {
    const ks = (children.get(node.id) ?? []).map((id) => byId.get(id));
    const sub = ks.filter((x) => x.kind === 'group').sort((a, b) => b.n - a.n);
    const ls = ks.filter((x) => x.kind === 'lang').sort(bySpeakers);
    return `${ls.length ? `<ul class="langs">${ls.map((l) => `<li>${langLink(l)}</li>`).join('')}</ul>` : ''}${sub.map((s) => `<details id="${s.id}"${depth < 1 ? ' open' : ''}><summary>${esc(name(s))}<span class="n">${num(s.n)}</span></summary>${tree(s, depth + 1)}</details>`).join('')}`;
  };
  const crumbItems = [[loc.s.languages, 'languages/'], [nm, null]];
  const body = `
${crumbs(crumbItems)}
<h1>${esc(nm)}</h1>
<p class="alt">${isZh() && g.en !== nm ? `${esc(g.en)} · ` : ''}${esc(langCount(g.n))}</p>
<p class="lede">${esc(intro)}</p>
<p class="cta"><a class="btn" href="${app(`?sel=${g.id}`)}">${loc.s.onGlobe}${ARROW}</a><a class="btn ghost" href="${app(`tree/${g.id}`)}">${loc.s.inTree}</a></p>
${figure}
<div class="cols">
<div class="main">
${note ? `<section class="note"><h2>${t('didYouKnow')}</h2><p>${esc(tr(note))}</p></section>` : g.id === 'sign1238' ? `<section class="note"><p>${esc(t('signNote'))}</p></section>` : ''}
${wikiBlock(g.id)}
<section><h2>${loc.s.allMembers}</h2><div class="tree">${tree(g, 0)}</div></section>
</div>
<aside class="side">
<section><h2>${loc.s.largest}</h2><ul class="rows">${members.slice(0, 12).map((l) => `<li>${langLink(l)}<span class="pct">${l.speakers ? esc(compact(l.speakers)) : ''}</span></li>`).join('')}</ul></section>
</aside>
</div>
<section class="cite"><h2>${loc.s.elsewhere}</h2><p class="report"><a href="${app(`?sel=${g.id}&report`)}">${esc(t('reportPrompt'))}</a></p><p><a href="https://glottolog.org/resource/languoid/id/${g.id}" rel="noopener">Glottolog · ${g.id}</a>${wiki[g.id]?.en ? ` · <a href="${esc(wiki[g.id].en.url)}" rel="noopener">${loc.s.wikipedia} (English)</a>` : ''}</p></section>`;
  write(here, {
    title: loc.s.familyTitle(nm), description: clip(note ? `${intro} ${firstSentence(tr(note))}` : intro), body,
    jsonld: [crumbLd(crumbItems)],
  });
}

function languagesIndex() {
  here = 'languages/';
  const total = languages.length;
  const body = `
<h1>${esc(loc.s.familiesTitle)}</h1>
<p class="lede">${esc(loc.s.familiesLede(num(total), num(families.length), num(isolates.length)))}</p>
<p class="cta"><a class="btn" href="${app('tree')}">${loc.s.inTree}${ARROW}</a></p>
${map([(k) => {
  const byColor = new Map();
  for (const l of languages) (byColor.get(colorOf(l)) ?? byColor.set(colorOf(l), []).get(colorOf(l))).push(l);
  return [...byColor].sort((a, b) => b[1].length - a[1].length).map(([c, pts]) => dots(pts, c, 3.6 * k)).join('');
}], { label: loc.s.familiesTitle })}
<section><h2>${loc.s.familiesH}</h2><ul class="families">${families.map((g) => `<li><a href="${href(P.group(g))}">${swatch(palette.colors[g.id] ?? palette.other)}${esc(name(g))}</a><span class="n">${num(g.n)}</span></li>`).join('')}</ul></section>
<section><h2>${loc.s.otherH}</h2><ul class="families">${pseudo.map((g) => `<li><a href="${href(P.group(g))}">${swatch(g.id === 'sign1238' ? palette.sign : palette.other)}${esc(name(g))}</a><span class="n">${num(g.n)}</span></li>`).join('')}</ul></section>
<section><h2>${loc.s.isolatesH}</h2><p class="hint">${esc(t('isolateNote'))}</p><div class="chips">${isolates.map((l) => langLink(l)).join('')}</div></section>`;
  write(here, { title: `${loc.s.familiesTitle} · Terraverba`, description: loc.s.familiesLede(num(total), num(families.length), num(isolates.length)), body });
}

// ── word pages ──────────────────────────────────────────────
function wordPage(c) {
  here = P.word(c.id);
  const w = words[c.id];
  const label = isZh() ? c.zh : c.en;
  const colors = w.groups.map((_, i) => WORD_COLORS[i]);
  const byGroup = new Map();
  for (const [gid, , , , gi] of w.forms) {
    const l = byId.get(gid);
    if (!l) continue;
    const col = gi >= 0 ? colors[gi] : WORD_OTHER;
    (byGroup.get(col) ?? byGroup.set(col, []).get(col)).push(l);
  }
  const order = [...byGroup].sort((a, b) => (b[0] === WORD_OTHER) - (a[0] === WORD_OTHER));
  const readable = w.forms.filter((f) => f[3] === 0 && byId.has(f[0]));
  const rows = readable.slice(0, 320);
  const note = WORD_NOTES[c.id];
  const title = loc.s.wordTitle(label);
  const body = `
${crumbs([[loc.s.words, 'words/'], [label, null]])}
<h1>${esc(title)}</h1>
<p class="alt">${esc(loc.s.wordSub(w.n, readable.length))}</p>
${note ? `<p class="lede">${esc(tr(note))}</p>` : ''}
<p class="cta"><a class="btn" href="${app(`words/${c.id}`)}">${loc.s.wordMap}${ARROW}</a></p>
${map([(k) => order.map(([col, pts]) => dots(pts, col, 4.4 * k)).join('')], {
  label: title,
  caption: `<span class="legend">${w.groups.map((g, i) => `<span>${swatch(colors[i])}${g.examples.slice(0, 3).map((e) => esc(e[1])).join(' · ')}</span>`).join('')}<span>${swatch(WORD_OTHER)}${esc(t('wordsOther'))}</span></span>`,
})}
<p class="hint">${esc(loc.s.wordLegend)} ${esc(tr(WORDS_METHOD))}</p>
<section><table class="words wide"><thead><tr><th>${loc.s.language}</th><th>${loc.s.word}</th><th>${loc.s.romanization}</th><th>${loc.s.family}</th></tr></thead><tbody>
${rows.map(([gid, word, roman, , gi]) => { const l = byId.get(gid); return `<tr><td>${langLink(l)}</td><td class="w">${swatch(gi >= 0 ? colors[gi] : WORD_OTHER)}${esc(word)}</td><td class="r">${esc(roman ?? '')}</td><td class="sub">${esc(familyName(l))}</td></tr>`; }).join('\n')}
</tbody></table>${w.n > rows.length ? `<p class="hint"><a href="${app(`words/${c.id}`)}">${esc(loc.s.moreOnMap(w.n - rows.length))}</a></p>` : ''}</section>`;
  write(here, { title: `${title} · Terraverba`, description: clip(note ? tr(note) : `${title}. ${loc.s.wordSub(w.n, readable.length)}`), body });
}

function wordsIndex() {
  here = 'words/';
  const cats = Object.keys(WORD_CATEGORIES);
  const body = `
<h1>${esc(loc.s.wordsTitle)}</h1>
<p class="lede">${esc(loc.s.wordsLede)}</p>
<p class="cta"><a class="btn" href="${app('words')}">${loc.s.wordMap}${ARROW}</a></p>
${cats.map((cat) => `<section><h2>${esc(tr(WORD_CATEGORIES[cat]))}</h2><div class="chips">${wordIndex.filter((c) => c.cat === cat).map((c) => `<a href="${href(P.word(c.id))}">${esc(isZh() ? c.zh : c.en)}<span class="n">${num(c.n)}</span></a>`).join('')}</div></section>`).join('')}`;
  write(here, { title: `${loc.s.wordsTitle} · Terraverba`, description: loc.s.wordsLede, body });
}

// ── story pages: every chapter on one page ──────────────────
// placeholders such as {total} are filled from the data, as on the globe
function storyVars() {
  const area = (m) => languages.filter((l) => l.macroarea === m).length;
  return {
    total: num(languages.length),
    endangered: num(languages.filter((l) => l.aes >= 2 && l.aes <= 5).length),
    extinct: num(languages.filter((l) => l.aes === 6).length),
    isolates: num(isolates.length),
    africa: num(area('Africa')),
    americas: num(area('North America') + area('South America')),
  };
}
const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);
const IMG = () => `${rootRel()}img/people/`;

function storyTable(tb) {
  if (!tb) return '';
  const caption = tb.caption ? `<caption>${esc(tr(tb.caption))}</caption>` : '';
  if (tb.columns) {
    const hasKey = tb.rows.some((r) => r[0]);
    return `<table class="words">${caption}<thead><tr>${hasKey ? '<th></th>' : ''}${tb.columns.map((id) => `<th>${esc(name(byId.get(id)))}</th>`).join('')}</tr></thead>
<tbody>${tb.rows.map((r) => `<tr>${hasKey ? `<td class="sub">${esc(typeof r[0] === 'string' ? r[0] : tr(r[0]))}</td>` : ''}${r.slice(1).map((w) => `<td class="w">${esc(w)}</td>`).join('')}</tr>`).join('\n')}</tbody></table>`;
  }
  return `<table class="words">${caption}<tbody>${tb.rows.map(([id, w, gloss]) => {
    const l = byId.get(id);
    return `<tr><td>${l ? langLink(l) : ''}</td><td class="w">${esc(w)}${gloss ? `<small class="gloss">${esc(tr(gloss))}</small>` : ''}</td></tr>`;
  }).join('\n')}</tbody></table>`;
}

function storyPage(s) {
  here = P.story(s.id);
  const vars = storyVars();
  const title = tr(s.title);
  const first = s.chapters.find((ch) => ch.portrait);
  const body = `
${crumbs([[loc.s.stories, 'stories/'], [title, null]])}
<h1>${esc(title)}</h1>
<p class="alt">${esc(tr(s.kicker))}</p>
<p class="lede">${esc(tr(s.blurb))}</p>
<p class="cta"><a class="btn" href="${app(`story/${s.id}/0`)}">${loc.s.readOnGlobe}${ARROW}</a></p>
${s.chapters.map((ch, i) => `<section class="chapter" id="${i + 1}">
<p class="kicker">${esc(loc.s.chapterN(i + 1))}</p>
<h2>${esc(tr(ch.title))}</h2>
${ch.portrait ? `<figure class="portrait"><img src="${IMG()}${ch.portrait.src}" alt="${esc(tr(ch.portrait.caption))}" loading="lazy"><figcaption>${esc(tr(ch.portrait.caption))}<small>${esc(ch.portrait.credit)} · <a href="${ch.portrait.page}">Wikimedia Commons</a></small></figcaption></figure>` : ''}
<p>${esc(fill(tr(ch.body), vars))}</p>
${storyTable(ch.table)}
${ch.source ? `<p class="hint">${esc(tr(ch.source))}</p>` : ''}
<p class="hint"><a href="${app(`story/${s.id}/${i}`)}">${loc.s.readOnGlobe} →</a></p>
</section>`).join('\n')}`;
  write(here, {
    title: `${title} · Terraverba`,
    description: clip(tr(s.blurb)),
    body,
    jsonld: [crumbLd([[loc.s.stories, 'stories/'], [title, null]])],
    image: first ? `img/people/${first.portrait.src}` : 'og.jpg',
  });
}

function storiesIndex() {
  here = 'stories/';
  const body = `
<h1>${esc(loc.s.storiesTitle)}</h1>
<p class="lede">${esc(loc.s.storiesLede)}</p>
<p class="cta"><a class="btn" href="${app('stories')}">${loc.s.readOnGlobe}${ARROW}</a></p>
${STORIES.map((s) => `<section><h2><a href="${href(P.story(s.id))}">${esc(tr(s.title))}</a></h2><p class="alt">${esc(tr(s.kicker))} · ${esc(loc.s.chapters(s.chapters.length))}</p><p>${esc(tr(s.blurb))}</p></section>`).join('\n')}`;
  write(here, { title: `${loc.s.storiesTitle} · Terraverba`, description: loc.s.storiesLede, body });
}

// ── feature pages ───────────────────────────────────────────
function featurePage(f) {
  here = P.feature(f.id);
  const col = feats.features[f.id];
  const groupsByCode = Object.keys(f.codes).map((code) => {
    const ci = String(col.codes.indexOf(code));
    const ls = feats.langs.filter((g, i) => col.values[i] === ci && byId.has(g)).map((g) => byId.get(g)).sort(bySpeakers);
    return { code, ls, ...f.codes[code] };
  });
  const n = groupsByCode.reduce((s, g) => s + g.ls.length, 0);
  const title = tr(f.title);
  const body = `
${crumbs([[loc.s.features, 'features/'], [tr(f.short), null]])}
<h1>${esc(title)}</h1>
<p class="alt">${esc(loc.s.featureCount(n))}</p>
<p class="lede">${esc(tr(f.body))}</p>
<p class="cta"><a class="btn" href="${app(`features/${f.id}`)}">${loc.s.featureMap}${ARROW}</a></p>
${map([(k) => groupsByCode.map((g) => dots(g.ls, g.color, 4.6 * k)).join('')], {
  label: title,
  caption: `<span class="legend">${groupsByCode.map((g) => `<span>${swatch(g.color)}${esc(tr(g.label))} <span class="n">${num(g.ls.length)}</span></span>`).join('')}</span>`,
})}
<p class="hint">${esc(tr(f.note))}</p>
${groupsByCode.map((g) => `<section><h2>${swatch(g.color)}${esc(tr(g.label))} <span class="n">${num(g.ls.length)}</span></h2><div class="chips">${g.ls.slice(0, 40).map((l) => langLink(l)).join('')}</div></section>`).join('')}`;
  write(here, { title: `${title} · Terraverba`, description: clip(tr(f.body)), body });
}

function featuresIndex() {
  here = 'features/';
  const body = `
<h1>${esc(loc.s.featuresTitle)}</h1>
<p class="lede">${esc(loc.s.featuresLede)}</p>
<p class="cta"><a class="btn" href="${app('features')}">${loc.s.featureMap}${ARROW}</a></p>
<ul class="feature-list">${FEATURES.map((f) => `<li><a href="${href(P.feature(f.id))}"><b>${esc(tr(f.title))}</b><span>${esc(firstSentence(tr(f.body)))}</span></a></li>`).join('')}</ul>`;
  write(here, { title: `${loc.s.featuresTitle} · Terraverba`, description: loc.s.featuresLede, body });
}

// ── shared files ────────────────────────────────────────────
function worldSvg() {
  const topo = JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules', 'world-atlas', 'land-110m.json'), 'utf8'));
  const proj = geoEquirectangular().scale(W / (2 * Math.PI)).translate([W / 2, ((LAT_TOP * Math.PI) / 180) * (W / (2 * Math.PI))]).precision(0.2);
  const d = geoPath(proj)(feature(topo, topo.objects.land)).replace(/(\d+\.\d)\d+/g, '$1');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#0b1218"/><path d="${d}" fill="#26323d" stroke="#5d7385" stroke-width="0.5" stroke-linejoin="round"/></svg>`;
}

function stylesheet() {
  const css = fs.readdirSync(path.join(OUT, 'assets')).find((f) => /^index-.*\.css$/.test(f));
  const faces = (fs.readFileSync(path.join(OUT, 'assets', css), 'utf8').match(/@font-face\{[^}]*\}/g) ?? []).filter((r) => !/italic/.test(r) && !/font-weight:500/.test(r));
  return `${faces.join('\n')}\n${fs.readFileSync(path.join(ROOT, 'tools', 'pages.css'), 'utf8')}`;
}

function sitemap() {
  const urls = (l) => pages.map((p) => `<url><loc>${abs(l, p)}</loc></url>`).join('\n');
  for (const l of LOCALES) {
    fs.writeFileSync(path.join(OUT, `sitemap-${l.key}.xml`), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<url><loc>${SITE}/</loc></url>\n${urls(l)}\n</urlset>\n`);
  }
  fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${LOCALES.map((l) => `<sitemap><loc>${SITE}/sitemap-${l.key}.xml</loc></sitemap>`).join('\n')}\n</sitemapindex>\n`);
  fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
}

// ── build ───────────────────────────────────────────────────
if (!fs.existsSync(path.join(OUT, 'index.html'))) throw new Error('run `vite build` first');
// the app's own page: link previews need an absolute image address and the page's own
{
  const file = path.join(OUT, 'index.html');
  const html = fs.readFileSync(file, 'utf8')
    .replace(/<meta property="og:image" content="[^"]*" \/>/, `<meta property="og:image" content="${SITE}/og.jpg" />\n    <meta property="og:url" content="${SITE}/" />\n    <link rel="canonical" href="${SITE}/" />`)
    // the site's name in search results (Google reads it from the home page)
    .replace('</head>', `  <meta property="og:site_name" content="Terraverba" />\n    <script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org', '@type': 'WebSite', name: 'Terraverba', alternateName: ['Terraverba · An atlas of the world’s languages', '世界语言地图集'], url: `${SITE}/`,
    })}</script>\n  </head>`);
  fs.writeFileSync(file, html);
}
// an address that does not exist gets a real 404 (without this file, Pages answers every
// unknown path with the atlas itself, which search engines count as duplicate pages)
fs.writeFileSync(path.join(OUT, '404.html'), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Not found · Terraverba</title>
<meta name="robots" content="noindex">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/pages.css">
</head>
<body>
<main class="page">
<h1>Page not found</h1>
<p class="lede">There is nothing at this address. <a href="/">Open the atlas</a> or <a href="/languages/">browse the languages</a>.</p>
<p class="lede" lang="zh-Hans">这个地址没有页面。<a href="/?lang=zh-Hans">打开地图集</a>，或者<a href="/zh/languages/">浏览语言目录</a>。</p>
</main>
</body>
</html>
`);
for (const dir of ['languages', 'families', 'words', 'features', 'stories', 'zh']) fs.rmSync(path.join(OUT, dir), { recursive: true, force: true });
fs.writeFileSync(path.join(OUT, 'assets', 'world.svg'), worldSvg());
fs.writeFileSync(path.join(OUT, 'assets', 'pages.css'), stylesheet());
const only = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;
const t0 = Date.now();
for (const l of LOCALES) {
  loc = l;
  document.documentElement.lang = l.code;
  useWords(l.code);
  for (const x of languages) if (!only || only.has(x.id)) langPage(x);
  for (const g of [...families, ...pseudo]) if (!only || only.has(g.id)) familyPage(g);
  for (const c of wordIndex) wordPage(c);
  for (const f of FEATURES) featurePage(f);
  for (const s of STORIES) storyPage(s);
  languagesIndex();
  storiesIndex();
  wordsIndex();
  featuresIndex();
}
sitemap();
// a preview build (PREVIEW=1) is not for search engines: the real address is SITE
if (process.env.PREVIEW) {
  fs.writeFileSync(path.join(OUT, '_headers'), '/*\n  X-Robots-Tag: noindex\n');
  fs.writeFileSync(path.join(OUT, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
}
console.log(`${pages.length} pages × ${LOCALES.length} languages in ${((Date.now() - t0) / 1000).toFixed(1)}s → dist/ (site ${SITE})`);
