// Regenerate tools/stories-keys.json: every translatable {zh, en} text in the
// stories, by path, with its English, for check-translations.mjs.
import fs from 'node:fs';
import { STORIES } from './load-stories.mjs';
const out = {};
function walk(o, path) {
  if (Array.isArray(o)) return o.forEach((x, i) => walk(x, `${path}[${i}]`));
  if (!o || typeof o !== 'object') return;
  if ('en' in o && 'zh' in o) {
    out[path] = o.en;
    return;
  }
  for (const [k, v] of Object.entries(o)) walk(v, `${path}.${k}`);
}
for (const s of STORIES) walk(s, s.id);
fs.writeFileSync(new URL('./stories-keys.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
console.log(Object.keys(out).length, 'keys');
