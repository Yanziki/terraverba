"""Match the recordings found by audio_extract.py to the word map: a recording
counts when its language is the dot's language and its word is the word the
map shows (public/data/words/*.json), so what you hear is what you read.
Output: raw/wiktionary/audio_matched.json  [[concept, glottocode, word, file, tags], ...]
"""
import json, sys, types
from collections import Counter
from pathlib import Path

# words.py's code tables are what we need; its romanisation helpers are not
sys.modules.setdefault("unidecode", types.SimpleNamespace(unidecode=lambda s: s))
from words import MACRO, TO_MACRO, VARIETY  # noqa: E402

HERE = Path(__file__).parent
RAW = HERE / "raw" / "wiktionary"
PUB = HERE.parent / "public" / "data"

# Chinese entries carry one row per variety, told apart by the sound's tags
ZH_TAGS = {"Mandarin": "cmn", "Standard-Chinese": "cmn", "Beijing": "cmn", "Taiwan": "cmn", "Cantonese": "yue", "Guangzhou": "yue",
           "Hong-Kong": "yue", "Hokkien": "nan", "Taiwanese-Hokkien": "nan", "Xiamen": "nan", "Hakka": "hak", "Wu": "wuu", "Shanghainese": "wuu"}


def main():
    L = json.loads((PUB / "languages.json").read_text())
    langs = [dict(zip(L["fields"], r)) for r in L["rows"]]
    by_iso = {l["iso"]: l["id"] for l in langs if l["iso"] and l["family"] != "sign1238"}
    iso1 = json.loads((RAW / "iso1to3.json").read_text())

    def from_code(code):
        base = code.split("-")[0]
        iso3 = iso1.get(base, base) if len(base) == 2 else base
        return by_iso.get(MACRO.get(iso3, iso3)) or by_iso.get(iso3) or by_iso.get(TO_MACRO.get(iso3))

    # what the map shows: (glottocode, word) → concept, with both Han spellings
    shown = {}
    for p in sorted((PUB / "words").glob("*.json")):
        if p.name == "index.json":
            continue
        w = json.loads(p.read_text())
        for f in w["forms"]:
            if f[3] != 0:
                continue
            for spelling in [f[1]] + ([f[5]] if len(f) > 5 and f[5] else []):
                shown.setdefault((f[0], spelling), w["id"])

    audio = json.loads((RAW / "audio.json").read_text())
    out, seen, unmatched = [], set(), Counter()
    for word, recs in audio.items():
        for code, lang, pos, file, url, tags in recs:
            if code == "zh":
                variety = next((ZH_TAGS[t] for t in tags if t in ZH_TAGS), None)
                g = by_iso.get(variety) if variety else None
            elif any(t in VARIETY for t in tags):
                v = VARIETY[next(t for t in tags if t in VARIETY)]
                g = by_iso.get(v) if v else None
            else:
                g = from_code(code)
            concept = shown.get((g, word)) if g else None
            if not concept:
                unmatched[code] += 1
                continue
            # one recording per word and language is plenty; keep the first
            key = (concept, g)
            if key in seen:
                continue
            seen.add(key)
            out.append([concept, g, word, file, tags])
    (RAW / "audio_matched.json").write_text(json.dumps(out, ensure_ascii=False))
    per_lang = Counter(g for _, g, *_ in out)
    print(len(out), "recordings for", len(per_lang), "languages;", "concepts covered:", len({c for c, *_ in out}), file=sys.stderr)
    print("most:", per_lang.most_common(12), file=sys.stderr)


if __name__ == "__main__":
    main()
