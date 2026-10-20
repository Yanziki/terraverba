import { getLocale, tr } from '../i18n/index.js';
import { CONCEPT_NAMES } from '../content/words.js';

// a word-map word in the interface language: Chinese and English from the
// word index, the others from content/translations/<locale>.js
export const conceptName = (c) => (getLocale().startsWith('zh') ? tr({ zh: c.zh }) : CONCEPT_NAMES[getLocale()]?.[c.id] ?? c.en);
