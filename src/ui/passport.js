// "My languages": the reader picks the languages they speak, and the page
// shows what that connects them to — how many people, which families, the
// nearest relatives and a far-flung cousin, the scripts — and makes a
// passport of it: cover, data page and visa page (passport-card.js), with an
// optional name and photo. Everything stays in this browser (localStorage);
// a shared link carries only the languages (#/me/with/mand1415n.stan1293f).
import { t, getLocale, formatNumber, formatCount, formatList } from '../i18n/index.js';
import { esc } from './html.js';
import { familyColor } from '../palette.js';
import { angle, EARTH_KM } from '../data.js';
import { LOCALE_LANGS } from '../content/locale-langs.js';
import { drawCover, drawDataPage, drawVisaPage } from './passport-card.js';
import { cropPhoto } from './cropper.js';

const KEY = 'glossa-passport-2';
const OLD_KEY = 'glossa-passport';
// enough for any real polyglot; the cap only guards against runaway clicking
const MAX = 20;
const LEVELS = ['native', 'fluent', 'learning'];
const PAGES = ['cover', 'data', 'visa'];
// the English half of each card label, as on a real passport's bilingual fields
const EN = {
  name: 'Name', native: 'Native language', other: 'Other languages', issued: 'Date of issue', authority: 'Authority',
  reach: 'People reached', type: 'Type', code: 'Code', number: 'Passport No.', families: 'Families', scripts: 'Scripts',
  places: 'Countries & regions', visas: 'Visas', entry: 'Entry', transit: 'Transit',
  lv_native: 'Native', lv_fluent: 'Fluent', lv_learning: 'Learning',
};

export function createPassport(app) {
  const { data } = app;
  let sheetEl = null;
  // { ids, levels: { id: native|fluent|learning }, name, latin, photo, issued }
  let P = null;
  let page = 'cover';

  const today = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const load = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
      if (saved?.ids) return { levels: {}, name: '', latin: '', photo: null, issued: today(), ...saved, ids: saved.ids.filter((id) => data.byId.has(id)) };
      const old = JSON.parse(localStorage.getItem(OLD_KEY) ?? 'null');
      if (Array.isArray(old)) return fresh(old.filter((id) => data.byId.has(id)));
    } catch {}
    return fresh(guess());
  };
  // the first language is the native one until the reader says otherwise
  const fresh = (ids) => ({ ids, levels: Object.fromEntries(ids.map((id, i) => [id, i ? 'fluent' : 'native'])), name: '', latin: '', photo: null, issued: today() });
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(P));
    } catch {
      // a photo can overflow the browser's quota: keep the rest, and the photo for this visit
      try {
        localStorage.setItem(KEY, JSON.stringify({ ...P, photo: null }));
        app.toast?.(t('mePhotoNotSaved'));
      } catch {}
    }
  };
  const levelOf = (id) => P.levels[id] ?? 'fluent';
  // a first guess from the browser's languages: zh-HK → Cantonese, pt-BR → Portuguese…
  function guess() {
    const out = [];
    for (const tag of navigator.languages ?? [navigator.language]) {
      const id = LOCALE_LANGS[tag] ?? LOCALE_LANGS[tag.split('-')[0]];
      if (id && data.byId.has(id) && !out.includes(id)) out.push(id);
    }
    return out.slice(0, 4);
  }

  // ── what the chosen languages connect to ──────────────────
  const familyOf = (l) => (l.family ? data.byId.get(l.family) : null);
  const tongues = (ids) => ids.map((id) => data.byId.get(id)).filter(Boolean);

  // Glottolog files the English-based creoles and pidgins (Tok Pisin, Krio…)
  // under English, and likewise for Portuguese, French and Dutch: true to how
  // they formed, but not the relatives a reader has in mind. Within those four
  // groups, anything off the lexifier's own branch is passed over here.
  const HOSTS = new Set(['Macro-English', 'Macro-Portuguese', 'Macro-French', 'Macro-Dutch']);
  // Iberian-based creoles filed among the Romance languages themselves
  const CREOLES = new Set(['chav1241', 'papi1253', 'pale1260', 'fada1250', 'kabu1256', 'maca1262', 'prin1242', 'ango1258', 'uppe1455']);
  function contact(x) {
    if (CREOLES.has(x.id) || /pidgin|creole|patois/i.test(x.en)) return true;
    const chain = data.ancestors(x.id);
    const k = chain.findIndex((g) => HOSTS.has(g.en));
    if (k < 0) return false;
    const head = chain[k].langs.reduce((a, b) => ((b.speakers ?? 0) > (a.speakers ?? 0) ? b : a));
    if (head === x) return false;
    const headBranch = data.ancestors(head.id)[k + 1] ?? null;
    return !headBranch || chain[k + 1] !== headBranch;
  }

  // the nearest relatives: other languages under the same smallest group — for
  // a big language, ones of some size (Mandarin's are Jin and Wu, not Wutun)
  function relatives(l, n = 3) {
    const chain = data.ancestors(l.id);
    // (and if no relative is that big, any will do: Korean's is Jeju)
    for (const floor of (l.speakers ?? 0) >= 1e6 ? [1e5, 0] : [0]) {
      for (let k = chain.length - 1; k >= 0; k--) {
        const kin = chain[k].langs.filter((x) => x !== l && x.category === 0 && x.kind === 'lang' && !contact(x) && (x.speakers ?? 0) >= floor).sort((a, b) => (b.speakers ?? 0) - (a.speakers ?? 0));
        if (kin.length) return { group: chain[k], list: kin.slice(0, n) };
      }
    }
    return null;
  }

  // a far-flung cousin: the best-known member of the family that lives farthest away
  function cousin(l) {
    const fam = familyOf(l);
    if (!fam) return null;
    const known = fam.langs.filter((x) => x !== l && x.category === 0 && (x.speakers ?? 0) >= 1e6 && !contact(x));
    if (!known.length) return null;
    const far = known.reduce((a, b) => (angle(b.v, l.v) > angle(a.v, l.v) ? b : a));
    const km = angle(far.v, l.v) * EARTH_KM;
    return km > 800 ? { l: far, km } : null;
  }

  async function scriptsOf(langs) {
    const udhr = await data.udhr();
    const names = new Intl.DisplayNames([document.documentElement.lang || 'en'], { type: 'script' });
    const out = new Map();
    for (const l of langs) {
      const s = udhr[l.id]?.[1];
      if (!s) continue;
      // Hans and Hant are both Han; Japanese mixes kana in
      const code = s === 'Hans' || s === 'Hant' ? 'Hani' : s;
      let name = code;
      try {
        name = names.of(code);
      } catch {}
      out.set(code, name);
    }
    return [...out.values()];
  }

  function summary(langs) {
    const reach = langs.reduce((s, l) => s + (l.speakers ?? 0), 0);
    const fams = [...new Map(langs.map((l) => [l.family ?? l.id, l])).values()];
    const famNames = fams.map((l) => (l.family ? app.name(familyOf(l)) : t('isolate')));
    const famPeople = fams
      .filter((l) => l.family)
      .map((l) => [familyOf(l), familyOf(l).langs.reduce((s, x) => s + (x.speakers ?? 0), 0)]);
    return { reach, fams, famNames, famPeople };
  }

  // where the reader's languages are spoken today: countries and regions, counted once
  const placesOf = (langs) => new Set(langs.flatMap((l) => l.countries)).size;
  // a passport number from the languages, so the same set always gets the same one
  function number(ids) {
    let h = 2166136261;
    for (const ch of [...ids].sort().join('.')) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    const A = '0123456789ACDEFHJKLMNPRTUVWXY';
    let out = 'T';
    for (let i = 0; i < 8; i++) {
      h = Math.imul(h ^ (h >>> 13), 2654435761) >>> 0;
      out += A[h % A.length];
    }
    return out;
  }
  // the language's own name, unless the shown name already says it (官话（普通话） / 普通话)
  const ownName = (l) => (l.native && !app.name(l).toLowerCase().includes(l.native.toLowerCase()) ? l.native : null);
  // a name in Latin letters for the machine-readable zone: the name itself if it is
  // written so, else what the reader gave, else none
  function latinName() {
    const plain = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (P.latin.trim()) return plain(P.latin.trim());
    return /^[A-Za-z\s'’.-]+$/.test(plain(P.name.trim())) ? plain(P.name.trim()) : '';
  }

  // ── rendering ─────────────────────────────────────────────
  async function render() {
    const langs = tongues(P.ids);
    const s = summary(langs);
    const scripts = await scriptsOf(langs);
    const friend = friendOf();
    sheetEl.innerHTML = `
      <div class="sheet-head">
        <div class="kicker">${t('meKicker')}</div>
        <h2>${t('meTitle')}</h2>
        <p>${esc(t('meIntro'))}</p>
      </div>
      <div class="sheet-body passport">
        ${friend ? friendBanner(friend, langs) : ''}
        <div class="pp-holder">
          <button class="pp-photo" type="button" data-act="photo" aria-label="${esc(t('mePhoto'))}">${P.photo ? `<img src="${P.photo}" alt="">` : `<span>${t('mePhoto')}</span>`}</button>
          <div class="pp-fields">
            <label><span>${t('meName')}</span><input name="name" type="text" maxlength="40" value="${esc(P.name)}" placeholder="${esc(t('meNamePh'))}" autocomplete="name"></label>
            <label><span>${t('meLatin')}</span><input name="latin" type="text" maxlength="40" value="${esc(P.latin)}" placeholder="LI MING" autocomplete="off" spellcheck="false"></label>
            ${P.photo ? `<button class="linkish" type="button" data-act="unphoto">${t('mePhotoRemove')}</button>` : ''}
          </div>
          <input type="file" accept="image/*" hidden>
        </div>
        <p class="hint pp-privacy">${esc(t('mePrivacy'))}</p>
        <div class="pp-chosen">${langs.map((l) => `<span class="pp-chip"><i style="background:${familyColor(l)}"></i><a href="#/me?sel=${l.id}">${esc(app.name(l))}</a>
          <select data-level="${l.id}" aria-label="${esc(t('meLevel'))}">${LEVELS.map((v) => `<option value="${v}"${levelOf(l.id) === v ? ' selected' : ''}>${esc(t(`meLv_${v}`))}</option>`).join('')}</select>
          <button data-remove="${l.id}" aria-label="${esc(t('meRemove'))}">×</button></span>`).join('')}</div>
        <div class="pp-add"><input type="search" placeholder="${esc(P.ids.length >= MAX ? t('meFull', MAX) : t('meAdd'))}" autocomplete="off"${P.ids.length >= MAX ? ' disabled' : ''} /><ul class="pp-hits" hidden></ul></div>
        ${langs.length ? `
          <div class="pp-book">
            <div class="seg small pp-tabs">${PAGES.map((k) => `<button data-page="${k}" class="${page === k ? 'on' : ''}">${t(`mePage_${k}`)}</button>`).join('')}</div>
            <figure class="pp-card"><img alt="" hidden></figure>
            <div class="actions"><button class="btn" data-act="card">${t('meCard')}</button><button class="btn ghost" data-act="share">${t('meShare')}</button></div>
            <p class="hint pp-saved" hidden></p>
          </div>
          <div class="pp-reach">
            <div class="pp-big">${esc(formatCount(s.reach) ?? '—')}</div>
            <div>${esc(t('meReach'))}<br><span class="hint">${esc(t('meReachNote'))}</span></div>
          </div>
          <p class="pp-line">${esc(t('mePlaces', placesOf(langs)))}</p>
          <p class="pp-line">${esc(t('meFamilies', s.fams.length, formatList(s.famNames)))}</p>
          ${s.famPeople.map(([f, n]) => `<p class="pp-line pp-sub">${esc(t('meFamilyPeople', app.name(f), formatCount(n)))}</p>`).join('')}
          ${scripts.length ? `<p class="pp-line">${esc(t('meScripts', scripts.length, formatList(scripts)))}</p>` : ''}
          <ol class="pp-langs">${langs.map((l) => {
            const rel = relatives(l);
            const c = cousin(l);
            return `<li>
              <div class="pp-name"><i style="background:${familyColor(l)}"></i><a href="#/me?sel=${l.id}">${esc(app.name(l))}</a><span>${esc(l.family ? app.familyName(l) : t('isolate'))}</span></div>
              ${rel ? `<p>${esc(t('meRelatives', app.name(rel.group), formatList(rel.list.map((x) => app.name(x)))))}</p>` : `<p>${esc(t('meNoRelatives'))}</p>`}
              ${c ? `<p>${esc(t('meCousin', app.name(c.l), formatNumber(Math.round(c.km / 100) * 100)))}</p>` : ''}
            </li>`;
          }).join('')}</ol>`
        : `<p class="hint">${esc(t('meEmpty'))}</p>`}
      </div>`;
    bind(langs, s, scripts);
  }

  // ── a friend's passport, from a shared link ───────────────
  function friendOf() {
    if (app.route.arg !== 'with' || !app.route.arg2) return null;
    const list = app.route.arg2.split('.').map((code) => ({ id: code.slice(0, 8), level: { n: 'native', f: 'fluent', l: 'learning' }[code[8]] ?? 'fluent' })).filter((x) => data.byId.has(x.id));
    return list.length ? list : null;
  }
  function friendBanner(friend, mine) {
    const theirs = friend.map((x) => data.byId.get(x.id));
    const shared = theirs.filter((l) => mine.includes(l));
    const union = [...new Set([...theirs, ...mine])];
    const together = union.reduce((n, l) => n + (l.speakers ?? 0), 0);
    return `<div class="pp-friend">
      <div class="kicker">${t('meFriendTitle')}</div>
      <p class="pp-friend-langs">${theirs.map((l) => `<span><i style="background:${familyColor(l)}"></i>${esc(app.name(l))}</span>`).join('')}</p>
      <p>${esc(shared.length ? t('meFriendShared', formatList(shared.map((l) => app.name(l)))) : t('meFriendNone'))}</p>
      ${mine.length ? `<p>${esc(t('meFriendTogether', formatCount(together)))}</p>` : ''}
      <button class="linkish" type="button" data-act="unfriend">${t('meFriendClose')}</button>
    </div>`;
  }

  // what the three pages show (passport-card.js)
  function cardSpec(langs, s, scripts) {
    const L = (key) => [t(`meCd_${key}`), EN[key]];
    const keys = ['name', 'native', 'other', 'issued', 'authority', 'reach', 'type', 'code', 'number', 'families', 'scripts', 'places', 'visas', 'entry', 'transit'];
    const labels = Object.fromEntries(keys.map((k) => [k, L(k)]));
    const issued = new Date(`${P.issued}T12:00:00`);
    const intl = issued.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
    const local = issued.toLocaleDateString(getLocale(), { year: 'numeric', month: 'long', day: 'numeric' });
    const no = number(P.ids);
    const latin = latinName();
    const listOf = (lv) => langs.filter((l) => levelOf(l.id) === lv);
    const natives = listOf('native');
    const fluent = listOf('fluent');
    const learning = listOf('learning');
    const nameFor = (l) => app.name(l);
    // the machine-readable zone: a name, then the languages' codes, as many as fit
    let first = `P<TVB${latin ? latin.toUpperCase().replace(/[^A-Z]+/g, '<') : ''}<`;
    for (const l of langs) {
      const code = `<${(l.iso ?? l.id.slice(0, 3)).toUpperCase()}`;
      if (first.length + code.length > 44) break;
      first += code;
    }
    const second = `${no}<${P.issued.slice(2).replace(/-/g, '')}<${String(langs.length).padStart(2, '0')}L${String(s.fams.length).padStart(2, '0')}F${String(scripts.length).padStart(2, '0')}S`;
    const holder = P.name.trim() || t('meTraveller');
    return {
      labels,
      title: t('meKicker'),
      titleEn: 'Language passport',
      tagline: t('tagline'),
      ofName: t('meOfName', holder),
      coverLine: t('meCoverLine', langs.length, formatCount(s.reach) ?? '—'),
      holder: { name: holder, latin: latin || null, photo: P.photo },
      number: no,
      issued: getLocale() === 'en' ? intl : `${local} · ${intl}`,
      issuedShort: intl,
      url: location.host,
      langs: langs.map((l) => ({
        id: l.id, name: nameFor(l), native: ownName(l), family: l.family ? app.familyName(l) : t('isolate'), color: familyColor(l),
        level: levelOf(l.id), levelLabel: t(`meLv_${levelOf(l.id)}`), levelEn: EN[`lv_${levelOf(l.id)}`],
      })),
      natives: formatList(natives.map(nameFor)),
      others: formatList(fluent.map(nameFor)),
      learning: learning.length ? `${t('meLv_learning')} · ${formatList(learning.map(nameFor))}` : '',
      reach: formatCount(s.reach) ?? '—',
      reachLabel: t('meReach'),
      stats: [[s.fams.length, 'families'], [scripts.length, 'scripts'], [placesOf(langs), 'places']],
      mrz: [first, second],
      more: (n) => t('meMoreN', n),
    };
  }
  const DRAW = { cover: drawCover, data: drawDataPage, visa: drawVisaPage };

  function bind(langs, s, scripts) {
    const persist = () => {
      save();
      render();
    };
    sheetEl.querySelectorAll('[data-remove]').forEach((b) => (b.onclick = () => {
      P.ids = P.ids.filter((id) => id !== b.dataset.remove);
      delete P.levels[b.dataset.remove];
      persist();
    }));
    sheetEl.querySelectorAll('[data-level]').forEach((sel) => (sel.onchange = () => {
      P.levels[sel.dataset.level] = sel.value;
      persist();
    }));
    // the name fields save as they are typed, and redraw the card when left
    for (const name of ['name', 'latin']) {
      const input = sheetEl.querySelector(`.pp-fields input[name=${name}]`);
      input.oninput = () => {
        P[name] = input.value;
        save();
      };
      input.onchange = () => drawCard();
    }
    const file = sheetEl.querySelector('.pp-holder input[type=file]');
    sheetEl.querySelector('[data-act=photo]').onclick = () => file.click();
    file.onchange = async () => {
      const f = file.files?.[0];
      file.value = '';
      if (!f) return;
      const url = await cropPhoto(f);
      if (!url) return;
      P.photo = url;
      persist();
    };
    sheetEl.querySelector('[data-act=unphoto]')?.addEventListener('click', () => {
      P.photo = null;
      persist();
    });
    sheetEl.querySelector('[data-act=unfriend]')?.addEventListener('click', () => app.go({ view: 'me', arg: null, arg2: null }));

    const input = sheetEl.querySelector('.pp-add input');
    const hits = sheetEl.querySelector('.pp-hits');
    let found = [];
    const show = () => {
      const q = input.value.trim().toLowerCase();
      found = q ? search(q) : [];
      hits.hidden = !found.length;
      hits.innerHTML = found.map((l, i) => `<li><button data-i="${i}"><i style="background:${familyColor(l)}"></i>${esc(app.name(l))}<span>${esc(app.familyName(l))}</span></button></li>`).join('');
      hits.querySelectorAll('[data-i]').forEach((b) => (b.onclick = () => add(found[+b.dataset.i])));
    };
    const add = (l) => {
      if (!l || P.ids.includes(l.id) || P.ids.length >= MAX) return;
      P.ids = [...P.ids, l.id];
      P.levels[l.id] = P.ids.length === 1 ? 'native' : 'fluent';
      save();
      render().then(() => sheetEl.querySelector('.pp-add input')?.focus());
    };
    input.addEventListener('input', show);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') add(found[0]);
    });

    // the page shown, drawn on demand; the buttons save it or copy a link to the languages
    let card = null;
    const preview = sheetEl.querySelector('.pp-card img');
    function drawCard() {
      if (!preview) return;
      const shown = (card = DRAW[page](cardSpec(langs, s, scripts)));
      shown.then((blob) => {
        if (!blob || card !== shown || !preview.isConnected) return;
        if (preview.src) URL.revokeObjectURL(preview.src);
        preview.src = URL.createObjectURL(blob);
        preview.hidden = false;
      });
    }
    drawCard();
    sheetEl.querySelectorAll('[data-page]').forEach((b) => (b.onclick = () => {
      page = b.dataset.page;
      sheetEl.querySelectorAll('[data-page]').forEach((x) => x.classList.toggle('on', x === b));
      drawCard();
    }));
    const note = sheetEl.querySelector('.pp-saved');
    sheetEl.querySelector('[data-act=card]')?.addEventListener('click', async () => {
      const blob = await (card ?? DRAW[page](cardSpec(langs, s, scripts)));
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `terraverba-passport-${page}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      note.textContent = t('dailyCardSaved');
      note.hidden = false;
    });
    sheetEl.querySelector('[data-act=share]')?.addEventListener('click', async () => {
      const code = P.ids.map((id) => id + levelOf(id)[0]).join('.');
      const url = `${location.origin}${location.pathname}#/me/with/${code}`;
      try {
        await navigator.clipboard.writeText(url);
        note.textContent = t('meCopied');
      } catch {
        note.textContent = url;
      }
      note.hidden = false;
    });
  }

  // languages by name in the interface language, English, or their own
  function search(q) {
    const out = [];
    for (const l of data.languages) {
      if (l.category !== 0 || P.ids.includes(l.id)) continue;
      const names = [app.name(l), l.en, l.native].filter(Boolean).map((x) => x.toLowerCase());
      const rank = names.some((x) => x.startsWith(q)) ? 0 : names.some((x) => x.includes(q)) ? 1 : -1;
      if (rank >= 0) out.push([rank, -(l.speakers ?? 0), l]);
    }
    return out.sort((a, b) => a[0] - b[0] || a[1] - b[1]).slice(0, 7).map((x) => x[2]);
  }

  return {
    render(sheet) {
      sheetEl = sheet;
      P ??= load();
      render();
    },
  };
}
