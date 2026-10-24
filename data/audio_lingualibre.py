"""Fill gaps in the word map's recordings from Lingua Libre (lingualibre.org),
whose 1.5 million recordings are on Wikimedia Commons but mostly not linked
from English Wiktionary — so Spanish, Japanese or Korean, say, have hardly
any recordings in the Wiktionary extract. Asks Lingua Libre's SPARQL service,
one query per language, for recordings whose transcription is exactly a word
the map shows; for each language it prefers the speaker who recorded the most
of them, so a language's words come in one voice where possible.
Output: raw/wiktionary/audio_ll.json  [[concept, glottocode, word, file, tags], ...]
Results are cached per language, with the spellings already asked for, so a
rerun only asks for what is new (a word added to the map); `audio_lingualibre.py
iloveyou …` asks again for those concepts regardless.
`audio_lingualibre.py --commons wuu …` reads a language's recordings from its
Commons category instead (Category:Lingua Libre pronunciation-wuu), whose file
names carry speaker and transcription: for languages the SPARQL service does
not list, or while it is down. Those hits are cached like the others.
"""
import re
import json, sys, time, types, unicodedata, urllib.parse, urllib.request
from collections import Counter, defaultdict
from pathlib import Path

# words.py's code tables are what we need; its romanisation helpers are not
sys.modules.setdefault("unidecode", types.SimpleNamespace(unidecode=lambda s: s))
from words import MACRO, TO_MACRO  # noqa: E402

HERE = Path(__file__).parent
RAW = HERE / "raw" / "wiktionary"
PUB = HERE.parent / "public" / "data"
OUT = RAW / "audio_ll.json"
CACHE = RAW / "audio_ll_cache.json"  # raw hits per language, so a rerun resumes
ENDPOINT = "https://lingualibre.org/bigdata/namespace/wdq/sparql"
UA = {"User-Agent": "Terraverba/0.1 (world language atlas; word-map recordings)", "Accept": "application/sparql-results+json"}
LL = "https://lingualibre.org/prop/direct/"


def sparql(query, tries=4):
    url = f"{ENDPOINT}?{urllib.parse.urlencode({'query': query})}"
    for attempt in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
                return json.load(r)["results"]["bindings"]
        except Exception as e:  # the service is occasionally slow; try again
            print("retry", attempt, e, file=sys.stderr)
            time.sleep(10 * (attempt + 1))
    raise RuntimeError("Lingua Libre did not answer")


def plain(s):
    # Lingua Libre transcribes without the stress marks Wiktionary gives Russian,
    # Ukrainian or Bulgarian (вода́ → вода); precomposed letters such as é stay
    return unicodedata.normalize("NFC", s).replace("\u0301", "").replace("\u0300", "")


def lit(s):
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'


def commons_hits(iso):
    """[[transcription, file URL, speaker]] from the language's Commons category"""
    api = "https://commons.wikimedia.org/w/api.php"
    hits, cont = [], {}
    while True:
        q = {"action": "query", "format": "json", "list": "categorymembers", "cmtype": "file", "cmlimit": "500",
             "cmtitle": f"Category:Lingua Libre pronunciation-{iso}", **cont}
        with urllib.request.urlopen(urllib.request.Request(f"{api}?{urllib.parse.urlencode(q)}", headers={"User-Agent": UA["User-Agent"]}), timeout=60) as r:
            d = json.load(r)
        for m in d["query"]["categorymembers"]:
            # File:LL-Q34290 (wuu)-Andrepoiy-人.wav
            got = re.match(r"File:LL-Q\d+ \([^)]*\)-([^-]+)-(.+)\.\w+$", m["title"])
            if got:
                name = m["title"][5:]
                hits.append([unicodedata.normalize("NFC", got[2]), "https://commons.wikimedia.org/wiki/Special:FilePath/" + urllib.parse.quote(name), "commons:" + got[1]])
        if "continue" not in d:
            return hits
        cont = d["continue"]


def main():
    commons = sys.argv[2:] if sys.argv[1:2] == ["--commons"] else None
    L = json.loads((PUB / "languages.json").read_text())
    langs = [dict(zip(L["fields"], r)) for r in L["rows"]]
    by_iso = {l["iso"]: l["id"] for l in langs if l["iso"] and l["family"] != "sign1238"}

    def from_iso(iso3):
        return by_iso.get(MACRO.get(iso3, iso3)) or by_iso.get(iso3) or by_iso.get(TO_MACRO.get(iso3))

    # what the map shows, per language: word → concept (both Han spellings)
    shown = defaultdict(dict)
    for p in sorted((PUB / "words").glob("*.json")):
        if p.name == "index.json":
            continue
        w = json.loads(p.read_text())
        for f in w["forms"]:
            if f[3] != 0:
                continue
            for spelling in [f[1]] + ([f[5]] if len(f) > 5 and f[5] else []):
                shown[f[0]].setdefault(spelling, w["id"])

    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    if commons:
        for iso in commons:
            g = from_iso(iso)
            got = commons_hits(iso)
            cache[g] = cache.get(g, []) + [h for h in got if h not in cache.get(g, [])]
            print(f"{iso} → {g}: {len(got)} recordings on Commons", file=sys.stderr)
        CACHE.write_text(json.dumps(cache, ensure_ascii=False))

    # Lingua Libre's languages, by ISO 639-3
    rows = [] if commons else sparql(f"SELECT ?lang ?iso WHERE {{ ?lang <{LL}P2> <https://lingualibre.org/entity/Q4> ; <{LL}P13> ?iso }}")
    ll_langs = defaultdict(list)
    for r in rows:
        g = from_iso(r["iso"]["value"])
        if g in shown:
            ll_langs[g].append(r["lang"]["value"])
    print(len(ll_langs), "Lingua Libre languages are on the word map", file=sys.stderr)

    def lookup(item, keys):
        # transcriptions are compared exactly; a batch the service chokes on is split
        q = f"""SELECT ?t ?file ?speaker WHERE {{
          ?r <{LL}P2> <https://lingualibre.org/entity/Q2> ; <{LL}P4> <{item}> ;
             <{LL}P7> ?t ; <{LL}P3> ?file ; <{LL}P5> ?speaker .
          VALUES ?t {{ {" ".join(lit(w) for w in keys)} }} }}"""
        try:
            got = sparql(q, tries=2 if len(keys) > 10 else 4)
        except RuntimeError:
            if len(keys) <= 10:
                print("gave up on", item, keys[:3], file=sys.stderr)
                return []
            half = len(keys) // 2
            return lookup(item, keys[:half]) + lookup(item, keys[half:])
        time.sleep(1)
        return [[h["t"]["value"], h["file"]["value"], h["speaker"]["value"]] for h in got]

    asked = cache.setdefault("_asked", {})
    again = set() if commons else set(sys.argv[1:])
    out = []
    # languages found only through Commons keep their cached hits
    for g in cache:
        if not g.startswith("_") and g in shown:
            ll_langs.setdefault(g, [])
    for i, (g, items) in enumerate(sorted(ll_langs.items())):
        # each spelling Lingua Libre might use → (concept, the spelling the map shows)
        words = {}
        for w, c in shown[g].items():
            words.setdefault(w, (c, w))
            words.setdefault(plain(w), (c, w))
        if g in cache and g not in asked:  # cached before spellings were tracked
            asked[g] = list(shown[g])
        done = set(asked.get(g, []))
        keys = [w for w, (c, _) in words.items() if w not in done or c in again]
        if keys and items:
            got = [h for item in items for k in range(0, len(keys), 100) for h in lookup(item, keys[k:k + 100])]
            cache[g] = cache.get(g, []) + [h for h in got if h not in cache.get(g, [])]
            asked[g] = sorted(done | set(keys))
            CACHE.write_text(json.dumps(cache, ensure_ascii=False))
        hits = cache.get(g, [])
        if not hits:
            continue
        by_speaker = defaultdict(dict)
        for t, url, speaker in hits:
            if t not in words:
                continue
            concept, word = words[t]
            file = urllib.parse.unquote(url.rsplit("/", 1)[1])
            by_speaker[speaker].setdefault(concept, (word, file))
        # the speaker with the most words first, then others for what is left
        taken = {}
        for sp in sorted(by_speaker, key=lambda s: -len(by_speaker[s])):
            for concept, rec in by_speaker[sp].items():
                taken.setdefault(concept, rec)
        for concept, (word, file) in sorted(taken.items()):
            out.append([concept, g, word, file, ["Lingua Libre"]])
        print(f"{i + 1}/{len(ll_langs)} {g}: {len(taken)} words, {len(by_speaker)} speakers", file=sys.stderr, flush=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False))
    print(len(out), "recordings for", len(Counter(g for _, g, *_ in out)), "languages", file=sys.stderr)


if __name__ == "__main__":
    main()
