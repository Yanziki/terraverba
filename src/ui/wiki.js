// Encyclopedia summaries. Asked live from Wikipedia in the interface language
// (zh in the right script via the variant parameter), then English, then the
// copy prefetched at build time for places where Wikipedia is unreachable.
import { getLocale, hant } from '../i18n/index.js';

const BASE = import.meta.env.BASE_URL;
const cache = new Map();
const WIKI = { en: 'en', 'zh-Hans': 'zh', 'zh-Hant': 'zh', ja: 'ja', ko: 'ko', es: 'es', fr: 'fr', de: 'de', pt: 'pt', ru: 'ru' };
const VARIANT = { 'zh-Hans': 'zh-cn', 'zh-Hant': 'zh-tw' };

async function live(wiki, title, variant) {
  const params = new URLSearchParams({
    action: 'query', prop: 'extracts', exintro: '1', explaintext: '1', redirects: '1',
    titles: title, format: 'json', formatversion: '2', origin: '*',
  });
  if (variant) params.set('variant', variant);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const r = await fetch(`https://${wiki}.wikipedia.org/w/api.php?${params}`, { signal: ctrl.signal });
    const page = (await r.json()).query?.pages?.[0];
    if (!page || page.missing || !page.extract?.trim()) return { missing: true };
    return { title: page.title, text: page.extract.trim(), wiki, url: `https://${wiki}.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}` };
  } catch {
    return { failed: true };
  } finally {
    clearTimeout(timer);
  }
}

// prefetched summaries live in 64 shards (see data/shard_wiki.py)
const shards = new Map();
async function prefetched(id) {
  const n = [...id].reduce((s, ch) => s + ch.charCodeAt(0), 0) % 64;
  if (!shards.has(n)) {
    shards.set(n, fetch(`${BASE}data/wiki/${String(n).padStart(2, '0')}.json`).then((r) => (r.ok ? r.json() : {})).catch(() => ({})));
  }
  return (await shards.get(n))[id] ?? null;
}

// → { text, title, url, wiki } | { none: true } | { failed: true }
export function summary(data, id) {
  const locale = getLocale();
  const key = `${locale}:${id}`;
  if (!cache.has(key)) cache.set(key, resolve(data, id, locale));
  return cache.get(key);
}

async function resolve(data, id, locale) {
  const zh = locale.startsWith('zh');
  let failed = false;
  const tryLive = async (wiki, title, variant) => {
    if (!title) return null;
    const got = await live(wiki, title, variant);
    if (got.failed) failed = true;
    return got.text ? got : null;
  };
  // the article in the interface language
  const own = await tryLive(WIKI[locale], data.wiki[id], VARIANT[locale]);
  if (own) return own;
  // for Chinese, the prefetched Chinese copy before any English: where zh.wikipedia
  // is out of reach, a Chinese reader should still read Chinese
  const pre = await prefetched(id);
  if (zh && pre?.zh) return { ...pre.zh, text: hant(pre.zh.text), wiki: 'zh' };
  // then English, live or prefetched
  if (locale !== 'en') {
    const en = await tryLive('en', data.wikiEn[id]);
    if (en) return en;
  }
  if (pre?.en) return { ...pre.en, wiki: 'en' };
  return (data.wiki[id] || data.wikiEn[id]) && failed ? { failed: true } : { none: true };
}
