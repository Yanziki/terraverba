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
        stage = int(u.get("stage") or 0)
        if g in best and best[g][0] >= stage:
            continue
        root = ET.parse(path).getroot()
        art = next((a for a in root.iter(f"{NS}article") if a.get("number") == "1"), None)
        paras = [p.text for p in art.iter(f"{NS}para")] if art is not None else []
        text = re.sub(r"\s+", " ", " ".join(t for t in paras if t)).strip()
        if len(text) < 20:
            continue
        best[g] = (stage, [text, u.get("iso15924"), u.get("dir")])
    out = {g: v for g, (_, v) in sorted(best.items())}
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
    print(len(out), "languages with Article 1", file=sys.stderr)


if __name__ == "__main__":
    main()
