// Site settings that depend on where Terraverba is hosted.
//
// REPORT: where "report an error" sends a correction. Fill in one or more;
// with none set, the dialog offers to copy the report instead.
//   endpoint: a URL that accepts a JSON POST (e.g. a Cloudflare Pages Function)
//   github:   "owner/repo" — opens a pre-filled GitHub issue
//   email:    an address — opens the reader's mail app
//   turnstileSiteKey: Cloudflare Turnstile site key (public); asks the
//             visitor to prove they're human before a report is accepted
// On Cloudflare Pages the endpoint is our own function, functions/api/report.js;
// the dev server has none, so there the dialog falls back to copying.
export const REPORT = {
  endpoint: import.meta.env.DEV ? '' : `${import.meta.env.BASE_URL}api/report`,
  github: '',
  email: '',
  turnstileSiteKey: '0x4AAAAAAFeDBOx1zKgJtlLw',
};

// AUDIO_MIRROR: our own copy of every recording the site plays (data/audio_mirror.py),
// published as a second Cloudflare Pages project, so recordings load reliably
// wherever the reader is. They are played from here first, from Wikimedia
// Commons only if a file is missing; empty means Commons only.
// A build can point elsewhere with VITE_AUDIO_MIRROR (the preview uses the mirror's pages.dev address).
export const AUDIO_MIRROR = import.meta.env.DEV ? '' : (import.meta.env.VITE_AUDIO_MIRROR ?? 'https://audio.terraverba.org/');
