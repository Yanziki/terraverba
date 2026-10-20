"""Merge Glottolog 5.3 (classification, coordinates, endangerment) with Wikidata
(names in every interface language, endonyms, speaker counts, Wikipedia titles)
into the JSON the site loads from public/data/, plus the family-region texture.

    .venv/bin/python build_data.py
"""
import csv, json, re
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np
import opencc
from PIL import Image
from scipy.spatial import cKDTree

from zh_glossary import zh_group_name, zh_language_name

HERE = Path(__file__).parent
RAW = HERE / "raw"
OUT = HERE.parent / "public" / "data"
t2s = opencc.OpenCC("t2s").convert
_s2tw = opencc.OpenCC("s2tw").convert
# in transliterated names 托 and 里 are sound, not meaning: s2tw's 託 ("entrust")
# and 裡 ("inside") are wrong there (喬克託語 → 喬克托語, 惠裡切語 → 惠里切語)
s2t = lambda s: _s2tw(s).replace("託", "托").replace("裡", "里")

LOCALES = ["en", "zh-Hans", "zh-Hant", "ja", "ko", "es", "fr", "de", "pt", "ru"]
WIKI_OF = {"en": "en", "zh-Hans": "zh", "zh-Hant": "zh", "ja": "ja", "ko": "ko", "es": "es", "fr": "fr", "de": "de", "pt": "pt", "ru": "ru"}

# Glottolog categories that are drawn on the globe
KEEP = {"Spoken_L1_Language", "Sign_Language", "Pidgin", "Mixed_Language", "Unclassifiable", "Artificial_Language"}
CATEGORY_CODE = {"Spoken_L1_Language": 0, "Sign_Language": 1, "Pidgin": 2, "Mixed_Language": 3,
                 "Unclassifiable": 4, "Artificial_Language": 5}
AES = {"not_endangered": 1, "threatened": 2, "shifting": 3, "moribund": 4, "nearly_extinct": 5, "extinct": 6}
MACROAREAS = ["Africa", "Australia", "Eurasia", "North America", "Papunesia", "South America"]
PSEUDO_GREY = {"pidg1258", "mixe1287", "arti1236", "uncl1493", "book1242", "unat1236", "spee1234"}

# The largest families keep fixed pigments (checked pairwise for colour-blind
# separation); every other family takes a recessive secondary hue chosen so
# that neighbouring families on the map never share one.
NAMED = [
    ("atla1278", "#c9962b"), ("aust1307", "#2a8a80"), ("indo1319", "#c8452e"), ("sino1245", "#3d5ca8"),
    ("afro1255", "#8a4f99"), ("nucl1709", "#8a9a2a"), ("pama1250", "#dc7a35"), ("otom1299", "#3a90c8"),
    ("aust1305", "#6b4a2e"),
]
SECONDARY = ["#8fa8bd", "#b99bc6", "#9db88a", "#d4ad7a", "#cf9a96", "#86b7ae", "#b3a96e", "#9b8fbf", "#c4a28c", "#a7b6c9"]
ISOLATE, SIGN, OTHER = "#2b2723", "#6f7a83", "#bdb5a8"
ISOLATE_REGION = "#6a625a"  # softer than the dot ink across a whole area

# Wikidata labels that are missing, too formal, or the wrong granularity
ZH_OVERRIDE = {
    "sini1245": "汉语族", "kore1280": "朝鲜语（韩语）", "stan1306": "马来语", "java1254": "爪哇语",
    "stan1318": "标准阿拉伯语", "plat1254": "马达加斯加语", "east2295": "意第绪语", "maan1238": "马安延语",
    "gugu1255": "古古伊米迪尔语", "west2369": "波斯语", "indo1316": "印度尼西亚语", "nucl1709": "核心跨新几内亚语系",
    "atla1278": "大西洋-刚果语系", "pama1250": "帕马-尼荣甘语系", "otom1299": "奥托-曼格语系",
    "aust1305": "南亚语系", "taik1256": "侗台语系", "drav1251": "达罗毗荼语系", "turk1311": "突厥语系",
    "ural1272": "乌拉尔语系", "sign1238": "手语", "pidg1258": "皮钦语", "uncl1493": "未分类语言",
    "mixe1287": "混合语", "arti1236": "人造语言", "anci1242": "古希腊语", "iran1269": "伊朗语支",
    "mand1415": "官话（普通话）", "tibe1272": "藏语", "minn1241": "闽南语",
    "utoa1244": "犹他-阿兹特克语系", "mong1349": "蒙古语系", "mixe1284": "米塞-索克语系", "toto1251": "托托纳克语系",
    "krua1234": "克鲁语族", "pano1259": "帕诺-塔卡纳语系", "chuk1271": "楚科奇-堪察加语系", "musk1252": "穆斯科吉语系",
    "tuuu1241": "图乌语系", "coch1271": "科奇米-尤马语系", "timo1261": "帝汶-阿洛-潘塔尔语系", "nucl1710": "马克罗-热语系",
    "japo1237": "日琉语系", "mand1469": "曼德语系", "cent2225": "中苏丹语系", "nilo1247": "尼罗语族", "quec1387": "克丘亚语系",
    "anga1289": "安加语系", "nubi1251": "努比亚语族", "chap1271": "查帕库拉语系", "dogo1299": "多贡语族",
    "japa1256": "日本语支", "lolo1265": "彝缅语支", "clas1257": "古典印欧语族",
    # Glottolog's "Japan-Taiwan Japanese": Japanese and Yilan Creole (寒溪语)
    "japa1258": "日语与寒溪语",
    # glossary leftovers: an English letter kept, place names left untranslated
    "main1282": "大陆北哈马黑拉语支", "nort2848": "北巴布亚大陆-当特尔卡斯托语链",
    "cont1249": "大陆山外凯尔特语群", "uncl1538": "未分类大陆山外凯尔特语言",
    "mand1471": "官话语群", "sout3421": "闽南-莆仙语群", "zhon1236": "中原官话", "wuic1234": "吴语语群",
    "minb1236": "闽北语", "gang1272": "甘沟话", "shao1234": "邵将闽语",
    # languages the daily quiz asks about whose Wikidata entry has no Chinese label
    "nort2646": "普什图语（北部）", "cent1973": "普什图语（中部）", "nucl1347": "沃洛夫语", "cusc1236": "库斯科克丘亚语",
    "nige1253": "豪萨地区富尔富尔德语", "noak1234": "诺阿卡利语", "mewa1250": "梅瓦蒂语", "tosk1239": "阿尔巴尼亚语（托斯克）",
}
# English display names that replace Glottolog's: the group named after its two members,
# the creole by its ISO 639-3 name.
EN_OVERRIDE = {"japa1258": "Japanese and Yilan Creole", "yila1234": "Yilan Creole Japanese"}
# the same group in the other interface languages (zh in ZH_OVERRIDE)
NAME_OVERRIDE = {
    "japa1258": {"ja": "日本語と宜蘭クレオール", "ko": "일본어와 이란 크리올 일본어", "es": "Japonés y criollo de Yilan",
                 "fr": "Japonais et créole de Yilan", "de": "Japanisch und Yilan-Kreolisch", "pt": "Japonês e crioulo de Yilan",
                 "ru": "Японский и иланьский креольский"},
    "japa1256": {"ja": "日本語派", "ko": "일본어파", "es": "Lenguas japonesas", "fr": "Langues japonaises", "de": "Japanische Sprachen",
                 "pt": "Línguas japonesas", "ru": "Японские языки"},
}
# Traditional-script names that are not just the Simplified ones converted
ZH_HANT_OVERRIDE = {"mand1415": "官話（華語）"}

# Short country names
COUNTRY = {
    "zh-Hans": {"CN": "中国", "TW": "台湾", "HK": "香港", "MO": "澳门", "KR": "韩国", "KP": "朝鲜", "US": "美国", "GB": "英国",
                "RU": "俄罗斯", "LA": "老挝", "VN": "越南", "IR": "伊朗", "SY": "叙利亚", "TZ": "坦桑尼亚", "BO": "玻利维亚",
                "VE": "委内瑞拉", "MD": "摩尔多瓦", "CD": "刚果（金）", "CG": "刚果（布）", "FM": "密克罗尼西亚", "PS": "巴勒斯坦"},
    "en": {"CN": "China", "TW": "Taiwan", "KR": "South Korea", "KP": "North Korea", "US": "United States", "GB": "United Kingdom",
           "RU": "Russia", "CD": "DR Congo", "CG": "Congo", "LA": "Laos", "VN": "Vietnam", "IR": "Iran", "SY": "Syria",
           "TZ": "Tanzania", "BO": "Bolivia", "VE": "Venezuela", "MD": "Moldova", "FM": "Micronesia", "HK": "Hong Kong",
           "MO": "Macau", "BN": "Brunei", "CZ": "Czechia", "NL": "Netherlands", "BS": "Bahamas", "GM": "Gambia", "PH": "Philippines"},
}
COUNTRY["zh-Hant"] = {k: s2t(v) for k, v in COUNTRY["zh-Hans"].items()}


def read_csv(path):
    with open(path, newline="", encoding="utf-8") as f:
        yield from csv.DictReader(f)


def visible_native(names):
    # skip endonyms in scripts few systems have fonts for (cuneiform, hieroglyphs, SignWriting…)
    for n in names:
        if all(ord(ch) < 0x10000 for ch in n):
            return n
    return None


def tidy(name):
    # Wikidata sometimes carries disambiguation, e.g. "阿伊努语 (北海道)"
    return re.sub(r"\s*[（(][^）)]*[）)]\s*$", "", name).strip() if name else None


def cap(name, locale):
    return name[:1].upper() + name[1:] if name and locale not in ("zh-Hans", "zh-Hant", "ja", "ko") else name


def zh_hans(labels, lexvo):
    for key in ("zh-hans", "zh-cn"):
        if labels.get(key):
            return t2s(labels[key])  # some zh-hans labels are typed in traditional script
    for key in ("zh", "zh-hant", "zh-tw", "zh-hk"):
        if labels.get(key):
            return t2s(labels[key])
    return t2s(lexvo) if lexvo else None


def zh_hant(labels):
    for key in ("zh-tw", "zh-hant", "zh-hk"):
        if labels.get(key):
            return labels[key]
    return None


# Unicode CLDR's territory data: each country's population and the share that
# speaks each language, with official status (data/raw/cldr, Unicode licence)
def load_cldr():
    info = json.loads((RAW / "cldr" / "territoryInfo.json").read_text())["supplemental"]["territoryInfo"]
    alias = json.loads((RAW / "cldr" / "aliases.json").read_text())["supplemental"]["metadata"]["alias"]["languageAlias"]
    by_lang, population = {}, {}
    for terr, t in info.items():
        pop = float(t.get("_population", 0))
        population[terr] = pop
        for code, li in (t.get("languagePopulation") or {}).items():
            pct = float(li.get("_populationPercent", 0))
            # zh_Hant (Taiwan) and zh count together; so do sr_Latn and sr
            entry = by_lang.setdefault(code.split("_")[0], {}).setdefault(terr, [0, 0, False])
            entry[0] += pop * pct / 100
            entry[1] += pct
            entry[2] = entry[2] or bool(li.get("_officialStatus"))
    return by_lang, population, alias


CLDR_BY_LANG, CLDR_POP, CLDR_ALIAS = load_cldr()

# CLDR counts "Chinese" as one language, and Glottolog lists the Sinitic
# languages only where they are native, so their communities elsewhere are
# added by hand: rough speaker numbers from censuses and community estimates
# (Hong Kong 2021: Cantonese the usual language of 88%; Macao 2021: 81%;
# Taiwan 2020: Taiwanese used at home by about two thirds, Hakka by about 6%),
# good for ordering the list, not for citing.
SINITIC_ABROAD = {
    "yuec1235": {"HK": 6.5e6, "MY": 1.0e6, "CA": 6e5, "MO": 5.5e5, "VN": 5e5, "US": 4.5e5, "AU": 3e5, "GB": 1e5, "SG": 1e5},
    "minn1241": {"TW": 1.5e7, "MY": 2.0e6, "ID": 8e5, "SG": 6e5, "TH": 5e5, "PH": 3e5},
    "hakk1236": {"TW": 1.5e6, "MY": 1.2e6, "ID": 6e5, "SG": 1e5},
    # Hong Kong and Macao: Mandarin as the usual language, not written Chinese
    "mand1415": {"MY": 5.9e6, "US": 1.2e6, "CA": 7e5, "AU": 7e5, "HK": 2e5, "VN": 1e5, "MO": 3e4},
    "mind1253": {"CN": 1e7, "MY": 2e5, "US": 2e5, "TW": 1e4},  # Sibu Foochow, New York, Matsu
    "hain1238": {"CN": 1e6, "MY": 3e5, "SG": 1e5, "TH": 1e5},
    "dung1253": {"KZ": 7e4, "KG": 7e4},
}
# where CLDR's figures mislead: written Chinese is official in Hong Kong and
# Macao, but the spoken language there is Cantonese, not Mandarin
MAIN_OVERRIDE = {"mand1415": ["CN", "TW", "SG"]}


def places_of(gid, iso, codes):
    """Countries in order of speakers, and the main ones. Glottolog's list (where
    the language is spoken at all, Brazil for Spanish included) is kept; CLDR adds
    countries where the language is official for at least 5% of the people (India
    and Nigeria for English) and supplies the speaker counts that order the list.
    "Main" countries — official there, or spoken by half the population — are
    the target area of the daily quiz's map question."""
    code = (CLDR_ALIAS.get(iso) or {}).get("_replacement", iso) if iso else None
    terr = dict(CLDR_BY_LANG.get(code.split("_")[0] if code else None, {}))
    for t, n in SINITIC_ABROAD.get(gid, {}).items():
        terr[t] = [n, 100 * n / CLDR_POP.get(t, n), terr.get(t, [0, 0, False])[2]]
    codes = list(codes)
    codes += [t for t in SINITIC_ABROAD.get(gid, {}) if t not in codes]
    taiwan_only = "TW" in codes and "CN" not in codes  # see countries_of
    for t, (n, pct, official) in terr.items():
        if t not in codes and official and pct >= 5 and not (t == "CN" and taiwan_only):
            codes.append(t)
    speakers = lambda t: terr[t][0] if t in terr else -1
    ordered = sorted(codes, key=lambda t: (-speakers(t), -CLDR_POP.get(t, 0)))
    main = [t for t in ordered if t in terr and terr[t][0] >= 1e5 and ((terr[t][2] and terr[t][1] >= 5) or terr[t][1] >= 50)]
    if gid in MAIN_OVERRIDE:
        main = [t for t in MAIN_OVERRIDE[gid] if t in ordered]
    return ordered, main


def countries_of(r, lat, lon):
    """Glottolog's country codes; a language whose point lies within Taiwan's
    coordinates is listed under TW (and not also under CN)."""
    codes = r["country_ids"].split() if r["country_ids"] else []
    if 21.8 < lat < 25.4 and 119.9 < lon < 122.1:
        codes = [c for c in codes if c != "CN"]
        if "TW" not in codes:
            codes.insert(0, "TW")
    return codes


def localized_name(locale, labels, lexvo, gid, glossary):
    if locale == "zh-Hans":
        return ZH_OVERRIDE.get(gid) or tidy(zh_hans(labels, lexvo)) or glossary
    if locale == "zh-Hant":
        if gid in ZH_HANT_OVERRIDE:
            return ZH_HANT_OVERRIDE[gid]
        if gid in ZH_OVERRIDE:
            return s2t(ZH_OVERRIDE[gid])
        hans = localized_name("zh-Hans", labels, lexvo, gid, glossary)
        return tidy(zh_hant(labels)) or (s2t(hans) if hans else None)
    if locale == "en":
        return None  # Glottolog's own English names are the base
    return cap(tidy(labels.get(locale)), locale)


def assign_family_colors(languages, unit_of):
    """Greedy colouring of the families' adjacency graph."""
    pts = np.array([l["v"] for l in languages])
    tree = cKDTree(pts)
    adj = defaultdict(Counter)
    dist, idx = tree.query(pts, k=9, distance_upper_bound=0.12)
    for i, (ds, js) in enumerate(zip(dist, idx)):
        a = unit_of[i]
        for d, j in zip(ds[1:], js[1:]):
            if j < len(languages) and unit_of[j] != a:
                adj[a][unit_of[j]] += 1
                adj[unit_of[j]][a] += 1
    colors = dict(NAMED)
    size = Counter(unit_of)
    for unit, _ in size.most_common():
        if unit in colors or unit.startswith("_"):
            continue
        penalty = Counter()
        for nb, w in adj[unit].items():
            if nb in colors:
                penalty[colors[nb]] += w
        colors[unit] = min(SECONDARY, key=lambda c: (penalty[c], SECONDARY.index(c)))
    return colors


def draw_regions(languages, unit_of, colors, path, W=2048):
    """Nearest-language family colour for every pixel (land masking happens in the browser)."""
    H = W // 2
    keep = [i for i, l in enumerate(languages) if l["aes"] < 6 and l["category"] in (0, 3, 4) and unit_of[i] in colors]
    tree = cKDTree(np.array([languages[i]["v"] for i in keep]))
    lat = np.radians(90 - (np.arange(H) + 0.5) * 180 / H)
    lon = np.radians(-180 + (np.arange(W) + 0.5) * 360 / W)
    LON, LAT = np.meshgrid(lon, lat)
    xyz = np.stack([np.cos(LAT) * np.cos(LON), np.sin(LAT), -np.cos(LAT) * np.sin(LON)], -1).reshape(-1, 3)
    d, j = tree.query(xyz, distance_upper_bound=0.17)
    rgb = np.array([[int(colors[unit_of[i]][k:k + 2], 16) for k in (1, 3, 5)] for i in keep] + [[0, 0, 0]], dtype=np.uint8)
    units = sorted({unit_of[i] for i in keep})
    code = {u: n for n, u in enumerate(units)}
    unit_idx = np.array([code[unit_of[i]] for i in keep] + [-1])
    j = np.where(np.isinf(d), len(keep), j).reshape(H, W)
    img = np.zeros((H, W, 4), np.uint8)
    img[..., :3] = rgb[j]
    img[..., 3] = np.where(j == len(keep), 0, 255)
    # darken pixels on a boundary between two families
    u = unit_idx[j]
    edge = np.zeros((H, W), bool)
    edge[:, 1:] |= u[:, 1:] != u[:, :-1]
    edge[1:, :] |= u[1:, :] != u[:-1, :]
    edge &= img[..., 3] > 0
    img[edge, :3] = (img[edge, :3] * 0.72).astype(np.uint8)
    Image.fromarray(img, "RGBA").save(path, optimize=True)


def main():
    (OUT / "i18n").mkdir(parents=True, exist_ok=True)
    wikidata = json.loads((RAW / "wikidata.json").read_text())

    category, aes = {}, {}
    for v in read_csv(RAW / "cldf" / "values.csv"):
        if v["Parameter_ID"] == "category":
            category[v["Language_ID"]] = v["Value"].replace(" ", "_")
        elif v["Parameter_ID"] == "aes":
            aes[v["Language_ID"]] = AES[v["Code_ID"].removeprefix("aes-")]

    lexvo_zh = {}
    for n in read_csv(RAW / "cldf" / "names.csv"):
        if n["Provider"] == "lexvo" and n["lang"] in ("zh", "cmn"):
            lexvo_zh.setdefault(n["Language_ID"], n["Name"].strip())

    macroarea = {g["glottocode"]: g["macroarea"] for g in read_csv(RAW / "languages_and_dialects_geo.csv")}
    languoids = {r["id"]: r for r in read_csv(RAW / "languoid.csv")}

    languages = []
    for gid, r in languoids.items():
        if r["level"] != "language" or category.get(gid) not in KEEP or not r["latitude"]:
            continue
        wd = wikidata.get(gid, {})
        lat, lon = float(r["latitude"]), float(r["longitude"])
        φ, λ = np.radians(lat), np.radians(lon)
        languages.append({
            "id": gid, "en": r["name"], "lat": round(lat, 3), "lon": round(lon, 3),
            "family": r["family_id"] or None, "parent": r["parent_id"] or None, "iso": r["iso639P3code"] or None,
            "aes": aes.get(gid, 0), "speakers": wd.get("speakers"), "macroarea": macroarea.get(gid),
            **dict(zip(("countries", "main"), places_of(gid, r["iso639P3code"] or None, countries_of(r, lat, lon)))),
            "category": CATEGORY_CODE[category[gid]], "native": visible_native(wd.get("native", [])),
            "dialects": int(r["child_dialect_count"] or 0),
            "v": [np.cos(φ) * np.cos(λ), np.sin(φ), -np.cos(φ) * np.sin(λ)],
        })

    # every classification node above the kept languages, with its depth
    counts = Counter()
    for lang in languages:
        p = lang["parent"]
        while p:
            counts[p] += 1
            p = languoids[p]["parent_id"] or None
    depth = {}

    def depth_of(gid):
        if gid not in depth:
            par = languoids[gid]["parent_id"]
            depth[gid] = 0 if not par else depth_of(par) + 1
        return depth[gid]

    groups = [{"id": gid, "en": languoids[gid]["name"], "parent": languoids[gid]["parent_id"] or None,
               "n": counts[gid], "pseudo": category.get(gid) == "Pseudo_Family"} for gid in counts]

    for x in languages + groups:
        x["en"] = EN_OVERRIDE.get(x["id"], x["en"])

    # per-locale names and Wikipedia titles
    per_locale = {loc: {"names": {}, "wiki": {}, "countries": {}} for loc in LOCALES}
    for x in languages + groups:
        wd = wikidata.get(x["id"], {})
        labels = wd.get("labels", {})
        is_group = "n" in x
        gloss = zh_group_name(x["en"], depth_of(x["id"])) if is_group else zh_language_name(x["en"])
        for loc in LOCALES:
            name = NAME_OVERRIDE.get(x["id"], {}).get(loc) or localized_name(loc, labels, lexvo_zh.get(x["id"]), x["id"], gloss)
            if name and name != x["en"]:
                per_locale[loc]["names"][x["id"]] = name
            title = wd.get("wiki", {}).get(WIKI_OF[loc])
            if title:
                per_locale[loc]["wiki"][x["id"]] = title

    used = {c for lang in languages for c in lang["countries"]}
    for a2, labels in json.loads((RAW / "countries.json").read_text()).items():
        if a2 not in used:
            continue
        for loc in LOCALES:
            name = COUNTRY.get(loc, {}).get(a2)
            if not name:
                if loc == "zh-Hans":
                    name = zh_hans(labels, None)
                elif loc == "zh-Hant":
                    hans = zh_hans(labels, None)
                    name = zh_hant(labels) or (s2t(hans) if hans else None)
                else:
                    name = labels.get(loc)
            if name:
                per_locale[loc]["countries"][a2] = name
    for loc, payload in per_locale.items():
        (OUT / "i18n" / f"{loc}.json").write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")))

    # family colours and regions
    def unit(l):
        if l["family"] == "sign1238":
            return "_sign"
        if l["family"] in PSEUDO_GREY:
            return "_other"
        return l["family"] or l["id"]
    unit_of = [unit(l) for l in languages]
    isolates = {l["id"] for l in languages if not l["family"] and l["category"] == 0}
    colors = assign_family_colors(languages, unit_of)
    for iso in isolates:
        colors[iso] = ISOLATE
    region_colors = {k: (ISOLATE_REGION if k in isolates else v) for k, v in colors.items() if not k.startswith("_")}
    draw_regions(languages, unit_of, region_colors, OUT / "regions.png")
    (OUT / "families.json").write_text(json.dumps({
        "named": [f for f, _ in NAMED], "colors": {k: v for k, v in colors.items() if not k.startswith("_") and k not in isolates},
        "isolate": ISOLATE, "sign": SIGN, "other": OTHER}, separators=(",", ":")))

    # compact, column-ordered rows keep the payload small
    lang_fields = ["id", "en", "lat", "lon", "family", "parent", "iso", "aes", "speakers",
                   "macroarea", "countries", "main", "category", "native", "dialects"]
    group_fields = ["id", "en", "parent", "n", "pseudo"]
    rows = []
    for lang in sorted(languages, key=lambda l: -(l["speakers"] or 0)):
        row = [lang[f] for f in lang_fields]
        row[lang_fields.index("macroarea")] = MACROAREAS.index(lang["macroarea"]) if lang["macroarea"] in MACROAREAS else -1
        row[lang_fields.index("countries")] = " ".join(lang["countries"])
        row[lang_fields.index("main")] = " ".join(lang["main"]) or None
        rows.append(row)
    (OUT / "languages.json").write_text(json.dumps(
        {"fields": lang_fields, "macroareas": MACROAREAS, "rows": rows}, ensure_ascii=False, separators=(",", ":")))
    (OUT / "groups.json").write_text(json.dumps(
        {"fields": group_fields, "rows": [[g[f] for f in group_fields] for g in sorted(groups, key=lambda g: -g["n"])]},
        ensure_ascii=False, separators=(",", ":")))

    # titles for the offline summary fetcher
    titles = {x["id"]: [per_locale["zh-Hans"]["wiki"].get(x["id"]), per_locale["en"]["wiki"].get(x["id"])]
              for x in languages + groups}
    (RAW / "wiki_titles.json").write_text(json.dumps({k: v for k, v in titles.items() if any(v)}, ensure_ascii=False))

    print(f"{len(languages)} languages, {len(groups)} groups")
    for loc in LOCALES:
        print(f"  {loc}: {len(per_locale[loc]['names'])} names, {len(per_locale[loc]['wiki'])} wiki titles")
    print("secondary colours used:", Counter(c for k, c in colors.items() if c in SECONDARY).most_common())


if __name__ == "__main__":
    main()
