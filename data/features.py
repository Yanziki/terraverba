"""Grammar and sound features for the feature maps.

  features.json           a dozen hand-picked questions (tone, word order,
                          classifiers…) coded per language from Grambank v1.0.3
                          and PHOIBLE, for the general reader
  features-grambank.json  all 195 Grambank features, one character per feature
  features-phoible.json   one phoneme inventory per language, for sound search

Codes are compact: a shared list of glottocodes plus one string per feature
whose n-th character is the code index for the n-th language ('.' = no data).
"""
import csv, json, sys
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).parent
RAW = HERE / "raw"
OUT = HERE.parent / "public" / "data"

# PHOIBLE sources that record tone at all; the others list no tones for anyone
TONE_SOURCES = {"ph", "aa", "spa", "ra"}
# which inventory stands for a language when there are several
SOURCE_RANK = {s: i for i, s in enumerate(["ph", "aa", "spa", "ra", "ea", "er", "saphon", "upsid"])}
CLICKS = set("ʘǀǃǂǁ")


def read_csv(path):
    with open(path, newline="", encoding="utf-8") as f:
        yield from csv.DictReader(f)


def language_level():
    ours = {r[0] for r in json.loads((OUT / "languages.json").read_text())["rows"]}
    parent = {r["id"]: r["parent_id"] for r in read_csv(RAW / "languoid.csv")}

    def up(g):
        for _ in range(30):
            if not g or g in ours:
                break
            g = parent.get(g)
        return g if g in ours else None
    return up


def binned(n, edges, labels):
    for edge, label in zip(edges, labels):
        if n <= edge:
            return label
    return labels[-1]


def main():
    up = language_level()

    # ── Grambank ──────────────────────────────────────────
    params = [{"id": p["ID"], "name": p["Name"]} for p in read_csv(RAW / "grambank" / "parameters.csv")]
    codes = defaultdict(dict)
    for c in read_csv(RAW / "grambank" / "codes.csv"):
        codes[c["Parameter_ID"]][c["Name"]] = c["Description"]
    gb = defaultdict(dict)
    for v in read_csv(RAW / "grambank" / "values.csv"):
        g = up(v["Language_ID"])
        # a language-level Grambank entry wins over one of its dialects
        if g and (v["Language_ID"] == g or v["Parameter_ID"] not in gb[g]):
            gb[g][v["Parameter_ID"]] = v["Value"]

    # ── PHOIBLE ───────────────────────────────────────────
    inventories = defaultdict(lambda: {"segs": [], "tones": 0})
    meta = {}
    for r in read_csv(RAW / "phoible" / "phoible.csv"):
        i = inventories[r["InventoryID"]]
        i["segs"].append((r["Phoneme"], r["SegmentClass"]))
        if r["SegmentClass"] == "tone":
            i["tones"] += 1
        meta[r["InventoryID"]] = (up(r["Glottocode"]), r["Source"], r["SpecificDialect"], r["Glottocode"])
    by_lang = defaultdict(list)
    for iid, (g, src, dialect, own) in meta.items():
        if g:
            # inventories of the language itself rank above those of its dialects
            by_lang[g].append((own != g, SOURCE_RANK.get(src, 9), iid, src, dialect))

    def representative(invs):
        # the best-ranked source, and within it the standard variety when one is
        # marked — Dutch must not inherit the tones of a Limburgish dialect
        best = [x for x in invs if x[:2] == invs[0][:2]]
        standard = [x for x in best if x[4] in ("NA", "") or "standard" in x[4].lower()]
        return standard or best

    phon = {}
    for g, invs in by_lang.items():
        invs.sort()
        main_inv = inventories[representative(invs)[0][2]]
        toned = sorted(x for x in invs if x[3] in TONE_SOURCES)
        tone_counts = [inventories[x[2]]["tones"] for x in representative(toned)] if toned else []
        segs = main_inv["segs"]
        phon[g] = {
            "segs": [p for p, cls in segs if cls != "tone"],
            "vowels": sum(1 for _, cls in segs if cls == "vowel"),
            "consonants": sum(1 for _, cls in segs if cls == "consonant"),
            "clicks": any(ch in CLICKS for x in invs for p, _ in inventories[x[2]]["segs"] for ch in p),
            "tones": max(tone_counts) if tone_counts else None,
        }

    # ── curated questions ─────────────────────────────────
    def yes_no(pid):
        return lambda g: {"1": "yes", "0": "no"}.get(gb.get(g, {}).get(pid))

    def order(g):
        v = gb.get(g, {})
        flags = [k for k, p in (("initial", "GB131"), ("medial", "GB132"), ("final", "GB133")) if v.get(p) == "1"]
        if not any(v.get(p) in ("0", "1") for p in ("GB131", "GB132", "GB133")):
            return None
        return flags[0] if len(flags) == 1 else "free"

    def numbase(g):
        v = gb.get(g, {})
        if not any(v.get(p) in ("0", "1") for p in ("GB333", "GB334", "GB335", "GB336")):
            return None
        for code, pid in (("tally", "GB336"), ("vigesimal", "GB335"), ("quinary", "GB334"), ("decimal", "GB333")):
            if v.get(pid) == "1":
                return code
        return "other"

    def tone(g):
        n = phon.get(g, {}).get("tones")
        return None if n is None else binned(n, [0, 2, 3, 5], ["none", "two", "three", "four5", "six"])

    curated = {
        "tone": (["none", "two", "three", "four5", "six"], tone),
        "vowels": (["v1", "v2", "v3", "v4", "v5"], lambda g: g in phon and binned(phon[g]["vowels"], [5, 8, 12, 18], ["v1", "v2", "v3", "v4", "v5"]) or None),
        "consonants": (["c1", "c2", "c3", "c4", "c5"], lambda g: g in phon and binned(phon[g]["consonants"], [15, 22, 30, 45], ["c1", "c2", "c3", "c4", "c5"]) or None),
        "clicks": (["yes", "no"], lambda g: None if g not in phon else ("yes" if phon[g]["clicks"] else "no")),
        "order": (["initial", "medial", "final", "free"], order),
        "gender": (["yes", "no"], yes_no("GB051")),
        "classifiers": (["yes", "no"], yes_no("GB057")),
        "articles": (["yes", "no"], yes_no("GB020")),
        "clusivity": (["yes", "no"], yes_no("GB028")),
        "numbase": (["decimal", "vigesimal", "quinary", "tally", "other"], numbase),
        "past": (["yes", "no"], yes_no("GB083")),
        "polite": (["yes", "no"], yes_no("GB415")),
        "evidential": (["yes", "no"], yes_no("GB323")),
    }
    langs = sorted(set(gb) | set(phon))
    out = {"langs": langs, "features": {}}
    for fid, (labels, fn) in curated.items():
        vals = [fn(g) for g in langs]
        out["features"][fid] = {"codes": labels, "values": "".join(str(labels.index(v)) if v else "." for v in vals)}
        print(f"{fid:12s} {sum(1 for v in vals if v):5d} languages", {l: vals.count(l) for l in labels}, file=sys.stderr)
    (OUT / "features.json").write_text(json.dumps(out, separators=(",", ":")))

    # ── everything, for specialists ───────────────────────
    gb_langs = sorted(gb)
    (OUT / "features-grambank.json").write_text(json.dumps({
        "params": [{**p, "codes": codes[p["id"]]} for p in params],
        "langs": gb_langs,
        "rows": ["".join(gb[g].get(p["id"], ".") for p in params) for g in gb_langs],
    }, ensure_ascii=False, separators=(",", ":")))
    seg_count = defaultdict(int)
    for p in phon.values():
        for s in set(p["segs"]):
            seg_count[s] += 1
    segs = sorted(seg_count, key=lambda s: -seg_count[s])
    index = {s: i for i, s in enumerate(segs)}
    ph_langs = sorted(phon)
    (OUT / "features-phoible.json").write_text(json.dumps({
        "segs": segs, "counts": [seg_count[s] for s in segs], "langs": ph_langs,
        "inv": [[index[s] for s in sorted(set(phon[g]["segs"]), key=index.get)] for g in ph_langs],
    }, ensure_ascii=False, separators=(",", ":")))
    print(len(langs), "languages with curated data;", len(gb_langs), "Grambank;", len(ph_langs), "PHOIBLE;", len(segs), "phonemes", file=sys.stderr)


if __name__ == "__main__":
    main()
