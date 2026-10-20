// Pronunciation recordings from Wikimedia Commons (Lingua Libre and Wiktionary
// speakers), matched to the word map in data/audio_*.py. Played from our own
// mirror of them (AUDIO_MIRROR, see config.js), else from Commons, and only
// when asked: nothing is fetched until a play button is pressed. One
// recording plays at a time.
import { t } from './i18n/index.js';
import { AUDIO_MIRROR } from './config.js';

const BASE = import.meta.env.BASE_URL;
let loading = null;

export const loadAudio = () => (loading ??= fetch(`${BASE}data/audio.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null));
// recordings of the words in the stories' tables, keyed "story.chapter.row[.column]" (data/story_audio.py)
let storyLoading = null;
export const loadStoryAudio = () => (storyLoading ??= fetch(`${BASE}data/story-audio.json`).then((r) => (r.ok ? r.json() : {})).catch(() => ({})));

// entry: [file, md5 prefix, author, licence, word]
const encode = (name) => encodeURIComponent(name).replace(/\(/g, '%28').replace(/\)/g, '%29');
// the original file, and the MP3 rendering Commons keeps of every WAV, FLAC and OGG
const originalOf = ([file, h]) => `https://upload.wikimedia.org/wikipedia/commons/${h[0]}/${h}/${encode(file.replace(/ /g, '_'))}`;
export function urlOf(entry) {
  const name = encode(entry[0].replace(/ /g, '_'));
  return /\.mp3$/i.test(entry[0]) ? originalOf(entry) : `https://upload.wikimedia.org/wikipedia/commons/transcoded/${entry[1][0]}/${entry[1]}/${name}/${name}.mp3`;
}
// the same MP3 on the mirror, at Commons' own relative path
const mirrorOf = ([file, h]) => (AUDIO_MIRROR ? `${AUDIO_MIRROR}${h[0]}/${h}/${encode(file.replace(/ /g, '_'))}${/\.mp3$/i.test(file) ? '' : '.mp3'}` : null);
// "Recording: author · licence", or just the licence when the author is not known
export const creditOf = (e) => (e[2] && e[2] !== '—' ? t('audioCredit', e[2], e[3]) : e[3]);
export const pageOf = ([file]) => `https://commons.wikimedia.org/wiki/File:${encode(file.replace(/ /g, '_'))}`;

let player = null;
let finish = null;
export function stop() {
  if (player) player.pause();
  finish?.(false);
  finish = null;
}
// resolves true when the recording has played to the end, false if stopped or failed;
// the mirror first; if a file is missing there, Commons' MP3 rendering, then the original
// (most browsers play OGG and WAV)
export function play(entry) {
  stop();
  player ??= new Audio();
  const urls = [...new Set([mirrorOf(entry), urlOf(entry), originalOf(entry)].filter(Boolean))];
  return new Promise((resolve) => {
    const done = (ok) => {
      finish = null;
      resolve(ok);
    };
    finish = resolve;
    const attempt = (i) => {
      player.src = urls[i];
      player.onended = () => done(true);
      player.onerror = () => (i + 1 < urls.length && finish === resolve ? attempt(i + 1) : done(false));
      // a missing file shows up as onerror, a superseded load as AbortError; only a
      // refusal to play (autoplay rules) ends it here
      player.play().catch((e) => e?.name === 'NotAllowedError' && done(false));
    };
    attempt(0);
  });
}

// all the recordings of one language, word by word
export async function forLanguage(g) {
  const a = await loadAudio();
  if (!a) return [];
  return Object.entries(a.words).filter(([, langs]) => langs[g]).map(([concept, langs]) => ({ concept, entry: langs[g] }));
}
