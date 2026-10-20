import { onContent } from '../i18n/index.js';

// "Where does this word come from?" — loanwords with a well-attested origin,
// for the daily quiz. `answer` and `choices` are Glottocodes; the choices are
// plausible but wrong, and never a language the word merely passed through.
export const ETYMOLOGY = [
  {
    word: { en: 'tomato', zh: '番茄' }, answer: 'clas1250', choices: ['stan1288', 'cusc1236', 'yuca1254'],
    story: {
      zh: '英语 tomato 来自阿兹特克人的纳瓦特尔语 tomatl。16 世纪，西班牙人把这种植物和它的名字一起带到了欧洲。',
      en: 'Tomato comes from tomatl in Nahuatl, the language of the Aztecs; in the 16th century the Spanish carried the plant and its name to Europe.',
    },
  },
  {
    word: { en: 'avocado', zh: '牛油果' }, answer: 'clas1250', choices: ['stan1288', 'cusc1236', 'port1283'],
    story: {
      zh: 'avocado 来自纳瓦特尔语 āhuacatl，经西班牙语 aguacate 传入英语。',
      en: 'Avocado goes back to Nahuatl āhuacatl, through Spanish aguacate.',
    },
  },
  {
    word: { en: 'coffee', zh: '咖啡' }, answer: 'stan1318', choices: ['amha1245', 'nucl1301', 'ital1282'],
    story: {
      zh: 'coffee 来自阿拉伯语 qahwa，经土耳其语 kahve 和意大利语 caffè 传到欧洲。咖啡树原产埃塞俄比亚，最早在也门被大量饮用。',
      en: 'Coffee goes back to Arabic qahwa, reaching Europe through Turkish kahve and Italian caffè. The plant is Ethiopian; Yemen first drank it widely.',
    },
  },
  {
    word: { en: 'tea', zh: '茶' }, answer: 'minn1241', choices: ['mand1415', 'nucl1643', 'dutc1256'],
    story: {
      zh: '英语 tea 来自闽南语“茶”的读音 tê。17 世纪，荷兰商人从闽南商人手中买茶，也把这个读音带到了欧洲。',
      en: 'Tea comes from tê, the Min Nan (Hokkien) word for 茶: 17th-century Dutch traders bought tea, and the word, from Hokkien merchants.',
    },
  },
  {
    word: { en: 'ketchup', zh: '番茄酱' }, answer: 'minn1241', choices: ['stan1306', 'mand1415', 'nucl1643'],
    story: {
      zh: 'ketchup 可能来自闽南语“鲑汁” kê-tsiap，原本是一种鱼露。番茄是后来才加进去的。',
      en: 'Ketchup probably comes from Hokkien kê-tsiap, a fish sauce; the tomatoes came much later.',
    },
  },
  {
    word: { en: 'kayak', zh: '皮划艇' }, answer: 'kala1399', choices: ['norw1258', 'icel1247', 'finn1318'],
    story: {
      zh: 'kayak 来自格陵兰语 qajaq，指因纽特人用兽皮蒙成的单人小艇。',
      en: 'Kayak comes from Greenlandic qajaq, the skin-covered one-person boat of the Inuit.',
    },
  },
  {
    word: { en: 'igloo', zh: '雪屋' }, answer: 'east2534', choices: ['russ1263', 'finn1318', 'east2542'],
    story: {
      zh: 'igloo 来自因纽特语 iglu。它的原意只是“房子”，不一定是用雪砌的。',
      en: 'Igloo comes from Inuktitut iglu, which simply means "house", snow or not.',
    },
  },
  {
    word: { en: 'kangaroo', zh: '袋鼠' }, answer: 'gugu1255', choices: ['maor1246', 'hawa1245', 'samo1305'],
    story: {
      zh: '1770 年，库克船长的船员在澳大利亚东北部记下了古古伊米德希尔语的 gangurru，这就是 kangaroo 的来历。',
      en: 'In 1770 Captain Cook’s crew noted gangurru in Guugu Yimidhirr, in north-eastern Australia — the origin of kangaroo.',
    },
  },
  {
    word: { en: 'robot', zh: '机器人' }, answer: 'czec1258', choices: ['russ1263', 'poli1260', 'stan1295'],
    story: {
      zh: 'robot 出自捷克作家恰佩克 1920 年的剧本《R.U.R.》，来自捷克语 robota，意为“苦役”。',
      en: 'Robot comes from Karel Čapek’s 1920 play R.U.R., from Czech robota, "forced labour".',
    },
  },
  {
    word: { en: 'tsunami', zh: '海啸' }, answer: 'nucl1643', choices: ['kore1280', 'mand1415', 'indo1316'],
    story: {
      zh: 'tsunami 来自日语“津波”，字面意思是“港口的浪”。',
      en: 'Tsunami is Japanese 津波, literally "harbour wave".',
    },
  },
  {
    word: { en: 'shampoo', zh: '洗发水' }, answer: 'hind1269', choices: ['tami1289', 'west2369', 'nucl1301'],
    story: {
      zh: 'shampoo 来自印地语 chāmpo（“按压、按摩”）。18 世纪随英国人从印度传入英语，起初的意思就是按摩。',
      en: 'Shampoo comes from Hindi chāmpo, "press, massage"; it entered English from India in the 18th century, first meaning a massage.',
    },
  },
  {
    word: { en: 'safari', zh: '狩猎旅行' }, answer: 'swah1253', choices: ['zulu1248', 'amha1245', 'haus1257'],
    story: {
      zh: 'safari 是斯瓦希里语的“旅行”，这个词本身又借自阿拉伯语 safar。',
      en: 'Safari is Swahili for "journey" — itself borrowed from Arabic safar.',
    },
  },
  {
    word: { en: 'ski', zh: '滑雪板' }, answer: 'norw1258', choices: ['swed1254', 'finn1318', 'stan1295'],
    story: {
      zh: 'ski 来自挪威语，可以追溯到古诺尔斯语 skíð，意思是“一片木头”。',
      en: 'Ski is Norwegian, from Old Norse skíð, "a stick of wood".',
    },
  },
  {
    word: { en: 'sauna', zh: '桑拿' }, answer: 'finn1318', choices: ['swed1254', 'russ1263', 'icel1247'],
    story: {
      zh: 'sauna 是芬兰语。芬兰只有约 550 万人口，却有约 300 万个桑拿房。',
      en: 'Sauna is Finnish — and Finland, with about 5.5 million people, has around three million saunas.',
    },
  },
  {
    word: { en: 'yogurt', zh: '酸奶' }, answer: 'nucl1301', choices: ['west2369', 'mode1248', 'stan1318'],
    story: {
      zh: 'yogurt 来自土耳其语 yoğurt，与动词 yoğurmak（“揉、使变稠”）有关。',
      en: 'Yogurt is Turkish yoğurt, related to yoğurmak, "to knead, to thicken".',
    },
  },
  {
    word: { en: 'pajamas', zh: '睡衣' }, answer: 'west2369', choices: ['nucl1301', 'stan1318', 'mand1415'],
    story: {
      zh: 'pajamas 来自波斯语 pāy-jāma，“腿上的衣服”，经印地语和乌尔都语传入英语。',
      en: 'Pajamas comes from Persian pāy-jāma, "leg garment", by way of Hindustani.',
    },
  },
  {
    word: { en: 'cookie', zh: '曲奇' }, answer: 'dutc1256', choices: ['stan1295', 'dani1285', 'stan1290'],
    story: {
      zh: 'cookie 来自荷兰语 koekje（“小蛋糕”），由早期纽约（新阿姆斯特丹）的荷兰移民带进美式英语。',
      en: 'Cookie comes from Dutch koekje, "little cake", brought into American English by the Dutch of New Amsterdam.',
    },
  },
  {
    word: { en: 'kindergarten', zh: '幼儿园' }, answer: 'stan1295', choices: ['dutc1256', 'swed1254', 'czec1258'],
    story: {
      zh: 'kindergarten 是德语“儿童的花园”，由教育家福禄贝尔在 1840 年命名。',
      en: 'Kindergarten is German for "children’s garden", named by the educator Friedrich Fröbel in 1840.',
    },
  },
  {
    word: { en: 'coach', zh: '马车 / 教练' }, answer: 'hung1274', choices: ['czec1258', 'poli1260', 'stan1295'],
    story: {
      zh: 'coach 来自匈牙利语 kocsi，“科奇村的（马车）”。这个小村以造车闻名，后来 coach 又引申出“教练”的意思。',
      en: 'Coach comes from Hungarian kocsi, "(a carriage) of Kocs", a village famous for its wagons; the sports sense came later.',
    },
  },
  {
    word: { en: 'mammoth', zh: '猛犸象' }, answer: 'russ1263', choices: ['finn1318', 'hung1274', 'poli1260'],
    story: {
      zh: 'mammoth 来自俄语 мамонт，可能又借自西伯利亚的曼西语。',
      en: 'Mammoth comes from Russian mamont, perhaps borrowed in turn from Mansi in Siberia.',
    },
  },
  {
    word: { en: 'hammock', zh: '吊床' }, answer: 'tain1254', choices: ['cusc1236', 'yuca1254', 'port1283'],
    story: {
      zh: 'hammock 来自加勒比海的泰诺语 hamaka。泰诺语后来消亡了，但这个词经西班牙语留了下来。',
      en: 'Hammock comes from hamaka in Taíno, a Caribbean language; Taíno died out, but the word survived through Spanish.',
    },
  },
  {
    word: { en: 'hurricane', zh: '飓风' }, answer: 'tain1254', choices: ['yuca1254', 'stan1288', 'cusc1236'],
    story: {
      zh: 'hurricane 来自泰诺语 hurakán，经西班牙语 huracán 传入英语。',
      en: 'Hurricane comes from Taíno hurakán, through Spanish huracán.',
    },
  },
  {
    word: { en: 'tattoo', zh: '纹身' }, answer: 'tahi1242', choices: ['maor1246', 'hawa1245', 'plat1254'],
    story: {
      zh: '1769 年，库克船长在塔希提岛记下了 tatau 这个词，英语的 tattoo 就来自塔希提语。',
      en: 'Captain Cook recorded tatau on Tahiti in 1769; English tattoo comes from Tahitian.',
    },
  },
  {
    word: { en: 'orangutan', zh: '红毛猩猩' }, answer: 'stan1306', choices: ['taga1270', 'thai1261', 'plat1254'],
    story: {
      zh: 'orangutan 来自马来语 orang hutan，意思是“森林里的人”。',
      en: 'Orangutan is Malay orang hutan, "person of the forest".',
    },
  },
  {
    word: { en: 'algebra', zh: '代数' }, answer: 'stan1318', choices: ['mode1248', 'lati1261', 'west2369'],
    story: {
      zh: 'algebra 来自阿拉伯语 al-jabr（“复原”），出自 9 世纪数学家花拉子米的著作书名。',
      en: 'Algebra comes from Arabic al-jabr, "restoration", from the title of al-Khwarizmi’s 9th-century treatise.',
    },
  },
];

// other interface languages bring a gloss and the story (content/translations/<locale>.js)
onContent((code, content) => {
  for (const item of ETYMOLOGY) {
    const tr = content?.etymology?.[item.word.en];
    if (tr) [item.word[code], item.story[code]] = tr;
  }
});
