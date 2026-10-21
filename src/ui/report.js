// "Report an error": a small dialog that turns what a reader knows about a
// language into a structured correction. Where it goes is set in config.js.
// Opened with { general: true } it takes a suggestion about the site itself.
import { REPORT } from '../config.js';
import { t, getLocale } from '../i18n/index.js';
import { esc, icon } from './html.js';

const KINDS = ['word', 'name', 'place', 'family', 'summary', 'other'];
// Turnstile names Chinese and Portuguese by region
const TURNSTILE_LANG = { 'zh-Hans': 'zh-cn', 'zh-Hant': 'zh-tw', pt: 'pt-br' };

export function createReport(app) {
  const { data } = app;
  const root = document.createElement('div');
  root.id = 'report';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  document.body.append(root);
  let ctx = null;

  const close = () => {
    root.classList.remove('on');
    root.innerHTML = '';
  };
  root.addEventListener('click', (e) => e.target === root && close());
  document.addEventListener('keydown', (e) => e.key === 'Escape' && root.classList.contains('on') && close());

  function payload(form) {
    const l = ctx.lang ? data.byId.get(ctx.lang) : null;
    return {
      kind: form.kind.value,
      general: !!ctx.general,
      language: l ? { id: l.id, name: l.en, shown: app.name(l) } : null,
      word: ctx.concept ? { concept: ctx.concept, shown: ctx.word ?? null } : null,
      fix: form.fix?.value.trim() ?? '',
      note: form.note.value.trim(),
      contact: form.contact.value.trim(),
      locale: getLocale(),
      page: location.href,
      when: new Date().toISOString(),
      turnstile: form.querySelector('[name="cf-turnstile-response"]')?.value ?? '',
    };
  }

  function asText(p) {
    return [
      `[Terraverba] ${p.kind}${p.language ? ` · ${p.language.name} (${p.language.id})` : ''}${p.word ? ` · “${p.word.concept}”` : ''}`,
      p.word?.shown ? `Shown: ${p.word.shown}` : null,
      `Should be: ${p.fix || '—'}`,
      p.note ? `Note: ${p.note}` : null,
      p.contact ? `Contact: ${p.contact}` : null,
      `Page: ${p.page}`,
      `Interface: ${p.locale}`,
    ].filter(Boolean).join('\n');
  }

  async function send(form) {
    const p = payload(form);
    const text = asText(p);
    const status = root.querySelector('.report-status');
    if (REPORT.endpoint) {
      const checked = REPORT.turnstileSiteKey && window.turnstile;
      if (checked && !p.turnstile) {
        status.textContent = t('reportVerify');
        return;
      }
      try {
        const r = await fetch(REPORT.endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(p) });
        if (!r.ok) throw new Error(r.status);
        root.querySelector('.report-body').innerHTML = `<p class="report-thanks">${t(ctx.general ? 'feedbackThanks' : 'reportThanks')}</p>`;
        return;
      } catch (e) {
        status.textContent = t(e.message === '403' ? 'reportVerify' : 'reportFailed');
        // a Turnstile token is good for one try
        if (checked) window.turnstile.reset(root.querySelector('.report-human'));
        return;
      }
    }
    if (REPORT.github) {
      const title = text.split('\n')[0];
      window.open(`https://github.com/${REPORT.github}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(text)}&labels=correction`, '_blank', 'noopener');
      return;
    }
    if (REPORT.email) {
      location.href = `mailto:${REPORT.email}?subject=${encodeURIComponent(text.split('\n')[0])}&body=${encodeURIComponent(text)}`;
      return;
    }
    await copy(text);
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      root.querySelector('.report-status').textContent = t('reportCopied');
    } catch {
      root.querySelector('.report-status').textContent = text;
    }
  }

  function open(context = {}) {
    ctx = context;
    const l = ctx.lang ? data.byId.get(ctx.lang) : null;
    const kind = ctx.concept ? 'word' : 'name';
    const sendable = REPORT.endpoint || REPORT.github || REPORT.email;
    root.innerHTML = `
      <form class="report-card">
        <button type="button" class="close" aria-label="${t('close')}">${icon.close}</button>
        <div class="kicker">${t(ctx.general ? 'feedbackLink' : 'reportLink')}</div>
        <h2>${t(ctx.general ? 'feedbackTitle' : 'reportTitle')}</h2>
        <p class="report-intro">${t(ctx.general ? 'feedbackIntro' : 'reportIntro')}</p>
        ${l || ctx.concept ? `<div class="report-about">${l ? `<span><b>${esc(app.name(l))}</b> <span class="mono">${l.id}</span></span>` : ''}${ctx.concept ? `<span>${esc(t('reportWordIs', ctx.conceptName ?? ctx.concept, ctx.word ?? '—'))}</span>` : ''}</div>` : ''}
        <div class="report-body">
          ${ctx.general
            ? `<input type="hidden" name="kind" value="suggestion">
          <label class="field"><span>${t('feedbackNote')}</span><textarea name="note" rows="6" required></textarea></label>`
            : `<label class="field"><span>${t('reportWhat')}</span>
            <select name="kind">${KINDS.map((k) => `<option value="${k}" ${k === kind ? 'selected' : ''}>${t('reportKinds')[k]}</option>`).join('')}</select></label>
          <label class="field"><span>${t('reportFix')}</span><input name="fix" required autocomplete="off"></label>
          <label class="field"><span>${t('reportNote')}</span><textarea name="note" rows="3"></textarea></label>`}
          <label class="field"><span>${t('reportContact')}</span><input name="contact" type="email" autocomplete="email"></label>
          ${REPORT.endpoint && REPORT.turnstileSiteKey ? '<div class="report-human"></div>' : ''}
          <div class="report-actions">
            <button class="btn" type="submit">${sendable ? t('reportSend') : t('reportCopy')}</button>
            ${sendable ? `<button class="btn ghost" type="button" data-act="copy">${t('reportCopy')}</button>` : ''}
          </div>
          <p class="hint report-status" aria-live="polite">${sendable ? '' : t('reportNotSet')}</p>
        </div>
      </form>`;
    root.classList.add('on');
    const form = root.querySelector('form');
    root.querySelector('.close').onclick = close;
    form.onsubmit = (e) => {
      e.preventDefault();
      send(form);
    };
    root.querySelector('[data-act=copy]')?.addEventListener('click', () => copy(asText(payload(form))));
    if (REPORT.endpoint && REPORT.turnstileSiteKey) human(root.querySelector('.report-human'));
    (form.fix ?? form.note).focus();
  }

  // Cloudflare Turnstile, loaded only when a site key is configured
  async function human(box) {
    if (!window.turnstile) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        s.onload = resolve;
        s.onerror = reject;
        document.head.append(s);
      }).catch(() => {});
    }
    window.turnstile?.render(box, {
      sitekey: REPORT.turnstileSiteKey,
      theme: document.documentElement.dataset.theme === 'atelier' ? 'light' : 'dark',
      language: TURNSTILE_LANG[getLocale()] ?? getLocale(),
    });
  }

  return { open, close };
}
