const ENT = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ENT[c]);

export const icon = {
  close: '<svg viewBox="0 0 16 16"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9"/></svg>',
  back: '<svg viewBox="0 0 16 16"><path d="M10 3L5 8l5 5"/></svg>',
  arrow: '<svg viewBox="0 0 16 16"><path d="M3 8h10M9 4l4 4-4 4"/></svg>',
  flag: '<svg viewBox="0 0 16 16"><path d="M3.5 14V2.5M3.5 3h8l-1.6 2.8L11.5 8.5h-8"/></svg>',
  page: '<svg viewBox="0 0 16 16"><path d="M4 2.5h5.5L12 5v8.5H4zM9.5 2.5V5H12M6 8h4M6 10.5h4"/></svg>',
  globe: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.2"/><ellipse cx="8" cy="8" rx="2.6" ry="6.2"/><path d="M1.8 8h12.4"/></svg>',
  tree: '<svg viewBox="0 0 16 16"><path d="M3 3v10M3 6h5M3 11h5M8 6v-2h5M8 6v2h5M8 11h5"/></svg>',
  expand: '<svg viewBox="0 0 16 16"><path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"/></svg>',
  shrink: '<svg viewBox="0 0 16 16"><path d="M6 2.5V6H2.5M13.5 6H10V2.5M10 13.5V10h3.5M2.5 10H6v3.5"/></svg>',
  layers: '<svg viewBox="0 0 16 16"><path d="M8 2l6 3.2-6 3.2-6-3.2zM2 8.2l6 3.2 6-3.2M2 11l6 3.2 6-3.2"/></svg>',
  play: '<svg viewBox="0 0 16 16"><path class="fill" d="M5 3.4v9.2L12.4 8z"/></svg>',
  pause: '<svg viewBox="0 0 16 16"><path class="fill" d="M4.5 3.5h2.4v9H4.5zM9.1 3.5h2.4v9H9.1z"/></svg>',
  locate: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="4.2"/><circle cx="8" cy="8" r="1.2"/><path d="M8 1.5v2.3M8 12.2v2.3M1.5 8h2.3M12.2 8h2.3"/></svg>',
};

export const dot = (color, { hollow = false, diamond = false } = {}) =>
  `<span class="dot${hollow ? ' hollow' : ''}${diamond ? ' diamond' : ''}" style="background:${color};color:${color}"></span>`;

// hover anything with data-hover="<id>" to light that language or branch on the map
export function bindHover(root, app) {
  root.querySelectorAll('[data-hover]').forEach((el) => {
    el.addEventListener('mouseenter', () => {
      const x = app.data.byId.get(el.dataset.hover);
      if (!x) return;
      app.state.transient = { ids: new Set(x.kind === 'group' ? x.langs.map((l) => l.id) : [x.id]), strong: x.kind === 'lang' ? [x.id] : [] };
      app.refreshFocus();
    });
    el.addEventListener('mouseleave', () => {
      app.state.transient = null;
      app.refreshFocus();
    });
  });
}
