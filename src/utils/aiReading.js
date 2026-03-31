import { SHENG_KE } from './baziEngine';
import { buildStructuredProfile, buildUserProfile } from './aiService';
import { hasAIBackendConfig, requestAIReadingFromBackend } from '../services/aiBackendConnector';
import { hasOpenAIConfig, requestOpenAIText } from '../services/openaiConnector';

const AI_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    model: 'gpt-4o-mini',
  },
  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    apiKey: '',
  },
  claude: {
    name: 'Claude',
    baseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-sonnet-4-20250514',
    apiKey: '',
  },
  qianwen: {
    name: 'Qianwen',
    baseUrl: 'https://dashscope.aliyuncs.com/api/v1',
    model: 'qwen-max',
    apiKey: '',
  },
};

let currentProvider = 'openai';

export function setAIProvider(provider) {
  if (AI_PROVIDERS[provider]) {
    currentProvider = provider;
  }
}

export function getAIProvider() {
  return currentProvider;
}

export function getAvailableAIProviders() {
  return Object.keys(AI_PROVIDERS);
}

export function setAPIKey(provider, key) {
  if (AI_PROVIDERS[provider] && provider !== 'openai') {
    AI_PROVIDERS[provider].apiKey = key;
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

function getCurrentDaYun(chart) {
  if (!chart?.daYun?.length || !chart?.birthInfo?.year) {
    return null;
  }

  const age = new Date().getFullYear() - chart.birthInfo.year;
  return chart.daYun.find((item) => age >= item.startAge && age <= item.endAge) || chart.daYun[0] || null;
}

function getReadingSystemPrompt(locale = 'zh-Hans') {
  if (locale === 'en') {
    return [
      'You are MingMe AI reading guide.',
      'Use the structured BaZi result as the base layer, then explain it in modern language.',
      'Do not sound mystical, fatalistic, or generic.',
      'Return JSON only with keys: career, wealth, relationship, actionGuide.',
      'Each value should be 90-160 Chinese characters worth of depth when translated.',
      'Do not repeat the same sentence pattern across all sections.',
    ].join('\n');
  }

  return [
    '你是“明己”的结构化解读顾问。',
    '你不是模板生成器，也不是排盘器。',
    '你只依据系统已提供的命理结构摘要，输出一份更像真人写的阶段解读。',
    '请把命理结构翻译成现实里的节奏、判断、关系、资源和行动建议。',
    '不要宿命化，不要空话，不要四段都写成同一种句式。',
    '请只返回 JSON，字段固定为 career、wealth、relationship、actionGuide。',
    '每个字段写成一段自然中文，长度控制在 90-160 字。',
  ].join('\n');
}

function buildReadingPrompt(chart, profile = {}, locale = 'zh-Hans') {
  const profileText = buildUserProfile(chart, locale);
  const structured = buildStructuredProfile(chart, profile);
  const currentDaYun = getCurrentDaYun(chart);
  const dailyTheme = textOf(chart?.dailyFortune?.theme || chart?.dailyFortune?.advice || chart?.dailyFortune?.summary);
  const wealthElement = SHENG_KE?.[chart?.dayWuXing || '']?.ke || '';

  return [
    profileText,
    '',
    '【结构化摘要】',
    `- 核心状态：${textOf(structured.core_summary, '未提供')}`,
    `- 当前阶段：${textOf(structured.stage_summary, '未提供')}`,
    `- 行动建议：${toList(structured.action_hints).join('；') || '未提供'}`,
    `- 情绪提醒：${textOf(structured.emotional_hint, '未提供')}`,
    `- 身强身弱：${textOf(structured.strength_level, '未明确')}`,
    `- 第一用神：${textOf(structured.primary_use_god, '未明确')}`,
    `- 十神重点：${textOf(structured.ten_god_summary, '未提供')}`,
    `- 当前大运主题：${textOf(structured.dayun_theme || (currentDaYun ? `${currentDaYun.gan}${currentDaYun.zhi}` : ''), '未明确')}`,
    `- 当前流年主题：${textOf(structured.liunian_theme, '未明确')}`,
    `- 今日主题：${dailyTheme || '未提供'}`,
    `- 财务关注元素：${wealthElement || '未明确'}`,
    '',
    '【输出要求】',
    '请输出 JSON：',
    '{"career":"","wealth":"","relationship":"","actionGuide":""}',
    '',
    '要求：',
    '1. career 要回答当前事业推进、判断重心和节奏感，不要空谈天赋。',
    '2. wealth 要回答资源使用、风险倾向和得失节奏，不要只说财运好坏。',
    '3. relationship 要回答边界、投入方式和拉扯来源，不要写空泛安慰。',
    '4. actionGuide 要给一条当前最值得执行的动作建议，明确、克制、可落地。',
    '5. 四段要彼此不同，不要复读同一句结构。',
  ].join('\n');
}

function normalizeSection(value, fallback) {
  const text = textOf(value);
  return text || fallback;
}

function buildFallbackSections(chart) {
  const dayWuXing = textOf(chart?.dayWuXing, '当前');
  const stageSummary = textOf(chart?.narrative?.stage_summary || chart?.narrative?.stageSummary || chart?.stageSummary);
  const actionHints = toList(chart?.narrative?.action_hints || chart?.narrative?.actionHints || chart?.actionHints);
  const emotionalHint = textOf(chart?.narrative?.emotional_hint || chart?.narrative?.emotionalHint || chart?.emotionalHint);

  return {
    career: `你现在在事业上更该做的，不是把线铺得更大，而是先确认真正值得投入的主轴。${stageSummary || '当前节奏更看重判断和取舍。'}先把最关键的一件事推到位，再谈扩张，会比同时抓很多事更稳。`,
    wealth: `${dayWuXing}这条线在钱的问题上更怕节奏乱掉，而不是机会不够。眼下更重要的是把支出、风险和回报预期重新排顺序，别被短期情绪带着做决定。`,
    relationship: `关系里你现在要看的，不只是对方有没有回应，而是这段互动是不是已经在消耗你的节奏。越是介意的地方，越要早点说清，不要等委屈积到后面才补解释。`,
    actionGuide: `${actionHints[0] || emotionalHint || '先把最消耗你的那个点找出来。'}这一步比继续硬撑更重要，很多卡住的事，先减一层负担，判断才会回来。`,
  };
}

function formatReadingSections(sections, locale = 'zh-Hans') {
  if (locale === 'en') {
    return [
      '[Career Energy]',
      sections.career,
      '',
      '[Wealth Rhythm]',
      sections.wealth,
      '',
      '[Relationship Field]',
      sections.relationship,
      '',
      '[Action Guide]',
      sections.actionGuide,
    ].join('\n');
  }

  return [
    '【事业能量】',
    sections.career,
    '',
    '【财富节奏】',
    sections.wealth,
    '',
    '【关系场域】',
    sections.relationship,
    '',
    '【行动指引】',
    sections.actionGuide,
  ].join('\n');
}

function normalizeReadingPayload(payload, chart, locale = 'zh-Hans') {
  const fallback = buildFallbackSections(chart);

  return formatReadingSections({
    career: normalizeSection(payload?.career, fallback.career),
    wealth: normalizeSection(payload?.wealth, fallback.wealth),
    relationship: normalizeSection(payload?.relationship, fallback.relationship),
    actionGuide: normalizeSection(payload?.actionGuide, fallback.actionGuide),
  }, locale);
}

async function requestProviderText(provider, systemPrompt, input) {
  if (currentProvider === 'deepseek') {
    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: input },
        ],
        max_tokens: 1200,
        temperature: 0.7,
      }),
    });
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  if (currentProvider === 'claude') {
    const response = await fetch(`${provider.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': provider.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: provider.model,
        system: systemPrompt,
        messages: [{ role: 'user', content: input }],
        max_tokens: 1200,
      }),
    });
    const data = await response.json();
    return data.content?.[0]?.text || '';
  }

  if (currentProvider === 'qianwen') {
    const response = await fetch(`${provider.baseUrl}/services/aigc/text-generation/generation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        input: {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: input },
          ],
        },
      }),
    });
    const data = await response.json();
    return data.output?.text || '';
  }

  return '';
}

export async function generateAIReading(chart, locale = 'zh-Hans', options = {}) {
  const provider = AI_PROVIDERS[currentProvider];
  const systemPrompt = getReadingSystemPrompt(locale);
  const input = buildReadingPrompt(chart, options.profile, locale);

  try {
    if (currentProvider === 'openai') {
      if (hasAIBackendConfig()) {
        const payload = await requestAIReadingFromBackend({
          model: provider.model,
          instructions: systemPrompt,
          input,
          locale,
          chart,
          profile: buildStructuredProfile(chart, options.profile),
          memberTier: options.memberTier,
          userKey: options.userKey,
        });
        return normalizeReadingPayload(extractJson(payload?.data?.text || payload?.text || ''), chart, locale);
      }

      if (!hasOpenAIConfig()) {
        return normalizeReadingPayload(null, chart, locale);
      }

      const { text } = await requestOpenAIText({
        model: provider.model,
        instructions: systemPrompt,
        input,
        maxOutputTokens: 1200,
      });
      return normalizeReadingPayload(extractJson(text), chart, locale);
    }

    if (!provider.apiKey) {
      return normalizeReadingPayload(null, chart, locale);
    }

    const text = await requestProviderText(provider, systemPrompt, input);
    return normalizeReadingPayload(extractJson(text), chart, locale);
  } catch (error) {
    console.warn('AI Reading Warning:', error?.message || error);
    return normalizeReadingPayload(null, chart, locale);
  }
}

export function parseAIReading(text = '') {
  const clean = stripCodeFence(text);

  try {
    const parsed = extractJson(clean);
    return {
      career: textOf(parsed?.career),
      wealth: textOf(parsed?.wealth),
      relationship: textOf(parsed?.relationship),
      summary: textOf(parsed?.actionGuide || parsed?.summary),
    };
  } catch (error) {
    const sections = {
      career: '',
      wealth: '',
      relationship: '',
      summary: '',
    };

    const patterns = [
      { key: 'career', regex: /(?:【事业能量】|\[Career Energy\])([\s\S]*?)(?=(?:【财富节奏】|\[Wealth Rhythm\]|$))/i },
      { key: 'wealth', regex: /(?:【财富节奏】|\[Wealth Rhythm\])([\s\S]*?)(?=(?:【关系场域】|\[Relationship Field\]|$))/i },
      { key: 'relationship', regex: /(?:【关系场域】|\[Relationship Field\])([\s\S]*?)(?=(?:【行动指引】|\[Action Guide\]|$))/i },
      { key: 'summary', regex: /(?:【行动指引】|\[Action Guide\])([\s\S]*?)$/i },
    ];

    patterns.forEach(({ key, regex }) => {
      const match = clean.match(regex);
      if (match?.[1]) {
        sections[key] = match[1].trim();
      }
    });

    if (!sections.career && !sections.wealth && !sections.relationship && !sections.summary) {
      sections.summary = clean.trim();
    }

    return sections;
  }
}

const BANNED_WORDS = [
  '必死',
  '绝命',
  '无药可救',
  '命中注定你会失败',
  'doomed',
  'hopeless',
  'death sentence',
];

export function contentSafetyCheck(text = '') {
  let cleaned = text;

  BANNED_WORDS.forEach((word) => {
    cleaned = cleaned.replace(new RegExp(word, 'gi'), '***');
  });

  return {
    text: cleaned,
    isSafe: cleaned === text,
  };
}
