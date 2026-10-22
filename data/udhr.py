"""Article 1 of the Universal Declaration of Human Rights in every language the
UDHR-in-Unicode collection has (github.com/eric-muller/udhr). Used as a sample
of each language's written form, and as the "which language is this?" quiz.
Output: public/data/udhr.json  {glottocode: [text, script, direction]}
"""
import json, re, sys
import xml.etree.ElementTree as ET
from pathlib import Path

HERE = Path(__file__).parent
SRC = HERE / "raw" / "udhr" / "xml"
OUT = HERE.parent / "public" / "data" / "udhr.json"
NS = "{http://efele.net/udhr}"
# where one language has several texts, the one in today's standard spelling
# and script (the plain-named text is preferred otherwise; see rank)
PREFER = {"deu_1996", "ron_2006", "tuk_latn", "uzn_latn", "azj_latn",
          "lnc",  # Occitan in the classical norm, not the Provençal Mistralian spelling
          "069"}  # Maori in its modern spelling, with macrons


def rank(u):
    """Higher is better: the most complete stage first, then a text in the
    preferred orthography, then the text filed under the language's own code
    or plain name (a reader saw "French (Welche)", a Lorraine dialect, where
    standard French belonged)."""
    f, iso, name = u.get("f"), u.get("iso639-3"), u.get("n") or ""
    return (int(u.get("stage") or 0), f in PREFER, f == iso, "(" not in name)


def main():
    rows = json.loads((HERE.parent / "public" / "data" / "languages.json").read_text())
    F = rows["fields"]
    by_iso = {r[F.index("iso")]: r[0] for r in rows["rows"] if r[F.index("iso")]}
    index = ET.parse(SRC / "index.xml").getroot()
    best = {}
    for u in index.iter("udhr"):
        g = by_iso.get(u.get("iso639-3"))
        path = SRC / f"udhr_{u.get('f')}.xml"
        if not g or not path.exists():
            continue
        r = rank(u)
        if g in best and best[g][0] >= r:
            continue
        root = ET.parse(path).getroot()
        art = next((a for a in root.iter(f"{NS}article") if a.get("number") == "1"), None)
        paras = [p.text for p in art.iter(f"{NS}para")] if art is not None else []
        text = re.sub(r"\s+", " ", " ".join(t for t in paras if t)).strip()
        if len(text) < 20:
            continue
        best[g] = (r, [text, u.get("iso15924"), u.get("dir")])
    out = {g: v for g, (_, v) in sorted(best.items())}
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
    print(len(out), "languages with Article 1", file=sys.stderr)


if __name__ == "__main__":
    main()
