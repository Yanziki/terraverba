// Text for the word map: categories, the method note, and short stories for
// words whose spread across the map has a history worth telling.
export const WORD_CATEGORIES = {
  people: { zh: '人与家庭', en: 'People' },
  body: { zh: '身体', en: 'Body' },
  nature: { zh: '自然', en: 'Nature' },
  animals: { zh: '动物', en: 'Animals' },
  numbers: { zh: '数字', en: 'Numbers' },
  pronouns: { zh: '代词与疑问词', en: 'Pronouns' },
  actions: { zh: '动作', en: 'Actions' },
  food: { zh: '食物与饮料', en: 'Food & drink' },
  everyday: { zh: '日常', en: 'Everyday' },
};

export const WORDS_INTRO = {
  zh: '选一个词，看它在世界各地怎么说。地图上的每个点直接写出当地的说法；颜色相同，表示读音开头相近。',
  en: 'Pick a word and see how it is said around the world. Each dot is labelled with the local word; dots of one colour begin with similar sounds.',
};

export const WORDS_METHOD = {
  zh: '颜色按词的第一个辅音归类（类似语言学中的“音类”方法）：开头相近的词颜色相同。这只说明发音相似，不等于同源——判断同源需要逐个比较。可读的写法来自维基词典的翻译表；更多小语种的词来自 ASJP 词表，用 ASJP 的简化音标书写。',
  en: 'Colours group words by the class of their first consonant (a sound-class method used in linguistics): words that begin alike share a colour. This shows resemblance, not common origin — proving relationship needs case-by-case comparison. Readable forms come from Wiktionary translation tables; many smaller languages come from the ASJP word lists, in ASJP’s simplified transcription.',
};

export const WORD_NOTES = {
  iloveyou: {
    zh: '“我爱你”在很多语言里不止一种说法。西班牙语的 te quiero 和 te amo、意大利语的 ti voglio bene 和 ti amo，分量各不相同；日语的“愛してる”很重，日常更常说“好き”。在阿拉伯语、希伯来语、印地语里，这句话还会随说话人或对方的性别而变：地图上用斜线隔开的，就是两种说法。',
    en: '“I love you” rarely has just one form. Spanish te quiero and te amo, Italian ti voglio bene and ti amo carry different weights; in Japanese 愛してる is a heavy word, and 好き (“I like you”) is what people usually say. In Arabic, Hebrew and Hindi the sentence changes with the gender of the speaker or of the person addressed; where the map shows a slash, it gives both.',
  },
  mother: {
    zh: '为什么全世界的“妈妈”都这么像？婴儿最早能发出的音是 m、b、p 加上 a——双唇一合一张，就是 ma、ba、pa。父母把这些最早的“咿呀声”当作了对自己的称呼。语言学家雅各布森认为，这种相似不是因为同源，而是因为全人类的嘴都一样。',
    en: 'Why does “mother” sound alike nearly everywhere? A baby’s first sounds are m, b and p plus a — lips closing and opening make ma, ba, pa — and parents take these first babbles as names for themselves. As Roman Jakobson argued, the likeness comes not from shared ancestry but from the shared human mouth.',
  },
  father: {
    zh: '“爸爸”和“妈妈”一样，常常来自婴儿最早的音节：papa、baba、tata、dada……只是 m 多半给了妈妈，p、b、t 多半给了爸爸。',
    en: 'Like “mother”, “father” often grows from a baby’s first syllables — papa, baba, tata, dada — with m usually going to mother and p, b, t to father.',
  },
  tea: {
    zh: '“茶”几乎只有两种说法：像 te 的和像 cha 的。从海上（经荷兰商船）传来的说 te，从陆上（经丝绸之路）传来的说 cha——故事“一个字的两条路”讲的就是它。',
    en: 'Tea has essentially two names: te-like and cha-like. Where it arrived by sea, on Dutch ships, people say te; where it came overland, along the Silk Road, they say cha — the story “One word, two roads” follows both routes.',
  },
  coffee: {
    zh: '几乎所有语言的“咖啡”都来自同一个源头：阿拉伯语 qahwa，经奥斯曼土耳其语 kahve 传入欧洲——coffee、café、Kaffee、кофе、咖啡都是它的后代。',
    en: 'Almost every word for coffee goes back to one source: Arabic qahwa, carried into Europe through Ottoman Turkish kahve — coffee, café, Kaffee, кофе and 咖啡 are all its descendants.',
  },
  sugar: {
    zh: 'sugar、sucre、Zucker、сахар 都可以追溯到梵语 śarkarā，经波斯语和阿拉伯语 sukkar 传入欧洲。',
    en: 'Sugar, sucre, Zucker and сахар all trace back to Sanskrit śarkarā, which reached Europe through Persian and Arabic sukkar.',
  },
  orange: {
    zh: '“橙子”的名字记下了它的旅程：梵语 nāraṅga → 波斯语 nārang → 阿拉伯语 nāranj → 西班牙语 naranja。而在希腊语、土耳其语和许多中东语言里，橙子被叫作“葡萄牙”（portokali、portakal），因为甜橙是葡萄牙商人带来的。',
    en: 'The orange’s name records its journey: Sanskrit nāraṅga → Persian nārang → Arabic nāranj → Spanish naranja. In Greek, Turkish and many Middle Eastern languages it is called “Portugal” (portokali, portakal), because Portuguese traders brought the sweet orange.',
  },
  tomato: {
    zh: 'tomato、tomate、томат 都来自阿兹特克人的纳瓦特尔语 tomatl，经西班牙语传遍世界。但意大利语叫 pomodoro——“金苹果”。',
    en: 'Tomato, tomate and томат come from the Aztecs’ Nahuatl tomatl, spread by Spanish. Italian went its own way: pomodoro, “golden apple”.',
  },
  potato: {
    zh: '土豆来自安第斯山区，名字却五花八门：英语 potato 来自泰诺语的 batata（原指甘薯），法语叫 pomme de terre（“土里的苹果”），荷兰语叫 aardappel，同样是“土苹果”。',
    en: 'The potato comes from the Andes, but its names vary: English potato is from Taíno batata (originally the sweet potato), while French pomme de terre and Dutch aardappel both mean “earth apple”.',
  },
  chocolate: {
    zh: 'chocolate 来自纳瓦特尔语，经西班牙语传遍世界，所以各地的说法都非常接近——不过它在纳瓦特尔语里的确切来源，至今仍有争论。',
    en: 'Chocolate came from Nahuatl by way of Spanish, which is why it sounds so alike everywhere — though its exact origin within Nahuatl is still debated.',
  },
  banana: {
    zh: 'banana 一词据信来自西非语言，经葡萄牙语和西班牙语传遍世界；而在东南亚——香蕉的故乡——它有许多完全不同的本地名字，例如马来语 pisang。',
    en: 'Banana is thought to come from a West African language, spread by Portuguese and Spanish; in Southeast Asia, the fruit’s homeland, it has quite different local names, such as Malay pisang.',
  },
  dog: {
    zh: '英语的 dog 来历不明，是英语词源中有名的谜题；它在古英语里很少见，后来却取代了更古老的 hound（狗，与德语 Hund 同源）。',
    en: 'English dog is a famous etymological puzzle: rare in Old English, it later displaced the older hound, a cousin of German Hund.',
  },
};

export const WORD_COLORS = ['#c4472d', '#3d5ca8', '#c9962b', '#2a8a80', '#8a4f99', '#dc7a35', '#5f8f3a'];
export const WORD_OTHER = '#bdb5a8';

// the 98 words' names in interface languages other than Chinese and English
export const CONCEPT_NAMES = {};

// other interface languages bring their own texts; registered by main.js (see features.js)
export function mergeWordText(code, content) {
  const x = content?.words;
  if (!x) return;
  if (x.intro) WORDS_INTRO[code] = x.intro;
  if (x.method) WORDS_METHOD[code] = x.method;
  for (const [k, v] of Object.entries(x.categories ?? {})) if (WORD_CATEGORIES[k]) WORD_CATEGORIES[k][code] = v;
  for (const [k, v] of Object.entries(x.notes ?? {})) if (WORD_NOTES[k]) WORD_NOTES[k][code] = v;
  CONCEPT_NAMES[code] = x.concepts ?? {};
}
