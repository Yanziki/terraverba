// Writing systems (data/scripts.py → public/data/scripts.json): the scripts
// each language is written in, and the globe's "colour by script" mode, which
// groups them into a few families by the main script. Colours were checked
// for colour-blind separation on the dark globe; tooltips and the panel name
// the script itself, so identity never rests on colour alone.
import { lift } from './theme.js';

const BRAHMIC = 'Deva Beng Guru Gujr Orya Taml Telu Knda Mlym Sinh Tibt Mymr Thai Laoo Khmr Bali Java Sund Bugi Batk Lepc Limb Mtei Cham Tale Talu Lana Tavt Saur Sylo Modi Shrd Sidd Kthi Gran Newa Tirh Mahj Takr Dogr Khoj Sind Brah Rjng Tglg Hano Buhd Tagb Ahom Cakm Phag Kawi Nand Bhks Tutg Gonm Gong Soyo Zanb Marc Diak Kali Khar'.split(' ');
const EAST = 'Hani Hans Hant Jpan Kore Hang Hira Kana Bopo'.split(' ');

export const SCRIPT_GROUPS = [
  { key: 'latin', color: '#b8c6d4', test: (c) => c === 'Latn' },
  { key: 'cyrillic', color: '#2f6fd0', test: (c) => c === 'Cyrl' },
  { key: 'arabic', color: '#00a07a', test: (c) => c === 'Arab' },
  { key: 'brahmic', color: '#e6a817', test: (c) => BRAHMIC.includes(c) },
  { key: 'eastAsian', color: '#d0402f', test: (c) => EAST.includes(c) },
  { key: 'otherScript', color: '#a8559a', test: () => true },
].map((g) => ({ ...g, color: lift(g.color) }));
export const NO_SCRIPT = lift('#4d5660');

// "~Latn:KZ,CN" → { code: 'Latn', inferred: true, countries: ['KZ', 'CN'] }
export function parseScript(entry) {
  const inferred = entry.startsWith('~');
  const [code, where] = entry.replace(/^~/, '').split(':');
  return { code, inferred, countries: where ? where.split(',') : [] };
}

export const mainScript = (scripts, id) => {
  const first = scripts?.langs[id]?.[0];
  return first ? parseScript(first).code : null;
};

export const scriptGroup = (code) => (code ? SCRIPT_GROUPS.find((g) => g.test(code)) : null);
