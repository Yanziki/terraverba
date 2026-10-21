import { getLocale, t, hant, contentFor } from '../i18n/index.js';

// About text: written in English and Chinese here; other languages live in
// content/translations/<locale>.js.
const ABOUT = {
  en: `
    <h3>Why</h3>
    <p>There is no shortage of information about the world’s languages, but most of it lives in tables and encyclopaedia entries. Terraverba tries another way in: first see where languages are, then how they are related and what stories they carry — no linguistics background needed.</p>
    <h3>How to use it</h3>
    <p>Drag to turn the globe, scroll or pinch to zoom, or switch to the flat map. Click a dot for a language; click anywhere else for the languages around that point. Layers can be stacked: family areas, family lines, names. The family tree browses each family; “All languages” unfolds every one of them in a single outline; “Similarity” lays languages out by how alike their words or grammar are. “Words” shows how one word is said around the world, “Features” maps how languages differ — tones, word order, sounds — and the daily quiz asks seven questions of twelve kinds, at four levels that mix easy and hard ones. Press <span class="mono">/</span> to search.</p>
    <h3>What a dot means</h3>
    <p>Each dot is a language’s approximate geographic centre — not the only place it is spoken. Colour shows the family, size roughly follows the number of speakers, hollow dots are extinct languages, diamonds are sign languages. No political borders are drawn: languages rarely follow them.</p>
    <h3>Sources</h3>
    <p>Languages, classification, coordinates and endangerment: <a href="https://glottolog.org" target="_blank" rel="noopener">Glottolog 5.3</a> (Hammarström, Forkel, Haspelmath &amp; Bank; CC BY 4.0). Names in other languages, endonyms and speaker numbers: <a href="https://www.wikidata.org" target="_blank" rel="noopener">Wikidata</a> (CC0); speaker numbers are rough. Similarity: <a href="https://asjp.clld.org" target="_blank" rel="noopener">ASJP</a> v21 word lists and <a href="https://grambank.clld.org" target="_blank" rel="noopener">Grambank</a> 1.0 (CC BY 4.0), embedded with UMAP. Features: Grambank and <a href="https://phoible.org" target="_blank" rel="noopener">PHOIBLE</a> 2.0 (CC BY-SA 3.0). Words: <a href="https://en.wiktionary.org" target="_blank" rel="noopener">Wiktionary</a> translation tables via <a href="https://kaikki.org" target="_blank" rel="noopener">kaikki.org</a> (CC BY-SA 4.0) and ASJP. Writing samples: <a href="https://github.com/eric-muller/udhr" target="_blank" rel="noopener">UDHR in Unicode</a>. Summaries: Wikipedia (CC BY-SA 4.0), credited under each one. Countries and territories — their names, and the order of the places a language is spoken by number of speakers: <a href="https://cldr.unicode.org" target="_blank" rel="noopener">Unicode CLDR</a> (Unicode License). Coastlines and borders: Natural Earth (public domain). Recordings: speakers on <a href="https://lingualibre.org" target="_blank" rel="noopener">Lingua Libre</a> and Wiktionary, via <a href="https://commons.wikimedia.org" target="_blank" rel="noopener">Wikimedia Commons</a> (mostly CC BY-SA; each recording credits its speaker); this site keeps a copy of each so they can be heard everywhere, and loads one only when you press play. Portraits in the stories and photos of the relics of writing: Wikimedia Commons (public domain or Creative Commons, credited on each).</p>
    <p>The notes and stories are written for this site.</p>
    <h3>Corrections</h3>
    <p>With eight thousand languages there will be mistakes. Every language panel and word map has a link to report one; corrections from people who know a language are the best source we have.</p>
    <h3>Open source</h3>
    <p>Terraverba is free and open source. The code is under the MIT licence; the texts written for the site and the data it compiles are under CC BY-SA 4.0, as they build on Wiktionary, Wikipedia and PHOIBLE; third-party material keeps its own licence (see Sources). The name and logo are not part of the licence.</p>
    <p>Source code and data scripts: <a href="https://github.com/Yanziki/terraverba" target="_blank" rel="noopener">github.com/Yanziki/terraverba</a></p>
    <h3>Privacy</h3>
    <p>Visits are counted with Cloudflare Web Analytics, which uses no cookies and does not follow anyone from site to site. Your passport, with the name and photo you put on it, stays in this browser. A correction you send is kept so it can be checked; leaving contact details is optional, and they are never published.</p>`,
  zh: `
    <h3>为什么做这个</h3>
    <p>世界上的语言资料并不少，但大多是表格和词条。Terraverba 想换一种方式：先让你看见语言在哪里，再告诉你它们之间的关系和背后的故事——不需要任何语言学背景。</p>
    <h3>怎么用</h3>
    <p>拖动转动地球仪，滚轮或双指缩放，也可以切换成平面地图。点击圆点查看一种语言；点击其他任何地方，查看那一带的语言。图层可以叠加：语系分区、谱系连线、名称。“语言树”按谱系浏览每个语系；“全部语言”把所有语言展开成一棵竖向的树；“相似度”按词汇或语法的相近程度排列语言。“词语”看同一个词在世界各地怎么说，“语言特征”把声调、语序、发音等差异画成地图，“每日一题”每天七道题、十二种题型，四个难度按简单题和难题的比例区分。按 <span class="mono">/</span> 键可以随时搜索。</p>
    <h3>每个圆点代表什么</h3>
    <p>一个圆点是一种语言的大致地理中心（并不代表它只在那一点被使用）。颜色是语系，大小大致对应使用人口，空心圆点表示已经消亡的语言，菱形是手语。地图上不画国界——语言很少按国界分布。</p>
    <h3>数据来源</h3>
    <p>语言、谱系、坐标与濒危等级：<a href="https://glottolog.org" target="_blank" rel="noopener">Glottolog 5.3</a>（Hammarström、Forkel、Haspelmath、Bank，CC BY 4.0）。多语言名称、自称与使用人口：<a href="https://www.wikidata.org" target="_blank" rel="noopener">Wikidata</a>（CC0），使用人口为粗略估计；Wikidata 没有中文名的分支，按构词规则译出。相似度：<a href="https://asjp.clld.org" target="_blank" rel="noopener">ASJP</a> v21 词表与 <a href="https://grambank.clld.org" target="_blank" rel="noopener">Grambank</a> 1.0（CC BY 4.0），用 UMAP 降维。语言特征：Grambank 与 <a href="https://phoible.org" target="_blank" rel="noopener">PHOIBLE</a> 2.0（CC BY-SA 3.0）。词语：<a href="https://en.wiktionary.org" target="_blank" rel="noopener">维基词典</a>的翻译表（经 <a href="https://kaikki.org" target="_blank" rel="noopener">kaikki.org</a> 整理，CC BY-SA 4.0）与 ASJP。文字样例：<a href="https://github.com/eric-muller/udhr" target="_blank" rel="noopener">UDHR in Unicode</a>。简介：维基百科（CC BY-SA 4.0），每段下方注明出处。国家和地区的名称，以及按使用人数排列的使用地区：<a href="https://cldr.unicode.org" target="_blank" rel="noopener">Unicode CLDR</a>（Unicode 许可）。海岸线与国界：Natural Earth（公有领域）。录音：<a href="https://lingualibre.org" target="_blank" rel="noopener">Lingua Libre</a> 与维基词典的发音者，经 <a href="https://commons.wikimedia.org" target="_blank" rel="noopener">Wikimedia Commons</a>（多为 CC BY-SA，每条录音都标明录音者）；本站保存了一份副本，让各地都能听到，只在你按下播放时才加载。故事中的肖像和“文字遗物”的照片：Wikimedia Commons（公有领域或知识共享许可，每张都注明了出处）。</p>
    <p>“你知道吗”与“故事”由本站撰写。</p>
    <h3>纠错</h3>
    <p>八千种语言，难免有错。每种语言的详情和词语地图里都有“报告错误”的入口；懂这门语言的人提出的修正，是我们最好的资料来源。</p>
    <h3>开源</h3>
    <p>本站完全免费、开源。代码采用 MIT 许可；本站撰写的文字和整理出的数据采用 CC BY-SA 4.0，因为其中用到了维基词典、维基百科和 PHOIBLE 的内容；第三方素材保留各自的许可（见“数据来源”）。“Terraverba”这个名称和标志不在许可范围内。</p>
    <p>源代码和数据处理脚本：<a href="https://github.com/Yanziki/terraverba" target="_blank" rel="noopener">github.com/Yanziki/terraverba</a></p>
    <h3>隐私</h3>
    <p>访问量由 Cloudflare Web Analytics 统计，它不使用 cookie，也不会跨网站追踪任何人。语言护照以及你放在上面的姓名和照片，只保存在这个浏览器里。你提交的纠错会保存下来以便核对；联系方式可以不填，填了也绝不公开。</p>`,
};

export function renderAbout(sheet) {
  const zh = getLocale().startsWith('zh');
  // other interface languages bring their own text (content/translations)
  const own = contentFor('about');
  sheet.innerHTML = `
    <div class="sheet-head">
      <div class="kicker">${t('navAbout')}</div>
      <h2>${t('aboutTitle')}</h2>
    </div>
    <div class="sheet-body prose">${zh ? hant(ABOUT.zh) : own ?? ABOUT.en}</div>`;
}
