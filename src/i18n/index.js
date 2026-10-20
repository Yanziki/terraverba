// Interface language framework.
//  - UI strings live in ./locales/<code>.js; English is bundled and is the
//    fallback for any missing key or unsupported browser language.
//  - Language and country names come from data/i18n/<code>.json (Wikidata).
//  - Hand-written content (notes, stories) is authored in English and
//    Simplified Chinese; Traditional Chinese is converted on the fly, every
//    other locale falls back to English until someone translates it.
import en from './locales/en.js';

export const LOCALES = [
  { code: 'en', name: 'English' },
  { code: 'zh-Hans', name: '简体中文' },
  { code: 'zh-Hant', name: '繁體中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'pt', name: 'Português' },
  { code: 'ru', name: 'Русский' },
];
const SUPPORTED = new Set(LOCALES.map((l) => l.code));
const loaders = import.meta.glob('./locales/*.js');
// translated long-form content (About, stories) for languages other than en/zh
const contentLoaders = import.meta.glob('../content/translations/*.js');
let content = null;
const contentListeners = [];
export const contentFor = (key) => content?.[key] ?? null;
export const onContent = (fn) => contentListeners.push(fn);

let locale = 'en';
let messages = en;
let toHant = null;

// best supported match for the browser's preferred languages, else English
export function detectLocale() {
  const forced = new URLSearchParams(location.search).get('lang');
  if (forced && SUPPORTED.has(forced)) return forced;
  try {
    const saved = localStorage.getItem('glossa-locale');
    if (saved && SUPPORTED.has(saved)) return saved;
  } catch {}
  for (const tag of navigator.languages ?? [navigator.language]) {
    if (!tag) continue;
    const lower = tag.toLowerCase();
    if (lower.startsWith('zh')) return /hant|-tw|-hk|-mo/.test(lower) ? 'zh-Hant' : 'zh-Hans';
    const base = lower.split('-')[0];
    if (SUPPORTED.has(base)) return base;
  }
  return 'en';
}

export async function setLocale(code, { remember = false } = {}) {
  if (!SUPPORTED.has(code)) code = 'en';
  messages = code === 'en' ? en : (await loaders[`./locales/${code}.js`]()).default;
  if (code === 'zh-Hant' && !toHant) {
    const { Converter } = await import('opencc-js/cn2t');
    toHant = Converter({ from: 'cn', to: 'tw' });
  }
  const loadContent = contentLoaders[`../content/translations/${code}.js`];
  content = loadContent ? (await loadContent()).default : null;
  locale = code;
  document.documentElement.lang = code;
  contentListeners.forEach((fn) => fn(code, content));
  if (remember) {
    try {
      localStorage.setItem('glossa-locale', code);
    } catch {}
  }
}

export const getLocale = () => locale;
export const isCJK = () => /^(zh|ja|ko)/.test(locale);

export function t(key, ...args) {
  const m = messages[key] ?? en[key];
  if (m == null) return key;
  return typeof m === 'function' ? m(...args) : m;
}

// pick a hand-written content string for the current locale
export function tr(obj) {
  if (obj == null || typeof obj !== 'object') return obj;
  if (obj[locale]) return obj[locale];
  if (locale === 'zh-Hans' && obj.zh) return obj.zh;
  if (locale === 'zh-Hant' && obj.zh) return toHant(obj.zh);
  return obj.en ?? obj.zh;
}

export const hant = (s) => (toHant && locale === 'zh-Hant' ? toHant(s) : s);

export const fmt = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

const nf = new Map();
function numberFormat(opts) {
  const key = locale + JSON.stringify(opts);
  if (!nf.has(key)) nf.set(key, new Intl.NumberFormat(locale, opts));
  return nf.get(key);
}
export const formatNumber = (n) => numberFormat({}).format(n);
export const formatCount = (n) =>
  n == null ? null : n < 10000 ? formatNumber(n) : numberFormat({ notation: 'compact', maximumFractionDigits: n < 1e6 ? 0 : 1 }).format(n);
export const formatList = (items) => new Intl.ListFormat(locale, { style: 'short', type: 'conjunction' }).format(items);
