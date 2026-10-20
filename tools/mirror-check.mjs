// Every recording the site can play, looked up on the mirror the way
// src/audio.js builds its address: all of them with unusual characters in the
// name, and a random sample of the rest.
//   node tools/mirror-check.mjs https://terraverba-audio.pages.dev/ [sample]
import fs from 'node:fs';

const base = process.argv[2];
const sample = +(process.argv[3] ?? 400);
const encode = (name) => encodeURIComponent(name).replace(/\(/g, '%28').replace(/\)/g, '%29');
const mirrorOf = ([file, h]) => `${base}${h[0]}/${h}/${encode(file.replace(/ /g, '_'))}${/\.mp3$/i.test(file) ? '' : '.mp3'}`;
const words = JSON.parse(fs.readFileSync('public/data/audio.json', 'utf8')).words;
const stories = JSON.parse(fs.readFileSync('public/data/story-audio.json', 'utf8'));
const all = [...new Map([...Object.values(words).flatMap((m) => Object.values(m)), ...Object.values(stories)].map((e) => [e[0], e])).values()];
const odd = all.filter((e) => /[^A-Za-z0-9._ -]/.test(e[0]));
const rest = all.filter((e) => !odd.includes(e)).sort(() => Math.random() - 0.5).slice(0, sample);
const bad = [];
const todo = [...odd, ...rest];
for (let i = 0; i < todo.length; i += 16) {
  await Promise.all(todo.slice(i, i + 16).map(async (e) => {
    const r = await fetch(mirrorOf(e), { method: 'HEAD' }).catch(() => null);
    if (!r || r.status !== 200 || !/audio\/mpeg/.test(r.headers.get('content-type') ?? '')) bad.push([r?.status, r?.headers.get('content-type'), e[0]]);
  }));
}
console.log({ total: all.length, checked: todo.length, unusualNames: odd.length, bad: bad.length, examples: bad.slice(0, 10) });
