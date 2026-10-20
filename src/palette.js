// Family colours come from data/build_data.py: the largest families keep fixed
// pigments (checked pairwise for colour-blind separation) and smaller ones
// share muted hues assigned so that neighbours always differ. Identity never
// rests on colour alone: tooltips, panels and the key name every family.
import { THEME, lift } from './theme.js';

export let FAMILY = { named: [], colors: {}, isolate: '#2b2723', sign: '#6f7a83', other: '#bdb5a8' };

export function setPalette(p) {
  // data colours adjusted for the theme's ground (lighter on dark)
  FAMILY = {
    ...p,
    colors: Object.fromEntries(Object.entries(p.colors).map(([k, v]) => [k, lift(v)])),
    isolate: THEME.isolate ?? p.isolate,
    sign: lift(p.sign),
    other: lift(p.other),
  };
}

export function familyColor(lang) {
  if (lang.isolate) return FAMILY.isolate;
  if (lang.family === 'sign1238') return FAMILY.sign;
  return FAMILY.colors[lang.family] ?? FAMILY.other;
}

export function groupColor(topId) {
  if (topId === 'sign1238') return FAMILY.sign;
  return FAMILY.colors[topId] ?? FAMILY.other;
}

export const isNamed = (topId) => FAMILY.named.includes(topId);

// Agglomerated Endangerment Status (Glottolog) — an ordinal one-hue ramp;
// extinct languages are drawn hollow rather than as a seventh colour.
const AES_BASE = [
  { level: 0, color: '#bdb5a8' },
  { level: 1, color: '#e2b49a' },
  { level: 2, color: '#d58a68' },
  { level: 3, color: '#c0613f' },
  { level: 4, color: '#9c3f27' },
  { level: 5, color: '#6e2617' },
  { level: 6, color: '#2b2723' },
];
// extinct stays the darkest step on paper, the lightest on a dark ground
export const AES = AES_BASE.map((a) => ({ ...a, color: a.level === 6 && THEME.isolate ? THEME.isolate : lift(a.color) }));

export function statusColor(lang) {
  return AES[lang.aes]?.color ?? AES[0].color;
}

export const INK = THEME.lift ? '#e8edf2' : '#1d1b18';
// lines drawn on the globe (similar languages, the nearby ring) in the theme's accent
export const ACCENT = THEME.lift ? '#8fc3ff' : '#2c5677';
