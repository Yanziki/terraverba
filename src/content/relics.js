// Relics of writing: objects that tell the story of a script or a language,
// pinned where they were made or found (a layer on the globe, off by default).
// Images are Wikimedia Commons files kept in public/img/relics (<id>.jpg for
// the card, <id>-pin.jpg for the pin); `credit` is author and licence, `page`
// the file's Commons page. Other locales' text comes from
// content/translations/<loc>.js (`relics`), merged by mergeRelicText.
const COMMONS = 'https://commons.wikimedia.org/wiki/File:';

export const RELICS = [
  {
    id: 'rosetta', lat: 31.4, lon: 30.42, langs: ['egyp1246', 'copt1239'], story: ['people', 2],
    credit: 'Hans Hillewaert · CC BY-SA 4.0', page: `${COMMONS}Rosetta_Stone.JPG`,
    name: { zh: '罗塞塔石碑', en: 'The Rosetta Stone' },
    when: { zh: '公元前 196 年', en: '196 BC' },
    place: { zh: '埃及罗塞塔出土，现藏大英博物馆', en: 'Found at Rosetta, Egypt; now in the British Museum' },
    hook: {
      zh: '同一道诏令刻了三遍：圣书体、世俗体和古希腊文。凭着读得懂的希腊文，商博良在 1822 年破译了埃及象形文字。',
      en: 'One decree carved three times — in hieroglyphs, in Demotic and in Greek. With the Greek to go on, Champollion cracked Egyptian hieroglyphs in 1822.',
    },
  },
  {
    id: 'sinai', lat: 29.04, lon: 33.46, langs: ['phoe1239'],
    credit: 'Onceinawhile · CC BY-SA 4.0', page: `${COMMONS}Serabit_sphinx_(EA41748).png`,
    name: { zh: '塞拉比特·卡迪姆的小狮身人面像', en: 'The Serabit el-Khadim sphinx' },
    when: { zh: '约 3800 年前', en: 'About 3,800 years ago' },
    place: { zh: '西奈半岛，现藏大英博物馆', en: 'Sinai; now in the British Museum' },
    hook: {
      zh: '身上刻着几个简单的符号，是已知最早的字母文字之一。今天的拉丁、希腊、阿拉伯、希伯来字母，都能一路追溯到这种文字。',
      en: 'A few simple signs scratched on its side are among the earliest alphabetic writing known. The Latin, Greek, Arabic and Hebrew alphabets can all be traced back to this script.',
    },
  },
  {
    id: 'ezana', lat: 14.13, lon: 38.72, langs: ['geez1241'],
    credit: 'Rajesh Singh · CC BY 2.0', page: `${COMMONS}EzanaGreekTablet.jpg`,
    name: { zh: '埃扎纳石碑', en: 'The Ezana Stone' },
    when: { zh: '4 世纪', en: '4th century' },
    place: { zh: '埃塞俄比亚阿克苏姆', en: 'Aksum, Ethiopia' },
    hook: {
      zh: '阿克苏姆国王埃扎纳用吉兹语、萨巴语和希腊语记下自己的战功，也记下他皈依基督教。吉兹字母后来成了阿姆哈拉语、提格利尼亚语等语言的文字。',
      en: 'King Ezana of Aksum recorded his campaigns, and his turn to Christianity, in Ge’ez, Sabaean and Greek. The Ge’ez script lives on in the writing of Amharic, Tigrinya and other languages.',
    },
  },
  {
    id: 'meroitic', lat: 16.94, lon: 33.73, langs: ['mero1237'],
    credit: 'Pymouss · CC BY 3.0', page: `${COMMONS}British_Museum_-_Hamadab_Stela_01.jpg`,
    name: { zh: '哈马达卜石碑', en: 'The Hamadab Stela' },
    when: { zh: '公元前 1 世纪', en: '1st century BC' },
    place: { zh: '苏丹麦罗埃附近，现藏大英博物馆', en: 'Near Meroë, Sudan; now in the British Museum' },
    hook: {
      zh: '用麦罗埃文字刻成。1909 年字母就已破译，每个字都念得出来，可这门语言的意思至今大多读不懂。',
      en: 'Carved in Meroitic script. Its letters were deciphered in 1909, so every word can be read aloud — yet most of what the language says is still not understood.',
    },
  },
  {
    id: 'behistun', lat: 34.39, lon: 47.44, langs: ['oldp1254', 'elam1244', 'akka1240'],
    credit: 'Public domain', page: `${COMMONS}Behistun_inscription_reliefs.jpg`,
    name: { zh: '贝希斯敦铭文', en: 'The Behistun Inscription' },
    when: { zh: '约公元前 520 年', en: 'About 520 BC' },
    place: { zh: '伊朗克尔曼沙阿', en: 'Kermanshah, Iran' },
    hook: {
      zh: '大流士一世把自己的功绩用古波斯语、埃兰语和巴比伦语刻在约百米高的崖壁上。19 世纪英国军官罗林森攀崖抄录，它成了破译楔形文字的钥匙。',
      en: 'Darius I had his deeds carved in Old Persian, Elamite and Babylonian on a cliff face some 100 metres up. Copied at great risk by the British officer Henry Rawlinson in the 19th century, it became the key to cuneiform.',
    },
  },
  {
    id: 'gilgamesh', lat: 36.36, lon: 43.15, langs: ['akka1240'],
    credit: 'BabelStone · CC0', page: `${COMMONS}British_Museum_Flood_Tablet.jpg`,
    name: { zh: '洪水泥板', en: 'The Flood Tablet' },
    when: { zh: '公元前 7 世纪', en: '7th century BC' },
    place: { zh: '伊拉克尼尼微，现藏大英博物馆', en: 'Nineveh, Iraq; now in the British Museum' },
    hook: {
      zh: '《吉尔伽美什史诗》的第十一块泥板，讲一场毁灭世界的大洪水。1872 年乔治·史密斯读出它时，人们惊讶地发现它和挪亚方舟的故事极为相似。',
      en: 'Tablet XI of the Epic of Gilgamesh tells of a flood that destroys the world. When George Smith read it in 1872, people were astonished at how closely it matched the story of Noah’s Ark.',
    },
  },
  {
    id: 'orkhon', lat: 47.56, lon: 102.84, langs: ['oldu1238'],
    credit: 'Betta27 · Public domain', page: `${COMMONS}Bilge_Khagan_monument_Mongolia.JPG`,
    name: { zh: '毗伽可汗碑', en: 'The Bilge Khagan inscription' },
    when: { zh: '735 年', en: 'AD 735' },
    place: { zh: '蒙古鄂尔浑河谷', en: 'Orkhon Valley, Mongolia' },
    hook: {
      zh: '用古突厥如尼文刻成，是已知最早的突厥语文献之一，碑的另一面刻着汉文。1893 年由丹麦语言学家汤姆森破译。',
      en: 'Written in Old Turkic runes, it is among the earliest known texts in any Turkic language; another face carries an inscription in Chinese. The Danish linguist Vilhelm Thomsen deciphered the script in 1893.',
    },
  },
  {
    id: 'indus', lat: 27.33, lon: 68.14, langs: [],
    credit: 'Ernest Mackay (1935) · Public domain', page: `${COMMONS}Unicorn_with_object._Mohenjo-daro.jpg`,
    name: { zh: '印度河印章', en: 'An Indus seal' },
    when: { zh: '约公元前 2500—前 1900 年', en: 'About 2500–1900 BC' },
    place: { zh: '巴基斯坦摩亨佐-达罗', en: 'Mohenjo-daro, Pakistan' },
    hook: {
      zh: '刻着一头“独角兽”和一行神秘符号。这样的铭文已发现几千件，但平均每段只有五个符号左右，至今没人读懂，甚至有学者怀疑它算不算文字。',
      en: 'A “unicorn” and a line of mysterious signs. Thousands of such inscriptions have been found, but they average only about five signs each; no one has read them, and some scholars doubt they are writing at all.',
    },
  },
  {
    id: 'ashoka', lat: 27.47, lon: 83.28, langs: ['pali1273'],
    credit: 'Photo Dharma · CC BY 2.0', page: `${COMMONS}Lumbini_-_Pillar_Edict_in_Brahmi_Script,_Lumbini_(9241396121).jpg`,
    name: { zh: '阿育王石柱', en: 'Ashoka’s pillar at Lumbini' },
    when: { zh: '约公元前 249 年', en: 'About 249 BC' },
    place: { zh: '尼泊尔蓝毗尼', en: 'Lumbini, Nepal' },
    hook: {
      zh: '阿育王在佛陀诞生地立柱刻文，用的是婆罗米文。从天城文、泰米尔文到泰文、藏文，南亚和东南亚的大多数文字都是它的后代。1837 年由普林塞普破译。',
      en: 'The emperor Ashoka raised this pillar at the Buddha’s birthplace and inscribed it in Brahmi. Most scripts of South and Southeast Asia, from Devanagari and Tamil to Thai and Tibetan, descend from it. James Prinsep deciphered it in 1837.',
    },
  },
  {
    id: 'oracle', lat: 36.13, lon: 114.31, langs: ['oldc1244', 'mand1415'],
    credit: 'Gary Lee Todd · CC0', page: `${COMMONS}Shang_Oracle_Bone_(Museum_Photo)_(45868930051).jpg`,
    name: { zh: '甲骨', en: 'An oracle bone' },
    when: { zh: '约公元前 1250—前 1046 年', en: 'About 1250–1046 BC' },
    place: { zh: '河南安阳殷墟', en: 'Yinxu, Anyang, China' },
    hook: {
      zh: '商朝王室用龟甲和牛骨占卜，把问卜的事刻在上面。这是已知最早成体系的汉字，和今天的汉字一脉相承。据说 1899 年，王懿荣在药材“龙骨”上认出了这些字。',
      en: 'Shang kings divined with turtle shells and ox bones and carved their questions on them: the earliest known body of Chinese writing, ancestor of the characters used today. The story goes that in 1899 the scholar Wang Yirong spotted the characters on “dragon bones” sold as medicine.',
    },
  },
  {
    id: 'hunmin', lat: 37.59, lon: 127.0, langs: ['kore1280'], story: ['people', 0],
    credit: 'Public domain', page: `${COMMONS}Hunminjeongeum_Haerye_02.jpg`,
    name: { zh: '《训民正音》解例本', en: 'The Hunminjeongeum Haerye' },
    when: { zh: '1446 年', en: '1446' },
    place: { zh: '首尔，涧松美术馆藏', en: 'Seoul (Kansong Art Museum)' },
    hook: {
      zh: '世宗大王颁布新字母时附的说明书，解释每个字母的造字原理。1940 年才重新被发现，1997 年列入世界记忆名录。',
      en: 'The manual King Sejong issued with his new alphabet, explaining how each letter was designed. Rediscovered only in 1940, it was inscribed on UNESCO’s Memory of the World register in 1997.',
    },
  },
  {
    id: 'laguna', lat: 14.3, lon: 121.46, langs: ['oldm1243', 'taga1270'],
    credit: 'Gary Todd · CC0', page: `${COMMONS}Laguna_Copper-Plate_Inscription,_c._10th_Century_AD_(32154734813).jpg`,
    name: { zh: '拉古纳铜版铭文', en: 'The Laguna Copperplate Inscription' },
    when: { zh: '900 年', en: 'AD 900' },
    place: { zh: '菲律宾拉古纳省', en: 'Laguna, Philippines' },
    hook: {
      zh: '1989 年，一位采沙工人在河口发现了它，卖给古董商，后来才辗转进了国家博物馆。上面用卡维文记载一笔债务一笔勾销，是菲律宾已知最早的文字记录。',
      en: 'A sand-quarry worker found it near a river mouth in 1989 and sold it to an antiques dealer, from whom it reached the National Museum. Written in Kawi script, it records the cancellation of a debt — the oldest known written document from the Philippines.',
    },
  },
  {
    id: 'rongorongo', lat: -27.12, lon: -109.35, langs: ['rapa1244'],
    credit: 'Stéphen-Charles Chauvet · CC BY-SA 3.0', page: `${COMMONS}Rongorongo_R-a_Atua-Mata-Riri.jpg`,
    name: { zh: '朗格朗格木板', en: 'A rongorongo tablet' },
    when: { zh: '年代不详，最晚 19 世纪中叶', en: 'Date unknown; by the mid-1800s at the latest' },
    place: { zh: '复活节岛（拉帕努伊）', en: 'Rapa Nui (Easter Island)' },
    hook: {
      zh: '一行行细小的图形，每读完一行要把木板倒转过来。19 世纪 60 年代已无人能读，现存只有二十多件，至今没有破译。',
      en: 'Rows of tiny figures, every other line upside down, so the reader turns the tablet at the end of each line. By the 1860s no one could read them; about two dozen survive, still undeciphered.',
    },
  },
  {
    id: 'linearb', lat: 37.73, lon: 22.76, langs: ['mode1248'],
    credit: 'Zde · CC BY-SA 4.0', page: `${COMMONS}Linear_B_tablet,_AM_of_Mycenae,_201730.jpg`,
    name: { zh: '线形文字 B 泥板', en: 'A Linear B tablet' },
    when: { zh: '约公元前 1400—前 1200 年', en: 'About 1400–1200 BC' },
    place: { zh: '希腊迈锡尼', en: 'Mycenae, Greece' },
    hook: {
      zh: '原本只是宫殿的账本，因为宫殿失火被烧硬才保存下来。1952 年，建筑师、业余爱好者文特里斯证明它写的是希腊语，比荷马早好几百年。',
      en: 'A palace account book, baked hard and preserved only because the palace burned down. In 1952 the architect and amateur Michael Ventris showed it was written in Greek — centuries before Homer.',
    },
  },
  {
    id: 'jelling', lat: 55.76, lon: 9.42, langs: ['oldn1244', 'dani1285'],
    credit: 'Niels Elgaard Larsen · CC BY-SA 3.0', page: `${COMMONS}Jelling_rune_stone.jpg`,
    name: { zh: '耶灵石', en: 'The Jelling stone' },
    when: { zh: '约 965 年', en: 'About 965' },
    place: { zh: '丹麦耶灵', en: 'Jelling, Denmark' },
    hook: {
      zh: '“蓝牙”哈拉尔国王立石，用如尼文宣告自己“赢得了整个丹麦和挪威，并使丹麦人成为基督徒”，它因此被称为“丹麦的出生证”。蓝牙技术以他命名，标志就是他名字首字母的两个如尼字母。',
      en: 'King Harald Bluetooth raised it to declare in runes that he “won for himself all of Denmark and Norway and made the Danes Christian”; it is called Denmark’s birth certificate. Bluetooth technology is named after him, and its logo joins his initials in runes.',
    },
  },
  {
    id: 'ogham', lat: 52.59, lon: -7.14, langs: ['oldi1245', 'iris1253'],
    credit: 'A.-K. D. · CC BY-SA 4.0', page: `${COMMONS}Tullaherin_Ogham_Stone_1.jpg`,
    name: { zh: '欧甘石', en: 'An ogham stone' },
    when: { zh: '4—6 世纪', en: '4th–6th century' },
    place: { zh: '爱尔兰基尔肯尼郡', en: 'County Kilkenny, Ireland' },
    hook: {
      zh: '欧甘字母是沿着石头棱角刻下的一道道短线，像尺子上的刻度。爱尔兰和不列颠共留下约 400 块，大多只刻着一个人名，是爱尔兰语最早的记录。',
      en: 'Ogham letters are notches and strokes cut along a stone’s edge, like the marks on a ruler. Some 400 such stones survive in Ireland and Britain, most bearing just a name: the earliest records of the Irish language.',
    },
  },
  {
    id: 'dresden', lat: 20.68, lon: -88.57, langs: ['epig1241', 'yuca1254'], story: ['americas', 2],
    credit: 'Public domain', page: `${COMMONS}Dresden_Codex_p09.jpg`,
    name: { zh: '德累斯顿抄本', en: 'The Dresden Codex' },
    when: { zh: '约 11—14 世纪', en: 'About 11th–14th century' },
    place: { zh: '墨西哥尤卡坦半岛', en: 'Yucatán Peninsula, Mexico' },
    hook: {
      zh: '西班牙人烧掉了大多数玛雅书籍，现存只有四部，这是其中之一，里面有精确的金星运行表。1739 年它被德累斯顿的王室图书馆买下，因此得名。',
      en: 'The Spanish burned most Maya books; only four survive, and this is one of them, with precise tables of the movements of Venus. The royal library in Dresden bought it in 1739, hence its name.',
    },
  },
  {
    id: 'mendoza', lat: 19.43, lon: -99.13, langs: ['clas1250'], story: ['americas', 3],
    credit: 'Bodleian Libraries · Public domain', page: `${COMMONS}CodexMendoza01.jpg`,
    name: { zh: '门多萨抄本', en: 'The Codex Mendoza' },
    when: { zh: '约 1541 年', en: 'About 1541' },
    place: { zh: '墨西哥城', en: 'Mexico City' },
    hook: {
      zh: '阿兹特克抄写员用图画文字为西班牙国王记录帝国的历史和贡品。第一页的鹰立仙人掌，是特诺奇蒂特兰建城的传说，后来成了墨西哥国旗上的图案。运往西班牙的船被法国私掠船劫走，抄本最后到了牛津。',
      en: 'Aztec scribes painted the history and tribute of their empire for the king of Spain. Its first page shows an eagle on a cactus — the founding of Tenochtitlan, and now the emblem on Mexico’s flag. The ship carrying it was seized by French privateers, and the codex ended up in Oxford.',
    },
  },
  {
    id: 'phoenix', lat: 34.54, lon: -84.91, langs: ['cher1273'], story: ['people', 1],
    credit: 'Public domain', page: `${COMMONS}Nameplate_or_Masthead_detail_on_February_21,_1828_of_the_Cherokee_Phoenix_first_issue_(cropped).jpg`,
    name: { zh: '《切罗基凤凰报》', en: 'The Cherokee Phoenix' },
    when: { zh: '1828 年', en: '1828' },
    place: { zh: '美国佐治亚州新埃乔塔', en: 'New Echota, Georgia, USA' },
    hook: {
      zh: '美国原住民办的第一份报纸，英文和切罗基文对照印刷，用的正是塞阔雅发明的音节文字。',
      en: 'The first newspaper published by Native Americans, printed in English and in Cherokee, in the syllabary Sequoyah invented.',
    },
  },
  {
    id: 'khipu', lat: -13.53, lon: -71.97, langs: ['cusc1236'], story: ['americas', 1],
    credit: 'Brooklyn Museum · no known restrictions', page: `${COMMONS}Inca._Quipu.jpg`,
    name: { zh: '奇普（结绳）', en: 'A khipu' },
    when: { zh: '约 15 世纪', en: 'About 15th century' },
    place: { zh: '秘鲁库斯科', en: 'Cusco, Peru' },
    hook: {
      zh: '印加帝国没有书面文字，却用绳结按十进位记录人口、贡赋和历法。有学者认为奇普里还记着故事和名字——果真如此，它就是一种至今读不懂的“文字”。',
      en: 'The Inca Empire had no script, yet it recorded people, tribute and calendars in knotted cords, in base ten. Some scholars think khipus also held stories and names — if so, they are a kind of writing no one can yet read.',
    },
  },
];

// a locale's text, { id: { name, when, place, hook } }, into the objects tr() reads
export function mergeRelicText(code, content) {
  for (const [id, text] of Object.entries(content?.relics ?? {})) {
    const r = RELICS.find((x) => x.id === id);
    if (!r) continue;
    for (const [field, value] of Object.entries(text)) if (r[field]) r[field][code] = value;
  }
}
