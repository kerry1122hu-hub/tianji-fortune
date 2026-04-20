import { CALCULATION_ENGINE_INFO, calculateWesternNatalChart } from './calculationAdapter';
import { CITY_OPTIONS, getCitySearchText } from './generatedCityRegistry';
import { runInterpretationPipeline } from './interpretation_engine';
import { TAG_REGISTRY } from './interpretation_engine/tag_matching/tag_registry';

const ELEMENT_LABELS = {
  fire: '火象',
  earth: '土象',
  air: '风象',
  water: '水象',
};

export const ENGINE_INFO = CALCULATION_ENGINE_INFO;

const REPORT_PRESETS = {
  home: {
    eyebrow: 'MingSky Signature',
    title: '把出生信息变成真正可读的星盘报告',
    summary: '先选报告，再输入出生日期、时间与城市，最后进入带真实星盘结果的长报告页面。',
  },
  'past-life': {
    title: '前世报告',
    focus: 'self',
    intro: '探索前世线索，回看你这次人生最熟悉的情绪和课题。',
  },
  personality: {
    title: '性格报告',
    focus: 'self',
    intro: '看清你的核心气质、决策风格和自我定义方式。',
  },
  relationship: {
    title: '关系报告',
    focus: 'relationship',
    intro: '深入理解你的关系模式、信任节奏和亲密边界。',
  },
  monthly: {
    title: '月度预测报告',
    focus: 'career',
    intro: '把当前阶段的节奏变化翻成更好执行的月度安排。',
  },
  compatibility: {
    title: '兼容性报告',
    focus: 'relationship',
    intro: '先从你的关系底色出发，理解你最适合怎样的互动结构。',
  },
  wealth: {
    title: '财务潜力报告',
    focus: 'wealth',
    intro: '聚焦你的财富节奏、资源观和长期积累方式。',
  },
  evolution: {
    title: '生命进化报告',
    focus: 'career',
    intro: '把成长课题整理成更长周期的方向和执行路径。',
  },
};

const FOCUS_OPTIONS = [
  { key: 'self', label: '自我认知' },
  { key: 'relationship', label: '关系模式' },
  { key: 'career', label: '事业轨迹' },
  { key: 'wealth', label: '财富节奏' },
];

const TAG_LABELS = {
  'self.values.self_definition': '自我定位',
  'self.growth_pattern.self_reinvention': '自我重塑',
  'self.temperament.magnetic_visibility': '存在感与吸引力',
  'self.temperament.deep_internalization': '内在消化能力',
  'self.temperament.fast_reactivity': '反应速度快',
  'self.decision_style.analytic_patterning': '分析式思考',
  'self.decision_style.strategic_indirection': '策略感',
  'self.decision_style.dual_track_thinking': '双轨思维',
  'self.shadow.control_through_withdrawal': '退后掌控',
  'self.shadow.overresponsibility': '过度承担',
  'relationship.attachment_style.reassurance_hunger': '确认需求',
  'relationship.attachment_style.high_selectivity': '关系门槛高',
  'relationship.attachment_style.slow_to_trust': '慢热信任',
  'relationship.partnership_dynamics.intense_bonding': '强连接关系',
  'relationship.family_patterns.early_responsibility': '早期责任模式',
  'relationship.social_mode.selective_visibility': '选择性社交曝光',
  'relationship.social_mode.networked_support': '网络支持力',
  'career.strengths.earned_respect': '靠实力赢得信任',
  'career.trajectory.late_bloomer': '后劲型发展',
  'career.leadership_style.public_leadership': '公开领导力',
  'career.strengths.specialist_mastery': '专业深耕能力',
  'wealth.earning_style.volatile_growth': '波动型增长',
  'wealth.earning_style.accumulative_discipline': '积累型财富节奏',
  'health.vitality.fluctuating_reserves': '精力储备波动',
  'timing.upcoming_cycle.visibility_rise': '曝光上升期',
  'timing.current_season.consolidation_phase': '整固阶段',
  'purpose.lessons.delayed_maturation': '延迟成熟课题',
  'purpose.lessons.crisis_repatterning': '危机后的重组课题',
  'spirit.archetypes.sovereign_presence': '主场感',
  'spirit.symbolic_themes.inner_refinement': '内在打磨',
};

const INSIGHT_COPY = {
  self_definition_expands_through_visibility: {
    title: '你更适合在被看见的环境里长出自我定义',
    body: '当表达空间、角色感和外部回应同时被打开时，你会更容易确认自己的位置，也更知道该把力量放到哪里。',
  },
  interiority_needs_trust_and_processing_space: {
    title: '你的感受需要先被消化，再被表达',
    body: '你不是没有情绪，而是更需要先在内在整理它们。安全感和处理空间一旦足够，你的表达反而会更准确。',
  },
  thinking_prefers_pattern_and_strategy: {
    title: '你更像一个先看结构再行动的人',
    body: '你习惯先理解走势、关系和成本，再决定什么时候推进。这种思考方式让你在复杂局面里更稳。',
  },
  bonds_need_reassurance_but_open_slowly: {
    title: '你在关系里既需要确定感，也需要时间',
    body: '你不会轻易把信任一次性交出去，但一旦确认关系可靠，就会很认真地投入并长期经营。',
  },
  partnerships_can_be_intense_and_formative: {
    title: '重要关系常常会深刻地塑造你',
    body: '你与人的连接很少只是轻轻掠过，反而更容易成为你重新认识自己、确认边界与价值排序的场域。',
  },
  career_compounds_through_discipline: {
    title: '你的事业更像复利，不像爆发',
    body: '长期积累、专业深耕和稳定交付是你最可靠的增长方式。速度未必最早，但后劲往往更强。',
  },
  leadership_grows_with_public_exposure: {
    title: '越到台前，你越容易长出领导力',
    body: '当你开始承担公开角色、面向更大范围表达或整合资源时，存在感和带动力会明显变强。',
  },
  money_builds_best_with_patience_andStructure: {
    title: '你的财富节奏更适合稳扎稳打',
    body: '预算感、长期配置和风险边界，比情绪化冲动更适合你。把资源做成系统，会比赌一把更有效。',
  },
};

function tagLabel(tagCode) {
  if (TAG_LABELS[tagCode]) return TAG_LABELS[tagCode];
  const match = TAG_REGISTRY.tags.find((tag) => tag.tag_code === tagCode);
  if (match?.label_zh) return match.label_zh;
  if (match?.label_en) return match.label_en;
  return tagCode.split('.').slice(-1)[0].replace(/_/g, ' ');
}

function buildInsightCopy(insight) {
  const preset = INSIGHT_COPY[insight.insight_code];
  if (preset) return preset;
  const label = tagLabel(insight.tag_refs?.[0] || insight.insight_code);
  return {
    title: label,
    body: `这条结论已经由结构化规则命中，可继续扩展为更长的报告段落。当前优先级为 ${insight.priority}，置信度约 ${Math.round(insight.confidence * 100)}%。`,
  };
}

function getReportOptions() {
  return Object.entries(REPORT_PRESETS)
    .filter(([key]) => key !== 'home')
    .map(([key, value]) => ({ key, title: value.title, focus: value.focus, intro: value.intro }));
}

function getBirthFormOptions() {
  const currentYear = new Date().getFullYear();
  return {
    years: Array.from({ length: 80 }, (_, index) => String(currentYear - 70 + index)),
    months: Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0')),
    hours: Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0')),
    minutes: ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'],
    cities: CITY_OPTIONS,
  };
}

function getDayOptions(year, month) {
  const daysInMonth = new Date(Number(year), Number(month), 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) => String(index + 1).padStart(2, '0'));
}

function describePlanetBlend(visual) {
  const sun = visual.planets.find((planet) => planet.code === 'SUN');
  const moon = visual.planets.find((planet) => planet.code === 'MOON');
  const dominantElementCode = visual.metrics.find((metric) => metric.metric_code === 'DOMINANT_ELEMENT')?.value?.toLowerCase?.() || 'fire';
  return `${sun.signLabel}太阳、${moon.signLabel}月亮、${visual.ascSign.label}上升，整体更偏向 ${ELEMENT_LABELS[dominantElementCode]} 表达。`;
}

function buildDetailSections(reportType, visual, insights, tags) {
  const sun = visual.planets.find((planet) => planet.code === 'SUN');
  const moon = visual.planets.find((planet) => planet.code === 'MOON');
  const strongestAspect = visual.aspects[0];
  const topTag = tags[0]?.label || '结构化主题';
  const topInsight = insights[0]?.title || '主轴判断';

  const sectionA = {
    title: '盘面底色',
    body: `${sun.label}落在${sun.signLabel}${sun.degreeText}，月亮落在${moon.signLabel}${moon.degreeText}，上升是${visual.ascSign.label}。这会让你的第一层表现、内在情绪和外部节奏呈现出很清楚的组合感。`,
  };

  const sectionB = strongestAspect
    ? {
        title: '关键结构',
        body: `当前盘面最醒目的结构之一是 ${strongestAspect.left.label}${strongestAspect.label}${strongestAspect.right.label}，容许度约 ${strongestAspect.orb.toFixed(1)}°。这类相位通常会把某个主题推到更显眼的位置。`,
      }
    : {
        title: '关键结构',
        body: `这次盘面更偏向宫位和元素分布给出主轴，其中 ${topTag} 是最值得先读的一条。`,
      };

  const sectionByReport = {
    'past-life': {
      title: '前世线索',
      body: `这一版前世报告先不走神秘叙事，而是从你反复出现的性格主轴和课题切入。${topInsight} 往往说明你带着熟悉的处理方式进入这一生。`,
    },
    personality: {
      title: '性格聚焦',
      body: `这份性格报告更强调你如何理解自己、如何做决定，以及你在人群里呈现出来的核心气质。当前最醒目的主题是 ${topTag}。`,
    },
    relationship: {
      title: '关系动态',
      body: '关系报告会优先看月亮、金星、火星和第七宫线索。你更需要的不是表面热闹，而是节奏稳定、回应清楚的互动。',
    },
    monthly: {
      title: '月度节奏',
      body: '月度预测页会把当前盘面翻成更可执行的节奏建议。先稳住结构，再推进关键动作，会比全面铺开更有效。',
    },
    compatibility: {
      title: '兼容观察',
      body: '兼容性报告当前先用你的单人盘做关系基线：你会如何建立信任、在哪些位置更容易感到消耗、什么样的互动最适合长期发展。',
    },
    wealth: {
      title: '财富逻辑',
      body: '财务潜力报告更关注第二宫、金星、木星与土星的组合。比起情绪驱动，长期配置和清晰边界更适合你。',
    },
    evolution: {
      title: '进化主轴',
      body: '生命进化报告会把成长主题拉长来看。你现在最重要的不是做更多，而是把已经成熟的部分沉淀成可重复的路径。',
    },
  };

  return [sectionA, sectionB, sectionByReport[reportType] || sectionByReport.personality];
}

function buildReportModules(reportType, visual, insights, tags) {
  const strongestAspect = visual.aspects[0];
  return [
    {
      key: 'core',
      title: '核心主题',
      body: insights[0]?.title || tags[0]?.label || '当前这份报告会先抓住主轴主题。',
    },
    {
      key: 'chart',
      title: '星盘重点',
      body: strongestAspect ? `${strongestAspect.left.label}${strongestAspect.label}${strongestAspect.right.label}` : `${visual.ascSign.label}上升与行星分布构成底色。`,
    },
    {
      key: 'report',
      title: '报告方向',
      body: (REPORT_PRESETS[reportType] || REPORT_PRESETS.personality).intro,
    },
  ];
}

function buildActionItems(reportType, visual, insights) {
  const topInsight = insights[0]?.title || '先抓住当前主轴';
  const aspect = visual.aspects[0];
  return [
    `先围绕“${topInsight}”记录最近 2-3 次最有感的现实场景。`,
    aspect ? `优先观察 ${aspect.left.label}${aspect.label}${aspect.right.label} 对情绪、关系或职业推进的影响。` : '先从你最常重复的关系或职业模式开始拆解。',
    reportType === 'monthly' ? '把本月目标压缩到 1 个主推进事项，避免分散。' : '把这份报告里最强的一条主题转成一个可执行的下周动作。',
  ];
}

function buildHeadline(reportType, insights, visual) {
  if (insights[0]?.title) return insights[0].title;
  const preset = REPORT_PRESETS[reportType] || REPORT_PRESETS.personality;
  const sun = visual.planets.find((planet) => planet.code === 'SUN');
  return `${preset.title}：你的 ${sun.signLabel} 太阳正在定义这次结果的主轴`;
}

function buildSummary(reportType, visual, tags) {
  const preset = REPORT_PRESETS[reportType] || REPORT_PRESETS.personality;
  const topTags = tags.slice(0, 3).map((tag) => tag.label).join('、');
  return `${preset.intro}。这次结果主要由 ${describePlanetBlend(visual)} 当前最值得先看的主题是 ${topTags || '盘面结构'}。`;
}

function buildFallbackInsights(reportType) {
  const preset = REPORT_PRESETS[reportType] || REPORT_PRESETS.personality;
  return [
    { code: `${reportType}-fallback-1`, title: `${preset.title}主轴`, body: preset.intro, confidence: 0.72 },
  ];
}

function buildChartRows(visual) {
  return visual.planets.slice(0, 8).map((planet) => ({
    code: planet.code,
    label: planet.label,
    symbol: planet.symbol,
    position: `${planet.signLabel} ${planet.degreeText}`,
    house: `第 ${planet.houseNumber} 宫`,
    motion: planet.motion === 'retrograde' ? '逆行' : planet.motion === 'stationary' ? '停滞' : '顺行',
    longitude: planet.longitude,
  }));
}

function clamp01(value, fallback = 0.6) {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return Math.max(0, Math.min(1, numeric));
  }
  return fallback;
}

function normalizeSignCode(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return null;
  const directMap = {
    aries: 'aries',
    taurus: 'taurus',
    gemini: 'gemini',
    cancer: 'cancer',
    leo: 'leo',
    virgo: 'virgo',
    libra: 'libra',
    scorpio: 'scorpio',
    sagittarius: 'sagittarius',
    capricorn: 'capricorn',
    aquarius: 'aquarius',
    pisces: 'pisces',
  };
  return directMap[text] || null;
}

function inferSemanticCategory(tagCode) {
  const prefix = String(tagCode || '').split('.')[0];
  const map = {
    self: 'identity',
    emotion: 'emotion',
    relationship: 'relationship',
    career: 'career',
    wealth: 'money',
    money: 'money',
    family: 'family',
    timing: 'timing',
    purpose: 'growth',
    spirit: 'other',
    social: 'social',
    creativity: 'creativity',
    shadow: 'shadow',
    mind: 'mind',
    growth: 'growth',
  };
  return map[prefix] || 'other';
}

function buildPastLifeApiSeed(chartBundle, pipeline) {
  const planets = Array.isArray(chartBundle?.visual?.planets) ? chartBundle.visual.planets : [];
  const metrics = Array.isArray(chartBundle?.visual?.metrics) ? chartBundle.visual.metrics : [];
  const sun = planets.find((planet) => planet.code === 'SUN');
  const moon = planets.find((planet) => planet.code === 'MOON');
  const dominantPlanet = metrics.find((metric) => metric.metric_code === 'DOMINANT_PLANET')?.value || null;

  const topTags = (pipeline?.semantic_items || []).slice(0, 12).map((item) => ({
    tag_code: String(item.tag_code || '').replace(/[^a-z0-9_]/g, ''),
    category: inferSemanticCategory(item.tag_code),
    weight: clamp01(
      item.weight ?? item.score ?? (item.cross_system_agreement ? 0.82 : 0.68),
      0.68
    ),
    confidence: clamp01(item.confidence ?? item.weight ?? item.score ?? 0.74, 0.74),
  })).filter((item) => item.tag_code);

  const topInsights = (pipeline?.insights || []).slice(0, 10).map((insight, index) => ({
    insight_code: String(insight.insight_code || '').replace(/[^a-z0-9_]/g, ''),
    category: ['strength', 'tension', 'theme', 'opportunity', 'risk', 'growth'].includes(insight.category)
      ? insight.category
      : 'theme',
    section: ['summary', 'personality', 'relationships', 'career', 'money', 'family', 'growth', 'timing', 'shadow', 'faq'].includes(insight.section)
      ? insight.section
      : 'summary',
    confidence: clamp01(insight.confidence ?? 0.72, 0.72),
    priority: Number.isInteger(insight.priority) ? insight.priority : Math.max(1, 10 - index),
    tag_refs: Array.isArray(insight.tag_refs)
      ? insight.tag_refs.map((item) => String(item || '').replace(/[^a-z0-9_]/g, '')).filter(Boolean).slice(0, 8)
      : [],
    evidence_refs: Array.isArray(insight.evidence_refs) && insight.evidence_refs.length
      ? insight.evidence_refs.map((item) => String(item || '').slice(0, 120)).filter(Boolean).slice(0, 12)
      : [`AUTO_REF_${index + 1}`],
  })).filter((item) => item.insight_code);

  return {
    chart_core_summary: {
      sun_sign: normalizeSignCode(sun?.signCode || sun?.sign || sun?.signLabel) || 'libra',
      moon_sign: normalizeSignCode(moon?.signCode || moon?.sign || moon?.signLabel) || 'cancer',
      asc_sign: normalizeSignCode(chartBundle?.visual?.ascSign?.code || chartBundle?.visual?.ascSign?.label) || 'libra',
      mc_sign: normalizeSignCode(chartBundle?.visual?.mcSign?.code || chartBundle?.visual?.mcSign?.label),
      dominant_planet: dominantPlanet,
      core_tags: topTags.slice(0, 6).map((item) => item.tag_code),
      core_insights: topInsights.slice(0, 6).map((item) => item.insight_code),
    },
    semantic_profile: {
      semantic_version: 'semantic-map-web-v1',
      top_tags: topTags.length ? topTags : [{
        tag_code: 'relational_harmony_drive',
        category: 'relationship',
        weight: 0.72,
        confidence: 0.72,
      }],
      top_insights: topInsights.length ? topInsights : [{
        insight_code: 'relationships_seek_harmony_but_need_boundaries',
        category: 'theme',
        section: 'relationships',
        confidence: 0.72,
        priority: 8,
        tag_refs: ['relational_harmony_drive'],
        evidence_refs: ['AUTO_REF_1'],
      }],
    },
  };
}

export function getInterpretationFocusOptions() {
  return FOCUS_OPTIONS;
}

export { getReportOptions, getBirthFormOptions, getDayOptions, CITY_OPTIONS, getCitySearchText };

export function generateInterpretationPreview(input) {
  const reportType = input.reportType || 'personality';
  const reportPreset = REPORT_PRESETS[reportType] || REPORT_PRESETS.personality;
  const chartBundle = calculateWesternNatalChart(input);
  const pipeline = runInterpretationPipeline(chartBundle);

  const derivedInsights = pipeline.insights.slice(0, 3).map((insight) => {
    const copy = buildInsightCopy(insight);
    return {
      code: insight.insight_code,
      title: copy.title,
      body: copy.body,
      section: insight.section,
      confidence: insight.confidence,
    };
  });

  const derivedTags = pipeline.semantic_items.slice(0, 8).map((item) => ({
    code: item.tag_code,
    label: tagLabel(item.tag_code),
    crossSystem: item.cross_system_agreement,
  }));

  const derivedEvidence = pipeline.refs.refs.slice(0, 8).map((ref) => ({
    code: ref.ref_code,
    label: ref.ref_code.replace(/_/g, ' '),
    system: ref.system_code,
  }));

  const insights = derivedInsights.length ? derivedInsights : buildFallbackInsights(reportType);
  const tags = derivedTags.length
    ? derivedTags
    : [{ code: 'western.core', label: '西洋盘面主轴', crossSystem: false }];

  return {
    reportTitle: reportPreset.title,
    headline: buildHeadline(reportType, insights, chartBundle.visual),
    summary: buildSummary(reportType, chartBundle.visual, tags),
    insights,
    tags,
    evidence: derivedEvidence,
    reportModules: buildReportModules(reportType, chartBundle.visual, insights, tags),
    actionItems: buildActionItems(reportType, chartBundle.visual, insights),
    crossSystemCount: pipeline.semantic_items.filter((item) => item.cross_system_agreement).length,
    detailSections: buildDetailSections(reportType, chartBundle.visual, insights, tags),
    chartMeta: {
      date: input.birthDate,
      time: input.birthTime,
      city: chartBundle.visual.city.nativeLabel ? `${chartBundle.visual.city.nativeLabel} / ${chartBundle.visual.city.label}` : chartBundle.visual.city.label,
      province: chartBundle.visual.city.province || chartBundle.visual.city.region,
      region: chartBundle.visual.city.region,
      timezone: chartBundle.visual.city.timezone,
      latitude: chartBundle.visual.city.latitude,
      longitude: chartBundle.visual.city.longitude,
      ascSign: chartBundle.visual.ascSign.label,
      utcTime: chartBundle.visual.utcDate.toISOString(),
      engine: `${ENGINE_INFO.id} ${ENGINE_INFO.version}`,
    },
    chartVisual: {
      ascSign: chartBundle.visual.ascSign.label,
      ascLongitude: chartBundle.visual.ascLongitude,
      houses: chartBundle.visual.houses,
      planets: buildChartRows(chartBundle.visual),
      aspects: chartBundle.visual.aspects.slice(0, 5).map((aspect) => ({
        code: aspect.code,
        label: `${aspect.left.label}${aspect.label}${aspect.right.label}`,
        orb: `${aspect.orb.toFixed(1)}°`,
      })),
      rawPlanets: chartBundle.visual.planets,
    },
    pastLifeApiSeed: reportType === 'past-life' ? buildPastLifeApiSeed(chartBundle, pipeline) : null,
  };
}
