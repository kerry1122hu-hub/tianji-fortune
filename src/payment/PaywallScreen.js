import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
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
  faint: 'rgba(60,60,67,0.45)',
  line: 'rgba(60,60,67,0.12)',
  gold: '#C6922A',
  goldBg: 'rgba(198,146,42,0.10)',
  dark: '#0A0A0C',
  green: '#34C759',
  red: '#E85D3F',
  blue: '#3D6DCC',
};

const PLAN_PREVIEWS = [
  {
    key: 'annual',
    title: '年度会员',
    subtitle: '比包月更划算，全年持续更新',
    price: '¥168 / 年',
    badge: '限时开放',
  },
  {
    key: 'monthly',
    title: '月度会员',
    subtitle: '先看完整报告，再决定是否长期使用',
    price: '¥28 / 月',
    badge: null,
  },
];

const BENEFIT_CARDS = [
  {
    tone: C.gold,
    title: '命盘深度解读',
    body: '不只知道自己是什么命，更能看懂十神、神煞、喜用神在现实里的作用。',
  },
  {
    tone: C.blue,
    title: '每月运势提醒',
    body: '提前知道本月哪里顺、哪里要稳，减少临场判断时的犹豫和误判。',
  },
  {
    tone: C.green,
    title: '事业财富策略',
    body: '看清适合稳扎稳打还是主动突破，帮助你判断机会、节奏和风险。',
  },
  {
    tone: C.red,
    title: '感情关系指导',
    body: '把关系模式、沟通雷区和相处节奏讲清楚，让亲密关系更可被理解。',
  },
];

const HOT_PREVIEWS = [
  '今年事业机会在哪几个月出现',
  '你的财运适合稳扎稳打还是项目爆发',
  '今年感情中最该避开的关系模式',
  '哪些月份更适合做重要决定',
];

const UPDATE_MECHANISMS = [
  '每月更新运势与关键提醒',
  '每周给出更贴近日常的行动建议',
  '特定时间节点会出现阶段提示',
  '长期档案可以持续回看与校准',
];

const FAQS = [
  {
    q: '会员和普通版差别是什么',
    a: '普通版更适合先认识自己，会员版会提供更完整的档案、专题内容和持续更新提醒。',
  },
  {
    q: '内容多久更新一次',
    a: '会员内容按月更新运势，也会补充阶段变化和关键节点提醒。',
  },
  {
    q: '是否适合新手',
    a: '适合。页面会把专业命理语言翻译成更容易理解的现实建议。',
  },
  {
    q: '是否支持多次查看',
    a: '支持。已经保存的档案和登记信息都可以反复回看。',
  },
  {
    q: '是否有年度深度版',
    a: '有。当前页面已经预留年度会员方案，后续正式接入支付后可直接开放。',
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

export function PaywallScreen({ visible, onClose, onSaveRegistration, profile, registrationDraft }) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState('annual');
  const [registration, setRegistration] = useState(() =>
    buildInitialRegistration(profile, registrationDraft)
  );

  useEffect(() => {
    if (visible) {
      setRegistration(buildInitialRegistration(profile, registrationDraft));
    }
  }, [profile, registrationDraft, visible]);

  const updateRegistration = (key, value) => {
    setRegistration((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSave = () => {
    onSaveRegistration?.({
      registration,
      selectedPlan: selected,
    });
    Alert.alert('保存成功', '会员登记信息已保存到本机，后续可继续修改。');
    onClose?.();
  };

  const selectedPlan = PLAN_PREVIEWS.find((item) => item.key === selected) || PLAN_PREVIEWS[0];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.root}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 182 }}>
          <View style={[s.hero, { paddingTop: insets.top + 16 }]}>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Text style={s.closeLabel}>×</Text>
            </TouchableOpacity>

            <Text style={s.heroEyebrow}>会员中心</Text>
            <Text style={s.heroTitle}>开通会员，解锁更完整的人生节奏与行动建议</Text>
            <Text style={s.heroSubtitle}>
              不只看命盘，更告诉你什么时候该出手、什么时候该稳住。当前先展示页面结构并保存会员登记信息。
            </Text>

            <View style={s.heroTagRow}>
              <View style={s.heroTag}>
                <Text style={s.heroTagText}>限时权益标签</Text>
              </View>
              <View style={s.heroTag}>
                <Text style={s.heroTagText}>当前版本已开放年度重点分析</Text>
              </View>
            </View>

            <View style={s.priceCard}>
              <View style={s.priceCardTop}>
                <Text style={s.priceLabel}>会员价格区</Text>
                <Text style={s.priceBadge}>年卡更划算</Text>
              </View>
              <Text style={s.priceTitle}>{selectedPlan.price}</Text>
              <Text style={s.priceBody}>
                {selected === 'annual'
                  ? '未来 12 个月的重要变化，提前掌握。'
                  : '适合先体验完整命盘解读与现实建议。'}
              </Text>
              <TouchableOpacity onPress={handleSave} style={s.heroButton} activeOpacity={0.9}>
                <Text style={s.heroButtonText}>立即开通按钮</Text>
              </TouchableOpacity>
              <Text style={s.heroFootnote}>当前按钮先保存会员登记信息，支付接口会在正式上线后接入。</Text>
            </View>
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>你将获得什么</Text>
            <View style={s.cardGrid}>
              {BENEFIT_CARDS.map((item) => (
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
            <Text style={s.sectionTitle}>热门会员内容预览</Text>
            {HOT_PREVIEWS.map((item, index) => (
              <View key={item} style={s.previewRow}>
                <Text style={s.previewIndex}>{`0${index + 1}`}</Text>
                <Text style={s.previewText}>{item}</Text>
              </View>
            ))}
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>会员专属更新机制</Text>
            {UPDATE_MECHANISMS.map((item) => (
              <View key={item} style={s.updateRow}>
                <View style={s.updateDot} />
                <Text style={s.updateText}>{item}</Text>
              </View>
            ))}
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>会员方案预览</Text>
            {PLAN_PREVIEWS.map((plan) => (
              <TouchableOpacity
                key={plan.key}
                activeOpacity={0.9}
                onPress={() => setSelected(plan.key)}
                style={[s.planCard, selected === plan.key && s.planCardSelected]}
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
            <Text style={s.sectionTitle}>用户最关心的问题</Text>
            {FAQS.map((item) => (
              <View key={item.q} style={s.faqCard}>
                <Text style={s.faqQ}>{item.q}</Text>
                <Text style={s.faqA}>{item.a}</Text>
              </View>
            ))}
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>会员登记信息</Text>
            <Text style={s.formHint}>基本信息、邮箱和电话都不是必填项，保存后会记录在本机。</Text>

            <View style={s.formField}>
              <Text style={s.formLabel}>昵称</Text>
              <TextInput
                value={registration.nickname}
                onChangeText={(value) => updateRegistration('nickname', value)}
                placeholder="例如：小玫"
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
              <Text style={s.formLabel}>关注主题</Text>
              <TextInput
                value={registration.focus}
                onChangeText={(value) => updateRegistration('focus', value)}
                placeholder="例如：事业、财富、感情"
                placeholderTextColor={C.faint}
                style={s.input}
              />
            </View>

            <View style={s.formField}>
              <Text style={s.formLabel}>邮箱</Text>
              <TextInput
                value={registration.email}
                onChangeText={(value) => updateRegistration('email', value)}
                placeholder="选填"
                placeholderTextColor={C.faint}
                style={s.input}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={s.formField}>
              <Text style={s.formLabel}>电话</Text>
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
            <Text style={s.bottomTitle}>今日开通可立即解锁全部深度报告</Text>
            <Text style={s.bottomBody}>立即查看你的事业、财富与关系关键提示</Text>
          </View>
          <TouchableOpacity onPress={handleSave} style={s.bottomButton} activeOpacity={0.9}>
            <Text style={s.bottomButtonText}>保存会员登记信息</Text>
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
  updateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    backgroundColor: C.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  updateDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: C.gold,
  },
  updateText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: C.ink,
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
