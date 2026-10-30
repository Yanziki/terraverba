// terraverba-mail: sends the site's owner a short email for each correction
// (functions/api/report.js calls it through a service binding). It has no
// public address, and Email Routing only delivers to the account's verified
// destination addresses; the recipient is the secret TO.
//   cd workers/mail && npx wrangler deploy && npx wrangler secret put TO
import { EmailMessage } from 'cloudflare:email';

const FROM = 'reports@terraverba.org';

// base64 of UTF-8, wrapped at 76 characters as MIME asks
const b64 = (s) => {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
};
const wrap = (s) => s.replace(/.{76}/g, '$&\r\n');
// the reader's address becomes Reply-To only when it is one plain address,
// so nothing they type can add a header or a second recipient
const plainAddress = (s) => typeof s === 'string' && /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(s) && s.length <= 200;

export default {
  async fetch(request, env) {
    if (request.method !== 'POST' || !env.TO) return new Response('no', { status: 405 });
    const { subject, text, replyTo } = await request.json();
    const raw = [
      `From: Terraverba <${FROM}>`,
      `To: <${env.TO}>`,
      ...(plainAddress(replyTo) ? [`Reply-To: <${replyTo}>`] : []),
      `Subject: =?UTF-8?B?${b64(String(subject).slice(0, 180))}?=`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${crypto.randomUUID()}@terraverba.org>`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      '',
      wrap(b64(String(text).slice(0, 20000))),
    ].join('\r\n');
    await env.MAIL.send(new EmailMessage(FROM, env.TO, raw));
    return new Response('sent');
  },
};
