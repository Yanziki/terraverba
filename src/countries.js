// Country and territory names from Unicode CLDR, which every browser (and Node)
// carries: the common short name in every language. The codes in SHORT take
// CLDR's short variant.
const SHORT = new Set(['HK', 'MO', 'PS', 'MM']);
const formats = new Map();

export function countryName(a2, locale, fallback) {
  if (!formats.has(locale)) {
    try {
      formats.set(locale, [new Intl.DisplayNames([locale], { type: 'region' }), new Intl.DisplayNames([locale], { type: 'region', style: 'short' })]);
    } catch {
      formats.set(locale, null);
    }
  }
  const f = formats.get(locale);
  let name = null;
  try {
    name = f && (SHORT.has(a2) ? f[1] : f[0]).of(a2);
  } catch {}
  return name && name !== a2 ? name : fallback ?? a2;
}
