"""Language similarity maps.

  vocabulary — ASJP v21 word lists (40 basic concepts): LDND, the mean
               normalised edit distance between translations of the same
               concept, divided by the distance between different concepts
               (so shared sound inventories alone do not count as similarity).
  grammar    — Grambank v1.0.3: share of the 195 grammatical features on which
               two languages differ, over the features both are coded for.

Each distance matrix is embedded with UMAP in 2D and 3D; the eight closest
languages are kept for the language panel.
Output: public/data/similarity-vocabulary.json, similarity-grammar.json
"""
import csv, json, sys, time
from collections import defaultdict
from pathlib import Path

import numpy as np
import umap
from rapidfuzz.distance import Levenshtein
from rapidfuzz.process import cdist

HERE = Path(__file__).parent
RAW = HERE / "raw"
OUT = HERE.parent / "public" / "data"
ASJP40 = [1, 2, 3, 11, 12, 18, 19, 21, 22, 23, 25, 28, 30, 31, 34, 39, 40, 41, 43, 44, 47, 48, 51, 53, 54, 57,
          58, 61, 66, 72, 74, 75, 77, 82, 85, 86, 92, 95, 96, 100]


def read_csv(path):
    with open(path, newline="", encoding="utf-8") as f:
        yield from csv.DictReader(f)


def language_level():
    """map any glottocode (incl. dialects) to the language-level code used by the site"""
    ours = {r[0] for r in json.loads((OUT / "languages.json").read_text())["rows"]}
    parent = {r["id"]: r["parent_id"] for r in read_csv(RAW / "languoid.csv")}

    def up(g):
        seen = 0
        while g and g not in ours and seen < 30:
            g, seen = parent.get(g), seen + 1
        return g if g in ours else None
    return up


def embed(D, ids, name):
    t = time.time()
    out = {"ids": ids}
    for dim in (2, 3):
        Y = umap.UMAP(n_components=dim, metric="precomputed", n_neighbors=20, min_dist=0.12,
                      random_state=7).fit_transform(D)
        Y = Y - np.median(Y, 0)
        Y /= np.percentile(np.abs(Y), 99)
        Y = np.clip(Y, -1.15, 1.15)
        out[f"p{dim}"] = np.round(Y, 3).flatten().tolist()
    order = np.argsort(D, axis=1)[:, 1:9]
    out["nn"] = order.astype(int).flatten().tolist()
    out["nd"] = np.round(np.take_along_axis(D, order, 1), 3).flatten().tolist()
    (OUT / f"similarity-{name}.json").write_text(json.dumps(out, separators=(",", ":")))
    print(name, len(ids), "languages embedded in", round(time.time() - t), "s", file=sys.stderr)


# ASJP files some word lists under a broader language than Glottolog, whose
# finer split the site follows: Hainanese and Leizhou under Min Nan, Wenzhou
# (Oujiang) under Wu. These doculects belong to the finer language.
DOCULECT = {
    "MIN_HAINAN": "hain1238", "MIN_HAINAN_TUNCHANG": "hain1238", "HAINAN_MINNAN_CHINESE": "hain1238",
    "MIN_LEIZHOU": "leiz1236",
    "WU_WENZHOU": "ouji1238", "WU_WENZHOU_YONGJIA": "ouji1238", "WU_WENZHOU_PINGYANG": "ouji1238",
}


def vocabulary(up):
    forms = defaultdict(dict)
    for f in read_csv(RAW / "asjp" / "forms.csv"):
        c = int(f["Parameter_ID"])
        if c in ASJP40 and f["Form"]:
            w = f["Form"].translate(str.maketrans("", "", '*"~$')).replace(" ", "")
            forms[f["Language_ID"]].setdefault(c, w)
    # one word list per language: the most complete doculect
    best = {}
    for d in read_csv(RAW / "asjp" / "languages.csv"):
        g = DOCULECT.get(d["ID"]) or up(d["Glottocode"])
        if not g or d["long_extinct"] == "True":
            continue
        if len(forms[d["ID"]]) >= 28 and len(forms[d["ID"]]) > len(best.get(g, {})):
            best[g] = forms[d["ID"]]
    ids = sorted(best)
    n = len(ids)
    print("vocabulary:", n, "languages", file=sys.stderr)
    same, same_n = np.zeros((n, n), np.float32), np.zeros((n, n), np.uint8)
    diff, diff_n = np.zeros((n, n), np.float32), np.zeros((n, n), np.uint16)
    words = {c: [best[g].get(c) for g in ids] for c in ASJP40}

    def compare(ca, cb, acc, cnt):
        a_idx = [i for i, w in enumerate(words[ca]) if w]
        b_idx = [i for i, w in enumerate(words[cb]) if w]
        M = cdist([words[ca][i] for i in a_idx], [words[cb][i] for i in b_idx],
                  scorer=Levenshtein.normalized_distance, dtype=np.float32, workers=-1)
        acc[np.ix_(a_idx, b_idx)] += M
        cnt[np.ix_(a_idx, b_idx)] += 1

    for k, c in enumerate(ASJP40):
        compare(c, c, same, same_n)
        # background: the same pair compared on mismatched concepts
        for shift in (7, 19):
            compare(c, ASJP40[(k + shift) % len(ASJP40)], diff, diff_n)
        print("  concept", k + 1, "/", len(ASJP40), file=sys.stderr, flush=True)
    ldn = same / np.maximum(same_n, 1)
    background = diff / np.maximum(diff_n, 1)
    background = (background + background.T) / 2
    D = ldn / np.maximum(background, 1e-3)
    D = (D + D.T) / 2
    D[same_n < 20] = 1.2  # too little shared material to compare
    np.fill_diagonal(D, 0)
    embed(D.astype(np.float64), ids, "vocabulary")


def grammar(up):
    params = sorted({v["Parameter_ID"] for v in read_csv(RAW / "grambank" / "values.csv")})
    col = {p: i for i, p in enumerate(params)}
    rows = defaultdict(lambda: np.full(len(params), -1, np.int8))
    coded = defaultdict(int)
    for v in read_csv(RAW / "grambank" / "values.csv"):
        g = up(v["Language_ID"])
        if g and v["Value"] not in ("?", ""):
            r = rows[g]
            if r[col[v["Parameter_ID"]]] == -1:
                r[col[v["Parameter_ID"]]] = int(v["Value"])
                coded[g] += 1
    ids = sorted(g for g in rows if coded[g] >= 60)
    X = np.stack([rows[g] for g in ids])
    known = (X >= 0).astype(np.float32)
    shared = known @ known.T
    differ = np.zeros_like(shared)
    for value in range(int(X.max()) + 1):
        eq = (X == value).astype(np.float32)
        differ += eq @ (known - eq).T
    D = differ / np.maximum(shared, 1)
    D[shared < 40] = 1.0
    D = (D + D.T) / 2
    np.fill_diagonal(D, 0)
    print("grammar:", len(ids), "languages,", len(params), "features", file=sys.stderr)
    embed(D.astype(np.float64), ids, "grammar")


if __name__ == "__main__":
    up = language_level()
    grammar(up)
    vocabulary(up)
