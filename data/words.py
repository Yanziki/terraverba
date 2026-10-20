"""The word map: one word, every language that has it.

Readable forms come from Wiktionary translation tables (in each language's own
script, with romanisation); ASJP word lists fill in thousands of smaller
languages for the 40 basic concepts it covers, in ASJP's simple transcription.

Forms are grouped by the class of their first consonant (a Dolgopolsky-style
sound-class key): words that start alike land in the same group. That is
a resemblance, not a proof of common origin, and the site says so.

Output: public/data/words/index.json and public/data/words/<concept>.json
"""
import csv, json, re, sys, unicodedata
from collections import Counter, defaultdict
from pathlib import Path

from unidecode import unidecode

import romanize
from word_concepts import CONCEPTS

HERE = Path(__file__).parent
RAW = HERE / "raw"
OUT = HERE.parent / "public" / "data" / "words"

# ISO 639 macrolanguage codes Wiktionary uses → the individual language Glottolog maps
MACRO = {
    "ara": "arb", "fas": "pes", "msa": "zsm", "zho": "cmn", "swa": "swh", "est": "ekk", "lav": "lvs", "uzb": "uzn",
    "aze": "azj", "mon": "khk", "sqi": "als", "nep": "npi", "kur": "kmr", "grn": "gug", "ori": "ory", "pus": "pbt",
    "yid": "ydd", "nor": "nob", "kon": "kng", "orm": "gaz", "fil": "tgl", "zza": "diq", "lah": "pnb", "mlg": "plt",
    "kok": "gom", "raj": "mup", "hbs": "hbs", "cre": "crk", "oji": "ojg", "iku": "ike", "ipk": "esi", "aym": "ayr",
    "que": "quz", "zap": "zai", "ful": "fuf", "kpe": "xpe", "man": "mnk", "gon": "gno", "kln": "kln", "luy": "bxk",
    "srd": "src", "zha": "zyb", "bih": "bho", "bal": "bgn", "rom": "rmy", "bua": "bxr", "kau": "knc", "nah": "nci",
}
# individual codes Glottolog files under the macrolanguage instead
TO_MACRO = {"nob": "nor", "nno": "nor"}

# Varieties listed inside another language's row ("Chinese: Dungan: чёр",
# "Arabic: Egyptian Arabic: …") belong to their own language, never the row's
VARIETY = {
    "Dungan": "dng", "Hokkien": "nan", "Teochew": None, "Hakka": "hak", "Wu": "wuu", "Shanghainese": "wuu",
    "Eastern Min": "cdo", "Min Dong": "cdo", "Gan": "gan", "Xiang": "hsn", "Jin": "cjy", "Puxian Min": "cpx",
    "Northern Min": "mnp", "Cantonese": "yue", "Classical-Chinese": "lzh", "Literary Chinese": "lzh",
    "Egyptian-Arabic": "arz", "Moroccan-Arabic": "ary", "Hijazi-Arabic": "acw", "Gulf-Arabic": "afb",
    "South-Levantine-Arabic": "ajp", "North-Levantine-Arabic": "apc", "Iraqi-Arabic": "acm", "Tunisian-Arabic": "aeb",
    "Algerian-Arabic": "arq", "Sudanese-Arabic": "apd", "Libyan-Arabic": "ayl", "Najdi-Arabic": "ars",
    "Western-Punjabi": "pnb", "Alemannic-German": "gsw", "German-Low-German": "nds", "Classical-Syriac": "syc",
    "Classical Persian": None,
}
# rows whose untagged entries are the standard language and whose tagged
# entries are other varieties: an unknown variety tag there means "skip"
MACRO_ROWS = {"zh", "ar"}
SCRIPTS = {"Cyrillic", "Latin", "Roman", "Gurmukhi", "Shahmukhi", "Mongolian script", "Jawi", "Rumi", "Glagolitic",
           "Hebrew script", "Hebrew", "Syriac", "Devanagari", "Arabic", "Adlam", "Carakan", "Hiragana", "Katakana"}
# the script a multi-script language is usually written in
SCRIPT_PREF = {"sh": "Latin", "mn": "Cyrillic", "pa": "Gurmukhi", "ms": "Rumi", "uz": "Latin", "az": "Latin",
               "kk": "Cyrillic", "ku": "Latin", "tt": "Cyrillic", "ug": "Arabic", "jv": "Latin", "su": "Latin"}
# register tags that make a word a poor representative of the plain concept
HEAVY = {"archaic", "obsolete", "dated", "rare", "uncommon", "poetic", "literary", "Epic", "vulgar", "derogatory",
         "pejorative", "humorous", "slang", "childish", "euphemistic", "figuratively", "idiomatic", "nonstandard",
         "dialectal", "regional", "in-compounds", "honorific", "humble", "krama", "intimate", "numeral", "historical",
         "Internet", "neologism", "jargon", "obsolete-spelling", "alternative"}
# forms of a word rather than the word itself
DERIVED = {"diminutive", "augmentative", "collective", "plural", "singulative", "dual", "emphatic", "endearing"}
# free-text notes that narrow the meaning ("morning", "to a group of people");
# grammatical notes ("se; usually used", "abstract counting") don't count
NARROW = re.compile(r"morning|evening|daytime|afternoon|night|taxonomic|small|young|baby|female speaker|male speaker"
                    r"|to a group|to more than one|respectful|very familiar|cooked|uncooked|raw|wild|dark|older|old "
                    r"spelling|composition|as a gift|animal|fresh water|of natural causes|in battle", re.I)
SINITIC = {"zh", "cmn", "yue", "nan", "hak", "wuu", "cdo", "gan", "hsn", "cjy", "lzh", "dng", "cpx", "mnp", "czh"}
HAN_PAIR = re.compile(r"^([\u3400-\u9fff\uf900-\ufaff]+)\s*/\s*([\u3400-\u9fff]+)$")

# Hand-checked corrections for the most-spoken languages, where Wiktionary
# lists a narrower, formal, regional or literary word first and nothing in the
# table says so (review in raw/wiktionary/audit.md). None removes the form.
_O = {
    "mand1415": {  # Mandarin: everyday two-syllable words, 牛 for cattle
        "mother": "媽媽 /妈妈|māma", "father": "爸爸|bàba", "woman": "女人|nǚrén", "name": "名字|míngzi",
        "knee": "膝蓋 /膝盖|xīgài", "star": "星星|xīngxing", "sky": "天空|tiānkōng", "stone": "石頭 /石头|shítou",
        "leaf": "葉子 /叶子|yèzi", "see": "看見 /看见|kànjiàn", "egg": "蛋|dàn", "orange": "橙子|chéngzi",
        "house": "房子|fángzi", "path": "小路|xiǎolù", "full": "滿 /满|mǎn", "cow": "牛|niú",
        "iloveyou": "我愛你 /我爱你|wǒ ài nǐ",
    },
    "yuec1235": {  # Cantonese
        "cow": "牛|ngau⁴", "egg": "雞蛋 /鸡蛋|gai¹ daan²", "we": "我哋|ngo⁵ dei⁶", "path": "路|lou⁶",
        "mother": "阿媽 /阿妈|aa³ maa¹", "father": "阿爸|aa³ baa¹",
        # 我愛你 is what Cantonese speakers say to a lover; 我好鍾意你 is "I like you a lot"
        "iloveyou": "我愛你 /我爱你|ngo⁵ oi³ nei⁵",
    },
    "minn1241": {  # Hokkien
        "mother": "阿母|a-bó", "father": "阿爸|a-pah", "three": "三|saⁿ", "four": "四|sì", "five": "五|gō͘",
        "cow": "牛|gû", "i": "我|góa", "die": "死|sí", "tea": "茶|tê", "sugar": "糖|thn̂g", "milk": "奶|leng",
        "woman": "查某人|cha-bó͘-lâng", "ear": "耳空|hīⁿ-khang", "knee": "跤頭趺 /跤头趺|kha-thâu-u",
        "potato": "馬鈴薯 /马铃薯|bé-lêng-chû", "tomato": "柑仔蜜|kam-á-bi̍t",
    },
    "nucl1643": {  # Japanese: the everyday word, in its usual spelling
        "mother": "お母さん|okāsan", "father": "お父さん|otōsan", "child": "子供|kodomo", "name": "名前|namae",
        "heart": "心臓|shinzō", "liver": "肝臓|kanzō", "you": "あなた|anata", "we": "私たち|watashitachi",
        "give": "あげる|ageru", "tea": "お茶|ocha", "rice": "米|kome", "milk": "牛乳|gyūnyū",
        "chocolate": "チョコレート|chokorēto", "apple": "りんご|ringo", "orange": "オレンジ|orenji",
        "hello": "こんにちは|konnichiwa", "path": "道|michi", "money": "お金|okane", "new": "新しい|atarashii",
        "full": "いっぱい|ippai", "night": "夜|yoru", "fish": "魚|sakana", "house": "家|ie",
        # colours as their names (赤 aka), not the adjectives (赤い akai)
        "red": "赤|aka", "white": "白|shiro", "black": "黒|kuro",
        "iloveyou": "愛してる|aishiteru",
    },
    "kore1280": {  # Korean
        "father": "아빠|appa", "child": "아이|ai", "woman": "여자|yeoja", "skin": "피부|pibu", "breast": "가슴|gaseum",
        "liver": "간|gan", "cow": "소|so", "you": "너|neo", "milk": "우유|uyu", "hello": "안녕하세요|annyeonghaseyo",
        "new": "새|sae", "full": "가득하다|gadeukhada",
        # colours as their names (빨강), as in Japanese, not the adjectives (빨갛다)
        "red": "빨강|ppalgang", "white": "하양|hayang", "black": "검정|geomjeong",
        "iloveyou": "사랑해|saranghae",
    },
    # "I love you" to a lover: te adoro, ti voglio bene and the like are fondness, listed first
    "stan1288": {"ear": "oreja|", "banana": "plátano|", "iloveyou": "te quiero|"},  # Spanish
    "stan1290": {"mountain": "montagne|", "iloveyou": "je t'aime|"},  # French
    "stan1295": {"chocolate": "Schokolade|", "orange": "Orange|", "iloveyou": "ich liebe dich|"},  # German
    # olá, said in Portugal and Brazil alike, not the Brazilian oi Wiktionary lists first
    "port1283": {"you": "você|", "ear": "orelha|", "iloveyou": "eu te amo|", "hello": "olá|"},  # Portuguese
    "ital1282": {"snake": "serpente|", "breast": "seno|", "cow": "mucca|", "child": "figlio|", "iloveyou": "ti amo|"},  # Italian
    "hind1269": {  # Hindi
        "mother": "माँ|mā̃", "man": "आदमी|ādmī", "you": "तुम|tum", "sea": "समुद्र|samudra", "honey": "शहद|śahad",
        "wine": "वाइन|vāin", "path": "रास्ता|rāstā", "book": "किताब|kitāb", "full": "भरा|bharā",
        # the verb agrees with the speaker: karta from a man, karti from a woman
        "iloveyou": "मैं तुमसे प्यार करता/करती हूँ|ma͠i tumse pyār kartā/kartī hū̃",
    },
    "urdu1245": {  # Urdu
        "mother": "ماں|mā̃", "father": "باپ|bāp", "path": "راستہ|rāstā", "money": "پیسہ|paisā",
        "full": "بھرا|bharā", "music": "موسیقی|mausīqī",
        "iloveyou": "مجھے تم سے پیار ہے|mujhe tum se pyār hai",
    },
    "beng1280": {  # Bengali
        "mother": "মা|ma", "father": "বাবা|baba", "you": "তুমি|tumi", "love": "ভালোবাসা|bhalobasa",
        "path": "পথ|poth", "money": "টাকা|ṭaka", "new": "নতুন|notun", "wind": "বাতাস|batas",
        "tomato": "টমেটো|ṭomeṭo", "star": "তারা|tara", "mountain": "পাহাড়|pahaṛ",
        "iloveyou": "আমি তোমাকে ভালোবাসি|ami tomake bhalobaśi",
    },
    "stan1318": {  # Standard Arabic
        "money": "نُقُود|nuqūd", "tree": "شَجَرَة|šajara", "orange": "بُرْتُقَال|burtuqāl",
        "eat": "أَكَلَ|ʔakala", "music": "مُوسِيقَى|mūsīqā",
        # unvowelled, the one spelling serves both: uḥibbuka to a man, uḥibbuki to a woman
        "iloveyou": "أحبك|ʔuḥibbuka / ʔuḥibbuki",
    },
    "egyp1253": {"eat": "أكل|akal"},  # Egyptian Arabic
    "west2369": {  # Persian (Iran): not the Dari or classical forms
        "sun": "خورشید|xoršid", "cat": "گربه|gorbe", "horse": "اسب|asb", "banana": "موز|moz",
        "orange": "پرتقال|porteqâl", "money": "پول|pul", "big": "بزرگ|bozorg", "yes": "بله|bale",
        "iloveyou": "دوستت دارم|dustet dâram",  # not عاشقتم, "I'm in love with you"
    },
    "indo1316": {"father": "ayah|", "orange": "jeruk|", "iloveyou": "aku cinta kamu|"},  # Indonesian
    # the speaker's gender shows in the verb: ohev from a man, ohevet from a woman
    "hebr1245": {"iloveyou": "אני אוהב/ת אותך|ani ohev/ohevet otkha/otakh"},  # Hebrew
    "nucl1301": {  # Turkish
        "heart": "kalp|", "rice": "pirinç|", "white": "beyaz|", "black": "siyah|", "hear": "duymak|",
        "thanks": "teşekkür ederim|",
    },
    "viet1252": {  # Vietnamese
        "mother": "mẹ|", "you": "bạn|", "we": "chúng tôi|", "come": "đến|", "apple": "táo|",
        "wine": "rượu vang|", "yes": "vâng|", "child": "con|",
        "iloveyou": "anh yêu em|",  # a man to a woman; she says em yêu anh
    },
    "swah1253": {  # Swahili
        "mother": "mama|", "two": "mbili|", "drink": "kunywa|", "hear": "kusikia|", "full": None,
        "new": "mpya|", "white": "nyeupe|", "black": "nyeusi|", "path": "njia|", "honey": "asali|",
    },
    "poli1260": {"three": "trzy|", "rice": "ryż|", "name": "imię|", "money": "pieniądze|", "egg": "jajko|"},  # Polish
    "dutc1256": {"pig": "varken|"},  # Dutch
    "roma1327": {"friend": "prieten|", "tree": "copac|", "money": "bani|", "come": "veni|"},  # Romanian
    "ukra1253": {"house": "дім|dim"},  # Ukrainian
    "russ1263": {"iloveyou": "я тебя́ люблю́|ja tebjá ljubljú"},  # Russian: not the formal я вас люблю
    "nucl1417": {"iloveyou": "a hụrụ m gị n'anya|"},  # Igbo
    "sout1528": {"iloveyou": "volim te|"},  # Serbian-Croatian-Bosnian, in Latin letters
    "wuch1236": {"cow": "牛|", "rice": "米|"},  # Wu
    "mode1248": {  # Greek: everyday, not formal or Cypriot
        "head": "κεφάλι|kefáli", "drink": "πίνω|píno", "stone": "πέτρα|pétra", "liver": "συκώτι|sykóti",
        "full": "γεμάτος|gemátos", "money": "χρήματα|chrímata", "bone": "κόκαλο|kókalo", "moon": "φεγγάρι|fengári",
    },
    "swed1254": {"father": "far|", "friend": "vän|"},  # Swedish
    "hung1274": {"sun": "nap|", "moon": "hold|", "pig": "disznó|", "night": "éjszaka|"},  # Hungarian
    "tami1289": {"we": "நாங்கள்|nāṅkaḷ"},  # Tamil
    "thai1261": {"mountain": "ภูเขา|phuu-khǎo", "leaf": "ใบไม้|bai-máai", "path": "ทาง|thaang"},  # Thai
}
OVERRIDES = {(c, g): (tuple(v.split("|")) if v else None) for g, d in _O.items() for c, v in d.items()}
CLASSES = {**dict.fromkeys("pbfvw", "B"), **dict.fromkeys("td", "T"), **dict.fromkeys("szcj", "S"),
           **dict.fromkeys("kgqx", "K"), "m": "M", "n": "N", "r": "R", "l": "R", "y": "Y", "h": "H"}
ASJP40 = {c["asjp"] for c in CONCEPTS if c.get("asjp")}


def read_csv(path):
    with open(path, newline="", encoding="utf-8") as f:
        yield from csv.DictReader(f)


# "C" stands for an affricate (ch, ts…), always in the sibilant class
DIGRAPHS = [("tsh", "C"), ("tch", "C"), ("ch", "C"), ("sh", "s"), ("zh", "z"), ("th", "t"), ("dh", "d"), ("ph", "f"),
            ("kh", "k"), ("gh", "g"), ("bh", "b"), ("ts", "C"), ("dz", "z"), ("ng", "n"), ("qu", "k")]


def sound_key(word, roman=None, transcribed=False):
    """the sound class of a word's first consonant, after evening out spelling
    conventions (ch/č/ç, th/t, h dropped); glides count only word-initially.
    `transcribed`: the text is a romanisation or phonetic transcription, where
    c stands for an affricate rather than Latin's hard or soft c."""
    han = re.search(r"[\u3400-\u9fff]", word)
    transcribed = transcribed or bool(roman and re.search(r"[^\u0000-\u024f\s'’-]", word))
    s = re.sub(r"[čçćĉ]", "C", (roman or word).lower())
    s = re.sub(r"[^a-zC]", "", unidecode(s))
    for a, b in DIGRAPHS:
        s = s.replace(a, b)
    if han:
        # pinyin: q, j, x, c, z are palatal or dental sibilants
        s = s.translate(str.maketrans("qjxcz", "CCsCs"))
    for i, ch in enumerate(s):
        if ch == "h" or (ch in "yjw" and i > 0):
            continue
        if ch in "yj":
            return "Y"
        if ch == "C":
            return "S"
        if ch == "c":
            # Latin c: soft before e, i, y (cena), hard elsewhere (café)
            return "S" if transcribed or s[i + 1:i + 2] in ("e", "i", "y") else "K"
        if ch in CLASSES:
            return CLASSES[ch]
    return "-"


def script_of(word):
    """the main Unicode script of a word (kana and kanji count as one)"""
    n = Counter(unicodedata.name(ch, "").split(" ")[0] for ch in word if ch.isalpha())
    if not n:
        return None
    s = n.most_common(1)[0][0]
    return "JAPANESE" if s in ("HIRAGANA", "KATAKANA") else "HAN" if s == "CJK" else s


def same_script(a, b):
    return a == b or {a, b} <= {"HAN", "JAPANESE"}


def penalty(item, others, concept, main=None):
    """How far a candidate is from the plain, everyday word. Table order is the
    main signal (editors list the usual word first); only clear evidence
    outranks it: register tags, narrowing notes, other scripts, regional
    forms, and compounds built on a simpler candidate."""
    code, _, word, _, tags, qual, _ = item
    p = 3 * any(t in HEAVY for t in tags) + any(t in DERIVED for t in tags)
    if code in SCRIPT_PREF and any(t in SCRIPTS and t != SCRIPT_PREF[code] for t in tags):
        p += 2
    # one script per language on the map: Javanese in Latin letters like the
    # rest of its words, not in Javanese script for some of them
    elif main and script_of(word) and not same_script(script_of(word), main):
        p += 2
    # a regional form (Spain, Sylt…) only loses to one with no region at all
    if any(t[:1].isupper() and t not in SCRIPTS and t not in VARIETY for t in tags):
        p += 1
    if qual and NARROW.search(qual):
        p += 2
    # the basic "you" is the familiar one (tú, du, ты), not the polite one
    if concept == "you" and any(t in ("formal", "polite") for t in tags):
        p += 2
    # 家猫 next to 猫, おはようございます next to おはよう, Musikstück next to Musik.
    # Not in Chinese, where the two-syllable word is the everyday one (眼睛, 石头),
    # nor in Thai, Lao, Khmer or Burmese, whose everyday words are compounds (ผู้หญิง)
    if code not in SINITIC and script_of(word) not in ("THAI", "LAO", "KHMER", "MYANMAR"):
        for o in others:
            short = o[2]
            extra = len(word) - len(short)
            if o is not item and short and short in word and extra >= (1 if re.match(r"[\u3400-\u9fff]", short) else 3):
                p += 2
                break
    return p


def clean(word):
    # "eau (f)", "agua; aguas" → first plain variant; grammar notes left in the
    # word ("أَكَلَ imperfective: يَأْكُلُ", "مُوسِيقَى f or مُوسِيقَا") go too
    word = re.sub(r"\s*[\(\[{].*?[\)\]}]", "", word).strip("[]{}() ")
    word = re.split(r"\s+(?:imperfective|perfective|[mfn] or|or|class|and verbal)\b|\s+[mfn]\s+", word)[0]
    return re.split(r"\s*[,;/]\s*", word.strip())[0].strip()


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    rows = json.loads((HERE.parent / "public" / "data" / "languages.json").read_text())
    F = rows["fields"]
    langs = [dict(zip(F, r)) for r in rows["rows"]]
    # sign languages are not written with words, so they stay off the word map
    by_iso = {l["iso"]: l["id"] for l in langs if l["iso"] and l["family"] != "sign1238"}
    ours = {l["id"] for l in langs}
    speakers = {l["id"]: l["speakers"] or 0 for l in langs}
    parent = {r["id"]: r["parent_id"] for r in read_csv(RAW / "languoid.csv")}
    iso1 = json.loads((RAW / "wiktionary" / "iso1to3.json").read_text())

    def up(g):
        for _ in range(30):
            if not g or g in ours:
                break
            g = parent.get(g)
        return g if g in ours else None

    def from_code(code):
        base = code.split("-")[0]
        iso3 = iso1.get(base, base) if len(base) == 2 else base
        return by_iso.get(MACRO.get(iso3, iso3)) or by_iso.get(iso3) or by_iso.get(TO_MACRO.get(iso3))

    # ASJP: the fullest word list per language for the concepts we use
    asjp_forms = defaultdict(dict)
    for f in read_csv(RAW / "asjp" / "forms.csv"):
        c = int(f["Parameter_ID"])
        if c in ASJP40 and f["Form"]:
            asjp_forms[f["Language_ID"]].setdefault(c, f["Form"].translate(str.maketrans("", "", '*"~$')).replace(" ", ""))
    asjp = {}
    for d in read_csv(RAW / "asjp" / "languages.csv"):
        g = up(d["Glottocode"])
        if g and d["long_extinct"] != "True" and len(asjp_forms[d["ID"]]) > len(asjp.get(g, {})):
            asjp[g] = asjp_forms[d["ID"]]

    tables = json.loads((RAW / "wiktionary" / "translations.json").read_text())
    index = []
    unmapped = Counter()
    audit = {}
    gathered = {}
    first_script = defaultdict(Counter)
    for c in CONCEPTS:
        senses = tables.get(c["id"], {})
        prefer = [g for g in senses if any(k in g.lower() for k in c.get("sense", []))]
        pool = prefer or list(senses)
        table = max(pool, key=lambda g: len(senses[g])) if pool else None
        # every candidate per language, then the best one by penalty, then table order
        cands = defaultdict(list)
        from_main = set()
        # a second sense fills in languages the first one lacks ("cow": any
        # bovine first, then adult female cattle)
        backup = [g for g in senses if any(k in g.lower() for k in c.get("fallback", []))]
        rows = [(item, 0) for item in senses.get(table, [])] + [(item, 1) for g in backup[:1] for item in senses[g]]
        for item, tier in rows:
            code, lang, word, roman, tags = item[:5]
            variety = next((t for t in tags if t in VARIETY), None)
            if variety:
                g = by_iso.get(VARIETY[variety]) if VARIETY[variety] else None
            elif code in MACRO_ROWS and any(t[:1].isupper() and t not in SCRIPTS for t in tags):
                g = None  # some other variety of Chinese or Arabic
            else:
                g = from_code(code)
            if not g:
                unmapped[f"{code} {lang} {variety or ''}".strip()] += 1
                continue
            if re.search(r"[@\d]", word) or not clean(word):
                continue
            if tier and g in from_main:
                continue
            if not tier:
                from_main.add(g)
            cands[g].append(item)
        gathered[c["id"]] = (table, cands)
        for g, items in cands.items():
            first_script[g][script_of(items[0][2])] += 1
    # each language's usual script, from the first-listed word of every table
    main_script = {g: n.most_common(1)[0][0] for g, n in first_script.items()}

    for c in CONCEPTS:
        if c["id"] not in gathered:
            continue
        table, cands = gathered[c["id"]]
        forms, alternatives = {}, {}
        # a correction can also supply a word Wiktionary's table lacks
        for (cid, g), fix in OVERRIDES.items():
            if cid == c["id"] and fix and g not in cands and g in ours:
                cands[g] = [["", "", fix[0], fix[1], [], "", ""]]
        for g, items in cands.items():
            ranked = sorted(items, key=lambda it: (penalty(it, items, c["id"], main_script.get(g)), items.index(it)))
            best = ranked[0]
            word, roman = best[2], best[3]
            fixed = (c["id"], g) in OVERRIDES
            if fixed:
                if OVERRIDES[(c["id"], g)] is None:
                    continue
                word, roman = OVERRIDES[(c["id"], g)]
            pair = HAN_PAIR.match(word.strip())
            # a hand-checked form is kept as written (करता/करती keeps its slash)
            trad, simp = (pair.group(1), pair.group(2)) if pair else (word if fixed else clean(word), None)
            # junk romanisations: a language code where the reading should be
            # (Western Punjabi rows say "pnb", some Hokkien ones "zh-min-nan")
            roman = None if not roman or roman in (best[0], "pnb", "zh-min-nan") else roman if fixed else clean(roman)
            if not roman:
                roman = romanize.kana(best[6] or trad) or romanize.hangul(trad)
            # written in Latin letters like the rest of the language's words
            # (Javanese ꦒꦼꦠꦶꦃ → getih) when that's the usual script
            elif main_script.get(g) == "LATIN" and script_of(trad) not in (None, "LATIN") and script_of(roman) == "LATIN":
                trad, roman, simp = roman, None, None
            forms[g] = [trad, roman, 0] + ([simp] if simp and simp != trad else [])
            alternatives[g] = [it[2] for it in ranked[1:4]]
        # English is the headword language, so it is never in its own translation table
        forms["stan1293"] = [c["word"], None, 0]
        if c.get("asjp"):
            for g, wl in asjp.items():
                if g not in forms and c["asjp"] in wl:
                    forms[g] = [wl[c["asjp"]], None, 1]
        if not forms:
            print("no forms for", c["id"], file=sys.stderr)
            continue
        keys = {g: sound_key(f[0], f[1], transcribed=f[2] == 1) for g, f in forms.items()}
        audit[c["id"]] = {g: (forms[g], alternatives.get(g, [])) for g in forms}
        counts = Counter(keys.values())
        # the most common shapes get a colour; scattered ones fold into "other"
        top = [k for k, n in counts.most_common(7) if n >= max(3, len(forms) * 0.02) and k != "--"]
        groups = []
        for k in top:
            members = sorted((g for g in forms if keys[g] == k), key=lambda g: -speakers.get(g, 0))
            groups.append({"key": k, "n": len(members), "examples": [[g, forms[g][0]] for g in members[:4]]})
        gi = {k: i for i, k in enumerate(top)}
        out = {
            "id": c["id"], "sense": table, "n": len(forms), "groups": groups,
            # [glottocode, word, romanisation, source, group, simplified?]; Chinese
            # forms carry both scripts, the page picks one for the reader
            "forms": [[g, *forms[g][:3], gi.get(keys[g], -1), *forms[g][3:]] for g in sorted(forms, key=lambda g: -speakers.get(g, 0))],
        }
        (OUT / f"{c['id']}.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
        index.append({"id": c["id"], "cat": c["cat"], "zh": c["zh"], "en": c["en"], "n": len(forms),
                      "wiki": sum(1 for f in forms.values() if f[2] == 0)})
        print(f"{c['id']:10s} {len(forms):5d} forms ({index[-1]['wiki']} Wiktionary)  sense: {table[:50] if table else '-'}", file=sys.stderr)
    (OUT / "index.json").write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")))
    print("most common unmapped Wiktionary languages:", unmapped.most_common(25), file=sys.stderr)
    write_audit(audit, langs, speakers)


def write_audit(audit, langs, speakers, n=90):
    """the chosen word and runners-up for the most-spoken languages, for review"""
    top = [l for l in sorted(langs, key=lambda l: -(l["speakers"] or 0))
           if sum(1 for c in audit.values() if l["id"] in c and c[l["id"]][0][2] == 0) > 40][:n]
    lines = ["# Word map audit", "", "Chosen form, then runners-up. Review and add OVERRIDES in words.py.", ""]
    for l in top:
        lines.append(f"## {l['en']} ({l['id']})")
        for cid, forms in audit.items():
            if l["id"] in forms:
                (word, roman, src, *simp), alts = forms[l["id"]]
                lines.append(f"- {cid}: **{word}**{' / ' + simp[0] if simp else ''}{f' ({roman})' if roman else ''}{' [ASJP]' if src else ''}{'  ← ' + ' · '.join(alts) if alts else ''}")
        lines.append("")
    (RAW / "wiktionary" / "audit.md").write_text("\n".join(lines))


if __name__ == "__main__":
    main()
