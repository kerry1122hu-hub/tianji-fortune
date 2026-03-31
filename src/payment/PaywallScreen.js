import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const C = {
  bg: '#F2F2F7',
  card: '#FFFFFF',
  ink: '#1C1C1E',
  inkInv: '#FFFFFF',
  soft: 'rgba(28,28,30,0.72)',
  faint: 'rgba(60,60,67,0.46)',
  line: 'rgba(60,60,67,0.12)',
  gold: '#C6922A',
  goldBg: 'rgba(198,146,42,0.10)',
  dark: '#0A0A0C',
  mint: '#EAF5F1',
  logoDeep: '#14333A',
  success: '#34C759',
  rose: '#E85D3F',
  blue: '#3D6DCC',
};

const PLAN_OPTIONS = [
  {
    key: 'annual',
    title: '年度会员',
    subtitle: '适合真正想把关系、事业、财富和阶段节奏持续看清的人',
    price: '¥168 / 年',
    badge: '更划算',
    cta: '锁定年度会员',
  },
  {
    key: 'monthly',
    title: '月度会员',
    subtitle: '先用一个月体验 AI 先生、阶段提醒与连续回顾',
    price: '¥28 / 月',
    badge: '轻量试用',
    cta: '先开一个月',
  },
];

const VALUE_CARDS = [
  {
    tone: C.gold,
    title: '连续对话，不再每次重来',
    body: '它会记住你最近在卡什么、上次聊到哪、给过你什么判断和动作。',
  },
  {
    tone: C.blue,
    title: '不是空报告，而是下一步建议',
    body: '每次不是只告诉你好坏，而是更聚焦“现在先做什么、先别碰什么”。',
  },
  {
    tone: C.success,
    title: '阶段变化会持续提醒',
    body: '月度提醒、阶段复盘和关键节点提示，会让它更像长期顾问，而不是一次性解读。',
  },
  {
    tone: C.rose,
    title: '关系、事业、情绪、金钱可专项深聊',
    body: '遇到反复纠结的问题，不用从头再讲，系统会顺着之前的脉络继续。',
  },
];

const POPULAR_SCENARIOS = [
  '这段关系该继续，还是该先停下来',
  '这步大运到底是在扶我，还是在压我',
  '我最近为什么一直累、烦、停不下来',
  '我现在该扩，还是该收',
];

const FAQS = [
  {
    q: '会员和免费版差在哪？',
    a: '免费版适合先聊一聊、先看清问题。会员版更强调连续记忆、阶段提醒、专项深聊和长期回顾。',
  },
  {
    q: '适合新用户吗？',
    a: '适合。它会把复杂判断翻译成更容易执行的现实建议，不会一上来就压你一堆术语。',
  },
  {
    q: '现在是正式支付吗？',
    a: '当前先整理成最小可卖版页面。你提交开通信息后，后续可直接进入支付或由我们优先通知开通。',
  },
];

function buildInitialRegistration(profile, registrationDraft) {
  return {
    nickname: registrationDraft?.nickname || profile?.nickname || '',
    city: registrationDraft?.city || profile?.city || '',
    focus: registrationDraft?.focus || profile?.focus || '',
    email: registrationDraft?.email || '',
    phone: registrationDraft?.phone || '',
  };
}

function benefitButtonCopy(planKey) {
  return planKey === 'annual' ? '锁定年度会员' : '先开一个月';
}

export function PaywallScreen({ visible, onClose, onSaveRegistration, profile, registrationDraft }) {
  const insets = useSafeAreaInsets();
  const [selectedPlan, setSelectedPlan] = useState('annual');
  const [registration, setRegistration] = useState(() => buildInitialRegistration(profile, registrationDraft));

  useEffect(() => {
    if (visible) {
      setRegistration(buildInitialRegistration(profile, registrationDraft));
    }
  }, [profile, registrationDraft, visible]);

  const activePlan = useMemo(
    () => PLAN_OPTIONS.find((item) => item.key === selectedPlan) || PLAN_OPTIONS[0],
    [selectedPlan]
  );

  const updateRegistration = (key, value) => {
    setRegistration((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSubmit = () => {
    onSaveRegistration?.({
      registration,
      selectedPlan,
      source: Platform.OS === 'web' ? 'web_paywall' : 'app_paywall',
    });

    Alert.alert(
      '已保存开通信息',
      '你的开通意向已经保存。接下来可继续完善支付链路，或先用这份资料做转化跟进。'
    );
    onClose?.();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.root}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 188 }}>
          <View style={[s.hero, { paddingTop: insets.top + 16 }]}>
            <TouchableOpacity onPress={onClose} style={s.closeBtn} activeOpacity={0.85}>
              <Text style={s.closeLabel}>{'×'}</Text>
            </TouchableOpacity>

            <Text style={s.heroEyebrow}>{'会员中心'}</Text>
            <Text style={s.heroTitle}>{'把一次聊天，变成持续看清自己的人生工具'}</Text>
            <Text style={s.heroSubtitle}>
              明己不想只做一份报告，而是想成为你在关系、事业、情绪和财富上的长期陪伴。会员版，解决的正是“下一次回来，它还记得你”。
            </Text>

            <View style={s.heroTagRow}>
              <View style={s.heroTag}>
                <Text style={s.heroTagText}>{'连续记忆'}</Text>
              </View>
              <View style={s.heroTag}>
                <Text style={s.heroTagText}>{'阶段回顾'}</Text>
              </View>
              <View style={s.heroTag}>
                <Text style={s.heroTagText}>{'专项深聊'}</Text>
              </View>
            </View>

            <View style={s.priceCard}>
              <View style={s.priceCardTop}>
                <Text style={s.priceLabel}>{'当前主推方案'}</Text>
                <Text style={s.priceBadge}>{activePlan.badge}</Text>
              </View>
              <Text style={s.priceTitle}>{activePlan.price}</Text>
              <Text style={s.priceBody}>{activePlan.subtitle}</Text>
              <TouchableOpacity onPress={handleSubmit} style={s.heroButton} activeOpacity={0.9}>
                <Text style={s.heroButtonText}>{activePlan.cta}</Text>
              </TouchableOpacity>
              <Text style={s.heroFootnote}>
                这版先用来验证转化与付费意愿。用户填写开通信息后，你可以继续接正式支付或人工跟进。
              </Text>
            </View>
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>{'为什么值得买'}</Text>
            <View style={s.cardGrid}>
              {VALUE_CARDS.map((item) => (
                <View key={item.title} style={s.benefitCard}>
                  <View style={[s.benefitPill, { backgroundColor: `${item.tone}18` }]}>
                    <Text style={[s.benefitPillText, { color: item.tone }]}>{item.title}</Text>
                  </View>
                  <Text style={s.benefitBody}>{item.body}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>{'用户最容易买单的场景'}</Text>
            {POPULAR_SCENARIOS.map((item, index) => (
              <View key={item} style={s.previewRow}>
                <Text style={s.previewIndex}>{`0${index + 1}`}</Text>
                <Text style={s.previewText}>{item}</Text>
              </View>
            ))}
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>{'选择方案'}</Text>
            {PLAN_OPTIONS.map((plan) => (
              <TouchableOpacity
                key={plan.key}
                activeOpacity={0.9}
                onPress={() => setSelectedPlan(plan.key)}
                style={[s.planCard, selectedPlan === plan.key && s.planCardSelected]}
              >
                <View style={s.planMain}>
                  <View style={s.planHeader}>
                    <Text style={s.planTitle}>{plan.title}</Text>
                    {plan.badge ? (
                      <View style={s.badge}>
                        <Text style={s.badgeText}>{plan.badge}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={s.planSubtitle}>{plan.subtitle}</Text>
                </View>
                <Text style={s.planPrice}>{plan.price}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>{'常见问题'}</Text>
            {FAQS.map((item) => (
              <View key={item.q} style={s.faqCard}>
                <Text style={s.faqQ}>{item.q}</Text>
                <Text style={s.faqA}>{item.a}</Text>
              </View>
            ))}
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>{'开通信息'}</Text>
            <Text style={s.formHint}>
              这一步先留下最基本的开通线索。你后续可以直接接支付，也可以先用这份资料验证意向用户质量。
            </Text>

            <View style={s.formField}>
              <Text style={s.formLabel}>{'称呼'}</Text>
              <TextInput
                value={registration.nickname}
                onChangeText={(value) => updateRegistration('nickname', value)}
                placeholder={'例如：小玥'}
                placeholderTextColor={C.faint}
                style={s.input}
              />
            </View>

            <View style={s.formField}>
              <Text style={s.formLabel}>{'城市 / 地区'}</Text>
              <TextInput
                value={registration.city}
                onChangeText={(value) => updateRegistration('city', value)}
                placeholder={'例如：上海'}
                placeholderTextColor={C.faint}
                style={s.input}
              />
            </View>

            <View style={s.formField}>
              <Text style={s.formLabel}>{'现在最想解决什么'}</Text>
              <TextInput
                value={registration.focus}
                onChangeText={(value) => updateRegistration('focus', value)}
                placeholder={'例如：关系、事业、情绪、财富'}
                placeholderTextColor={C.faint}
                style={s.input}
              />
            </View>

            <View style={s.formField}>
              <Text style={s.formLabel}>{'邮箱'}</Text>
              <TextInput
                value={registration.email}
                onChangeText={(value) => updateRegistration('email', value)}
                placeholder={'用于后续支付或开通通知'}
                placeholderTextColor={C.faint}
                style={s.input}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={s.formField}>
              <Text style={s.formLabel}>{'手机号'}</Text>
              <TextInput
                value={registration.phone}
                onChangeText={(value) => updateRegistration('phone', value)}
                placeholder={'选填'}
                placeholderTextColor={C.faint}
                style={s.input}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </ScrollView>

        <View style={[s.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
          <View style={s.bottomCopy}>
            <Text style={s.bottomTitle}>{'先收第一批付费意向用户'}</Text>
            <Text style={s.bottomBody}>
              先跑转化，再决定是接 Stripe、微信支付，还是继续打磨产品。
            </Text>
          </View>
          <TouchableOpacity onPress={handleSubmit} style={s.bottomButton} activeOpacity={0.9}>
            <Text style={s.bottomButtonText}>{benefitButtonCopy(selectedPlan)}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  hero: {
    paddingHorizontal: 22,
    paddingBottom: 28,
    backgroundColor: C.dark,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  closeLabel: {
    fontSize: 20,
    lineHeight: 20,
    color: C.inkInv,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: C.gold,
    textTransform: 'uppercase',
  },
  heroTitle: {
    marginTop: 8,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    color: C.inkInv,
  },
  heroSubtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.72)',
  },
  heroTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  heroTag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  priceCard: {
    marginTop: 18,
    borderRadius: 22,
    backgroundColor: '#151518',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
  },
  priceCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  priceLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.gold,
  },
  priceBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    backgroundColor: 'rgba(198,146,42,0.16)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  priceTitle: {
    marginTop: 12,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  priceBody: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.72)',
  },
  heroButton: {
    marginTop: 14,
    height: 48,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: C.ink,
  },
  heroFootnote: {
    marginTop: 10,
    fontSize: 11,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.44)',
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  sectionTitle: {
    marginBottom: 12,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: C.faint,
    textTransform: 'uppercase',
  },
  cardGrid: {
    gap: 10,
  },
  benefitCard: {
    borderRadius: 18,
    backgroundColor: C.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    padding: 14,
  },
  benefitPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  benefitPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  benefitBody: {
    fontSize: 14,
    lineHeight: 21,
    color: C.soft,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 18,
    backgroundColor: C.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    padding: 14,
    marginBottom: 10,
  },
  previewIndex: {
    width: 28,
    fontSize: 12,
    fontWeight: '800',
    color: C.gold,
  },
  previewText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: C.ink,
    fontWeight: '600',
  },
  planCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    padding: 14,
    marginBottom: 10,
  },
  planCardSelected: {
    borderColor: C.gold,
    backgroundColor: '#FBFAF5',
  },
  planMain: {
    flex: 1,
    marginRight: 12,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  planTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.ink,
  },
  badge: {
    borderRadius: 999,
    backgroundColor: C.goldBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: C.gold,
  },
  planSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: C.soft,
  },
  planPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: C.ink,
  },
  faqCard: {
    borderRadius: 18,
    backgroundColor: C.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    padding: 14,
    marginBottom: 10,
  },
  faqQ: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
    color: C.ink,
    marginBottom: 6,
  },
  faqA: {
    fontSize: 13,
    lineHeight: 20,
    color: C.soft,
  },
  formHint: {
    marginBottom: 12,
    fontSize: 12,
    lineHeight: 18,
    color: C.soft,
  },
  formField: {
    marginBottom: 10,
  },
  formLabel: {
    marginBottom: 6,
    fontSize: 12,
    fontWeight: '700',
    color: C.ink,
  },
  input: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    paddingHorizontal: 14,
    fontSize: 14,
    color: C.ink,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.line,
    backgroundColor: 'rgba(242,242,247,0.97)',
  },
  bottomCopy: {
    marginBottom: 10,
  },
  bottomTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
    color: C.ink,
  },
  bottomBody: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: C.soft,
  },
  bottomButton: {
    height: 50,
    borderRadius: 999,
    backgroundColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

export default PaywallScreen;
