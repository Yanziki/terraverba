"""Fetch the author and licence of each matched recording from Wikimedia
Commons (50 files a request, slowly: requests without a contact address are
rate-limited). Results are cached, so a re-run only asks about new files.
Output: raw/wiktionary/audio_meta.json  {file: [author, licence] | null}
Also each file's current title, which is what the upload.wikimedia.org path is
built from: Commons capitalises the first letter (zh-xièxie.ogg is really
Zh-xièxie.ogg) and some files were renamed, leaving the old name a redirect
(Ja-ありがとう.oga → Ja-arigato.oga).
Output: raw/wiktionary/audio_titles.json  {file: current title | null if gone}
"""
import html, json, re, sys, time, urllib.parse, urllib.request
from pathlib import Path

HERE = Path(__file__).parent
RAW = HERE / "raw" / "wiktionary"
CACHE = RAW / "audio_meta.json"
TITLES = RAW / "audio_titles.json"
API = "https://commons.wikimedia.org/w/api.php"
UA = "Terraverba/0.1 (world language atlas; attribution lookup for pronunciation recordings)"


def plain(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s or "")).strip()


def fetch(files):
    q = urllib.parse.urlencode({"action": "query", "format": "json", "prop": "imageinfo", "iiprop": "extmetadata",
                                "iiextmetadatafilter": "Artist|LicenseShortName", "titles": "|".join(f"File:{f}" for f in files)})
    req = urllib.request.Request(f"{API}?{q}", headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.load(r)
    out = {}
    # titles come back normalised (underscores → spaces); map them to ours
    norm = {n["to"]: n["from"] for n in data.get("query", {}).get("normalized", [])}
    for page in data.get("query", {}).get("pages", {}).values():
        title = norm.get(page["title"], page["title"]).removeprefix("File:")
        info = (page.get("imageinfo") or [{}])[0].get("extmetadata", {})
        out[title] = [plain(info.get("Artist", {}).get("value")), plain(info.get("LicenseShortName", {}).get("value"))] if info else None
    return out


def current_titles(files):
    q = urllib.parse.urlencode({"action": "query", "format": "json", "redirects": 1, "titles": "|".join(f"File:{f}" for f in files)})
    req = urllib.request.Request(f"{API}?{q}", headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.load(r).get("query", {})
    norm = {n["from"]: n["to"] for n in data.get("normalized", [])}
    redirect = {n["from"]: n["to"] for n in data.get("redirects", [])}
    gone = {p["title"] for p in data.get("pages", {}).values() if "missing" in p}
    out = {}
    for f in files:
        t = norm.get(f"File:{f}", f"File:{f}")
        t = redirect.get(t, t)
        out[f] = None if t in gone else t.removeprefix("File:")
    return out


def titles(files):
    cache = json.loads(TITLES.read_text()) if TITLES.exists() else {}
    todo = sorted(set(files) - set(cache))
    print(len(todo), "titles to check", file=sys.stderr)
    for i in range(0, len(todo), 50):
        batch = todo[i:i + 50]
        for attempt in range(4):
            try:
                cache.update(current_titles(batch))
                break
            except Exception as e:  # rate limit or network: wait and retry
                print("retry", attempt, e, file=sys.stderr)
                time.sleep(30 * (attempt + 1))
        TITLES.write_text(json.dumps(cache, ensure_ascii=False))
        time.sleep(2)
    moved = sum(1 for f in files if cache.get(f) and cache[f] != f.replace("_", " "))
    print(f"titles: {moved} renamed or recapitalised, {sum(1 for f in files if f in cache and cache[f] is None)} gone", file=sys.stderr)


def main():
    matched = json.loads((RAW / "audio_matched.json").read_text())
    if (RAW / "audio_ll.json").exists():  # Lingua Libre's, from audio_lingualibre.py
        matched += json.loads((RAW / "audio_ll.json").read_text())
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    todo = sorted({m[3] for m in matched} - set(cache))
    print(len(todo), "files to look up", file=sys.stderr)
    for i in range(0, len(todo), 50):
        batch = todo[i:i + 50]
        for attempt in range(4):
            try:
                got = fetch(batch)
                break
            except Exception as e:  # rate limit or network: wait and retry
                print("retry", attempt, e, file=sys.stderr)
                time.sleep(30 * (attempt + 1))
        else:
            continue
        for f in batch:
            cache[f] = got.get(f.replace("_", " "), got.get(f))
        CACHE.write_text(json.dumps(cache, ensure_ascii=False))
        print(f"{i + len(batch)}/{len(todo)}", file=sys.stderr, flush=True)
        time.sleep(7)
    licences = {}
    for v in cache.values():
        if v:
            licences[v[1]] = licences.get(v[1], 0) + 1
    print("licences:", sorted(licences.items(), key=lambda kv: -kv[1])[:12], file=sys.stderr)
    titles(sorted({m[3] for m in matched}))


if __name__ == "__main__":
    main()
