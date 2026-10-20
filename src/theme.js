// Visual themes; Nocturne is the default. index.html puts data-theme on <html> before anything draws
// (from ?theme=… or the saved choice); CSS reads its tokens from that, and
// the globe, the dots and the family palette read their colours from here.
export const THEMES = {
  // the original paper-and-slate atlas
  classic: {
    ocean: '#33454d', land: '#e4dac6', coast: 'rgba(38, 50, 56, 0.55)', shallow: '214, 226, 226', shallowAlpha: 1,
    graticule: 'rgba(230, 236, 236, 0.10)', grain: 0.07, ring: '#f7f2e8',
    key: ['#fff6e8', 2.1], fill: ['#dfe8f0', 0.5], hemi: ['#fffaf0', '#8c8270', 0.65], exposure: 1.05,
  },
  // light: a porcelain globe in a gallery
  atelier: {
    ocean: '#c3cfd6', land: '#fdfcfa', coast: 'rgba(84, 101, 112, 0.42)', shallow: '255, 255, 255', shallowAlpha: 1.6,
    graticule: 'rgba(58, 76, 88, 0.09)', grain: 0, ring: '#ffffff',
    key: ['#ffffff', 2.0], fill: ['#e6edf2', 0.6], hemi: ['#ffffff', '#a0a7ab', 0.72], exposure: 1.0,
  },
  // dark: an observatory at night
  nocturne: {
    ocean: '#081016', land: '#2b3946', coast: 'rgba(176, 198, 216, 0.5)', shallow: '110, 146, 172', shallowAlpha: 1.1,
    graticule: 'rgba(170, 190, 210, 0.055)', grain: 0, ring: '#0b1016',
    key: ['#eef3ff', 1.7], fill: ['#6f8db3', 0.38], hemi: ['#d6e4ff', '#06080b', 0.5], exposure: 1.12,
    halo: 'rgba(150, 186, 226, 0.22)', lift: 0.16, isolate: '#d8d3ca', clearcoat: 0.06,
  },
};

function pick() {
  try {
    const asked = new URLSearchParams(location.search).get('theme');
    if (asked && THEMES[asked]) {
      localStorage.setItem('glossa-theme', asked);
      return asked;
    }
    const saved = localStorage.getItem('glossa-theme');
    if (saved && THEMES[saved]) return saved;
  } catch {}
  return 'nocturne';
}

export const THEME_NAME = THEMES[document.documentElement.dataset.theme] ? document.documentElement.dataset.theme : pick();
document.documentElement.dataset.theme = THEME_NAME;
export const THEME = THEMES[THEME_NAME];

// on a dark ground, data colours move toward white so they read as light
export function lift(hex) {
  if (!THEME.lift || typeof hex !== 'string' || !hex.startsWith('#')) return hex;
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(c + (255 - c) * THEME.lift));
  return `#${ch.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}
