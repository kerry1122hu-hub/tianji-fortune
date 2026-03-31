import { buildStructuredProfile, buildUserProfile } from '../utils/aiService';
import { hasAIBackendConfig, requestAIReadingFromBackend } from './aiBackendConnector';
import { hasOpenAIConfig, requestOpenAIText } from './openaiConnector';

function textOf(value, fallback = '') {
  return `${value ?? fallback}`.trim();
}

function stripCodeFence(text = '') {
  return `${text}`
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

function extractJson(text = '') {
  const clean = stripCodeFence(text);
  try {
    return JSON.parse(clean);
  } catch (error) {
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw error;
  }
}

function getAge(profile, chart) {
  const birthYear = Number(profile?.year || chart?.birthInfo?.year || chart?.solarBirthInfo?.year);
  if (!birthYear) return null;
  return new Date().getFullYear() - birthYear;
}

function getAgeBand(age) {
  if (typeof age !== 'number' || Number.isNaN(age)) {
    return { label: '当前阶段', range: '未知', key: 'unknown' };
  }

  const clamped = Math.max(15, Math.min(85, age));
  const start = 15 + Math.floor((clamped - 15) / 5) * 5;
  const end = Math.min(start + 4, 85);
  return {
    label: `${start}-${end}岁阶段`,
    range: `${start}-${end}`,
    key: `${start}-${end}`,
  };
}

function buildAgeAwareQuestions({ ageBand, profile }) {
  const role = textOf(profile?.role, '当前角色');
  const focus = textOf(profile?.focus, '当前重点');

  const byBand = {
    '15-19': [
      ['最近最让你分心的，是成绩、关系，还是未来方向？', '定位外部压力来源'],
      ['做选择时，你更容易被期待推着走，还是自己也拿不准？', '识别自主性阻力'],
      ['你现在最想证明自己的，到底是哪一块？', '校准阶段核心任务'],
    ],
    '20-24': [
      ['你现在最纠结的，是去留、方向，还是和他人的节奏差太多？', '识别转向焦虑'],
      ['面对机会时，你更怕选错，还是更怕错过？', '判断行动阻力'],
      ['你更需要一个明确出口，还是先把自己稳住？', '确定当前优先级'],
    ],
    '25-34': [
      ['你最近最卡的，是方向分散，还是责任越来越多？', '定位现实卡点'],
      ['当压力上来时，你更容易硬撑，还是先怀疑自己？', '识别压力反应'],
      ['你现在最想稳住的，是工作、关系，还是内心秩序？', '明确主轴任务'],
    ],
    '35-49': [
      ['最近最消耗你的，是外部责任，还是没有人真正分担？', '定位责任消耗'],
      ['你更怕自己停下来，还是怕继续这样耗下去？', '识别深层焦虑'],
      ['你现在最想重新排顺的是时间、关系，还是精力分配？', '校准结构调整'],
    ],
    '50-64': [
      ['你最近更在意的是资源安稳，还是把生活节奏重新拿回来？', '判断阶段重心'],
      ['做安排时，你是先顾全别人，还是会先看自己还扛不扛得住？', '识别边界问题'],
      ['你最想处理清楚的，是过去的责任，还是接下来的生活主线？', '明确下一段主题'],
    ],
    '65-85': [
      ['最近最影响你心情的，是身体感受、家人牵挂，还是日常节奏被打乱？', '定位现实牵挂'],
      ['你现在最需要的是安心感、陪伴，还是更规律的生活秩序？', '识别核心需求'],
      ['哪些事其实已经不该继续由你一个人扛着了？', '识别该放手的部分'],
    ],
  };

  const bucket = ageBand?.key;
  const fallback = [
    [`你现在最想理顺的，是${focus}，还是更基本的生活节奏？`, '判断当前关注重心'],
    [`站在“${role}”的位置上，什么事最容易让你反复内耗？`, '识别角色压力'],
    ['你更需要的是马上推进，还是先把内部节奏稳住？', '校准行动节奏'],
  ];

  const picked = byBand[bucket] || fallback;
  return picked.map(([question, intent], index) => ({
    id: `q${index + 1}`,
    question,
    intent,
  }));
}

function getCompanionSystemPrompt(locale = 'zh-Hans') {
  if (locale === 'en') {
    return [
      'You are MingMe AI Companion.',
      'Return valid JSON only.',
      'Generate one sharp summary, five weekly action cards, and three follow-up questions.',
      'The output must feel specific to the user life stage and current concerns.',
    ].join('\n');
  }

  return [
    '你是“明己”的 AI 陪伴生成器。',
    '你不是模板拼接器。',
    '请依据系统提供的结构化命理摘要和当前人生阶段，生成一份更像真人总结出来的陪伴卡。',
    '只返回合法 JSON，不要返回额外说明。',
    '输出要具体、自然、克制，不要鸡汤，也不要神神叨叨。',
  ].join('\n');
}

function buildCompanionPrompt({ chart, profile, locale = 'zh-Hans', answers = {} }) {
  const age = getAge(profile, chart);
  const ageBand = getAgeBand(age);
  const structured = buildStructuredProfile(chart, profile);
  const profileText = buildUserProfile(chart, locale);
  const answeredText = Object.entries(answers)
    .filter(([, value]) => textOf(value))
    .map(([key, value]) => `${key}: ${textOf(value)}`)
    .join('\n');

  return [
    profileText,
    '',
    '【结构化摘要】',
    `- 核心状态：${textOf(structured.core_summary, '未提供')}`,
    `- 当前阶段：${textOf(structured.stage_summary, '未提供')}`,
    `- 行动建议：${[].concat(structured.action_hints || []).filter(Boolean).join('；') || '未提供'}`,
    `- 情绪提醒：${textOf(structured.emotional_hint, '未提供')}`,
    `- 身强身弱：${textOf(structured.strength_level, '未明确')}`,
    `- 第一用神：${textOf(structured.primary_use_god, '未明确')}`,
    `- 十神重点：${textOf(structured.ten_god_summary, '未提供')}`,
    `- 当前大运主题：${textOf(structured.dayun_theme, '未明确')}`,
    `- 当前流年主题：${textOf(structured.liunian_theme, '未明确')}`,
    `- 当前角色：${textOf(profile?.role || structured.role, '未填写')}`,
    `- 当前关注：${textOf(profile?.focus || structured.focus, '自我认知')}`,
    `- 年龄阶段：${ageBand.label} (${ageBand.range})`,
    answeredText ? `【用户已回答的追问】\n${answeredText}` : '',
    '',
    '【输出要求】',
    '请只返回 JSON：',
    '{',
    '  "oneLineSummary": "",',
    '  "weeklyActions": {',
    '    "work": {"title":"","advice":"","cue":""},',
    '    "relationship": {"title":"","advice":"","cue":""},',
    '    "money": {"title":"","advice":"","cue":""},',
    '    "emotion": {"title":"","advice":"","cue":""},',
    '    "health": {"title":"","advice":"","cue":""}',
    '  },',
    '  "followUpQuestions": [',
    '    {"id":"q1","question":"","intent":""},',
    '    {"id":"q2","question":"","intent":""},',
    '    {"id":"q3","question":"","intent":""}',
    '  ]',
    '}',
    '',
    '要求：',
    '1. oneLineSummary 要像一句真正说中用户当下状态的话，不要空泛。',
    '2. weeklyActions 五张卡要分别对应工作、关系、金钱、情绪、健康节奏，且 advice 必须具体。',
    '3. cue 是 2-6 个字的提醒词。',
    '4. followUpQuestions 必须明显结合年龄阶段和当前角色，不能像统一问卷。',
  ].filter(Boolean).join('\n');
}

function buildFallbackPack(chart, profile, answers = {}) {
  const structured = buildStructuredProfile(chart, profile);
  const ageBand = getAgeBand(getAge(profile, chart));
  const answered = Object.values(answers).some((value) => textOf(value));
  const focus = textOf(profile?.focus || structured.focus, '当前重点');
  const stage = textOf(structured.stage_summary, ageBand.label);

  return {
    oneLineSummary: answered
      ? `你现在真正该练的，不是再多想一个答案，而是把注意力收回到最值得投入的那条主线。${stage ? `眼下这段节奏更像在提醒你先把“${stage}”看清。` : ''}`
      : `你现在更需要的，不是再给自己加任务，而是先把最值得投入的那条线看清。${stage ? `当前这段节奏更偏向“${stage}”。` : ''}`,
    weeklyActions: {
      work: { title: '工作', advice: `这周围绕“${focus}”只推进一件最重要的事，先打透一个点。`, cue: '先聚焦' },
      relationship: { title: '关系', advice: '把真正介意的点说短一点、说早一点，别等情绪堆满后再解释。', cue: '及时说' },
      money: { title: '金钱', advice: '先把支出、风险和预期重新排顺序，别让情绪替你做决定。', cue: '先排序' },
      emotion: { title: '情绪', advice: '一旦开始反复内耗，先停十分钟，把最消耗你的那件事写下来。', cue: '先停一下' },
      health: { title: '健康节奏', advice: '先把睡眠和吃饭时点稳住，比临时靠意志力硬撑更重要。', cue: '稳节奏' },
    },
    followUpQuestions: buildAgeAwareQuestions({ ageBand, profile }),
  };
}

function normalizeWeeklyActions(weeklyActions = {}, fallback = {}) {
  const fields = ['work', 'relationship', 'money', 'emotion', 'health'];
  return fields.reduce((acc, field) => {
    acc[field] = {
      title: textOf(weeklyActions?.[field]?.title, fallback?.[field]?.title || ''),
      advice: textOf(weeklyActions?.[field]?.advice, fallback?.[field]?.advice || ''),
      cue: textOf(weeklyActions?.[field]?.cue, fallback?.[field]?.cue || ''),
    };
    return acc;
  }, {});
}

function normalizeQuestions(items = [], fallback = []) {
  const normalized = (Array.isArray(items) ? items : [])
    .slice(0, 3)
    .map((item, index) => ({
      id: textOf(item?.id, `q${index + 1}`),
      question: textOf(item?.question, fallback[index]?.question || ''),
      intent: textOf(item?.intent, fallback[index]?.intent || ''),
    }));

  while (normalized.length < 3 && fallback[normalized.length]) {
    normalized.push(fallback[normalized.length]);
  }

  return normalized;
}

function normalizePack(pack, chart, profile, answers) {
  const fallback = buildFallbackPack(chart, profile, answers);

  return {
    oneLineSummary: textOf(pack?.oneLineSummary, fallback.oneLineSummary),
    weeklyActions: normalizeWeeklyActions(pack?.weeklyActions, fallback.weeklyActions),
    followUpQuestions: normalizeQuestions(pack?.followUpQuestions, fallback.followUpQuestions),
  };
}

async function requestProviderJson(systemPrompt, input) {
  const { text } = await requestOpenAIText({
    model: 'gpt-4o-mini',
    instructions: systemPrompt,
    input,
    maxOutputTokens: 1400,
  });
  return text;
}

export async function generateCompanionPack({ chart, profile, locale = 'zh-Hans', answers = {} }) {
  const systemPrompt = getCompanionSystemPrompt(locale);
  const input = buildCompanionPrompt({ chart, profile, locale, answers });

  try {
    if (hasAIBackendConfig()) {
      const payload = await requestAIReadingFromBackend({
        model: 'gpt-4o-mini',
        instructions: systemPrompt,
        input,
        locale,
        chart,
        profile: buildStructuredProfile(chart, profile),
      });

      return normalizePack(extractJson(payload?.data?.text || payload?.text || ''), chart, profile, answers);
    }

    if (hasOpenAIConfig()) {
      const text = await requestProviderJson(systemPrompt, input);
      return normalizePack(extractJson(text), chart, profile, answers);
    }
  } catch (error) {
    console.warn('AI Companion Warning:', error?.message || error);
  }

  return buildFallbackPack(chart, profile, answers);
}
