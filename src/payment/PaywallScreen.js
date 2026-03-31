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
  { key: 'annual', title: '年度会员', priceLabel: '¥168 / 年', amountText: '168', badge: '更划算' },
  { key: 'monthly', title: '月度会员', priceLabel: '¥28 / 月', amountText: '28', badge: '低门槛' },
];

const PAYMENT_METHODS = [
  { key: 'wechat', title: '微信公司收款码', hint: '更适合微信内和安卓用户' },
  { key: 'alipay', title: '支付宝公司收款码', hint: '更适合手机浏览器和支付宝用户' },
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
  if (Platform.OS === 'web') {
    return WEB_QR_FALLBACKS[paymentMethod] || '';
  }
  return '';
}

function pickScreenshotFile() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return Promise.reject(new Error('当前环境暂不支持上传截图，请先用 Web/PWA 版完成付款审核。'));
  }

  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file) {
        reject(new Error('未选择付款截图'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          name: file.name,
          dataUrl: `${reader.result || ''}`,
        });
      };
      reader.onerror = () => reject(new Error('读取截图失败'));
      reader.readAsDataURL(file);
    };
    input.click();
  });
}

function getQrFallbackHint(paymentMethod) {
  if (paymentMethod === 'wechat') {
    return '优先读取 extra.wechatCollectionQrUrl；如果没配置，Web 版会自动尝试 /wechat-collection-qr.jpg。';
  }
  return '优先读取 extra.alipayCollectionQrUrl；如果没配置，Web 版会自动尝试 /alipay-collection-qr.jpg。';
}

function MembershipSummaryCard() {
  return (
    <View style={s.summaryCard}>
      <Text style={s.summaryTitle}>会员权益</Text>
      <Text style={s.summaryBody}>
        这版会员以 AI 无限使用为主，更适合连续追问、长期陪伴和反复回看。先确认方案，再进入扫码付款页。
      </Text>
      <View style={s.summaryList}>
        <Text style={s.summaryItem}>• 明己 AI 先生无限使用</Text>
        <Text style={s.summaryItem}>• 重要问题可以连续追问</Text>
        <Text style={s.summaryItem}>• 详细会员内容将在开通后解锁</Text>
      </View>
      <Text style={s.summaryHint}>当前仅展示简版权益说明，具体内容开通后查看。</Text>
    </View>
  );
}

export function PaywallScreen({ visible, onClose, onSaveRegistration, profile, registrationDraft }) {
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

  useEffect(() => {
    if (visible) {
      setShowPaymentStep(false);
      setRegistration(buildInitialRegistration(profile, registrationDraft));
      const defaultPlan = PLAN_OPTIONS.find((item) => item.key === selectedPlan) || PLAN_OPTIONS[0];
      setAmountText(defaultPlan.amountText);
    }
  }, [profile, registrationDraft, selectedPlan, visible]);

  const activePlan = useMemo(
    () => PLAN_OPTIONS.find((item) => item.key === selectedPlan) || PLAN_OPTIONS[0],
    [selectedPlan]
  );
  const qrSource = useMemo(() => getQrSource(paymentMethod), [paymentMethod]);

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
      Alert.alert('请先上传付款截图', '先把付款凭证上传，再提交审核。');
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
            <Text style={s.heroTitle}>先看权益，再开通会员</Text>
            <Text style={s.heroSubtitle}>
              先确认你要开通的方案。点击“开通会员”后，再显示微信和支付宝付款码，以及付款截图上传入口。
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
              <Text style={s.sectionTitle}>会员权益</Text>
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
                    <Text style={s.qrMetaBody}>建议付款金额：¥{activePlan.amountText}</Text>
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
                    <Text style={s.proofName}>{screenshotName || '已上传截图'}</Text>
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
        </ScrollView>

        <View style={[s.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
          <View style={s.bottomCopy}>
            <Text style={s.bottomTitle}>
              {showPaymentStep ? '提交后会进入待审核付款名单。' : '先确认方案，再进入扫码付款页。'}
            </Text>
            <Text style={s.bottomBody}>
              {showPaymentStep
                ? '后台确认截图和到账后，可以一键为你开通会员。'
                : '点击开通会员后，再显示付款码、截图上传和联系方式填写。'}
            </Text>
          </View>
          {showPaymentStep ? (
            <View style={s.bottomActions}>
              <TouchableOpacity onPress={() => setShowPaymentStep(false)} style={s.bottomGhostButton} activeOpacity={0.9}>
                <Text style={s.bottomGhostButtonText}>返回权益页</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSubmit} style={s.bottomButton} activeOpacity={0.9}>
                <Text style={s.bottomButtonText}>提交付款审核</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setShowPaymentStep(true)} style={s.bottomButton} activeOpacity={0.9}>
              <Text style={s.bottomButtonText}>开通会员</Text>
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
