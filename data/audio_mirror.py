"""Copy every recording the site plays (public/data/audio.json and
story-audio.json) to a mirror of our own, so they load reliably wherever the
reader is. The mirror keeps Commons' relative path (<h>/<hh>/<File_name>
plus .mp3 unless it already is one), so the player builds either address from
the same entry; it is published as its own Cloudflare Pages project
(audio.<domain>, see src/audio.js and tools/deploy/README.md).

  audio_mirror.py fetch [k/n]   download the original files, share k of n
                                (run shares on different machines to go faster)
  audio_mirror.py convert       make the MP3s (ffmpeg): mono, 64 kbit/s
Both are resumable. Wikimedia rate-limits by address: the fetch goes slowly,
names the site in its User-Agent, and waits as long as a 429 asks.
Output: raw/audio-originals/, raw/audio-mirror/
"""
import json, subprocess, sys, time, urllib.error, urllib.parse, urllib.request
from pathlib import Path

HERE = Path(__file__).parent
PUB = HERE.parent / "public" / "data"
ORIG = HERE / "raw" / "audio-originals"
OUT = HERE / "raw" / "audio-mirror"
UA = {"User-Agent": "Terraverba/1.0 (https://terraverba.org; world language atlas, mirroring CC-licensed pronunciation recordings it credits)"}


def entries():
    a = json.loads((PUB / "audio.json").read_text())["words"]
    s = json.loads((PUB / "story-audio.json").read_text())
    seen = {}
    for e in [e for m in a.values() for e in m.values()] + list(s.values()):
        seen[e[0]] = e
    return sorted(seen.values())


def where(e):
    name = e[0].replace(" ", "_")
    h = e[1]
    url = f"https://upload.wikimedia.org/wikipedia/commons/{h[0]}/{h}/{urllib.parse.quote(name, safe=chr(39) + '!*()')}"
    mp3 = OUT / h[0] / h / (name if name.lower().endswith(".mp3") else f"{name}.mp3")
    return url, ORIG / h[0] / h / name, mp3


def fetch(share):
    k, n = (int(x) for x in share.split("/")) if share else (0, 1)
    todo = [(e, *where(e)) for i, e in enumerate(entries()) if i % n == k]
    todo = [t for t in todo if not t[2].exists() and not t[3].exists()]
    print(len(todo), "to fetch", file=sys.stderr, flush=True)
    pace, failed = 2.0, []
    for i, (e, url, orig, _) in enumerate(todo):
        for attempt in range(8):
            try:
                with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90) as r:
                    body = r.read()
                orig.parent.mkdir(parents=True, exist_ok=True)
                orig.write_bytes(body)
                pace = max(2.0, pace * 0.9)
                break
            except urllib.error.HTTPError as err:
                if err.code == 404:
                    failed.append((e[0], 404))
                    break
                wait = int(err.headers.get("Retry-After") or 0) or 60 * (attempt + 1)
                pace = min(10.0, pace * 1.5)
                print(f"  {err.code}, waiting {wait}s", file=sys.stderr, flush=True)
                time.sleep(wait)
            except Exception:
                time.sleep(15 * (attempt + 1))
        else:
            failed.append((e[0], "gave up"))
        if i % 100 == 0:
            print(f"{i}/{len(todo)} (pace {pace:.1f}s)", file=sys.stderr, flush=True)
        time.sleep(pace)
    print("failed:", len(failed), failed[:20], file=sys.stderr)


def convert():
    from concurrent.futures import ThreadPoolExecutor

    def one(e):
        _, orig, mp3 = where(e)
        mp3.parent.mkdir(parents=True, exist_ok=True)
        r = subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(orig), "-vn", "-ac", "1", "-ar", "44100", "-b:a", "64k", str(mp3)])
        if r.returncode:
            mp3.unlink(missing_ok=True)
            print("  could not convert", orig.name, file=sys.stderr)
        return not r.returncode

    todo = [e for e in entries() if not where(e)[2].exists() and where(e)[1].exists()]
    with ThreadPoolExecutor(8) as pool:
        results = list(pool.map(one, todo))
    done, bad = sum(results), len(results) - sum(results)
    # served as they are, from any page, cached for good; not for search engines
    (OUT / "_headers").write_text("/*\n  Access-Control-Allow-Origin: *\n  Cache-Control: public, max-age=31536000, immutable\n  X-Robots-Tag: noindex\n")
    (OUT / "robots.txt").write_text("User-agent: *\nDisallow: /\n")
    files = list(OUT.rglob("*.mp3"))
    have = sum(1 for e in entries() if where(e)[2].exists())
    print(f"converted {done}, failed {bad}; mirror has {have} of {len(entries())} recordings, "
          f"{round(sum(f.stat().st_size for f in files) / 1e6, 1)} MB", file=sys.stderr)


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "fetch"
    fetch(sys.argv[2] if len(sys.argv) > 2 else None) if cmd == "fetch" else convert()
