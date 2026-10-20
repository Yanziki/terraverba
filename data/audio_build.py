"""Write public/data/audio.json for the site: for each word and language, the
Commons recording with its author and licence. Only freely licensed files are
kept (Creative Commons, CC0, public domain). The player builds the URL of
Commons' MP3 version from the file name and its MD5 prefix. Recordings linked
from Wiktionary come first; Lingua Libre's (audio_lingualibre.py) fill the gaps.
  {"words": {concept: {glottocode: [file, md5 prefix, author, licence, word]}}}
"""
import hashlib, json, re, sys
from pathlib import Path

HERE = Path(__file__).parent
RAW = HERE / "raw" / "wiktionary"
OUT = HERE.parent / "public" / "data" / "audio.json"
FREE = re.compile(r"^(CC|Public domain|PD)", re.I)
# recordings to leave out (none at present; a pattern that matches nothing)
NOT_A_WORD = re.compile(r"(?!)")
# authors Commons gives only in the file description, not its metadata. The
# "Taiwanese-The Consonant/Vowel …" files are teaching samples, but each says the
# word it is linked from (checked by ear: 人 我 三 手 豬)
AUTHOR = {"Taiwanese-The_": "Astroviolin"}


def main():
    matched = json.loads((RAW / "audio_matched.json").read_text())
    if (RAW / "audio_ll.json").exists():
        matched += json.loads((RAW / "audio_ll.json").read_text())
    meta = json.loads((RAW / "audio_meta.json").read_text())
    # the file's current title on Commons (capitalised, after renames); see audio_meta.py
    current = json.loads((RAW / "audio_titles.json").read_text())
    words, skipped = {}, {}
    for concept, g, word, file, tags in matched:
        if g in words.get(concept, {}) or NOT_A_WORD.match(file):
            continue
        m = meta.get(file)
        if not m or not FREE.match(m[1] or ""):
            skipped[(m or ["", "missing"])[1] or "none"] = skipped.get((m or ["", "missing"])[1] or "none", 0) + 1
            continue
        if file in current and current[file] is None:  # deleted from Commons
            skipped["gone"] = skipped.get("gone", 0) + 1
            continue
        file = current.get(file) or file
        name = file.replace(" ", "_")
        h = hashlib.md5(name.encode()).hexdigest()[:2]
        author = re.sub(r"\s+", " ", m[0] or "").strip() or next((a for p, a in AUTHOR.items() if name.startswith(p)), "")
        # Lingua Libre files say "Speaker: X Recorder: Y"; the voice is the speaker's
        sp = re.match(r"Speaker:\s*(.+?)\s*(Recorder:.*)?$", author)
        author = (sp.group(1) if sp else author)[:80] or "—"
        words.setdefault(concept, {})[g] = [file, h, author, m[1], word]
    OUT.write_text(json.dumps({"words": words}, ensure_ascii=False, separators=(",", ":")))
    n = sum(len(v) for v in words.values())
    langs = len({g for v in words.values() for g in v})
    print(f"{n} recordings, {langs} languages, {len(words)} words; skipped: {skipped}", file=sys.stderr)


if __name__ == "__main__":
    main()
