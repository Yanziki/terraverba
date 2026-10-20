// A language name from Unicode CLDR (built into browsers and Node) for
// languages Wikidata has no label for in the interface language — Japanese
// has none for "Standard Indonesian", Korean none for "Northern Uzbek".
// CLDR folds some codes into an umbrella language (uzn → uz "Uzbek", but also
// mup Malvi → raj "Rajasthani"), so a folded name is used only when it is
// already part of the language's English name.
const plain = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const formats = new Map();
const display = (locale) => {
  if (!formats.has(locale)) {
    try {
      formats.set(locale, new Intl.DisplayNames([locale], { type: 'language', fallback: 'none' }));
    } catch {
      formats.set(locale, null);
    }
  }
  return formats.get(locale);
};

export function cldrLanguageName(iso, en, locale) {
  if (!iso || !display(locale)) return null;
  try {
    const [canonical] = Intl.getCanonicalLocales(iso);
    if (canonical !== iso) {
      const umbrella = display('en')?.of(canonical);
      if (!umbrella || !plain(en).includes(plain(umbrella))) return null;
    }
    let name = display(locale).of(iso);
    if (!name || name === iso) return null;
    // match the Wikidata names around it: capitalised outside CJK, "… язык" in Russian
    if (!/^(zh|ja|ko)/.test(locale)) name = name[0].toLocaleUpperCase(locale) + name.slice(1);
    if (locale === 'ru' && !/язык/.test(name)) name += ' язык';
    return name;
  } catch {
    return null;
  }
}
