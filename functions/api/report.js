// POST /api/report — a correction from the "report an error" dialog
// (src/ui/report.js), on Cloudflare Pages Functions.
//
// Bindings (wrangler.toml / Pages settings):
//   DB               D1 database with the `reports` table (functions/schema.sql)
//   TURNSTILE_SECRET optional: Cloudflare Turnstile secret, checks the visitor is human
//   GITHUB_TOKEN     optional: fine-grained token with Issues: write on GITHUB_REPO
//   GITHUB_REPO      optional: "owner/repo"; each report also becomes an issue there
//   MAIL             optional: service binding to workers/mail, which emails each report to the owner
//
// The reader's email and IP stay in the database; the public issue never shows them.

// "suggestion" comes from the general feedback dialog: about the site, not a language
const KINDS = new Set(['word', 'name', 'place', 'family', 'summary', 'other', 'suggestion']);
const LIMIT_PER_HOUR = 20;

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

async function sha256(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost({ request, env, waitUntil }) {
  let p;
  try {
    p = await request.json();
  } catch {
    return json({ error: 'bad json' }, 400);
  }
  const report = {
    kind: KINDS.has(p.kind) ? p.kind : 'other',
    languageId: text(p.language?.id, 16),
    languageName: text(p.language?.name, 120),
    concept: text(p.word?.concept, 40),
    shown: text(p.word?.shown, 200),
    fix: text(p.fix, 500),
    note: text(p.note, 2000),
    contact: text(p.contact, 200),
    locale: text(p.locale, 12),
    page: text(p.page, 500),
  };
  if (!report.fix && !report.note) return json({ error: 'empty' }, 400);

  const ip = request.headers.get('cf-connecting-ip') ?? '';
  if (env.TURNSTILE_SECRET) {
    const form = new FormData();
    form.append('secret', env.TURNSTILE_SECRET);
    form.append('response', text(p.turnstile, 4096));
    form.append('remoteip', ip);
    const check = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form }).then((r) => r.json());
    if (!check.success) return json({ error: 'not verified' }, 403);
  }

  // a salted hash is enough to slow down one sender without keeping their address
  const who = await sha256(`${env.IP_SALT ?? 'terraverba'}:${ip}`);
  const recent = await env.DB.prepare("SELECT COUNT(*) AS n FROM reports WHERE who = ?1 AND created > datetime('now', '-1 hour')").bind(who).first();
  if ((recent?.n ?? 0) >= LIMIT_PER_HOUR) return json({ error: 'too many' }, 429);

  const row = await env.DB.prepare(
    `INSERT INTO reports (kind, language_id, language_name, concept, shown, fix, note, contact, locale, page, who)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11) RETURNING id`,
  ).bind(report.kind, report.languageId, report.languageName, report.concept, report.shown, report.fix, report.note, report.contact, report.locale, report.page, who).first();

  // the owner hears of it by email; the answer to the reader does not wait for that
  if (env.MAIL) waitUntil(env.MAIL.fetch('https://mail/', { method: 'POST', body: JSON.stringify(mailOf(report, row.id)) }).catch(() => {}));

  if (env.GITHUB_TOKEN && env.GITHUB_REPO) {
    try {
      const issue = await openIssue(env, report, row.id);
      await env.DB.prepare('UPDATE reports SET issue = ?1 WHERE id = ?2').bind(issue, row.id).run();
    } catch {
      // the report is saved either way; the issue can be opened later from the table
    }
  }
  return json({ ok: true, id: row.id });
}

function mailOf(r, id) {
  const about = [r.languageName && `${r.languageName} (${r.languageId})`, r.concept && `“${r.concept}”`].filter(Boolean).join(' · ');
  const text = [
    `Kind: ${r.kind}`,
    r.languageId ? `Language: ${r.languageName} — https://glottolog.org/resource/languoid/id/${r.languageId}` : null,
    r.concept ? `Word: “${r.concept}”, shown as ${r.shown || '—'}` : null,
    `Should be: ${r.fix || '—'}`,
    r.note ? `Note: ${r.note}` : null,
    r.contact ? `Contact: ${r.contact}` : null,
    `Page: ${r.page}`,
    `Interface: ${r.locale}`,
    '',
    `Report #${id}, kept in the D1 database "terraverba" (table reports).`,
  ].filter((x) => x != null).join('\n');
  return { subject: `[Terraverba] ${r.kind}${about ? ` · ${about}` : ''}`, text, replyTo: r.contact };
}

async function openIssue(env, r, id) {
  const subject = [r.languageName && `${r.languageName} (${r.languageId})`, r.concept && `“${r.concept}”`].filter(Boolean).join(' · ');
  const body = [
    `**Kind:** ${r.kind}`,
    r.languageId && `**Language:** ${r.languageName} — [Glottolog ${r.languageId}](https://glottolog.org/resource/languoid/id/${r.languageId})`,
    r.concept && `**Word:** “${r.concept}”, shown as ${r.shown || '—'}`,
    `**Should be:** ${r.fix || '—'}`,
    r.note && `**Note:** ${r.note}`,
    `**Page:** ${r.page}`,
    `**Interface:** ${r.locale}`,
    '',
    `_Report #${id}, sent from the site. The sender's contact details, if any, are kept privately._`,
  ].filter((x) => x !== '' && x != null && x !== false).join('\n');
  const res = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/issues`, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json', 'user-agent': 'terraverba-report', 'content-type': 'application/json' },
    body: JSON.stringify({ title: `[${r.kind}] ${subject || 'Correction'}`.slice(0, 200), body, labels: ['correction', `kind:${r.kind}`] }),
  });
  if (!res.ok) throw new Error(`github ${res.status}`);
  return (await res.json()).number;
}
