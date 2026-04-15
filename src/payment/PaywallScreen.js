import React, { useEffect, useMemo, useState } from 'react';
import Constants from 'expo-constants';
import {
  Alert,
  Image,
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
};

const PLAN_OPTIONS = [
  { key: 'annual', title: '年度会员', priceLabel: '￥168 / 年', amountText: '168', badge: '更划算' },
  { key: 'monthly', title: '月度会员', priceLabel: '￥28 / 月', amountText: '28', badge: '低门槛' },
];

const PAYMENT_METHODS = [
  { key: 'wechat', title: '微信公司收款码', hint: '更适合微信内和安卓用户' },
  { key: 'alipay', title: '支付宝公司收款码', hint: '更适合手机浏览器和支付宝用户' },
];

const BENEFIT_GROUPS = [
  {
    key: 'fortune',
    title: '运势类',
    subtitle: '先看当下，再看接下来怎么走',
    items: ['近期走势提醒', '阶段重点提示', '关键时机参考'],
  },
  {
    key: 'wealth',
    title: '事业财富类',
    subtitle: '更适合想理清主线和节奏的人',
    items: ['事业推进方向', '财富机会判断', '风险与消耗提醒', '阶段资源配置建议', '重点问题连续追问'],
  },
  {
    key: 'relationship',
    title: '关系类',
    subtitle: '看关系状态，也看该怎么应对',
    items: ['关系现状梳理', '互动节奏判断', '边界与取舍提醒'],
  },
  {
    key: 'decision',
    title: '决策类',
    subtitle: '把纠结的问题收成下一步动作',
    items: ['当前主线判断', '继续还是收缩', '先做哪一步更合适'],
  },
  {
    key: 'planning',
    title: '长期规划类',
    subtitle: '适合长期使用，持续回看',
    items: ['阶段目标整理', '长期方向校准', '持续跟进与回看'],
  },
];

const EXTRA = Constants.expoConfig?.extra || Constants.manifest2?.extra || Constants.manifest?.extra || {};
const WEB_QR_FALLBACKS = {
  wechat: '/wechat-collection-qr.jpg',
  alipay: '/alipay-collection-qr.jpg',
};

function buildInitialRegistration(profile, registrationDraft) {
  return {
    nickname: registrationDraft?.nickname || profile?.nickname || '',
    city: registrationDraft?.city || profile?.city || '',
    focus: registrationDraft?.focus || profile?.focus || '',
    email: registrationDraft?.email || '',
    phone: registrationDraft?.phone || '',
  };
}

function getQrSource(paymentMethod) {
  const maybeUrl =
    paymentMethod === 'wechat'
      ? EXTRA.wechatCollectionQrUrl || EXTRA.wechatPayQrUrl || ''
      : EXTRA.alipayCollectionQrUrl || EXTRA.alipayPayQrUrl || '';
  const resolved = `${maybeUrl || ''}`.trim();
  if (resolved) return resolved;
  if (Platform.OS === 'web') return WEB_QR_FALLBACKS[paymentMethod] || '';
  return '';
}

function pickScreenshotFile() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return Promise.reject(new Error('当前环境暂不支持上传截图，请先用 Web 或 PWA 版完成付款审核。'));
  }

  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file) {
        reject(new Error('你还没有选择付款截图。'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          name: file.name,
          dataUrl: `${reader.result || ''}`,
        });
      };
      reader.onerror = () => reject(new Error('读取付款截图失败，请重新选择。'));
      reader.readAsDataURL(file);
    };
    input.click();
  });
}

function getQrFallbackHint(paymentMethod) {
  if (paymentMethod === 'wechat') {
    return '优先读取 extra.wechatCollectionQrUrl；如果没有配置，Web 版会自动尝试 /wechat-collection-qr.jpg。';
  }
  return '优先读取 extra.alipayCollectionQrUrl；如果没有配置，Web 版会自动尝试 /alipay-collection-qr.jpg。';
}

function MembershipSummaryCard() {
  const [expandedKeys, setExpandedKeys] = useState([]);

  const toggleGroup = (groupKey) => {
    setExpandedKeys((current) =>
      current.includes(groupKey) ? current.filter((item) => item !== groupKey) : [...current, groupKey]
    );
  };

  const handleContactSubmit = async () => {
    if (!`${contactMessage || ''}`.trim()) {
      Alert.alert('请先输入内容', '把你想咨询的问题写下来，再提交给明己。');
      return;
    }

    const saved = await onSubmitContact?.({
      registration,
      topic: contactTopic,
      message: contactMessage,
      source: Platform.OS === 'web' ? 'web_member_contact' : 'app_member_contact',
    });
    if (saved === false) return;

    trackPwaEvent('contact_mingji_submit', {
      hasTopic: Boolean(String(contactTopic || '').trim()),
      hasEmail: Boolean(String(registration.email || '').trim()),
      hasPhone: Boolean(String(registration.phone || '').trim()),
    });

    setContactTopic('');
    setContactMessage('');
    Alert.alert('已提交', '你的问题已经送到后台，我们会看到并跟进。');
  };

  return (
    <View style={s.summaryCard}>
      <Text style={s.summaryTitle}>会员权益</Text>
      <Text style={s.summaryBody}>
        这版会员以明己 AI 先生无限使用为主，更适合连续追问、长期陪伴和反复回看。新用户填写资料后，可先领取 30 天会员体验，再决定是否继续开通。
      </Text>
      <View style={s.summaryList}>
        <Text style={s.summaryItem}>• 新用户填写资料可先领 30 天会员体验</Text>
        <Text style={s.summaryItem}>• 明己 AI 先生无限使用</Text>
        <Text style={s.summaryItem}>• 重要问题可以连续追问</Text>
        <Text style={s.summaryItem}>• 详细会员内容开通后持续解锁</Text>
      </View>

      <View style={s.benefitGroups}>
        {BENEFIT_GROUPS.map((group) => {
          const expanded = expandedKeys.includes(group.key);
          return (
            <View key={group.key} style={s.benefitGroupCard}>
              <TouchableOpacity style={s.benefitGroupHeader} onPress={() => toggleGroup(group.key)} activeOpacity={0.9}>
                <View style={s.benefitGroupTextWrap}>
                  <Text style={s.benefitGroupTitle}>{group.title}</Text>
                  <Text style={s.benefitGroupSubtitle}>{group.subtitle}</Text>
                </View>
                <Text style={s.benefitGroupAction}>{expanded ? '收起' : '展开'}</Text>
              </TouchableOpacity>
              {expanded ? (
                <View style={s.benefitGroupItems}>
                  {group.items.map((item) => (
                    <Text key={item} style={s.benefitGroupItem}>
                      • {item}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      <Text style={s.summaryHint}>未开通前仅展示简要说明，详细内容和使用入口会在开通后解锁。</Text>
    </View>
  );
}

export function PaywallScreen({ visible, onClose, onSaveRegistration, onSubmitContact, profile, registrationDraft }) {
  const insets = useSafeAreaInsets();
  const [selectedPlan, setSelectedPlan] = useState('annual');
  const [paymentMethod, setPaymentMethod] = useState('wechat');
  const [showPaymentStep, setShowPaymentStep] = useState(false);
  const [registration, setRegistration] = useState(() => buildInitialRegistration(profile, registrationDraft));
  const [amountText, setAmountText] = useState('168');
  const [paidAtText, setPaidAtText] = useState('');
  const [notes, setNotes] = useState('');
  const [screenshotName, setScreenshotName] = useState('');
  const [screenshotDataUrl, setScreenshotDataUrl] = useState('');
  const [contactTopic, setContactTopic] = useState('');
  const [contactMessage, setContactMessage] = useState('');

  useEffect(() => {
    if (visible) {
      setShowPaymentStep(false);
      setRegistration(buildInitialRegistration(profile, registrationDraft));
      const defaultPlan = PLAN_OPTIONS.find((item) => item.key === selectedPlan) || PLAN_OPTIONS[0];
      setAmountText(defaultPlan.amountText);
      setPaidAtText('');
      setNotes('');
      setScreenshotName('');
      setScreenshotDataUrl('');
      setContactTopic('');
      setContactMessage('');
    }
  }, [profile, registrationDraft, selectedPlan, visible]);

  const activePlan = useMemo(
    () => PLAN_OPTIONS.find((item) => item.key === selectedPlan) || PLAN_OPTIONS[0],
    [selectedPlan]
  );
  const qrSource = useMemo(() => getQrSource(paymentMethod), [paymentMethod]);

  const handleContactSubmit = async () => {
    if (!`${contactMessage || ''}`.trim()) {
      Alert.alert('请先输入内容', '把你想咨询的问题写下来，再提交给明己。');
      return;
    }

    const saved = await onSubmitContact?.({
      registration,
      topic: contactTopic,
      message: contactMessage,
      source: Platform.OS === 'web' ? 'web_member_contact' : 'app_member_contact',
    });
    if (saved === false) return;

    trackPwaEvent('contact_mingji_submit', {
      hasTopic: Boolean(String(contactTopic || '').trim()),
      hasEmail: Boolean(String(registration.email || '').trim()),
      hasPhone: Boolean(String(registration.phone || '').trim()),
    });

    setContactTopic('');
    setContactMessage('');
    Alert.alert('已提交', '你的问题已经送到后台，我们会看到并跟进。');
  };

  const updateRegistration = (key, value) => {
    setRegistration((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handlePlanChange = (planKey) => {
    setSelectedPlan(planKey);
    const plan = PLAN_OPTIONS.find((item) => item.key === planKey) || PLAN_OPTIONS[0];
    setAmountText(plan.amountText);
  };

  const handleUploadProof = async () => {
    try {
      const file = await pickScreenshotFile();
      setScreenshotName(file.name);
      setScreenshotDataUrl(file.dataUrl);
      trackPwaEvent('manual_payment_screenshot_selected', {
        plan: selectedPlan,
        paymentMethod,
      });
    } catch (error) {
      Alert.alert('上传失败', error?.message || '暂时无法读取付款截图。');
    }
  };

  const handleSubmit = async () => {
    if (!screenshotDataUrl) {
      if (!`${registration.nickname || ''}`.trim()) {
        Alert.alert('先写一个称呼', '填写你的称呼后，我才能帮你开出 30 天会员体验。');
        return;
      }

      if (!`${registration.email || ''}`.trim() && !`${registration.phone || ''}`.trim()) {
        Alert.alert('补一个联系方式', '邮箱或手机号填写任意一项，就能领取 30 天会员体验。');
        return;
      }

      const saved = await onSaveRegistration?.({
        registration,
        selectedPlan: selectedPlan || 'trial',
        source: 'registration_trial',
      });
      if (saved === false || saved?.ok === false) return;

      const membership = saved?.membership || null;
      if (membership?.granted === false) {
        if (membership?.isPremium) {
          Alert.alert('你已经是会员', '当前账号已经在会员期内，可以直接去使用会员功能。');
        } else {
          Alert.alert('这次没有重复发放', '这个账号之前已经领过注册体验了，可以继续看会员方案决定是否开通。');
        }
        return;
      }

      Alert.alert('已领取 30 天会员', '从现在起，你可以先按会员权限使用一个月，喜欢再继续开通。');
      onClose?.();
      return;
    }

    const payload = {
      registration,
      selectedPlan,
      paymentMethod,
      amountText,
      paidAtText,
      screenshotName,
      screenshotDataUrl,
      notes,
      source: Platform.OS === 'web' ? 'web_manual_payment' : 'app_manual_payment',
    };

    const saved = await onSaveRegistration?.(payload);
    if (saved === false) return;

    trackPwaEvent('manual_payment_review_submit', {
      plan: selectedPlan,
      paymentMethod,
      hasEmail: Boolean(String(registration.email || '').trim()),
      hasPhone: Boolean(String(registration.phone || '').trim()),
    });

    Alert.alert('已提交审核', '付款截图和联系方式已经提交，后台确认到账后会为你开通会员。');
    onClose?.();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.root}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 196 }}>
          <View style={[s.hero, { paddingTop: insets.top + 16 }]}>
            <TouchableOpacity onPress={onClose} style={s.closeBtn} activeOpacity={0.85}>
              <Text style={s.closeLabel}>×</Text>
            </TouchableOpacity>

            <Text style={s.heroEyebrow}>会员权益</Text>
            <Text style={s.heroTitle}>先看权益，再决定怎么用</Text>
            <Text style={s.heroSubtitle}>
              新用户填写资料后，可先领取 30 天会员体验。想直接付费开通，也可以继续进入付款页。
            </Text>
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>会员方案</Text>
            {PLAN_OPTIONS.map((plan) => (
              <TouchableOpacity
                key={plan.key}
                style={[s.planCard, selectedPlan === plan.key && s.planCardSelected]}
                onPress={() => handlePlanChange(plan.key)}
                activeOpacity={0.9}
              >
                <View style={s.planMain}>
                  <View style={s.planHeader}>
                    <Text style={s.planTitle}>{plan.title}</Text>
                    <View style={s.badge}>
                      <Text style={s.badgeText}>{plan.badge}</Text>
                    </View>
                  </View>
                  <Text style={s.planSubtitle}>先按这一档收款，后台确认后人工开通。</Text>
                </View>
                <Text style={s.planPrice}>{plan.priceLabel}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {!showPaymentStep ? (
            <View style={s.section}>
              <Text style={s.sectionTitle}>会员内容</Text>
              <MembershipSummaryCard />
            </View>
          ) : (
            <>
              <View style={s.section}>
                <Text style={s.sectionTitle}>付款方式</Text>
                {PAYMENT_METHODS.map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={[s.planCard, paymentMethod === item.key && s.planCardSelected]}
                    onPress={() => setPaymentMethod(item.key)}
                    activeOpacity={0.9}
                  >
                    <View style={s.planMain}>
                      <Text style={s.planTitle}>{item.title}</Text>
                      <Text style={s.planSubtitle}>{item.hint}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={s.section}>
                <Text style={s.sectionTitle}>扫码付款</Text>
                <View style={s.qrCard}>
                  {qrSource ? (
                    <Image source={{ uri: qrSource }} style={s.qrImage} resizeMode="contain" />
                  ) : (
                    <View style={s.qrPlaceholder}>
                      <Text style={s.qrPlaceholderTitle}>此处显示公司收款码</Text>
                      <Text style={s.qrPlaceholderBody}>{getQrFallbackHint(paymentMethod)}</Text>
                    </View>
                  )}
                  <View style={s.qrMeta}>
                    <Text style={s.qrMetaTitle}>{paymentMethod === 'wechat' ? '微信公司收款码' : '支付宝公司收款码'}</Text>
                    <Text style={s.qrMetaBody}>建议付款金额：￥{activePlan.amountText}</Text>
                  </View>
                </View>
              </View>

              <View style={s.section}>
                <Text style={s.sectionTitle}>上传付款凭证</Text>
                <TouchableOpacity style={s.uploadButton} onPress={handleUploadProof} activeOpacity={0.9}>
                  <Text style={s.uploadButtonText}>{screenshotName ? '重新选择付款截图' : '上传付款截图'}</Text>
                </TouchableOpacity>
                {screenshotDataUrl ? (
                  <View style={s.proofPreview}>
                    <Image source={{ uri: screenshotDataUrl }} style={s.proofImage} resizeMode="cover" />
                    <Text style={s.proofName}>{screenshotName || '已上传付款截图'}</Text>
                  </View>
                ) : null}
              </View>

              <View style={s.section}>
                <Text style={s.sectionTitle}>提交审核信息</Text>

                <View style={s.formField}>
                  <Text style={s.formLabel}>称呼</Text>
                  <TextInput
                    value={registration.nickname}
                    onChangeText={(value) => updateRegistration('nickname', value)}
                    placeholder="例如：小明"
                    placeholderTextColor={C.faint}
                    style={s.input}
                  />
                </View>

                <View style={s.formField}>
                  <Text style={s.formLabel}>邮箱</Text>
                  <TextInput
                    value={registration.email}
                    onChangeText={(value) => updateRegistration('email', value)}
                    placeholder="用于支付核对和开通通知"
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
                    placeholder="便于人工确认"
                    placeholderTextColor={C.faint}
                    style={s.input}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={s.formField}>
                  <Text style={s.formLabel}>付款金额</Text>
                  <TextInput
                    value={amountText}
                    onChangeText={setAmountText}
                    placeholder="例如：168"
                    placeholderTextColor={C.faint}
                    style={s.input}
                    keyboardType="numeric"
                  />
                </View>

                <View style={s.formField}>
                  <Text style={s.formLabel}>付款时间</Text>
                  <TextInput
                    value={paidAtText}
                    onChangeText={setPaidAtText}
                    placeholder="例如：2026-03-31 14:25"
                    placeholderTextColor={C.faint}
                    style={s.input}
                  />
                </View>

                <View style={s.formField}>
                  <Text style={s.formLabel}>备注</Text>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="例如：付款尾号、昵称、特殊说明"
                    placeholderTextColor={C.faint}
                    style={[s.input, s.textarea]}
                    multiline
                  />
                </View>
              </View>
            </>
          )}

          <View style={s.section}>
            <Text style={s.sectionTitle}>联系明己</Text>
            <View style={s.summaryCard}>
              <Text style={s.summaryTitle}>有问题，直接留言给明己</Text>
              <Text style={s.summaryBody}>
                注册、充值、开通会员，或者想补充说明自己的情况，都可以在这里直接留言，后台会看到。
              </Text>

              <View style={s.formField}>
                <Text style={s.formLabel}>主题</Text>
                <TextInput
                  value={contactTopic}
                  onChangeText={setContactTopic}
                  placeholder="例如：会员开通、付款问题、想补充命盘情况"
                  placeholderTextColor={C.faint}
                  style={s.input}
                />
              </View>

              <View style={s.formField}>
                <Text style={s.formLabel}>想说的话</Text>
                <TextInput
                  value={contactMessage}
                  onChangeText={setContactMessage}
                  placeholder="把你的问题写给明己，我们会在后台查看。"
                  placeholderTextColor={C.faint}
                  style={[s.input, s.textarea]}
                  multiline
                />
              </View>

              <TouchableOpacity style={s.uploadButton} onPress={handleContactSubmit} activeOpacity={0.9}>
                <Text style={s.uploadButtonText}>提交给明己</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        <View style={[s.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
          <View style={s.bottomCopy}>
            <Text style={s.bottomTitle}>
              {showPaymentStep ? '提交后会进入待审核付款名单。' : '先确认方案，再进入扫码付款页。'}
            </Text>
              <Text style={s.bottomBody}>
                {showPaymentStep
                ? (screenshotDataUrl
                  ? '后台确认截图和到账后，可以一键为你开通会员。'
                  : '不上传付款截图也可以，先填写资料即可领取 30 天会员体验。')
                : '先填写资料可直接领取 30 天会员体验，也可以继续进入付款开通页。'}
              </Text>
            </View>
          {showPaymentStep ? (
            <View style={s.bottomActions}>
              <TouchableOpacity onPress={() => setShowPaymentStep(false)} style={s.bottomGhostButton} activeOpacity={0.9}>
                <Text style={s.bottomGhostButtonText}>返回权益页</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSubmit} style={s.bottomButton} activeOpacity={0.9}>
                <Text style={s.bottomButtonText}>{screenshotDataUrl ? '提交付款审核' : '填写资料，领取30天会员'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setShowPaymentStep(true)} style={s.bottomButton} activeOpacity={0.9}>
              <Text style={s.bottomButtonText}>填写资料，领取30天会员</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  hero: { paddingHorizontal: 22, paddingBottom: 24, backgroundColor: C.dark },
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
  closeLabel: { fontSize: 20, lineHeight: 20, color: C.inkInv },
  heroEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: C.gold, textTransform: 'uppercase' },
  heroTitle: { marginTop: 8, fontSize: 28, lineHeight: 34, fontWeight: '800', color: C.inkInv },
  heroSubtitle: { marginTop: 10, fontSize: 14, lineHeight: 22, color: 'rgba(255,255,255,0.72)' },
  section: { paddingHorizontal: 16, paddingTop: 18 },
  sectionTitle: {
    marginBottom: 12,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: C.faint,
    textTransform: 'uppercase',
  },
  summaryCard: {
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    padding: 18,
  },
  summaryTitle: { fontSize: 18, lineHeight: 24, fontWeight: '800', color: C.ink },
  summaryBody: { marginTop: 8, fontSize: 14, lineHeight: 22, color: C.soft },
  summaryList: { marginTop: 12, gap: 6 },
  summaryItem: { fontSize: 14, lineHeight: 20, color: C.ink },
  benefitGroups: { marginTop: 16, gap: 10 },
  benefitGroupCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: '#FCFCFD',
    overflow: 'hidden',
  },
  benefitGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  benefitGroupTextWrap: { flex: 1 },
  benefitGroupTitle: { fontSize: 15, lineHeight: 21, fontWeight: '800', color: C.ink },
  benefitGroupSubtitle: { marginTop: 4, fontSize: 12, lineHeight: 18, color: C.soft },
  benefitGroupAction: { fontSize: 12, fontWeight: '700', color: C.gold },
  benefitGroupItems: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: C.line,
    gap: 6,
  },
  benefitGroupItem: { fontSize: 13, lineHeight: 19, color: C.ink, marginTop: 10 },
  summaryHint: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.line,
    fontSize: 12,
    lineHeight: 18,
    color: C.faint,
  },
  planCard: {
    borderRadius: 18,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planCardSelected: {
    borderColor: 'rgba(198,146,42,0.65)',
    backgroundColor: 'rgba(198,146,42,0.08)',
  },
  planMain: { flex: 1, paddingRight: 10 },
  planHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planTitle: { fontSize: 15, lineHeight: 22, fontWeight: '800', color: C.ink },
  planSubtitle: { marginTop: 8, fontSize: 13, lineHeight: 19, color: C.soft },
  planPrice: { fontSize: 18, lineHeight: 24, fontWeight: '800', color: C.ink },
  badge: { borderRadius: 999, backgroundColor: C.gold, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF' },
  qrCard: {
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    padding: 16,
    alignItems: 'center',
  },
  qrImage: { width: 220, height: 220, borderRadius: 16, backgroundColor: '#F7F7F8' },
  qrPlaceholder: {
    width: 220,
    height: 220,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    backgroundColor: '#FAFAFB',
  },
  qrPlaceholderTitle: { fontSize: 15, fontWeight: '800', color: C.ink, textAlign: 'center' },
  qrPlaceholderBody: { marginTop: 8, fontSize: 12, lineHeight: 18, color: C.soft, textAlign: 'center' },
  qrMeta: { marginTop: 12, alignItems: 'center' },
  qrMetaTitle: { fontSize: 14, fontWeight: '800', color: C.ink },
  qrMetaBody: { marginTop: 4, fontSize: 12, color: C.soft },
  uploadButton: {
    height: 48,
    borderRadius: 16,
    backgroundColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  proofPreview: {
    marginTop: 12,
    borderRadius: 18,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    padding: 12,
  },
  proofImage: { width: '100%', height: 180, borderRadius: 12, backgroundColor: '#F7F7F8' },
  proofName: { marginTop: 8, fontSize: 12, color: C.soft },
  formField: { marginBottom: 10 },
  formLabel: { marginBottom: 6, fontSize: 12, lineHeight: 18, fontWeight: '700', color: C.ink },
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
  textarea: { minHeight: 88, textAlignVertical: 'top' },
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
  bottomCopy: { flex: 1 },
  bottomTitle: { fontSize: 14, lineHeight: 20, fontWeight: '800', color: C.ink },
  bottomBody: { marginTop: 4, fontSize: 12, lineHeight: 18, color: C.soft },
  bottomActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bottomGhostButton: {
    minWidth: 108,
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomGhostButtonText: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: C.ink },
  bottomButton: {
    minWidth: 152,
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: C.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomButtonText: { fontSize: 13, lineHeight: 18, fontWeight: '800', color: '#FFFFFF' },
});
