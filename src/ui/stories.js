import { STORIES } from '../content/stories.js';
import { t, tr, fmt, formatNumber } from '../i18n/index.js';
import { esc, icon, dot } from './html.js';
import { angle, toVec, EARTH_KM } from '../data.js';
import { loadStoryAudio, play, stop, pageOf, creditOf } from '../audio.js';

// words not in the Latin script are set upright (no true italics for them)
const CJK = /[\u0370-\u03ff\u0400-\u04ff\u0590-\u08ff\u0900-\u0dff\u3000-\u9fff\uac00-\ud7af]/;
const IMG = `${import.meta.env.BASE_URL}img/people/`;

export function createStories(app) {
  const { data, globe } = app;
  let paint = null;
  const paintOf = (l) => paint?.get(l.id) ?? app.colorOf(l);

  const vars = () => {
    const L = data.languages;
    const area = (m) => L.filter((l) => l.macroarea === m).length;
    return {
      total: formatNumber(L.length),
      endangered: formatNumber(L.filter((l) => l.aes >= 2 && l.aes <= 5).length),
      extinct: formatNumber(L.filter((l) => l.aes === 6).length),
      isolates: formatNumber(data.isolates.length),
      africa: formatNumber(area('Africa')),
      americas: formatNumber(area('North America') + area('South America')),
    };
  };

  // which languages a chapter keeps lit
  function focusFor(f) {
    if (!f) return null;
    let langs = data.languages;
    if (f.ids || f.group || f.groups) {
      langs = [
        ...(f.ids ?? []).map((id) => data.byId.get(id)).filter(Boolean),
        ...[f.group, ...(f.groups ?? [])].filter(Boolean).flatMap((g) => data.byId.get(g)?.langs ?? []),
      ];
    }
    if (f.macroarea) langs = langs.filter((l) => [].concat(f.macroarea).includes(l.macroarea));
    if (f.near) {
      const v = toVec(f.near.lat, f.near.lon);
      langs = langs.filter((l) => angle(v, l.v) * EARTH_KM <= f.near.km);
    }
    if (f.family) langs = langs.filter((l) => l.family === f.family);
    if (f.isolates) langs = data.isolates;
    return new Set(langs.map((l) => l.id));
  }

  function renderList(sheet) {
    sheet.innerHTML = `
      <div class="sheet-head">
        <div class="kicker">${t('navStories')}</div>
        <h2>${t('storiesTitle')}</h2>
        <p>${t('storiesIntro')}</p>
      </div>
      <div class="sheet-body">
        ${STORIES.map((s, i) => `<a class="story-card" href="#/story/${s.id}/0">
          <div class="num">${String(i + 1).padStart(2, '0')} · ${esc(t('chapters', s.chapters.length))}</div>
          <h3>${esc(tr(s.title))}</h3>
          <div class="kick">${esc(tr(s.kicker))}</div>
          <p>${esc(tr(s.blurb))}</p>
          ${portraits(s)}</a>`).join('')}
      </div>`;
    app.state.story = null;
  }

  function portraits(s) {
    const faces = s.chapters.filter((ch) => ch.portrait);
    return faces.length ? `<div class="faces">${faces.map((ch) => `<img src="${IMG}${ch.portrait.src}" alt="" loading="lazy">`).join('')}</div>` : '';
  }

  function portrait(p) {
    if (!p) return '';
    const caption = esc(tr(p.caption));
    return `<figure class="portrait"><img src="${IMG}${p.src}" alt="${caption}" loading="lazy">
      <figcaption>${caption}<span>${esc(p.credit)} · <a href="${p.page}" target="_blank" rel="noopener">Wikimedia Commons</a></span></figcaption></figure>`;
  }

  // key: "story.chapter" — each word cell gets "key.row" or "key.row.column", for its recording
  function table(tb, key) {
    if (!tb) return '';
    const cell = (w, gloss, k) => `<td class="word${CJK.test(w) ? ' cjk' : ''}" data-audio="${k}"><span class="w">${esc(w)}</span>${gloss ? `<small class="gloss">${esc(tr(gloss))}</small>` : ''}</td>`;
    const langCell = (id) => {
      const l = data.byId.get(id);
      return l ? `<td class="lang" data-sel="${l.id}"><span>${dot(paintOf(l), { hollow: l.aes === 6 })}${esc(app.name(l))}</span></td>` : '<td></td>';
    };
    const caption = tb.caption ? `<caption>${esc(tr(tb.caption))}</caption>` : '';
    if (tb.columns) {
      const hasKey = tb.rows.some((r) => r[0]);
      return `<table class="words">${caption}
        <thead><tr>${hasKey ? '<th></th>' : ''}${tb.columns.map((id) => `<th>${esc(app.name(data.byId.get(id)))}</th>`).join('')}</tr></thead>
        <tbody>${tb.rows.map((r, i) => `<tr>${hasKey ? `<td class="key">${esc(tr(r[0]))}</td>` : ''}${r.slice(1).map((w, j) => cell(w, null, `${key}.${i}.${j}`)).join('')}</tr>`).join('')}</tbody></table>`;
    }
    return `<table class="words">${caption}<tbody>${tb.rows.map(([id, w, gloss], i) => `<tr>${langCell(id)}${cell(w, gloss, `${key}.${i}`)}</tr>`).join('')}</tbody></table>`;
  }

  function renderChapter(sheet, storyId, idx) {
    const story = STORIES.find((s) => s.id === storyId);
    if (!story) return renderList(sheet);
    const i = Math.max(0, Math.min(story.chapters.length - 1, idx || 0));
    const ch = story.chapters[i];
    const last = i === story.chapters.length - 1;
    paint = story.paint ? new Map(story.paint.flatMap((p) => p.ids.map((id) => [id, p.color]))) : null;
    sheet.innerHTML = `
      <div class="sheet-head">
        <a class="back" href="#/stories">${icon.back}${t('storiesTitle')}</a>
        <h2>${esc(tr(story.title))}</h2>
        <div class="progress">${story.chapters.map((_, k) => `<i class="${k <= i ? 'on' : ''}" data-k="${k}" title="${k + 1}"></i>`).join('')}</div>
      </div>
      <div class="sheet-body">
        <div class="chapter">
          <div class="kicker">${esc(t('chapterN', i + 1))}</div>
          <h3>${esc(tr(ch.title))}</h3>
          ${portrait(ch.portrait)}
          <div class="body"><p>${esc(fmt(tr(ch.body), vars()))}</p></div>
          ${table(ch.table, `${story.id}.${i}`)}
          ${ch.table ? '<div class="story-listen" hidden><button class="btn small ghost" data-act="all"></button><p class="hint story-credit"></p></div>' : ''}
          ${ch.source ? `<div class="source">${esc(tr(ch.source))}</div>` : ''}
        </div>
      </div>
      <div class="story-nav">
        ${i > 0 ? `<a class="btn ghost small" href="#/story/${story.id}/${i - 1}">${icon.back}${t('prev')}</a>` : '<span></span>'}
        ${last ? `<a class="btn small" href="#/">${t('exploreOn')}${icon.arrow}</a>` : `<a class="btn small" href="#/story/${story.id}/${i + 1}">${t('next')}${icon.arrow}</a>`}
      </div>`;
    sheet.querySelectorAll('.progress i').forEach((el) => (el.onclick = () => app.go({ view: 'story', arg: story.id, arg2: el.dataset.k, sel: null })));
    sheet.querySelectorAll('[data-sel]').forEach((el) => (el.onclick = () => app.select(el.dataset.sel)));

    if (ch.table) fillAudio(sheet);

    const mode = ch.colorMode ?? 'family';
    if (app.state.colorMode !== mode) app.setColorMode(mode);
    globe.setColors(paint ? paintOf : app.colorOf);
    app.state.story = { ids: focusFor(ch.focus), strong: ch.strong ?? [] };
    globe.setArcs(ch.arcs ?? []);
    if (ch.view) globe.flyTo(ch.view.lat, ch.view.lon, ch.view.dist, 2200);
  }

  // a play button beside each word that has a recording, and "listen to them all"
  let run = 0;
  async function fillAudio(sheet) {
    const my = ++run;
    stop();
    const audio = await loadStoryAudio();
    const box = sheet.querySelector('.story-listen');
    if (my !== run || !box) return;
    const cells = [...sheet.querySelectorAll('td[data-audio]')].filter((td) => audio[td.dataset.audio]);
    if (!cells.length) return;
    const credit = box.querySelector('.story-credit');
    const hear = async (td) => {
      const e = audio[td.dataset.audio];
      sheet.querySelectorAll('td.playing').forEach((x) => x.classList.remove('playing'));
      td.classList.add('playing');
      credit.innerHTML = `${esc(creditOf(e))}${e[4] && e[4] !== td.querySelector('.w').textContent ? ` · ${esc(e[4])}` : ''} · <a href="${pageOf(e)}" target="_blank" rel="noopener">Wikimedia Commons</a>`;
      const ok = await play(e);
      td.classList.remove('playing');
      return ok;
    };
    for (const td of cells) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'say';
      b.setAttribute('aria-label', t('listenPlay'));
      b.innerHTML = icon.play;
      b.onclick = () => {
        all = false;
        hear(td);
      };
      td.querySelector('.w').after(b);
    }
    let all = false;
    const btn = box.querySelector('[data-act=all]');
    const label = () => (btn.innerHTML = all ? `${icon.pause}${t('listenStop')}` : `${icon.play}${t('storyListenAll', cells.length)}`);
    btn.onclick = async () => {
      if (all) {
        all = false;
        stop();
        label();
        return;
      }
      all = true;
      label();
      for (const td of cells) {
        if (!all || my !== run) break;
        await hear(td);
        await new Promise((r) => setTimeout(r, 380));
      }
      all = false;
      if (my === run) label();
    };
    if (cells.length > 2) label();
    else btn.hidden = true;
    box.hidden = false;
  }

  // arrow keys page through a story
  window.addEventListener('keydown', (e) => {
    if (app.route.view !== 'story' || document.activeElement?.tagName === 'INPUT') return;
    const story = STORIES.find((s) => s.id === app.route.arg);
    if (!story) return;
    const i = +(app.route.arg2 ?? 0);
    if (e.key === 'ArrowRight' && i < story.chapters.length - 1) app.go({ arg2: String(i + 1), sel: null });
    if (e.key === 'ArrowLeft' && i > 0) app.go({ arg2: String(i - 1), sel: null });
  });

  return {
    renderList,
    renderChapter,
    leave() {
      run++;
      stop();
    },
  };
}
