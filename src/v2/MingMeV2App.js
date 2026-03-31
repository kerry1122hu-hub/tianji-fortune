import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  computeChart,
  getDailyFortune,
  getDayMasterStrength,
  getJiFang,
  getJiShi,
  getLiuNianFortune,
} from '../engines/engine_index';
import {
  formatLunarDate,
  getLunarMonthDays,
  getLunarYearInfo,
  lunarToSolar,
  solarToLunar,
} from '../engines/engine_lunar';
import { analyzeStrengthRules, analyzeTenGodPreference, analyzeUseGod, analyzeLuck, analyzeNarrative, getSeasonByMonthBranch } from '../engines/engine_rules';
import { generateAIReading, parseAIReading } from '../utils/aiReading';
import { generateCompanionPack } from '../services/aiCompanion';
import { getAIBackendConfig } from '../services/aiBackendConnector';
import { getCityList } from '../utils/chinaCities';
import { calculateChengGu } from '../utils/chengGu';
import { generateFortuneCalendar, getMonthSummary } from '../utils/fortuneCalendar';
import { getSupportedLocales, setLocale } from '../utils/i18n';
import { getTrueSolarTime } from '../utils/trueSolarTime';
import { PaywallScreen } from '../payment/PaywallScreen';
import { GeneratingV2Screen, ResultV2Shell } from './ResultV2Shell';

const STORAGE_KEYS = {
  locale: 'mingme.v2.locale',
  profile: 'mingme.v2.profile',
  memberTier: 'mingme.v2.memberTier',
  memberRegistration: 'mingme.v2.memberRegistration',
  familyProfiles: 'mingme.v2.familyProfiles',
  activeFamilyProfileId: 'mingme.v2.activeFamilyProfileId',
  moodJournal: 'mingme.v2.moodJournal',
  decisionDraft: 'mingme.v2.decisionDraft',
  result: 'mingme.v2.result',
  fortuneCalendar: 'mingme.v2.fortuneCalendar',
  calSummary: 'mingme.v2.calSummary',
  aiText: 'mingme.v2.aiText',
  oneLineSummary: 'mingme.v2.oneLineSummary',
  weeklyActions: 'mingme.v2.weeklyActions',
  followUpQuestions: 'mingme.v2.followUpQuestions',
  followUpAnswers: 'mingme.v2.followUpAnswers',
  notificationPrefs: 'mingme.v2.notificationPrefs',
};

const C = {
  bg: '#F2F2F7',
  ink: '#1C1C1E',
  inkInv: '#FFFFFF',
  soft: 'rgba(60,60,67,0.60)',
  faint: 'rgba(60,60,67,0.30)',
  border: 'rgba(60,60,67,0.12)',
  fieldBg: 'rgba(118,118,128,0.09)',
  gold: '#C6922A',
  dark: '#0A0A0C',
  success: '#34C759',
};

const FOCUS_OPTIONS = [
  '自我认知',
  '事业方向',
  '关系沟通',
  '情绪状态',
  '财富节奏',
  '亲密关系',
  '我都想看',
];

const ROLE_OPTIONS = [
  '学生',
  '创业者 / 商业经营',
  '上班族',
  '职业白领',
  '照顾家庭',
  '调整阶段',
  '其他',
];

const DEFAULT_PROFILE = {
  calendarType: 'solar',
  year: '1990',
  month: '6',
  day: '15',
  lunarIsLeapMonth: false,
  hour: '10',
  minute: '00',
  gender: 'male',
  city: '北京',
  focus: '自我认知',
  role: '上班族',
  nickname: '',
  useTrueSolarTime: true,
  useJieqiBoundary: true,
};

const DEFAULT_NOTIFICATION_PREFS = {
  appEnabled: false,
  emailEnabled: false,
  email: '',
  hour: 8,
  minute: 30,
};

const DEFAULT_MEMBER_REGISTRATION = {
  nickname: '',
  city: '',
  focus: '',
  email: '',
  phone: '',
};

const DEFAULT_DECISION_DRAFT = {
  situation: '',
  options: '',
  nextStep: '',
};

const MAX_FAMILY_PROFILES = 5;

const PILLAR_LABELS = ['年', '月', '日', '时'];

function buildFamilyProfileEntry({
  id,
  createdAt,
  profile,
  chartResult,
  fortuneCalendar,
  calSummary,
  aiText,
  oneLineSummary,
  weeklyActions,
  followUpQuestions,
  followUpAnswers,
}) {
  return {
    id: id || `family-${Date.now()}`,
    createdAt: createdAt || new Date().toISOString(),
    savedAt: new Date().toISOString(),
    profile: { ...DEFAULT_PROFILE, ...(profile || {}) },
    chartResult: chartResult || null,
    fortuneCalendar: Array.isArray(fortuneCalendar) ? fortuneCalendar : [],
    calSummary: calSummary || null,
    aiText: aiText || null,
    oneLineSummary: oneLineSummary || '',
    weeklyActions: weeklyActions || null,
    followUpQuestions: Array.isArray(followUpQuestions) ? followUpQuestions : [],
    followUpAnswers: followUpAnswers && typeof followUpAnswers === 'object' ? followUpAnswers : {},
  };
}

const STEM_COMBINES = {
  甲: '己',
  己: '甲',
  乙: '庚',
  庚: '乙',
  丙: '辛',
  辛: '丙',
  丁: '壬',
  壬: '丁',
  戊: '癸',
  癸: '戊',
};

const BRANCH_COMBINES = {
  子: '丑',
  丑: '子',
  寅: '亥',
  亥: '寅',
  卯: '戌',
  戌: '卯',
  辰: '酉',
  酉: '辰',
  巳: '申',
  申: '巳',
  午: '未',
  未: '午',
};

const BRANCH_CLASHES = {
  子: '午',
  午: '子',
  丑: '未',
  未: '丑',
  寅: '申',
  申: '寅',
  卯: '酉',
  酉: '卯',
  辰: '戌',
  戌: '辰',
  巳: '亥',
  亥: '巳',
};

const BRANCH_HARMS = {
  子: '未',
  未: '子',
  丑: '午',
  午: '丑',
  寅: '巳',
  巳: '寅',
  卯: '辰',
  辰: '卯',
  申: '亥',
  亥: '申',
  酉: '戌',
  戌: '酉',
};

const BRANCH_BREAKS = {
  子: '酉',
  酉: '子',
  午: '卯',
  卯: '午',
  辰: '丑',
  丑: '辰',
  未: '戌',
  戌: '未',
  寅: '亥',
  亥: '寅',
  巳: '申',
  申: '巳',
};

const BRANCH_PUNISHMENTS = [
  ['子', '卯'],
  ['寅', '巳'],
  ['寅', '申'],
  ['巳', '申'],
  ['丑', '未'],
  ['丑', '戌'],
  ['未', '戌'],
  ['辰', '辰'],
  ['午', '午'],
  ['酉', '酉'],
  ['亥', '亥'],
];

function buildBranchRelations(pillars) {
  const combinations = [];
  const clashes = [];
  const harms = [];
  const punishments = [];
  const breaks = [];
  const specialCombinations = [];
  const stemRelations = [];
  const branchPairs = [];
  const seen = new Set();
  const branchSeen = new Set();

  const pushUnique = (bucket, token) => {
    if (!bucket.includes(token)) bucket.push(token);
  };

  const pushSpecial = (item) => {
    const token = `${item.type}|${item.name}|${item.pillars}`;
    if (!seen.has(token)) {
      seen.add(token);
      specialCombinations.push(item);
    }
  };

  for (let i = 0; i < pillars.length; i += 1) {
    for (let j = i + 1; j < pillars.length; j += 1) {
      const left = pillars[i];
      const right = pillars[j];
      const leftLabel = PILLAR_LABELS[i] || left.label || `第${i + 1}柱`;
      const rightLabel = PILLAR_LABELS[j] || right.label || `第${j + 1}柱`;
      const pairLabel = `${leftLabel}-${rightLabel}`;
      const stemPair = `${left.gan}${right.gan}`;
      const branchPair = `${left.zhi}${right.zhi}`;

      if (STEM_COMBINES[left.gan] === right.gan) {
        stemRelations.push(`${left.gan}${right.gan}`);
        pushSpecial({
          name: `${left.gan}${right.gan}合`,
          type: '天干五合',
          pillars: pairLabel,
          description: `${leftLabel}与${rightLabel}形成天干五合，表示这两个层面的主题更容易互相牵引、资源整合，关系上也更容易出现联动。`,
        });
      }

      if (BRANCH_COMBINES[left.zhi] === right.zhi) {
        pushUnique(combinations, branchPair);
        branchPairs.push({ type: '合', pair: branchPair, pillars: pairLabel });
        pushSpecial({
          name: `${left.zhi}${right.zhi}合`,
          type: '地支六合',
          pillars: pairLabel,
          description: `${leftLabel}与${rightLabel}形成地支六合，通常意味着结构里更容易出现缓冲、合作与资源流通。`,
        });
      }

      if (BRANCH_CLASHES[left.zhi] === right.zhi) {
        pushUnique(clashes, branchPair);
        branchPairs.push({ type: '冲', pair: branchPair, pillars: pairLabel });
        pushSpecial({
          name: `${left.zhi}${right.zhi}冲`,
          type: '地支六冲',
          pillars: pairLabel,
          description: `${leftLabel}与${rightLabel}形成地支六冲，表示这两个主题之间更容易出现拉扯、变化、触发事件或阶段性波动。`,
        });
      }

      if (BRANCH_HARMS[left.zhi] === right.zhi) {
        pushUnique(harms, branchPair);
        branchPairs.push({ type: '害', pair: branchPair, pillars: pairLabel });
        pushSpecial({
          name: `${left.zhi}${right.zhi}害`,
          type: '地支相害',
          pillars: pairLabel,
          description: `${leftLabel}与${rightLabel}形成相害，常见为隐性摩擦、误解、别扭感，以及不太容易直接说开的消耗。`,
        });
      }

      if (BRANCH_BREAKS[left.zhi] === right.zhi) {
        pushUnique(breaks, branchPair);
        branchPairs.push({ type: '破', pair: branchPair, pillars: pairLabel });
        pushSpecial({
          name: `${left.zhi}${right.zhi}破`,
          type: '地支相破',
          pillars: pairLabel,
          description: `${leftLabel}与${rightLabel}形成相破，意味着原有节奏或稳定结构更容易被打断，需要额外做收束与修补。`,
        });
      }

      if (BRANCH_PUNISHMENTS.some(([a, b]) => (a === left.zhi && b === right.zhi) || (a === right.zhi && b === left.zhi))) {
        pushUnique(punishments, branchPair);
        branchPairs.push({ type: '刑', pair: branchPair, pillars: pairLabel });
        pushSpecial({
          name: `${left.zhi}${right.zhi}刑`,
          type: '地支相刑',
          pillars: pairLabel,
          description: `${leftLabel}与${rightLabel}形成相刑，表示这两个主题更容易出现内耗、僵持、反复卡住或关系紧绷。`,
        });
      }
    }
  }

  pillars.forEach((pillar, index) => {
    const pillarLabel = PILLAR_LABELS[index] || pillar.label || `第${index + 1}柱`;
    const key = `${pillarLabel}-${pillar.zhi}`;
    if (branchSeen.has(key)) return;
    branchSeen.add(key);
    if (['辰', '午', '酉', '亥'].includes(pillar.zhi)) {
      const count = pillars.filter((item) => item.zhi === pillar.zhi).length;
      if (count >= 2) {
        pushUnique(punishments, `${pillar.zhi}${pillar.zhi}`);
        pushSpecial({
          name: `${pillar.zhi}${pillar.zhi}自刑`,
          type: '地支自刑',
          pillars: pillars
            .map((item, itemIndex) => ({
              item,
              label: PILLAR_LABELS[itemIndex] || item.label || `第${itemIndex + 1}柱`,
            }))
            .filter(({ item }) => item.zhi === pillar.zhi)
            .map(({ label }) => label)
            .join('-'),
          description: `${pillar.zhi}在命局中重复出现，容易把同一类主题放大成反复自我拉扯、重复纠结或内部紧绷。`,
        });
      }
    }
  });

  return {
    branchRelations: { combinations, clashes, harms, punishments, breaks },
    stemRelations,
    branchPairs,
    specialCombinations,
  };
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function getSolarDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function getLunarDaysInMonth(year, month, isLeapMonth) {
  try {
    return getLunarMonthDays(year, month, isLeapMonth) || 30;
  } catch (error) {
    return 30;
  }
}

function clampDay(day, maxDay) {
  return `${Math.min(Math.max(parseInt(day, 10) || 1, 1), maxDay)}`;
}

async function syncNotificationPrefsToBackend(payload) {
  const { baseUrl, authToken, signingSecret } = getAIBackendConfig();
  if (!baseUrl) {
    return;
  }

  const endpoint = `${baseUrl.replace(/\/$/, '')}/api/notification-preferences`;
  const body = JSON.stringify(payload);
  const timestamp = `${Date.now()}`;
  const nonce = `${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(authToken ? { 'X-MingMe-Token': authToken } : {}),
  };

  if (signingSecret && globalThis.crypto?.subtle) {
    const encoder = new TextEncoder();
    const key = await globalThis.crypto.subtle.importKey(
      'raw',
      encoder.encode(signingSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBuffer = await globalThis.crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(`${timestamp}.${nonce}.${body}`)
    );
    const signature = Array.from(new Uint8Array(signatureBuffer))
      .map((item) => item.toString(16).padStart(2, '0'))
      .join('');

    headers['X-MingMe-Timestamp'] = timestamp;
    headers['X-MingMe-Nonce'] = nonce;
    headers['X-MingMe-Signature'] = signature;
  }

  await fetch(endpoint, {
    method: 'POST',
    headers,
    body,
  });
}

async function scheduleDailyLuckNotification(notificationPrefs, chartResult, profile) {
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (!notificationPrefs.appEnabled) {
    return;
  }

  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) {
    throw new Error('通知权限未开启。');
  }

  const title = `${profile?.nickname || '你'}的每日提醒`;
  const body = chartResult?.dailyFortune?.advice || '今天适合先看清节奏，再做关键决定。';

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
    },
    trigger: {
      hour: notificationPrefs.hour,
      minute: notificationPrefs.minute,
      repeats: true,
    },
  });
}

const ONBOARDING_STEPS = [
  { num: '01', title: '认识自己\n是一切改变的开始', action: '开始' },
  { num: '02', title: '你的AI\n个人成长伙伴', action: '继续' },
  { num: '03', title: '明白自己\n成就自己', action: '开始我的旅程' },
];

function V2Card({ children, style }) {
  return <View style={[s.card, style]}>{children}</View>;
}

function StepNav({ title, stepText, onBack }) {
  return (
    <View style={s.nav}>
      <TouchableOpacity onPress={onBack} style={s.navSide}>
        <Text style={s.navBack}>‹ 返回</Text>
      </TouchableOpacity>
      <Text style={s.navTitle}>{title}</Text>
      <View style={[s.navSide, { alignItems: 'flex-end' }]}>
        <Text style={s.navStep}>{stepText}</Text>
      </View>
    </View>
  );
}

function PrimaryButton({ label, onPress, disabled }) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={disabled}
      onPress={onPress}
      style={[s.primaryBtn, disabled && { opacity: 0.45 }]}
    >
      <Text style={s.primaryBtnLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function SegmentedOptions({ value, onChange, options }) {
  return (
    <View style={s.segmentWrap}>
      {options.map((item) => {
        const active = value === item.value;
        return (
          <TouchableOpacity
            key={item.value}
            onPress={() => onChange(item.value)}
            style={[s.segmentItem, active && s.segmentItemActive]}
          >
            <Text style={[s.segmentLabel, active && s.segmentLabelActive]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function FormField({ label, value, onChangeText, placeholder, helper, keyboardType = 'default' }) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        style={s.input}
        placeholderTextColor={C.faint}
      />
      {helper ? <Text style={s.helper}>{helper}</Text> : null}
    </View>
  );
}

function PickerSheet({ visible, title, columns, onCancel, onConfirm }) {
  const [draft, setDraft] = useState(() => columns.map((column) => column.value));

  useEffect(() => {
    if (visible) {
      setDraft(columns.map((column) => column.value));
    }
  }, [columns, visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={s.sheetBackdrop}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onCancel} />
        <View style={s.sheet}>
          <View style={s.sheetHead}>
            <TouchableOpacity onPress={onCancel}>
              <Text style={s.sheetCancel}>取消</Text>
            </TouchableOpacity>
            <Text style={s.sheetTitle}>{title}</Text>
            <TouchableOpacity onPress={() => onConfirm(draft)}>
              <Text style={s.sheetConfirm}>确定</Text>
            </TouchableOpacity>
          </View>
          <View style={s.sheetColumns}>
            {columns.map((column, index) => (
              <View key={column.key} style={s.sheetColumn}>
                <Text style={s.sheetColumnTitle}>{column.label}</Text>
                <ScrollView style={s.sheetOptions} showsVerticalScrollIndicator={false}>
                  {column.options.map((option) => {
                    const active = `${draft[index]}` === `${option.value}`;
                    return (
                      <TouchableOpacity
                        key={`${column.key}-${option.value}`}
                        onPress={() =>
                          setDraft((prev) => prev.map((item, itemIndex) => (itemIndex === index ? option.value : item)))
                        }
                        style={[s.sheetOption, active && s.sheetOptionActive]}
                      >
                        <Text style={[s.sheetOptionLabel, active && s.sheetOptionLabelActive]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DateTrigger({ label, value, helper, onPress }) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TouchableOpacity onPress={onPress} style={s.selector}>
        <Text style={s.selectorLabel}>{value}</Text>
        <Text style={s.selectorArrow}>›</Text>
      </TouchableOpacity>
      {helper ? <Text style={s.helper}>{helper}</Text> : null}
    </View>
  );
}

function CityPicker({ selectedCity, onSelect }) {
  const citiesByProvince = getCityList();
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>出生城市</Text>
      <TouchableOpacity onPress={() => setExpanded((prev) => !prev)} style={s.selector}>
        <Text style={s.selectorLabel}>{selectedCity || '请选择城市'}</Text>
        <Text style={s.selectorArrow}>{expanded ? '⌃' : '⌄'}</Text>
      </TouchableOpacity>
      {expanded ? (
        <ScrollView style={s.cityList} nestedScrollEnabled>
          {Object.entries(citiesByProvince).map(([province, cities]) => (
            <View key={province} style={{ marginBottom: 10 }}>
              <Text style={s.cityProvince}>{province}</Text>
              <View style={s.cityGrid}>
                {cities.map((city) => (
                  <TouchableOpacity
                    key={city}
                    onPress={() => {
                      onSelect(city);
                      setExpanded(false);
                    }}
                    style={[s.cityChip, selectedCity === city && s.cityChipActive]}
                  >
                    <Text style={[s.cityChipLabel, selectedCity === city && s.cityChipLabelActive]}>
                      {city}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

function TwoColumnCityPicker({ selectedCity, onSelect }) {
  const citiesByProvince = useMemo(() => getCityList(), []);
  const provinceNames = useMemo(() => Object.keys(citiesByProvince), [citiesByProvince]);
  const matchedProvince = useMemo(
    () => provinceNames.find((province) => (citiesByProvince[province] || []).includes(selectedCity)) || provinceNames[0] || '',
    [citiesByProvince, provinceNames, selectedCity],
  );
  const [expanded, setExpanded] = useState(false);
  const [activeProvince, setActiveProvince] = useState(matchedProvince);

  useEffect(() => {
    if (matchedProvince) {
      setActiveProvince(matchedProvince);
    }
  }, [matchedProvince]);

  const visibleCities = citiesByProvince[activeProvince] || [];

  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>出生城市</Text>
      <TouchableOpacity onPress={() => setExpanded((prev) => !prev)} style={s.selector}>
        <Text style={s.selectorLabel}>{selectedCity || '请选择城市'}</Text>
        <Text style={s.selectorArrow}>{expanded ? '⌃' : '⌄'}</Text>
      </TouchableOpacity>
      {expanded ? (
        <View style={s.cityPickerPanel}>
          <ScrollView style={s.cityProvinceList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {provinceNames.map((province) => {
              const active = province === activeProvince;
              return (
                <TouchableOpacity
                  key={province}
                  onPress={() => setActiveProvince(province)}
                  style={[s.cityProvinceItem, active && s.cityProvinceItemActive]}
                >
                  <Text style={[s.cityProvinceLabel, active && s.cityProvinceLabelActive]}>{province}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <ScrollView style={s.cityList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            <Text style={s.cityProvince}>{activeProvince || '城市'}</Text>
            <View style={s.cityGrid}>
              {visibleCities.map((city) => (
                <TouchableOpacity
                  key={`${activeProvince}-${city}`}
                  onPress={() => {
                    onSelect(city);
                    setExpanded(false);
                  }}
                  style={[s.cityChip, selectedCity === city && s.cityChipActive]}
                >
                  <Text style={[s.cityChipLabel, selectedCity === city && s.cityChipLabelActive]}>
                    {city}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

function OnboardingScreen({ onFinish }) {
  const [step, setStep] = useState(0);
  const current = ONBOARDING_STEPS[step];
  const stepAccent = ['#E4D39D', '#A8D7E2', '#A9DED0'][step] || '#E4D39D';

  return (
    <View style={s.onboardingScreen}>
      <View style={s.onboardingAura} />
      <View style={s.onboardingProgressRow}>
        {ONBOARDING_STEPS.map((_, index) => (
          <View
            key={index}
            style={[
              s.onboardingProgressDot,
              index === step && s.onboardingProgressDotActive,
              index <= step && s.onboardingProgressDotSeen,
            ]}
          />
        ))}
      </View>

      <View style={s.onboardingContent}>
        <View style={s.onboardingArtwork}>
          <View style={[s.onboardingGlow, { backgroundColor: `${stepAccent}18` }]} />
          <View style={[s.onboardingRingOuter, { borderColor: `${stepAccent}50` }]} />
          <View style={[s.onboardingRingMid, { borderColor: `${stepAccent}70` }]} />
          <View style={[s.onboardingOrbitArc, { borderColor: `${stepAccent}55` }]} />
          <View style={[s.onboardingRingInner, { backgroundColor: `${stepAccent}22`, borderColor: `${stepAccent}66` }]} />
          <View style={s.onboardingStar} />
          <View style={[s.onboardingCore, { backgroundColor: stepAccent }]} />
          <View style={[s.onboardingBeam, { backgroundColor: `${stepAccent}66`, transform: [{ rotate: step === 0 ? '0deg' : step === 1 ? '32deg' : '-28deg' }] }]} />
        </View>
        <Text style={s.onboardingMark}>{current.num}</Text>
        <Text style={s.onboardingTitle}>{current.title}</Text>
      </View>

      <View style={s.onboardingFooter}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            if (step < ONBOARDING_STEPS.length - 1) {
              setStep((prev) => prev + 1);
              return;
            }
            onFinish();
          }}
          style={s.onboardingPrimaryBtn}
        >
          <Text style={s.onboardingPrimaryBtnText}>{current.action}</Text>
        </TouchableOpacity>
        {step === 0 ? (
          <TouchableOpacity onPress={onFinish} style={s.onboardingSkipBtn}>
            <Text style={s.onboardingSkipText}>跳过</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

function IntakeBirthScreen({ profile, patchProfile, onNext, onBack, reviewMode }) {
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [microphoneLoading, setMicrophoneLoading] = useState(false);
  const [permissionHint, setPermissionHint] = useState('');
  const year = parseInt(profile.year, 10) || 1990;
  const month = parseInt(profile.month, 10) || 1;
  const calendarType = profile.calendarType || 'solar';
  const lunarYearInfo = calendarType === 'lunar' ? getLunarYearInfo(year) : null;
  const hasLeapMonth = Boolean(lunarYearInfo?.leapMonth && lunarYearInfo.leapMonth === month);
  const safeLeapMonth = hasLeapMonth ? Boolean(profile.lunarIsLeapMonth) : false;
  const daysInMonth = calendarType === 'lunar'
    ? getLunarDaysInMonth(year, month, safeLeapMonth)
    : getSolarDaysInMonth(year, month);
  const dateLabel = calendarType === 'lunar'
    ? formatLunarDate({
        year,
        month,
        day: parseInt(profile.day, 10) || 1,
        isLeapMonth: safeLeapMonth,
      })
    : `${profile.year}年${profile.month}月${profile.day}日`;
  const timeLabel = `${`${profile.hour || '0'}`.padStart(2, '0')}时${`${profile.minute || '00'}`.padStart(2, '0')}分`;

  const handleCalendarTypeChange = (nextCalendarType) => {
    if (nextCalendarType === calendarType) {
      return;
    }

    try {
      if (nextCalendarType === 'lunar') {
        const lunarDate = solarToLunar(
          new Date(
            parseInt(profile.year, 10) || 1990,
            (parseInt(profile.month, 10) || 1) - 1,
            parseInt(profile.day, 10) || 1
          )
        );

        patchProfile({
          calendarType: 'lunar',
          year: `${lunarDate.year}`,
          month: `${lunarDate.month}`,
          day: `${lunarDate.day}`,
          lunarIsLeapMonth: Boolean(lunarDate.isLeapMonth),
        });
        return;
      }

      const solarDate = lunarToSolar({
        year,
        month,
        day: parseInt(profile.day, 10) || 1,
        isLeapMonth: safeLeapMonth,
      });

      patchProfile({
        calendarType: 'solar',
        year: `${solarDate.getFullYear()}`,
        month: `${solarDate.getMonth() + 1}`,
        day: `${solarDate.getDate()}`,
        lunarIsLeapMonth: false,
      });
    } catch (error) {
      patchProfile({
        calendarType: nextCalendarType,
        lunarIsLeapMonth: false,
      });
    }
  };

  const handleUseCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      setPermissionHint('');
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setPermissionHint('位置权限未开启，仍可手动选择出生城市。');
        return;
      }

      const currentPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const [place] = await Location.reverseGeocodeAsync(currentPosition.coords);
      const resolvedCity = place?.city || place?.district || place?.subregion || place?.region || '';

      if (resolvedCity) {
        patchProfile({ city: resolvedCity.replace(/市$/, '') });
        setPermissionHint(`已使用当前位置补全城市：${resolvedCity}`);
      } else {
        setPermissionHint('已获取当前位置，但还不能准确识别城市，请手动确认。');
      }
    } catch (error) {
      setPermissionHint('当前位置暂时不可用，请继续手动填写城市。');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleEnableMicrophone = async () => {
    try {
      setMicrophoneLoading(true);
      setPermissionHint('');
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setPermissionHint('麦克风权限未开启，后续仍可使用文字和 AI 对话。');
        return;
      }
      setPermissionHint('麦克风权限已开启，后续可在明己AI先生里直接语音输入。');
    } catch (error) {
      setPermissionHint('麦克风权限暂时不可用，稍后可在 AI 页面再次开启。');
    } finally {
      setMicrophoneLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.screen}>
      <StepNav title={reviewMode ? "建立资料" : "建立档案"} stepText="1 / 3" onBack={onBack} />
      <ScrollView contentContainerStyle={s.screenPad} keyboardShouldPersistTaps="handled">
        <V2Card>
          <Text style={s.cardTitle}>出生信息</Text>
          <Text style={s.cardBody}>先把基础资料填写完整，系统会根据出生时间与地点生成第一版个人画像。</Text>
          <View style={s.fieldWrap}>
            <Text style={s.fieldLabel}>日期类型</Text>
            <SegmentedOptions
              value={calendarType}
              onChange={handleCalendarTypeChange}
              options={[
                { value: 'solar', label: '阳历' },
                { value: 'lunar', label: '农历' },
              ]}
            />
          </View>
          <DateTrigger
            label={calendarType === 'lunar' ? '出生日期（农历）' : '出生日期（阳历）'}
            value={dateLabel}
            helper={calendarType === 'lunar' ? '支持农历生日与闰月选择。' : '使用日期选择器选择生日，避免手动填写出错。'}
            onPress={() => setDatePickerVisible(true)}
          />
          {calendarType === 'lunar' && hasLeapMonth ? (
            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>是否闰月</Text>
              <SegmentedOptions
                value={safeLeapMonth ? 'leap' : 'normal'}
                onChange={(value) =>
                  patchProfile({
                    lunarIsLeapMonth: value === 'leap',
                    day: clampDay(profile.day, getLunarDaysInMonth(year, month, value === 'leap')),
                  })
                }
                options={[
                  { value: 'normal', label: '平月' },
                  { value: 'leap', label: `闰${month}月` },
                ]}
              />
            </View>
          ) : null}
          <DateTrigger
            label="出生时间"
            value={timeLabel}
            helper="请按时 / 分选择出生时间，分钟也会参与后续画像生成。"
            onPress={() => setTimePickerVisible(true)}
          />
          <TwoColumnCityPicker selectedCity={profile.city} onSelect={(city) => patchProfile({ city })} />
          <View style={s.permissionCard}>
            <Text style={s.permissionCardTitle}>智能服务授权</Text>
                <Text style={s.permissionCardBody}>允许当前位置可自动补全城市，允许麦克风可在明己AI先生里直接语音输入。</Text>
            <View style={s.permissionActionRow}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={handleUseCurrentLocation}
                style={[s.permissionButton, locationLoading && s.permissionButtonDisabled]}
                disabled={locationLoading}
              >
                <Text style={s.permissionButtonText}>{locationLoading ? '定位中…' : '使用当前位置'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={handleEnableMicrophone}
                style={[s.permissionButton, microphoneLoading && s.permissionButtonDisabled]}
                disabled={microphoneLoading}
              >
                <Text style={s.permissionButtonText}>{microphoneLoading ? '授权中…' : '允许语音输入'}</Text>
              </TouchableOpacity>
            </View>
            {permissionHint ? <Text style={s.permissionHint}>{permissionHint}</Text> : null}
          </View>
          <View style={s.fieldWrap}>
            <Text style={s.fieldLabel}>性别</Text>
            <SegmentedOptions
              value={profile.gender}
              onChange={(gender) => patchProfile({ gender })}
              options={[
                { value: 'male', label: '男' },
                { value: 'female', label: '女' },
              ]}
            />
          </View>
        </V2Card>

        <V2Card>
          <Text style={s.cardTitle}>计算选项</Text>
          <View style={s.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.switchTitle}>真太阳时校正</Text>
              <Text style={s.switchBody}>根据出生地经度修正时辰，更适合精细分析。</Text>
            </View>
            <Switch
              value={profile.useTrueSolarTime}
              onValueChange={(value) => patchProfile({ useTrueSolarTime: value })}
              trackColor={{ false: 'rgba(118,118,128,0.18)', true: C.ink }}
            />
          </View>
          <View style={[s.switchRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={s.switchTitle}>节气边界</Text>
              <Text style={s.switchBody}>保留更贴近传统推算习惯的节气边界判断。</Text>
            </View>
            <Switch
              value={profile.useJieqiBoundary}
              onValueChange={(value) => patchProfile({ useJieqiBoundary: value })}
              trackColor={{ false: 'rgba(118,118,128,0.18)', true: C.ink }}
            />
          </View>
        </V2Card>
      </ScrollView>
      <View style={s.bottomBar}>
        <PrimaryButton label="下一步" onPress={onNext} disabled={!profile.city || !profile.year || !profile.month || !profile.day || profile.hour === undefined || profile.minute === undefined} />
      </View>
      <PickerSheet
        visible={datePickerVisible}
        title={calendarType === 'lunar' ? '选择农历生日' : '选择出生日期'}
        onCancel={() => setDatePickerVisible(false)}
        onConfirm={(draft) => {
          const nextYear = `${draft[0]}`;
          const nextMonth = `${draft[1]}`;
          const nextLunarYearInfo = calendarType === 'lunar' ? getLunarYearInfo(parseInt(nextYear, 10)) : null;
          const nextHasLeapMonth = Boolean(nextLunarYearInfo?.leapMonth && nextLunarYearInfo.leapMonth === parseInt(nextMonth, 10));
          const nextLeapMonth = nextHasLeapMonth ? safeLeapMonth : false;
          const nextMaxDay = calendarType === 'lunar'
            ? getLunarDaysInMonth(parseInt(nextYear, 10), parseInt(nextMonth, 10), nextLeapMonth)
            : getSolarDaysInMonth(parseInt(nextYear, 10), parseInt(nextMonth, 10));

          patchProfile({
            year: nextYear,
            month: nextMonth,
            day: clampDay(`${draft[2]}`, nextMaxDay),
            lunarIsLeapMonth: nextLeapMonth,
          });
          setDatePickerVisible(false);
        }}
        columns={[
          {
            key: 'year',
            label: '年',
            value: profile.year,
            options: Array.from({ length: 91 }, (_, index) => {
              const value = `${1940 + index}`;
              return { value, label: value };
            }),
          },
          {
            key: 'month',
            label: '月',
            value: profile.month,
            options: Array.from({ length: 12 }, (_, index) => {
              const value = `${index + 1}`;
              return { value, label: calendarType === 'lunar' ? `${value}月` : value };
            }),
          },
          {
            key: 'day',
            label: '日',
            value: clampDay(profile.day, daysInMonth),
            options: Array.from({ length: daysInMonth }, (_, index) => {
              const value = `${index + 1}`;
              return { value, label: calendarType === 'lunar' ? `${value}` : value };
            }),
          },
        ]}
      />
      <PickerSheet
        visible={timePickerVisible}
        title="选择出生时间"
        onCancel={() => setTimePickerVisible(false)}
        onConfirm={(draft) => {
          patchProfile({ hour: `${draft[0]}`, minute: `${draft[1]}` });
          setTimePickerVisible(false);
        }}
        columns={[
          {
            key: 'hour',
            label: '时',
            value: profile.hour,
            options: Array.from({ length: 24 }, (_, index) => {
              const value = `${index}`;
              return { value, label: `${`${index}`.padStart(2, '0')}时` };
            }),
          },
          {
            key: 'minute',
            label: '分',
            value: `${profile.minute || '00'}`,
            options: Array.from({ length: 60 }, (_, index) => {
              const value = `${index}`.padStart(2, '0');
              return { value, label: `${value}分` };
            }),
          },
        ]}
      />
    </KeyboardAvoidingView>
  );
}

function IntakeFocusScreen({ profile, patchProfile, onNext, onBack, reviewMode }) {
  return (
    <View style={s.screen}>
      <StepNav title={reviewMode ? "建立资料" : "建立档案"} stepText="2 / 3" onBack={onBack} />
      <ScrollView contentContainerStyle={s.screenPad}>
        <V2Card>
          <Text style={s.cardTitle}>你现在最想先看清什么？</Text>
          <Text style={s.cardBody}>我们会优先把相关内容放到首页、阶段页和 AI 解读里。</Text>
          <View style={s.chipGrid}>
            {FOCUS_OPTIONS.map((item) => {
              const active = profile.focus === item;
              return (
                <TouchableOpacity
                  key={item}
                  onPress={() => patchProfile({ focus: item })}
                  style={[s.pill, active && s.pillActive]}
                >
                  <Text style={[s.pillLabel, active && s.pillLabelActive]}>{item}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </V2Card>
      </ScrollView>
      <View style={s.bottomBar}>
        <PrimaryButton label="继续" onPress={onNext} />
      </View>
    </View>
  );
}

function IntakeRoleScreen({ profile, patchProfile, onGenerate, onBack, reviewMode }) {
  return (
    <KeyboardAvoidingView style={s.screen}>
      <StepNav title={reviewMode ? "建立资料" : "建立档案"} stepText="3 / 3" onBack={onBack} />
      <ScrollView contentContainerStyle={s.screenPad} keyboardShouldPersistTaps="handled">
        <V2Card>
          <Text style={s.cardTitle}>你更接近哪一种状态？</Text>
          <Text style={s.cardBody}>这会影响首页语言风格、阶段建议和后续提醒方式。</Text>
          <View style={s.chipGrid}>
            {ROLE_OPTIONS.map((item) => {
              const active = profile.role === item;
              return (
                <TouchableOpacity
                  key={item}
                  onPress={() => patchProfile({ role: item })}
                  style={[s.pill, active && s.pillActive]}
                >
                  <Text style={[s.pillLabel, active && s.pillLabelActive]}>{item}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </V2Card>

        <V2Card>
          <Text style={s.cardTitle}>称呼</Text>
          <Text style={s.cardBody}>可选，用于首页欢迎语和“我的”页面展示。</Text>
          <FormField
            label="昵称"
            value={profile.nickname}
            onChangeText={(value) => patchProfile({ nickname: value })}
            placeholder="例如：H / Hugo"
          />
        </V2Card>
      </ScrollView>
      <View style={s.bottomBar}>
        <PrimaryButton label={reviewMode ? "生成我的洞察" : "生成我的档案"} onPress={onGenerate} />
      </View>
    </KeyboardAvoidingView>
  );
}

export default function MingMeV2App() {
  const hideMembership = Platform.OS === 'ios';
  const [booting, setBooting] = useState(true);
  const [flow, setFlow] = useState('onboarding');
  const [intakeOrigin, setIntakeOrigin] = useState('onboarding');
  const [locale, setLocaleState] = useState('zh-Hans');
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [memberTier, setMemberTier] = useState('free');
  const [memberRegistration, setMemberRegistration] = useState(DEFAULT_MEMBER_REGISTRATION);
  const [familyProfiles, setFamilyProfiles] = useState([]);
  const [activeFamilyProfileId, setActiveFamilyProfileId] = useState(null);
  const [chartResult, setChartResult] = useState(null);
  const [fortuneCalendar, setFortuneCalendar] = useState([]);
  const [calSummary, setCalSummary] = useState(null);
  const [aiText, setAiText] = useState(null);
  const [oneLineSummary, setOneLineSummary] = useState('');
  const [weeklyActions, setWeeklyActions] = useState(null);
  const [followUpQuestions, setFollowUpQuestions] = useState([]);
  const [followUpAnswers, setFollowUpAnswers] = useState({});
  const [aiLoading, setAiLoading] = useState(false);
  const [companionLoading, setCompanionLoading] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState(DEFAULT_NOTIFICATION_PREFS);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [generatingStatus, setGeneratingStatus] = useState(hideMembership ? '正在生成你的个人洞察' : '正在为你生成专属档案');
  const [profileReadyVisible, setProfileReadyVisible] = useState(false);
  const timersRef = useRef([]);

  const supportedLocales = useMemo(() => getSupportedLocales(), []);

  const patchProfile = useCallback((patch) => {
    setProfile((prev) => ({ ...prev, ...patch }));
  }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  useEffect(() => {
    let active = true;

    async function loadPersisted() {
      try {
        const values = await AsyncStorage.multiGet(Object.values(STORAGE_KEYS));
        if (!active) return;
        const map = Object.fromEntries(values);

        const nextLocale = map[STORAGE_KEYS.locale] || 'zh-Hans';
        setLocale(nextLocale);
        setLocaleState(nextLocale);

        if (map[STORAGE_KEYS.profile]) {
          setProfile({ ...DEFAULT_PROFILE, ...JSON.parse(map[STORAGE_KEYS.profile]) });
        }
        if (map[STORAGE_KEYS.memberTier]) {
          setMemberTier(JSON.parse(map[STORAGE_KEYS.memberTier]));
        }
        if (map[STORAGE_KEYS.memberRegistration]) {
          setMemberRegistration({
            ...DEFAULT_MEMBER_REGISTRATION,
            ...JSON.parse(map[STORAGE_KEYS.memberRegistration]),
          });
        }
        if (map[STORAGE_KEYS.familyProfiles]) {
          const savedProfiles = JSON.parse(map[STORAGE_KEYS.familyProfiles]);
          setFamilyProfiles(Array.isArray(savedProfiles) ? savedProfiles : []);
        }
        if (map[STORAGE_KEYS.activeFamilyProfileId]) {
          setActiveFamilyProfileId(JSON.parse(map[STORAGE_KEYS.activeFamilyProfileId]));
        }
        if (map[STORAGE_KEYS.result]) {
          setChartResult(JSON.parse(map[STORAGE_KEYS.result]));
        }
        if (map[STORAGE_KEYS.fortuneCalendar]) {
          setFortuneCalendar(JSON.parse(map[STORAGE_KEYS.fortuneCalendar]));
        }
        if (map[STORAGE_KEYS.calSummary]) {
          setCalSummary(JSON.parse(map[STORAGE_KEYS.calSummary]));
        }
        if (map[STORAGE_KEYS.aiText]) {
          setAiText(JSON.parse(map[STORAGE_KEYS.aiText]));
        }
        if (map[STORAGE_KEYS.oneLineSummary]) {
          setOneLineSummary(JSON.parse(map[STORAGE_KEYS.oneLineSummary]));
        }
        if (map[STORAGE_KEYS.weeklyActions]) {
          setWeeklyActions(JSON.parse(map[STORAGE_KEYS.weeklyActions]));
        }
        if (map[STORAGE_KEYS.followUpQuestions]) {
          setFollowUpQuestions(JSON.parse(map[STORAGE_KEYS.followUpQuestions]));
        }
        if (map[STORAGE_KEYS.followUpAnswers]) {
          setFollowUpAnswers(JSON.parse(map[STORAGE_KEYS.followUpAnswers]));
        }
        if (map[STORAGE_KEYS.notificationPrefs]) {
          setNotificationPrefs({
            ...DEFAULT_NOTIFICATION_PREFS,
            ...JSON.parse(map[STORAGE_KEYS.notificationPrefs]),
          });
        }

        if (map[STORAGE_KEYS.result]) {
          setFlow('app');
        }
      } finally {
        if (active) setBooting(false);
      }
    }

    loadPersisted();
    return () => {
      active = false;
      clearTimers();
    };
  }, [clearTimers]);

  useEffect(() => {
    if (booting) return;
    AsyncStorage.setItem(STORAGE_KEYS.locale, locale).catch(() => {});
  }, [locale, booting]);

  useEffect(() => {
    if (booting) return;
    AsyncStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile)).catch(() => {});
  }, [profile, booting]);

  useEffect(() => {
    if (booting) return;
    AsyncStorage.setItem(STORAGE_KEYS.memberTier, JSON.stringify(memberTier)).catch(() => {});
  }, [memberTier, booting]);

  useEffect(() => {
    if (booting) return;
    AsyncStorage.setItem(STORAGE_KEYS.memberRegistration, JSON.stringify(memberRegistration)).catch(() => {});
  }, [memberRegistration, booting]);

  useEffect(() => {
    if (booting) return;
    AsyncStorage.setItem(STORAGE_KEYS.familyProfiles, JSON.stringify(familyProfiles)).catch(() => {});
  }, [familyProfiles, booting]);

  useEffect(() => {
    if (booting) return;
    AsyncStorage.setItem(STORAGE_KEYS.activeFamilyProfileId, JSON.stringify(activeFamilyProfileId)).catch(() => {});
  }, [activeFamilyProfileId, booting]);

  useEffect(() => {
    if (booting) return;
    if (chartResult) {
      AsyncStorage.setItem(STORAGE_KEYS.result, JSON.stringify(chartResult)).catch(() => {});
    }
  }, [chartResult, booting]);

  useEffect(() => {
    if (booting) return;
    if (fortuneCalendar?.length) {
      AsyncStorage.setItem(STORAGE_KEYS.fortuneCalendar, JSON.stringify(fortuneCalendar)).catch(() => {});
    }
  }, [fortuneCalendar, booting]);

  useEffect(() => {
    if (booting) return;
    if (calSummary) {
      AsyncStorage.setItem(STORAGE_KEYS.calSummary, JSON.stringify(calSummary)).catch(() => {});
    }
  }, [calSummary, booting]);

  useEffect(() => {
    if (booting) return;
    if (aiText) {
      AsyncStorage.setItem(STORAGE_KEYS.aiText, JSON.stringify(aiText)).catch(() => {});
    }
  }, [aiText, booting]);

  useEffect(() => {
    if (booting) return;
    if (oneLineSummary) {
      AsyncStorage.setItem(STORAGE_KEYS.oneLineSummary, JSON.stringify(oneLineSummary)).catch(() => {});
    }
  }, [oneLineSummary, booting]);

  useEffect(() => {
    if (booting) return;
    if (weeklyActions) {
      AsyncStorage.setItem(STORAGE_KEYS.weeklyActions, JSON.stringify(weeklyActions)).catch(() => {});
    }
  }, [weeklyActions, booting]);

  useEffect(() => {
    if (booting) return;
    if (followUpQuestions?.length) {
      AsyncStorage.setItem(STORAGE_KEYS.followUpQuestions, JSON.stringify(followUpQuestions)).catch(() => {});
    }
  }, [followUpQuestions, booting]);

  useEffect(() => {
    if (booting) return;
    AsyncStorage.setItem(STORAGE_KEYS.followUpAnswers, JSON.stringify(followUpAnswers)).catch(() => {});
  }, [followUpAnswers, booting]);

  useEffect(() => {
    if (booting) return;
    AsyncStorage.setItem(STORAGE_KEYS.notificationPrefs, JSON.stringify(notificationPrefs)).catch(() => {});
  }, [notificationPrefs, booting]);

  useEffect(() => {
    if (booting || !chartResult) return;
    scheduleDailyLuckNotification(notificationPrefs, chartResult, profile).catch(() => {});
  }, [booting, chartResult, notificationPrefs, profile]);

  const handleLocaleChange = useCallback((nextLocale) => {
    setLocale(nextLocale);
    setLocaleState(nextLocale);
  }, []);

  const openIntakeFromOnboarding = useCallback(() => {
    setIntakeOrigin('onboarding');
    setFlow('intake-birth');
  }, []);

  const openIntakeFromApp = useCallback(() => {
    setIntakeOrigin('app');
    setFlow('intake-birth');
  }, []);

  const handleIntakeBackFromBirth = useCallback(() => {
    setFlow(intakeOrigin === 'app' ? 'app' : 'onboarding');
  }, [intakeOrigin]);

  const buildChart = useCallback(() => {
    const y = parseInt(profile.year, 10) || 1990;
    const m = parseInt(profile.month, 10) || 1;
    const d = parseInt(profile.day, 10) || 1;
    let h = parseInt(profile.hour, 10) || 0;
    const minute = parseInt(profile.minute, 10) || 0;
    const calendarType = profile.calendarType || 'solar';
    const solarBirthDate = calendarType === 'lunar'
      ? lunarToSolar({
          year: y,
          month: m,
          day: d,
          isLeapMonth: Boolean(profile.lunarIsLeapMonth),
        })
      : new Date(y, m - 1, d);
    const solarYear = solarBirthDate.getFullYear();
    const solarMonth = solarBirthDate.getMonth() + 1;
    const solarDay = solarBirthDate.getDate();
    const birthTime = `${`${h}`.padStart(2, '0')}:${`${minute}`.padStart(2, '0')}`;
    const engineChart = computeChart({
      calendarType,
      ...(calendarType === 'lunar'
        ? {
            lunarYear: y,
            lunarMonth: m,
            lunarDay: d,
            lunarIsLeapMonth: Boolean(profile.lunarIsLeapMonth),
          }
        : {
            solarDate: `${solarYear}-${`${solarMonth}`.padStart(2, '0')}-${`${solarDay}`.padStart(2, '0')}`,
          }),
      birthTime,
      birthCity: profile.city,
      useTrueSolarTime: profile.useTrueSolarTime,
      useJieqiBoundary: profile.useJieqiBoundary,
      gender: profile.gender,
    });
    const correctedBirthDate = engineChart.correctedTime || new Date(solarYear, solarMonth - 1, solarDay, h, minute);
    const currentAge = new Date().getFullYear() - solarYear;
    const currentDaYun = engineChart.daYun?.find((item) => currentAge >= item.startAge && currentAge <= item.endAge) || engineChart.daYun?.[0] || null;
    const pillars = [
      {
        label: '年',
        gan: engineChart.pillars.year.stem,
        zhi: engineChart.pillars.year.branch,
        hiddenStems: engineChart.pillarDetails?.year?.hiddenStems || [],
        hiddenTenGods: engineChart.pillarDetails?.year?.hiddenStemTenGods || [],
      },
      {
        label: '月',
        gan: engineChart.pillars.month.stem,
        zhi: engineChart.pillars.month.branch,
        hiddenStems: engineChart.pillarDetails?.month?.hiddenStems || [],
        hiddenTenGods: engineChart.pillarDetails?.month?.hiddenStemTenGods || [],
      },
      {
        label: '日',
        gan: engineChart.pillars.day.stem,
        zhi: engineChart.pillars.day.branch,
        hiddenStems: engineChart.pillarDetails?.day?.hiddenStems || [],
        hiddenTenGods: engineChart.pillarDetails?.day?.hiddenStemTenGods || [],
      },
      {
        label: '时',
        gan: engineChart.pillars.hour.stem,
        zhi: engineChart.pillars.hour.branch,
        hiddenStems: engineChart.pillarDetails?.hour?.hiddenStems || [],
        hiddenTenGods: engineChart.pillarDetails?.hour?.hiddenStemTenGods || [],
      },
    ];
    const relationSummary = buildBranchRelations(pillars);
    const dayGan = engineChart.pillars.day.stem;
    const dayWuXing = engineChart.pillars.day.wuXingS;
    const shiShen = [
      engineChart.tenGods.year,
      engineChart.tenGods.month,
      '日元',
      engineChart.tenGods.hour,
    ];
    const wxCount = {
      木: engineChart.wuXingCount['木'] || 0,
      火: engineChart.wuXingCount['火'] || 0,
      土: engineChart.wuXingCount['土'] || 0,
      金: engineChart.wuXingCount['金'] || 0,
      水: engineChart.wuXingCount['水'] || 0,
    };
    const dayStrength = getDayMasterStrength(dayGan, pillars, wxCount);
    const todayPillar = engineChart.todayPillar;
    const dailyFortune = getDailyFortune(todayPillar, dayGan);
    const jiFang = getJiFang(dayGan);
    const jiShi = getJiShi(todayPillar.zhi);
    const liuNianFortune = getLiuNianFortune(engineChart.liuNianPillar, dayGan);
    const calibratedStrengthLevel = dayStrength?.strength === '偏强'
      ? '偏强'
      : dayStrength?.strength === '中和偏强'
        ? '偏强'
        : dayStrength?.strength === '中和偏弱'
          ? '偏弱'
          : dayStrength?.strength === '偏弱'
            ? '偏弱'
            : '中和';
    const rawStrengthRuleAnalysis = analyzeStrengthRules({
      pillars: {
        year: { stem: engineChart.pillars.year.stem, branch: engineChart.pillars.year.branch },
        month: { stem: engineChart.pillars.month.stem, branch: engineChart.pillars.month.branch },
        day: { stem: engineChart.pillars.day.stem, branch: engineChart.pillars.day.branch },
        hour: { stem: engineChart.pillars.hour.stem, branch: engineChart.pillars.hour.branch },
      },
      dayMaster: dayGan,
      monthCommand: engineChart.pillars.month.branch,
      season: getSeasonByMonthBranch(engineChart.pillars.month.branch),
      elementScoresRaw: engineChart.wuXingRatio || {},
      branchRelations: relationSummary.branchRelations,
      currentDaYun: currentDaYun
        ? { stem: currentDaYun.gan, branch: currentDaYun.zhi }
        : null,
      currentLiuNian: engineChart.liuNianPillar
        ? { stem: engineChart.liuNianPillar.gan, branch: engineChart.liuNianPillar.zhi }
        : null,
      precomputedStrengthLevel: calibratedStrengthLevel,
      precomputedStrengthScore: dayStrength?.score,
    });
    const strengthRuleAnalysis = {
      ...rawStrengthRuleAnalysis,
      level: calibratedStrengthLevel,
      score: typeof dayStrength?.score === 'number' ? dayStrength.score : rawStrengthRuleAnalysis.score,
      reasons: [
        `日元状态已按新版评分引擎校正为「${dayStrength?.strength || calibratedStrengthLevel}」`,
        ...(rawStrengthRuleAnalysis?.reasons || []),
      ],
      debug: {
        ...(rawStrengthRuleAnalysis?.debug || {}),
        calibratedFromDayStrength: dayStrength || null,
      },
    };
    const tenGodPreference = analyzeTenGodPreference(
      {
        pillars: {
          year: { stem: engineChart.pillars.year.stem, branch: engineChart.pillars.year.branch },
          month: { stem: engineChart.pillars.month.stem, branch: engineChart.pillars.month.branch },
          day: { stem: engineChart.pillars.day.stem, branch: engineChart.pillars.day.branch },
          hour: { stem: engineChart.pillars.hour.stem, branch: engineChart.pillars.hour.branch },
        },
        dayMaster: dayGan,
        monthCommand: engineChart.pillars.month.branch,
        season: getSeasonByMonthBranch(engineChart.pillars.month.branch),
        elementScoresRaw: engineChart.wuXingRatio || {},
        branchRelations: relationSummary.branchRelations,
      },
      strengthRuleAnalysis.level
    );
    const useGodAnalysis = analyzeUseGod(
      {
        pillars: {
          year: { stem: engineChart.pillars.year.stem, branch: engineChart.pillars.year.branch },
          month: { stem: engineChart.pillars.month.stem, branch: engineChart.pillars.month.branch },
          day: { stem: engineChart.pillars.day.stem, branch: engineChart.pillars.day.branch },
          hour: { stem: engineChart.pillars.hour.stem, branch: engineChart.pillars.hour.branch },
        },
        dayMaster: dayGan,
        monthCommand: engineChart.pillars.month.branch,
        season: getSeasonByMonthBranch(engineChart.pillars.month.branch),
        elementScoresRaw: engineChart.wuXingRatio || {},
        branchRelations: relationSummary.branchRelations,
      },
      strengthRuleAnalysis,
      tenGodPreference
    );
    const luckAnalysis = analyzeLuck(
      {
        pillars: {
          year: { stem: engineChart.pillars.year.stem, branch: engineChart.pillars.year.branch },
          month: { stem: engineChart.pillars.month.stem, branch: engineChart.pillars.month.branch },
          day: { stem: engineChart.pillars.day.stem, branch: engineChart.pillars.day.branch },
          hour: { stem: engineChart.pillars.hour.stem, branch: engineChart.pillars.hour.branch },
        },
        dayMaster: dayGan,
        monthCommand: engineChart.pillars.month.branch,
        season: getSeasonByMonthBranch(engineChart.pillars.month.branch),
        elementScoresRaw: engineChart.wuXingRatio || {},
        branchRelations: relationSummary.branchRelations,
        currentDaYun: currentDaYun
          ? { stem: currentDaYun.gan, branch: currentDaYun.zhi }
          : null,
        currentLiuNian: engineChart.liuNianPillar
          ? { stem: engineChart.liuNianPillar.gan, branch: engineChart.liuNianPillar.zhi }
          : null,
      },
      strengthRuleAnalysis,
      tenGodPreference,
      useGodAnalysis
    );
    const narrative = analyzeNarrative(
      {
        pillars: {
          year: { stem: engineChart.pillars.year.stem, branch: engineChart.pillars.year.branch },
          month: { stem: engineChart.pillars.month.stem, branch: engineChart.pillars.month.branch },
          day: { stem: engineChart.pillars.day.stem, branch: engineChart.pillars.day.branch },
          hour: { stem: engineChart.pillars.hour.stem, branch: engineChart.pillars.hour.branch },
        },
        dayMaster: dayGan,
        monthCommand: engineChart.pillars.month.branch,
        season: getSeasonByMonthBranch(engineChart.pillars.month.branch),
        elementScoresRaw: engineChart.wuXingRatio || {},
        branchRelations: relationSummary.branchRelations,
        currentDaYun: currentDaYun
          ? { stem: currentDaYun.gan, branch: currentDaYun.zhi }
          : null,
        currentLiuNian: engineChart.liuNianPillar
          ? { stem: engineChart.liuNianPillar.gan, branch: engineChart.liuNianPillar.zhi }
          : null,
      },
      strengthRuleAnalysis,
      tenGodPreference,
      useGodAnalysis,
      luckAnalysis
    );
    const chengGu = calculateChengGu({
      yearGanZhi: `${engineChart.pillars.year.stem}${engineChart.pillars.year.branch}`,
      lunarMonth: engineChart.lunar?.month,
      lunarDay: engineChart.lunar?.day,
      hourZhi: engineChart.pillars.hour.branch,
      isLeapMonth: Boolean(engineChart.lunar?.isLeapMonth),
    });

    return {
      daYun: engineChart.daYun,
      currentDaYun,
      currentDayun: currentDaYun,
      currentDaYunLabel: currentDaYun ? `${currentDaYun.gan || ''}${currentDaYun.zhi || ''}` : '',
      todayPillar,
      liuNianPillar: engineChart.liuNianPillar,
      guiRen: engineChart.guiRen,
      wenChang: engineChart.wenChang,
      yiMa: engineChart.yiMa,
      pillars,
      shiShen,
      wxCount,
      dayStrength,
      naYin: engineChart.naYin,
      naYinDetails: engineChart.naYinDetails,
      dayGan,
      dayWuXing,
      birthInfo: {
        year: solarYear,
        month: solarMonth,
        day: solarDay,
        hour: correctedBirthDate.getHours(),
        minute: correctedBirthDate.getMinutes(),
        calendarType,
      },
      lunar: engineChart.lunar,
      lunarDateStr: engineChart.formatted.lunarDateStr,
      formattedBirthSummary: engineChart.formatted.birthSummary,
      formattedGanzhi: engineChart.formatted.ganzhi,
      formattedPillarsTable: engineChart.formatted.pillarsTable,
      branchRelations: relationSummary.branchRelations,
      stemRelations: relationSummary.stemRelations,
      branchPairs: relationSummary.branchPairs,
      specialCombinations: relationSummary.specialCombinations,
      correctedTime: engineChart.correctedTime,
      trueSolarOffsetMin: engineChart.trueSolarOffsetMin,
      solarDate: engineChart.solarDate,
      nextJieqi: engineChart.nextJieqi,
      currentJieqiMonth: engineChart.currentJieqiMonth,
      birthYearJieqi: engineChart.birthYearJieqi,
      tenGods: engineChart.tenGods,
      analysis: engineChart.analysis,
      kongWang: engineChart.kongWang,
      kongWangDetails: engineChart.kongWangDetails,
      pillarDetails: engineChart.pillarDetails,
      diShiDetails: engineChart.diShiDetails,
      xunDetails: engineChart.xunDetails,
      shenShaDetails: engineChart.shenShaDetails,
      taiYuan: engineChart.taiYuan,
      mingGong: engineChart.mingGong,
      shenGong: engineChart.shenGong,
      taiXi: engineChart.taiXi,
      wuXingRatio: engineChart.wuXingRatio,
      strengthRuleAnalysis,
      tenGodPreference,
      useGodAnalysis,
      luckAnalysis,
      narrative,
      chengGu,
      dailyFortune,
      jiFang,
      luckyDirection: jiFang?.ji || '--',
      unluckyDirection: jiFang?.xiong || '--',
      luckyColor: jiFang?.color || '--',
      luckyNumber: jiFang?.num || '--',
      luckyElements: jiFang?.jiWx || '--',
      jiShi,
      liuNianFortune,
      liuNianYear: engineChart.liuNianPillar?.year,
      sC: engineChart.trueSolarOffsetMin ?? 0,
      city: profile.city,
      focus: profile.focus,
      role: profile.role,
      nickname: profile.nickname,
      calendarType,
      inputBirthInfo: {
        year: y,
        month: m,
        day: d,
        hour: parseInt(profile.hour, 10) || 0,
        minute,
        calendarType,
        lunarIsLeapMonth: Boolean(profile.lunarIsLeapMonth),
      },
      solarBirthInfo: {
        year: solarYear,
        month: solarMonth,
        day: solarDay,
      },
    };
  }, [profile]);

  const handleGenerate = useCallback(() => {
    clearTimers();
    const chart = buildChart();
    const calendar = generateFortuneCalendar(chart.dayGan, 30);
    const summary = getMonthSummary(calendar);
    const shouldCreateFamilyProfile = intakeOrigin === 'family' && memberTier !== 'free';
    const nextFamilyId = shouldCreateFamilyProfile ? `family-${Date.now()}` : activeFamilyProfileId;

    setChartResult(chart);
    setFortuneCalendar(calendar);
    setCalSummary(summary);
    setAiText(null);
    setOneLineSummary('');
    setWeeklyActions(null);
    setFollowUpQuestions([]);
    setFollowUpAnswers({});
    if (shouldCreateFamilyProfile) {
      setFamilyProfiles((prev) => [
        buildFamilyProfileEntry({
          id: nextFamilyId,
          profile,
          chartResult: chart,
          fortuneCalendar: calendar,
          calSummary: summary,
          aiText: null,
          oneLineSummary: '',
          weeklyActions: null,
          followUpQuestions: [],
          followUpAnswers: {},
        }),
        ...prev,
      ].slice(0, MAX_FAMILY_PROFILES));
      setActiveFamilyProfileId(nextFamilyId);
    }
    setGeneratingStatus(hideMembership ? '正在整理你的基础资料' : '正在保存你的原始出生信息');
    setFlow('generating');
    setProfileReadyVisible(false);

    timersRef.current = [
      setTimeout(() => setGeneratingStatus('正在校正历法、时区与节气边界'), 480),
      setTimeout(() => setGeneratingStatus(hideMembership ? '正在生成第一版个性洞察' : '正在排盘并生成第一轮现代解读'), 980),
      setTimeout(() => {
        setFlow('app');
        setProfileReadyVisible(true);
      }, 1680),
    ];
  }, [activeFamilyProfileId, buildChart, clearTimers, intakeOrigin, memberTier, profile]);

  const handleGenerateCompanion = useCallback(async ({ answers = followUpAnswers, silent = false } = {}) => {
    if (!chartResult) return;

    if (!silent || !oneLineSummary || !weeklyActions || !followUpQuestions.length) {
      setCompanionLoading(true);
    }

    try {
      const pack = await generateCompanionPack({
        chart: chartResult,
        profile,
        locale,
        answers,
      });

      setOneLineSummary(pack.oneLineSummary || '');
      setWeeklyActions(pack.weeklyActions || null);
      setFollowUpQuestions(pack.followUpQuestions || []);
    } catch (error) {
      if (!silent) {
        Alert.alert('AI 陪伴生成失败', error?.message || '请稍后再试。');
      }
    } finally {
      setCompanionLoading(false);
    }
  }, [chartResult, followUpAnswers, followUpQuestions.length, locale, oneLineSummary, profile, weeklyActions]);

  const handleGenerateAI = useCallback(async () => {
    if (!chartResult) return;
    setAiLoading(true);
    try {
      const text = await generateAIReading(chartResult, locale, { profile });
      setAiText(parseAIReading(text));
    } catch (error) {
      Alert.alert('AI 解读生成失败', error?.message || '请稍后再试。');
    } finally {
      setAiLoading(false);
    }
  }, [chartResult, locale]);

  const handleFollowUpAnswerChange = useCallback((id, value) => {
    setFollowUpAnswers((prev) => ({ ...prev, [id]: value }));
  }, []);

  useEffect(() => {
    if (booting || !chartResult || companionLoading) return;
    if (oneLineSummary && weeklyActions && followUpQuestions.length) return;
    handleGenerateCompanion({ silent: true });
  }, [
    booting,
    chartResult,
    companionLoading,
    followUpQuestions.length,
    handleGenerateCompanion,
    oneLineSummary,
    weeklyActions,
  ]);

  const handleExportProfile = useCallback(async () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      locale,
      memberTier,
      profile,
      chartResult,
      calSummary,
      aiText,
      oneLineSummary,
      weeklyActions,
      followUpQuestions,
      followUpAnswers,
    };

    try {
      const exportDir = `${FileSystem.documentDirectory}exports`;
      const nickname = (profile?.nickname || profile?.city || 'mingme')
        .replace(/[^\w\u4e00-\u9fa5-]+/g, '_')
        .slice(0, 24);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileUri = `${exportDir}/mingme-profile-${nickname || 'user'}-${timestamp}.json`;

      const dirInfo = await FileSystem.getInfoAsync(exportDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(exportDir, { intermediates: true });
      }

      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(payload, null, 2), {
        encoding: FileSystem.EncodingType.UTF8,
      });

      Alert.alert('导出成功', `档案已保存到本地文件：\n${fileUri}`);
    } catch (error) {
      Alert.alert('导出失败', error?.message || '暂时无法导出档案。');
    }
  }, [aiText, calSummary, chartResult, followUpAnswers, followUpQuestions, locale, memberTier, oneLineSummary, profile, weeklyActions]);

  const handleResetAIReading = useCallback(() => {
    Alert.alert('重置 AI 解读', '这会清除当前保存的 AI 解读内容，但不会删除档案和排盘结果。', [
      { text: '取消', style: 'cancel' },
      {
        text: '重置',
        style: 'destructive',
        onPress: async () => {
          setAiText(null);
          setOneLineSummary('');
          setWeeklyActions(null);
          setFollowUpQuestions([]);
          setFollowUpAnswers({});
          await AsyncStorage.removeItem(STORAGE_KEYS.aiText);
          await AsyncStorage.multiRemove([
            STORAGE_KEYS.oneLineSummary,
            STORAGE_KEYS.weeklyActions,
            STORAGE_KEYS.followUpQuestions,
            STORAGE_KEYS.followUpAnswers,
          ]);
        },
      },
    ]);
  }, []);

  const handleNotificationPrefsChange = useCallback(async (patch) => {
    const nextPrefs = { ...notificationPrefs, ...patch };
    setNotificationPrefs(nextPrefs);

    try {
      if (chartResult) {
        await scheduleDailyLuckNotification(nextPrefs, chartResult, profile);
      }

      await syncNotificationPrefsToBackend({
        profile: {
          nickname: profile.nickname || '',
          city: profile.city || '',
        },
        memberTier,
        notificationPrefs: nextPrefs,
      });
    } catch (error) {
      if (patch.appEnabled) {
        Alert.alert('提醒设置失败', error?.message || '暂时无法开启每日提醒。');
      }
    }
  }, [chartResult, memberTier, notificationPrefs, profile]);

  const handleMemberRegistrationSave = useCallback((payload) => {
    setPaywallVisible(false);
    if (payload?.registration) {
      setMemberRegistration({
        ...DEFAULT_MEMBER_REGISTRATION,
        ...payload.registration,
      });
    }
  }, []);

  useEffect(() => {
    if (booting || !activeFamilyProfileId || !chartResult) return;
    setFamilyProfiles((prev) => prev.map((item) => (
      item.id === activeFamilyProfileId
        ? buildFamilyProfileEntry({
            id: item.id,
            createdAt: item.createdAt,
            profile,
            chartResult,
            fortuneCalendar,
            calSummary,
            aiText,
            oneLineSummary,
            weeklyActions,
            followUpQuestions,
            followUpAnswers,
          })
        : item
    )));
  }, [
    activeFamilyProfileId,
    aiText,
    booting,
    calSummary,
    chartResult,
    followUpAnswers,
    followUpQuestions,
    fortuneCalendar,
    oneLineSummary,
    profile,
    weeklyActions,
  ]);

  /*
  const handleCreateFamilyProfile = useCallback(() => {
    if (memberTier === 'free') {
      setPaywallVisible(true);
      return;
    }
    if (familyProfiles.length >= MAX_FAMILY_PROFILES) {
      Alert.alert('瀹朵汉妗ｆ宸叉弧', `浼氬憳鏈€澶氬彲淇濆瓨 ${MAX_FAMILY_PROFILES} 缁勫浜烘。妗堬紝璇峰厛鍒犻櫎涓€缁勫悗鍐嶆柊澧炪€俙);
      return;
    }
    setActiveFamilyProfileId(null);
    setIntakeOrigin('family');
    setProfile(DEFAULT_PROFILE);
    setFlow('intake-birth');
  }, [familyProfiles.length, memberTier]);

  const handleSaveCurrentToFamilyProfiles = useCallback(() => {
    if (memberTier === 'free') {
      setPaywallVisible(true);
      return;
    }
    if (!chartResult) {
      Alert.alert('鏆傛椂鏃犳硶淇濆瓨', '璇峰厛瀹屾垚褰撳墠妗ｆ鎺掔洏锛屽啀鍔犲叆瀹朵汉妗ｆ鍒楄〃銆?);
      return;
    }
    const existing = activeFamilyProfileId ? familyProfiles.find((item) => item.id === activeFamilyProfileId) : null;
    if (!existing && familyProfiles.length >= MAX_FAMILY_PROFILES) {
      Alert.alert('瀹朵汉妗ｆ宸叉弧', `浼氬憳鏈€澶氬彲淇濆瓨 ${MAX_FAMILY_PROFILES} 缁勫浜烘。妗堬紝璇峰厛鍒犻櫎涓€缁勫悗鍐嶇户缁繚瀛樸€俙);
      return;
    }

    const nextId = existing?.id || `family-${Date.now()}`;
    const nextEntry = buildFamilyProfileEntry({
      id: nextId,
      createdAt: existing?.createdAt,
      profile,
      chartResult,
      fortuneCalendar,
      calSummary,
      aiText,
      oneLineSummary,
      weeklyActions,
      followUpQuestions,
      followUpAnswers,
    });

    setFamilyProfiles((prev) => {
      if (prev.some((item) => item.id === nextId)) {
        return prev.map((item) => (item.id === nextId ? nextEntry : item));
      }
      return [nextEntry, ...prev].slice(0, MAX_FAMILY_PROFILES);
    });
    setActiveFamilyProfileId(nextId);
    Alert.alert(existing ? '瀹朵汉妗ｆ宸叉洿鏂? : '宸插姞鍏ュ浜烘。妗?, `${profile?.nickname || profile?.city || '褰撳墠妗ｆ'} 宸蹭繚瀛樺埌瀹朵汉妗ｆ鍒楄〃銆俙);
  }, [activeFamilyProfileId, aiText, calSummary, chartResult, familyProfiles, followUpAnswers, followUpQuestions, fortuneCalendar, memberTier, oneLineSummary, profile, weeklyActions]);

  const handleSwitchFamilyProfile = useCallback((entry) => {
    if (!entry) return;
    setProfile({ ...DEFAULT_PROFILE, ...(entry.profile || {}) });
    setChartResult(entry.chartResult || null);
    setFortuneCalendar(Array.isArray(entry.fortuneCalendar) ? entry.fortuneCalendar : []);
    setCalSummary(entry.calSummary || null);
    setAiText(entry.aiText || null);
    setOneLineSummary(entry.oneLineSummary || '');
    setWeeklyActions(entry.weeklyActions || null);
    setFollowUpQuestions(Array.isArray(entry.followUpQuestions) ? entry.followUpQuestions : []);
    setFollowUpAnswers(entry.followUpAnswers && typeof entry.followUpAnswers === 'object' ? entry.followUpAnswers : {});
    setActiveFamilyProfileId(entry.id || null);
    setPaywallVisible(false);
    setFlow('app');
  }, []);

  const handleDeleteFamilyProfile = useCallback((entry) => {
    if (!entry?.id) return;
    Alert.alert('鍒犻櫎瀹朵汉妗ｆ', `纭鍒犻櫎 ${entry?.profile?.nickname || entry?.profile?.city || '杩欑粍妗ｆ'} 鍚楋紵鍒犻櫎鍚庡皢鏃犳硶鎭㈠銆俙, [
      { text: '鍙栨秷', style: 'cancel' },
      {
        text: '鍒犻櫎',
        style: 'destructive',
        onPress: () => {
          setFamilyProfiles((prev) => prev.filter((item) => item.id !== entry.id));
          if (activeFamilyProfileId === entry.id) {
            setActiveFamilyProfileId(null);
          }
        },
      },
    ]);
  }, [activeFamilyProfileId]);

  */

  const handleCreateFamilyProfile = useCallback(() => {
    if (memberTier === 'free') {
      setPaywallVisible(true);
      return;
    }
    if (familyProfiles.length >= MAX_FAMILY_PROFILES) {
      Alert.alert('\u5bb6\u4eba\u6863\u6848\u5df2\u6ee1', `\u4f1a\u5458\u6700\u591a\u53ef\u4fdd\u5b58 ${MAX_FAMILY_PROFILES} \u7ec4\u5bb6\u4eba\u6863\u6848\uff0c\u8bf7\u5148\u5220\u9664\u4e00\u7ec4\u540e\u518d\u65b0\u589e\u3002`);
      return;
    }
    setActiveFamilyProfileId(null);
    setIntakeOrigin('family');
    setProfile(DEFAULT_PROFILE);
    setFlow('intake-birth');
  }, [familyProfiles.length, memberTier]);

  const handleSaveCurrentToFamilyProfiles = useCallback(() => {
    if (memberTier === 'free') {
      setPaywallVisible(true);
      return;
    }
    if (!chartResult) {
      Alert.alert('\u6682\u65f6\u65e0\u6cd5\u4fdd\u5b58', '\u8bf7\u5148\u5b8c\u6210\u5f53\u524d\u6863\u6848\u6392\u76d8\uff0c\u518d\u52a0\u5165\u5bb6\u4eba\u6863\u6848\u5217\u8868\u3002');
      return;
    }
    const existing = activeFamilyProfileId ? familyProfiles.find((item) => item.id === activeFamilyProfileId) : null;
    if (!existing && familyProfiles.length >= MAX_FAMILY_PROFILES) {
      Alert.alert('\u5bb6\u4eba\u6863\u6848\u5df2\u6ee1', `\u4f1a\u5458\u6700\u591a\u53ef\u4fdd\u5b58 ${MAX_FAMILY_PROFILES} \u7ec4\u5bb6\u4eba\u6863\u6848\uff0c\u8bf7\u5148\u5220\u9664\u4e00\u7ec4\u540e\u518d\u7ee7\u7eed\u4fdd\u5b58\u3002`);
      return;
    }

    const nextId = existing?.id || `family-${Date.now()}`;
    const nextEntry = buildFamilyProfileEntry({
      id: nextId,
      createdAt: existing?.createdAt,
      profile,
      chartResult,
      fortuneCalendar,
      calSummary,
      aiText,
      oneLineSummary,
      weeklyActions,
      followUpQuestions,
      followUpAnswers,
    });

    setFamilyProfiles((prev) => {
      if (prev.some((item) => item.id === nextId)) {
        return prev.map((item) => (item.id === nextId ? nextEntry : item));
      }
      return [nextEntry, ...prev].slice(0, MAX_FAMILY_PROFILES);
    });
    setActiveFamilyProfileId(nextId);
    Alert.alert(
      existing ? '\u5bb6\u4eba\u6863\u6848\u5df2\u66f4\u65b0' : '\u5df2\u52a0\u5165\u5bb6\u4eba\u6863\u6848',
      `${profile?.nickname || profile?.city || '\u5f53\u524d\u6863\u6848'} \u5df2\u4fdd\u5b58\u5230\u5bb6\u4eba\u6863\u6848\u5217\u8868\u3002`
    );
  }, [activeFamilyProfileId, aiText, calSummary, chartResult, familyProfiles, followUpAnswers, followUpQuestions, fortuneCalendar, memberTier, oneLineSummary, profile, weeklyActions]);

  const handleSwitchFamilyProfile = useCallback((entry) => {
    if (!entry) return;
    setProfile({ ...DEFAULT_PROFILE, ...(entry.profile || {}) });
    setChartResult(entry.chartResult || null);
    setFortuneCalendar(Array.isArray(entry.fortuneCalendar) ? entry.fortuneCalendar : []);
    setCalSummary(entry.calSummary || null);
    setAiText(entry.aiText || null);
    setOneLineSummary(entry.oneLineSummary || '');
    setWeeklyActions(entry.weeklyActions || null);
    setFollowUpQuestions(Array.isArray(entry.followUpQuestions) ? entry.followUpQuestions : []);
    setFollowUpAnswers(entry.followUpAnswers && typeof entry.followUpAnswers === 'object' ? entry.followUpAnswers : {});
    setActiveFamilyProfileId(entry.id || null);
    setPaywallVisible(false);
    setFlow('app');
  }, []);

  const handleDeleteFamilyProfile = useCallback((entry) => {
    if (!entry?.id) return;
    Alert.alert('\u5220\u9664\u5bb6\u4eba\u6863\u6848', `\u786e\u8ba4\u5220\u9664 ${entry?.profile?.nickname || entry?.profile?.city || '\u8fd9\u7ec4\u6863\u6848'} \u5417\uff1f\u5220\u9664\u540e\u5c06\u65e0\u6cd5\u6062\u590d\u3002`, [
      { text: '\u53d6\u6d88', style: 'cancel' },
      {
        text: '\u5220\u9664',
        style: 'destructive',
        onPress: () => {
          setFamilyProfiles((prev) => prev.filter((item) => item.id !== entry.id));
          if (activeFamilyProfileId === entry.id) {
            setActiveFamilyProfileId(null);
          }
        },
      },
    ]);
  }, [activeFamilyProfileId]);

  const handleResetData = useCallback(() => {
    Alert.alert('清空本地数据', '这会清除已保存的档案、语言、会员状态和排盘结果。', [
      { text: '取消', style: 'cancel' },
      {
        text: '清空',
        style: 'destructive',
        onPress: async () => {
          clearTimers();
          await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
          setIntakeOrigin('onboarding');
          setProfile(DEFAULT_PROFILE);
          setMemberTier('free');
          setMemberRegistration(DEFAULT_MEMBER_REGISTRATION);
          setFamilyProfiles([]);
          setActiveFamilyProfileId(null);
          setChartResult(null);
          setFortuneCalendar([]);
          setCalSummary(null);
          setAiText(null);
          setOneLineSummary('');
          setWeeklyActions(null);
          setFollowUpQuestions([]);
          setFollowUpAnswers({});
          setNotificationPrefs(DEFAULT_NOTIFICATION_PREFS);
          setPaywallVisible(false);
          setLocale('zh-Hans');
          setLocaleState('zh-Hans');
          setFlow('onboarding');
        },
      },
    ]);
  }, [clearTimers]);

  if (booting) {
    return (
      <SafeAreaProvider>
        <GeneratingV2Screen statusText="正在载入你的本地档案…" />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      {flow === 'onboarding' ? <OnboardingScreen onFinish={openIntakeFromOnboarding} /> : null}
      {flow === 'intake-birth' ? (
        <IntakeBirthScreen
          profile={profile}
          patchProfile={patchProfile}
          onNext={() => setFlow('intake-focus')}
          onBack={handleIntakeBackFromBirth}
          reviewMode={hideMembership}
        />
      ) : null}
      {flow === 'intake-focus' ? (
        <IntakeFocusScreen
          profile={profile}
          patchProfile={patchProfile}
          onNext={() => setFlow('intake-role')}
          onBack={() => setFlow('intake-birth')}
          reviewMode={hideMembership}
        />
      ) : null}
      {flow === 'intake-role' ? (
        <IntakeRoleScreen
          profile={profile}
          patchProfile={patchProfile}
          onGenerate={handleGenerate}
          onBack={() => setFlow('intake-focus')}
          reviewMode={hideMembership}
        />
      ) : null}
      {flow === 'generating' ? <GeneratingV2Screen statusText={generatingStatus} /> : null}
      {flow === 'app' && chartResult ? (
        <>
          <ResultV2Shell
            result={chartResult}
            profile={profile}
            fortuneCalendar={fortuneCalendar}
            calSummary={calSummary}
            locale={locale}
            supportedLocales={supportedLocales}
            onLocaleChange={handleLocaleChange}
            onOpenPaywall={() => setPaywallVisible(true)}
            onRecalculate={openIntakeFromApp}
            onEditProfile={openIntakeFromApp}
            onResetData={handleResetData}
            onResetAIReading={handleResetAIReading}
            notificationPrefs={notificationPrefs}
            onNotificationPrefsChange={handleNotificationPrefsChange}
            onGenerateAI={handleGenerateAI}
            onGenerateCompanion={handleGenerateCompanion}
            onFollowUpAnswerChange={handleFollowUpAnswerChange}
            aiLoading={aiLoading}
            companionLoading={companionLoading}
            aiText={aiText}
            oneLineSummary={oneLineSummary}
            weeklyActions={weeklyActions}
            followUpQuestions={followUpQuestions}
            followUpAnswers={followUpAnswers}
            memberTier={memberTier}
            memberRegistration={memberRegistration}
            hideMembership={hideMembership}
            familyProfiles={familyProfiles}
            activeFamilyProfileId={activeFamilyProfileId}
            profileReadyVisible={profileReadyVisible}
            onDismissProfileReady={() => setProfileReadyVisible(false)}
            onCreateFamilyProfile={handleCreateFamilyProfile}
            onSaveCurrentToFamilyProfile={handleSaveCurrentToFamilyProfiles}
            onSwitchFamilyProfile={handleSwitchFamilyProfile}
            onDeleteFamilyProfile={handleDeleteFamilyProfile}
          />
          <PaywallScreen
            visible={paywallVisible && !hideMembership}
            onClose={() => setPaywallVisible(false)}
            onSaveRegistration={handleMemberRegistrationSave}
            profile={profile}
            registrationDraft={memberRegistration}
          />
        </>
      ) : null}
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  screenPad: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 120,
    gap: 14,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 12,
    backgroundColor: 'rgba(242,242,247,0.94)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  navSide: {
    width: 80,
  },
  navBack: {
    color: C.ink,
    fontSize: 14,
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    color: C.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  navStep: {
    fontSize: 12,
    color: C.soft,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
  },
  cardTitle: {
    color: C.ink,
    fontSize: 18,
    fontWeight: '700',
  },
  cardBody: {
    marginTop: 6,
    color: C.soft,
    fontSize: 13,
    lineHeight: 20,
  },
  fieldWrap: {
    marginTop: 14,
  },
  fieldLabel: {
    color: C.soft,
    fontSize: 11,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(60,60,67,0.15)',
    backgroundColor: C.fieldBg,
    paddingHorizontal: 14,
    color: C.ink,
    fontSize: 15,
  },
  helper: {
    marginTop: 5,
    color: C.faint,
    fontSize: 11,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 10,
  },
  selector: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(60,60,67,0.15)',
    backgroundColor: C.fieldBg,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
  },
  selectorLabel: {
    color: C.ink,
    fontSize: 15,
  },
  selectorArrow: {
    color: C.soft,
    fontSize: 16,
  },
  cityList: {
    maxHeight: 260,
    marginTop: 8,
    padding: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.70)',
    borderWidth: 1,
    borderColor: C.border,
  },
  cityPickerPanel: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 10,
    maxHeight: 280,
  },
  cityProvinceList: {
    width: 110,
    padding: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.70)',
    borderWidth: 1,
    borderColor: C.border,
  },
  cityProvince: {
    color: C.soft,
    fontSize: 11,
    marginBottom: 6,
    fontWeight: '600',
  },
  cityProvinceItem: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 6,
  },
  cityProvinceItemActive: {
    backgroundColor: 'rgba(23,22,20,0.08)',
  },
  cityProvinceLabel: {
    fontSize: 13,
    color: C.inkSoft,
  },
  cityProvinceLabelActive: {
    color: C.ink,
    fontWeight: '700',
  },
  cityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  cityChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(118,118,128,0.12)',
  },
  cityChipActive: {
    backgroundColor: C.ink,
  },
  cityChipLabel: {
    fontSize: 12,
    color: C.inkSoft,
  },
  cityChipLabelActive: {
    color: '#FFF',
  },
  permissionCard: {
    marginTop: 14,
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(237,246,242,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(169,222,208,0.24)',
  },
  permissionCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#163238',
  },
  permissionCardBody: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    color: C.soft,
  },
  permissionActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  permissionButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(169,222,208,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  permissionButtonDisabled: {
    opacity: 0.65,
  },
  permissionButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#163238',
  },
  permissionHint: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
    color: '#1E8E6D',
  },
  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: 'rgba(118,118,128,0.12)',
    borderRadius: 999,
    padding: 4,
  },
  segmentItem: {
    flex: 1,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentItemActive: {
    backgroundColor: '#FFF',
  },
  segmentLabel: {
    color: C.soft,
    fontSize: 13,
    fontWeight: '600',
  },
  segmentLabelActive: {
    color: C.ink,
  },
  switchRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  switchTitle: {
    color: C.ink,
    fontSize: 14,
    fontWeight: '600',
  },
  switchBody: {
    marginTop: 4,
    color: C.soft,
    fontSize: 12,
    lineHeight: 18,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(118,118,128,0.12)',
  },
  pillActive: {
    backgroundColor: C.ink,
  },
  pillLabel: {
    color: C.ink,
    fontSize: 13,
  },
  pillLabelActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 18,
    backgroundColor: 'rgba(242,242,247,0.96)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 999,
    backgroundColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnLabel: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  onboardingScreen: {
    flex: 1,
    backgroundColor: '#13212E',
    paddingHorizontal: 32,
    paddingTop: 64,
    paddingBottom: 52,
    overflow: 'hidden',
  },
  onboardingAura: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 999,
    top: -180,
    right: -80,
    backgroundColor: 'rgba(169,222,208,0.14)',
  },
  onboardingProgressRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 48,
  },
  onboardingProgressDot: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  onboardingProgressDotSeen: {
    backgroundColor: '#d4af37',
  },
  onboardingProgressDotActive: {
    flex: 2,
  },
  onboardingContent: {
    flex: 1,
    justifyContent: 'center',
  },
  onboardingArtwork: {
    width: 176,
    height: 176,
    alignSelf: 'center',
    marginBottom: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onboardingGlow: {
    position: 'absolute',
    width: 188,
    height: 188,
    borderRadius: 999,
  },
  onboardingRingOuter: {
    position: 'absolute',
    width: 176,
    height: 176,
    borderRadius: 999,
    borderWidth: 1,
  },
  onboardingRingMid: {
    position: 'absolute',
    width: 132,
    height: 132,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  onboardingOrbitArc: {
    position: 'absolute',
    width: 126,
    height: 126,
    borderRadius: 999,
    borderWidth: 1,
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
    transform: [{ rotate: '-20deg' }],
  },
  onboardingRingInner: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 999,
    borderWidth: 1,
  },
  onboardingStar: {
    position: 'absolute',
    top: 28,
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#F4F7F3',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  onboardingCore: {
    width: 24,
    height: 24,
    borderRadius: 999,
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
  },
  onboardingBeam: {
    position: 'absolute',
    width: 110,
    height: 2,
    borderRadius: 999,
  },
  onboardingMark: {
    color: 'rgba(234,245,241,0.36)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 28,
    textAlign: 'center',
  },
  onboardingTitle: {
    color: '#F4F7F3',
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  onboardingFooter: {
    gap: 16,
  },
  onboardingPrimaryBtn: {
    backgroundColor: '#EDF6F2',
    borderRadius: 999,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#A9DED0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  onboardingPrimaryBtnText: {
    color: '#163238',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  onboardingSkipBtn: {
    marginTop: 16,
    alignItems: 'center',
  },
  onboardingSkipText: {
    color: 'rgba(234,245,241,0.34)',
    fontSize: 13,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.28)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  sheetCancel: {
    fontSize: 14,
    color: C.soft,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.ink,
  },
  sheetConfirm: {
    fontSize: 14,
    fontWeight: '700',
    color: C.ink,
  },
  sheetColumns: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 14,
  },
  sheetColumn: {
    flex: 1,
  },
  sheetColumnTitle: {
    fontSize: 11,
    color: C.soft,
    marginBottom: 8,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sheetOptions: {
    maxHeight: 280,
  },
  sheetOption: {
    minHeight: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    backgroundColor: 'rgba(118,118,128,0.08)',
  },
  sheetOptionActive: {
    backgroundColor: C.ink,
  },
  sheetOptionLabel: {
    fontSize: 14,
    color: C.ink,
  },
  sheetOptionLabelActive: {
    color: '#FFF',
    fontWeight: '700',
  },
});




