"""Romanisation for Japanese kana (Hepburn) and Korean Hangul (Revised
Romanisation), used when a Wiktionary entry gives the word without one.
Deliberately simple: syllable by syllable, no sound-change rules beyond the
common ones."""
import re

_KANA = {
    "あ": "a", "い": "i", "う": "u", "え": "e", "お": "o", "か": "ka", "き": "ki", "く": "ku", "け": "ke", "こ": "ko",
    "さ": "sa", "し": "shi", "す": "su", "せ": "se", "そ": "so", "た": "ta", "ち": "chi", "つ": "tsu", "て": "te", "と": "to",
    "な": "na", "に": "ni", "ぬ": "nu", "ね": "ne", "の": "no", "は": "ha", "ひ": "hi", "ふ": "fu", "へ": "he", "ほ": "ho",
    "ま": "ma", "み": "mi", "む": "mu", "め": "me", "も": "mo", "や": "ya", "ゆ": "yu", "よ": "yo",
    "ら": "ra", "り": "ri", "る": "ru", "れ": "re", "ろ": "ro", "わ": "wa", "ゐ": "i", "ゑ": "e", "を": "o", "ん": "n",
    "が": "ga", "ぎ": "gi", "ぐ": "gu", "げ": "ge", "ご": "go", "ざ": "za", "じ": "ji", "ず": "zu", "ぜ": "ze", "ぞ": "zo",
    "だ": "da", "ぢ": "ji", "づ": "zu", "で": "de", "ど": "do", "ば": "ba", "び": "bi", "ぶ": "bu", "べ": "be", "ぼ": "bo",
    "ぱ": "pa", "ぴ": "pi", "ぷ": "pu", "ぺ": "pe", "ぽ": "po", "ゔ": "vu",
    "ぁ": "a", "ぃ": "i", "ぅ": "u", "ぇ": "e", "ぉ": "o",
}
_YOON = {"ゃ": "a", "ゅ": "u", "ょ": "o"}
_MACRON = {"a": "ā", "i": "ī", "u": "ū", "e": "ē", "o": "ō"}


def kana(text):
    """かな/カナ → Hepburn with macrons (ねこ → neko, コーヒー → kōhī)"""
    # katakana → hiragana
    s = "".join(chr(ord(c) - 0x60) if "ァ" <= c <= "ヶ" else c for c in text)
    if not re.fullmatch(r"[ぁ-ゟー・\s]+", s):
        return None
    out = ""
    i = 0
    double = False
    while i < len(s):
        c = s[i]
        if c == "っ":
            double = True
            i += 1
            continue
        if c == "ー":
            if out and out[-1] in _MACRON:
                out = out[:-1] + _MACRON[out[-1]]
            i += 1
            continue
        r = _KANA.get(c)
        if r is None:
            out += " " if c in "・ " else ""
            i += 1
            continue
        if i + 1 < len(s) and s[i + 1] in _YOON and r.endswith("i"):
            r = (r[:-1] if r in ("shi", "chi", "ji") else r[:-1] + "y") + _YOON[s[i + 1]]
            i += 1
        if c == "ん" and i + 1 < len(s) and _KANA.get(s[i + 1], "x")[0] in "aiueoy":
            r = "n'"
        if double:
            r = ("t" if r.startswith("ch") else r[0]) + r
            double = False
        out += r
        i += 1
    # long vowels written with う / お
    out = re.sub(r"ou(?![aiueo])", "ō", out)
    out = re.sub(r"uu", "ū", out)
    return out


_INIT = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"]
_VOW = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"]
_FIN = ["", "k", "k", "k", "n", "n", "n", "t", "l", "k", "m", "l", "l", "l", "p", "l", "m", "p", "p", "t", "t", "ng", "t", "t", "k", "t", "p", "t"]
# a final consonant carried over to a following vowel keeps its full sound
_LINK = ["", "g", "kk", "ks", "n", "nj", "nh", "d", "r", "lg", "lm", "lb", "ls", "lt", "lp", "lh", "m", "b", "bs", "s", "ss", "ng", "j", "ch", "k", "t", "p", "h"]


def hangul(text):
    """한글 → Revised Romanisation (물고기 → mulgogi)"""
    if not re.fullmatch(r"[가-힣\s]+", text):
        return None
    out = ""
    syl = [ord(c) - 0xAC00 if "가" <= c <= "힣" else None for c in text]
    for k, n in enumerate(syl):
        if n is None:
            out += " "
            continue
        ini, vow, fin = n // 588, (n % 588) // 28, n % 28
        prev = syl[k - 1] if k else None
        if ini == 5:  # ㄹ: l after another ㄹ, otherwise r
            head = "l" if prev is not None and prev % 28 == 8 else "r"
        else:
            head = _INIT[ini]
        nxt = syl[k + 1] if k + 1 < len(syl) else None
        tail = _LINK[fin] if fin and nxt is not None and nxt // 588 == 11 and fin != 21 else _FIN[fin]
        out += head + _VOW[vow] + tail
    return out.strip()
