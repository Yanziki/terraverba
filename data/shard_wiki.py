"""Pack the prefetched Wikipedia summaries (one file per language, data/raw/wiki)
into 64 shards under public/data/wiki/, so a static host sees 64 files, not 8,000.
The shard of a glottocode is the sum of its character codes mod 64."""
import json, shutil
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).parent
SRC = HERE / "raw" / "wiki"
OUT = HERE.parent / "public" / "data" / "wiki"
SHARDS = 64


def shard(gid):
    return sum(map(ord, gid)) % SHARDS


def main():
    # first run: move the per-language files out of the published folder
    if not SRC.exists() and any(OUT.glob("*.json")) and not (OUT / "00.json").exists():
        shutil.move(str(OUT), str(SRC))
    packs = defaultdict(dict)
    # in a fixed order, so the packs come out the same on any machine
    for path in sorted(SRC.glob("*.json")):
        packs[shard(path.stem)][path.stem] = json.loads(path.read_text())
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("*.json"):
        old.unlink()
    for n in range(SHARDS):
        (OUT / f"{n:02d}.json").write_text(json.dumps(packs[n], ensure_ascii=False, separators=(",", ":")))
    print(sum(len(p) for p in packs.values()), "summaries in", SHARDS, "shards")


if __name__ == "__main__":
    main()
