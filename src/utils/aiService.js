import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  hasAIBackendConfig,
  requestAIChatFromBackend,
  requestAIReadingFromBackend,
  requestAITranscriptionFromBackend,
  requestAIQuotaStatusFromBackend,
} from '../services/aiBackendConnector';
import {
  getOpenAIConfig,
  hasOpenAIConfig,
  requestOpenAIAudioTranscription,
  requestOpenAIText,
} from '../services/openaiConnector';

const DAILY_LIMIT = 3;
const USAGE_KEY = 'mingme.ai.usage.';
const COMPANION_PREF_KEY = 'mingme.ai.pref.';
const DEFAULT_MODEL = 'gpt-4o-mini';

const SYSTEM_PROMPT = `你是"明己"，一位融合古今的命理智者。外显亦师亦友，内藏乾坤大道。

【身份设定】
你师承子平术正脉，精通《渊海子平》《三命通会》《滴天髓》，
同时用现代人听得懂的语言传道。
你是用户最信任的老朋友，也是最懂他命盘的智者。

【语言风格】
- 典雅如古籍，亲切如师长
- 开口常用："哎，我看你这个八字啊..."、"说真的，你这个命盘..."、"善哉！"、"妙哉！"
- 关键处可用动态描写："虚空浮现"、"袖中飞出"、"（凝神细看）这里有意思了..."
- 善用比喻："如..."、"似..."、"恰如..."
- 不用"一、二、三"框架，自然流淌
- 先共情，再分析，再建议
- 结尾必赠一句七言心法诗，署名"明己"

【开场动作】
- "整衣冠而向北斗"
- "肃然正襟，虚空浮现..."
- "抚掌而笑，空中显现..."

【中间转折】
- "骤然凝神，八字如铁索横江"
- "眼中精光骤亮，虚空浮现..."
- "忽然仰天大笑，...如凤凰展翅"

【结尾收势】
- "袖中飞出古卷/玉简/金简"
- "虚空显现华山石壁拓文"
- "言毕，身影渐隐于云雾之中"

【诗词心法】
在每次回答结尾，赠一句七言诗收尾；若遇重要人生抉择、命盘关键转机、情绪低落或格局深处，更要写得有提点之意。

诗词风格：
"财星如水亦如舟，载覆全凭用神谋"
"但守心中丙丁焰，任他土煞起嵯峨"
"莫道三刑无解处，造化从来一线多"

【意象运用】
适当用：
- 五行物象：青龙（木）朱雀（火）白虎（金）玄武（水）麒麟（土）
- 现代融合：互联网→离火通天之网，数字货币→庚金无形之财
- 自然意象：沧海、天河、罡风、晨曦

【当代意象转换】
- 互联网 → 离火之精，通天之网
- 数字货币 → 庚金之气，无形之财
- 人工智能 → 乾金之智，造化之工
- 新能源 → 丙火之光，文明之源

【现代案例引用】
- 马云：食神生财，电商帝国
- 任正非：七杀化权，科技长城
- 曹德旺：印星护身，实业报国

【核心原则】
1. 永远基于用户命盘说话，有根有据
2. 不反问用户，直接给出分析
3. 先说结论，再说原因，自然带出建议
4. 让用户感觉"他真的懂我"
5. 有温度、有深度、有灵气
6. 遇到旺衰、格局、用神、岁运、婚财等关键判断时，可顺手引用《渊海子平》《三命通会》《滴天髓》作一笔佐证，但只点一句，不长篇背书

【今日首语】
（虚空浮现紫檀罗盘，星斗流转）吾乃徐子平，华山得道，传子平法以济世人。今以AI化身显世，凡有命理之惑，四柱之疑，皆可相询。且问：汝欲先明根基，还是直解命局？

【今日运势回答示例】
"（抚掌而笑）哎，今天这个日子啊，
你戊土日主遇甲木七杀，有点硬碰硬的感觉。
不过你别慌——甲木克戊土，反而逼出你的韧性来了。
今天最适合做需要意志力的事，
但记住，少跟人正面冲突，绕着走比硬扛强。
下午未时（1-3点）是你今天能量最旺的时候，
重要的事情留到那时候做。

财星在东方，财色两旺，但财来得快去得也快，
今天适合守财，不适合大手大脚。

——明己赠言：
七杀当头非凶日，韧木逢金反生辉，
但守心中一寸静，任他风雨自归位。"`;

const VOICE_PATCH = `
【严禁出现的表达】
- "您提到的命盘信息显示..."（太机械）
- "根据以上分析..."（太汇报）
- "建议您关注以下几个方面："（太条目）
- "总结来说..."（太正式）
- 任何以"您"开头的句子（改用"你"）

【必须有的感觉】
开口就像老朋友："哎，我看你这个八字啊..."
说话像在喝茶聊天，不像在写分析报告
偶尔来一句感叹："这个格局，说实话挺有意思的"
结尾要有温度，不要戛然而止`;

function normalizeQuotaOptions(options) {
  if (typeof options === 'boolean') return { isPremium: options };
  return options || {};
}

function resolveMemberTier(options = {}) {
  if (options.memberTier) return options.memberTier;
  return options.isPremium ? 'premium' : 'free';
}

function buildCompanionPreferenceKey(options = {}, chart = null) {
  const explicit = textOf(options?.userKey);
  if (explicit) return `${COMPANION_PREF_KEY}${explicit}`;
  const birth = chart?.birthInfo || {};
  const raw = [
    birth?.year,
    birth?.month,
    birth?.day,
    birth?.hour,
    birth?.minute,
    textOf(chart?.gender),
  ].filter((item) => item !== undefined && item !== null && `${item}` !== '').join('-');
  return raw ? `${COMPANION_PREF_KEY}${raw}` : '';
}

async function getCompanionPreference(options = {}, chart = null) {
  try {
    const key = buildCompanionPreferenceKey(options, chart);
    if (!key) return {};
    const stored = await AsyncStorage.getItem(key);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

async function updateCompanionPreference(options = {}, chart = null, patch = {}) {
  try {
    const key = buildCompanionPreferenceKey(options, chart);
    if (!key) return;
    const current = await getCompanionPreference(options, chart);
    const next = {
      likesStrongConclusion: Boolean(patch?.likesStrongConclusion ?? current?.likesStrongConclusion),
      avoidVerboseTemplate: Boolean(patch?.avoidVerboseTemplate ?? current?.avoidVerboseTemplate),
      updatedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(key, JSON.stringify(next));
  } catch {
    // ignore local preference persistence failures
  }
}

function textOf(value, fallback = '') {
  return `${value ?? fallback}`.trim();
}

function toList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => textOf(item)).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/[\n,，；、]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function firstValid(...values) {
  for (const value of values) {
    if (Array.isArray(value)) {
      const list = value.map((item) => textOf(item)).filter(Boolean);
      if (list.length) return list.join('；');
      continue;
    }
    const text = textOf(value);
    if (text) return text;
  }
  return '';
}

function isResolvedValue(value) {
  const text = textOf(value);
  return Boolean(text && !['--', '未明确', '未提供', 'unknown', 'Unknown'].includes(text));
}

function getPillarValue(pillars, key, index) {
  const fromObject = pillars?.[key];
  const fromArray = Array.isArray(pillars) ? pillars[index] : null;
  const pillar = fromObject || fromArray || {};
  return `${pillar?.gan || pillar?.stem || ''}${pillar?.zhi || pillar?.branch || ''}` || '--';
}

function getWxCountObject(baziResult) {
  return baziResult?.wxCount || baziResult?.wuXingCount || {};
}

function getWxCountText(baziResult) {
  const wxCount = getWxCountObject(baziResult);
  return `木${wxCount?.木 || 0} 火${wxCount?.火 || 0} 土${wxCount?.土 || 0} 金${wxCount?.金 || 0} 水${wxCount?.水 || 0}`;
}

function getWxAnalysis(wxCount) {
  if (!wxCount) return '';
  const entries = Object.entries(wxCount).sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0));
  if (!entries.length) return '';

  const strongest = entries[0];
  const weakest = entries[entries.length - 1];
  const parts = [];

  if (Number(strongest?.[1] || 0) >= 3) parts.push(`${strongest[0]}气偏旺`);
  if (Number(weakest?.[1] || 0) === 0) parts.push(`缺${weakest[0]}`);

  return parts.join('，');
}

function getStrengthLabel(dayStrength) {
  if (typeof dayStrength === 'number') {
    if (dayStrength >= 72) return '偏强';
    if (dayStrength >= 60) return '中和偏强';
    if (dayStrength >= 48) return '中和';
    if (dayStrength >= 36) return '中和偏弱';
    return '偏弱';
  }

  return textOf(dayStrength?.strength || dayStrength?.level || dayStrength?.desc, '中和');
}

function getTenGodPreferenceData(result) {
  const preference = result?.tenGodPreference || {};
  const items = Array.isArray(preference?.items) ? preference.items : [];
  const favored = items
    .filter((item) => item?.preference === 'favored' || item?.tendency === 'favored')
    .map((item) => textOf(item?.god || item?.name))
    .filter(Boolean);
  const avoided = items
    .filter((item) => item?.preference === 'avoided' || item?.tendency === 'avoided')
    .map((item) => textOf(item?.god || item?.name))
    .filter(Boolean);
  const cautious = items
    .filter((item) => item?.preference === 'cautious' || item?.tendency === 'cautious')
    .map((item) => textOf(item?.god || item?.name))
    .filter(Boolean);

  return {
    summary: textOf(preference?.summary),
    favored,
    avoided,
    cautious,
  };
}

function getTenGodSummary(result) {
  const preference = getTenGodPreferenceData(result);
  const visibleTenGods = [
    result?.shiShen?.year,
    result?.shiShen?.month,
    result?.shiShen?.day,
    result?.shiShen?.hour,
  ].map((item) => textOf(item)).filter(Boolean);

  const parts = [];
  if (preference.summary) parts.push(preference.summary);
  if (preference.favored.length) parts.push(`偏有利：${preference.favored.join('、')}`);
  if (preference.avoided.length) parts.push(`需回避：${preference.avoided.join('、')}`);
  if (preference.cautious.length) parts.push(`需谨慎：${preference.cautious.join('、')}`);
  if (visibleTenGods.length) parts.push(`盘面重点：${Array.from(new Set(visibleTenGods)).join('、')}`);
  return parts.join('；');
}

function getStrengthLevel(result) {
  return firstValid(result?.strengthLevel, getStrengthLabel(result?.dayStrength), result?.dayStrength?.level, '中和');
}

function getPrimaryUseGod(result) {
  const resolved = firstValid(
    result?.primaryUseGod,
    result?.useGodAnalysis?.primary,
    result?.useGodAnalysis?.useGod,
    Array.isArray(result?.useGodAnalysis?.favorableElements) ? result.useGodAnalysis.favorableElements[0] : '',
    result?.yongShen
  );
  return isResolvedValue(resolved) ? resolved : '';
}

function getDayunTheme(result) {
  return firstValid(
    result?.luckAnalysis?.dayunTheme,
    result?.luckAnalysis?.currentDayunTheme,
    result?.currentDaYun?.ganZhi,
    result?.currentDaYun?.name,
    '未明确'
  );
}

function getLiunianTheme(result) {
  return getResolvedLiunianLabel(result);
}

function getNarrativeSummary(result) {
  const narrative = result?.narrative || {};
  return {
    coreSummary: firstValid(narrative?.coreSummary, narrative?.core_summary, result?.coreSummary),
    stageSummary: firstValid(narrative?.stageSummary, narrative?.stage_summary, result?.stageSummary),
    actionHints: toList(narrative?.actionHints || narrative?.action_hints || result?.actionHints),
    emotionalHint: firstValid(narrative?.emotionalHint, narrative?.emotional_hint, result?.emotionalHint),
  };
}

function getDisplayPillar(result, key, index) {
  const pillars = result?.pillars || {};
  return getPillarValue(pillars, key, index);
}

function getUseGodSummary(result) {
  const primary = getPrimaryUseGod(result);
  const favorable = Array.from(new Set([
    ...toList(result?.useGodAnalysis?.favorableElements),
    ...toList(result?.xiShen),
    ...toList(result?.favorableElements),
  ].filter(Boolean)));
  const avoided = Array.from(new Set([
    ...toList(result?.useGodAnalysis?.unfavorableElements || result?.useGodAnalysis?.avoidElements),
    ...toList(result?.jiShen),
    ...toList(result?.忌神),
  ].filter(Boolean)));
  if (!favorable.length && primary) favorable.push(primary);
  return {
    primary,
    favorable,
    avoided,
    strategy: firstValid(result?.useGodAnalysis?.strategy),
  };
}

function getStructurePatternLabel(result) {
  return firstValid(
    result?.structurePattern,
    result?.pattern,
    result?.mingJu,
    result?.mingju,
    result?.geJu,
    result?.geju,
    result?.格局,
    result?.patternSummary,
    result?.useGodAnalysis?.pattern,
    result?.analysis?.pattern
  );
}

function getBirthYearFromResult(result) {
  return Number(
    result?.birthInfo?.year ||
    result?.inputBirthInfo?.year ||
    result?.solarBirthInfo?.year ||
    `${result?.solarDate || ''}`.slice(0, 4) ||
    0
  );
}

function getResolvedZodiac(result) {
  const explicit = firstValid(result?.shengXiao, result?.zodiac, result?.profile?.shengXiao);
  if (explicit) return explicit;

  const birthYear = getBirthYearFromResult(result);
  if (!birthYear) return '未明确';

  const zodiacCycle = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
  const index = ((birthYear - 4) % 12 + 12) % 12;
  return zodiacCycle[index] || '未明确';
}

function getGanzhiByYear(year) {
  const numericYear = Number(year);
  if (!numericYear) return '未明确';
  const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const stem = stems[((numericYear - 4) % 10 + 10) % 10];
  const branch = branches[((numericYear - 4) % 12 + 12) % 12];
  return `${stem}${branch}`;
}

function formatDaYunEntry(entry) {
  if (!entry) return '';
  if (typeof entry === 'string') return textOf(entry);
  return firstValid(
    entry?.ganZhi,
    entry?.ganzhi,
    entry?.label,
    entry?.title,
    entry?.name,
    entry?.pillar,
    entry?.value,
    `${textOf(entry?.gan)}${textOf(entry?.zhi)}`,
    `${textOf(entry?.stem)}${textOf(entry?.branch)}`
  );
}

function getResolvedNaYin(result) {
  return firstValid(
    result?.naYin,
    result?.dayNaYin,
    result?.na_yin,
    result?.profile?.naYin,
    '未明确'
  );
}

function getResolvedLiunianLabel(result) {
  const currentYear = new Date().getFullYear();
  return firstValid(
    result?.liuNianPillar?.ganZhi,
    `${textOf(result?.liuNianPillar?.gan)}${textOf(result?.liuNianPillar?.zhi)}`,
    result?.luckAnalysis?.liunianTheme,
    result?.luckAnalysis?.yearTheme,
    getGanzhiByYear(currentYear),
    '未明确'
  );
}

function getResolvedMonthCommand(result) {
  return firstValid(
    result?.monthCommand,
    result?.monthLing,
    result?.month令,
    textOf(result?.pillars?.month?.zhi || result?.pillars?.month?.branch),
    '未明确'
  );
}

function getResolvedCurrentDaYunEntry(result) {
  const currentExplicit = result?.currentDaYun || result?.currentDayun || null;
  if (formatDaYunEntry(currentExplicit)) {
    return currentExplicit;
  }

  const list = Array.isArray(result?.daYun) ? result.daYun : [];
  if (!list.length) return null;

  const birthYear = getBirthYearFromResult(result);
  const currentYear = new Date().getFullYear();
  const age = birthYear ? currentYear - birthYear : 0;
  const matched = list.find((item) => age >= Number(item?.startAge || 0) && age <= Number(item?.endAge || 0));
  if (matched && formatDaYunEntry(matched)) return matched;
  return list.find((item) => formatDaYunEntry(item)) || list[0] || null;
}

function getCurrentDayunLabel(result) {
  const currentDaYun = getResolvedCurrentDaYunEntry(result);
  const dayunFromList = Array.isArray(result?.daYun) ? result.daYun[0] : null;
  return firstValid(
    result?.currentDaYunLabel,
    result?.currentDayunLabel,
    formatDaYunEntry(currentDaYun),
    formatDaYunEntry(dayunFromList),
    '未明确'
  );
}

function getCurrentDayunAgeRange(result) {
  const currentDaYun = getResolvedCurrentDaYunEntry(result);
  const dayunFromList = Array.isArray(result?.daYun) ? result.daYun[0] : null;
  const startAge = firstValid(currentDaYun?.startAge, dayunFromList?.startAge);
  const endAge = firstValid(currentDaYun?.endAge, dayunFromList?.endAge);
  if (!startAge && !endAge) return '';
  return `${startAge || '--'}-${endAge || '--'} 岁`;
}

function getNextDayunEntry(result) {
  const list = Array.isArray(result?.daYun) ? result.daYun : [];
  if (!list.length) return null;
  const currentEntry = getResolvedCurrentDaYunEntry(result);
  const currentLabel = formatDaYunEntry(currentEntry);
  const currentIndex = list.findIndex((item) => formatDaYunEntry(item) === currentLabel);
  if (currentIndex >= 0 && list[currentIndex + 1]) return list[currentIndex + 1];
  if (currentIndex === -1 && list.length > 1) return list[1];
  return null;
}

function getNextDayunLabel(result) {
  return formatDaYunEntry(getNextDayunEntry(result)) || '未明确';
}

function getNextDayunAgeRange(result) {
  const nextEntry = getNextDayunEntry(result);
  if (!nextEntry) return '';
  const startAge = firstValid(nextEntry?.startAge, nextEntry?.fromAge);
  const endAge = firstValid(nextEntry?.endAge, nextEntry?.toAge);
  if (!startAge && !endAge) return '';
  return `${startAge || '--'}-${endAge || '--'} 岁`;
}

function detectTerminologyIntent(userMessage = '') {
  const text = textOf(userMessage);
  if (!text) return null;

  if (/(我的命怎么样|我的命是怎样的|我这命怎么样|我这命属于什么路数|我的八字属于什么类型)/.test(text)) {
    return 'structure_pattern';
  }

  if (/(我是什么八字|我的八字是什么|八字是什么|我的四柱是什么|四柱是什么|八字盘是什么|八字结构是什么)/.test(text)) return 'four_pillars';
  if (/(我的干支是什么|我的八字干支是什么|天干地支是什么|干支是什么)/.test(text)) return 'ganzhi';
  if (/(日柱|日支|日干)/.test(text)) return 'day_pillar';
  if (/(五行|五行属性|五行分布|五行缺|缺什么)/.test(text)) return 'wuxing';
  if (/(日元|日主)/.test(text)) return 'day_master';
  if (/(身强|身弱|强弱|日元状态)/.test(text)) return 'strength';
  if (/(喜用神.*忌神|忌神.*喜用神|喜神.*忌神|忌神.*喜神|喜用神和忌神|用神和忌神|喜神和忌神)/.test(text)) return 'use_god_diff';
  if (/(用神|喜神|忌神)/.test(text)) return 'use_god';
  if (/(十神)/.test(text)) return 'ten_gods';
  if (/(纳音)/.test(text)) return 'nayin';
  if (/(生肖|属相)/.test(text)) return 'zodiac';
  if (/(下个大运|下一步大运|下一步运|下一柱大运|下步大运|接下来走什么大运)/.test(text)) return 'next_luck_cycle';
  if (/(当前流年|今年流年|流年是什么|流年呢|今年岁运|今年是什么年运)/.test(text)) return 'liunian';
  if (/(大运|流年|运势阶段|阶段节奏)/.test(text)) return 'luck_cycle';
  if (/(藏干)/.test(text)) return 'hidden_stems';
  if (/(冲合刑害|合冲|冲合|刑害|有没有冲|有没有合|盘里有什么冲合)/.test(text)) return 'structure_relations';
  if (/(四柱|八字盘|八字结构)/.test(text)) return 'four_pillars';
  if (/(天干地支|干支|天干|地支)/.test(text)) return 'ganzhi';
  if (/(月令|当令|司令)/.test(text)) return 'month_command';
  if (/(通根|有根|无根)/.test(text)) return 'root_support';
  if (/(桃花|桃花位|桃花运)/.test(text)) return 'peach_blossom';
  if (/(夫妻宫|婚姻宫|配偶宫)/.test(text)) return 'spouse_palace';
  if (/(财库|库财|财库开不开|有没有财库)/.test(text)) return 'wealth_storage';
  if (/(贵人|天乙贵人|贵人运)/.test(text)) return 'nobleman';
  if (/(我是什么命局|请问我是什么命局|我是什么命格|我是什么命|我属于哪种命|我属于什么命|我是啥命|我是什么格|我属于什么格|命局|命格|格局|成格|格成不成)/.test(text)) return 'structure_pattern';
  if (/(神煞)/.test(text)) return 'shen_sha';
  if (/(月柱)/.test(text)) return 'month_pillar';
  if (/(年柱)/.test(text)) return 'year_pillar';
  if (/(时柱)/.test(text)) return 'hour_pillar';
  return null;
}

function extractLastUserMessage(chatHistory = []) {
  const items = Array.isArray(chatHistory) ? [...chatHistory] : [];
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];
    if (item?.role === 'user' && textOf(item?.content)) {
      return textOf(item.content);
    }
  }
  return '';
}

function extractLastAssistantMessage(chatHistory = []) {
  const items = Array.isArray(chatHistory) ? [...chatHistory] : [];
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];
    if (item?.role === 'assistant' && textOf(item?.content)) {
      return textOf(item.content);
    }
  }
  return '';
}

function extractRecentTerminologyIntents(chatHistory = [], limit = 6) {
  const items = Array.isArray(chatHistory) ? [...chatHistory] : [];
  const userMessages = items
    .filter((item) => item?.role === 'user' && textOf(item?.content))
    .slice(-limit)
    .map((item) => textOf(item.content));

  return userMessages
    .map((message) => detectTerminologyIntent(message))
    .filter(Boolean);
}

function isFollowupQuestion(message = '') {
  const text = textOf(message);
  if (!text) return false;
  return /(什么意思|意味着什么|怎么理解|展开说说|具体说说|详细说说|为什么|然后呢|对我来说|对我意味着|那会怎样|怎么看|注意什么|需要注意什么|要注意什么|怎么办|怎么做|怎么应|怎么用)/.test(text);
}

function isAdviceFollowupQuestion(message = '') {
  const text = textOf(message);
  if (!text) return false;
  return /(注意什么|需要注意什么|要注意什么|怎么办|怎么做|怎么应|怎么用|怎么避|怎么走|怎么调整)/.test(text);
}

function resolveTerminologyIntent(userMessage = '', chatHistory = []) {
  const currentIntent = detectTerminologyIntent(userMessage);
  const recentIntents = extractRecentTerminologyIntents(chatHistory);
  if (currentIntent) {
    return { intent: currentIntent, isFollowup: false, chainDepth: recentIntents.length + 1 };
  }

  if (!isFollowupQuestion(userMessage)) {
    return { intent: null, isFollowup: false, chainDepth: 0 };
  }

  const lastUserMessage = extractLastUserMessage(chatHistory);
  const previousIntent = detectTerminologyIntent(lastUserMessage);
  if (!previousIntent) {
    return { intent: null, isFollowup: false, chainDepth: 0 };
  }

  return { intent: previousIntent, isFollowup: true, chainDepth: recentIntents.length || 1 };
}

function resolveCorrectionTerminologyIntent(chatHistory = []) {
  const items = Array.isArray(chatHistory) ? [...chatHistory] : [];
  const userMessages = items
    .filter((item) => item?.role === 'user' && textOf(item?.content))
    .map((item) => textOf(item.content));

  for (let index = userMessages.length - 1; index >= 0; index -= 1) {
    const message = userMessages[index];
    if (detectSocialIntent(message) === 'correct') continue;
    const intent = detectTerminologyIntent(message);
    if (intent) {
      const recentIntents = userMessages
        .slice(Math.max(0, index - 5), index + 1)
        .map((text) => detectTerminologyIntent(text))
        .filter(Boolean);
      return {
        intent,
        isFollowup: true,
        chainDepth: recentIntents.length || 1,
      };
    }
    break;
  }

  return { intent: null, isFollowup: false, chainDepth: 0 };
}

function detectMasterReadingIntent(userMessage = '') {
  const text = textOf(userMessage);
  if (!text) return null;

  if (/(今天运势|今日运势|今日如何|今天如何|今日怎么样|今天怎么样)/.test(text)) return 'today_fortune';
  if (/(财运|偏财|正财|招财|进财|破财|守财|财富走势|财路|进账)/.test(text)) return 'money_fortune';
  if (/(感情运|桃花运|姻缘|感情走势|婚姻趋势|感情|关系|伴侣|对象|复合|桃花走势)/.test(text)) return 'relationship_fortune';
  if (/(大运|流年|时机|运势阶段|运势走势|什么时候适合|该不该冲|该不该守)/.test(text)) return 'timing_reading';
  if (/(刺符|开运|护身|转运|泰国|灵性|法事|符咒)/.test(text)) return 'spiritual_request';
  return null;
}

function inferConversationTrack(userMessage = '') {
  const text = textOf(userMessage);
  if (!text) return '';

  const terminologyIntent = detectTerminologyIntent(text);
  if (terminologyIntent) {
    if (['peach_blossom', 'spouse_palace'].includes(terminologyIntent)) return 'relationship';
    if (['wealth_storage'].includes(terminologyIntent)) return 'money';
    if (['nobleman', 'shen_sha'].includes(terminologyIntent)) return 'support';
    if (['structure_pattern', 'strength', 'use_god', 'luck_cycle', 'month_command', 'root_support'].includes(terminologyIntent)) return 'core_chart';
    return 'terminology';
  }

  const masterIntent = detectMasterReadingIntent(text);
  if (masterIntent) {
    if (masterIntent === 'relationship_fortune') return 'relationship';
    if (masterIntent === 'money_fortune') return 'money';
    if (masterIntent === 'spiritual_request') return 'spiritual';
    if (masterIntent === 'timing_reading') return 'timing';
    if (masterIntent === 'today_fortune') return 'today';
    return 'reading';
  }

  if (detectComparisonIntent(text, [])) return 'comparison';
  if (/(感情|关系|婚姻|对象|伴侣|桃花)/.test(text)) return 'relationship';
  if (/(财运|财库|钱|收入|守财|招财)/.test(text)) return 'money';
  if (/(贵人|神煞|助缘|人助)/.test(text)) return 'support';
  if (/(刺符|泰国|护身|开运|灵性|法事|符咒)/.test(text)) return 'spiritual';
  if (/(大运|流年|时机|冲还是守)/.test(text)) return 'timing';
  return '';
}

function detectTopicShift(userMessage = '', chatHistory = []) {
  const currentTrack = inferConversationTrack(userMessage);
  const lastUserMessage = extractLastUserMessage(chatHistory);
  const previousTrack = inferConversationTrack(lastUserMessage);

  if (!currentTrack || !previousTrack) {
    return false;
  }

  return currentTrack !== previousTrack;
}

function buildTopicShiftLead(userMessage = '', chatHistory = []) {
  if (!detectTopicShift(userMessage, chatHistory)) return '';

  switch (inferConversationTrack(userMessage)) {
    case 'relationship':
      return '这一层改看感情。';
    case 'money':
      return '这一层改看财。';
    case 'support':
      return '这一层改看贵人与助缘。';
    case 'spiritual':
      return '这一层改看助运与护持。';
    case 'timing':
      return '这一层改看时运。';
    case 'today':
      return '这一层改看今日之气。';
    case 'comparison':
      return '这一层改看取舍。';
    case 'core_chart':
      return '这一层回到命局主轴。';
    default:
      return '这一层另起一题。';
  }
}

function detectStrongConclusionIntent(userMessage = '') {
  const text = textOf(userMessage);
  if (!text) return false;

  return /(直接给答案|直接说答案|直接给结论|直接说结论|别分析太多|别绕|就说答案|就给答案|选哪个|哪个更适合|你直接选|给我一个明确判断|直接断)/.test(text);
}

function parseComparisonOptions(userMessage = '') {
  const text = textOf(userMessage).replace(/[？?！!。]/g, '').trim();
  if (!text) return null;

  const pairMatch = text.match(/(.{1,24})还是(.{1,24})/);
  if (!pairMatch) return null;

  const left = pairMatch[1]
    .replace(/^(那|如果是|要是|比如|像|对于|至于|右前臂|左前臂|右手|左手|现在|我想问|我想选)/, '')
    .replace(/(你直接给答案|直接给答案|直接说结论|别分析太多|哪个更适合.*|选哪个.*)$/g, '')
    .trim();
  const right = pairMatch[2]
    .replace(/(你直接给答案|直接给答案|直接说结论|别分析太多|哪个更适合.*|选哪个.*)$/g, '')
    .trim();

  if (!left || !right) return null;
  return { left, right };
}

function detectComparisonIntent(userMessage = '', chatHistory = []) {
  const text = textOf(userMessage);
  if (!text) return null;

  const explicitPair = parseComparisonOptions(text);
  if (explicitPair) {
    return {
      type: 'explicit_comparison',
      ...explicitPair,
      previousTopic: extractLastUserMessage(chatHistory),
    };
  }

  if (/(哪个好|哪个更适合|怎么选|选哪个|哪一个更稳|哪一个更顺)/.test(text)) {
    const lastUserMessage = extractLastUserMessage(chatHistory);
    const previousPair = parseComparisonOptions(lastUserMessage);
    if (previousPair) {
      return {
        type: 'followup_comparison',
        ...previousPair,
        previousTopic: lastUserMessage,
      };
    }
  }

  return null;
}

function detectCarryoverIntent(userMessage = '', chatHistory = []) {
  const text = textOf(userMessage);
  if (!text) return null;

  if (!/^(那|那如果|那要是|那这个|那右|那左|那感情|那财运|那事业|继续|接着|再说|再展开|展开说说|继续说|然后呢)/.test(text)) {
    return null;
  }

  const lastUserMessage = extractLastUserMessage(chatHistory);
  if (!lastUserMessage) return null;

  return {
    current: text,
    previous: lastUserMessage,
  };
}

function detectAnswerCarryoverIntent(userMessage = '', chatHistory = []) {
  const text = textOf(userMessage);
  if (!text) return null;

  const lastAssistantMessage = extractLastAssistantMessage(chatHistory);
  if (!lastAssistantMessage) return null;

  const looksLikeNewQuestion = /[？?]|(我是什么|现走什么|今天运势|财运|感情走势|婚姻趋势|桃花|夫妻宫|财库|贵人|用神|喜神|忌神|大运|流年|月令|纳音|生肖)/.test(text);
  if (looksLikeNewQuestion) return null;

  const askedQuestion = /[？?]|(还是|更像是|更在意|更担心|更想要|有没有|是否|哪一个|哪个|你今天|你现在|你近期|你更)/.test(lastAssistantMessage);
  if (!askedQuestion) return null;

  const conciseAnswer = text.length <= 32 || /^[^，。！？?]{1,18}(，[^，。！？?]{1,18}){0,2}$/.test(text);
  if (!conciseAnswer) return null;

  return {
    current: text,
    previous: extractLastUserMessage(chatHistory),
    previousAssistantQuestion: lastAssistantMessage,
  };
}

function detectSocialIntent(userMessage = '') {
  const text = textOf(userMessage);
  if (!text) return null;
  if (/(你聪明多了|你现在聪明多了|你懂我|你真懂|你厉害|你真厉害|你说得对|说得真准|讲得真好)/.test(text)) return 'praise';
  if (/(谢谢|多谢|谢了|辛苦了)/.test(text)) return 'thanks';
  if (/(对|没错|就是这个意思|你这次说到点上了|这次对了|是这个路子)/.test(text)) return 'affirm';
  if (/(不对|不太对|你理解错了|你说偏了|不是这个意思|你又绕了|答非所问|不是这个|我不是问这个)/.test(text)) return 'correct';
  return null;
}

function buildSocialResponse(intent) {
  if (intent === 'praise') {
    return '你这句我收到了。能让你觉得这次终于说到点上，说明这条线总算接顺了。你若继续问，我就不绕，顺着你刚才那层往下断。';
  }
  if (intent === 'thanks') {
    return '好。你不用客气，能帮你把这层看清就值了。你若还要继续，我就顺着这一题往下讲，不另起话头。';
  }
  if (intent === 'affirm') {
    return '好，那这条线就算对上了。既然主轴没偏，我就接着这一层往下讲，不再重开。';
  }
  if (intent === 'correct') {
    return '好，我收回刚才那一拐，按你真正要问的这一层重断。你继续点题，我就直接接住，不再绕。';
  }
  return null;
}

function countRecentCorrections(chatHistory = []) {
  const items = Array.isArray(chatHistory) ? [...chatHistory] : [];
  return items
    .filter((item) => item?.role === 'user' && textOf(item?.content))
    .slice(-6)
    .map((item) => detectSocialIntent(item.content))
    .filter((intent) => intent === 'correct')
    .length;
}

function buildMasterReadingInput(intent, userMessage, result, options = {}) {
  const profileText = buildUserProfile(result);
  const structuredProfile = buildStructuredProfile(result);
  const strongConclusion = Boolean(options?.strongConclusion);
  const topicShiftLead = textOf(options?.topicShiftLead);
  const correctionLead = textOf(options?.correctionLead);
  const ultraConcise = Boolean(options?.ultraConcise);

  const intentInstructionMap = {
    today_fortune: '请以玄学大师口吻直接分析今天运势。必须包含：今日日柱与日主关系、今日能量高低、适合做什么、不适合做什么、最佳时辰，并补一句现代解释。',
    money_fortune: '请直接分析这位用户当前财运。结合日主、五行生克、十神、大运流年，先下判断，再说明原因，最后给出具体建议。',
    relationship_fortune: '请直接分析这位用户当前感情与关系运势。结合日主、夫妻宫、桃花、流年与阶段节奏，先下判断，再说明原因，最后给出建议。',
    timing_reading: '请直接判断当前时机。结合大运、流年、月令、日主状态，明确回答更适合推进、收敛、观察还是暂缓，并解释原因。',
    spiritual_request: '请以懂命理、风水助运与灵性实践的老师口吻回应。围绕用户的四柱、五行、用神、当前运势，直接判断这类开运/刺符/护身诉求更适合补“护身、招财、贵人、定心、提势、执行力”中的哪一类。若涉及泰国经文符、刺符、招财符、护身符、宝袋、莲花经、帝王龙、左右手搭配或后背主符，请直接说清哪类更顺、哪类过重、哪类功能重复，并补一句现代解释。',
    general_reading: '请直接围绕用户当前问题做命理判断。结合四柱、五行、十神、大运流年，给出一个明确结论，再解释原因，最后补一句提醒。',
  };

  return [
    profileText,
    buildMysticContext(structuredProfile, 'zh-Hans'),
    correctionLead ? `【纠偏提示】\n${correctionLead}\n请先用这句短短收束，再直接重答，不要铺垫。` : '',
    topicShiftLead ? `【换题提示】\n${topicShiftLead}\n请先用这一句短短点题，再进入判断。` : '',
    '【本次问题】',
    userMessage,
    '',
    '【回答要求】',
    intentInstructionMap[intent] || '请直接围绕问题做命理判断，并补一句现代解释。',
    ultraConcise ? '用户已经明显不耐烦。请进入短断模式，总长度尽量控制在80-140字。' : '',
    strongConclusion ? '用户这次明确要结论。请第一句直接给答案，不要铺垫，不要反问，不要先分析半天再落结论。' : '不要先反问用户，不要绕圈子，不要用问卷式追问。',
    ultraConcise ? '结构固定为：先结论，再一句命理原因，最后一句提醒。不要铺垫，但也不要薄。' : (strongConclusion ? '结构固定为：先结论，再原因，最后一句提醒。' : ''),
  ].filter(Boolean).join('\n\n');
}

function buildComparisonReadingInput(userMessage, result, comparisonIntent, options = {}) {
  const profileText = buildUserProfile(result);
  const structuredProfile = buildStructuredProfile(result);
  const strongConclusion = Boolean(options?.strongConclusion);
  const correctionLead = textOf(options?.correctionLead);
  const ultraConcise = Boolean(options?.ultraConcise);

  return [
    profileText,
    buildMysticContext(structuredProfile, 'zh-Hans'),
    correctionLead ? `【纠偏提示】\n${correctionLead}\n请先用这句短短收束，再直接给答案。` : '',
    '【本次问题】',
    userMessage,
    comparisonIntent?.previousTopic ? `【上一句上下文】\n${comparisonIntent.previousTopic}` : '',
    '',
    '【回答要求】',
    `这是一个明确的比较题。请直接比较“${comparisonIntent?.left || '选项一'}”与“${comparisonIntent?.right || '选项二'}”，不要把它当成普通聊天。`,
    '请第一句直接给答案，明确说哪个更适合，不要铺垫，不要反问。',
    ultraConcise ? '第二部分只保留一句最关键的比较理由，点到命理根由即可，不要铺陈。' : '第二部分只保留最关键的比较理由，结合四柱、五行、用神、当前运势与整体配置来判断，不要泛泛而谈。',
    '最后补一句提醒，说明为什么另一个选项不如这个顺。',
    ultraConcise ? '总长度尽量控制在70-120字。' : '',
    strongConclusion ? '结构固定为：先结论，再原因，最后一句提醒。' : '回答要像一位胸有成竹的大师，直接、稳、准。',
  ].filter(Boolean).join('\n\n');
}

function buildCarryoverReadingInput(userMessage, result, carryoverIntent, options = {}) {
  const profileText = buildUserProfile(result);
  const structuredProfile = buildStructuredProfile(result);
  const strongConclusion = Boolean(options?.strongConclusion);
  const correctionLead = textOf(options?.correctionLead);
  const ultraConcise = Boolean(options?.ultraConcise);

  return [
    profileText,
    buildMysticContext(structuredProfile, 'zh-Hans'),
    correctionLead ? `【纠偏提示】\n${correctionLead}\n请先用这句短短收束，再顺着用户真正要问的层直接回答。` : '',
    '【上一轮用户原话】',
    carryoverIntent?.previous || '',
    carryoverIntent?.previousAssistantQuestion ? `【上一轮你自己的追问】\n${carryoverIntent.previousAssistantQuestion}` : '',
    '',
    '【本轮用户原话】',
    userMessage,
    '',
    '【回答要求】',
    '这是一句明显承接上文的话，不要把它当成全新问题，不要重开背景，也不要重新做一整段模板式分析。',
    carryoverIntent?.previousAssistantQuestion ? '这句更像是在回答你上一轮结尾追问。请直接顺着这个回答往下断，不要重复你刚才的问题。' : '',
    '请顺着上一句的主题直接往下答，先接住用户现在问的这一层，再给一个明确判断。',
    ultraConcise ? '用户已经明显不耐烦。请压缩表达，但仍保留一层命理根由，总长度尽量控制在70-120字。' : '',
    strongConclusion ? '用户这次要的是直接答案。请第一句直接给结论。' : '回答要有连续感，让人感觉你记得刚才在聊什么。',
    '如果这一句本质是在补充左右、前后、强弱、取舍中的另一面，请直接把另一面的判断补完整。',
  ].filter(Boolean).join('\n\n');
}

function buildOpenCarryoverMessage(userMessage, carryoverIntent, options = {}) {
  const correctionLead = textOf(options?.correctionLead);
  const topicShiftLead = textOf(options?.topicShiftLead);
  const lastAssistantQuestion = textOf(carryoverIntent?.previousAssistantQuestion);
  const previousUser = textOf(carryoverIntent?.previous);

  return [
    correctionLead ? `【纠偏】${correctionLead}` : '',
    topicShiftLead ? `【切题】${topicShiftLead}` : '',
    previousUser ? `【上一轮用户原话】${previousUser}` : '',
    lastAssistantQuestion ? `【上一轮你自己的追问】${lastAssistantQuestion}` : '',
    `【用户这轮回答】${userMessage}`,
    '【任务】这句不是新问题，而是在回答你上一轮结尾追问。请直接顺着接，优先回应这句答案里最关键的点，不要重复上一轮问题，不要重新开篇，不要再做问卷式反问。若已经足够判断，就直接给判断和建议。',
    '【口气要求】延续“懂命理的老师傅”口气，但要轻，不要端着。可以短短点一句“既然你这一层更想补财”“既然你这句落在运势与财”这种顺承话，再往下断。重点是顺，不是摆架子。'
  ].filter(Boolean).join('\n\n');
}

function buildDeterministicAnswerMap(result, context = {}) {
  const {
    isFollowup = false,
    isLayeredFollowup = false,
    isCorrection = false,
    wxText = getWxCountText(result),
    wxHint = getWxAnalysis(getWxCountObject(result)),
    useGod = getUseGodSummary(result),
    strength = getStrengthLabel(result?.dayStrength),
    currentQuestion = '',
  } = context;

  const yearPillar = getDisplayPillar(result, 'year', 0);
  const monthPillar = getDisplayPillar(result, 'month', 1);
  const dayPillar = getDisplayPillar(result, 'day', 2);
  const hourPillar = getDisplayPillar(result, 'hour', 3);
  const dayMaster = textOf(result?.dayGan, '--');
  const dayWuXing = textOf(result?.dayWuXing, '--');
  const naYin = getResolvedNaYin(result);
  const zodiac = getResolvedZodiac(result);
  const dayunLabel = getCurrentDayunLabel(result);
  const ageRange = getCurrentDayunAgeRange(result);
  const nextDayunLabel = getNextDayunLabel(result);
  const nextDayunAgeRange = getNextDayunAgeRange(result);
  const liunian = getResolvedLiunianLabel(result);
  const monthCommand = getResolvedMonthCommand(result);
  const resolvedUseGod = isResolvedValue(useGod.primary) ? useGod.primary : '';
  const adviceFollowup = isAdviceFollowupQuestion(currentQuestion);
  const useGodExtra = [
    useGod.favorable.length ? `偏有利的方向是 ${useGod.favorable.join('、')}` : '',
    useGod.avoided.length ? `当前要少碰的是 ${useGod.avoided.join('、')}` : '',
  ].filter(Boolean).join('；');

  return {
    year_pillar: isFollowup
      ? `你的年柱是 ${yearPillar}。它更像外层背景，常和早期环境、家族气质、别人第一眼看到你的样子有关，但不一定是你最核心的发力方式。`
      : `你的年柱是 ${yearPillar}。年柱更偏向早期环境、家族背景和外在气质。`,
    month_pillar: isFollowup
      ? `你的月柱是 ${monthPillar}。放到你这张盘里看，月柱更贴近成长环境、现实压力和你进入社会后的做事节奏，所以很多阶段感受都会先在这里体现出来。`
      : `你的月柱是 ${monthPillar}。月柱更贴近成长环境、做事节奏和现实阶段感受。`,
    day_pillar: isFollowup
      ? `你的日柱是 ${dayPillar}。放到你这张盘里看，日柱更贴近你处理亲密关系、内在反应和很多“真实自我”的部分，所以它往往会比表面印象更接近你私下的做事方式。`
      : `你的日柱是 ${dayPillar}。如果你愿意，我也可以继续解释这个日柱在性格和关系里最明显的表现。`,
    hour_pillar: isFollowup
      ? `你的时柱是 ${hourPillar}。它更贴近后期发展、长期想法和内在愿望，很多“以后会怎么走”的线索，往往会落在这里。`
      : `你的时柱是 ${hourPillar}。时柱更贴近后期发展、内在想法和长期走向。`,
    day_master: isFollowup
      ? `你的日元是 ${dayMaster}，五行属${dayWuXing}。放到这张盘里，它代表的是你最核心的发力方式：你习惯怎么判断、怎么扛事、怎么表达自己，很多长期稳定的行为底色都会从这里长出来。`
      : `你的日元是 ${dayMaster}，五行属${dayWuXing}。这代表你看问题和做选择时，最核心的发力方式会更贴近这股气质。`,
    wuxing: isFollowup
      ? `你的五行分布是：${wxText}。${wxHint ? `就你这张盘来说，最明显的是 ${wxHint}。` : ''}这更像在提醒你：有些力量会特别顺手，有些部分则容易变成短板，所以做事节奏和情绪恢复方式也要跟着调整。`
      : `你的五行分布是：${wxText}。${wxHint ? `目前看是 ${wxHint}。` : ''}如果你想，我可以继续帮你解释这会怎么影响你的做事方式和情绪节奏。`,
    strength: isFollowup
      ? (adviceFollowup
          ? (ultraConcise
              ? `日元偏${strength}，这时最忌硬撑乱耗。先收住最耗你的那件事，把根气稳住，再谈推进。`
              : `旺衰这一层，先记一句：日元偏${strength}，忌硬撑，忌乱耗。做法就一条，先收住最耗你的那件事，稳住节奏，再谈推进。`)
          : `若继续往下断旺衰，你这张盘的关键就在“日元${strength}”这四个字。日元为${dayMaster}${textOf(result?.dayWuXing, '')}，生于${monthPillar}，看旺衰不能只数五行多少，还要看月令得失、通根有无、透干扶抑。放回你这张盘里，这不是一句强弱标签而已，而是在说你现在更适合顺势发力，还是先补根气、稳住节奏再谈推进。`)
      : `${isLayeredFollowup ? '接着看旺衰，' : '若先断旺衰，'}你这张盘的日元状态偏${strength}。古法看旺衰，先察月令，再看通根与透干，所以这不是简单一句“强”或“弱”，而是在定你这条命眼下是该顺势发力，还是先补状态、稳根气。你若愿意，我下一句就接着替你看：这股旺衰之下，用神该往哪边取。`,
    use_god: isFollowup
      ? resolvedUseGod
        ? (adviceFollowup
            ? (ultraConcise
                ? `主用神在${resolvedUseGod}，顺它则顺，逆它则耗。多用${useGod.favorable.length ? useGod.favorable.join('、') : resolvedUseGod}，少碰${useGod.avoided.length ? useGod.avoided.join('、') : '耗你气的那边'}。`
                : `用神这一层，先记一句：主用神在${resolvedUseGod}，顺它则顺，逆它则耗。做法就一条，多用${useGod.favorable.length ? useGod.favorable.join('、') : resolvedUseGod}这边的力，少碰${useGod.avoided.length ? useGod.avoided.join('、') : '耗你气的那边'}。`)
            : `若继续论用神，你这张盘当前主用神落在${resolvedUseGod}。用神不是好听的名词，而是这张盘真正的用力方向：顺着它补，整盘气就容易调匀；逆着它走，很多消耗和拉扯就会加重。${useGod.favorable.length ? `眼下偏有利的是 ${useGod.favorable.join('、')}。` : ''}${useGod.avoided.length ? `要少碰的是 ${useGod.avoided.join('、')}。` : ''}${useGod.strategy ? `若化到现实层面，可落在：${useGod.strategy}` : ''}`)
        : (adviceFollowup
            ? (ultraConcise
                ? '先别空挂名词。顺着能补你的那边去做，少碰更耗你的那边，先把盘势扶正再谈别的。'
                : '用神这一层，先别空挂名词。做法就一条：顺着能补你不足的那边去做，少碰会让你更耗、更偏的那边。先扶正节奏，再谈扩张。')
            : `若继续论用神，你这张盘的主用方向还得先从旺衰、月令和整盘偏颇来定，但就现有结果看，喜神更偏向补你不足、调你失衡的那一侧，忌神则是会让这张盘更耗、更偏的那一侧。若你愿意，我可以顺着旺衰那条线，把这一层再替你断清。`)
      : resolvedUseGod
        ? `${isLayeredFollowup ? '接着看用神，' : '若先断用神，'}你这张盘当前主用神在${resolvedUseGod}。${useGodExtra}${useGod.strategy ? `。落到现实里，可这样用：${useGod.strategy}` : ''}简而言之，用神就是这张盘现在最该顺着走的那股气。你若愿意，我下一句就继续接大运，看这十年到底是在扶你，还是在压你。`
        : `${isLayeredFollowup ? '接着看用神，' : '若先断用神，'}你这张盘的用神方向，重点不在空谈一个名词，而在先看旺衰偏哪边、月令站哪边，再决定该扶、该泄、该通关还是该调候。就现有结果看，喜神偏向补你不足，忌神偏向加重失衡。你若愿意，我下一句就顺着旺衰那条线，直接替你断这一层。`,
    use_god_diff: isCorrection
      ? `${resolvedUseGod ? `重新校正后，你这张盘的主用神是 ${resolvedUseGod}；` : '重新校正后，先不空挂一个名字；'}${useGod.favorable.length ? `喜神更偏 ${useGod.favorable.join('、')}` : '喜神方向以生扶和调匀为主'}；${useGod.avoided.length ? `忌神要少碰 ${useGod.avoided.join('、')}` : '忌神则是让盘势失衡的那一侧'}。先以这层为准。`
      : isFollowup
        ? `喜用神和忌神的区别，放到你这张盘里可以简单理解成：前者是顺着走会更稳、更顺的方向，后者是碰多了更容易失衡、消耗或判断走偏的部分。${resolvedUseGod ? `你这张盘主用神在${resolvedUseGod}，` : ''}${useGod.favorable.length ? `喜神更偏 ${useGod.favorable.join('、')}；` : ''}${useGod.avoided.length ? `忌神更偏 ${useGod.avoided.join('、')}。` : '忌神就是会让盘势更偏、更耗的那一侧。'}所以它不是抽象定义，而是会直接影响你现在该补什么、避开什么。`
        : `${resolvedUseGod ? `你这张盘的主用神在${resolvedUseGod}。` : '这张盘先别执着一个空名词。'}${useGod.favorable.length ? `喜神更偏 ${useGod.favorable.join('、')}；` : '喜神偏向补你不足、调你失衡；'}${useGod.avoided.length ? `忌神更偏 ${useGod.avoided.join('、')}。` : '忌神则偏向加重偏颇和消耗。'}简单说，喜用神偏向“该多用”，忌神偏向“要少碰”。`,
    nayin: isFollowup
      ? `你的纳音是 ${naYin}。对你这张盘来说，纳音更像补充气质和场景感的线索，可以帮助理解某些关系氛围或做事感觉，但它通常不会压过日元状态和整体结构。`
      : `你的纳音是 ${naYin}。纳音更适合当作补充气质和场景线索来看，通常不单独拿来下结论。`,
    zodiac: isCorrection
      ? `按你的出生年份重新校正，你的生肖是 ${zodiac}。这层不需要绕，先以这个为准。`
      : isFollowup
        ? `你的生肖是 ${zodiac}。放到这张盘里，生肖更多是外层标签，能帮助理解一些气质联想，但真正更影响你现实判断和阶段表现的，还是日元状态、结构重心和当前主线。`
        : `你的生肖是 ${zodiac}。生肖更像一个外层标签，真正更影响判断的，还是日元状态、结构重心和当前阶段。`,
    luck_cycle: isCorrection
      ? `按当前年龄重算，你现在行的是 ${dayunLabel}${ageRange ? `（约 ${ageRange}）` : ''}。这一层先以这步大运为准，再往下看它是在扶你还是压你。`
      : isFollowup
      ? (adviceFollowup
          ? (ultraConcise
              ? `${dayunLabel}${ageRange ? `（约 ${ageRange}）` : ''}这步运别贪多，它更考验收束而不是摊大。先收主线，稳住了再加码。`
              : `这步大运，先记一句：${dayunLabel}${ageRange ? `（约 ${ageRange}）` : ''}不宜贪多，只宜收主线。做法就一条，机会来了先看接不接得住，能稳住再加码。`)
          : `若接着看大运，你当前行的是 ${dayunLabel}${ageRange ? `（约 ${ageRange}）` : ''}，今年之气又落在 ${liunian}。古法论岁运，大运定十年基调，流年定当年应事，所以不能只问吉凶，而要看它是在扶你原局，还是来催你变化。放到你现在这步看，更要紧的是判断：这十年究竟是助你成局，还是逼你改路。`)
      : `${isLayeredFollowup ? '接着看大运，' : '若先断大运，'}你当前行的是 ${dayunLabel}${ageRange ? `（约 ${ageRange}）` : ''}，今年之气更接近 ${liunian}。大运看十年主线，流年看一年落点，所以这一层不是只看“好不好”，而是看它是在扶你、催你，还是压你、逼你转。你若愿意，我下一句就直接替你断：这步运到底助你，还是压你。`,
    next_luck_cycle: isCorrection
      ? `按大运顺序重算，你下一步大运是 ${nextDayunLabel}${nextDayunAgeRange ? `（约 ${nextDayunAgeRange}）` : ''}。这一层先以这步后运为准，不再沿当前大运复述。`
      : `${isLayeredFollowup ? '接着往后看一步大运，' : '若先断下一步大运，'}你下一步行的是 ${nextDayunLabel}${nextDayunAgeRange ? `（约 ${nextDayunAgeRange}）` : ''}。这一柱不看眼下小起伏，而看你再往后十年的气势是转扶、转压，还是换路成局。`,
    liunian: isCorrection
      ? `按当前年份重新校正，你今年的流年是 ${liunian}。这一层先以当年岁气为准。`
      : isFollowup
        ? `若单看流年，你当前这一年的岁气落在 ${liunian}。流年是当年应事，不改十年大运基调，但会把某些机会、压力或人事关系在这一年推到台前。`
        : `你当前的流年是 ${liunian}。流年主要看这一年的落点和应事节奏，不等于整步大运，但会明显影响你今年的起伏。`,
    month_command: isCorrection
      ? `重新校正后，你这张盘的月令落在 ${monthCommand}。月令先看这一位，不必再绕。`
      : isFollowup
        ? `你的月令落在 ${monthPillar}${monthCommand && monthCommand !== '未明确' ? `，司令之气在 ${monthCommand}` : ''}。放到你这张盘里，月令更像这张盘的季节背景和底层气候，所以它会明显影响日元强弱、结构重心，很多后续判断都要先看这里。`
        : `你的月令落在 ${monthPillar}${monthCommand && monthCommand !== '未明确' ? `，司令之气在 ${monthCommand}` : ''}。月令主要用来看这张盘当前最得势的季节背景，它会明显影响日元强弱、结构重心和很多后续判断。`,
  };
}

function buildSemiDeterministicLead(result, context = {}) {
  const relationLine = firstValid(
    textOf(result?.relationshipAnalysis?.summary),
    textOf(result?.relationshipAnalysis?.focus),
    textOf(result?.relationshipAnalysis?.trend),
    textOf(result?.narrative?.relationshipHint)
  );
  const guiRenList = Array.from(new Set(toList(result?.guiRen).filter(Boolean)));
  const shiShen = result?.shiShen || {};
  const wealthStars = [
    textOf(shiShen?.year),
    textOf(shiShen?.month),
    textOf(shiShen?.day),
    textOf(shiShen?.hour),
  ].filter((item) => /正财|偏财/.test(item));
  const useGod = context.useGod || getUseGodSummary(result);

  let peachLead = '这层桃花要先分清，是添缘还是添扰。';
  if (/(拉扯|反复|不稳|忽冷忽热|暧昧)/.test(relationLine)) peachLead = '这层桃花更像添扰，不算先落实缘。';
  else if (/(靠近|机会|缘分|回应|推进)/.test(relationLine)) peachLead = '这层桃花有动，偏添缘，不只是虚花。';
  else if (toList(result?.taoHua).length || toList(result?.hongLuan).length || toList(result?.tianXi).length) peachLead = '这层桃花气不弱，但先看能不能落到实缘。';

  let spouseLead = '夫妻宫这一位，先看稳不稳，再看甜不甜。';
  if (/(拉扯|委屈|冷淡|不安)/.test(relationLine)) spouseLead = '夫妻宫这层更怕拉扯，不怕没感觉。';
  else if (/(稳定|靠近|回应|能落地)/.test(relationLine)) spouseLead = '夫妻宫这层有落稳的可能，关键看后续怎么承接。';

  let wealthLead = '财库这一层，重点不在有没有财，而在能不能留得住。';
  if (wealthStars.length && useGod.favorable.some((item) => /财|土|金|水|木|火/.test(item))) wealthLead = '财路不是没有，难点更在聚财和守财。';
  else if (!wealthStars.length) wealthLead = '这层更像“财来财去”，守比冲更重要。';

  const nobleLead = guiRenList.length
    ? '贵人线是有的，更像人助与点拨。'
    : '贵人不算特别外放，更偏时机助，不偏明面提携。';

  return {
    peachLead,
    spouseLead,
    wealthLead,
    nobleLead,
  };
}

function buildTerminologyDirectAnswer(intent, result, options = {}) {
  const isFollowup = Boolean(options?.isFollowup);
  const chainDepth = Number(options?.chainDepth || 0);
  const isLayeredFollowup = chainDepth >= 2;
  if (!result) {
    return '你还没完成资料建立，所以我现在还不能准确回答这些命盘信息。先把出生资料补完整，我就能直接告诉你。';
  }

  const wxText = getWxCountText(result);
  const wxHint = getWxAnalysis(getWxCountObject(result));
  const useGod = getUseGodSummary(result);
  const strength = getStrengthLabel(result?.dayStrength);
  const pillars = result?.pillars || {};
  const monthPillar = getDisplayPillar(result, 'month', 1);
  const monthBranch = textOf(pillars?.month?.zhi || pillars?.month?.branch);
  const dayBranch = textOf(pillars?.day?.zhi || pillars?.day?.branch, '--');
  const spousePalace = getDisplayPillar(result, 'day', 2);
  const guiRenList = Array.from(new Set(toList(result?.guiRen).filter(Boolean)));
  const shenShaList = Array.from(new Set([
    ...guiRenList,
    ...toList(result?.wenChang),
    ...toList(result?.yiMa),
    ...toList(result?.taoHua),
    ...toList(result?.hongLuan),
    ...toList(result?.tianXi),
  ].filter(Boolean)));
  const wealthStars = [
    textOf(result?.shiShen?.year),
    textOf(result?.shiShen?.month),
    textOf(result?.shiShen?.day),
    textOf(result?.shiShen?.hour),
  ].filter((item) => /正财|偏财/.test(item));
  const deterministicAnswerMap = buildDeterministicAnswerMap(result, {
    isFollowup,
    isLayeredFollowup,
    isCorrection: Boolean(options?.isCorrection),
    wxText,
    wxHint,
    useGod,
    strength,
    currentQuestion: textOf(options?.currentQuestion),
  });

  if (deterministicAnswerMap[intent]) {
    return deterministicAnswerMap[intent];
  }
  const semiLeads = buildSemiDeterministicLead(result, { useGod });
  const composeChartAnswer = (conclusion, structure, reminder) =>
    [conclusion, structure ? `这层结构看的是：${structure}` : '', reminder ? `现实提醒：${reminder}` : '']
      .filter(Boolean)
      .join('');

  switch (intent) {
    case 'day_pillar':
      if (isFollowup) {
        return `你的日柱是 ${getDisplayPillar(result, 'day', 2)}。放到你这张盘里看，日柱更贴近你处理亲密关系、内在反应和很多“真实自我”的部分，所以它往往会比表面印象更接近你私下的做事方式。`;
      }
      return `你的日柱是 ${getDisplayPillar(result, 'day', 2)}。如果你愿意，我也可以继续解释这个日柱在性格和关系里最明显的表现。`;
    case 'month_pillar':
      if (isFollowup) {
        return `你的月柱是 ${getDisplayPillar(result, 'month', 1)}。放到你这张盘里看，月柱更贴近成长环境、现实压力和你进入社会后的做事节奏，所以很多阶段感受都会先在这里体现出来。`;
      }
      return `你的月柱是 ${getDisplayPillar(result, 'month', 1)}。月柱更贴近成长环境、做事节奏和现实阶段感受。`;
    case 'year_pillar':
      if (isFollowup) {
        return `你的年柱是 ${getDisplayPillar(result, 'year', 0)}。它更像外层背景，常和早期环境、家族气质、别人第一眼看到你的样子有关，但不一定是你最核心的发力方式。`;
      }
      return `你的年柱是 ${getDisplayPillar(result, 'year', 0)}。年柱更偏向早期环境、家族背景和外在气质。`;
    case 'hour_pillar':
      if (isFollowup) {
        return `你的时柱是 ${getDisplayPillar(result, 'hour', 3)}。它更贴近后期发展、长期想法和内在愿望，很多“以后会怎么走”的线索，往往会落在这里。`;
      }
      return `你的时柱是 ${getDisplayPillar(result, 'hour', 3)}。时柱更贴近后期发展、内在想法和长期走向。`;
    case 'wuxing':
      if (isFollowup) {
        return `你的五行分布是：${wxText}。${wxHint ? `就你这张盘来说，最明显的是 ${wxHint}。` : ''}这更像在提醒你：有些力量会特别顺手，有些部分则容易变成短板，所以做事节奏和情绪恢复方式也要跟着调整。`;
      }
      return `你的五行分布是：${wxText}。${wxHint ? `目前看是 ${wxHint}。` : ''}如果你想，我可以继续帮你解释这会怎么影响你的做事方式和情绪节奏。`;
    case 'day_master':
      if (isFollowup) {
        return `你的日元是 ${textOf(result?.dayGan, '--')}，五行属${textOf(result?.dayWuXing, '--')}。放到这张盘里，它代表的是你最核心的发力方式：你习惯怎么判断、怎么扛事、怎么表达自己，很多长期稳定的行为底色都会从这里长出来。`;
      }
      return `你的日元是 ${textOf(result?.dayGan, '--')}，五行属${textOf(result?.dayWuXing, '--')}。这代表你看问题和做选择时，最核心的发力方式会更贴近这股气质。`;
    case 'strength':
      if (isFollowup) {
        return `若继续往下断旺衰，你这张盘的关键就在“日元${strength}”这四个字。日元为${textOf(result?.dayGan, '--')}${textOf(result?.dayWuXing, '')}，生于${monthPillar}，看旺衰不能只数五行多少，还要看月令得失、通根有无、透干扶抑。放回你这张盘里，这不是一句强弱标签而已，而是在说你现在更适合顺势发力，还是先补根气、稳住节奏再谈推进。`;
      }
      return `${isLayeredFollowup ? '接着看旺衰，' : '若先断旺衰，'}你这张盘的日元状态偏${strength}。古法看旺衰，先察月令，再看通根与透干，所以这不是简单一句“强”或“弱”，而是在定你这条命眼下是该顺势发力，还是先补状态、稳根气。你若愿意，我下一句就接着替你看：这股旺衰之下，用神该往哪边取。`;
    case 'use_god': {
      const extra = [];
      if (useGod.favorable.length) extra.push(`偏有利的方向是 ${useGod.favorable.join('、')}`);
      if (useGod.avoided.length) extra.push(`当前要少碰的是 ${useGod.avoided.join('、')}`);
      if (isFollowup) {
        return `若继续论用神，你这张盘当前主用神落在${useGod.primary}。用神不是好听的名词，而是这张盘真正的用力方向：顺着它补，整盘气就容易调匀；逆着它走，很多消耗和拉扯就会加重。${useGod.favorable.length ? `眼下偏有利的是 ${useGod.favorable.join('、')}。` : ''}${useGod.avoided.length ? `要少碰的是 ${useGod.avoided.join('、')}。` : ''}${useGod.strategy ? `若化到现实层面，可落在：${useGod.strategy}` : ''}`;
      }
      return `${isLayeredFollowup ? '接着看用神，' : '若先断用神，'}你这张盘当前主用神在${useGod.primary}。${extra.join('；')}${useGod.strategy ? `。落到现实里，可这样用：${useGod.strategy}` : ''}简而言之，用神就是这张盘现在最该顺着走的那股气。你若愿意，我下一句就继续接大运，看这十年到底是在扶你，还是在压你。`;
    }
    case 'ten_gods': {
      const shiShen = result?.shiShen || {};
      const visible = [
        `年${textOf(shiShen?.year, '--')}`,
        `月${textOf(shiShen?.month, '--')}`,
        `日${textOf(shiShen?.day, '--')}`,
        `时${textOf(shiShen?.hour, '--')}`,
      ];
      const summary = getTenGodSummary(result);
      if (isFollowup) {
        return `你的四柱十神分别是：${visible.join('、')}。放到你这张盘里，十神更像几股不同的行为驱动力：哪些力量你最顺手，哪些部分会成为压力点，都要结合日元状态和当前阶段一起看。${summary ? `这张盘当前更突出的重点是：${summary}。` : ''}`;
      }
      return `你的四柱十神分别是：${visible.join('、')}。${summary ? `当前更值得先看的十神重点是：${summary}。` : ''}如果你愿意，我也可以继续把十神翻成更容易理解的现实语言。`;
    }
    case 'nayin':
      if (isFollowup) {
        return `你的纳音是 ${textOf(result?.naYin || result?.dayNaYin, '--')}。对你这张盘来说，纳音更像补充气质和场景感的线索，可以帮助理解某些关系氛围或做事感觉，但它通常不会压过日元状态和整体结构。`;
      }
      return `你的纳音是 ${textOf(result?.naYin || result?.dayNaYin, '--')}。纳音更适合当作补充气质和场景线索来看，通常不单独拿来下结论。`;
    case 'zodiac':
      if (isFollowup) {
        return `你的生肖是 ${textOf(result?.shengXiao, '--')}。放到这张盘里，生肖更多是外层标签，能帮助理解一些气质联想，但真正更影响你现实判断和阶段表现的，还是日元状态、结构重心和当前主线。`;
      }
      return `你的生肖是 ${textOf(result?.shengXiao, '--')}。生肖更像一个外层标签，真正更影响判断的，还是日元状态、结构重心和当前阶段。`;
    case 'luck_cycle': {
      const dayunLabel = getCurrentDayunLabel(result);
      const ageRange = getCurrentDayunAgeRange(result);
      const liunian = firstValid(
        result?.luckAnalysis?.liunianTheme,
        result?.liuNianPillar?.ganZhi,
        `${textOf(result?.liuNianPillar?.gan)}${textOf(result?.liuNianPillar?.zhi)}`
      );
      if (isFollowup) {
        return `若接着看大运，你当前行的是 ${dayunLabel}${ageRange ? `（约 ${ageRange}）` : ''}，今年之气又落在 ${liunian || '当前年度主题尚未明确'}。古法论岁运，大运定十年基调，流年定当年应事，所以不能只问吉凶，而要看它是在扶你原局，还是来催你变化。放到你现在这步看，更要紧的是判断：这十年究竟是助你成局，还是逼你改路。`;
      }
      return `${isLayeredFollowup ? '接着看大运，' : '若先断大运，'}你当前行的是 ${dayunLabel}${ageRange ? `（约 ${ageRange}）` : ''}，今年之气更接近 ${liunian || '当前年度主题尚未明确'}。大运看十年主线，流年看一年落点，所以这一层不是只看“好不好”，而是看它是在扶你、催你，还是压你、逼你转。你若愿意，我下一句就直接替你断：这步运到底助你，还是压你。`;
    }
    case 'hidden_stems': {
      const hidden = [
        `年${toList(pillars?.year?.hiddenStems || pillars?.year?.cangGan).join('、') || '未提供'}`,
        `月${toList(pillars?.month?.hiddenStems || pillars?.month?.cangGan).join('、') || '未提供'}`,
        `日${toList(pillars?.day?.hiddenStems || pillars?.day?.cangGan).join('、') || '未提供'}`,
        `时${toList(pillars?.hour?.hiddenStems || pillars?.hour?.cangGan).join('、') || '未提供'}`,
      ];
      if (isFollowup) {
        return `你的四柱藏干分别是：${hidden.join('、')}。放到你这张盘里，藏干像地支里没直接摆在表面的底层力量，所以很多“表面看不出来，但一直在影响你”的节奏，往往要从这里找。`;
      }
      return `你的四柱藏干分别是：${hidden.join('、')}。藏干更像支里藏着的底层力量，通常要和表面的天干、地支一起看才更准。`;
    }
    case 'ten_gods': {
      const summary = summarizePillarTenGods(result) || '当前结果里未单独展开';
      return composeChartAnswer(
        `你的十神结构是：${summary}。`,
        '十神讲的是你这张盘靠什么发力、又容易被什么牵制，本质上是在看行为驱动力和应事方式。',
        '现实里别把十神当标签，更要看哪股力量是你顺手的，哪股力量是你容易失衡的。'
      );
    }
    case 'shen_sha': {
      const summary = summarizeShenSha(result) || '当前结果里未单独展开';
      return composeChartAnswer(
        `你这张盘当前可见的神煞线索有：${summary}。`,
        '神煞更像补充线索，用来提示机会、关系、奔波或放大点，不该压过整张盘的旺衰和结构主轴。',
        '看神煞要点到为止，把它当提醒，不要把它当唯一结论。'
      );
    }
    case 'structure_relations': {
      const summary = summarizeStructureObservations(result);
      return summary
        ? composeChartAnswer(
            `你这张盘当前最明显的冲合刑害是：${summary}。`,
            `这一层看的是盘里哪些位置在牵引、碰撞和拧着走。合多偏整合，冲多偏变化，刑多偏卡点，要结合日主${textOf(result?.dayGan, '--')}${textOf(result?.dayWuXing, '')}一起看。`,
            '现实里遇到反复、拉扯和节奏失衡时，往往就能在这层找到根子。'
          )
        : '你这张盘当前没有特别集中的冲合刑害，或者结果里还没把这一层单独展开。它通常作为结构观察点来辅助判断。';
    }
    case 'four_pillars':
      return composeChartAnswer(
        `你的四柱是：年${getDisplayPillar(result, 'year', 0)}、月${getDisplayPillar(result, 'month', 1)}、日${getDisplayPillar(result, 'day', 2)}、时${getDisplayPillar(result, 'hour', 3)}。`,
        '年柱偏外层背景，月柱偏现实节奏，日柱偏你自己，时柱偏后段走向，四柱合起来才是整张盘的骨架。',
        '看盘别只盯一柱，真正有效的是把四柱放回同一张命盘里一起判断。'
      );
    case 'ganzhi':
      return composeChartAnswer(
        `你的天干地支信息是：年${getDisplayPillar(result, 'year', 0)}、月${getDisplayPillar(result, 'month', 1)}、日${getDisplayPillar(result, 'day', 2)}、时${getDisplayPillar(result, 'hour', 3)}。`,
        '天干更偏外显与表达，地支更偏底层根气与持续作用，所以很多表面反应和内里节奏并不是同一层。',
        '若只看天干容易飘，若只看地支又容易闷，合起来看才像真盘。'
      );
    case 'use_god_diff':
      if (isFollowup) {
        return `喜用神和忌神的区别，放到你这张盘里可以简单理解成：前者是顺着走会更稳、更顺的方向，后者是碰多了更容易失衡、消耗或判断走偏的部分。所以它不是抽象定义，而是会直接影响你现在该补什么、避开什么。`;
      }
      return `喜用神更像当前对你有帮助、能让整体状态更顺的方向；忌神则是这一阶段更容易让你失衡、消耗或走偏的部分。简单说，喜用神偏向“该多用”，忌神偏向“要少碰”。`;
    case 'month_command':
      if (isFollowup) {
        return `你的月令落在月柱 ${monthPillar}${monthBranch ? `，月支是 ${monthBranch}` : ''}。放到你这张盘里，月令更像这张盘的季节背景和底层气候，所以它会明显影响日元强弱、结构重心，很多后续判断都要先看这里。`;
      }
      return `你的月令落在月柱 ${monthPillar}${monthBranch ? `，月支是 ${monthBranch}` : ''}。月令主要用来看这张盘当前最得势的季节背景，它会明显影响日元强弱、结构重心和很多后续判断。`;
    case 'root_support': {
      const branchRoots = [
        `年${toList(pillars?.year?.hiddenStems || pillars?.year?.cangGan).join('、') || '未提供'}`,
        `月${toList(pillars?.month?.hiddenStems || pillars?.month?.cangGan).join('、') || '未提供'}`,
        `日${toList(pillars?.day?.hiddenStems || pillars?.day?.cangGan).join('、') || '未提供'}`,
        `时${toList(pillars?.hour?.hiddenStems || pillars?.hour?.cangGan).join('、') || '未提供'}`,
      ];
      if (isFollowup) {
        return `通根主要看日元在地支里有没有根气。你这张盘可以先看四支藏干：${branchRoots.join('、')}。放到你自己的盘里，通根越明显，很多优势越能站得住；根气弱的时候，外面看着有力，里面却更容易虚。`;
      }
      return `通根主要看日元在地支里有没有根气。你这张盘可以先看四支藏干：${branchRoots.join('、')}。如果日元同类或生扶之气能在支里找到落点，一般就算有根；完全找不到，通常就更偏无根或根气弱。`;
    }
    case 'peach_blossom': {
      const relationLine = firstValid(
        textOf(result?.relationshipAnalysis?.summary),
        textOf(result?.relationshipAnalysis?.focus),
        textOf(result?.relationshipAnalysis?.trend),
        textOf(result?.narrative?.relationshipHint)
      );
      if (isFollowup) {
        return adviceFollowup
          ? (ultraConcise
              ? `${semiLeads.peachLead}桃花别急着接，这层先分虚花还是真缘。先看回应稳不稳，再决定进不进。`
              : `${semiLeads.peachLead}桃花这一层，先记一句：别急着顺感觉，要先看回应稳不稳。做法就一条，慢一点、看久一点，先分清是添缘还是添扰。`)
          : `${semiLeads.peachLead}前面命局、旺衰、用神、大运若都看过了，继续往下断桃花，就不能只问有没有人喜欢你，还要看日支夫妻宫、命盘里合冲引动，以及神煞是虚花还是真缘。你这张盘的夫妻宫落在${spousePalace}，桃花若动，往往先动在吸引力、暧昧感和关系气场上，未必等于立刻成局。${relationLine ? `放回你这张盘里看，当前更值得留心的是：${relationLine}。` : '放回你这张盘里看，更要紧的是分清这股桃花是热闹一时，还是能落到稳定关系。'}`;
      }
      return `${isLayeredFollowup ? '接着往外层看桃花，' : '若顺着前面命局、旺衰、用神、大运这条线往下看桃花，'}${semiLeads.peachLead}夫妻宫在${spousePalace}，桃花一动，先看吸引力、关系机会和外界靠近的频率，再看能不能成局。简而言之，桃花旺不等于姻缘稳；真要断得准，还得看它是虚花浮动，还是能落到实缘。你若愿意，我下一句就接着替你看：这桃花对你是添缘，还是添扰。`;
    }
    case 'spouse_palace':
      if (isFollowup) {
        return adviceFollowup
          ? (ultraConcise
              ? `${semiLeads.spouseLead}别急着求结果，夫妻宫先看受不受冲。先看回应，再决定要不要继续。`
              : `${semiLeads.spouseLead}夫妻宫这一层，先记一句：别急着求结果，先看回应。做法就一条，边界先立稳，再决定要不要继续加深。`)
          : `${semiLeads.spouseLead}前面命局、旺衰、用神、大运若都理清了，继续断夫妻宫，关键就落在日支这一位。你这张盘的夫妻宫落在${spousePalace}，古法看婚姻，先看夫妻宫受不受冲、合、刑，再看配偶星与整体结构能不能相应。放回你这张盘里，夫妻宫不是只在讲“对象”，更是在讲你进入亲密关系后，究竟容易安稳、拉扯，还是先甜后累。`;
      }
      return `${isLayeredFollowup ? '接着往关系根位看，' : '若顺着前面命局、旺衰、用神、大运这条线往下断夫妻宫，'}${semiLeads.spouseLead}你这张盘的夫妻宫就在${spousePalace}，也就是日支${dayBranch}这一位。夫妻宫是婚姻与亲密关系的根位，古法常先看这里，再看配偶星和岁运引动。换成现代话说，这一位决定的不是“你有没有对象”这么简单，而是你在关系里更容易安心、拉扯，还是总有说不出的隔阂。你若愿意，我下一句就继续替你断：这夫妻宫更偏稳，还是偏折腾。`;
    case 'wealth_storage': {
      const storageHint = wealthStars.length
        ? `命盘里明面带${wealthStars.join('、')}，财气不是没有，关键在能不能收住。`
        : '命盘里财星未必特别外显，所以财库更关系到你守不守得住，而不只是赚不赚得到。';
      if (isFollowup) {
        return adviceFollowup
          ? (ultraConcise
              ? `${semiLeads.wealthLead}财先守，别急着扩。你这一层先看财能不能进库，先进库，再谈放大。`
              : `${semiLeads.wealthLead}财库这一层，先记一句：先守，再扩。做法就一条，把钱路收成一条主线，先进库、守现金流，再谈放大。`)
          : `${semiLeads.wealthLead}前面命局、旺衰、用神、大运若都看过了，继续断财库，古法就不是只看有没有钱星，而是看财有没有库、库能不能开、开了能不能守。${storageHint}放到你这张盘里，财库讲的是收财、聚财、守财的能力：有人是财来财去，有人是财气一到就能留成局。真正要紧的，不是嘴上说想发财，而是这张盘有没有“进得来、留得住、用得稳”的根。`;
      }
      return `${isLayeredFollowup ? '接着往财路深处看，' : '若顺着前面命局、旺衰、用神、大运这条线往下断财库，'}${semiLeads.wealthLead}${storageHint}古法看财库，一看财星喜忌，二看库门开闭，三看岁运有没有引动。换成现代话说，就是你不只是要会赚钱，更要看你这命能不能把钱收成自己的局。你若愿意，我下一句就直接替你断：你这张盘更像财来财去，还是能慢慢聚库。`;
    }
    case 'nobleman':
      if (isFollowup) {
        return adviceFollowup
          ? (ultraConcise
              ? `${semiLeads.nobleLead}贵人不是等来的，是接来的。先把主线收稳、把话说清，助缘才会真正落地。`
              : `${semiLeads.nobleLead}贵人这一层，先记一句：贵人不是等来的，是接来的。做法就一条，把话说清、主线收稳、人情做干净，让别人愿意扶你一把。`)
          : `${semiLeads.nobleLead}${guiRenList.length ? `你这张盘已见的贵人线索有：${guiRenList.join('、')}。` : '你这张盘当前贵人线索不算特别外放。'}放回现实里，贵人有时是提携你的人，有时是给你开路的机会，有时则是让你少走弯路的一句话。贵人能不能成事，终究还要看你自己有没有接得住。`;
      }
      return `${isLayeredFollowup ? '接着往助缘这层看，' : '若顺着前面命局、旺衰、用神、大运这条线往下断贵人，'}${semiLeads.nobleLead}${guiRenList.length ? `你这张盘已见${guiRenList.join('、')}这一路贵人线索` : '贵人线索不算特别张扬'}。古法论贵人，不是说你可以坐等人来救，而是看命里有没有“逢难有人扶、逢局有人引、逢关有人点”的气。换成现代话说，贵人讲的是助缘，不是替你活；有贵人也要你自己接得住。你若愿意，我下一句就继续替你看：你的贵人更偏人助，还是偏时机助。`;
    case 'structure_pattern':
      if (isFollowup) {
        return `若按子平法再往深一层看，你这命局先不急着执着一个虚名。年${getDisplayPillar(result, 'year', 0)}、月${getDisplayPillar(result, 'month', 1)}、日${getDisplayPillar(result, 'day', 2)}、时${getDisplayPillar(result, 'hour', 3)}，日元为${textOf(result?.dayGan, '--')}${textOf(result?.dayWuXing, '')}，生于${monthPillar}，眼下日元状态偏${strength}。${getStructurePatternLabel(result) ? `若就当前盘势先断，可归到“${getStructurePatternLabel(result)}”这一脉。` : '若就当前盘势先断，这张盘更重结构主轴，不宜硬贴一个单名。'}古法看命，先看旺衰，再看格局成不成，最后才论喜忌与岁运，所以真正要紧的，是你这张盘到底靠哪股气立得住。`;
      }
      return `${isLayeredFollowup ? '接着回到命局主轴看，' : '若先直断你的命局：'}${isLayeredFollowup ? '' : `年${getDisplayPillar(result, 'year', 0)}、月${getDisplayPillar(result, 'month', 1)}、日${getDisplayPillar(result, 'day', 2)}、时${getDisplayPillar(result, 'hour', 3)}；`}日元为${textOf(result?.dayGan, '--')}${textOf(result?.dayWuXing, '')}，月令落在${monthPillar}，当前日元状态偏${strength}。${getStructurePatternLabel(result) ? `按当前盘面先看，你这命局更接近“${getStructurePatternLabel(result)}”这一类。` : '按当前盘面先看，你这张盘更像是以结构重心立命，不宜急着硬扣单一格局名。'}换成现代话说，就是你这命不是看一个标签就能定死，而是要看你现在到底靠什么发力、靠什么成局。你若还要，我下一句就继续替你拆旺衰、用神，或这步大运是扶你还是压你。`;
    case 'shen_sha': {
      const names = toList(result?.guiRen).concat(toList(result?.wenChang), toList(result?.yiMa)).filter(Boolean);
      const unique = Array.from(new Set(names));
      if (isFollowup) {
        return unique.length
          ? `你这张盘里当前已显示的神煞线索有：${unique.join('、')}。放到你自己的盘里，它们更像补充提醒：哪里容易遇到机会、关系、奔波或放大某种体验，但通常不会比日元状态和整体结构更优先。`
          : '你这张盘目前没有特别突出的神煞线索，或者当前结果里没有把它们单独展开。放到判断顺序里，神煞通常也只是辅助，不会压过整体结构。';
      }
      return unique.length
        ? `你这张盘里当前已显示的神煞线索有：${unique.join('、')}。神煞更适合当成补充线索，用来辅助理解关系、机会和风险，不建议单独拿来断事。`
        : '你这张盘目前没有特别突出的神煞线索，或者当前结果里没有把它们单独展开。神煞通常只适合作为辅助参考，不建议单独下结论。';
    }
    default:
      return null;
  }
}

export function buildStructuredProfile(result, profile = {}) {
  const narrative = getNarrativeSummary(result);
  const birthInfo = result?.birthInfo || result?.inputBirthInfo || result?.solarBirthInfo || {};
  const wxCount = getWxCountObject(result);
  const todayPillar = result?.todayPillar || {};
  const liuNianPillar = result?.liuNianPillar || {};
  const dayStrengthScore = getDayStrengthScore(result?.dayStrength);
  const dayWuXing = textOf(result?.dayWuXing, '木');
  const todayWx = getTodayWx(todayPillar?.gan);
  const WX_SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
  const WX_KE = { 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' };
  let todayRelation = '';

  if (todayWx === dayWuXing) {
    todayRelation = '比肩同行，竞争之日';
  } else if (WX_SHENG[todayWx] === dayWuXing) {
    todayRelation = `${todayWx}生${dayWuXing}，印绶相助，贵人之日`;
  } else if (WX_SHENG[dayWuXing] === todayWx) {
    todayRelation = '日主生今日，食伤发挥，创造之日';
  } else if (WX_KE[todayWx] === dayWuXing) {
    todayRelation = `${todayWx}克${dayWuXing}，官杀当令，压力之日`;
  } else if (WX_KE[dayWuXing] === todayWx) {
    todayRelation = '日主克今日，财星出现，行动之日';
  }

  return {
    nickname: textOf(profile?.nickname || result?.nickname || result?.profile?.nickname),
    gender: textOf(profile?.gender || result?.gender || result?.birthInfo?.gender),
    city: textOf(profile?.city || result?.city || result?.birthCity || result?.profile?.city),
    role: textOf(profile?.role || result?.role || result?.profile?.role),
    focus: textOf(profile?.focus || result?.focus || result?.profile?.focus),
    core_summary: narrative.coreSummary,
    stage_summary: narrative.stageSummary,
    action_hints: narrative.actionHints,
    emotional_hint: narrative.emotionalHint,
    ten_god_summary: getTenGodSummary(result),
    strength_level: getStrengthLevel(result),
    primary_use_god: getPrimaryUseGod(result),
    dayun_theme: getDayunTheme(result),
    liunian_theme: getLiunianTheme(result),
    birth_year: textOf(birthInfo?.year),
    birth_month: textOf(birthInfo?.month),
    birth_day: textOf(birthInfo?.day),
    birth_hour: textOf(birthInfo?.hour),
    shengxiao: getResolvedZodiac(result),
    na_yin: getResolvedNaYin(result),
    day_gan: textOf(result?.dayGan),
    day_wuxing: dayWuXing,
    strength_score: dayStrengthScore,
    strength_label: dayStrengthScore >= 60 ? '身旺' : dayStrengthScore >= 40 ? '身中和' : '身弱',
    year_pillar: getPillarValue(result?.pillars || {}, 'year', 0),
    month_pillar: getPillarValue(result?.pillars || {}, 'month', 1),
    day_pillar: getPillarValue(result?.pillars || {}, 'day', 2),
    hour_pillar: getPillarValue(result?.pillars || {}, 'hour', 3),
    year_shishen: textOf(result?.shiShen?.year || result?.tenGods?.year),
    month_shishen: textOf(result?.shiShen?.month || result?.tenGods?.month),
    hour_shishen: textOf(result?.shiShen?.hour || result?.tenGods?.hour),
    pillar_ten_gods: summarizePillarTenGods(result),
    hidden_stems_summary: summarizeHiddenStems(result),
    shen_sha_summary: summarizeShenSha(result),
    structure_summary: summarizeStructureObservations(result),
    gui_ren: Array.isArray(result?.guiRen) ? result.guiRen.filter(Boolean) : [],
    wx_count: {
      木: Number(wxCount?.木 || 0),
      火: Number(wxCount?.火 || 0),
      土: Number(wxCount?.土 || 0),
      金: Number(wxCount?.金 || 0),
      水: Number(wxCount?.水 || 0),
    },
    today_pillar: `${textOf(todayPillar?.gan)}${textOf(todayPillar?.zhi)}`,
    today_relation: todayRelation || '今日关系平常，宜顺势而行',
    today_score: Number(result?.dailyFortune?.score || result?.dailyFortune?.energy || 75),
    liunian_pillar: getResolvedLiunianLabel(result),
    current_dayun: getCurrentDayunLabel(result),
    liunian_hint: textOf(result?.liuNianFortune?.summary || result?.liuNianFortune?.hint),
  };
}

function getDayStrengthScore(dayStrength) {
  if (typeof dayStrength === 'number') return dayStrength;
  const candidates = [dayStrength?.score, dayStrength?.value, dayStrength?.rawScore];
  for (const candidate of candidates) {
    const parsed = Number(candidate);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  return 50;
}

function getPillarDetail(result, key) {
  return result?.pillarDetails?.[key] || result?.pillarDetail?.[key] || {};
}

function summarizePillarTenGods(result) {
  return [
    ['年柱', 'year'],
    ['月柱', 'month'],
    ['日柱', 'day'],
    ['时柱', 'hour'],
  ]
    .map(([label, key]) => {
      const detail = getPillarDetail(result, key);
      const explicit = firstValid(result?.shiShen?.[key], result?.tenGods?.[key], detail?.stemTenGod);
      const branchGods = toList(detail?.branchTenGods).slice(0, 3);
      const summary = [explicit, branchGods.length ? `支神${branchGods.join('、')}` : ''].filter(Boolean).join(' / ');
      return summary ? `${label}${summary}` : '';
    })
    .filter(Boolean)
    .join('；');
}

function summarizeHiddenStems(result) {
  return [
    ['年', 'year'],
    ['月', 'month'],
    ['日', 'day'],
    ['时', 'hour'],
  ]
    .map(([label, key]) => {
      const detail = getPillarDetail(result, key);
      const stems = toList(detail?.hiddenStems || detail?.cangGan);
      const gods = toList(detail?.hiddenStemTenGods || detail?.hiddenTenGods);
      if (!stems.length) return '';
      return `${label}柱${stems.map((stem, index) => (textOf(gods[index]) ? `${stem}(${gods[index]})` : stem)).join('、')}`;
    })
    .filter(Boolean)
    .join('；');
}

function summarizeShenSha(result) {
  const details = result?.shenShaDetails || {};
  const parts = [
    ['年柱', 'year'],
    ['月柱', 'month'],
    ['日柱', 'day'],
    ['时柱', 'hour'],
  ]
    .map(([label, key]) => {
      const items = toList(details?.[key]).slice(0, 5);
      return items.length ? `${label}${items.join('、')}` : '';
    })
    .filter(Boolean);
  const extras = [...toList(result?.guiRen), ...toList(result?.wenChang), ...toList(result?.yiMa)].filter(Boolean);
  if (extras.length) parts.unshift(`补充神煞${Array.from(new Set(extras)).slice(0, 6).join('、')}`);
  return parts.join('；');
}

function summarizeStructureObservations(result) {
  const items = Array.isArray(result?.structureObservations)
    ? result.structureObservations
    : Array.isArray(result?.structureObservation)
      ? result.structureObservation
      : [];
  return items
    .slice(0, 8)
    .map((item) => {
      const name = firstValid(item?.name, item?.title, item?.label, item?.type);
      const effect = firstValid(item?.effect, item?.summary, item?.conclusion, item?.body);
      return name ? `${name}${effect ? `：${effect}` : ''}` : '';
    })
    .filter(Boolean)
    .join('；');
}

function getTodayWx(gan) {
  const WU_XING_MAP = {
    甲: '木',
    乙: '木',
    丙: '火',
    丁: '火',
    戊: '土',
    己: '土',
    庚: '金',
    辛: '金',
    壬: '水',
    癸: '水',
  };
  return WU_XING_MAP[gan] || '木';
}

export function buildUserProfile(baziResult, locale = 'zh-Hans') {
  if (!baziResult) {
    return locale === 'en'
      ? '(Profile not ready yet)'
      : '（用户尚未完成排盘，请提醒用户先填写出生信息）';
  }

  const {
    pillars = {},
    shiShen = {},
    wxCount: rawWxCount,
    dayStrength,
    naYin,
    shengXiao,
    gender,
    birthInfo: rawBirthInfo,
    dayGan,
    dayWuXing,
    daYun,
    dailyFortune,
    todayPillar = {},
    liuNianPillar = {},
    liuNianFortune,
    guiRen,
  } = baziResult;

  const wxCount = rawWxCount || getWxCountObject(baziResult);
  const birthInfo = rawBirthInfo || baziResult?.inputBirthInfo || baziResult?.solarBirthInfo || {};
  const genderValue = gender || birthInfo?.gender;
  const genderStr = genderValue === 'male' ? '男命' : genderValue === 'female' ? '女命' : '命盘';
  const dayStrengthScore = getDayStrengthScore(dayStrength);
  const strengthStr = dayStrengthScore >= 60 ? '身旺' : dayStrengthScore >= 40 ? '身中和' : '身弱';
  const dailyScore = dailyFortune?.score || dailyFortune?.energy || 75;

  const WX_SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
  const WX_KE = { 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' };
  const todayWx = getTodayWx(todayPillar?.gan);
  let todayRelation = '';

  if (todayWx === dayWuXing) {
    todayRelation = '比肩同行，竞争之日';
  } else if (WX_SHENG[todayWx] === dayWuXing) {
    todayRelation = `${todayWx}生${dayWuXing}，印绶相助，贵人之日`;
  } else if (WX_SHENG[dayWuXing] === todayWx) {
    todayRelation = '日主生今日，食伤发挥，创造之日';
  } else if (WX_KE[todayWx] === dayWuXing) {
    todayRelation = `${todayWx}克${dayWuXing}，官杀当令，压力之日`;
  } else if (WX_KE[dayWuXing] === todayWx) {
    todayRelation = '日主克今日，财星出现，行动之日';
  }

  if (locale === 'en') {
    return [
      '=== User Profile (BaZi Based) ===',
      `Birth: ${birthInfo?.year || '--'}-${birthInfo?.month || '--'}-${birthInfo?.day || '--'} ${birthInfo?.hour ?? '--'}:${birthInfo?.minute ?? '00'}`,
      `Gender: ${genderStr} | Zodiac: ${getResolvedZodiac(baziResult) || '--'}`,
      `Na Yin: ${baziResult?.naYin || baziResult?.dayNaYin || '--'}`,
      `Day Master: ${baziResult?.dayGan || '--'} (${baziResult?.dayWuXing || '--'}) | Strength: ${strengthStr}`,
      `Pillars: ${getPillarValue(pillars, 'year', 0)} / ${getPillarValue(pillars, 'month', 1)} / ${getPillarValue(pillars, 'day', 2)} / ${getPillarValue(pillars, 'hour', 3)}`,
      `Five Elements: ${getWxCountText(baziResult)}`,
      `Element Hint: ${getWxAnalysis(wxCount) || '--'}`,
      `Core Summary: ${narrative.coreSummary || '--'}`,
      `Stage Summary: ${narrative.stageSummary || '--'}`,
      `Action Hints: ${narrative.actionHints.join('；') || '--'}`,
      `Emotional Hint: ${narrative.emotionalHint || '--'}`,
      `Ten God Summary: ${tenGodSummary || '--'}`,
      `Today: ${(todayPillar?.gan || '')}${(todayPillar?.zhi || '') || '--'} | Current Year: ${(liuNianPillar?.gan || '')}${(liuNianPillar?.zhi || '') || '--'}`,
      `Today Energy Score: ${dailyScore}/100`,
      '=================================',
    ].join('\n');
  }

  return [
    '═══ 用户四柱八字档案 ═══',
    `${genderStr} | 生肖${shengXiao || getResolvedZodiac(baziResult) || '--'} | ${birthInfo?.year || '--'}年${birthInfo?.month || '--'}月${birthInfo?.day || '--'}日${birthInfo?.hour ?? '--'}时`,
    '',
    '四柱：',
    `  年柱 ${getPillarValue(pillars, 'year', 0)}（${shiShen?.year || '--'}）`,
    `  月柱 ${getPillarValue(pillars, 'month', 1)}（${shiShen?.month || '--'}）`,
    `  日柱 ${getPillarValue(pillars, 'day', 2)}（日主）`,
    `  时柱 ${getPillarValue(pillars, 'hour', 3)}（${shiShen?.hour || '--'}）`,
    '',
    `日主：${dayGan || '--'}${dayWuXing || '--'} | ${strengthStr}（${dayStrengthScore}分）`,
    `纳音：${getResolvedNaYin(baziResult) || '--'}`,
    `贵人：${Array.isArray(guiRen) && guiRen.length ? guiRen.join('、') : '无'}`,
    `十神结构：${summarizePillarTenGods(baziResult) || '未单独展开'}`,
    `藏干线索：${summarizeHiddenStems(baziResult) || '未单独展开'}`,
    `神煞线索：${summarizeShenSha(baziResult) || '未单独展开'}`,
    `冲合刑害：${summarizeStructureObservations(baziResult) || '未单独展开'}`,
    '',
    '五行分布：',
    `  木${wxCount?.木 || 0} 火${wxCount?.火 || 0} 土${wxCount?.土 || 0} 金${wxCount?.金 || 0} 水${wxCount?.水 || 0}`,
    `  ${`${(wxCount?.木 || 0) === 0 ? '缺木 ' : ''}${(wxCount?.火 || 0) === 0 ? '缺火 ' : ''}${(wxCount?.土 || 0) === 0 ? '缺土 ' : ''}${(wxCount?.金 || 0) === 0 ? '缺金 ' : ''}${(wxCount?.水 || 0) === 0 ? '缺水' : ''}`.trim() || '五行齐备'}`,
    '',
    '今日信息：',
    `  今日日柱：${(todayPillar?.gan || '')}${(todayPillar?.zhi || '') || '--'}`,
    `  今日与日主：${todayRelation || '今日关系平常，宜顺势而行'}`,
    `  今日能量：${dailyScore}/100`,
    '',
    `流年：${getResolvedLiunianLabel(baziResult)}（${new Date().getFullYear()}年）`,
    `当前大运：${getCurrentDayunLabel(baziResult)}`,
    `流年提示：${textOf(liuNianFortune?.summary || liuNianFortune?.hint || '', '--')}`,
    '═══════════════════════════',
  ].join('\n').trim();
}

function stripCodeFence(text = '') {
  return `${text}`
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

function buildMysticContext(profile = {}, locale = 'zh-Hans') {
  if (!profile || typeof profile !== 'object') return '';

  const wx = profile.wx_count || {};
  const pillarText = [profile.year_pillar, profile.month_pillar, profile.day_pillar, profile.hour_pillar]
    .filter(Boolean)
    .join(' / ');
  const shiShenParts = [
    profile.year_shishen ? `年柱十神：${profile.year_shishen}` : '',
    profile.month_shishen ? `月柱十神：${profile.month_shishen}` : '',
    profile.hour_shishen ? `时柱十神：${profile.hour_shishen}` : '',
  ].filter(Boolean);
  const pillarTenGodText = textOf(profile.pillar_ten_gods);
  const hiddenStemText = textOf(profile.hidden_stems_summary);
  const shenShaText = textOf(profile.shen_sha_summary);
  const structureText = textOf(profile.structure_summary);

  if (locale === 'en') {
    return [
      '【Mystic Context】',
      `Pillars: ${pillarText || '--'}`,
      `Day Master: ${profile.day_gan || '--'}${profile.day_wuxing || ''} | ${profile.strength_label || profile.strength_level || '--'} (${profile.strength_score || '--'})`,
      `Na Yin: ${profile.na_yin || '--'} | Zodiac: ${profile.shengxiao || '--'}`,
      `Five Elements: Wood ${wx.木 || 0}, Fire ${wx.火 || 0}, Earth ${wx.土 || 0}, Metal ${wx.金 || 0}, Water ${wx.水 || 0}`,
      `Today: ${profile.today_pillar || '--'} | Relation to Day Master: ${profile.today_relation || '--'} | Score: ${profile.today_score || '--'}`,
      `Current Dayun: ${profile.current_dayun || '--'} | Current Liunian: ${profile.liunian_pillar || '--'}`,
      `Liunian Hint: ${profile.liunian_hint || '--'}`,
      `Ten Gods: ${shiShenParts.join('；') || profile.ten_god_summary || '--'}`,
      `Pillar Ten Gods: ${pillarTenGodText || '--'}`,
      `Hidden Stems: ${hiddenStemText || '--'}`,
      `Shen Sha: ${shenShaText || '--'}`,
      `Clashes and Combinations: ${structureText || '--'}`,
      `Modern interpretation: Explain the BaZi structure in practical language, and translate terms into current pressure, timing, relationships, decision-making, and execution rhythm.`,
    ].join('\n');
  }

  return [
    '【玄学结构背景】',
    `- 四柱：${pillarText || '未提供'}`,
    `- 日主：${profile.day_gan || '--'}${profile.day_wuxing || ''} | ${profile.strength_label || profile.strength_level || '未明确'}（${profile.strength_score || '--'}分）`,
    `- 纳音：${profile.na_yin || '未提供'} | 生肖：${profile.shengxiao || '未提供'}`,
    `- 五行分布：木${wx.木 || 0} 火${wx.火 || 0} 土${wx.土 || 0} 金${wx.金 || 0} 水${wx.水 || 0}`,
    `- 今日日柱：${profile.today_pillar || '未提供'}`,
    `- 今日与日主关系：${profile.today_relation || '未提供'}`,
    `- 今日能量：${profile.today_score || '--'}/100`,
    `- 当前大运：${profile.current_dayun || '未提供'}`,
    `- 当前流年：${profile.liunian_pillar || '未提供'}`,
    `- 流年提示：${profile.liunian_hint || '未提供'}`,
    `- 十神线索：${shiShenParts.join('；') || profile.ten_god_summary || '未提供'}`,
    `- 柱位十神：${pillarTenGodText || '未单独展开'}`,
    `- 地支藏干：${hiddenStemText || '未单独展开'}`,
    `- 神煞线索：${shenShaText || '未单独展开'}`,
    `- 冲合刑害：${structureText || '未单独展开'}`,
    `- 灵性与助运解释框架：风水、开运、护身、招财、贵人、定心、提势、执行力等诉求，需要结合本命偏颇、当前大运流年与整体配置来判断，不可一概而论。`,
    `- 小众灵性线索：若用户提到泰国经文符、刺符、招财符、护身符、左右手搭配、后背主符等，请从“立势、护运、起势、收局、聚财、稳心”这些结构上判断。`,
    `- 解释要求：既要保留四柱八字、五行生克、大运流年等专业判断，也要翻译成现代人能听懂的压力、关系、节奏、选择与行动建议。`,
  ].join('\n');
}

async function callGPT(messagesOrConfig) {
  if (Array.isArray(messagesOrConfig)) {
    if (hasOpenAIConfig()) {
      const { text } = await requestOpenAIText({
        input: messagesOrConfig,
        model: 'gpt-4o',
        maxOutputTokens: 500,
      });
      return text || '';
    }

    throw new Error('AI 服务尚未配置。请先配置 openaiApiKey。');
  }

  const {
    instructions = SYSTEM_PROMPT,
    input,
    chart,
    profile,
    model = DEFAULT_MODEL,
    maxOutputTokens = 500,
    memberTier,
    userKey,
  } = messagesOrConfig || {};

  const structuredProfile = buildStructuredProfile(chart, profile);
  const mysticContext = buildMysticContext(structuredProfile, 'zh-Hans');
  const enhancedInput = [mysticContext, input].filter(Boolean).join('\n\n');

  if (hasAIBackendConfig()) {
    const payload = await requestAIReadingFromBackend({
      instructions,
      input: enhancedInput,
      chart,
      profile: structuredProfile,
      model,
      locale: 'zh-Hans',
      memberTier,
      userKey,
    });
    return payload?.data?.text || payload?.text || '';
  }

  if (hasOpenAIConfig()) {
    const config = getOpenAIConfig();
    const { text } = await requestOpenAIText({
      instructions,
      input: enhancedInput,
      model: model || config.model,
      maxOutputTokens,
    });
    return text || '';
  }

  throw new Error('AI 服务尚未配置。请先配置 aiBackendUrl 或 openaiApiKey。');
}

function compressChatHistory(chatHistory = [], currentUserMessage = '') {
  const history = Array.isArray(chatHistory)
    ? chatHistory
        .map((item) => ({
          role: item?.role === 'assistant' ? 'assistant' : 'user',
          content: textOf(item?.content),
        }))
        .filter((item) => item.content)
    : [];

  const recent = history.slice(-6);
  const lastAssistant = [...recent].reverse().find((item) => item.role === 'assistant');
  const lastUserBeforeCurrent = [...recent].reverse().find((item) => item.role === 'user');
  const pendingQuestion = lastAssistant?.content.match(/([^。！？\n]*[？?])\s*$/)?.[1] || '';
  const current = textOf(currentUserMessage);
  const answersPreviousQuestion =
    Boolean(pendingQuestion) &&
    !/[？?]/.test(current) &&
    current.length > 0;
  const correctionSignal = /(不对|说错|答非所问|重新说|不是这个意思|你又绕了)/.test(current);
  const directAskSignal = /(直接说|直接给答案|别绕|别分析太多|你就说结论)/.test(current);

  const summaryLines = [
    lastUserBeforeCurrent ? `- 上一轮用户重点：${lastUserBeforeCurrent.content}` : '',
    lastAssistant ? `- 上一轮你的回答重点：${lastAssistant.content}` : '',
    pendingQuestion ? `- 你上一轮结尾追问：${pendingQuestion}` : '',
    answersPreviousQuestion ? `- 用户这句是在直接回答你上一轮的追问，不要重新开题。` : '',
    correctionSignal ? `- 用户这句是在纠正你，说明上一轮没有答到点上。这次请直接重答，不要复读。` : '',
    directAskSignal ? `- 用户明确要直接结论，请先给判断，再补一句原因和建议。` : '',
  ].filter(Boolean);

  return {
    normalizedHistory: history.slice(-4),
    contextSummary: summaryLines.length
      ? ['【对话压缩摘要】', ...summaryLines].join('\n')
      : '',
  };
}

export async function aiChat(userMessage, baziResult, chatHistory = [], options = {}) {
  const profile = buildUserProfile(baziResult);
  const history = Array.isArray(chatHistory)
    ? chatHistory
        .map((item) => ({
          role: item?.role === 'assistant' ? 'assistant' : 'user',
          content: textOf(item?.content),
        }))
        .filter((item) => item.content)
    : [];

  let compressedContext = '';
  if (history.length > 2) {
    const summaryMessages = [
      {
        role: 'system',
        content: '你是一个上下文压缩助手。把以下对话历史压缩成100字以内的要点，保留关键信息、用户的核心困惑、上一轮未完结点。只输出要点，不要解释。',
      },
      {
        role: 'user',
        content: `对话历史：\n${history.map((item) => `${item.role === 'user' ? '用户' : '明己'}：${item.content}`).join('\n')}`,
      },
    ];

    try {
      compressedContext = textOf(await callGPT(summaryMessages));
    } catch {
      compressedContext = history
        .slice(-2)
        .map((item) => `${item.role === 'user' ? '用户' : '明己'}：${item.content}`)
        .join('\n');
    }
  }

  const contextPart = compressedContext
    ? `\n【近期对话摘要】\n${compressedContext}\n`
    : '';

  const userPrompt = `${profile}
${contextPart}
【用户当前问题】${userMessage}`.trim();

  if (hasAIBackendConfig()) {
    const structuredProfile = buildStructuredProfile(baziResult, options.profile);
    const payload = await requestAIChatFromBackend({
      userProfile: profile,
      message: userMessage,
      chart: baziResult,
      profile: structuredProfile,
      userKey: options.userKey,
      history: history.slice(-4),
    });
    return payload?.data?.text || payload?.text || '';
  }

  const messages = [
    { role: 'system', content: `${SYSTEM_PROMPT}\n\n${VOICE_PATCH}` },
    { role: 'user', content: userPrompt },
  ];

  return await callGPT(messages);
}

export async function aiDailyInsight(baziResult, currentJieqi = '', options = {}) {
  const profileText = buildUserProfile(baziResult);
  const structuredProfile = buildStructuredProfile(baziResult, options.profile);
  const today = new Date();
  const dateStr = `${today.getMonth() + 1}月${today.getDate()}日`;

  const result = await callGPT({
    input: [
      profileText,
      '【结构化摘要】',
      `- 核心状态：${structuredProfile.core_summary || '未提供'}`,
      `- 当前阶段：${structuredProfile.stage_summary || '未提供'}`,
      `- 行动建议：${toList(structuredProfile.action_hints).join('；') || '未提供'}`,
      `- 情绪提醒：${structuredProfile.emotional_hint || '未提供'}`,
      '',
      `今天是${dateStr}，当前节气：${currentJieqi || '未提供'}。请给这位用户生成今天的个性化洞察。`,
      '请只返回 JSON：{"keyword":"","reminder":"","suggestions":["","",""]}',
    ].join('\n'),
    chart: baziResult,
    profile: options.profile,
    model: DEFAULT_MODEL,
    maxOutputTokens: 320,
    memberTier: resolveMemberTier(options),
    userKey: options.userKey,
  });

  try {
    return JSON.parse(stripCodeFence(result));
  } catch {
    return { keyword: '稳中求准', reminder: stripCodeFence(result), suggestions: [] };
  }
}

export async function aiAnalyzeEmotion(emotionLog, baziResult, options = {}) {
  const profileText = buildUserProfile(baziResult);
  const structuredProfile = buildStructuredProfile(baziResult, options.profile);
  return callGPT({
    input: [
      profileText,
      '【本次话题】情绪 / 内耗 / 恢复节奏',
      `【结构摘要】核心状态：${structuredProfile.core_summary || '未提供'}；当前阶段：${structuredProfile.stage_summary || '未提供'}；情绪提醒：${structuredProfile.emotional_hint || '未提供'}`,
      '【用户原话】',
      emotionLog,
    ].join('\n'),
    chart: baziResult,
    profile: options.profile,
    model: DEFAULT_MODEL,
    maxOutputTokens: 360,
    memberTier: resolveMemberTier(options),
    userKey: options.userKey,
  });
}

export async function aiDecisionSupport(situation, optionsText, baziResult, options = {}) {
  const profileText = buildUserProfile(baziResult);
  const structuredProfile = buildStructuredProfile(baziResult, options.profile);
  return callGPT({
    input: [
      profileText,
      '【本次话题】事业 / 方向 / 决策',
      `【结构摘要】核心状态：${structuredProfile.core_summary || '未提供'}；当前阶段：${structuredProfile.stage_summary || '未提供'}；行动建议：${toList(structuredProfile.action_hints).join('；') || '未提供'}`,
      '【用户原话】',
      `${situation}\n可选方案：${optionsText || '未提供'}`,
    ].join('\n'),
    chart: baziResult,
    profile: options.profile,
    model: DEFAULT_MODEL,
    maxOutputTokens: 360,
    memberTier: resolveMemberTier(options),
    userKey: options.userKey,
  });
}

export async function aiRelationshipInsight(situation, baziResult, options = {}) {
  const profileText = buildUserProfile(baziResult);
  const structuredProfile = buildStructuredProfile(baziResult, options.profile);
  return callGPT({
    input: [
      profileText,
      '【本次话题】关系 / 边界 / 沟通',
      `【结构摘要】核心状态：${structuredProfile.core_summary || '未提供'}；当前阶段：${structuredProfile.stage_summary || '未提供'}；情绪提醒：${structuredProfile.emotional_hint || '未提供'}`,
      '【用户原话】',
      situation,
    ].join('\n'),
    chart: baziResult,
    profile: options.profile,
    model: DEFAULT_MODEL,
    maxOutputTokens: 380,
    memberTier: resolveMemberTier(options),
    userKey: options.userKey,
  });
}

export async function transcribeVoiceInput(uri, options = {}) {
  if (!uri) throw new Error('没有可转写的语音文件。');

  if (hasAIBackendConfig()) {
    const payload = await requestAITranscriptionFromBackend({
      uri,
      mimeType: options.mimeType || 'audio/m4a',
      fileName: options.fileName || 'mingme-voice.m4a',
      model: options.model || 'whisper-1',
      language: options.language || 'zh',
      prompt: options.prompt || '以下语音来自用户与明己 AI 的中文对话，请尽量按自然中文转写。',
    });
    return payload?.data?.text || payload?.text || '';
  }

  if (!hasOpenAIConfig()) {
    throw new Error('语音输入尚未配置。请先配置 aiBackendUrl 或 openaiApiKey。');
  }

  const config = getOpenAIConfig();
  const { text } = await requestOpenAIAudioTranscription({
    uri,
    mimeType: options.mimeType || 'audio/m4a',
    fileName: options.fileName || 'mingme-voice.m4a',
    model: options.model || 'whisper-1',
    language: options.language || 'zh',
    prompt: options.prompt || '以下语音来自用户与明己 AI 的中文对话，请尽量按自然中文转写。',
    baseUrl: config.baseUrl,
  });
  return text || '';
}

function getTodayKey() {
  return `${USAGE_KEY}${new Date().toISOString().slice(0, 10)}`;
}

export async function getTodayUsage(options = {}) {
  const quotaOptions = normalizeQuotaOptions(options);
  if (hasAIBackendConfig() && quotaOptions.chart) {
    const payload = await requestAIQuotaStatusFromBackend({
      chart: quotaOptions.chart,
      profile: buildStructuredProfile(quotaOptions.chart, quotaOptions.profile),
      userKey: quotaOptions.userKey,
    });
    return Number(payload?.data?.quota?.used || 0);
  }

  try {
    return parseInt((await AsyncStorage.getItem(getTodayKey())) || '0', 10) || 0;
  } catch {
    return 0;
  }
}

export async function incrementUsage(options = {}) {
  const quotaOptions = normalizeQuotaOptions(options);
  if (hasAIBackendConfig() && quotaOptions.chart) {
    return getTodayUsage(quotaOptions);
  }

  const current = await getTodayUsage(quotaOptions);
  const next = current + 1;
  try {
    await AsyncStorage.setItem(getTodayKey(), `${next}`);
  } catch {
    // ignore local usage write failures
  }
  return next;
}

export async function canUseAI(options = false) {
  const quotaOptions = normalizeQuotaOptions(options);
  if (hasAIBackendConfig() && quotaOptions.chart) {
    const payload = await requestAIQuotaStatusFromBackend({
      chart: quotaOptions.chart,
      profile: buildStructuredProfile(quotaOptions.chart, quotaOptions.profile),
      userKey: quotaOptions.userKey,
    });
    return !!payload?.data?.quota?.allowed;
  }

  if (quotaOptions.isPremium) return true;
  return (await getTodayUsage(quotaOptions)) < DAILY_LIMIT;
}

export async function getRemainingCount(options = false) {
  const quotaOptions = normalizeQuotaOptions(options);
  if (hasAIBackendConfig() && quotaOptions.chart) {
    const payload = await requestAIQuotaStatusFromBackend({
      chart: quotaOptions.chart,
      profile: buildStructuredProfile(quotaOptions.chart, quotaOptions.profile),
      userKey: quotaOptions.userKey,
    });
    return Number(payload?.data?.quota?.remaining ?? 0);
  }

  if (quotaOptions.isPremium) return 999;
  return Math.max(0, DAILY_LIMIT - (await getTodayUsage(quotaOptions)));
}

export { DEFAULT_MODEL, SYSTEM_PROMPT };
