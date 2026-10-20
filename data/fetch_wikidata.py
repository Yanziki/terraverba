"""Fetch names (in every interface language), native names, speaker counts and
Wikipedia titles for every Wikidata item that carries a Glottolog code (P1394),
plus country names. Output: raw/wikidata.json, raw/countries.json"""
import json, sys, time, urllib.parse, urllib.request
from pathlib import Path

HERE = Path(__file__).parent
OUT = HERE / "raw" / "wikidata.json"
COUNTRIES = HERE / "raw" / "countries.json"

LABEL_LANGS = ["en", "zh", "zh-hans", "zh-cn", "zh-hant", "zh-tw", "zh-hk", "ja", "ko", "es", "fr", "de", "pt", "ru"]
WIKIS = ["en", "zh", "ja", "ko", "es", "fr", "de", "pt", "ru"]
langs = ", ".join(f'"{l}"' for l in LABEL_LANGS)
wikis = " ".join(f"<https://{w}.wikipedia.org/>" for w in WIKIS)

QUERIES = {
    "labels": f"""SELECT ?item ?glotto ?l WHERE {{ ?item wdt:P1394 ?glotto ; rdfs:label ?l .
                  FILTER(LANG(?l) IN ({langs})) }}""",
    "speakers": """SELECT ?item ?glotto ?speakers WHERE { ?item wdt:P1394 ?glotto ; wdt:P1098 ?speakers . }""",
    "native": """SELECT ?item ?glotto ?n WHERE { ?item wdt:P1394 ?glotto ; wdt:P1705 ?n . }""",
    "sitelinks": f"""SELECT ?item ?glotto ?page ?wiki WHERE {{ ?item wdt:P1394 ?glotto . ?page schema:about ?item ;
                  schema:isPartOf ?wiki . VALUES ?wiki {{ {wikis} }} }}""",
    "countries": f"""SELECT ?c ?a2 ?l WHERE {{ ?c wdt:P297 ?a2 . ?c rdfs:label ?l . FILTER(LANG(?l) IN ({langs})) }}""",
}


def run(query):
    body = urllib.parse.urlencode({"query": query, "format": "json"}).encode()
    req = urllib.request.Request("https://query.wikidata.org/sparql", data=body, headers={
        "User-Agent": "TerraverbaAtlas/0.2 (educational, non-commercial)",
        "Content-Type": "application/x-www-form-urlencoded"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                return json.load(r)["results"]["bindings"]
        except Exception as e:
            print("retry", attempt, e, file=sys.stderr)
            time.sleep(10 * (attempt + 1))
    raise SystemExit("wikidata query failed")


def main():
    by_code = {}

    def entry(b):
        return by_code.setdefault(b["glotto"]["value"], {"qid": b["item"]["value"].rsplit("/", 1)[1], "labels": {}, "wiki": {}})

    for b in run(QUERIES["labels"]):
        entry(b)["labels"].setdefault(b["l"]["xml:lang"], b["l"]["value"])
    for b in run(QUERIES["speakers"]):
        e = entry(b)
        try:
            # several statements (by year, by source) — keep the largest as a rough figure
            e["speakers"] = max(e.get("speakers", 0), int(float(b["speakers"]["value"])))
        except ValueError:
            pass
    for b in run(QUERIES["native"]):
        e = entry(b)
        if b["n"]["value"] not in e.setdefault("native", []):
            e["native"].append(b["n"]["value"])
    for b in run(QUERIES["sitelinks"]):
        wiki = b["wiki"]["value"].split("//")[1].split(".")[0]
        title = urllib.parse.unquote(b["page"]["value"].rsplit("/wiki/", 1)[1])
        entry(b)["wiki"].setdefault(wiki, title)
    OUT.write_text(json.dumps(by_code, ensure_ascii=False))

    countries = {}
    for b in run(QUERIES["countries"]):
        countries.setdefault(b["a2"]["value"], {}).setdefault(b["l"]["xml:lang"], b["l"]["value"])
    COUNTRIES.write_text(json.dumps(countries, ensure_ascii=False))
    print(f"{len(by_code)} glottocodes, {len(countries)} countries", file=sys.stderr)


if __name__ == "__main__":
    main()
