"""Stream the English Wiktionary extract (kaikki.org, ~3 GB uncompressed) and
keep only the translation tables of the words in word_concepts.py.
Output: raw/wiktionary/translations.json
  {concept id: {sense gloss: [[code, language, word, romanisation, tags, qualifier, alt], ...]}}
Tags carry the variety (Dungan, Hokkien…), script (Cyrillic, Gurmukhi…) and
register (slang, polite, archaic…); the qualifier is any free-text restriction
("morning", "to a group of people"); alt is a reading (kana for Japanese).
"""
import gzip, json, sys
from collections import defaultdict
from pathlib import Path

from word_concepts import CONCEPTS

HERE = Path(__file__).parent
SRC = HERE / "raw" / "wiktionary" / "en.jsonl.gz"
OUT = HERE / "raw" / "wiktionary" / "translations.json"


def main():
    wanted = defaultdict(list)
    for c in CONCEPTS:
        wanted[(c["word"], c["pos"])].append(c["id"])
    out = defaultdict(lambda: defaultdict(list))
    n = 0
    with gzip.open(SRC, "rt", encoding="utf-8") as f:
        for line in f:
            n += 1
            if n % 200000 == 0:
                print(n, "entries", file=sys.stderr, flush=True)
            # cheap prefilter before parsing a large JSON line
            if '"translations"' not in line:
                continue
            e = json.loads(line)
            if e.get("lang_code") != "en":
                continue
            ids = wanted.get((e.get("word"), e.get("pos")))
            if not ids:
                continue
            tables = list(e.get("translations", []))
            for s in e.get("senses", []):
                tables.extend(s.get("translations", []))
            for t in tables:
                if not t.get("word") or not t.get("code"):
                    continue
                gloss = t.get("sense") or ""
                for cid in ids:
                    tags = sorted(set(t.get("tags", []) + t.get("raw_tags", [])))
                    qual = "; ".join(x for x in (t.get("english"), t.get("note")) if x)
                    out[cid][gloss].append([t["code"], t.get("lang", ""), t["word"], t.get("roman", ""), tags, qual, t.get("alt", "")])
    OUT.write_text(json.dumps(out, ensure_ascii=False))
    print("concepts found:", len(out), "of", len(CONCEPTS), file=sys.stderr)
    for c in CONCEPTS:
        senses = out.get(c["id"], {})
        top = sorted(senses.items(), key=lambda kv: -len(kv[1]))[:2]
        print(f"  {c['id']:10s}", [(g[:40], len(v)) for g, v in top], file=sys.stderr)


if __name__ == "__main__":
    main()
