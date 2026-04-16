import React, { useMemo, useState } from 'react';
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { generateInterpretationPreview, getInterpretationFocusOptions, getReportOptions } from './interpretationEngineBridge';

const reportOptions = getReportOptions();
const focusOptions = getInterpretationFocusOptions();
const quickCities = ['Perth', 'Sydney', 'Melbourne', 'Singapore', 'Hong Kong', 'Taipei'];
const quickTimes = ['07:30', '08:30', '09:30', '12:00', '18:30', '21:30'];
const quickDates = ['1994-09-17', '1990-06-15', '1996-03-08', '2001-11-25'];

const navItems = [
  { key: 'home', label: '家', subtitle: 'Home' },
  { key: 'reports', label: '报告', subtitle: 'Reports' },
  { key: 'tools', label: '工具', subtitle: 'Tools' },
  { key: 'pricing', label: '定价', subtitle: 'Pricing' },
  { key: 'account', label: '我的', subtitle: '登录/注册' },
];

const reportSubtitles = {
  'past-life': '探索前世，发现人生意义',
  personality: '发现你个性的核心',
  relationship: '深入了解你的人际关系特征',
  monthly: '利用个性化指导规划你的月度节奏',
  compatibility: '揭开你人际关系中的动态',
  wealth: '了解你的财务优势和机遇',
  evolution: '看清你正在经历的成长课题',
};

const toolCards = [
  {
    title: '出生星盘工具',
    body: '先查出生信息，再进报告页生成结构化解读和主题卡片。',
  },
  {
    title: '兼容性比较',
    body: '后面接双人关系输入时，这里会成为合盘与相处建议入口。',
  },
  {
    title: '月度节奏规划',
    body: '把月度预测报告拆成更轻的行动提示，适合手机端反复查看。',
  },
  {
    title: '前世线索整理',
    body: '把热门的前世报告单独做强入口，方便转化和分享。',
  },
];

const pricingCards = [
  {
    title: '免费体验',
    price: '$0',
    bullets: ['首页浏览全部报告入口', '生成 1 份基础预览', '查看 3 张核心结果卡'],
  },
  {
    title: '月度会员',
    price: '$19 / 月',
    bullets: ['完整报告解读', '月度预测与关系报告', '收藏我的历史结果'],
  },
  {
    title: '年度会员',
    price: '$149 / 年',
    bullets: ['全部报告不限次查看', '优先体验新工具', '后续接入明空品牌专属人格'],
  },
];

function ReportCard({ report, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.reportCard, report.key === 'past-life' && styles.reportCardFeatured, active && styles.reportCardActive]}
    >
      <View style={styles.reportHeader}>
        <Text style={[styles.reportTitle, report.key === 'past-life' && styles.reportTitleFeatured]}>{report.title}</Text>
        {report.key === 'past-life' ? <Text style={styles.reportAccent}>热门</Text> : null}
      </View>
      <Text style={[styles.reportSubtitle, report.key === 'past-life' && styles.reportSubtitleFeatured]}>
        {reportSubtitles[report.key]}
      </Text>
    </Pressable>
  );
}

function MetricCard({ value, label }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function ChipRow({ items, value, onChange }) {
  return (
    <View style={styles.quickRow}>
      {items.map((item) => {
        const active = item === value;
        return (
          <Pressable key={item} onPress={() => onChange(item)} style={[styles.quickChip, active && styles.quickChipActive]}>
            <Text style={[styles.quickChipText, active && styles.quickChipTextActive]}>{item}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SectionCard({ title, body }) {
  return (
    <View style={styles.simpleCard}>
      <Text style={styles.simpleCardTitle}>{title}</Text>
      <Text style={styles.simpleCardBody}>{body}</Text>
    </View>
  );
}

export default function InterpretationWebApp() {
  const [activePage, setActivePage] = useState('home');
  const [reportSearch, setReportSearch] = useState('');
  const [reportType, setReportType] = useState('past-life');
  const [birthDate, setBirthDate] = useState('1994-09-17');
  const [birthTime, setBirthTime] = useState('08:30');
  const [city, setCity] = useState('Perth');
  const [focus, setFocus] = useState('self');
  const [generatedResult, setGeneratedResult] = useState(() =>
    generateInterpretationPreview({
      reportType: 'past-life',
      birthDate: '1994-09-17',
      birthTime: '08:30',
      city: 'Perth',
      focus: 'self',
    })
  );
  const { width } = useWindowDimensions();
  const isNarrow = width < 980;

  const activeReport = useMemo(() => reportOptions.find((item) => item.key === reportType) || reportOptions[0], [reportType]);
  const filteredReports = useMemo(() => {
    const keyword = reportSearch.trim().toLowerCase();
    if (!keyword) return reportOptions;
    return reportOptions.filter((report) => {
      const haystack = `${report.title} ${report.key}`.toLowerCase();
      return haystack.includes(keyword);
    });
  }, [reportSearch]);

  const handleReportChange = (nextReport) => {
    setReportType(nextReport.key);
    setFocus(nextReport.focus);
  };

  const handleGenerate = () => {
    setGeneratedResult(
      generateInterpretationPreview({
        reportType,
        birthDate,
        birthTime,
        city,
        focus,
      })
    );
    setActivePage('reports');
  };

  const renderHero = () => (
    <View style={styles.heroBand}>
      <ImageBackground
        source={require('../../assets/splash.png')}
        resizeMode="cover"
        imageStyle={styles.heroImage}
        style={styles.heroImageWrap}
      >
        <View style={styles.heroOverlay}>
          <Text style={styles.heroEyebrow}>MingSky Astrology | 明空星占</Text>
          <Text style={styles.heroTitle}>先选要看的报告，再生成可读的星盘解读。</Text>
          <Text style={styles.heroBody}>
            首页先把关键报告入口摆出来，重点突出“前世报告”。桌面端看分类更清楚，手机端也能顺手切换到报告、工具、定价和登录入口。
          </Text>
          <View style={styles.heroActions}>
            <Pressable style={styles.primaryButtonCompact} onPress={() => setActivePage('reports')}>
              <Text style={styles.primaryButtonText}>立即开始</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => setActivePage('pricing')}>
              <Text style={styles.secondaryButtonText}>查看定价</Text>
            </Pressable>
          </View>
        </View>
      </ImageBackground>
    </View>
  );

  const renderReportsSection = () => (
    <>
      <View style={styles.sectionBand}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>Reports</Text>
          <Text style={styles.sectionTitle}>首页先把关键报告入口做出来</Text>
          <Text style={styles.sectionBody}>
            先按报告分类浏览，再进入出生信息与生成结果。这样层级更清楚，查找也更方便。
          </Text>
          <TextInput
            value={reportSearch}
            onChangeText={setReportSearch}
            style={styles.searchInput}
            placeholder="搜索报告：前世 / 性格 / 关系 / 财富"
            placeholderTextColor="#72857d"
          />
        </View>
        <View style={styles.reportGrid}>
          {filteredReports.map((report) => (
            <ReportCard key={report.key} report={report} active={report.key === reportType} onPress={() => handleReportChange(report)} />
          ))}
        </View>
      </View>

      <View style={[styles.workspaceBand, isNarrow && styles.workspaceBandStacked]}>
        <View style={styles.formPanel}>
          <Text style={styles.panelTitle}>输入出生信息</Text>
          <Text style={styles.panelSubtitle}>现在不仅能输入，也能直接点选日期、时间和城市。</Text>

          <Text style={styles.fieldLabel}>当前报告</Text>
          <Text style={styles.activeReportText}>{activeReport.title}</Text>

          <Text style={styles.fieldLabel}>出生日期</Text>
          <TextInput value={birthDate} onChangeText={setBirthDate} style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor="#72857d" />
          <ChipRow items={quickDates} value={birthDate} onChange={setBirthDate} />

          <Text style={styles.fieldLabel}>出生时间</Text>
          <TextInput value={birthTime} onChangeText={setBirthTime} style={styles.input} placeholder="HH:MM" placeholderTextColor="#72857d" />
          <ChipRow items={quickTimes} value={birthTime} onChange={setBirthTime} />

          <Text style={styles.fieldLabel}>出生城市</Text>
          <TextInput value={city} onChangeText={setCity} style={styles.input} placeholder="City" placeholderTextColor="#72857d" />
          <ChipRow items={quickCities} value={city} onChange={setCity} />

          <Text style={styles.fieldLabel}>先看哪条主线</Text>
          <View style={styles.focusWrap}>
            {focusOptions.map((option) => {
              const active = option.key === focus;
              return (
                <Pressable key={option.key} style={[styles.focusChip, active && styles.focusChipActive]} onPress={() => setFocus(option.key)}>
                  <Text style={[styles.focusChipText, active && styles.focusChipTextActive]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable style={styles.primaryButton} onPress={handleGenerate}>
            <Text style={styles.primaryButtonText}>生成解读</Text>
          </Pressable>
        </View>

        <View style={styles.previewPanel}>
          <View style={styles.previewHero}>
            <Text style={styles.previewEyebrow}>{generatedResult.reportTitle}</Text>
            <Text style={styles.previewHeroTitle}>{generatedResult.headline}</Text>
            <Text style={styles.previewHeroBody}>{generatedResult.summary}</Text>
            <Text style={styles.previewMeta}>
              {generatedResult.chartMeta.date} · {generatedResult.chartMeta.time} · {generatedResult.chartMeta.city}
            </Text>
          </View>

          <View style={styles.metricRow}>
            <MetricCard value={generatedResult.insights.length} label="结果卡片" />
            <MetricCard value={generatedResult.tags.length} label="结构化主题" />
            <MetricCard value={generatedResult.crossSystemCount} label="跨体系共振" />
          </View>

          <View style={styles.previewSection}>
            <Text style={styles.previewSectionTitle}>本次先看这三张结果卡</Text>
            {generatedResult.insights.map((insight) => (
              <View key={insight.code} style={styles.resultCard}>
                <Text style={styles.listTitle}>{insight.title}</Text>
                <Text style={styles.listBody}>{insight.body}</Text>
              </View>
            ))}
          </View>

          <View style={styles.previewSection}>
            <Text style={styles.previewSectionTitle}>详细星盘解释</Text>
            {generatedResult.detailSections.map((section) => (
              <View key={section.title} style={styles.detailRow}>
                <Text style={styles.detailTitle}>{section.title}</Text>
                <Text style={styles.detailBody}>{section.body}</Text>
              </View>
            ))}
          </View>

          <View style={styles.previewSection}>
            <Text style={styles.previewSectionTitle}>结构化主题</Text>
            <View style={styles.tagWrap}>
              {generatedResult.tags.map((tag) => (
                <View key={tag.code} style={styles.tagPill}>
                  <Text style={styles.tagText}>{tag.label}</Text>
                  {tag.crossSystem ? <Text style={styles.tagMeta}>双系统共振</Text> : null}
                </View>
              ))}
            </View>
          </View>

          <View style={styles.previewSection}>
            <Text style={styles.previewSectionTitle}>证据链</Text>
            {generatedResult.evidence.map((item) => (
              <View key={item.code} style={styles.evidenceRow}>
                <Text style={styles.evidenceLabel}>{item.label}</Text>
                <Text style={styles.evidenceMeta}>{item.system}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </>
  );

  const renderHomePage = () => (
    <>
      {renderHero()}
      <View style={styles.sectionBand}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>Home</Text>
          <Text style={styles.sectionTitle}>最值得先放在首页的报告入口</Text>
          <Text style={styles.sectionBody}>尤其把“前世报告”放在第一屏，其他高转化入口紧跟其后。</Text>
        </View>
        <View style={styles.reportGrid}>
          {reportOptions.map((report) => (
            <ReportCard
              key={report.key}
              report={report}
              active={report.key === reportType}
              onPress={() => {
                handleReportChange(report);
                setActivePage('reports');
              }}
            />
          ))}
        </View>
      </View>
    </>
  );

  const renderToolsPage = () => (
    <View style={styles.simplePage}>
      <Text style={styles.sectionEyebrow}>Tools</Text>
      <Text style={styles.sectionTitle}>工具页先承接高频入口</Text>
      <Text style={styles.sectionBody}>这页先做成清楚的工具导航，后面每个工具都可以独立展开。</Text>
      <View style={styles.simpleGrid}>
        {toolCards.map((item) => (
          <SectionCard key={item.title} title={item.title} body={item.body} />
        ))}
      </View>
    </View>
  );

  const renderPricingPage = () => (
    <View style={styles.simplePage}>
      <Text style={styles.sectionEyebrow}>Pricing</Text>
      <Text style={styles.sectionTitle}>先把免费体验和会员层级讲清楚</Text>
      <Text style={styles.sectionBody}>后面接支付时，可以直接沿用这页的分层结构。</Text>
      <View style={styles.simpleGrid}>
        {pricingCards.map((item) => (
          <View key={item.title} style={styles.simpleCard}>
            <Text style={styles.simpleCardTitle}>{item.title}</Text>
            <Text style={styles.priceText}>{item.price}</Text>
            {item.bullets.map((bullet) => (
              <Text key={bullet} style={styles.simpleCardBody}>
                · {bullet}
              </Text>
            ))}
          </View>
        ))}
      </View>
    </View>
  );

  const renderAccountPage = () => (
    <View style={styles.simplePage}>
      <Text style={styles.sectionEyebrow}>Account</Text>
      <Text style={styles.sectionTitle}>登录 / 注册入口</Text>
      <Text style={styles.sectionBody}>先把“我的”页面留成清晰入口，等你后面接账号系统和购买记录。</Text>
      <View style={styles.accountCard}>
        <Text style={styles.fieldLabel}>邮箱</Text>
        <TextInput style={styles.input} placeholder="your@email.com" placeholderTextColor="#72857d" />
        <Text style={styles.fieldLabel}>密码</Text>
        <TextInput style={styles.input} placeholder="请输入密码" placeholderTextColor="#72857d" secureTextEntry />
        <View style={styles.accountActions}>
          <Pressable style={styles.primaryButtonCompact}>
            <Text style={styles.primaryButtonText}>登录</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>注册</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.shell}>
        <View style={styles.topNav}>
          <View style={styles.brandBlock}>
            <Text style={styles.brandTitle}>MingSky Astrology</Text>
            <Text style={styles.brandSubtitle}>明空星占</Text>
          </View>
          <View style={styles.navTabs}>
            {navItems.map((item) => {
              const active = item.key === activePage;
              return (
                <Pressable key={item.key} onPress={() => setActivePage(item.key)} style={[styles.navTab, active && styles.navTabActive]}>
                  <Text style={[styles.navTabText, active && styles.navTabTextActive]}>{item.label}</Text>
                  <Text style={[styles.navTabSubtext, active && styles.navTabTextActive]}>{item.subtitle}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {activePage === 'home' ? renderHomePage() : null}
        {activePage === 'reports' ? renderReportsSection() : null}
        {activePage === 'tools' ? renderToolsPage() : null}
        {activePage === 'pricing' ? renderPricingPage() : null}
        {activePage === 'account' ? renderAccountPage() : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#edf2ee' },
  content: { paddingBottom: 36 },
  shell: { width: '100%' },
  topNav: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    flexWrap: 'wrap',
  },
  brandBlock: { gap: 2 },
  brandTitle: { color: '#112722', fontSize: 24, lineHeight: 28, fontWeight: '800' },
  brandSubtitle: { color: '#61776d', fontSize: 14, lineHeight: 18, fontWeight: '700' },
  navTabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-end', flex: 1 },
  navTab: {
    minWidth: 92,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(17,39,34,0.12)',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  navTabActive: {
    backgroundColor: '#112722',
    borderColor: '#112722',
  },
  navTabText: { color: '#1f342d', fontSize: 14, lineHeight: 18, fontWeight: '800' },
  navTabSubtext: { marginTop: 2, color: '#70837c', fontSize: 11, lineHeight: 14, fontWeight: '700' },
  navTabTextActive: { color: '#f7faf8' },
  heroBand: { paddingHorizontal: 20, paddingTop: 8 },
  heroImageWrap: { minHeight: 280, justifyContent: 'flex-end' },
  heroImage: { borderRadius: 8 },
  heroOverlay: { borderRadius: 8, paddingHorizontal: 24, paddingVertical: 28, backgroundColor: 'rgba(10, 20, 22, 0.56)' },
  heroEyebrow: { color: '#e7c36c', fontSize: 13, lineHeight: 18, fontWeight: '800' },
  heroTitle: { marginTop: 10, color: '#f7faf8', fontSize: 34, lineHeight: 40, fontWeight: '800', maxWidth: 760 },
  heroBody: { marginTop: 12, color: 'rgba(247,250,248,0.88)', fontSize: 16, lineHeight: 24, maxWidth: 760 },
  heroActions: { marginTop: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  sectionBand: { paddingHorizontal: 20, paddingTop: 24 },
  sectionHeader: { marginBottom: 14 },
  sectionEyebrow: { color: '#516b62', fontSize: 12, lineHeight: 16, fontWeight: '800', textTransform: 'uppercase' },
  sectionTitle: { marginTop: 6, color: '#17221d', fontSize: 28, lineHeight: 34, fontWeight: '800', maxWidth: 760 },
  sectionBody: { marginTop: 8, color: '#5a6b64', fontSize: 15, lineHeight: 22, maxWidth: 760 },
  searchInput: {
    marginTop: 14,
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(23,34,29,0.14)',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    color: '#17221d',
    fontSize: 15,
    maxWidth: 420,
  },
  reportGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  reportCard: {
    minWidth: 220,
    flexGrow: 1,
    flexBasis: 220,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(23,34,29,0.1)',
    backgroundColor: '#f8fbf9',
    padding: 18,
  },
  reportCardFeatured: { backgroundColor: '#112722', borderColor: '#112722' },
  reportCardActive: { borderColor: '#d69a3b', borderWidth: 2 },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' },
  reportTitle: { color: '#17221d', fontSize: 19, lineHeight: 24, fontWeight: '800' },
  reportTitleFeatured: { color: '#f7faf8' },
  reportAccent: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#d69a3b',
    color: '#fffaf1',
    fontSize: 11,
    fontWeight: '800',
  },
  reportSubtitle: { marginTop: 14, color: '#51615a', fontSize: 14, lineHeight: 20 },
  reportSubtitleFeatured: { color: 'rgba(247,250,248,0.84)' },
  workspaceBand: { flexDirection: 'row', gap: 22, paddingHorizontal: 20, paddingTop: 24 },
  workspaceBandStacked: { flexDirection: 'column' },
  formPanel: {
    flex: 0.92,
    minWidth: 320,
    borderRadius: 8,
    backgroundColor: '#fbfdfc',
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(23,34,29,0.1)',
  },
  previewPanel: { flex: 1.18, minWidth: 320, gap: 16 },
  panelTitle: { color: '#17221d', fontSize: 28, lineHeight: 34, fontWeight: '800' },
  panelSubtitle: { marginTop: 8, color: '#5a6b64', fontSize: 15, lineHeight: 22 },
  activeReportText: { marginTop: 8, color: '#17362f', fontSize: 16, lineHeight: 22, fontWeight: '800' },
  fieldLabel: { marginTop: 18, color: '#2a3732', fontSize: 13, lineHeight: 18, fontWeight: '700' },
  input: {
    marginTop: 8,
    height: 54,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(23,34,29,0.14)',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    color: '#17221d',
    fontSize: 16,
  },
  quickRow: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickChip: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(23,34,29,0.14)',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quickChipActive: { backgroundColor: '#edf2ee', borderColor: '#17362f' },
  quickChipText: { color: '#264038', fontSize: 13, lineHeight: 18, fontWeight: '700' },
  quickChipTextActive: { color: '#17362f' },
  focusWrap: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  focusChip: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(23,34,29,0.14)',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  focusChipActive: { backgroundColor: '#17362f', borderColor: '#17362f' },
  focusChipText: { color: '#264038', fontSize: 14, lineHeight: 18, fontWeight: '700' },
  focusChipTextActive: { color: '#f5faf7' },
  primaryButton: {
    marginTop: 22,
    height: 54,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#c9893f',
  },
  primaryButtonCompact: {
    minWidth: 132,
    height: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#c9893f',
    paddingHorizontal: 20,
  },
  primaryButtonText: { color: '#fffaf3', fontSize: 16, lineHeight: 20, fontWeight: '800' },
  secondaryButton: {
    minWidth: 132,
    height: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(17,39,34,0.12)',
  },
  secondaryButtonText: { color: '#17362f', fontSize: 15, lineHeight: 18, fontWeight: '800' },
  previewHero: {
    borderRadius: 8,
    backgroundColor: '#fbfdfc',
    borderWidth: 1,
    borderColor: 'rgba(23,34,29,0.1)',
    padding: 18,
  },
  previewEyebrow: { color: '#6a7f76', fontSize: 12, lineHeight: 16, fontWeight: '800', textTransform: 'uppercase' },
  previewHeroTitle: { marginTop: 8, color: '#17221d', fontSize: 26, lineHeight: 32, fontWeight: '800' },
  previewHeroBody: { marginTop: 10, color: '#5a6b64', fontSize: 15, lineHeight: 22 },
  previewMeta: { marginTop: 12, color: '#7c8f87', fontSize: 13, lineHeight: 18, fontWeight: '700' },
  metricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metricCard: {
    flex: 1,
    minWidth: 150,
    borderRadius: 8,
    backgroundColor: '#fbfdfc',
    borderWidth: 1,
    borderColor: 'rgba(23,34,29,0.1)',
    padding: 16,
  },
  metricValue: { color: '#17221d', fontSize: 34, lineHeight: 38, fontWeight: '800' },
  metricLabel: { marginTop: 8, color: '#5a6b64', fontSize: 14, lineHeight: 20, fontWeight: '700' },
  previewSection: {
    borderRadius: 8,
    backgroundColor: '#fbfdfc',
    borderWidth: 1,
    borderColor: 'rgba(23,34,29,0.1)',
    padding: 18,
  },
  previewSectionTitle: { color: '#17221d', fontSize: 18, lineHeight: 24, fontWeight: '800' },
  resultCard: {
    marginTop: 14,
    borderRadius: 8,
    backgroundColor: '#f6faf8',
    borderWidth: 1,
    borderColor: 'rgba(23,34,29,0.08)',
    padding: 14,
  },
  listTitle: { color: '#17221d', fontSize: 18, lineHeight: 24, fontWeight: '800' },
  listBody: { marginTop: 8, color: '#5a6b64', fontSize: 15, lineHeight: 22 },
  detailRow: { paddingTop: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(23,34,29,0.08)' },
  detailTitle: { color: '#17221d', fontSize: 17, lineHeight: 22, fontWeight: '800' },
  detailBody: { marginTop: 8, color: '#5a6b64', fontSize: 15, lineHeight: 22 },
  tagWrap: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tagPill: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#eef3ef',
    borderWidth: 1,
    borderColor: 'rgba(23,34,29,0.08)',
  },
  tagText: { color: '#20312a', fontSize: 14, lineHeight: 18, fontWeight: '700' },
  tagMeta: { marginTop: 4, color: '#678377', fontSize: 12, lineHeight: 16 },
  evidenceRow: {
    paddingTop: 14,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(23,34,29,0.08)',
  },
  evidenceLabel: { flex: 1, color: '#17221d', fontSize: 15, lineHeight: 22, fontWeight: '700' },
  evidenceMeta: { color: '#678377', fontSize: 13, lineHeight: 18, fontWeight: '700', textTransform: 'uppercase' },
  simplePage: { paddingHorizontal: 20, paddingTop: 24, gap: 14 },
  simpleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  simpleCard: {
    minWidth: 240,
    flexGrow: 1,
    flexBasis: 240,
    borderRadius: 8,
    backgroundColor: '#fbfdfc',
    borderWidth: 1,
    borderColor: 'rgba(23,34,29,0.1)',
    padding: 18,
  },
  simpleCardTitle: { color: '#17221d', fontSize: 20, lineHeight: 24, fontWeight: '800' },
  simpleCardBody: { marginTop: 10, color: '#5a6b64', fontSize: 15, lineHeight: 22 },
  priceText: { marginTop: 10, color: '#112722', fontSize: 28, lineHeight: 32, fontWeight: '800' },
  accountCard: {
    maxWidth: 520,
    borderRadius: 8,
    backgroundColor: '#fbfdfc',
    borderWidth: 1,
    borderColor: 'rgba(23,34,29,0.1)',
    padding: 18,
  },
  accountActions: { marginTop: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
