# Terraverba

**An atlas of the world's languages** — https://terraverba.org

Turn the globe, touch any place and see which languages live there, how they are related and what stories they carry. Terraverba is meant for curious people rather than specialists: no background in linguistics is needed. The interface speaks ten languages.

## What's in it

- **Atlas**: 8,004 languages on a **3D globe** that unrolls into a **flat map**. Click a dot for a language, or anywhere else for the languages around that point.
- **Layers** that stack: language dots, family areas (each place coloured by its nearest language), family lines (each language linked to its branch, each branch to the one above), names, and relics of writing. Colour by family or by endangerment.
- **Language panel**: names in the interface language, endonym, speakers, endangerment, where it is spoken today, its place in the family tree, a "did you know" note, a Wikipedia summary (fetched live in the reader's language, with a stored copy as fallback), recordings, and the languages most similar in vocabulary or grammar (linked on the map).
- **Family trees**: an index of families and a collapsible tree of each, full screen if wanted; an **all-languages** outline (8,004 languages in 4,809 branches, virtualised) that can be filtered.
- **Similarity**: languages laid out in 2D or 3D by vocabulary (ASJP's 40-item lists, LDND) or grammar (Grambank's 195 features). Colour by family or by region (palette checked pair by pair for colour-blind separation), shade the core area of each family, focus a family from the legend, or search a language to fly to it and its six nearest neighbours.
- **Stories**: ten guided tours (tea, the people behind languages, untranslatable words, Austronesian, Indo-European, Africa, the Americas, isolates, Sinitic, endangerment and revival) with flight paths, word tables you can listen to, and portraits.
- **Relics of writing**: 20 objects tied to writing and language (the Rosetta Stone, oracle bones, rongorongo, khipu…), pinned where they were made or found. Each opens a card with a picture, a few lines, its source and the languages involved; `?sel=relic:<id>` links to one.
- **Words**: 99 basic words and phrases (mother, water, tea, two, I love you…) in thousands of languages, written on the map in each language's own script and coloured by the class of their first consonant (similar does not mean related, as the page explains). Recordings by real speakers play on the words page and in the language panel, and a "tour" flies through the major families one word at a time.
- **Features**: 13 chosen questions (tone, word order, classifiers, gender, inclusive "we"…), all 195 Grambank features and a sound search (PHOIBLE), each drawn as a world map.
- **Daily quiz**: seven questions a day from twelve kinds (guess the language from its text, find it on the map, recognise a script, match pairs, sort, find the relative, odd one out, family puzzle, lightning round, numbers, etymology, listen and guess). Every question has a tier from easy to expert; the four levels differ only in how many questions of each tier they hold, easiest first. Everyone gets the same questions on the same day and level. Results can be saved as a card or shared as an emoji grid; streaks and bests are kept, and there is unlimited practice.
- **Language passport** (`#/me`): pick the languages you speak (native, fluent or learning), optionally add a name and a cropped photo, and make three 1200×630 share images: cover, data page and visa page, with stamps written in each language's own script. Name and photo stay in the browser; a share link carries only the languages, and a friend who opens it sees what you have in common.
- **Static pages for search engines and sharing**: every language, family, word, feature and story has its own page in English and Simplified Chinese (about 16,700 pages), with a map, summary, script sample, common words and similar languages, plus hreflang, JSON-LD, `sitemap.xml` and `robots.txt`. Each links back into the atlas.
- **Themes**: dark (Nocturne, the default) and light (Atelier), switched from the top bar and kept in the browser; `?theme=atelier` or `?theme=nocturne` also work.
- **Ten interface languages**: English, 简体中文, 繁體中文, 日本語, 한국어, Español, Français, Deutsch, Português, Русский. The browser's language is used when possible, English otherwise; `?lang=ja` picks one.
- **Works on modest devices**: phones and tablets get smaller textures, browsers without graphics acceleration get a lighter globe, and the page recovers if the browser drops its graphics context.

## Running

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/: the atlas plus the static pages, for any static host
SITE=https://example.org npm run build   # canonical links, hreflang and the sitemap use this address
npm run preview    # serve dist/
```

Links can be shared: `#/?sel=basq1248` (a language), `#/features/tone`, `#/words/tea`, `#/daily`, `#/?sel=@46.5,8.2,300` (within 300 km of a point), `#/tree/indo1319`, `#/all`, `#/space/grammar`, `#/story/tea/0`; add `?lang=ja` for an interface language.

Deployment (Cloudflare Pages, the recordings mirror, the corrections database and its email notice) is described in [`tools/deploy/README.md`](tools/deploy/README.md).

## Data pipeline

The data in `public/data/` is generated; the raw downloads (about 3.5 GB) are not in the repository.

```sh
cd data
python3 -m venv .venv && .venv/bin/pip install opencc-python-reimplemented numpy scipy pillow scikit-learn umap-learn rapidfuzz
# 1. download into data/raw/: Glottolog (glottolog_languoid.csv.zip, languages_and_dialects_geo.csv,
#    glottolog-cldf cldf/*.csv), ASJP v21 (Zenodo, cldf/forms.csv and languages.csv → raw/asjp/),
#    Grambank v1.0.3 (Zenodo, cldf/values.csv → raw/grambank/), Unicode CLDR → raw/cldr/
.venv/bin/python fetch_wikidata.py   # names, endonyms, speakers, Wikipedia titles in the ten interface languages
.venv/bin/python build_data.py       # → public/data/{languages,groups,families}.json, i18n/*.json, regions.png
.venv/bin/python similarity.py       # → public/data/similarity-{vocabulary,grammar}.json
.venv/bin/python features.py         # Grambank + PHOIBLE (raw/phoible/) → public/data/features*.json
# words: kaikki.org's English Wiktionary extract (raw/wiktionary/en.jsonl.gz, about 500 MB)
python3 words_extract.py             # → raw/wiktionary/translations.json (only the words on the list)
.venv/bin/python words.py            # → public/data/words/*.json, plus raw/wiktionary/audit.md for checking by hand
.venv/bin/python udhr.py             # UDHR in Unicode (raw/udhr/xml/) → public/data/udhr.json
python3 fetch_wiki.py                # → raw/wiki/*.json (stored summaries; resumable)
.venv/bin/python to_simplified.py
python3 shard_wiki.py                # → public/data/wiki/00–63.json
# recordings: audio_extract.py → audio_match.py → audio_lingualibre.py → audio_meta.py → audio_build.py
#   → public/data/audio.json; story_audio.py → public/data/story-audio.json
# the recordings mirror: audio_mirror.py fetch, then audio_mirror.py convert (needs ffmpeg)
```

**How words are chosen.** A Wiktionary translation table often lists several words for one language. `words.py` first separates varieties by their labels (Dungan, Hokkien or Egyptian Arabic are not filed under Mandarin or Standard Arabic), then ranks the candidates: table order first, and a word moves down only on clear evidence, such as an archaic, slang or dialect label, a qualifier like "morning" or "to a group", a script the language does not usually use, or being a compound of another candidate. What the rules cannot settle is fixed by hand per language in the `_O` table in `words.py` (34 major languages have been checked word by word). Chinese words keep both Traditional and Simplified forms.

Chinese names for groups that Wikidata lacks are built by rule in `zh_glossary.py` (directions, places and family names plus the right suffix); proper names without an established translation stay in Latin letters.

## Code layout

```
src/
  main.js            routing, layout, wiring the modules together
  globe.js           globe and flat map: one geometry morphing between sphere and plane; dots, areas, lines, arcs, picking; graphics tiers
  data.js            loading and indexing the data (names for the interface language on demand)
  palette.js         family colours (fixed for the large families, muted and neighbour-aware for the rest) and endangerment colours
  audio.js           recordings: the mirror first, Wikimedia Commons as fallback
  i18n/              interface languages: detection, fallback, number and plural formats; locales/*.js
  content/           "did you know" notes, stories, relics, feature and word texts, translations/<locale>.js
  ui/                panel, drawers (phones), Wikipedia summaries, trees, similarity, stories, features, words, daily quiz, passport, search, layers, labels
functions/api/report.js  corrections from the "report an error" dialog (Cloudflare Pages Function + D1 + Turnstile)
workers/mail/        a private Worker that emails each correction to the maintainer
data/                data download and build scripts
tools/build-pages.mjs, pages.css   static page generator (runs in npm run build)
tools/               headless-Chrome screenshots and tests used during development
```

**Add a story**: add an object to `src/content/stories.js`; each chapter has a `title` and `body`, a `view` (camera latitude, longitude, distance), a `focus` (`ids`, `group` or `groups`, optionally filtered by `near`, `macroarea` or `family`, or `isolates`), and optional `arcs` and `table`. Translations go in `src/content/translations/<locale>.js`.
**Add a note**: add `{ en, zh }` under a Glottocode in `src/content/notes.js` (other locales in their translation files; Traditional Chinese is converted from Simplified).
**Add an interface language**: copy `src/i18n/locales/en.js`, translate it, register it in `LOCALES` in `src/i18n/index.js`, and add it to `LOCALES` in `data/build_data.py` to generate its names file.

## Sources and licences

- Languages, classification, coordinates, endangerment: [Glottolog 5.3](https://glottolog.org) (Hammarström, Forkel, Haspelmath & Bank), CC BY 4.0
- Names in other languages, endonyms, speaker numbers: [Wikidata](https://www.wikidata.org), CC0 (speaker numbers are rough)
- Country and territory names, speakers per country (to order "where it is spoken" and choose the map question's main countries): [Unicode CLDR](https://cldr.unicode.org) 46, Unicode License V3; names come from the browser's own CLDR (`Intl.DisplayNames`)
- Similarity: [ASJP](https://asjp.clld.org) v21, [Grambank](https://grambank.clld.org) v1.0.3, CC BY 4.0
- Features: Grambank v1.0.3 (CC BY 4.0), [PHOIBLE](https://phoible.org) 2.0 (CC BY-SA 3.0)
- Words: [Wiktionary](https://en.wiktionary.org) translation tables (via [kaikki.org](https://kaikki.org)), CC BY-SA 4.0; ASJP
- Script samples: Article 1 of the Universal Declaration of Human Rights, [UDHR in Unicode](https://github.com/eric-muller/udhr)
- Language summaries: Wikipedia, CC BY-SA 4.0, credited in place
- Coastlines: Natural Earth (via world-atlas), public domain
- Recordings: speakers on [Lingua Libre](https://lingualibre.org) and Wiktionary, files on [Wikimedia Commons](https://commons.wikimedia.org); only CC and public-domain recordings are used, each credited with its speaker and licence
- Portraits: Wikimedia Commons, public domain (the photograph of Cristina Calderón is CC BY 2.0, Víctor Alejandro Correa Rueda)
- Relic photographs: Wikimedia Commons, public domain, CC0, CC BY or CC BY-SA; author and licence in each entry's `credit` in `src/content/relics.js`
- Fonts: Newsreader, Inter and IBM Plex Mono, SIL Open Font License
- Stories and notes are written for this project

## Licence

The code (`src/`, `tools/`, `data/*.py`, `functions/`, `workers/` and the build configuration) is under the [MIT licence](LICENSE). The texts written for the site (stories, notes, relic texts and their translations) and the generated data in `public/data/` are under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), as they build on Wiktionary, Wikipedia and PHOIBLE. Third-party material keeps its own licence (see above). The name "Terraverba" and its logo are not covered by these licences.

Corrections are welcome: every language panel and word map has a "report an error" link, and the maintainer can be reached at contact@terraverba.org.
