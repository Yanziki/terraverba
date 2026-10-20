// The stories, loaded in Node: content/stories.js imports the i18n and theme
// modules, which need Vite, so those two imports are stubbed out.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const src = fs.readFileSync(new URL('../src/content/stories.js', import.meta.url), 'utf8')
  .replace(/^import \{ onContent \} from .*$/m, 'const onContent = () => {};')
  .replace(/^import \{ THEME \} from .*$/m, 'const THEME = {};');
const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'stories-')), 'stories.mjs');
fs.writeFileSync(tmp, src);
export const { STORIES } = await import(tmp);
