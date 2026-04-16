import { runInterpretationPipeline } from './interpretation_engine';
import { TAG_REGISTRY } from './interpretation_engine/tag_matching/tag_registry';

const SIGNS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];

const REPORT_PRESETS = {
  'past-life': {
    title: '前世报告',
    focus: 'self',
    headline: '你带着熟悉的责任感来到这一生',
    summary: '这类命盘常见的主题不是从零开始，而是把旧经验带进新阶段，再学会用更轻的方式去完成它。',
    details: [
      { title: '前世惯性', body: '你容易自然地扛起责任，也会比别人更早意识到局势、边界和代价。这种熟悉感像是旧经验延续到了这一生。' },
      { title: '今生课题', body: '这一生不只是继续证明自己能扛，而是学会在承担与松开之间重新分配力量，让关系、表达和自我价值不再只靠硬撑。' },
      { title: '意义线索', body: '当你开始把成熟、判断力与内在愿望放到同一条线上时，你会比以往更清楚自己究竟想成为什么样的人。' },
    ],
  },
  personality: {
    title: '性格报告',
    focus: 'self',
    headline: '你的核心不是张扬，而是先把自己看清',
    summary: '你对自己的要求通常比外界看到的更高，也更容易在一段段经历里慢慢形成稳定的自我定义。',
    details: [
      { title: '个性核心', body: '你更像是内核驱动型的人。很多选择不是为了立刻证明什么，而是为了让自己更接近真正认可的状态。' },
      { title: '表达方式', body: '你会表达，但通常不是无差别外放。等判断成熟、时机合适、关系安全时，你的表达反而更有分量。' },
      { title: '成长方式', body: '你的人格成长常常来自一次次重整秩序，而不是一路轻松地往前冲。' },
    ],
  },
  relationship: {
    title: '关系报告',
    focus: 'relationship',
    headline: '你要的不是热闹连接，而是可靠回应',
    summary: '你会认真感受关系里的分寸、信任和安全感，所以真正重要的人，往往会深深影响你的决定。',
    details: [
      { title: '亲密模式', body: '你不太会轻易交出全部，但一旦确认对方值得投入，就会很认真地经营这段关系。' },
      { title: '人际边界', body: '你需要被理解，也需要被尊重。如果回应长期模糊，你会开始收回能量，甚至慢慢退后。' },
      { title: '关系成长', body: '关系对你而言不是陪衬，而是让你重新认识自己、修整边界和价值排序的重要场域。' },
    ],
  },
  monthly: {
    title: '月度预测报告',
    focus: 'career',
    headline: '这个月适合先整合，再把机会推到台前',
    summary: '节奏上不是一味加速，而是先把结构拉稳，再推动关键曝光和合作窗口。',
    details: [
      { title: '本月节奏', body: '这个月更适合把有限的注意力集中到最有回报的事情上，少开新线，多把已有事项做深。' },
      { title: '行动窗口', body: '如果你要提交申请、谈合作、做上线或做公开发布，中后段的回应感通常会更强。' },
      { title: '避坑提醒', body: '不要用忙代替推进。越是关键月份，越要让每一步都落到能形成结果的节点上。' },
    ],
  },
  compatibility: {
    title: '兼容性报告',
    focus: 'relationship',
    headline: '你在关系里最看重节奏是否对得上',
    summary: '兼容不只是喜欢，而是两个人能不能在安全感、沟通方式和现实安排上形成稳定回路。',
    details: [
      { title: '高兼容线索', body: '当对方既能给你回应，也不会过度逼近，你更容易打开自己，关系也会走得更深。' },
      { title: '摩擦来源', body: '如果节奏忽冷忽热、边界模糊，或者承诺和行动长期不一致，你会迅速感到消耗。' },
      { title: '匹配重点', body: '你更适合和愿意把关系做扎实的人在一起，而不是只追求短期浓度和表面热烈。' },
    ],
  },
  wealth: {
    title: '财务潜力报告',
    focus: 'wealth',
    headline: '你的财富优势在于把资源做成系统',
    summary: '你通常更适合长期积累、结构化配置和稳住边界后的放大，而不是一把梭式的冒进。',
    details: [
      { title: '优势方式', body: '你做得好的通常不是一时冲刺，而是把规则、预算、节奏和长期目标逐步搭起来。' },
      { title: '风险点', body: '一旦节奏被情绪或外部诱因打乱，资源流动就会变得比预期更不稳定。' },
      { title: '增长机会', body: '当你把专业能力、信任度和持续输出绑在一起时，财富机会会比你想象中更稳地长出来。' },
    ],
  },
  evolution: {
    title: '生命进化报告',
    focus: 'career',
    headline: '你正在走向更成熟、也更有方向感的阶段',
    summary: '这不是单纯追求更大，而是把经历沉淀成可重复的判断力，再把它变成你未来的主轴。',
    details: [
      { title: '旧模式正在退场', body: '以前那些只靠硬撑、只靠外部标准的做法，正在慢慢失去吸引力。' },
      { title: '新阶段主题', body: '你会越来越重视稳定结构、真实价值和长期能持续的路径，而不是短期证明。' },
      { title: '下一步方向', body: '把你已经形成的经验、边界和判断，整理成能长期复用的方法，这会是这一阶段最关键的进化。' },
    ],
  },
};

const FOCUS_OPTIONS = [
  { key: 'career', label: '事业轨迹' },
  { key: 'relationship', label: '关系模式' },
  { key: 'self', label: '自我认知' },
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
  'self.decision_style.dual_track_thinking': '双轨思考',
  'self.shadow.control_through_withdrawal': '退后掌控',
  'self.shadow.overresponsibility': '过度承担',
  'relationship.attachment_style.reassurance_hunger': '关系中的确认需求',
  'relationship.attachment_style.high_selectivity': '关系选择门槛',
  'relationship.attachment_style.slow_to_trust': '慢热信任',
  'relationship.partnership_dynamics.intense_bonding': '强连结关系',
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
  self_definition_expands_through_visibility: { title: '你适合在被看见的环境里成长', body: '当表达空间、角色感和外部回应同时打开时，你的判断和行动会更稳定，也更容易找到自己的节奏。' },
  interiority_needs_trust_and_processing_space: { title: '你需要先消化，再靠近', body: '很多感觉不会第一时间说出来。给自己一点整理情绪和确认边界的空间，关系反而会更稳。' },
  thinking_prefers_pattern_and_strategy: { title: '你更像一个先看结构的人', body: '你通常不是凭第一反应做决定，而是会先看走势、关系和成本，再决定什么时候出手。' },
  bonds_need_reassurance_but_open_slowly: { title: '你在关系里既需要安全感，也需要时间', body: '你并不随便交付信任，但一旦确认对方稳定可靠，就会非常认真地经营一段关系。' },
  partnerships_can_be_intense_and_formative: { title: '重要关系会深刻改变你', body: '你和人的连结往往不是淡淡的路过，而是会牵动选择、边界和自我认识。' },
  career_compounds_through_discipline: { title: '你的事业更像复利，不像爆发', body: '长期积累、专业深耕和稳定交付，是你最有力量的上升路径。速度未必最早，但后劲通常很强。' },
  leadership_grows_with_public_exposure: { title: '越到台前，你越容易长出领导力', body: '当你承担公开角色、对外表达或需要整合资源时，个人存在感会明显增强。' },
  money_builds_best_with_patience_andStructure: { title: '你的财富节奏适合稳扎稳打', body: '预算、节奏和长期配置感会比短期冲动更适合你。你适合把财富做成一种系统，而不是赌一把。' },
};

function hashSeed(input) {
  let value = 0;
  for (let index = 0; index < input.length; index += 1) value = (value * 31 + input.charCodeAt(index)) % 2147483647;
  return value;
}

function signAt(seed, offset = 0) {
  return SIGNS[(seed + offset) % SIGNS.length];
}

function houseAt(seed, offset = 0) {
  return ((seed + offset) % 12) + 1;
}

function pointFact(factId, pointCode, sign, houseNumber, motion = 'direct') {
  return { fact_id: factId, fact_code: `${factId}_${pointCode.toLowerCase()}`, fact_type: 'point', qualifiers: { point_code: pointCode, sign, house_number: houseNumber, motion }, confidence: 0.96 };
}

function aspectFact(factId, pointA, pointB, aspectType, strengthScore = 0.82) {
  return { fact_id: factId, fact_code: `${factId}_${pointA.toLowerCase()}_${pointB.toLowerCase()}`, fact_type: 'aspect', qualifiers: { point_a_code: pointA, point_b_code: pointB, aspect_type: aspectType, orb_deg: 1.8, strength_score: strengthScore, exact: false }, confidence: 0.92 };
}

function houseFact(factId, houseNumber, sign) {
  return { fact_id: factId, fact_code: `${factId}_house_${houseNumber}`, fact_type: 'house', qualifiers: { house_number: houseNumber, sign }, confidence: 0.94 };
}

function crossRefFact(factId, refCode) {
  return { fact_id: factId, fact_code: `${factId}_${refCode.toLowerCase()}`, fact_type: 'cross_reference', qualifiers: { ref_code: refCode }, confidence: 0.9 };
}

function buildPrototypeChart(input) {
  const seed = hashSeed(`${input.birthDate}|${input.birthTime}|${input.city}|${input.focus}|${input.reportType}`);
  const westernFacts = [
    pointFact('w1', 'SUN', input.focus === 'self' ? 'leo' : signAt(seed, 1), input.focus === 'self' ? 1 : houseAt(seed, 1)),
    pointFact('w2', 'MOON', input.focus === 'relationship' ? 'cancer' : signAt(seed, 3), houseAt(seed, 2)),
    pointFact('w3', 'MERCURY', signAt(seed, 5), houseAt(seed, 3)),
    pointFact('w4', 'SATURN', input.focus === 'career' ? 'capricorn' : signAt(seed, 7), input.focus === 'career' ? 10 : houseAt(seed, 4), input.focus === 'career' ? 'retrograde' : 'direct'),
    pointFact('w5', 'JUPITER', input.focus === 'wealth' ? 'taurus' : signAt(seed, 8), input.focus === 'wealth' ? 2 : houseAt(seed, 6)),
    houseFact('w6', 2, input.focus === 'wealth' ? 'taurus' : signAt(seed, 4)),
  ];

  if (input.focus === 'relationship') {
    westernFacts.push(aspectFact('w7', 'VENUS', 'SATURN', 'square'));
    westernFacts.push(pointFact('w8', 'VENUS', 'cancer', 7));
  } else if (input.focus === 'career') {
    westernFacts.push(aspectFact('w7', 'SUN', 'SATURN', 'trine'));
    westernFacts.push(pointFact('w8', 'MC', 'capricorn', 10));
  } else if (input.focus === 'self') {
    westernFacts.push(aspectFact('w7', 'SUN', 'PLUTO', 'square'));
    westernFacts.push(pointFact('w8', 'PLUTO', 'scorpio', 1));
  } else if (input.focus === 'wealth') {
    westernFacts.push(aspectFact('w7', 'VENUS', 'URANUS', 'square'));
    westernFacts.push(pointFact('w8', 'URANUS', 'aquarius', 2));
  }

  const ziweiRefMap = {
    self: ['ZIWEI_LIFE_MAIN_STAR', 'ZIWEI_ZI_WEI_IN_LIFE'],
    relationship: ['ZIWEI_SPOUSE_MAIN_STAR', 'ZIWEI_TIAN_LIANG_IN_FU_QI'],
    career: ['ZIWEI_CAREER_MAIN_STAR', 'ZIWEI_ZI_WEI_IN_CAREER'],
    wealth: ['ZIWEI_WEALTH_MAIN_STAR', 'ZIWEI_CAI_BO_MAIN_WU_QU'],
  };

  const ziweiFacts = (ziweiRefMap[input.focus] || ziweiRefMap.self).map((refCode, index) => crossRefFact(`z${index + 1}`, refCode));
  if (seed % 2 === 0) ziweiFacts.push(crossRefFact('z9', 'ZIWEI_HUA_JI'));

  return {
    chart_id: `prototype-${seed}`,
    chart_type: 'natal',
    subjects: [{ subject_id: 'web-user', birth_input: { time_accuracy: 'exact' } }],
    systems: [
      { system_code: 'western', confidence: { overall: 0.95, houses: 0.92, aspects: 0.92 }, facts: westernFacts },
      { system_code: 'ziwei', confidence: { overall: 0.9 }, facts: ziweiFacts },
    ],
  };
}

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
  return { title: tagLabel(insight.tag_refs?.[0] || insight.insight_code), body: '这条结论已经有结构化依据，后面可以继续扩展成长文报告、问答卡片和更多维度的解释。' };
}

function buildFallbackResult(reportType, focus) {
  const reportPreset = REPORT_PRESETS[reportType] || REPORT_PRESETS.personality;
  return {
    insights: reportPreset.details.map((item, index) => ({ code: `${reportType}-fallback-${index + 1}`, title: item.title, body: item.body, confidence: 0.76, section: focus })),
    tags: [
      { code: `${focus}-anchor-1`, label: focus === 'relationship' ? '关系回应感' : focus === 'wealth' ? '资源结构感' : focus === 'career' ? '成长后劲' : '自我认知', crossSystem: true },
      { code: `${focus}-anchor-2`, label: focus === 'relationship' ? '边界与信任' : focus === 'wealth' ? '财富节奏' : focus === 'career' ? '责任与结构' : '内在秩序', crossSystem: false },
      { code: `${focus}-anchor-3`, label: focus === 'relationship' ? '深度连结' : focus === 'wealth' ? '风险边界' : focus === 'career' ? '公众可见度' : '成长课题', crossSystem: true },
    ],
    evidence: [
      { code: 'WESTERN_SIGNAL', label: 'Western chart signal', system: 'western' },
      { code: 'ZIWEI_SIGNAL', label: 'Ziwei chart signal', system: 'ziwei' },
      { code: 'CROSS_VALIDATION', label: 'Cross-system agreement', system: 'hybrid' },
    ],
    crossSystemCount: 2,
  };
}

export function getInterpretationFocusOptions() {
  return FOCUS_OPTIONS;
}

export function getReportOptions() {
  return Object.entries(REPORT_PRESETS).map(([key, value]) => ({ key, title: value.title, focus: value.focus }));
}

export function generateInterpretationPreview(input) {
  const reportPreset = REPORT_PRESETS[input.reportType] || REPORT_PRESETS.personality;
  const chart = buildPrototypeChart(input);
  const pipeline = runInterpretationPipeline(chart);

  const derivedInsights = pipeline.insights.slice(0, 3).map((insight) => {
    const copy = buildInsightCopy(insight);
    return { code: insight.insight_code, title: copy.title, body: copy.body, section: insight.section, confidence: insight.confidence };
  });
  const derivedTags = pipeline.semantic_items.slice(0, 8).map((item) => ({ code: item.tag_code, label: tagLabel(item.tag_code), crossSystem: item.cross_system_agreement }));
  const derivedEvidence = pipeline.refs.refs.slice(0, 6).map((ref) => ({ code: ref.ref_code, label: ref.ref_code.replace(/_/g, ' '), system: ref.system_code }));

  const fallback = buildFallbackResult(input.reportType, input.focus);

  return {
    reportTitle: reportPreset.title,
    headline: reportPreset.headline,
    summary: reportPreset.summary,
    insights: derivedInsights.length ? derivedInsights : fallback.insights,
    tags: derivedTags.length ? derivedTags : fallback.tags,
    evidence: derivedEvidence.length ? derivedEvidence : fallback.evidence,
    crossSystemCount: pipeline.semantic_items.length ? pipeline.semantic_items.filter((item) => item.cross_system_agreement).length : fallback.crossSystemCount,
    detailSections: reportPreset.details,
    chartMeta: { date: input.birthDate, time: input.birthTime, city: input.city },
  };
}
