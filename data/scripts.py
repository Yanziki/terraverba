"""The scripts each language is written in, and where each one is used.

Sources, in order of trust:
  1. CURATED below, for languages written in several scripts in different
     places (a reader asked for Kazakh: Cyrillic, Latin, and Arabic in China).
  2. Unicode CLDR (data/raw/cldr, Unicode licence): the likely script of each
     language first, then the others it lists, with the countries where each
     non-default script is the usual one (kk_Arab in China).
  3. Wikidata's "writing system" (P282) for languages CLDR does not cover,
     skipping statements with an end date (Tatar's 1930s Latin alphabet).
  4. The script of the language's UDHR sample, when nothing else says.
Output: public/data/scripts.json
  {"names": {code: {locale: name}}, "langs": {glottocode: ["Cyrl", "Latn:KZ", "Arab:CN"]}}
The first script is the main one (the globe colours by it); countries follow
a colon; "~" marks a script inferred from CLDR's likely subtags alone. Sign
languages are left out.
"""
import csv, json, re
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).parent
RAW = HERE / "raw"
PUB = HERE.parent / "public" / "data"
LOCALES = {"en": "en", "zh-Hans": "zh", "zh-Hant": "zh-Hant", "ja": "ja", "ko": "ko",
           "es": "es", "fr": "fr", "de": "de", "pt": "pt", "ru": "ru"}

# ISO 639-3 → [(script, countries)]: today's usage, checked by hand
CURATED = {
    "kaz": [("Cyrl", "KZ MN RU"), ("Latn", "KZ"), ("Arab", "CN")],
    "uzn": [("Latn", "UZ"), ("Cyrl", "UZ")],
    "uzs": [("Arab", "AF")],
    "azj": [("Latn", "AZ"), ("Cyrl", "RU")],
    "azb": [("Arab", "IR")],
    "tuk": [("Latn", "TM"), ("Arab", "IR AF")],
    "kir": [("Cyrl", "KG"), ("Arab", "CN")],
    "uig": [("Arab", "CN"), ("Cyrl", "KZ KG")],
    "tgk": [("Cyrl", "TJ")],
    "khk": [("Cyrl", "MN"), ("Mong", "MN")],
    "mvf": [("Mong", "CN")],
    "hbs": [("Latn", "HR BA ME RS"), ("Cyrl", "RS BA ME")],
    "pan": [("Guru", "IN")],
    "pnb": [("Arab", "PK")],
    "snd": [("Arab", "PK"), ("Deva", "IN")],
    "kas": [("Arab", "IN PK"), ("Deva", "IN")],
    "kmr": [("Latn", "TR SY"), ("Arab", "IQ IR")],
    "ckb": [("Arab", "IQ IR")],
    "hau": [("Latn", "NG NE"), ("Arab", "NG NE")],
    "zsm": [("Latn", "MY SG BN"), ("Arab", "BN MY")],
    "cmn": [("Hans", "CN SG MY"), ("Hant", "TW HK MO")],
    "yue": [("Hant", "HK MO"), ("Hans", "CN")],
    "nan": [("Hant", "TW"), ("Hans", "CN"), ("Latn", "TW")],
    "hak": [("Hant", "TW"), ("Hans", "CN")],
    "jpn": [("Hani", ""), ("Hira", ""), ("Kana", "")],
    "kor": [("Hang", "KR KP"), ("Hani", "KR")],
    "ike": [("Cans", "CA"), ("Latn", "CA")],
    "jav": [("Latn", "ID"), ("Java", "ID")],
    "bod": [("Tibt", "")],
    "iii": [("Yiii", "CN")],
    "zgh": [("Tfng", "MA")],
    # where Wikidata's order or extra entries mislead
    "apc": [("Arab", "")],
    "san": [("Deva", ""), ("Sidd", ""), ("Shrd", ""), ("Gran", "")],
    "grc": [("Grek", "")],
    "hbo": [("Hebr", ""), ("Phnx", "")],
    "got": [("Goth", "")],
    "chu": [("Cyrl", ""), ("Glag", "")],
    "chg": [("Arab", "")],
    "xhu": [("Xsux", ""), ("Ugar", "")],
    "xng": [("Mong", ""), ("Phag", ""), ("Hani", ""), ("Arab", "")],
    "mxi": [("Arab", ""), ("Hebr", "")],
    "chn": [("Latn", ""), ("Dupl", "")],
}

# Wikidata writing systems that carry no ISO 15924 code of their own
WD_SCRIPT = {
    "Q8196": "Arab", "Q744068": "Arab", "Q112887344": "Arab", "Q112887037": "Arab", "Q378074": "Arab",
    "Q83942": "Arab", "Q116451": "Arab", "Q133800": "Arab", "Q113557437": "Arab", "Q113557468": "Arab",
    "Q36652": "Arab", "Q1992372": "Arab", "Q106644552": "Hebr", "Q756802": "Beng", "Q41670": "Latn",
    "Q854968": "Mymr", "Q11932": "Armn", "Q161428": "Geor", "Q3317411": "Geor", "Q278446": "Latn",
    "Q754989": "Latn", "Q476647": "Cyrl", "Q485619": "Hani", "Q82772": "Hani", "Q622712": "Latn",
    "Q829464": "Cyrl", "Q912243": "Latn", "Q2306379": "Runr", "Q113557400": "Latn", "Q613977": "Latn",
    "Q23929555": "Tfng", "Q122888": "Mong", "Q2639681": "Latn", "Q559173": "Latn", "Q4214937": "Latn",
    "Q755124": "Latn", "Q2599096": "Jpan", "Q271565": "Ital",
}
# variants folded into the script people know; codes that are not scripts dropped
FOLD = {"Latf": "Latn", "Latg": "Latn", "Aran": "Arab", "Cyrs": "Cyrl", "Syre": "Syrc", "Syrj": "Syrc",
        "Syrn": "Syrc", "Hanb": "Hant", "Jamo": "Hang", "Geok": "Geor", "Hrkt": "Kana"}
DROP = {"Brai", "Sgnw", "Zxxx", "Zyyy", "Zinh", "Zmth", "Zsym", "Zsye", "Zzzz", "Qaaa", "Qabx"}

# Chinese names people use for scripts, where CLDR's are terse (拉丁文, 简体)
NAME_OVERRIDE = {
    "zh-Hans": {"Kitl": "契丹大字", "Latn": "拉丁字母", "Cyrl": "西里尔字母", "Arab": "阿拉伯字母", "Grek": "希腊字母",
                "Hebr": "希伯来字母", "Geor": "格鲁吉亚字母", "Armn": "亚美尼亚字母", "Hans": "简体汉字",
                "Hant": "繁体汉字", "Ethi": "吉兹字母", "Cans": "加拿大原住民音节文字", "Mong": "传统蒙古文"},
    "zh-Hant": {"Kitl": "契丹大字", "Latn": "拉丁字母", "Cyrl": "西里爾字母", "Arab": "阿拉伯字母", "Grek": "希臘字母",
                "Hebr": "希伯來字母", "Geor": "喬治亞字母", "Armn": "亞美尼亞字母", "Hans": "簡體漢字",
                "Hant": "繁體漢字", "Ethi": "吉茲字母", "Cans": "加拿大原住民音節文字", "Mong": "傳統蒙古文"},
}

# scripts newer than CLDR's English names
EN_NAME = {"Kitl": "Khitan large script", "Chis": "Chisoi", "Leke": "Leke", "Shui": "Shuishu"}


def fold(code):
    code = FOLD.get(code, code)
    return None if not code or code in DROP else code


def main():
    rows = json.loads((PUB / "languages.json").read_text())
    F = rows["fields"]
    langs = [dict(zip(F, r)) for r in rows["rows"]]
    cldr = RAW / "cldr"
    data = json.loads((cldr / "languageData.json").read_text())["supplemental"]["languageData"]
    likely = json.loads((cldr / "likelySubtags.json").read_text())["supplemental"]["likelySubtags"]
    alias = json.loads((cldr / "aliases.json").read_text())["supplemental"]["metadata"]["alias"]["languageAlias"]
    info = json.loads((cldr / "territoryInfo.json").read_text())["supplemental"]["territoryInfo"]
    # where a language's non-default script is the usual one: kk_Arab → CN
    where = defaultdict(list)
    for terr, t in info.items():
        for code in t.get("languagePopulation") or {}:
            if "_" in code:
                lang, script = code.split("_", 1)
                n = float(t.get("_population", 0)) * float(t["languagePopulation"][code].get("_populationPercent", 0)) / 100
                where[(lang, script)].append((terr, n))

    def from_cldr(iso):
        """CLDR's scripts for a language, or None. The likely script comes first;
        the others are the ones CLDR lists as in use (its "secondary" scripts are
        historical or marginal: Deseret for English, Runic for German). A
        non-default script is tied to the countries where at least 100,000
        people write the language in it (Kazakh in Arabic script in China).
        Languages CLDR knows only from likelySubtags, a default for software,
        are marked as inferred."""
        code = iso if iso in data or iso in likely else (alias.get(iso) or {}).get("_replacement")
        if not code or (code not in data and code not in likely):
            return None, False
        main_ = (likely.get(code) or "").split("-")
        main_ = main_[1] if len(main_) > 1 and len(main_[1]) == 4 else None
        listed = list((data.get(code) or {}).get("_scripts") or [])
        out = []
        for s in ([main_] if main_ else []) + listed:
            s = fold(s)
            if s and s not in [o[0] for o in out]:
                terr = [t for t, n in where.get((code, s), []) if n >= 1e5] if s != main_ else []
                out.append((s, " ".join(terr)))
        return out or None, code not in data

    wd = defaultdict(list)
    for r in csv.DictReader(open(RAW / "wikidata" / "writing_systems.csv")):
        if r["end"]:
            continue
        q = r["ws"].rsplit("/", 1)[1]
        s = fold(r["code"] or WD_SCRIPT.get(q))
        if s:
            wd[r["iso"]].append((s, r["rank"].endswith("PreferredRank")))
    udhr = json.loads((PUB / "udhr.json").read_text())

    out, source = {}, defaultdict(int)
    for l in langs:
        gid, iso = l["id"], l["iso"]
        if l["category"] == 1:  # sign languages
            continue
        entries, how = None, None
        if iso in CURATED:
            entries, how = CURATED[iso], "curated"
        elif iso and (got := from_cldr(iso))[0] and not (got[1] and iso in wd):
            entries, how = got[0], "likely" if got[1] else "cldr"
            # a default for software says nothing of languages that died unwritten
            if got[1] and l["aes"] == 6:
                entries = None
        elif iso in wd:
            ws = wd[iso]
            pref = [s for s, p in ws if p]
            seen = []
            for s, _ in ws:
                if s not in seen:
                    seen.append(s)
            # the preferred statement, or the sample's script, goes first
            first = pref[0] if pref else (udhr.get(gid, [None, None])[1] if udhr.get(gid, [None, None])[1] in seen else seen[0])
            entries, how = [(first, "")] + [(s, "") for s in seen if s != first], "wikidata"
        elif gid in udhr:
            entries, how = [(fold(udhr[gid][1]), "")], "udhr"
        if not entries:
            continue
        source[how] += 1
        mark = "~" if how == "likely" else ""
        out[gid] = [mark + s + (":" + ",".join(c.split()) if c else "") for s, c in entries if s]

    used = sorted({e.split(":")[0].lstrip("~") for v in out.values() for e in v})
    names = {}
    for code in used:
        names[code] = {}
        for loc, cl in LOCALES.items():
            sc = json.loads((cldr / "scripts" / f"{cl}.json").read_text())["main"][cl]["localeDisplayNames"]["scripts"]
            n = NAME_OVERRIDE.get(loc, {}).get(code) or sc.get(f"{code}-alt-stand-alone") or sc.get(code)
            names[code][loc] = n or names[code].get("en") or EN_NAME.get(code, code)
    (PUB / "scripts.json").write_text(json.dumps({"names": names, "langs": out}, ensure_ascii=False, separators=(",", ":")))
    print(len(out), "languages with scripts:", dict(source), "·", len(used), "scripts")


if __name__ == "__main__":
    main()
