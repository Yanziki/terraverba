"""Stream the English Wiktionary extract (kaikki.org) and keep the pronunciation
recordings of the words chosen for the word map (public/data/words/*.json):
most are Lingua Libre or Wiktionary recordings on Wikimedia Commons (CC BY-SA
or similar; the author and licence are fetched in audio_meta.py).
Output: raw/wiktionary/audio.json  {word: [[lang_code, lang, pos, file, mp3_url, tags], ...]}
Matching each recording to a language and a chosen word happens in words.py.
"""
import gzip, json, sys
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).parent
SRC = HERE / "raw" / "kaikki-all" / "raw-wiktextract-data.jsonl.gz"  # every language, ~3 GB
OUT = HERE / "raw" / "wiktionary" / "audio.json"
WORDS = HERE.parent / "public" / "data" / "words"


def wanted_words():
    out = set()
    for p in WORDS.glob("*.json"):
        if p.name == "index.json":
            continue
        for f in json.loads(p.read_text())["forms"]:
            if f[3] == 0:  # Wiktionary forms only; ASJP's are transcriptions
                out.add(f[1])
                if len(f) > 5 and f[5]:
                    out.add(f[5])  # the simplified spelling of a Chinese word
    return out


def iter_lines(f):
    # a file still downloading ends mid-stream; read what is there
    try:
        yield from f
    except (EOFError, gzip.BadGzipFile) as e:
        print("stopped early:", e, file=sys.stderr)


def main():
    words = wanted_words()
    print(len(words), "words wanted", file=sys.stderr)
    out = defaultdict(list)
    n = kept = 0
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else SRC
    with gzip.open(src, "rt", encoding="utf-8") as f:
        for line in iter_lines(f):
            n += 1
            if n % 500000 == 0:
                print(n, "entries,", kept, "recordings", file=sys.stderr, flush=True)
            if '"mp3_url"' not in line and '"ogg_url"' not in line:
                continue
            e = json.loads(line)
            w = e.get("word")
            if w not in words:
                continue
            for s in e.get("sounds", []):
                url = s.get("mp3_url") or s.get("ogg_url")
                if not url or not s.get("audio"):
                    continue
                tags = sorted(set(s.get("tags", []) + s.get("raw_tags", [])))
                out[w].append([e.get("lang_code"), e.get("lang"), e.get("pos"), s["audio"], url, tags])
                kept += 1
    OUT.write_text(json.dumps(out, ensure_ascii=False))
    print(kept, "recordings for", len(out), "words", file=sys.stderr)


if __name__ == "__main__":
    main()
