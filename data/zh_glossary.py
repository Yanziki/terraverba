"""Rule-based Chinese names for Glottolog groupings that Wikidata has no
Chinese label for. Glottolog subgroup names are compositional ("North
Volta-Congo", "Central-Western Bantu"), so translating the parts and adding
a level suffix gives readable names. Proper names without an established
Chinese form are kept in Latin script rather than invented.
"""
import re

PHRASES = {
    "Central-Western": "中西部", "West-Central": "中西部", "Central-Eastern": "中东部", "East-Central": "中东部",
    "North-Central": "中北部", "Central-North": "中北部", "South-Central": "中南部", "Central-South": "中南部",
    "North and Central": "北部与中部", "South and Central": "南部与中部", "West-Coastal": "西部沿海", "East-Coastal": "东部沿海",
    "New Georgia": "新乔治亚", "New Ireland": "新爱尔兰", "New Britain": "新不列颠", "New Hanover": "新汉诺威",
    "Santa Isabel": "圣伊莎贝尔", "Santa Cruz": "圣克鲁斯", "Crimean Tatar": "克里米亚鞑靼",
    "Trans New Guinea": "跨新几内亚", "New Guinea": "新几内亚", "Bird's Head": "鸟头", "Cross River": "克罗斯河",
    "New Caledonian": "新喀里多尼亚", "Benue-Congo": "贝努埃-刚果", "Volta-Niger": "沃尔特-尼日尔", "Niger-Congo": "尼日尔-刚果",
    "Indo-Aryan": "印度-雅利安", "Indo-Iranian": "印度-伊朗", "Indo-European": "印欧", "Indo-Pakistani": "印巴",
    "Uto-Aztecan": "犹他-阿兹特克", "Sino-Tibetan": "汉藏", "Tibeto-Burman": "藏缅", "Kuki-Chin": "库基-钦",
    "Bodo-Garo": "博多-加罗", "Ong-Be": "临高", "Malayo-Polynesian": "马来-波利尼西亚", "Austro-Asiatic": "南亚",
    "Afro-Asiatic": "亚非", "Nilo-Saharan": "尼罗-撒哈拉", "Central Sudanic": "中苏丹", "Eastern Sudanic": "东苏丹",
    "Mon-Khmer": "孟-高棉", "Hmong-Mien": "苗瑶", "Tai-Kadai": "侗台", "Kra-Dai": "侗台", "Kam-Sui": "侗水",
    "Pama-Nyungan": "帕马-尼荣甘", "Oto-Manguean": "奥托-曼格", "Mixe-Zoque": "米塞-索克", "Tupi-Guarani": "图皮-瓜拉尼",
    "Eskimo-Aleut": "爱斯基摩-阿留申", "Na-Dene": "纳-德内", "South Dravidian": "南达罗毗荼", "Sign Language": "手语",
    "Old Sabellic": "古萨贝利", "Middle-Modern": "中古-现代", "Latin American": "拉丁美洲", "Solomon Islands": "所罗门群岛",
    "Torres Strait": "托雷斯海峡", "Papua New Guinea": "巴布亚新几内亚", "Cape Verde": "佛得角", "Sierra Leone": "塞拉利昂",
    "Rio Grande": "格兰德河", "South Halmahera": "南哈马黑拉", "North Halmahera": "北哈马黑拉",
}

TOKENS = {
    # directions and qualifiers
    "Central": "中部", "Eastern": "东部", "Western": "西部", "Northern": "北部", "Southern": "南部", "Nuclear": "核心",
    "West": "西", "East": "东", "North": "北", "South": "南", "Northwest": "西北", "Northeast": "东北", "Southwest": "西南",
    "Southeast": "东南", "Northwestern": "西北部", "Northeastern": "东北部", "Southwestern": "西南部", "Southeastern": "东南部",
    "Greater": "大", "Great": "大", "Macro": "大", "Core": "核心", "Modern": "现代", "Middle": "中古", "Old": "古",
    "New": "新", "Coastal": "沿海", "Coast": "海岸", "Lower": "下", "Upper": "上", "Lowland": "低地", "Highland": "高地",
    "Highlands": "高地", "Plateau": "高原", "Inland": "内陆", "Interior": "内陆", "Hill": "山地", "Hills": "山地",
    "Mountain": "山地", "Mountains": "山地", "Valley": "谷地", "River": "河", "Rivers": "河流", "Riverine": "沿河", "Riverain": "沿河",
    "Delta": "三角洲", "Bay": "湾", "Gulf": "湾", "Lake": "湖", "Lakes": "湖区", "Plains": "平原", "Plain": "平原",
    "Islands": "群岛", "Island": "岛", "Straits": "海峡", "Strait": "海峡", "Basin": "盆地", "Isthmus": "地峡", "Isthmic": "地峡",
    "Mainland": "大陆", "Continental": "大陆", "Peripheral": "外围", "Periphery": "外围", "Outlier": "外围", "Outer": "外",
    "Inner": "内", "Mid": "中", "Center": "中央", "Proximal": "近", "Far": "远", "Extreme": "极", "Extended": "扩展",
    "Narrow": "狭义", "Trans": "跨", "Ring": "环", "Global": "全球", "Classical": "古典", "Imperial": "帝国", "Late": "晚期",
    "Early": "早期", "Pre": "前", "Low": "低", "Oriental": "东方", "Occidental": "西方", "Meridional": "南方",
    "Septentrional": "北方", "General": "通用", "Complex": "复合", "Midland": "中部", "Midlands": "中部", "Land": "地区",
    "Zone": "区", "zone": "区", "Proper": "本支", "Neo": "新", "Unclassified": "未分类",
    # places
    "American": "美洲", "European": "欧洲", "African": "非洲", "Asian": "亚洲", "Pacific": "太平洋", "Atlantic": "大西洋",
    "Caribbean": "加勒比", "Indo": "印度", "Guinea": "几内亚", "Congo": "刚果", "Volta": "沃尔特", "Niger": "尼日尔",
    "Benue": "贝努埃", "Chad": "乍得", "Cameroun": "喀麦隆", "Cameroon": "喀麦隆", "Nigerian": "尼日利亚", "Liberian": "利比里亚",
    "Ethiopic": "埃塞俄比亚", "Kordofan": "科尔多凡", "Kasai": "开赛", "Zaire": "扎伊尔", "Kilimanjaro": "乞力马扎罗",
    "Mozambique": "莫桑比克", "Tanzania": "坦桑尼亚", "Togo": "多哥", "Rift": "裂谷", "Nyanza": "尼扬扎", "Kivu": "基伍",
    "Omo": "奥莫", "Ubangi": "乌班吉", "Ubangian": "乌班吉", "Adamawa": "阿达马瓦", "Jos": "乔斯", "Bauchi": "包奇",
    "Kunene": "库内内", "Ruvuma": "鲁伍马", "Rufiji": "鲁菲吉", "Sanaga": "萨纳加", "Logone": "洛贡", "Chari": "沙里",
    "Grassfields": "草原", "Saharan": "撒哈拉", "Sudanic": "苏丹", "Nubian": "努比亚",
    "Vanuatu": "瓦努阿图", "Malakula": "马勒库拉", "Santo": "桑托", "Efate": "埃法特", "Tanna": "塔纳", "Ambrym": "安布里姆",
    "Epi": "埃皮", "Fijian": "斐济", "Polynesian": "波利尼西亚", "Micronesian": "密克罗尼西亚", "Melanesian": "美拉尼西亚",
    "Oceanic": "大洋洲", "Admiralty": "阿德默勒尔蒂", "Manus": "马努斯", "Bougainville": "布干维尔", "Choiseul": "舒瓦瑟尔",
    "Isabel": "伊莎贝尔", "Guadalcanal": "瓜达尔卡纳尔", "Malaita": "马莱塔", "Makira": "马基拉", "Solomonic": "所罗门",
    "Caledonian": "喀里多尼亚", "Sepik": "塞皮克", "Ramu": "拉穆", "Madang": "马当", "Huon": "休恩", "Markham": "马卡姆",
    "Finisterre": "菲尼斯特雷", "Goroka": "戈罗卡", "Kainantu": "凯南图", "Torricelli": "托里切利", "Jayapura": "查亚普拉",
    "Papuan": "巴布亚", "Papua": "巴布亚", "Asmat": "阿斯马特", "Dani": "达尼", "Timor": "帝汶", "Alor": "阿洛", "Pantar": "潘塔尔",
    "Flores": "弗洛勒斯", "Sumba": "松巴", "Seram": "斯兰", "Maluku": "马鲁古", "Halmahera": "哈马黑拉", "Sulawesi": "苏拉威西",
    "Celebic": "西里伯斯", "Borneo": "婆罗洲", "Barito": "巴里托", "Sabahan": "沙巴", "Brunei": "文莱", "Dayak": "达雅克",
    "Sumatra": "苏门答腊", "Sumatran": "苏门答腊", "Batak": "巴塔克", "Luzon": "吕宋", "Cordilleran": "科迪勒拉",
    "Bisayan": "米沙鄢", "Bikol": "比科尔", "Palawan": "巴拉望", "Palawanic": "巴拉望", "Manobo": "马诺博", "Minahasan": "米纳哈萨",
    "Tanimbar": "塔宁巴尔", "Formosan": "台湾南岛", "Malagasic": "马达加斯加", "Bali": "巴厘", "Iban": "伊班", "Kayan": "加央",
    "Kenyah": "肯雅", "Andamanese": "安达曼", "Tasmanian": "塔斯马尼亚", "Yolngu": "雍古", "Daly": "戴利", "Paman": "帕曼",
    "Nyungan": "尼荣甘", "Pama": "帕马", "Gunwinyguan": "贡温古", "Arandic": "阿兰达", "Wati": "瓦蒂",
    "Colombia": "哥伦比亚", "Bolivian": "玻利维亚", "Ecuadorian": "厄瓜多尔", "Guerrero": "格雷罗", "Puebla": "普埃布拉",
    "Oaxaca": "瓦哈卡", "Sierra": "山区", "Guianan": "圭亚那", "Purus": "普鲁斯", "Japura": "雅普拉", "Magdalenic": "马格达莱纳",
    "Georgia": "乔治亚", "England": "英格兰", "Scandinavian": "斯堪的纳维亚", "Iran": "伊朗", "Indus": "印度河",
    "Kohistani": "科希斯坦", "Nuristani": "努里斯坦", "Dardic": "达尔德", "Turkestan": "突厥斯坦", "Himalayish": "喜马拉雅",
    "Kiranti": "基兰提", "Tani": "塔尼", "Bumthangic": "布姆唐", "Chamdoic": "昌都", "Gyalrongic": "嘉绒", "Qiandongic": "黔东",
    "Chuanqiandian": "川黔滇", "Patkaian": "帕特凯",
    # peoples, languages and families
    "Bantu": "班图", "Bantoid": "类班图", "Chadic": "乍得", "Cushitic": "库希特", "Omotic": "奥莫", "Berber": "柏柏尔",
    "Semitic": "闪米特", "Arabic": "阿拉伯", "Aramaic": "阿拉米", "Mande": "曼德", "Manding": "曼丁", "Gur": "古尔",
    "Kru": "克鲁", "Kwa": "克瓦", "Edoid": "埃多", "Igboid": "伊博", "Yoruboid": "约鲁巴", "Kainji": "凯因吉", "Jukun": "朱昆",
    "Ijo": "伊乔", "Fula": "富拉", "Senufo": "塞努福", "Songhay": "桑海", "Dogon": "多贡", "Gurma": "古尔马", "Nguni": "恩古尼",
    "Tsonga": "聪加", "Nyanja": "尼扬贾", "Lunda": "隆达", "Kikongo": "基刚果", "Swahili": "斯瓦希里", "Luyia": "卢希亚",
    "Mijikenda": "米吉肯达", "Kalenjin": "卡伦金", "Nilotic": "尼罗", "Nuer": "努尔", "Lwoo": "卢奥", "Surmic": "苏尔马",
    "Oromo": "奥罗莫", "Khoekhoe": "科伊科伊", "Bamileke": "巴米累克", "Mende": "门德", "Gbaya": "巴亚", "Ewe": "埃维",
    "Greek": "希腊", "Celtic": "凯尔特", "Germanic": "日耳曼", "Romance": "罗曼", "Slavic": "斯拉夫", "Baltic": "波罗的",
    "Italic": "意大利", "Iranian": "伊朗", "Farsic": "波斯", "Aryan": "雅利安", "Romani": "罗姆", "Sogdic": "粟特",
    "English": "英语", "French": "法语", "German": "德语", "Dutch": "荷兰", "Portuguese": "葡萄牙", "Spanish": "西班牙",
    "Italian": "意大利", "Russian": "俄语", "Saami": "萨米", "Finnic": "芬兰", "Turkic": "突厥", "Kipchak": "钦察",
    "Mongolic": "蒙古", "Tungusic": "通古斯", "Tsezic": "采兹", "Andic": "安迪",
    "Dravidian": "达罗毗荼", "Tamil": "泰米尔", "Malayalam": "马拉雅拉姆", "Gondi": "贡德", "Marathi": "马拉提",
    "Rajasthani": "拉贾斯坦", "Hindi": "印地", "Sindhi": "信德", "Oriya": "奥里亚",
    "Chinese": "汉语", "Sinitic": "汉", "Tibetic": "藏", "Tibetan": "藏", "Burmish": "缅", "Burmese": "缅甸", "Mranmaic": "缅",
    "Lolo": "彝", "Loloish": "彝", "Lisoid": "傈僳", "Hanic": "哈尼", "Beic": "白", "Naic": "纳", "Qiangic": "羌",
    "Karen": "克伦", "Karenic": "克伦", "Kuki": "库基", "Chin": "钦", "Naga": "那加", "Bodo": "博多", "Tamangic": "塔芒",
    "Miao": "苗", "Hmongic": "苗", "Tai": "台", "Thai": "泰", "Daic": "台", "Kra": "仡", "Hlai": "黎",
    "Shanic": "掸", "Palaungic": "德昂", "Bahnaric": "巴拿", "Khasi": "卡西", "Aslian": "阿斯里", "Cham": "占",
    "Malay": "马来", "Malayic": "马来", "Javanese": "爪哇",
    "Quechua": "克丘亚", "Quechuan": "克丘亚", "Aymaran": "艾马拉", "Guarani": "瓜拉尼", "Tupi": "图皮", "Arawakan": "阿拉瓦克",
    "Maipuran": "迈普雷", "Cariban": "加勒比", "Tucanoan": "图卡诺", "Chibchan": "奇布恰", "Je": "热", "Pano": "帕诺",
    "Tacanan": "塔卡纳", "Nambiquaran": "南比夸拉", "Huitotoan": "维托托", "Yanomam": "亚诺马米", "Mayan": "玛雅", "Maya": "玛雅",
    "Quichean": "基切", "Mamean": "马姆", "Nahuatl": "纳瓦特尔", "Aztecan": "阿兹特克", "Uto": "犹他", "Zapotec": "萨波特克",
    "Zapotecan": "萨波特克", "Mixtec": "米斯特克", "Mixe": "米塞", "Zoque": "索克", "Chinantec": "奇南特克",
    "Mazatec": "马萨特克", "Mazatecan": "马萨特克", "Otomi": "奥托米", "Popolocan": "波波洛卡", "Totonacan": "托托纳克",
    "Otomanguean": "奥托-曼格", "Athabaskan": "阿萨巴斯卡", "Apachean": "阿帕奇", "Algonquian": "阿尔冈昆", "Ojibwa": "奥吉布瓦",
    "Iroquoian": "易洛魁", "Iroquois": "易洛魁", "Siouan": "苏", "Salish": "萨利希", "Yuman": "尤马", "Muskogean": "穆斯科吉",
    "Chumashan": "丘马什", "Eskimo": "爱斯基摩", "Creole": "克里奥尔", "Pidgin": "皮钦", "pidgin": "皮钦",
    "Austronesian": "南岛", "Latin": "拉丁", "Latinic": "拉丁", "Malayo": "马来", "Chamic": "占", "Mixtecan": "米斯特克", "Amuzgo": "阿穆斯戈",
    "Wide": "广义", "Santa": "圣", "Tatar": "鞑靼", "Crimean": "克里米亚", "Kadugli": "卡杜格利", "Embera": "恩贝拉",
    "Ireland": "爱尔兰", "Britain": "不列颠", "Sabellic": "萨贝利", "Osco": "奥斯坎", "Umbrian": "翁布里亚",
    "Gallo": "高卢", "Gallic": "高卢", "Iberian": "伊比利亚", "Rhaeto": "雷托", "Occitano": "奥克", "Ibero": "伊比利亚",
    "Balkan": "巴尔干", "Danubian": "多瑙", "Anglo": "盎格鲁", "Frisian": "弗里西", "Norse": "诺尔斯", "Gothic": "哥特",
    "Armenian": "亚美尼亚", "Albanian": "阿尔巴尼亚", "Anatolian": "安纳托利亚", "Hellenic": "希腊", "Tocharian": "吐火罗",
    "Kartvelian": "卡特维尔", "Caucasian": "高加索", "Semitic": "闪米特", "Ethiopian": "埃塞俄比亚", "Egyptian": "埃及",
    "Yiddish": "意第绪", "Ladino": "拉迪诺", "Sardinian": "撒丁", "Venetian": "威尼斯", "Sicilian": "西西里", "Catalan": "加泰罗尼亚",
    "Castilian": "卡斯蒂利亚", "Galician": "加利西亚", "Occitan": "奥克", "Walloon": "瓦隆", "Picard": "皮卡第",
    "Mongolian": "蒙古", "Uyghur": "维吾尔", "Kazakh": "哈萨克", "Uzbek": "乌兹别克", "Turkmen": "土库曼", "Oghuz": "乌古斯",
    "Karluk": "葛逻禄", "Siberian": "西伯利亚", "Yakut": "雅库特", "Bulgar": "保加尔", "Evenki": "鄂温克", "Manchu": "满",
    "Japanesic": "日本", "Ryukyuan": "琉球", "Amami": "奄美", "Okinawan": "冲绳", "Miyako": "宫古", "Yaeyama": "八重山",
    "Korean": "朝鲜", "Ainu": "阿伊努", "Japan": "日本", "Taiwan": "台湾", "Japanese": "日语", "Hachijo": "八丈", "Min": "闽", "Yue": "粤", "Wu": "吴", "Hakka": "客家", "Xiang": "湘", "Gan": "赣",
    "Jin": "晋", "Hui": "徽", "Mandarin": "官话", "Pinghua": "平话", "Coastal Min": "沿海闽", "Pu-Xian": "莆仙",
    "Hokkien": "闽南", "Teochew": "潮汕", "Hainanese": "海南", "Leizhou": "雷州", "Zhuang": "壮", "Bouyei": "布依",
    "Dong": "侗", "Sui": "水", "Yao": "瑶", "Mien": "勉", "She": "畲", "Hmong": "苗", "Tujia": "土家", "Bai": "白",
    "Yi": "彝", "Nuosu": "诺苏", "Hani": "哈尼", "Lahu": "拉祜", "Lisu": "傈僳", "Naxi": "纳西", "Jingpho": "景颇",
    "Qiang": "羌", "Pumi": "普米", "Monpa": "门巴", "Lhoba": "珞巴", "Sherpa": "夏尔巴", "Newar": "尼瓦尔", "Magar": "马嘉尔",
    "Gurung": "古隆", "Rai": "拉伊", "Limbu": "林布", "Lepcha": "雷布查", "Dzongkha": "宗卡", "Balti": "巴尔蒂",
    "Ladakhi": "拉达克", "Kham": "康", "Amdo": "安多", "Burmic": "缅", "Arakanese": "阿拉干", "Kachin": "克钦",
    "Wa": "佤", "Palaung": "德昂", "Khmu": "克木", "Khmer": "高棉", "Khmeric": "高棉", "Mon": "孟", "Monic": "孟",
    "Vietic": "越", "Muong": "芒", "Munda": "蒙达", "Nicobarese": "尼科巴", "Katuic": "卡都",
    "Hawaiian": "夏威夷", "Maori": "毛利", "Tahitic": "塔希提", "Samoic": "萨摩亚", "Tongic": "汤加", "Marquesic": "马克萨斯",
    "Fijic": "斐济", "Chamorro": "查莫罗", "Palauan": "帕劳", "Tagalog": "他加禄", "Philippine": "菲律宾", "Visayan": "米沙鄢",
    "Javanese": "爪哇", "Sundanese": "巽他", "Balinese": "巴厘", "Madurese": "马都拉", "Bugis": "布吉", "Makassar": "望加锡",
    "Acehnese": "亚齐", "Minangkabau": "米南加保", "Malagasy": "马达加斯加", "Atayalic": "泰雅", "Paiwanic": "排湾",
    "Rukai": "鲁凯", "Tsouic": "邹", "Bunun": "布农", "Puyuma": "卑南", "Amis": "阿美", "Yami": "雅美",
}

# country adjectives used in sign-language group names
SIGN_PLACES = {
    "French": "法国", "German": "德国", "Swedish": "瑞典", "Danish": "丹麦", "Spanish": "西班牙", "Arab": "阿拉伯",
    "Japanese": "日本", "Chinese": "中国", "American": "美国", "British": "英国", "Italian": "意大利", "Russian": "俄罗斯",
    "Polish": "波兰", "Austrian": "奥地利", "Swiss": "瑞士", "Irish": "爱尔兰", "Indo-Pakistani": "印巴", "Kenyan": "肯尼亚",
    "Mexican": "墨西哥", "Brazilian": "巴西", "Portuguese": "葡萄牙", "Korean": "韩国", "Dutch": "荷兰", "Belgian": "比利时",
    "Finnish": "芬兰", "Norwegian": "挪威", "Icelandic": "冰岛", "Czech": "捷克", "Hungarian": "匈牙利", "Turkish": "土耳其",
    "Thai": "泰国", "Vietnamese": "越南", "Indonesian": "印度尼西亚", "Malaysian": "马来西亚", "Philippine": "菲律宾",
    "Israeli": "以色列", "Persian": "波斯", "Greek": "希腊", "Australian": "澳大利亚", "Canadian": "加拿大", "Argentine": "阿根廷",
    "Chilean": "智利", "Colombian": "哥伦比亚", "Peruvian": "秘鲁", "Venezuelan": "委内瑞拉", "Cuban": "古巴", "Ugandan": "乌干达",
    "Ethiopian": "埃塞俄比亚", "Ghanaian": "加纳", "Nigerian": "尼日利亚", "South": "南", "North": "北", "New": "新", "Zealand": "西兰",
}

DIRECTIONS = {"北", "南", "东", "西", "中部", "北部", "南部", "东部", "西部", "东北", "西北", "东南", "西南", "核心", "本支"}
DROP = {"Subgroup", "subgroup", "Group", "group", "Language", "languages", "Languages", "of", "the"}
CJK = re.compile(r"[㐀-鿿]")


def _translate_words(name, table):
    for phrase, zh in PHRASES.items():
        name = name.replace(phrase, f"\u0001{zh}\u0002")
    parts = re.split(r"(\u0001[^\u0002]*\u0002|[\s\-–/,()]+)", name)
    out, known, unknown = [], 0, 0
    for p in parts:
        if not p:
            continue
        if p.startswith("\u0001"):
            out.append(p[1:-1]); known += 1
        elif re.fullmatch(r"[\s\-–/,()]+", p):
            out.append("-" if "-" in p or "–" in p else (" " if p.strip() == "" else p.strip()))
        elif p in DROP:
            continue
        elif p == "and":
            out.append("与")
        elif p in table:
            out.append(table[p]); known += 1
        else:
            out.append(p); unknown += 1
    # "Kabarasi-Tachoni-Nyala East": a trailing direction reads first in Chinese
    if len(out) > 2 and out[-1] in DIRECTIONS and out[-2] == " ":
        out = [out[-1]] + out[:-2]
    s = "".join(out)
    # spaces only survive between two Latin words
    s = re.sub(r"(?<=[㐀-鿿]) | (?=[㐀-鿿])", "", s).strip(" -")
    return s, known, unknown


def zh_group_name(name, depth):
    """depth 0 = top-level family"""
    if name == "L1 Sign Language":
        return "聋人手语"
    if "Sign" in name:
        table = {**TOKENS, **SIGN_PLACES}
        s, known, _ = _translate_words(name.replace("Sign", ""), table)
        return f"{s}手语群" if known else None
    if name.startswith("Unclassified "):
        s, known, _ = _translate_words(name[len("Unclassified "):], TOKENS)
        return f"未分类{s}语言" if known else None
    if re.search(r"\b[Pp]idgin\b|\bCreole\b", name):
        s, known, _ = _translate_words(re.sub(r"\b(based|[Pp]idgin|Creole)\b", "", name), TOKENS)
        kind = "皮钦语" if re.search(r"[Pp]idgin", name) else "克里奥尔语"
        return f"{s}{kind}" if known else None
    linkage = re.search(r"\blinkage\b", name)
    s, known, unknown = _translate_words(re.sub(r"\blinkage\b", "", name), TOKENS)
    suffix = "语链" if linkage else ("语系", "语族", "语支")[depth] if depth < 3 else "语群"
    # nothing translatable: keep the Latin name, but say what kind of unit it is
    return f"{s}{suffix}" if known else f"{s} {suffix}"


def zh_language_name(name):
    """Only when every part has a Chinese form — otherwise keep the Latin name."""
    if "Sign Language" in name:
        s, known, unknown = _translate_words(name.replace("Sign Language", ""), {**TOKENS, **SIGN_PLACES})
        return f"{s}手语" if known and not unknown else None
    s, known, unknown = _translate_words(name, TOKENS)
    if not known or unknown or not CJK.search(s):
        return None
    if s.endswith(("语", "皮钦", "克里奥尔")):
        return s if s.endswith("语") else f"{s}语"
    return f"{s}语"
