// The hand-picked feature questions. Codes match data/features.py; colours
// follow the job they do — a highlight for "yes", a one-hue ramp for counts,
// distinct hues for unordered categories.
const YES = '#c4472d';
const NO = '#8d9aa3';
const RAMP = ['#bcd3e3', '#86afcb', '#4f86ad', '#2b5f88', '#163a5c'];
const yesNo = (yes, no) => ({ yes: { label: yes, color: YES }, no: { label: no, color: NO } });

export const FEATURES = [
  {
    id: 'tone',
    short: { zh: '声调', en: 'Tone' },
    title: { zh: '有声调吗？', en: 'Is it tonal?' },
    body: {
      zh: '在声调语言里，音高的高低升降能区分词义：普通话的 mā（妈）和 mǎ（马）只差一个声调。在这份样本里，接近一半的语言有声调，集中在东亚、东南亚、非洲和中美洲。',
      en: 'In a tonal language, pitch distinguishes words: Mandarin mā “mother” and mǎ “horse” differ only in tone. In this sample nearly half the languages are tonal, concentrated in East and Southeast Asia, Africa and Central America.',
    },
    note: { zh: '数据来自 PHOIBLE，只采用记录了声调的来源；个别来源把音高重音也算作声调。', en: 'From PHOIBLE, counting only sources that record tone; a few count pitch accent as tone.' },
    codes: {
      none: { label: { zh: '无声调', en: 'No tones' }, color: NO },
      two: { label: { zh: '2 个', en: '2 tones' }, color: '#efb39a' },
      three: { label: { zh: '3 个', en: '3 tones' }, color: '#e07b55' },
      four5: { label: { zh: '4–5 个', en: '4–5 tones' }, color: YES },
      six: { label: { zh: '6 个以上', en: '6 or more' }, color: '#8c2a1a' },
    },
  },
  {
    id: 'order',
    short: { zh: '语序', en: 'Word order' },
    title: { zh: '动词放在句子的哪里？', en: 'Where does the verb go?' },
    body: {
      zh: '“我吃苹果”——汉语和英语把动词放在中间；日语、韩语、土耳其语把它放在最后（“我苹果吃”）；古典阿拉伯语、威尔士语和许多南岛语言则常把动词放在最前面。在这份样本里，动词居中和居末的语言大致一样多。',
      en: '“I eat apples” — Chinese and English put the verb in the middle; Japanese, Korean and Turkish put it last (“I apples eat”); Classical Arabic, Welsh and many Austronesian languages often put it first. In this sample, verb-medial and verb-final languages are about equally common.',
    },
    note: { zh: '数据来自 Grambank：及物句中无标记的语序。', en: 'From Grambank: the unmarked order in transitive clauses.' },
    codes: {
      initial: { label: { zh: '动词在前', en: 'Verb first' }, color: '#2a8a80' },
      medial: { label: { zh: '动词居中', en: 'Verb in the middle' }, color: '#3d5ca8' },
      final: { label: { zh: '动词在后', en: 'Verb last' }, color: '#c9962b' },
      free: { label: { zh: '没有固定语序', en: 'No fixed order' }, color: NO },
    },
  },
  {
    id: 'classifiers',
    short: { zh: '量词', en: 'Classifiers' },
    title: { zh: '数东西要用量词吗？', en: 'Do you need a classifier to count?' },
    body: {
      zh: '汉语说“三本书”“三只猫”，不能直接说“三书”。量词在东亚和东南亚非常普遍，在美洲、大洋洲也零星出现，在欧洲语言里几乎没有。',
      en: 'Chinese says “three volume-of book”, “three animal-of cat” — never just “three book”. Numeral classifiers are everywhere in East and Southeast Asia, scattered in the Americas and Oceania, and almost absent from Europe.',
    },
    note: { zh: '数据来自 Grambank（数词量词）。', en: 'From Grambank (numeral classifiers).' },
    codes: yesNo({ zh: '要用量词', en: 'Yes' }, { zh: '不用', en: 'No' }),
  },
  {
    id: 'gender',
    short: { zh: '名词的性', en: 'Gender' },
    title: { zh: '名词分阴性阳性吗？', en: 'Do nouns have gender?' },
    body: {
      zh: '法语的“月亮”（la lune）是阴性，德语的“月亮”（der Mond）却是阳性。这里只统计与生理性别有关的名词分类；班图语言的名词类别不按性别划分，所以算作“没有”。',
      en: 'The moon is feminine in French (la lune) but masculine in German (der Mond). Only systems tied to sex are counted here; Bantu noun classes are not based on sex, so they count as “no”.',
    },
    note: { zh: '数据来自 Grambank。', en: 'From Grambank.' },
    codes: yesNo({ zh: '有', en: 'Yes' }, { zh: '没有', en: 'No' }),
  },
  {
    id: 'clusivity',
    short: { zh: '包括式“我们”', en: 'Inclusive “we”' },
    title: { zh: '“我们”分包括式和排除式吗？', en: 'Is there an inclusive “we”?' },
    body: {
      zh: '许多语言有两个“我们”：包括听话人的，和不包括听话人的。普通话的“咱们”就是包括式；巴布亚新几内亚的 Tok Pisin 也区分 yumi 和 mipela。在这份样本里，约一半的语言做这种区分。',
      en: 'Many languages have two words for “we”: one that includes the listener and one that does not. Mandarin zánmen is inclusive; Tok Pisin distinguishes yumi from mipela. About half the languages in this sample make the distinction.',
    },
    note: { zh: '数据来自 Grambank。', en: 'From Grambank.' },
    codes: yesNo({ zh: '区分', en: 'Yes' }, { zh: '不区分', en: 'No' }),
  },
  {
    id: 'numbase',
    short: { zh: '计数方式', en: 'Counting' },
    title: { zh: '数数以几为单位？', en: 'How does counting work?' },
    body: {
      zh: '大多数语言是十进制。二十进制的痕迹在法语（quatre-vingts，4×20=80）、丹麦语、巴斯克语和玛雅语言里都能找到；新几内亚的一些语言则沿着身体数数——手指、手腕、手肘、肩膀……',
      en: 'Most languages count in tens. Traces of twenties survive in French (quatre-vingts, 4×20 = 80), Danish, Basque and the Mayan languages; some languages of New Guinea count along the body — fingers, wrist, elbow, shoulder…',
    },
    note: { zh: '数据来自 Grambank；一种语言可能兼有几种成分，这里取最有特点的一种。', en: 'From Grambank; where a language mixes systems, the most distinctive is shown.' },
    codes: {
      decimal: { label: { zh: '十进制', en: 'Tens' }, color: '#3d5ca8' },
      vigesimal: { label: { zh: '有二十进制成分', en: 'Some twenties' }, color: YES },
      quinary: { label: { zh: '有五进制成分', en: 'Some fives' }, color: '#c9962b' },
      tally: { label: { zh: '用身体部位计数', en: 'Body-part tally' }, color: '#2a8a80' },
      other: { label: { zh: '其他或数词很少', en: 'Other / few numerals' }, color: NO },
    },
  },
  {
    id: 'articles',
    short: { zh: '冠词', en: 'Articles' },
    title: { zh: '有定冠词吗？（像英语的 the）', en: 'Is there a word like “the”?' },
    body: {
      zh: '英语、法语、阿拉伯语、匈牙利语都有定冠词；汉语、俄语、日语没有，“那本书”还是“一本书”靠语境判断。',
      en: 'English, French, Arabic and Hungarian have definite articles; Chinese, Russian and Japanese do not, leaving “the book” or “a book” to context.',
    },
    note: { zh: '数据来自 Grambank。', en: 'From Grambank.' },
    codes: yesNo({ zh: '有', en: 'Yes' }, { zh: '没有', en: 'No' }),
  },
  {
    id: 'past',
    short: { zh: '过去时', en: 'Past tense' },
    title: { zh: '动词要变成“过去时”吗？', en: 'Does the verb mark the past?' },
    body: {
      zh: '英语说 walk / walked，动词本身要变；汉语用“了”“过”或时间词表达，动词不变。在这份样本里，两种情况几乎对半分。',
      en: 'English changes the verb itself — walk, walked; Chinese leaves the verb alone and uses particles or time words. In this sample the two are almost evenly split.',
    },
    note: { zh: '数据来自 Grambank：动词上专门表示过去时的形态标记。', en: 'From Grambank: morphology on the verb dedicated to past tense.' },
    codes: yesNo({ zh: '要', en: 'Yes' }, { zh: '不要', en: 'No' }),
  },
  {
    id: 'polite',
    short: { zh: '敬称“您”', en: 'Polite “you”' },
    title: { zh: '“你”有敬称吗？（像“您”）', en: 'Is there a polite “you”?' },
    body: {
      zh: '普通话有“您”，法语有 vous，德语有 Sie，西班牙语有 usted——用不同的“你”表达尊敬或距离。英语曾经也有（thou 与 you），后来只留下了 you。',
      en: 'Mandarin has nín, French vous, German Sie, Spanish usted — a different “you” for respect or distance. English once had one too (thou versus you), and kept only you.',
    },
    note: { zh: '数据来自 Grambank。', en: 'From Grambank.' },
    codes: yesNo({ zh: '有', en: 'Yes' }, { zh: '没有', en: 'No' }),
  },
  {
    id: 'evidential',
    short: { zh: '示证', en: 'Evidentials' },
    title: { zh: '必须说明消息是怎么知道的吗？', en: 'Must you say how you know?' },
    body: {
      zh: '在有“示证”语法的语言里，说一件事时要标明你是亲眼看到的，还是听说或推断的。土耳其语、藏语和许多南美洲语言都是这样。',
      en: 'In languages with evidentials, a statement carries a mark of how you know it — seen with your own eyes, heard from others, or inferred. Turkish, Tibetan and many South American languages work this way.',
    },
    note: { zh: '数据来自 Grambank：对间接证据（听说、推断）的语法标记。', en: 'From Grambank: grammatical marking of indirect evidence (hearsay, inference).' },
    codes: yesNo({ zh: '要', en: 'Yes' }, { zh: '不要', en: 'No' }),
  },
  {
    id: 'vowels',
    short: { zh: '元音', en: 'Vowels' },
    title: { zh: '有多少个元音？', en: 'How many vowels?' },
    body: {
      zh: '元音少的语言只有三个，例如许多澳大利亚原住民语言；多的超过二十个。这里的计数把长元音、鼻化元音都算作独立的元音。',
      en: 'Some languages manage with three vowels, as many Aboriginal Australian languages do; others have more than twenty. Long and nasal vowels are counted separately here.',
    },
    note: { zh: '数据来自 PHOIBLE。', en: 'From PHOIBLE.' },
    codes: {
      v1: { label: { zh: '5 个以下', en: '5 or fewer' }, color: RAMP[0] },
      v2: { label: { zh: '6–8 个', en: '6–8' }, color: RAMP[1] },
      v3: { label: { zh: '9–12 个', en: '9–12' }, color: RAMP[2] },
      v4: { label: { zh: '13–18 个', en: '13–18' }, color: RAMP[3] },
      v5: { label: { zh: '19 个以上', en: '19 or more' }, color: RAMP[4] },
    },
  },
  {
    id: 'consonants',
    short: { zh: '辅音', en: 'Consonants' },
    title: { zh: '有多少个辅音？', en: 'How many consonants?' },
    body: {
      zh: '辅音的数量差别更大：夏威夷语只有 8 个，而高加索和南部非洲的一些语言有 80 个以上。',
      en: 'Consonants vary even more: Hawaiian has 8, while some languages of the Caucasus and southern Africa have more than 80.',
    },
    note: { zh: '数据来自 PHOIBLE。', en: 'From PHOIBLE.' },
    codes: {
      c1: { label: { zh: '15 个以下', en: '15 or fewer' }, color: RAMP[0] },
      c2: { label: { zh: '16–22 个', en: '16–22' }, color: RAMP[1] },
      c3: { label: { zh: '23–30 个', en: '23–30' }, color: RAMP[2] },
      c4: { label: { zh: '31–45 个', en: '31–45' }, color: RAMP[3] },
      c5: { label: { zh: '46 个以上', en: '46 or more' }, color: RAMP[4] },
    },
  },
  {
    id: 'clicks',
    short: { zh: '搭嘴音', en: 'Clicks' },
    title: { zh: '有搭嘴音吗？', en: 'Are there clicks?' },
    body: {
      zh: '把舌头从上颚“啧”地弹开，就是一个搭嘴音。它们作为普通辅音，几乎只出现在非洲南部和东部的语言里。',
      en: 'Snap the tongue off the roof of your mouth and you have made a click. As ordinary consonants, clicks occur almost only in the languages of southern and eastern Africa.',
    },
    note: { zh: '数据来自 PHOIBLE。', en: 'From PHOIBLE.' },
    codes: yesNo({ zh: '有', en: 'Yes' }, { zh: '没有', en: 'No' }),
  },
];

export const FEATURE_INTRO = {
  zh: '语言之间的差别不只在词汇。这里的每一个问题，都在地图上给出全世界的答案。数据来自 Grambank（约 2,400 种语言的语法）和 PHOIBLE（约 2,000 种语言的语音）；没有数据的语言显示为浅色。',
  en: 'Languages differ in far more than words. Each question here gets a worldwide answer on the map. Data: Grambank (grammar of some 2,400 languages) and PHOIBLE (sounds of some 2,000); languages without data are shown faint.',
};

// colours for any Grambank feature (codes 0–3) and for phoneme search
export const GENERIC = { 0: NO, 1: YES, 2: '#c9962b', 3: '#2a8a80' };
export const HAS = YES;
export const LACKS = NO;
export const NO_DATA = '#d6cfc2';

// sounds worth trying in the phoneme search
export const SOUND_PICKS = ['θ', 'ð', 'ʃ', 'x', 'ʔ', 'q', 'ħ', 'ɬ', 'y', 'ø', 'ɯ', 'ɨ', 'ŋ', 'ɲ', 'r', 'ʀ', 'ǃ', 'ʘ', 'ɓ', 'kp'];

// other interface languages bring their own texts (content/translations/<locale>.js);
// main.js registers this with i18n, which Node (tools/build-pages.mjs) can't load
export function mergeFeatureText(code, content) {
  const x = content?.features;
  if (!x) return;
  if (x.intro) FEATURE_INTRO[code] = x.intro;
  for (const f of FEATURES) {
    const y = x[f.id];
    if (!y) continue;
    for (const k of ['short', 'title', 'body', 'note']) if (y[k]) f[k][code] = y[k];
    for (const [c, label] of Object.entries(y.codes ?? {})) if (f.codes[c]) f.codes[c].label[code] = label;
  }
}
