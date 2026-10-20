# Deploying Terraverba (Cloudflare Pages)

Needs Node 22 and `npx wrangler login` once.

What runs where:

- Pages project `terraverba`: the site (`dist/`) and `functions/api/report.js` for corrections, with the D1 database `terraverba` (`functions/schema.sql`), Cloudflare Turnstile, and a service binding `MAIL` to the Worker below. Domains: terraverba.org, www.terraverba.org.
- Pages project `terraverba-audio`: the copy of every recording (`data/raw/audio-mirror/`, made by `data/audio_mirror.py`). Domain: audio.terraverba.org.
- Worker `terraverba-mail` (`workers/mail/`): emails each correction to the maintainer. It has no public address; its recipient is the secret `TO`.

## The site

Production:

    SITE=https://terraverba.org npm run build
    npx wrangler pages deploy dist --project-name terraverba --branch main

Preview (preview.terraverba.pages.dev; `PREVIEW=1` marks every page noindex):

    SITE=https://terraverba.org PREVIEW=1 npm run build
    npx wrangler pages deploy dist --project-name terraverba --branch preview

The D1 and service bindings come from `wrangler.toml`. Secrets are per environment (production and preview): `TURNSTILE_SECRET` and `IP_SALT`, set with `npx wrangler pages secret put <NAME> --project-name terraverba` or in the dashboard. The public Turnstile site key is in `src/config.js` (`REPORT.turnstileSiteKey`).

Database, once: `npx wrangler d1 execute terraverba --remote --file=functions/schema.sql`

## The recordings mirror

    cd data && python3 audio_mirror.py fetch && python3 audio_mirror.py convert   # ffmpeg; both resumable
    # deploy from a folder of its own: inside the repository wrangler would also upload functions/
    rm -rf /tmp/tv-audio && cp -R data/raw/audio-mirror /tmp/tv-audio
    (cd /tmp/tv-audio && npx --prefix "$OLDPWD" wrangler pages deploy . --project-name terraverba-audio --branch main)

The player builds the mirror address from `AUDIO_MIRROR` in `src/config.js` (`VITE_AUDIO_MIRROR` overrides it at build time).

## The mail Worker

    cd workers/mail
    npx wrangler deploy
    npx wrangler secret put TO      # the address that receives corrections; it must be a verified Email Routing destination

Email Routing must be enabled on the domain (it also forwards contact@terraverba.org).

## DNS

CNAME records, proxied: `@` and `www` → `terraverba.pages.dev`, `audio` → `terraverba-audio.pages.dev`.
