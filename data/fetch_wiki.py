"""Pre-fetch Wikipedia lead sections (zh, en) for every language and group with
a sitelink, so the site never depends on reaching Wikipedia at runtime.
Output: public/data/wiki/<glottocode>.json (text is CC BY-SA 4.0).

Uses the batched Action API (20 extracts per request) and stays under the
10 requests/minute allowed to clients without contact details. Resumable:
finished (lang, id) pairs are recorded in raw/wiki_done.json.
Chinese text is converted to simplified script afterwards (to_simplified.py).
"""
import json, sys, time, urllib.parse, urllib.request
from pathlib import Path

HERE = Path(__file__).parent
OUT = HERE / "raw" / "wiki"  # packed into public/data/wiki by shard_wiki.py
DONE = HERE / "raw" / "wiki_done.json"
UA = "TerraverbaAtlas/0.1 (educational, non-commercial) python-urllib"
PAUSE = 6.5  # seconds between requests


def query(lang, titles):
    params = {"action": "query", "prop": "extracts", "exintro": 1, "explaintext": 1, "exlimit": 20,
              "redirects": 1, "format": "json", "formatversion": 2, "titles": "|".join(titles)}
    url = f"https://{lang}.wikipedia.org/w/api.php?" + urllib.parse.urlencode(params)
    for attempt in range(8):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60) as r:
                return json.load(r)["query"]
        except urllib.error.HTTPError as e:
            wait = float(e.headers.get("Retry-After") or 0) or 30 * (attempt + 1)
            print(f"  {e.code}, waiting {wait:.0f}s", file=sys.stderr, flush=True)
            time.sleep(min(wait, 600))
        except Exception as e:
            print("  error", e, file=sys.stderr, flush=True)
            time.sleep(20)
    raise SystemExit("giving up")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    titles = json.loads((HERE / "raw" / "wiki_titles.json").read_text())
    done = set(map(tuple, json.loads(DONE.read_text()))) if DONE.exists() else set()
    for lang, col in (("zh", 0), ("en", 1)):
        todo = [(gid, t[col]) for gid, t in titles.items() if t[col] and (lang, gid) not in done]
        print(lang, len(todo), "to fetch", file=sys.stderr, flush=True)
        for i in range(0, len(todo), 20):
            batch = todo[i:i + 20]
            q = query(lang, [t for _, t in batch])
            # follow normalisation and redirects back to the requested title
            alias = {}
            for step in ("normalized", "redirects"):
                for m in q.get(step, []):
                    alias[m["from"]] = m["to"]
            pages = {p["title"]: p for p in q.get("pages", [])}
            for gid, title in batch:
                t = title.replace("_", " ")
                for _ in range(3):
                    t = alias.get(t, t)
                p = pages.get(t)
                if p and p.get("extract", "").strip():
                    path = OUT / f"{gid}.json"
                    entry = json.loads(path.read_text()) if path.exists() else {}
                    entry[lang] = {"title": p["title"], "text": p["extract"].strip(),
                                   "url": f"https://{lang}.wikipedia.org/wiki/{urllib.parse.quote(p['title'].replace(' ', '_'))}"}
                    path.write_text(json.dumps(entry, ensure_ascii=False, separators=(",", ":")))
                done.add((lang, gid))
            DONE.write_text(json.dumps(sorted(done)))
            print(f"{lang} {i + len(batch)}/{len(todo)}", file=sys.stderr, flush=True)
            time.sleep(PAUSE)
    print("finished", len(list(OUT.glob("*.json"))), "files", file=sys.stderr)


if __name__ == "__main__":
    main()
