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
import { trackPwaEvent } from '../utils/pwaWeb';

const C = {
  bg: '#F2F2F7',
  card: '#FFFFFF',
  ink: '#1C1C1E',
  inkInv: '#FFFFFF',
  soft: 'rgba(28,28,30,0.72)',
  faint: 'rgba(60,60,67,0.46)',
  line: 'rgba(60,60,67,0.12)',
  gold: '#C6922A',
  dark: '#0A0A0C',
  success: '#34C759',
  rose: '#E85D3F',
  blue: '#3D6DCC',
};

const PLAN_OPTIONS = [
  {
    key: 'annual',
    title: '年度会员',
    subtitle: '适合想把关系、事业、情绪与金钱问题持续看清的人。',
    price: '¥168 / 年',
    badge: '更划算',
    cta: '立即锁定年度席位',
  },
  {
    key: 'monthly',
    title: '月度会员',
    subtitle: '适合先体验一个月，确认自己愿不愿意长期聊下去。',
    price: '¥28 / 月',
    badge: '低门槛',
    cta: '立即开始月度体验',
  },
];

const VALUE_CARDS = [
  {
    tone: C.gold,
    title: '记得你上次聊到哪',
    body: '不是每次重开一篇，而是继续接住你正在卡住的那件事。',
  },
  {
    tone: C.blue,
    title: '每次都给下一步',
    body: '不是只说好坏，而是更聚焦现在先做什么、先别做什么。',
  },
  {
    tone: C.success,
    title: '阶段提醒会持续跟着走',
    body: '当你的关系、事业和情绪进入新阶段，它会提醒你怎么拿节奏。',
  },
  {
    tone: C.rose,
    title: '复杂问题可以反复深聊',
    body: '同一个问题可以顺着聊下去，不用每次重新解释前情。',
  },
];

const POPULAR_SCENARIOS = [
  '这段关系该继续，还是该先停下来？',
  '这步大运是在扶我，还是在压我？',
  '我最近为什么一直累、烦、停不下来？',
  '现在该扩，还是该收？',
];

const FAQS = [
  {
    q: '会员和免费版差在哪？',
    a: '免费版适合先试一次。会员版更强调连续记忆、阶段提醒、专题深聊和长期回看。',
  },
  {
    q: '现在就会直接扣费吗？',
    a: '这一步先提交开通意向和联系方式。你后续可以直接接支付，也可以先人工确认后再收款。',
  },
  {
    q: '为什么先做这个流程？',
    a: '因为现在最重要的是先验证真实付费意愿，看看用户更愿意买哪档、为什么愿意买。',
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
  return planKey === 'annual' ? '立即锁定年度席位' : '立即开始月度体验';
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
    const payload = {
      registration,
      selectedPlan,
      source: Platform.OS === 'web' ? 'web_paywall' : 'app_paywall',
    };

    onSaveRegistration?.(payload);
    trackPwaEvent('paywall_lead_submit', {
      plan: selectedPlan,
      hasEmail: Boolean(String(registration.email || '').trim()),
      hasPhone: Boolean(String(registration.phone || '').trim()),
      source: payload.source,
    });

    Alert.alert(
      '已提交开通意向',
      '你的方案偏好和联系方式已经记录。下一步可以直接接支付，也可以先做人工确认与转化跟进。'
    );
    onClose?.();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.root}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 196 }}>
          <View style={[s.hero, { paddingTop: insets.top + 16 }]}>
            <TouchableOpacity onPress={onClose} style={s.closeBtn} activeOpacity={0.85}>
              <Text style={s.closeLabel}>{'×'}</Text>
            </TouchableOpacity>

            <Text style={s.heroEyebrow}>{'会员中心'}</Text>
            <Text style={s.heroTitle}>{'把一次聊天，变成持续看清自己的人生工具'}</Text>
            <Text style={s.heroSubtitle}>
              明己不是只给你一份报告，而是想陪你把关系、事业、情绪和金钱这些最难想清楚的事，持续看得更明白。
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
              <View style={s.heroFlowCard}>
                <Text style={s.heroFlowTitle}>{'开通流程很简单'}</Text>
                <Text style={s.heroFlowBody}>
                  {'先留下开通意向和联系方式，再进入支付或人工确认。先把愿意付费的人收住，再继续优化支付体验。'}
                </Text>
              </View>
              <TouchableOpacity onPress={handleSubmit} style={s.heroButton} activeOpacity={0.9}>
                <Text style={s.heroButtonText}>{activePlan.cta}</Text>
              </TouchableOpacity>
              <Text style={s.heroFootnote}>
                {'这一步先验证真实付费意愿，再看年度和月度哪档更容易转化。跑出第一批愿意付费的人，比先把支付页面做满更重要。'}
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
            <Text style={s.sectionTitle}>{'最容易成交的场景'}</Text>
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
                    <View style={s.badge}>
                      <Text style={s.badgeText}>{plan.badge}</Text>
                    </View>
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
            <Text style={s.sectionTitle}>{'提交开通意向'}</Text>
            <Text style={s.formHint}>
              {'这一步不是普通保存，而是正式提交开通意向。你后续可以直接接支付，也可以先根据这些线索做人工转化。'}
            </Text>

            <View style={s.formField}>
              <Text style={s.formLabel}>{'称呼'}</Text>
              <TextInput
                value={registration.nickname}
                onChangeText={(value) => updateRegistration('nickname', value)}
                placeholder={'例如：小婉'}
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
              <Text style={s.formLabel}>{'你现在最想处理什么'}</Text>
              <TextInput
                value={registration.focus}
                onChangeText={(value) => updateRegistration('focus', value)}
                placeholder={'例如：关系、事业、情绪、金钱'}
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
            <Text style={s.bottomTitle}>{'先拿到第一批真实付费意向'}</Text>
            <Text style={s.bottomBody}>
              {'先把愿意付费的人收进来，再决定是接 Stripe、微信支付，还是继续打磨支付链路。'}
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
  heroFlowCard: {
    marginTop: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  heroFlowTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F4F8F6',
  },
  heroFlowBody: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.7)',
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
    borderColor: 'rgba(198,146,42,0.65)',
    backgroundColor: 'rgba(198,146,42,0.08)',
  },
  planMain: {
    flex: 1,
    paddingRight: 10,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planTitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '800',
    color: C.ink,
  },
  badge: {
    borderRadius: 999,
    backgroundColor: C.gold,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  planSubtitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: C.soft,
  },
  planPrice: {
    fontSize: 18,
    lineHeight: 24,
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
  },
  faqA: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
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
    lineHeight: 18,
    fontWeight: '700',
    color: C.ink,
  },
  input: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    lineHeight: 20,
    color: C.ink,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  bottomCopy: {
    flex: 1,
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
    minWidth: 158,
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomButtonText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
