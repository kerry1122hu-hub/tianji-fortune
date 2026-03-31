/**
 * 明己 MingMe - 国际化（i18n）系统
 * 
 * 支持三种语言：
 * - zh-Hans: 简体中文（中国大陆、新加坡）
 * - zh-Hant: 繁体中文（台湾、香港、澳门、海外老一辈华人）
 * - en: 英文（ABC、对中国文化感兴趣的外国人）
 * 
 * 设计原则：
 * 1. 术语精准：八字术语的翻译必须专业（BaZi而非Eight Characters）
 * 2. 繁体不是简单转换：港台用语与大陆用语有差异
 * 3. 英文保留关键术语拼音：如 BaZi, Wu Xing, Shi Shen
 * 4. 运势解读要符合各语言的表达习惯
 */

// ==================== 基础术语 ====================

export const TIAN_GAN_I18N = {
  "zh-Hans": ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"],
  "zh-Hant": ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"],
  "en": ["Jiǎ", "Yǐ", "Bǐng", "Dīng", "Wù", "Jǐ", "Gēng", "Xīn", "Rén", "Guǐ"],
};

export const DI_ZHI_I18N = {
  "zh-Hans": ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"],
  "zh-Hant": ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"],
  "en": ["Zǐ", "Chǒu", "Yín", "Mǎo", "Chén", "Sì", "Wǔ", "Wèi", "Shēn", "Yǒu", "Xū", "Hài"],
};

export const WU_XING_I18N = {
  "zh-Hans": { "木": "木", "火": "火", "土": "土", "金": "金", "水": "水" },
  "zh-Hant": { "木": "木", "火": "火", "土": "土", "金": "金", "水": "水" },
  "en": { "木": "Wood", "火": "Fire", "土": "Earth", "金": "Metal", "水": "Water" },
};

export const SHENG_XIAO_I18N = {
  "zh-Hans": ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"],
  "zh-Hant": ["鼠", "牛", "虎", "兔", "龍", "蛇", "馬", "羊", "猴", "雞", "狗", "豬"],
  "en": ["Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake", "Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig"],
};

export const SHI_SHEN_I18N = {
  "zh-Hans": {
    "比肩": "比肩", "劫财": "劫财", "食神": "食神", "伤官": "伤官",
    "偏财": "偏财", "正财": "正财", "七杀": "七杀", "正官": "正官",
    "偏印": "偏印", "正印": "正印", "日主": "日主",
  },
  "zh-Hant": {
    "比肩": "比肩", "劫财": "劫財", "食神": "食神", "伤官": "傷官",
    "偏财": "偏財", "正财": "正財", "七杀": "七殺", "正官": "正官",
    "偏印": "偏印", "正印": "正印", "日主": "日主",
  },
  "en": {
    "比肩": "Companion", "劫财": "Rob Wealth", "食神": "Eating God", "伤官": "Hurting Officer",
    "偏财": "Indirect Wealth", "正财": "Direct Wealth", "七杀": "7 Killings", "正官": "Direct Officer",
    "偏印": "Indirect Resource", "正印": "Direct Resource", "日主": "Day Master",
  },
};

export const PILLAR_LABELS_I18N = {
  "zh-Hans": { year: "年柱", month: "月柱", day: "日柱", hour: "时柱" },
  "zh-Hant": { year: "年柱", month: "月柱", day: "日柱", hour: "時柱" },
  "en": { year: "Year", month: "Month", day: "Day", hour: "Hour" },
};

export const DIRECTION_I18N = {
  "zh-Hans": {
    "北方": "北方", "南方": "南方", "东方": "东方", "西方": "西方", "中央": "中央",
  },
  "zh-Hant": {
    "北方": "北方", "南方": "南方", "东方": "東方", "西方": "西方", "中央": "中央",
  },
  "en": {
    "北方": "North", "南方": "South", "东方": "East", "西方": "West", "中央": "Center",
  },
};

// ==================== UI 文案 ====================

export const UI_TEXTS = {
  "zh-Hans": {
    // App名称
    appName: "明己",
    appSubtitle: "认识自己 · 把握时机 · 成就自我",
    
    // 首页
    inputTitle: "请输入您的出生信息",
    birthYear: "出生年份",
    birthMonth: "出生月份",
    birthDay: "出生日期",
    birthHour: "出生时辰 (0-23时)",
    birthCity: "出生城市",
    selectCity: "选择城市",
    gender: "性别",
    male: "乾 · 男",
    female: "坤 · 女",
    calculate: "排盘解命",
    
    // 结果页
    resultTitle: "命盘总览",
    fourPillars: "四柱八字",
    wuxingAnalysis: "五行强弱",
    todayFortune: "今日运势",
    daYunTitle: "大运流年",
    actionGuide: "今日行动指南",
    
    // 运势相关
    fortuneScore: "运势指数",
    luckyDirection: "吉利方位",
    unluckyDirection: "不利方位",
    luckyColor: "幸运颜色",
    luckyNumber: "幸运数字",
    luckyTime: "今日吉时",
    businessAdvice: "商业决策建议",
    nobleHelp: "贵人方向",
    tianYiGuiRen: "天乙贵人",
    
    // 行动指南
    morning: "晨起",
    dressing: "着装",
    social: "社交",
    direction: "方位",
    timing: "时机",
    
    // 吉时等级
    shangJi: "上吉",
    zhongJi: "中吉",
    
    // 大运
    currentDaYun: "当前",
    liuNian: "流年",
    startAge: "起运",
    age: "岁",
    
    // 日主
    dayMaster: "日主",
    qianZao: "乾造",
    kunZao: "坤造",
    naYin: "纳音",
    
    // 五行状态
    wuxingLack: "缺",
    wuxingStrong: "旺",
    dayMasterStrong: "日主偏旺",
    dayMasterWeak: "日主偏弱",
    dayMasterBalanced: "日主中和",
    
    // 神煞
    wenChang: "文昌贵人",
    yiMa: "驿马",
    cangGan: "藏干",
    
    // 通用
    back: "返回",
    reCalculate: "重新排盘",
    disclaimer: "能量分析仅供参考，助您更好地认识自己",
    motto: "明己者明，知时者智，行动者胜",
    settings: "设置",
    language: "语言",
    about: "关于",
    share: "分享",
    
    // VIP
    unlockAI: "解锁AI深度能量解读",
    vipBadge: "VIP",
    freeTrialDays: "免费体验3天VIP",
    monthlyVip: "月度VIP",
    yearlyVip: "年度VIP",
    singleReading: "单次AI解读",
    
    // AI解读
    aiReading: "AI能量解读",
    aiGenerating: "正在为您分析个人能量模式...",
    aiCareer: "事业能量",
    aiWealth: "财富节奏",
    aiRelationship: "人际磁场",
    aiSummary: "行动指南",
    
    // 真太阳时
    trueSolarTime: "真太阳时校正",
    trueSolarTimeDesc: "已根据出生地经度校正",
    correctionMinutes: "修正",
    minutes: "分钟",
    
    // 运势主题
    themes: {
      greatLuck: "大吉 · 贵人相助",
      goodLuck: "中吉 · 同气相求",
      smallLuck: "小吉 · 才华展现",
      wealthLuck: "中吉 · 财运可期",
      cautious: "平运 · 守成为上",
    },
  },

  "zh-Hant": {
    appName: "明己",
    appSubtitle: "認識自己 · 把握時機 · 成就自我",
    
    inputTitle: "請輸入您的出生資訊",
    birthYear: "出生年份",
    birthMonth: "出生月份",
    birthDay: "出生日期",
    birthHour: "出生時辰 (0-23時)",
    birthCity: "出生城市",
    selectCity: "選擇城市",
    gender: "性別",
    male: "乾 · 男",
    female: "坤 · 女",
    calculate: "排盤解命",
    
    resultTitle: "命盤總覽",
    fourPillars: "四柱八字",
    wuxingAnalysis: "五行強弱",
    todayFortune: "今日運勢",
    daYunTitle: "大運流年",
    actionGuide: "今日行動指南",
    
    fortuneScore: "運勢指數",
    luckyDirection: "吉利方位",
    unluckyDirection: "不利方位",
    luckyColor: "幸運顏色",
    luckyNumber: "幸運數字",
    luckyTime: "今日吉時",
    businessAdvice: "商業決策建議",
    nobleHelp: "貴人方向",
    tianYiGuiRen: "天乙貴人",
    
    morning: "晨起",
    dressing: "著裝",
    social: "社交",
    direction: "方位",
    timing: "時機",
    
    shangJi: "上吉",
    zhongJi: "中吉",
    
    currentDaYun: "當前",
    liuNian: "流年",
    startAge: "起運",
    age: "歲",
    
    dayMaster: "日主",
    qianZao: "乾造",
    kunZao: "坤造",
    naYin: "納音",
    
    wuxingLack: "缺",
    wuxingStrong: "旺",
    dayMasterStrong: "日主偏旺",
    dayMasterWeak: "日主偏弱",
    dayMasterBalanced: "日主中和",
    
    wenChang: "文昌貴人",
    yiMa: "驛馬",
    cangGan: "藏干",
    
    back: "返回",
    reCalculate: "重新排盤",
    disclaimer: "能量分析僅供參考，助您更好地認識自己",
    motto: "明己者明，知時者智，行動者勝",
    settings: "設定",
    language: "語言",
    about: "關於",
    share: "分享",
    
    unlockAI: "解鎖AI深度能量解讀",
    vipBadge: "VIP",
    freeTrialDays: "免費體驗3天VIP",
    monthlyVip: "月度VIP",
    yearlyVip: "年度VIP",
    singleReading: "單次AI解讀",
    
    aiReading: "AI能量解讀",
    aiGenerating: "正在為您分析個人能量模式...",
    aiCareer: "事業能量",
    aiWealth: "財富節奏",
    aiRelationship: "人際磁場",
    aiSummary: "行動指南",
    
    trueSolarTime: "真太陽時校正",
    trueSolarTimeDesc: "已根據出生地經度校正",
    correctionMinutes: "修正",
    minutes: "分鐘",
    
    themes: {
      greatLuck: "大吉 · 貴人相助",
      goodLuck: "中吉 · 同氣相求",
      smallLuck: "小吉 · 才華展現",
      wealthLuck: "中吉 · 財運可期",
      cautious: "平運 · 守成為上",
    },
  },

  "en": {
    appName: "MingMe",
    appSubtitle: "Know Yourself · Seize the Moment · Unlock Your Potential",
    
    inputTitle: "Enter Your Birth Details",
    birthYear: "Birth Year",
    birthMonth: "Birth Month",
    birthDay: "Birth Day",
    birthHour: "Birth Hour (0-23)",
    birthCity: "Birth City",
    selectCity: "Select City",
    gender: "Gender",
    male: "Male",
    female: "Female",
    calculate: "Read My Chart",
    
    resultTitle: "Chart Overview",
    fourPillars: "Four Pillars (BaZi)",
    wuxingAnalysis: "Five Elements (Wu Xing)",
    todayFortune: "Today's Fortune",
    daYunTitle: "Luck Cycles",
    actionGuide: "Today's Action Guide",
    
    fortuneScore: "Fortune Index",
    luckyDirection: "Lucky Direction",
    unluckyDirection: "Avoid Direction",
    luckyColor: "Lucky Color",
    luckyNumber: "Lucky Number",
    luckyTime: "Auspicious Hours",
    businessAdvice: "Business Advice",
    nobleHelp: "Helpful People",
    tianYiGuiRen: "Noble Helper",
    
    morning: "Morning",
    dressing: "Outfit",
    social: "Social",
    direction: "Direction",
    timing: "Timing",
    
    shangJi: "Excellent",
    zhongJi: "Good",
    
    currentDaYun: "Current",
    liuNian: "Annual",
    startAge: "Start Age",
    age: "yrs",
    
    dayMaster: "Day Master",
    qianZao: "Male Chart",
    kunZao: "Female Chart",
    naYin: "Sound Element",
    
    wuxingLack: "Missing",
    wuxingStrong: "Strong",
    dayMasterStrong: "Day Master is Strong",
    dayMasterWeak: "Day Master is Weak",
    dayMasterBalanced: "Day Master is Balanced",
    
    wenChang: "Academic Star",
    yiMa: "Travel Star",
    cangGan: "Hidden Stems",
    
    back: "Back",
    reCalculate: "New Reading",
    disclaimer: "Energy insights for self-knowledge and personal growth",
    motto: "Know yourself, seize the moment, take action",
    settings: "Settings",
    language: "Language",
    about: "About",
    share: "Share",
    
    unlockAI: "Unlock AI Deep Energy Reading",
    vipBadge: "VIP",
    freeTrialDays: "Free 3-Day VIP Trial",
    monthlyVip: "Monthly VIP",
    yearlyVip: "Yearly VIP",
    singleReading: "Single AI Reading",
    
    aiReading: "AI Energy Reading",
    aiGenerating: "Analyzing your personal energy pattern...",
    aiCareer: "Career Energy",
    aiWealth: "Wealth Rhythm",
    aiRelationship: "Social Magnetism",
    aiSummary: "Action Guide",
    
    trueSolarTime: "True Solar Time",
    trueSolarTimeDesc: "Adjusted for birth location",
    correctionMinutes: "Correction",
    minutes: "min",
    
    themes: {
      greatLuck: "Excellent · Noble Support",
      goodLuck: "Good · Strength in Unity",
      smallLuck: "Fair · Creative Flow",
      wealthLuck: "Good · Wealth Opportunity",
      cautious: "Neutral · Steady & Prepare",
    },
  },
};

// ==================== 运势建议多语言 ====================

export const FORTUNE_ADVICE_I18N = {
  "zh-Hans": {
    greatLuck: {
      advice: "今日得印星庇佑，气场提升，如鱼得水。宜主动出击，拜访重要客户、签署合同、推进关键项目。",
      business: "适合谈判签约、融资合作、产品发布、向上汇报",
      people: "年长者、领导、学术界人士是今日贵人",
      caution: "勿因顺遂而疏忽细节，重要文件再核对一遍",
    },
    goodLuck: {
      advice: "今日比肩助力，团队协作事半功倍。适合联合同行、会见合伙人、组织团队活动。",
      business: "适合团队会议、同行交流、合资洽谈、头脑风暴",
      people: "同辈朋友、同行业者、平级同事为助力",
      caution: "注意合作中的利益分配，避免争功",
    },
    smallLuck: {
      advice: "今日食伤吐秀，创意灵感充沛。适合策划方案、文案创作、产品设计。表达能力增强。",
      business: "适合创意策划、营销推广、品牌包装、内容创作",
      people: "下属、学生、年轻人能给你启发和灵感",
      caution: "创意虽多但需聚焦，避免贪多嚼不烂",
    },
    wealthLuck: {
      advice: "今日财星透出，利于求财。需主动出击而非等待，积极推动成交、催款、销售。",
      business: "适合收款催款、商品销售、投资布局、商业谈判",
      people: "客户、合作伙伴是今日财源方向",
      caution: "有财可求但忌贪，见好就收更稳妥",
    },
    cautious: {
      advice: "今日官杀当头，外部压力较大。宜低调行事、完善内功、做好准备工作，不宜冒进。",
      business: "适合复盘总结、制度完善、风控审查、学习充电",
      people: "上级领导需格外尊重，避免正面冲突",
      caution: "今日不宜做重大决策，可推迟到明后日",
    },
  },

  "zh-Hant": {
    greatLuck: {
      advice: "今日得印星庇佑，氣場提升，如魚得水。宜主動出擊，拜訪重要客戶、簽署合同、推進關鍵項目。",
      business: "適合談判簽約、融資合作、產品發佈、向上匯報",
      people: "年長者、領導、學術界人士是今日貴人",
      caution: "勿因順遂而疏忽細節，重要文件再核對一遍",
    },
    goodLuck: {
      advice: "今日比肩助力，團隊協作事半功倍。適合聯合同行、會見合夥人、組織團隊活動。",
      business: "適合團隊會議、同行交流、合資洽談、腦力激盪",
      people: "同輩朋友、同行業者、平級同事為助力",
      caution: "注意合作中的利益分配，避免爭功",
    },
    smallLuck: {
      advice: "今日食傷吐秀，創意靈感充沛。適合策劃方案、文案創作、產品設計。表達能力增強。",
      business: "適合創意策劃、行銷推廣、品牌包裝、內容創作",
      people: "下屬、學生、年輕人能給你啟發和靈感",
      caution: "創意雖多但需聚焦，避免貪多嚼不爛",
    },
    wealthLuck: {
      advice: "今日財星透出，利於求財。需主動出擊而非等待，積極推動成交、催款、銷售。",
      business: "適合收款催款、商品銷售、投資佈局、商業談判",
      people: "客戶、合作夥伴是今日財源方向",
      caution: "有財可求但忌貪，見好就收更穩妥",
    },
    cautious: {
      advice: "今日官殺當頭，外部壓力較大。宜低調行事、完善內功、做好準備工作，不宜冒進。",
      business: "適合復盤總結、制度完善、風控審查、學習充電",
      people: "上級領導需格外尊重，避免正面衝突",
      caution: "今日不宜做重大決策，可推遲到明後日",
    },
  },

  "en": {
    greatLuck: {
      advice: "Today the Resource star shines upon you — your charisma and influence are amplified. Take initiative: visit key clients, sign contracts, and push critical projects forward.",
      business: "Great for negotiations, fundraising, product launches, and presenting to leadership",
      people: "Elders, mentors, and senior professionals are your allies today",
      caution: "Don't let confidence lead to carelessness — double-check important documents",
    },
    goodLuck: {
      advice: "Today the Companion star brings strength in numbers. Teamwork delivers outstanding results. Perfect for partnerships, joint ventures, and collaborative efforts.",
      business: "Great for team meetings, industry networking, joint ventures, and brainstorming",
      people: "Peers, colleagues, and industry connections will be valuable allies",
      caution: "Be clear about roles and credit-sharing in collaborations",
    },
    smallLuck: {
      advice: "Today the Output star sparks your creativity. Ideas flow naturally, and your communication skills are heightened. Ideal for strategy, content creation, and design work.",
      business: "Great for creative planning, marketing campaigns, branding, and content creation",
      people: "Younger colleagues, mentees, and creative types will inspire you",
      caution: "Many ideas may arise — stay focused on priorities rather than spreading thin",
    },
    wealthLuck: {
      advice: "Today the Wealth star emerges — financial opportunities await. Take an active approach: close deals, follow up on payments, and push for conversions.",
      business: "Great for sales, collections, investment decisions, and business negotiations",
      people: "Clients and business partners are your key wealth connections today",
      caution: "Wealth is available but avoid greed — secure gains before pushing further",
    },
    cautious: {
      advice: "Today the Authority star brings external pressure. Stay low-key, refine your strategies, and prepare rather than launch. Not the best day for bold moves.",
      business: "Great for reviewing, optimizing systems, risk assessment, and learning",
      people: "Show extra respect to supervisors and authority figures — avoid confrontation",
      caution: "Postpone major decisions to tomorrow if possible",
    },
  },
};

// ==================== 颜色多语言 ====================

export const COLOR_I18N = {
  "zh-Hans": {
    "黑色": "黑色", "绿色": "绿色", "红色": "红色",
    "黄色": "黄色", "白色": "白色",
  },
  "zh-Hant": {
    "黑色": "黑色", "绿色": "綠色", "红色": "紅色",
    "黄色": "黃色", "白色": "白色",
  },
  "en": {
    "黑色": "Black", "绿色": "Green", "红色": "Red",
    "黄色": "Yellow", "白色": "White",
  },
};

// ==================== 行动指南模板 ====================

export const ACTION_TEMPLATES_I18N = {
  "zh-Hans": {
    morningTemplate: (dir) => `面向${dir}方静坐片刻，提振正气`,
    dressingTemplate: (color) => `宜穿${color}系衣物，增强气场`,
    directionTemplate: (dir) => `办公座位或出行朝向${dir}为佳`,
    timingTemplate: (shi, time) => `重要事务安排在${shi}时(${time})进行`,
  },
  "zh-Hant": {
    morningTemplate: (dir) => `面向${dir}方靜坐片刻，提振正氣`,
    dressingTemplate: (color) => `宜穿${color}系衣物，增強氣場`,
    directionTemplate: (dir) => `辦公座位或出行朝向${dir}為佳`,
    timingTemplate: (shi, time) => `重要事務安排在${shi}時(${time})進行`,
  },
  "en": {
    morningTemplate: (dir) => `Face ${dir} for a moment of morning meditation to boost your energy`,
    dressingTemplate: (color) => `Wear ${color} tones to strengthen your personal aura`,
    directionTemplate: (dir) => `Position your desk or travel toward ${dir} for best results`,
    timingTemplate: (shi, time) => `Schedule important tasks during ${shi} period (${time})`,
  },
};

// ==================== 语言管理器 ====================

const SUPPORTED_LOCALES = ["zh-Hans", "zh-Hant", "en"];
const DEFAULT_LOCALE = "zh-Hans";

let currentLocale = DEFAULT_LOCALE;

/**
 * 设置当前语言
 */
export function setLocale(locale) {
  if (SUPPORTED_LOCALES.includes(locale)) {
    currentLocale = locale;
  }
}

/**
 * 获取当前语言
 */
export function getLocale() {
  return currentLocale;
}

/**
 * 获取所有支持的语言
 */
export function getSupportedLocales() {
  return [
    { code: "zh-Hans", name: "简体中文", nativeName: "简体中文" },
    { code: "zh-Hant", name: "繁體中文", nativeName: "繁體中文" },
    { code: "en", name: "English", nativeName: "English" },
  ];
}

/**
 * 获取翻译文本
 * @param key 文本键名（支持点号路径，如 "themes.greatLuck"）
 */
export function t(key) {
  const texts = UI_TEXTS[currentLocale] || UI_TEXTS[DEFAULT_LOCALE];
  const parts = key.split(".");
  let result = texts;
  for (const part of parts) {
    if (result && typeof result === "object" && part in result) {
      result = result[part];
    } else {
      // fallback to simplified Chinese
      result = UI_TEXTS[DEFAULT_LOCALE];
      for (const p of parts) {
        if (result && typeof result === "object" && p in result) {
          result = result[p];
        } else {
          return key; // 返回key本身作为fallback
        }
      }
      return result;
    }
  }
  return result;
}

/**
 * 翻译天干
 */
export function tGan(gan) {
  const idx = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"].indexOf(gan);
  if (idx === -1) return gan;
  return (TIAN_GAN_I18N[currentLocale] || TIAN_GAN_I18N[DEFAULT_LOCALE])[idx];
}

/**
 * 翻译地支
 */
export function tZhi(zhi) {
  const idx = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"].indexOf(zhi);
  if (idx === -1) return zhi;
  return (DI_ZHI_I18N[currentLocale] || DI_ZHI_I18N[DEFAULT_LOCALE])[idx];
}

/**
 * 翻译五行
 */
export function tWuXing(wx) {
  return (WU_XING_I18N[currentLocale] || WU_XING_I18N[DEFAULT_LOCALE])[wx] || wx;
}

/**
 * 翻译生肖
 */
export function tShengXiao(idx) {
  return (SHENG_XIAO_I18N[currentLocale] || SHENG_XIAO_I18N[DEFAULT_LOCALE])[idx] || "";
}

/**
 * 翻译十神
 */
export function tShiShen(ss) {
  return (SHI_SHEN_I18N[currentLocale] || SHI_SHEN_I18N[DEFAULT_LOCALE])[ss] || ss;
}

/**
 * 翻译颜色
 */
export function tColor(color) {
  return (COLOR_I18N[currentLocale] || COLOR_I18N[DEFAULT_LOCALE])[color] || color;
}

/**
 * 翻译方位
 */
export function tDirection(dir) {
  return (DIRECTION_I18N[currentLocale] || DIRECTION_I18N[DEFAULT_LOCALE])[dir] || dir;
}

/**
 * 获取运势建议
 */
export function getFortuneAdvice(type) {
  return (FORTUNE_ADVICE_I18N[currentLocale] || FORTUNE_ADVICE_I18N[DEFAULT_LOCALE])[type] || {};
}

/**
 * 获取行动指南模板
 */
export function getActionTemplates() {
  return ACTION_TEMPLATES_I18N[currentLocale] || ACTION_TEMPLATES_I18N[DEFAULT_LOCALE];
}

/**
 * 根据设备语言自动检测最佳语言
 */
export function detectLocale(deviceLocale) {
  if (!deviceLocale) return DEFAULT_LOCALE;
  
  const lower = deviceLocale.toLowerCase();
  
  // 精确匹配
  if (lower.includes("zh-hant") || lower.includes("zh_hant") || lower.includes("zh-tw") || lower.includes("zh-hk") || lower.includes("zh_tw") || lower.includes("zh_hk")) {
    return "zh-Hant";
  }
  if (lower.includes("zh-hans") || lower.includes("zh_hans") || lower.includes("zh-cn") || lower.includes("zh_cn") || lower.includes("zh-sg")) {
    return "zh-Hans";
  }
  if (lower.startsWith("zh")) {
    return "zh-Hans"; // 默认简体
  }
  if (lower.startsWith("en")) {
    return "en";
  }
  
  return DEFAULT_LOCALE;
}
