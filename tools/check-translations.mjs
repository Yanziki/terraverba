// Every translation file covers every story string, keeps every {placeholder},
// has every relic's name, date, place and text, and an About page.
// Usage: node tools/check-translations.mjs [locale…]
import fs from 'node:fs';
import { RELICS } from '../src/content/relics.js';
const RELIC_FIELDS = ['name', 'when', 'place', 'hook'];
const en = JSON.parse(fs.readFileSync(process.argv[2]?.endsWith('.json') ? process.argv[2] : new URL('./stories-keys.json', import.meta.url), 'utf8'));
const locales = process.argv.slice(2).filter((a) => !a.endsWith('.json'));
let bad = 0;
for (const loc of locales.length ? locales : ['ja', 'ko', 'es', 'fr', 'de', 'pt', 'ru']) {
  const file = new URL(`../src/content/translations/${loc}.js`, import.meta.url);
  if (!fs.existsSync(file)) { console.log(loc, 'missing'); bad++; continue; }
  const { default: tr } = await import(file);
  const missing = Object.keys(en).filter((k) => !tr.stories?.[k]);
  const extra = Object.keys(tr.stories ?? {}).filter((k) => !(k in en));
  const holes = Object.keys(en).filter((k) => tr.stories?.[k] && (en[k].match(/\{\w+\}/g) ?? []).some((p) => !tr.stories[k].includes(p)));
  const relics = RELICS.flatMap((r) => RELIC_FIELDS.filter((f) => !tr.relics?.[r.id]?.[f]).map((f) => `${r.id}.${f}`));
  const ok = !missing.length && !extra.length && !holes.length && !relics.length && tr.about;
  if (!ok) bad++;
  console.log(loc, ok ? 'ok' : '', missing.length ? `missing ${missing}` : '', extra.length ? `extra ${extra}` : '', holes.length ? `placeholders ${holes}` : '', relics.length ? `relics ${relics}` : '', tr.about ? '' : 'no about');
}
process.exit(bad ? 1 : 0);
