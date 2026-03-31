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
  blue: '#3D6DCC',
  rose: '#E85D3F',
};

const PLAN_OPTIONS = [
  {
    key: 'annual',
    title: '年度会员',
    subtitle: '适合已经确认会长期使用，希望把 AI 先生真正变成日常陪伴工具的人。',
    price: '¥168 / 年',
    badge: '更划算',
    cta: '提交年度开通意向',
  },
  {
    key: 'monthly',
    title: '月度会员',
    subtitle: '适合先试一个月，看看自己是否愿意持续聊下去、持续回来的人。',
    price: '¥28 / 月',
    badge: '低门槛',
    cta: '提交月度开通意向',
  },
];

const VALUE_CARDS = [
  {
    tone: C.gold,
    title: 'AI 无限使用',
    body: '最核心的权益就是不再被次数打断。想聊就聊，重点问题可以一直往下拆，不用顾虑今天还剩几次。',
  },
  {
    tone: C.blue,
    title: '连续记忆',
    body: '它会记得你上次说到哪、卡在哪、偏好什么口气，回来不用重新解释一遍前情。',
  },
  {
    tone: C.success,
    title: '阶段回顾',
    body: '每次聊天不只是当场有用，还能沉淀成阶段提醒，让你更容易看见自己的变化和重复模式。',
  },
  {
    tone: C.rose,
    title: '优先体验',
    body: '新的陪伴能力、回顾能力和更深的对话体验，会优先开放给会员用户。',
  },
];

const POPULAR_SCENARIOS = [
  '我现在最该先处理什么？',
  '这段关系还要不要继续？',
  '最近为什么一直累、烦、停不下来？',
  '这一步到底该扩，还是该收？',
];

const FAQS = [
  {
    q: '会员最重要的权益是什么？',
    a: '最重要的就是 AI 无限使用。你不用被次数打断，复杂问题才能真正聊深、聊透、聊出结果。',
  },
  {
    q: '现在点开通会立刻扣费吗？',
    a: '这一步先提交开通意向和联系方式。后面再进入支付或人工确认，先把真正愿意付费的人收住。',
  },
  {
    q: '为什么先做留资，不一步到位支付？',
    a: '现在先验证真实付费意向和方案偏好，等名单和转化感觉对了，再把支付链路做得更完整。',
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

function getSubmitButtonText(planKey) {
  return planKey === 'annual' ? '提交年度开通意向' : '提交月度开通意向';
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

  const handleSubmit = async () => {
    const payload = {
      registration,
      selectedPlan,
      source: Platform.OS === 'web' ? 'web_paywall' : 'app_paywall',
    };

    const saved = await onSaveRegistration?.(payload);
    if (saved === false) return;

    trackPwaEvent('paywall_lead_submit', {
      plan: selectedPlan,
      hasEmail: Boolean(String(registration.email || '').trim()),
      hasPhone: Boolean(String(registration.phone || '').trim()),
      source: payload.source,
    });

    Alert.alert(
      '已提交开通意向',
      '你的方案偏好和联系方式已经记录。下一步可以进入支付，或由我们先跟进确认。'
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

            <Text style={s.heroEyebrow}>会员中心</Text>
            <Text style={s.heroTitle}>先把 AI 无限使用这件事解锁，再慢慢把自己看清。</Text>
            <Text style={s.heroSubtitle}>
              会员版不强调花哨功能，先把最值钱的一条做好：你想聊的时候随时能聊，复杂问题可以持续往下拆，不再被次数打断。
            </Text>

            <View style={s.heroTagRow}>
              <View style={s.heroTag}>
                <Text style={s.heroTagText}>AI 无限使用</Text>
              </View>
              <View style={s.heroTag}>
                <Text style={s.heroTagText}>连续记忆</Text>
              </View>
              <View style={s.heroTag}>
                <Text style={s.heroTagText}>阶段回顾</Text>
              </View>
            </View>

            <View style={s.priceCard}>
              <View style={s.priceCardTop}>
                <Text style={s.priceLabel}>当前主推方案</Text>
                <Text style={s.priceBadge}>{activePlan.badge}</Text>
              </View>
              <Text style={s.priceTitle}>{activePlan.price}</Text>
              <Text style={s.priceBody}>{activePlan.subtitle}</Text>
              <View style={s.heroFlowCard}>
                <Text style={s.heroFlowTitle}>开通路径</Text>
                <Text style={s.heroFlowBody}>
                  先提交开通意向和联系方式，再进入支付或人工确认。这样我们可以先看清，用户更愿意买哪一档。
                </Text>
              </View>
              <TouchableOpacity onPress={handleSubmit} style={s.heroButton} activeOpacity={0.9}>
                <Text style={s.heroButtonText}>{activePlan.cta}</Text>
              </TouchableOpacity>
              <Text style={s.heroFootnote}>
                现阶段先把“有人愿意付费”这件事验证出来，比一开始就做很重的支付链路更重要。
              </Text>
            </View>
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>会员权益，先讲重点</Text>
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
            <Text style={s.sectionTitle}>最容易成交的场景</Text>
            {POPULAR_SCENARIOS.map((item, index) => (
              <View key={item} style={s.previewRow}>
                <Text style={s.previewIndex}>{`0${index + 1}`}</Text>
                <Text style={s.previewText}>{item}</Text>
              </View>
            ))}
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>选择方案</Text>
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
            <Text style={s.sectionTitle}>常见问题</Text>
            {FAQS.map((item) => (
              <View key={item.q} style={s.faqCard}>
                <Text style={s.faqQ}>{item.q}</Text>
                <Text style={s.faqA}>{item.a}</Text>
              </View>
            ))}
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>提交开通意向</Text>
            <Text style={s.formHint}>
              这一步不是普通保存，而是正式留资。我们会根据方案偏好和联系方式，继续跟进支付或开通转化。
            </Text>

            <View style={s.formField}>
              <Text style={s.formLabel}>称呼</Text>
              <TextInput
                value={registration.nickname}
                onChangeText={(value) => updateRegistration('nickname', value)}
                placeholder="例如：小林"
                placeholderTextColor={C.faint}
                style={s.input}
              />
            </View>

            <View style={s.formField}>
              <Text style={s.formLabel}>城市 / 地区</Text>
              <TextInput
                value={registration.city}
                onChangeText={(value) => updateRegistration('city', value)}
                placeholder="例如：上海"
                placeholderTextColor={C.faint}
                style={s.input}
              />
            </View>

            <View style={s.formField}>
              <Text style={s.formLabel}>你现在最想处理什么？</Text>
              <TextInput
                value={registration.focus}
                onChangeText={(value) => updateRegistration('focus', value)}
                placeholder="例如：关系、事业、情绪、金钱"
                placeholderTextColor={C.faint}
                style={s.input}
              />
            </View>

            <View style={s.formField}>
              <Text style={s.formLabel}>邮箱</Text>
              <TextInput
                value={registration.email}
                onChangeText={(value) => updateRegistration('email', value)}
                placeholder="用于支付或开通通知"
                placeholderTextColor={C.faint}
                style={s.input}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={s.formField}>
              <Text style={s.formLabel}>手机号</Text>
              <TextInput
                value={registration.phone}
                onChangeText={(value) => updateRegistration('phone', value)}
                placeholder="选填"
                placeholderTextColor={C.faint}
                style={s.input}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </ScrollView>

        <View style={[s.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
          <View style={s.bottomCopy}>
            <Text style={s.bottomTitle}>先把愿意付费的人留下来。</Text>
            <Text style={s.bottomBody}>
              先验证“愿不愿意为 AI 无限使用买单”，再决定支付链路怎么做得更重。
            </Text>
          </View>
          <TouchableOpacity onPress={handleSubmit} style={s.bottomButton} activeOpacity={0.9}>
            <Text style={s.bottomButtonText}>{getSubmitButtonText(selectedPlan)}</Text>
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
