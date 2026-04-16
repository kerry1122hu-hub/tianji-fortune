import { runInterpretationPipeline } from './interpretation_engine';
import { TAG_REGISTRY } from './interpretation_engine/tag_matching/tag_registry';

const SIGNS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
const FOCUS_PRESETS = {
  self: {
    westernPoint: 'SUN',
    westernSign: 'leo',
    westernHouse: 10,
    ziweiRefs: ['ZIWEI_ZI_WEI_IN_LIFE', 'ZIWEI_LIFE_MAIN_STAR'],
  },
  relationship: {
    westernPoint: 'VENUS',
    westernSign: 'cancer',
    westernHouse: 7,
    ziweiRefs: ['ZIWEI_SPOUSE_MAIN_STAR', 'ZIWEI_TIAN_LIANG_IN_FU_QI'],
  },
  career: {
    westernPoint: 'SATURN',
    westernSign: 'capricorn',
    westernHouse: 10,
    ziweiRefs: ['ZIWEI_CAREER_MAIN_STAR', 'ZIWEI_ZI_WEI_IN_CAREER'],
  },
  wealth: {
    westernPoint: 'JUPITER',
    westernSign: 'taurus',
    westernHouse: 2,
    ziweiRefs: ['ZIWEI_WEALTH_MAIN_STAR', 'ZIWEI_CAI_BO_MAIN_WU_QU'],
  },
};

const TAG_LABELS = {
  'self.values.self_definition': '自我定位',
  'self.growth_pattern.self_reinvention': '自我重塑',
  'self.temperament.magnetic_visibility': '存在感与吸引力',
  'self.temperament.deep_internalization': '内在消化能力',
  'self.temperament.fast_reactivity': '反应速度',
  'self.decision_style.analytic_patterning': '分析式思考',
  'self.decision_style.strategic_indirection': '策略感',
  'self.decision_style.dual_track_thinking': '双轨思考',
  'self.shadow.control_through_withdrawal': '退后掌控',
  'self.shadow.overresponsibility': '过度承担',
  'relationship.attachment_style.reassurance_hunger': '关系里的确认需求',
  'relationship.attachment_style.high_selectivity': '关系选择门槛',
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
  'wealth.earning_style.accumulative_discipline': '累积型财富节奏',
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
    title: '你适合在被看见的环境里成长',
    body: '当表达空间、角色感和外部回应同时打开时，你的判断和行动会更稳定，也更容易找到自己的节奏。',
  },
  interiority_needs_trust_and_processing_space: {
    title: '你需要先消化，再靠近',
    body: '很多感觉不会第一时间说出来。给自己一点整理情绪和确认边界的空间，关系反而更稳。',
  },
  thinking_prefers_pattern_and_strategy: {
    title: '你更像一个先看结构的人',
    body: '你通常不是凭第一反应做决定，而是会先看走势、关系和成本，再决定什么时候出手。',
  },
  bonds_need_reassurance_but_open_slowly: {
    title: '你在关系里既需要安全感，也需要时间',
    body: '你并不随便交付信任，但一旦确认对方稳定可靠，就会非常认真地经营一段关系。',
  },
  partnerships_can_be_intense_and_formative: {
    title: '重要关系会深刻改变你',
    body: '你和人的连接往往不是淡淡的路过，而是会牵动选择、边界和自我认识。',
  },
  career_compounds_through_discipline: {
    title: '你的事业更像复利，不像爆发',
    body: '长期积累、专业深耕和稳定交付，是你最有力量的上升路径。速度未必最早，但后劲通常很强。',
  },
  leadership_grows_with_public_exposure: {
    title: '越到前台，你越容易长出领导力',
    body: '当你承担公开角色、对外表达或需要整合资源时，个人存在感会明显增强。',
  },
  money_builds_best_with_patience_and_structure: {
    title: '你的财富节奏适合稳扎稳打',
    body: '预算、节奏和长期配置感会比短期冲动更适合你。你适合把财富做成一种系统，而不是赌一把。',
  },
  money_needs_clear_risk_edges: {
    title: '财务上要先画边界，再追机会',
    body: '增长机会可能存在，但波动也会更明显。先管住风险敞口，才能把机会留到最后。',
  },
  current_cycle_favors_structured_visibility: {
    title: '这段时间适合走到台前',
    body: '如果你正准备发布、申请、面试、谈合作或重新建立公众形象，这一阶段更容易得到回应。',
  },
  this_phase_requires_consolidation: {
    title: '这段时间更适合整固，而不是硬冲',
    body: '把节奏收回来，先补结构、补边界、补基本盘，会比盲目扩张更有效。',
  },
  growth_runs_through_delayed_maturation: {
    title: '你的成长不是慢，而是成熟得更扎实',
    body: '很多能力需要靠时间沉淀。等时机真正到来时，你往往已经比别人更稳。',
  },
  inner_crises_reorganize_identity: {
    title: '关键转折会重写你的内在秩序',
    body: '一些压力或重组并不是单纯的消耗，它们常常会逼你重新决定什么才是自己真正要守住的。',
  },
  energy_management_needs_attention: {
    title: '这段时间先照顾你的精力分配',
    body: '不是所有事情都要一次扛完。把体力、注意力和恢复节奏排进去，状态会好很多。',
  },
};

const FOCUS_OPTIONS = [
  { key: 'career', label: '事业轨迹' },
  { key: 'relationship', label: '关系模式' },
  { key: 'self', label: '自我认知' },
  { key: 'wealth', label: '财富节奏' },
];

function hashSeed(input) {
  let value = 0;
  for (let index = 0; index < input.length; index += 1) {
    value = (value * 31 + input.charCodeAt(index)) % 2147483647;
  }
  return value;
}

function signAt(seed, offset = 0) {
  return SIGNS[(seed + offset) % SIGNS.length];
}

function houseAt(seed, offset = 0) {
  return ((seed + offset) % 12) + 1;
}

function pointFact(factId, pointCode, sign, houseNumber, motion = 'direct') {
  return {
    fact_id: factId,
    fact_code: `${factId}_${pointCode.toLowerCase()}`,
    fact_type: 'point',
    qualifiers: {
      point_code: pointCode,
      sign,
      house_number: houseNumber,
      motion,
    },
    confidence: 0.96,
  };
}

function aspectFact(factId, pointA, pointB, aspectType, strengthScore = 0.82) {
  return {
    fact_id: factId,
    fact_code: `${factId}_${pointA.toLowerCase()}_${pointB.toLowerCase()}`,
    fact_type: 'aspect',
    qualifiers: {
      point_a_code: pointA,
      point_b_code: pointB,
      aspect_type: aspectType,
      orb_deg: 1.8,
      strength_score: strengthScore,
      exact: false,
    },
    confidence: 0.92,
  };
}

function houseFact(factId, houseNumber, sign) {
  return {
    fact_id: factId,
    fact_code: `${factId}_house_${houseNumber}`,
    fact_type: 'house',
    qualifiers: {
      house_number: houseNumber,
      sign,
    },
    confidence: 0.94,
  };
}

function crossRefFact(factId, refCode) {
  return {
    fact_id: factId,
    fact_code: `${factId}_${refCode.toLowerCase()}`,
    fact_type: 'cross_reference',
    qualifiers: { ref_code: refCode },
    confidence: 0.9,
  };
}

function buildPrototypeChart(input) {
  const seed = hashSeed(`${input.birthDate}|${input.birthTime}|${input.city}|${input.focus}`);
  const preset = FOCUS_PRESETS[input.focus] || FOCUS_PRESETS.self;
  const westernFacts = [
    pointFact('w1', preset.westernPoint, preset.westernSign, preset.westernHouse, input.focus === 'career' ? 'retrograde' : 'direct'),
    pointFact('w2', 'MOON', signAt(seed, 3), houseAt(seed, 1)),
    pointFact('w3', 'MERCURY', signAt(seed, 5), houseAt(seed, 2)),
    pointFact('w4', 'SATURN', input.focus === 'career' ? 'capricorn' : signAt(seed, 7), input.focus === 'career' ? 10 : houseAt(seed, 4), input.focus === 'career' ? 'retrograde' : 'direct'),
    pointFact('w5', 'JUPITER', input.focus === 'wealth' ? 'taurus' : signAt(seed, 8), input.focus === 'wealth' ? 2 : houseAt(seed, 6)),
    houseFact('w6', 2, input.focus === 'wealth' ? 'taurus' : signAt(seed, 4)),
  ];

  if (input.focus === 'relationship') {
    westernFacts.push(aspectFact('w7', 'VENUS', 'SATURN', 'square'));
    westernFacts.push(pointFact('w8', 'VENUS', 'cancer', 7));
  } else if (input.focus === 'career') {
    westernFacts.push(aspectFact('w7', 'SUN', 'SATURN', 'trine'));
  } else if (input.focus === 'self') {
    westernFacts.push(aspectFact('w7', 'SUN', 'PLUTO', 'square'));
    westernFacts.push(pointFact('w8', 'PLUTO', 'scorpio', 1));
  } else if (input.focus === 'wealth') {
    westernFacts.push(aspectFact('w7', 'VENUS', 'URANUS', 'square'));
    westernFacts.push(pointFact('w8', 'URANUS', 'aquarius', 2));
  }

  const ziweiFacts = preset.ziweiRefs.map((refCode, index) => crossRefFact(`z${index + 1}`, refCode));

  if (seed % 2 === 0) {
    ziweiFacts.push(crossRefFact('z9', 'ZIWEI_HUA_JI'));
  }

  return {
    chart_id: `prototype-${seed}`,
    chart_type: 'natal',
    subjects: [
      {
        subject_id: 'web-user',
        birth_input: {
          time_accuracy: 'exact',
        },
      },
    ],
    systems: [
      {
        system_code: 'western',
        confidence: {
          overall: 0.95,
          houses: 0.92,
          aspects: 0.92,
        },
        facts: westernFacts,
      },
      {
        system_code: 'ziwei',
        confidence: {
          overall: 0.9,
        },
        facts: ziweiFacts,
      },
    ],
  };
}

function labelForTag(tagCode) {
  return TAG_LABELS[tagCode] || TAG_REGISTRY.tags.find((tag) => tag.tag_code === tagCode)?.label_zh || tagCode;
}

function formatRef(refCode) {
  return refCode.replace(/_/g, ' ').replace(/\b\w/g, (value) => value.toUpperCase());
}

export function getInterpretationFocusOptions() {
  return FOCUS_OPTIONS;
}

export function generateInterpretationPreview(input) {
  const chart = buildPrototypeChart(input);
  const pipeline = runInterpretationPipeline(chart);
  const topInsights = pipeline.insights.slice(0, 3).map((insight) => ({
    code: insight.insight_code,
    title: INSIGHT_COPY[insight.insight_code]?.title || insight.insight_code,
    body: INSIGHT_COPY[insight.insight_code]?.body || '这一条线索已经亮起，适合继续往下问得更具体一些。',
    section: insight.section,
    confidence: insight.confidence,
  }));

  const topTags = pipeline.semantic_items.slice(0, 6).map((item) => ({
    code: item.tag_code,
    label: labelForTag(item.tag_code),
    confidence: item.confidence,
    crossSystem: item.cross_system_agreement,
  }));

  const topRefs = pipeline.refs.refs.slice(0, 8).map((ref) => ({
    code: ref.ref_code,
    label: formatRef(ref.ref_code),
    system: ref.system_code,
  }));

  const crossSystemCount = pipeline.semantic_items.filter((item) => item.cross_system_agreement).length;

  return {
    chartId: pipeline.chart_id,
    headline:
      topInsights[0]?.title ||
      '你的盘面已经开始给出一条稳定线索。',
    summary:
      topInsights[0]?.body ||
      '先从最亮的主题切入，再决定是继续看事业、关系还是节奏变化。',
    insights: topInsights,
    tags: topTags,
    evidence: topRefs,
    crossSystemCount,
    raw: pipeline,
  };
}
