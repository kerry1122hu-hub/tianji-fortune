import { getShiShen } from '../utils/baziEngine';

export type StrengthLevel = '极弱' | '偏弱' | '中和' | '偏强' | '极强';
export type Season = '春' | '夏' | '秋' | '冬';
export type Preference = '喜' | '忌' | '中性偏喜' | '中性偏忌' | '中性';
export type FiveGod = '比劫' | '印星' | '食伤' | '财星' | '官杀';
export type UseGodElement = 'wood' | 'fire' | 'earth' | 'metal' | 'water';
export type ImpactLevel = '低' | '中' | '中上' | '高';
export type TrendDirection = '上升' | '调整' | '压力' | '波动' | '转折';
export type NarrativeTone = '稳健' | '进取' | '修复' | '提醒';

export type StrengthRuleInput = {
  pillars: { year: { stem: string; branch: string }; month: { stem: string; branch: string }; day: { stem: string; branch: string }; hour: { stem: string; branch: string } };
  dayMaster: string;
  monthCommand: string;
  season: Season;
  elementScoresRaw: Record<string, number>;
  branchRelations?: Record<string, string[]>;
  currentDaYun?: { stem: string; branch: string } | null;
  currentLiuNian?: { stem: string; branch: string } | null;
  precomputedStrengthLevel?: StrengthLevel;
  precomputedStrengthScore?: number;
};
export type StrengthRuleAnalysis = { level: StrengthLevel; score: number; deLing: number; deDi: number; deZhu: number; shouZhi: number; flowAdjustment: number; reasons: string[]; debug: Record<string, unknown> };
export type TenGodPreferenceItem = { god: FiveGod; preference: Preference; weight: number; reasons: string[]; debug: Record<string, unknown> };
export type TenGodPreference = { favored: string[]; avoided: string[]; summary: string; stemCounts: Record<FiveGod, number>; hiddenCounts: Record<FiveGod, number>; reasons: string[]; items: TenGodPreferenceItem[] };
export type UseGodAnalysis = { primaryUseGod: string; secondaryUseGod: string[]; avoidGods: string[]; cautionGods: string[]; strategy: string; reasons: string[]; debug: Record<string, unknown> };
export type LuckAnalysis = { dayunTheme: string; liunianTheme: string; dayunDirection: TrendDirection; liunianDirection: TrendDirection; impact: ImpactLevel; opportunityAreas: string[]; riskAreas: string[]; actionAdvice: string[]; reasons: string[]; debug: Record<string, unknown> };
export type ProductNarrative = { coreSummary: string; stageSummary: string; actionHints: string[]; emotionalHint: string; tone: NarrativeTone; reasons: string[]; debug: Record<string, unknown> };

const STEM_ELEMENT: Record<string, UseGodElement> = { 甲: 'wood', 乙: 'wood', 丙: 'fire', 丁: 'fire', 戊: 'earth', 己: 'earth', 庚: 'metal', 辛: 'metal', 壬: 'water', 癸: 'water' };
const BRANCH_ELEMENT: Record<string, UseGodElement> = { 子: 'water', 丑: 'earth', 寅: 'wood', 卯: 'wood', 辰: 'earth', 巳: 'fire', 午: 'fire', 未: 'earth', 申: 'metal', 酉: 'metal', 戌: 'earth', 亥: 'water' };
const ELEMENT_CN: Record<UseGodElement, string> = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' };
const GENERATES: Record<UseGodElement, UseGodElement> = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };
const CONTROLS: Record<UseGodElement, UseGodElement> = { wood: 'earth', fire: 'metal', earth: 'water', metal: 'wood', water: 'fire' };
const BASE_PREF: Record<StrengthLevel, Record<FiveGod, Preference>> = {
  极弱: { 比劫: '喜', 印星: '喜', 食伤: '忌', 财星: '忌', 官杀: '中性偏忌' },
  偏弱: { 比劫: '喜', 印星: '喜', 食伤: '中性偏忌', 财星: '中性偏忌', 官杀: '中性偏忌' },
  中和: { 比劫: '中性', 印星: '中性', 食伤: '中性偏喜', 财星: '中性偏喜', 官杀: '中性偏喜' },
  偏强: { 比劫: '中性偏忌', 印星: '中性偏忌', 食伤: '喜', 财星: '喜', 官杀: '中性偏喜' },
  极强: { 比劫: '忌', 印星: '忌', 食伤: '喜', 财星: '喜', 官杀: '喜' },
};
const PREF_WEIGHT: Record<Preference, number> = { 喜: 0.88, 中性偏喜: 0.68, 中性: 0.5, 中性偏忌: 0.34, 忌: 0.14 };
const CORE_MAP: Record<StrengthLevel, string> = {
  极弱: '你现在更需要先稳住承压能力，再谈外部结果。',
  偏弱: '你不是没能力，而是容易被责任和消耗拖住。',
  中和: '你的底盘并不差，关键在于把力用在最重要的地方。',
  偏强: '你的执行力不弱，但容易在确定方向后用力过猛。',
  极强: '你真正要防的不是不敢动，而是太容易自己扛太多、推太快。',
};
const EMOTION_MAP: Record<StrengthLevel, string> = {
  极弱: '这段时间更需要先稳住自己，而不是证明自己。',
  偏弱: '真正拖慢你的，往往是长期没被整理的内在拉扯。',
  中和: '你现在更需要的，不是更多信息，而是更少内耗。',
  偏强: '有些问题不是做得不够，而是推进过猛后忽略了边界。',
  极强: '你真正要防的，是自己把节奏拉得太满。',
};
const GOD_LABEL: Record<FiveGod, string> = { 比劫: '自主性与硬扛倾向', 印星: '安全感与准备需求', 食伤: '表达与输出驱动', 财星: '结果导向与资源整合', 官杀: '责任、规则与压力' };

const round = (value: number) => Math.round(value * 100) / 100;
const dedupe = (items: Array<string | null | undefined>) => items.filter(Boolean).filter((item, index, list) => list.indexOf(item as string) === index) as string[];
const stemElement = (stem: string) => STEM_ELEMENT[stem];
const branchElement = (branch: string) => BRANCH_ELEMENT[branch];
const classifyStrength = (score: number): StrengthLevel => (score <= -20 ? '极弱' : score <= 5 ? '偏弱' : score <= 25 ? '中和' : score <= 45 ? '偏强' : '极强');
const classifyDirection = (score: number): TrendDirection => (score >= 18 ? '上升' : score >= 6 ? '调整' : score >= -5 ? '波动' : score >= -16 ? '压力' : '转折');
const classifyImpact = (dayunScore: number, liunianScore: number): ImpactLevel => Math.max(Math.abs(dayunScore), Math.abs(liunianScore)) >= 24 ? '高' : Math.max(Math.abs(dayunScore), Math.abs(liunianScore)) >= 14 ? '中上' : Math.max(Math.abs(dayunScore), Math.abs(liunianScore)) >= 6 ? '中' : '低';

function countTenGods(input: StrengthRuleInput, includeHidden = false): Record<FiveGod, number> {
  const counts: Record<FiveGod, number> = { 比劫: 0, 印星: 0, 食伤: 0, 财星: 0, 官杀: 0 };
  Object.entries(input.pillars).forEach(([pillarName, pillar]) => {
    if (pillarName !== 'day') {
      const god = getShiShen(input.dayMaster, pillar.stem) as FiveGod;
      if (counts[god] !== undefined) counts[god] += 1;
    }
    if (includeHidden) {
      const map: Record<string, string[]> = { 子: ['癸'], 丑: ['己', '癸', '辛'], 寅: ['甲', '丙', '戊'], 卯: ['乙'], 辰: ['戊', '乙', '癸'], 巳: ['丙', '庚', '戊'], 午: ['丁', '己'], 未: ['己', '丁', '乙'], 申: ['庚', '壬', '戊'], 酉: ['辛'], 戌: ['戊', '辛', '丁'], 亥: ['壬', '甲'] };
      (map[pillar.branch] || []).forEach((stem) => {
        const god = getShiShen(input.dayMaster, stem) as FiveGod;
        if (counts[god] !== undefined) counts[god] += 1;
      });
    }
  });
  return counts;
}

export function analyzeStrengthRules(input: StrengthRuleInput): StrengthRuleAnalysis {
  const deLing = (() => {
    const dm = stemElement(input.dayMaster); const month = branchElement(input.monthCommand);
    if (month === dm) return 35; if (GENERATES[month] === dm) return 15; if (GENERATES[dm] === month) return -15; if (CONTROLS[month] === dm) return -25; return -10;
  })();
  const stemCounts = countTenGods(input, false);
  const hiddenCounts = countTenGods(input, true);
  const deDi = (hiddenCounts.比劫 + hiddenCounts.印星) * 4;
  const deZhu = (stemCounts.比劫 + stemCounts.印星) * 8;
  const shouZhi = stemCounts.财星 * 8 + stemCounts.官杀 * 12 + stemCounts.食伤 * 6;
  const values = Object.values(input.elementScoresRaw || {}).map((value) => Number(value) || 0);
  const flowAdjustment = values.length ? (Math.max(...values) - Math.min(...values) >= 4.5 ? -10 : Math.max(...values) - Math.min(...values) <= 1.5 ? 6 : 0) : 0;
  const internalScore = deLing + deDi + deZhu - shouZhi + flowAdjustment;
  const score = typeof input.precomputedStrengthScore === 'number' ? input.precomputedStrengthScore : internalScore;
  const level = input.precomputedStrengthLevel || classifyStrength(internalScore);
  return {
    level,
    score: round(score),
    deLing,
    deDi,
    deZhu,
    shouZhi,
    flowAdjustment,
    reasons: dedupe([
      input.precomputedStrengthLevel ? `日主强弱已按新版评分引擎校准为「${input.precomputedStrengthLevel}」` : null,
      level === '极弱' || level === '偏弱' ? '整体判断偏弱，后续喜忌应优先考虑扶身与调候。' : level === '偏强' || level === '极强' ? '整体判断偏强，后续喜忌应优先考虑泄耗与制衡。' : '整体判断接近中和，喜忌更依赖具体结构与组合。',
    ]),
    debug: { stemCounts, hiddenCounts, precomputedStrengthLevel: input.precomputedStrengthLevel || null, precomputedStrengthScore: input.precomputedStrengthScore ?? null },
  };
}
function preferenceStep(base: Preference, steps: number): Preference {
  const up: Record<Preference, Preference> = { 忌: '中性偏忌', 中性偏忌: '中性', 中性: '中性偏喜', 中性偏喜: '喜', 喜: '喜' };
  const down: Record<Preference, Preference> = { 喜: '中性偏喜', 中性偏喜: '中性', 中性: '中性偏忌', 中性偏忌: '忌', 忌: '忌' };
  let current = base;
  if (steps > 0) for (let i = 0; i < steps; i += 1) current = up[current];
  if (steps < 0) for (let i = 0; i < Math.abs(steps); i += 1) current = down[current];
  return current;
}

export function analyzeTenGodPreference(input: StrengthRuleInput, strengthLevel: StrengthLevel): TenGodPreference {
  const strength = analyzeStrengthRules(input);
  const stemCounts = countTenGods(input, false);
  const hiddenCounts = countTenGods(input, true);
  const monthStemMap: Record<UseGodElement, string> = { wood: '甲', fire: '丙', earth: '戊', metal: '庚', water: '壬' };
  const monthGod = getShiShen(input.dayMaster, monthStemMap[branchElement(input.monthCommand)]) as FiveGod;
  const items = (['比劫', '印星', '食伤', '财星', '官杀'] as FiveGod[]).map((god) => {
    const count = stemCounts[god] + hiddenCounts[god];
    const steps = (count >= 4 ? -1 : 0) + (monthGod === god ? 1 : 0);
    const preference = preferenceStep(BASE_PREF[strengthLevel || strength.level][god], steps);
    return { god, preference, weight: PREF_WEIGHT[preference], reasons: [`基础判断：${strengthLevel || strength.level} -> ${god}${preference}`], debug: { count, monthGod } };
  });
  const summary = strength.level === '极弱' || strength.level === '偏弱' ? '命局偏弱，十神喜生扶帮身，宜以印比为先，慎用财官食伤。' : strength.level === '偏强' || strength.level === '极强' ? '命局偏强，十神喜泄耗制衡，宜让食伤、财星、官杀参与平衡。' : '命局趋于中和，十神宜看组合与位置，不宜只凭单一喜忌下结论。';
  return {
    favored: items.filter((item) => item.preference === '喜' || item.preference === '中性偏喜').sort((a, b) => b.weight - a.weight).map((item) => item.god),
    avoided: items.filter((item) => item.preference === '忌' || item.preference === '中性偏忌').sort((a, b) => a.weight - b.weight).map((item) => item.god),
    summary,
    stemCounts,
    hiddenCounts,
    reasons: [summary, `透干最明显的十神：${Object.entries(stemCounts).filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]).map(([name, count]) => `${name}${count}`).join('、') || '未见明显偏向'}`],
    items,
  };
}

export function analyzeUseGod(input: StrengthRuleInput, strength: StrengthRuleAnalysis, tenGodPreference?: TenGodPreference): UseGodAnalysis {
  const effectiveStrength = strength || analyzeStrengthRules(input);
  const supportNeed = effectiveStrength.level === '极弱' || effectiveStrength.level === '偏弱' ? '扶身' : effectiveStrength.level === '偏强' || effectiveStrength.level === '极强' ? '泄耗制' : '平衡';
  const primaryElement: UseGodElement = supportNeed === '扶身' ? stemElement(input.dayMaster) : supportNeed === '泄耗制' ? GENERATES[stemElement(input.dayMaster)] : input.season === '冬' ? 'fire' : input.season === '夏' ? 'water' : 'earth';
  const secondaryUseGod = dedupe([ELEMENT_CN[GENERATES[primaryElement]], supportNeed === '泄耗制' ? ELEMENT_CN[CONTROLS[stemElement(input.dayMaster)]] : null]).slice(0, 2);
  const pref = tenGodPreference || analyzeTenGodPreference(input, effectiveStrength.level);
  return {
    primaryUseGod: ELEMENT_CN[primaryElement],
    secondaryUseGod,
    avoidGods: pref.avoided.slice(0, 2),
    cautionGods: pref.items.filter((item) => item.preference === '中性偏忌').map((item) => item.god).slice(0, 2),
    strategy: supportNeed === '扶身' ? `先扶身稳住，再考虑结果与扩张；当前以“${ELEMENT_CN[primaryElement]}”为先。` : supportNeed === '泄耗制' ? `先做泄耗与制衡，别再一味加码；当前以“${ELEMENT_CN[primaryElement]}”为先。` : `整体更适合顺着结构做平衡调整；当前以“${ELEMENT_CN[primaryElement]}”为先。`,
    reasons: [`当前主用神方向落在“${ELEMENT_CN[primaryElement]}”。`, pref.summary],
    debug: { strengthLevel: effectiveStrength.level, strengthScore: effectiveStrength.score, supportNeed },
  };
}

function scoreLuckPillar(input: StrengthRuleInput, pillar: { stem: string; branch: string } | null | undefined, strength: StrengthRuleAnalysis, useGod: UseGodAnalysis) {
  if (!pillar) return { score: 0, reasons: ['当前阶段未提供对应运势柱。'], debug: {} };
  const god = getShiShen(input.dayMaster, pillar.stem) as FiveGod;
  let score = 0;
  const reasons: string[] = [];
  if ((strength.level === '偏弱' || strength.level === '极弱') && (god === '印星' || god === '比劫')) { score += 12; reasons.push('日主偏弱，此运带来扶身信号。'); }
  if ((strength.level === '偏弱' || strength.level === '极弱') && (god === '财星' || god === '官杀' || god === '食伤')) { score -= 10; reasons.push('日主偏弱，此运带来耗泄克压压力。'); }
  if ((strength.level === '偏强' || strength.level === '极强') && (god === '食伤' || god === '财星' || god === '官杀')) { score += 10; reasons.push('日主偏强，此运带来泄耗制衡。'); }
  if ((strength.level === '偏强' || strength.level === '极强') && (god === '比劫' || god === '印星')) { score -= 8; reasons.push('日主偏强，此运再来帮扶，失衡加剧。'); }
  if (ELEMENT_CN[stemElement(pillar.stem)] === useGod.primaryUseGod) { score += 8; reasons.push('此运天干与当前用神方向一致。'); }
  return { score: round(score), reasons, debug: { god } };
}

export function analyzeLuck(input: StrengthRuleInput, strength?: StrengthRuleAnalysis, tenGodPreference?: TenGodPreference, useGod?: UseGodAnalysis): LuckAnalysis {
  const effectiveStrength = strength || analyzeStrengthRules(input);
  const effectiveTenGod = tenGodPreference || analyzeTenGodPreference(input, effectiveStrength.level);
  const effectiveUseGod = useGod || analyzeUseGod(input, effectiveStrength, effectiveTenGod);
  const dayunResult = scoreLuckPillar(input, input.currentDaYun, effectiveStrength, effectiveUseGod);
  const liunianResult = scoreLuckPillar(input, input.currentLiuNian, effectiveStrength, effectiveUseGod);
  const dayunDirection = classifyDirection(dayunResult.score);
  const liunianDirection = classifyDirection(liunianResult.score);
  const opportunityAreas = dedupe([
    ELEMENT_CN[stemElement(input.currentDaYun?.stem || input.dayMaster)] === '木' ? '主动出击' : null,
    ELEMENT_CN[stemElement(input.currentDaYun?.stem || input.dayMaster)] === '火' ? '表达输出' : null,
    ELEMENT_CN[stemElement(input.currentDaYun?.stem || input.dayMaster)] === '土' ? '规则建立' : null,
    ELEMENT_CN[stemElement(input.currentDaYun?.stem || input.dayMaster)] === '金' ? '结构优化' : null,
    ELEMENT_CN[stemElement(input.currentDaYun?.stem || input.dayMaster)] === '水' ? '资源整合' : null,
  ]).slice(0, 3);
  const riskAreas = dedupe([
    effectiveStrength.level === '偏弱' || effectiveStrength.level === '极弱' ? '过度消耗' : null,
    effectiveStrength.level === '偏强' || effectiveStrength.level === '极强' ? '固执硬扛' : null,
    effectiveUseGod.primaryUseGod === '金' || effectiveUseGod.primaryUseGod === '水' ? '计划反复' : null,
  ]).slice(0, 3);
  const actionAdvice = dedupe([
    dayunDirection === '上升' ? '现在适合推进关键事项，但别同时铺太多线。' : null,
    dayunDirection === '调整' ? '先把主线拉直，再考虑加速。' : null,
    dayunDirection === '压力' ? '重要的是保住节奏，而不是硬扛结果。' : null,
    liunianDirection === '波动' ? '有机会也有干扰，先稳判断再出手。' : null,
    `当前更适合往“${effectiveUseGod.primaryUseGod}”对应的方向去调整自己。`,
  ]).slice(0, 5);
  return {
    dayunTheme: dayunDirection === '上升' ? '这一步更像往上提气，适合推进主线。' : dayunDirection === '调整' ? '这一步更像调整结构，先修正再提速。' : dayunDirection === '压力' ? '这一步会更考验承压与节奏控制。' : dayunDirection === '波动' ? '这一步机会和干扰会并行出现。' : '这一步带有明显转折意味，旧方法需要更新。',
    liunianTheme: liunianDirection === '上升' ? '今年更适合把能落地的事往前推。' : liunianDirection === '调整' ? '今年更适合做取舍、做梳理、做重排。' : liunianDirection === '压力' ? '今年先守住节奏，比追求快更重要。' : liunianDirection === '波动' ? '今年会有起伏，判断要比情绪更稳。' : '今年的重点是转弯，而不是硬顶。',
    dayunDirection,
    liunianDirection,
    impact: classifyImpact(dayunResult.score, liunianResult.score),
    opportunityAreas,
    riskAreas,
    actionAdvice,
    reasons: dedupe([...dayunResult.reasons, ...liunianResult.reasons]),
    debug: { dayunScore: dayunResult.score, liunianScore: liunianResult.score, strengthLevel: effectiveStrength.level, useGodPrimary: effectiveUseGod.primaryUseGod },
  };
}

export function analyzeNarrative(input: StrengthRuleInput, strength?: StrengthRuleAnalysis, tenGodPreference?: TenGodPreference, useGod?: UseGodAnalysis, luck?: LuckAnalysis): ProductNarrative {
  const effectiveStrength = strength || analyzeStrengthRules(input);
  const effectiveTenGod = tenGodPreference || analyzeTenGodPreference(input, effectiveStrength.level);
  const effectiveUseGod = useGod || analyzeUseGod(input, effectiveStrength, effectiveTenGod);
  const effectiveLuck = luck || analyzeLuck(input, effectiveStrength, effectiveTenGod, effectiveUseGod);
  const topPreferred = [...effectiveTenGod.items].sort((a, b) => b.weight - a.weight)[0];
  const topRisk = [...effectiveTenGod.items].sort((a, b) => a.weight - b.weight)[0];
  return {
    coreSummary: `${CORE_MAP[effectiveStrength.level]}${topPreferred ? ` 你的优势更容易体现在${GOD_LABEL[topPreferred.god]}上。` : ''}${topRisk ? ` 但也要留意${GOD_LABEL[topRisk.god]}带来的持续消耗。` : ''}`,
    stageSummary: effectiveLuck.dayunDirection === '上升' ? '当前阶段更适合在稳住节奏的前提下推进关键事项。' : effectiveLuck.dayunDirection === '调整' ? '当前阶段更像重整结构，而不是盲目加速。' : effectiveLuck.dayunDirection === '压力' ? '当前阶段真正考验的不是能力上限，而是你能不能保住自己的节奏。' : effectiveLuck.dayunDirection === '波动' ? '当前阶段会同时出现机会和干扰，关键不是反应快，而是判断稳。' : '当前阶段带有明显转折意味，旧的推进方式正在失效。',
    actionHints: effectiveLuck.actionAdvice,
    emotionalHint: `${EMOTION_MAP[effectiveStrength.level]}${effectiveLuck.liunianDirection === '压力' || effectiveLuck.liunianDirection === '波动' ? ' 今年更要把节奏感放在结果感前面。' : ''}`,
    tone: effectiveLuck.dayunDirection === '压力' || effectiveLuck.liunianDirection === '压力' ? '提醒' : effectiveStrength.level === '极弱' || effectiveStrength.level === '偏弱' ? '修复' : effectiveStrength.level === '偏强' || effectiveStrength.level === '极强' ? '进取' : '稳健',
    reasons: dedupe([`基础总结来自身强弱：${effectiveStrength.level}`, `用神方向为${effectiveUseGod.primaryUseGod}`]),
    debug: { strengthLevel: effectiveStrength.level, strengthScore: effectiveStrength.score, dayunDirection: effectiveLuck.dayunDirection, liunianDirection: effectiveLuck.liunianDirection, primaryUseGod: effectiveUseGod.primaryUseGod },
  };
}

export function getSeasonByMonthBranch(branch: string): Season {
  if (['寅', '卯', '辰'].includes(branch)) return '春';
  if (['巳', '午', '未'].includes(branch)) return '夏';
  if (['申', '酉', '戌'].includes(branch)) return '秋';
  return '冬';
}
