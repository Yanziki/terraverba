// Guided stories. Each chapter moves the globe (view), decides which
// languages stay lit (focus), and may draw routes (arcs) or a word table.
// Placeholders in braces — {CN}, {total}… — are filled from the live data.
// Text other than en/zh comes from content/translations/<locale>.js, keyed by
// path ("tea.chapters[0].body"), and is merged in when the language loads.
import { onContent } from '../i18n/index.js';
import { THEME } from '../theme.js';

// route colours, brighter on the dark theme so they read against the night globe
const VERMILION = THEME.lift ? '#ee93b2' : '#b03a6a';
const INDIGO = THEME.lift ? '#8fb2ff' : '#2f4f8f';

const TE = ['minn1241', 'dutc1256', 'stan1293', 'stan1290', 'stan1295', 'stan1288', 'ital1282', 'stan1306', 'java1254', 'sinh1246', 'tami1289', 'dani1285', 'swed1254', 'finn1318', 'afri1274', 'latv1249', 'hebr1245', 'indo1316'];
const CHA = ['mand1415', 'yuec1235', 'port1283', 'nucl1643', 'kore1280', 'tibe1272', 'halh1238', 'west2369', 'hind1269', 'urdu1245', 'stan1318', 'nucl1301', 'russ1263', 'swah1253', 'mode1248', 'thai1261', 'viet1252'];

const ALL = [
  {
    id: 'tea',
    title: { zh: '一个字的两条路', en: 'One word, two roads' },
    // sea route in indigo, land route in vermilion, whatever the family
    paint: [{ ids: TE, color: INDIGO }, { ids: CHA, color: VERMILION }],
    kicker: { zh: '茶 · tea · chá', en: 'tea · chá · 茶' },
    blurb: {
      zh: '世界上几乎所有语言里的“茶”，不是像 te，就是像 cha。这取决于茶是从海上来的，还是从陆上来的。',
      en: 'Almost every language calls tea either something like te or something like cha — depending on whether it arrived by sea or by land.',
    },
    chapters: [
      {
        title: { zh: '同一种叶子，两种读音', en: 'One leaf, two sounds' },
        body: {
          zh: '茶的故乡在中国。可是“茶”这个字传遍世界时，几乎只留下了两种读音：像 te 的，和像 cha 的。它们都来自汉语——闽南语说 tê，官话和粤语说 chá。区别只在于，茶叶是从哪个港口、沿哪条路离开的。',
          en: 'Tea comes from China, but as the word travelled the world it settled into just two shapes: something like te, or something like cha. Both are Chinese — Min Nan says tê, Mandarin and Cantonese say chá. What decided between them was the port, and the road, the leaves left by.',
        },
        view: { lat: 25, lon: 114, dist: 2.1 },
        focus: { ids: ['minn1241', 'mand1415', 'yuec1235'] },
        strong: ['minn1241', 'mand1415', 'yuec1235'],
        table: { rows: [['minn1241', 'tê'], ['mand1415', 'chá'], ['yuec1235', 'caa4']] },
      },
      {
        title: { zh: '海路：te', en: 'By sea: te' },
        body: {
          zh: '17 世纪，荷兰东印度公司主宰了海上的茶叶贸易。他们从福建沿海和巴达维亚（今雅加达）的闽南商人手中买茶，也学会了 tê 这个读音。乘着荷兰的商船，te 传到了阿姆斯特丹，再传到伦敦、巴黎和柏林。',
          en: 'In the 17th century the Dutch East India Company dominated the sea trade in tea. Buying from Hokkien merchants on the Fujian coast and in Batavia (now Jakarta), the Dutch picked up the word tê — and carried it on their ships to Amsterdam, then London, Paris and Berlin.',
        },
        view: { lat: 28, lon: 60, dist: 3.6 },
        focus: { ids: TE },
        strong: ['minn1241', 'dutc1256', 'stan1293'],
        arcs: [
          { from: [24.48, 118.09], to: [-6.13, 106.82], color: INDIGO },
          { from: [-6.13, 106.82], to: [-33.9, 18.4], color: INDIGO },
          { from: [-33.9, 18.4], to: [52.37, 4.9], color: INDIGO },
          { from: [52.37, 4.9], to: [51.5, -0.13], color: INDIGO, weight: 0.7 },
          { from: [52.37, 4.9], to: [48.86, 2.35], color: INDIGO, weight: 0.7 },
          { from: [52.37, 4.9], to: [52.52, 13.4], color: INDIGO, weight: 0.7 },
        ],
        table: {
          rows: [['minn1241', 'tê'], ['dutc1256', 'thee'], ['stan1293', 'tea'], ['stan1290', 'thé'], ['stan1295', 'Tee'],
            ['stan1288', 'té'], ['stan1306', 'teh'], ['java1254', 'tèh'], ['sinh1246', 'tē']],
        },
      },
      {
        title: { zh: '陆路：cha', en: 'By land: cha' },
        body: {
          zh: '在陆地上，茶叶沿着丝绸之路和茶马古道向西、向北而去，带着北方的读音 cha。于是有了波斯语的 chāy、阿拉伯语的 shāy、土耳其语的 çay、俄语的 chay（чай）；再经印度洋上的商人，到了东非的斯瓦希里语：chai。',
          en: 'Overland, tea went west and north along the Silk Road and the Tea Horse Road, carrying the northern sound cha: Persian chāy, Arabic shāy, Turkish çay, Russian chay (чай) — and, through Indian Ocean traders, Swahili chai in East Africa.',
        },
        view: { lat: 38, lon: 68, dist: 3.4 },
        focus: { ids: CHA },
        strong: ['west2369', 'nucl1301', 'russ1263'],
        arcs: [
          { from: [34.27, 108.95], to: [39.47, 75.99], color: VERMILION },
          { from: [39.47, 75.99], to: [39.65, 66.96], color: VERMILION },
          { from: [39.65, 66.96], to: [35.69, 51.39], color: VERMILION },
          { from: [35.69, 51.39], to: [41.01, 28.98], color: VERMILION },
          { from: [39.9, 116.4], to: [50.35, 106.45], color: VERMILION },
          { from: [50.35, 106.45], to: [55.75, 37.62], color: VERMILION },
          { from: [25.04, 102.71], to: [29.65, 91.1], color: VERMILION, weight: 0.7 },
          { from: [35.69, 51.39], to: [28.6, 77.2], color: VERMILION, weight: 0.7 },
          { from: [28.6, 77.2], to: [-4.04, 39.67], color: VERMILION, weight: 0.7 },
        ],
        table: {
          rows: [['west2369', 'chāy'], ['stan1318', 'shāy'], ['nucl1301', 'çay'], ['russ1263', 'chay'], ['hind1269', 'chāy'],
            ['swah1253', 'chai'], ['tibe1272', 'ja'], ['halh1238', 'tsai'], ['mode1248', 'tsai']],
        },
      },
      {
        title: { zh: '例外：葡萄牙', en: 'The exception: Portugal' },
        body: {
          zh: '葡萄牙人也是从海上来的，为什么说 chá？因为他们在中国的据点是澳门，而澳门人说粤语。日语和朝鲜语也说 cha——茶更早就随着僧侣和使节直接从中国传了过去。还有一个藏得很深的例外：波兰语的 herbata 来自拉丁语 herba thea，“茶草”，词尾里其实藏着 te。',
          en: 'The Portuguese came by sea too — so why chá? Their foothold in China was Macau, where people speak Cantonese. Japanese and Korean say cha as well: tea reached them much earlier, with monks and envoys. And one well-hidden case: Polish herbata comes from Latin herba thea, “tea herb” — te is tucked inside.',
        },
        view: { lat: 30, lon: 60, dist: 3.8 },
        focus: { ids: ['port1283', 'nucl1643', 'kore1280', 'poli1260', 'yuec1235'] },
        strong: ['port1283', 'poli1260'],
        arcs: [
          { from: [22.2, 113.55], to: [-33.9, 18.4], color: VERMILION },
          { from: [-33.9, 18.4], to: [38.72, -9.14], color: VERMILION },
        ],
        table: { rows: [['port1283', 'chá'], ['nucl1643', 'cha（茶）'], ['kore1280', 'cha（차）'], ['poli1260', 'herbata']] },
      },
      {
        title: { zh: '一张地图，两段历史', en: 'One map, two histories' },
        body: {
          zh: '把所有说 te 和 cha 的语言放在一起，就得到一张贸易史的地图：沿海与欧洲多说 te，内陆与伊斯兰世界多说 cha。下次喝茶时，你说出的那个音节，就是几百年前一艘船或一支驼队的回声。',
          en: 'Put every te and every cha together and you get a map of trade history: coasts and western Europe say te, the interior and the Islamic world say cha. The next time you ask for tea, the syllable you use is an echo of a ship or a caravan, centuries ago.',
        },
        view: { lat: 25, lon: 55, dist: 4.4 },
        focus: { ids: [...TE, ...CHA] },
        source: { zh: '参考：Östen Dahl，《世界语言结构地图集》（WALS）第 138 章“茶”。', en: 'After Östen Dahl, “Tea”, chapter 138 of the World Atlas of Language Structures (WALS).' },
      },
    ],
  },

  {
    id: 'sinitic',
    title: { zh: '汉语不止一种', en: 'Chinese is not one language' },
    kicker: { zh: '汉语族与中国的语言', en: 'The Sinitic languages and China' },
    blurb: {
      zh: '上海人、广州人和厦门人各说各的“家乡话”，往往谁也听不懂谁。在语言学家眼里，它们是一个家族里的不同语言。',
      en: 'People from Shanghai, Guangzhou and Xiamen may not understand each other’s home speech at all. To a linguist these are different languages in one family.',
    },
    chapters: [
      {
        title: { zh: '一个家族', en: 'A family' },
        body: {
          zh: '在语言学家看来，“汉语”更像一个语族：官话、吴语、粤语、闽语、客家话、湘语、赣语……它们之间的差别，常常比西班牙语和意大利语之间还大。把它们维系在一起的，是共同的祖先和共同的书面语。',
          en: 'To linguists, “Chinese” is less a language than a branch: Mandarin, Wu, Yue, Min, Hakka, Xiang, Gan… often further apart than Spanish and Italian. What binds them is a common ancestor and a shared written language.',
        },
        view: { lat: 30, lon: 112, dist: 2.0 },
        focus: { group: 'sini1245' },
        strong: ['mand1415', 'wuch1236', 'yuec1235', 'minn1241', 'hakk1236', 'xian1251', 'ganc1239'],
      },
      {
        title: { zh: '同一个“人”字', en: 'The same character, 人' },
        body: {
          zh: '写下来都是“人”，读出来却各不相同。这些读音之间有严格的对应规律——正是这种规律，让语言学家能够一步步推回它们共同的祖先：中古汉语，乃至上古汉语。',
          en: 'Written the same, spoken differently. The differences follow strict correspondences — and those regular patterns are what let linguists reason back to the common ancestor: Middle Chinese, and before it Old Chinese.',
        },
        view: { lat: 28, lon: 115, dist: 1.8 },
        focus: { ids: ['mand1415', 'wuch1236', 'yuec1235', 'minn1241', 'hakk1236'] },
        strong: ['mand1415', 'wuch1236', 'yuec1235', 'minn1241', 'hakk1236'],
        table: {
          caption: { zh: '“人”', en: '人 “person”' },
          rows: [['mand1415', 'rén'], ['wuch1236', 'nyin（上海）'], ['yuec1235', 'jan4'], ['minn1241', 'lâng'], ['hakk1236', 'ngìn']],
        },
      },
      {
        title: { zh: '消失的入声', en: 'The vanished checked tone' },
        body: {
          zh: '中古汉语有许多以 -p、-t、-k 收尾的字，称为“入声”。北方官话在大约元代前后失去了它们，粤语却完整地保留了下来。所以有些唐诗用普通话读不押韵，用粤语读却很顺。',
          en: 'Middle Chinese had many syllables ending in -p, -t or -k — the “entering tone”. Northern Mandarin lost them around the Yuan dynasty; Cantonese kept them all. That is why some Tang poems rhyme better read in Cantonese than in Mandarin.',
        },
        view: { lat: 27, lon: 113, dist: 1.9 },
        focus: { ids: ['mand1415', 'yuec1235'] },
        strong: ['mand1415', 'yuec1235'],
        table: {
          columns: ['mand1415', 'yuec1235'],
          rows: [['十', 'shí', 'sap6'], ['日', 'rì', 'jat6'], ['一', 'yī', 'jat1'], ['六', 'liù', 'luk6'], ['八', 'bā', 'baat3'], ['白', 'bái', 'baak6']],
        },
      },
      {
        title: { zh: '下南洋', en: 'Across the southern seas' },
        body: {
          zh: '闽语被认为是最早从汉语主干分出的一支。明清以来，闽南人和客家人大量“下南洋”，闽南语于是在新加坡、马来西亚、菲律宾的华人社区里扎根，台湾的“台语”也属于闽南语。英语的 tea，就是从这里出发的。',
          en: 'Min is thought to be the earliest branch to split from the rest of Sinitic. From the Ming and Qing dynasties on, Hokkien and Hakka emigrants settled across Southeast Asia, so Min Nan took root in Singapore, Malaysia and the Philippines; Taiwanese is Min Nan too. English tea set out from here.',
        },
        view: { lat: 14, lon: 112, dist: 2.3 },
        focus: { ids: ['minn1241', 'hakk1236', 'mind1253', 'yuec1235'] },
        strong: ['minn1241'],
        arcs: [
          { from: [24.48, 118.09], to: [1.35, 103.82], color: INDIGO },
          { from: [24.48, 118.09], to: [5.41, 100.33], color: INDIGO, weight: 0.7 },
          { from: [24.48, 118.09], to: [14.6, 120.98], color: INDIGO, weight: 0.7 },
          { from: [24.48, 118.09], to: [23.0, 120.2], color: INDIGO, weight: 0.7 },
        ],
      },
      {
        title: { zh: '汉语的邻居', en: 'The neighbours of Chinese' },
        body: {
          zh: '汉语族的四周，生活着许多完全不同的语系：藏语、彝语等其他汉藏语言，壮语、侗语等侗台语言，苗瑶语言，维吾尔语、哈萨克语等突厥语言，蒙古语，满-通古斯语言，南亚语系的佤语，甚至还有印欧语系的塔吉克语（色勒库尔语）。它们中的许多正在悄悄流失。',
          en: 'Around the Sinitic languages live many unrelated families: other Sino-Tibetan languages such as Tibetan and Yi; Kra-Dai languages such as Zhuang and Kam; Hmong-Mien; Turkic Uyghur and Kazakh; Mongolian; Tungusic; Austroasiatic Wa; even Indo-European Sarikoli. Many of them are quietly fading.',
        },
        view: { lat: 32, lon: 103, dist: 2.5 },
        focus: { near: { lat: 32, lon: 103, km: 1900 } },
      },
    ],
  },

  {
    id: 'indo-european',
    title: { zh: '从梵语到英语', en: 'From Sanskrit to English' },
    kicker: { zh: '印欧语系的发现', en: 'Discovering Indo-European' },
    blurb: {
      zh: '1786 年，一位在印度的英国法官注意到：梵语的“父亲”“母亲”“三”，怎么和拉丁语这么像？',
      en: 'In 1786 a British judge in India noticed that Sanskrit words for father, mother and three looked strikingly like Latin.',
    },
    chapters: [
      {
        title: { zh: '加尔各答，1786', en: 'Calcutta, 1786' },
        body: {
          zh: '威廉·琼斯在加尔各答学习梵语时发现，它与希腊语、拉丁语的相似“不可能出于偶然”，三者一定出自某个“也许已不复存在”的共同源头。这个源头后来被称为“原始印欧语”。',
          en: 'Studying Sanskrit in Calcutta, William Jones found it resembled Greek and Latin too closely for chance: all three must have “sprung from some common source, which, perhaps, no longer exists”. That source came to be called Proto-Indo-European.',
        },
        view: { lat: 30, lon: 50, dist: 3.4 },
        focus: { ids: ['sans1269', 'lati1261', 'anci1242', 'oldi1245', 'russ1263', 'west2369', 'stan1293', 'tokh1243'] },
        strong: ['sans1269', 'lati1261', 'anci1242'],
        table: {
          caption: { zh: '“母亲”', en: '“mother”' },
          rows: [['sans1269', 'mātṛ́'], ['lati1261', 'māter'], ['anci1242', 'mḗtēr'], ['oldi1245', 'máthir'], ['russ1263', 'mat’'],
            ['west2369', 'mādar'], ['tokh1243', 'mācer'], ['stan1293', 'mother']],
        },
      },
      {
        title: { zh: '格林定律', en: 'Grimm’s law' },
        body: {
          zh: '为什么拉丁语的 pater、piscis、pēs 对应英语的 father、fish、foot？1822 年，雅各布·格林——就是编童话的格林兄弟中的哥哥——总结出规律：日耳曼诸语言把原始印欧语的 *p 变成了 f，*t 变成了 th，*k 变成了 h。语言的变化，原来是有规律的。',
          en: 'Why does Latin pater, piscis, pēs line up with English father, fish, foot? In 1822 Jacob Grimm — the elder of the fairy-tale brothers — set out the rule: the Germanic languages turned Proto-Indo-European *p into f, *t into th, *k into h. Sound change, it turned out, is regular.',
        },
        view: { lat: 50, lon: 8, dist: 2.2 },
        focus: { groups: ['germ1287', 'ital1284'] },
        strong: ['lati1261', 'stan1293'],
        table: {
          columns: ['lati1261', 'stan1293'],
          rows: [['', 'pater', 'father'], ['', 'piscis', 'fish'], ['', 'pēs', 'foot'], ['', 'trēs', 'three'], ['', 'centum', 'hundred'], ['', 'cornū', 'horn']],
        },
      },
      {
        title: { zh: '草原上的故乡', en: 'A homeland on the steppe' },
        body: {
          zh: '原始印欧语大约在距今六千到五千年前被使用。主流的“草原假说”认为，它的使用者生活在黑海—里海以北的草原上，随着驯化的马和带轮的车向四方扩散；另一派“安纳托利亚假说”则认为它随着早期农业从今天的土耳其传开。古代 DNA 研究近年来更多地支持前者。',
          en: 'Proto-Indo-European was spoken roughly six to five thousand years ago. The prevailing “steppe hypothesis” puts its speakers north of the Black and Caspian Seas, spreading with the horse and the wheeled wagon; the rival “Anatolian hypothesis” has it spreading with early farming from present-day Turkey. Ancient DNA has lately favoured the steppe.',
        },
        view: { lat: 44, lon: 50, dist: 3.0 },
        focus: { group: 'indo1319' },
        arcs: [
          { from: [47.5, 45], to: [50, 12], color: VERMILION },
          { from: [47.5, 45], to: [60, 15], color: VERMILION, weight: 0.8 },
          { from: [50, 12], to: [53, -8], color: VERMILION, weight: 0.8 },
          { from: [47.5, 45], to: [38, 23], color: VERMILION, weight: 0.8 },
          { from: [47.5, 45], to: [40, 34.6], color: VERMILION, weight: 0.8 },
          { from: [47.5, 45], to: [32, 53], color: VERMILION },
          { from: [32, 53], to: [28, 77], color: VERMILION },
          { from: [47.5, 45], to: [41.7, 82.9], color: VERMILION },
        ],
      },
      {
        title: { zh: '最东与最古', en: 'The easternmost, the oldest' },
        body: {
          zh: '印欧语系的边界比想象中更远。最东端的吐火罗语曾在新疆的绿洲城市使用，留下了佛经残卷；最古老的赫梯语刻在三千多年前安纳托利亚的泥板上。它们都已消亡，却是重建原始印欧语的关键证据。',
          en: 'The family reached further than you might think. Tocharian, its easternmost branch, was spoken in the oasis cities of Xinjiang and left Buddhist manuscripts; Hittite, the oldest attested, was pressed into Anatolian clay over three thousand years ago. Both are extinct — and both are crucial to reconstructing the parent language.',
        },
        view: { lat: 40, lon: 60, dist: 3.0 },
        focus: { ids: ['tokh1242', 'tokh1243', 'hitt1242', 'iris1253', 'oldi1245'] },
        strong: ['tokh1242', 'tokh1243', 'hitt1242'],
      },
      {
        title: { zh: '跨越大洋', en: 'Across the oceans' },
        body: {
          zh: '今天，约四成人类以印欧语言为母语——但这在很大程度上是最近五百年的结果：英语、西班牙语、葡萄牙语、法语随着殖民扩张跨越大洋，到了美洲、非洲和大洋洲，也挤压了当地成千上万种语言的生存空间。',
          en: 'Today about four in ten people speak an Indo-European language natively — largely the work of the last five hundred years, as English, Spanish, Portuguese and French crossed the oceans with colonial expansion, crowding out thousands of local languages.',
        },
        view: { lat: 20, lon: -30, dist: 4.6 },
        focus: { group: 'indo1319' },
        strong: ['stan1293', 'stan1288', 'port1283', 'stan1290'],
      },
    ],
  },

  {
    id: 'austronesian',
    title: { zh: '用独木舟写成的语系', en: 'A family written by canoes' },
    kicker: { zh: '南岛语系的大航海', en: 'The Austronesian voyages' },
    blurb: {
      zh: '从台湾出发，跨越太平洋和印度洋——在哥伦布之前，南岛语族就已经把语言带到了半个地球。',
      en: 'Setting out from Taiwan, across the Pacific and the Indian Ocean — long before Columbus, Austronesian speakers had carried their languages over half the globe.',
    },
    chapters: [
      {
        title: { zh: '起点：台湾', en: 'Where it began: Taiwan' },
        body: {
          zh: '南岛语系约有 1,250 种语言，但它最古老、最多样的分支都集中在台湾——阿美语、泰雅语、排湾语、布农语……语言学家相信，一个语系最多样的地方往往就是它的故乡。大约四千多年前，一些说南岛语的人开始从台湾南下。',
          en: 'Austronesian has some 1,250 languages, but its oldest and most diverse branches are all in Taiwan: Amis, Atayal, Paiwan, Bunun… Linguists reason that a family’s homeland is usually where it is most diverse. Some four thousand years ago and more, Austronesian speakers began moving south from Taiwan.',
        },
        view: { lat: 23.6, lon: 121, dist: 1.55 },
        focus: { near: { lat: 23.7, lon: 121, km: 260 }, family: 'aust1307' },
        strong: ['amis1246', 'paiw1248'],
      },
      {
        title: { zh: '岛屿之间', en: 'From island to island' },
        body: {
          zh: '他们先到达菲律宾，再向南进入婆罗洲、苏拉威西和爪哇，向东抵达马里亚纳群岛。今天的他加禄语、马来语、印度尼西亚语、爪哇语，都是这一波迁徙的后代。',
          en: 'They reached the Philippines first, then pushed south into Borneo, Sulawesi and Java, and east to the Marianas. Tagalog, Malay, Indonesian and Javanese all descend from these movements.',
        },
        view: { lat: 5, lon: 118, dist: 2.4 },
        focus: { family: 'aust1307' },
        strong: ['taga1270', 'stan1306', 'java1254'],
        arcs: [
          { from: [23.7, 121], to: [16.5, 121] },
          { from: [16.5, 121], to: [-1, 114] },
          { from: [-1, 114], to: [-7.5, 110] },
          { from: [16.5, 121], to: [-2, 120] },
          { from: [16.5, 121], to: [13.4, 144.8] },
        ],
      },
      {
        title: { zh: '横渡印度洋', en: 'Across the Indian Ocean' },
        body: {
          zh: '一千多年前，来自婆罗洲东南部的航海者向西横渡了整个印度洋，抵达非洲东侧的马达加斯加。所以，马达加斯加语最近的亲戚不在非洲，而在约七千公里外婆罗洲的马安延语。',
          en: 'More than a thousand years ago, seafarers from southeastern Borneo sailed west across the entire Indian Ocean to Madagascar, off Africa. That is why Malagasy’s closest relative is not in Africa but in Borneo, some 7,000 km away: Ma’anyan.',
        },
        view: { lat: -10, lon: 80, dist: 3.4 },
        focus: { ids: ['plat1254', 'maan1238'] },
        strong: ['plat1254', 'maan1238'],
        arcs: [{ from: [-2.2, 115.2], to: [-19, 47], color: VERMILION }],
      },
      {
        title: { zh: '最后的大洋', en: 'The last ocean' },
        body: {
          zh: '约三千年前，“拉皮塔”航海者进入远大洋洲，抵达斐济、汤加和萨摩亚。又过了将近两千年，波利尼西亚人驾着双体独木舟，凭星辰、洋流和海鸟导航，抵达夏威夷、复活节岛和新西兰——人类最后定居的大片土地之一。',
          en: 'Around three thousand years ago Lapita voyagers reached Remote Oceania — Fiji, Tonga, Samoa. Nearly two thousand years later Polynesians, navigating double-hulled canoes by stars, swells and birds, found Hawaii, Rapa Nui and New Zealand, among the last large lands people settled.',
        },
        view: { lat: -12, lon: -165, dist: 3.6 },
        focus: { group: 'poly1242' },
        strong: ['hawa1245', 'maor1246', 'samo1305', 'tahi1242'],
        arcs: [
          { from: [-5.5, 150], to: [-17.8, 178] },
          { from: [-17.8, 178], to: [-13.8, -172.1] },
          { from: [-13.8, -172.1], to: [-17.65, -149.4] },
          { from: [-17.65, -149.4], to: [19.8, -155.5], color: VERMILION },
          { from: [-17.65, -149.4], to: [-27.1, -109.35], color: VERMILION },
          { from: [-17.65, -149.4], to: [-38.5, 176], color: VERMILION },
        ],
      },
      {
        title: { zh: '“五”与“手”', en: '“Five” and “hand”' },
        body: {
          zh: '原始南岛语的“五”是 *lima，这个词同时也指“手”。几千年后，从台湾到夏威夷，人们仍然这样数到五。塔希提语是个例外：据说由于一种避讳习俗，原来的“五”被换成了 pae。',
          en: 'Proto-Austronesian *lima meant both “five” and “hand”. Thousands of years later, from Taiwan to Hawaii, people still count to five this way. Tahitian is the exception: the old word is said to have fallen under a naming taboo and was replaced by pae.',
        },
        view: { lat: -5, lon: 160, dist: 4.4 },
        focus: { ids: ['paiw1248', 'amis1246', 'taga1270', 'stan1306', 'java1254', 'plat1254', 'fiji1243', 'samo1305', 'hawa1245', 'maor1246', 'tahi1242'] },
        table: {
          caption: { zh: '“五”', en: '“five”' },
          rows: [['amis1246', 'lima'], ['paiw1248', 'lima'], ['taga1270', 'lima'], ['stan1306', 'lima'], ['java1254', 'lima'], ['plat1254', 'dimy'],
            ['fiji1243', 'lima'], ['samo1305', 'lima'], ['hawa1245', 'lima'], ['maor1246', 'rima'], ['tahi1242', 'pae']],
        },
      },
    ],
  },

  {
    id: 'isolates',
    title: { zh: '没有亲戚的语言', en: 'Languages without relatives' },
    kicker: { zh: '孤立语言', en: 'Language isolates' },
    blurb: {
      zh: '大多数语言都有成百上千的亲戚。但有些语言，找遍全世界也找不到一个。',
      en: 'Most languages have hundreds of relatives. A few have none anywhere in the world.',
    },
    chapters: [
      {
        title: { zh: '比利牛斯山的孤儿', en: 'The orphan of the Pyrenees' },
        body: {
          zh: '巴斯克语被印欧语言团团包围——西班牙语、法语、加斯科涅语——却和它们毫无关系。它很可能是印欧语言到来之前西欧语言的最后幸存者。看看它的数字，就知道它有多“不合群”。',
          en: 'Basque is ringed by Indo-European — Spanish, French, Gascon — and related to none of them. It is very likely the last survivor of the languages of western Europe before Indo-European arrived. Its numbers show how much it stands apart.',
        },
        view: { lat: 43, lon: -1.5, dist: 1.5 },
        focus: { ids: ['basq1248', 'stan1288', 'stan1290', 'stan1289'] },
        strong: ['basq1248'],
        table: {
          columns: ['basq1248', 'stan1288', 'stan1290'],
          rows: [['1', 'bat', 'uno', 'un'], ['2', 'bi', 'dos', 'deux'], ['3', 'hiru', 'tres', 'trois'], ['4', 'lau', 'cuatro', 'quatre'], ['5', 'bost', 'cinco', 'cinq']],
        },
      },
      {
        title: { zh: '群山之间', en: 'Among the mountains' },
        body: {
          zh: '在巴基斯坦北部的喀喇昆仑山谷里，布鲁夏斯基语四周是印欧语、汉藏语和突厥语——它和谁都不沾亲。高山与峡谷，常常是古老语言的避难所。',
          en: 'In the Karakoram valleys of northern Pakistan, Burushaski is surrounded by Indo-European, Sino-Tibetan and Turkic — and kin to none of them. Mountains and valleys are often refuges for old languages.',
        },
        view: { lat: 36.3, lon: 74.6, dist: 1.6 },
        focus: { ids: ['buru1296'] },
        strong: ['buru1296'],
      },
      {
        title: { zh: '泥板上的孤独', en: 'Alone on clay' },
        body: {
          zh: '苏美尔语是人类最早书写的语言之一，它同样是一种孤立语言。我们之所以知道它，是因为五千年前的美索不达米亚人把它刻在了泥板上；还有许多孤立语言没留下任何文字，就这样消失了。',
          en: 'Sumerian, one of humanity’s first written languages, is also an isolate. We know it only because Mesopotamians pressed it into clay five thousand years ago; countless other isolates vanished without a trace.',
        },
        view: { lat: 31.3, lon: 46, dist: 1.8 },
        focus: { ids: ['sume1241', 'akka1240'] },
        strong: ['sume1241'],
      },
      {
        title: { zh: '散落世界', en: 'Scattered across the world' },
        body: {
          zh: 'Glottolog 记录了 {isolates} 种孤立语言，它们几乎遍布每一块大陆，在美洲和新几内亚尤其多。每一种孤立语言都是一个独立的语系——在语言之树上，它们是孤零零的一棵树。',
          en: 'Glottolog lists {isolates} isolates, on almost every continent and especially in the Americas and New Guinea. Each counts as a family of one — in the forest of languages, a lone tree.',
        },
        view: { lat: 10, lon: -40, dist: 4.6 },
        focus: { isolates: true },
      },
    ],
  },

  {
    id: 'endangered',
    title: { zh: '正在变轻的声音', en: 'Voices growing faint' },
    kicker: { zh: '濒危与复兴', en: 'Endangerment and revival' },
    blurb: {
      zh: '每隔几个月，世界上就可能有一种语言失去最后一位母语者。但也有语言从“死亡”中回来。',
      en: 'Every few months a language may lose its last native speaker. But some languages have come back from the dead.',
    },
    chapters: [
      {
        title: { zh: '一半的语言', en: 'Half of all languages' },
        body: {
          zh: '在这颗地球仪的 {total} 种语言里，有 {endangered} 种处于不同程度的濒危状态，{extinct} 种已经消亡（空心圆点）。颜色越深，代表这种语言离消失越近。',
          en: 'Of the {total} languages on this globe, {endangered} are endangered to some degree and {extinct} are already extinct (the hollow dots). The darker the colour, the closer a language is to falling silent.',
        },
        view: { lat: 10, lon: 20, dist: 4.6 },
        colorMode: 'status',
      },
      {
        title: { zh: '澳大利亚', en: 'Australia' },
        body: {
          zh: '欧洲人到来时，澳大利亚有约 250 种语言；如今只有十几种还在被孩子们作为母语习得。随之消失的还有独特的思维方式——例如古古伊米迪尔语几乎不用“左”“右”，而用“东西南北”来描述一切位置。',
          en: 'Australia had about 250 languages when Europeans arrived; only a dozen or so are still learned by children. With them go distinctive ways of thinking — Guugu Yimithirr, for one, barely uses “left” and “right”, placing everything by compass direction.',
        },
        view: { lat: -24, lon: 134, dist: 2.3 },
        colorMode: 'status',
        focus: { macroarea: 'Australia' },
        strong: ['gugu1255'],
      },
      {
        title: { zh: '近在身边', en: 'Close to home' },
        body: {
          zh: '在东亚，满语曾是一个帝国的官方语言，如今母语者寥寥；北海道的阿伊努语只剩下极少的老人能说。语言的流失往往很安静：父母不再对孩子说，一代人之后，它就只存在于录音里了。',
          en: 'In East Asia, Manchu was once the official language of an empire and now has a handful of native speakers; Ainu in Hokkaido survives with very few elders. Language loss is usually quiet: parents stop speaking it to their children, and a generation later it lives only in recordings.',
        },
        view: { lat: 44, lon: 132, dist: 1.9 },
        colorMode: 'status',
        focus: { ids: ['manc1252', 'ainu1240', 'xibe1242', 'nucl1643', 'kore1280', 'mand1415'] },
        strong: ['manc1252', 'ainu1240'],
      },
      {
        title: { zh: '回来的语言', en: 'Languages that came back' },
        body: {
          zh: '消亡并非不可逆。希伯来语在近两千年没有母语者之后重新成为日常语言；夏威夷语和毛利语靠“语言巢”幼儿园回到孩子们口中；康沃尔语和马恩岛语甚至在“灭绝”之后被重新唤醒。',
          en: 'Loss is not always final. Hebrew became an everyday language again after nearly two thousand years without native speakers; Hawaiian and Māori returned to children through “language nest” preschools; Cornish and Manx were reawakened even after being declared extinct.',
        },
        view: { lat: 35, lon: -40, dist: 4.8 },
        focus: { ids: ['hebr1245', 'hawa1245', 'maor1246', 'corn1251', 'manx1243', 'wels1247'] },
        strong: ['hebr1245', 'hawa1245', 'maor1246', 'corn1251', 'manx1243'],
      },
      {
        title: { zh: '七千种看世界的方式', en: 'Seven thousand ways of seeing' },
        body: {
          zh: '每一种语言都是一套看世界的方式：怎样数数、怎样指路、怎样称呼亲人、怎样讲一个笑话。它们中的许多，你可能永远不会去学——但知道它们存在，本身就是一种珍惜。转动地球仪，去看看你从没听过的地方吧。',
          en: 'Every language is a way of seeing the world: how to count, give directions, name your kin, tell a joke. You may never learn most of them — but knowing they exist is itself a kind of care. Turn the globe and look somewhere you have never heard of.',
        },
        view: { lat: 0, lon: 140, dist: 4.4 },
        focus: null,
      },
    ],
  },
];

ALL.push(
  {
    id: 'africa',
    title: { zh: '搭嘴音、声调与班图人的远行', en: 'Clicks, tones and the Bantu journey' },
    kicker: { zh: '非洲的语言', en: 'The languages of Africa' },
    blurb: {
      zh: '非洲有两千多种语言，接近全世界的三分之一。这里有地球上最多样的发音，也有一次改变了半个大陆的迁徙。',
      en: 'Africa has more than two thousand languages, nearly a third of the world’s. It has the most varied sounds on Earth, and a migration that remade half a continent.',
    },
    chapters: [
      {
        title: { zh: '三分之一的语言', en: 'A third of all languages' },
        body: {
          zh: 'Glottolog 在非洲记录了 {africa} 种语言。20 世纪 60 年代，语言学家格林伯格把它们归为四大语系；今天，只有亚非语系和他所说的尼日尔-刚果语系的核心（大西洋-刚果语系）被普遍接受，“尼罗-撒哈拉”和“科伊桑”则被看作许多彼此独立的小语系与孤立语言的集合。',
          en: 'Glottolog records {africa} languages in Africa. In the 1960s Joseph Greenberg sorted them into four great families; today only Afro-Asiatic and the core of his Niger-Congo (Atlantic-Congo) are widely accepted, while “Nilo-Saharan” and “Khoisan” are seen as collections of independent families and isolates.',
        },
        view: { lat: 4, lon: 20, dist: 3.3 },
        focus: { macroarea: 'Africa' },
      },
      {
        title: { zh: '班图人的远行', en: 'The Bantu journey' },
        body: {
          zh: '大约三四千年前，说班图语的人从今天喀麦隆与尼日利亚交界一带出发，向东、向南扩散，最终覆盖了大半个非洲。今天约五百种班图语——斯瓦希里语、祖鲁语、绍纳语、林加拉语……——彼此相似，正是这次远行留下的足迹。',
          en: 'Some three to four thousand years ago, Bantu-speaking people began moving out from the borderlands of present-day Cameroon and Nigeria, east and south, until they covered much of the continent. The resemblances among today’s roughly five hundred Bantu languages — Swahili, Zulu, Shona, Lingala… — are the footprints of that journey.',
        },
        view: { lat: -6, lon: 24, dist: 3.0 },
        focus: { group: 'narr1281' },
        strong: ['swah1253', 'zulu1248', 'shon1251', 'ling1263'],
        arcs: [
          { from: [6, 11], to: [-4.3, 15.3], color: VERMILION },
          { from: [-4.3, 15.3], to: [-12, 17.5], color: VERMILION, weight: 0.8 },
          { from: [6, 11], to: [-1.5, 30.5], color: VERMILION },
          { from: [-1.5, 30.5], to: [-6.8, 39.3], color: VERMILION, weight: 0.8 },
          { from: [-1.5, 30.5], to: [-17.8, 31], color: VERMILION, weight: 0.8 },
          { from: [-17.8, 31], to: [-28.5, 30], color: VERMILION, weight: 0.8 },
        ],
      },
      {
        title: { zh: '名词的“类”', en: 'Noun classes' },
        body: {
          zh: '班图语言不分阴性阳性，却把名词分成十几个“类”，每一类有自己的前缀，句子里的其他词都要跟着变。在斯瓦希里语里，“人”是 mtu，“人们”是 watu；“书”是 kitabu，“（很多）书”是 vitabu。',
          en: 'Bantu languages have no masculine or feminine — instead they sort nouns into a dozen or more classes, each with its own prefix, and the other words in a sentence agree with it. In Swahili a person is mtu and people watu; a book is kitabu and books vitabu.',
        },
        view: { lat: -6.8, lon: 39.3, dist: 2.0 },
        focus: { ids: ['swah1253'] },
        strong: ['swah1253'],
        table: {
          columns: ['swah1253'],
          rows: [[{ zh: '人', en: 'person' }, 'm-tu'], [{ zh: '人们', en: 'people' }, 'wa-tu'], [{ zh: '书', en: 'book' }, 'ki-tabu'], [{ zh: '（很多）书', en: 'books' }, 'vi-tabu']],
        },
      },
      {
        title: { zh: '搭嘴音', en: 'Clicks' },
        body: {
          zh: '在南部非洲，有些语言把舌头从上颚“啧”地弹开发出的声音当作普通辅音——这就是搭嘴音。科伊科伊语、ǃXóõ 语和它们的邻居（旧称“科伊桑语”）有大量搭嘴音；坦桑尼亚的哈扎语和桑达韦语也有，二者都是孤立语言。祖鲁语和科萨语的搭嘴音，则是班图人南下之后从这些邻居那里借来的。',
          en: 'In southern Africa some languages use clicks — the sounds of the tongue snapping off the roof of the mouth — as ordinary consonants. Khoekhoe, ǃXóõ and their neighbours (once lumped together as “Khoisan”) have dozens of them; so do Hadza and Sandawe in Tanzania, both isolates. Zulu and Xhosa borrowed their clicks from these neighbours after Bantu speakers moved south.',
        },
        view: { lat: -16, lon: 27, dist: 2.6 },
        focus: { groups: ['khoe1240', 'tuuu1241', 'kxaa1236'], ids: ['hadz1240', 'sand1273', 'xhos1239', 'zulu1248'] },
        strong: ['nama1264', 'hadz1240', 'sand1273', 'xhos1239'],
      },
      {
        title: { zh: '会说话的鼓', en: 'Drums that talk' },
        body: {
          zh: '非洲的大多数语言都有声调。约鲁巴语区分高、中、低三个声调，同一串音节换一个声调，就成了另一个词。正因如此，约鲁巴人的“会说话的鼓”可以模仿句子的声调起伏，把话直接“敲”出来——懂的人一听就明白。',
          en: 'Most African languages are tonal. Yoruba distinguishes high, mid and low tones, and the same string of syllables on a different melody is a different word. That is why Yoruba “talking drums” can imitate the rise and fall of a sentence and beat out speech that listeners understand.',
        },
        view: { lat: 8, lon: 5, dist: 1.9 },
        focus: { ids: ['yoru1245', 'nucl1417', 'haus1257'] },
        strong: ['yoru1245'],
      },
    ],
  },
  {
    id: 'americas',
    title: { zh: '在哥伦布之前', en: 'Before Columbus' },
    kicker: { zh: '美洲的语言', en: 'The languages of the Americas' },
    blurb: {
      zh: '欧洲人到来时，美洲有上千种语言，分属一百多个互不相关的语系。许多至今仍在使用，也有许多已经沉默。',
      en: 'When Europeans arrived, the Americas held more than a thousand languages in well over a hundred unrelated families. Many are still spoken; many have fallen silent.',
    },
    chapters: [
      {
        title: { zh: '一百多个语系', en: 'More than a hundred families' },
        body: {
          zh: 'Glottolog 在南北美洲共记录了 {americas} 种语言。论语系之多，美洲是全世界最多样的地区之一：从阿拉斯加到火地岛，有一百多个彼此无法证明有关系的语系和孤立语言。',
          en: 'Glottolog records {americas} languages across North and South America. In variety of families the Americas are among the richest places on Earth: from Alaska to Tierra del Fuego, well over a hundred families and isolates with no demonstrable relationship to one another.',
        },
        view: { lat: 8, lon: -78, dist: 4.4 },
        focus: { macroarea: ['North America', 'South America'] },
      },
      {
        title: { zh: '印加的语言', en: 'The language of the Inca' },
        body: {
          zh: '克丘亚语（Runa Simi，意为“人的语言”）是印加帝国的通用语，帝国用打结的绳子“奇普”来记录数字。今天，克丘亚语族仍有数百万使用者，沿安第斯山脉从哥伦比亚分布到阿根廷，是美洲使用人数最多的原住民语言。',
          en: 'Quechua — Runa Simi, “the people’s language” — was the lingua franca of the Inca Empire, which kept its records on knotted cords called khipu. Today the Quechuan languages have millions of speakers along the Andes from Colombia to Argentina, the most widely spoken indigenous languages of the Americas.',
        },
        view: { lat: -12, lon: -74, dist: 2.2 },
        focus: { group: 'quec1387' },
        strong: ['cusc1236', 'ayac1239'],
      },
      {
        title: { zh: '刻在石头上的文字', en: 'Written in stone' },
        body: {
          zh: '玛雅文字是哥伦布之前的美洲唯一被基本破译的文字系统。直到 20 世纪下半叶，在苏联学者克诺罗佐夫证明它同时记录音节和词语之后，人们才逐渐读懂它。今天仍有数百万人说着约三十种玛雅语言，例如基切语和尤卡坦玛雅语。',
          en: 'Maya script is the only pre-Columbian writing system of the Americas to have been largely deciphered — a breakthrough of the late twentieth century, after the Soviet scholar Yuri Knorozov showed that it recorded syllables as well as words. Several million people still speak some thirty Mayan languages, among them K’iche’ and Yucatec.',
        },
        view: { lat: 16, lon: -90, dist: 1.9 },
        focus: { group: 'maya1287' },
        strong: ['kich1262', 'yuca1254'],
      },
      {
        title: { zh: '番茄与辣椒', en: 'Tomatoes and chillies' },
        body: {
          zh: '阿兹特克帝国说纳瓦特尔语。西班牙人从这里带走的不只是作物，还有它们的名字：tomato（番茄，来自 tomatl）、avocado（鳄梨，来自 āhuacatl）、chili（辣椒，来自 chīlli）、coyote（郊狼，来自 coyōtl）。今天仍有一百多万人说着纳瓦特尔语的各种变体。',
          en: 'The Aztec Empire spoke Nahuatl. The Spanish carried away not only its crops but their names: tomato (from tomatl), avocado (āhuacatl), chilli (chīlli), coyote (coyōtl). Over a million people still speak varieties of Nahuatl today.',
        },
        view: { lat: 19.4, lon: -99, dist: 1.8 },
        focus: { group: 'azte1234' },
        strong: ['clas1250'],
        table: { columns: ['stan1293', 'clas1250'], rows: [['', 'tomato', 'tomatl'], ['', 'avocado', 'āhuacatl'], ['', 'chilli', 'chīlli'], ['', 'coyote', 'coyōtl']] },
      },
      {
        title: { zh: '北方的声音', en: 'Voices of the north' },
        body: {
          zh: '在北美，纳瓦霍语曾在二战中成为无法破译的密码；切罗基人塞阔雅独自发明了一套文字；加拿大的因纽特语用一种源自传教士设计的音节文字书写。但北美的许多语言——单是加利福尼亚就曾有大约一百种——已经消失，或只剩少数老人还在说。',
          en: 'In North America, Navajo became an unbreakable code in the Second World War; the Cherokee Sequoyah invented a script single-handed; Inuktitut in Canada is written in a syllabary first devised by missionaries. But many of the continent’s languages — California alone had around a hundred — are gone, or spoken only by a few elders.',
        },
        view: { lat: 45, lon: -100, dist: 3.4 },
        colorMode: 'status',
        focus: { macroarea: 'North America' },
        strong: ['nava1243', 'cher1273', 'east2534'],
      },
    ],
  },
);

// People: one person (or a few) per chapter, with a portrait from Wikimedia
// Commons kept in public/img/people. All public domain except where the credit says.
const COMMONS = 'https://commons.wikimedia.org/wiki/File:';
ALL.push({
  id: 'people',
  title: { zh: '语言背后的人', en: 'The people behind the languages' },
  kicker: { zh: '造字的人、破译的人、复兴的人，和最后说它的人', en: 'Inventors, decipherers, revivers — and last speakers' },
  blurb: {
    zh: '一位国王为百姓造字，一位不识字的银匠为族人造字，一个人让沉睡了上千年的语言重新成为母语……语言的命运，有时就系在一个人身上。',
    en: 'A king who made an alphabet for his people, a silversmith who could not read who made a script for his, a man who turned an ancient language back into a mother tongue… Sometimes a language’s fate rests on one person.',
  },
  chapters: [
    {
      title: { zh: '国王的二十八个字母', en: 'A king’s twenty-eight letters' },
      body: {
        zh: '15 世纪的朝鲜半岛，书面语是汉文，只有少数读书人能读会写。1443 年，朝鲜王朝的世宗大王与学者们创制了一套新字母，1446 年以《训民正音》之名颁布。他在序中写道：“国之语音，异乎中国，与文字不相流通……予为此悯然，新制二十八字，欲使人人易习，便于日用耳。”辅音字母描摹发音器官：ㄱ 像舌根挡住喉咙，ㄴ 像舌头贴着上腭，ㅁ 像嘴的形状。这套字母就是今天的谚文（韩国称한글，朝鲜称조선글）。',
        en: 'In fifteenth-century Korea, writing meant Classical Chinese, and only a small elite could read and write. In 1443 King Sejong of Joseon and his scholars created a new alphabet, promulgated in 1446 as the Hunminjeongeum, “the correct sounds for the instruction of the people”. His preface explains why: the sounds of the language differ from Chinese, so many ordinary people had things to say but no way to write them; “feeling compassion, I have newly made twenty-eight letters, which I wish everyone to learn easily for daily use.” The consonants sketch the organs of speech: ㄱ the tongue root blocking the throat, ㄴ the tongue against the roof of the mouth, ㅁ the shape of the mouth. Today the alphabet is called Hangul (Chosŏn’gŭl in the North).',
      },
      view: { lat: 37.5, lon: 127, dist: 2.0 },
      focus: { ids: ['kore1280'] },
      strong: ['kore1280'],
      portrait: {
        src: 'sejong.jpg',
        caption: { zh: '《训民正音》解例本（1446）中解说字母读音的一页', en: 'A page of the Hunminjeongeum Haerye (1446) explaining the letters' },
        credit: 'Government of Joseon, 1446 · Public domain',
        page: `${COMMONS}Hunminjeongeum_Haerye_03.jpg`,
      },
    },
    {
      title: { zh: '不识字的人发明了文字', en: 'The man who could not read' },
      body: {
        zh: '塞阔雅是一位切罗基族银匠，不会读写任何语言。他见白人能把话写在纸上，相信切罗基人也能做到。经过大约十二年的摸索，他在 1821 年完成了一套音节文字：一个符号代表一个音节，共 86 个（今天用 85 个）。有些符号长得像英文字母，读音却毫不相干：像 R 的 Ꭱ 读 e，像 H 的 Ꮋ 读 mi，像 S 的 Ꮪ 读 du。会说切罗基语的人几周就能学会，这套文字很快传遍族人；1828 年，第一份切罗基文报纸《切罗基凤凰报》创刊。一个不识字的人独自为自己的语言创造出文字，这在历史上极为罕见。',
        en: 'Sequoyah was a Cherokee silversmith who could not read or write any language. Seeing settlers put speech on paper, he was convinced his people could do the same. After some twelve years of trying, in 1821 he completed a syllabary: one symbol for each syllable, 86 in all (85 are used today). Some look like English letters but sound nothing like them: Ꭱ, like an R, is e; Ꮋ, like an H, is mi; Ꮪ, like an S, is du. A Cherokee speaker could learn it in weeks, and it spread quickly; in 1828 the first Cherokee newspaper, the Cherokee Phoenix, began printing. A person who could not read inventing a writing system on his own is almost without parallel in history.',
      },
      view: { lat: 35.5, lon: -84, dist: 2.0 },
      focus: { ids: ['cher1273'] },
      strong: ['cher1273'],
      portrait: {
        src: 'sequoyah.jpg',
        caption: { zh: '塞阔雅与他的音节表（亨利·英曼绘，约 1830 年）', en: 'Sequoyah with his syllabary, by Henry Inman, c. 1830' },
        credit: 'Henry Inman · Public domain',
        page: `${COMMONS}Henry_Inman_-_Sequoyah_-_Google_Art_Project.jpg`,
      },
    },
    {
      title: { zh: '沉默了一千四百年的文字', en: 'Fourteen centuries of silence' },
      body: {
        zh: '已知最晚的埃及象形文字刻于公元 394 年，此后懂得它的人渐渐消失。1799 年，法军在埃及的罗塞塔发现了一块石碑，上面用象形文字、世俗体和古希腊文刻着同一道诏令。破译的钥匙握在一位年轻的法国学者商博良手里：他从少年时起就学习科普特语——古埃及语的最后阶段，至今仍用于科普特教会的礼拜。在一座神庙铭文的王名圈里，他认出太阳的符号读 ra（科普特语“太阳”是 rē），接下来的符号读 ms（科普特语“生育”是 mise）：这是拉美西斯的名字。1822 年他宣布破译成功。据说他冲进哥哥的办公室，喊了一声“我找到了！”就晕了过去。',
        en: 'The last known hieroglyphic inscription was carved in AD 394; after that, the knowledge of how to read it faded away. In 1799 French soldiers in Egypt found a stone at Rosetta bearing one decree in three scripts: hieroglyphs, Demotic and Greek. The key lay with a young French scholar, Jean-François Champollion, who had studied Coptic — the last stage of the Egyptian language, still used in the liturgy of the Coptic Church — since his teens. In a royal cartouche from a temple he recognised the sun sign as ra (Coptic “sun” is rē) and the next sign as ms (Coptic “to give birth” is mise): the name was Ramesses. He announced the decipherment in 1822. The story goes that he ran into his brother’s office, cried “I’ve got it!” and fainted.',
      },
      view: { lat: 27, lon: 31, dist: 2.2 },
      focus: { ids: ['egyp1246', 'copt1239'] },
      strong: ['egyp1246', 'copt1239'],
      portrait: {
        src: 'champollion.jpg',
        caption: { zh: '商博良（莱昂·科涅绘，1831 年）', en: 'Champollion, by Léon Cogniet, 1831' },
        credit: 'Léon Cogniet · Public domain',
        page: `${COMMONS}Leon_Cogniet_-_Jean-Francois_Champollion.jpg`,
      },
    },
    {
      title: { zh: '重新成为母语', en: 'A mother tongue again' },
      body: {
        zh: '大约在公元 2 到 4 世纪之间，希伯来语不再是任何人的母语，但在祈祷和书写中又延续了一千多年。1881 年，埃利泽·本-耶胡达移居耶路撒冷，决定在家里只说希伯来语；他的儿子成了近代第一个以希伯来语为第一语言长大的孩子。为了让古老的语言能谈论现代生活，他编纂了一部大词典，还造了许多新词，比如 milon（词典）和 iton（报纸）。这部词典直到 1959 年，他去世几十年后才全部完成。复兴并非他一人之功，学校和新的社区同样关键，但他成了这场常被称为史上最成功的语言复兴的象征。今天，希伯来语有数百万母语者。',
        en: 'Somewhere between the 2nd and 4th centuries AD Hebrew stopped being anyone’s mother tongue, though it lived on for well over a thousand years in prayer and in writing. In 1881 Eliezer Ben-Yehuda moved to Jerusalem and resolved to speak only Hebrew at home; his son became the first child in modern times to grow up with Hebrew as his first language. To let an ancient language talk about modern life he compiled a vast dictionary and coined words such as milon (dictionary) and iton (newspaper); the dictionary was completed only in 1959, decades after his death. He did not do it alone — schools and new communities mattered as much — but he became the face of what is often called the most successful language revival in history. Today Hebrew has millions of native speakers.',
      },
      view: { lat: 31.6, lon: 35.1, dist: 2.0 },
      focus: { ids: ['hebr1245'] },
      strong: ['hebr1245'],
      portrait: {
        src: 'ben-yehuda.jpg',
        caption: { zh: '本-耶胡达在耶路撒冷的书桌前（约 1912 年）', en: 'Ben-Yehuda at his desk in Jerusalem, c. 1912' },
        credit: 'Shlomo Narinsky · Public domain',
        page: `${COMMONS}Eliezer_Ben-Yehuda_at_his_desk_in_Jerusalem_-_c1912.jpg`,
      },
    },
    {
      title: { zh: '“希望者博士”', en: 'Doctor Hopeful' },
      body: {
        zh: '柴门霍夫在比亚韦斯托克长大。这座城市当时属于俄罗斯帝国，城里的波兰人、俄罗斯人、德意志人和犹太人各说各的语言，彼此猜疑。他相信，一门属于所有人的中立语言能化解这种隔阂。1887 年，他以“希望者博士”（Doktoro Esperanto）为笔名出版了一本小书，介绍他设计的国际语，这个笔名后来成了语言的名字。世界语的语法可以写成十六条规则，没有不规则动词。它没有成为全人类的第二语言，但一百多年来一直有人在说、在写，甚至有约一千人从小在家里把它当作母语学会。',
        en: 'Zamenhof grew up in Białystok, then in the Russian Empire, a town where Poles, Russians, Germans and Jews each kept to their own language and eyed one another with suspicion. He believed a neutral language belonging to everyone could ease such divides. In 1887 he published a small book presenting his international language under the pen name Doktoro Esperanto — “Doctor One-who-hopes” — and the name stuck to the language. Its grammar fits in sixteen rules, with no irregular verbs. It never became humanity’s second language, but for well over a century people have spoken and written it, and about a thousand have even grown up with it as a mother tongue.',
      },
      view: { lat: 51.5, lon: 15, dist: 2.6 },
      focus: { ids: ['espe1235'] },
      strong: ['espe1235'],
      portrait: {
        src: 'zamenhof.jpg',
        caption: { zh: '柴门霍夫（约 1905 年）', en: 'Zamenhof, c. 1905' },
        credit: 'Unknown photographer · Public domain',
        page: `${COMMONS}Zamenhof_ca_1905.jpg`,
      },
    },
    {
      title: { zh: '另一位造字的国王', en: 'Another king, another script' },
      body: {
        zh: '19 世纪末，在今天喀麦隆西部的巴蒙王国，年轻的国王易卜拉欣·恩乔亚开始为自己的语言设计文字。最初的版本有几百个图画般的符号，经过一次次修改，到 1910 年前后成了一套约 80 个符号的音节文字。他用它记下王国的历史、风俗和医药，并在都城福班开办学校教授这套文字。当时的喀麦隆先后处在德国和法国的殖民统治之下。1931 年，法国殖民当局废黜了他，把他流放到雅温得，两年后他在那里去世，巴蒙文字也随之衰落。如今，王宫留下的手稿正在被整理；2009 年，巴蒙文字被收入 Unicode。',
        en: 'At the end of the nineteenth century, in the Bamum kingdom of what is now western Cameroon, the young King Ibrahim Njoya set out to design a script for his language. The first version had hundreds of picture-like signs; revised again and again, by around 1910 it had become a syllabary of some 80 signs. He used it to record the kingdom’s history, customs and medicine, and opened schools in his capital, Foumban, to teach it. Cameroon was then under colonial rule, first German, later French. In 1931 the French authorities deposed him and exiled him to Yaoundé, where he died two years later, and the script fell out of use. Today the manuscripts kept at the palace are being catalogued, and in 2009 the Bamum script was added to Unicode.',
      },
      view: { lat: 5.7, lon: 10.9, dist: 2.0 },
      focus: { ids: ['bamu1253'] },
      strong: ['bamu1253'],
      portrait: {
        src: 'njoya.jpg',
        caption: { zh: '恩乔亚国王（20 世纪初）', en: 'King Njoya, early twentieth century' },
        credit: 'Unknown photographer · Public domain',
        page: `${COMMONS}Njoya_of_Bamun.jpg`,
      },
    },
    {
      title: { zh: '最后的雅希人', en: 'The last of the Yahi' },
      body: {
        zh: '加州淘金热之后，涌入的移民和民兵几乎把雅希人赶尽杀绝，幸存的几个人躲进山里，藏了四十多年。1911 年 8 月，最后一位幸存者因为饥饿走出山林，在奥罗维尔附近的一个屠宰场被人发现。此后他住在旧金山的一座人类学博物馆，和人类学家克罗伯、语言学家萨丕尔一起记录雅希语的词语、故事和歌谣（雅希语是亚纳语的一种方言）。按照雅希人的习俗，他从不说出自己的名字，大家便叫他“伊希”，在他的语言里意思是“人”。1916 年，他死于肺结核。',
        en: 'After the California Gold Rush, settlers and militias all but wiped out the Yahi; the few survivors hid in the hills for some forty years. In August 1911 the last of them, starving, walked out of the forest and was found at a slaughterhouse near Oroville. He spent the rest of his life at an anthropology museum in San Francisco, recording the words, stories and songs of Yahi — a dialect of Yana — with the anthropologist Alfred Kroeber and the linguist Edward Sapir. Following Yahi custom he never spoke his own name, so he was called Ishi: “man” in his language. He died of tuberculosis in 1916.',
      },
      view: { lat: 40, lon: -121.6, dist: 2.0 },
      focus: { ids: ['yana1271'] },
      strong: ['yana1271'],
      portrait: {
        src: 'ishi.jpg',
        caption: { zh: '伊希（1911 年）', en: 'Ishi, 1911' },
        credit: 'Unknown photographer · Public domain',
        page: `${COMMONS}Ishi_(cropped).jpg`,
      },
    },
    {
      title: { zh: '无法破译的密码', en: 'The code that was never broken' },
      body: {
        zh: '二战期间，美国海军陆战队招募了约四百名纳瓦霍人，在太平洋战场上用他们的语言传递消息。纳瓦霍语当时几乎没有书面材料，结构又和英语、日语截然不同；他们还在语言之上编了一套暗语：坦克叫“乌龟”，潜艇叫“铁鱼”，战斗机叫“蜂鸟”。日军始终没能破译。硫磺岛战役的头两天，六名纳瓦霍密码员收发了八百多条消息，没有一条出错。而他们中的许多人小时候在寄宿学校里，曾因为说纳瓦霍语受罚。这段历史直到 1968 年才解密。',
        en: 'In the Second World War the US Marine Corps recruited some four hundred Navajo men to send messages in their language across the Pacific. Navajo was then barely written down and was built utterly unlike English or Japanese — and on top of it they devised a code: a tank was a “tortoise”, a submarine an “iron fish”, a fighter plane a “hummingbird”. It was never broken. In the first two days at Iwo Jima six Navajo code talkers sent and received more than eight hundred messages without a single error. Many of them had been punished as children, at boarding school, for speaking Navajo. Their story stayed classified until 1968.',
      },
      view: { lat: 36.3, lon: -109.4, dist: 2.1 },
      focus: { ids: ['nava1243'] },
      strong: ['nava1243'],
      table: {
        columns: ['nava1243'],
        rows: [
          [{ zh: '坦克（乌龟）', en: 'tank (“tortoise”)' }, 'chay-da-gahi'],
          [{ zh: '潜艇（铁鱼）', en: 'submarine (“iron fish”)' }, 'besh-lo'],
          [{ zh: '战斗机（蜂鸟）', en: 'fighter plane (“hummingbird”)' }, 'da-he-tih-hi'],
        ],
      },
      source: { zh: '暗语拼写据美国海军陆战队解密的《纳瓦霍密码词典》。', en: 'Code words as spelled in the declassified Navajo Code Talkers’ Dictionary.' },
      portrait: {
        src: 'code-talkers.jpg',
        caption: { zh: '纳瓦霍密码员普雷斯顿·托莱多和弗兰克·托莱多（1943 年）', en: 'Navajo code talkers Preston and Frank Toledo, 1943' },
        credit: 'US Marine Corps · Public domain',
        page: `${COMMONS}Photograph_of_Navajo_Indian_Code_Talkers_Preston_Toledo_and_Frank_Toledo_-_DPLA_-_6893dcb72fd7b7f56462dcffb1617a07.jpg`,
      },
    },
    {
      title: { zh: '最后一位', en: 'The last speaker' },
      body: {
        zh: '克里斯蒂娜·卡尔德龙住在智利最南端的纳瓦里诺岛，是雅马纳语（又称亚甘语）的最后一位母语者。说这门语言的雅马纳人，世世代代划着独木舟，在火地岛的海峡间漂泊谋生。晚年，她和孙女一起编写了雅马纳语词汇集和一本故事集，把还记得的都留了下来。2022 年 2 月，她以 93 岁高龄去世。世界上每一门消失的语言，都有这样一位最后的说话人；而很多时候，没有人记下他们的名字。',
        en: 'Cristina Calderón lived on Navarino Island at the southern tip of Chile and was the last native speaker of Yaghan, the language of the canoe people who for generations travelled the channels of Tierra del Fuego. In her last years she worked with her granddaughter on a vocabulary and a book of stories, setting down everything she remembered. She died in February 2022, aged 93. Every language that falls silent has a last speaker like her — and most of the time, no one writes down their name.',
      },
      view: { lat: -55, lon: -68, dist: 2.0 },
      focus: { ids: ['yama1264'] },
      strong: ['yama1264'],
      portrait: {
        src: 'calderon.jpg',
        caption: { zh: '克里斯蒂娜·卡尔德龙（2013 年）', en: 'Cristina Calderón, 2013' },
        credit: 'Víctor Alejandro Correa Rueda · CC BY 2.0',
        page: `${COMMONS}Cristina_Calder%C3%B3n_(8639878993)_(headshot).jpg`,
      },
    },
    {
      title: { zh: '最后一位，与第一批', en: 'The last, and the first' },
      body: {
        zh: '马恩岛语的最后一位母语者内德·马德雷尔于 1974 年去世。但在那之前，人们为他和岛上其他老人留下了录音。一群学习者靠着这些录音和旧书，把语言接了下去。2001 年，马恩岛开办了一所完全用马恩岛语教学的小学；如今已有孩子从小说着马恩岛语长大——他们是新的第一批。（本站沿用 Glottolog 的标注，按传统母语传承仍把马恩岛语记为已消亡；联合国教科文组织则在 2009 年把它改列为“极度濒危”。）',
        en: 'The last native speaker of Manx, Ned Maddrell, died in 1974. Before he did, recordings were made of him and the island’s other elders, and with those recordings and old books a band of learners carried the language on. In 2001 the Isle of Man opened a primary school taught entirely in Manx, and there are now children growing up speaking it: a new first generation. (This atlas follows Glottolog, which still lists Manx as extinct in the traditional sense of a mother tongue passed down; UNESCO reclassified it as critically endangered in 2009.)',
      },
      view: { lat: 54.25, lon: -4.5, dist: 1.9 },
      focus: { ids: ['manx1243'] },
      strong: ['manx1243'],
    },
  ],
});

// "Untranslatable" words: each table row is [language, word, gloss]. Checked
// against dictionaries; popular lists get several of these wrong.
ALL.push({
  id: 'untranslatable',
  title: { zh: '“无法翻译”的词', en: 'The “untranslatable” words' },
  kicker: { zh: 'saudade、hygge、木漏れ日……以及跟着它们流传的误会', en: 'saudade, hygge, komorebi — and the myths that travel with them' },
  blurb: {
    zh: '有些词，换一种语言就得用一整句话来解释。它们并不是真的无法翻译，却让我们看到：一种文化觉得什么东西值得专门起一个名字。',
    en: 'Some words take a whole sentence to explain in another language. They are not truly untranslatable — but they show what a culture thought worth a word of its own.',
  },
  chapters: [
    {
      title: { zh: '想念的许多种样子', en: 'The many shapes of longing' },
      body: {
        zh: '葡萄牙语的 saudade 常被称为“最葡萄牙”的词：对一个不在身边、也许再也回不来的人或事物的想念，甜里带着苦。威尔士语的 hiraeth 是对故乡的思念，那个故乡也许已经回不去，甚至从未真正存在过。纳博科夫说，没有一个英语词能表达俄语 тоска（toska）的全部层次：最深处是没有缘由的灵魂之痛，浅一些是“无所渴望的渴望”，再浅就成了百无聊赖。',
        en: 'Portuguese saudade is often called the most Portuguese of words: a longing for someone or something absent, perhaps never to return, sweet and sad at once. Welsh hiraeth is a yearning for home — a home you may not be able to return to, or that perhaps never was. Nabokov wrote that no single English word renders all the shades of Russian тоска (toska): at its deepest a spiritual anguish without cause, lower down “a longing with nothing to long for”, and at its lowest plain boredom.',
      },
      view: { lat: 50, lon: 12, dist: 3.0 },
      focus: { ids: ['port1283', 'wels1247', 'russ1263', 'stan1295'] },
      strong: ['port1283', 'wels1247', 'russ1263', 'stan1295'],
      table: {
        rows: [
          ['port1283', 'saudade', { zh: '对不在身边、也许再也回不来的人或事物的想念', en: 'longing for someone or something absent, perhaps never to return' }],
          ['wels1247', 'hiraeth', { zh: '对回不去的故乡的思念', en: 'yearning for a home you cannot return to' }],
          ['russ1263', 'тоска (toska)', { zh: '常常说不清缘由的忧伤与渴望', en: 'an ache of the soul, often without a cause' }],
          ['stan1295', 'Sehnsucht', { zh: '对遥远或得不到之物的强烈向往', en: 'an intense yearning for something far off or out of reach' }],
        ],
      },
    },
    {
      title: { zh: '舒服，刚刚好', en: 'Cosy, and just enough' },
      body: {
        zh: '丹麦语的 hygge 这些年在全世界走红：烛光、热饮，和亲近的人待在一起的那种安心与温暖。荷兰语的 gezellig 与它相近，又多几分热闹，一间屋子、一场聚会、一个人都可以 gezellig。瑞典语的 lagom 意思是“不多不少，正合适”。网上常说它来自维京人把酒“传一圈”（laget om），其实这是民间词源：它来自古瑞典语的 lag（法律、规矩），本义是“合乎规矩的分量”。瑞典人还有 fika：放下手头的事，和同事朋友喝杯咖啡、吃点甜的；这个词是把咖啡的旧称 kaffi 倒过来念得来的。',
        en: 'Danish hygge has lately conquered the world: candlelight, a warm drink, the snug ease of being with people you are close to. Dutch gezellig is similar, with a little more bustle — a room, a party or a person can all be gezellig. Swedish lagom means “not too much, not too little: just right”. The internet likes to say it comes from Vikings passing a drinking horn “around the team” (laget om); that is folk etymology — it comes from Old Swedish lag, “law”, as in “the amount custom allows”. Swedes also have fika: stopping for coffee and something sweet with colleagues or friends, a word made by turning an old word for coffee, kaffi, back to front.',
      },
      view: { lat: 56, lon: 11, dist: 2.4 },
      focus: { ids: ['dani1285', 'dutc1256', 'swed1254'] },
      strong: ['dani1285', 'dutc1256', 'swed1254'],
      table: {
        rows: [
          ['dani1285', 'hygge', { zh: '温暖安心、与亲近之人共处的舒适', en: 'warm, snug togetherness' }],
          ['dutc1256', 'gezellig', { zh: '舒适而热闹，有人情味', en: 'cosy, convivial, good to be in' }],
          ['swed1254', 'lagom', { zh: '不多不少，正合适', en: 'not too much, not too little' }],
          ['swed1254', 'fika', { zh: '停下来喝咖啡、吃点心、聊聊天', en: 'a break for coffee, something sweet and company' }],
        ],
      },
    },
    {
      title: { zh: '人与人之间', en: 'Between people' },
      body: {
        zh: '韩语的 눈치（nunchi，字面意思是“眼力”）是察言观色的本事：一进屋就能感到气氛，知道什么该说、什么不该说。波斯语的 تعارف（taarof）是一套客气的礼数：主人一再相让，客人一再推辞，店主甚至会说“不用付钱了”，而双方都明白这只是礼。在祖鲁语等南部非洲的恩古尼语言里，ubuntu 讲的是人与人相互成就：“一个人因为其他人才成为人”。汉语的“缘分”，换成别的语言往往要用一整句话来解释。他加禄语的 kilig 是心上人一个眼神就让你心头一颤的那阵悸动，2016 年被收进了《牛津英语词典》。',
        en: 'Korean 눈치 (nunchi, literally “eye-measure”) is the knack of reading a room: sensing the mood the moment you walk in, knowing what to say and what to leave unsaid. Persian تعارف (taarof) is an etiquette of courtesy: the host insists, the guest declines, the shopkeeper may even say there is nothing to pay — and both sides know it is a ritual. In Zulu and the other Nguni languages of southern Africa, ubuntu is the idea that we become ourselves through others: “a person is a person through other people”. Chinese 缘分 (yuánfèn), the bond of chance or fate that brings two people together, takes a sentence to explain in most languages. And Tagalog kilig — the giddy flutter when the person you like so much as glances at you — entered the Oxford English Dictionary in 2016.',
      },
      view: { lat: 15, lon: 80, dist: 4.6 },
      focus: { ids: ['kore1280', 'west2369', 'zulu1248', 'mand1415', 'taga1270'] },
      strong: ['kore1280', 'west2369', 'zulu1248', 'mand1415', 'taga1270'],
      table: {
        rows: [
          ['kore1280', '눈치 (nunchi)', { zh: '察言观色、体察气氛的本事', en: 'the knack of sensing the mood and what others think' }],
          ['west2369', 'تعارف (taarof)', { zh: '一再相让、一再推辞的客套礼数', en: 'the ritual of polite offering and refusing' }],
          ['zulu1248', 'ubuntu', { zh: '人因他人而成为人；人与人的相互成就', en: 'humanity towards others: a person is a person through other people' }],
          ['mand1415', '缘分 (yuánfèn)', { zh: '让人与人相遇、相连的机缘', en: 'the chance or fate that brings people together' }],
          ['taga1270', 'kilig', { zh: '因心上人而起的一阵心动', en: 'the giddy rush of romantic excitement' }],
        ],
      },
    },
    {
      title: { zh: '过日子的词', en: 'Words for everyday life' },
      body: {
        zh: '西班牙语的 sobremesa 是饭后不急着离席、围坐在桌边聊天的时光，有时比饭本身还长。日语的“積ん読”（tsundoku）明治时代就有了，把“堆着”（積んでおく）和“读书”（読書）拼在一起：买来的书越堆越高，却一直没读。印度尼西亚人说的 jam karet 是“橡皮筋时间”，约好的钟点可以伸缩。印地语的 जुगाड़（jugaad）则是用手头的东西凑出一个巧妙的土办法。',
        en: 'Spanish sobremesa is the time after a meal when no one hurries to leave the table and the talk goes on — sometimes longer than the meal itself. Japanese 積ん読 (tsundoku), a word from the Meiji era, fuses “leave piled up” (tsunde oku) with “reading” (dokusho): books bought, stacked ever higher, never read. In Indonesia, jam karet is “rubber time”: appointments that stretch. And Hindi जुगाड़ (jugaad) is a clever, make-do fix out of whatever is to hand.',
      },
      view: { lat: 20, lon: 60, dist: 4.6 },
      focus: { ids: ['stan1288', 'nucl1643', 'indo1316', 'hind1269'] },
      strong: ['stan1288', 'nucl1643', 'indo1316', 'hind1269'],
      table: {
        rows: [
          ['stan1288', 'sobremesa', { zh: '饭后围坐在桌边闲聊的时光', en: 'lingering at the table after a meal, talking' }],
          ['nucl1643', '積ん読 (tsundoku)', { zh: '买书不读，越堆越多', en: 'buying books and letting them pile up unread' }],
          ['indo1316', 'jam karet', { zh: '“橡皮筋时间”，可以伸缩的守时观', en: '“rubber time”: punctuality that stretches' }],
          ['hind1269', 'जुगाड़ (jugaad)', { zh: '就地取材的巧妙土办法', en: 'a clever improvised fix with whatever is at hand' }],
        ],
      },
    },
    {
      title: { zh: '一个词，一幅画', en: 'A picture in a word' },
      body: {
        zh: '日语的“木漏れ日”（komorebi）是阳光穿过树叶缝隙洒下的光斑。土耳其语的 yakamoz 是夜里海面上闪烁的点点荧光（来自会发光的浮游生物），也指月光在水面上铺开的粼粼波光。芬兰语里有个古老的距离单位 poronkusema，字面意思是“驯鹿的一泡尿”：驯鹿拉着雪橇，一口气走到非停下来解手不可的路程，大约七公里半。',
        en: 'Japanese 木漏れ日 (komorebi) is sunlight dappling through the leaves of trees. Turkish yakamoz is the glitter of light on the sea at night — the glow of tiny bioluminescent plankton, or the path the moon lays across the water. And Finnish has an old measure of distance, poronkusema, literally “reindeer’s pee”: how far a reindeer could pull a sledge before it had to stop to relieve itself, about seven and a half kilometres.',
      },
      view: { lat: 50, lon: 80, dist: 4.6 },
      focus: { ids: ['nucl1643', 'nucl1301', 'finn1318'] },
      strong: ['nucl1643', 'nucl1301', 'finn1318'],
      table: {
        rows: [
          ['nucl1643', '木漏れ日 (komorebi)', { zh: '从树叶间洒下的阳光', en: 'sunlight filtering through leaves' }],
          ['nucl1301', 'yakamoz', { zh: '夜里海面的荧光，或月光在水面的倒影', en: 'sparkles of light on the sea at night, or moonlight on the water' }],
          ['finn1318', 'poronkusema', { zh: '驯鹿不停歇能走的距离，约 7.5 公里', en: 'how far a reindeer goes without a break, about 7.5 km' }],
        ],
      },
    },
    {
      title: { zh: '小心那些清单', en: 'Beware the lists' },
      body: {
        zh: '“因纽特人有一百个表示雪的词”大概是流传最广的语言传说。它源自人类学家博厄斯 1911 年的一段话，他只举了四个词根：地上的雪、正在下的雪、飘飞的雪和雪堆。此后数字在转述中一路膨胀到几十、上百。因纽特语能把许多成分黏成一个长词，“有几个词”本来就很难数；何况英语也有 snow、sleet、slush、blizzard 一串词。另一个常客是火地岛雅马纳语的 mamihlapinatapai，据说意为“两人对望，都希望对方先去做彼此都想做、却谁也不愿先开头的事”，还被吉尼斯评为“最简洁的词”。这个释义出自一位 19 世纪传教士编的词典，确切含义至今仍有争议。说到底，任何意思都能用任何语言说出来；这些词的妙处，只在于一种文化觉得它值得专门起个名字。',
        en: '“The Inuit have a hundred words for snow” is perhaps the most widespread of all language legends. It goes back to a passage by the anthropologist Franz Boas in 1911, which gave just four roots: snow on the ground, falling snow, drifting snow and a snowdrift. Retold again and again, the count swelled to dozens, then hundreds. Inuit languages glue many pieces into one long word, so “how many words” is hard to count in the first place — and English has snow, sleet, slush, blizzard and more. Another regular is mamihlapinatapai from Yaghan in Tierra del Fuego, said to mean “a look between two people, each hoping the other will offer to do what both want but neither will begin”, and named by Guinness the most succinct word. That gloss comes from a nineteenth-century missionary’s dictionary, and its exact sense is still debated. In the end, anything can be said in any language; what these words show is what a culture found worth a name of its own.',
      },
      view: { lat: 64, lon: -75, dist: 2.8 },
      focus: { ids: ['east2534', 'yama1264'] },
      strong: ['east2534', 'yama1264'],
      table: {
        rows: [
          ['east2534', 'aput', { zh: '地上的雪', en: 'snow on the ground' }],
          ['east2534', 'qana', { zh: '正在下的雪', en: 'falling snow' }],
          ['east2534', 'piqsirpoq', { zh: '飘飞的雪', en: 'drifting snow' }],
          ['east2534', 'qimuqsuq', { zh: '雪堆', en: 'a snowdrift' }],
          ['yama1264', 'mamihlapinatapai', { zh: '（据传）两人对望，都在等对方先开头', en: '(reputedly) a look shared by two, each waiting for the other to begin' }],
        ],
      },
      source: { zh: '四个雪的词根据博厄斯为《美洲印第安语言手册》（1911）写的导论。', en: 'The four snow roots are from Boas’s introduction to the Handbook of American Indian Languages (1911).' },
    },
  ],
});

// global stories first; the order a newcomer meets them in
const ORDER = ['tea', 'people', 'untranslatable', 'austronesian', 'indo-european', 'africa', 'americas', 'isolates', 'sinitic', 'endangered'];
export const STORIES = ORDER.map((id) => ALL.find((s) => s.id === id));

// merge a language's story text into the objects tr() reads
function merge(code, content) {
  const text = content?.stories;
  if (!text) return;
  for (const [path, value] of Object.entries(text)) {
    const keys = path.match(/[^.[\]]+/g);
    let o = STORIES.find((s) => s.id === keys[0]);
    for (const k of keys.slice(1)) o = o?.[k];
    if (o && typeof o === 'object' && 'en' in o) o[code] = value;
  }
}
onContent(merge);
