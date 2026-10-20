// Chinese word forms carry both traditional and simplified spellings
// (data/words.py). Show the one the reader expects: simplified for zh-Hans,
// traditional for zh-Hant, and otherwise the script each variety is mostly
// written in — simplified for Mandarin and other mainland varieties,
// traditional for Cantonese, Hokkien and Hakka. (No i18n import: the static
// page builder uses this in Node.)

export const SIMPLIFIED_FIRST = new Set(['mand1415', 'wuch1236', 'xian1251', 'ganc1239', 'jiny1235', 'huiz1242']);

export function hanScript(gid, trad, simp, locale) {
  if (!simp) return trad;
  if (locale === 'zh-Hans') return simp;
  if (locale === 'zh-Hant') return trad;
  return SIMPLIFIED_FIRST.has(gid) ? simp : trad;
}

// a word file with every form (and group example) in the reader's script
export function localizeWords(w, locale) {
  const shown = new Map(w.forms.map((f) => [f[0], hanScript(f[0], f[1], f[5], locale)]));
  return {
    ...w,
    forms: w.forms.map((f) => [f[0], shown.get(f[0]), f[2], f[3], f[4]]),
    groups: w.groups.map((g) => ({ ...g, examples: g.examples.map(([gid, word]) => [gid, shown.get(gid) ?? word]) })),
  };
}
