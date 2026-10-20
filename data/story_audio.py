"""Recordings for the words in the stories' tables, so a reader can hear te
and cha, saudade and 눈치. Each table cell is looked up, in order:
  1. by concept, in the word map's recordings (public/data/audio.json)
  2. by its spelling, in the all-languages Wiktionary extract (kaikki.org)
  3. by its spelling, in Lingua Libre (lingualibre.org)
  4. a Commons file with the conventional name, if one was found by probing
then the file's author, licence and current title come from Wikimedia Commons;
only freely licensed recordings are kept.
Output: public/data/story-audio.json
  {"story.chapter.row" | "story.chapter.row.column": [file, md5 prefix, author, licence, word]}
"""
import gzip, hashlib, json, re, sys, time, urllib.parse
from pathlib import Path

from audio_meta import fetch as commons_meta, current_titles
from audio_lingualibre import sparql, lit, LL
from audio_build import NOT_A_WORD

HERE = Path(__file__).parent
PUB = HERE.parent / "public" / "data"
KAIKKI = HERE / "raw" / "kaikki-all" / "raw-wiktextract-data.jsonl.gz"
CACHE = HERE / "raw" / "wiktionary" / "story_audio_cache.json"
OUT = PUB / "story-audio.json"
FREE = re.compile(r"^(CC|Public domain|PD)", re.I)

# (cell, glottocode, Wiktionary language codes, spellings to look for, word-map concept)
# Chinese varieties share the code zh; the sound's tags say which one (ZH_TAGS).
SPEC = []
def rows(story, ch, cells, concept=None):
    for i, cell in enumerate(cells):
        g, codes, words = cell[:3]
        SPEC.append((f"{story}.{ch}.{i}", g, codes, words, cell[3] if len(cell) > 3 else concept))

TEA_HOKKIEN = ("minn1241", ["zh", "nan"], ["茶"])
rows("tea", 0, [TEA_HOKKIEN, ("mand1415", ["zh"], ["茶"]), ("yuec1235", ["zh", "yue"], ["茶"])], "tea")
rows("tea", 1, [TEA_HOKKIEN, ("dutc1256", ["nl"], ["thee"]), ("stan1293", ["en"], ["tea"]), ("stan1290", ["fr"], ["thé"]),
                ("stan1295", ["de"], ["Tee"]), ("stan1288", ["es"], ["té"]), ("stan1306", ["ms"], ["teh"]),
                ("java1254", ["jv"], ["tèh", "teh"]), ("sinh1246", ["si"], ["තේ"])], "tea")
rows("tea", 2, [("west2369", ["fa"], ["چای"]), ("stan1318", ["ar"], ["شاي", "شَاي"]), ("nucl1301", ["tr"], ["çay"]),
                ("russ1263", ["ru"], ["чай"]), ("hind1269", ["hi"], ["चाय"]), ("swah1253", ["sw"], ["chai"]),
                ("tibe1272", ["bo"], ["ཇ", "ཇ་"]), ("halh1238", ["mn"], ["цай"]), ("mode1248", ["el"], ["τσάι"])], "tea")
rows("tea", 3, [("port1283", ["pt"], ["chá"]), ("nucl1643", ["ja"], ["茶", "お茶"]), ("kore1280", ["ko"], ["차"]),
                ("poli1260", ["pl"], ["herbata"])], "tea")
rows("austronesian", 4, [("amis1246", ["ami"], ["lima"]), ("paiw1248", ["pwn"], ["lima"]), ("taga1270", ["tl"], ["lima"]),
                         ("stan1306", ["ms"], ["lima"]), ("java1254", ["jv"], ["lima"]), ("plat1254", ["mg"], ["dimy"]),
                         ("fiji1243", ["fj"], ["lima"]), ("samo1305", ["sm"], ["lima"]), ("hawa1245", ["haw"], ["lima"]),
                         ("maor1246", ["mi"], ["rima"]), ("tahi1242", ["ty"], ["pae"])], "five")
rows("indo-european", 0, [("sans1269", ["sa"], ["मातृ"]), ("lati1261", ["la"], ["māter", "mater"]), ("anci1242", ["grc"], ["μήτηρ"]),
                          ("oldi1245", ["sga"], ["máthir"]), ("russ1263", ["ru"], ["мать"]), ("west2369", ["fa"], ["مادر"]),
                          ("tokh1243", [], []), ("stan1293", ["en"], ["mother"])], "mother")
# columns: Latin, English
for i, (la, en, concept) in enumerate([(["pater"], "father", "father"), (["piscis"], "fish", "fish"), (["pēs", "pes"], "foot", None),
                                       (["trēs", "tres"], "three", "three"), (["centum"], "hundred", "hundred"), (["cornū", "cornu"], "horn", None)]):
    SPEC.append((f"indo-european.1.{i}.0", "lati1261", ["la"], la, None))
    SPEC.append((f"indo-european.1.{i}.1", "stan1293", ["en"], [en], concept))
for i, w in enumerate(["mtu", "watu", "kitabu", "vitabu"]):
    SPEC.append((f"africa.2.{i}.0", "swah1253", ["sw"], [w], None))
for i, (en, nah, concept) in enumerate([("tomato", "tomatl", "tomato"), ("avocado", "āhuacatl", None), ("chilli", "chīlli", None), ("coyote", "coyōtl", None)]):
    SPEC.append((f"americas.3.{i}.0", "stan1293", ["en"], [en, "chili"] if en == "chilli" else [en], concept))
    SPEC.append((f"americas.3.{i}.1", "clas1250", ["nci", "nah"], [nah], None))
for i, (concept, eu, es, fr) in enumerate([("one", "bat", "uno", "un"), ("two", "bi", "dos", "deux"), ("three", "hiru", "tres", "trois"),
                                           ("four", "lau", "cuatro", "quatre"), ("five", "bost", "cinco", "cinq")]):
    for j, (g, code, w) in enumerate([("basq1248", "eu", eu), ("stan1288", "es", es), ("stan1290", "fr", fr)]):
        SPEC.append((f"isolates.0.{i}.{j}", g, [code], [w], concept))
rows("sinitic", 1, [("mand1415", ["zh"], ["人"]), ("wuch1236", ["zh", "wuu"], ["人"]), ("yuec1235", ["zh", "yue"], ["人"]),
                    ("minn1241", ["zh", "nan"], ["人"]), ("hakk1236", ["zh", "hak"], ["人"])], "person")
for i, ch in enumerate(["十", "日", "一", "六", "八", "白"]):
    concept = {"一": "one", "十": "ten", "白": "white"}.get(ch)
    SPEC.append((f"sinitic.2.{i}.0", "mand1415", ["zh"], [ch], concept))
    SPEC.append((f"sinitic.2.{i}.1", "yuec1235", ["zh", "yue"], [ch], concept))
rows("untranslatable", 0, [("port1283", ["pt"], ["saudade"]), ("wels1247", ["cy"], ["hiraeth"]), ("russ1263", ["ru"], ["тоска"]),
                           ("stan1295", ["de"], ["Sehnsucht"])])
rows("untranslatable", 1, [("dani1285", ["da"], ["hygge"]), ("dutc1256", ["nl"], ["gezellig"]), ("swed1254", ["sv"], ["lagom"]),
                           ("swed1254", ["sv"], ["fika"])])
rows("untranslatable", 2, [("kore1280", ["ko"], ["눈치"]), ("west2369", ["fa"], ["تعارف"]), ("zulu1248", ["zu"], ["ubuntu"]),
                           ("mand1415", ["zh"], ["緣分", "缘分"]), ("taga1270", ["tl"], ["kilig"])])
rows("untranslatable", 3, [("stan1288", ["es"], ["sobremesa"]), ("nucl1643", ["ja"], ["積ん読", "積読"]), ("indo1316", ["id"], ["jam karet"]),
                           ("hind1269", ["hi"], ["जुगाड़", "जुगाड"])])
rows("untranslatable", 4, [("nucl1643", ["ja"], ["木漏れ日"]), ("nucl1301", ["tr"], ["yakamoz"]), ("finn1318", ["fi"], ["poronkusema"])])
rows("untranslatable", 5, [("east2534", ["iu"], ["aput"]), ("east2534", ["iu"], ["qana"]), ("east2534", ["iu"], ["piqsirpoq"]),
                           ("east2534", ["iu"], ["qimuqsuq"]), ("yama1264", ["yag"], ["mamihlapinatapai"])])

# Chinese entries carry one sound per variety, told apart by tags
ZH_TAGS = {"cmn": {"Mandarin", "Standard-Chinese", "Beijing", "Taiwan"}, "yue": {"Cantonese", "Guangzhou", "Hong-Kong"},
           "nan": {"Hokkien", "Taiwanese-Hokkien", "Xiamen", "Min-Nan"}, "hak": {"Hakka"}, "wuu": {"Wu", "Shanghainese"}}
VARIETY_OF = {"mand1415": "cmn", "yuec1235": "yue", "minn1241": "nan", "hakk1236": "hak", "wuch1236": "wuu"}


def wiktionary(todo):
    """{(glottocode, word): [file, …]} for the words still without a recording"""
    want = {}
    for key, g, codes, words, _ in todo:
        for w in words:
            want.setdefault(w, set()).update((c, g) for c in codes)
    found = {}
    with gzip.open(KAIKKI, "rt", encoding="utf-8") as f:
        for n, line in enumerate(f):
            if n % 1_000_000 == 0:
                print(n, "entries", file=sys.stderr, flush=True)
            if '"ogg_url"' not in line and '"mp3_url"' not in line:
                continue
            e = json.loads(line)
            w = e.get("word")
            if w not in want:
                continue
            for code, g in want[w]:
                if e.get("lang_code") != code:
                    continue
                for s in e.get("sounds", []):
                    if not s.get("audio"):
                        continue
                    tags = set(s.get("tags", []) + s.get("raw_tags", []))
                    if code == "zh" and not (tags & ZH_TAGS.get(VARIETY_OF.get(g, ""), set())):
                        continue
                    found.setdefault(f"{g}|{w}", []).append(s["audio"])
    return found


def lingualibre(todo):
    L = json.loads((PUB / "languages.json").read_text())
    iso = {r[0]: dict(zip(L["fields"], r))["iso"] for r in L["rows"]}
    rows_ = sparql(f"SELECT ?lang ?iso WHERE {{ ?lang <{LL}P2> <https://lingualibre.org/entity/Q4> ; <{LL}P13> ?iso }}")
    items = {}
    for r in rows_:
        items.setdefault(r["iso"]["value"], []).append(r["lang"]["value"])
    extra = {"zh": ["cmn"], "minn1241": ["nan"], "yuec1235": ["yue"], "hakk1236": ["hak"], "wuch1236": ["wuu"], "stan1306": ["zsm", "msa"], "stan1318": ["arb", "ara"], "west2369": ["pes", "fas"]}
    found = {}
    for key, g, codes, words, _ in todo:
        langs = [it for code in [iso.get(g)] + extra.get(g, []) if code for it in items.get(code, [])]
        for item in langs:
            got = sparql(f"""SELECT ?t ?file WHERE {{ ?r <{LL}P2> <https://lingualibre.org/entity/Q2> ; <{LL}P4> <{item}> ;
                <{LL}P7> ?t ; <{LL}P3> ?file . VALUES ?t {{ {" ".join(lit(w) for w in words)} }} }}""")
            time.sleep(1)
            for h in got:
                found.setdefault(f"{g}|{h['t']['value']}", []).append(urllib.parse.unquote(h["file"]["value"].rsplit("/", 1)[1]))
    return found


def main():
    audio = json.loads((PUB / "audio.json").read_text())["words"]
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    out = {}
    # 1. the word map's own recordings, already checked and credited
    for key, g, codes, words, concept in SPEC:
        e = audio.get(concept, {}).get(g) if concept else None
        if e and not NOT_A_WORD.match(e[0]):
            out[key] = e
    todo = [s for s in SPEC if s[0] not in out and s[3]]
    print(len(out), "from the word map;", len(todo), "to look up", file=sys.stderr)
    # 2–3. by spelling: Wiktionary, then Lingua Libre (cached; delete the cache to ask again)
    if "wiktionary" not in cache:
        cache["wiktionary"] = wiktionary(todo)
        CACHE.write_text(json.dumps(cache, ensure_ascii=False))
    if "lingualibre" not in cache:
        cache["lingualibre"] = lingualibre(todo)
        CACHE.write_text(json.dumps(cache, ensure_ascii=False))
    pick = {}
    for key, g, codes, words, _ in todo:
        for w in words:
            files = cache["wiktionary"].get(f"{g}|{w}") or cache["lingualibre"].get(f"{g}|{w}")
            files = [f for f in files or [] if not NOT_A_WORD.match(f)]
            if files:
                pick[key] = (files[0], w)
                break
    # Commons files named in the usual way ("Pl-herbata.ogg") that neither links to,
    # found by probing those titles (raw/wiktionary/story_audio_commons.json)
    probed = HERE / "raw" / "wiktionary" / "story_audio_commons.json"
    for key, hits in (json.loads(probed.read_text()) if probed.exists() else {}).items():
        if key not in pick and key not in out:
            pick[key] = tuple(hits[0])
    # 4. author, licence and current title from Commons
    files = sorted({f for f, _ in pick.values()})
    meta, titles = {}, {}
    for i in range(0, len(files), 40):
        batch = files[i:i + 40]
        got = commons_meta(batch)
        for f in batch:
            meta[f] = got.get(f.replace("_", " "), got.get(f))
        titles.update(current_titles(batch))
        time.sleep(3)
    skipped = {}
    for key, (file, word) in pick.items():
        m = meta.get(file)
        if not m or not FREE.match(m[1] or "") or titles.get(file) is None:
            skipped[key] = (m or [None, "missing"])[1]
            continue
        name = (titles.get(file) or file).replace(" ", "_")
        h = hashlib.md5(name.encode()).hexdigest()[:2]
        author = re.sub(r"\s+", " ", m[0] or "").strip()
        sp = re.match(r"Speaker:\s*(.+?)\s*(Recorder:.*)?$", author)
        out[key] = [name.replace("_", " "), h, (sp.group(1) if sp else author)[:80] or "—", m[1], word]
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
    missing = [s[0] for s in SPEC if s[0] not in out]
    print(f"{len(out)} of {len(SPEC)} cells have a recording; skipped {skipped}", file=sys.stderr)
    print("none for:", missing, file=sys.stderr)


if __name__ == "__main__":
    main()
