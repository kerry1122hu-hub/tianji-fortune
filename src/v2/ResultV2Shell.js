import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio, Video } from 'expo-av';
import * as Notifications from 'expo-notifications';
import { aiAnalyzeEmotion, aiChat, aiDecisionSupport, aiMingJiDivination, aiMingJiDream, canUseAI, getRemainingCount, incrementUsage, transcribeVoiceInput } from '../utils/aiService';
import { generateFortuneCalendar } from '../utils/fortuneCalendar';
import { detectPwaPlatform, getPwaDisplayMode, isSafariBrowser, isStandalonePwa, listenToPwaInstallability, promptPwaInstall, trackPwaEvent } from '../utils/pwaWeb';

const { width: PAGE_WIDTH } = Dimensions.get('window');
const CALENDAR_ENTRIES_STORAGE_KEY = 'mingme.v2.calendarEntries';
const AI_INSTALL_REMINDER_SEEN_KEY = 'mingme.v2.aiInstallReminderSeen';
const MINGJI_DIVINATION_LOADING_VIDEO = '/mingji-divination-loading.mp4';

function padUserKeyPart(value) {
  return `${value ?? '00'}`.padStart(2, '0');
}

function buildStableUserKey(chart = {}, profile = {}, memberRegistration = {}) {
  const explicit = `${memberRegistration?.userKey || profile?.userKey || chart?.userKey || chart?.profile?.userKey || ''}`.trim();
  if (explicit) return explicit;

  const birth = chart?.birthInfo || chart?.inputBirthInfo || chart?.solarBirthInfo || {};
  const year = `${birth?.year || profile?.year || '0000'}`.trim();
  const month = padUserKeyPart(birth?.month || profile?.month || '00');
  const day = padUserKeyPart(birth?.day || profile?.day || '00');
  const hour = padUserKeyPart(birth?.hour ?? profile?.hour ?? '00');
  const minute = padUserKeyPart(birth?.minute ?? profile?.minute ?? '00');
  const gender = `${chart?.gender || birth?.gender || profile?.gender || memberRegistration?.gender || 'unknown'}`.trim() || 'unknown';

  return `chart:${[year, month, day, hour, minute, gender].join('-')}`;
}

function normalizeChatMessageContent(value, fallback = '') {
  if (typeof value === 'string') return value;
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'number' || typeof value === 'boolean') return `${value}`;
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

function getDivinationSceneLabel(sceneType) {
  return DIVINATION_SCENE_OPTIONS.find((item) => item.key === sceneType)?.label || '当前这件事';
}

function buildLikelyConcernPreview(sceneType, question = '') {
  const questionText = `${question || ''}`.trim();
  if (questionText) {
    if (sceneType === 'career') return '你更可能真正想问的，不只是这条职业路能不能走，而是现在该不该继续推，还是先稳住主线。';
    if (sceneType === 'wealth') return '你更可能真正想问的，不只是有没有财，而是这笔交易、这份往来，当下到底稳不稳。';
    if (sceneType === 'relationship') return '你更可能真正想问的，不只是对方怎么想，而是这段关系里你现在该主动、该稳住，还是该先退一步。';
    if (sceneType === 'communication') return '你更可能真正想问的，不只是能不能找到，而是线索够不够、方向对不对、现在该往哪里追。';
    if (sceneType === 'travel') return '你更可能真正想问的，不只是去不去，而是身体状态和这趟行程眼下顺不顺、值不值得现在动。';
  }
  return `还没正式起卦前，明己会先按“${getDivinationSceneLabel(sceneType)}”这条线替你收焦，不让问题散掉。`;
}

function getDivinationQuestionPlaceholder(sceneType) {
  if (sceneType === 'wealth') return '例如：这笔交易现在谈合适吗？这笔钱能不能顺利回款？';
  if (sceneType === 'career') return '例如：这个岗位要不要接？这个项目这周该不该继续推进？';
  if (sceneType === 'relationship') return '例如：我要不要主动联系他？这段关系现在该推进还是先缓一缓？';
  if (sceneType === 'travel') return '例如：我这两天适不适合出门办事？这趟行程会不会白跑？';
  if (sceneType === 'communication') return '例如：这个人现在找不找得到？这件东西还能不能寻回来？';
  return '例如：把眼前最想问的这件事写清楚，让明己先替你断一卦。';
}

function getDivinationComposerHint(sceneType) {
  if (sceneType === 'wealth') return '把交易、付款、回款或合作收焦到一件事上，明己会先断这笔财眼前是稳、拖、快还是空。';
  if (sceneType === 'career') return '把职业、项目或工作节点收焦到一件事上，明己会先断这一步该推、该守，还是该先缓。';
  if (sceneType === 'relationship') return '把关系里最卡的一点写清楚，明己会先断这段人际眼前是顺、争、拖，还是空。';
  if (sceneType === 'travel') return '把身体状态或这趟出行收焦到一个问题上，明己会先断现在动身是顺、阻，还是容易白跑。';
  if (sceneType === 'communication') return '把要寻的人或物写具体一点，明己会先断线索眼前是有回音、拖着找，还是容易扑空。';
  return '把问题收焦到眼前这件事，明己会按起卦当下的时点替你先断势，再讲该怎么动。';
}

function getDreamQuestionPlaceholder() {
  return '例如：我梦见自己一直在找路，最后走进一片黑水里；或，我梦见已故亲人来家里坐着不说话。';
}

function getDreamComposerHint(dreamText = '') {
  const normalized = `${dreamText || ''}`.trim();
  if (normalized) {
    return '把梦里最清楚的画面、人物、颜色、动作写出来，明己会先按周公解梦抓“象”，再补现实中的心理线索。';
  }
  return '先把梦里最醒目的“象”写出来，例如人、动物、水火、颜色、追逐、坠落、生死、说话与否，明己才好真正拆梦。';
}

function buildDreamPreview(text = '') {
  const normalized = `${text || ''}`.trim().replace(/\s+/g, ' ');
  if (!normalized) return '这个梦先不急着往凶吉上压，明己会先替你把梦里的“象”挑出来，再看它在提醒什么。';
  const first = normalized.split(/(?<=[。！？!?])/)[0]?.trim() || normalized;
  return first.length > 56 ? `${first.slice(0, 56)}…` : first;
}

function buildDreamFormalLead(text = '') {
  const normalized = `${text || ''}`.trim();
  if (!normalized) return '';
  return `明己先替你把梦里的“象”拆开，再把传统寓意和现实心事放在一起看：${normalized}`;
}

function normalizeDivinationInsightPayload(payload, sceneType) {
  if (!payload) return null;
  const source = payload?.data || payload;
  const normalized = source?.normalizedPayload || null;
  const normalizedDouble = normalized?.double_palace_result || null;
  const normalizedInstant = normalized?.instant_decision || null;
  const normalizedResult = normalized?.result || null;
  const engineResult = source?.engineResult || null;

  const fallbackEngineResult = normalized
    ? {
        sceneName: getDivinationSceneLabel(sceneType),
        likelyConcern: source?.likelyConcern || buildLikelyConcernPreview(sceneType, ''),
        eventContext: {
          localMonth: normalized?.calc_context?.lunar_month,
          localDay: normalized?.calc_context?.lunar_day,
          timeBranch: normalized?.calc_context?.time_branch_name,
        },
        mainPalace: normalizedDouble?.main_palace
          ? {
              palace_name: normalizedDouble.main_palace.palace_name,
              palace_code: normalizedDouble.main_palace.palace_code,
              fortune_level: normalizedDouble.main_palace.fortune_level,
            }
          : normalizedResult?.palace_name
            ? {
                palace_name: normalizedResult.palace_name,
                palace_code: normalizedResult.palace_code,
                fortune_level: normalizedResult.fortune_level,
              }
            : null,
        secondaryPalace: normalizedDouble?.secondary_palace
          ? {
              palace_name: normalizedDouble.secondary_palace.palace_name,
              palace_code: normalizedDouble.secondary_palace.palace_code,
              fortune_level: normalizedDouble.secondary_palace.fortune_level,
            }
          : null,
        summary: normalizedDouble?.short_output || normalizedResult?.short_output || '',
        recommended: normalizedResult?.recommended || normalizedDouble?.recommended || [],
        avoid: normalizedResult?.avoid || normalizedDouble?.avoid || [],
        instantDecision: normalizedInstant,
        threePalaceTimeline: normalizedInstant?.three_palace_timeline || [],
        decisionScore: normalizedInstant?.decision_score || normalizedResult?.decision_score || null,
        modernResult: normalizedInstant?.modern_result || normalizedResult?.modern_result || '',
        baziLinkage: normalizedInstant?.bazi_linkage || null,
      }
    : null;
  const mergedEngineResult = engineResult || fallbackEngineResult;
  const enhancedEngineResult = mergedEngineResult
    ? {
        ...mergedEngineResult,
        instantDecision: mergedEngineResult.instantDecision || normalizedInstant || null,
        threePalaceTimeline: mergedEngineResult.threePalaceTimeline || normalizedInstant?.three_palace_timeline || [],
        decisionScore: mergedEngineResult.decisionScore || normalizedInstant?.decision_score || normalizedResult?.decision_score || null,
        modernResult: mergedEngineResult.modernResult || normalizedInstant?.modern_result || normalizedResult?.modern_result || '',
        baziLinkage: mergedEngineResult.baziLinkage || normalizedInstant?.bazi_linkage || null,
      }
    : null;

  return {
    ...source,
    text: normalizeChatMessageContent(
      source?.text,
      normalizedDouble?.short_output || normalizedResult?.short_output || ''
    ),
    engineResult: enhancedEngineResult,
  };
}

function getDivinationCooldownUntil(payload) {
  const source = payload?.data || payload || {};
  return `${(
    source?.riskControl?.cooldownUntil ||
    source?.riskControl?.cooldown_until ||
    source?.engineResult?.riskControl?.cooldownUntil ||
    source?.engineResult?.riskControl?.cooldown_until ||
    source?.engineResult?.normalizedPayload?.risk_control?.cooldown_until ||
    source?.normalizedPayload?.risk_control?.cooldown_until ||
    ''
  )}`.trim();
}

function getDivinationResultTitle(sceneType, engineResult) {
  const mainPalace = engineResult?.mainPalace?.palace_name || '--';
  const secondaryPalace = engineResult?.secondaryPalace?.palace_name;
  const palaceLine = secondaryPalace ? `主宫 ${mainPalace} · 辅宫 ${secondaryPalace}` : `主宫 ${mainPalace}`;

  if (sceneType === 'wealth') return `${palaceLine} · 财路眼前怎么走`;
  if (sceneType === 'career') return `${palaceLine} · 这步职业路怎么推`;
  if (sceneType === 'relationship') return `${palaceLine} · 这段关系眼前怎么动`;
  if (sceneType === 'travel') return `${palaceLine} · 这趟出行与状态怎么看`;
  if (sceneType === 'communication') return `${palaceLine} · 线索眼前往哪边追`;
  return palaceLine;
}

function getDivinationResultLead(sceneType, engineResult) {
  const summary = engineResult?.summary || '这一卦已起出，但短断尚未生成。';
  if (sceneType === 'wealth') return `这一卦先看财势与交易气口：${summary}`;
  if (sceneType === 'career') return `这一卦先看事业与职业节奏：${summary}`;
  if (sceneType === 'relationship') return `这一卦先看关系里的顺、拖、争、空：${summary}`;
  if (sceneType === 'travel') return `这一卦先看身体状态与这趟行程值不值得动：${summary}`;
  if (sceneType === 'communication') return `这一卦先看寻人寻物的线索有没有回音：${summary}`;
  return summary;
}

function buildDivinationEngineLead(engineResult) {
  const score = engineResult?.decisionScore;
  const modern = engineResult?.modernResult || engineResult?.instantDecision?.modern_result || '';
  const relation = engineResult?.baziLinkage?.relation || engineResult?.instantDecision?.bazi_linkage?.relation || '';
  if (!score && !modern && !relation) return '';
  const chunks = [
    modern ? `状态：${modern}` : '',
    score ? `即时决策评分：${score}/100` : '',
    relation ? `八字联动：${relation}` : '',
  ].filter(Boolean);
  return `明己即时决策引擎已启用。${chunks.join(' · ')}`;
}

function getDivinationFormalTitle(sceneType) {
  if (sceneType === 'wealth') return '明己怎么断这笔财与这桩交易';
  if (sceneType === 'career') return '明己怎么断这步事业与职业变化';
  if (sceneType === 'relationship') return '明己怎么断这段关系的推进与分寸';
  if (sceneType === 'travel') return '明己怎么断这趟出行与身体状态';
  if (sceneType === 'communication') return '明己怎么断这次寻人寻物的线索';
  return '明己怎么讲这件事';
}

function buildDivinationFormalLead(sceneType, text = '') {
  const normalized = `${text || ''}`.trim();
  if (!normalized) return '';
  if (sceneType === 'wealth') return `先从财路与交易气口看，这一卦更像是：${normalized}`;
  if (sceneType === 'career') return `先从职业走势与这一步该不该推看，这一卦更像是：${normalized}`;
  if (sceneType === 'relationship') return `先从关系分寸与眼前推进方式看，这一卦更像是：${normalized}`;
  if (sceneType === 'travel') return `先从出行顺逆与身体承受度看，这一卦更像是：${normalized}`;
  if (sceneType === 'communication') return `先从线索、方向与回音快慢看，这一卦更像是：${normalized}`;
  return normalized;
}

function formatDivinationTimeNote(engineResult) {
  const ctx = engineResult?.eventContext || {};
  if (!ctx.localMonth || !ctx.localDay || !ctx.timeBranch) {
    return '这一卦会按你起卦当下的月、日、时来断，先看眼前的势，再看现在该怎么动。';
  }
  return `这次起卦取的是当下时点：${ctx.localMonth}月${ctx.localDay}日 · ${ctx.timeBranch}时。小六壬先看眼前这股势，再看这件事现在宜怎么动、忌怎么碰。`;
}

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const C = {
  bg: '#F2F2F7',
  card: '#FFFFFF',
  ink: '#1C1C1E',
  soft: 'rgba(28,28,30,0.70)',
  faint: 'rgba(28,28,30,0.42)',
  line: 'rgba(60,60,67,0.12)',
  gold: '#C6922A',
  hero: '#0A0A0C',
  logoNight: '#18243A',
  logoDeep: '#14333A',
  logoMint: '#A9DED0',
  logoMist: '#EAF5F1',
  logoGlow: 'rgba(144, 233, 211, 0.22)',
  success: '#34C759',
  warn: '#FF9F0A',
  danger: '#FF3B30',
};

const S = {
  home: '\u9996\u9875',
  profile: '\u6863\u6848',
  stage: '\u9636\u6bb5',
  premium: '\u4f1a\u5458',
  me: '\u6211\u7684',
  today: '\u4eca\u65e5\u6982\u89c8',
  recast: '\u66f4\u65b0\u8d44\u6599',
  newProfile: '\u65b0\u5efa\u6863\u6848',
  direction: '\u6709\u5229\u65b9\u4f4d',
  luckyColor: '\u5e78\u8fd0\u989c\u8272',
  goodHours: '\u987a\u624b\u65f6\u6bb5',
  coreSummary: '\u6838\u5fc3\u5224\u65ad',
  weekly: '\u672c\u5468\u5efa\u8bae',
  weeklyCards: '\u4e94\u5f20\u884c\u52a8\u5361',
  aiFollowup: 'AI \u8ffd\u95ee',
  updateCards: '\u66f4\u65b0\u603b\u7ed3\u548c\u4e94\u5f20\u5361',
  profileCore: '\u547d\u76d8\u4e3b\u4f53',
  fourPillars: '\u56db\u67f1\u6863\u6848',
  basicInfo: '\u57fa\u672c\u4fe1\u606f',
  basics: '\u57fa\u7840\u8d44\u6599',
  fiveElements: '\u4e94\u884c\u529b\u91cf',
  trend30: '\u8fd1 30 \u5929\u8d8b\u52bf',
  actionCalendar: '\u884c\u52a8\u65e5\u5386',
  stageHelper: '\u9636\u6bb5\u8f85\u52a9',
  timingNotes: '\u65f6\u95f4\u8282\u594f\u4e0e\u8f85\u52a9\u63d0\u793a',
  currentState: '\u5f53\u524d\u72b6\u6001\u5224\u65ad',
  balanceAdvice: '\u5e73\u8861\u5efa\u8bae',
  stageMap: '\u9636\u6bb5\u5730\u56fe',
  premiumCenter: '\u4f1a\u5458\u4e2d\u5fc3',
  benefits: '\u4f1a\u5458\u6743\u76ca',
  currentStatus: '\u5f53\u524d\u72b6\u6001',
  settings: '\u504f\u597d\u8bbe\u7f6e',
  languageReminders: '\u8bed\u8a00\u4e0e\u63d0\u9192',
  dataOps: '\u672c\u5730\u6570\u636e',
  exportReset: '\u91cd\u7f6e\u4e0e\u6574\u7406',
  close: '\u5173\u95ed',
  advice: '\u5efa\u8bae',
  yi: '\u5b9c',
  ji: '\u5fcc',
  dayDetail: '\u5f53\u65e5\u8be6\u60c5',
};

const TAB_KEYS = ['tongsheng', 'home', 'profile', 'stage', 'premium', 'me'];
const TAB_META = {
  tongsheng: {
    icon: '☯',
    label: '通胜',
    accent: '#C48A2A',
    glow: 'rgba(196,138,42,0.18)',
    plate: 'rgba(196,138,42,0.12)',
    border: 'rgba(196,138,42,0.24)',
  },
  home: {
    icon: '⌂',
    label: S.home,
    accent: '#2F9E67',
    glow: 'rgba(47,158,103,0.20)',
    plate: 'rgba(47,158,103,0.12)',
    border: 'rgba(47,158,103,0.24)',
  },
  profile: {
    icon: '▦',
    label: S.profile,
    accent: '#A97A2B',
    glow: 'rgba(169,122,43,0.18)',
    plate: 'rgba(207,177,111,0.14)',
    border: 'rgba(169,122,43,0.24)',
  },
  stage: {
    icon: '◔',
    label: S.stage,
    accent: '#3A7BD5',
    glow: 'rgba(58,123,213,0.18)',
    plate: 'rgba(58,123,213,0.13)',
    border: 'rgba(58,123,213,0.24)',
  },
  premium: {
    icon: '✦',
    label: S.premium,
    accent: '#C65B4B',
    glow: 'rgba(198,91,75,0.18)',
    plate: 'rgba(198,91,75,0.12)',
    border: 'rgba(198,91,75,0.24)',
  },
  me: {
    icon: '◡',
    label: S.me,
    accent: '#7D5CD6',
    glow: 'rgba(125,92,214,0.18)',
    plate: 'rgba(125,92,214,0.12)',
    border: 'rgba(125,92,214,0.24)',
  },
};

function getTabMeta(tab, reviewMode) {
  if (!reviewMode) return TAB_META[tab];
  if (tab === 'tongsheng') return { ...TAB_META.tongsheng, label: '今日' };
  if (tab === 'home') return { ...TAB_META.home, label: '计划' };
  if (tab === 'stage') return { ...TAB_META.stage, label: '回看' };
  if (tab === 'me') return { ...TAB_META.me, label: '设置' };
  return TAB_META[tab];
}

const WEEKLY_META = {
  work: { label: '\u5de5\u4f5c', tone: '#4C7DF0' },
  relationship: { label: '\u5173\u7cfb', tone: '#FF6B6B' },
  money: { label: '\u91d1\u94b1', tone: '#28B463' },
  emotion: { label: '\u60c5\u7eea', tone: '#8E6EF7' },
  health: { label: '\u5065\u5eb7\u8282\u594f', tone: '#F39C12' },
};

const DEFAULT_WEEKLY_ACTIONS = {
  work: { title: '\u5de5\u4f5c', advice: '\u5148\u63a8\u8fdb\u4e00\u4ef6\u6700\u5173\u952e\u7684\u4e8b\uff0c\u5b8c\u6210\u6bd4\u94fa\u5f00\u66f4\u91cd\u8981\u3002', cue: '\u5148\u5b8c\u6210' },
  relationship: { title: '\u5173\u7cfb', advice: '\u628a\u771f\u5b9e\u611f\u53d7\u8bf4\u6e05\u4e00\u70b9\uff0c\u4e0d\u8981\u7b49\u60c5\u7eea\u5806\u79ef\u3002', cue: '\u53ca\u65f6\u8868\u8fbe' },
  money: { title: '\u91d1\u94b1', advice: '\u5148\u6574\u7406\u518d\u652f\u51fa\uff0c\u5148\u5206\u6e05\u9700\u8981\u548c\u60f3\u8981\u3002', cue: '\u5148\u76d8\u70b9' },
  emotion: { title: '\u60c5\u7eea', advice: '\u53cd\u590d\u60f3\u540c\u4e00\u4ef6\u4e8b\u65f6\uff0c\u5148\u505c\u5341\u5206\u949f\u518d\u51b3\u5b9a\u3002', cue: '\u9632\u5185\u8017' },
  health: { title: '\u5065\u5eb7\u8282\u594f', advice: '\u4f18\u5148\u7a33\u4f4f\u7761\u7720\u548c\u5403\u996d\u65f6\u95f4\uff0c\u8282\u594f\u7a33\u4e86\u72b6\u6001\u624d\u7a33\u3002', cue: '\u5148\u7a33\u8282\u594f' },
};

const MOOD_OPTIONS = [
  { key: 'calm', label: '平稳', tone: '#7FCFBD' },
  { key: 'focused', label: '专注', tone: '#8FB7FF' },
  { key: 'stressed', label: '紧绷', tone: '#FF9F0A' },
  { key: 'low', label: '低落', tone: '#8E6EF7' },
  { key: 'energized', label: '有劲', tone: '#34C759' },
];

const SMART_TOOL_META = {
  divination: { label: '明己一卦', hint: '用小六壬看当前这件事的势、时机与宜忌', accent: '#7FB4FF', icon: '◈' },
  dream: { label: '明己解梦', hint: '把梦里的象与现实心事一起拆开来看', accent: '#B69BFF', icon: '☾' },
  emotion: { label: '情绪洞察', hint: '记录今天的情绪并获得 AI 分析', accent: '#7FCFBD', icon: '◌' },
  decision: { label: '决策辅助', hint: '把复杂选择拆开再看', accent: '#8FB7FF', icon: '△' },
  growth: { label: '成长追踪', hint: '把阶段变化总结成一段建议', accent: '#D7B765', icon: '◎' },
  reflection: { label: '自我反思', hint: '补充观察并生成新的摘要方向', accent: '#A78BFA', icon: '◐' },
};

const DIVINATION_SCENE_OPTIONS = [
  { key: 'wealth', label: '财运/交易' },
  { key: 'career', label: '事业/职业' },
  { key: 'relationship', label: '感情/人际' },
  { key: 'travel', label: '健康/出行' },
  { key: 'communication', label: '寻人/寻物' },
];

const DIVINATION_RITUAL_NOTES = [
  { title: '遇事即刻', body: '动念即起，第一感应最为精准。' },
  { title: '无事勿占', body: '严禁无目的的随意测试。' },
  { title: '一事一占', body: '同一事项不可反复起卦，否则“再占不验”。' },
  { title: '心存敬畏', body: '数术乃天机，不可大不敬，心态平和方能感应。' },
  { title: '辩证看待', body: '任何占卜均非绝对，准确率约在八成，大方向正确即为成功。' },
];

const CALENDAR_NOTE_TYPES = [
  { key: 'todo', label: '待办' },
  { key: 'plan', label: '安排' },
  { key: 'care', label: '提醒' },
  { key: 'idea', label: '灵感' },
];

const REMINDER_LEAD_OPTIONS = [
  { value: 0, label: '准时提醒' },
  { value: 10, label: '提前10分钟' },
  { value: 30, label: '提前30分钟' },
  { value: 60, label: '提前1小时' },
];

const REMINDER_REPEAT_OPTIONS = [
  { value: 'once', label: '仅一次' },
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
];

const ELEMENT_COLORS = { '\u91d1': '#C6922A', '\u6728': '#2E9B4B', '\u6c34': '#2D6CDF', '\u706b': '#E24A3B', '\u571f': '#9A6B2F' };

const PILLAR_TITLES = ['\u5e74\u67f1', '\u6708\u67f1', '\u65e5\u67f1', '\u65f6\u67f1'];
const PILLAR_ROW_LABELS = {
  header: '\u65e5\u671f',
  mainStar: '\u4e3b\u661f',
  stem: '\u5929\u5e72',
  branch: '\u5730\u652f',
  hiddenStem: '\u85cf\u5e72',
  starState: '\u661f\u8fd0',
  xun: '\u65ec\u9996',
  naYin: '\u7eb3\u97f3',
  kongWang: '\u7a7a\u4ea1',
  shenSha: '\u795e\u715e',
};

const TEN_GOD_TEXT = {
  '\u6bd4\u80a9': '\u66f4\u50cf\u9760\u81ea\u5df1\u63a8\u8fdb\uff0c\u5f3a\u8c03\u4e3b\u89c1\u3001\u72ec\u7acb\u548c\u6267\u884c\u3002',
  '\u52ab\u8d22': '\u66f4\u50cf\u540c\u8f88\u7ade\u4e89\u4e0e\u8d44\u6e90\u5206\u6d41\uff0c\u63d0\u9192\u8fb9\u754c\u548c\u53d6\u820d\u3002',
  '\u98df\u795e': '\u66f4\u50cf\u7a33\u5b9a\u8f93\u51fa\u4e0e\u8868\u8fbe\uff0c\u9002\u5408\u6162\u6162\u505a\u51fa\u6210\u7ee9\u3002',
  '\u4f24\u5b98': '\u66f4\u50cf\u950b\u5229\u8868\u8fbe\u4e0e\u7834\u5c40\uff0c\u9002\u5408\u521b\u65b0\uff0c\u4e5f\u8981\u9632\u8fc7\u51b2\u3002',
  '\u504f\u8d22': '\u66f4\u50cf\u6d41\u52a8\u673a\u4f1a\u4e0e\u8d44\u6e90\u6574\u5408\u3002',
  '\u6b63\u8d22': '\u66f4\u50cf\u7a33\u5b9a\u7ecf\u8425\u4e0e\u73b0\u5b9e\u843d\u5730\u3002',
  '\u4e03\u6740': '\u66f4\u50cf\u9ad8\u538b\u8d23\u4efb\u4e0e\u7a81\u7834\u3002',
  '\u6b63\u5b98': '\u66f4\u50cf\u79e9\u5e8f\u3001\u6807\u51c6\u548c\u89d2\u8272\u611f\u3002',
  '\u504f\u5370': '\u66f4\u50cf\u76f4\u89c9\u3001\u7406\u89e3\u548c\u5185\u5728\u611f\u53d7\u3002',
  '\u6b63\u5370': '\u66f4\u50cf\u652f\u6301\u3001\u4fee\u590d\u548c\u5b66\u4e60\u80fd\u529b\u3002',
  '\u65e5\u4e3b': '\u65e5\u4e3b\u5c31\u662f\u547d\u76d8\u91cc\u7684\u201c\u4f60\u201d\u3002',
};

const TEN_GOD_DETAILS = {
  '\u6bd4\u80a9': {
    lead: '\u6bd4\u80a9\u66f4\u50cf\u201c\u6211\u548c\u6211\u81ea\u5df1\u7684\u529b\u91cf\u201d\uff0c\u5f3a\u8c03\u81ea\u6211\u4e3b\u5f20\u3001\u72ec\u7acb\u627f\u62c5\u548c\u6b63\u9762\u786c\u626d\u3002',
    sections: [
      { title: '\u4e13\u4e1a\u5b9a\u4f4d', body: '\u6bd4\u80a9\u662f\u4e0e\u65e5\u4e3b\u540c\u4e94\u884c\u3001\u540c\u9634\u9633\u4e4b\u6c14\uff0c\u5e38\u7528\u6765\u770b\u81ea\u6211\u610f\u5fd7\u3001\u5e76\u80a9\u4e4b\u529b\u3001\u72ec\u7acb\u6027\u548c\u7ade\u4e89\u4e2d\u7684\u6b63\u9762\u627f\u63a5\u3002' },
      { title: '\u73b0\u4ee3\u8bed', body: '\u653e\u5230\u73b0\u5b9e\u91cc\uff0c\u5b83\u50cf\u201c\u6211\u81ea\u5df1\u6765\u201d\u201c\u8fd9\u4ef6\u4e8b\u6211\u626d\u201d\u201c\u6211\u4e0d\u60f3\u5931\u53bb\u4e3b\u52a8\u6743\u201d\u7684\u90a3\u80a1\u52b2\u3002' },
      { title: '\u4f18\u52bf\u9762', body: '\u72b6\u6001\u987a\u65f6\uff0c\u6267\u884c\u529b\u3001\u81ea\u4e3b\u6027\u3001\u6297\u538b\u548c\u6301\u7eed\u63a8\u8fdb\u90fd\u6bd4\u8f83\u5f3a\uff0c\u9002\u5408\u5355\u72ec\u6273\u9879\u76ee\u3001\u505a\u51b3\u5b9a\u3001\u5b88\u4f4f\u8fb9\u754c\u3002' },
      { title: '\u5931\u8861\u65f6', body: '\u8fc7\u5f3a\u65f6\u5bb9\u6613\u592a\u786c\u3001\u4e0d\u613f\u6c42\u52a9\u3001\u56fa\u6267\u9876\u4f4f\uff0c\u751a\u81f3\u628a\u5408\u4f5c\u5173\u7cfb\u53d8\u6210\u6697\u4e2d\u8f83\u52b2\u3002' },
      { title: '\u884c\u52a8\u63d0\u9192', body: '\u6bd4\u80a9\u5f3a\u7684\u4eba\uff0c\u6700\u9002\u5408\u7ec3\u7684\u4e0d\u662f\u66f4\u62fc\uff0c\u800c\u662f\u5206\u5de5\u3001\u6388\u6743\u548c\u9002\u65f6\u501f\u529b\u3002' },
    ],
  },
  '\u52ab\u8d22': {
    lead: '\u52ab\u8d22\u66f4\u50cf\u201c\u540c\u8f88\u7ade\u4e89\u548c\u8d44\u6e90\u5206\u6d41\u201d\uff0c\u5b83\u4e0d\u53ea\u4ee3\u8868\u51b2\u52b2\uff0c\u4e5f\u4ee3\u8868\u8fb9\u754c\u3001\u62a2\u901f\u548c\u6d88\u8017\u3002',
    sections: [
      { title: '\u4e13\u4e1a\u5b9a\u4f4d', body: '\u52ab\u8d22\u662f\u4e0e\u65e5\u4e3b\u540c\u4e94\u884c\u3001\u5f02\u9634\u9633\u4e4b\u6c14\uff0c\u591a\u770b\u540c\u8f88\u4e92\u52a8\u3001\u8d44\u6e90\u7ade\u4e89\u3001\u5206\u593a\u4e0e\u534f\u4f5c\u4e2d\u7684\u5931\u8861\u3002' },
      { title: '\u73b0\u4ee3\u8bed', body: '\u73b0\u5b9e\u91cc\uff0c\u5b83\u50cf\u201c\u6211\u4e5f\u8981\u4e89\u201d\u201c\u8d44\u6e90\u4e0d\u80fd\u6162\u4e00\u6b65\u201d\u201c\u522b\u4eba\u4f1a\u4e0d\u4f1a\u5148\u62ff\u8d70\u201d\u7684\u7d27\u8feb\u611f\u3002' },
      { title: '\u4f18\u52bf\u9762', body: '\u72b6\u6001\u597d\u65f6\uff0c\u884c\u52a8\u679c\u65ad\u3001\u53cd\u5e94\u5feb\u3001\u6562\u4e89\u673a\u4f1a\uff0c\u4e5f\u5bb9\u6613\u5728\u53d8\u5316\u5c40\u91cc\u62a2\u5230\u5148\u624b\u3002' },
      { title: '\u5931\u8861\u65f6', body: '\u5931\u8861\u65f6\u5bb9\u6613\u6025\u3001\u62a2\u3001\u8017\uff0c\u5173\u7cfb\u91cc\u4e5f\u53ef\u80fd\u51fa\u73b0\u6bd4\u8f83\u3001\u8fb9\u754c\u6a21\u7cca\u3001\u8d44\u6e90\u88ab\u5206\u6d41\u7684\u60c5\u51b5\u3002' },
      { title: '\u884c\u52a8\u63d0\u9192', body: '\u52ab\u8d22\u65fa\u65f6\uff0c\u6700\u91cd\u8981\u7684\u662f\u5148\u5b9a\u89c4\u5219\u3001\u5b9a\u4f18\u5148\u7ea7\uff0c\u518d\u51b3\u5b9a\u8981\u4e0d\u8981\u4e89\uff0c\u4e0d\u8981\u4ec0\u4e48\u90fd\u4e0a\u3002' },
    ],
  },
  '\u98df\u795e': {
    lead: '\u98df\u795e\u66f4\u50cf\u201c\u7a33\u5b9a\u8f93\u51fa\u548c\u6301\u7eed\u8868\u8fbe\u201d\uff0c\u662f\u628a\u80fd\u529b\u6162\u6162\u505a\u6210\u4f5c\u54c1\u3001\u53e3\u7891\u548c\u751f\u6d3b\u611f\u7684\u4e00\u5c42\u529b\u91cf\u3002',
    sections: [
      { title: '\u4e13\u4e1a\u5b9a\u4f4d', body: '\u98df\u795e\u4e3b\u8f93\u51fa\u3001\u8868\u8fbe\u3001\u4eab\u53d7\u3001\u751f\u6210\u548c\u6301\u7eed\u4ea7\u51fa\uff0c\u4f20\u7edf\u91cc\u4e5f\u5e38\u4e0e\u798f\u6c14\u3001\u53e3\u798f\u3001\u6280\u827a\u548c\u6e29\u548c\u611f\u76f8\u5173\u3002' },
      { title: '\u73b0\u4ee3\u8bed', body: '\u5b83\u50cf\u201c\u6162\u6162\u505a\u597d\u4e00\u4ef6\u4e8b\u201d\u201c\u628a\u80fd\u529b\u505a\u6210\u7a33\u5b9a\u6210\u679c\u201d\u7684\u8282\u594f\u3002' },
      { title: '\u4f18\u52bf\u9762', body: '\u72b6\u6001\u597d\u65f6\uff0c\u66f4\u9002\u5408\u957f\u671f\u9879\u76ee\u3001\u5185\u5bb9\u8868\u8fbe\u3001\u6559\u5b66\u3001\u966a\u4f34\u3001\u670d\u52a1\u548c\u628a\u7ecf\u9a8c\u6c89\u6dc0\u6210\u65b9\u6cd5\u3002' },
      { title: '\u5931\u8861\u65f6', body: '\u5931\u8861\u65f6\u5bb9\u6613\u62d6\u3001\u6563\u3001\u8fc7\u5ea6\u8212\u670d\uff0c\u6216\u8005\u53ea\u60f3\u8f93\u51fa\u719f\u6089\u7684\u4e1c\u897f\uff0c\u4e0d\u613f\u8fdb\u5165\u66f4\u96be\u7684\u7a81\u7834\u3002' },
      { title: '\u884c\u52a8\u63d0\u9192', body: '\u98df\u795e\u5f3a\u7684\u4eba\uff0c\u6700\u9002\u5408\u5efa\u7acb\u56fa\u5b9a\u8282\u594f\uff1a\u6301\u7eed\u4ea7\u51fa\uff0c\u6bd4\u4e00\u65f6\u7206\u53d1\u66f4\u91cd\u8981\u3002' },
    ],
  },
  '\u4f24\u5b98': {
    lead: '\u4f24\u5b98\u66f4\u50cf\u201c\u950b\u5229\u8868\u8fbe\u548c\u7834\u5c40\u80fd\u529b\u201d\uff0c\u5e26\u521b\u610f\u3001\u5224\u65ad\u548c\u4e0d\u670d\u8f93\uff0c\u4e5f\u5e26\u8fc7\u51b2\u548c\u4e0d\u8010\u7ea6\u675f\u3002',
    sections: [
      { title: '\u4e13\u4e1a\u5b9a\u4f4d', body: '\u4f24\u5b98\u4e3b\u8868\u8fbe\u3001\u7a81\u7834\u3001\u6279\u5224\u3001\u521b\u9020\u548c\u89c4\u5219\u5916\u7684\u5224\u65ad\u529b\uff0c\u4f20\u7edf\u91cc\u4e5f\u5e38\u770b\u5b83\u7684\u950b\u8292\u4e0e\u5bf9\u79e9\u5e8f\u7684\u51b2\u51fb\u3002' },
      { title: '\u73b0\u4ee3\u8bed', body: '\u5b83\u50cf\u201c\u6211\u6709\u81ea\u5df1\u7684\u770b\u6cd5\u201d\u201c\u65e7\u529e\u6cd5\u4e0d\u591f\uff0c\u6211\u8981\u91cd\u505a\u201d\u7684\u90a3\u79cd\u950b\u5229\u611f\u3002' },
      { title: '\u4f18\u52bf\u9762', body: '\u72b6\u6001\u987a\u65f6\uff0c\u521b\u610f\u5f3a\u3001\u6d1e\u5bdf\u5feb\u3001\u8868\u8fbe\u6709\u7a7f\u900f\u529b\uff0c\u9002\u5408\u521b\u65b0\u3001\u5185\u5bb9\u3001\u7b56\u5212\u3001\u4ea7\u54c1\u548c\u7834\u65e7\u7acb\u65b0\u3002' },
      { title: '\u5931\u8861\u65f6', body: '\u5931\u8861\u65f6\u5bb9\u6613\u5634\u5feb\u3001\u5fc3\u6025\u3001\u8fc7\u5ea6\u6311\u5254\u3001\u4e0d\u670d\u7ba1\u7406\uff0c\u5173\u7cfb\u91cc\u4e5f\u5bb9\u6613\u628a\u771f\u8bdd\u8bf4\u6210\u4f24\u4eba\u3002' },
      { title: '\u884c\u52a8\u63d0\u9192', body: '\u4f24\u5b98\u65fa\u65f6\uff0c\u4e0d\u8981\u53ea\u8ffd\u6c42\u201c\u8bf4\u5bf9\u201d\uff0c\u66f4\u8981\u7ec3\u201c\u8bf4\u5f97\u8ba9\u4eba\u80fd\u63a5\u4f4f\u201d\u3002' },
    ],
  },
  '\u504f\u8d22': {
    lead: '\u504f\u8d22\u66f4\u50cf\u201c\u6d41\u52a8\u673a\u4f1a\u548c\u8d44\u6e90\u6574\u5408\u201d\uff0c\u91cd\u7684\u662f\u6293\u673a\u4f1a\u3001\u62c9\u8d44\u6e90\u3001\u8c08\u7a7a\u95f4\uff0c\u800c\u4e0d\u662f\u6162\u6162\u5b88\u6210\u3002',
    sections: [
      { title: '\u4e13\u4e1a\u5b9a\u4f4d', body: '\u504f\u8d22\u504f\u5411\u673a\u52a8\u8d44\u6e90\u3001\u5916\u90e8\u673a\u4f1a\u3001\u4eba\u8109\u6d41\u52a8\u3001\u7ecf\u8425\u611f\u548c\u5bf9\u53d8\u5316\u673a\u4f1a\u7684\u53cd\u5e94\u80fd\u529b\u3002' },
      { title: '\u73b0\u4ee3\u8bed', body: '\u5b83\u50cf\u201c\u54ea\u91cc\u6709\u673a\u4f1a\u201d\u201c\u8c01\u80fd\u5e2e\u6211\u64ac\u52a8\u8d44\u6e90\u201d\u201c\u600e\u4e48\u628a\u5c40\u505a\u5927\u201d\u3002' },
      { title: '\u4f18\u52bf\u9762', body: '\u987a\u65f6\u66f4\u9002\u5408\u5546\u52a1\u3001\u9879\u76ee\u6444\u5408\u3001\u5e02\u573a\u3001\u8d44\u6e90\u6574\u5408\u3001\u8de8\u754c\u5408\u4f5c\u548c\u5f00\u65b0\u5c40\u3002' },
      { title: '\u5931\u8861\u65f6', body: '\u5931\u8861\u65f6\u5bb9\u6613\u5206\u5fc3\u3001\u8d2a\u591a\u3001\u91cd\u773c\u524d\u673a\u4f1a\u800c\u8fbb\u957f\u671f\u6c89\u6dc0\uff0c\u4e5f\u53ef\u80fd\u6709\u201c\u770b\u8d77\u6765\u5f88\u70ed\u95f9\u3001\u843d\u888b\u4e0d\u7a33\u5b9a\u201d\u7684\u95ee\u9898\u3002' },
      { title: '\u884c\u52a8\u63d0\u9192', body: '\u504f\u8d22\u5f3a\u7684\u4eba\uff0c\u8981\u7ed9\u81ea\u5df1\u8bbe\u6b62\u635f\u7ebf\u548c\u7b5b\u9009\u89c4\u5219\uff0c\u673a\u4f1a\u4e0d\u662f\u8d8a\u591a\u8d8a\u597d\u3002' },
    ],
  },
  '\u6b63\u8d22': {
    lead: '\u6b63\u8d22\u66f4\u50cf\u201c\u7a33\u5b9a\u7ecf\u8425\u548c\u73b0\u5b9e\u843d\u5730\u201d\uff0c\u770b\u7684\u662f\u79e9\u5e8f\u3001\u8282\u594f\u3001\u8d23\u4efb\u611f\u548c\u5bf9\u7ed3\u679c\u7684\u6301\u7eed\u5151\u73b0\u3002',
    sections: [
      { title: '\u4e13\u4e1a\u5b9a\u4f4d', body: '\u6b63\u8d22\u504f\u5411\u7a33\u5b9a\u8d44\u6e90\u3001\u79e9\u5e8f\u7ecf\u8425\u3001\u73b0\u5b9e\u8d23\u4efb\u3001\u957f\u671f\u79ef\u7d2f\u548c\u628a\u62bd\u8c61\u4e8b\u60c5\u843d\u5730\u6210\u7ed3\u679c\u3002' },
      { title: '\u73b0\u4ee3\u8bed', body: '\u5b83\u50cf\u201c\u7a33\u7a33\u505a\u3001\u7a33\u7a33\u6536\u201d\u201c\u628a\u751f\u6d3b\u548c\u5de5\u4f5c\u76d8\u7a33\u201d\u7684\u80fd\u529b\u3002' },
      { title: '\u4f18\u52bf\u9762', body: '\u987a\u65f6\u9002\u5408\u7ecf\u8425\u3001\u7ba1\u7406\u3001\u8d22\u52a1\u89c4\u5212\u3001\u957f\u671f\u9879\u76ee\u3001\u7a33\u5b9a\u4e1a\u52a1\u548c\u6301\u7eed\u79ef\u7d2f\u578b\u6210\u679c\u3002' },
      { title: '\u5931\u8861\u65f6', body: '\u5931\u8861\u65f6\u5bb9\u6613\u4fdd\u5b88\u3001\u7b97\u5f97\u592a\u7ec6\u3001\u6015\u5931\u63a7\uff0c\u4e5f\u53ef\u80fd\u56e0\u4e3a\u592a\u5728\u610f\u73b0\u5b9e\u5b89\u5168\u611f\u800c\u4e0d\u6562\u5347\u7ea7\u3002' },
      { title: '\u884c\u52a8\u63d0\u9192', body: '\u6b63\u8d22\u65fa\u65f6\uff0c\u8981\u5728\u7a33\u548c\u6d3b\u4e4b\u95f4\u7559\u4e00\u70b9\u5f39\u6027\uff0c\u4e0d\u7136\u5bb9\u6613\u628a\u81ea\u5df1\u5b88\u5f97\u592a\u7d27\u3002' },
    ],
  },
  '\u4e03\u6740': {
    lead: '\u4e03\u6740\u66f4\u50cf\u201c\u9ad8\u538b\u8d23\u4efb\u548c\u7a81\u7834\u573a\u201d\uff0c\u5b83\u5e26\u538b\u529b\u3001\u98ce\u9669\u3001\u7ade\u4e89\uff0c\u4e5f\u5e26\u51b3\u65ad\u3001\u80c6\u8bc6\u548c\u7a7f\u8d8a\u80fd\u529b\u3002',
    sections: [
      { title: '\u4e13\u4e1a\u5b9a\u4f4d', body: '\u4e03\u6740\u4e3b\u538b\u529b\u3001\u5916\u90e8\u8981\u6c42\u3001\u89c4\u5219\u4e4b\u5916\u7684\u5f3a\u523a\u6fc0\uff0c\u4e5f\u4e3b\u6267\u884c\u529b\u3001\u5e94\u53d8\u3001\u80c6\u9b44\u548c\u7834\u96be\u3002' },
      { title: '\u73b0\u4ee3\u8bed', body: '\u5b83\u50cf\u201c\u4e8b\u60c5\u6765\u4e86\uff0c\u4f60\u5fc5\u987b\u9a6c\u4e0a\u626d\u4f4f\u201d\u7684\u5c40\u3002' },
      { title: '\u4f18\u52bf\u9762', body: '\u987a\u65f6\u80fd\u9876\u538b\u3001\u6562\u51b3\u7b56\u3001\u80fd\u5728\u590d\u6742\u548c\u9ad8\u538b\u73af\u5883\u91cc\u6253\u5f00\u5c40\u9762\uff0c\u9002\u5408\u5e26\u961f\u3001\u653b\u575a\u3001\u5371\u673a\u5904\u7406\u3002' },
      { title: '\u5931\u8861\u65f6', body: '\u5931\u8861\u65f6\u4f1a\u6025\u3001\u786c\u3001\u538b\u5f97\u81ea\u5df1\u5598\u4e0d\u8fc7\u6c14\uff0c\u4e5f\u5bb9\u6613\u628a\u5173\u7cfb\u548c\u5de5\u4f5c\u90fd\u53d8\u6210\u957f\u671f\u8b66\u62a5\u72b6\u6001\u3002' },
      { title: '\u884c\u52a8\u63d0\u9192', body: '\u4e03\u6740\u5f3a\u7684\u4eba\uff0c\u8981\u7ec3\u201c\u6709\u8282\u594f\u5730\u7528\u529b\u201d\uff0c\u4e0d\u662f\u4e00\u76f4\u7ef7\u7d27\uff0c\u624d\u8d70\u5f97\u66f4\u8fdc\u3002' },
    ],
  },
  '\u6b63\u5b98': {
    lead: '\u6b63\u5b98\u66f4\u50cf\u201c\u79e9\u5e8f\u3001\u6807\u51c6\u548c\u89d2\u8272\u611f\u201d\uff0c\u5f3a\u8c03\u8d23\u4efb\u8fb9\u754c\u3001\u89c4\u5219\u610f\u8bc6\u548c\u5728\u7cfb\u7edf\u4e2d\u7684\u7a33\u5065\u4f4d\u7f6e\u3002',
    sections: [
      { title: '\u4e13\u4e1a\u5b9a\u4f4d', body: '\u6b63\u5b98\u4e3b\u79e9\u5e8f\u3001\u89c4\u8303\u3001\u8d23\u4efb\u3001\u540d\u5206\u4e0e\u89d2\u8272\u610f\u8bc6\uff0c\u504f\u5411\u7a33\u5b9a\u3001\u53ef\u4fe1\u3001\u53ef\u627f\u62c5\u3002' },
      { title: '\u73b0\u4ee3\u8bed', body: '\u5b83\u50cf\u201c\u6211\u77e5\u9053\u4ec0\u4e48\u8be5\u505a\u3001\u4ec0\u4e48\u4e0d\u8be5\u505a\uff0c\u4e5f\u77e5\u9053\u81ea\u5df1\u8be5\u7ad9\u5728\u54ea\u4e2a\u4f4d\u7f6e\u201d\u3002' },
      { title: '\u4f18\u52bf\u9762', body: '\u987a\u65f6\u9002\u5408\u5236\u5ea6\u578b\u5c97\u4f4d\u3001\u7ba1\u7406\u3001\u7ec4\u7ec7\u534f\u4f5c\u3001\u957f\u671f\u8d23\u4efb\u4f4d\u548c\u88ab\u4fe1\u4efb\u7684\u4f4d\u7f6e\u3002' },
      { title: '\u5931\u8861\u65f6', body: '\u5931\u8861\u65f6\u5bb9\u6613\u8fc7\u5ea6\u5728\u610f\u8bc4\u4ef7\u3001\u592a\u60f3\u6b63\u786e\u3001\u592a\u6015\u51fa\u9519\uff0c\u4e5f\u53ef\u80fd\u88ab\u89c4\u5219\u611f\u56f0\u4f4f\u7075\u6d3b\u6027\u3002' },
      { title: '\u884c\u52a8\u63d0\u9192', body: '\u6b63\u5b98\u5f3a\u7684\u4eba\uff0c\u8981\u5b66\u4f1a\u5728\u5b88\u89c4\u5219\u7684\u540c\u65f6\uff0c\u4e3a\u81ea\u5df1\u4fdd\u7559\u4e00\u70b9\u521b\u9020\u7a7a\u95f4\u3002' },
    ],
  },
  '\u504f\u5370': {
    lead: '\u504f\u5370\u66f4\u50cf\u201c\u76f4\u89c9\u3001\u7406\u89e3\u548c\u5185\u5728\u611f\u53d7\u201d\uff0c\u5b83\u4e0d\u4e00\u5b9a\u9ad8\u8c03\uff0c\u5374\u5f88\u4f1a\u81ea\u5df1\u6d88\u5316\u3001\u81ea\u5df1\u7406\u89e3\u548c\u81ea\u5df1\u8054\u60f3\u3002',
    sections: [
      { title: '\u4e13\u4e1a\u5b9a\u4f4d', body: '\u504f\u5370\u504f\u5411\u76f4\u89c9\u3001\u611f\u77e5\u3001\u72ec\u7acb\u7406\u89e3\u3001\u5438\u6536\u65b9\u5f0f\u7279\u522b\uff0c\u4ee5\u53ca\u4e0d\u6309\u6807\u51c6\u8def\u5f84\u83b7\u53d6\u4fe1\u606f\u3002' },
      { title: '\u73b0\u4ee3\u8bed', body: '\u5b83\u50cf\u201c\u6211\u4e0d\u4e00\u5b9a\u6309\u522b\u4eba\u90a3\u5957\u5b66\uff0c\u4f46\u6211\u4f1a\u81ea\u5df1\u60f3\u660e\u767d\u201d\u3002' },
      { title: '\u4f18\u52bf\u9762', body: '\u987a\u65f6\u9002\u5408\u7814\u7a76\u3001\u521b\u4f5c\u3001\u54a8\u8be2\u3001\u6d1e\u5bdf\u578b\u5de5\u4f5c\uff0c\u4ee5\u53ca\u9700\u8981\u72ec\u7acb\u601d\u8003\u548c\u611f\u77e5\u529b\u7684\u65b9\u5411\u3002' },
      { title: '\u5931\u8861\u65f6', body: '\u5931\u8861\u65f6\u5bb9\u6613\u60f3\u592a\u591a\u3001\u548c\u73b0\u5b9e\u8131\u8282\u3001\u5185\u8017\u91cd\uff0c\u751a\u81f3\u5bf9\u4eba\u7fa4\u548c\u6d41\u7a0b\u611f\u5230\u75b2\u60eb\u3002' },
      { title: '\u884c\u52a8\u63d0\u9192', body: '\u504f\u5370\u5f3a\u65f6\uff0c\u8981\u628a\u7406\u89e3\u843d\u5230\u884c\u52a8\uff0c\u4e0d\u7136\u5f88\u5bb9\u6613\u4e00\u76f4\u61c2\uff0c\u5374\u8fdf\u8fdf\u4e0d\u52a8\u3002' },
    ],
  },
  '\u6b63\u5370': {
    lead: '\u6b63\u5370\u66f4\u50cf\u201c\u652f\u6301\u3001\u4fee\u590d\u548c\u5b66\u4e60\u80fd\u529b\u201d\uff0c\u4ee3\u8868\u88ab\u6258\u4f4f\u3001\u80fd\u5438\u6536\u3001\u80fd\u6062\u590d\uff0c\u4e5f\u4ee3\u8868\u7a33\u5b9a\u7684\u5185\u5728\u5b89\u5168\u611f\u3002',
    sections: [
      { title: '\u4e13\u4e1a\u5b9a\u4f4d', body: '\u6b63\u5370\u4e3b\u652f\u6301\u3001\u5b66\u4e60\u3001\u4fee\u590d\u3001\u5438\u6536\u3001\u88ab\u7167\u987e\u4e0e\u5185\u5728\u7a33\u5b9a\u611f\uff0c\u4e5f\u5e38\u770b\u4f5c\u4fdd\u62a4\u548c\u7f13\u51b2\u3002' },
      { title: '\u73b0\u4ee3\u8bed', body: '\u5b83\u50cf\u201c\u6709\u4eba\u6258\u4f4f\u6211\u201d\u6216\u201c\u6211\u81ea\u5df1\u80fd\u628a\u81ea\u5df1\u6162\u6162\u4fee\u56de\u6765\u201d\u7684\u80fd\u529b\u3002' },
      { title: '\u4f18\u52bf\u9762', body: '\u987a\u65f6\u6709\u5b66\u4e60\u529b\u3001\u5305\u5bb9\u5ea6\u3001\u7a33\u5b9a\u6062\u590d\u529b\u548c\u8f83\u597d\u7684\u6574\u5408\u80fd\u529b\uff0c\u9002\u5408\u957f\u671f\u5b66\u4e60\u4e0e\u6c89\u6dc0\u3002' },
      { title: '\u5931\u8861\u65f6', body: '\u5931\u8861\u65f6\u5bb9\u6613\u8fc7\u5ea6\u4f9d\u8d56\u719f\u6089\u611f\u3001\u4e0d\u613f\u79bb\u5f00\u8212\u9002\u533a\uff0c\u6216\u8005\u60f3\u5f88\u591a\u3001\u505a\u5f97\u6162\u3002' },
      { title: '\u884c\u52a8\u63d0\u9192', body: '\u6b63\u5370\u65fa\u65f6\uff0c\u8981\u628a\u201c\u7406\u89e3\u548c\u51c6\u5907\u201d\u5f80\u524d\u63a8\u6210\u201c\u884c\u52a8\u548c\u4ea4\u4ed8\u201d\uff0c\u8fd9\u6837\u4f18\u52bf\u624d\u4f1a\u843d\u5730\u3002' },
    ],
  },
  '\u65e5\u4e3b': {
    lead: '\u65e5\u4e3b\u5c31\u662f\u547d\u76d8\u91cc\u7684\u201c\u4f60\u201d\uff0c\u5176\u4ed6\u5341\u795e\u90fd\u50cf\u56f4\u7ed5\u4f60\u5c55\u5f00\u7684\u5173\u7cfb\u3001\u8d44\u6e90\u3001\u538b\u529b\u548c\u8868\u8fbe\u65b9\u5f0f\u3002',
    sections: [
      { title: '\u4e13\u4e1a\u5b9a\u4f4d', body: '\u65e5\u4e3b\u662f\u6574\u5f20\u547d\u76d8\u7684\u6838\u5fc3\u53c2\u7167\u70b9\uff0c\u5341\u795e\u3001\u5f3a\u5f31\u3001\u559c\u5fcc\u548c\u9636\u6bb5\u53d8\u5316\uff0c\u90fd\u662f\u56f4\u7ed5\u65e5\u4e3b\u6765\u5224\u65ad\u3002' },
      { title: '\u73b0\u4ee3\u8bed', body: '\u53ef\u4ee5\u628a\u5b83\u7406\u89e3\u6210\u201c\u8fd9\u5f20\u76d8\u91cc\uff0c\u771f\u6b63\u4ee3\u8868\u4f60\u81ea\u5df1\u7684\u4e00\u70b9\u6838\u5fc3\u6c14\u8d28\u201d\u3002' },
      { title: '\u4f18\u52bf\u9762', body: '\u7406\u89e3\u65e5\u4e3b\u540e\uff0c\u66f4\u5bb9\u6613\u770b\u6e05\u4ec0\u4e48\u662f\u81ea\u5df1\u7684\u539f\u751f\u52a8\u529b\uff0c\u4ec0\u4e48\u53ea\u662f\u9636\u6bb5\u6027\u653e\u5927\u7684\u5916\u90e8\u523a\u6fc0\u3002' },
      { title: '\u5931\u8861\u65f6', body: '\u5982\u679c\u53ea\u770b\u5916\u90e8\u5409\u51f6\uff0c\u4e0d\u770b\u65e5\u4e3b\u672c\u8eab\u5f3a\u5f31\uff0c\u5f88\u5bb9\u6613\u628a\u6574\u5f20\u76d8\u8bfb\u504f\u3002' },
      { title: '\u884c\u52a8\u63d0\u9192', body: '\u5148\u770b\u65e5\u4e3b\uff0c\u518d\u770b\u5341\u795e\u548c\u795e\u715e\uff0c\u89e3\u91ca\u4f1a\u66f4\u7a33\uff0c\u4e5f\u66f4\u63a5\u8fd1\u4f60\u81ea\u5df1\u7684\u771f\u5b9e\u8282\u594f\u3002' },
    ],
  },
};

function makeShenShaDetail(lead, take, modern, positive, caution, action) {
  return {
    lead,
    sections: [
      { title: '\u53d6\u8c61', body: take },
      { title: '\u73b0\u4ee3\u8bed', body: modern },
      { title: '\u4e3a\u559c\u65f6', body: positive },
      { title: '\u4e3a\u5fcc\u65f6', body: caution },
      { title: '\u884c\u52a8\u63d0\u9192', body: action },
    ],
  };
}

const SHEN_SHA_TEXT = {
  '\u960e\u738b\u5173': {
    lead: '\u8fd9\u7c7b\u795e\u715e\u66f4\u50cf\u662f\u5bf9\u65e9\u5e74\u4f53\u8d28\u3001\u517b\u62a4\u73af\u5883\u548c\u957f\u671f\u7a33\u5b9a\u611f\u7684\u63d0\u9192\uff0c\u4e0d\u662f\u5355\u72ec\u770b\u5230\u5c31\u76f4\u63a5\u5b9a\u51f6\u3002',
    sections: [
      { title: '\u53d6\u8c61', body: '\u5c5e\u4e8e\u5c0f\u513f\u5173\u715e\u4e2d\u8f83\u91cd\u7684\u4e00\u7c7b\uff0c\u4f20\u7edf\u4e0a\u66f4\u5f3a\u8c03\u5e74\u5e7c\u65f6\u671f\u7684\u75c5\u707e\u3001\u4f53\u8d28\u865a\u5f31\u548c\u96be\u517b\u6027\u3002' },
      { title: '\u73b0\u4ee3\u8bed', body: '\u653e\u5230\u73b0\u4ee3\u751f\u6d3b\u91cc\uff0c\u5b83\u66f4\u50cf\u662f\u63d0\u9192\u4f60\u5728\u4f53\u529b\u3001\u7761\u7720\u3001\u4f5c\u606f\u548c\u5bb6\u5ead\u652f\u6301\u611f\u8fd9\u4e9b\u57fa\u7840\u9762\u4e0a\uff0c\u8981\u6bd4\u522b\u4eba\u66f4\u91cd\u89c6\u6253\u5e95\u3002' },
      { title: '\u4e3a\u559c\u65f6', body: '\u5f80\u5f80\u4f1a\u53d8\u6210\u201c\u65e9\u5e74\u591a\u7167\u770b\uff0c\u540e\u9762\u53cd\u800c\u66f4\u73cd\u60dc\u8eab\u4f53\u548c\u5bb6\u5ead\u7a33\u5b9a\u201d\u7684\u63d0\u9192\uff0c\u4f1a\u4eba\u66f4\u61c2\u5f97\u957f\u671f\u7ef4\u7a33\u3002' },
      { title: '\u4e3a\u5fcc\u65f6', body: '\u5c31\u5bb9\u6613\u4f53\u73b0\u6210\u5c0f\u65f6\u4f53\u5f31\u3001\u53cd\u590d\u5c0f\u75c5\u75db\uff0c\u6216\u6210\u5e74\u540e\u4ecd\u6709\u8fc7\u5ea6\u900f\u652f\u8eab\u4f53\u7684\u503e\u5411\uff0c\u603b\u662f\u5148\u8017\u81ea\u5df1\u518d\u8865\u3002' },
      { title: '\u884c\u52a8\u63d0\u9192', body: '\u8fd9\u4e2a\u4fe1\u53f7\u51fa\u73b0\u65f6\uff0c\u66f4\u9002\u5408\u628a\u4f5c\u606f\u3001\u4f53\u68c0\u3001\u98ee\u98df\u548c\u957f\u671f\u7ef4\u7a33\u653e\u5728\u5148\u624b\u987a\u5e8f\uff0c\u5148\u628a\u8eab\u4f53\u57fa\u5ea7\u6253\u7a33\u3002' },
    ],
  },
  '\u56db\u5b63\u5173': {
    lead: '\u5b83\u66f4\u50cf\u201c\u963b\u529b\u7cfb\u6570\u504f\u9ad8\u201d\u7684\u63d0\u9192\uff0c\u4e0d\u662f\u505a\u4ec0\u4e48\u90fd\u4e0d\u884c\uff0c\u800c\u662f\u9700\u8981\u66f4\u6709\u8282\u594f\u5730\u63a8\u8fdb\u3002',
    sections: [
      { title: '\u53d6\u8c61', body: '\u5c5e\u4e8e\u5c0f\u513f\u5173\u715e\u91cc\u7684\u963b\u6ede\u578b\u63d0\u9192\uff0c\u4f20\u7edf\u4e0a\u4e3b\u505a\u4e8b\u963b\u529b\u3001\u4f53\u8d28\u53cd\u590d\u3001\u8fc7\u7a0b\u591a\u66f2\u6298\u3002' },
      { title: '\u73b0\u4ee3\u8bed', body: '\u653e\u5230\u73b0\u4ee3\u8bed\u5883\u91cc\uff0c\u5c31\u50cf\u662f\u4f60\u5f88\u591a\u4e8b\u4e0d\u662f\u505a\u4e0d\u6210\uff0c\u800c\u662f\u6bd4\u8f83\u5bb9\u6613\u9047\u5230\u201c\u8d77\u6b65\u4e0d\u987a\u3001\u4e2d\u95f4\u88ab\u5361\u4e00\u4e0b\u201d\u7684\u60c5\u51b5\u3002' },
      { title: '\u4e3a\u559c\u65f6', body: '\u53cd\u800c\u4f1a\u8ba9\u4eba\u5bf9\u98ce\u9669\u66f4\u654f\u611f\uff0c\u611f\u89c9\u5230\u969c\u788d\u65f6\u4f1a\u5148\u8865\u57fa\u7840\u3001\u8865\u51c6\u5907\uff0c\u540e\u7eed\u4e00\u65e6\u8d77\u52bf\u53cd\u800c\u66f4\u7a33\u3002' },
      { title: '\u4e3a\u5fcc\u65f6', body: '\u5c31\u5bb9\u6613\u53d8\u6210\u201c\u660e\u660e\u5f88\u60f3\u63a8\u8fdb\uff0c\u4f46\u603b\u88ab\u7ec6\u8282\u5361\u4f4f\u201d\uff0c\u4e5f\u5bb9\u6613\u56e0\u4e3a\u4e0d\u987a\u800c\u5fc3\u6d6e\u6c14\u8e81\u3002' },
      { title: '\u884c\u52a8\u63d0\u9192', body: '\u9047\u5230\u963b\u529b\u65f6\uff0c\u5148\u68c0\u67e5\u8282\u594f\u3001\u8d44\u6e90\u548c\u57fa\u7840\u51c6\u5907\uff0c\u628a\u5927\u76ee\u6807\u62c6\u6210\u5c0f\u8282\u70b9\uff0c\u6bd4\u786c\u9876\u66f4\u6709\u7528\u3002' },
    ],
  },
  '\u5b85\u715e': {
    lead: '\u8fd9\u4e2a\u4fe1\u53f7\u66f4\u50cf\u662f\u548c\u201c\u5bb6\u5ead\u6839\u57fa\u3001\u5b89\u5b9a\u611f\u3001\u81ea\u5df1\u91cd\u5efa\u751f\u6d3b\u79e9\u5e8f\u201d\u6709\u5173\u3002',
    sections: [
      { title: '\u53d6\u8c61', body: '\u4f20\u7edf\u4e0a\u5e38\u89c1\u4e3a\u201c\u7834\u5b85\u201d\u4e4b\u610f\uff0c\u591a\u6307\u5411\u5bb6\u5b85\u6839\u57fa\u3001\u7956\u4e1a\u6267\u627f\u6216\u79bb\u5bb6\u53d8\u52a8\u3002' },
      { title: '\u73b0\u4ee3\u8bed', body: '\u66f4\u50cf\u662f\u8bf4\u4e00\u4e9b\u4eba\u4e0d\u592a\u5bb9\u6613\u76f4\u63a5\u627f\u63a5\u539f\u6709\u5bb6\u65cf\u8d44\u6e90\uff0c\u66f4\u9700\u8981\u9760\u81ea\u5df1\u5728\u5916\u9762\u91cd\u5efa\u4f4f\u5c45\u3001\u73b0\u91d1\u6d41\u548c\u5b89\u5b9a\u611f\u3002' },
      { title: '\u4e3a\u559c\u65f6', body: '\u5b83\u4f1a\u63a8\u7740\u4eba\u66f4\u65e9\u5b66\u4f1a\u72ec\u7acb\uff0c\u9002\u5408\u5916\u51fa\u53d1\u5c55\u3001\u6362\u57ce\u5e02\u3001\u6362\u8d5b\u9053\uff0c\u5728\u65b0\u5730\u65b9\u91cd\u5efa\u81ea\u5df1\u7684\u6839\u3002' },
      { title: '\u4e3a\u5fcc\u65f6', body: '\u5c31\u5bb9\u6613\u8868\u73b0\u6210\u5bb6\u5ead\u652f\u6301\u611f\u4e0d\u8db3\u3001\u5c45\u4f4f\u4e0d\u7a33\uff0c\u6216\u8005\u4eba\u4e00\u76f4\u5728\u8fc1\u79fb\u8f6c\u6362\u4e2d\u96be\u4ee5\u771f\u6b63\u5b89\u5b9a\u4e0b\u6765\u3002' },
      { title: '\u884c\u52a8\u63d0\u9192', body: '\u6709\u8fd9\u4e2a\u4fe1\u53f7\u65f6\uff0c\u66f4\u8981\u91cd\u89c6\u201c\u4f4f\u5904\u7a33\u5b9a\u3001\u73b0\u91d1\u7ed3\u6784\u3001\u5bb6\u5ead\u8fb9\u754c\u548c\u957f\u671f\u57fa\u5efa\u201d\uff0c\u800c\u4e0d\u662f\u53ea\u5fd9\u5f53\u4e0b\u7684\u5bf9\u4ed8\u3002' },
    ],
  },
};

Object.assign(SHEN_SHA_TEXT, {
  '\u5929\u5fb7': makeShenShaDetail('\u5929\u5fb7\u504f\u5411\u9047\u4e8b\u6709\u8f6c\u5706\u3001\u6709\u8d35\u6c14\u3001\u6709\u5316\u89e3\u7a7a\u95f4\u7684\u4fdd\u62a4\u578b\u795e\u715e\u3002', '\u4f20\u7edf\u4e0a\u4e3b\u4ec1\u539a\u3001\u5f97\u52a9\u3001\u9022\u51f6\u6709\u89e3\uff0c\u4e5f\u5e38\u548c\u54c1\u884c\u3001\u5bbd\u539a\u3001\u4eba\u60c5\u7f18\u6709\u5173\u3002', '\u66f4\u50cf\u4f60\u5728\u590d\u6742\u5c40\u91cc\u8f83\u5bb9\u6613\u9047\u5230\u613f\u610f\u7559\u4f59\u5730\u3001\u5e2e\u4f60\u7f13\u4e00\u53e3\u6c14\u7684\u4eba\u548c\u673a\u4f1a\u3002', '\u6709\u5229\u65f6\u4f1a\u8f6c\u6210\u4f53\u9762\u611f\u3001\u4fee\u590d\u5173\u7cfb\u7684\u80fd\u529b\uff0c\u9047\u5230\u51b2\u7a81\u4e5f\u8f83\u6613\u627e\u5230\u7f13\u51b2\u533a\u3002', '\u5931\u8861\u65f6\u4e5f\u53ef\u80fd\u53d8\u6210\u603b\u89c9\u5f97\u6709\u4eba\u4f1a\u515c\u5e95\uff0c\u4ece\u800c\u4f4e\u4f30\u98ce\u9669\u548c\u540e\u679c\u3002', '\u6700\u9002\u5408\u628a\u8fd9\u4efd\u4fdd\u62a4\u529b\u7528\u5728\u4fee\u590d\u5173\u7cfb\u3001\u5584\u540e\u548c\u5efa\u7acb\u4fe1\u7528\u4e0a\uff0c\u4e0d\u8981\u628a\u5b83\u5f53\u6210\u53ef\u4ee5\u968f\u610f\u5192\u9669\u7684\u514d\u6b7b\u91d1\u724c\u3002'),
  '\u6708\u5fb7': makeShenShaDetail('\u6708\u5fb7\u66f4\u5f3a\u8c03\u6e29\u548c\u5316\u89e3\u3001\u5173\u7cfb\u6da6\u6ed1\u3001\u65e5\u5e38\u5c42\u9762\u7684\u798f\u6cfd\u3002', '\u4f20\u7edf\u4e0a\u4e3b\u5584\u7f18\u3001\u7f13\u548c\u51b2\u7a81\u3001\u51cf\u8f7b\u521a\u70c8\u4e4b\u6c14\uff0c\u504f\u5411\u67d4\u6027\u7684\u5316\u89e3\u529b\u3002', '\u50cf\u4e00\u79cd\u8ba9\u4eba\u613f\u610f\u7ed9\u4f60\u4e00\u6b21\u673a\u4f1a\u7684\u6c14\u573a\uff0c\u5c24\u5176\u4f53\u73b0\u5728\u534f\u4f5c\u3001\u4eba\u9645\u548c\u73b0\u5b9e\u78e8\u5408\u91cc\u3002', '\u987a\u65f6\u66f4\u5bb9\u6613\u628a\u68d8\u624b\u95ee\u9898\u8c08\u8f6f\uff0c\u628a\u5c16\u9510\u5173\u7cfb\u8c08\u7f13\uff0c\u9002\u5408\u505a\u6c9f\u901a\u548c\u6da6\u6ed1\u89d2\u8272\u3002', '\u5931\u8861\u65f6\u5219\u53ef\u80fd\u592a\u4f1a\u987e\u5168\u548c\u5706\u573a\uff0c\u6700\u540e\u628a\u81ea\u5df1\u7684\u8fb9\u754c\u548c\u7acb\u573a\u78e8\u6ca1\u3002', '\u9047\u5230\u5bf9\u7acb\u65f6\u53ef\u4ee5\u5148\u501f\u8fd9\u80a1\u67d4\u6027\u505a\u7f13\u51b2\uff0c\u4f46\u4ecd\u8981\u8bb0\u5f97\u5b88\u4f4f\u81ea\u5df1\u7684\u539f\u5219\u7ebf\u3002'),
  '\u5929\u4e59': makeShenShaDetail('\u5929\u4e59\u8d35\u4eba\u662f\u6700\u5178\u578b\u7684\u5173\u952e\u65f6\u5019\u6709\u4eba\u80fd\u63a5\u4f4f\u4f60\u7684\u8d35\u4eba\u7c7b\u795e\u715e\u3002', '\u4f20\u7edf\u4e0a\u4e3b\u8d35\u4eba\u3001\u52a9\u529b\u3001\u9022\u96be\u6709\u4eba\u6276\u6301\uff0c\u4e5f\u5e38\u4e0e\u8d44\u6e90\u5bf9\u63a5\u3001\u63d0\u643a\u6709\u5173\u3002', '\u50cf\u4f60\u5728\u5173\u952e\u8282\u70b9\u66f4\u5bb9\u6613\u9047\u5230\u9760\u8c31\u524d\u8f88\u3001\u4e13\u4e1a\u4eba\u58eb\u6216\u5173\u952e\u8d44\u6e90\u7a97\u53e3\u3002', '\u6709\u5229\u65f6\u4f1a\u8f6c\u6210\u5408\u4f5c\u673a\u4f1a\u3001\u804c\u4e1a\u63d0\u643a\u3001\u5361\u70b9\u7a81\u7834\u548c\u590d\u6742\u95ee\u9898\u7684\u5feb\u901f\u758f\u901a\u3002', '\u4e0d\u5229\u65f6\u4e5f\u5bb9\u6613\u53d8\u6210\u8fc7\u5ea6\u4f9d\u8d56\u5916\u63f4\uff0c\u81ea\u5df1\u4e0d\u505a\u5e95\u5c42\u80fd\u529b\u5efa\u8bbe\u3002', '\u5e73\u65f6\u5148\u628a\u80fd\u529b\u548c\u4fe1\u7528\u6253\u7a33\uff0c\u5173\u952e\u65f6\u523b\u8d35\u4eba\u624d\u771f\u7684\u63a5\u5f97\u4f4f\u4f60\u3002'),
  '\u592a\u6781': makeShenShaDetail('\u592a\u6781\u504f\u5411\u609f\u6027\u3001\u7406\u89e3\u529b\u3001\u5bf9\u89c4\u5f8b\u7684\u654f\u611f\u5ea6\u3002', '\u4f20\u7edf\u4e0a\u591a\u4e3b\u806a\u6167\u3001\u597d\u5b66\u3001\u5584\u601d\u3001\u8fd1\u54f2\u601d\u6216\u7384\u601d\u3002', '\u50cf\u4e00\u79cd\u5bb9\u6613\u770b\u51fa\u672c\u8d28\uff0c\u4e5f\u613f\u610f\u8010\u5fc3\u601d\u8003\u7cfb\u7edf\u7ed3\u6784\u7684\u80fd\u529b\u3002', '\u987a\u65f6\u9002\u5408\u7814\u7a76\u3001\u6559\u5b66\u3001\u54a8\u8be2\u3001\u5185\u5bb9\u6574\u7406\u548c\u957f\u671f\u6c89\u6dc0\u578b\u5de5\u4f5c\u3002', '\u4e0d\u5229\u65f6\u5219\u53ef\u80fd\u60f3\u5f97\u592a\u6df1\u3001\u505a\u5f97\u592a\u6162\uff0c\u6216\u603b\u5728\u89c2\u5bdf\u91cc\u9519\u8fc7\u884c\u52a8\u65f6\u673a\u3002', '\u628a\u601d\u8003\u548c\u609f\u6027\u843d\u5230\u8f93\u51fa\u548c\u65b9\u6cd5\u4e0a\uff0c\u5b83\u624d\u4f1a\u53d8\u6210\u53ef\u7a33\u5b9a\u590d\u7528\u7684\u4f18\u52bf\u3002'),
  '\u4e09\u5947': makeShenShaDetail('\u4e09\u5947\u66f4\u50cf\u7ec4\u5408\u578b\u7075\u6c14\u548c\u7834\u5c40\u611f\uff0c\u4e0d\u662f\u5355\u70b9\u5f3a\uff0c\u800c\u662f\u642d\u914d\u8d77\u6765\u7279\u522b\u6709\u5448\u73b0\u5ea6\u3002', '\u4f20\u7edf\u4e0a\u4e3b\u806a\u654f\u3001\u673a\u53d8\u3001\u7075\u79c0\u548c\u975e\u5e38\u89c4\u7684\u7834\u5c40\u80fd\u529b\u3002', '\u50cf\u521b\u610f\u3001\u53cd\u5e94\u3001\u8d44\u6e90\u8c03\u5ea6\u548c\u65f6\u673a\u611f\u78b0\u5728\u4e00\u8d77\u65f6\u51fa\u73b0\u7684\u9ad8\u5149\u7ec4\u5408\u3002', '\u6709\u5229\u65f6\u4eba\u5bb9\u6613\u5728\u590d\u6742\u5c40\u91cc\u627e\u5230\u5de7\u52b2\uff0c\u9002\u5408\u7b56\u7565\u3001\u521b\u610f\u3001\u4ea7\u54c1\u548c\u4e34\u573a\u5e94\u53d8\u3002', '\u4e0d\u5229\u65f6\u5219\u5bb9\u6613\u53ea\u5269\u4e0b\u82b1\u5de7\u3001\u8df3\u8131\u548c\u4e0d\u7a33\u5b9a\uff0c\u70b9\u5b50\u5f88\u591a\u4f46\u843d\u5730\u4e0d\u8db3\u3002', '\u628a\u5947\u6c14\u7528\u5728\u89e3\u51b3\u95ee\u9898\u4e0a\uff0c\u800c\u4e0d\u662f\u53ea\u8ffd\u6c42\u770b\u8d77\u6765\u60ca\u8273\uff0c\u4e09\u5947\u624d\u4f1a\u53d8\u6210\u771f\u6b63\u7684\u4f18\u52bf\u3002'),
  '\u6587\u660c': makeShenShaDetail('\u6587\u660c\u662f\u6700\u5178\u578b\u7684\u5b66\u4e60\u3001\u8868\u8fbe\u3001\u6761\u7406\u6e05\u6670\u4e4b\u8c61\u3002', '\u4f20\u7edf\u4e0a\u4e3b\u8bfb\u4e66\u3001\u6587\u540d\u3001\u8003\u8bd5\u3001\u5199\u4f5c\u548c\u8868\u8fbe\u80fd\u529b\u3002', '\u50cf\u8bed\u8a00\u7ec4\u7ec7\u80fd\u529b\u3001\u77e5\u8bc6\u5438\u6536\u80fd\u529b\uff0c\u4ee5\u53ca\u628a\u590d\u6742\u5185\u5bb9\u8bb2\u660e\u767d\u7684\u80fd\u529b\u3002', '\u6709\u5229\u65f6\u9002\u5408\u5199\u4f5c\u3001\u7b56\u5212\u3001\u6559\u5b66\u3001\u5185\u5bb9\u3001\u7814\u7a76\u548c\u6c9f\u901a\u5de5\u4f5c\u3002', '\u4e0d\u5229\u65f6\u53ef\u80fd\u53d8\u6210\u53ea\u4f1a\u60f3\u548c\u8bf4\uff0c\u5374\u8fdf\u8fdf\u4e0d\u52a8\u624b\uff0c\u6216\u8fc7\u4e8e\u5728\u610f\u8868\u73b0\u3002', '\u7ed9\u5b66\u4e60\u548c\u8868\u8fbe\u8bbe\u5b9a\u8f93\u51fa\u76ee\u6807\uff0c\u6587\u660c\u4e4b\u6c14\u624d\u4e0d\u4f1a\u53ea\u505c\u5728\u8f93\u5165\u5c42\u3002'),
  '\u56fd\u5370': makeShenShaDetail('\u56fd\u5370\u504f\u5411\u5236\u5ea6\u3001\u4fe1\u4efb\u3001\u8d44\u683c\u3001\u540d\u5206\u548c\u627f\u62c5\u3002', '\u4f20\u7edf\u4e0a\u4e3b\u5370\u4fe1\u3001\u638c\u4e8b\u3001\u53d7\u4fe1\u4efb\uff0c\u4e5f\u4e0e\u804c\u8d23\u3001\u8d44\u8d28\u548c\u6b63\u5f0f\u89d2\u8272\u6709\u5173\u3002', '\u50cf\u522b\u4eba\u6562\u628a\u6b63\u5f0f\u8d23\u4efb\u4ea4\u7ed9\u4f60\uff0c\u4e5f\u611f\u89c9\u4f60\u80fd\u6301\u7a33\u7684\u90a3\u79cd\u7cfb\u7edf\u4fe1\u53f7\u3002', '\u987a\u65f6\u5bb9\u6613\u5728\u7ec4\u7ec7\u3001\u7ba1\u7406\u6216\u5236\u5ea6\u578b\u5c97\u4f4d\u4e2d\u5f97\u5230\u4fe1\u4efb\u548c\u540d\u5206\u3002', '\u4e0d\u5229\u65f6\u5219\u53ef\u80fd\u80cc\u4e0a\u8fc7\u591a\u8d23\u4efb\uff0c\u6216\u5bf9\u5934\u8854\u548c\u8eab\u4efd\u4ea7\u751f\u8fc7\u5f3a\u4f9d\u8d56\u3002', '\u5f53\u8d23\u4efb\u53d8\u91cd\u65f6\uff0c\u8bb0\u5f97\u540c\u65f6\u8865\u8db3\u7cfb\u7edf\u80fd\u529b\u548c\u534f\u4f5c\u80fd\u529b\uff0c\u4e0d\u8981\u53ea\u625b\u7740\u540d\u5206\u8d70\u3002'),
  '\u798f\u661f': makeShenShaDetail('\u798f\u661f\u504f\u5411\u987a\u624b\u3001\u5bbd\u88d5\u3001\u5fc3\u6c14\u677e\u5f1b\u65f6\u66f4\u5bb9\u6613\u805a\u798f\u3002', '\u4f20\u7edf\u4e0a\u4e3b\u798f\u6c14\u3001\u548c\u7f13\u3001\u987a\u9042\uff0c\u5f3a\u8c03\u4e00\u79cd\u8f83\u6e29\u548c\u7684\u53d7\u76ca\u80fd\u529b\u3002', '\u50cf\u751f\u6d3b\u91cc\u603b\u6709\u4e00\u4e9b\u5c0f\u7a97\u53e3\u8ba9\u4f60\u6bd4\u522b\u4eba\u66f4\u5bb9\u6613\u7f13\u8fc7\u6765\uff0c\u4e5f\u66f4\u5bb9\u6613\u63a5\u4e0a\u6c14\u3002', '\u987a\u65f6\u4f1a\u4f53\u73b0\u5728\u4eba\u7f18\u3001\u5fc3\u6001\u3001\u65e5\u5e38\u8d44\u6e90\u548c\u6062\u590d\u529b\u4e0a\uff0c\u5f88\u591a\u4e8b\u4e0d\u81f3\u4e8e\u8d70\u5230\u6700\u786c\u7684\u90a3\u4e00\u6b65\u3002', '\u4e0d\u5229\u65f6\u4e5f\u53ef\u80fd\u8ba9\u4eba\u592a\u8d2a\u8212\u670d\uff0c\u5931\u53bb\u8b66\u60d5\u548c\u4e3b\u52a8\u5efa\u8bbe\u3002', '\u628a\u8fd9\u4efd\u798f\u6c14\u7528\u5728\u8282\u594f\u7ba1\u7406\u548c\u957f\u671f\u7a33\u6001\u4e0a\uff0c\u6bd4\u7b49\u8fd0\u6c14\u81ea\u52a8\u53d8\u597d\u66f4\u5b9e\u9645\u3002'),
  '\u5b66\u5802': makeShenShaDetail('\u5b66\u5802\u504f\u5411\u7cfb\u7edf\u5b66\u4e60\u3001\u5438\u6536\u77e5\u8bc6\u3001\u5728\u5b66\u4e60\u4e2d\u6210\u5f62\u3002', '\u4f20\u7edf\u4e0a\u4e0e\u5b66\u4e1a\u3001\u5b66\u8bc6\u3001\u4e66\u5377\u6c14\u3001\u6b63\u89c4\u5b66\u4e60\u73af\u5883\u6709\u5173\u3002', '\u50cf\u901a\u8fc7\u8bfe\u7a0b\u3001\u8bad\u7ec3\u3001\u4e13\u4e1a\u6846\u67b6\u6765\u5b8c\u6210\u5347\u7ea7\u7684\u4eba\u751f\u8282\u594f\u3002', '\u987a\u65f6\u5b66\u4e60\u6548\u7387\u9ad8\uff0c\u5bb9\u6613\u5728\u4f53\u7cfb\u5316\u8bad\u7ec3\u4e2d\u79ef\u7d2f\u539a\u5ea6\uff0c\u8d8a\u5b66\u8d8a\u7a33\u3002', '\u4e0d\u5229\u65f6\u53ef\u80fd\u4e00\u76f4\u5728\u5b66\u4e60\u51c6\u5907\uff0c\u8fdf\u8fdf\u4e0d\u80af\u4e0a\u573a\u5b9e\u6218\u3002', '\u6700\u597d\u7ed9\u5b66\u4e60\u8bbe\u4e00\u4e2a\u8f93\u51fa\u573a\u666f\uff0c\u8fd9\u6837\u5b66\u5802\u4e4b\u6c14\u624d\u4f1a\u8f6c\u6210\u73b0\u5b9e\u6210\u679c\u3002'),
  '\u8bcd\u9986': makeShenShaDetail('\u8bcd\u9986\u66f4\u5f3a\u8c03\u8bed\u8a00\u3001\u6587\u6848\u3001\u4fee\u8f9e\u3001\u8868\u8fbe\u98ce\u683c\u548c\u6587\u5316\u611f\u3002', '\u4f20\u7edf\u4e0a\u4e3b\u8f9e\u91c7\u3001\u6587\u8bcd\u3001\u6587\u540d\uff0c\u4e0e\u5199\u4f5c\u3001\u6587\u7ae0\u548c\u8868\u8fbe\u80fd\u529b\u6709\u5173\u3002', '\u50cf\u4e00\u4e2a\u4eba\u5f88\u4f1a\u7ec4\u7ec7\u8bed\u8a00\u3001\u5305\u88c5\u89c2\u70b9\u3001\u505a\u53d9\u4e8b\u548c\u4f20\u9012\u6c14\u6c1b\u3002', '\u987a\u65f6\u9002\u5408\u5185\u5bb9\u3001\u54c1\u724c\u3001\u7b56\u5212\u3001\u6f14\u8bb2\u3001\u6559\u5b66\u548c\u9700\u8981\u8bed\u8a00\u8d28\u611f\u7684\u65b9\u5411\u3002', '\u4e0d\u5229\u65f6\u5bb9\u6613\u8868\u8fbe\u8fc7\u6ee1\u3001\u5305\u88c5\u8fc7\u5ea6\uff0c\u6216\u5f62\u5f0f\u5f3a\u4e8e\u5185\u5bb9\u3002', '\u5148\u628a\u89c2\u70b9\u7acb\u4f4f\uff0c\u518d\u8ba9\u8868\u8fbe\u52a0\u5206\uff0c\u8bcd\u9986\u624d\u4f1a\u6210\u4e3a\u52a9\u529b\u800c\u4e0d\u662f\u82b1\u54e8\u3002'),
  '\u5fb7\u79c0': makeShenShaDetail('\u5fb7\u79c0\u504f\u5411\u6c14\u8d28\u6e05\u3001\u5ba1\u7f8e\u597d\u3001\u505a\u4eba\u505a\u4e8b\u6709\u5206\u5bf8\u7684\u79c0\u6c14\u4e4b\u8c61\u3002', '\u4f20\u7edf\u4e0a\u4e3b\u5fb7\u4e0e\u79c0\u5e76\u89c1\uff0c\u5f3a\u8c03\u54c1\u6027\u3001\u6c14\u8d28\u3001\u624d\u60c5\u548c\u6574\u4f53\u89c2\u611f\u3002', '\u50cf\u4e00\u4e2a\u4eba\u4e0d\u53ea\u80fd\u505a\u4e8b\uff0c\u8fd8\u80fd\u8ba9\u4eba\u611f\u89c9\u8212\u670d\uff0c\u613f\u610f\u4fe1\u4efb\u3002', '\u987a\u65f6\u5bb9\u6613\u5728\u5ba1\u7f8e\u3001\u4fee\u517b\u3001\u8868\u8fbe\u548c\u4eba\u9645\u611f\u53d7\u4e0a\u5f62\u6210\u52a0\u5206\u3002', '\u4e0d\u5229\u65f6\u5219\u53ef\u80fd\u592a\u5728\u610f\u4f53\u9762\uff0c\u987e\u8651\u8fc7\u591a\uff0c\u53cd\u800c\u4e0d\u591f\u76f4\u63a5\u3002', '\u628a\u8fd9\u4efd\u6c14\u8d28\u7528\u5728\u957f\u671f\u4fe1\u7528\u3001\u4f5c\u54c1\u8d28\u611f\u548c\u4eba\u9645\u8fb9\u754c\u4e0a\uff0c\u5b83\u4f1a\u66f4\u7a33\u3002'),
  '\u9a7f\u9a6c': makeShenShaDetail('\u9a7f\u9a6c\u662f\u5178\u578b\u7684\u6d41\u52a8\u3001\u8fc1\u79fb\u3001\u5954\u6ce2\u3001\u53d8\u5316\u548c\u5916\u51fa\u673a\u4f1a\u3002', '\u4f20\u7edf\u4e0a\u4e3b\u8d70\u52a8\u3001\u51fa\u95e8\u3001\u8fc1\u79fb\u3001\u5dee\u65c5\u4e0e\u6362\u73af\u5883\u3002', '\u50cf\u4f60\u66f4\u5bb9\u6613\u5728\u6362\u57ce\u5e02\u3001\u6362\u56e2\u961f\u3001\u6362\u9879\u76ee\u6216\u8de8\u9886\u57df\u91cc\u770b\u5230\u673a\u4f1a\u3002', '\u6709\u5229\u65f6\u4f1a\u8f6c\u6210\u5f00\u9614\u89c6\u91ce\u3001\u62d3\u5c55\u8d44\u6e90\u548c\u5728\u53d8\u5316\u4e2d\u8d77\u52bf\u7684\u80fd\u529b\u3002', '\u4e0d\u5229\u65f6\u5219\u5bb9\u6613\u5fd9\u3001\u6f02\u3001\u6563\uff0c\u4e8b\u60c5\u5f88\u591a\u5374\u96be\u4ee5\u771f\u6b63\u6c89\u6dc0\u3002', '\u6709\u9a7f\u9a6c\u65f6\u8981\u540c\u65f6\u7ecf\u8425\u79fb\u52a8\u80fd\u529b\u548c\u843d\u5730\u80fd\u529b\uff0c\u4e0d\u7136\u5f88\u5bb9\u6613\u53ea\u5269\u4e0b\u767d\u5fd9\u3002'),
  '\u6843\u82b1': makeShenShaDetail('\u6843\u82b1\u66f4\u504f\u5438\u5f15\u529b\u3001\u88ab\u770b\u89c1\u3001\u793e\u4ea4\u9b45\u529b\u548c\u5173\u7cfb\u80fd\u89c1\u5ea6\u3002', '\u4f20\u7edf\u4e0a\u4e3b\u4eba\u7f18\u3001\u60c5\u611f\u3001\u5ba1\u7f8e\u3001\u9b45\u529b\u548c\u5173\u7cfb\u9645\u9047\u3002', '\u50cf\u66f4\u5bb9\u6613\u88ab\u6ce8\u610f\u3001\u88ab\u559c\u6b22\uff0c\u4e5f\u66f4\u5bb9\u6613\u88ab\u6295\u5c04\u548c\u5377\u5165\u5173\u7cfb\u8bae\u9898\u3002', '\u6709\u5229\u65f6\u4f1a\u8f6c\u6210\u5ba1\u7f8e\u3001\u516c\u4f17\u611f\u3001\u5408\u4f5c\u5438\u5f15\u529b\u548c\u5173\u7cfb\u6d41\u52a8\u6027\u3002', '\u4e0d\u5229\u65f6\u5219\u5bb9\u6613\u51fa\u73b0\u66a7\u6627\u3001\u5206\u5fc3\u3001\u60c5\u611f\u6d88\u8017\u6216\u8fb9\u754c\u4e0d\u6e05\u3002', '\u6843\u82b1\u8d8a\u660e\u663e\uff0c\u8d8a\u8981\u4e3b\u52a8\u5b9a\u4e49\u5173\u7cfb\u548c\u8282\u594f\uff0c\u4e0d\u8981\u53ea\u9760\u611f\u89c9\u8d70\u3002'),
  '\u54b8\u6c60': makeShenShaDetail('\u54b8\u6c60\u662f\u6843\u82b1\u7cfb\u7edf\u91cc\u66f4\u611f\u6027\u3001\u66f4\u611f\u5b98\u3001\u66f4\u5bb9\u6613\u5e26\u51fa\u6b32\u671b\u6d41\u52a8\u7684\u4e00\u9762\u3002', '\u4f20\u7edf\u4e0a\u504f\u5411\u611f\u5b98\u3001\u4eba\u60c5\u3001\u793e\u4ea4\u573a\u57df\u548c\u60c5\u7eea\u7275\u5f15\u3002', '\u50cf\u4e00\u4e2a\u4eba\u5f88\u6709\u6c1b\u56f4\u611f\uff0c\u5bb9\u6613\u88ab\u5173\u7cfb\u548c\u60c5\u7eea\u7275\u7740\u8d70\uff0c\u4e5f\u5bb9\u6613\u7275\u52a8\u522b\u4eba\u3002', '\u987a\u65f6\u6709\u52a9\u4e8e\u5ba1\u7f8e\u3001\u827a\u672f\u8868\u8fbe\u3001\u793e\u4ea4\u6da6\u6ed1\u548c\u4eb2\u5bc6\u5173\u7cfb\u4e2d\u7684\u67d4\u8f6f\u6d41\u52a8\u3002', '\u4e0d\u5229\u65f6\u5219\u6613\u6c89\u8ff7\u611f\u53d7\u3001\u88ab\u60c5\u7eea\u7275\u7740\u8d70\uff0c\u6216\u5728\u5173\u7cfb\u4e2d\u53cd\u590d\u6d88\u8017\u3002', '\u6709\u54b8\u6c60\u65f6\uff0c\u8d8a\u8981\u7ec3\u60c5\u7eea\u8fb9\u754c\u548c\u5173\u7cfb\u8282\u594f\uff0c\u4e0d\u7136\u5f88\u5bb9\u6613\u53ea\u5269\u4e0b\u611f\u89c9\u3002'),
  '\u5c06\u661f': makeShenShaDetail('\u5c06\u661f\u504f\u5411\u4e3b\u4e8b\u3001\u9886\u5934\u3001\u5b9a\u65b9\u5411\u548c\u5e26\u961f\u6c14\u573a\u3002', '\u4f20\u7edf\u4e0a\u4e3b\u6743\u67c4\u3001\u53f7\u53ec\u529b\u3001\u4e3b\u5bfc\u6027\u548c\u627f\u62c5\u4e8b\u52a1\u7684\u80fd\u529b\u3002', '\u50cf\u522b\u4eba\u4f1a\u81ea\u7136\u671f\u5f85\u4f60\u62cd\u677f\uff0c\u5e0c\u671b\u4f60\u7ad9\u51fa\u6765\u5b9a\u65b9\u5411\u6216\u7a33\u4f4f\u5c40\u9762\u3002', '\u987a\u65f6\u5bb9\u6613\u5728\u56e2\u961f\u3001\u9879\u76ee\u3001\u7ec4\u7ec7\u548c\u6267\u884c\u573a\u666f\u91cc\u6210\u4e3a\u6838\u5fc3\u63a8\u8fdb\u8005\u3002', '\u4e0d\u5229\u65f6\u5219\u53ef\u80fd\u592a\u60f3\u638c\u63a7\uff0c\u8fc7\u65e9\u627f\u62c5\uff0c\u6216\u628a\u81ea\u5df1\u957f\u671f\u653e\u5728\u9ad8\u538b\u4f4d\u3002', '\u5c06\u661f\u4e0d\u53ea\u662f\u5e26\u5934\uff0c\u8fd8\u5305\u62ec\u5206\u914d\u3001\u8282\u594f\u548c\u627f\u538b\u7ba1\u7406\uff0c\u5b66\u4f1a\u5e26\u4eba\u6bd4\u53ea\u4f1a\u9876\u4e0a\u53bb\u66f4\u91cd\u8981\u3002'),
  '\u534e\u76d6': makeShenShaDetail('\u534e\u76d6\u504f\u5411\u72ec\u5904\u3001\u5ba1\u7f8e\u3001\u7cbe\u795e\u6027\u3001\u521b\u4f5c\u6027\u548c\u5e26\u4e00\u70b9\u6e05\u51b7\u611f\u7684\u624d\u6c14\u3002', '\u4f20\u7edf\u4e0a\u591a\u4e3b\u827a\u672f\u3001\u7384\u601d\u3001\u5b97\u6559\u3001\u72ec\u5904\u548c\u4e0e\u4f17\u4e0d\u540c\u7684\u8282\u594f\u3002', '\u50cf\u4e00\u4e2a\u4eba\u66f4\u9002\u5408\u6df1\u5ea6\u601d\u8003\u3001\u521b\u4f5c\u3001\u7814\u7a76\u548c\u6709\u81ea\u6211\u7a7a\u95f4\u7684\u5de5\u4f5c\u65b9\u5f0f\u3002', '\u987a\u65f6\u4f1a\u8f6c\u6210\u5ba1\u7f8e\u80fd\u529b\u3001\u4e13\u6ce8\u521b\u4f5c\u529b\uff0c\u4ee5\u53ca\u72ec\u7279\u7684\u7cbe\u795e\u4e16\u754c\u539a\u5ea6\u3002', '\u4e0d\u5229\u65f6\u5219\u5bb9\u6613\u5b64\u3001\u95f7\u3001\u4e0e\u4eba\u758f\u79bb\uff0c\u6216\u603b\u89c9\u5f97\u6ca1\u4eba\u61c2\u81ea\u5df1\u3002', '\u6709\u534e\u76d6\u65f6\uff0c\u8981\u4e3b\u52a8\u628a\u72ec\u5904\u53d8\u6210\u521b\u4f5c\u548c\u65b9\u6cd5\uff0c\u800c\u4e0d\u662f\u53ea\u628a\u81ea\u5df1\u5173\u8d77\u6765\u3002'),
  '\u7ea2\u9e3e': makeShenShaDetail('\u7ea2\u9e3e\u504f\u5411\u5173\u7cfb\u542f\u52a8\u3001\u60c5\u611f\u9760\u8fd1\u3001\u559c\u5e86\u4eba\u9645\u4e92\u52a8\u3002', '\u4f20\u7edf\u4e0a\u5e38\u4e0e\u5a5a\u604b\u3001\u60c5\u7f18\u3001\u559c\u4e8b\u548c\u60a6\u611f\u6709\u5173\u3002', '\u50cf\u5173\u7cfb\u66f4\u5bb9\u6613\u542f\u52a8\uff0c\u4e92\u52a8\u66f4\u5bb9\u6613\u5347\u6e29\uff0c\u4e5f\u66f4\u5bb9\u6613\u6709\u4eba\u9645\u4e0a\u7684\u597d\u6d88\u606f\u3002', '\u6709\u5229\u65f6\u9002\u5408\u53d1\u5c55\u4eb2\u5bc6\u5173\u7cfb\u3001\u5408\u4f5c\u5173\u7cfb\uff0c\u4ee5\u53ca\u5e26\u6e29\u5ea6\u7684\u8fde\u63a5\u3002', '\u4e0d\u5229\u65f6\u5219\u5bb9\u6613\u5173\u7cfb\u63a8\u8fdb\u8fc7\u5feb\uff0c\u5bf9\u60c5\u611f\u5224\u65ad\u8fc7\u4e8e\u4e50\u89c2\u3002', '\u7ea2\u9e3e\u6765\u65f6\u4e0d\u5fc5\u6025\u7740\u5b9a\u8bba\uff0c\u8ba9\u65f6\u95f4\u5e2e\u4f60\u7b5b\u9009\uff0c\u6bd4\u7acb\u523b\u4e0b\u7ed3\u8bba\u66f4\u7a33\u3002'),
  '\u5929\u559c': makeShenShaDetail('\u5929\u559c\u504f\u5411\u559c\u6c14\u3001\u5e86\u4e8b\u3001\u548c\u4e50\u3001\u60c5\u7eea\u8212\u5c55\u3002', '\u4f20\u7edf\u4e0a\u4e3b\u559c\u5e86\u3001\u5a5a\u5ac1\u3001\u5e86\u8d3a\uff0c\u4ee5\u53ca\u4eba\u4e0e\u4e8b\u4e4b\u95f4\u7684\u5409\u5e86\u6c1b\u56f4\u3002', '\u50cf\u4e8b\u60c5\u66f4\u5bb9\u6613\u5f80\u8ba9\u4eba\u5f00\u5fc3\u3001\u613f\u610f\u5e86\u795d\u7684\u65b9\u5411\u53d1\u5c55\u3002', '\u987a\u65f6\u5173\u7cfb\u66f4\u67d4\u548c\uff0c\u5408\u4f5c\u548c\u60c5\u611f\u8bae\u9898\u66f4\u5bb9\u6613\u51fa\u73b0\u6b63\u53cd\u9988\u3002', '\u4e0d\u5229\u65f6\u5219\u53ef\u80fd\u8ba9\u4eba\u8fc7\u4e8e\u4e50\u89c2\uff0c\u6216\u505c\u7559\u5728\u8868\u9762\u70ed\u95f9\u91cc\uff0c\u5ffd\u7565\u540e\u7eed\u7ecf\u8425\u3002', '\u6709\u5929\u559c\u65f6\u53ef\u4ee5\u7528\u6765\u63a8\u8fdb\u5173\u7cfb\u4fee\u590d\u548c\u6b63\u5411\u6c1b\u56f4\uff0c\u4f46\u522b\u5fd8\u4e86\u73b0\u5b9e\u786e\u8ba4\u3002'),
  '\u5929\u533b': makeShenShaDetail('\u5929\u533b\u504f\u5411\u4fee\u590d\u3001\u8c03\u7406\u3001\u7167\u987e\u548c\u8eab\u4f53\u8bae\u9898\u7684\u654f\u611f\u5ea6\u3002', '\u4f20\u7edf\u4e0a\u4e3b\u533b\u836f\u3001\u8c03\u7406\u3001\u517b\u751f\u3001\u7597\u6108\uff0c\u4e5f\u5e38\u4e0e\u8eab\u4f53\u6062\u590d\u529b\u6709\u5173\u3002', '\u50cf\u4e00\u4e2a\u4eba\u5bf9\u5065\u5eb7\u7ba1\u7406\u3001\u4fee\u590d\u8282\u594f\u3001\u60c5\u7eea\u5b89\u629a\u548c\u957f\u671f\u8c03\u7406\u66f4\u654f\u611f\u3002', '\u987a\u65f6\u5bb9\u6613\u5728\u5065\u5eb7\u3001\u54a8\u8be2\u3001\u7167\u62a4\u3001\u7597\u6108\u548c\u6062\u590d\u578b\u5de5\u4f5c\u4e0a\u6709\u5929\u8d4b\u3002', '\u4e0d\u5229\u65f6\u5219\u53ef\u80fd\u8fc7\u5ea6\u62c5\u5fe7\u8eab\u4f53\uff0c\u6216\u8005\u603b\u5728\u4fee\u4fee\u8865\u8865\u91cc\u6d88\u8017\u81ea\u5df1\u3002', '\u628a\u5b83\u7528\u4e8e\u5efa\u7acb\u7a33\u5b9a\u4f5c\u606f\uff0c\u8bad\u7ec3\u6062\u590d\u529b\uff0c\u6bd4\u4e00\u76f4\u7126\u8651\u8981\u6709\u7528\u5f97\u591a\u3002'),
  '\u7984': makeShenShaDetail('\u7984\u66f4\u504f\u7a33\u5b9a\u8d44\u6e90\u3001\u5c97\u4f4d\u627f\u63a5\u3001\u53ef\u6301\u7eed\u7684\u73b0\u5b9e\u6536\u76ca\u3002', '\u4f20\u7edf\u4e0a\u4e3b\u4ff8\u7984\u3001\u98df\u7984\u3001\u804c\u4f4d\u6536\u76ca\u548c\u73b0\u5b9e\u6240\u5f97\u3002', '\u50cf\u7a33\u5b9a\u6536\u5165\u3001\u56fa\u5b9a\u8d44\u6e90\u3001\u5c97\u4f4d\u4ef7\u503c\u548c\u81ea\u5df1\u80fd\u5b88\u4f4f\u7684\u73b0\u5b9e\u76d8\u9762\u3002', '\u987a\u65f6\u4e8b\u4e1a\u548c\u6536\u5165\u66f4\u5bb9\u6613\u8d70\u5411\u7a33\u6b65\u7d2f\u79ef\uff0c\u9002\u5408\u957f\u671f\u7ecf\u8425\u3002', '\u4e0d\u5229\u65f6\u53ef\u80fd\u8fc7\u5ea6\u4f9d\u8d56\u8212\u9002\u533a\uff0c\u53ea\u5b88\u5df2\u6709\u8d44\u6e90\uff0c\u4e0d\u6562\u5347\u7ea7\u3002', '\u7984\u6700\u597d\u4e00\u8fb9\u5b88\u3001\u4e00\u8fb9\u5347\uff0c\u4e0d\u8981\u53ea\u987e\u4fdd\u7a33\u800c\u9519\u8fc7\u6269\u5bb9\u3002'),
  '\u62f1\u7984': makeShenShaDetail('\u62f1\u7984\u66f4\u50cf\u7984\u6c14\u672a\u6b63\u9762\u51fa\u73b0\uff0c\u4f46\u7ed3\u6784\u4e0a\u5728\u628a\u8d44\u6e90\u5f80\u4f60\u8fd9\u91cc\u62f1\u3002', '\u4f20\u7edf\u4e0a\u5f3a\u8c03\u4e24\u8fb9\u5939\u62f1\u6210\u7984\uff0c\u5c5e\u4e8e\u683c\u5c40\u5173\u7cfb\u91cc\u7684\u95f4\u63a5\u8d44\u6e90\u627f\u63a5\u3002', '\u50cf\u4f60\u672a\u5fc5\u76f4\u63a5\u62ff\u5230\u6700\u597d\u4f4d\u7f6e\uff0c\u4f46\u5468\u8fb9\u7ed3\u6784\u5728\u5e2e\u4f60\u5f62\u6210\u652f\u6301\u5e26\u3002', '\u987a\u65f6\u4f1a\u8868\u73b0\u4e3a\u8d44\u6e90\u95f4\u63a5\u6c47\u805a\u3001\u5173\u7cfb\u642d\u6865\u548c\u4f4d\u7f6e\u6162\u6162\u88ab\u6258\u8d77\u6765\u3002', '\u4e0d\u5229\u65f6\u5219\u53ef\u80fd\u603b\u5728\u5feb\u5230\u624b\u4f46\u8fd8\u5dee\u4e00\u70b9\u7684\u72b6\u6001\uff0c\u5bb9\u6613\u7126\u8e81\u3002', '\u770b\u5230\u62f1\u7984\u65f6\u8981\u91cd\u89c6\u4e2d\u95f4\u8fc7\u7a0b\u548c\u5173\u7cfb\u642d\u6865\uff0c\u5b83\u5f80\u5f80\u4e0d\u662f\u4e00\u6b65\u5230\u4f4d\u7684\u798f\u3002'),
  '\u91d1\u8206': makeShenShaDetail('\u91d1\u8206\u504f\u5411\u4f53\u9762\u8d44\u6e90\u3001\u751f\u6d3b\u54c1\u8d28\u548c\u88ab\u597d\u6761\u4ef6\u627f\u63a5\u3002', '\u4f20\u7edf\u4e0a\u4e3b\u8f66\u8206\u3001\u4eab\u53d7\u3001\u4f53\u9762\u3001\u914d\u5076\u52a9\u529b\u548c\u6761\u4ef6\u5c42\u9762\u7684\u52a0\u6301\u3002', '\u50cf\u8f83\u597d\u7684\u5c45\u4f4f\u73af\u5883\u3001\u5de5\u4f5c\u5f85\u9047\u3001\u4f34\u4fa3\u627f\u63a5\u529b\u6216\u8005\u751f\u6d3b\u8d28\u611f\u7684\u52a0\u5206\u3002', '\u987a\u65f6\u5bb9\u6613\u5728\u751f\u6d3b\u6761\u4ef6\u3001\u5173\u7cfb\u627f\u63a5\u548c\u65e5\u5e38\u5b89\u7f6e\u611f\u4e0a\u5f97\u5230\u597d\u5904\u3002', '\u4e0d\u5229\u65f6\u5219\u53ef\u80fd\u8fc7\u5ea6\u5728\u610f\u5916\u5728\u6761\u4ef6\u3001\u4f53\u9762\u6216\u914d\u7f6e\uff0c\u5ffd\u7565\u4e86\u5185\u5728\u7a33\u5b9a\u3002', '\u6709\u91d1\u8206\u65f6\uff0c\u8bb0\u5f97\u628a\u597d\u6761\u4ef6\u53d8\u6210\u957f\u671f\u7a33\u5b9a\uff0c\u800c\u4e0d\u662f\u53ea\u505c\u5728\u4eab\u53d7\u3002'),
  '\u91d1\u795e': makeShenShaDetail('\u91d1\u795e\u504f\u5411\u521a\u51b3\u3001\u51b7\u9759\u3001\u6267\u884c\u786c\u5ea6\u548c\u5e26\u4e00\u70b9\u51cc\u5389\u3002', '\u4f20\u7edf\u4e0a\u591a\u770b\u5176\u521a\u70c8\u3001\u51b3\u65ad\u3001\u504f\u786c\u7684\u529b\u91cf\uff0c\u9700\u8981\u770b\u662f\u5426\u5f97\u5236\u5316\u3002', '\u50cf\u4e00\u4e2a\u4eba\u5728\u505a\u51b3\u5b9a\u65f6\u5f88\u786c\u3001\u5f88\u5feb\uff0c\u80fd\u65a9\u6389\u62d6\u6ce5\u5e26\u6c34\u7684\u72b6\u6001\u3002', '\u987a\u65f6\u9002\u5408\u9ad8\u538b\u5224\u65ad\u3001\u6267\u884c\u3001\u98ce\u63a7\u3001\u6e05\u7406\u70c2\u5c3e\u548c\u9700\u8981\u679c\u65ad\u7684\u573a\u666f\u3002', '\u4e0d\u5229\u65f6\u5219\u5bb9\u6613\u8fc7\u731b\u3001\u8fc7\u786c\u3001\u8fc7\u4e8e\u7edd\u5bf9\uff0c\u5173\u7cfb\u4e0a\u4e5f\u5bb9\u6613\u4f24\u4eba\u4f24\u5df1\u3002', '\u91d1\u795e\u6700\u9700\u8981\u8282\u5236\u548c\u6e29\u5ea6\uff0c\u8ba9\u786c\u5ea6\u670d\u52a1\u4e8e\u7ed3\u679c\uff0c\u800c\u4e0d\u662f\u670d\u52a1\u4e8e\u60c5\u7eea\u3002'),
  '\u5929\u8d66': makeShenShaDetail('\u5929\u8d66\u504f\u5411\u5f97\u4ee5\u677e\u7ed1\u3001\u5f97\u4ee5\u7f13\u89e3\u3001\u5f97\u4ee5\u91cd\u65b0\u5f00\u59cb\u7684\u89e3\u7ed3\u4e4b\u6c14\u3002', '\u4f20\u7edf\u4e0a\u4e3b\u8d66\u89e3\u3001\u5316\u96be\u3001\u8131\u56f0\uff0c\u5728\u91cd\u538b\u548c\u7ea0\u7ed3\u5c40\u91cc\u5c24\u5176\u53ef\u8d35\u3002', '\u50cf\u67d0\u4e9b\u672c\u6765\u5f88\u7d27\u7684\u5c40\uff0c\u7a81\u7136\u51fa\u73b0\u4e00\u4e2a\u53ef\u4ee5\u91cd\u65b0\u8c08\u3001\u91cd\u65b0\u505a\u7684\u7a97\u53e3\u3002', '\u987a\u65f6\u5f88\u9002\u5408\u5584\u540e\u3001\u548c\u89e3\u3001\u91cd\u542f\u548c\u4ece\u65e7\u5c40\u91cc\u8131\u8eab\u3002', '\u4e0d\u5229\u65f6\u5219\u53ef\u80fd\u8ba9\u4eba\u4e00\u76f4\u7b49\u60c5\u51b5\u81ea\u5df1\u597d\u8f6c\uff0c\u7ed3\u679c\u62d6\u5ef6\u4e86\u8be5\u5904\u7406\u7684\u95ee\u9898\u3002', '\u5929\u8d66\u6765\u65f6\u8981\u6293\u4f4f\u673a\u4f1a\u884c\u52a8\uff0c\u5b83\u662f\u7ed9\u4f60\u91cd\u6574\u7684\u7a97\u53e3\uff0c\u4e0d\u662f\u8ba9\u4f60\u8eba\u5e73\u3002'),
  '\u5929\u53a8': makeShenShaDetail('\u5929\u53a8\u504f\u5411\u6ecb\u517b\u3001\u996e\u98df\u3001\u4eab\u53d7\u3001\u4f9b\u7ed9\u548c\u88ab\u7167\u987e\u3002', '\u4f20\u7edf\u4e0a\u4e3b\u53e3\u798f\u3001\u996e\u98df\u3001\u53a8\u827a\u3001\u4f9b\u517b\u548c\u751f\u6d3b\u4e2d\u7684\u6ecb\u517b\u611f\u3002', '\u50cf\u4f60\u548c\u98df\u7269\u3001\u7167\u987e\u3001\u751f\u6d3b\u8d28\u611f\u3001\u8ba9\u4eba\u8212\u670d\u7684\u670d\u52a1\u611f\u4e4b\u95f4\u6709\u8fde\u63a5\u3002', '\u987a\u65f6\u9002\u5408\u9910\u996e\u3001\u7597\u6108\u3001\u966a\u4f34\u3001\u751f\u6d3b\u65b9\u5f0f\u548c\u670d\u52a1\u578b\u65b9\u5411\u3002', '\u4e0d\u5229\u65f6\u5219\u53ef\u80fd\u8d2a\u4eab\u53d7\uff0c\u6216\u4e60\u60ef\u7528\u5403\u559d\u4e0e\u8212\u9002\u6765\u56de\u907f\u538b\u529b\u3002', '\u628a\u6ecb\u517b\u611f\u53d8\u6210\u7a33\u5b9a\u751f\u6d3b\u8d28\u91cf\uff0c\u800c\u4e0d\u662f\u7eb5\u5bb9\u81ea\u5df1\uff0c\u8fd9\u6837\u5929\u53a8\u624d\u4f1a\u771f\u6b63\u52a0\u5206\u3002'),
  '\u5b98\u7b26': makeShenShaDetail('\u5b98\u7b26\u504f\u5411\u89c4\u5219\u3001\u624b\u7eed\u3001\u5236\u5ea6\u538b\u529b\u548c\u9700\u8981\u6309\u7ae0\u5904\u7406\u7684\u4e8b\u52a1\u3002', '\u4f20\u7edf\u4e0a\u4e3b\u6587\u4e66\u3001\u662f\u975e\u3001\u5b98\u975e\u3001\u89c4\u7ae0\u7ea6\u675f\u4e0e\u5236\u5ea6\u5c42\u9762\u7684\u538b\u529b\u3002', '\u50cf\u5408\u540c\u3001\u5ba1\u6279\u3001\u5408\u89c4\u3001\u8bc1\u7167\u3001\u6d41\u7a0b\u548c\u8d23\u4efb\u8ffd\u6eaf\u8fd9\u4e9b\u95ee\u9898\u4f1a\u88ab\u653e\u5927\u3002', '\u987a\u65f6\u4f1a\u8ba9\u4eba\u66f4\u8c28\u614e\u3001\u91cd\u6d41\u7a0b\u3001\u4e5f\u66f4\u9002\u5408\u5904\u7406\u5236\u5ea6\u6027\u4e8b\u52a1\u3002', '\u4e0d\u5229\u65f6\u5219\u5bb9\u6613\u51fa\u73b0\u624b\u7eed\u5361\u58f3\u3001\u89c4\u5219\u538b\u529b\u3001\u6c9f\u901a\u626f\u76ae\u548c\u8d23\u4efb\u6210\u672c\u4e0a\u5347\u3002', '\u9047\u5230\u5b98\u7b26\u4e3b\u9898\u65f6\uff0c\u6700\u91cd\u8981\u7684\u662f\u7559\u75d5\uff0c\u628a\u5408\u540c\u3001\u8fb9\u754c\u548c\u6d41\u7a0b\u5199\u6e05\u695a\u3002'),
  '\u6500\u978d': makeShenShaDetail('\u6500\u978d\u504f\u5411\u4e0a\u5347\u3001\u63a5\u8fd1\u66f4\u9ad8\u4f4d\u7f6e\u3001\u9010\u6b65\u722c\u5347\u3002', '\u4f20\u7edf\u4e0a\u4e0e\u9a6c\u661f\u76f8\u8fde\uff0c\u4e3b\u5347\u8fc1\u3001\u9760\u8fd1\u66f4\u597d\u4f4d\u7f6e\u548c\u5411\u4e0a\u627f\u63a5\u3002', '\u50cf\u4f60\u5728\u6d41\u52a8\u53d8\u5316\u91cc\u4e0d\u53ea\u662f\u5fd9\uff0c\u800c\u662f\u6162\u6162\u5f80\u66f4\u9ad8\u7684\u5e73\u53f0\u9760\u8fd1\u3002', '\u987a\u65f6\u9002\u5408\u5347\u804c\u3001\u8f6c\u5c97\u3001\u63a5\u66f4\u5927\u9879\u76ee\u548c\u63a5\u8fd1\u6838\u5fc3\u8d44\u6e90\u3002', '\u4e0d\u5229\u65f6\u5219\u53ef\u80fd\u4e00\u76f4\u60f3\u5f80\u4e0a\u591f\uff0c\u4f46\u59ff\u52bf\u5f88\u7d2f\uff0c\u6b65\u5b50\u592a\u6025\u3002', '\u8d8a\u662f\u9700\u8981\u722c\u5347\u7684\u9636\u6bb5\uff0c\u8d8a\u8981\u628a\u6bcf\u4e00\u7ea7\u53f0\u9636\u7ad9\u7a33\uff0c\u4e0d\u8981\u53ea\u60f3\u5feb\u3002'),
  '\u56db\u5b63\u5173': makeShenShaDetail('\u5b83\u66f4\u50cf\u963b\u529b\u7cfb\u6570\u504f\u9ad8\u7684\u63d0\u9192\uff0c\u4e0d\u662f\u505a\u4ec0\u4e48\u90fd\u4e0d\u884c\uff0c\u800c\u662f\u9700\u8981\u66f4\u6709\u8282\u594f\u5730\u63a8\u8fdb\u3002', '\u5c5e\u4e8e\u5c0f\u513f\u5173\u715e\u91cc\u7684\u963b\u6ede\u578b\u63d0\u9192\uff0c\u4f20\u7edf\u4e0a\u4e3b\u505a\u4e8b\u963b\u529b\u3001\u4f53\u8d28\u53cd\u590d\u3001\u8fc7\u7a0b\u591a\u66f2\u6298\u3002', '\u50cf\u5f88\u591a\u4e8b\u4e0d\u662f\u505a\u4e0d\u6210\uff0c\u800c\u662f\u6bd4\u8f83\u5bb9\u6613\u9047\u5230\u8d77\u6b65\u4e0d\u987a\u548c\u4e2d\u95f4\u88ab\u5361\u4e00\u4e0b\u7684\u60c5\u51b5\u3002', '\u987a\u65f6\u4f1a\u8ba9\u4eba\u5bf9\u98ce\u9669\u66f4\u654f\u611f\uff0c\u611f\u89c9\u5230\u969c\u788d\u65f6\u66f4\u613f\u610f\u5148\u8865\u57fa\u7840\u3001\u8865\u51c6\u5907\u3002', '\u4e0d\u5229\u65f6\u5bb9\u6613\u53d8\u6210\u660e\u660e\u5f88\u60f3\u63a8\u8fdb\uff0c\u4f46\u603b\u88ab\u7ec6\u8282\u5361\u4f4f\uff0c\u4e5f\u5bb9\u6613\u56e0\u4e3a\u4e0d\u987a\u800c\u5fc3\u6d6e\u6c14\u8e81\u3002', '\u9047\u5230\u963b\u529b\u65f6\uff0c\u5148\u68c0\u67e5\u8282\u594f\u3001\u8d44\u6e90\u548c\u57fa\u7840\u51c6\u5907\uff0c\u628a\u5927\u76ee\u6807\u62c6\u6210\u5c0f\u8282\u70b9\uff0c\u6bd4\u786c\u9876\u66f4\u6709\u7528\u3002'),
  '\u960e\u738b\u5173': makeShenShaDetail('\u8fd9\u7c7b\u795e\u715e\u66f4\u50cf\u662f\u5bf9\u65e9\u5e74\u4f53\u8d28\u3001\u517b\u62a4\u73af\u5883\u548c\u957f\u671f\u7a33\u5b9a\u611f\u7684\u63d0\u9192\uff0c\u4e0d\u662f\u5355\u72ec\u770b\u5230\u5c31\u76f4\u63a5\u5b9a\u51f6\u3002', '\u5c5e\u4e8e\u5c0f\u513f\u5173\u715e\u4e2d\u8f83\u91cd\u7684\u4e00\u7c7b\uff0c\u4f20\u7edf\u4e0a\u66f4\u5f3a\u8c03\u5e74\u5e7c\u65f6\u671f\u7684\u75c5\u707e\u3001\u4f53\u8d28\u865a\u5f31\u548c\u96be\u517b\u6027\u3002', '\u50cf\u662f\u63d0\u9192\u4f60\u5728\u4f53\u529b\u3001\u7761\u7720\u3001\u4f5c\u606f\u548c\u5bb6\u5ead\u652f\u6301\u611f\u8fd9\u4e9b\u57fa\u7840\u9762\u4e0a\uff0c\u8981\u6bd4\u522b\u4eba\u66f4\u91cd\u89c6\u6253\u5e95\u3002', '\u6709\u5229\u65f6\u5f80\u5f80\u4f1a\u8f6c\u6210\u65e9\u5e74\u591a\u7167\u770b\uff0c\u540e\u671f\u53cd\u800c\u66f4\u61c2\u5f97\u73cd\u60dc\u8eab\u4f53\u548c\u7a33\u4f4f\u751f\u6d3b\u57fa\u5ea7\u3002', '\u4e0d\u5229\u65f6\u5c31\u5bb9\u6613\u4f53\u73b0\u6210\u5c0f\u65f6\u4f53\u5f31\u3001\u53cd\u590d\u5c0f\u75c5\u75db\uff0c\u6216\u8005\u6210\u5e74\u540e\u4ecd\u6709\u8fc7\u5ea6\u900f\u652f\u8eab\u4f53\u7684\u503e\u5411\u3002', '\u8fd9\u4e2a\u4fe1\u53f7\u51fa\u73b0\u65f6\uff0c\u66f4\u9002\u5408\u628a\u4f5c\u606f\u3001\u4f53\u68c0\u3001\u996e\u98df\u548c\u957f\u671f\u7ef4\u7a33\u653e\u5728\u5148\u624b\u987a\u5e8f\uff0c\u5148\u628a\u8eab\u4f53\u57fa\u5ea7\u6253\u7a33\u3002'),
  '\u5b85\u715e': makeShenShaDetail('\u8fd9\u4e2a\u4fe1\u53f7\u66f4\u50cf\u662f\u548c\u5bb6\u5ead\u6839\u57fa\u3001\u5b89\u5b9a\u611f\u3001\u81ea\u5df1\u91cd\u5efa\u751f\u6d3b\u79e9\u5e8f\u6709\u5173\u3002', '\u4f20\u7edf\u4e0a\u5e38\u89c1\u4e3a\u7834\u5b85\u4e4b\u610f\uff0c\u591a\u6307\u5411\u5bb6\u5b85\u6839\u57fa\u3001\u7956\u4e1a\u6267\u627f\u6216\u79bb\u5bb6\u53d8\u52a8\u3002', '\u50cf\u4e00\u4e9b\u4eba\u4e0d\u592a\u5bb9\u6613\u76f4\u63a5\u627f\u63a5\u539f\u6709\u5bb6\u65cf\u8d44\u6e90\uff0c\u66f4\u9700\u8981\u9760\u81ea\u5df1\u5728\u5916\u9762\u91cd\u5efa\u4f4f\u5c45\u3001\u73b0\u91d1\u6d41\u548c\u5b89\u5b9a\u611f\u3002', '\u987a\u65f6\u4f1a\u63a8\u7740\u4eba\u66f4\u65e9\u5b66\u4f1a\u72ec\u7acb\uff0c\u4e5f\u66f4\u9002\u5408\u5916\u51fa\u53d1\u5c55\u3001\u6362\u57ce\u5e02\u6216\u6362\u8d5b\u9053\u3002', '\u4e0d\u5229\u65f6\u5219\u5bb9\u6613\u8868\u73b0\u6210\u5bb6\u5ead\u652f\u6301\u611f\u4e0d\u8db3\uff0c\u5c45\u4f4f\u4e0d\u7a33\uff0c\u6216\u8005\u4e00\u76f4\u5728\u8fc1\u79fb\u8f6c\u6362\u91cc\u96be\u4ee5\u771f\u6b63\u5b89\u5b9a\u3002', '\u6709\u8fd9\u4e2a\u4fe1\u53f7\u65f6\uff0c\u66f4\u8981\u91cd\u89c6\u4f4f\u5904\u7a33\u5b9a\u3001\u73b0\u91d1\u7ed3\u6784\u3001\u5bb6\u5ead\u8fb9\u754c\u548c\u957f\u671f\u57fa\u5efa\u3002'),
  '\u4e27\u95e8': makeShenShaDetail('\u4e27\u95e8\u504f\u5411\u60c5\u7eea\u6c89\u3001\u5bb6\u5ead\u538b\u529b\u3001\u544a\u522b\u548c\u4f4e\u6c14\u538b\u8bae\u9898\u3002', '\u4f20\u7edf\u4e0a\u5e38\u4e0e\u4e27\u5fe7\u3001\u5bb6\u4e2d\u4e0d\u5b81\u3001\u60c5\u7eea\u4f4e\u8ff7\u548c\u9634\u6c89\u4e4b\u6c14\u6709\u5173\u3002', '\u50cf\u67d0\u6bb5\u65f6\u95f4\u66f4\u5bb9\u6613\u78b0\u5230\u5bb6\u5ead\u70e6\u5fc3\u4e8b\uff0c\u6216\u8005\u88ab\u6c89\u91cd\u6c1b\u56f4\u62c9\u4f4f\u5fc3\u6c14\u3002', '\u6709\u5229\u65f6\u4f1a\u8f6c\u6210\u66f4\u61c2\u5f97\u627f\u62c5\u3001\u7167\u987e\u5bb6\u4eba\uff0c\u4e5f\u80fd\u6bd4\u8f83\u7406\u667a\u5730\u9762\u5bf9\u751f\u6d3b\u7684\u8f83\u91cd\u8bae\u9898\u3002', '\u4e0d\u5229\u65f6\u5219\u5bb9\u6613\u60b2\u89c2\uff0c\u88ab\u5bb6\u5ead\u60c5\u7eea\u548c\u4f4e\u6c14\u538b\u62d6\u4f4f\uff0c\u5f88\u96be\u6298\u8fd4\u81ea\u5df1\u7684\u8282\u594f\u3002', '\u9047\u5230\u4e27\u95e8\u4e3b\u9898\u65f6\uff0c\u8981\u4f18\u5148\u7167\u987e\u81ea\u5df1\u7684\u6062\u590d\u529b\uff0c\u4e0d\u8981\u8ba9\u81ea\u5df1\u957f\u671f\u6ce1\u5728\u9634\u5f71\u91cc\u3002'),
  '\u540a\u5ba2': makeShenShaDetail('\u540a\u5ba2\u504f\u5411\u88ab\u5916\u90e8\u7684\u54c0\u4f24\u3001\u7a81\u53d1\u4e8b\u4ef6\u6216\u8d1f\u9762\u4fe1\u606f\u7275\u52a8\u3002', '\u4f20\u7edf\u4e0a\u591a\u4e0e\u540a\u5501\u3001\u5916\u6765\u4e27\u5fe7\u3001\u4ee4\u4eba\u5206\u5fc3\u7684\u5fe7\u4e8b\u6709\u5173\u3002', '\u50cf\u4f60\u66f4\u5bb9\u6613\u88ab\u522b\u4eba\u5e26\u6765\u7684\u574f\u6d88\u606f\u3001\u7a81\u53d1\u4e8b\u4ef6\u6216\u9634\u6c89\u6c14\u6c1b\u5f71\u54cd\u3002', '\u6709\u5229\u65f6\u4f1a\u8f6c\u6210\u540c\u7406\u5fc3\u3001\u4f53\u5bdf\u529b\u548c\u5904\u7406\u590d\u6742\u60c5\u7eea\u573a\u57df\u7684\u80fd\u529b\u3002', '\u4e0d\u5229\u65f6\u5219\u53ef\u80fd\u603b\u662f\u88ab\u5916\u90e8\u6c89\u91cd\u4fe1\u606f\u88f9\u631f\uff0c\u4e13\u6ce8\u548c\u8282\u594f\u5f88\u5bb9\u6613\u88ab\u6253\u65ad\u3002', '\u770b\u5230\u540a\u5ba2\u4e3b\u9898\u65f6\uff0c\u8981\u5b66\u4f1a\u4fe1\u606f\u8282\u6d41\u548c\u60c5\u7eea\u9694\u79bb\uff0c\u4e0d\u662f\u6240\u6709\u6c89\u91cd\u90fd\u9700\u8981\u4f60\u6765\u63a5\u3002'),
  '\u62ab\u9ebb': makeShenShaDetail('\u62ab\u9ebb\u504f\u5411\u957f\u671f\u8017\u795e\u3001\u5bb6\u4e8b\u7275\u626f\u548c\u60c5\u7eea\u8d23\u4efb\u4e00\u8d77\u538b\u4e0a\u8eab\u3002', '\u4f20\u7edf\u4e0a\u591a\u4e0e\u4e27\u5fe7\u3001\u670d\u9ebb\u3001\u957f\u8f88\u5bb6\u4e8b\u4e0e\u7275\u6302\u6709\u5173\u3002', '\u50cf\u4e00\u4e9b\u957f\u671f\u8d23\u4efb\u3001\u5bb6\u5ead\u7167\u6599\u6216\u60c5\u611f\u52b3\u52a1\u5bb9\u6613\u843d\u5230\u4f60\u8eab\u4e0a\u3002', '\u6709\u5229\u65f6\u4f1a\u8ba9\u4eba\u66f4\u6210\u719f\uff0c\u66f4\u61c2\u5f97\u627f\u63a5\u548c\u7a33\u4f4f\u5bb6\u5ead\u7cfb\u7edf\u91cc\u7684\u8d23\u4efb\u3002', '\u4e0d\u5229\u65f6\u5219\u5bb9\u6613\u88ab\u8d23\u4efb\u6162\u6162\u78e8\u8017\uff0c\u60c5\u7eea\u957f\u671f\u4f4e\u538b\uff0c\u4e5f\u4e0d\u6562\u5f00\u53e3\u6c42\u52a9\u3002', '\u9047\u5230\u62ab\u9ebb\u4e3b\u9898\u65f6\uff0c\u4e00\u5b9a\u8981\u5b66\u4f1a\u5206\u62c5\u548c\u6c42\u52a9\uff0c\u4e0d\u8981\u628a\u6240\u6709\u7167\u6599\u4e49\u52a1\u90fd\u80cc\u5728\u81ea\u5df1\u8eab\u4e0a\u3002'),
  '\u7f8a\u5203': makeShenShaDetail('\u7f8a\u5203\u504f\u5411\u950b\u5229\u3001\u81ea\u4fdd\u3001\u786c\u78b0\u786c\u548c\u5f3a\u70c8\u7684\u884c\u52a8\u8fb9\u754c\u3002', '\u4f20\u7edf\u4e0a\u4e3b\u521a\u70c8\u3001\u80c6\u6c14\u3001\u81ea\u6211\u9632\u536b\u548c\u5e26\u5200\u5203\u611f\u7684\u529b\u91cf\u3002', '\u50cf\u4e00\u4e2a\u4eba\u5f88\u80fd\u9876\u3001\u5f88\u80fd\u625b\uff0c\u4e5f\u5f88\u5bb9\u6613\u5728\u5173\u952e\u65f6\u76f4\u63a5\u786c\u4e0a\u3002', '\u987a\u65f6\u4f1a\u8f6c\u6210\u6267\u884c\u679c\u65ad\u3001\u8fb9\u754c\u6e05\u695a\u3001\u9047\u4e8b\u4e0d\u8f6f\uff0c\u9002\u5408\u7834\u5c40\u548c\u9876\u538b\u3002', '\u4e0d\u5229\u65f6\u5219\u5bb9\u6613\u6025\u3001\u786c\u3001\u51b2\uff0c\u5173\u7cfb\u91cc\u4e5f\u53ef\u80fd\u56e0\u8fc7\u5ea6\u9632\u536b\u800c\u4f24\u4eba\u4f24\u5df1\u3002', '\u7f8a\u5203\u6700\u9700\u8981\u7684\u662f\u63a7\u5236\u51fa\u624b\u65f6\u673a\uff0c\u4e0d\u662f\u6bcf\u4e2a\u5c40\u9762\u90fd\u503c\u5f97\u7528\u6700\u786c\u7684\u65b9\u5f0f\u5904\u7406\u3002'),
  '\u52ab\u715e': makeShenShaDetail('\u52ab\u715e\u504f\u5411\u7a81\u7136\u7684\u6d88\u8017\u3001\u7ade\u4e89\u6027\u98ce\u9669\u548c\u88ab\u5206\u6d41\u7684\u538b\u529b\u3002', '\u4f20\u7edf\u4e0a\u591a\u4e3b\u52ab\u593a\u3001\u635f\u8017\u3001\u7a81\u53d1\u7ade\u4e89\u548c\u5916\u90e8\u51b2\u51fb\u3002', '\u50cf\u8d44\u6e90\u7a81\u7136\u88ab\u62bd\u8d70\u3001\u8ba1\u5212\u88ab\u63d2\u961f\uff0c\u6216\u8005\u5408\u4f5c\u4e2d\u51fa\u73b0\u62a2\u4f4d\u548c\u5206\u6d41\u3002', '\u987a\u65f6\u4f1a\u8ba9\u4eba\u66f4\u6709\u98ce\u63a7\u610f\u8bc6\uff0c\u63d0\u524d\u505a\u5907\u4efd\u3001\u7559\u4f59\u91cf\uff0c\u4e0d\u8f7b\u6613\u628a\u81ea\u5df1\u66b4\u9732\u5728\u8106\u5f31\u70b9\u4e0a\u3002', '\u4e0d\u5229\u65f6\u5219\u5bb9\u6613\u957f\u671f\u5904\u5728\u7d27\u7ef7\u3001\u9632\u5907\u548c\u4e0d\u5b89\u5168\u611f\u91cc\u3002', '\u9047\u5230\u52ab\u715e\u4e3b\u9898\uff0c\u5148\u505a\u98ce\u9669\u9694\u79bb\uff0c\u4fdd\u62a4\u73b0\u91d1\u6d41\u548c\u5173\u952e\u4fe1\u606f\uff0c\u6bd4\u60c5\u7eea\u6027\u53cd\u51fb\u66f4\u6709\u7528\u3002'),
  '\u707e\u715e': makeShenShaDetail('\u707e\u715e\u504f\u5411\u9ebb\u70e6\u805a\u7126\u3001\u4e8b\u6545\u7387\u4e0a\u5347\u3001\u9700\u8981\u989d\u5916\u907f\u9669\u3002', '\u4f20\u7edf\u4e0a\u4e3b\u707e\u75c5\u3001\u610f\u5916\u3001\u51b2\u51fb\u548c\u4e0d\u987a\u4e8b\u9879\u7684\u96c6\u4e2d\u51fa\u73b0\u3002', '\u50cf\u8fd9\u6bb5\u65f6\u95f4\u4e0d\u9002\u5408\u5192\u8fdb\uff0c\u56e0\u4e3a\u5f88\u591a\u5c0f\u95ee\u9898\u5bb9\u6613\u4e32\u6210\u5927\u95ee\u9898\u3002', '\u987a\u65f6\u4f1a\u8feb\u4f7f\u4eba\u5efa\u7acb\u5b89\u5168\u610f\u8bc6\u3001\u9884\u6848\u610f\u8bc6\u548c\u590d\u6838\u610f\u8bc6\u3002', '\u4e0d\u5229\u65f6\u5219\u5bb9\u6613\u5c0f\u9519\u7d2f\u79ef\uff0c\u60c5\u7eea\u6025\u8e81\uff0c\u8fdb\u800c\u5bfc\u81f4\u8fde\u7eed\u7ffb\u8f66\u3002', '\u707e\u715e\u51fa\u73b0\u65f6\uff0c\u6700\u9700\u8981\u7684\u662f\u964d\u901f\u3001\u590d\u6838\u3001\u5c11\u505a\u9ad8\u98ce\u9669\u51b3\u5b9a\u3002'),
  '\u52fe\u715e': makeShenShaDetail('\u52fe\u715e\u504f\u5411\u7275\u626f\u3001\u6302\u788d\u3001\u53cd\u590d\u60e6\u8bb0\u548c\u96be\u4ee5\u5e72\u51c0\u62bd\u8eab\u3002', '\u4f20\u7edf\u4e0a\u5e38\u4e0e\u7275\u8fde\u3001\u62d6\u7d2f\u3001\u6697\u4e2d\u7ea0\u7f20\u6709\u5173\u3002', '\u50cf\u4e00\u4e9b\u5173\u7cfb\u3001\u4e8b\u60c5\u6216\u60c5\u7eea\u603b\u6709\u5c3e\u5df4\uff0c\u660e\u660e\u60f3\u7ed3\u675f\u5374\u8fd8\u5728\u62c9\u626f\u3002', '\u987a\u65f6\u4f1a\u8ba9\u4eba\u5bf9\u9690\u85cf\u98ce\u9669\u548c\u5173\u7cfb\u5c3e\u5df4\u66f4\u654f\u611f\uff0c\u80fd\u66f4\u65e9\u505a\u6536\u5c3e\u3002', '\u4e0d\u5229\u65f6\u5219\u5bb9\u6613\u53cd\u590d\u7ea0\u7f20\uff0c\u505c\u4e0d\u4e0b\u8111\u5185\u5faa\u73af\uff0c\u603b\u88ab\u65e7\u4e8b\u62d6\u4f4f\u3002', '\u6709\u52fe\u715e\u65f6\uff0c\u6700\u91cd\u8981\u7684\u662f\u53ca\u65f6\u6536\u5c3e\uff0c\u522b\u7ed9\u95ee\u9898\u7559\u4e0b\u957f\u671f\u61ac\u7a97\u3002'),
  '\u7ede\u715e': makeShenShaDetail('\u7ede\u715e\u504f\u5411\u7d27\u3001\u7ef7\u3001\u62e7\u5df4\u3001\u5173\u7cfb\u6216\u60c5\u7eea\u6253\u7ed3\u3002', '\u4f20\u7edf\u4e0a\u591a\u4e3b\u7ede\u7f20\u3001\u675f\u7f1a\u3001\u662f\u975e\u548c\u4e0d\u987a\u4e2d\u7684\u7d27\u5f20\u611f\u3002', '\u50cf\u4e00\u4e9b\u5c40\u9762\u4e0d\u662f\u5927\u707e\u5927\u96be\uff0c\u4f46\u5c31\u662f\u7279\u522b\u62e7\uff0c\u8d8a\u6025\u8d8a\u62e7\u3002', '\u987a\u65f6\u4f1a\u8feb\u4f7f\u4eba\u5b66\u4f1a\u62c6\u7ed3\u3001\u7406\u987a\u5173\u7cfb\u548c\u6d41\u7a0b\u3002', '\u4e0d\u5229\u65f6\u5219\u5bb9\u6613\u9677\u5165\u60f3\u4e0d\u5f00\u3001\u8bf4\u4e0d\u6e05\u3001\u5173\u7cfb\u6253\u7ed3\u548c\u6c9f\u901a\u8bef\u4f24\u3002', '\u78b0\u5230\u7ede\u715e\u65f6\uff0c\u8981\u5148\u628a\u60c5\u7eea\u548c\u4e8b\u5b9e\u5206\u5f00\uff0c\u518d\u5904\u7406\u5173\u7cfb\u548c\u51b3\u5b9a\u3002'),
  '\u4ea1\u795e': makeShenShaDetail('\u4ea1\u795e\u504f\u5411\u5931\u5e8f\u3001\u5206\u795e\u3001\u5224\u65ad\u98d8\u79fb\u548c\u8282\u594f\u5931\u5b88\u3002', '\u4f20\u7edf\u4e0a\u4e3b\u865a\u8017\u3001\u5931\u795e\u3001\u5224\u65ad\u8d70\u504f\u3001\u4e8b\u60c5\u5bb9\u6613\u6563\u6389\u3002', '\u50cf\u6ce8\u610f\u529b\u603b\u88ab\u5e26\u8d70\uff0c\u539f\u672c\u8be5\u5b88\u7684\u4e1c\u897f\u5bb9\u6613\u677e\u6389\u3002', '\u987a\u65f6\u4f1a\u63d0\u9192\u4eba\u66f4\u65e9\u505a\u8fb9\u754c\u548c\u7559\u4f59\u91cf\uff0c\u907f\u514d\u81ea\u5df1\u5931\u63a7\u3002', '\u4e0d\u5229\u65f6\u5219\u5bb9\u6613\u51fa\u73b0\u5065\u5fd8\u3001\u62d6\u6c93\u3001\u7a7a\u8f6c\u548c\u65b9\u5411\u611f\u4e22\u5931\u3002', '\u4ea1\u795e\u6700\u6015\u7ee7\u7eed\u5206\u5fc3\uff0c\u8d8a\u4e71\u8d8a\u8981\u56de\u5230\u6700\u57fa\u672c\u7684\u8282\u594f\u548c\u4f18\u5148\u7ea7\u3002'),
  '\u5143\u8fb0': makeShenShaDetail('\u5143\u8fb0\u504f\u5411\u522b\u626d\u611f\u3001\u65e7\u7ed3\u3001\u8bf4\u4e0d\u51fa\u7684\u4e0d\u987a\u548c\u5fc3\u7406\u963b\u6ede\u3002', '\u4f20\u7edf\u4e0a\u5e38\u4e3b\u90c1\u7ed3\u3001\u6096\u9006\u3001\u9690\u6027\u4e0d\u987a\u548c\u96be\u8a00\u7684\u5185\u8017\u3002', '\u50cf\u5f88\u591a\u4e0d\u8212\u670d\u4e0d\u662f\u5916\u90e8\u5927\u4e8b\uff0c\u800c\u662f\u5fc3\u91cc\u603b\u6709\u4e00\u4e2a\u7ed3\uff0c\u505a\u4e8b\u603b\u5dee\u4e00\u53e3\u6c14\u3002', '\u987a\u65f6\u4f1a\u8ba9\u4eba\u66f4\u65e9\u610f\u8bc6\u5230\u5185\u5728\u963b\u6ede\uff0c\u4ece\u800c\u5f00\u59cb\u6574\u7406\u60c5\u7eea\u548c\u65e7\u95ee\u9898\u3002', '\u4e0d\u5229\u65f6\u5219\u5bb9\u6613\u81ea\u6211\u62c9\u626f\u3001\u5173\u7cfb\u8bef\u4f1a\u3001\u60c5\u7eea\u95f7\u5835\u548c\u957f\u671f\u522b\u626d\u3002', '\u5143\u8fb0\u4e0d\u662f\u9760\u786c\u9876\u89e3\u51b3\u7684\uff0c\u66f4\u9002\u5408\u9760\u68b3\u7406\u3001\u8868\u8fbe\u548c\u6162\u6162\u62c6\u7ed3\u3002'),
  '\u5b64\u8fb0': makeShenShaDetail('\u5b64\u8fb0\u504f\u5411\u72ec\u7acb\u3001\u758f\u79bb\u3001\u4e60\u60ef\u81ea\u5df1\u625b\u548c\u4e0d\u5bb9\u6613\u8f7b\u6613\u9760\u8fd1\u522b\u4eba\u3002', '\u4f20\u7edf\u4e0a\u4e3b\u5b64\u72ec\u3001\u6e05\u51b7\u3001\u72ec\u884c\u3001\u4e0e\u7fa4\u4f53\u4fdd\u6301\u8ddd\u79bb\u3002', '\u50cf\u5f88\u591a\u4e8b\u4f60\u66f4\u4e60\u60ef\u81ea\u5df1\u5904\u7406\uff0c\u4e0d\u592a\u613f\u610f\u9ebb\u70e6\u522b\u4eba\uff0c\u4e5f\u4e0d\u592a\u5bb9\u6613\u88ab\u771f\u6b63\u7406\u89e3\u3002', '\u987a\u65f6\u4f1a\u53d8\u6210\u5f88\u5f3a\u7684\u72ec\u7acb\u6027\u3001\u81ea\u4e3b\u63a8\u8fdb\u529b\u548c\u4e0d\u88ab\u6742\u97f3\u5e26\u8d70\u7684\u80fd\u529b\u3002', '\u4e0d\u5229\u65f6\u5219\u53ef\u80fd\u8868\u73b0\u4e3a\u5c01\u95ed\u3001\u96be\u534f\u4f5c\u3001\u96be\u4eb2\u8fd1\uff0c\u4e5f\u5bb9\u6613\u5728\u5173\u7cfb\u91cc\u517b\u6210\u8ddd\u79bb\u611f\u3002', '\u5b64\u8fb0\u6700\u597d\u7ec3\u7684\u662f\u4fdd\u7559\u72ec\u7acb\uff0c\u540c\u65f6\u5141\u8bb8\u8fde\u63a5\uff0c\u8fd9\u6837\u4f18\u52bf\u624d\u4e0d\u4f1a\u53d8\u6210\u5b64\u7acb\u3002'),
  '\u5be1\u5bbf': makeShenShaDetail('\u5be1\u5bbf\u504f\u5411\u60c5\u611f\u6536\u655b\u3001\u5173\u7cfb\u8282\u594f\u6162\u3001\u5185\u5728\u4e16\u754c\u66f4\u91cd\u3002', '\u4f20\u7edf\u4e0a\u591a\u4e3b\u60c5\u611f\u5b64\u6e05\uff0c\u5173\u7cfb\u4e0d\u70ed\u95f9\uff0c\u5a5a\u604b\u8def\u4e0a\u5e26\u4e00\u70b9\u51b7\u611f\u3002', '\u50cf\u5e76\u4e0d\u662f\u4f60\u4e0d\u9700\u8981\u5173\u7cfb\uff0c\u800c\u662f\u4f60\u5bf9\u5173\u7cfb\u8d28\u91cf\u8981\u6c42\u5f88\u9ad8\uff0c\u4e0d\u5bb9\u6613\u8f7b\u6613\u70ed\u8d77\u6765\u3002', '\u987a\u65f6\u4f1a\u8ba9\u4eba\u66f4\u8c28\u614e\u5730\u770b\u5173\u7cfb\uff0c\u4e0d\u4e71\u6295\u3001\u4e0d\u4e71\u8fdb\uff0c\u665a\u4e00\u70b9\u53cd\u800c\u66f4\u7a33\u3002', '\u4e0d\u5229\u65f6\u5219\u53ef\u80fd\u62d6\u6210\u60c5\u611f\u56de\u907f\u3001\u8fc7\u5ea6\u9632\u5fa1\u3001\u96be\u4ee5\u8868\u8fbe\u9700\u8981\u3002', '\u5be1\u5bbf\u6700\u9700\u8981\u7684\u662f\u5b66\u4f1a\u8868\u8fbe\u771f\u5b9e\u9700\u6c42\uff0c\u522b\u53ea\u8ba9\u522b\u4eba\u731c\u3002'),
  '\u5b64\u9e3e': makeShenShaDetail('\u5b64\u9e3e\u504f\u5411\u60c5\u611f\u8282\u594f\u548c\u81ea\u6211\u8282\u594f\u4e0d\u5bb9\u6613\u5b8c\u5168\u5bf9\u4e0a\u3002', '\u4f20\u7edf\u4e0a\u591a\u4e0e\u5a5a\u604b\u6ce2\u6298\u3001\u60c5\u611f\u4e0d\u987a\u3001\u6027\u60c5\u5b64\u9ad8\u6709\u5173\u3002', '\u50cf\u5173\u7cfb\u91cc\u65e2\u60f3\u4eb2\u8fd1\u53c8\u5f88\u96be\u5f7b\u5e95\u653e\u4e0b\u81ea\u5df1\u7684\u8282\u594f\uff0c\u5f88\u5bb9\u6613\u51fa\u73b0\u9519\u62cd\u3002', '\u987a\u65f6\u4f1a\u8ba9\u4eba\u66f4\u8ba4\u771f\u7ecf\u8425\u4eb2\u5bc6\u5173\u7cfb\uff0c\u4e0d\u8f7b\u6613\u8fdb\u5165\uff0c\u8fdb\u5165\u540e\u53cd\u800c\u66f4\u91cd\u89c6\u8d28\u91cf\u3002', '\u4e0d\u5229\u65f6\u5219\u53ef\u80fd\u8868\u73b0\u4e3a\u5173\u7cfb\u9519\u4f4d\uff0c\u671f\u5f85\u843d\u5dee\uff0c\u4eb2\u5bc6\u4e2d\u5e26\u7740\u758f\u79bb\u548c\u81ea\u6211\u4fdd\u62a4\u3002', '\u5b64\u9e3e\u4e0d\u4ee3\u8868\u4e00\u5b9a\u4e0d\u597d\uff0c\u800c\u662f\u66f4\u9700\u8981\u8282\u594f\u5339\u914d\u548c\u9ad8\u8d28\u91cf\u6c9f\u901a\u3002'),
  '\u5929\u7f57': makeShenShaDetail('\u5929\u7f57\u504f\u5411\u88ab\u7f51\u4f4f\u3001\u611f\u89c9\u53d7\u9650\u3001\u4e8b\u60c5\u4e0d\u597d\u4e00\u4e0b\u5b50\u8131\u8eab\u3002', '\u4f20\u7edf\u4e0a\u4e3b\u7f51\u7f57\u3001\u675f\u7f1a\u3001\u56f0\u5c40\u548c\u62d6\u5ef6\u51fa\u7684\u9ebb\u70e6\u3002', '\u50cf\u4f60\u78b0\u5230\u7684\u4e0d\u662f\u5355\u70b9\u95ee\u9898\uff0c\u800c\u662f\u4e00\u4e2a\u7cfb\u7edf\u6027\u7684\u7f20\u7ed5\u5c40\u3002', '\u987a\u65f6\u4f1a\u8feb\u4f7f\u4eba\u5347\u7ea7\u7ed3\u6784\u601d\u7ef4\uff0c\u5b66\u4f1a\u62bd\u4e1d\u5265\u8327\u5730\u89e3\u51b3\u95ee\u9898\u3002', '\u4e0d\u5229\u65f6\u5219\u5bb9\u6613\u89c9\u5f97\u5904\u5904\u53d7\u9650\uff0c\u8d8a\u6323\u8d8a\u4e71\uff0c\u60c5\u7eea\u548c\u73b0\u5b9e\u4e00\u8d77\u88ab\u56f0\u4f4f\u3002', '\u9047\u5230\u5929\u7f57\uff0c\u4e0d\u8981\u60f3\u4e00\u628a\u6254\u5f00\uff0c\u800c\u662f\u5148\u627e\u51fa\u6700\u5173\u952e\u7684\u90a3\u4e2a\u7ed3\u70b9\u3002'),
  '\u5730\u7f51': makeShenShaDetail('\u5730\u7f51\u504f\u5411\u73b0\u5b9e\u7275\u5236\u3001\u73af\u5883\u7f81\u7eca\u3001\u811a\u4e0b\u88ab\u7eca\u4f4f\u3002', '\u4f20\u7edf\u4e0a\u591a\u4e0e\u7f81\u7eca\u3001\u56f0\u987f\u3001\u73b0\u5b9e\u9762\u4e0a\u96be\u4ee5\u8131\u79bb\u6709\u5173\u3002', '\u50cf\u5f88\u591a\u95ee\u9898\u4e0d\u662f\u60f3\u4e0d\u901a\uff0c\u800c\u662f\u73b0\u5b9e\u6761\u4ef6\u3001\u5173\u7cfb\u7f51\u7edc\u548c\u8d23\u4efb\u8ba9\u4f60\u4e0d\u597d\u52a8\u3002', '\u987a\u65f6\u4f1a\u8ba9\u4eba\u66f4\u91cd\u89c6\u73b0\u5b9e\u6761\u4ef6\uff0c\u4e5f\u66f4\u80fd\u8010\u5fc3\u505a\u57fa\u7840\u5efa\u8bbe\u3002', '\u4e0d\u5229\u65f6\u5219\u5bb9\u6613\u9677\u5165\u73b0\u5b9e\u56f0\u987f\uff0c\u60f3\u53d8\u5374\u96be\u53d8\uff0c\u5fc3\u91cc\u5f88\u6025\u5374\u8eab\u4f53\u5f88\u96be\u524d\u8fdb\u3002', '\u5730\u7f51\u4e3b\u9898\u4e0b\uff0c\u6700\u6709\u6548\u7684\u505a\u6cd5\u662f\u5148\u677e\u73b0\u5b9e\u675f\u7f1a\uff0c\u518d\u8c08\u7406\u60f3\u8f6c\u5411\u3002'),
  '\u9b41\u7f61': makeShenShaDetail('\u9b41\u7f61\u504f\u5411\u786c\u9aa8\u3001\u4e3b\u89c1\u3001\u5f3a\u51b3\u65ad\u548c\u4e0d\u670d\u8f93\u3002', '\u4f20\u7edf\u4e0a\u591a\u4e3b\u521a\u5f3a\u3001\u5a01\u52bf\u3001\u6027\u70c8\uff0c\u5e26\u7740\u8f83\u5f3a\u7684\u4e3b\u4f53\u611f\u3002', '\u50cf\u90a3\u79cd\u5173\u952e\u65f6\u523b\u80fd\u62cd\u677f\uff0c\u80fd\u625b\u538b\uff0c\u4e5f\u4e0d\u592a\u611f\u5e94\u7fa4\u4f53\u60c5\u7eea\u7684\u4eba\u683c\u9aa8\u67b6\u3002', '\u987a\u65f6\u4f1a\u8f6c\u6210\u5f88\u5f3a\u7684\u9aa8\u67b6\u611f\u548c\u5371\u5c40\u627f\u538b\u80fd\u529b\uff0c\u9002\u5408\u96be\u5c40\u3001\u91cd\u5c40\u548c\u5173\u952e\u5c40\u3002', '\u4e0d\u5229\u65f6\u5219\u5bb9\u6613\u521a\u8fc7\u5934\uff0c\u542c\u4e0d\u8fdb\u610f\u89c1\uff0c\u5173\u7cfb\u6469\u64e6\u5927\uff0c\u751a\u81f3\u628a\u81ea\u5df1\u903c\u5230\u6781\u9650\u3002', '\u9b41\u7f61\u6700\u91cd\u8981\u7684\u4e0d\u662f\u524a\u5f31\u529b\u91cf\uff0c\u800c\u662f\u5b66\u4f1a\u67d4\u5316\u529b\u91cf\uff0c\u8ba9\u5b83\u66f4\u53ef\u6301\u7eed\u3002'),
  '\u5341\u6076\u5927\u8d25': makeShenShaDetail('\u5341\u6076\u5927\u8d25\u504f\u5411\u8d44\u6e90\u6613\u6f0f\u3001\u5b88\u6210\u96be\u3001\u8d26\u9762\u548c\u5b9e\u9645\u843d\u888b\u6709\u843d\u5dee\u3002', '\u4f20\u7edf\u4e0a\u4e3b\u8d22\u5e93\u4e0d\u5b88\u3001\u7ecf\u8425\u5931\u8861\uff0c\u6295\u5165\u4e0e\u56de\u6536\u4e0d\u6210\u6bd4\u4f8b\u3002', '\u50cf\u770b\u8d77\u6765\u5f88\u5fd9\u3001\u5f88\u7528\u529b\uff0c\u4f46\u6700\u7ec8\u7559\u5b58\u548c\u6c89\u6dc0\u504f\u5f31\uff0c\u5f88\u5bb9\u6613\u6709\u6f0f\u51fa\u611f\u3002', '\u987a\u65f6\u4f1a\u63d0\u9192\u4eba\u63d0\u524d\u91cd\u89c6\u8d22\u52a1\u7ed3\u6784\uff0c\u7559\u5b58\u7387\u548c\u7ed3\u679c\u590d\u76d8\u3002', '\u4e0d\u5229\u65f6\u5219\u5bb9\u6613\u6f0f\u8d22\u3001\u9519\u914d\u3001\u9879\u76ee\u56de\u62a5\u4f4e\uff0c\u6216\u8005\u60c5\u7eea\u6027\u6295\u5165\u8fc7\u591a\u3002', '\u6700\u5173\u952e\u7684\u662f\u628a\u6536\u5165\u3001\u652f\u51fa\u3001\u6c89\u6dc0\u548c\u98ce\u9669\u62c6\u5f00\u770b\uff0c\u522b\u53ea\u770b\u8868\u9762\u70ed\u95f9\u3002'),
  '\u9634\u9633\u5dee\u9519': makeShenShaDetail('\u9634\u9633\u5dee\u9519\u504f\u5411\u8282\u594f\u9519\u62cd\u3001\u5173\u7cfb\u8bef\u5dee\u3001\u4e8b\u60c5\u603b\u5dee\u4e00\u70b9\u5bf9\u4e0a\u3002', '\u4f20\u7edf\u4e0a\u591a\u4e3b\u5a5a\u59fb\u3001\u5173\u7cfb\u3001\u793c\u6cd5\u3001\u914d\u5bf9\u4e2d\u7684\u5dee\u9519\u4e0e\u4e0d\u534f\u8c03\u3002', '\u50cf\u5e76\u4e0d\u662f\u6ca1\u6709\u7f18\u5206\uff0c\u800c\u662f\u5bb9\u6613\u5728\u65f6\u95f4\u3001\u8868\u8fbe\u3001\u671f\u5f85\u4e0a\u9519\u4f4d\u3002', '\u987a\u65f6\u4f1a\u8ba9\u4eba\u66f4\u91cd\u89c6\u5951\u5408\u5ea6\u3001\u8fb9\u754c\u548c\u957f\u671f\u5339\u914d\uff0c\u800c\u4e0d\u53ea\u770b\u4e00\u65f6\u5438\u5f15\u3002', '\u4e0d\u5229\u65f6\u5219\u5bb9\u6613\u5173\u7cfb\u8bef\u4f1a\uff0c\u5408\u4f5c\u9519\u62cd\uff0c\u8bf4\u4e0d\u6e05\u4e5f\u63a5\u4e0d\u4f4f\u3002', '\u9047\u5230\u9634\u9633\u5dee\u9519\u4e3b\u9898\u65f6\uff0c\u6700\u91cd\u8981\u7684\u662f\u628a\u62bd\u8c61\u611f\u89c9\u8bf4\u6e05\u695a\uff0c\u628a\u8282\u594f\u5bf9\u9f50\u3002'),
  '\u56db\u5e9f': makeShenShaDetail('\u56db\u5e9f\u504f\u5411\u9636\u6bb5\u6027\u80fd\u91cf\u4f4e\u3001\u53d1\u6325\u6253\u6298\u3001\u60f3\u505a\u4f46\u6c14\u4e0d\u591f\u3002', '\u4f20\u7edf\u4e0a\u4e3b\u65f6\u4ee4\u5931\u52bf\uff0c\u505a\u4e8b\u4e0d\u65fa\uff0c\u53d1\u6325\u53d7\u9650\u3002', '\u50cf\u67d0\u4e9b\u9636\u6bb5\u4f60\u4e0d\u5bb9\u6613\u4e00\u4e0a\u6765\u5c31\u6ee1\u683c\u8f93\u51fa\uff0c\u800c\u662f\u9700\u8981\u5148\u70ed\u8eab\u548c\u517b\u52bf\u3002', '\u987a\u65f6\u4f1a\u8ba9\u4eba\u66f4\u61c2\u5f97\u987a\u52bf\u800c\u4e3a\uff0c\u5148\u84c4\u529b\u518d\u51fa\u624b\u3002', '\u4e0d\u5229\u65f6\u5219\u5bb9\u6613\u9677\u5165\u4f4e\u6548\u3001\u632b\u8d25\u548c\u5bf9\u81ea\u5df1\u5931\u671b\u7684\u6076\u6027\u5faa\u73af\u3002', '\u56db\u5e9f\u6700\u91cd\u8981\u7684\u662f\u63a5\u53d7\u80fd\u91cf\u7684\u9636\u6bb5\u6027\u6ce2\u52a8\uff0c\u4e0d\u8981\u7528\u6ee1\u683c\u6807\u51c6\u8d23\u5907\u4f4e\u8c37\u671f\u7684\u81ea\u5df1\u3002'),
  '\u6d41\u971e': makeShenShaDetail('\u6d41\u971e\u504f\u5411\u611f\u5b98\u3001\u60c5\u7eea\u3001\u9b45\u529b\u548c\u5173\u7cfb\u4e2d\u7684\u5fae\u5999\u5f20\u529b\u3002', '\u4f20\u7edf\u4e0a\u591a\u5e26\u6843\u82b1\u3001\u60c5\u7eea\u3001\u9152\u8272\u3001\u611f\u5b98\u8bf1\u56e0\u4e0e\u5173\u7cfb\u6ce2\u52a8\u7684\u8272\u5f69\u3002', '\u50cf\u4f60\u5f88\u6709\u5438\u5f15\u529b\u548c\u6c1b\u56f4\u611f\uff0c\u4f46\u4e5f\u5bb9\u6613\u88ab\u611f\u89c9\u5e26\u7740\u8d70\u3002', '\u987a\u65f6\u53ef\u4ee5\u8f6c\u6210\u5ba1\u7f8e\u3001\u4eb2\u548c\u529b\u3001\u8868\u8fbe\u548c\u5173\u7cfb\u4e2d\u7684\u67d4\u8f6f\u8fde\u63a5\u3002', '\u4e0d\u5229\u65f6\u5219\u53ef\u80fd\u60c5\u7eea\u4e0a\u5934\uff0c\u5173\u7cfb\u4e0d\u6e05\uff0c\u6216\u88ab\u611f\u89c9\u8986\u76d6\u7406\u6027\u5224\u65ad\u3002', '\u6d41\u971e\u9002\u5408\u7528\u5728\u827a\u672f\u611f\u548c\u5173\u7cfb\u6e29\u5ea6\u4e0a\uff0c\u4e0d\u9002\u5408\u62ff\u6765\u4ee3\u66ff\u7406\u6027\u5224\u65ad\u3002'),
  '\u516b\u4e13': makeShenShaDetail('\u516b\u4e13\u504f\u5411\u4e13\u6c14\u3001\u5355\u70b9\u805a\u7126\u3001\u6027\u683c\u91cc\u67d0\u4e00\u80a1\u52b2\u7279\u522b\u96c6\u4e2d\u3002', '\u4f20\u7edf\u4e0a\u4e3b\u4e13\u4e00\u3001\u504f\u6267\u3001\u4e13\u6ce8\uff0c\u5e26\u7740\u8f83\u660e\u663e\u7684\u4e2a\u4eba\u98ce\u683c\u3002', '\u50cf\u4f60\u5728\u67d0\u7c7b\u4e8b\u4e0a\u4f1a\u7279\u522b\u6295\u5165\uff0c\u7279\u522b\u5bb9\u6613\u505a\u6df1\uff0c\u4f46\u4e5f\u7279\u522b\u5bb9\u6613\u62e7\u3002', '\u987a\u65f6\u4f1a\u5f62\u6210\u5f88\u5f3a\u7684\u6df1\u94bb\u529b\u3001\u4e13\u4e1a\u5ea6\u548c\u9c9c\u660e\u7684\u4e2a\u4eba\u98ce\u683c\u3002', '\u4e0d\u5229\u65f6\u5219\u53ef\u80fd\u94bb\u725b\u89d2\u5c16\uff0c\u8fc7\u4e8e\u4e3b\u89c2\uff0c\u96be\u4ee5\u8f6c\u5f2f\u3002', '\u516b\u4e13\u6700\u597d\u7684\u7528\u6cd5\u662f\u628a\u4e13\u6ce8\u529b\u7528\u5728\u4e13\u4e1a\u3001\u4f5c\u54c1\u548c\u957f\u671f\u7ecf\u8425\u4e0a\uff0c\u800c\u4e0d\u662f\u7528\u5728\u60c5\u7eea\u5bf9\u6297\u4e0a\u3002'),
});

function getStructuredDetail(name) {
  const detail = TEN_GOD_DETAILS[name] || SHEN_SHA_TEXT[name];
  if (!detail) return null;
  if (typeof detail === 'string') {
    return {
      lead: '',
      sections: detail.split('\n\n').map((block, index) => {
        const parts = block.split('\uff1a');
        return { title: parts[0] || `\u8bf4\u660e ${index + 1}`, body: parts.slice(1).join('\uff1a') || block };
      }),
    };
  }
  return detail;
}

function getDetailSectionIcon(title) {
  const iconMap = {
    '\u53d6\u8c61': '\u25c8',
    '\u73b0\u4ee3\u8bed': '\u25ce',
    '\u4e3a\u559c\u65f6': '\u25cf',
    '\u4e3a\u5fcc\u65f6': '\u25b3',
    '\u884c\u52a8\u63d0\u9192': '\u2726',
  };
  return iconMap[title] || '\u25c7';
}

function getDetailSectionTone(title) {
  if (title === '\u4e3a\u559c\u65f6') {
    return {
      card: 'rgba(52,199,89,0.10)',
      border: 'rgba(52,199,89,0.20)',
      badge: 'rgba(52,199,89,0.16)',
      icon: '#2E9B4B',
    };
  }
  if (title === '\u4e3a\u5fcc\u65f6') {
    return {
      card: 'rgba(255,159,10,0.10)',
      border: 'rgba(255,159,10,0.22)',
      badge: 'rgba(255,159,10,0.16)',
      icon: '#C97A00',
    };
  }
  return {
    card: '#FBFAF5',
    border: 'rgba(198,146,42,0.12)',
    badge: 'rgba(198,146,42,0.12)',
    icon: C.gold,
  };
}

function toText(value) {
  if (value == null || value === '') return '--';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = `${value.getMonth() + 1}`.padStart(2, '0');
    const d = `${value.getDate()}`.padStart(2, '0');
    const hh = `${value.getHours()}`.padStart(2, '0');
    const mm = `${value.getMinutes()}`.padStart(2, '0');
    return hh === '00' && mm === '00' ? `${y}-${m}-${d}` : `${y}-${m}-${d} ${hh}:${mm}`;
  }
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === 'string' || typeof item === 'number') return String(item);
      if (item?.['zh-Hans']) return item['zh-Hans'];
      if (item?.name) return item.name;
      if (item?.label && typeof item.label === 'string') return item.label;
      return '';
    }).filter(Boolean).join(' / ') || '--';
  }
  if (typeof value === 'object') {
    if (value['zh-Hans']) return value['zh-Hans'];
    if (value.advice) return toText(value.advice);
    if (value.summary) return toText(value.summary);
    if (value.ji) return toText(value.ji);
    if (value.color) return toText(value.color);
  }
  return '--';
}

function formatGoodHours(value) {
  if (!value) return '--';
  if (Array.isArray(value)) {
    const items = value
      .map((item) => {
        if (typeof item === 'string' || typeof item === 'number') return String(item);
        if (item?.time && item?.level) return `${item.time} ${item.level}`;
        if (item?.time) return item.time;
        if (item?.label) return typeof item.label === 'string' ? item.label : toText(item.label);
        return '';
      })
      .filter(Boolean);
    return items.join(' / ') || '--';
  }
  if (typeof value === 'object' && value?.time) {
    return value?.level ? `${value.time} ${value.level}` : value.time;
  }
  return toText(value);
}

function formatHourRange(item) {
  if (!item) return '--';
  if (item.start && item.end && item.start !== '--' && item.end !== '--') return `${item.start}-${item.end}`;
  return '--';
}

function formatHourYiJi(items = []) {
  if (!Array.isArray(items) || !items.length) return '--';
  return items.filter(Boolean).slice(0, 3).join('、') || '--';
}

function formatSolarBirth(result) {
  const solar = result?.solarBirthInfo || result?.birthInfo;
  if (solar?.year && solar?.month && solar?.day) {
    const hour = `${solar?.hour ?? result?.birthInfo?.hour ?? result?.inputBirthInfo?.hour ?? 0}`.padStart(2, '0');
    const minute = `${solar?.minute ?? result?.birthInfo?.minute ?? result?.inputBirthInfo?.minute ?? 0}`.padStart(2, '0');
    return `${solar.year}年${`${solar.month}`.padStart(2, '0')}月${`${solar.day}`.padStart(2, '0')}日 ${hour}时${minute}分`;
  }
  return toText(result?.solarDate);
}

function formatFamilySavedAt(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function getGenericShenShaFallback(name) {
  return {
      lead: `${name} 更适合当作命盘里的辅助线索来看，放回整体结构里判断会更稳，不必单独放大。`,
    sections: [
      {
        title: '取象',
        body: '神煞更像命盘里的补充标签，用来提示某类气质、场景、际遇或人生主题会被放大。',
      },
      {
        title: '现代语',
        body: '放到现代生活里，它通常表示某种容易反复出现的关系模式、机会类型、压力来源或行为习惯。',
      },
      {
        title: '阅读方式',
        body: '先看它更贴近生活的哪一块，再看它是否和整体节奏同向；同向时感受更明显，不同向时更像提醒。',
      },
      {
        title: '行动提醒',
        body: '把它当作“需要多留意的主题”更稳妥：观察它在工作、关系、金钱和情绪里分别如何体现，再决定怎么调整。',
      },
    ],
  };
}

function getClassicalCoreSummary(result, profile, oneLineSummary) {
  return (
    result?.classicalDecisionRules?.summary ||
    oneLineSummary ||
    result?.narrative?.coreSummary ||
    `你现在更适合围绕 ${profile?.focus || '自我认知'} 先稳住主线，再决定今天怎么推进。`
  );
}

function getClassicalStageSummary(result, profile, calSummary) {
  return (
    result?.classicalDecisionRules?.stageSummary ||
    result?.narrative?.stageSummary ||
    calSummary?.summary ||
    `当前更适合围绕 ${profile?.focus || '自我认知'} 做判断。`
  );
}

function getStemElement(stem) {
  if (['\u7532', '\u4e59'].includes(stem)) return '\u6728';
  if (['\u4e19', '\u4e01'].includes(stem)) return '\u706b';
  if (['\u620a', '\u5df1'].includes(stem)) return '\u571f';
  if (['\u5e9a', '\u8f9b'].includes(stem)) return '\u91d1';
  if (['\u58ec', '\u7678'].includes(stem)) return '\u6c34';
  return null;
}

function getBranchElement(branch) {
  if (['\u5bc5', '\u536f'].includes(branch)) return '\u6728';
  if (['\u5df3', '\u5348'].includes(branch)) return '\u706b';
  if (['\u8fb0', '\u620c', '\u4e11', '\u672a'].includes(branch)) return '\u571f';
  if (['\u7533', '\u9149'].includes(branch)) return '\u91d1';
  if (['\u4ea5', '\u5b50'].includes(branch)) return '\u6c34';
  return null;
}

function getLuckyColorTone(text) {
  const label = toText(text);
  if (label.includes('\u7ea2')) return '#E24A3B';
  if (label.includes('\u7eff')) return '#2E9B4B';
  if (label.includes('\u84dd')) return '#2D6CDF';
  if (label.includes('\u91d1') || label.includes('\u9ec4')) return '#C6922A';
  if (label.includes('\u7d2b')) return '#8E6EF7';
  return C.ink;
}

function getResolvedWeeklyActions(weeklyActions) {
  const mergeItem = (fallback, actual = {}) => ({
    title: actual?.title || fallback.title,
    advice: actual?.advice || fallback.advice,
    cue: actual?.cue || fallback.cue,
  });
  return {
    work: mergeItem(DEFAULT_WEEKLY_ACTIONS.work, weeklyActions?.work),
    relationship: mergeItem(DEFAULT_WEEKLY_ACTIONS.relationship, weeklyActions?.relationship),
    money: mergeItem(DEFAULT_WEEKLY_ACTIONS.money, weeklyActions?.money),
    emotion: mergeItem(DEFAULT_WEEKLY_ACTIONS.emotion, weeklyActions?.emotion),
    health: mergeItem(DEFAULT_WEEKLY_ACTIONS.health, weeklyActions?.health),
  };
}

function parseGanzhiPair(value) {
  if (value && typeof value === 'object') {
    if (value.gan && value.zhi) return { gan: value.gan, zhi: value.zhi };
    if (value.ganZhi) return parseGanzhiPair(value.ganZhi);
    if (value.name) return parseGanzhiPair(value.name);
  }
  const text = `${value || ''}`;
  return text.length >= 2 ? { gan: text.charAt(0), zhi: text.charAt(1) } : { gan: '--', zhi: '--' };
}

function parseFormattedGanzhi(result) {
  const text = `${result?.formattedGanzhi || ''}`;
  const pairs = text.match(/[\u4e00-\u9fa5][\u4e00-\u9fa5]/g);
  if (!pairs || pairs.length < 4) return null;
  return pairs.slice(0, 4).map((item) => parseGanzhiPair(item));
}

function getResolvedPillars(result) {
  const formattedPairs = parseFormattedGanzhi(result);
  const branchGroups = [
    result?.pillarDetails?.year?.branchTenGods || [],
    result?.pillarDetails?.month?.branchTenGods || [],
    result?.pillarDetails?.day?.branchTenGods || [],
    result?.pillarDetails?.hour?.branchTenGods || [],
  ];
  if (Array.isArray(result?.pillars) && result.pillars.length) {
    return result.pillars.map((item, index) => ({
      gan: item?.gan || item?.stem || formattedPairs?.[index]?.gan || '--',
      zhi: item?.zhi || item?.branch || formattedPairs?.[index]?.zhi || '--',
      hiddenStems: item?.hiddenStems || [],
      hiddenTenGods: item?.hiddenTenGods || [],
      branchTenGods: item?.branchTenGods || branchGroups[index] || [],
    }));
  }
  if (result?.pillars?.year) {
    return [
      { gan: result?.pillars?.year?.stem || formattedPairs?.[0]?.gan || '--', zhi: result?.pillars?.year?.branch || formattedPairs?.[0]?.zhi || '--', hiddenStems: result?.pillarDetails?.year?.hiddenStems || [], hiddenTenGods: result?.pillarDetails?.year?.hiddenStemTenGods || [], branchTenGods: branchGroups[0] },
      { gan: result?.pillars?.month?.stem || formattedPairs?.[1]?.gan || '--', zhi: result?.pillars?.month?.branch || formattedPairs?.[1]?.zhi || '--', hiddenStems: result?.pillarDetails?.month?.hiddenStems || [], hiddenTenGods: result?.pillarDetails?.month?.hiddenStemTenGods || [], branchTenGods: branchGroups[1] },
      { gan: result?.pillars?.day?.stem || result?.dayGan || formattedPairs?.[2]?.gan || '--', zhi: result?.pillars?.day?.branch || formattedPairs?.[2]?.zhi || '--', hiddenStems: result?.pillarDetails?.day?.hiddenStems || [], hiddenTenGods: result?.pillarDetails?.day?.hiddenStemTenGods || [], branchTenGods: branchGroups[2] },
      { gan: result?.pillars?.hour?.stem || formattedPairs?.[3]?.gan || '--', zhi: result?.pillars?.hour?.branch || formattedPairs?.[3]?.zhi || '--', hiddenStems: result?.pillarDetails?.hour?.hiddenStems || [], hiddenTenGods: result?.pillarDetails?.hour?.hiddenStemTenGods || [], branchTenGods: branchGroups[3] },
    ];
  }
  return [
    { ...(formattedPairs?.[0] || parseGanzhiPair(result?.yearPillar)), hiddenStems: result?.pillarDetails?.year?.hiddenStems || [], hiddenTenGods: result?.pillarDetails?.year?.hiddenStemTenGods || [], branchTenGods: branchGroups[0] },
    { ...(formattedPairs?.[1] || parseGanzhiPair(result?.monthPillar)), hiddenStems: result?.pillarDetails?.month?.hiddenStems || [], hiddenTenGods: result?.pillarDetails?.month?.hiddenStemTenGods || [], branchTenGods: branchGroups[1] },
    { ...(formattedPairs?.[2] || parseGanzhiPair(result?.dayPillar || `${result?.dayGan || ''}${result?.dayZhi || ''}`)), hiddenStems: result?.pillarDetails?.day?.hiddenStems || [], hiddenTenGods: result?.pillarDetails?.day?.hiddenStemTenGods || [], branchTenGods: branchGroups[2] },
    { ...(formattedPairs?.[3] || parseGanzhiPair(result?.hourPillar)), hiddenStems: result?.pillarDetails?.hour?.hiddenStems || [], hiddenTenGods: result?.pillarDetails?.hour?.hiddenStemTenGods || [], branchTenGods: branchGroups[3] },
  ];
}

function normalizeList(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => toText(item)).filter((item) => item && item !== '--');
  }
  const text = toText(value);
  return text && text !== '--' ? [text] : [];
}

function getCalendarCells(days = []) {
  const list = Array.isArray(days) ? days.slice(0, 31) : [];
  return list.map((item, index) => {
    const score = item?.fortune?.score ?? item?.score ?? 0;
    const yi = item?.yiJi?.yi || item?.yi || [];
    const ji = item?.yiJi?.ji || item?.ji || [];
    const luckyDirection = item?.luckyDirection || item?.jiFang?.ji || '--';
    const luckyColor = item?.luckyColor || item?.jiFang?.color || '--';
    const goodHours = item?.jiShi || item?.goodHours || [];
    const yiText = toText(yi);
    const jiText = toText(ji);
    const goodHoursText = formatGoodHours(goodHours);
    const fortuneAdvice = toText(item?.fortune?.advice || item?.advice);
    const yiCount = Array.isArray(yi) ? yi.filter(Boolean).length : yiText !== '--' ? yiText.split(' / ').filter(Boolean).length : 0;
    const jiCount = Array.isArray(ji) ? ji.filter(Boolean).length : jiText !== '--' ? jiText.split(' / ').filter(Boolean).length : 0;
    const hintDelta = yiCount - jiCount;
    const favorable = score >= 82;
    const cautious = score > 0 && score <= 62;
    const label = favorable ? '\u9002\u5408\u63a8\u8fdb' : cautious ? '\u5b9c\u5148\u653e\u7f13' : '\u5e73\u7a33\u5b89\u6392';
    const tone = favorable ? C.success : cautious ? C.warn : '#7FCFBD';
    const surfaceColor = favorable ? '#EEF8F4' : cautious ? '#FFF7EC' : '#F7FBFA';
    const borderColor = favorable ? 'rgba(52,199,89,0.18)' : cautious ? 'rgba(255,159,10,0.20)' : 'rgba(127,207,189,0.22)';
    const hintLevel = Math.max(yiCount, jiCount) >= 3 ? '\u91cd' : Math.max(yiCount, jiCount) >= 2 ? '\u4e2d' : '\u8f7b';
    const yiFlex = yiCount || jiCount ? Math.max(1, yiCount || 1) : 1;
    const jiFlex = yiCount || jiCount ? Math.max(1, jiCount || 1) : 1;
    const advice = fortuneAdvice !== '--'
      ? fortuneAdvice
      : favorable
        ? `今天更适合顺势推进，优先处理 ${yiText !== '--' ? yiText.split(' / ')[0] : '手头最重要的一件事'}，方位可朝 ${luckyDirection !== '--' ? luckyDirection : '舒适方向'} 借一点势。`
        : cautious
          ? `今天更适合先收一收，尽量避开 ${jiText !== '--' ? jiText.split(' / ')[0] : '仓促决定'}，把节奏放慢一点，留出缓冲。`
          : `今天适合稳稳推进日常安排，先做 ${yiText !== '--' ? yiText.split(' / ')[0] : '整理与确认'}，在 ${goodHoursText !== '--' ? goodHoursText.split(' / ')[0] : '状态顺的时候'} 再处理关键事项。`;
    return {
      key: `${item?.dateStr || index}-${index}`,
      day: item?.date?.day || index + 1,
      month: item?.date?.month || 1,
      year: item?.date?.year || 0,
      dateLabel: item?.dateStr || `${index + 1}`,
      score,
      label,
      tone,
      surfaceColor,
      borderColor,
      yiCount,
      jiCount,
      hintDelta,
      yiFlex,
      jiFlex,
      pillar: item?.dayPillar?.ganZhi || '--',
      advice,
      yi,
      ji,
      luckyDirection,
      luckyColor,
      goodHours,
      lunarInfo: item?.lunarInfo || null,
      hourlyLuck: item?.hourlyLuck || [],
    };
  });
}

function buildMonthCalendar(monthInfo, days = []) {
  const cells = getCalendarCells(days);
  const monthYear = monthInfo?.year || cells[0]?.year;
  const monthNumber = monthInfo?.month || cells[0]?.month;
  if (!monthYear || !monthNumber) return { title: '\u672c\u6708', weeks: [] };

  const firstWeekday = new Date(monthYear, monthNumber - 1, 1).getDay();
  const daysInMonth = new Date(monthYear, monthNumber, 0).getDate();
  const cellMap = new Map(
    cells
      .filter((item) => item.year === monthYear && item.month === monthNumber)
      .map((item) => [`${item.year}-${item.month}-${item.day}`, item])
  );

  const items = [];
  for (let i = 0; i < firstWeekday; i += 1) items.push({ key: `empty-${monthYear}-${monthNumber}-${i}`, empty: true });
  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = `${monthYear}-${monthNumber}-${day}`;
    const existing = cellMap.get(key);
    items.push(existing || {
      key: `calendar-${key}`,
      day,
      month: monthNumber,
      year: monthYear,
      dateLabel: `${monthYear}\u5e74${monthNumber}\u6708${day}\u65e5`,
      label: '\u5e73\u8861\u8c03\u6574',
      tone: '#6E8F88',
      surfaceColor: '#F4FAF8',
      borderColor: 'rgba(127,207,189,0.24)',
      yiCount: 0,
      jiCount: 0,
      hintDelta: 0,
      yiFlex: 1,
      jiFlex: 1,
      pillar: '--',
      advice: '\u4eca\u5929\u53ef\u4ee5\u5148\u5b89\u6392\u65e5\u5e38\u4e8b\u9879\uff0c\u7a33\u7a33\u5730\u5b8c\u6210\u4e00\u4e24\u4ef6\u5173\u952e\u5c0f\u4e8b\uff0c\u4e0d\u5fc5\u5f3a\u6c42\u989d\u5916\u51b2\u523a\u3002',
      yi: [],
      ji: [],
      luckyDirection: '--',
      luckyColor: '--',
      goodHours: [],
    });
  }
  while (items.length % 7 !== 0) items.push({ key: `tail-${monthYear}-${monthNumber}-${items.length}`, empty: true });
  const weeks = [];
  for (let i = 0; i < items.length; i += 7) weeks.push(items.slice(i, i + 7));
  return { title: `${monthYear}\u5e74${monthNumber}\u6708`, weeks };
}

function buildAvailableMonths(days = []) {
  const cells = getCalendarCells(days);
  const seen = new Set();
  return cells.reduce((list, item) => {
    const key = `${item.year}-${item.month}`;
    if (!item.year || !item.month || seen.has(key)) return list;
    seen.add(key);
    list.push({ key, year: item.year, month: item.month, label: `${item.year}年${item.month}月` });
    return list;
  }, []);
}

function isSameCalendarDate(item, date = new Date()) {
  return Number(item?.year) === date.getFullYear()
    && Number(item?.month) === date.getMonth() + 1
    && Number(item?.day) === date.getDate();
}

function findTodayCalendarCell(fortuneCalendar = [], result = null) {
  const today = new Date();
  const existing = getCalendarCells(fortuneCalendar).find((item) => isSameCalendarDate(item, today));
  if (existing) return existing;
  const generated = buildFullMonthFortuneDays(
    { year: today.getFullYear(), month: today.getMonth() + 1 },
    fortuneCalendar,
    result
  );
  return getCalendarCells(generated).find((item) => isSameCalendarDate(item, today)) || null;
}

function buildFullMonthFortuneDays(monthInfo, fortuneCalendar = [], result) {
  if (!monthInfo?.year || !monthInfo?.month || !result?.dayGan) {
    return Array.isArray(fortuneCalendar)
      ? fortuneCalendar.filter((item) => item?.date?.year === monthInfo?.year && item?.date?.month === monthInfo?.month)
      : [];
  }

  const daysInMonth = new Date(monthInfo.year, monthInfo.month, 0).getDate();
  const generated = generateFortuneCalendar(
    result.dayGan,
    daysInMonth,
    new Date(monthInfo.year, monthInfo.month - 1, 1)
  );

  const originalMap = new Map(
    (Array.isArray(fortuneCalendar) ? fortuneCalendar : []).map((item) => [
      `${item?.date?.year}-${item?.date?.month}-${item?.date?.day}`,
      item,
    ])
  );

  return generated.map((item) => {
    const key = `${item?.date?.year}-${item?.date?.month}-${item?.date?.day}`;
    const original = originalMap.get(key);
    if (!original) return item;
    return {
      ...item,
      ...original,
      lunarInfo: item?.lunarInfo || original?.lunarInfo || null,
      hourlyLuck: item?.hourlyLuck || original?.hourlyLuck || [],
    };
  });
}

function getCalendarActionText(day, type) {
  const raw = type === 'yi' ? day?.yi : day?.ji;
  const text = toText(raw);
  const firstItem = text && text !== '--' ? text.split(' / ').filter(Boolean)[0] : '';
  const secondItem = text && text !== '--' ? text.split(' / ').filter(Boolean)[1] : '';
  const direction = toText(day?.luckyDirection);
  const hours = toText(day?.goodHours);

  if (type === 'yi') {
    if (day?.label === '适合推进') {
      return `今天更适合把注意力收回到最重要的一件事上，优先推进${firstItem || '沟通确认'}，如果状态允许，可在${hours !== '--' ? hours.split(' / ')[0] : '顺手的时段'}集中处理关键动作。`;
    }
    if (day?.label === '宜先放缓') {
      return `今天更适合先稳住节奏，再处理外部事务。像${firstItem || '复盘整理'}这类不需要硬冲的事情，会比强行往前推更顺。`;
    }
    return `今天适合把安排做得清楚一点，先完成${firstItem || '整理确认'}，再慢慢接上${secondItem || '日常推进'}，不必一下子把自己推得太满。`;
  }

  if (day?.label === '适合推进') {
    return `今天不太适合被琐事带着跑，也尽量别把${firstItem || '关键事项'}一拖再拖。越早把主线拎清，今天的效率越稳。`;
  }
  if (day?.label === '宜先放缓') {
    return `今天要尽量避开${firstItem || '仓促决定'}这类会放大消耗的动作，也别在情绪起伏时立刻拍板，先给自己留一点回旋空间。`;
  }
  return `今天不太适合同时铺开太多事，也尽量避免为了配合别人节奏而打乱自己。先按自己的顺序走，会比勉强加速更稳。`;
}

function formatCalendarCellLabel(label) {
  if (!label || label === '--') return ['平稳', '安排'];
  if (label === '适合推进') return ['适合', '推进'];
  if (label === '宜先放缓') return ['宜先', '放缓'];
  if (label === '平稳安排') return ['平稳', '安排'];
  if (label.length <= 2) return [label, ''];
  if (label.length <= 4) return [label.slice(0, 2), label.slice(2)];
  return [label.slice(0, 2), label.slice(2, 4)];
}

function getCalendarEntryKey(day) {
  if (!day) return '';
  return `${day.year}-${`${day.month}`.padStart(2, '0')}-${`${day.day}`.padStart(2, '0')}`;
}

function getReminderDateForDay(day, notificationPrefs) {
  if (!day?.year || !day?.month || !day?.day) return null;
  const hour = Number(notificationPrefs?.hour ?? 8);
  const minute = Number(notificationPrefs?.minute ?? 30);
  const leadMinutes = Number(notificationPrefs?.leadMinutes ?? 0);
  const target = new Date(day.year, day.month - 1, day.day, hour, minute, 0, 0);
  target.setMinutes(target.getMinutes() - leadMinutes);
  if (Number.isNaN(target.getTime())) return null;
  return target;
}

function getReminderTimeConfig(entry, notificationPrefs) {
  return {
    hour: Number(entry?.reminderHour ?? notificationPrefs?.hour ?? 8),
    minute: Number(entry?.reminderMinute ?? notificationPrefs?.minute ?? 30),
    leadMinutes: Number(entry?.reminderLeadMinutes ?? notificationPrefs?.leadMinutes ?? 0),
    repeatRule: entry?.reminderRepeatRule || 'once',
  };
}

function getRepeatTriggerForDay(day, config) {
  const rule = config?.repeatRule || 'once';
  const hour = Number(config?.hour ?? 8);
  const minute = Number(config?.minute ?? 30);
  const leadMinutes = Number(config?.leadMinutes ?? 0);
  if (rule === 'daily') {
    const triggerDate = new Date();
    triggerDate.setHours(hour, minute, 0, 0);
    triggerDate.setMinutes(triggerDate.getMinutes() - leadMinutes);
    return { hour: triggerDate.getHours(), minute: triggerDate.getMinutes(), repeats: true };
  }
  if (rule === 'weekly') {
    const base = new Date(day.year, day.month - 1, day.day, hour, minute, 0, 0);
    base.setMinutes(base.getMinutes() - leadMinutes);
    const weekday = base.getDay() === 0 ? 1 : base.getDay() + 1;
    return { weekday, hour: base.getHours(), minute: base.getMinutes(), repeats: true };
  }
  return getReminderDateForDay(day, config);
}

function normalizeCalendarNoteItem(item, index = 0) {
  if (!item) return null;
  if (typeof item === 'string') {
    return { id: `legacy-${index}`, text: item, type: 'todo' };
  }
  const text = `${item?.text || item?.note || ''}`.trim();
  if (!text) return null;
  return {
    id: item?.id || `note-${index}-${text.slice(0, 8)}`,
    text,
    type: item?.type || 'todo',
    done: !!item?.done,
  };
}

function getCalendarNoteItems(entry) {
  if (Array.isArray(entry?.notes)) {
    return entry.notes.map((item, index) => normalizeCalendarNoteItem(item, index)).filter(Boolean);
  }
  if (entry?.note) {
    return [normalizeCalendarNoteItem({ text: entry.note, type: 'todo', id: 'legacy-0' }, 0)].filter(Boolean);
  }
  return [];
}

function getCalendarNotes(entry) {
  return getCalendarNoteItems(entry).map((item) => item.text);
}

function isTodayCell(day) {
  if (!day?.year || !day?.month || !day?.day) return false;
  const now = new Date();
  return now.getFullYear() === day.year && now.getMonth() + 1 === day.month && now.getDate() === day.day;
}

function getCurrentDaYunLabel(result) {
  const list = Array.isArray(result?.daYun) ? result.daYun : [];
  if (!list.length) return toText(result?.luckAnalysis?.dayunTheme);
  const birthYear = Number(result?.birthInfo?.year || `${result?.solarDate || ''}`.slice(0, 4) || 0);
  const currentYear = new Date().getFullYear();
  const age = birthYear ? currentYear - birthYear : 0;
  const current = list.find((item) => age >= Number(item?.startAge || 0) && age <= Number(item?.endAge || 0));
  return toText(current?.ganZhi || current?.gan + current?.zhi || result?.luckAnalysis?.dayunTheme || list[0]?.ganZhi);
}

function firstValid(...values) {
  for (const value of values) {
    const text = toText(value);
    if (text && text !== '--') return text;
  }
  return '--';
}

function compactText(value) {
  return firstValid(value).replace(/\s+/g, ' ').trim();
}

function normalizeGuideText(value) {
  const text = compactText(value);
  return text === '--' ? '' : text;
}

function extractColorSuggestions(colorText) {
  const text = normalizeGuideText(colorText);
  if (!text) return ['米白', '雾青'];
  const picks = ['白', '米', '灰', '金', '黄', '青', '绿', '蓝', '粉', '紫', '黑', '红', '棕']
    .filter((item) => text.includes(item));
  const mapped = picks.map((item) => {
    if (item === '白') return '月白';
    if (item === '青') return '雾青';
    if (item === '绿') return '青绿';
    if (item === '蓝') return '海蓝';
    if (item === '黄') return '柔金';
    return item;
  });
  return [...new Set(mapped)].slice(0, 3).filter(Boolean).length ? [...new Set(mapped)].slice(0, 3) : [text];
}

function buildTodayGuideCards({ today, result, weekly, profile }) {
  const luckyColor = normalizeGuideText(today?.luckyColor || result?.luckyColor);
  const luckyDirection = normalizeGuideText(today?.luckyDirection || result?.luckyDirection);
  const yiText = normalizeGuideText(today?.yi);
  const jiText = normalizeGuideText(today?.ji);
  const riskText = normalizeGuideText(result?.narrative?.emotionalHint || weekly?.emotion?.advice || result?.luckAnalysis?.riskAreas);
  const strategyText = normalizeGuideText(result?.useGodAnalysis?.strategy || weekly?.work?.advice);
  const profileName = profile?.nickname || '你';
  const colorSet = extractColorSuggestions(luckyColor);

  return [
    {
      key: 'outfit',
      name: '今日穿衣配色',
      summary: `${colorSet.join(' / ')} 更贴合今天的节奏，穿搭尽量简洁、干净、有层次。`,
      content: {
        lead: `今天适合把外在状态先调顺。${luckyColor ? `当前更顺的色彩落点在 ${luckyColor}。` : '建议优先选柔和、干净、能让人放松的配色。'}`,
        sections: [
          { title: '推荐搭配', body: `可以把 ${colorSet[0]} 放在上半身或靠近脸部的位置，再用 ${colorSet[1] || colorSet[0]} 做外套、围巾、包袋或鞋履的呼应，整体会更显精神和稳定。` },
          { title: '今天更顺的穿法', body: '尽量减少太跳、太杂、太厚重的撞色，选择一主一辅的配色结构，会比堆很多元素更显状态。' },
          { title: '给你的提醒', body: `${profileName}今天更适合“先让自己顺眼”，再去推进事情。外在整理好，心会更快安定下来。` },
        ],
      },
    },
    {
      key: 'direction',
      name: '今日利方向',
      summary: `${luckyDirection || '先选更安静、光线更顺的方向'}，更适合沟通、整理与推进关键事项。`,
      content: {
        lead: luckyDirection ? `今天的环境提示更偏向 ${luckyDirection}。这不是迷信地“朝哪边站”，而是提醒你优先把重要动作放在更顺、更稳的环境里。` : '今天更重要的是先找到一个不被打断、能稳住节奏的空间，再做关键动作。',
        sections: [
          { title: '怎么用在今天', body: '适合把重要沟通、整理思路、确认安排、写关键内容这些动作，尽量放到更安静、光线更柔和、干扰更少的位置。' },
          { title: '现实里的做法', body: '如果能选座位、工位、会议位置或出门动线，先选让你更容易稳定呼吸和聚焦的方向，不必太用力追求仪式感。' },
          { title: '行动提醒', body: '今天比起四处冲，更适合先把位置坐稳、节奏放稳，再推进事情。环境一顺，判断也会更顺。' },
        ],
      },
    },
    {
      key: 'yiji',
      name: '今日宜忌提醒',
      summary: `宜：${yiText || '先做顺势推进的事'}；忌：${jiText || '别在情绪高点仓促决定'}。`,
      content: {
        lead: '把万年历里的宜忌翻成现代语，重点不是“能不能做”，而是“今天怎么做更顺、怎么做更容易卡住”。',
        sections: [
          { title: '今天适合', body: yiText || '适合整理节奏、确认方向、推进手头最重要的一件事，先把主线稳住。' },
          { title: '今天别急', body: jiText || '不适合在信息不全、情绪未稳时仓促定结论，也不适合什么都想今天一起推进。' },
          { title: '更实用的理解', body: '今天的宜忌更像节奏提示：能收敛的先收敛，能确认的先确认，少做高噪音和高消耗的决定。' },
        ],
      },
    },
    {
      key: 'comfort',
      name: '正觉正念',
      summary: `${riskText || '今天先把心安下来，再做判断'}。先稳情绪，再稳节奏，别急着证明自己。`,
      content: {
        lead: '今天最重要的不是把所有事都处理完，而是别让自己在内耗里越陷越深。先被安顿，后面的话和决定才会更准确。',
        sections: [
          { title: '你今天可能会卡住的点', body: riskText || '容易一边想很多，一边又觉得自己必须马上给出答案，于是心更乱、动作更散。' },
          { title: '现在最有利的做法', body: strategyText || '先选一件最小但最关键的事推进，哪怕只动一小步，也比一直转更能带回掌控感。' },
          { title: '给你的安抚', body: `${profileName}今天不需要用很猛的方式证明自己。先慢下来、先照顾感受、先做一件能完成的小事，你会慢慢回到自己的节奏里。` },
        ],
      },
    },
  ];
}

function collectTodayShenShaNames(result) {
  const detailMap = result?.shenShaDetails || {};
  const buckets = [detailMap.year, detailMap.month, detailMap.day, detailMap.hour];
  return [...new Set(buckets.flatMap((item) => normalizeList(item)).filter(Boolean))];
}

function buildTodayTongshengData({ today, result, weekly, profile, calSummary }) {
  const shenShaNames = collectTodayShenShaNames(result);
  const luckyDirection = normalizeGuideText(today?.luckyDirection || result?.luckyDirection);
  const luckyColor = normalizeGuideText(today?.luckyColor || result?.luckyColor);
  const luckyNumber = normalizeGuideText(today?.luckyNumber || result?.luckyNumber);
  const luckyElements = normalizeGuideText(today?.luckyElements || result?.luckyElements);
  const yiText = normalizeGuideText(today?.yi);
  const jiText = normalizeGuideText(today?.ji);
  const profileName = profile?.nickname || '你';
  const peachSignals = shenShaNames.filter((item) => ['桃花', '红鸾', '天喜', '咸池'].some((keyword) => `${item}`.includes(keyword)));
  const todayLabel = normalizeGuideText(today?.label);
  const relationshipAdvice = firstValid(
    weekly?.relationship?.advice,
    result?.narrative?.emotionalHint,
    result?.useGodAnalysis?.strategy,
    '今天关系上最重要的不是猜，而是把分寸和真实需求讲清楚。'
  );
  const wealthAdvice = firstValid(
    weekly?.money?.advice,
    result?.luckAnalysis?.opportunityAreas,
    result?.useGodAnalysis?.strategy,
    yiText,
    '财路上先稳节奏、再谈加码，会比情绪上头时仓促拍板更顺。'
  );
  const decisionAdvice = firstValid(
    today?.advice,
    result?.dailyFortune?.advice,
    calSummary?.summary,
    '今天先把主线收住，再做关键决定。'
  );
  const travelAdvice = firstValid(
    weekly?.health?.advice,
    today?.goodHours,
    result?.jiShi,
    jiText,
    '今天出门宜预留缓冲，把最重要的一站放在自己状态最稳的时候。'
  );
  const boostAdvice = firstValid(
    result?.useGodAnalysis?.strategy,
    weekly?.work?.advice,
    `把 ${luckyColor || '更顺眼的配色'}、${luckyDirection || '更顺的方位'} 和 ${luckyElements || '更贴身的五行节奏'} 用在今天最重要的一件事上。`
  );
  const coreMode = (() => {
    const source = `${decisionAdvice} ${wealthAdvice} ${relationshipAdvice}`;
    if (/[主动|推进|出击|成交|回款|见回音]/.test(source)) return '主动出击';
    if (/[守|稳|收住|缓|节奏]/.test(source)) return '稳住主线';
    if (/[关系|桃花|人际|沟通]/.test(source)) return '先调气场';
    return '看清再动';
  })();
  const signalItems = [
    luckyDirection ? { key: 'direction', label: '利方', value: luckyDirection, icon: '◌' } : null,
    luckyColor ? { key: 'color', label: '利色', value: luckyColor, icon: '◐' } : null,
    luckyNumber ? { key: 'number', label: '利数', value: luckyNumber, icon: '✕' } : null,
    luckyElements ? { key: 'element', label: '五行', value: luckyElements, icon: '△' } : null,
  ].filter(Boolean);
  const sections = [
    {
      key: 'decision',
      title: '决策',
      kicker: '今日核心',
      glyph: 'decision',
      summary: decisionAdvice,
      accent: 'mint',
    },
    {
      key: 'travel',
      title: '出行',
      kicker: '行动动线',
      glyph: 'travel',
      summary: travelAdvice,
      accent: 'pearl',
    },
    {
      key: 'boost',
      title: '增运',
      kicker: '调频建议',
      glyph: 'boost',
      summary: `${boostAdvice}${luckyElements ? ` 今天更顺的五行落点偏向 ${luckyElements}。` : ''}`,
      accent: 'amber',
    },
    {
      key: 'wealth',
      title: '财气',
      kicker: '资源置换',
      glyph: 'wealth',
      summary: luckyDirection
        ? `今天的财气更适合往 ${luckyDirection} 这一侧求稳。${wealthAdvice}`
        : wealthAdvice,
      accent: 'gold',
    },
    {
      key: 'peach',
      title: '桃花',
      kicker: '关系感应',
      glyph: 'peach',
      summary: peachSignals.length
        ? `命盘里的 ${peachSignals.slice(0, 2).join('、')} 会放大今天的人际感应。${relationshipAdvice}`
        : relationshipAdvice,
      accent: 'rose',
    },
  ];

  return {
    title: '今日通胜',
    heroTitle: coreMode,
    subtitle: firstValid(
      today?.dateLabel,
      result?.lunarDateStr,
      '--'
    ),
    dateTag: todayLabel ? `今日势能 · ${todayLabel}` : '今日势能',
    heroLead: `${profileName}今天更适合先看总势，再决定往哪一条线加力。`,
    lead: `${profileName}今天的黄历节奏与命盘主线，更像是在提醒你：${decisionAdvice}`,
    signalItems,
    sections,
    detailContent: {
      lead: `${profileName}今天先看黄历时气，再把你的命盘主线叠上去，重点不是神神叨叨地“求准”，而是知道今天什么更顺、什么更容易卡。`,
      sections: [
        {
          title: '今日总诀',
          body: `${decisionAdvice}${todayLabel ? ` 当前日历节奏偏向“${todayLabel}”。` : ''}${yiText ? ` 宜：${yiText}。` : ''}${jiText ? ` 忌：${jiText}。` : ''}`,
        },
        {
          title: '决策与出行',
          body: `${decisionAdvice} ${travelAdvice}`,
        },
        {
          title: '财气与增运',
          body: `${luckyDirection ? `今天的财气方位更偏向 ${luckyDirection}。` : '今天更适合先求稳财，不宜乱追快财。'} ${wealthAdvice} ${boostAdvice}`,
        },
        {
          title: '桃花与人际',
          body: peachSignals.length
            ? `${peachSignals.slice(0, 3).join('、')} 这些桃花线索，会让你今天在人际里更容易被看见，但也更需要守住分寸。${relationshipAdvice}`
            : `今天的人际重点不在强求回应，而在把自己的边界、态度和需求放稳。${relationshipAdvice}`,
        },
      ],
    },
  };
}

function TodayTongshengCard({ data, onOpenDetail, onOpenGuides, onOpenCalendar }) {
  if (!data) return null;
  const featured = data.sections?.[0];
  const secondarySections = data.sections?.slice(1) || [];
  const heroAnim = useRef(new Animated.Value(0)).current;
  const featureAnim = useRef(new Animated.Value(0)).current;
  const gridAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    heroAnim.setValue(0);
    featureAnim.setValue(0);
    gridAnim.setValue(0);
    Animated.sequence([
      Animated.timing(heroAnim, {
        toValue: 1,
        duration: 360,
        useNativeDriver: true,
      }),
      Animated.timing(featureAnim, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.timing(gridAnim, {
        toValue: 1,
        duration: 360,
        useNativeDriver: true,
      }),
    ]).start();
  }, [data, featureAnim, gridAnim, heroAnim]);

  const heroMotionStyle = {
    opacity: heroAnim,
    transform: [
      {
        translateY: heroAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [22, 0],
        }),
      },
    ],
  };
  const featureMotionStyle = {
    opacity: featureAnim,
    transform: [
      {
        translateY: featureAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [20, 0],
        }),
      },
      {
        scale: featureAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.98, 1],
        }),
      },
    ],
  };
  const gridMotionStyle = {
    opacity: gridAnim,
    transform: [
      {
        translateY: gridAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [24, 0],
        }),
      },
    ],
  };
  return (
    <Card style={s.tongshengCard}>
      <View style={s.tongshengAura} />
      <View style={s.tongshengGlowLarge} />
      <View style={s.tongshengGlowSmall} />
      <Animated.View style={[s.tongshengHero, heroMotionStyle]}>
        <View style={s.tongshengHeroTop}>
          <View style={s.tongshengHeroCopy}>
            <Text style={s.tongshengHeroEyebrow}>{data.title}</Text>
            <Text style={s.tongshengHeroTitle}>{data.heroTitle}</Text>
            <Text style={s.tongshengHeroBody}>{data.heroLead}</Text>
          </View>
          <View style={s.tongshengDateBadge}>
            <Text style={s.tongshengDateBadgeLabel}>{data.dateTag}</Text>
            <Text style={s.tongshengDateBadgeValue}>{data.subtitle}</Text>
          </View>
        </View>
        {!!data.signalItems?.length ? (
          <View style={s.tongshengSignalRow}>
            {data.signalItems.map((item) => (
              <View key={item.key} style={s.tongshengSignalPill}>
                <Text style={s.tongshengSignalIcon}>{item.icon}</Text>
                <Text style={s.tongshengSignalText}>{`${item.label} · ${item.value}`}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </Animated.View>
      <Text style={s.tongshengLead}>{data.lead}</Text>
      {featured ? (
        <Animated.View style={[s.tongshengFeatureCard, featureMotionStyle]}>
          <View style={s.tongshengFeatureHeader}>
            <View>
              <Text style={s.tongshengFeatureEyebrow}>{featured.kicker}</Text>
              <Text style={s.tongshengFeatureTitle}>{featured.title}</Text>
            </View>
            <View style={[s.tongshengFeatureIconWrap, s.tongshengAccentMint]}>
              <TongshengGlyph variant={featured.glyph} accent={featured.accent} large />
            </View>
          </View>
          <Text style={s.tongshengFeatureBody}>{featured.summary}</Text>
        </Animated.View>
      ) : null}
      <Animated.View style={[s.tongshengGrid, gridMotionStyle]}>
        {secondarySections.map((item, index) => (
          <View
            key={item.key}
            style={[
              s.tongshengGridCard,
              index === secondarySections.length - 1 && secondarySections.length % 2 === 1
                ? s.tongshengGridCardWide
                : null,
            ]}
          >
            <View style={s.tongshengGridHead}>
              <View>
                <Text style={s.tongshengGridKicker}>{item.kicker}</Text>
                <Text style={s.tongshengGridTitle}>{item.title}</Text>
              </View>
              <View style={[s.tongshengGridIconWrap, getTongshengAccentStyle(item.accent)]}>
                <TongshengGlyph variant={item.glyph} accent={item.accent} />
              </View>
            </View>
            <Text style={s.tongshengGridBody}>{item.summary}</Text>
          </View>
        ))}
      </Animated.View>
      <View style={s.tongshengActionRow}>
        <TouchableOpacity style={s.tongshengPrimaryButton} activeOpacity={0.9} onPress={() => onOpenDetail?.({ type: 'custom', name: data.title, subtitle: '今日通胜 · 综合详解', content: data.detailContent })}>
          <Text style={s.tongshengPrimaryButtonText}>{'展开今日详解'}</Text>
        </TouchableOpacity>
        <View style={s.tongshengSecondaryActions}>
          <TouchableOpacity style={s.tongshengGhostButton} activeOpacity={0.9} onPress={onOpenGuides}>
            <Text style={s.tongshengGhostButtonText}>{'今日提醒'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.tongshengGhostButton} activeOpacity={0.9} onPress={onOpenCalendar}>
            <Text style={s.tongshengGhostButtonText}>{'查看日历'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );
}

function TongshengGlyph({ variant, accent, large = false }) {
  const toneStyle = getTongshengGlyphToneStyle(accent);
  return (
    <View style={[s.tongshengGlyph, large && s.tongshengGlyphLarge]}>
      <View style={[s.tongshengGlyphRing, toneStyle]} />
      {variant === 'decision' ? (
        <>
          <View style={[s.tongshengGlyphStroke, toneStyle, s.tongshengGlyphBalanceLeft]} />
          <View style={[s.tongshengGlyphStroke, toneStyle, s.tongshengGlyphBalanceRight]} />
          <View style={[s.tongshengGlyphCore, toneStyle, s.tongshengGlyphBalancePole]} />
        </>
      ) : null}
      {variant === 'travel' ? (
        <>
          <View style={[s.tongshengGlyphStroke, toneStyle, s.tongshengGlyphTrail]} />
          <View style={[s.tongshengGlyphCore, toneStyle, s.tongshengGlyphTrailDot]} />
        </>
      ) : null}
      {variant === 'boost' ? (
        <>
          <View style={[s.tongshengGlyphCore, toneStyle, s.tongshengGlyphSparkCenter]} />
          <View style={[s.tongshengGlyphStroke, toneStyle, s.tongshengGlyphSparkNorth]} />
          <View style={[s.tongshengGlyphStroke, toneStyle, s.tongshengGlyphSparkEast]} />
          <View style={[s.tongshengGlyphStroke, toneStyle, s.tongshengGlyphSparkSouth]} />
          <View style={[s.tongshengGlyphStroke, toneStyle, s.tongshengGlyphSparkWest]} />
        </>
      ) : null}
      {variant === 'wealth' ? (
        <>
          <View style={[s.tongshengGlyphStroke, toneStyle, s.tongshengGlyphWealthArc]} />
          <View style={[s.tongshengGlyphCore, toneStyle, s.tongshengGlyphWealthCore]} />
        </>
      ) : null}
      {variant === 'peach' ? (
        <>
          <View style={[s.tongshengGlyphPetal, toneStyle, s.tongshengGlyphPetalTop]} />
          <View style={[s.tongshengGlyphPetal, toneStyle, s.tongshengGlyphPetalRight]} />
          <View style={[s.tongshengGlyphPetal, toneStyle, s.tongshengGlyphPetalBottom]} />
          <View style={[s.tongshengGlyphPetal, toneStyle, s.tongshengGlyphPetalLeft]} />
          <View style={[s.tongshengGlyphCore, toneStyle, s.tongshengGlyphPetalCenter]} />
        </>
      ) : null}
    </View>
  );
}

function getTongshengAccentStyle(accent) {
  switch (accent) {
    case 'mint':
      return s.tongshengAccentMint;
    case 'amber':
      return s.tongshengAccentAmber;
    case 'gold':
      return s.tongshengAccentGold;
    case 'rose':
      return s.tongshengAccentRose;
    case 'pearl':
    default:
      return s.tongshengAccentPearl;
  }
}

function getTongshengGlyphToneStyle(accent) {
  switch (accent) {
    case 'mint':
      return s.tongshengGlyphToneMint;
    case 'amber':
      return s.tongshengGlyphToneAmber;
    case 'gold':
      return s.tongshengGlyphToneGold;
    case 'rose':
      return s.tongshengGlyphToneRose;
    case 'pearl':
    default:
      return s.tongshengGlyphTonePearl;
  }
}

function PageTopBackBar({ title, subtitle, canGoBack, onGoBack }) {
  return (
    <View style={s.pageTopBackBar}>
      <TouchableOpacity
        activeOpacity={canGoBack ? 0.86 : 1}
        disabled={!canGoBack}
        onPress={onGoBack}
        style={[s.pageTopBackButton, !canGoBack && s.pageTopBackButtonDisabled]}
      >
        <Text style={[s.pageTopBackButtonText, !canGoBack && s.pageTopBackButtonTextDisabled]}>
          {canGoBack ? '‹ 返回上一页' : '当前已在第一页'}
        </Text>
      </TouchableOpacity>
      <View style={s.pageTopBackCopy}>
        <Text style={s.pageTopBackTitle}>{title}</Text>
        {!!subtitle ? <Text style={s.pageTopBackSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

function buildTimingLabels(fortuneCalendar) {
  const cells = getCalendarCells(fortuneCalendar);
  const goodDays = cells.filter((item) => item.label === '适合推进').slice(0, 3);
  if (!goodDays.length) return ['本月上旬', '本月中旬', '本月下旬'];
  return goodDays.map((item) => item.dateLabel);
}

function getTenGodPreferenceData(result) {
  const preference = result?.tenGodPreference || {};
  const items = Array.isArray(preference?.items) ? preference.items : [];
  const favored = Array.isArray(preference?.favored) ? preference.favored.filter(Boolean) : [];
  const avoided = Array.isArray(preference?.avoided) ? preference.avoided.filter(Boolean) : [];
  const favoredItems = items.filter((item) => item?.preference === 'favored').sort((a, b) => (Number(b?.weight) || 0) - (Number(a?.weight) || 0));
  const avoidedItems = items.filter((item) => item?.preference === 'avoided').sort((a, b) => (Number(b?.weight) || 0) - (Number(a?.weight) || 0));
  return {
    summary: toText(preference?.summary),
    items,
    favored,
    avoided,
    favoredItems,
    avoidedItems,
  };
}

function collectVisibleTenGods(result) {
  const pillars = getResolvedPillars(result);
  const stemGods = [
    result?.pillarDetails?.year?.stemTenGod,
    result?.pillarDetails?.month?.stemTenGod,
    result?.pillarDetails?.hour?.stemTenGod,
  ];
  const all = [
    ...stemGods,
    ...pillars.flatMap((pillar) => [...(pillar?.hiddenTenGods || []), ...(pillar?.branchTenGods || [])]),
  ].filter(Boolean);
  const counts = all.reduce((map, item) => {
    map[item] = (map[item] || 0) + 1;
    return map;
  }, {});
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
}

function collectShenShaNames(result) {
  const groups = ['year', 'month', 'day', 'hour']
    .flatMap((key) => normalizeList(result?.shenShaDetails?.[key]));
  return [...new Set(groups)].filter(Boolean);
}

function buildStructuredLines(name) {
  const detail = getStructuredDetail(name);
  if (!detail) return [];
  const lines = [];
  if (detail.lead) lines.push(detail.lead);
  (detail.sections || []).forEach((section) => {
    if (section?.title && section?.body) lines.push(`${section.title}：${section.body}`);
  });
  return lines;
}

function summarizeTenGodDetails(names, fallback) {
  const picked = names.filter(Boolean).slice(0, 2);
  if (!picked.length) return fallback;
  return picked.map((name) => {
    const lines = buildStructuredLines(name);
    return `${name}：${lines[0] || TEN_GOD_TEXT[name] || fallback}`;
  }).join('\n');
}

function summarizeShenShaDetails(names, fallback) {
  const picked = names.filter(Boolean).slice(0, 3);
  if (!picked.length) return fallback;
  return picked.map((name) => {
    const lines = buildStructuredLines(name);
    return `${name}：${lines[0] || fallback}`;
  }).join('\n');
}

function summarizePreferenceReasons(items, fallback) {
  const picked = items.filter(Boolean).slice(0, 2);
  if (!picked.length) return fallback;
  return picked.map((item) => {
    const reasons = Array.isArray(item?.reasons) ? item.reasons.filter(Boolean) : [];
    return `${item?.god || '该项'}：${firstValid(reasons.join('；'), TEN_GOD_TEXT[item?.god], fallback)}`;
  }).join('\n');
}

  const STRUCTURE_PILLAR_LABELS = ['年', '月', '日', '时'];
const LOCAL_STEM_COMBINES = { 甲: '己', 己: '甲', 乙: '庚', 庚: '乙', 丙: '辛', 辛: '丙', 丁: '壬', 壬: '丁', 戊: '癸', 癸: '戊' };
const LOCAL_BRANCH_COMBINES = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' };
const LOCAL_BRANCH_CLASHES = { 子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅', 卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳' };
const LOCAL_BRANCH_HARMS = { 子: '未', 未: '子', 丑: '午', 午: '丑', 寅: '巳', 巳: '寅', 卯: '辰', 辰: '卯', 申: '亥', 亥: '申', 酉: '戌', 戌: '酉' };
const LOCAL_BRANCH_BREAKS = { 子: '酉', 酉: '子', 卯: '午', 午: '卯', 辰: '丑', 丑: '辰', 未: '戌', 戌: '未', 寅: '亥', 亥: '寅', 巳: '申', 申: '巳' };
const LOCAL_BRANCH_PUNISHMENTS = [['子', '卯'], ['寅', '巳'], ['寅', '申'], ['巳', '申'], ['丑', '未'], ['丑', '戌'], ['未', '戌'], ['辰', '辰'], ['午', '午'], ['酉', '酉'], ['亥', '亥']];

function buildLocalStructureCards(result) {
  const pillars = getResolvedPillars(result);
  const cards = [];
  const seen = new Set();
  const push = (item) => {
    const token = `${item.name}|${item.type}|${item.pillars}`;
    if (!seen.has(token)) {
      seen.add(token);
      cards.push(item);
    }
  };
  for (let i = 0; i < pillars.length; i += 1) {
    for (let j = i + 1; j < pillars.length; j += 1) {
      const left = pillars[i];
      const right = pillars[j];
      const leftLabel = STRUCTURE_PILLAR_LABELS[i];
      const rightLabel = STRUCTURE_PILLAR_LABELS[j];
      const pairLabel = `${leftLabel}-${rightLabel}`;
      if (LOCAL_STEM_COMBINES[left.gan] === right.gan) {
        push({ name: `${left.gan}${right.gan}合`, type: '天干五合', pillars: pairLabel, description: `${leftLabel}与${rightLabel}形成天干相合，代表这两处主题更容易出现牵引、撮合与资源整合。` });
      }
      if (LOCAL_BRANCH_COMBINES[left.zhi] === right.zhi) {
        push({ name: `${left.zhi}${right.zhi}合`, type: '地支六合', pillars: pairLabel, description: `${leftLabel}与${rightLabel}形成地支相合，表示相关主题之间更容易缓冲、联动与互相成就。` });
      }
      if (LOCAL_BRANCH_CLASHES[left.zhi] === right.zhi) {
        push({ name: `${left.zhi}${right.zhi}冲`, type: '地支六冲', pillars: pairLabel, description: `${leftLabel}与${rightLabel}形成地支相冲，表示相关主题之间更容易出现拉扯、变化与波动。` });
      }
      if (LOCAL_BRANCH_HARMS[left.zhi] === right.zhi) {
        push({ name: `${left.zhi}${right.zhi}害`, type: '地支相害', pillars: pairLabel, description: `${leftLabel}与${rightLabel}形成地支相害，表示相关主题之间更容易出现暗耗、误解与别扭感。` });
      }
      if (LOCAL_BRANCH_BREAKS[left.zhi] === right.zhi) {
        push({ name: `${left.zhi}${right.zhi}破`, type: '地支相破', pillars: pairLabel, description: `${leftLabel}与${rightLabel}形成地支相破，表示原有节奏与稳定结构更容易被打断。` });
      }
      if (LOCAL_BRANCH_PUNISHMENTS.some(([a, b]) => (a === left.zhi && b === right.zhi) || (a === right.zhi && b === left.zhi))) {
        push({ name: `${left.zhi}${right.zhi}刑`, type: '地支相刑', pillars: pairLabel, description: `${leftLabel}与${rightLabel}形成地支相刑，表示相关主题更容易卡住、拧巴、反复拉扯。` });
      }
    }
  }
  pillars.forEach((pillar, index) => {
    const count = pillars.filter((item) => item.zhi === pillar.zhi).length;
    if (['辰', '午', '酉', '亥'].includes(pillar.zhi) && count >= 2) {
      push({
        name: `${pillar.zhi}${pillar.zhi}自刑`,
        type: '地支自刑',
        pillars: pillars.map((item, itemIndex) => ({ item, label: STRUCTURE_PILLAR_LABELS[itemIndex] })).filter(({ item }) => item.zhi === pillar.zhi).map(({ label }) => label).join('-'),
        description: `${pillar.zhi}在命局中重复出现，容易把同类主题放大成反复纠结、内部紧绷与自我拉扯。`,
      });
    }
  });
  return cards;
}

function collectStructureObservationCards(result) {
  const source = Array.isArray(result?.specialCombinations) && result.specialCombinations.length
    ? result.specialCombinations
    : Array.isArray(result?.branchPairs)
      ? result.branchPairs.map((item) => ({
        name: `${toText(item?.pair)}${toText(item?.type)}`,
        type: toText(item?.type) === '合' ? '地支六合'
          : toText(item?.type) === '冲' ? '地支六冲'
          : toText(item?.type) === '刑' ? '地支相刑'
          : toText(item?.type) === '害' ? '地支相害'
          : toText(item?.type) === '破' ? '地支相破'
          : '地支关系',
        pillars: toText(item?.pillars),
        description: toText(item?.type) === '合'
          ? `${toText(item?.pillars)}之间出现相合，表示相关主题之间更容易形成牵引、缓冲与资源整合。`
          : toText(item?.type) === '冲'
            ? `${toText(item?.pillars)}之间出现相冲，表示相关主题之间更容易触发变化、波动与现实拉扯。`
            : toText(item?.type) === '刑'
              ? `${toText(item?.pillars)}之间出现相刑，表示相关主题更容易形成卡顿、僵持、内耗或反复拧巴。`
              : toText(item?.type) === '害'
                ? `${toText(item?.pillars)}之间出现相害，表示相关主题更容易出现隐性摩擦、误解与暗耗。`
                : `${toText(item?.pillars)}之间出现相破，表示相关主题原有的稳定结构更容易被打断，需要重整节奏。`,
      }))
      : buildLocalStructureCards(result);
  const unique = [];
  const seen = new Set();
  source.forEach((item) => {
    const name = toText(item?.name || item?.title);
    const type = toText(item?.type || item?.category);
    const pillars = toText(item?.pillars || item?.scope);
    const description = toText(item?.description || item?.reason || item?.summary);
    if (name === '--' || type === '--' || description === '--') return;
    const token = `${name}|${type}|${pillars}|${description}`;
    if (seen.has(token)) return;
    seen.add(token);
    unique.push({ name, type, pillars: pillars === '--' ? '' : pillars, description });
  });
  return unique;
}

function getStructureGroupKey(item) {
  const text = `${item?.type || ''}${item?.name || ''}`;
  if (text.includes('合')) return '合';
  if (text.includes('冲')) return '冲';
  if (text.includes('刑')) return '刑';
  if (text.includes('害')) return '害';
  if (text.includes('破')) return '破';
  return '其他';
}

function getStructureActionAdvice(item) {
  const group = getStructureGroupKey(item);
  const pillars = `${item?.pillars || ''}`;
  const involves = (keyword) => pillars.includes(keyword);
  const scopeHint = involves('日柱')
    ? '这条关系直接贴近自我状态、亲密关系或婚姻主题，'
    : involves('月柱')
      ? '这条关系更容易落在事业节奏、工作环境和现实压力上，'
      : involves('年柱')
        ? '这条关系更容易先从原生环境、家族互动或外在印象上体现，'
        : involves('时柱')
          ? '这条关系更容易落到行动结果、晚景安排或子女主题上，'
          : '这条关系更适合结合整张命盘一起看，';
  if (group === '合') {
    return `实际建议：${scopeHint}适合顺势整合资源、撮合关系，但不要因为“合”就默认一切自然会顺，边界和分工仍要先讲清楚。`;
  }
  if (group === '冲') {
    return `实际建议：${scopeHint}先把“变化”当成已知条件，重要决定别在最乱的时候拍板，先稳节奏、再看取舍。`;
  }
  if (group === '刑') {
    return `实际建议：${scopeHint}这类关系最怕硬顶，适合把卡点拆开、逐段处理，先松结构再谈推进。`;
  }
  if (group === '害') {
    return `实际建议：${scopeHint}多做确认、少靠猜测，尤其要防止小误会、小偏差长期累积成实质消耗。`;
  }
  if (group === '破') {
    return `实际建议：${scopeHint}先做补洞、收尾和修结构，等底盘稳了，再考虑扩张或加码。`;
  }
  return `实际建议：${scopeHint}先把它当成补充观察点，结合当前最在意的事业、关系或节奏问题一起判断。`;
}

function getStructurePriorityScore(item) {
  const group = getStructureGroupKey(item);
  const pillars = `${item?.pillars || ''}`;
  let score = 0;
  if (group === '冲') score += 50;
  if (group === '刑') score += 42;
  if (group === '害') score += 34;
  if (group === '破') score += 28;
  if (group === '合') score += 24;
  if (`${item?.type || ''}`.includes('天干五合')) score += 8;
  if (`${item?.type || ''}`.includes('自刑')) score += 10;
  if (pillars.includes('日柱')) score += 18;
  if (pillars.includes('月柱')) score += 12;
  if (pillars.includes('时柱')) score += 6;
  if (pillars.includes('年柱')) score += 4;
  return score;
}

function sortStructureItems(items) {
  return [...items].sort((a, b) => getStructurePriorityScore(b) - getStructurePriorityScore(a));
}

function buildStructureOverview(groups) {
  const counts = groups.reduce((acc, group) => {
    acc[group.key] = group.items.length;
    return acc;
  }, {});
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);
  const topGroup = [...groups].sort((a, b) => b.items.length - a.items.length)[0];
  const dominant = topGroup?.key || '';
  const summaryMap = {
    合: {
      title: '本盘以合象较显，整体更偏流通与牵引。',
      body: '结构上更容易出现资源整合、关系撮合和主题联动，做事时宜顺势借力，但仍要注意边界与节奏。',
    },
    冲: {
      title: '本盘冲象较显，结构带有明显波动性。',
      body: '很多主题不会完全按原计划展开，更容易在变化中推进，现实策略上适合留预案、留弹性。',
    },
    刑: {
      title: '本盘刑象偏重，内在拧巴感较强。',
      body: '比起外部直接碰撞，更要防内部卡顿、反复拉扯和长期内耗，处理问题宜拆解而不宜硬顶。',
    },
    害: {
      title: '本盘害象偏显，暗耗与误差值得重视。',
      body: '很多问题不一定正面爆发，但容易在误解、拖延、细小偏差里慢慢累积，现实中要多确认、多复盘。',
    },
    破: {
      title: '本盘带破，稳定结构更容易被打断。',
      body: '做事时更要重视修结构、补漏洞和收尾，先稳底盘再求扩张，效率会更高。',
    },
  };
  if (!total) {
    return {
      title: '本盘当前未见特别突出的干支结构关系。',
      body: '这不代表信息不足，而是盘里的变化没有集中落在同一个焦点上，更适合回到整体结构和当前阶段一起看。',
      chips: [],
    };
  }
  const summary = summaryMap[dominant] || {
    title: '本盘结构关系已形成可观察主轴。',
      body: '可以优先关注最靠近日、月位置的条目，它们通常更贴近现实体验和阶段性判断。',
  };
  const chips = [
    counts['合'] ? `合 ${counts['合']}` : null,
    counts['冲'] ? `冲 ${counts['冲']}` : null,
    counts['刑'] ? `刑 ${counts['刑']}` : null,
    counts['害'] ? `害 ${counts['害']}` : null,
    counts['破'] ? `破 ${counts['破']}` : null,
  ].filter(Boolean);
  return { ...summary, chips };
}

const STRUCTURE_GROUPS = [
  {
    key: '合',
    title: '合',
    body: '更偏资源整合、关系牵引与结构缓冲。',
    conclusion: '合多则流通增强。',
    modern: '放到现实里，常见为更容易撮合资源、有人帮你接上关系，事情之间也更容易形成联动。',
  },
  {
    key: '冲',
    title: '冲',
    body: '更偏变化触发、拉扯感与阶段波动。',
    conclusion: '冲多则波动增强。',
    modern: '现实里常表现为计划容易被打断、节奏起伏更大，外部变化会更快推着你做调整。',
  },
  {
    key: '刑',
    title: '刑',
    body: '更偏内耗、僵持、卡顿与反复拉扯。',
    conclusion: '刑多则内耗感增强。',
    modern: '放到生活里，常是事情卡着不顺、关系别着不松，容易出现“明明在动，却总像被什么拽住”。',
  },
  {
    key: '害',
    title: '害',
    body: '更偏隐性摩擦、误解和说不清的消耗。',
    conclusion: '害多则暗耗与误判增加。',
    modern: '现实里更像小误会、小别扭、小损耗累积起来，不一定是正面冲突，但会慢慢拖状态。',
  },
  {
    key: '破',
    title: '破',
    body: '更偏节奏被打断、原有稳定被拆开。',
    conclusion: '破多则稳定性被拆松。',
    modern: '放到现实里，常见为原本以为稳的安排突然松动，需要补洞、收尾或重新搭结构。',
  },
  {
    key: '其他',
    title: '其他',
    body: '补充显示未归入以上五类的结构提示。',
    conclusion: '其他条目更适合作为补充观察。',
    modern: '这类内容通常不是主轴冲突，但能帮助你补全命盘里一些特殊结构的背景信息。',
  },
];

const MEMBER_CONTENT_GROUPS = [
  {
    key: 'fortune',
    title: '运势类',
    body: '先看当下节奏、关键提醒和时间窗口。',
    summary: '适合先解决“我最近整体顺不顺、这个月重点看什么、哪些时间点该抓住”这类问题。',
  },
  {
    key: 'career',
    title: '事业财富类',
    body: '围绕工作方向、财富积累和现实路径展开。',
    summary: '适合解决“我的工作该怎么发力、赚钱方式更偏哪种、事业和财富怎么走得更稳”这类问题。',
  },
  {
    key: 'relationship',
    title: '关系类',
    body: '聚焦感情表达、人际互动和亲密关系。',
    summary: '适合解决“我在关系里怎么表达、容易卡在哪里、怎样沟通更容易被接住”这类问题。',
  },
  {
    key: 'decision',
    title: '决策类',
    body: '帮助你判断什么时候推进、什么时候放缓。',
    summary: '适合解决“这件事现在该不该做、什么时候适合推进、哪些时点最好先稳住”这类问题。',
  },
  {
    key: 'planning',
    title: '长期规划类',
    body: '更适合看年度主线、大运流年和长期行动安排。',
    summary: '适合解决“这一年主线是什么、长期趋势怎么走、我接下来该怎么布局”这类问题。',
  },
];

function buildMemberContentEntries(result, profile, calSummary, fortuneCalendar, weeklyActions) {
  const weekly = getResolvedWeeklyActions(weeklyActions);
  const cells = getCalendarCells(fortuneCalendar);
  const bestDays = cells.filter((item) => item.label === '适合推进').slice(0, 3);
  const riskDays = cells.filter((item) => item.label === '宜放缓').slice(0, 3);
  const timingLabels = buildTimingLabels(fortuneCalendar);
  const useGod = result?.useGodAnalysis || {};
  const luck = result?.luckAnalysis || {};
  const narrative = result?.narrative || {};
  const actionHints = Array.isArray(narrative?.actionHints) ? narrative.actionHints : [];
  const opportunityAreas = Array.isArray(luck?.opportunityAreas) ? luck.opportunityAreas : [];
  const riskAreas = Array.isArray(luck?.riskAreas) ? luck.riskAreas : [];
  const secondaryUseGods = Array.isArray(useGod?.secondaryUseGod) ? useGod.secondaryUseGod : [];
  const avoidGods = Array.isArray(useGod?.avoidGods) ? useGod.avoidGods : [];
  const cautionGods = Array.isArray(useGod?.cautionGods) ? useGod.cautionGods : [];
  const tenGodPreference = getTenGodPreferenceData(result);
  const visibleTenGods = collectVisibleTenGods(result);
  const shenShaNames = collectShenShaNames(result);
  const leadTenGods = [...tenGodPreference.favored, ...visibleTenGods].filter((item, index, list) => item && list.indexOf(item) === index);
  const challengeTenGods = [...tenGodPreference.avoided, ...avoidGods, ...cautionGods].filter((item, index, list) => item && list.indexOf(item) === index);
  const relationFocus = firstValid(profile?.focus, weekly.relationship?.advice, narrative?.emotionalHint);
  const currentDaYunLabel = getCurrentDaYunLabel(result);
  const daYunList = Array.isArray(result?.daYun) ? result.daYun : [];
  const currentDaYun = daYunList.find((item) => toText(item?.ganZhi || `${item?.gan || ''}${item?.zhi || ''}`) === currentDaYunLabel) || daYunList[0] || null;
  const nextDaYunIndex = currentDaYun ? daYunList.indexOf(currentDaYun) + 1 : -1;
  const nextDaYun = nextDaYunIndex > 0 ? daYunList[nextDaYunIndex] : null;

  return [
    {
      key: 'monthly-overview',
      group: 'fortune',
      title: '本月整体运势总览',
      summary: firstValid(calSummary?.summary, narrative?.stageSummary, result?.dailyFortune?.advice),
      details: [
        { title: '本月基调', body: firstValid(calSummary?.summary, narrative?.stageSummary) },
        { title: '当前阶段', body: firstValid(luck?.dayunTheme, result?.liuNianPillar?.ganZhi, luck?.liunianTheme) },
        { title: '行动主线', body: firstValid(useGod?.strategy, actionHints[0], '先稳住节奏，再做关键判断。') },
      ],
    },
    {
      key: 'career-opportunity',
      group: 'career',
      title: '本月事业机会提醒',
      summary: firstValid(weekly.work?.advice, opportunityAreas[0], actionHints[0]),
      details: [
        { title: '机会方向', body: firstValid(opportunityAreas.join('、'), luck?.dayunTheme, '本月更适合围绕主线发力。') },
        { title: '推进建议', body: firstValid(weekly.work?.advice, actionHints[0]) },
        { title: '适合出手的时间点', body: bestDays.length ? bestDays.map((item) => `${item.dateLabel}：${toText(item.advice)}`).join('\n') : '当前可结合阶段页里的行动日历挑选高分日推进。 ' },
      ],
    },
    {
      key: 'money-volatility',
      group: 'career',
      title: '本月财运波动提醒',
      summary: firstValid(weekly.money?.advice, riskAreas[0], useGod?.strategy),
      details: [
        { title: '财务节奏', body: firstValid(weekly.money?.advice, '先看清支出与回报，再决定是否扩大投入。') },
        { title: '波动来源', body: firstValid(riskAreas.join('、'), cautionGods.join('、'), avoidGods.join('、'), '本月更怕节奏失控，而不是没有机会。') },
        { title: '守财提示', body: firstValid(actionHints[1], useGod?.strategy, '先稳住现金流和边界，再谈更大的扩张。') },
      ],
    },
    {
      key: 'relationship-reminder',
      group: 'relationship',
      title: '本月感情关系提醒',
      summary: firstValid(weekly.relationship?.advice, narrative?.emotionalHint, profile?.focus),
      details: [
        { title: '关系主题', body: firstValid(weekly.relationship?.advice, '先把真实感受说清楚，比情绪积压更重要。') },
        { title: '高频误区', body: firstValid(narrative?.emotionalHint, riskAreas[0], '关系里更怕误读和过度防御。') },
        { title: '沟通建议', body: firstValid(actionHints[2], '先表达需求，再讨论对错。') },
      ],
    },
    {
      key: 'health-emotion',
      group: 'fortune',
      title: '本月健康与情绪提醒',
      summary: firstValid(weekly.health?.advice, weekly.emotion?.advice, narrative?.emotionalHint),
      details: [
        { title: '身体节奏', body: firstValid(weekly.health?.advice, '先把作息和恢复节奏稳住。') },
        { title: '情绪提醒', body: firstValid(weekly.emotion?.advice, narrative?.emotionalHint) },
        { title: '本月优先级', body: firstValid(actionHints[3], '先减少内耗，再谈高强度推进。') },
      ],
    },
    {
      key: 'best-actions',
      group: 'decision',
      title: '本月最适合推进的事情',
      summary: bestDays.length ? `${bestDays[0].dateLabel} 起势较顺，适合推进关键事项。` : firstValid(actionHints[0], weekly.work?.cue),
      details: [
        { title: '优先事项', body: firstValid(actionHints.join('；'), weekly.work?.advice, '本月更适合把最重要的一件事先做出来。') },
        { title: '高分时段', body: bestDays.length ? bestDays.map((item) => `${item.dateLabel}：${toText(item.yi)}`).join('\n') : '可优先参考行动日历里的“适合推进”日期。' },
        { title: '推进方式', body: firstValid(useGod?.strategy, '先聚焦，再推进。') },
      ],
    },
    {
      key: 'avoid-risks',
      group: 'decision',
      title: '本月最需要避开的风险',
      summary: riskDays.length ? `${riskDays[0].dateLabel} 前后宜放缓，别在情绪顶点做决定。` : firstValid(riskAreas[0], weekly.emotion?.advice),
      details: [
        { title: '主要风险', body: firstValid(riskAreas.join('、'), avoidGods.join('、'), cautionGods.join('、'), '本月最怕节奏乱、判断急和边界松。') },
        { title: '容易踩坑的时段', body: riskDays.length ? riskDays.map((item) => `${item.dateLabel}：${toText(item.ji)}`).join('\n') : '可优先规避行动日历中的“宜放缓”日期。' },
        { title: '应对方式', body: firstValid(weekly.emotion?.advice, actionHints[4], '先停一下，再决定是否继续往前冲。') },
      ],
    },
    {
      key: 'three-month-trend',
      group: 'planning',
      title: '未来 3 个月趋势简报',
      summary: firstValid(luck?.dayunTheme, narrative?.stageSummary, calSummary?.summary),
      details: [
        { title: '阶段方向', body: firstValid(luck?.dayunTheme, narrative?.stageSummary) },
        { title: '今年流年提示', body: firstValid(luck?.liunianTheme, result?.liuNianPillar?.ganZhi) },
        { title: '接下来 3 个月怎么走', body: firstValid(useGod?.strategy, '先按自己的主线稳步推进，再根据节奏做取舍。') },
      ],
    },
    {
      key: 'three-timings',
      group: 'fortune',
      title: '今年最关键的 3 个时间点',
      summary: `${timingLabels[0]}、${timingLabels[1]}、${timingLabels[2]} 值得优先关注。`,
      details: [
        { title: timingLabels[0], body: bestDays[0] ? firstValid(bestDays[0].advice, bestDays[0].yi) : '适合先开局、先发起。' },
        { title: timingLabels[1], body: bestDays[1] ? firstValid(bestDays[1].advice, bestDays[1].yi) : '适合定方向、做确认。' },
        { title: timingLabels[2], body: bestDays[2] ? firstValid(bestDays[2].advice, bestDays[2].yi) : '适合做收束、做决定。' },
      ],
    },
    {
      key: 'use-god-guide',
      group: 'planning',
      title: '当前主用神与现实落点',
      summary: firstValid(`当前更适合顺着“${useGod?.primaryUseGod || '--'}”这条主线去调整自己。`, useGod?.strategy),
      details: [
        { title: '主用神', body: firstValid(useGod?.primaryUseGod, '—') },
        { title: '辅助方向', body: firstValid(secondaryUseGods.join('、'), '先把主用神这条主线走稳就够了。') },
        { title: '现实落点', body: firstValid(useGod?.strategy, `在工作、作息、环境和节奏上，多做与“${useGod?.primaryUseGod || '当前主线'}”一致的选择。`) },
        { title: '需要避开', body: firstValid(avoidGods.join('、'), cautionGods.join('、'), '这一阶段要少做与主线相冲的消耗型选择。') },
      ],
    },
    {
      key: 'ten-god-drive',
      group: 'planning',
      title: '十神驱动力与行为重心',
      summary: firstValid(tenGodPreference.summary, `${leadTenGods[0] || '当前主轴'}这股力量更容易成为你的行为重心。`),
      details: [
        { title: '核心驱动', body: firstValid(tenGodPreference.summary, '这张命盘更适合顺着核心优势发力，而不是被动应付。') },
        { title: '最显眼的十神', body: summarizeTenGodDetails(leadTenGods, '命盘里最常见的力量，会决定你最自然的做事方式。') },
        { title: '需要平衡的部分', body: summarizeTenGodDetails(challengeTenGods, '优势越明显，越要留意失衡后的副作用。') },
      ],
    },
    {
      key: 'ten-god-career-style',
      group: 'career',
      title: '十神在职场中的表现方式',
      summary: firstValid(opportunityAreas[0], `${leadTenGods[0] || '当前优势'}更容易在工作场景里被看见。`),
      details: [
        { title: '你的职场打法', body: summarizeTenGodDetails(leadTenGods, '你在工作中最容易靠自然优势出成绩。') },
        { title: '更适合的工作场景', body: firstValid(opportunityAreas.join('、'), useGod?.strategy, '更适合去能承接你主轴能力的环境，而不是被动补短板。') },
        { title: '职场提醒', body: firstValid(summarizeTenGodDetails(challengeTenGods, ''), riskAreas.join('、'), '越在高压场景里，越要注意节奏、边界和沟通方式。') },
      ],
    },
    {
      key: 'ten-god-relationship-pattern',
      group: 'relationship',
      title: '十神在人际关系中的高频模式',
      summary: firstValid(narrative?.emotionalHint, relationFocus),
      details: [
        { title: '关系里的自然反应', body: summarizeTenGodDetails(leadTenGods, '你在人际里会优先用最熟悉的方式保护自己和推进关系。') },
        { title: '高频互动模式', body: firstValid(narrative?.emotionalHint, weekly.relationship?.advice, '关系中最重要的是让对方听见你的真实需求。') },
        { title: '关系修正建议', body: firstValid(summarizeTenGodDetails(challengeTenGods, ''), actionHints[2], '先表达需要，再讨论立场，会更容易被接住。') },
      ],
    },
    {
      key: 'shen-sha-modern-read',
      group: 'planning',
      title: '补充线索的现实场景解读',
      summary: shenShaNames.length ? `当前更值得先看的补充线索有：${shenShaNames.slice(0, 3).join('、')}` : '会优先把命盘里出现的补充线索翻成现实场景。',
      details: [
        { title: '重点线索', body: summarizeShenShaDetails(shenShaNames, '这些信息更适合当成场景提醒，而不是单独下结论。') },
        { title: '现实里怎么看', body: '它更有用的地方，不是制造神秘感，而是帮助你更快看懂某类关系、节奏和风险是怎么出现的。' },
        { title: '阅读方式', body: '优先看它是不是和你的当前主线同向；同向时更容易放大优势，反向时更像提醒你哪里容易失衡。' },
      ],
    },
    {
      key: 'career-path',
      group: 'career',
      title: '事业发展路径建议',
      summary: firstValid(luck?.dayunTheme, weekly.work?.advice, '事业路径更适合顺势累积，而不是频繁换挡。'),
      details: [
        { title: '当前阶段主线', body: firstValid(luck?.dayunTheme, luck?.liunianTheme, calSummary?.summary) },
        { title: '更适合的发展方向', body: firstValid(opportunityAreas.join('、'), useGod?.strategy, '先做能稳定承接优势的方向，再逐步拉高难度。') },
        { title: '路径建议', body: firstValid(weekly.work?.advice, actionHints[0], '你更适合先把一条主线做深，再让结果带出新的机会。') },
      ],
    },
    {
      key: 'wealth-pattern',
      group: 'career',
      title: '财富积累模式分析',
      summary: firstValid(weekly.money?.advice, `你的财富主题更像“${leadTenGods.find((item) => item?.includes('财')) || '先稳住节奏，再做取舍'}”。`),
      details: [
        { title: '当前财务模式', body: firstValid(weekly.money?.advice, useGod?.strategy, '先把收入、支出和留存拆开看，积累效率会更高。') },
        { title: '更适合的积累方式', body: firstValid(opportunityAreas.filter((item) => /财|资源|经营|积累|项目/.test(item)).join('、'), '更适合做可复用、可累积、能持续放大的事情。') },
        { title: '风险点', body: firstValid(riskAreas.join('、'), summarizeTenGodDetails(challengeTenGods, ''), '财富上最怕节奏失控、判断过急和边界松动。') },
      ],
    },
    {
      key: 'love-expression',
      group: 'relationship',
      title: '感情表达方式分析',
      summary: firstValid(narrative?.emotionalHint, weekly.relationship?.advice, '关系里最重要的不是猜，而是表达。'),
      details: [
        { title: '你怎么表达在意', body: summarizeTenGodDetails(leadTenGods, '你表达感情的方式，往往就是你最顺手的做事方式。') },
        { title: '关系里的真实需求', body: firstValid(relationFocus, '比起表面互动，你更需要节奏、理解和能接得住你的回应。') },
        { title: '更有效的表达方式', body: firstValid(actionHints[2], weekly.relationship?.advice, '先说需求和感受，再谈结论，关系会更顺。') },
      ],
    },
    {
      key: 'intimacy-conflict',
      group: 'relationship',
      title: '亲密关系冲突点分析',
      summary: firstValid(riskAreas[0], narrative?.emotionalHint, '亲密关系里最怕误读、顶牛和长期不说。'),
      details: [
        { title: '最容易起冲突的点', body: firstValid(narrative?.emotionalHint, summarizeTenGodDetails(challengeTenGods, ''), '很多冲突不是因为没感情，而是节奏和表达方式没对齐。') },
        { title: '冲突放大的原因', body: firstValid(riskAreas.join('、'), '当压力、边界和情绪叠在一起时，小问题也容易变大。') },
        { title: '修复建议', body: firstValid(weekly.relationship?.advice, weekly.emotion?.advice, '先降情绪，再说事实和需要，关系才有空间修复。') },
      ],
    },
    {
      key: 'dayun-liunian-analysis',
      group: 'planning',
      title: '阶段节奏变化解析',
      summary: firstValid(luck?.dayunTheme, luck?.liunianTheme, `${currentDaYunLabel} 这段阶段变化值得重点关注。`),
      details: [
        { title: '当前阶段', body: firstValid(`${currentDaYunLabel}：${toText(currentDaYun?.startAge)}-${toText(currentDaYun?.endAge)} 岁`, currentDaYunLabel, '当前正处在一段需要顺势调整的阶段。') },
        { title: '年度主题', body: firstValid(luck?.liunianTheme, result?.liuNianPillar?.ganZhi, '这一年的重点在于把阶段机会和现实动作接上。') },
        { title: '变化怎么看', body: firstValid(luck?.dayunTheme, useGod?.strategy, '长期主线决定你这几年怎么走，年度变化决定今年怎么落地，两个方向一致时更适合主动推进。') },
        { title: '下一步节奏', body: firstValid(nextDaYun ? `${toText(nextDaYun?.ganZhi || `${nextDaYun?.gan || ''}${nextDaYun?.zhi || ''}`)} 会成为下一段重点，可提前做准备。` : '', actionHints[0], '这阶段更适合先顺着主线积累，再等窗口期放大结果。') },
      ],
    },
    {
      key: 'partner-fit',
      group: 'relationship',
      title: '合作伙伴适配分析',
      summary: firstValid(opportunityAreas[0], `${leadTenGods[0] || '当前优势'}更适合和能补位的人合作。`),
      details: [
        { title: '你适合什么搭档', body: firstValid(summarizeTenGodDetails(leadTenGods, ''), '你更适合和能承接你优势、又不会反复消耗你节奏的人配合。') },
        { title: '合作里最需要的补位', body: firstValid(summarizePreferenceReasons(tenGodPreference.avoidedItems, ''), summarizeTenGodDetails(challengeTenGods, ''), '搭档最好能补上你不想长期承担、或容易失衡的那部分。') },
        { title: '理想合作模式', body: firstValid(weekly.work?.advice, useGod?.strategy, '最好的合作不是谁都做，而是边界清楚、角色清楚、节奏一致。') },
        { title: '合作避坑', body: firstValid(riskAreas.join('、'), '一旦边界模糊、职责重叠、节奏不一致，合作成本会很快上升。') },
      ],
    },
    {
      key: 'decision-support',
      group: 'decision',
      title: '跳槽 / 创业 / 合作决策辅助',
      summary: firstValid(bestDays[0] ? `${bestDays[0].dateLabel} 前后更适合做关键判断。` : '', useGod?.strategy, '关键决策更适合顺着当前主线，而不是被情绪推着走。'),
      details: [
        { title: '适合主动出手时', body: bestDays.length ? bestDays.map((item) => `${item.dateLabel}：${firstValid(item.advice, item.yi)}`).join('\n') : firstValid(opportunityAreas.join('、'), '当机会方向和你的主线一致时，更适合主动推进。') },
        { title: '先不要急着定的时候', body: riskDays.length ? riskDays.map((item) => `${item.dateLabel}：${firstValid(item.advice, item.ji)}`).join('\n') : firstValid(riskAreas.join('、'), '当信息不全、边界不清、情绪上头时，先不要急着拍板。') },
        { title: '判断框架', body: firstValid(useGod?.strategy, '先看这件事是不是顺主线，再看资源能不能接住，最后看节奏是不是当前能承受。') },
        { title: '一句建议', body: firstValid(actionHints[0], weekly.work?.advice, '适合你的决定，不一定是最热闹的，而是最能长期接住你的。') },
      ],
    },
    {
      key: 'annual-theme-report',
      group: 'planning',
      title: '年度重点主题报告',
      summary: firstValid(luck?.liunianTheme, calSummary?.summary, '这一年的重点，不只是发生什么，更是你该把力气放在哪里。'),
      details: [
        { title: '年度主线', body: firstValid(luck?.liunianTheme, luck?.dayunTheme, '今年更适合围绕一条核心主线持续推进。') },
        { title: '今年最值得投入的方向', body: firstValid(opportunityAreas.join('、'), useGod?.strategy, '把有限的精力投在最能形成结果积累的地方，回报会更高。') },
        { title: '今年最需要防的主题', body: firstValid(riskAreas.join('、'), avoidGods.join('、'), '这一年更怕方向散、节奏乱、情绪带着决策跑。') },
        { title: '年度提醒', body: firstValid(actionHints.join('；'), '把阶段主线守住，比同时追很多事情更重要。') },
      ],
    },
    {
      key: 'key-date-reminders',
      group: 'decision',
      title: '关键日期提醒功能',
      summary: bestDays.length ? `本月可优先关注 ${bestDays.slice(0, 2).map((item) => item.dateLabel).join('、')} 这些时间点。` : '会优先把适合推进和适合放缓的时间点标出来。',
      details: [
        { title: '适合推进的日期', body: bestDays.length ? bestDays.map((item) => `${item.dateLabel}：${firstValid(item.advice, item.yi)}`).join('\n') : '当前可优先参考阶段页行动日历中的高分日期。' },
        { title: '适合放缓的日期', body: riskDays.length ? riskDays.map((item) => `${item.dateLabel}：${firstValid(item.advice, item.ji)}`).join('\n') : '当前可优先规避阶段页行动日历中的“宜放缓”日期。' },
        { title: '怎么用这些提醒', body: '重要沟通、签约、推进、复盘可以优先放在顺势日期；情绪大、信息不全、风险高的决定尽量避开低分时段。' },
        { title: '长期回看方式', body: '这类提醒最适合配合每月运势一起看，不是一次看完，而是作为月内安排和决策的参考。' },
      ],
    },
    {
      key: 'annual-action-plan',
      group: 'planning',
      title: '专属年度行动建议书',
      summary: firstValid(useGod?.strategy, weekly.work?.advice, '把年度建议拆成现实动作，才更容易真的用起来。'),
      details: [
        { title: '今年该坚持什么', body: firstValid(useGod?.strategy, actionHints[0], '把最顺手、最能累积结果的主线守住，今年就更容易稳。') },
        { title: '今年该减少什么', body: firstValid(avoidGods.join('、'), riskAreas.join('、'), '减少会打散节奏、放大内耗、让你偏离主线的选择。') },
        { title: '行动节奏建议', body: firstValid(weekly.work?.advice, weekly.health?.advice, '先稳住节奏，再放大动作，长期比短期爆发更重要。') },
        { title: '给自己的年度提醒', body: firstValid(narrative?.coreSummary, narrative?.stageSummary, '每次要做决定时，回到“这件事是不是在服务我的主线”这个问题上。') },
      ],
    },
  ];
}

function Card({ children, style }) {
  return <View style={[s.card, style]}>{children}</View>;
}

function SectionHeader({ eyebrow, title, body, right }) {
  return (
    <View style={s.sectionHeader}>
      <View style={{ flex: 1 }}>
        {eyebrow ? <Text style={s.eyebrow}>{eyebrow}</Text> : null}
        <Text style={s.title}>{title}</Text>
        {body ? <Text style={s.body}>{body}</Text> : null}
      </View>
      {right}
    </View>
  );
}

function Sheet({ visible, onClose, title, subtitle, children, closeLabel = '返回' }) {
  const swipeResponder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const verticalClose = gestureState.dy > 14 && Math.abs(gestureState.dx) < 26;
        const edgeBack = gestureState.x0 <= 28 && gestureState.dx > 16 && Math.abs(gestureState.dy) < 20;
        return verticalClose || edgeBack;
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        const verticalClose = gestureState.dy > 14 && Math.abs(gestureState.dx) < 26;
        const edgeBack = gestureState.x0 <= 28 && gestureState.dx > 16 && Math.abs(gestureState.dy) < 20;
        return verticalClose || edgeBack;
      },
      onPanResponderRelease: (_, gestureState) => {
        const verticalClose = gestureState.dy > 56 && Math.abs(gestureState.dx) < 34;
        const edgeBack = gestureState.x0 <= 36 && gestureState.dx > 44 && Math.abs(gestureState.dy) < 28;
        if (verticalClose || edgeBack) {
          onClose?.();
        }
      },
    }),
    [onClose]
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.sheetMask}>
        <TouchableOpacity style={s.sheetScrim} activeOpacity={1} onPress={onClose} />
        <View style={s.sheetCard} {...swipeResponder.panHandlers}>
          <View style={s.sheetHandle} />
          <View style={s.sheetHeader}>
            <TouchableOpacity onPress={onClose} style={s.sheetBackButton}>
              <Text style={s.sheetBackText}>{`‹ ${closeLabel}`}</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.sheetTitle}>{title}</Text>
              {subtitle ? <Text style={s.sheetSubtitle}>{subtitle}</Text> : null}
            </View>
            <TouchableOpacity onPress={onClose} style={s.sheetCloseButton}><Text style={s.sheetClose}>{S.close}</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.sheetContent}>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function AICompanionModal({
  visible,
  onClose,
  result,
  profile,
  chatHistory,
  chatInput,
  onChangeInput,
  onSend,
  chatLoading,
  isPremium,
  aiRemaining,
  aiAllowed,
  onOpenPaywall,
  voiceLoading,
  voiceRecording,
  onVoiceInput,
}) {
  const scrollRef = useRef(null);
  const chatInputRef = useRef(null);
  const inputHeightRef = useRef(44);
  const [inputHeight, setInputHeight] = useState(44);
  const [installState, setInstallState] = useState({ standalone: false, platform: 'native', safari: false, displayMode: 'browser', canPrompt: false });
  const [installReminderVisible, setInstallReminderVisible] = useState(false);
  const [installSheetVisible, setInstallSheetVisible] = useState(false);
  const [installReminderSeen, setInstallReminderSeen] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd?.({ animated: true });
      chatInputRef.current?.focus?.();
    }, 180);
    return () => clearTimeout(timer);
  }, [visible, chatHistory.length, chatLoading]);

  useEffect(() => {
    if (!`${chatInput || ''}`.trim()) {
      inputHeightRef.current = 44;
      setInputHeight((current) => (current === 44 ? current : 44));
    }
  }, [chatInput]);

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    const cleanup = listenToPwaInstallability({
      onUpdate: (nextState) => setInstallState(nextState),
    });
    setInstallState({
      standalone: isStandalonePwa(),
      platform: detectPwaPlatform(),
      safari: isSafariBrowser(),
      displayMode: getPwaDisplayMode(),
      canPrompt: false,
    });
    return cleanup;
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    try {
      setInstallReminderSeen(window.localStorage.getItem(AI_INSTALL_REMINDER_SEEN_KEY) === '1');
    } catch {}
  }, []);

  useEffect(() => {
    if (!visible || Platform.OS !== 'web') return;
    const hasAssistantReply = chatHistory.some((item) => item.role === 'assistant');
    const installableMobile = !installState.standalone && (installState.platform === 'ios' || installState.platform === 'android');
    if (hasAssistantReply && installableMobile && !installReminderSeen) {
      setInstallReminderVisible(true);
    }
  }, [chatHistory, installReminderSeen, installState.platform, installState.standalone, visible]);

  const markInstallReminderSeen = () => {
    setInstallReminderSeen(true);
    setInstallReminderVisible(false);
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.localStorage.setItem(AI_INSTALL_REMINDER_SEEN_KEY, '1');
      }
    } catch {}
  };

  const handleInstallPress = async () => {
    if (installState.platform === 'android' && installState.canPrompt) {
      const installed = await promptPwaInstall();
      if (installed) {
        markInstallReminderSeen();
        setInstallSheetVisible(false);
        return;
      }
    }
    setInstallSheetVisible(true);
  };

  const quickPromptPool = [
    '我最近情绪很低落，怎么办？',
    '我面临一个重要选择，需要建议',
    '帮我分析一下我的性格特点',
    '我在关系中总是受伤，为什么？',
    '你觉得我最近真正卡住的点是什么？',
    '结合我的命盘，这个月我最该注意什么？',
  ];
  const randomQuickPrompt = useMemo(() => {
    const seed = [
      profile?.nickname || '',
      result?.dayGan || '',
      result?.solarBirthInfo?.year || result?.birthInfo?.year || '',
      new Date().toISOString().slice(0, 10),
    ].join('|');
    const hash = `${seed}`.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return quickPromptPool[hash % quickPromptPool.length] || quickPromptPool[0];
  }, [profile?.nickname, result?.dayGan, result?.solarBirthInfo?.year, result?.birthInfo?.year]);
  const quickPromptCategories = useMemo(
    () => ([
      { key: 'emotion', label: '情绪 / 关系', prompt: '我在关系里总是容易受伤，真正卡住的点是什么？' },
      { key: 'career', label: '事业 / 决策', prompt: '我现在有个重要选择，应该先稳住还是主动推进？' },
    ]),
    []
  );
  const getQuickPromptActionLabel = (prompt) => {
    if (/(关系|受伤|伴侣|沟通)/.test(prompt)) return '说说这对你现在意味着什么';
    if (/(情绪|低落|累|焦虑|压力)/.test(prompt)) return '想继续听我解释';
    if (/(选择|决定|工作|方向)/.test(prompt)) return '结合你这张人生说明书再展开';
    if (/(性格|特点|日主|五行|十神)/.test(prompt)) return '想继续听我怎么理解';
    if (/(命盘|这个月|注意什么)/.test(prompt)) return '从当前运势切进去看';
    return '点开继续聊下去';
  };

  const focusChatComposer = useCallback(() => {
    scrollRef.current?.scrollToEnd?.({ animated: false });
    setTimeout(() => {
      chatInputRef.current?.focus?.();
      scrollRef.current?.scrollToEnd?.({ animated: true });
    }, 80);
    setTimeout(() => {
      chatInputRef.current?.focus?.();
      scrollRef.current?.scrollToEnd?.({ animated: true });
    }, 260);
  }, []);
  const hasConversation = chatHistory.length > 0 || chatLoading;

  const renderPromptChooser = () => (
    <View style={s.aiInlinePromptCard}>
      <View style={s.aiInlinePromptTop}>
        <View style={s.aiInlinePromptDot} />
        <Text style={s.aiInlinePromptLabel}>{'可从这两类开始'}</Text>
      </View>
      <View style={s.aiInlinePromptCategoryRow}>
        {quickPromptCategories.map((item) => (
          <TouchableOpacity
            key={item.key}
            onPress={() => {
              onChangeInput?.(item.prompt);
              focusChatComposer();
            }}
            activeOpacity={0.92}
            style={s.aiInlinePromptCategory}
          >
            <Text style={s.aiInlinePromptCategoryLabel}>{item.label}</Text>
            <Text style={s.aiInlinePromptCategoryText}>{item.prompt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderComposer = (extraStyle = null) => (
    <View style={[s.aiComposerPanel, extraStyle]}>
      <View style={s.aiComposerTopline}>
        <View style={s.aiComposerToplineDot} />
        <Text style={s.aiComposerToplineText}>{voiceRecording ? '先生正在听你说话' : '想到什么，就直接对先生说'}</Text>
      </View>
      <View style={s.aiInputDock}>
        <TouchableOpacity
          onPress={onVoiceInput}
          disabled={voiceLoading || chatLoading}
          style={[s.aiVoiceButton, (voiceLoading || chatLoading) && s.aiVoiceButtonDisabled, voiceRecording && s.aiVoiceButtonActive]}
        >
          {voiceLoading ? (
            <ActivityIndicator size="small" color={voiceRecording ? '#163238' : C.logoDeep} />
          ) : (
            <Text style={[s.aiVoiceText, voiceRecording && s.aiVoiceTextActive]}>{voiceRecording ? '■' : '◉'}</Text>
          )}
        </TouchableOpacity>
        <View style={s.aiInputWrap}>
          <TextInput
            ref={chatInputRef}
            autoFocus={visible}
            value={chatInput}
            onChangeText={onChangeInput}
            onFocus={() => {
              setTimeout(() => {
                scrollRef.current?.scrollToEnd?.({ animated: true });
              }, 150);
            }}
            onContentSizeChange={(event) => {
              const nextHeight = Math.max(44, Math.min(112, Math.ceil((event?.nativeEvent?.contentSize?.height || 34) + 4)));
              if (Math.abs(nextHeight - inputHeightRef.current) < 2) return;
              inputHeightRef.current = nextHeight;
              setInputHeight((current) => {
                if (Math.abs(nextHeight - current) < 2) return current;
                return nextHeight;
              });
              if (Platform.OS !== 'web') {
                setTimeout(() => {
                  scrollRef.current?.scrollToEnd?.({ animated: true });
                }, 60);
              }
            }}
            placeholder={'给明己AI先生发消息…'}
            placeholderTextColor={'rgba(60,60,67,0.46)'}
            multiline
            scrollEnabled
            maxLength={500}
            editable={!chatLoading}
            style={[s.aiInput, { height: inputHeight, minHeight: 44, maxHeight: 112 }]}
          />
        </View>
        <TouchableOpacity
          onPress={() => onSend?.()}
          disabled={!chatInput.trim() || chatLoading}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={[
            s.aiSendButton,
            chatInput.trim() && !chatLoading ? s.aiSendButtonActive : s.aiSendButtonDisabled,
          ]}
        >
          <Text style={s.aiSendText}>{'↑'}</Text>
        </TouchableOpacity>
      </View>
      {chatInput.trim() ? (
        <TouchableOpacity
          onPress={() => onSend?.()}
          disabled={chatLoading}
          activeOpacity={0.9}
          style={[s.aiSendCta, chatLoading && s.aiSendCtaDisabled]}
        >
          <Text style={s.aiSendCtaText}>{chatLoading ? '正在发送…' : '发送给明己AI先生'}</Text>
        </TouchableOpacity>
      ) : null}
      <Text style={s.aiInputHint}>{voiceRecording ? '正在录音，再点一次即可转成文字。' : '可直接输入，也可点左侧语音按钮把语音转成文字。'}</Text>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} onShow={focusChatComposer}>
      <KeyboardAvoidingView
        style={s.aiPageRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 14 : 0}
      >
        <View style={s.aiHeader}>
          <View style={s.aiHeaderAura} />
          <View style={s.aiHeaderOrbit} />
          <TouchableOpacity onPress={onClose} style={s.aiBackButton}>
            <Text style={s.aiBackText}>{'‹ 返回'}</Text>
          </TouchableOpacity>
          <View style={s.aiHeaderCenter}>
                  <Text style={s.aiHeaderTitle}>{'明己AI先生'}</Text>
            <Text style={s.aiHeaderSub}>{'明己者明 / 知时者智 / 行动者胜'}</Text>
          </View>
          <View style={s.aiHeaderMetaPill}>
            <Text style={s.aiHeaderMeta}>{isPremium ? '无限制' : `剩余 ${aiRemaining} 次`}</Text>
          </View>
        </View>

        {hasConversation ? (
          <View style={s.aiConversationShell}>
            <ScrollView
              ref={scrollRef}
              style={s.aiScroll}
              contentContainerStyle={s.aiScrollContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              onContentSizeChange={() => {
                scrollRef.current?.scrollToEnd?.({ animated: true });
              }}
            >
              {chatHistory.map((msg, index) => (
                <View key={`${msg.role}-${index}`} style={[s.aiBubbleRow, msg.role === 'user' ? s.aiBubbleRowUser : s.aiBubbleRowAssistant]}>
                  {msg.role === 'assistant' ? (
                    <View style={s.aiBubbleAvatar}>
                      <Text style={s.aiBubbleAvatarText}>{'明'}</Text>
                    </View>
                  ) : null}
                  <View style={[s.aiBubbleCard, msg.role === 'user' ? s.aiBubbleCardUser : s.aiBubbleCardAssistant]}>
                      <Text style={[s.aiBubbleText, msg.role === 'user' && s.aiBubbleTextUser]}>{normalizeChatMessageContent(msg.content)}</Text>
                    </View>
                  </View>
                ))}

              {chatLoading ? (
                <View style={s.aiBubbleRow}>
                  <View style={s.aiBubbleAvatar}>
                    <Text style={s.aiBubbleAvatarText}>{'明'}</Text>
                  </View>
                  <View style={s.aiTypingCard}>
                    <Text style={s.aiTypingText}>{'···'}</Text>
                  </View>
                </View>
              ) : null}
            </ScrollView>

            <View style={s.aiBottomDock}>
              {!aiAllowed && !isPremium ? (
                <View style={s.aiQuotaCard}>
                  <View style={s.aiQuotaBadge}>
                    <Text style={s.aiQuotaBadgeText}>{'会员'}</Text>
                  </View>
                  <View style={s.aiQuotaContent}>
                    <Text style={s.aiQuotaTitle}>{'今日 3 次免费 AI 已用完'}</Text>
                      <Text style={s.aiQuotaBody}>{'开通会员后，可继续使用明己AI先生与智能工具。'}</Text>
                  </View>
                  <TouchableOpacity style={s.aiQuotaButton} onPress={onOpenPaywall}>
                    <Text style={s.aiQuotaButtonText}>{'开通会员'}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              {installReminderVisible ? (
                <View style={s.aiInstallReminderCard}>
                  <View style={s.aiInstallReminderCopy}>
                    <Text style={s.aiInstallReminderTitle}>把 MingMe 放到桌面</Text>
                    <Text style={s.aiInstallReminderBody}>
                      {installState.platform === 'ios'
                        ? '请把当前链接用手机浏览器打开，再按步骤添加到桌面，下次会更容易直接接上。'
                        : '请把当前链接用手机浏览器打开，浏览器更容易直接弹出安装到桌面的提示。'}
                    </Text>
                  </View>
                  <View style={s.aiInstallReminderActions}>
                    <TouchableOpacity style={s.aiInstallReminderGhost} onPress={markInstallReminderSeen} activeOpacity={0.9}>
                      <Text style={s.aiInstallReminderGhostText}>稍后</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.aiInstallReminderButton} onPress={handleInstallPress} activeOpacity={0.9}>
                      <Text style={s.aiInstallReminderButtonText}>
                        {installState.platform === 'android' && installState.canPrompt ? '立即安装' : '添加到桌面'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}
              {renderComposer()}
            </View>
          </View>
        ) : (
          <View style={s.aiStartShell}>
            {renderPromptChooser()}
            {renderComposer(s.aiComposerPanelStatic)}
          </View>
        )}
      </KeyboardAvoidingView>
      <Sheet
        visible={installSheetVisible}
        onClose={() => setInstallSheetVisible(false)}
        title={installState.platform === 'android' ? '安装 MingMe' : '添加到主屏幕'}
        subtitle={installState.platform === 'android' ? '装到桌面后，回来继续会更顺。' : '按这三步完成桌面安装'}
        closeLabel="返回"
      >
        <View style={s.installSheetHero}>
          <Text style={s.installSheetHeroTitle}>
            {installState.platform === 'android' ? '把 MingMe 装到桌面' : '把 MingMe 放到桌面'}
          </Text>
          <Text style={s.installSheetHeroBody}>
            {installState.platform === 'android'
              ? '装好以后，下次不用再找浏览器入口，直接点桌面图标就能接着聊。'
              : '添加到主屏幕后，会像 App 一样独立打开，也更容易接上刚才那件事。'}
          </Text>
        </View>
        {installState.platform === 'android' ? (
          <View style={s.installStepList}>
            <View style={s.installStepCard}>
              <Text style={s.installStepIndex}>1</Text>
              <Text style={s.installStepText}>
                {installState.canPrompt ? '点下面的“立即安装”，如果浏览器弹出安装框，直接确认。' : '点浏览器右上角菜单。'}
              </Text>
            </View>
            <View style={s.installStepCard}>
              <Text style={s.installStepIndex}>2</Text>
              <Text style={s.installStepText}>
                {installState.canPrompt ? '如果没有弹安装框，再到浏览器菜单里找“安装应用”或“添加到主屏幕”。' : '选择“安装应用”“添加到主屏幕”或“安装 MingMe”。'}
              </Text>
            </View>
            <View style={s.installStepCard}>
              <Text style={s.installStepIndex}>3</Text>
              <Text style={s.installStepText}>回到桌面，从 MingMe 图标打开，就能像 App 一样继续聊天。</Text>
            </View>
          </View>
        ) : (
          <View style={s.installStepList}>
            <View style={s.installStepCard}>
              <Text style={s.installStepIndex}>1</Text>
              <Text style={s.installStepText}>{installState.safari ? '先保持当前页面在手机浏览器里打开。' : '先复制当前链接，并用手机浏览器打开。'}</Text>
            </View>
            <View style={s.installStepCard}>
              <Text style={s.installStepIndex}>2</Text>
              <Text style={s.installStepText}>{installState.safari ? '点击底部“分享”，在面板里找到“添加到主屏幕”。' : '在浏览器里点“分享”或菜单，找到“添加到主屏幕”。'}</Text>
            </View>
            <View style={s.installStepCard}>
              <Text style={s.installStepIndex}>3</Text>
              <Text style={s.installStepText}>回到桌面，从 MingMe 图标进入，以后就能像 App 一样独立打开。</Text>
            </View>
          </View>
        )}
        <View style={s.installSheetActions}>
          {installState.platform === 'android' && installState.canPrompt ? (
            <TouchableOpacity
              style={s.installSheetPrimaryButton}
              onPress={async () => {
                const installed = await promptPwaInstall();
                if (installed) {
                  setInstallSheetVisible(false);
                  markInstallReminderSeen();
                }
              }}
              activeOpacity={0.9}
            >
              <Text style={s.installSheetPrimaryButtonText}>立即安装</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={s.installSheetGhostButton}
            onPress={() => {
              setInstallSheetVisible(false);
              markInstallReminderSeen();
            }}
            activeOpacity={0.9}
          >
            <Text style={s.installSheetGhostButtonText}>我知道了</Text>
          </TouchableOpacity>
        </View>
      </Sheet>
    </Modal>
  );
}

export function GeneratingV2Screen({ statusText = '\u6b63\u5728\u751f\u6210\u4f60\u7684\u4e13\u5c5e\u6863\u6848...' }) {
  return (
    <View style={s.loadingRoot}>
      <View style={s.loadingCard}>
        <View style={s.loadingAura} />
        <View style={s.loadingOrbitOuter} />
        <View style={s.loadingOrbitMid} />
        <View style={s.loadingOrbitArc} />
        <View style={s.loadingCoreWrap}>
          <View style={s.loadingCoreDot} />
          <View style={s.loadingCoreStar} />
        </View>
        <ActivityIndicator size="small" color={C.logoMist} style={s.loadingSpinner} />
        <Text style={s.loadingTitle}>\u660e\u5df1 V2</Text>
        <Text style={s.loadingText}>{statusText}</Text>
      </View>
    </View>
  );
}

function WeeklyActionCard({ itemKey, value, expanded, onToggle }) {
  const meta = WEEKLY_META[itemKey];
  const item = value || DEFAULT_WEEKLY_ACTIONS[itemKey];
  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onToggle} style={[s.weeklyCard, expanded && s.weeklyCardExpanded]}>
      <View style={s.weeklyHeadRow}>
        <View style={s.weeklyHeadMain}>
          <View style={[s.weeklyDot, { backgroundColor: meta.tone }]} />
          <View style={s.weeklyHeadTextWrap}>
            <Text style={s.weeklyTitle}>{item?.title || meta.label}</Text>
            <Text style={s.weeklyCue}>{item?.cue || DEFAULT_WEEKLY_ACTIONS[itemKey].cue}</Text>
          </View>
        </View>
        <View style={[s.weeklyChevronWrap, expanded && { borderColor: `${meta.tone}55`, backgroundColor: `${meta.tone}16` }]}>
          <Text style={[s.weeklyChevron, expanded && { color: meta.tone }]}>{expanded ? '−' : '+'}</Text>
        </View>
      </View>
      {expanded ? (
        <View style={s.weeklyBodyWrap}>
          <Text style={s.weeklyAdvice}>{item?.advice || DEFAULT_WEEKLY_ACTIONS[itemKey].advice}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function SmartToolsHub({ isPremium, aiRemaining, hasRegisteredProfile, onOpenTool, onRequireProfile }) {
  return (
    <Card style={s.toolsCard}>
      <View style={s.toolsCardAura} />
      <SectionHeader
        eyebrow={'智能工具'}
        title={'成长工具箱'}
        body={hasRegisteredProfile ? (isPremium ? '会员可无限使用 AI 工具。' : `当前剩余 ${aiRemaining} 次 AI 使用机会。`) : '需要先完整填写姓名、出生日期、时分、性别与出生地，系统生成个人画像后才能开启智能工具。'}
      />
      <View style={s.toolLauncherGrid}>
        {Object.entries(SMART_TOOL_META).map(([key, meta]) => (
          <TouchableOpacity
            key={key}
            activeOpacity={0.9}
            onPress={() => (hasRegisteredProfile ? onOpenTool?.(key) : onRequireProfile?.())}
            style={[s.toolLauncherCard, !hasRegisteredProfile && s.toolLauncherCardLocked]}
          >
            <View style={s.toolLauncherTop}>
              <View style={[s.toolLauncherIcon, { backgroundColor: `${meta.accent}18`, borderColor: `${meta.accent}55` }]}>
                <Text style={[s.toolLauncherIconText, { color: meta.accent }]}>{meta.icon}</Text>
              </View>
              <View style={[s.toolLauncherCtaPill, { backgroundColor: hasRegisteredProfile ? `${meta.accent}14` : 'rgba(228,211,157,0.16)', borderColor: hasRegisteredProfile ? `${meta.accent}32` : 'rgba(198,146,42,0.22)' }]}>
                <Text style={[s.toolLauncherCtaText, { color: hasRegisteredProfile ? meta.accent : C.gold }]}>{hasRegisteredProfile ? '进入' : '先建资料'}</Text>
                <Text style={[s.toolLauncherCtaArrow, { color: hasRegisteredProfile ? meta.accent : C.gold }]}>{'›'}</Text>
              </View>
            </View>
            <Text style={s.toolLauncherTitle}>{meta.label}</Text>
            <Text style={s.toolLauncherHint}>{hasRegisteredProfile ? meta.hint : '先把基础资料填写完整再使用'}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Card>
  );
}

function SmartToolPage(props) {
  const {
    toolKey,
    onBack,
    result,
    profile,
    accountProfile,
    accountResult,
    weeklyActions,
    oneLineSummary,
    followUpQuestions,
    followUpAnswers,
    onFollowUpAnswerChange,
    onGenerateCompanion,
    companionLoading,
    isPremium,
    aiAllowed,
    aiRemaining,
    onRefreshAIQuota,
    hasRegisteredProfile,
    onRequireProfile,
    onOpenPaywall,
  } = props;
  const [toolLoading, setToolLoading] = useState(false);
  const [selectedMood, setSelectedMood] = useState(MOOD_OPTIONS[0].key);
  const [emotionNote, setEmotionNote] = useState('');
  const [emotionInsight, setEmotionInsight] = useState('');
  const [decisionDraft, setDecisionDraft] = useState({ situation: '', options: '', nextStep: '' });
  const [decisionInsight, setDecisionInsight] = useState('');
  const [divinationDraft, setDivinationDraft] = useState({ sceneType: 'wealth', question: '' });
  const [divinationInsight, setDivinationInsight] = useState(null);
  const [divinationLoadingReady, setDivinationLoadingReady] = useState(false);
  const [showDivinationRitualModal, setShowDivinationRitualModal] = useState(false);
  const [dreamDraft, setDreamDraft] = useState('');
  const [dreamInsight, setDreamInsight] = useState('');
  const [growthInsight, setGrowthInsight] = useState('');
  const [reflectionInsight, setReflectionInsight] = useState('');
  const [expandedWeeklyKey, setExpandedWeeklyKey] = useState('work');
  const [toolFeedback, setToolFeedback] = useState({ tone: 'idle', text: '' });
  const divinationVideoRef = useRef(null);
  const toolScrollRef = useRef(null);
  const divinationReadyOpacity = useRef(new Animated.Value(0)).current;
  const divinationHeroOpacity = useRef(new Animated.Value(0)).current;
  const divinationHeroTranslate = useRef(new Animated.Value(10)).current;
  const divinationBodyOpacity = useRef(new Animated.Value(0)).current;
  const divinationBodyTranslate = useRef(new Animated.Value(14)).current;
  const toolFeedbackScale = useRef(new Animated.Value(1)).current;
  const toolFeedbackOpacity = useRef(new Animated.Value(0)).current;
  const [divinationBodyY, setDivinationBodyY] = useState(0);
  const [divinationFormalY, setDivinationFormalY] = useState(0);
  const [dreamComposerY, setDreamComposerY] = useState(0);
  const [dreamResultY, setDreamResultY] = useState(0);
  const [divinationVideoLoaded, setDivinationVideoLoaded] = useState(false);
  const normalizedDivinationInsight = useMemo(
    () => normalizeDivinationInsightPayload(divinationInsight, divinationDraft.sceneType),
    [divinationInsight, divinationDraft.sceneType]
  );
  const answered = Object.values(followUpAnswers || {}).filter((item) => `${item || ''}`.trim()).length;
  const totalQuestions = (followUpQuestions || []).length || 3;
  const activeMood = MOOD_OPTIONS.find((item) => item.key === selectedMood) || MOOD_OPTIONS[0];
  const weekly = getResolvedWeeklyActions(weeklyActions);
  const meta = SMART_TOOL_META[toolKey] || SMART_TOOL_META.emotion;
  const toolIdentityChart = accountResult || result;
  const toolIdentityProfile = accountProfile || profile;
  const stableToolUserKey = useMemo(() => buildStableUserKey(toolIdentityChart, toolIdentityProfile, {}), [toolIdentityChart, toolIdentityProfile]);
  const currentDivinationCooldownUntil = useMemo(() => getDivinationCooldownUntil(divinationInsight), [divinationInsight]);
  const feedbackToneColor = toolFeedback.tone === 'success' ? C.success : toolFeedback.tone === 'loading' ? meta.accent : toolFeedback.tone === 'warning' ? C.warn : C.soft;
  const feedbackIsWarning = toolFeedback.tone === 'warning';
  const divinationWarningText = toolKey === 'divination' && feedbackIsWarning ? `${toolFeedback.text || ''}`.trim() : '';
  const showDivinationWarningCard = !!divinationWarningText;
  const divinationWarningNeedsPaywall = /注册会员|开通会员|解锁更多功能/.test(divinationWarningText);

  useEffect(() => {
    setToolFeedback({ tone: 'idle', text: '' });
    setDivinationLoadingReady(false);
    setDivinationVideoLoaded(false);
    setShowDivinationRitualModal(toolKey === 'divination');
    divinationReadyOpacity.setValue(0);
  }, [toolKey]);

  useEffect(() => {
    divinationHeroOpacity.setValue(0);
    divinationHeroTranslate.setValue(10);
    divinationBodyOpacity.setValue(0);
    divinationBodyTranslate.setValue(14);

    if (!normalizedDivinationInsight?.engineResult) return;

    Animated.sequence([
      Animated.parallel([
        Animated.timing(divinationHeroOpacity, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.timing(divinationHeroTranslate, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(120),
      Animated.parallel([
        Animated.timing(divinationBodyOpacity, {
          toValue: 1,
          duration: 360,
          useNativeDriver: true,
        }),
        Animated.timing(divinationBodyTranslate, {
          toValue: 0,
          duration: 360,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [normalizedDivinationInsight, divinationBodyOpacity, divinationBodyTranslate, divinationHeroOpacity, divinationHeroTranslate]);

  useEffect(() => {
    if (toolKey !== 'dream' || !dreamInsight) return;
    requestAnimationFrame(() => {
      const targetY = Math.max(0, Number(dreamResultY || 0) - 18);
      toolScrollRef.current?.scrollTo?.({ y: targetY, animated: true });
    });
  }, [toolKey, dreamInsight, dreamResultY]);

  useEffect(() => {
    if (!toolFeedback.text) {
      toolFeedbackOpacity.setValue(0);
      toolFeedbackScale.setValue(1);
      return;
    }

    toolFeedbackOpacity.setValue(0);
    toolFeedbackScale.setValue(toolFeedback.tone === 'warning' ? 0.9 : 0.98);

    if (toolFeedback.tone === 'warning') {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(toolFeedbackOpacity, {
            toValue: 1,
            duration: 180,
            useNativeDriver: true,
          }),
          Animated.spring(toolFeedbackScale, {
            toValue: 1.06,
            friction: 6,
            tension: 120,
            useNativeDriver: true,
          }),
        ]),
        Animated.spring(toolFeedbackScale, {
          toValue: 1,
          friction: 7,
          tension: 120,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(toolFeedbackOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(toolFeedbackScale, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [toolFeedback, toolFeedbackOpacity, toolFeedbackScale]);

  const jumpToDivinationFormal = useCallback(() => {
    const targetY = Math.max(0, Number(divinationBodyY || 0) + Number(divinationFormalY || 0) - 18);
    toolScrollRef.current?.scrollTo?.({ y: targetY, animated: true });
  }, [divinationBodyY, divinationFormalY]);

  const focusDreamComposer = useCallback(() => {
    const targetY = Math.max(0, Number(dreamComposerY || 0) - 18);
    requestAnimationFrame(() => {
      toolScrollRef.current?.scrollTo?.({ y: targetY, animated: true });
    });
  }, [dreamComposerY]);

  const handleDivinationVideoFinished = useCallback(async () => {
    setDivinationLoadingReady(true);
    Animated.timing(divinationReadyOpacity, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start();
    if (Platform.OS === 'web') {
      try {
        const node = divinationVideoRef.current;
        if (node && typeof node.pause === 'function') {
          const duration = Number(node.duration || 0);
          if (duration > 0) node.currentTime = Math.max(0, duration - 0.08);
          node.pause();
        }
      } catch {}
      return;
    }
    try {
      const status = await divinationVideoRef.current?.getStatusAsync?.();
      const freezeAt = Math.max(0, Number(status?.durationMillis || 0) - 80);
      await divinationVideoRef.current?.setPositionAsync?.(freezeAt);
      await divinationVideoRef.current?.pauseAsync?.();
    } catch {}
  }, [divinationReadyOpacity]);

  const handleDivinationSubmit = useCallback(async () => {
    if (toolLoading) return;
    setShowDivinationRitualModal(false);
    const question = `${divinationDraft.question || ''}`.trim();
    if (!question) {
      setToolFeedback({ tone: 'warning', text: '先写下你现在真正想问的这件事，再让明己起卦。' });
      return;
    }

    if (currentDivinationCooldownUntil) {
      const cooldownAt = Date.parse(currentDivinationCooldownUntil);
      if (Number.isFinite(cooldownAt) && cooldownAt > Date.now()) {
        setToolFeedback({ tone: 'warning', text: '卦不轻起，请贰个时辰后再起' });
        return;
      }
    }

    setDivinationLoadingReady(false);
    divinationReadyOpacity.setValue(0);
    setDivinationInsight(null);
    setToolFeedback({ tone: 'loading', text: '起卦中，明己正在按当下时点断这件事…' });
    setToolLoading(true);

    try {
      const payload = await aiMingJiDivination(
        question,
        divinationDraft.sceneType,
        result,
        { isPremium, memberTier: isPremium ? 'premium' : 'free', profile: toolIdentityProfile, userKey: stableToolUserKey }
      );
      if (payload) {
        setDivinationInsight(payload);
        setToolFeedback({ tone: 'success', text: '卦象已成，明己已经把这一断落下来了。' });
      } else {
        setToolFeedback({ tone: 'warning', text: '这次起卦没有成功，请稍后再试。' });
      }
    } catch (error) {
      if (error?.code === 'DIVINATION_COOLDOWN' || error?.code === 'DIVINATION_DAILY_LIMIT') {
        setToolFeedback({ tone: 'warning', text: error?.message || '这次起卦需要稍后再试。' });
      } else {
        setToolFeedback({ tone: 'warning', text: error?.message || '这次起卦没有成功，请稍后再试。' });
      }
    } finally {
      setToolLoading(false);
    }
  }, [
    divinationDraft.question,
    divinationDraft.sceneType,
    divinationReadyOpacity,
    isPremium,
      profile,
      result,
      currentDivinationCooldownUntil,
      toolIdentityProfile,
      stableToolUserKey,
      toolLoading,
    ]);

  const swipeResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      const fromLeftEdge = gestureState.x0 <= 28 && gestureState.dx > 14;
      const fromRightEdge = gestureState.x0 >= PAGE_WIDTH - 28 && gestureState.dx < -14;
      return (fromLeftEdge || fromRightEdge) && Math.abs(gestureState.dy) < 18;
    },
    onMoveShouldSetPanResponderCapture: (_, gestureState) => {
      const fromLeftEdge = gestureState.x0 <= 28 && gestureState.dx > 14;
      const fromRightEdge = gestureState.x0 >= PAGE_WIDTH - 28 && gestureState.dx < -14;
      return (fromLeftEdge || fromRightEdge) && Math.abs(gestureState.dy) < 18;
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.x0 <= 36 && gestureState.dx > 38 && Math.abs(gestureState.dy) < 26) {
        onBack?.();
      }
      if (gestureState.x0 >= PAGE_WIDTH - 36 && gestureState.dx < -38 && Math.abs(gestureState.dy) < 26) {
        onBack?.();
      }
    },
  }), [onBack]);

    const runAITool = async (runner, options = {}) => {
      const {
        bypassQuota = false,
        loadingText = '正在生成更贴合你的内容…',
        successText = '已生成新的智能反馈，可继续调整内容再试一次。',
        exhaustedText = '今日免费次数已用完，可开通会员继续使用 AI。',
      } = options;
      const quotaArgs = { isPremium, memberTier: isPremium ? 'premium' : 'free', chart: toolIdentityChart, profile: toolIdentityProfile, userKey: stableToolUserKey };
      if (!bypassQuota) {
        try {
          const allowed = await canUseAI(quotaArgs);
          if (!allowed) {
            setToolFeedback({ tone: 'warning', text: exhaustedText });
            await onRefreshAIQuota?.();
            return null;
          }
        } catch (error) {
          console.warn('AI quota precheck warning:', error?.message || error);
        }
      }
    setToolFeedback({ tone: 'loading', text: loadingText });
    setToolLoading(true);
    try {
      if (!bypassQuota) {
        await incrementUsage(quotaArgs);
      }
      const output = await runner();
      await onRefreshAIQuota?.();
      setToolFeedback({ tone: 'success', text: successText });
      return output;
    } catch (error) {
      try {
        await onRefreshAIQuota?.();
      } catch {}
      if (!bypassQuota && error?.code === 'AI_QUOTA_EXCEEDED') {
        setToolFeedback({ tone: 'warning', text: exhaustedText });
        return null;
      }
      if (error?.code === 'DIVINATION_COOLDOWN' || error?.code === 'DIVINATION_DAILY_LIMIT') {
        setToolFeedback({ tone: 'warning', text: error?.message || '这次起卦需要稍后再试。' });
        return null;
      }
      const fallbackMessage = toolKey === 'divination'
        ? (error?.message || '这次起卦没有成功，请稍后再试。')
        : '这次生成没有成功，请检查网络后再试。';
      setToolFeedback({ tone: 'warning', text: fallbackMessage });
      return `暂时无法生成内容：${error?.message || '请稍后再试。'}`;
    } finally {
      setToolLoading(false);
    }
  };

  const renderToolActionButton = (label, onPress, loadingLabel, options = {}) => {
    const quotaLocked = !options.ignoreQuotaLock && !isPremium && !aiAllowed;
    return (
    <>
      <TouchableOpacity
        style={[s.primaryButton, s.toolActionButton, (quotaLocked || toolLoading) && { opacity: 0.6 }]}
        onPress={onPress}
        activeOpacity={0.92}
      >
        <View style={s.toolActionButtonInner}>
          {toolLoading ? <ActivityIndicator size="small" color="#FFF" style={s.toolActionSpinner} /> : null}
          <Text style={s.primaryButtonText}>{toolLoading ? loadingLabel : label}</Text>
        </View>
      </TouchableOpacity>
        {!!toolFeedback.text && !(toolKey === 'divination' && feedbackIsWarning) ? (
          <Animated.View
            style={[
              s.toolFeedbackBar,
              feedbackIsWarning && s.toolFeedbackBarWarning,
              {
                borderColor: `${feedbackToneColor}30`,
                backgroundColor: `${feedbackToneColor}12`,
                opacity: toolFeedbackOpacity,
                transform: [{ scale: toolFeedbackScale }],
              },
            ]}
          >
            <View style={[s.toolFeedbackDot, { backgroundColor: feedbackToneColor }]} />
            <Text style={[s.toolFeedbackText, feedbackIsWarning && s.toolFeedbackTextWarning, { color: feedbackToneColor }]}>{toolFeedback.text}</Text>
          </Animated.View>
        ) : null}
        {quotaLocked ? (
          <TouchableOpacity style={s.toolQuotaButton} onPress={onOpenPaywall}>
            <Text style={s.toolQuotaButtonText}>{'开通会员继续使用 AI'}</Text>
          </TouchableOpacity>
        ) : null}
      </>
    );
  };

  if (!hasRegisteredProfile && toolKey !== 'bridge') {
    return (
      <View style={s.toolPageRoot} {...swipeResponder.panHandlers}>
        <View style={[s.toolPageTopBar, { paddingTop: Platform.OS === 'ios' ? 42 : 22 }]}>
          <TouchableOpacity onPress={onBack} style={s.toolBackButton}>
            <Text style={s.toolBackButtonText}>‹ 返回智能工具</Text>
          </TouchableOpacity>
          <Text style={s.toolTopTitle}>{meta.label}</Text>
          <View style={s.toolTopSpacer} />
        </View>
        <ScrollView contentContainerStyle={s.pageContent} showsVerticalScrollIndicator={false}>
          <Card style={s.toolPageHero}>
            <View style={[s.toolHeroAura, { backgroundColor: `${meta.accent}16` }]} />
            <View style={[s.toolHeroArc, { borderColor: `${meta.accent}24` }]} />
            <View style={[s.toolHeroArcSmall, { borderColor: `${meta.accent}20` }]} />
            <View style={s.toolHeroHeader}>
              <View style={[s.toolPageBadge, { backgroundColor: `${meta.accent}18`, borderColor: `${meta.accent}55` }]}>
                <Text style={[s.toolPageBadgeText, { color: meta.accent }]}>{meta.icon}</Text>
              </View>
              <View style={[s.toolHeroAccentBand, { backgroundColor: `${meta.accent}16`, borderColor: `${meta.accent}30` }]}>
                <View style={[s.toolHeroAccentFill, { backgroundColor: meta.accent }]} />
                <Text style={[s.toolHeroAccentText, { color: meta.accent }]}>需先建立资料</Text>
              </View>
            </View>
            <Text style={s.toolPageTitle}>{meta.label}</Text>
            <Text style={s.toolPageBody}>{'这个工具会根据完整的出生资料生成个人画像来工作，所以需要先把姓名、出生日期、时分、性别和出生地填完整。'}</Text>
          </Card>
          <Card>
            <Text style={s.toolResultText}>{'请先填写姓名、出生日期、时、分、性别和出生地等基础资料。系统生成个人画像后，情绪洞察、决策辅助、成长追踪和自我反思这些 AI 工具才会真正有针对性。'}</Text>
            <TouchableOpacity style={s.primaryButton} onPress={onRequireProfile}>
              <Text style={s.primaryButtonText}>{'先去建立资料'}</Text>
            </TouchableOpacity>
          </Card>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={s.toolPageRoot} {...swipeResponder.panHandlers}>
      <View style={[s.toolPageTopBar, { paddingTop: Platform.OS === 'ios' ? 42 : 22 }]}>
        <TouchableOpacity onPress={onBack} style={s.toolBackButton}>
          <Text style={s.toolBackButtonText}>‹ 返回智能工具</Text>
        </TouchableOpacity>
        <Text style={s.toolTopTitle}>{meta.label}</Text>
        <View style={s.toolTopSpacer} />
      </View>
      <ScrollView ref={toolScrollRef} contentContainerStyle={s.pageContent} showsVerticalScrollIndicator={false}>
        {toolKey !== 'divination' ? (
          <Card style={s.toolPageHero}>
            <View style={[s.toolHeroAura, { backgroundColor: `${meta.accent}16` }]} />
            <View style={[s.toolHeroArc, { borderColor: `${meta.accent}24` }]} />
            <View style={[s.toolHeroArcSmall, { borderColor: `${meta.accent}20` }]} />
            <View style={s.toolHeroHeader}>
              <View style={[s.toolPageBadge, { backgroundColor: `${meta.accent}18`, borderColor: `${meta.accent}55` }]}>
                <Text style={[s.toolPageBadgeText, { color: meta.accent }]}>{meta.icon}</Text>
              </View>
              <View style={[s.toolHeroAccentBand, { backgroundColor: `${meta.accent}16`, borderColor: `${meta.accent}30` }]}>
                <View style={[s.toolHeroAccentFill, { backgroundColor: meta.accent }]} />
                <Text style={[s.toolHeroAccentText, { color: meta.accent }]}>当前工具</Text>
              </View>
            </View>
            <Text style={s.toolPageTitle}>{meta.label}</Text>
            <Text style={s.toolPageBody}>{meta.hint}{!isPremium ? ` 当前剩余 ${aiRemaining} 次。` : ''}</Text>
          </Card>
        ) : null}

        {toolKey === 'weekly' ? (
          <Card>
            <SectionHeader eyebrow={'本周安排'} title={'五张行动卡'} body={'点击任意卡片查看完整建议。'} />
            {Object.keys(WEEKLY_META).map((key) => (
              <WeeklyActionCard
                key={key}
                itemKey={key}
                value={weekly[key]}
                expanded={expandedWeeklyKey === key}
                onToggle={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setExpandedWeeklyKey((prev) => (prev === key ? null : key));
                }}
              />
            ))}
          </Card>
        ) : null}

        {toolKey === 'divination' ? (
          <>
            <Modal
              visible={showDivinationRitualModal}
              transparent
              animationType="fade"
              onRequestClose={() => setShowDivinationRitualModal(false)}
            >
              <Pressable style={s.divinationRitualModalBackdrop} onPress={() => setShowDivinationRitualModal(false)}>
                <Pressable style={s.divinationRitualModalCard} onPress={(event) => event.stopPropagation?.()}>
                  <View style={s.divinationRitualHeader}>
                    <Text style={s.divinationRitualSeal}>卦</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.divinationRitualTitle}>卦不可轻起</Text>
                      <Text style={s.divinationRitualIntro}>小六壬重在一念初动。问前先收心，把事情收成一个清楚的问题。</Text>
                    </View>
                  </View>
                  <View style={s.divinationRitualList}>
                    {DIVINATION_RITUAL_NOTES.map((item) => (
                      <View key={item.title} style={s.divinationRitualItem}>
                        <Text style={s.divinationRitualItemTitle}>{item.title}</Text>
                        <Text style={s.divinationRitualItemBody}>{item.body}</Text>
                      </View>
                    ))}
                  </View>
                  <TouchableOpacity style={s.divinationRitualCloseButton} onPress={() => setShowDivinationRitualModal(false)} activeOpacity={0.9}>
                    <Text style={s.divinationRitualCloseText}>{'我已明白，开始起卦'}</Text>
                  </TouchableOpacity>
                </Pressable>
              </Pressable>
            </Modal>
            <Card>
              <View style={s.moodChipRow}>
                {DIVINATION_SCENE_OPTIONS.map((item) => {
                  const active = item.key === divinationDraft.sceneType;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      onPress={() => setDivinationDraft((prev) => ({ ...prev, sceneType: item.key }))}
                      style={[s.moodChip, active && { borderColor: meta.accent, backgroundColor: `${meta.accent}18` }]}
                    >
                      <Text style={[s.moodChipText, active && { color: meta.accent }]}>{item.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity style={s.divinationRitualTrigger} onPress={() => setShowDivinationRitualModal(true)} activeOpacity={0.9}>
                <Text style={s.divinationRitualTriggerSeal}>卦</Text>
                <Text style={s.divinationRitualTriggerText}>{'卦不可轻起 · 查看起卦规矩'}</Text>
              </TouchableOpacity>
              <View style={s.questionBlock}>
                <Text style={s.questionText}>当前想问的事</Text>
                <View style={s.divinationComposer}>
                  <TextInput
                    value={divinationDraft.question}
                    onFocus={() => setShowDivinationRitualModal(false)}
                    onChangeText={(value) => {
                      setShowDivinationRitualModal(false);
                      setDivinationDraft((prev) => ({ ...prev, question: value }));
                    }}
                    style={s.divinationComposerInput}
                    multiline
                    placeholder={getDivinationQuestionPlaceholder(divinationDraft.sceneType)}
                    placeholderTextColor={'rgba(20,51,58,0.42)'}
                  />
                  <Text style={s.divinationComposerHint}>
                    {`${divinationDraft.question || ''}`.trim()
                      ? getDivinationComposerHint(divinationDraft.sceneType)
                      : `你更可能真正想问的是：${buildLikelyConcernPreview(divinationDraft.sceneType, divinationDraft.question)}`}
                  </Text>
                </View>
              </View>
              <Pressable
                style={({ pressed }) => [
                  s.primaryButton,
                  s.toolActionButton,
                  s.divinationActionButton,
                  (toolLoading || pressed) && s.divinationActionButtonPressed,
                ]}
                onPress={handleDivinationSubmit}
                disabled={toolLoading}
              >
                <View style={s.toolActionButtonInner}>
                  {toolLoading ? <ActivityIndicator size="small" color="#FFF" style={s.toolActionSpinner} /> : null}
                  <Text style={s.primaryButtonText}>{toolLoading ? '起卦中…' : '起一卦，让明己断此事'}</Text>
                </View>
              </Pressable>
              <View style={s.divinationTimeHintRow}>
                <View style={s.divinationTimeHintDot} />
                <Text style={s.divinationTimeHintText}>{'按你此刻起卦的月、日、时来断，不拿旧时点替代现在。'}</Text>
              </View>
              {showDivinationWarningCard ? (
                <Animated.View
                  style={[
                    s.divinationWarningCard,
                    {
                      opacity: toolFeedbackOpacity,
                      transform: [{ scale: toolFeedbackScale }],
                    },
                  ]}
                >
                  <View style={s.divinationWarningBadge}>
                    <Text style={s.divinationWarningBadgeText}>
                      {divinationWarningNeedsPaywall ? '今日已满' : '卦有定时'}
                    </Text>
                  </View>
                  <Text style={s.divinationWarningTitle}>
                    {divinationWarningNeedsPaywall ? '今日这一卦已经用完' : '此刻不宜再起新卦'}
                  </Text>
                  <Text style={s.divinationWarningBody}>{divinationWarningText}</Text>
                  {divinationWarningNeedsPaywall ? (
                    <TouchableOpacity style={s.divinationWarningButton} onPress={onOpenPaywall} activeOpacity={0.9}>
                      <Text style={s.divinationWarningButtonText}>{'开通会员，解锁更多功能'}</Text>
                    </TouchableOpacity>
                  ) : null}
                </Animated.View>
              ) : null}
              {toolLoading ? (
                <View style={s.divinationLoadingCard}>
                  <View style={s.divinationLoadingAura} />
                  <View style={s.divinationLoadingOrbitOuter} />
                  <View style={s.divinationLoadingOrbitInner} />
                  <View style={s.divinationLoadingSymbolWrap}>
                    {Platform.OS === 'web' ? (
                      <video
                        ref={divinationVideoRef}
                        src={MINGJI_DIVINATION_LOADING_VIDEO}
                        autoPlay
                        muted
                        playsInline
                        preload="auto"
                        onLoadedData={() => setDivinationVideoLoaded(true)}
                        onEnded={handleDivinationVideoFinished}
                        style={s.divinationLoadingVideo}
                      />
                    ) : (
                      <Video
                        ref={divinationVideoRef}
                        source={{ uri: MINGJI_DIVINATION_LOADING_VIDEO }}
                        style={s.divinationLoadingVideo}
                        resizeMode="contain"
                        shouldPlay
                        isLooping={false}
                        isMuted
                        useNativeControls={false}
                        onPlaybackStatusUpdate={(status) => {
                          if (!status?.isLoaded) return;
                          if (!divinationVideoLoaded) setDivinationVideoLoaded(true);
                          if (status?.didJustFinish) {
                            handleDivinationVideoFinished();
                          }
                        }}
                      />
                    )}
                    <View pointerEvents="none" style={[s.divinationLoadingVideoFallback, divinationVideoLoaded && s.divinationLoadingVideoFallbackHidden]}>
                      <View style={s.divinationLoadingSymbolBox}>
                        <Text style={s.divinationLoadingSymbolText}>{'◈'}</Text>
                      </View>
                    </View>
                  </View>
                  {!divinationLoadingReady ? <Text style={s.divinationLoadingTitle}>{'掐指起卦中'}</Text> : null}
                  {!divinationLoadingReady ? (
                    <Text style={s.divinationLoadingBody}>{'明己正在按当下时点起主宫与辅宫，先定这件事眼前是稳、拖、快、争、顺还是空。'}</Text>
                  ) : null}
                  {divinationLoadingReady ? (
                    <Animated.View style={[s.divinationReadyWrap, { opacity: divinationReadyOpacity }]}>
                      <Text style={s.divinationReadyTitle}>{'卦象已成'}</Text>
                      <Text style={s.divinationReadyText}>{'明己正在断事。请稍候片刻，这一卦马上就会落到你眼前。'}</Text>
                    </Animated.View>
                  ) : null}
                </View>
              ) : null}
            </Card>
            {normalizedDivinationInsight?.engineResult ? (
              <>
                <Animated.View
                  style={{
                    opacity: divinationHeroOpacity,
                    transform: [{ translateY: divinationHeroTranslate }],
                  }}
                >
                  <Card style={s.divinationResultHero}>
                  <Text style={s.divinationResultEyebrow}>{getDivinationSceneLabel(divinationDraft.sceneType)}</Text>
                  <Text style={s.divinationResultTitle}>
                    {getDivinationResultTitle(divinationDraft.sceneType, normalizedDivinationInsight.engineResult)}
                  </Text>
                  <Text style={s.divinationResultBody}>{getDivinationResultLead(divinationDraft.sceneType, normalizedDivinationInsight.engineResult)}</Text>
                  {normalizedDivinationInsight.engineResult?.decisionScore ? (
                    <View style={s.divinationDecisionPanel}>
                      <View>
                        <Text style={s.divinationDecisionEyebrow}>{'即时决策评分'}</Text>
                        <Text style={s.divinationDecisionScore}>{`${normalizedDivinationInsight.engineResult.decisionScore}`}</Text>
                      </View>
                      <View style={s.divinationDecisionBadge}>
                        <Text style={s.divinationDecisionBadgeText}>{normalizedDivinationInsight.engineResult.modernResult || '即时判断'}</Text>
                      </View>
                    </View>
                  ) : null}
                  {Array.isArray(normalizedDivinationInsight.engineResult?.threePalaceTimeline) && normalizedDivinationInsight.engineResult.threePalaceTimeline.length ? (
                    <View style={s.divinationTimelineRow}>
                      {normalizedDivinationInsight.engineResult.threePalaceTimeline.slice(0, 3).map((item, index) => (
                        <View key={`${item?.phase || item?.label || 'phase'}-${index}`} style={s.divinationTimelineNode}>
                          <Text style={s.divinationTimelineLabel}>{item?.label || '阶段'}</Text>
                          <Text style={s.divinationTimelinePalace}>{item?.palace_name || '-'}</Text>
                          <Text style={s.divinationTimelineMeta}>{item?.modern_name || item?.fortune_level || ''}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  <View style={s.divinationTagRow}>
                    {(normalizedDivinationInsight.engineResult.recommended || []).slice(0, 4).map((item, index) => (
                      <View key={`${item}-${index}`} style={s.divinationTag}>
                        <Text style={s.divinationTagText}>{`宜 ${item}`}</Text>
                      </View>
                    ))}
                    {(normalizedDivinationInsight.engineResult.avoid || []).slice(0, 3).map((item, index) => (
                      <View key={`${item}-${index}-avoid`} style={[s.divinationTag, s.divinationTagAvoid]}>
                        <Text style={[s.divinationTagText, s.divinationTagAvoidText]}>{`忌 ${item}`}</Text>
                      </View>
                    ))}
                  </View>
                  <TouchableOpacity style={s.divinationGuideButton} onPress={jumpToDivinationFormal} activeOpacity={0.92}>
                    <Text style={s.divinationGuideButtonEyebrow}>{'继续往下看'}</Text>
                    <Text style={s.divinationGuideButtonTitle}>{'明己解卦'}</Text>
                    <Text style={s.divinationGuideButtonBody}>{'下面还有这一卦的起卦时点、真正卡点和正式断语。点这里直接带你过去。'}</Text>
                  </TouchableOpacity>
                  </Card>
                </Animated.View>
                <Animated.View
                  onLayout={(event) => setDivinationBodyY(event?.nativeEvent?.layout?.y || 0)}
                  style={{
                    opacity: divinationBodyOpacity,
                    transform: [{ translateY: divinationBodyTranslate }],
                  }}
                >
                  <Card onLayout={(event) => setDivinationFormalY(event?.nativeEvent?.layout?.y || 0)}>
                    <SectionHeader eyebrow={'正式断语'} title={getDivinationFormalTitle(divinationDraft.sceneType)} />
                    {buildDivinationEngineLead(normalizedDivinationInsight.engineResult) ? (
                      <Text style={s.divinationEngineLead}>{buildDivinationEngineLead(normalizedDivinationInsight.engineResult)}</Text>
                    ) : null}
                    {normalizedDivinationInsight.text ? <Text style={s.toolResultText}>{buildDivinationFormalLead(divinationDraft.sceneType, normalizedDivinationInsight.text)}</Text> : <Text style={s.toolResultText}>{'这次起卦已完成，但明己的完整断语还没有返回。'}</Text>}
                  </Card>
                  <Card>
                    <SectionHeader eyebrow={'起卦时点'} title={'这一卦是按什么时间断的'} />
                    <Text style={s.toolResultText}>{formatDivinationTimeNote(normalizedDivinationInsight.engineResult)}</Text>
                  </Card>
                  <Card>
                    <SectionHeader eyebrow={'明己先替你点题'} title={'你更可能真正卡住的是'} />
                    <Text style={s.toolResultText}>{normalizedDivinationInsight.engineResult.likelyConcern || buildLikelyConcernPreview(divinationDraft.sceneType, divinationDraft.question)}</Text>
                  </Card>
                  {Array.isArray(normalizedDivinationInsight.engineResult?.threePalaceTimeline) && normalizedDivinationInsight.engineResult.threePalaceTimeline.length ? (
                    <Card>
                      <SectionHeader eyebrow={'三宫链路'} title={'起因、过程、结果怎么串起来'} />
                      <View style={s.divinationDetailTimeline}>
                        {normalizedDivinationInsight.engineResult.threePalaceTimeline.slice(0, 3).map((item, index) => (
                          <View key={`${item?.phase || item?.label || 'detail'}-${index}`} style={s.divinationDetailTimelineItem}>
                            <Text style={s.divinationDetailTimelineTitle}>{`${item?.label || '阶段'}：${item?.palace_name || '-'}`}</Text>
                            <Text style={s.divinationDetailTimelineBody}>{`${item?.modern_name || item?.fortune_level || '待辨'}。${item?.decision_hint || item?.summary || ''}`}</Text>
                          </View>
                        ))}
                      </View>
                    </Card>
                  ) : null}
                  {normalizedDivinationInsight.engineResult?.baziLinkage?.advice ? (
                    <Card>
                      <SectionHeader eyebrow={'八字联动'} title={normalizedDivinationInsight.engineResult.baziLinkage.title || '这卦对你的日主意味着什么'} />
                      <Text style={s.toolResultText}>{normalizedDivinationInsight.engineResult.baziLinkage.advice}</Text>
                    </Card>
                  ) : null}
                </Animated.View>
              </>
            ) : null}
          </>
        ) : null}

        {toolKey === 'emotion' ? (
          <Card>
            <View style={s.moodChipRow}>
              {MOOD_OPTIONS.map((item) => {
                const active = item.key === selectedMood;
                return (
                  <TouchableOpacity key={item.key} onPress={() => setSelectedMood(item.key)} style={[s.moodChip, active && { borderColor: item.tone, backgroundColor: `${item.tone}18` }]}>
                    <Text style={[s.moodChipText, active && { color: item.tone }]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput value={emotionNote} onChangeText={setEmotionNote} style={s.answerInput} multiline placeholder={'写下今天最明显的一种情绪，以及它是被什么事情触发的'} />
            {renderToolActionButton('生成 AI 情绪分析', async () => {
                const output = await runAITool(() => aiAnalyzeEmotion(`情绪：${activeMood.label}\n记录：${emotionNote || '今天先做一条简短记录。'}`, result, { isPremium, memberTier: isPremium ? 'premium' : 'free', profile: toolIdentityProfile, userKey: stableToolUserKey }));
              if (output) setEmotionInsight(output);
            }, '分析中…')}
            {emotionInsight ? <Text style={s.toolResultText}>{emotionInsight}</Text> : null}
          </Card>
        ) : null}

        {toolKey === 'dream' ? (
          <Card>
            <View style={s.questionBlock}>
              <Text style={s.questionText}>刚才梦见了什么</Text>
              <View style={s.dreamComposerShell}>
              <View style={s.divinationComposer} onLayout={(event) => setDreamComposerY(event.nativeEvent.layout.y)}>
                <TextInput
                  value={dreamDraft}
                  onChangeText={setDreamDraft}
                  onFocus={focusDreamComposer}
                  style={s.divinationComposerInput}
                  multiline
                  placeholder={getDreamQuestionPlaceholder()}
                  placeholderTextColor={'rgba(20,51,58,0.42)'}
                />
                <Text style={s.divinationComposerHint}>{getDreamComposerHint(dreamDraft)}</Text>
              </View>
              </View>
            </View>
            {renderToolActionButton('让明己解这个梦', async () => {
              const normalizedDreamText = `${dreamDraft || '我醒来只记得这个梦很强烈，但细节还没完全抓住。'}`.trim();
              trackPwaEvent('mingji_dream_submit', {
                userKey: stableToolUserKey,
                memberTier: isPremium ? 'premium' : 'free',
                dreamLength: normalizedDreamText.length,
                hasDreamText: Boolean(normalizedDreamText),
                nickname: toolIdentityProfile?.nickname || '',
              });
              const output = await runAITool(
                () => aiMingJiDream(normalizedDreamText, result, {
                  isPremium,
                  memberTier: isPremium ? 'premium' : 'free',
                  profile,
                  userKey: stableToolUserKey,
                }),
                {
                  loadingText: '明己正在拆梦里的象与心事…',
                  successText: '梦里的线索已经拆开了，往下看明己怎么解。',
                }
              );
              if (output) {
                trackPwaEvent('mingji_dream_success', {
                  userKey: stableToolUserKey,
                  memberTier: isPremium ? 'premium' : 'free',
                  dreamLength: normalizedDreamText.length,
                  preview: normalizedDreamText.slice(0, 80),
                  outputLength: `${output}`.length,
                  nickname: toolIdentityProfile?.nickname || '',
                });
                setDreamInsight(output);
              }
            }, '解梦中…')}
            {dreamInsight ? (
              <>
                <Card style={s.dreamResultHero} onLayout={(event) => setDreamResultY(event.nativeEvent.layout.y)}>
                  <Text style={s.divinationResultEyebrow}>{'明己解梦'}</Text>
                  <Text style={s.divinationResultTitle}>{'先看这个梦，眼下在映哪一层心事'}</Text>
                  <Text style={s.divinationResultBody}>{buildDreamPreview(dreamInsight)}</Text>
                </Card>
                <Card>
                  <SectionHeader eyebrow={'完整梦解'} title={'明己怎么拆这个梦'} />
                  <Text style={s.toolResultText}>{buildDreamFormalLead(dreamInsight)}</Text>
                </Card>
              </>
            ) : null}
          </Card>
        ) : null}

      {toolKey === 'decision' ? (
        <Card>
          <View style={s.questionBlock}>
            <Text style={s.questionText}>当前要面对的选择</Text>
            <TextInput value={decisionDraft.situation} onChangeText={(value) => setDecisionDraft((prev) => ({ ...prev, situation: value }))} style={s.answerInput} multiline placeholder={'例如：要不要换工作、要不要接受一个合作'} />
          </View>
          <View style={s.questionBlock}>
            <Text style={s.questionText}>你现在看到的选项</Text>
            <TextInput value={decisionDraft.options} onChangeText={(value) => setDecisionDraft((prev) => ({ ...prev, options: value }))} style={s.answerInput} multiline placeholder={'把选项列出来，而不是只在脑中打转'} />
          </View>
          <View style={s.questionBlock}>
            <Text style={s.questionText}>最小下一步</Text>
            <TextInput value={decisionDraft.nextStep} onChangeText={(value) => setDecisionDraft((prev) => ({ ...prev, nextStep: value }))} style={s.answerInput} multiline placeholder={'例如：先问一个人、先查一份信息、先等一天'} />
          </View>
          {renderToolActionButton('生成 AI 决策建议', async () => {
              const output = await runAITool(() => aiDecisionSupport(decisionDraft.situation || '我需要理清一个重要决定。', `${decisionDraft.options || '尚未列出选项'}\n最小下一步：${decisionDraft.nextStep || '还没想清楚'}`, result, { isPremium, memberTier: isPremium ? 'premium' : 'free', profile: toolIdentityProfile, userKey: stableToolUserKey }));
            if (output) setDecisionInsight(output);
          }, '分析中…')}
          {decisionInsight ? <Text style={s.toolResultText}>{decisionInsight}</Text> : null}
        </Card>
      ) : null}

      {toolKey === 'growth' ? (
        <Card>
          <View style={s.growthGrid}>
            <View style={s.growthCard}>
              <Text style={s.growthValue}>{`${answered} / ${totalQuestions}`}</Text>
              <Text style={s.growthLabel}>已完成观察</Text>
            </View>
            <View style={s.growthCard}>
              <Text style={s.growthValue}>{oneLineSummary ? '已形成' : '待更新'}</Text>
              <Text style={s.growthLabel}>当前摘要</Text>
            </View>
          </View>
          {renderToolActionButton('生成 AI 成长总结', async () => {
            const mergedAnswers = Object.entries(followUpAnswers || {}).map(([key, value]) => `${key}：${value}`).join('\n');
              const output = await runAITool(() => aiChat(`请根据我的当前摘要和已完成观察，给我一段成长追踪建议。\n当前摘要：${oneLineSummary || '暂未生成'}\n已完成观察：${mergedAnswers || '暂未填写'}\n请聚焦：我最近正在形成什么稳定模式，下一步该如何调整。`, result, [], { isPremium, memberTier: isPremium ? 'premium' : 'free', profile: toolIdentityProfile, userKey: stableToolUserKey }));
            if (output) setGrowthInsight(output);
          }, '生成中…')}
          {growthInsight ? <Text style={s.toolResultText}>{growthInsight}</Text> : null}
        </Card>
      ) : null}

      {toolKey === 'reflection' ? (
        <Card>
          {(followUpQuestions || []).map((item, index) => (
            <View key={item?.id || index} style={s.questionBlock}>
              <Text style={s.questionText}>{item?.question || `问题 ${index + 1}`}</Text>
              <TextInput value={followUpAnswers?.[item?.id] || ''} onChangeText={(value) => onFollowUpAnswerChange?.(item?.id, value)} style={s.answerInput} multiline placeholder={'写下你的观察或这一周最明显的变化'} />
            </View>
          ))}
          {renderToolActionButton('生成 AI 反思反馈', async () => {
            await onGenerateCompanion?.();
            const mergedAnswers = Object.values(followUpAnswers || {}).filter(Boolean).join('\n');
              const output = await runAITool(() => aiChat(`请根据我的这些反思回答，给我一段简洁但具体的自我反思反馈，并指出接下来最值得继续观察的一点。\n${mergedAnswers || '我还没有写下太多内容。'}`, result, [], { isPremium, memberTier: isPremium ? 'premium' : 'free', profile: toolIdentityProfile, userKey: stableToolUserKey }));
            if (output) setReflectionInsight(output);
          }, companionLoading ? '更新中…' : '生成中…')}
          {reflectionInsight ? <Text style={s.toolResultText}>{reflectionInsight}</Text> : null}
        </Card>
      ) : null}

      </ScrollView>
    </View>
  );
}

function EmotionJournalCard() {
  const [selectedMood, setSelectedMood] = useState(MOOD_OPTIONS[0].key);
  const [note, setNote] = useState('');
  const [savedText, setSavedText] = useState('');
  const activeMood = MOOD_OPTIONS.find((item) => item.key === selectedMood) || MOOD_OPTIONS[0];

  return (
    <Card>
      <SectionHeader eyebrow={'情绪日记'} title={'记录今天的状态'} body={'每天留下一句状态备注，帮助你逐步看清自己的情绪规律与触发点。'} />
      <View style={s.moodChipRow}>
        {MOOD_OPTIONS.map((item) => {
          const active = item.key === selectedMood;
          return (
            <TouchableOpacity key={item.key} onPress={() => setSelectedMood(item.key)} style={[s.moodChip, active && { borderColor: item.tone, backgroundColor: `${item.tone}18` }]}>
              <Text style={[s.moodChipText, active && { color: item.tone }]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TextInput
        value={note}
        onChangeText={setNote}
        style={s.answerInput}
        multiline
        placeholder={'写下今天最明显的一种情绪，以及它是被什么事情触发的'}
      />
      <TouchableOpacity
        style={s.primaryButton}
        onPress={() => setSavedText(`${activeMood.label} · ${note.trim() || '已记录今天的情绪状态'}`)}
      >
        <Text style={s.primaryButtonText}>{'保存今日记录'}</Text>
      </TouchableOpacity>
      {savedText ? <Text style={s.toolFootnote}>{`最近一条：${savedText}`}</Text> : null}
    </Card>
  );
}

function DecisionAssistCard() {
  const [draft, setDraft] = useState({ situation: '', options: '', nextStep: '' });
  const completion = [draft.situation, draft.options, draft.nextStep].filter((item) => `${item}`.trim()).length;

  return (
    <Card>
      <SectionHeader eyebrow={'决策辅助'} title={'把复杂选择拆成三步'} body={'先写清情境、列出选项，再留下一个最小下一步，避免在情绪高点仓促决定。'} />
      <View style={s.questionBlock}>
        <Text style={s.questionText}>{'当前要面对的选择'}</Text>
        <TextInput value={draft.situation} onChangeText={(value) => setDraft((prev) => ({ ...prev, situation: value }))} style={s.answerInput} multiline placeholder={'例如：要不要换工作、要不要继续一段关系'} />
      </View>
      <View style={s.questionBlock}>
        <Text style={s.questionText}>{'你现在看到的两个或三个选项'}</Text>
        <TextInput value={draft.options} onChangeText={(value) => setDraft((prev) => ({ ...prev, options: value }))} style={s.answerInput} multiline placeholder={'把选项列出来，而不是只在脑中打转'} />
      </View>
      <View style={s.questionBlock}>
        <Text style={s.questionText}>{'今天最小的一步'}</Text>
        <TextInput value={draft.nextStep} onChangeText={(value) => setDraft((prev) => ({ ...prev, nextStep: value }))} style={s.answerInput} multiline placeholder={'例如：先问一个人、先查一份信息、先等一天'} />
      </View>
      <Text style={s.toolFootnote}>{`已完成 ${completion} / 3 项，先把问题写清楚，决策质量通常就会提升。`}</Text>
    </Card>
  );
}

function RelationshipInsightCard({ profile, weeklyActions, result }) {
  const weekly = getResolvedWeeklyActions(weeklyActions);
  return (
    <Card>
      <SectionHeader eyebrow={'关系洞察'} title={'看清自己在关系中的惯性'} body={'帮助你理解自己更容易在哪些场景里过度解释、退让、控制或回避。'} />
      <View style={s.infoStack}>
        <Text style={s.infoStackLabel}>{'当前最值得留意的关系主题'}</Text>
        <Text style={s.infoStackValue}>{firstValid(weekly?.relationship?.advice, result?.narrative?.emotionalHint, profile?.focus, '先留意自己最近最容易被什么样的互动触发。')}</Text>
      </View>
      <View style={s.infoStack}>
        <Text style={s.infoStackLabel}>{'更稳的沟通方式'}</Text>
        <Text style={s.infoStackValue}>{firstValid(result?.useGodAnalysis?.strategy, '先确认自己的真实需求，再表达期待，关系会比直接反应更稳定。')}</Text>
      </View>
    </Card>
  );
}

function GrowthTrackerCard({ answeredCount, totalCount, oneLineSummary }) {
  const progress = totalCount ? `${answeredCount} / ${totalCount}` : `${answeredCount}`;
  return (
    <Card>
      <SectionHeader eyebrow={'成长追踪'} title={'把自我认知变成可回看的进展'} body={'不是一次看完，而是通过持续记录、复盘和更新，慢慢看见自己的稳定模式。'} />
      <View style={s.growthGrid}>
        <View style={s.growthCard}>
          <Text style={s.growthValue}>{progress}</Text>
          <Text style={s.growthLabel}>{'已完成反思问题'}</Text>
        </View>
        <View style={s.growthCard}>
          <Text style={s.growthValue}>{oneLineSummary ? '已生成' : '待更新'}</Text>
          <Text style={s.growthLabel}>{'本周个人摘要'}</Text>
        </View>
      </View>
      <Text style={s.toolFootnote}>{oneLineSummary ? `当前摘要：${toText(oneLineSummary)}` : '继续补充回答与记录，系统会逐步形成更稳定的个人洞察。'}</Text>
    </Card>
  );
}

function PillarMatrix({ result, onPressTenGod, onPressShenShaItem, onPressShenShaList }) {
  const titles = PILLAR_TITLES;
  const pillars = getResolvedPillars(result);
  const detailRows = [result?.pillarDetails?.year || {}, result?.pillarDetails?.month || {}, result?.pillarDetails?.day || {}, result?.pillarDetails?.hour || {}];
  const pillarAccents = ['#F7F2E7', '#F3F6ED', '#FDF3EA', '#EEF4FA'];
  const pillarHints = [
    '看早年环境、家族气质与外在印象',
    '看成长节奏、事业结构与主场环境',
    '看自我核心、关系重心与命盘主体',
    '看晚景延伸、行动落点与人生余韵',
  ];
  const infoRows = [
    { label: PILLAR_ROW_LABELS.starState, values: [result?.diShiDetails?.year, result?.diShiDetails?.month, result?.diShiDetails?.day, result?.diShiDetails?.hour], type: 'text' },
    { label: PILLAR_ROW_LABELS.xun, values: [result?.xunDetails?.year, result?.xunDetails?.month, result?.xunDetails?.day, result?.xunDetails?.hour], type: 'tags' },
    { label: PILLAR_ROW_LABELS.naYin, values: [result?.naYinDetails?.year, result?.naYinDetails?.month, result?.naYinDetails?.day, result?.naYinDetails?.hour], type: 'tags' },
    { label: PILLAR_ROW_LABELS.kongWang, values: [result?.kongWangDetails?.year, result?.kongWangDetails?.month, result?.kongWangDetails?.day, result?.kongWangDetails?.hour], type: 'tags' },
    { label: PILLAR_ROW_LABELS.shenSha, values: [result?.shenShaDetails?.year, result?.shenShaDetails?.month, result?.shenShaDetails?.day, result?.shenShaDetails?.hour], type: 'chips' },
  ];

  return (
    <Card>
      <SectionHeader eyebrow={S.profileCore} title={S.fourPillars} body={'\u70b9\u51fb\u5341\u795e\u53ef\u67e5\u770b\u7b80\u77ed\u89e3\u91ca\u3002'} />
      <View style={s.pillarHeroRow}>
        {pillars.map((item, index) => (
          <View key={`pillar-hero-${titles[index]}`} style={[s.pillarHeroCard, { backgroundColor: pillarAccents[index] || '#F7F3EA' }]}>
            <Text style={s.pillarHeroLabel}>{titles[index]}</Text>
            <Text style={s.pillarHeroValue}>{`${item.gan || '--'}${item.zhi || '--'}`}</Text>
            <Text style={s.pillarHeroMeta}>{index === 2 ? '命盘核心' : toText(detailRows[index]?.stemTenGod || detailRows[index]?.branchTenGods?.[0] || '--')}</Text>
            <Text style={s.pillarHeroHint}>{pillarHints[index]}</Text>
          </View>
        ))}
      </View>
      <View style={s.matrix}>
        <View style={s.matrixRow}>
          <View style={[s.sideCell, s.headerCell]}><Text style={s.headerText}>{PILLAR_ROW_LABELS.header}</Text></View>
          {titles.map((item, index) => <View key={item} style={[s.headerCell, { backgroundColor: pillarAccents[index] || '#F7F3EA' }]}><Text style={s.headerText}>{item}</Text></View>)}
        </View>
        <View style={s.matrixRow}>
          <View style={s.sideCell}><Text style={s.sideLabel}>{PILLAR_ROW_LABELS.mainStar}</Text></View>
          {detailRows.map((item, index) => {
            const god = index === 2 ? '\u65e5\u4e3b' : item?.stemTenGod || '--';
            return (
              <View key={`god-${titles[index]}`} style={[s.mainCell, { backgroundColor: index === 2 ? '#FFF7EC' : '#FFFFFF' }]}>
                <TouchableOpacity disabled={god === '\u65e5\u4e3b' || god === '--'} onPress={() => onPressTenGod?.(god)} style={god === '\u65e5\u4e3b' ? s.mainGhost : s.godChip}>
                  <Text style={god === '\u65e5\u4e3b' ? s.mainGhostText : s.godChipText}>{god}</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
        <View style={s.matrixRow}>
          <View style={s.sideCell}><Text style={s.sideLabel}>{PILLAR_ROW_LABELS.stem}</Text></View>
          {pillars.map((item, index) => <View key={`gan-${titles[index]}`} style={[s.mainCell, s.glyphCell]}><Text style={[s.glyphBig, { color: ELEMENT_COLORS[getStemElement(item.gan)] || C.ink }]}>{item.gan || '--'}</Text></View>)}
        </View>
        <View style={s.matrixRow}>
          <View style={s.sideCell}><Text style={s.sideLabel}>{PILLAR_ROW_LABELS.branch}</Text></View>
          {pillars.map((item, index) => <View key={`zhi-${titles[index]}`} style={[s.mainCell, s.glyphCell]}><Text style={[s.glyphSmall, { color: ELEMENT_COLORS[getBranchElement(item.zhi)] || C.ink }]}>{item.zhi || '--'}</Text></View>)}
        </View>
        <View style={s.matrixRow}>
          <View style={s.sideCell}><Text style={s.sideLabel}>{PILLAR_ROW_LABELS.hiddenStem}</Text></View>
          {pillars.map((item, index) => (
            <View key={`hidden-${titles[index]}`} style={[s.hiddenCell, { backgroundColor: '#FFFEFB' }]}>
              {(item.hiddenStems || []).length ? item.hiddenStems.map((stem, stemIndex) => (
                <View key={`${titles[index]}-${stem}-${stemIndex}`} style={s.hiddenRow}>
                  <Text style={[s.hiddenStem, { color: ELEMENT_COLORS[getStemElement(stem)] || C.ink }]}>{stem}</Text>
                  <TouchableOpacity onPress={() => onPressTenGod?.(item.hiddenTenGods?.[stemIndex])} style={s.hiddenChip}>
                    <Text style={s.hiddenChipText}>{item.hiddenTenGods?.[stemIndex] || '--'}</Text>
                  </TouchableOpacity>
                </View>
              )) : <Text style={s.emptyText}>--</Text>}
            </View>
          ))}
        </View>
      </View>
      {infoRows.map((row) => (
        <View key={row.label} style={s.infoBand}>
          <Text style={s.infoBandLabel}>{row.label}</Text>
          <View style={s.infoBandGrid}>
            {row.values.map((value, index) => row.type === 'chips' ? (
              <View key={`${row.label}-${index}`} style={s.infoBandCell}>
                {normalizeList(value).length ? (
                  <>
                    <View style={s.infoChipGrid}>
                      {normalizeList(value).slice(0, 3).map((item, chipIndex) => (
                        <TouchableOpacity key={`${row.label}-${index}-${chipIndex}`} onPress={() => onPressShenShaItem?.(item)} style={s.infoChipGridItem}>
                          <Text numberOfLines={1} style={s.infoChipText}>{item}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {normalizeList(value).length > 3 ? (
                      <TouchableOpacity style={s.moreLink} onPress={() => onPressShenShaList?.(titles[index], normalizeList(value))}>
                        <Text style={s.moreLinkText}>{`\u66f4\u591a (${normalizeList(value).length - 3})`}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </>
                ) : <Text style={s.infoBandValue}>--</Text>}
              </View>
            ) : row.type === 'tags' ? (
              <View key={`${row.label}-${index}`} style={s.infoBandCell}>
                <View style={s.infoTagPill}>
                  <Text numberOfLines={2} style={s.infoTagText}>{toText(value)}</Text>
                </View>
              </View>
            ) : <Text key={`${row.label}-${index}`} style={s.infoBandValue}>{toText(value)}</Text>)}
          </View>
        </View>
      ))}
    </Card>
  );
}

function HomeTab(props) {
  const {
    pageNav,
    result,
    profile,
    accountProfile,
    accountResult,
    fortuneCalendar,
    calSummary,
    weeklyActions,
    oneLineSummary,
    followUpQuestions,
    followUpAnswers,
    onFollowUpAnswerChange,
    onGenerateCompanion,
    companionLoading,
    onRecalculate,
    reviewMode,
    onOpenAI,
    onOpenTodayDetail,
    onOpenCustomDetail,
      onOpenTodayGuides,
      isPremium,
      aiRemaining,
      aiAllowed,
      onRefreshAIQuota,
      onOpenPaywall,
    } = props;
  const today = findTodayCalendarCell(fortuneCalendar, result);
  const [activeToolPage, setActiveToolPage] = useState(null);
  const [pwaInstallState, setPwaInstallState] = useState({ standalone: false, platform: 'native', safari: false, displayMode: 'browser', canPrompt: false });
  const [pwaInstallDismissed, setPwaInstallDismissed] = useState(false);
  const [pwaInstallSheetVisible, setPwaInstallSheetVisible] = useState(false);
  const homeDeckBreath = useRef(new Animated.Value(0)).current;
  const homePrimaryBreath = useRef(new Animated.Value(0)).current;
  const homeSecondaryBreath = useRef(new Animated.Value(0)).current;
  const weekly = getResolvedWeeklyActions(weeklyActions);
  const hasRegisteredProfile = Boolean(
    result &&
    String(profile?.nickname || '').trim() &&
    String(profile?.year || '').trim() &&
    String(profile?.month || '').trim() &&
    String(profile?.day || '').trim() &&
    String(profile?.hour || '').trim() &&
    String(profile?.minute || '').trim() &&
    String(profile?.gender || '').trim() &&
    String(profile?.city || '').trim()
  );
  const todayGuideCards = useMemo(() => buildTodayGuideCards({ today, result, weekly, profile }), [today, result, weekly, profile]);
  const todayGoodHours = firstValid(toText(today?.goodHours), toText(result?.jiShi), '\u767d\u5929\u65f6\u6bb5\u4ee5\u7a33\u8282\u594f\u4e3a\u4e3b');
  const todayConclusion = toText(today?.advice || calSummary?.summary || '\u4eca\u5929\u5148\u7a33\u8282\u594f\uff0c\u518d\u505a\u5173\u952e\u5224\u65ad\u3002');
  const todayDateText = today?.dateLabel && today.dateLabel !== '--'
    ? today.dateLabel
    : result?.solarBirthInfo
      ? `${result.solarBirthInfo.year}-${`${result.solarBirthInfo.month}`.padStart(2, '0')}-${`${result.solarBirthInfo.day}`.padStart(2, '0')}`
      : '--';
  const todayYiText = toText(today?.yi);
  const todayJiText = toText(today?.ji);
  const todayRisk = firstValid(
    result?.narrative?.emotionalHint,
    weekly?.emotion?.advice,
    result?.luckAnalysis?.riskAreas,
    todayJiText,
    '\u4eca\u5929\u6700\u6015\u5728\u60c5\u7eea\u9876\u70b9\u505a\u51b3\u5b9a\u3002'
  );
  const todayBestAction = firstValid(
    todayYiText,
    weekly?.work?.advice,
    result?.useGodAnalysis?.strategy,
    '\u4f18\u5148\u63a8\u8fdb\u4e00\u4ef6\u6700\u91cd\u8981\u7684\u4e8b\uff0c\u5148\u628a\u4e3b\u7ebf\u7a33\u4f4f\u3002'
  );
  const todayAvoidAction = firstValid(
    todayJiText,
    weekly?.emotion?.advice,
    result?.luckAnalysis?.riskAreas,
    '\u4e0d\u8981\u5728\u60c5\u7eea\u4e0d\u7a33\u6216\u4fe1\u606f\u4e0d\u5168\u65f6\u4ed3\u4fc3\u505a\u51b3\u5b9a\u3002'
  );
  const todayHighlights = [
    today?.label,
    toText(today?.luckyDirection || result?.luckyDirection),
    toText(today?.luckyColor || result?.luckyColor),
  ].filter((item) => item && item !== '--');
  const isCompactHomeCards = PAGE_WIDTH < 392;
  const showInstallGuide = Platform.OS === 'web' && !pwaInstallDismissed && !pwaInstallState.standalone && (pwaInstallState.platform === 'ios' || pwaInstallState.platform === 'android');

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;

    const cleanup = listenToPwaInstallability({
      onUpdate: (nextState) => setPwaInstallState(nextState),
    });
    setPwaInstallState((state) => ({
      ...state,
      standalone: isStandalonePwa(),
      platform: detectPwaPlatform(),
      safari: isSafariBrowser(),
      displayMode: getPwaDisplayMode(),
    }));
    return cleanup;
  }, []);

  useEffect(() => {
    if (!showInstallGuide) return;
    trackPwaEvent('install_prompt_view', { platform: pwaInstallState.platform, surface: 'home_ai_entry' });
  }, [showInstallGuide, pwaInstallState.platform]);

  useEffect(() => {
    const deckLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(homeDeckBreath, { toValue: 1, duration: 2800, useNativeDriver: true }),
        Animated.timing(homeDeckBreath, { toValue: 0, duration: 2800, useNativeDriver: true }),
      ])
    );
    const primaryLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(homePrimaryBreath, { toValue: 1, duration: 3200, useNativeDriver: true }),
        Animated.timing(homePrimaryBreath, { toValue: 0, duration: 3200, useNativeDriver: true }),
      ])
    );
    const secondaryLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(homeSecondaryBreath, { toValue: 1, duration: 3600, useNativeDriver: true }),
        Animated.timing(homeSecondaryBreath, { toValue: 0, duration: 3600, useNativeDriver: true }),
      ])
    );

    deckLoop.start();
    primaryLoop.start();
    secondaryLoop.start();

    return () => {
      deckLoop.stop();
      primaryLoop.stop();
      secondaryLoop.stop();
      homeDeckBreath.stopAnimation();
      homePrimaryBreath.stopAnimation();
      homeSecondaryBreath.stopAnimation();
    };
  }, [homeDeckBreath, homePrimaryBreath, homeSecondaryBreath]);

  const handleAiEntryPress = () => {
    trackPwaEvent('cta_start_click', { page: 'home', position: 'hero_ai_entry' });
    if (hasRegisteredProfile) {
      onOpenAI?.();
      return;
    }
    onRecalculate?.();
  };

  const handleInstallPress = async () => {
    if (pwaInstallState.platform === 'android' && pwaInstallState.canPrompt) {
      trackPwaEvent('install_prompt_click', { platform: pwaInstallState.platform, surface: 'home_ai_entry', action: 'native_prompt' });
      const installed = await promptPwaInstall();
      if (!installed) setPwaInstallSheetVisible(true);
      return;
    }

    trackPwaEvent('install_prompt_click', { platform: pwaInstallState.platform, surface: 'home_ai_entry', action: 'show_steps' });
    setPwaInstallSheetVisible(true);
  };

  if (activeToolPage) {
    return (
      <SmartToolPage
        toolKey={activeToolPage}
        onBack={() => setActiveToolPage(null)}
        result={result}
        profile={profile}
        accountProfile={accountProfile}
        accountResult={accountResult}
        weeklyActions={weeklyActions}
        oneLineSummary={oneLineSummary}
        followUpQuestions={followUpQuestions}
        followUpAnswers={followUpAnswers}
        onFollowUpAnswerChange={onFollowUpAnswerChange}
        onGenerateCompanion={onGenerateCompanion}
        companionLoading={companionLoading}
        isPremium={isPremium}
          aiAllowed={aiAllowed}
          aiRemaining={aiRemaining}
          onRefreshAIQuota={onRefreshAIQuota}
          hasRegisteredProfile={hasRegisteredProfile}
          onRequireProfile={onRecalculate}
          onOpenPaywall={onOpenPaywall}
        />
    );
  }

  return (
    <ScrollView contentContainerStyle={s.pageContent} showsVerticalScrollIndicator={false}>
      {pageNav}
      <Animated.View
        style={[
          s.homeEntryDeck,
          {
            transform: [{ translateY: homeDeckBreath.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) }],
          },
        ]}
      >
        <Animated.View
          style={[
            s.homeEntryDeckGlow,
            {
              opacity: homeDeckBreath.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }),
              transform: [{ scale: homeDeckBreath.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1.03] }) }],
            },
          ]}
        />
        <Animated.View
          style={{
            transform: [{ translateY: homePrimaryBreath.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }],
          }}
        >
          <TouchableOpacity onPress={handleAiEntryPress} style={[s.aiEntryButton, s.aiEntryPrimaryButton, !hasRegisteredProfile && s.aiEntryButtonLocked]} activeOpacity={0.94}>
            <Animated.View
              style={[
                s.aiEntryJadeGlow,
                {
                  opacity: homePrimaryBreath.interpolate({ inputRange: [0, 1], outputRange: [0.34, 0.62] }),
                  transform: [{ scale: homePrimaryBreath.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.04] }) }],
                },
              ]}
            />
            <Animated.View
              style={[
                s.aiEntryJadeGlowSoft,
                {
                  opacity: homePrimaryBreath.interpolate({ inputRange: [0, 1], outputRange: [0.24, 0.46] }),
                  transform: [{ scale: homePrimaryBreath.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1.06] }) }],
                },
              ]}
            />
            <View style={s.aiEntryAura} />
            <View style={s.aiEntryAuraSecondary} />
            <View style={s.aiEntryOrbitLarge} />
            <View style={s.aiEntryOrbitSmall} />
            <View style={s.aiEntryTopRow}>
              <View style={s.aiEntryIconWrap}>
                <Text style={s.aiEntryIcon}>{'✦'}</Text>
              </View>
              <View style={s.aiEntryMetaPill}>
                <Text style={s.aiEntryMetaPillText}>{hasRegisteredProfile ? (isPremium ? '无限使用' : `今日剩余 ${aiRemaining} 次`) : '需先填完整资料'}</Text>
              </View>
            </View>
            <Text style={s.aiEntryText}>{'明己AI先生'}</Text>
            <Text style={s.aiEntrySubline}>{'明己者明 / 知时者智 / 行动者胜'}</Text>
            <Text style={s.aiEntryBody}>{hasRegisteredProfile ? '结合你的个人画像、当前状态和正在思考的话题，给出更贴身的回应与建议。' : '需要先填写姓名、出生日期、时分、性别与出生地，系统才能生成可用的个人画像，再开启 AI 陪伴。'}</Text>
            <View style={s.aiEntryFooter}>
              <View style={s.aiEntryActionPill}>
                <Text style={s.aiEntryAction}>{hasRegisteredProfile ? '开始对话' : '先去建立资料'}</Text>
                <Text style={s.aiEntryArrow}>{'→'}</Text>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
        <View style={[s.homeEntrySecondaryRow, isCompactHomeCards && s.homeEntrySecondaryRowCompact]}>
          <Animated.View
            style={[
              s.homeEntrySecondaryAnimated,
              isCompactHomeCards && s.homeEntrySecondaryAnimatedCompact,
              {
                transform: [{ translateY: homeSecondaryBreath.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) }],
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => {
                if (!hasRegisteredProfile) {
                  onRecalculate?.();
                  return;
                }
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setActiveToolPage('divination');
              }}
              style={[s.aiEntryButton, s.homeEntrySecondaryCard, isCompactHomeCards && s.homeEntrySecondaryCardCompact, s.divinationEntryButton, !hasRegisteredProfile && s.aiEntryButtonLocked]}
              activeOpacity={0.94}
            >
              <View style={[s.aiEntryAura, s.divinationEntryAura]} />
              <View style={[s.aiEntryAuraSecondary, s.divinationEntryAuraSecondary]} />
              <View style={[s.aiEntryOrbitLarge, s.divinationEntryOrbitLarge]} />
              <View style={[s.aiEntryOrbitSmall, s.divinationEntryOrbitSmall]} />
              <View style={s.aiEntryTopRow}>
                <View style={[s.aiEntryIconWrap, s.divinationEntryIconWrap]}>
                  <Text style={s.aiEntryIcon}>{'◈'}</Text>
                </View>
                <View style={[s.aiEntryMetaPill, s.divinationEntryMetaPill]}>
                  <Text style={s.aiEntryMetaPillText}>{hasRegisteredProfile ? '起一卦看当下' : '需先填完整资料'}</Text>
                </View>
              </View>
              <Text style={[s.aiEntryText, s.homeEntrySecondaryTitle, isCompactHomeCards && s.homeEntrySecondaryTitleCompact]}>{'明己一卦'}</Text>
              <Text style={[s.aiEntrySubline, s.homeEntrySecondarySubline]}>{'小六壬断眼前 / 先看势 / 再看机'}</Text>
              <Text style={[s.aiEntryBody, s.homeEntrySecondaryBody]}>{hasRegisteredProfile ? '适合问眼前这件事该不该动、卡点在哪、这一手该往哪边推。' : '先建立完整资料，再让这一卦真正贴着你的命盘与状态落下来。'}</Text>
              <View style={[s.aiEntryFooter, s.homeEntrySecondaryFooter]}>
                <View style={[s.aiEntryActionPill, s.divinationEntryActionPill]}>
                  <Text style={s.aiEntryAction}>{hasRegisteredProfile ? '进入明己一卦' : '先去建立资料'}</Text>
                  <Text style={s.aiEntryArrow}>{'→'}</Text>
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
          <Animated.View
            style={[
              s.homeEntrySecondaryAnimated,
              isCompactHomeCards && s.homeEntrySecondaryAnimatedCompact,
              {
                transform: [{ translateY: homeSecondaryBreath.interpolate({ inputRange: [0, 1], outputRange: [-1, 2] }) }],
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => {
                if (!hasRegisteredProfile) {
                  onRecalculate?.();
                  return;
                }
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setActiveToolPage('dream');
              }}
              style={[s.aiEntryButton, s.homeEntrySecondaryCard, isCompactHomeCards && s.homeEntrySecondaryCardCompact, s.dreamEntryButton, !hasRegisteredProfile && s.aiEntryButtonLocked]}
              activeOpacity={0.94}
            >
              <View style={[s.aiEntryAura, s.dreamEntryAura]} />
              <View style={[s.aiEntryAuraSecondary, s.dreamEntryAuraSecondary]} />
              <View style={[s.aiEntryOrbitLarge, s.dreamEntryOrbitLarge]} />
              <View style={[s.aiEntryOrbitSmall, s.dreamEntryOrbitSmall]} />
              <View style={s.aiEntryTopRow}>
                <View style={[s.aiEntryIconWrap, s.dreamEntryIconWrap]}>
                  <Text style={s.aiEntryIcon}>{'☾'}</Text>
                </View>
                <View style={[s.aiEntryMetaPill, s.dreamEntryMetaPill]}>
                  <Text style={s.aiEntryMetaPillText}>{hasRegisteredProfile ? '拆梦里的象' : '需先填完整资料'}</Text>
                </View>
              </View>
              <Text style={[s.aiEntryText, s.homeEntrySecondaryTitle, isCompactHomeCards && s.homeEntrySecondaryTitleCompact]}>{'明己解梦'}</Text>
              <Text style={[s.aiEntrySubline, s.homeEntrySecondarySubline]}>{'周公取象 / 心理照见 / 回到现实'}</Text>
              <Text style={[s.aiEntryBody, s.homeEntrySecondaryBody]}>
                {hasRegisteredProfile
                  ? '把梦里的水、火、人、物与现实心事一起拆开，先看象，再回到你眼下的情绪与处境。'
                  : '先建立完整资料，这样解梦时，判断会更贴着你的个人状态与近期心绪。'}
              </Text>
              <View style={[s.aiEntryFooter, s.homeEntrySecondaryFooter]}>
                <View style={[s.aiEntryActionPill, s.dreamEntryActionPill]}>
                  <Text style={s.aiEntryAction}>{hasRegisteredProfile ? '进入明己解梦' : '先去建立资料'}</Text>
                  <Text style={s.aiEntryArrow}>{'→'}</Text>
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Animated.View>
      {showInstallGuide ? (
        <View style={s.pwaInstallCard}>
          <View style={s.pwaInstallCopy}>
            <Text style={s.pwaInstallEyebrow}>{'可安装 Web App'}</Text>
            <Text style={s.pwaInstallTitle}>{'把 MingMe 加到主屏幕'}</Text>
            <Text style={s.pwaInstallBody}>
              {pwaInstallState.platform === 'ios'
                ? (pwaInstallState.safari
                  ? '像 App 一样独立打开，下次更容易接上上次那件事。请点底部“分享”→“添加到主屏幕”。'
                  : '建议先用 Safari 打开当前页面，再点“分享”→“添加到主屏幕”，这样才能像 App 一样独立进入。')
                : '安装到桌面后，打开更快，也更方便回来看上次的判断和动作。'}
            </Text>
          </View>
          <TouchableOpacity style={s.pwaInstallButton} onPress={handleInstallPress} activeOpacity={0.9}>
            <Text style={s.pwaInstallButtonText}>
              {pwaInstallState.platform === 'android' && pwaInstallState.canPrompt
                ? '立即安装'
                : (pwaInstallState.platform === 'ios' ? '添加到桌面' : '查看安装步骤')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <Sheet
        visible={pwaInstallSheetVisible}
        onClose={() => setPwaInstallSheetVisible(false)}
        title={pwaInstallState.platform === 'android' ? '安装 MingMe' : '添加到主屏幕'}
        subtitle={pwaInstallState.platform === 'android' ? '装到桌面后，回来继续会更顺。' : '按这三步完成桌面安装'}
        closeLabel="返回"
      >
        <View style={s.installSheetHero}>
          <Text style={s.installSheetHeroTitle}>
            {pwaInstallState.platform === 'android' ? '把 MingMe 装到桌面' : '把 MingMe 放到桌面'}
          </Text>
          <Text style={s.installSheetHeroBody}>
            {pwaInstallState.platform === 'android'
              ? '装好以后，下次不用再找浏览器入口，直接点桌面图标就能接着聊。'
              : '添加到主屏幕后，会像 App 一样独立打开，也更容易接上刚才那件事。'}
          </Text>
        </View>
        {pwaInstallState.platform === 'android' ? (
          <View style={s.installStepList}>
            <View style={s.installStepCard}>
              <Text style={s.installStepIndex}>1</Text>
              <Text style={s.installStepText}>
                {pwaInstallState.canPrompt ? '点下面的“立即安装”，如果浏览器弹出安装框，直接确认。' : '点浏览器右上角菜单。'}
              </Text>
            </View>
            <View style={s.installStepCard}>
              <Text style={s.installStepIndex}>2</Text>
              <Text style={s.installStepText}>
                {pwaInstallState.canPrompt ? '如果没有弹安装框，再到浏览器菜单里找“安装应用”或“添加到主屏幕”。' : '选择“安装应用”“添加到主屏幕”或“安装 MingMe”。'}
              </Text>
            </View>
            <View style={s.installStepCard}>
              <Text style={s.installStepIndex}>3</Text>
              <Text style={s.installStepText}>回到桌面，从 MingMe 图标打开，就能像 App 一样继续聊天。</Text>
            </View>
          </View>
        ) : (
          <View style={s.installStepList}>
            <View style={s.installStepCard}>
              <Text style={s.installStepIndex}>1</Text>
              <Text style={s.installStepText}>{pwaInstallState.safari ? '点 Safari 底部“分享”。' : '先用 Safari 打开当前页面。'}</Text>
            </View>
            <View style={s.installStepCard}>
              <Text style={s.installStepIndex}>2</Text>
              <Text style={s.installStepText}>{pwaInstallState.safari ? '在分享面板里找到“添加到主屏幕”。' : '然后点“分享”→“添加到主屏幕”。'}</Text>
            </View>
            <View style={s.installStepCard}>
              <Text style={s.installStepIndex}>3</Text>
              <Text style={s.installStepText}>回到桌面，从 MingMe 图标进入，以后就能像 App 一样独立打开。</Text>
            </View>
          </View>
        )}
        <View style={s.installSheetActions}>
          {pwaInstallState.platform === 'android' && pwaInstallState.canPrompt ? (
            <TouchableOpacity
              style={s.installSheetPrimaryButton}
              onPress={async () => {
                const installed = await promptPwaInstall();
                if (installed) {
                  setPwaInstallSheetVisible(false);
                  setPwaInstallDismissed(true);
                }
              }}
              activeOpacity={0.9}
            >
              <Text style={s.installSheetPrimaryButtonText}>立即安装</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={s.installSheetGhostButton}
            onPress={() => setPwaInstallSheetVisible(false)}
            activeOpacity={0.9}
          >
            <Text style={s.installSheetGhostButtonText}>我知道了</Text>
          </TouchableOpacity>
        </View>
      </Sheet>
      <SmartToolsHub
        isPremium={isPremium}
        aiRemaining={aiRemaining}
        hasRegisteredProfile={hasRegisteredProfile}
        onRequireProfile={onRecalculate}
        onOpenTool={(key) => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setActiveToolPage(key);
        }}
      />
    </ScrollView>
  );
}

function TongshengTab(props) {
  const {
    pageNav,
    result,
    profile,
    fortuneCalendar,
    calSummary,
    weeklyActions,
    onOpenTodayDetail,
    onOpenCustomDetail,
    onOpenTodayGuides,
    isPremium,
  } = props;

  const today = findTodayCalendarCell(fortuneCalendar, result);
  const weekly = getResolvedWeeklyActions(weeklyActions);
  const hasRegisteredProfile = Boolean(
    result &&
    String(profile?.nickname || '').trim() &&
    String(profile?.year || '').trim() &&
    String(profile?.month || '').trim() &&
    String(profile?.day || '').trim() &&
    String(profile?.hour || '').trim() &&
    String(profile?.minute || '').trim() &&
    String(profile?.gender || '').trim() &&
    String(profile?.city || '').trim()
  );
  const todayGuideCards = useMemo(() => buildTodayGuideCards({ today, result, weekly, profile }), [today, result, weekly, profile]);
  const todayTongsheng = useMemo(
    () => (
      hasRegisteredProfile && isPremium
        ? buildTodayTongshengData({ today, result, weekly, profile, calSummary })
        : null
    ),
    [calSummary, hasRegisteredProfile, isPremium, profile, result, today, weekly]
  );

  if (!todayTongsheng) {
    return (
      <ScrollView contentContainerStyle={s.pageContent} showsVerticalScrollIndicator={false}>
        {pageNav}
        <Card style={s.tongshengPageCard}>
          <View style={s.tongshengPageHeader}>
            <Text style={s.tongshengPageEyebrow}>{'今日通胜'}</Text>
            <Text style={s.tongshengPageTitle}>{'先完成会员资料，再看今日通胜'}</Text>
            <Text style={s.tongshengPageBody}>{'今日通胜会把当天黄历和你的命盘节奏合在一起，所以要先有完整资料，才会更贴身。'}</Text>
          </View>
          <Text style={s.tongshengPageLead}>
            {'等资料完整后，你每天打开明己，都会先落到这里，先看当天适合怎么决策、怎么出行、怎么借势。'}
          </Text>
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.pageContent} showsVerticalScrollIndicator={false}>
      {pageNav}
      <TodayTongshengCard
        data={todayTongsheng}
        onOpenDetail={onOpenCustomDetail}
        onOpenGuides={() => onOpenTodayGuides?.(todayGuideCards)}
        onOpenCalendar={onOpenTodayDetail}
      />
      <Card style={s.tongshengPageCard}>
        <View style={s.tongshengPageHeader}>
          <Text style={s.tongshengPageEyebrow}>{'今日总览'}</Text>
          <Text style={s.tongshengPageTitle}>{'今天先顺着这五条线走'}</Text>
          <Text style={s.tongshengPageBody}>{'先把大方向看清，再去做选择，通胜页会更像你每天打开明己的第一张行动地图。'}</Text>
        </View>
        <View style={s.tongshengPageChecklist}>
          {todayTongsheng.sections.map((item, index) => (
            <View key={item.key} style={s.tongshengPageChecklistItem}>
              <View style={s.tongshengPageChecklistBadge}>
                <Text style={s.tongshengPageChecklistBadgeText}>{index + 1}</Text>
              </View>
              <View style={s.tongshengPageChecklistCopy}>
                <Text style={s.tongshengPageChecklistTitle}>{item.title}</Text>
                <Text style={s.tongshengPageChecklistBody}>{item.summary}</Text>
              </View>
            </View>
          ))}
        </View>
      </Card>
    </ScrollView>
  );
}

function ProfileTab({ pageNav, profile, result, aiText, aiLoading, onGenerateAI, onPressTenGod, onPressShenShaItem, onPressShenShaList }) {
  const elements = useMemo(() => ['\u91d1', '\u6728', '\u6c34', '\u706b', '\u571f'].map((element) => ({
    element,
    ratio: Number(result?.wuXingRatio?.[element] || 0),
    count: Number(result?.wxCount?.[element] || result?.wuXingCount?.[element] || 0),
  })), [result]);
  const structureObservations = useMemo(() => collectStructureObservationCards(result), [result]);
  const groupedStructureObservations = useMemo(
    () => STRUCTURE_GROUPS.map((group) => ({
      ...group,
      items: sortStructureItems(structureObservations.filter((item) => getStructureGroupKey(item) === group.key)),
    })).filter((group) => group.items.length),
    [structureObservations]
  );
  const structureOverview = useMemo(() => buildStructureOverview(groupedStructureObservations), [groupedStructureObservations]);
  const [expandedStructureGroups, setExpandedStructureGroups] = useState({});
  const toggleStructureGroup = useCallback((groupKey) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedStructureGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  }, []);
  const info = [
    ['\u59d3\u540d', profile?.nickname || '--'],
    ['\u6027\u522b', profile?.gender === 'female' ? '\u5973' : '\u7537'],
    ['\u519c\u5386', result?.lunarDateStr || '--'],
    ['\u9633\u5386', formatSolarBirth(result)],
    ['\u51fa\u751f\u5730\u533a', profile?.city || '--'],
    ['\u771f\u592a\u9633\u65f6', toText(result?.correctedTime)],
    ['\u771f\u592a\u9633\u504f\u79fb', result?.trueSolarOffsetMin ? `${result.trueSolarOffsetMin > 0 ? '+' : ''}${Number(result.trueSolarOffsetMin).toFixed(1)} \u5206\u949f` : '--'],
    ['\u65e5\u4e3b\u5c5e\u6027', result?.dayGan || '--'],
  ];
  return (
    <ScrollView contentContainerStyle={s.pageContent} showsVerticalScrollIndicator={false}>
      {pageNav}
      <PillarMatrix result={result} onPressTenGod={onPressTenGod} onPressShenShaItem={onPressShenShaItem} onPressShenShaList={onPressShenShaList} />
      <Card>
        <SectionHeader eyebrow={S.basics} title={S.basicInfo} />
        {info.map(([label, value]) => <View key={label} style={s.infoRow}><Text style={s.infoRowLabel}>{label}</Text><Text style={s.infoRowValue}>{value}</Text></View>)}
      </Card>
      <Card>
        <SectionHeader eyebrow={'\u79f0\u9aa8\u53c2\u8003'} title={'\u8881\u5929\u7f61\u79f0\u9aa8'} />
        <View style={s.infoRow}><Text style={s.infoRowLabel}>{'\u603b\u9aa8\u91cd'}</Text><Text style={s.infoRowValue}>{toText(result?.chengGu?.totalText || result?.chengGu?.totalWeightText || result?.chengGu?.weightText || result?.chengGu?.weight)}</Text></View>
        <View style={s.infoRow}><Text style={s.infoRowLabel}>{'\u547d\u7406\u5c42\u7ea7'}</Text><Text style={s.infoRowValue}>{toText(result?.chengGu?.level || result?.chengGu?.tier)}</Text></View>
        <View style={s.infoRow}><Text style={s.infoRowLabel}>{'\u5e74 / \u6708 / \u65e5 / \u65f6'}</Text><Text style={s.infoRowValue}>{`${toText(result?.chengGu?.yearText)} / ${toText(result?.chengGu?.monthText)} / ${toText(result?.chengGu?.dayText)} / ${toText(result?.chengGu?.hourText)}`}</Text></View>
        {Number(result?.chengGu?.leapBonusQian || 0) > 0 ? <View style={s.infoRow}><Text style={s.infoRowLabel}>{'\u95f0\u6708\u52a0\u9aa8'}</Text><Text style={s.infoRowValue}>{toText(result?.chengGu?.leapBonusText)}</Text></View> : null}
        <Text style={s.paragraph}>{toText(result?.chengGu?.summary || result?.chengGu?.description || result?.chengGu?.modern)}</Text>
        <Text style={[s.paragraph, { marginTop: 8 }]}>{toText(result?.chengGu?.modern)}</Text>
        {result?.chengGu?.geJue || result?.chengGu?.verse ? <Text style={[s.paragraph, { marginTop: 8 }]}>{toText(result?.chengGu?.geJue || result?.chengGu?.verse)}</Text> : null}
      </Card>
      <Card>
        <SectionHeader eyebrow={'\u7ed3\u6784\u89c2\u5bdf'} title={'\u5e72\u652f\u5173\u7cfb\u89e3\u6790'} body={'\u8fd9\u91cc\u4f1a\u628a\u5408\u3001\u51b2\u3001\u5211\u3001\u5bb3\u3001\u7834\u548c\u5176\u4ed6\u7ed3\u6784\u5173\u7cfb\u5355\u72ec\u5217\u51fa\u3002'} />
        <View style={s.structureOverviewCard}>
          <Text style={s.structureOverviewTitle}>{structureOverview.title}</Text>
          <Text style={s.structureOverviewBody}>{structureOverview.body}</Text>
          {structureOverview.chips?.length ? (
            <View style={s.structureOverviewChips}>
              {structureOverview.chips.map((chip) => (
                <View key={chip} style={s.structureOverviewChip}>
                  <Text style={s.structureOverviewChipText}>{chip}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
        {groupedStructureObservations.length ? groupedStructureObservations.map((group) => {
          const isExpanded = !!expandedStructureGroups[group.key];
          return (
            <View key={group.key} style={s.structureGroupBlock}>
              <TouchableOpacity activeOpacity={0.88} style={s.structureGroupToggle} onPress={() => toggleStructureGroup(group.key)}>
                <View style={s.structureGroupHeader}>
                  <View style={s.structureGroupTitleWrap}>
                    <Text style={s.structureGroupTitle}>{group.title}</Text>
                    <Text style={s.structureGroupCount}>{`${group.items.length} 条`}</Text>
                  </View>
                  <Text style={s.structureGroupChevron}>{isExpanded ? '收起' : '展开'}</Text>
                </View>
                <Text style={s.structureGroupConclusion}>{group.conclusion}</Text>
              </TouchableOpacity>
              {isExpanded ? (
                <>
                  <Text style={s.structureGroupModern}>{group.modern}</Text>
                  <Text style={s.structureGroupBody}>{group.body}</Text>
                  {group.items.map((item, index) => (
                    <View key={`${group.key}-${item?.name || 'combo'}-${index}`} style={s.comboCard}>
                      <View style={s.comboTop}>
                        <Text style={s.comboName}>{toText(item?.name || item?.type)}</Text>
                        <Text style={s.comboType}>{toText(item?.type)}</Text>
                      </View>
                      {!!toText(item?.pillars) && toText(item?.pillars) !== '--' ? <Text style={s.comboPillars}>{toText(item?.pillars)}</Text> : null}
                      <Text style={s.comboDesc}>{toText(item?.description || item?.reason)}</Text>
                      <Text style={s.comboAdvice}>{getStructureActionAdvice(item)}</Text>
                    </View>
                  ))}
                </>
              ) : null}
            </View>
          );
        }) : <Text style={s.paragraph}>{'\u5f53\u524d\u8fd9\u7ec4\u547d\u76d8\u8fd8\u6ca1\u6709\u663e\u793a\u51fa\u7a81\u51fa\u7684\u5e72\u652f\u7ed3\u6784\u5173\u7cfb\u3002'}</Text>}
      </Card>
      <Card>
        <SectionHeader eyebrow={'\u4e94\u884c\u5206\u5e03'} title={S.fiveElements} />
        {elements.map((item) => (
          <View key={item.element} style={s.elementRow}>
            <Text style={[s.elementLabel, { color: ELEMENT_COLORS[item.element] }]}>{item.element}</Text>
            <View style={s.track}><View style={[s.fill, { width: `${Math.max(item.ratio * 100, 3)}%`, backgroundColor: ELEMENT_COLORS[item.element] }]} /></View>
            <Text style={s.elementValue}>{item.ratio ? `${(item.ratio * 100).toFixed(1)}%` : `${item.count}\u4e2a`}</Text>
          </View>
        ))}
      </Card>
      <Card>
        <SectionHeader eyebrow={'AI \u6df1\u8bfb'} title={'\u66f4\u5b8c\u6574\u7684\u73b0\u4ee3\u89e3\u8bfb'} right={<TouchableOpacity onPress={onGenerateAI}><Text style={s.linkText}>{aiLoading ? '\u751f\u6210\u4e2d...' : '\u5237\u65b0'}</Text></TouchableOpacity>} />
        <Text style={s.paragraph}>{toText(aiText?.summary || aiText?.text || '\u70b9\u51fb\u5237\u65b0\u540e\uff0c\u8fd9\u91cc\u4f1a\u751f\u6210\u66f4\u5b8c\u6574\u7684 AI \u89e3\u8bfb\u3002')}</Text>
      </Card>
    </ScrollView>
  );
}

function StageTab({ pageNav, result, fortuneCalendar, calSummary, profile, reviewMode, weeklyActions, selectedDay, onSelectDay, onCloseDayDetail, oneLineSummary, calendarEntries, notificationPrefs, onSaveCalendarNote, onToggleCalendarReminder, onUpdateCalendarReminderTime, onToggleCalendarNoteDone, quickAddMode, onClearQuickAddMode }) {
  const availableMonths = useMemo(() => buildAvailableMonths(fortuneCalendar), [fortuneCalendar]);
  const [monthIndex, setMonthIndex] = useState(0);
  const currentMonth = availableMonths[monthIndex] || availableMonths[0] || null;
  const visibleDays = useMemo(() => {
    if (!currentMonth) return getCalendarCells(fortuneCalendar);
    return buildFullMonthFortuneDays(currentMonth, fortuneCalendar, result);
  }, [currentMonth, fortuneCalendar, result]);
  const monthCalendar = useMemo(() => buildMonthCalendar(currentMonth, visibleDays), [currentMonth, visibleDays]);
  const currentDaYunLabel = useMemo(() => getCurrentDaYunLabel(result), [result]);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteType, setNoteType] = useState('todo');
  const selectedEntry = selectedDay ? calendarEntries?.[getCalendarEntryKey(selectedDay)] || {} : {};
  const selectedNoteItems = getCalendarNoteItems(selectedEntry);
  const selectedNotes = selectedNoteItems.map((item) => item.text);
  const reminderConfig = getReminderTimeConfig(selectedEntry, notificationPrefs);
  const reminderTimeText = `${`${reminderConfig.hour}`.padStart(2, '0')}:${`${reminderConfig.minute}`.padStart(2, '0')}`;

  useEffect(() => {
    setNoteDraft('');
    setNoteType('todo');
  }, [selectedDay?.key, selectedEntry?.notes?.length]);

  useEffect(() => {
    if (!selectedDay || !quickAddMode) return;
    setNoteType('todo');
  }, [selectedDay, quickAddMode]);

  useEffect(() => {
    if (!availableMonths.length) return;
    const selectedMonthKey = selectedDay ? `${selectedDay.year}-${selectedDay.month}` : '';
    if (!selectedMonthKey) return;
    const nextIndex = availableMonths.findIndex((item) => item.key === selectedMonthKey);
    if (nextIndex >= 0) setMonthIndex(nextIndex);
  }, [availableMonths, selectedDay]);

  useEffect(() => {
    if (!availableMonths.length || selectedDay) return;
    const today = new Date();
    const todayMonthKey = `${today.getFullYear()}-${today.getMonth() + 1}`;
    const nextIndex = availableMonths.findIndex((item) => item.key === todayMonthKey);
    if (nextIndex >= 0) setMonthIndex(nextIndex);
  }, [availableMonths, selectedDay]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.pageContent} showsVerticalScrollIndicator={false}>
        {pageNav}
        <Card>
          <SectionHeader
            eyebrow={reviewMode ? '本月安排' : '月度行动日历'}
            title={`${reviewMode ? '行动日历' : S.actionCalendar} ${monthCalendar.title}`}
            body={'点击任意日期可查看详情，并可补充记事与提醒。'}
            right={availableMonths.length > 1 ? (
              <View style={s.calendarSwitchRow}>
                <TouchableOpacity disabled={monthIndex <= 0} onPress={() => setMonthIndex((prev) => Math.max(0, prev - 1))} style={[s.calendarSwitchButton, monthIndex <= 0 && s.calendarSwitchButtonDisabled]}>
                  <Text style={[s.calendarSwitchText, monthIndex <= 0 && s.calendarSwitchTextDisabled]}>{'‹ 上月'}</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={monthIndex >= availableMonths.length - 1} onPress={() => setMonthIndex((prev) => Math.min(availableMonths.length - 1, prev + 1))} style={[s.calendarSwitchButton, monthIndex >= availableMonths.length - 1 && s.calendarSwitchButtonDisabled]}>
                  <Text style={[s.calendarSwitchText, monthIndex >= availableMonths.length - 1 && s.calendarSwitchTextDisabled]}>{'下月 ›'}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          />
          <View style={s.weekHeaderRow}>
            {['\u65e5', '\u4e00', '\u4e8c', '\u4e09', '\u56db', '\u4e94', '\u516d'].map((item) => <Text key={item} style={s.weekHeaderText}>{item}</Text>)}
          </View>
          {monthCalendar.weeks.map((week, weekIndex) => (
            <View key={`week-${weekIndex}`} style={s.calendarWeek}>
              {week.map((item) => item.empty ? <View key={item.key} style={[s.dayCell, s.dayCellEmpty]} /> : (
                  <TouchableOpacity key={item.key} style={[s.dayCell, { backgroundColor: item.surfaceColor || '#FFF', borderColor: item.borderColor || C.line }, isTodayCell(item) && s.dayCellToday]} onPress={() => onSelectDay?.(item)} onLongPress={() => onSelectDay?.(item, { quickAdd: true })} delayLongPress={220}>
                    <View style={s.daySignalRow}>
                      <View style={[s.daySignalLine, { flex: item.yiFlex || 1 }, s.daySignalLineYi, toText(item.yi) === '--' && s.daySignalLineMuted]} />
                      <View style={[s.daySignalLine, { flex: item.jiFlex || 1 }, s.daySignalLineJi, toText(item.ji) === '--' && s.daySignalLineMuted]} />
                    </View>
                    <View style={s.dayCornerHints}>
                      {toText(item.yi) !== '--' ? <View style={[s.dayCornerHint, s.dayCornerHintYi]} /> : <View />}
                      {toText(item.ji) !== '--' ? <View style={[s.dayCornerHint, s.dayCornerHintJi]} /> : null}
                    </View>
                    {isTodayCell(item) ? (
                      <>
                        <View style={s.dayTodayGlow} />
                        <View style={s.dayTodayBadge}>
                          <Text style={s.dayTodayBadgeText}>今</Text>
                        </View>
                      </>
                    ) : null}
                    <Text style={[s.dayNum, isTodayCell(item) && s.dayNumToday]}>{item.day}</Text>
                    <View style={[s.dayDot, { backgroundColor: item.tone }]} />
                    <View style={s.dayLabelWrap}>
                    {formatCalendarCellLabel(item.label).map((part, partIndex) => part ? (
                      <Text key={`${item.key}-label-${partIndex}`} style={s.dayLabel}>{part}</Text>
                    ) : null)}
                  </View>
                    {(calendarEntries?.[getCalendarEntryKey(item)]?.note || calendarEntries?.[getCalendarEntryKey(item)]?.reminderEnabled) ? (
                      <View style={s.dayBadgeRow}>
                        {getCalendarNoteItems(calendarEntries?.[getCalendarEntryKey(item)]).length ? <Text style={s.dayBadge}>{`${getCalendarNoteItems(calendarEntries?.[getCalendarEntryKey(item)]).length}记`}</Text> : null}
                        {calendarEntries?.[getCalendarEntryKey(item)]?.reminderEnabled ? <Text style={[s.dayBadge, s.dayBadgeReminder]}>⏰</Text> : null}
                      </View>
                    ) : null}
                    {getCalendarNoteItems(calendarEntries?.[getCalendarEntryKey(item)]).length && !calendarEntries?.[getCalendarEntryKey(item)]?.reminderEnabled ? (
                      <Text numberOfLines={1} ellipsizeMode="tail" style={s.dayNotePreview}>{getCalendarNoteItems(calendarEntries[getCalendarEntryKey(item)])[0]?.text}</Text>
                    ) : null}
                  </TouchableOpacity>
              ))}
            </View>
          ))}
        </Card>
        <Card><SectionHeader eyebrow={reviewMode ? '阶段提示' : S.stageHelper} title={reviewMode ? '时间提示' : S.timingNotes} /><Text style={s.paragraph}>{result?.nextJieqi ? `\u4e0b\u4e00\u6b21\u8282\u594f\u53d8\u5316\uff1a${toText(result?.nextJieqi?.name || result?.nextJieqi?.next?.name)}\uff0c\u7ea6 ${toText(result?.nextJieqi?.days)} \u5929\u540e\u3002` : '\u8fd9\u91cc\u4f1a\u663e\u793a\u8282\u594f\u63d0\u793a\u3002'}</Text></Card>
        <Card><SectionHeader eyebrow={reviewMode ? '阶段提示' : S.stageHelper} title={reviewMode ? '当前建议' : S.currentState} /><Text style={s.paragraph}>{toText(getClassicalStageSummary(result, profile, calSummary))}</Text></Card>
        <Card><SectionHeader eyebrow={reviewMode ? '阶段提示' : S.stageHelper} title={reviewMode ? '平衡建议' : S.balanceAdvice} /><Text style={s.paragraph}>{toText(result?.useGodAnalysis?.strategy || '\u5148\u8865\u8db3\u80fd\u91cf\uff0c\u518d\u505a\u5173\u952e\u5224\u65ad\u3002')}</Text></Card>
        {reviewMode ? <RelationshipInsightCard profile={profile} weeklyActions={weeklyActions} result={result} /> : null}
        <Card>
          <SectionHeader eyebrow={reviewMode ? '长期回看' : S.stageMap} title={reviewMode ? '阶段回看' : '\u5927\u8fd0\u4e0e\u6d41\u5e74'} />
          <View style={s.infoStack}><Text style={s.infoStackLabel}>{reviewMode ? '\u5f53\u524d\u9636\u6bb5' : '\u5f53\u524d\u5927\u8fd0'}</Text><Text style={s.infoStackValue}>{currentDaYunLabel}</Text></View>
          <View style={s.infoStack}><Text style={s.infoStackLabel}>{reviewMode ? '\u5f53\u524d\u5e74\u5ea6' : '\u5f53\u524d\u6d41\u5e74'}</Text><Text style={s.infoStackValue}>{toText(result?.liuNianPillar?.ganZhi || result?.luckAnalysis?.liunianTheme)}</Text></View>
          <View style={s.infoStack}><Text style={s.infoStackLabel}>{'\u9636\u6bb5\u63d0\u793a'}</Text><Text style={s.infoStackValue}>{toText(result?.narrative?.stageSummary || calSummary?.summary)}</Text></View>
        </Card>
        <Card style={s.summaryCard}>
          <View style={s.summaryAura} />
          <Text style={s.summaryEyebrow}>{reviewMode ? '核心建议' : S.coreSummary}</Text>
          <Text style={s.summaryTitle}>{toText(getClassicalCoreSummary(result, profile, oneLineSummary))}</Text>
          <Text style={s.summaryBody}>{toText(getClassicalStageSummary(result, profile, calSummary))}</Text>
        </Card>
      </ScrollView>
      <Sheet visible={!!selectedDay} onClose={onCloseDayDetail} title={selectedDay?.dateLabel || S.dayDetail} subtitle={reviewMode ? '' : (selectedDay?.pillar || '')} closeLabel="返回日历">
        {quickAddMode ? (
          <View style={s.quickAddBanner}>
            <Text style={s.quickAddBannerTitle}>{'快速新增模式'}</Text>
            <Text style={s.quickAddBannerBody}>{'你是通过长按日历进入的，现在可以直接补一条记事。'}</Text>
            <TouchableOpacity onPress={onClearQuickAddMode} style={s.quickAddBannerButton}>
              <Text style={s.quickAddBannerButtonText}>{'关闭快速新增'}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {selectedDay?.lunarInfo ? (
          <>
            <Text style={s.sheetBlockTitle}>{'黄历信息'}</Text>
            <View style={s.detailCard}>
              <View style={s.almanacHero}>
                <Text style={s.almanacLunarDate}>{selectedDay.lunarInfo.lunarDateText || '--'}</Text>
                <Text style={s.almanacGanzhi}>{`${selectedDay.lunarInfo.yearGanZhi || '--'}年 ${selectedDay.lunarInfo.monthGanZhi || '--'}月 ${selectedDay.lunarInfo.dayGanZhi || '--'}日`}</Text>
                <Text style={s.almanacSubline}>{`节气：${selectedDay.lunarInfo.solarTerm || '--'} · 彭祖：${selectedDay.lunarInfo.pengZu || '--'}`}</Text>
              </View>
              <View style={s.almanacMetaRow}>
                <View style={s.almanacMetaCard}>
                  <Text style={s.almanacMetaLabel}>{'宜'}</Text>
                  <Text style={s.almanacMetaValue}>{toText(selectedDay.lunarInfo.dayYi) || '--'}</Text>
                </View>
                <View style={s.almanacMetaCard}>
                  <Text style={s.almanacMetaLabel}>{'忌'}</Text>
                  <Text style={s.almanacMetaValue}>{toText(selectedDay.lunarInfo.dayJi) || '--'}</Text>
                </View>
              </View>
            </View>
          </>
        ) : null}
        <Text style={s.sheetBlockTitle}>{S.advice}</Text><Text style={s.paragraph}>{toText(selectedDay?.advice)}</Text>
        <Text style={s.sheetBlockTitle}>{S.yi}</Text><Text style={s.paragraph}>{getCalendarActionText(selectedDay, 'yi')}</Text>
        <Text style={s.sheetBlockTitle}>{S.ji}</Text><Text style={s.paragraph}>{getCalendarActionText(selectedDay, 'ji')}</Text>
        <Text style={s.sheetBlockTitle}>{S.goodHours}</Text><Text style={s.paragraph}>{formatGoodHours(selectedDay?.goodHours)}</Text>
        {Array.isArray(selectedDay?.hourlyLuck) && selectedDay.hourlyLuck.length ? (
          <>
            <Text style={s.sheetBlockTitle}>{'时辰干支与吉凶'}</Text>
            <View style={s.hourlyLuckList}>
              {selectedDay.hourlyLuck.slice(0, 12).map((item, index) => (
                <View key={`${item.ganZhi || item.zhi || index}-${index}`} style={s.hourlyLuckItem}>
                  <View style={s.hourlyLuckTop}>
                    <Text style={s.hourlyLuckTitle}>{`${item.zhi || '--'}时 · ${item.ganZhi || '--'}`}</Text>
                    <Text style={[s.hourlyLuckBadge, item.luck === '吉' ? s.hourlyLuckBadgeGood : s.hourlyLuckBadgeBad]}>
                      {item.luck || '--'}
                    </Text>
                  </View>
                  <Text style={s.hourlyLuckTime}>{`${formatHourRange(item)} · ${item.tianShen || '--'}`}</Text>
                  <Text style={s.hourlyLuckDetail}>{`宜：${formatHourYiJi(item.yi)}  忌：${formatHourYiJi(item.ji)}`}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}
        <Text style={s.sheetBlockTitle}>{S.direction}</Text><Text style={s.paragraph}>{toText(selectedDay?.luckyDirection || selectedDay?.jiFang?.ji)}</Text>
        <Text style={s.sheetBlockTitle}>{'我的记事'}</Text>
        {selectedNoteItems.length ? (
          <View style={s.dayNotesList}>
            {selectedNoteItems.map((item, index) => (
              <View key={item.id || `${item.text}-${index}`} style={s.dayNoteItem}>
                <TouchableOpacity onPress={() => onToggleCalendarNoteDone?.(selectedDay, item.id)} style={[s.dayNoteCheck, item.done && s.dayNoteCheckActive]}>
                  <Text style={[s.dayNoteCheckText, item.done && s.dayNoteCheckTextActive]}>{item.done ? '✓' : ''}</Text>
                </TouchableOpacity>
                <View style={s.dayNoteItemMain}>
                  <View style={s.dayNoteItemTop}>
                    <Text style={s.dayNoteTypeTag}>{CALENDAR_NOTE_TYPES.find((option) => option.key === item.type)?.label || '待办'}</Text>
                    <TouchableOpacity onPress={() => onSaveCalendarNote?.(selectedDay, null, { removeId: item.id })} style={s.dayNoteDeleteButton}>
                      <Text style={s.dayNoteDeleteText}>{'删除'}</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={[s.dayNoteItemText, item.done && s.dayNoteItemTextDone]}>{item.text}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}
        <View style={s.dayNoteTypeRow}>
          {CALENDAR_NOTE_TYPES.map((item) => (
            <TouchableOpacity key={item.key} style={[s.dayNoteTypeChip, noteType === item.key && s.dayNoteTypeChipActive]} onPress={() => setNoteType(item.key)}>
              <Text style={[s.dayNoteTypeChipText, noteType === item.key && s.dayNoteTypeChipTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          value={noteDraft}
          onChangeText={setNoteDraft}
          multiline
          maxLength={180}
          placeholder={'给这一天新增一条安排、待办或想法。'}
          placeholderTextColor={'rgba(20,51,58,0.34)'}
          style={s.dayNoteInput}
        />
        <TouchableOpacity style={s.dayNoteSaveButton} onPress={() => onSaveCalendarNote?.(selectedDay, noteDraft, { type: noteType })}>
          <Text style={s.dayNoteSaveText}>{noteDraft?.trim() ? '新增这条记事' : '输入内容后可新增'}</Text>
        </TouchableOpacity>
        {selectedNoteItems.length ? (
          <TouchableOpacity style={s.dayNoteClearButton} onPress={() => onSaveCalendarNote?.(selectedDay, '', { clearAll: true })}>
            <Text style={s.dayNoteClearText}>{'清空这一天的全部记事'}</Text>
          </TouchableOpacity>
        ) : null}
        <Text style={s.sheetBlockTitle}>{'提醒功能'}</Text>
        <Text style={s.paragraph}>{selectedEntry?.reminderEnabled ? `已开启提醒，将在当天 ${reminderTimeText} 提醒你。` : `可为这一天开启提醒，默认在 ${reminderTimeText} 提醒。`}</Text>
        <View style={s.reminderAdjustRow}>
          <View style={s.reminderAdjustCard}>
            <Text style={s.reminderAdjustLabel}>{'小时'}</Text>
            <View style={s.reminderAdjustControls}>
              <TouchableOpacity style={s.reminderAdjustButton} onPress={() => onUpdateCalendarReminderTime?.(selectedDay, { hour: (reminderConfig.hour + 23) % 24, minute: reminderConfig.minute })}>
                <Text style={s.reminderAdjustButtonText}>{'−'}</Text>
              </TouchableOpacity>
              <Text style={s.reminderAdjustValue}>{`${reminderConfig.hour}`.padStart(2, '0')}</Text>
              <TouchableOpacity style={s.reminderAdjustButton} onPress={() => onUpdateCalendarReminderTime?.(selectedDay, { hour: (reminderConfig.hour + 1) % 24, minute: reminderConfig.minute })}>
                <Text style={s.reminderAdjustButtonText}>{'+'}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={s.reminderAdjustCard}>
            <Text style={s.reminderAdjustLabel}>{'分钟'}</Text>
            <View style={s.reminderAdjustControls}>
              <TouchableOpacity style={s.reminderAdjustButton} onPress={() => onUpdateCalendarReminderTime?.(selectedDay, { hour: reminderConfig.hour, minute: (reminderConfig.minute + 55) % 60 })}>
                <Text style={s.reminderAdjustButtonText}>{'−'}</Text>
              </TouchableOpacity>
              <Text style={s.reminderAdjustValue}>{`${reminderConfig.minute}`.padStart(2, '0')}</Text>
              <TouchableOpacity style={s.reminderAdjustButton} onPress={() => onUpdateCalendarReminderTime?.(selectedDay, { hour: reminderConfig.hour, minute: (reminderConfig.minute + 5) % 60 })}>
                <Text style={s.reminderAdjustButtonText}>{'+'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <View style={s.reminderLeadRow}>
          {REMINDER_LEAD_OPTIONS.map((item) => (
            <TouchableOpacity key={item.value} style={[s.reminderLeadChip, reminderConfig.leadMinutes === item.value && s.reminderLeadChipActive]} onPress={() => onUpdateCalendarReminderTime?.(selectedDay, { leadMinutes: item.value })}>
              <Text style={[s.reminderLeadChipText, reminderConfig.leadMinutes === item.value && s.reminderLeadChipTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={s.reminderLeadRow}>
          {REMINDER_REPEAT_OPTIONS.map((item) => (
            <TouchableOpacity key={item.value} style={[s.reminderLeadChip, reminderConfig.repeatRule === item.value && s.reminderLeadChipActive]} onPress={() => onUpdateCalendarReminderTime?.(selectedDay, { repeatRule: item.value })}>
              <Text style={[s.reminderLeadChipText, reminderConfig.repeatRule === item.value && s.reminderLeadChipTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={[s.dayReminderButton, selectedEntry?.reminderEnabled && s.dayReminderButtonActive]} onPress={() => onToggleCalendarReminder?.(selectedDay)}>
          <Text style={[s.dayReminderButtonText, selectedEntry?.reminderEnabled && s.dayReminderButtonTextActive]}>{selectedEntry?.reminderEnabled ? '关闭这天提醒' : '开启这天提醒'}</Text>
        </TouchableOpacity>
      </Sheet>
    </View>
  );
}

const PREMIUM_VALUE_PILLARS = [
  {
    eyebrow: '持续更新',
    title: '不是一次性报告，而是长期跟踪',
    body: '会员内容会把命盘结果延伸到每月提醒、阶段变化和关键节奏，让用户有理由反复回来查看。',
  },
  {
    eyebrow: '现实翻译',
    title: '把专业术语翻成现实建议',
    body: '报告不只停留在专业名词上，而是会把这些结构翻成事业、财富、关系和情绪管理里的现实建议。',
  },
  {
    eyebrow: '行动导向',
    title: '从看懂自己，走到知道该怎么做',
    body: '会员内容强调“现在更适合推进什么、规避什么、等待什么”，比单纯吉凶判断更容易产生付费价值。',
  },
];

const PREMIUM_POPULAR_CONTENT = [
  '每月事业、财运、感情、健康提醒',
  '大运流年与阶段变化解读',
  '结构特点与现实提醒的双层说明',
  '关系模式与沟通雷区分析',
  '事业路径、财富方式与风险提示',
  '未来 3 个月关键节点与行动建议',
];

const PREMIUM_MEMBER_ROADMAP = [
  {
    phase: '基础会员',
    summary: '看懂自己',
    body: '解锁完整个人档案、结构重点说明、阶段主线提示和基础月度提醒。',
  },
  {
    phase: '高阶会员',
    summary: '开始做判断',
    body: '加入大运流年、事业财富专题、关系专题和关键日期提醒，更适合持续决策参考。',
  },
  {
    phase: '专业会员',
    summary: '获得长期陪伴',
    body: '适合做年度策略、专项问题深读和高意愿用户的专属咨询型服务。',
  },
];

function PremiumTab({ pageNav, memberTier, onOpenPaywall, result, profile, calSummary, fortuneCalendar, weeklyActions, memberRegistration }) {
  const isMember = memberTier && memberTier !== 'free';
  const hasRegistration = !!(memberRegistration?.nickname || memberRegistration?.city || memberRegistration?.focus || memberRegistration?.email || memberRegistration?.phone);
  const [selectedMemberTopic, setSelectedMemberTopic] = useState(null);
  const [expandedMemberGroups, setExpandedMemberGroups] = useState([]);
  const memberEntries = useMemo(
    () => buildMemberContentEntries(result, profile, calSummary, fortuneCalendar, weeklyActions),
    [result, profile, calSummary, fortuneCalendar, weeklyActions]
  );
  const groupedMemberEntries = useMemo(
    () => MEMBER_CONTENT_GROUPS.map((group) => ({
      ...group,
      items: memberEntries.filter((item) => item.group === group.key),
    })).filter((group) => group.items.length),
    [memberEntries]
  );
  const toggleMemberGroup = (groupKey) => {
    setExpandedMemberGroups((current) =>
      current.includes(groupKey) ? current.filter((item) => item !== groupKey) : [...current, groupKey]
    );
  };
  return (
    <ScrollView contentContainerStyle={[s.pageContent, { flexGrow: 1 }]} showsVerticalScrollIndicator={false}>
      {pageNav}
      <Card style={s.darkCard}>
        <Text style={s.darkEyebrow}>{S.premiumCenter}</Text>
        <Text style={s.darkTitle}>{memberTier === 'annual' ? '\u5f53\u524d\u5df2\u5f00\u901a\u5e74\u5ea6\u4f1a\u5458' : memberTier === 'monthly' ? '\u5f53\u524d\u5df2\u5f00\u901a\u6708\u5ea6\u4f1a\u5458' : '\u89e3\u9501\u66f4\u4e13\u4e1a\u3001\u66f4\u5b9e\u7528\u7684\u547d\u7406\u5185\u5bb9'}</Text>
        <Text style={s.darkBody}>{isMember ? '\u4f60\u73b0\u5728\u770b\u5230\u7684\u4e0d\u53ea\u662f\u57fa\u7840\u7ed3\u8bba\uff0c\u800c\u662f\u66f4\u5b8c\u6574\u7684\u4f1a\u5458\u5185\u5bb9\u4e0e\u957f\u671f\u56de\u770b\u5165\u53e3\u3002' : '\u76ee\u524d\u5148\u652f\u6301\u4f1a\u5458\u767b\u8bb0\u4e0e\u6743\u76ca\u9884\u89c8\uff0c\u5f00\u901a\u540e\u53ef\u4ee5\u89e3\u9501\u66f4\u5b8c\u6574\u7684\u4f1a\u5458\u5185\u5bb9\u3002'}</Text>
        <View style={s.memberHeroFooter}>
          <TouchableOpacity onPress={onOpenPaywall} style={s.memberRegisterButton} activeOpacity={0.9}>
            <Text style={s.memberRegisterButtonText}>{isMember ? '\u4f1a\u5458\u767b\u8bb0' : '\u4f1a\u5458\u767b\u8bb0'}</Text>
          </TouchableOpacity>
        </View>
      </Card>
      <Card>
        <SectionHeader eyebrow={S.benefits} title={isMember ? '\u5df2\u89e3\u9501\u7684\u6743\u76ca' : '\u4f1a\u5458\u6743\u76ca'} />
        <View style={s.benefitList}>
          {[
            '\u5b8c\u6574\u56db\u67f1\u6863\u6848\u4e0e\u4e2a\u4eba\u6838\u5fc3\u89e3\u8bfb',
            '\u9636\u6bb5\u5730\u56fe\u3001\u8fd1 30 \u5929\u65e5\u5386\u4e0e\u8282\u594f\u63d0\u793a',
            isMember ? 'AI \u6df1\u5316\u89e3\u8bfb\u3001\u8ffd\u95ee\u6821\u51c6\u4e0e\u4e94\u5f20\u884c\u52a8\u5361' : '\u6bcf\u6708\u8fd0\u52bf\u3001AI \u6df1\u5ea6\u89e3\u8bfb\u4e0e\u8ffd\u95ee',
            isMember ? '\u795e\u715e\u3001\u5341\u795e\u3001\u5173\u7cfb\u6a21\u5f0f\u4e0e\u4e8b\u4e1a\u8d22\u5bcc\u4e13\u9898' : '\u4e8b\u4e1a\u3001\u8d22\u5bcc\u3001\u611f\u60c5\u4e13\u9898\u4e0e\u5173\u952e\u63d0\u9192',
          ].map((item) => (
            <View key={item} style={s.benefitRow}><View style={s.benefitDot} /><Text style={s.benefitText}>{item}</Text></View>
          ))}
        </View>
      </Card>
      <Card>
        <SectionHeader eyebrow={'会员内容'} title={hasRegistration ? '会员结果入口' : '完成会员登记后可查看'} body={'当前已接入 24 条会员专题入口，并已按主题分类整理，方便长期回看。'} />
        {groupedMemberEntries.map((group) => (
          <View key={group.key} style={s.memberGroupBlock}>
            <TouchableOpacity onPress={() => toggleMemberGroup(group.key)} style={s.memberGroupHeaderCard} activeOpacity={0.9}>
              <View style={s.memberGroupHeaderMain}>
                <View style={s.memberGroupHeader}>
                  <Text style={s.memberGroupTitle}>{group.title}</Text>
                  <Text style={s.memberGroupCount}>{`${group.items.length} 条`}</Text>
                </View>
                <Text style={s.memberGroupSummary}>{group.summary}</Text>
                <Text style={s.memberGroupBody}>{group.body}</Text>
              </View>
              <Text style={s.memberGroupToggle}>{expandedMemberGroups.includes(group.key) ? '收起' : '展开'}</Text>
            </TouchableOpacity>
            {expandedMemberGroups.includes(group.key)
              ? group.items.map((item) => (
                  <TouchableOpacity key={item.key} onPress={() => setSelectedMemberTopic(item)} style={s.memberEntryCard}>
                    <View style={s.memberEntryTop}>
                      <Text style={s.memberEntryTitle}>{item.title}</Text>
                      <Text style={s.memberEntryAction}>{'查看'}</Text>
                    </View>
                    <Text numberOfLines={2} style={s.memberEntrySummary}>{item.summary}</Text>
                  </TouchableOpacity>
                ))
              : null}
          </View>
        ))}
      </Card>
      <Sheet visible={!!selectedMemberTopic} onClose={() => setSelectedMemberTopic(null)} title={selectedMemberTopic?.title || '会员内容'} subtitle={hasRegistration ? '已为你开放会员结果入口' : '完成会员登记后可长期回看'}>
        <Text style={s.detailLead}>{toText(selectedMemberTopic?.summary)}</Text>
        {(selectedMemberTopic?.details || []).map((detail) => (
          <View key={`${selectedMemberTopic?.key}-${detail.title}`} style={s.detailCard}>
            <View style={s.detailCardHeader}>
              <View style={s.detailIconBadge}><Text style={s.detailIconText}>{detail.title.slice(0, 2)}</Text></View>
              <Text style={s.detailCardTitle}>{detail.title}</Text>
            </View>
            <Text style={s.detailCardBody}>{toText(detail.body)}</Text>
          </View>
        ))}
      </Sheet>
    </ScrollView>
  );
}

function MemberRegistrationCard({ memberRegistration, onOpenPaywall }) {
  const items = [
    { label: '昵称', value: memberRegistration?.nickname },
    { label: '城市 / 地区', value: memberRegistration?.city },
    { label: '关注主题', value: memberRegistration?.focus },
    { label: '邮箱', value: memberRegistration?.email },
    { label: '电话', value: memberRegistration?.phone },
  ];
  const hasRegistration = items.some((item) => !!item.value);

  return (
    <Card>
      <SectionHeader eyebrow={'会员登记'} title={hasRegistration ? '已保存的会员登记信息' : '尚未填写会员登记信息'} />
      {items.map((item) => (
        <View key={item.label} style={s.infoRow}>
          <Text style={s.infoRowLabel}>{item.label}</Text>
          <Text style={s.infoRowValue}>{toText(item.value || '--')}</Text>
        </View>
      ))}
      <Text style={s.paragraph}>
        {hasRegistration ? '这些信息已保存在本机，下次打开会员页会自动回显，也可以重新填写覆盖。' : '你可以在会员页中选填昵称、城市、关注主题、邮箱或电话，这些内容都会保存到本机。'}
      </Text>
      <TouchableOpacity onPress={onOpenPaywall} style={s.secondaryButton}><Text style={s.secondaryButtonText}>{hasRegistration ? '\u4fee\u6539\u4f1a\u5458\u767b\u8bb0\u4fe1\u606f' : '\u586b\u5199\u4f1a\u5458\u767b\u8bb0\u4fe1\u606f'}</Text></TouchableOpacity>
    </Card>
  );
}

function FamilyProfilesCard({
  memberTier,
  familyProfiles,
  activeFamilyProfileId,
  onOpenPaywall,
  onCreateFamilyProfile,
  onSaveCurrentToFamilyProfile,
  onSwitchFamilyProfile,
  onSwitchToPrimaryAccount,
  onDeleteFamilyProfile,
}) {
  const isMember = memberTier && memberTier !== 'free';
  const count = Array.isArray(familyProfiles) ? familyProfiles.length : 0;

  return (
    <Card>
      <SectionHeader
        eyebrow={'会员档案'}
        title={'我的家人档案'}
        body={isMember ? `当前已保存 ${count} / 5 组家人档案，可随时切换进入。` : '开通会员后，可保存最多 5 组家人档案，并在不同家人命盘之间快速切换。'}
      />
      {!isMember ? (
        <>
          <View style={s.familyLockCard}>
            <Text style={s.familyLockTitle}>{'会员专属功能'}</Text>
            <Text style={s.familyLockBody}>{'解锁后可新增家人档案、保存当前档案到列表，并在“我的”页一键切换查看。'}</Text>
          </View>
          <TouchableOpacity onPress={onOpenPaywall} style={s.primaryButton}><Text style={s.primaryButtonText}>{'开通会员后使用'}</Text></TouchableOpacity>
        </>
      ) : (
        <>
          <View style={s.familySummaryRow}>
            <View style={s.familyCountPill}><Text style={s.familyCountText}>{`${count} / 5 组`}</Text></View>
            <Text style={s.familySummaryText}>{activeFamilyProfileId ? '当前正在查看家人档案，主账号身份与会员权限不会被改动。' : '建议先保存当前档案，再为新的家人重新排盘。'}</Text>
          </View>
          {activeFamilyProfileId ? (
            <TouchableOpacity onPress={onSwitchToPrimaryAccount} style={s.secondaryButton}>
              <Text style={s.secondaryButtonText}>{'返回主账号'}</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={onSaveCurrentToFamilyProfile} style={s.secondaryButton}><Text style={s.secondaryButtonText}>{'保存当前档案到家人列表'}</Text></TouchableOpacity>
          <TouchableOpacity onPress={onCreateFamilyProfile} style={[s.secondaryButton, s.familyCreateButton]}><Text style={s.secondaryButtonText}>{'新建家人档案'}</Text></TouchableOpacity>
          {count ? (
            <View style={s.familyList}>
              {familyProfiles.map((item, index) => {
                const title = item?.profile?.nickname || item?.profile?.city || `家人档案 ${index + 1}`;
                const meta = [item?.profile?.city, item?.profile?.focus, item?.profile?.role].filter(Boolean).join(' / ') || '--';
                const birthText = item?.profile?.year && item?.profile?.month && item?.profile?.day
                  ? `${item.profile.year}年${`${item.profile.month}`.padStart(2, '0')}月${`${item.profile.day}`.padStart(2, '0')}日 ${`${item?.profile?.hour ?? 0}`.padStart(2, '0')}时${`${item?.profile?.minute ?? '00'}`.padStart(2, '0')}分`
                  : '--';
                const active = activeFamilyProfileId === item?.id;
                return (
                  <View key={item?.id || `${title}-${index}`} style={[s.familyProfileCard, active && s.familyProfileCardActive]}>
                    <View style={s.familyProfileTop}>
                      <View style={s.familyProfileHead}>
                        <Text style={s.familyProfileTitle}>{title}</Text>
                        <Text style={s.familyProfileMeta}>{meta}</Text>
                      </View>
                      {active ? <View style={s.familyActivePill}><Text style={s.familyActiveText}>{'当前查看'}</Text></View> : null}
                    </View>
                    <View style={s.infoRow}>
                      <Text style={s.infoRowLabel}>{'出生日期'}</Text>
                      <Text style={s.infoRowValue}>{birthText}</Text>
                    </View>
                    <View style={s.infoRow}>
                      <Text style={s.infoRowLabel}>{'最近保存'}</Text>
                      <Text style={s.infoRowValue}>{formatFamilySavedAt(item?.savedAt)}</Text>
                    </View>
                    <View style={s.familyActionRow}>
                      <TouchableOpacity onPress={() => onSwitchFamilyProfile?.(item)} style={[s.familyActionButton, active && s.familyActionButtonActive]}>
                        <Text style={[s.familyActionText, active && s.familyActionTextActive]}>{active ? '当前查看中' : '切换查看'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => onDeleteFamilyProfile?.(item)} style={[s.familyActionButton, s.familyDeleteButton]}>
                        <Text style={[s.familyActionText, s.familyDeleteText]}>{'删除'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={s.familyEmptyCard}>
              <Text style={s.familyEmptyTitle}>{'还没有家人档案'}</Text>
              <Text style={s.familyEmptyBody}>{'你可以先把当前档案保存进列表，或新建一位家人的出生信息进行排盘。'}</Text>
            </View>
          )}
        </>
      )}
    </Card>
  );
}

function formatProfileBirthText(profile) {
  if (!profile?.year || !profile?.month || !profile?.day) {
    return '--';
  }

  const year = `${profile.year}`.trim();
  const month = `${profile.month}`.padStart(2, '0');
  const day = `${profile.day}`.padStart(2, '0');
  const hour = `${profile?.hour ?? 0}`.padStart(2, '0');
  const minute = `${profile?.minute ?? '00'}`.padStart(2, '0');
  return `${year}年${month}月${day}日 ${hour}时${minute}分`;
}

function MeTab({ pageNav, profile, accountProfile, locale, supportedLocales, onLocaleChange, onEditProfile, onResetAIReading, onResetData, onDeleteAccount, notificationPrefs, onNotificationPrefsChange, memberRegistration, onOpenPaywall, memberTier, familyProfiles, activeFamilyProfileId, onCreateFamilyProfile, onSaveCurrentToFamilyProfile, onSwitchFamilyProfile, onSwitchToPrimaryAccount, onDeleteFamilyProfile, hideMembership }) {
  const displayProfile = accountProfile || profile;
  const profileTitle = hideMembership ? '个人资料概览' : (displayProfile?.nickname || '\u672a\u547d\u540d\u6863\u6848');
  const profileBody = hideMembership
    ? '用于查看当前资料、调整提醒方式与管理本地记录。'
    : `${displayProfile?.city || '--'} / ${displayProfile?.focus || '--'} / ${displayProfile?.role || '--'}`;
  const editLabel = hideMembership ? '更新资料' : '\u7f16\u8f91\u6863\u6848 / \u91cd\u65b0\u6392\u76d8';
  const profileName = displayProfile?.nickname || '未命名档案';
  const profileBirth = formatProfileBirthText(displayProfile);
  const profileItems = [
    { label: '昵称', value: displayProfile?.nickname || '--' },
    { label: '出生日期', value: formatProfileBirthText(displayProfile) },
    { label: '出生地', value: displayProfile?.city || '--' },
    { label: '关注主题', value: displayProfile?.focus || '--' },
    { label: '当前角色', value: displayProfile?.role || '--' },
  ];
  return (
    <ScrollView contentContainerStyle={s.pageContent} showsVerticalScrollIndicator={false}>
      {pageNav}
      <Card>
        <SectionHeader eyebrow={hideMembership ? '个人资料' : S.profile} title={profileTitle} body={profileBody} />
        <View style={s.profileOverviewHero}>
          <View style={s.profileOverviewAura} />
          <View style={s.profileOverviewTop}>
            <Text style={s.profileOverviewName}>{profileName}</Text>
            <Text style={s.profileOverviewBirth}>{profileBirth}</Text>
          </View>
          <View style={s.profileOverviewMetaRow}>
            <View style={s.profileOverviewMetaPill}>
              <Text style={s.profileOverviewMetaLabel}>{'出生地'}</Text>
              <Text style={s.profileOverviewMetaValue}>{toText(displayProfile?.city || '--')}</Text>
            </View>
            <View style={s.profileOverviewMetaPill}>
              <Text style={s.profileOverviewMetaLabel}>{'关注主题'}</Text>
              <Text style={s.profileOverviewMetaValue}>{toText(displayProfile?.focus || '--')}</Text>
            </View>
          </View>
        </View>
        {profileItems.map((item) => (
          <View key={item.label} style={s.infoRow}>
            <Text style={s.infoRowLabel}>{item.label}</Text>
            <Text style={s.infoRowValue}>{toText(item.value)}</Text>
          </View>
        ))}
        <TouchableOpacity onPress={onEditProfile} style={s.secondaryButton}><Text style={s.secondaryButtonText}>{editLabel}</Text></TouchableOpacity>
      </Card>
      {!hideMembership ? <MemberRegistrationCard memberRegistration={memberRegistration} onOpenPaywall={onOpenPaywall} /> : null}
      <Card>
        <SectionHeader eyebrow={'支持入口'} title={'联系明己'} body={'遇到会员开通、付款、资料补充，或想单独留言给明己，都可以从这里进入。'} />
        <Text style={s.paragraph}>
          打开后可直接填写想问的问题或需要协助的内容，提交后会同步进入后台留言区，方便后续跟进。
        </Text>
        <TouchableOpacity onPress={onOpenPaywall} style={s.primaryButton}>
          <Text style={s.primaryButtonText}>{'联系明己'}</Text>
        </TouchableOpacity>
      </Card>
      <Card>
        <SectionHeader eyebrow={S.settings} title={S.languageReminders} />
        <View style={s.infoRow}>
          <Text style={s.infoRowLabel}>{'\u8bed\u8a00'}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={s.localeRow}>
              {(supportedLocales || []).map((item) => {
                const value = item?.value || item?.code || item;
                const label = item?.label || item?.name || value;
                return <TouchableOpacity key={value} style={[s.localeChip, locale === value && s.localeChipActive]} onPress={() => onLocaleChange?.(value)}><Text style={[s.localeChipText, locale === value && s.localeChipTextActive]}>{label}</Text></TouchableOpacity>;
              })}
            </View>
          </ScrollView>
        </View>
        <View style={s.infoRow}><Text style={s.infoRowLabel}>{'App \u6bcf\u65e5\u63d0\u9192'}</Text><Switch value={!!notificationPrefs?.appEnabled} onValueChange={(value) => onNotificationPrefsChange?.({ appEnabled: value })} /></View>
        <View style={s.infoRow}><Text style={s.infoRowLabel}>{'\u90ae\u7bb1\u63d0\u9192'}</Text><Switch value={!!notificationPrefs?.emailEnabled} onValueChange={(value) => onNotificationPrefsChange?.({ emailEnabled: value })} /></View>
      </Card>
      <Card>
        <SectionHeader eyebrow={S.dataOps} title={S.exportReset} />
        <TouchableOpacity onPress={onResetAIReading} style={s.secondaryButton}><Text style={s.secondaryButtonText}>{'\u91cd\u7f6e AI \u89e3\u8bfb'}</Text></TouchableOpacity>
        <TouchableOpacity onPress={onResetData} style={[s.secondaryButton, s.dangerButton]}><Text style={[s.secondaryButtonText, { color: C.danger }]}>{'\u6e05\u7a7a\u672c\u5730\u6570\u636e'}</Text></TouchableOpacity>
        <TouchableOpacity onPress={onDeleteAccount} style={[s.secondaryButton, s.dangerButton]}><Text style={[s.secondaryButtonText, { color: C.danger }]}>{'注销账户'}</Text></TouchableOpacity>
      </Card>
    </ScrollView>
  );
}

export function ResultV2Shell(props) {
  const {
    result,
    profile,
    fortuneCalendar,
    calSummary,
    locale,
    supportedLocales,
    onLocaleChange,
    onOpenPaywall,
    onRecalculate,
    onEditProfile,
    onResetData,
    onDeleteAccount,
    onResetAIReading,
    notificationPrefs,
    onNotificationPrefsChange,
    onGenerateAI,
    onGenerateCompanion,
    onFollowUpAnswerChange,
    aiLoading,
    companionLoading,
    aiText,
    oneLineSummary,
    weeklyActions,
    followUpQuestions,
    followUpAnswers,
    memberTier,
    memberRegistration,
    hideMembership,
    accountProfile,
    accountResult,
    familyProfiles,
    activeFamilyProfileId,
    profileReadyVisible,
    onDismissProfileReady,
    onCreateFamilyProfile,
    onSaveCurrentToFamilyProfile,
    onSwitchFamilyProfile,
    onSwitchToPrimaryAccount,
    onDeleteFamilyProfile,
  } = props;
  const pagerRef = useRef(null);
  const tabNavigationModeRef = useRef('normal');
  const visibleTabs = useMemo(
    () => TAB_KEYS.filter((tab) => !(hideMembership && (tab === 'premium' || tab === 'profile'))),
    [hideMembership]
  );
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [selectedShenShaList, setSelectedShenShaList] = useState(null);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null);
  const [calendarEntries, setCalendarEntries] = useState({});
  const [calendarQuickAddMode, setCalendarQuickAddMode] = useState(false);
  const [selectedTodayGuides, setSelectedTodayGuides] = useState(null);
  const [aiPage, setAiPage] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [activeRecording, setActiveRecording] = useState(null);
  const [aiRemaining, setAiRemaining] = useState(3);
  const [aiAllowed, setAiAllowed] = useState(true);
  const isPremium = !!(memberTier && memberTier !== 'free');
  const effectivePremium = isPremium || aiRemaining >= 999;
  const preferredEntryTab = useMemo(() => {
    const wantsTongsheng = effectivePremium && visibleTabs.includes('tongsheng');
    return wantsTongsheng ? 'tongsheng' : (visibleTabs[0] || 'home');
  }, [effectivePremium, visibleTabs]);
  const [activeTab, setActiveTab] = useState(preferredEntryTab);
  const activeTabRef = useRef(preferredEntryTab);
  const [tabHistory, setTabHistory] = useState([]);
  const identityChart = accountResult || result;
  const identityProfile = accountProfile || profile;
  const stableUserKey = useMemo(
    () => buildStableUserKey(identityChart, identityProfile, memberRegistration),
    [identityChart, identityProfile, memberRegistration]
  );
  const selectedStructuredDetail = selectedDetail?.type === 'custom'
    ? selectedDetail?.content
    : getStructuredDetail(selectedDetail?.name) || (selectedDetail?.type === 'shenSha' ? getGenericShenShaFallback(selectedDetail?.name) : null);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    if (!visibleTabs.includes(activeTab)) {
      activeTabRef.current = preferredEntryTab;
      setActiveTab(preferredEntryTab);
      setTabHistory([]);
      return;
    }
    if (activeTab === preferredEntryTab) return;
    if (!visibleTabs.includes(preferredEntryTab)) return;
  }, [activeTab, preferredEntryTab, visibleTabs]);

  const navigateToTab = useCallback((tab, options = {}) => {
    if (!tab || tab === activeTabRef.current) return;
    const index = visibleTabs.indexOf(tab);
    if (index < 0) return;
    if (!options.skipHistory && activeTabRef.current) {
      setTabHistory((prev) => {
        if (prev[prev.length - 1] === activeTabRef.current) return prev;
        return [...prev, activeTabRef.current].slice(-10);
      });
    }
    if (options.navigationMode) {
      tabNavigationModeRef.current = options.navigationMode;
    }
    activeTabRef.current = tab;
    setActiveTab(tab);
    pagerRef.current?.scrollTo({ x: index * PAGE_WIDTH, animated: options.animated !== false });
  }, [visibleTabs]);

  const handleGoBackTab = useCallback(() => {
    setTabHistory((prev) => {
      const previousTab = prev[prev.length - 1];
      if (!previousTab) return prev;
      const nextHistory = prev.slice(0, -1);
      navigateToTab(previousTab, { skipHistory: true, navigationMode: 'back' });
      return nextHistory;
    });
  }, [navigateToTab]);

  const buildPageNav = useCallback((title, subtitle) => (
    <PageTopBackBar
      title={title}
      subtitle={subtitle}
      canGoBack={tabHistory.length > 0}
      onGoBack={handleGoBackTab}
    />
  ), [handleGoBackTab, tabHistory.length]);

  useEffect(() => {
    const index = visibleTabs.indexOf(preferredEntryTab);
    if (index < 0) return undefined;
    const timer = setTimeout(() => {
      activeTabRef.current = preferredEntryTab;
      setActiveTab(preferredEntryTab);
      pagerRef.current?.scrollTo({ x: index * PAGE_WIDTH, animated: false });
    }, 0);
    return () => clearTimeout(timer);
  }, [preferredEntryTab, visibleTabs]);

  const refreshAIQuota = async () => {
    const quotaArgs = { isPremium, memberTier: isPremium ? 'premium' : 'free', chart: identityChart, profile: identityProfile, userKey: stableUserKey };
    const [remaining, allowed] = await Promise.all([
      getRemainingCount(quotaArgs),
      canUseAI(quotaArgs),
    ]);
    setAiRemaining(remaining);
    setAiAllowed(allowed);
  };

  const stopVoiceRecording = async () => {
    if (!activeRecording) return null;
    try {
      await activeRecording.stopAndUnloadAsync();
      return activeRecording.getURI?.() || null;
    } finally {
      setActiveRecording(null);
      setVoiceRecording(false);
    }
  };

  const handleVoiceInput = async () => {
    if (voiceLoading || chatLoading) return;

    if (!result) {
      Alert.alert('请先完成资料建立', '需要先生成个人画像，明己AI先生的语音输入才会更贴近你的资料。');
      return;
    }

    if (voiceRecording && activeRecording) {
      setVoiceLoading(true);
      try {
        const uri = await stopVoiceRecording();
        if (!uri) {
          throw new Error('没有拿到可转写的语音文件。');
        }
        const transcript = await transcribeVoiceInput(uri);
        if (!transcript) {
          throw new Error('这段语音暂时没有识别出文字。');
        }
        setChatInput((prev) => {
          const base = `${prev || ''}`.trim();
          return base ? `${base}\n${transcript}` : transcript;
        });
      } catch (error) {
        Alert.alert('语音输入暂时不可用', error?.message || '请稍后再试，或直接使用文字输入。');
      } finally {
        setVoiceLoading(false);
      }
      return;
    }

    try {
      setVoiceLoading(true);
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        throw new Error('麦克风权限未开启，请先允许语音输入。');
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      setActiveRecording(recording);
      setVoiceRecording(true);
    } catch (error) {
      Alert.alert('无法开始录音', error?.message || '请检查麦克风权限后重试。');
    } finally {
      setVoiceLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
      (async () => {
        try {
        const quotaArgs = { isPremium, memberTier: isPremium ? 'premium' : 'free', chart: identityChart, profile: identityProfile, userKey: stableUserKey };
        const [remaining, allowed] = await Promise.all([
          getRemainingCount(quotaArgs),
          canUseAI(quotaArgs),
        ]);
        if (!active) return;
        setAiRemaining(remaining);
        setAiAllowed(allowed);
        } catch (error) {
          if (!active) return;
          console.warn('AI quota sync warning:', error?.message || error);
        }
      })();
    return () => {
      active = false;
    };
    }, [aiPage, chatHistory.length, isPremium, result, profile, stableUserKey]);

  useEffect(() => () => {
    if (activeRecording) {
      activeRecording.stopAndUnloadAsync().catch(() => {});
    }
  }, [activeRecording]);
  useEffect(() => {
    if (!visibleTabs.includes(activeTab)) {
      setActiveTab(visibleTabs[0] || 'home');
      pagerRef.current?.scrollTo({ x: 0, animated: false });
    }
  }, [activeTab, visibleTabs]);
  useEffect(() => {
    if (!profileReadyVisible) return undefined;
    const timer = setTimeout(() => onDismissProfileReady?.(), 2800);
    return () => clearTimeout(timer);
  }, [profileReadyVisible, onDismissProfileReady]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CALENDAR_ENTRIES_STORAGE_KEY);
        if (!active || !raw) return;
        const parsed = JSON.parse(raw);
        setCalendarEntries(parsed && typeof parsed === 'object' ? parsed : {});
      } catch {}
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(CALENDAR_ENTRIES_STORAGE_KEY, JSON.stringify(calendarEntries)).catch(() => {});
  }, [calendarEntries]);

  const openTodayDetail = () => {
    const today = findTodayCalendarCell(fortuneCalendar, result);
    if (!today) return;
    setSelectedCalendarDay(today);
    setCalendarQuickAddMode(false);
    navigateToTab('stage');
  };

  const handleSaveCalendarNote = (day, note, options = {}) => {
    const key = getCalendarEntryKey(day);
    if (!key) return;
    setCalendarEntries((prev) => {
      const current = prev?.[key] || {};
      const existingNoteItems = getCalendarNoteItems(current);
      const nextNote = `${note || ''}`.trim();
      if (options?.clearAll) {
        const next = {
          ...prev,
          [key]: {
            ...current,
            note: '',
            notes: [],
          },
        };
        if (!next[key].reminderEnabled) {
          delete next[key];
        }
        return next;
      }
      if (options?.removeId) {
        const filtered = existingNoteItems.filter((item) => item.id !== options.removeId);
        const next = {
          ...prev,
          [key]: {
            ...current,
            note: filtered[0]?.text || '',
            notes: filtered,
          },
        };
        if (!filtered.length && !next[key].reminderEnabled) {
          delete next[key];
        }
        return next;
      }
      if (!nextNote && !current.reminderEnabled) {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      }
      if (!nextNote) {
        const next = {
          ...prev,
          [key]: {
            ...current,
            note: '',
            notes: [],
          },
        };
        if (!next[key].reminderEnabled) {
          delete next[key];
        }
        return next;
      }
      const mergedNotes = [
        ...existingNoteItems,
        {
          id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          text: nextNote,
          type: options?.type || 'todo',
        },
      ];
      return {
        ...prev,
        [key]: {
          ...current,
          note: mergedNotes[0]?.text || '',
          notes: mergedNotes,
        },
      };
    });
  };

  const handleToggleCalendarNoteDone = (day, noteId) => {
    const key = getCalendarEntryKey(day);
    if (!key || !noteId) return;
    setCalendarEntries((prev) => {
      const current = prev?.[key] || {};
      const noteItems = getCalendarNoteItems(current).map((item) => (
        item.id === noteId ? { ...item, done: !item.done } : item
      ));
      return {
        ...prev,
        [key]: {
          ...current,
          note: noteItems[0]?.text || '',
          notes: noteItems,
        },
      };
    });
  };

  const handleToggleCalendarReminder = async (day) => {
    const key = getCalendarEntryKey(day);
    if (!key) return;
    const current = calendarEntries?.[key] || {};
    if (current.reminderEnabled) {
      if (current.notificationId) {
        await Notifications.cancelScheduledNotificationAsync(current.notificationId).catch(() => {});
      }
      setCalendarEntries((prev) => {
        const next = { ...prev };
        const existing = next[key] || {};
        if (!getCalendarNotes(existing).length) {
          delete next[key];
          return next;
        }
        next[key] = { ...existing, reminderEnabled: false, notificationId: null };
        return next;
      });
      return;
    }

    const permission = await Notifications.requestPermissionsAsync().catch(() => null);
    if (!permission?.granted) {
      setSelectedDetail({
        type: 'custom',
        name: '提醒未开启',
        subtitle: '日历提醒',
        content: {
          lead: '当前还没有通知权限，所以这一天的提醒暂时没法开启。',
          sections: [
            { title: '现在怎么处理', body: '请先在系统里允许通知权限，再回来开启这天提醒。' },
          ],
        },
      });
      return;
    }

    const reminderConfig = getReminderTimeConfig(current, notificationPrefs);
    const triggerDate = getRepeatTriggerForDay(day, reminderConfig);
    const invalidTrigger = !triggerDate || (triggerDate instanceof Date && triggerDate.getTime() <= Date.now());
    if (invalidTrigger) {
      setSelectedDetail({
        type: 'custom',
        name: '提醒时间已过',
        subtitle: '日历提醒',
        content: {
          lead: '这一天的默认提醒时间已经过去了，所以现在不能再为它安排提醒。',
          sections: [
            { title: '建议', body: '可以给未来日期开启提醒，或到设置里调整默认提醒时间。' },
          ],
        },
      });
      return;
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${day.dateLabel || '这一天'}提醒`,
        body: getCalendarNotes(current)[0] || current.note || day.advice || '今天记得回到这一天的安排，按自己的节奏推进。',
      },
      trigger: triggerDate,
    }).catch(() => null);

    if (!notificationId) return;

    setCalendarEntries((prev) => ({
      ...prev,
      [key]: {
        ...(prev?.[key] || {}),
        reminderEnabled: true,
        reminderRepeatRule: reminderConfig.repeatRule,
        notificationId,
      },
    }));
  };

  const handleUpdateCalendarReminderTime = async (day, patch) => {
    const key = getCalendarEntryKey(day);
    if (!key) return;
    const current = calendarEntries?.[key] || {};
    const nextHour = Number(patch?.hour ?? current?.reminderHour ?? notificationPrefs?.hour ?? 8);
    const nextMinuteRaw = Number(patch?.minute ?? current?.reminderMinute ?? notificationPrefs?.minute ?? 30);
    const nextMinute = Math.round(nextMinuteRaw / 5) * 5 % 60;
    const nextLeadMinutes = Number(patch?.leadMinutes ?? current?.reminderLeadMinutes ?? notificationPrefs?.leadMinutes ?? 0);
    const nextRepeatRule = patch?.repeatRule ?? current?.reminderRepeatRule ?? 'once';

    if (current.notificationId) {
      await Notifications.cancelScheduledNotificationAsync(current.notificationId).catch(() => {});
    }

    let nextNotificationId = null;
    if (current.reminderEnabled) {
      const triggerDate = getRepeatTriggerForDay(day, { hour: nextHour, minute: nextMinute, leadMinutes: nextLeadMinutes, repeatRule: nextRepeatRule });
      if (triggerDate && (!(triggerDate instanceof Date) || triggerDate.getTime() > Date.now())) {
        nextNotificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: `${day.dateLabel || '这一天'}提醒`,
            body: getCalendarNotes(current)[0] || current.note || day.advice || '今天记得回到这一天的安排，按自己的节奏推进。',
          },
          trigger: triggerDate,
        }).catch(() => null);
      }
    }

    setCalendarEntries((prev) => ({
      ...prev,
      [key]: {
        ...(prev?.[key] || {}),
        reminderHour: nextHour,
        reminderMinute: nextMinute,
        reminderLeadMinutes: nextLeadMinutes,
        reminderRepeatRule: nextRepeatRule,
        notificationId: nextNotificationId,
      },
    }));
  };

  const openTodayGuideDetail = async (card) => {
    if (!card) return;
    if (card.key !== 'comfort') {
      setSelectedTodayGuides(null);
      setSelectedDetail({ type: 'custom', name: card.name, subtitle: '今日提醒 · 详细说明', content: card.content });
      return;
    }

    const fallbackContent = card.content;
    if (!result || !aiAllowed) {
      setSelectedTodayGuides(null);
      setSelectedDetail({ type: 'custom', name: card.name, subtitle: '今日提醒 · 详细说明', content: fallbackContent });
      return;
    }

    setSelectedTodayGuides(null);
    setSelectedDetail({
      type: 'custom',
      name: card.name,
      subtitle: '今日提醒 · AI 个性化生成',
      content: {
        lead: '正在结合你的个人画像和今日状态生成更贴身的安抚建议…',
        sections: [
          { title: '生成中', body: '请稍等片刻，这条内容会优先结合你今天的节奏、情绪提醒和当前状态来组织。' },
        ],
      },
    });

    try {
      await incrementUsage({ isPremium: effectivePremium, memberTier: effectivePremium ? 'premium' : 'free', chart: identityChart, profile: identityProfile, userKey: stableUserKey });
      const aiReply = await aiChat(
        '请基于我的个人画像、今天的状态、今日宜忌、今日色彩和环境提示，生成一段“正觉正念”式的安抚与行动引导。要求：温柔、具体、不玄学，分成三部分：1. 先安抚我的情绪 2. 提醒我今天最该稳住什么 3. 给我一个马上能做的小动作。总字数控制在220字以内。',
        result,
        [],
        { isPremium: effectivePremium, memberTier: effectivePremium ? 'premium' : 'free', profile: identityProfile, userKey: stableUserKey }
      );
      await refreshAIQuota();
      setSelectedDetail({
        type: 'custom',
        name: card.name,
        subtitle: '今日提醒 · AI 个性化生成',
        content: {
          lead: '这段内容结合了你的个人画像与今天的节奏提示，用更贴身的方式陪你把心安下来。',
          sections: [
            { title: 'AI 正觉正念', body: aiReply || fallbackContent.sections?.[2]?.body || fallbackContent.lead },
            ...(fallbackContent?.sections || []).slice(0, 2),
          ],
        },
      });
    } catch (error) {
      await refreshAIQuota();
      setSelectedDetail({
        type: 'custom',
        name: card.name,
        subtitle: '今日提醒 · 详细说明',
        content: fallbackContent,
      });
    }
  };

  const pages = [
    <TongshengTab key="tongsheng" pageNav={buildPageNav('今日通胜', '会员默认先落到这里，先看当天节奏，再决定今天怎么走。')} result={result} profile={profile} fortuneCalendar={fortuneCalendar} calSummary={calSummary} weeklyActions={weeklyActions} onOpenTodayDetail={openTodayDetail} onOpenCustomDetail={setSelectedDetail} onOpenTodayGuides={setSelectedTodayGuides} isPremium={effectivePremium} />,
    <HomeTab key="home" pageNav={buildPageNav('明己首页', '这里放长期工具和常用入口，需要时也能随时退回上一页。')} result={result} profile={profile} accountProfile={accountProfile} accountResult={accountResult} fortuneCalendar={fortuneCalendar} calSummary={calSummary} weeklyActions={weeklyActions} oneLineSummary={oneLineSummary} followUpQuestions={followUpQuestions} followUpAnswers={followUpAnswers} onFollowUpAnswerChange={onFollowUpAnswerChange} onGenerateCompanion={onGenerateCompanion} companionLoading={companionLoading} onRecalculate={onRecalculate} reviewMode={hideMembership} onOpenAI={() => setAiPage(true)} onOpenTodayDetail={openTodayDetail} onOpenCustomDetail={setSelectedDetail} onOpenTodayGuides={setSelectedTodayGuides} isPremium={effectivePremium} aiRemaining={aiRemaining} aiAllowed={aiAllowed} onRefreshAIQuota={refreshAIQuota} onOpenPaywall={onOpenPaywall} />,
    !hideMembership ? <ProfileTab key="profile" pageNav={buildPageNav('命盘总览', '回看四柱、结构和 AI 深读时，也能一键退回刚才那一页。')} profile={profile} result={result} aiText={aiText} aiLoading={aiLoading} onGenerateAI={onGenerateAI} onPressTenGod={(name) => setSelectedDetail(name ? { type: 'tenGod', name } : null)} onPressShenShaItem={(name) => setSelectedDetail(name ? { type: 'shenSha', name } : null)} onPressShenShaList={(pillar, items) => setSelectedShenShaList({ pillar, items })} /> : null,
    <StageTab key="stage" pageNav={buildPageNav('阶段日历', '看黄历、阶段安排和当天提醒时，退回路径也会一直保留。')} result={result} fortuneCalendar={fortuneCalendar} calSummary={calSummary} profile={profile} reviewMode={hideMembership} weeklyActions={weeklyActions} selectedDay={selectedCalendarDay} onSelectDay={(day, options) => { setSelectedCalendarDay(day); setCalendarQuickAddMode(!!options?.quickAdd); }} onCloseDayDetail={() => { setSelectedCalendarDay(null); setCalendarQuickAddMode(false); }} oneLineSummary={oneLineSummary} calendarEntries={calendarEntries} notificationPrefs={notificationPrefs} onSaveCalendarNote={handleSaveCalendarNote} onToggleCalendarReminder={handleToggleCalendarReminder} onUpdateCalendarReminderTime={handleUpdateCalendarReminderTime} onToggleCalendarNoteDone={handleToggleCalendarNoteDone} quickAddMode={calendarQuickAddMode} onClearQuickAddMode={() => setCalendarQuickAddMode(false)} />,
    !hideMembership ? <PremiumTab key="premium" pageNav={buildPageNav('会员中心', '权益、登记和会员专题入口，都会保留返回上一页的路径。')} memberTier={memberTier} onOpenPaywall={onOpenPaywall} result={result} profile={profile} calSummary={calSummary} fortuneCalendar={fortuneCalendar} weeklyActions={weeklyActions} memberRegistration={memberRegistration} /> : null,
    <MeTab key="me" pageNav={buildPageNav('我的', '改资料、调提醒、看账号信息时，也不需要再自己找返回路径。')} profile={profile} accountProfile={accountProfile} locale={locale} supportedLocales={supportedLocales} onLocaleChange={onLocaleChange} onEditProfile={onEditProfile} onResetAIReading={onResetAIReading} onResetData={onResetData} onDeleteAccount={onDeleteAccount} notificationPrefs={notificationPrefs} onNotificationPrefsChange={onNotificationPrefsChange} memberRegistration={memberRegistration} onOpenPaywall={onOpenPaywall} memberTier={memberTier} familyProfiles={familyProfiles} activeFamilyProfileId={activeFamilyProfileId} onCreateFamilyProfile={onCreateFamilyProfile} onSaveCurrentToFamilyProfile={onSaveCurrentToFamilyProfile} onSwitchFamilyProfile={onSwitchFamilyProfile} onSwitchToPrimaryAccount={onSwitchToPrimaryAccount} onDeleteFamilyProfile={onDeleteFamilyProfile} hideMembership={hideMembership} />,
  ].filter(Boolean);
  return (
    <View style={s.root}>
      <ScrollView ref={pagerRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(event) => {
        const index = Math.round(event.nativeEvent.contentOffset.x / PAGE_WIDTH);
        const nextTab = visibleTabs[index] || visibleTabs[0] || preferredEntryTab;
        if (tabNavigationModeRef.current === 'back') {
          tabNavigationModeRef.current = 'normal';
          activeTabRef.current = nextTab;
          setActiveTab(nextTab);
          return;
        }
        if (nextTab === activeTabRef.current) return;
        setTabHistory((prev) => {
          if (prev[prev.length - 1] === activeTabRef.current) return prev;
          return [...prev, activeTabRef.current].slice(-10);
        });
        activeTabRef.current = nextTab;
        setActiveTab(nextTab);
      }}>
        {pages.map((page, index) => <View key={visibleTabs[index]} style={s.page}>{page}</View>)}
      </ScrollView>
      <View style={s.tabBar}>
        {visibleTabs.map((tab) => {
          const active = activeTab === tab;
          const meta = getTabMeta(tab, hideMembership);
          return (
            <TouchableOpacity key={tab} style={s.tabButton} onPress={() => {
              navigateToTab(tab);
            }}>
              <View style={[
                s.tabButtonSurface,
                { backgroundColor: active ? meta.plate : meta.glow, borderColor: active ? meta.border : meta.border },
                active && { backgroundColor: meta.plate, borderColor: meta.border, shadowColor: meta.accent, shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
              ]}>
              <View style={[
                s.tabIconWrap,
                { backgroundColor: active ? meta.glow : 'rgba(255,255,255,0.72)', borderColor: meta.border },
                active && { shadowColor: meta.accent, shadowOpacity: 0.24, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
              ]}>
                <Text style={[s.tabIcon, { color: active ? meta.accent : meta.accent }]}>{meta.icon}</Text>
              </View>
              <Text style={[s.tabText, { color: active ? meta.accent : meta.accent }, active && s.tabTextActive]}>{meta.label}</Text>
              <View style={[s.tabIndicator, active && { backgroundColor: meta.accent, opacity: 1 }]} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      <Sheet visible={!!selectedDetail} onClose={() => setSelectedDetail(null)} title={selectedDetail?.name || '\u8be6\u60c5'} subtitle={selectedDetail?.type === 'custom' ? (selectedDetail?.subtitle || '今日提醒 · 详细说明') : selectedDetail?.type === 'shenSha' ? '\u795e\u715e\u542b\u4e49 + \u73b0\u4ee3\u89e3\u91ca' : '\u5341\u795e\u542b\u4e49 + \u73b0\u4ee3\u89e3\u91ca'}>
        {selectedStructuredDetail ? (
          <View>
            {!!selectedStructuredDetail.lead && <Text style={s.detailLead}>{selectedStructuredDetail.lead}</Text>}
            {(selectedStructuredDetail.sections || []).map((section, index) => {
              const tone = getDetailSectionTone(section.title);
              return (
              <View key={`${selectedDetail?.name || 'detail'}-${index}`} style={[s.detailCard, { backgroundColor: tone.card, borderColor: tone.border }]}>
                <View style={s.detailCardHeader}>
                  <View style={[s.detailIconBadge, { backgroundColor: tone.badge }]}>
                    <Text style={[s.detailIconText, { color: tone.icon }]}>{getDetailSectionIcon(section.title)}</Text>
                  </View>
                  <Text style={s.detailCardTitle}>{section.title}</Text>
                </View>
                <Text style={s.detailCardBody}>{section.body}</Text>
              </View>
            )})}
          </View>
        ) : (
          <Text style={s.paragraph}>{TEN_GOD_TEXT[selectedDetail?.name] || '\u8fd9\u91cc\u4f1a\u7ee7\u7eed\u6269\u5c55\u6210\u66f4\u5b8c\u6574\u7684\u8bf4\u660e\u3002'}</Text>
        )}
      </Sheet>
      <Sheet visible={!!selectedShenShaList} onClose={() => setSelectedShenShaList(null)} title={`${selectedShenShaList?.pillar || ''}\u795e\u715e`} subtitle={'\u5b8c\u6574\u5217\u8868'}>
        {(selectedShenShaList?.items || []).map((item, index) => (
          <TouchableOpacity
            key={`${item}-${index}`}
            style={s.sheetListItem}
            onPress={() => {
              setSelectedShenShaList(null);
              setSelectedDetail(item ? { type: 'shenSha', name: item } : null);
            }}
          >
            <Text style={s.sheetListText}>{item}</Text>
          </TouchableOpacity>
        ))}
      </Sheet>
      <Sheet visible={!!selectedTodayGuides} onClose={() => setSelectedTodayGuides(null)} title={'今日提醒'} subtitle={'点开查看详细提醒'}>
        {(selectedTodayGuides || []).map((item) => (
          <TouchableOpacity key={item.key} style={s.todayGuideListCard} activeOpacity={0.92} onPress={() => openTodayGuideDetail(item)}>
            <View style={s.todayGuideListTop}>
              <Text style={s.todayGuideListTitle}>{item.name}</Text>
              <Text style={s.todayGuideListArrow}>{'›'}</Text>
            </View>
            <Text numberOfLines={3} ellipsizeMode="tail" style={s.todayGuideListBody}>{item.summary}</Text>
          </TouchableOpacity>
        ))}
      </Sheet>
      <AICompanionModal
          visible={aiPage}
          onClose={() => setAiPage(false)}
        result={result}
        profile={profile}
        chatHistory={chatHistory}
        chatInput={chatInput}
        onChangeInput={setChatInput}
        chatLoading={chatLoading}
          isPremium={effectivePremium}
          aiRemaining={aiRemaining}
          aiAllowed={aiAllowed}
          onOpenPaywall={onOpenPaywall}
          voiceLoading={voiceLoading}
        voiceRecording={voiceRecording}
        onVoiceInput={handleVoiceInput}
        onSend={async () => {
          const userMsg = `${chatInput || ''}`.trim();
          if (!userMsg || chatLoading) return;

          const quotaArgs = { isPremium, memberTier: isPremium ? 'premium' : 'free', chart: identityChart, profile: identityProfile, userKey: stableUserKey };
          try {
            try {
              const allowed = await canUseAI(quotaArgs);
              if (!allowed) {
                setAiAllowed(false);
                setAiRemaining(await getRemainingCount(quotaArgs));
                setChatHistory((prev) => [
                  ...prev,
                  { role: 'assistant', content: '今日免费次数已用完，可开通会员继续使用 AI。' },
                ]);
                return;
              }
            } catch (error) {
              console.warn('AI companion quota precheck warning:', error?.message || error);
            }

            const nextHistory = [...chatHistory, { role: 'user', content: normalizeChatMessageContent(userMsg) }];
            const userTurnCount = nextHistory.filter((item) => item.role === 'user').length;
            setChatInput('');
            setChatLoading(true);
            setChatHistory(nextHistory);

            if (Platform.OS === 'web') {
              try {
                if (userTurnCount === 1) {
                  trackPwaEvent('chat_first_message_sent', { topic: 'general' });
                } else if (userTurnCount === 2) {
                  trackPwaEvent('chat_second_message_sent', { topic: 'general' });
                }
              } catch {}
            }

            try {
              await incrementUsage(quotaArgs);
            } catch (error) {
              console.warn('AI companion usage tracking warning:', error?.message || error);
            }

            try {
              const reply = await aiChat(userMsg, result, chatHistory, quotaArgs);
              setChatHistory([...nextHistory, { role: 'assistant', content: normalizeChatMessageContent(reply, '我在这里，会继续陪你一起梳理。') || '我在这里，会继续陪你一起梳理。' }]);
              if (Platform.OS === 'web' && userTurnCount === 1) {
                try {
                  trackPwaEvent('chat_first_reply_received', { route: 'companion', mode: 'chat' });
                } catch {}
              }
            } catch (error) {
              if (error?.code === 'AI_QUOTA_EXCEEDED') {
                setChatHistory([...nextHistory, { role: 'assistant', content: normalizeChatMessageContent('今日免费次数已用完，可开通会员继续使用 AI。') }]);
              } else {
                setChatHistory([...nextHistory, { role: 'assistant', content: normalizeChatMessageContent('抱歉，我暂时无法回应。请检查网络后重试。') }]);
              }
            } finally {
              setChatLoading(false);
              try {
                setAiRemaining(await getRemainingCount(quotaArgs));
                setAiAllowed(await canUseAI(quotaArgs));
              } catch {}
            }
          } catch (error) {
            console.warn('AI companion send flow warning:', error?.message || error);
            setChatLoading(false);
          }
        }}
      />
      <Modal visible={!!profileReadyVisible} transparent animationType="fade" onRequestClose={onDismissProfileReady}>
        <View style={s.readyMask}>
          <TouchableOpacity style={s.readyScrim} activeOpacity={1} onPress={onDismissProfileReady} />
          <View style={s.readyCard}>
            <View style={s.readyAura} />
            <View style={s.readyOrbitOuter} />
            <View style={s.readyOrbitInner} />
            <View style={s.readyCoreDot} />
            <Text style={s.readyTitle}>{'个人画像已生成'}</Text>
                  <Text style={s.readyBody}>{'现在可以使用明己AI先生和智能工具了。接下来看到的内容，会开始真正结合这份资料。'}</Text>
            <TouchableOpacity style={s.readyButton} onPress={onDismissProfileReady}>
              <Text style={s.readyButtonText}>{'开始体验'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  page: { width: PAGE_WIDTH, flex: 1 },
  pageContent: { padding: 14, paddingBottom: 116, gap: 12 },
  card: { backgroundColor: C.card, borderRadius: 22, padding: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  sectionHeader: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  eyebrow: { fontSize: 11, fontWeight: '700', color: C.gold, textTransform: 'uppercase', marginBottom: 4 },
  title: { fontSize: 20, fontWeight: '800', color: C.ink },
  body: { fontSize: 14, lineHeight: 21, color: C.soft, marginTop: 4 },
  loadingRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#14212D', padding: 24 },
  loadingCard: { width: '100%', maxWidth: 360, minHeight: 300, backgroundColor: 'rgba(24,36,58,0.92)', borderRadius: 32, padding: 28, alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: 'rgba(234,245,241,0.10)', overflow: 'hidden' },
  loadingAura: { position: 'absolute', width: 260, height: 260, borderRadius: 999, top: -110, right: -56, backgroundColor: C.logoGlow },
  loadingOrbitOuter: { position: 'absolute', width: 176, height: 176, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(169,222,208,0.30)' },
  loadingOrbitMid: { position: 'absolute', width: 128, height: 128, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(234,245,241,0.24)' },
  loadingOrbitArc: { position: 'absolute', width: 148, height: 148, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(169,222,208,0.24)', borderBottomColor: 'transparent', borderLeftColor: 'transparent', transform: [{ rotate: '-18deg' }] },
  loadingCoreWrap: { width: 74, height: 74, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  loadingCoreDot: { width: 20, height: 20, borderRadius: 999, backgroundColor: '#F0E6B9', shadowColor: '#FFF7D2', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.38, shadowRadius: 14 },
  loadingCoreStar: { position: 'absolute', top: 6, width: 7, height: 7, borderRadius: 999, backgroundColor: C.logoMist, shadowColor: '#FFFFFF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.36, shadowRadius: 8 },
  loadingSpinner: { marginBottom: 6 },
  loadingTitle: { fontSize: 28, fontWeight: '800', color: C.logoMist },
  loadingText: { fontSize: 15, lineHeight: 22, color: 'rgba(234,245,241,0.76)', textAlign: 'center', maxWidth: 250 },
  heroCard: { backgroundColor: '#F4FBF8', borderColor: 'rgba(169,222,208,0.22)', shadowColor: '#12343A', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 2, overflow: 'hidden' },
  heroAura: { position: 'absolute', width: 240, height: 240, borderRadius: 999, top: -120, right: -52, backgroundColor: C.logoGlow },
  heroArc: { position: 'absolute', width: 220, height: 220, borderRadius: 999, top: -92, right: -36, borderWidth: 1, borderColor: 'rgba(169,222,208,0.26)' },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  heroEyebrow: { fontSize: 11, fontWeight: '700', color: C.logoDeep, textTransform: 'uppercase' },
  heroTitle: { fontSize: 32, fontWeight: '800', color: C.logoDeep, marginTop: 6, lineHeight: 38 },
  heroSubhead: { fontSize: 13, lineHeight: 19, color: 'rgba(20,51,58,0.60)', marginTop: 8, fontWeight: '600' },
  heroLead: { fontSize: 16, lineHeight: 24, color: C.ink, marginTop: 14, fontWeight: '600' },
  heroHighlightRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  heroHighlightChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.82)', borderWidth: 1, borderColor: 'rgba(169,222,208,0.24)' },
  heroHighlightText: { fontSize: 11, fontWeight: '700', color: C.logoDeep, maxWidth: 120 },
  heroFocusBlock: { marginTop: 16, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.80)', borderWidth: 1, borderColor: 'rgba(169,222,208,0.22)', padding: 14 },
  heroFocusTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6 },
  heroFocusLink: { minHeight: 34, borderRadius: 999, paddingHorizontal: 12, backgroundColor: 'rgba(255,255,255,0.90)', borderWidth: 1, borderColor: 'rgba(169,222,208,0.22)', flexDirection: 'row', alignItems: 'center', gap: 6, shadowColor: '#12343A', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  heroFocusLinkText: { fontSize: 12, fontWeight: '800', color: C.logoDeep },
  heroFocusLinkArrow: { fontSize: 16, fontWeight: '800', color: C.gold, marginTop: -1 },
  heroSectionTitle: { fontSize: 12, fontWeight: '800', color: C.logoDeep, marginBottom: 6 },
  heroFocusText: { fontSize: 16, lineHeight: 24, color: C.logoDeep, fontWeight: '700' },
  heroReminderCard: { marginTop: 10, borderRadius: 16, backgroundColor: 'rgba(169,222,208,0.12)', borderWidth: 1, borderColor: 'rgba(169,222,208,0.22)', paddingHorizontal: 14, paddingVertical: 12 },
  heroReminderLabel: { fontSize: 11, fontWeight: '800', color: C.logoDeep, marginBottom: 4 },
  heroReminderText: { fontSize: 13, lineHeight: 20, color: C.logoDeep, fontWeight: '600' },
  heroReminderOpenButton: { marginTop: 12, minHeight: 50, borderRadius: 999, backgroundColor: C.logoDeep, borderWidth: 1, borderColor: 'rgba(169,222,208,0.28)', paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#12343A', shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  heroReminderOpenInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroReminderOpenIcon: { width: 26, height: 26, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(234,245,241,0.14)', borderWidth: 1, borderColor: 'rgba(234,245,241,0.12)' },
  heroReminderOpenIconText: { fontSize: 15, fontWeight: '800', color: C.logoMist, marginTop: -1 },
  heroReminderOpenText: { fontSize: 14, fontWeight: '800', color: C.logoMist },
  heroReminderOpenArrow: { fontSize: 18, fontWeight: '800', color: C.logoMint },
  heroActionRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  heroActionCard: { flex: 1, minHeight: 112, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.78)', borderWidth: 1, borderColor: 'rgba(143,208,187,0.24)', paddingHorizontal: 14, paddingVertical: 12, justifyContent: 'space-between' },
  heroActionLabel: { fontSize: 11, fontWeight: '800', color: '#2E8A72', marginBottom: 4 },
  heroActionText: { fontSize: 13, lineHeight: 20, color: C.logoDeep, fontWeight: '700' },
  heroAvoidCard: { flex: 1, minHeight: 112, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.76)', borderWidth: 1, borderColor: 'rgba(198,146,42,0.18)', paddingHorizontal: 14, paddingVertical: 12, justifyContent: 'space-between' },
  heroAvoidLabel: { fontSize: 11, fontWeight: '800', color: C.gold, marginBottom: 4 },
  heroAvoidText: { fontSize: 13, lineHeight: 20, color: C.logoDeep, fontWeight: '700' },
  heroDecisionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  heroDecisionCard: { flex: 1, minHeight: 102, borderRadius: 18, padding: 14, borderWidth: 1, justifyContent: 'space-between' },
  heroDecisionGood: { backgroundColor: 'rgba(255,255,255,0.80)', borderColor: 'rgba(143,208,187,0.24)' },
  heroDecisionCaution: { backgroundColor: 'rgba(255,255,255,0.76)', borderColor: 'rgba(198,146,42,0.18)' },
  heroDecisionLabel: { fontSize: 12, fontWeight: '800', color: C.logoDeep },
  heroDecisionText: { fontSize: 13, lineHeight: 20, color: 'rgba(20,51,58,0.74)', marginTop: 8, fontWeight: '600' },
  topButton: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.84)', alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(169,222,208,0.24)' },
  topButtonText: { fontSize: 13, fontWeight: '700', color: C.logoDeep },
  homeEntryDeck: { position: 'relative', borderRadius: 30, padding: 14, backgroundColor: '#F2F8F6', borderWidth: 1, borderColor: 'rgba(169,222,208,0.18)', overflow: 'hidden', gap: 12, shadowColor: '#12343A', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 2 },
  homeEntryDeckGlow: { position: 'absolute', width: 320, height: 320, borderRadius: 999, top: -180, right: -120, backgroundColor: 'rgba(169,222,208,0.12)' },
  homeEntryDeckHeader: { paddingHorizontal: 2, gap: 4 },
  homeEntryDeckEyebrow: { fontSize: 11, fontWeight: '800', color: '#2D7E69', textTransform: 'uppercase', letterSpacing: 1 },
  homeEntryDeckTitle: { fontSize: 22, lineHeight: 28, fontWeight: '800', color: C.logoDeep },
  homeEntryDeckBody: { fontSize: 13, lineHeight: 20, color: 'rgba(20,51,58,0.62)', fontWeight: '600', maxWidth: '92%' },
  homeEntrySecondaryRow: { flexDirection: 'row', gap: 12 },
  homeEntrySecondaryRowCompact: { flexDirection: 'column' },
  homeEntrySecondaryAnimated: { flex: 1 },
  homeEntrySecondaryAnimatedCompact: { flex: 0 },
  aiEntryButton: { marginTop: 0, minHeight: 304, borderRadius: 32, backgroundColor: C.logoNight, borderWidth: 1, borderColor: 'rgba(234,245,241,0.10)', marginBottom: 0, paddingHorizontal: 22, paddingVertical: 22, overflow: 'hidden', shadowColor: '#071018', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.20, shadowRadius: 30, elevation: 7, justifyContent: 'space-between' },
  aiEntryPrimaryButton: { minHeight: 292 },
  aiEntryButtonLocked: { opacity: 0.94, borderColor: 'rgba(228,211,157,0.18)' },
  divinationEntryButton: { minHeight: 228, backgroundColor: '#10223F', borderColor: 'rgba(179,211,255,0.14)' },
  dreamEntryButton: { minHeight: 228, backgroundColor: '#241B3F', borderColor: 'rgba(205,188,255,0.16)' },
  homeEntrySecondaryCard: { flex: 1, minWidth: 0, borderRadius: 28, paddingHorizontal: 18, paddingVertical: 18 },
  homeEntrySecondaryCardCompact: { minHeight: 212 },
  aiEntryJadeGlow: { position: 'absolute', width: 236, height: 236, borderRadius: 999, top: -86, left: -26, backgroundColor: 'rgba(133,217,195,0.18)' },
  aiEntryJadeGlowSoft: { position: 'absolute', width: 188, height: 188, borderRadius: 999, bottom: -74, right: 10, backgroundColor: 'rgba(194,245,227,0.12)' },
  aiEntryAura: { position: 'absolute', width: 230, height: 230, borderRadius: 999, top: -92, right: -28, backgroundColor: C.logoGlow },
  aiEntryAuraSecondary: { position: 'absolute', width: 260, height: 260, borderRadius: 999, bottom: -140, left: -70, backgroundColor: 'rgba(240,230,185,0.12)' },
  aiEntryOrbitLarge: { position: 'absolute', width: 246, height: 246, borderRadius: 999, top: -84, right: -16, borderWidth: 1, borderColor: 'rgba(169,222,208,0.16)' },
  aiEntryOrbitSmall: { position: 'absolute', width: 152, height: 152, borderRadius: 999, bottom: 20, right: 18, borderWidth: 1, borderColor: 'rgba(240,230,185,0.14)' },
  divinationEntryAura: { backgroundColor: 'rgba(127,180,255,0.20)' },
  divinationEntryAuraSecondary: { backgroundColor: 'rgba(141,174,255,0.12)' },
  divinationEntryOrbitLarge: { borderColor: 'rgba(170,212,255,0.18)' },
  divinationEntryOrbitSmall: { borderColor: 'rgba(205,222,255,0.12)' },
  dreamEntryAura: { backgroundColor: 'rgba(182,155,255,0.22)' },
  dreamEntryAuraSecondary: { backgroundColor: 'rgba(255,214,230,0.10)' },
  dreamEntryOrbitLarge: { borderColor: 'rgba(205,188,255,0.18)' },
  dreamEntryOrbitSmall: { borderColor: 'rgba(255,214,230,0.12)' },
  aiEntryTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  aiEntryIconWrap: { width: 46, height: 46, borderRadius: 17, backgroundColor: 'rgba(234,245,241,0.10)', borderWidth: 1, borderColor: 'rgba(234,245,241,0.18)', alignItems: 'center', justifyContent: 'center' },
  divinationEntryIconWrap: { backgroundColor: 'rgba(196,222,255,0.12)', borderColor: 'rgba(196,222,255,0.22)' },
  dreamEntryIconWrap: { backgroundColor: 'rgba(205,188,255,0.12)', borderColor: 'rgba(205,188,255,0.24)' },
  aiEntryIcon: { fontSize: 18, color: C.logoMist },
  aiEntryMetaPill: { minHeight: 30, borderRadius: 999, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(169,222,208,0.12)', borderWidth: 1, borderColor: 'rgba(169,222,208,0.18)' },
  divinationEntryMetaPill: { backgroundColor: 'rgba(127,180,255,0.14)', borderColor: 'rgba(127,180,255,0.24)' },
  dreamEntryMetaPill: { backgroundColor: 'rgba(182,155,255,0.15)', borderColor: 'rgba(182,155,255,0.26)' },
  aiEntryMetaPillText: { fontSize: 11, fontWeight: '700', color: 'rgba(234,245,241,0.86)' },
  aiEntryText: { fontSize: 32, lineHeight: 38, color: C.logoMist, fontWeight: '800', marginTop: 18, letterSpacing: -0.6, maxWidth: '76%' },
  homeEntrySecondaryTitle: { fontSize: 24, lineHeight: 30, marginTop: 16, maxWidth: '100%' },
  homeEntrySecondaryTitleCompact: { fontSize: 22, lineHeight: 28 },
  aiEntrySubline: { fontSize: 13, lineHeight: 19, color: 'rgba(240,230,185,0.74)', marginTop: 10, fontWeight: '700' },
  homeEntrySecondarySubline: { fontSize: 12, lineHeight: 18, marginTop: 8 },
  aiEntryBody: { fontSize: 15, lineHeight: 24, color: 'rgba(234,245,241,0.76)', marginTop: 14, maxWidth: '86%' },
  homeEntrySecondaryBody: { fontSize: 13, lineHeight: 21, marginTop: 12, maxWidth: '100%' },
  aiEntryFooter: { marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  homeEntrySecondaryFooter: { marginTop: 16, justifyContent: 'flex-start' },
  aiEntryActionPill: { minHeight: 42, borderRadius: 999, paddingHorizontal: 14, backgroundColor: 'rgba(234,245,241,0.12)', borderWidth: 1, borderColor: 'rgba(169,222,208,0.26)', flexDirection: 'row', alignItems: 'center', gap: 8, shadowColor: '#78D4BC', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  divinationEntryActionPill: { backgroundColor: 'rgba(214,231,255,0.14)', borderColor: 'rgba(179,211,255,0.28)' },
  dreamEntryActionPill: { backgroundColor: 'rgba(205,188,255,0.14)', borderColor: 'rgba(205,188,255,0.28)' },
  aiEntryAction: { fontSize: 14, fontWeight: '700', color: C.logoMint },
  aiEntryArrow: { fontSize: 18, fontWeight: '800', color: C.logoMint },
  tongshengCard: { position: 'relative', overflow: 'hidden', borderRadius: 34, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: '#17181E', shadowColor: '#05070A', shadowOpacity: 0.24, shadowRadius: 24, shadowOffset: { width: 0, height: 14 }, elevation: 6 },
  tongshengAura: { position: 'absolute', width: 320, height: 320, borderRadius: 999, top: -190, right: -126, backgroundColor: 'rgba(197,160,89,0.08)' },
  tongshengGlowLarge: { position: 'absolute', width: 220, height: 220, borderRadius: 999, top: 18, right: -34, backgroundColor: 'rgba(111,152,128,0.20)' },
  tongshengGlowSmall: { position: 'absolute', width: 124, height: 124, borderRadius: 999, top: 182, left: -42, backgroundColor: 'rgba(230,191,125,0.10)' },
  tongshengHero: { gap: 14 },
  tongshengHeroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 },
  tongshengHeroCopy: { flex: 1, gap: 8, paddingRight: 4 },
  tongshengHeroEyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 2.2, textTransform: 'uppercase', color: 'rgba(229,214,184,0.78)' },
  tongshengHeroTitle: { fontSize: 34, lineHeight: 40, fontWeight: '800', color: '#F5EFE4', letterSpacing: -0.8 },
  tongshengHeroBody: { fontSize: 14, lineHeight: 22, color: 'rgba(242,243,244,0.72)', fontWeight: '500' },
  tongshengDateBadge: { minWidth: 122, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.05)', gap: 6 },
  tongshengDateBadgeLabel: { fontSize: 11, lineHeight: 15, fontWeight: '700', color: 'rgba(226,210,177,0.72)' },
  tongshengDateBadgeValue: { fontSize: 18, lineHeight: 24, fontWeight: '800', color: '#F5EFE4' },
  tongshengSignalRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tongshengSignalPill: { minHeight: 34, borderRadius: 999, paddingHorizontal: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', flexDirection: 'row', alignItems: 'center', gap: 7 },
  tongshengSignalIcon: { fontSize: 12, lineHeight: 16, color: '#D6B679', fontWeight: '900' },
  tongshengSignalText: { fontSize: 12, lineHeight: 17, fontWeight: '700', color: 'rgba(243,245,246,0.80)' },
  tongshengLead: { fontSize: 17, lineHeight: 28, fontWeight: '600', color: 'rgba(244,246,247,0.92)', marginTop: 18 },
  tongshengFeatureCard: { marginTop: 18, borderRadius: 28, paddingHorizontal: 18, paddingVertical: 18, backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 3 },
  tongshengFeatureHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginBottom: 10 },
  tongshengFeatureEyebrow: { fontSize: 11, lineHeight: 16, letterSpacing: 1.6, fontWeight: '800', color: 'rgba(26,26,26,0.52)', textTransform: 'uppercase' },
  tongshengFeatureTitle: { fontSize: 28, lineHeight: 34, fontWeight: '800', color: '#13161D', marginTop: 3 },
  tongshengFeatureIconWrap: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  tongshengFeatureBody: { fontSize: 18, lineHeight: 29, fontWeight: '600', color: 'rgba(26,26,26,0.88)' },
  tongshengGrid: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tongshengGridCard: { width: '48.2%', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 16, backgroundColor: 'rgba(255,255,255,0.90)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', gap: 10, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  tongshengGridCardWide: { width: '100%' },
  tongshengGridHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  tongshengGridKicker: { fontSize: 10, lineHeight: 14, fontWeight: '800', color: 'rgba(26,26,26,0.48)', letterSpacing: 1.4, textTransform: 'uppercase' },
  tongshengGridTitle: { fontSize: 24, lineHeight: 29, fontWeight: '800', color: '#181B20', marginTop: 4 },
  tongshengGridIconWrap: { width: 42, height: 42, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  tongshengGridBody: { fontSize: 15, lineHeight: 24, fontWeight: '600', color: 'rgba(26,26,26,0.78)' },
  tongshengGlyph: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  tongshengGlyphLarge: { width: 28, height: 28 },
  tongshengGlyphRing: { position: 'absolute', width: 22, height: 22, borderRadius: 999, borderWidth: 1.4, opacity: 0.7 },
  tongshengGlyphStroke: { position: 'absolute', borderRadius: 999 },
  tongshengGlyphCore: { position: 'absolute', borderRadius: 999 },
  tongshengGlyphToneMint: { borderColor: '#456A57', backgroundColor: '#456A57' },
  tongshengGlyphTonePearl: { borderColor: '#7F6D59', backgroundColor: '#7F6D59' },
  tongshengGlyphToneAmber: { borderColor: '#A5671E', backgroundColor: '#A5671E' },
  tongshengGlyphToneGold: { borderColor: '#97702B', backgroundColor: '#97702B' },
  tongshengGlyphToneRose: { borderColor: '#A16467', backgroundColor: '#A16467' },
  tongshengGlyphBalanceLeft: { width: 8, height: 1.6, top: 11, left: 3, transform: [{ rotate: '-18deg' }] },
  tongshengGlyphBalanceRight: { width: 8, height: 1.6, top: 11, right: 3, transform: [{ rotate: '18deg' }] },
  tongshengGlyphBalancePole: { width: 2.6, height: 11, top: 6 },
  tongshengGlyphTrail: { width: 12, height: 1.8, top: 11, left: 4 },
  tongshengGlyphTrailDot: { width: 5, height: 5, right: 3, top: 9.4 },
  tongshengGlyphSparkCenter: { width: 5, height: 5 },
  tongshengGlyphSparkNorth: { width: 1.8, height: 7, top: 2 },
  tongshengGlyphSparkEast: { width: 7, height: 1.8, right: 2 },
  tongshengGlyphSparkSouth: { width: 1.8, height: 7, bottom: 2 },
  tongshengGlyphSparkWest: { width: 7, height: 1.8, left: 2 },
  tongshengGlyphWealthArc: { width: 14, height: 8, borderTopLeftRadius: 10, borderTopRightRadius: 10, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, top: 6, backgroundColor: 'transparent', borderWidth: 1.5 },
  tongshengGlyphWealthCore: { width: 6, height: 6, bottom: 4 },
  tongshengGlyphPetal: { width: 7, height: 7, borderRadius: 5 },
  tongshengGlyphPetalTop: { top: 2 },
  tongshengGlyphPetalRight: { right: 2 },
  tongshengGlyphPetalBottom: { bottom: 2 },
  tongshengGlyphPetalLeft: { left: 2 },
  tongshengGlyphPetalCenter: { width: 4, height: 4 },
  tongshengAccentMint: { backgroundColor: 'rgba(185,221,201,0.72)', borderColor: 'rgba(98,141,116,0.20)' },
  tongshengAccentPearl: { backgroundColor: 'rgba(240,231,223,0.78)', borderColor: 'rgba(196,176,152,0.18)' },
  tongshengAccentAmber: { backgroundColor: 'rgba(236,203,150,0.78)', borderColor: 'rgba(196,138,42,0.18)' },
  tongshengAccentGold: { backgroundColor: 'rgba(238,214,150,0.82)', borderColor: 'rgba(190,151,70,0.18)' },
  tongshengAccentRose: { backgroundColor: 'rgba(240,205,204,0.84)', borderColor: 'rgba(191,133,132,0.18)' },
  tongshengActionRow: { marginTop: 18, gap: 10 },
  tongshengPrimaryButton: { minHeight: 54, borderRadius: 999, backgroundColor: '#C5A059', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, shadowColor: '#C5A059', shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  tongshengPrimaryButtonText: { fontSize: 14, fontWeight: '900', color: '#15171E', letterSpacing: 0.2 },
  tongshengSecondaryActions: { flexDirection: 'row', gap: 10 },
  tongshengGhostButton: { flex: 1, minHeight: 46, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  tongshengGhostButtonText: { fontSize: 13, fontWeight: '800', color: 'rgba(243,245,246,0.82)' },
  pageTopBackBar: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 4, paddingVertical: 2, marginBottom: 2 },
  pageTopBackButton: { minHeight: 38, borderRadius: 999, paddingHorizontal: 14, backgroundColor: 'rgba(18,52,58,0.06)', borderWidth: 1, borderColor: 'rgba(18,52,58,0.10)', alignItems: 'center', justifyContent: 'center' },
  pageTopBackButtonDisabled: { opacity: 0.58 },
  pageTopBackButtonText: { fontSize: 12, fontWeight: '800', color: '#254B4A' },
  pageTopBackButtonTextDisabled: { color: 'rgba(37,75,74,0.58)' },
  pageTopBackCopy: { flex: 1, gap: 3, paddingTop: 2 },
  pageTopBackTitle: { fontSize: 16, lineHeight: 21, fontWeight: '800', color: C.logoDeep },
  pageTopBackSubtitle: { fontSize: 12, lineHeight: 18, color: 'rgba(20,51,58,0.56)' },
  tongshengPageCard: { borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: '#1B1D23', shadowColor: '#040507', shadowOpacity: 0.16, shadowRadius: 20, shadowOffset: { width: 0, height: 12 }, elevation: 3 },
  tongshengPageHeader: { gap: 6, marginBottom: 6 },
  tongshengPageEyebrow: { fontSize: 11, fontWeight: '700', color: 'rgba(226,210,177,0.72)', textTransform: 'uppercase', letterSpacing: 2 },
  tongshengPageTitle: { fontSize: 24, lineHeight: 31, fontWeight: '800', color: '#F5EFE4' },
  tongshengPageBody: { fontSize: 14, lineHeight: 22, color: 'rgba(243,245,246,0.68)', fontWeight: '500' },
  tongshengPageLead: { fontSize: 15, lineHeight: 24, color: 'rgba(243,245,246,0.76)', fontWeight: '600' },
  tongshengPageChecklist: { marginTop: 4, gap: 12 },
  tongshengPageChecklistItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 2 },
  tongshengPageChecklistBadge: { width: 28, height: 28, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(197,160,89,0.14)', borderWidth: 1, borderColor: 'rgba(197,160,89,0.26)', marginTop: 2 },
  tongshengPageChecklistBadgeText: { fontSize: 12, fontWeight: '900', color: '#D1B276' },
  tongshengPageChecklistCopy: { flex: 1, gap: 4 },
  tongshengPageChecklistTitle: { fontSize: 13, lineHeight: 18, fontWeight: '900', color: '#F3E8CF' },
  tongshengPageChecklistBody: { fontSize: 14, lineHeight: 22, color: 'rgba(243,245,246,0.76)', fontWeight: '600' },
  pwaInstallCard: { borderRadius: 24, backgroundColor: 'rgba(11,16,32,0.94)', borderWidth: 1, borderColor: 'rgba(169,222,208,0.14)', paddingHorizontal: 18, paddingVertical: 18, marginTop: -2, marginBottom: 12, shadowColor: '#08111D', shadowOpacity: 0.14, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 4, gap: 14 },
  pwaInstallCopy: { gap: 6 },
  pwaInstallEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase', color: 'rgba(234,245,241,0.58)' },
  pwaInstallTitle: { fontSize: 20, lineHeight: 26, fontWeight: '800', color: '#F4F8F6' },
  pwaInstallBody: { fontSize: 14, lineHeight: 22, color: 'rgba(234,245,241,0.82)' },
  pwaInstallButton: { alignSelf: 'flex-start', minHeight: 42, borderRadius: 999, paddingHorizontal: 15, backgroundColor: 'rgba(234,245,241,0.12)', borderWidth: 1, borderColor: 'rgba(228,211,157,0.28)', justifyContent: 'center' },
  pwaInstallButtonText: { fontSize: 14, fontWeight: '700', color: '#E4D39D' },
  installSheetHero: { gap: 8, marginBottom: 8 },
  installSheetHeroTitle: { fontSize: 18, lineHeight: 24, fontWeight: '800', color: C.ink },
  installSheetHeroBody: { fontSize: 14, lineHeight: 22, color: C.soft },
  installStepList: { gap: 10 },
  installStepCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 18, borderWidth: 1, borderColor: C.line, backgroundColor: '#FFF', paddingHorizontal: 14, paddingVertical: 14 },
  installStepIndex: { width: 24, height: 24, borderRadius: 999, backgroundColor: '#FBF4E3', color: C.gold, fontSize: 12, fontWeight: '800', textAlign: 'center', lineHeight: 24 },
  installStepText: { flex: 1, fontSize: 14, lineHeight: 21, color: C.ink },
  installSheetActions: { flexDirection: 'row', gap: 10, marginTop: 16, alignItems: 'center', justifyContent: 'flex-end' },
  installSheetGhostButton: { minWidth: 92, height: 44, borderRadius: 999, borderWidth: 1, borderColor: C.line, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  installSheetGhostButtonText: { fontSize: 13, fontWeight: '700', color: C.ink },
  installSheetPrimaryButton: { minWidth: 108, height: 44, borderRadius: 999, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  installSheetPrimaryButtonText: { fontSize: 13, fontWeight: '800', color: '#FFF' },
  aiInstallReminderCard: { marginHorizontal: 12, marginTop: 2, marginBottom: 10, borderRadius: 18, backgroundColor: 'rgba(11,16,32,0.96)', borderWidth: 1, borderColor: 'rgba(228,211,157,0.18)', paddingHorizontal: 14, paddingVertical: 14, gap: 12 },
  aiInstallReminderCopy: { gap: 4 },
  aiInstallReminderTitle: { fontSize: 15, fontWeight: '800', color: '#F4F8F6' },
  aiInstallReminderBody: { fontSize: 13, lineHeight: 19, color: 'rgba(234,245,241,0.78)' },
  aiInstallReminderActions: { flexDirection: 'row', gap: 10 },
  aiInstallReminderGhost: { minWidth: 76, height: 40, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  aiInstallReminderGhostText: { fontSize: 12, fontWeight: '700', color: 'rgba(244,248,246,0.78)' },
  aiInstallReminderButton: { minWidth: 108, height: 40, borderRadius: 999, backgroundColor: '#E4D39D', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  aiInstallReminderButtonText: { fontSize: 12, fontWeight: '800', color: '#10222B' },
  heroStatsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  heroStatCard: { flex: 1, minHeight: 78, backgroundColor: 'rgba(255,255,255,0.80)', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(169,222,208,0.20)', justifyContent: 'space-between' },
  heroStatPrimary: { backgroundColor: 'rgba(255,248,232,0.88)', borderColor: 'rgba(198,146,42,0.18)' },
  heroStatLabel: { fontSize: 11, color: 'rgba(20,51,58,0.54)', fontWeight: '700' },
  heroStatValue: { fontSize: 14, color: C.logoDeep, fontWeight: '700', lineHeight: 20 },
  darkCard: { backgroundColor: C.hero },
  darkEyebrow: { fontSize: 11, fontWeight: '700', color: C.gold, textTransform: 'uppercase' },
  darkTitle: { fontSize: 26, lineHeight: 32, color: '#FFF', fontWeight: '800', marginTop: 8 },
  darkBody: { fontSize: 14, lineHeight: 21, color: 'rgba(255,255,255,0.72)', marginTop: 8 },
  summaryCard: { backgroundColor: C.logoDeep, borderColor: 'rgba(234,245,241,0.10)', overflow: 'hidden' },
  summaryAura: { position: 'absolute', width: 210, height: 210, borderRadius: 999, top: -98, right: -42, backgroundColor: 'rgba(169,222,208,0.16)' },
  summaryEyebrow: { fontSize: 11, fontWeight: '700', color: 'rgba(234,245,241,0.72)', textTransform: 'uppercase' },
  summaryTitle: { fontSize: 22, lineHeight: 29, color: C.logoMist, fontWeight: '800', marginTop: 6 },
  summaryBody: { fontSize: 14, lineHeight: 21, color: 'rgba(234,245,241,0.84)', marginTop: 8 },
  toolsCard: { backgroundColor: '#F5FBF8', borderColor: 'rgba(169,222,208,0.22)', overflow: 'hidden' },
  toolsCardAura: { position: 'absolute', width: 180, height: 180, borderRadius: 999, top: -70, left: -40, backgroundColor: 'rgba(169,222,208,0.14)' },
  weeklyCard: { borderRadius: 20, borderWidth: 1, borderColor: C.line, padding: 14, marginTop: 10, backgroundColor: '#FFFFFF' },
  weeklyCardExpanded: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 16 },
  weeklyHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weeklyHeadMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  weeklyHeadTextWrap: { flex: 1 },
  weeklyDot: { width: 10, height: 10, borderRadius: 99 },
  weeklyTitle: { fontSize: 15, fontWeight: '700', color: C.ink, marginBottom: 4 },
  weeklyAdvice: { fontSize: 14, lineHeight: 22, color: C.soft },
  weeklyCue: { fontSize: 12, lineHeight: 18, color: C.gold, fontWeight: '700' },
  weeklyChevronWrap: { width: 28, height: 28, borderRadius: 999, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(118,118,128,0.06)' },
  weeklyChevron: { fontSize: 18, lineHeight: 20, color: C.faint, fontWeight: '700' },
  weeklyBodyWrap: { marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  toolLauncherGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  toolLauncherCard: { width: '48%', minHeight: 118, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(169,222,208,0.20)', backgroundColor: 'rgba(255,255,255,0.84)', padding: 12, justifyContent: 'space-between' },
  toolLauncherCardLocked: { opacity: 0.86, borderColor: 'rgba(228,211,157,0.20)' },
  toolLauncherTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  toolLauncherIcon: { width: 34, height: 34, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  toolLauncherIconText: { fontSize: 16, fontWeight: '700' },
  toolLauncherCtaPill: { minHeight: 28, borderRadius: 999, paddingHorizontal: 10, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  toolLauncherCtaText: { fontSize: 11, fontWeight: '800' },
  toolLauncherCtaArrow: { fontSize: 15, fontWeight: '800', marginTop: -1 },
  toolLauncherTitle: { fontSize: 15, fontWeight: '700', color: C.ink, marginTop: 10 },
  toolLauncherHint: { fontSize: 12, lineHeight: 18, color: C.soft, marginTop: 4 },
  toolPageRoot: { flex: 1 },
  toolPageTopBar: { paddingHorizontal: 18, paddingBottom: 12, backgroundColor: 'rgba(242,248,247,0.92)', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(20,51,58,0.10)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 18, elevation: 4 },
  toolPageHero: { backgroundColor: '#FFFFFF', padding: 18, borderRadius: 22, borderWidth: 1, borderColor: C.line, overflow: 'hidden' },
  toolBackButton: { minWidth: 128, minHeight: 42, borderRadius: 999, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.94)', borderWidth: 1, borderColor: 'rgba(20,51,58,0.08)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  toolBackButtonText: { fontSize: 14, fontWeight: '800', color: C.logoDeep },
  toolTopTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '800', color: C.logoDeep },
  toolTopSpacer: { minWidth: 104 },
  toolHeroAura: { position: 'absolute', width: 176, height: 176, borderRadius: 88, top: -68, right: -42 },
  toolHeroArc: { position: 'absolute', width: 190, height: 190, borderRadius: 95, top: -56, right: -58, borderWidth: 1 },
  toolHeroArcSmall: { position: 'absolute', width: 124, height: 124, borderRadius: 62, top: 16, right: -8, borderWidth: 1 },
  toolHeroHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  toolPageBadge: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  toolPageBadgeText: { fontSize: 18, fontWeight: '700' },
  toolHeroAccentBand: { minWidth: 88, height: 30, borderRadius: 999, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, backgroundColor: 'rgba(255,255,255,0.84)' },
  toolHeroAccentFill: { width: 26, height: 6, borderRadius: 999 },
  toolHeroAccentText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  toolPageTitle: { fontSize: 24, lineHeight: 30, fontWeight: '800', color: C.ink },
  toolPageBody: { marginTop: 8, fontSize: 14, lineHeight: 22, color: C.soft },
  toolDetailPanel: { marginTop: 14, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  toolDetailTitle: { fontSize: 16, fontWeight: '800', color: C.ink, marginBottom: 12 },
  toolResultText: { fontSize: 14, lineHeight: 22, color: C.ink, marginTop: 12, padding: 14, borderRadius: 16, backgroundColor: 'rgba(118,118,128,0.08)' },
  divinationSummaryCard: { marginTop: 12, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(127,180,255,0.24)', backgroundColor: 'rgba(127,180,255,0.08)', padding: 14 },
  divinationSummaryTitle: { fontSize: 15, fontWeight: '800', color: C.ink },
  divinationPreviewCard: { marginBottom: 12, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(127,180,255,0.20)', backgroundColor: 'rgba(127,180,255,0.08)', padding: 14 },
  divinationPreviewLabel: { fontSize: 12, fontWeight: '800', color: '#40679E', marginBottom: 6 },
  divinationPreviewText: { fontSize: 14, lineHeight: 22, color: C.ink, fontWeight: '600' },
  divinationRitualCard: {
    marginTop: 4,
    marginBottom: 14,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFF8EA',
    borderWidth: 1,
    borderColor: 'rgba(198,146,42,0.24)',
    shadowColor: '#C6922A',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  divinationRitualHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  divinationRitualSeal: {
    width: 42,
    height: 42,
    borderRadius: 16,
    overflow: 'hidden',
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 42,
    backgroundColor: '#12343A',
    color: '#F7E7B6',
    fontSize: 20,
    fontWeight: '900',
  },
  divinationRitualTitle: { fontSize: 18, lineHeight: 24, fontWeight: '900', color: '#5E3906' },
  divinationRitualIntro: { marginTop: 4, fontSize: 13, lineHeight: 20, color: 'rgba(94,57,6,0.74)', fontWeight: '600' },
  divinationRitualList: { marginTop: 14, gap: 10 },
  divinationRitualItem: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(198,146,42,0.14)',
  },
  divinationRitualItemTitle: { fontSize: 13, lineHeight: 18, fontWeight: '900', color: '#7E4A00' },
  divinationRitualItemBody: { marginTop: 2, fontSize: 12, lineHeight: 18, color: 'rgba(94,57,6,0.74)', fontWeight: '600' },
  divinationRitualModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(7,18,24,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  divinationRitualModalCard: {
    width: '100%',
    maxWidth: 430,
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: '#FFF8EA',
    borderWidth: 1,
    borderColor: 'rgba(198,146,42,0.26)',
    shadowColor: '#071218',
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  divinationRitualTrigger: {
    minHeight: 42,
    marginBottom: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(198,146,42,0.20)',
    backgroundColor: 'rgba(255,248,234,0.76)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  divinationRitualTriggerSeal: {
    width: 26,
    height: 26,
    borderRadius: 10,
    overflow: 'hidden',
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 26,
    backgroundColor: '#12343A',
    color: '#F7E7B6',
    fontSize: 14,
    fontWeight: '900',
  },
  divinationRitualTriggerText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '800', color: '#7E4A00' },
  divinationRitualCloseButton: {
    minHeight: 46,
    marginTop: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#12343A',
  },
  divinationRitualCloseText: { fontSize: 14, fontWeight: '900', color: '#F7FFFC' },
  divinationComposer: {
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(160,189,246,0.92)',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    shadowColor: '#12343A',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  dreamComposerShell: {
    marginTop: 2,
    borderRadius: 26,
    padding: 10,
    backgroundColor: 'rgba(248,244,255,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(182,155,255,0.22)',
    shadowColor: '#5A3E8B',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  divinationComposerInput: {
    minHeight: 92,
    borderRadius: 18,
    backgroundColor: 'rgba(246,249,255,0.96)',
    borderWidth: 1.5,
    borderColor: 'rgba(187,207,247,0.98)',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: 'top',
    color: C.ink,
    fontSize: 15,
    lineHeight: 22,
  },
  divinationComposerHint: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(20,51,58,0.58)',
    fontWeight: '600',
    paddingHorizontal: 4,
  },
  divinationTimeHintRow: {
    marginTop: 2,
    marginBottom: 8,
    paddingHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  divinationTimeHintDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#C6922A',
  },
  divinationTimeHintText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(20,51,58,0.62)',
    fontWeight: '700',
  },
  divinationLoadingCard: { marginTop: 14, minHeight: 420, borderRadius: 26, backgroundColor: '#10223F', borderWidth: 1, borderColor: 'rgba(179,211,255,0.14)', paddingHorizontal: 18, paddingVertical: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  divinationLoadingAura: { position: 'absolute', width: 360, height: 360, borderRadius: 999, top: -120, right: -40, backgroundColor: 'rgba(127,180,255,0.18)' },
  divinationLoadingOrbitOuter: { position: 'absolute', width: 300, height: 300, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(196,222,255,0.18)' },
  divinationLoadingOrbitInner: { position: 'absolute', width: 220, height: 220, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(234,245,241,0.18)' },
  divinationLoadingSymbolWrap: { width: '100%', maxWidth: 420, height: 300, borderRadius: 32, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(234,245,241,0.18)', backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center', marginBottom: 18, overflow: 'hidden' },
  divinationLoadingVideo: { width: '100%', height: '100%', borderRadius: 30 },
  divinationLoadingVideoFallback: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', opacity: 0.14 },
  divinationLoadingVideoFallbackHidden: { opacity: 0 },
  divinationLoadingSymbolBox: { width: 84, height: 84, borderRadius: 28, borderWidth: 1, borderColor: 'rgba(234,245,241,0.18)', backgroundColor: 'rgba(234,245,241,0.08)', alignItems: 'center', justifyContent: 'center' },
  divinationLoadingSymbolText: { fontSize: 34, fontWeight: '800', color: '#EAF5F1' },
  divinationLoadingTitle: { fontSize: 26, lineHeight: 32, fontWeight: '800', color: '#F1F7FF' },
  divinationLoadingBody: { fontSize: 14, lineHeight: 22, color: 'rgba(241,247,255,0.74)', textAlign: 'center', marginTop: 10, maxWidth: 320 },
  divinationReadyWrap: { marginTop: 12, alignItems: 'center' },
  divinationReadyTitle: { fontSize: 22, lineHeight: 28, fontWeight: '800', color: '#F5E9BC' },
  divinationReadyText: { fontSize: 14, lineHeight: 22, color: 'rgba(241,247,255,0.78)', textAlign: 'center', marginTop: 8, maxWidth: 320 },
  divinationResultHero: { backgroundColor: '#0F213D', borderColor: 'rgba(179,211,255,0.14)', padding: 18, overflow: 'hidden' },
  divinationResultEyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(214,230,255,0.72)' },
  divinationResultTitle: { fontSize: 28, lineHeight: 34, color: '#F1F7FF', fontWeight: '800', marginTop: 10, maxWidth: '84%' },
  divinationResultBody: { fontSize: 15, lineHeight: 24, color: 'rgba(241,247,255,0.80)', marginTop: 12, fontWeight: '600' },
  divinationEngineLead: {
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(18,52,58,0.10)',
    backgroundColor: 'rgba(18,52,58,0.045)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    lineHeight: 21,
    fontWeight: '800',
    color: '#12343A',
  },
  divinationDecisionPanel: {
    marginTop: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(196,224,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  divinationDecisionEyebrow: { fontSize: 11, lineHeight: 15, fontWeight: '800', letterSpacing: 0.8, color: 'rgba(214,230,255,0.70)' },
  divinationDecisionScore: { marginTop: 2, fontSize: 32, lineHeight: 38, fontWeight: '900', color: '#F5E9BC' },
  divinationDecisionBadge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(245,233,188,0.14)', borderWidth: 1, borderColor: 'rgba(245,233,188,0.24)' },
  divinationDecisionBadgeText: { fontSize: 13, lineHeight: 18, fontWeight: '800', color: '#F5E9BC' },
  divinationTimelineRow: { marginTop: 12, flexDirection: 'row', gap: 8 },
  divinationTimelineNode: { flex: 1, minHeight: 76, borderRadius: 18, paddingHorizontal: 10, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(214,230,255,0.12)' },
  divinationTimelineLabel: { fontSize: 10, lineHeight: 14, fontWeight: '800', color: 'rgba(214,230,255,0.62)' },
  divinationTimelinePalace: { marginTop: 4, fontSize: 18, lineHeight: 23, fontWeight: '900', color: '#F1F7FF' },
  divinationTimelineMeta: { marginTop: 2, fontSize: 11, lineHeight: 16, fontWeight: '700', color: 'rgba(245,233,188,0.82)' },
  dreamResultHero: { backgroundColor: '#261A46', borderColor: 'rgba(205,188,255,0.16)', padding: 18, overflow: 'hidden' },
  divinationTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  divinationTag: { minHeight: 30, paddingHorizontal: 10, borderRadius: 999, backgroundColor: 'rgba(82,183,136,0.12)', borderWidth: 1, borderColor: 'rgba(82,183,136,0.20)', justifyContent: 'center' },
  divinationTagText: { fontSize: 12, fontWeight: '700', color: '#198754' },
  divinationTagAvoid: { backgroundColor: 'rgba(255,159,10,0.12)', borderColor: 'rgba(255,159,10,0.20)' },
  divinationTagAvoidText: { color: '#B06B00' },
  divinationGuideButton: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(214,230,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  divinationGuideButtonEyebrow: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(214,230,255,0.72)',
  },
  divinationGuideButtonTitle: {
    marginTop: 4,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    color: '#F1F7FF',
  },
  divinationGuideButtonBody: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(241,247,255,0.76)',
    fontWeight: '600',
  },
  divinationDetailTimeline: { gap: 10 },
  divinationDetailTimelineItem: { borderRadius: 18, borderWidth: 1, borderColor: 'rgba(18,52,58,0.08)', backgroundColor: 'rgba(18,52,58,0.035)', paddingHorizontal: 13, paddingVertical: 12 },
  divinationDetailTimelineTitle: { fontSize: 14, lineHeight: 20, fontWeight: '800', color: C.ink },
  divinationDetailTimelineBody: { marginTop: 4, fontSize: 13, lineHeight: 21, fontWeight: '600', color: C.soft },
  moodChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  moodChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: C.line, backgroundColor: '#FFF' },
  moodChipText: { fontSize: 13, fontWeight: '700', color: C.ink },
  questionBlock: { gap: 8, marginBottom: 12 },
  questionText: { fontSize: 14, fontWeight: '600', color: C.ink },
  dreamExampleCard: {
    marginBottom: 14,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'rgba(241,236,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(182,155,255,0.24)',
  },
  dreamExampleEyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(90,67,140,0.70)' },
  dreamExampleTitle: { marginTop: 6, fontSize: 21, lineHeight: 28, fontWeight: '800', color: '#2E2152' },
  dreamExampleBody: { marginTop: 8, fontSize: 14, lineHeight: 22, color: 'rgba(46,33,82,0.78)', fontWeight: '600' },
  dreamExampleRow: { marginTop: 14, gap: 8 },
  dreamExampleChip: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(182,155,255,0.24)',
  },
  dreamExampleChipText: { fontSize: 13, lineHeight: 20, color: '#433168', fontWeight: '700' },
  answerInput: { minHeight: 88, borderRadius: 18, backgroundColor: 'rgba(118,118,128,0.08)', padding: 12, textAlignVertical: 'top', color: C.ink },
  toolFootnote: { fontSize: 13, lineHeight: 20, color: C.soft, marginTop: 10 },
  growthGrid: { flexDirection: 'row', gap: 10, marginTop: 4, marginBottom: 8 },
  growthCard: { flex: 1, minHeight: 86, borderRadius: 16, borderWidth: 1, borderColor: C.line, backgroundColor: '#FFF', padding: 12, justifyContent: 'space-between' },
  growthValue: { fontSize: 18, fontWeight: '800', color: C.ink },
  growthLabel: { fontSize: 12, lineHeight: 18, color: C.soft },
  primaryButton: { height: 50, borderRadius: 999, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  primaryButtonText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  toolActionButton: { marginTop: 12 },
  divinationActionButton: { shadowColor: '#12343A', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  divinationActionButtonPressed: { opacity: 0.88, transform: [{ scale: 0.995 }] },
  toolActionButtonInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  toolActionSpinner: { marginRight: 8 },
  toolFeedbackBar: { minHeight: 44, marginTop: 10, borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  toolFeedbackBarWarning: { minHeight: 72, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, shadowColor: '#FF9F0A', shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  toolFeedbackDot: { width: 10, height: 10, borderRadius: 999 },
  toolFeedbackText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  toolFeedbackTextWarning: { fontSize: 16, lineHeight: 24, fontWeight: '800' },
  toolQuotaButton: { height: 44, borderRadius: 999, marginTop: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: C.logoDeep, shadowColor: '#78D4BC', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  toolQuotaButtonText: { fontSize: 14, fontWeight: '800', color: '#F7FFFC' },
  divinationWarningCard: {
    marginTop: 12,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: '#FFF8EE',
    borderWidth: 1,
    borderColor: 'rgba(240,158,55,0.30)',
    shadowColor: '#D08A1A',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  divinationWarningBadge: {
    alignSelf: 'flex-start',
    minHeight: 28,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(233,168,68,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(233,168,68,0.24)',
    marginBottom: 10,
  },
  divinationWarningBadgeText: { fontSize: 12, fontWeight: '800', color: '#A66400' },
  divinationWarningTitle: { fontSize: 20, lineHeight: 28, fontWeight: '900', color: '#7E4A00' },
  divinationWarningBody: { marginTop: 8, fontSize: 15, lineHeight: 24, color: '#8E5A17', fontWeight: '600' },
  divinationWarningButton: {
    marginTop: 16,
    minHeight: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#12343A',
    shadowColor: '#12343A',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  divinationWarningButtonText: { fontSize: 15, fontWeight: '800', color: '#F7FFFC' },
  secondaryGhostButton: { height: 46, borderRadius: 999, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', marginTop: 12, backgroundColor: 'rgba(118,118,128,0.06)' },
  secondaryGhostButtonText: { fontSize: 14, fontWeight: '700', color: C.soft },
  pillarHeroRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 12 },
  pillarHeroCard: { flex: 1, minHeight: 86, borderRadius: 18, paddingHorizontal: 10, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(28,28,30,0.06)', justifyContent: 'space-between' },
  pillarHeroLabel: { fontSize: 11, fontWeight: '700', color: C.faint, textAlign: 'center' },
  pillarHeroValue: { fontSize: 24, fontWeight: '800', color: C.ink, textAlign: 'center', marginTop: 4 },
  pillarHeroMeta: { fontSize: 11, lineHeight: 16, color: C.soft, textAlign: 'center', marginTop: 6 },
  pillarHeroHint: { fontSize: 10, lineHeight: 15, color: C.faint, textAlign: 'center', marginTop: 6 },
  matrix: { borderRadius: 18, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  matrixRow: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  sideCell: { width: 64, minHeight: 68, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFB', borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: C.line, padding: 6 },
  headerCell: { flex: 1, minHeight: 54, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F3EA', borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: C.line },
  headerText: { fontSize: 13, fontWeight: '700', color: C.ink },
  sideLabel: { fontSize: 12, fontWeight: '600', color: C.faint, textAlign: 'center' },
  mainCell: { flex: 1, minHeight: 68, alignItems: 'center', justifyContent: 'center', borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: C.line, padding: 6 },
  glyphCell: { backgroundColor: '#FFFEFB' },
  hiddenCell: { flex: 1, minHeight: 84, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: C.line, padding: 8, justifyContent: 'center' },
  godChip: { borderRadius: 999, backgroundColor: '#FBF7EB', borderWidth: 1, borderColor: '#E6DCC4', paddingHorizontal: 12, paddingVertical: 8, minWidth: 58, alignItems: 'center' },
  godChipText: { fontSize: 13, fontWeight: '700', color: '#9A6B2F' },
  mainGhost: { minWidth: 58, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#1C1C1E' },
  mainGhostText: { fontSize: 13, fontWeight: '800', color: '#FFF' },
  glyphBig: { fontSize: 42, fontWeight: '800' },
  glyphSmall: { fontSize: 38, fontWeight: '700' },
  hiddenRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6, paddingVertical: 2 },
  hiddenStem: { fontSize: 18, fontWeight: '800' },
  hiddenChip: { borderRadius: 999, borderWidth: 1, borderColor: C.line, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#FFF8ED' },
  hiddenChipText: { fontSize: 11, fontWeight: '600', color: C.ink },
  emptyText: { fontSize: 14, color: C.soft },
  infoBand: { marginTop: 8, minHeight: 42, borderRadius: 14, backgroundColor: '#F5F5F7', flexDirection: 'row', gap: 10, paddingHorizontal: 10, paddingVertical: 8 },
  infoBandLabel: { width: 50, fontSize: 13, fontWeight: '600', color: C.faint },
  infoBandGrid: { flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'space-between' },
  infoBandCell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  infoTagPill: { minHeight: 40, width: '100%', borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(198,146,42,0.18)', paddingHorizontal: 8, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' },
  infoTagText: { fontSize: 11, lineHeight: 15, fontWeight: '700', color: C.ink, textAlign: 'center' },
  infoChipGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 6 },
  infoChipGridItem: { width: '48%', minHeight: 26, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#FFF9EF', borderWidth: 1, borderColor: 'rgba(198,146,42,0.18)', alignItems: 'center', justifyContent: 'center' },
  infoChipText: { fontSize: 11, fontWeight: '600', color: C.ink, textAlign: 'center' },
  moreLink: { marginTop: 6, alignSelf: 'center', minHeight: 24, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#FBF4E3', borderWidth: 1, borderColor: 'rgba(198,146,42,0.18)' },
  moreLinkText: { fontSize: 11, fontWeight: '700', color: C.gold },
  infoBandValue: { flex: 1, fontSize: 12, color: C.ink, textAlign: 'center' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  infoRowLabel: { fontSize: 14, color: C.faint },
  infoRowValue: { flex: 1, textAlign: 'right', fontSize: 15, color: C.ink, fontWeight: '500' },
  profileOverviewHero: { marginTop: 2, marginBottom: 8, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 16, backgroundColor: 'rgba(237,246,242,0.92)', borderWidth: 1, borderColor: 'rgba(169,222,208,0.28)', overflow: 'hidden' },
  profileOverviewAura: { position: 'absolute', width: 180, height: 180, borderRadius: 999, top: -88, right: -34, backgroundColor: 'rgba(169,222,208,0.16)' },
  profileOverviewTop: { gap: 4, marginBottom: 14 },
  profileOverviewName: { fontSize: 22, lineHeight: 28, fontWeight: '800', color: C.ink },
  profileOverviewBirth: { fontSize: 13, lineHeight: 19, color: C.soft },
  profileOverviewMetaRow: { flexDirection: 'row', gap: 10 },
  profileOverviewMetaPill: { flex: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.82)', borderWidth: 1, borderColor: 'rgba(169,222,208,0.18)' },
  profileOverviewMetaLabel: { fontSize: 11, lineHeight: 15, color: C.faint, marginBottom: 4 },
  profileOverviewMetaValue: { fontSize: 13, lineHeight: 18, color: C.ink, fontWeight: '700' },
  elementRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  elementLabel: { width: 22, fontSize: 16, fontWeight: '700' },
  track: { flex: 1, height: 14, borderRadius: 999, backgroundColor: '#EEF0F4', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  elementValue: { width: 72, textAlign: 'right', fontSize: 13, color: C.soft },
  linkText: { fontSize: 14, fontWeight: '700', color: C.gold },
  paragraph: { fontSize: 14, lineHeight: 22, color: C.soft },
  weekHeaderRow: { flexDirection: 'row', marginBottom: 6 },
  weekHeaderText: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: C.faint },
  calendarWeek: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  calendarSwitchRow: { flexDirection: 'row', gap: 8 },
  calendarSwitchButton: { minHeight: 34, borderRadius: 999, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5FAF8', borderWidth: 1, borderColor: 'rgba(169,222,208,0.22)' },
  calendarSwitchButtonDisabled: { opacity: 0.38 },
  calendarSwitchText: { fontSize: 12, fontWeight: '800', color: C.logoDeep },
  calendarSwitchTextDisabled: { color: 'rgba(20,51,58,0.34)' },
  dayCell: { position: 'relative', flex: 1, minHeight: 82, borderRadius: 14, backgroundColor: '#FFF', paddingTop: 20, paddingBottom: 8, paddingHorizontal: 5, alignItems: 'center', gap: 2, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line, overflow: 'hidden' },
  dayCellToday: { backgroundColor: '#EEFBF6', borderColor: 'rgba(74,186,154,0.78)', borderWidth: 1.5, shadowColor: '#78D4BC', shadowOpacity: 0.24, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  daySignalRow: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', height: 3 },
  daySignalLine: { flex: 1 },
  daySignalLineYi: { backgroundColor: 'rgba(52,199,89,0.42)' },
  daySignalLineJi: { backgroundColor: 'rgba(255,159,10,0.38)' },
  daySignalLineMuted: { backgroundColor: 'rgba(20,51,58,0.10)' },
  dayCornerHints: { position: 'absolute', top: 7, left: 7, right: 7, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayCornerHint: { width: 7, height: 7, borderRadius: 999, opacity: 0.92 },
  dayCornerHintYi: { backgroundColor: 'rgba(46,155,75,0.78)', shadowColor: '#2E9B4B', shadowOpacity: 0.14, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  dayCornerHintJi: { backgroundColor: 'rgba(232,142,0,0.76)', shadowColor: '#E88E00', shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  dayTodayGlow: { position: 'absolute', inset: 0, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(129,220,196,0.62)', backgroundColor: 'rgba(214,246,236,0.24)', shadowColor: '#FFFFFF', shadowOpacity: 0.08, shadowRadius: 2, shadowOffset: { width: 0, height: 0 } },
  dayTodayBadge: { position: 'absolute', top: 18, right: 4, minWidth: 20, height: 16, borderRadius: 999, paddingHorizontal: 6, backgroundColor: '#DFF7EE', borderWidth: 1, borderColor: 'rgba(46,155,75,0.26)', alignItems: 'center', justifyContent: 'center', shadowColor: '#78D4BC', shadowOpacity: 0.22, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  dayTodayBadgeText: { fontSize: 9, lineHeight: 11, fontWeight: '900', color: '#157A5C', textAlign: 'center' },
  dayCellEmpty: { backgroundColor: 'transparent', borderColor: 'transparent' },
  dayNum: { fontSize: 16, fontWeight: '800', color: C.ink, marginTop: 2 },
  dayNumToday: { color: '#157A5C', textShadowColor: 'rgba(223,247,238,0.92)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 6 },
  dayDot: { width: 7, height: 7, borderRadius: 99 },
  dayLabelWrap: { minHeight: 22, alignItems: 'center', justifyContent: 'center', marginTop: 1, paddingHorizontal: 1 },
  dayLabel: { fontSize: 8, lineHeight: 10, color: C.soft, fontWeight: '700', textAlign: 'center' },
  dayBadgeRow: { flexDirection: 'row', gap: 4, marginTop: 3, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' },
  dayBadge: { minWidth: 20, height: 16, fontSize: 8, lineHeight: 12, fontWeight: '800', color: C.gold, backgroundColor: 'rgba(251,244,227,0.92)', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 999, overflow: 'hidden', textAlign: 'center' },
  dayBadgeReminder: { color: '#1E8E6D', backgroundColor: 'rgba(234,248,241,0.96)', borderWidth: 1, borderColor: 'rgba(30,142,109,0.12)' },
  dayNotePreview: { width: '100%', fontSize: 7, lineHeight: 10, color: 'rgba(20,51,58,0.76)', fontWeight: '600', textAlign: 'center', marginTop: 2, paddingHorizontal: 3 },
  infoStack: { marginBottom: 12 },
  infoStackLabel: { fontSize: 12, fontWeight: '700', color: C.faint, marginBottom: 4 },
  infoStackValue: { fontSize: 15, lineHeight: 22, color: C.ink },
  secondaryButton: { minHeight: 48, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(169,222,208,0.26)', backgroundColor: 'rgba(237,246,242,0.92)', alignItems: 'center', justifyContent: 'center', marginTop: 10, paddingHorizontal: 14, shadowColor: '#12343A', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  secondaryButtonText: { fontSize: 14, fontWeight: '700', color: C.logoDeep },
  dangerButton: { borderColor: 'rgba(255,59,48,0.18)' },
  localeRow: { flexDirection: 'row', gap: 8 },
  localeChip: { borderRadius: 999, backgroundColor: '#F1F2F6', paddingHorizontal: 12, paddingVertical: 8 },
  localeChipActive: { backgroundColor: C.ink },
  localeChipText: { fontSize: 13, fontWeight: '600', color: C.ink },
  localeChipTextActive: { color: '#FFF' },
  benefitList: { gap: 10 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  benefitDot: { width: 8, height: 8, borderRadius: 99, backgroundColor: C.gold },
  benefitText: { fontSize: 14, lineHeight: 20, color: C.ink, flex: 1 },
  memberHeroFooter: { marginTop: 18, alignItems: 'flex-end' },
  memberRegisterButton: {
    minWidth: 112,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberRegisterButtonText: { fontSize: 13, fontWeight: '800', color: '#FFF' },
  premiumInsightCard: { borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 14, marginTop: 10, backgroundColor: '#FFF' },
  premiumInsightEyebrow: { fontSize: 11, fontWeight: '700', color: C.gold, marginBottom: 6 },
  premiumInsightTitle: { fontSize: 15, fontWeight: '800', color: C.ink, marginBottom: 6 },
  premiumInsightBody: { fontSize: 13, lineHeight: 20, color: C.soft },
  premiumGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10, marginTop: 4 },
  premiumGridCard: { width: '48%', minHeight: 84, borderRadius: 16, backgroundColor: '#FBFAF5', borderWidth: 1, borderColor: 'rgba(198,146,42,0.12)', padding: 12, justifyContent: 'center' },
  premiumGridText: { fontSize: 13, lineHeight: 19, fontWeight: '700', color: C.ink },
  roadmapRow: { flexDirection: 'row', gap: 12, marginTop: 12, alignItems: 'flex-start' },
  roadmapBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(198,146,42,0.12)' },
  roadmapBadgeText: { fontSize: 11, fontWeight: '700', color: C.gold },
  roadmapBody: { flex: 1, paddingTop: 1 },
  roadmapTitle: { fontSize: 14, fontWeight: '800', color: C.ink, marginBottom: 4 },
  roadmapText: { fontSize: 13, lineHeight: 20, color: C.soft },
  memberGroupBlock: { marginTop: 8 },
  memberGroupHeaderCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: '#FFF',
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  memberGroupHeaderMain: { flex: 1 },
  memberGroupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  memberGroupTitle: { fontSize: 17, fontWeight: '800', color: C.ink },
  memberGroupCount: { fontSize: 12, fontWeight: '700', color: C.gold, backgroundColor: '#FBF4E3', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  memberGroupSummary: { fontSize: 14, lineHeight: 21, color: C.ink, marginTop: 8, fontWeight: '600' },
  memberGroupBody: { fontSize: 13, lineHeight: 20, color: C.soft, marginTop: 6 },
  memberGroupToggle: { fontSize: 12, fontWeight: '800', color: C.gold, paddingTop: 2 },
  memberEntryCard: { borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 14, marginTop: 10, backgroundColor: '#FFF' },
  memberEntryTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 6, alignItems: 'center' },
  memberEntryTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: C.ink },
  memberEntryAction: { fontSize: 12, fontWeight: '700', color: C.gold },
  memberEntrySummary: { fontSize: 13, lineHeight: 20, color: C.soft },
  familyLockCard: { borderRadius: 16, backgroundColor: '#F6F7FB', borderWidth: 1, borderColor: C.line, padding: 14, marginTop: 4 },
  familyLockTitle: { fontSize: 15, fontWeight: '800', color: C.ink },
  familyLockBody: { fontSize: 13, lineHeight: 20, color: C.soft, marginTop: 6 },
  familySummaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2, marginBottom: 2 },
  familyCountPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#FBF4E3' },
  familyCountText: { fontSize: 11, fontWeight: '700', color: C.gold },
  familySummaryText: { flex: 1, fontSize: 13, lineHeight: 19, color: C.soft },
  familyCreateButton: { backgroundColor: '#FBFAF5', borderColor: 'rgba(198,146,42,0.18)' },
  familyList: { marginTop: 12, gap: 10 },
  familyProfileCard: { borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 14, backgroundColor: '#FFF' },
  familyProfileCardActive: { borderColor: 'rgba(198,146,42,0.28)', backgroundColor: '#FFFCF5' },
  familyProfileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 4 },
  familyProfileHead: { flex: 1, gap: 4 },
  familyProfileTitle: { fontSize: 15, fontWeight: '800', color: C.ink },
  familyProfileMeta: { fontSize: 12, lineHeight: 18, color: C.soft },
  familyActivePill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#FBF4E3' },
  familyActiveText: { fontSize: 11, fontWeight: '700', color: C.gold },
  familyActionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  familyActionButton: { flex: 1, minHeight: 42, borderRadius: 14, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  familyActionButtonActive: { borderColor: 'rgba(198,146,42,0.22)', backgroundColor: '#FBFAF5' },
  familyActionText: { fontSize: 13, fontWeight: '700', color: C.ink },
  familyActionTextActive: { color: C.gold },
  familyDeleteButton: { borderColor: 'rgba(255,59,48,0.18)', backgroundColor: '#FFF8F7' },
  familyDeleteText: { color: C.danger },
  familyEmptyCard: { borderRadius: 16, backgroundColor: '#F7F8FA', borderWidth: 1, borderColor: C.line, padding: 14, marginTop: 12 },
  familyEmptyTitle: { fontSize: 14, fontWeight: '800', color: C.ink },
  familyEmptyBody: { fontSize: 13, lineHeight: 20, color: C.soft, marginTop: 6 },
  aiPageRoot: { flex: 1, backgroundColor: '#EEF3F1' },
  readyMask: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 24 },
  readyScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,16,24,0.24)' },
  readyCard: { width: '100%', maxWidth: 340, minHeight: 260, borderRadius: 30, backgroundColor: 'rgba(24,36,58,0.96)', borderWidth: 1, borderColor: 'rgba(234,245,241,0.10)', paddingHorizontal: 24, paddingVertical: 28, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  readyAura: { position: 'absolute', width: 220, height: 220, borderRadius: 999, top: -92, right: -38, backgroundColor: C.logoGlow },
  readyOrbitOuter: { position: 'absolute', width: 160, height: 160, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(169,222,208,0.28)' },
  readyOrbitInner: { position: 'absolute', width: 116, height: 116, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(234,245,241,0.22)' },
  readyCoreDot: { width: 18, height: 18, borderRadius: 999, backgroundColor: '#F0E6B9', shadowColor: '#FFF7D2', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.36, shadowRadius: 12, marginBottom: 72 },
  readyTitle: { fontSize: 24, lineHeight: 30, fontWeight: '800', color: C.logoMist, textAlign: 'center' },
  readyBody: { fontSize: 14, lineHeight: 22, color: 'rgba(234,245,241,0.78)', textAlign: 'center', marginTop: 10 },
  readyButton: { marginTop: 22, minWidth: 124, height: 44, borderRadius: 999, backgroundColor: '#EDF6F2', paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  readyButtonText: { fontSize: 14, fontWeight: '800', color: '#163238' },
  aiHeader: { backgroundColor: 'rgba(248,251,250,0.96)', paddingTop: 56, paddingBottom: 12, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(20,51,58,0.08)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' },
  aiHeaderAura: { position: 'absolute', width: 180, height: 180, borderRadius: 999, top: -92, right: -16, backgroundColor: C.logoGlow },
  aiHeaderOrbit: { position: 'absolute', width: 140, height: 140, borderRadius: 999, top: -54, right: 18, borderWidth: 1, borderColor: 'rgba(169,222,208,0.24)' },
  aiBackButton: { minWidth: 72, minHeight: 36, borderRadius: 999, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.78)', borderWidth: 1, borderColor: 'rgba(169,222,208,0.22)' },
  aiBackText: { color: C.logoDeep, fontSize: 15, fontWeight: '700' },
  aiHeaderCenter: { flex: 1, paddingHorizontal: 10, alignItems: 'center' },
  aiHeaderTitle: { fontSize: 17, fontWeight: '700', color: C.logoDeep },
  aiHeaderSub: { fontSize: 11, color: 'rgba(20,51,58,0.50)', marginTop: 2 },
  aiHeaderMetaPill: { minHeight: 30, borderRadius: 999, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(169,222,208,0.12)', borderWidth: 1, borderColor: 'rgba(169,222,208,0.18)' },
  aiHeaderMeta: { fontSize: 12, color: C.logoDeep, fontWeight: '700' },
  aiConversationShell: { flex: 1 },
  aiStartShell: { flex: 1, paddingTop: 14, paddingBottom: 14, justifyContent: 'flex-start' },
  aiScroll: { flex: 1 },
  aiScrollContent: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 16, flexGrow: 1, justifyContent: 'flex-end' },
  aiWelcomeBlock: { alignItems: 'center', paddingVertical: 20, borderRadius: 24, backgroundColor: 'rgba(244,251,248,0.76)', borderWidth: 1, borderColor: 'rgba(169,222,208,0.18)', overflow: 'hidden' },
  aiWelcomeAura: { position: 'absolute', width: 220, height: 220, borderRadius: 999, top: -112, right: -48, backgroundColor: 'rgba(169,222,208,0.12)' },
  aiAvatarHero: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  aiAvatarRingOuter: { position: 'absolute', width: 84, height: 84, borderRadius: 42, borderWidth: 1, borderColor: 'rgba(169,222,208,0.34)' },
  aiAvatarRingInner: { position: 'absolute', width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(169,222,208,0.12)', borderWidth: 1, borderColor: 'rgba(169,222,208,0.24)' },
  aiAvatarStar: { position: 'absolute', top: 8, width: 8, height: 8, borderRadius: 999, backgroundColor: C.logoMist, shadowColor: '#FFFFFF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 8 },
  aiAvatarHeroText: { fontSize: 28, color: C.logoDeep, fontWeight: '700' },
  aiWelcomeTitle: { fontSize: 17, fontWeight: '700', color: C.logoDeep, marginBottom: 8 },
  aiWelcomeBody: { fontSize: 14, color: 'rgba(20,51,58,0.62)', textAlign: 'center', lineHeight: 22, paddingHorizontal: 24 },
  aiQuickList: { marginTop: 14, gap: 6, width: '100%' },
  aiQuickCard: { backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(169,222,208,0.22)', shadowColor: '#12343A', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  aiQuickTop: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  aiQuickIcon: { width: 18, height: 18, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(169,222,208,0.14)', borderWidth: 1, borderColor: 'rgba(169,222,208,0.18)' },
  aiQuickIconText: { fontSize: 9, fontWeight: '800', color: C.logoDeep },
  aiQuickLabel: { fontSize: 10, fontWeight: '800', color: 'rgba(20,51,58,0.48)', textTransform: 'uppercase', letterSpacing: 0.4 },
  aiQuickText: { fontSize: 13, lineHeight: 19, color: C.logoDeep, fontWeight: '700' },
  aiQuickFooter: { marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  aiQuickAction: { fontSize: 10, fontWeight: '800', color: '#2E8A72' },
  aiQuickArrow: { fontSize: 14, fontWeight: '800', color: C.gold, marginTop: -1 },
  aiBubbleRow: { flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 12 },
  aiBubbleRowUser: { justifyContent: 'flex-end' },
  aiBubbleRowAssistant: { justifyContent: 'flex-start' },
  aiBubbleAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1C1C1E', alignItems: 'center', justifyContent: 'center', marginRight: 8, marginTop: 4, flexShrink: 0 },
  aiBubbleAvatarText: { fontSize: 14, color: '#FFF' },
  aiBubbleCard: { maxWidth: '75%', borderRadius: 18, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
  aiBubbleCardUser: { backgroundColor: '#1C1C1E', borderBottomRightRadius: 4 },
  aiBubbleCardAssistant: { backgroundColor: 'rgba(255,255,255,0.90)', borderBottomLeftRadius: 4 },
  aiBubbleText: { fontSize: 15, lineHeight: 22, color: '#1C1C1E' },
  aiBubbleTextUser: { color: '#FFF' },
  aiTypingCard: { backgroundColor: 'rgba(255,255,255,0.90)', borderRadius: 18, borderBottomLeftRadius: 4, padding: 14 },
  aiTypingText: { fontSize: 20, color: 'rgba(60,60,67,0.40)', letterSpacing: 4 },
  aiBottomDock: { paddingTop: 8, paddingBottom: 10, backgroundColor: 'rgba(238,243,241,0.96)', borderTopWidth: 1, borderTopColor: 'rgba(20,51,58,0.06)' },
  aiQuotaCard: { marginHorizontal: 12, marginTop: 0, marginBottom: 8, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(169,222,208,0.24)', backgroundColor: 'rgba(243,251,248,0.98)', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  aiQuotaBadge: { minWidth: 42, height: 26, borderRadius: 999, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20,51,58,0.08)', borderWidth: 1, borderColor: 'rgba(169,222,208,0.26)' },
  aiQuotaBadgeText: { fontSize: 11, fontWeight: '800', color: C.logoDeep },
  aiQuotaContent: { flex: 1, gap: 2 },
  aiQuotaTitle: { fontSize: 14, lineHeight: 20, fontWeight: '800', color: C.logoDeep },
  aiQuotaBody: { fontSize: 12, lineHeight: 18, color: 'rgba(20,51,58,0.62)' },
  aiQuotaButton: { minWidth: 78, height: 36, borderRadius: 999, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: C.logoDeep },
  aiQuotaButtonText: { fontSize: 13, fontWeight: '800', color: '#F7FFFC' },
  aiInlinePromptCard: { marginHorizontal: 12, marginTop: 0, marginBottom: 6, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(214,222,228,0.88)', backgroundColor: 'rgba(252,253,253,0.98)', paddingHorizontal: 14, paddingVertical: 12, shadowColor: '#0E2230', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  aiInlinePromptTop: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 },
  aiInlinePromptDot: { width: 7, height: 7, borderRadius: 999, backgroundColor: 'rgba(109,184,160,0.82)' },
  aiInlinePromptLabel: { fontSize: 11, fontWeight: '800', color: 'rgba(20,51,58,0.52)', textTransform: 'uppercase', letterSpacing: 0.4 },
  aiInlinePromptText: { fontSize: 14, lineHeight: 20, color: C.logoDeep, fontWeight: '700' },
  aiInlinePromptCategoryRow: { flexDirection: 'row', gap: 8 },
  aiInlinePromptCategory: { flex: 1, minWidth: 0, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(220,227,232,0.92)', backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 10 },
  aiInlinePromptCategoryLabel: { fontSize: 10, fontWeight: '800', color: '#2E8A72', marginBottom: 4 },
  aiInlinePromptCategoryText: { fontSize: 12, lineHeight: 18, color: C.logoDeep, fontWeight: '700' },
  aiComposerPanel: { minHeight: 108, marginHorizontal: 12, marginTop: 4, marginBottom: 12, borderRadius: 28, borderWidth: 1, borderColor: 'rgba(213,223,230,0.88)', backgroundColor: 'rgba(252,253,253,0.98)', paddingTop: 8, paddingHorizontal: 10, paddingBottom: 8, justifyContent: 'space-between', shadowColor: '#0E2230', shadowOpacity: 0.10, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
  aiComposerPanelStatic: { marginTop: 0 },
  aiComposerTopline: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, marginBottom: 6 },
  aiComposerToplineDot: { width: 7, height: 7, borderRadius: 999, backgroundColor: 'rgba(109,184,160,0.82)', shadowColor: '#6DB8A0', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 1 } },
  aiComposerToplineText: { fontSize: 11, lineHeight: 16, color: 'rgba(20,51,58,0.52)', fontWeight: '700', letterSpacing: 0.1 },
  aiInputDock: { flex: 1, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.98)', paddingHorizontal: 8, paddingTop: 7, paddingBottom: 7, flexDirection: 'row', alignItems: 'flex-end', gap: 8, borderWidth: 1, borderColor: 'rgba(218,226,232,0.95)', shadowColor: '#A9B9C6', shadowOpacity: 0.10, shadowRadius: 14, shadowOffset: { width: 0, height: 4 } },
  aiInputWrap: { flex: 1, minWidth: 0, alignSelf: 'stretch', position: 'relative', zIndex: 1 },
  aiVoiceButton: { width: 42, height: 42, borderRadius: 999, backgroundColor: 'rgba(246,249,250,1)', borderWidth: 1, borderColor: 'rgba(214,222,228,0.95)', alignItems: 'center', justifyContent: 'center', flexShrink: 0, alignSelf: 'flex-end', marginBottom: 1 },
  aiVoiceButtonDisabled: { opacity: 0.66 },
  aiVoiceButtonActive: { backgroundColor: '#DDF4ED', borderColor: 'rgba(30,142,109,0.32)' },
  aiVoiceText: { fontSize: 17, fontWeight: '800', color: C.logoDeep },
  aiVoiceTextActive: { color: '#1E8E6D' },
  aiInput: { width: '100%', alignSelf: 'stretch', backgroundColor: 'transparent', borderRadius: 18, paddingHorizontal: 10, paddingTop: 10, paddingBottom: 10, fontSize: 15, lineHeight: 22, color: '#1C1C1E', borderWidth: 0, textAlignVertical: 'top' },
  aiSendButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', flexShrink: 0, alignSelf: 'flex-end', marginBottom: 1, position: 'relative', zIndex: 3 },
  aiSendButtonActive: { backgroundColor: C.logoDeep, borderWidth: 1, borderColor: 'rgba(169,222,208,0.24)', shadowColor: '#12343A', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  aiSendButtonDisabled: { backgroundColor: 'rgba(125,134,145,0.14)', borderWidth: 1, borderColor: 'rgba(125,134,145,0.06)' },
  aiSendText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  aiSendCta: { marginTop: 8, minHeight: 42, borderRadius: 16, backgroundColor: C.logoDeep, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(169,222,208,0.28)', shadowColor: '#12343A', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  aiSendCtaDisabled: { opacity: 0.68 },
  aiSendCtaText: { fontSize: 14, fontWeight: '800', color: '#F7FFFC' },
  aiInputHint: { paddingHorizontal: 10, paddingTop: 8, fontSize: 11, lineHeight: 17, color: 'rgba(20,51,58,0.48)' },
  structureOverviewCard: { borderRadius: 18, backgroundColor: '#FBFAF5', borderWidth: 1, borderColor: 'rgba(198,146,42,0.16)', padding: 14, marginTop: 2, marginBottom: 8 },
  structureOverviewTitle: { fontSize: 16, lineHeight: 23, fontWeight: '800', color: C.ink },
  structureOverviewBody: { fontSize: 13, lineHeight: 20, color: C.soft, marginTop: 6 },
  structureOverviewChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  structureOverviewChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#FFF', borderWidth: 1, borderColor: C.line },
  structureOverviewChipText: { fontSize: 11, fontWeight: '700', color: C.gold },
  structureGroupBlock: { marginTop: 10 },
  structureGroupToggle: { borderRadius: 16, borderWidth: 1, borderColor: C.line, backgroundColor: '#FFF', padding: 12 },
  structureGroupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  structureGroupTitleWrap: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, flex: 1 },
  structureGroupTitle: { fontSize: 16, fontWeight: '800', color: C.ink },
  structureGroupCount: { fontSize: 11, fontWeight: '700', color: C.gold, backgroundColor: '#FBF4E3', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  structureGroupChevron: { fontSize: 12, fontWeight: '700', color: C.gold },
  structureGroupConclusion: { fontSize: 14, lineHeight: 21, color: C.ink, fontWeight: '700', marginTop: 8 },
  structureGroupModern: { fontSize: 13, lineHeight: 20, color: C.soft, marginTop: 4 },
  structureGroupBody: { fontSize: 13, lineHeight: 20, color: C.soft, marginTop: 6 },
  comboCard: { borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 12, marginTop: 10, backgroundColor: '#FFF' },
  comboTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 6 },
  comboName: { fontSize: 14, fontWeight: '700', color: C.ink, flex: 1 },
  comboType: { fontSize: 11, fontWeight: '700', color: C.gold },
  comboPillars: { fontSize: 12, color: C.faint, marginBottom: 4 },
  comboDesc: { fontSize: 13, lineHeight: 20, color: C.soft },
  comboAdvice: { fontSize: 12, lineHeight: 19, color: C.ink, marginTop: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  tabBar: { position: 'absolute', left: 10, right: 10, bottom: 10, flexDirection: 'row', backgroundColor: 'rgba(246,250,248,0.98)', borderRadius: 32, paddingHorizontal: 6, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(150,184,176,0.20)', shadowColor: '#0F2430', shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  tabButton: { flex: 1, paddingHorizontal: 3 },
  tabButtonSurface: { minHeight: 68, borderRadius: 24, borderWidth: 1, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 2, paddingTop: 6, paddingBottom: 5 },
  tabIconWrap: { width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20,51,58,0.045)', borderWidth: 1, borderColor: 'rgba(169,222,208,0.16)' },
  tabIcon: { fontSize: 18, fontWeight: '800' },
  tabText: { fontSize: 11, fontWeight: '700', color: 'rgba(20,51,58,0.50)', letterSpacing: 0.1 },
  tabTextActive: { fontWeight: '800' },
  tabIndicator: { width: 22, height: 3, borderRadius: 999, backgroundColor: 'transparent', opacity: 0, marginTop: 1 },
  sheetMask: { flex: 1, justifyContent: 'flex-end' },
  sheetScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.28)' },
  sheetCard: { maxHeight: '86%', backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 16, paddingBottom: 24 },
  sheetHandle: { width: 52, height: 5, borderRadius: 99, backgroundColor: '#D8D8DD', alignSelf: 'center', marginVertical: 10 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 10 },
  sheetBackButton: { minHeight: 36, borderRadius: 999, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F7F7', borderWidth: 1, borderColor: 'rgba(169,222,208,0.18)' },
  sheetBackText: { fontSize: 13, fontWeight: '800', color: C.logoDeep },
  sheetTitle: { fontSize: 24, fontWeight: '800', color: C.ink },
  sheetSubtitle: { fontSize: 13, color: C.soft, marginTop: 4 },
  sheetCloseButton: { minHeight: 36, borderRadius: 999, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  sheetClose: { fontSize: 14, fontWeight: '700', color: C.gold },
  sheetContent: { paddingBottom: 32 },
  sheetBlockTitle: { fontSize: 16, fontWeight: '700', color: C.ink, marginTop: 14, marginBottom: 6 },
  detailLead: { fontSize: 14, lineHeight: 22, color: C.soft, marginBottom: 8 },
  detailCard: { borderRadius: 18, borderWidth: 1, borderColor: 'rgba(198,146,42,0.12)', backgroundColor: '#FBFAF5', paddingHorizontal: 14, paddingVertical: 12, marginTop: 10 },
  detailCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  detailIconBadge: { width: 28, height: 28, borderRadius: 999, backgroundColor: 'rgba(198,146,42,0.12)', alignItems: 'center', justifyContent: 'center' },
  detailIconText: { fontSize: 13, fontWeight: '800', color: C.gold },
  detailCardTitle: { fontSize: 15, fontWeight: '800', color: C.ink, flex: 1 },
  detailCardBody: { fontSize: 14, lineHeight: 22, color: C.soft },
  almanacHero: { borderRadius: 16, backgroundColor: '#FFF8EB', borderWidth: 1, borderColor: 'rgba(198,146,42,0.18)', paddingHorizontal: 14, paddingVertical: 12 },
  almanacLunarDate: { fontSize: 24, fontWeight: '800', color: C.gold },
  almanacGanzhi: { fontSize: 13, lineHeight: 19, color: C.ink, marginTop: 6, fontWeight: '700' },
  almanacSubline: { fontSize: 12, lineHeight: 18, color: C.soft, marginTop: 4 },
  almanacMetaRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  almanacMetaCard: { flex: 1, borderRadius: 14, backgroundColor: '#F8FCFA', borderWidth: 1, borderColor: 'rgba(169,222,208,0.18)', paddingHorizontal: 12, paddingVertical: 10 },
  almanacMetaLabel: { fontSize: 11, fontWeight: '800', color: C.logoDeep, marginBottom: 6 },
  almanacMetaValue: { fontSize: 12, lineHeight: 18, color: C.ink, fontWeight: '600' },
  hourlyLuckList: { gap: 8, marginTop: 4 },
  hourlyLuckItem: { borderRadius: 14, backgroundColor: '#F8FCFA', borderWidth: 1, borderColor: 'rgba(169,222,208,0.18)', paddingHorizontal: 12, paddingVertical: 10 },
  hourlyLuckTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  hourlyLuckTitle: { flex: 1, fontSize: 13, fontWeight: '800', color: C.ink },
  hourlyLuckBadge: { minWidth: 34, textAlign: 'center', borderRadius: 999, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 4, fontSize: 11, fontWeight: '800' },
  hourlyLuckBadgeGood: { backgroundColor: '#EDF8F1', color: '#2E9B4B' },
  hourlyLuckBadgeBad: { backgroundColor: '#FFF7EC', color: '#D47C00' },
  hourlyLuckTime: { fontSize: 12, color: C.soft, marginTop: 6 },
  hourlyLuckDetail: { fontSize: 12, lineHeight: 18, color: C.logoDeep, marginTop: 4, fontWeight: '600' },
  quickAddBanner: { borderRadius: 18, backgroundColor: '#EEF8F4', borderWidth: 1, borderColor: 'rgba(30,142,109,0.16)', paddingHorizontal: 14, paddingVertical: 14, marginBottom: 14 },
  quickAddBannerTitle: { fontSize: 15, fontWeight: '800', color: '#1E8E6D' },
  quickAddBannerBody: { fontSize: 13, lineHeight: 20, color: C.logoDeep, marginTop: 6 },
  quickAddBannerButton: { alignSelf: 'flex-start', minHeight: 32, borderRadius: 999, paddingHorizontal: 12, marginTop: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(30,142,109,0.16)' },
  quickAddBannerButtonText: { fontSize: 12, fontWeight: '800', color: '#1E8E6D' },
  dayNoteInput: { minHeight: 94, borderRadius: 16, backgroundColor: '#F8FCFA', borderWidth: 1, borderColor: 'rgba(169,222,208,0.22)', paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, lineHeight: 20, color: C.logoDeep, textAlignVertical: 'top' },
  dayNoteSaveButton: { minHeight: 44, borderRadius: 14, marginTop: 10, backgroundColor: '#EDF6F2', borderWidth: 1, borderColor: 'rgba(169,222,208,0.24)', alignItems: 'center', justifyContent: 'center' },
  dayNoteSaveText: { fontSize: 14, fontWeight: '800', color: C.logoDeep },
  dayNotesList: { gap: 8, marginBottom: 10 },
  dayNoteItem: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', borderRadius: 14, backgroundColor: '#F8FCFA', borderWidth: 1, borderColor: 'rgba(169,222,208,0.18)', paddingHorizontal: 12, paddingVertical: 10 },
  dayNoteCheck: { width: 22, height: 22, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(169,222,208,0.34)', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  dayNoteCheckActive: { backgroundColor: '#1E8E6D', borderColor: '#1E8E6D' },
  dayNoteCheckText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  dayNoteCheckTextActive: { color: '#FFFFFF' },
  dayNoteItemMain: { flex: 1 },
  dayNoteItemTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6 },
  dayNoteTypeTag: { fontSize: 10, fontWeight: '800', color: C.logoDeep, backgroundColor: '#EDF6F2', borderWidth: 1, borderColor: 'rgba(169,222,208,0.18)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  dayNoteDeleteButton: { minHeight: 24, paddingHorizontal: 8, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF7F3', borderWidth: 1, borderColor: 'rgba(255,59,48,0.14)' },
  dayNoteDeleteText: { fontSize: 11, fontWeight: '800', color: C.danger },
  dayNoteItemText: { flex: 1, fontSize: 13, lineHeight: 19, color: C.logoDeep, fontWeight: '600' },
  dayNoteItemTextDone: { color: 'rgba(20,51,58,0.42)', textDecorationLine: 'line-through' },
  dayNoteTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  dayNoteTypeChip: { minHeight: 32, borderRadius: 999, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5FAF8', borderWidth: 1, borderColor: 'rgba(169,222,208,0.18)' },
  dayNoteTypeChipActive: { backgroundColor: '#EDF6F2', borderColor: 'rgba(169,222,208,0.34)' },
  dayNoteTypeChipText: { fontSize: 12, fontWeight: '800', color: C.logoDeep },
  dayNoteTypeChipTextActive: { color: '#1E8E6D' },
  dayNoteClearButton: { minHeight: 40, borderRadius: 14, marginTop: 10, backgroundColor: '#FFF7F3', borderWidth: 1, borderColor: 'rgba(255,59,48,0.16)', alignItems: 'center', justifyContent: 'center' },
  dayNoteClearText: { fontSize: 13, fontWeight: '800', color: C.danger },
  reminderAdjustRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  reminderAdjustCard: { flex: 1, borderRadius: 16, backgroundColor: '#F8FCFA', borderWidth: 1, borderColor: 'rgba(169,222,208,0.22)', paddingHorizontal: 12, paddingVertical: 12 },
  reminderAdjustLabel: { fontSize: 11, fontWeight: '800', color: C.logoDeep, marginBottom: 8 },
  reminderAdjustControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reminderAdjustButton: { width: 34, height: 34, borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(169,222,208,0.22)', alignItems: 'center', justifyContent: 'center' },
  reminderAdjustButtonText: { fontSize: 18, fontWeight: '800', color: C.logoDeep },
  reminderAdjustValue: { fontSize: 18, fontWeight: '800', color: C.logoDeep },
  reminderLeadRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  reminderLeadChip: { minHeight: 34, borderRadius: 999, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5FAF8', borderWidth: 1, borderColor: 'rgba(169,222,208,0.18)' },
  reminderLeadChipActive: { backgroundColor: '#EDF6F2', borderColor: 'rgba(30,142,109,0.28)' },
  reminderLeadChipText: { fontSize: 12, fontWeight: '800', color: C.logoDeep },
  reminderLeadChipTextActive: { color: '#1E8E6D' },
  dayReminderButton: { minHeight: 44, borderRadius: 14, marginTop: 10, backgroundColor: '#FFF8EB', borderWidth: 1, borderColor: 'rgba(198,146,42,0.20)', alignItems: 'center', justifyContent: 'center' },
  dayReminderButtonActive: { backgroundColor: '#EEF8F4', borderColor: 'rgba(52,199,89,0.22)' },
  dayReminderButtonText: { fontSize: 14, fontWeight: '800', color: C.gold },
  dayReminderButtonTextActive: { color: C.success },
  sheetListItem: { minHeight: 42, borderRadius: 14, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  sheetListText: { fontSize: 14, fontWeight: '600', color: C.ink },
  todayGuideListCard: { borderRadius: 18, backgroundColor: '#F8FCFA', borderWidth: 1, borderColor: 'rgba(169,222,208,0.22)', paddingHorizontal: 14, paddingVertical: 14, marginBottom: 10 },
  todayGuideListTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6 },
  todayGuideListTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: C.logoDeep },
  todayGuideListArrow: { fontSize: 20, fontWeight: '800', color: C.gold },
  todayGuideListBody: { fontSize: 13, lineHeight: 20, color: C.logoDeep, fontWeight: '600' },
});







