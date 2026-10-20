// One view per question type: the prompt, the body (before and after
// answering), the interaction, and the explanation shown afterwards.
// Interactive views keep their in-progress state in `live` and call
// `finish(result)` once; result.base is 0–100 before the speed bonus.
import { FEATURES } from '../../content/features.js';
import { ETYMOLOGY } from '../../content/etymology.js';
import { conceptName } from '../concepts.js';
import { play, stop, pageOf, creditOf } from '../../audio.js';
import { t, tr, getLocale, formatNumber, formatCount, formatList } from '../../i18n/index.js';
import { esc, icon } from '../html.js';

export const TYPE_KEYS = {
  reveal: 'qReveal', where: 'qWhere', script: 'qScript', match: 'qMatch', sort: 'qSort', relative: 'qRelative',
  odd: 'qOdd', tree: 'qTree', lightning: 'qLightning', numbers: 'qNumbers', etym: 'qEtym', listen: 'qListen',
};

// answering within `par` seconds keeps every point; slower answers fade to 80% at three times that
export const withSpeed = (base, seconds, par = 10) => Math.round(base * (1 - 0.2 * Math.min(1, Math.max(0, (seconds - par) / (2 * par)))));

export function createViews(app) {
  const { data } = app;
  const name = (id) => app.name(data.byId.get(id));
  const fam = (id) => app.familyName(data.byId.get(id));
  const scriptName = (code) => {
    try {
      // "Simplified" alone reads oddly as the name of a script
      return new Intl.DisplayNames([getLocale()], { type: 'script' }).of(code === 'Hans' ? 'Hani' : code);
    } catch {
      return code;
    }
  };
  const feature = (id) => FEATURES.find((f) => f.id === id);
  const conceptLabel = conceptName;
  const etymItem = (q) => ETYMOLOGY[q.item];
  // the word in the reader's language, when it isn't the English word itself
  const gloss = (item) => {
    const g = getLocale().startsWith('zh') ? tr({ zh: item.word.zh }) : item.word[getLocale()];
    return g && g.toLowerCase() !== item.word.en ? g : '';
  };

  // a column of choice buttons, marked once answered
  function choices(q, a, label = name, cls = '') {
    return `<div class="daily-choices ${cls}">${q.choices.map((id) => `<button class="choice${a ? (id === q.answer ? ' right' : id === a.pick ? ' wrong' : '') : ''}" data-id="${id}" ${a ? 'disabled' : ''}>${label(id)}</button>`).join('')}</div>`;
  }
  const bindChoices = (el, q, finish) => el.querySelectorAll('.choice[data-id]').forEach((b) => (b.onclick = () => finish({ pick: b.dataset.id, base: b.dataset.id === q.answer ? 100 : 0 })));

  const V = {
    reveal: {
      title: () => t('dailyScript'),
      hint: () => t('revealHint'),
      body(q, a, live) {
        const shown = a ? q.chunks.length : (live.shown ??= 1);
        const parts = q.chunks.map((c, i) => `<span class="${i < shown ? 'on' : ''}">${esc(c)} </span>`).join('');
        const more = !a && shown < q.chunks.length ? `<button class="btn small ghost reveal-more" data-act="more">${t('revealMore')}</button>` : '';
        return `<blockquote class="udhr reveal" dir="${q.dir === 'rtl' ? 'rtl' : 'ltr'}">${parts}</blockquote>${more}${choices(q, a)}`;
      },
      bind(el, q, live, finish, redraw) {
        el.querySelector('[data-act=more]')?.addEventListener('click', () => {
          live.shown = Math.min(q.chunks.length, (live.shown ?? 1) + 1);
          redraw();
        });
        el.querySelectorAll('.choice').forEach((b) => (b.onclick = () => {
          const right = b.dataset.id === q.answer;
          finish({ pick: b.dataset.id, shown: live.shown ?? 1, right, base: right ? [100, 80, 62, 48][(live.shown ?? 1) - 1] : 0 });
        }));
      },
      explain: (q) => t('dailyScriptResult', name(q.answer), fam(q.answer)),
      focus: (q) => ({ ids: q.choices, fly: q.answer }),
    },

    where: {
      title: (q) => t('dailyWhere', name(q.answer)),
      hint: (q) => `${t('whereHint2', formatNumber(q.full))}${data.byId.get(q.answer).main.length ? ` ${t('whereHintMain')}` : ''}`,
      body: () => '',
      explain(q, a) {
        const l = data.byId.get(q.answer);
        const km = formatNumber(Math.round(a.km));
        const said = a.km < 1 && a.place ? t('whereInside', data.countryName(a.place), name(q.answer))
          : a.place ? t('whereNear', km, data.countryName(a.place))
          : t('dailyWhereResult', km, name(q.answer));
        const main = l.main.slice(0, 5).map((a2) => data.countryName(a2));
        return main.length > 1 ? `${said} ${t('whereMain', name(q.answer), formatList(main), l.main.length > 5)}` : said;
      },
    },

    script: {
      title: () => t('scriptPrompt'),
      body: (q, a) => `<div class="script-sample" dir="${q.dir === 'rtl' ? 'rtl' : 'ltr'}">${esc(q.text)}</div>${choices(q, a, scriptName, 'two')}`,
      bind: (el, q, live, finish) => bindChoices(el, q, finish),
      explain: (q) => t('resultScript', scriptName(q.answer), name(q.lang)),
      focus: (q) => ({ ids: [q.lang], fly: q.lang }),
    },

    match: {
      title: (q) => t('matchPrompt', conceptLabel(q.conceptName)),
      hint: () => t('matchHint'),
      body(q, a, live) {
        live.done ??= new Set();
        const done = a ? new Set(q.langs) : live.done;
        const left = q.langs.map((id) => `<button class="pair-l${done.has(id) ? ' done' : ''}${live.sel === `l:${id}` ? ' sel' : ''}" data-l="${id}" ${done.has(id) ? 'disabled' : ''}>${esc(name(id))}</button>`).join('');
        const rightOrder = a ? q.langs : q.order;
        const right = rightOrder.map((id) => {
          const [w, r] = q.words[id];
          return `<button class="pair-r${done.has(id) ? ' done' : ''}${live.sel === `r:${id}` ? ' sel' : ''}" data-r="${id}" ${done.has(id) ? 'disabled' : ''}><span class="w">${esc(w)}</span>${r ? `<span class="r">${esc(r)}</span>` : ''}</button>`;
        }).join('');
        return `<div class="pairs"><div class="col">${left}</div><div class="col">${right}</div></div>${!a && live.mistakes ? `<p class="hint">${t('matchMistakes', live.mistakes)}</p>` : ''}`;
      },
      bind(el, q, live, finish, redraw) {
        live.mistakes ??= 0;
        const tap = (side, id, btn) => {
          if (!live.sel || live.sel.startsWith(side)) {
            live.sel = `${side}:${id}`;
            return redraw();
          }
          const other = live.sel.slice(2);
          live.sel = null;
          if (other === id) {
            live.done.add(id);
            if (live.done.size === q.langs.length) return finish({ mistakes: live.mistakes, base: Math.max(0, 100 - 25 * live.mistakes) });
            return redraw();
          }
          live.mistakes++;
          btn.classList.add('nope');
          setTimeout(redraw, 380);
        };
        el.querySelectorAll('[data-l]').forEach((b) => (b.onclick = () => tap('l', b.dataset.l, b)));
        el.querySelectorAll('[data-r]').forEach((b) => (b.onclick = () => tap('r', b.dataset.r, b)));
      },
      explain: (q, a) => t('resultMatch', a.mistakes),
      focus: (q) => ({ ids: q.langs, frame: q.langs }),
    },

    sort: {
      title: (q) => t(q.by === 'speakers' ? 'sortSpeakers' : 'sortWestEast'),
      body(q, a, live) {
        live.seq ??= [];
        const seq = a ? a.seq : live.seq;
        const info = (id) => {
          const l = data.byId.get(id);
          return q.by === 'speakers' ? formatCount(l.speakers) : `${Math.abs(l.lon).toFixed(0)}°${l.lon >= 0 ? 'E' : 'W'}`;
        };
        const cards = q.choices.map((id) => {
          const k = seq.indexOf(id);
          const ok = a && q.answer.indexOf(id) === k;
          return `<button class="sort-card${k >= 0 ? ' picked' : ''}${a ? (ok ? ' right' : ' wrong') : ''}" data-id="${id}" ${a || k >= 0 ? 'disabled' : ''}>
            <span class="k">${k >= 0 ? k + 1 : ''}</span><span class="n">${esc(name(id))}</span>${a ? `<span class="v">${esc(info(id))}</span>` : ''}</button>`;
        }).join('');
        const undo = !a && seq.length ? `<button class="btn small ghost" data-act="undo">${t('sortUndo')}</button>` : '';
        return `<div class="sort-cards">${cards}</div>${undo}${a ? `<p class="hint">${t('resultSort', q.answer.map((id) => name(id)).join(' → '))}</p>` : ''}`;
      },
      bind(el, q, live, finish, redraw) {
        el.querySelector('[data-act=undo]')?.addEventListener('click', () => {
          live.seq.pop();
          redraw();
        });
        el.querySelectorAll('.sort-card').forEach((b) => (b.onclick = () => {
          live.seq.push(b.dataset.id);
          if (live.seq.length < q.choices.length) return redraw();
          // pairs in the wrong order (Kendall distance)
          let wrong = 0;
          for (let i = 0; i < live.seq.length; i++) for (let j = i + 1; j < live.seq.length; j++) if (q.answer.indexOf(live.seq[i]) > q.answer.indexOf(live.seq[j])) wrong++;
          // each pair out of order costs a share of the points (a quarter with four cards)
          finish({ seq: [...live.seq], wrong, base: Math.max(0, Math.round(100 - (100 * wrong) / q.choices.length)) });
        }));
      },
      explain: (q, a) => t('resultSortScore', a.wrong),
      focus: (q) => ({ ids: q.choices, frame: q.choices }),
    },

    relative: {
      title: (q) => t('dailyRelative', name(q.target)),
      body: (q, a) => choices(q, a, (id) => `${esc(name(id))}${a ? `<span class="sub">${esc(fam(id))}</span>` : ''}`),
      bind: (el, q, live, finish) => bindChoices(el, q, finish),
      explain: (q) => t('dailyRelativeResult', name(q.target), name(q.answer), app.name(data.byId.get(q.group))),
      focus: (q) => ({ ids: [q.target, ...q.choices], frame: [q.target, q.answer] }),
    },

    odd: {
      title: () => t('oddPrompt'),
      body: (q, a) => choices(q, a, (id) => `${esc(name(id))}${a ? `<span class="sub">${esc(fam(id))}</span>` : ''}`, 'two'),
      bind: (el, q, live, finish) => bindChoices(el, q, finish),
      explain: (q) => t('resultOdd', name(q.answer), app.name(data.byId.get(q.family))),
      focus: (q) => ({ ids: q.choices, frame: q.choices }),
    },

    tree: {
      title: (q) => t('treePrompt', name(q.target), app.name(data.byId.get(q.root))),
      body(q, a) {
        const branch = (id) => {
          const ex = q.examples[id].length ? formatList(q.examples[id].map(name)) : '';
          return `<button class="branch${a ? (id === q.answer ? ' right' : id === a.pick ? ' wrong' : '') : ''}" data-id="${id}" ${a ? 'disabled' : ''}>
            <span class="b">${esc(app.name(data.byId.get(id)))}</span>${ex ? `<span class="ex">${esc(t('treeExamples', ex))}</span>` : ''}</button>`;
        };
        return `<div class="mini-tree"><div class="root">${esc(app.name(data.byId.get(q.root)))}</div><div class="branches">${q.choices.map(branch).join('')}</div></div>`;
      },
      bind: (el, q, live, finish) => el.querySelectorAll('.branch').forEach((b) => (b.onclick = () => finish({ pick: b.dataset.id, base: b.dataset.id === q.answer ? 100 : 0 }))),
      explain: (q) => t('resultTree', name(q.target), app.name(data.byId.get(q.answer))),
      focus: (q) => ({ ids: [q.target], fly: q.target }),
    },

    lightning: {
      title: () => t('lightningPrompt', formatNumber(6)),
      body(q, a, live) {
        const says = (it) => `<b>${esc(name(it.lang))}</b> · ${esc(tr(feature(it.feature).title))}`;
        if (a) {
          return `<ol class="flash-review">${q.items.map((it, i) => {
            const ok = a.picks[i] === it.yes;
            return `<li class="${ok ? 'ok' : 'bad'}"><span class="mk">${ok ? '✓' : '✗'}</span><span>${says(it)}</span><span class="ans">${it.yes ? t('dailyYes') : t('dailyNo')}</span></li>`;
          }).join('')}</ol>`;
        }
        if (!live.started) return `<p class="hint">${t('lightningHint', formatNumber(q.seconds))}</p><button class="btn" data-act="clock">${t('lightningStart')}</button>`;
        const it = q.items[live.i];
        return `<div class="flash"><div class="flash-top"><span>${live.i + 1} / ${q.items.length}</span><span class="clock">${Math.ceil(live.left)}″</span></div>
          <div class="flash-bar"><i style="width:${(100 * live.left) / q.seconds}%"></i></div>
          <div class="flash-q">${says(it)}</div>
          <div class="flash-a"><button class="btn" data-yes="1">${t('dailyYes')}</button><button class="btn ghost" data-yes="0">${t('dailyNo')}</button></div></div>`;
      },
      bind(el, q, live, finish, redraw) {
        const end = () => {
          clearInterval(live.timer);
          live.timer = null;
          const picks = q.items.map((_, i) => live.picks[i] ?? null);
          const hits = picks.filter((p, i) => p === q.items[i].yes).length;
          finish({ picks, hits, base: Math.round((100 * hits) / q.items.length), timed: true });
        };
        el.querySelector('[data-act=clock]')?.addEventListener('click', () => {
          Object.assign(live, { started: true, i: 0, picks: [], left: q.seconds, t0: performance.now() });
          live.timer = setInterval(() => {
            live.left = q.seconds - (performance.now() - live.t0) / 1000;
            if (live.left <= 0) return end();
            const bar = el.querySelector('.flash-bar i');
            if (bar) bar.style.width = `${(100 * live.left) / q.seconds}%`;
            const clock = el.querySelector('.clock');
            if (clock) clock.textContent = `${Math.ceil(live.left)}″`;
          }, 100);
          redraw();
        });
        el.querySelectorAll('[data-yes]').forEach((b) => (b.onclick = () => {
          live.picks[live.i] = b.dataset.yes === '1';
          live.i++;
          if (live.i >= q.items.length) return end();
          redraw();
        }));
      },
      explain: (q, a) => t('resultLightning', a.hits, q.items.length),
      focus: (q) => ({ ids: q.items.map((it) => it.lang), frame: q.items.map((it) => it.lang) }),
      stop: (live) => live.timer && clearInterval(live.timer),
    },

    numbers: {
      title: () => t('numbersPrompt'),
      body: (q, a) => `<ol class="numerals">${q.words.map(([w, r], i) => `<li><span class="i">${i + 1}</span><span class="w">${esc(w)}</span>${r ? `<span class="r">${esc(r)}</span>` : ''}</li>`).join('')}</ol>${choices(q, a)}`,
      bind: (el, q, live, finish) => bindChoices(el, q, finish),
      explain: (q) => t('resultNumbers', name(q.answer)),
      focus: (q) => ({ ids: q.choices, fly: q.answer }),
    },

    listen: {
      title: () => t('listenPrompt'),
      hint: () => t('listenHint'),
      body(q, a, live) {
        const words = a
          ? `<ol class="listen-words">${q.clips.map((x) => `<li><b>${esc(x.entry[4] ?? '')}</b>${x.concept ? `<span>${esc(conceptName(x.concept))}</span>` : ''}<small>${esc(creditOf(x.entry))} · <a href="${pageOf(x.entry)}" target="_blank" rel="noopener">Commons</a></small></li>`).join('')}</ol>`
          : '';
        return `<div class="listen-q"><button class="btn${live.playing ? ' on' : ''}" data-act="hear">${icon.play}${t(live.heard ? 'listenAgain' : 'listenPlay')}</button>
          <span class="listen-now">${live.now ? esc(t('listenWordOf', live.now, q.clips.length)) : ''}</span></div>${words}${choices(q, a)}`;
      },
      bind(el, q, live, finish) {
        const button = el.querySelector('[data-act=hear]');
        const now = el.querySelector('.listen-now');
        button.onclick = async () => {
          if (live.playing) return;
          live.playing = true;
          button.classList.add('on');
          for (const [i, x] of q.clips.entries()) {
            if (!live.playing) break;
            live.now = i + 1;
            now.textContent = t('listenWordOf', i + 1, q.clips.length);
            await play(x.entry);
            await new Promise((r) => setTimeout(r, 450));
          }
          live.playing = false;
          live.heard = true;
          live.now = 0;
          button.classList.remove('on');
          button.innerHTML = `${icon.play}${t('listenAgain')}`;
          now.textContent = '';
        };
        bindChoices(el, q, (res) => {
          live.playing = false;
          live.now = 0;
          stop();
          finish(res);
        });
      },
      explain: (q) => t('resultListen', name(q.answer), formatList(q.clips.map((x) => x.entry[4]).filter(Boolean))),
      focus: (q) => ({ ids: q.choices, fly: q.answer }),
      stop: (live) => {
        live.playing = false;
        stop();
      },
    },

    etym: {
      title: () => t('etymPrompt'),
      body: (q, a) => `<div class="etym-word">${esc(etymItem(q).word.en)}</div>${gloss(etymItem(q)) ? `<div class="etym-gloss">${esc(gloss(etymItem(q)))}</div>` : ''}${choices(q, a, name, 'two')}`,
      bind: (el, q, live, finish) => bindChoices(el, q, finish),
      explain: (q) => tr(etymItem(q).story),
      focus: (q) => ({ ids: [q.answer], fly: q.answer }),
    },
  };
  return V;
}
