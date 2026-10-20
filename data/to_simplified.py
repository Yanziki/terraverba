"""Convert the Chinese Wikipedia extracts in public/data/wiki/ to simplified script."""
import json
from pathlib import Path

import opencc

t2s = opencc.OpenCC("t2s").convert
for path in (Path(__file__).parent / "raw" / "wiki").glob("*.json"):
    entry = json.loads(path.read_text())
    if "zh" in entry:
        entry["zh"]["text"] = t2s(entry["zh"]["text"])
        entry["zh"]["title"] = t2s(entry["zh"]["title"])
        path.write_text(json.dumps(entry, ensure_ascii=False, separators=(",", ":")))
