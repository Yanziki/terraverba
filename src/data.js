// Loads the compact JSON built by data/build_data.py and indexes it.
import { countryName } from './countries.js';
import { cldrLanguageName } from './langnames.js';

const BASE = import.meta.env.BASE_URL;
const get = (path) => fetch(`${BASE}data/${path}`).then((r) => r.json());

function unpack({ fields, rows }) {
  return rows.map((r) => Object.fromEntries(fields.map((f, i) => [f, r[i]])));
}

export function toVec(lat, lon) {
  // matches the UV layout of THREE.SphereGeometry (u = 0 at lon -180)
  const φ = (lat * Math.PI) / 180;
  const λ = (lon * Math.PI) / 180;
  return [Math.cos(φ) * Math.cos(λ), Math.sin(φ), -Math.cos(φ) * Math.sin(λ)];
}

// the flat map is a plane facing +x: north is +y, east is −z, in radians
export function toFlat(lat, lon) {
  return [0, (lat * Math.PI) / 180, (-lon * Math.PI) / 180];
}

export function toLatLon([x, y, z]) {
  const r = Math.hypot(x, y, z);
  return [(Math.asin(y / r) * 180) / Math.PI, (Math.atan2(-z, x) * 180) / Math.PI];
}

export const angle = (a, b) => Math.acos(Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
export const EARTH_KM = 6371;

export async function loadData() {
  const [L, G, F] = await Promise.all([get('languages.json'), get('groups.json'), get('families.json')]);

  const languages = unpack(L);
  const groups = unpack(G);
  const byId = new Map();
  const children = new Map();
  const addChild = (parent, id) => {
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent).push(id);
  };

  for (const g of groups) {
    g.kind = 'group';
    g.langs = [];
    byId.set(g.id, g);
  }
  languages.forEach((l, i) => {
    l.kind = 'lang';
    l.idx = i;
    l.countries = l.countries ? l.countries.split(' ') : [];
    l.main = l.main ? l.main.split(' ') : [];
    l.macroarea = L.macroareas[l.macroarea] ?? null;
    l.v = toVec(l.lat, l.lon);
    l.f = toFlat(l.lat, l.lon);
    l.isolate = !l.family && l.category === 0;
    byId.set(l.id, l);
  });
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
  const topOf = (id) => ancestors(id)[0] ?? byId.get(id);

  const roots = (children.get('root') ?? []).map((id) => byId.get(id));
  const families = roots.filter((x) => x.kind === 'group' && !x.pseudo).sort((a, b) => b.n - a.n);
  const pseudo = roots.filter((x) => x.kind === 'group' && x.pseudo).sort((a, b) => b.n - a.n);
  const isolates = roots.filter((x) => x.kind === 'lang').sort((a, b) => (b.speakers ?? 0) - (a.speakers ?? 0));

  const data = { languages, groups, byId, children, ancestors, topOf, families, pseudo, isolates, palette: F, names: {}, wiki: {}, countryName: (a2) => a2 };

  // names, Wikipedia titles and country names for one interface language
  data.loadLocale = async (code) => {
    const [mine, en] = await Promise.all([get(`i18n/${code}.json`), code === 'en' ? null : get('i18n/en.json')]);
    data.names = mine.names;
    // CLDR fills names Wikidata lacks in this language (see langnames.js)
    for (const l of languages) {
      if (data.names[l.id]) continue;
      const n = cldrLanguageName(l.iso, l.en, code);
      if (n && n !== l.en) data.names[l.id] = n;
    }
    data.wiki = mine.wiki;
    data.wikiEn = (en ?? mine).wiki;
    // Wikidata's labels only fill in what CLDR lacks (see countries.js)
    const labels = { ...(en ?? mine).countries, ...mine.countries };
    data.countryName = (a2) => countryName(a2, code, labels[a2]);
  };

  // feature tables: curated questions, all of Grambank, PHOIBLE inventories
  const lazy = {};
  const indexed = (name) => (lazy[name] ??= get(name).then((x) => {
    x.index = new Map(x.langs.map((id, i) => [id, i]));
    return x;
  }));
  data.features = () => indexed('features.json');
  data.grambank = () => indexed('features-grambank.json');
  data.phoible = () => indexed('features-phoible.json');
  data.udhr = () => (lazy.udhr ??= get('udhr.json'));

  // similarity data is only fetched when first needed
  const sims = {};
  data.similarity = (kind) => {
    sims[kind] ??= get(`similarity-${kind}.json`).then((s) => {
      s.index = new Map(s.ids.map((id, i) => [id, i]));
      return s;
    });
    return sims[kind];
  };
  return data;
}
