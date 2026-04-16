import React, { useMemo, useState } from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import {
  CITY_OPTIONS,
  generateInterpretationPreview,
  getBirthFormOptions,
  getDayOptions,
  getInterpretationFocusOptions,
  getReportOptions,
} from './interpretationEngineBridge';

const reportOptions = getReportOptions();
const focusOptions = getInterpretationFocusOptions();
const birthOptions = getBirthFormOptions();

const navItems = [
  { key: 'home', label: '家', subtitle: 'Home' },
  { key: 'reports', label: '报告', subtitle: 'Reports' },
  { key: 'tools', label: '工具', subtitle: 'Tools' },
  { key: 'pricing', label: '定价', subtitle: 'Pricing' },
  { key: 'account', label: '我的', subtitle: '登录/注册' },
];

const toolCards = [
  ['出生星盘计算器', '先查出生盘，再延展到性格、关系、财富和月度节奏。'],
  ['兼容性工具', '后面接双人输入时，直接从这里进入关系动态与相处节奏分析。'],
  ['前世线索工具', '把前世报告做成更强入口，方便用户快速体验热门主题。'],
  ['月度规划工具', '把预测结果收敛成更轻量、更适合手机查看的行动提醒。'],
];

const pricingCards = [
  ['免费体验', '$0', ['浏览全部报告入口', '生成基础星盘结果', '查看核心结果卡和盘面概览']],
  ['月度会员', '$19 / 月', ['完整报告解读', '月度预测和关系扩展', '保存我的历史结果']],
  ['年度会员', '$149 / 年', ['全部报告不限次查看', '优先体验新工具', '后续接入明空品牌人格']],
];

function buildInput(state) {
  return {
    reportType: state.reportType,
    birthDate: `${state.year}-${state.month}-${state.day}`,
    birthTime: `${state.hour}:${state.minute}`,
    cityKey: state.cityKey,
    focus: state.focus,
  };
}

function ReportCard({ report, active, onPress }) {
  const featured = report.key === 'past-life';
  return (
    <Pressable onPress={onPress} style={[styles.reportCard, featured && styles.reportCardFeatured, active && styles.reportCardActive]}>
      <View style={styles.rowBetween}>
        <Text style={[styles.reportTitle, featured && styles.reportTitleFeatured]}>{report.title}</Text>
        {featured ? <Text style={styles.badge}>热门</Text> : null}
      </View>
      <Text style={[styles.reportBody, featured && styles.reportBodyFeatured]}>{report.intro}</Text>
    </Pressable>
  );
}

function ChipScroller({ items, selectedValue, onSelect, width = 64 }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroller}>
      {items.map((item) => {
        const value = typeof item === 'string' ? item : item.value;
        const label = typeof item === 'string' ? item : item.label;
        const active = value === selectedValue;
        return (
          <Pressable key={value} onPress={() => onSelect(value)} style={[styles.chip, active && styles.chipActive, { minWidth: width }]}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function ChartWheel({ chartVisual, compact }) {
  const size = compact ? 280 : 340;
  const center = size / 2;
  const ring = size / 2 - 18;
  const houseRing = size / 2 - 66;
  const planetRing = size / 2 - 108;
  const pos = (deg, radius) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { left: center + Math.cos(rad) * radius, top: center + Math.sin(rad) * radius };
  };

  return (
    <View style={[styles.wheel, { width: size, height: size, borderRadius: size / 2 }]}>
      <View style={[styles.wheelOuter, { width: size, height: size, borderRadius: size / 2 }]} />
      <View style={[styles.wheelInner, { width: size - 72, height: size - 72, borderRadius: (size - 72) / 2, left: 36, top: 36 }]} />
      {chartVisual.houses.map((house) => {
        const p = pos(house.longitude + 15, ring - 14);
        return <Text key={`sign-${house.houseNumber}`} style={[styles.wheelSign, { left: p.left - 18, top: p.top - 10 }]}>{house.signLabel}</Text>;
      })}
      {chartVisual.houses.map((house) => {
        const p = pos(house.longitude + 15, houseRing);
        return <View key={`house-${house.houseNumber}`} style={[styles.houseDot, { left: p.left - 12, top: p.top - 12 }]}><Text style={styles.houseDotText}>{house.houseNumber}</Text></View>;
      })}
      {chartVisual.rawPlanets.map((planet, index) => {
        const p = pos(planet.longitude, planetRing - (index % 3) * 12);
        return <View key={planet.code} style={[styles.planetDot, { left: p.left - 16, top: p.top - 16, backgroundColor: planet.color }]}><Text style={styles.planetDotText}>{planet.symbol}</Text></View>;
      })}
    </View>
  );
}

function Card({ title, body }) {
  return <View style={styles.card}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.cardBody}>{body}</Text></View>;
}

export default function InterpretationWebApp() {
  const [activePage, setActivePage] = useState('home');
  const [reportSearch, setReportSearch] = useState('');
  const [reportType, setReportType] = useState('past-life');
  const [focus, setFocus] = useState('self');
  const [year, setYear] = useState('1994');
  const [month, setMonth] = useState('09');
  const [day, setDay] = useState('17');
  const [hour, setHour] = useState('08');
  const [minute, setMinute] = useState('30');
  const [cityKey, setCityKey] = useState('perth');
  const [generatedResult, setGeneratedResult] = useState(() =>
    generateInterpretationPreview(buildInput({ reportType: 'past-life', year: '1994', month: '09', day: '17', hour: '08', minute: '30', cityKey: 'perth', focus: 'self' }))
  );
  const { width } = useWindowDimensions();
  const isNarrow = width < 980;

  const dayOptions = useMemo(() => getDayOptions(year, month), [year, month]);
  const activeReport = useMemo(() => reportOptions.find((item) => item.key === reportType) || reportOptions[0], [reportType]);
  const filteredReports = useMemo(() => {
    const keyword = reportSearch.trim().toLowerCase();
    if (!keyword) return reportOptions;
    return reportOptions.filter((report) => `${report.title} ${report.intro}`.toLowerCase().includes(keyword));
  }, [reportSearch]);

  const onReportChange = (report) => {
    setReportType(report.key);
    setFocus(report.focus);
  };

  const onGenerate = () => {
    const next = generateInterpretationPreview(buildInput({ reportType, year, month, day, hour, minute, cityKey, focus }));
    setGeneratedResult(next);
    setActivePage('reports');
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.shell}>
        <View style={styles.topNav}>
          <View>
            <Text style={styles.brandTitle}>MingSky Astrology</Text>
            <Text style={styles.brandSubtitle}>明空星占</Text>
          </View>
          <View style={styles.navTabs}>
            {navItems.map((item) => {
              const active = item.key === activePage;
              return (
                <Pressable key={item.key} onPress={() => setActivePage(item.key)} style={[styles.navTab, active && styles.navTabActive]}>
                  <Text style={[styles.navTabText, active && styles.navTabTextActive]}>{item.label}</Text>
                  <Text style={[styles.navTabSub, active && styles.navTabTextActive]}>{item.subtitle}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {activePage === 'home' ? (
          <>
            <View style={styles.heroBand}>
              <ImageBackground source={require('../../assets/splash.png')} resizeMode="cover" imageStyle={styles.heroImage} style={styles.heroWrap}>
                <View style={styles.heroOverlay}>
                  <Text style={styles.heroEyebrow}>MingSky Signature Reports</Text>
                  <Text style={styles.heroTitle}>首页先把真正能吸引人的报告入口摆出来。</Text>
                  <Text style={styles.heroBody}>“前世报告”放第一屏，后面紧跟性格、关系、月度预测、兼容性和财务潜力。桌面端清楚分栏，手机端也能顺畅切换。</Text>
                  <View style={styles.heroActions}>
                    <Pressable style={styles.primaryCompact} onPress={() => setActivePage('reports')}><Text style={styles.primaryText}>开始生成</Text></Pressable>
                    <Pressable style={styles.secondaryBtn} onPress={() => setActivePage('pricing')}><Text style={styles.secondaryText}>查看会员</Text></Pressable>
                  </View>
                </View>
              </ImageBackground>
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionEyebrow}>Featured Reports</Text>
              <Text style={styles.sectionTitle}>先把关键报告做成正式首页</Text>
              <Text style={styles.sectionBody}>特别把“前世报告”压到最显眼位置，其他高转化报告顺次展开。</Text>
              <View style={styles.grid}>{reportOptions.map((report) => <ReportCard key={report.key} report={report} active={report.key === reportType} onPress={() => { onReportChange(report); setActivePage('reports'); }} />)}</View>
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionEyebrow}>How It Works</Text>
              <Text style={styles.sectionTitle}>首页也是操作说明</Text>
              <View style={styles.grid}>{[['先选报告', '首页先把前世报告、性格报告和关系报告排到最前。'], ['再选出生信息', '日期、时间、城市全部改成可选择控件，减少输入摩擦。'], ['最后看结果', '直接看到真实行星位置、盘面轮盘、主题卡片和详细解读。']].map((item) => <Card key={item[0]} title={item[0]} body={item[1]} />)}</View>
            </View>
            <View style={styles.previewBand}>
              <View style={styles.previewText}>
                <Text style={styles.sectionEyebrow}>Live Preview</Text>
                <Text style={styles.sectionTitle}>结果页先给到真实盘面，而不是空白卡片</Text>
                <Text style={styles.sectionBody}>现在结果区会直接展示行星位置、盘面轮盘、核心相位、结构化主题和详细段落，后面接更完整规则时不用重做外层页面。</Text>
              </View>
              <View style={styles.previewBox}><ChartWheel chartVisual={generatedResult.chartVisual} compact /></View>
            </View>
          </>
        ) : null}

        {activePage === 'reports' ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionEyebrow}>Reports</Text>
              <Text style={styles.sectionTitle}>先找报告，再选出生信息，再看结果</Text>
              <Text style={styles.sectionBody}>日期、时间、城市都改成真正可选控件，减少手输和误差。</Text>
              <TextInput value={reportSearch} onChangeText={setReportSearch} style={styles.searchInput} placeholder="搜索报告：前世 / 性格 / 关系 / 财富" placeholderTextColor="#72857d" />
              <View style={styles.grid}>{filteredReports.map((report) => <ReportCard key={report.key} report={report} active={report.key === reportType} onPress={() => onReportChange(report)} />)}</View>
            </View>
            <View style={[styles.workspace, isNarrow && styles.workspaceStack]}>
              <View style={styles.formPanel}>
                <Text style={styles.panelTitle}>出生信息</Text>
                <Text style={styles.panelBody}>选择日期、时间和城市后，直接生成真实行星位置驱动的结果。</Text>
                <Text style={styles.label}>当前报告</Text>
                <Text style={styles.activeText}>{activeReport.title}</Text>
                <Text style={styles.label}>出生日期</Text>
                <ChipScroller items={birthOptions.years} selectedValue={year} onSelect={setYear} width={74} />
                <ChipScroller items={birthOptions.months} selectedValue={month} onSelect={setMonth} width={58} />
                <ChipScroller items={dayOptions} selectedValue={day} onSelect={setDay} width={58} />
                <Text style={styles.label}>出生时间</Text>
                <ChipScroller items={birthOptions.hours} selectedValue={hour} onSelect={setHour} width={58} />
                <ChipScroller items={birthOptions.minutes} selectedValue={minute} onSelect={setMinute} width={58} />
                <Text style={styles.label}>出生城市</Text>
                <View style={styles.cityGrid}>
                  {CITY_OPTIONS.map((city) => {
                    const active = city.key === cityKey;
                    return <Pressable key={city.key} onPress={() => setCityKey(city.key)} style={[styles.cityCard, active && styles.cityCardActive]}><Text style={[styles.cityTitle, active && styles.cityTitleActive]}>{city.label}</Text><Text style={[styles.cityRegion, active && styles.cityRegionActive]}>{city.region}</Text></Pressable>;
                  })}
                </View>
                <Text style={styles.label}>先看哪条主线</Text>
                <View style={styles.focusWrap}>
                  {focusOptions.map((option) => {
                    const active = option.key === focus;
                    return <Pressable key={option.key} style={[styles.focusChip, active && styles.focusChipActive]} onPress={() => setFocus(option.key)}><Text style={[styles.focusText, active && styles.focusTextActive]}>{option.label}</Text></Pressable>;
                  })}
                </View>
                <Pressable style={styles.primaryBtn} onPress={onGenerate}><Text style={styles.primaryText}>生成解读</Text></Pressable>
              </View>
              <View style={styles.resultPanel}>
                <View style={styles.resultHero}>
                  <Text style={styles.resultEyebrow}>{generatedResult.reportTitle}</Text>
                  <Text style={styles.resultTitle}>{generatedResult.headline}</Text>
                  <Text style={styles.resultBody}>{generatedResult.summary}</Text>
                  <Text style={styles.resultMeta}>{generatedResult.chartMeta.date} · {generatedResult.chartMeta.time} · {generatedResult.chartMeta.city}</Text>
                </View>
                <View style={styles.metricRow}>
                  <View style={styles.metric}><Text style={styles.metricValue}>{generatedResult.insights.length}</Text><Text style={styles.metricLabel}>结果卡片</Text></View>
                  <View style={styles.metric}><Text style={styles.metricValue}>{generatedResult.tags.length}</Text><Text style={styles.metricLabel}>结构化主题</Text></View>
                  <View style={styles.metric}><Text style={styles.metricValue}>{generatedResult.chartVisual.aspects.length}</Text><Text style={styles.metricLabel}>主要相位</Text></View>
                </View>
                <View style={styles.resultCardShell}>
                  <Text style={styles.boxTitle}>真实盘面概览</Text>
                  <View style={[styles.chartRow, isNarrow && styles.workspaceStack]}>
                    <ChartWheel chartVisual={generatedResult.chartVisual} />
                    <View style={styles.planetTable}>
                      {generatedResult.chartVisual.planets.map((planet) => <View key={planet.code} style={styles.planetRow}><Text style={styles.planetName}>{planet.symbol} {planet.label}</Text><Text style={styles.planetPos}>{planet.position}</Text><Text style={styles.planetMeta}>{planet.house} · {planet.motion}</Text></View>)}
                    </View>
                  </View>
                </View>
                <View style={styles.resultCardShell}>
                  <Text style={styles.boxTitle}>本次先看这三张结果卡</Text>
                  {generatedResult.insights.map((insight) => <View key={insight.code} style={styles.miniCard}><Text style={styles.miniTitle}>{insight.title}</Text><Text style={styles.miniBody}>{insight.body}</Text></View>)}
                </View>
                <View style={styles.resultCardShell}>
                  <Text style={styles.boxTitle}>详细星盘解释</Text>
                  {generatedResult.detailSections.map((section) => <View key={section.title} style={styles.detailRow}><Text style={styles.detailTitle}>{section.title}</Text><Text style={styles.detailBody}>{section.body}</Text></View>)}
                </View>
                <View style={styles.resultCardShell}>
                  <Text style={styles.boxTitle}>结构化主题</Text>
                  <View style={styles.tagWrap}>{generatedResult.tags.map((tag) => <View key={tag.code} style={styles.tag}><Text style={styles.tagText}>{tag.label}</Text></View>)}</View>
                </View>
              </View>
            </View>
          </>
        ) : null}

        {activePage === 'tools' ? <View style={styles.simplePage}><Text style={styles.sectionEyebrow}>Tools</Text><Text style={styles.sectionTitle}>工具页先承接高频入口</Text><View style={styles.grid}>{toolCards.map((item) => <Card key={item[0]} title={item[0]} body={item[1]} />)}</View></View> : null}
        {activePage === 'pricing' ? <View style={styles.simplePage}><Text style={styles.sectionEyebrow}>Pricing</Text><Text style={styles.sectionTitle}>先把免费体验和会员层级讲清楚</Text><View style={styles.grid}>{pricingCards.map((item) => <View key={item[0]} style={styles.card}><Text style={styles.cardTitle}>{item[0]}</Text><Text style={styles.price}>{item[1]}</Text>{item[2].map((line) => <Text key={line} style={styles.cardBody}>· {line}</Text>)}</View>)}</View></View> : null}
        {activePage === 'account' ? <View style={styles.simplePage}><Text style={styles.sectionEyebrow}>Account</Text><Text style={styles.sectionTitle}>登录 / 注册入口</Text><View style={styles.accountCard}><Text style={styles.label}>邮箱</Text><TextInput style={styles.textInput} placeholder="your@email.com" placeholderTextColor="#72857d" /><Text style={styles.label}>密码</Text><TextInput style={styles.textInput} placeholder="请输入密码" placeholderTextColor="#72857d" secureTextEntry /><View style={styles.heroActions}><Pressable style={styles.primaryCompact}><Text style={styles.primaryText}>登录</Text></Pressable><Pressable style={styles.secondaryBtn}><Text style={styles.secondaryText}>注册</Text></Pressable></View></View></View> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#edf2ee' },
  content: { paddingBottom: 36 },
  shell: { width: '100%' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  topNav: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' },
  brandTitle: { color: '#112722', fontSize: 24, lineHeight: 28, fontWeight: '800' },
  brandSubtitle: { color: '#61776d', fontSize: 14, lineHeight: 18, fontWeight: '700' },
  navTabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-end', flex: 1 },
  navTab: { minWidth: 92, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(17,39,34,0.12)', backgroundColor: '#fff', alignItems: 'center' },
  navTabActive: { backgroundColor: '#112722', borderColor: '#112722' },
  navTabText: { color: '#1f342d', fontSize: 14, lineHeight: 18, fontWeight: '800' },
  navTabSub: { marginTop: 2, color: '#70837c', fontSize: 11, lineHeight: 14, fontWeight: '700' },
  navTabTextActive: { color: '#f7faf8' },
  heroBand: { paddingHorizontal: 20, paddingTop: 8 },
  heroWrap: { minHeight: 300, justifyContent: 'flex-end' },
  heroImage: { borderRadius: 8 },
  heroOverlay: { borderRadius: 8, paddingHorizontal: 24, paddingVertical: 28, backgroundColor: 'rgba(10,20,22,0.58)' },
  heroEyebrow: { color: '#e7c36c', fontSize: 13, lineHeight: 18, fontWeight: '800' },
  heroTitle: { marginTop: 10, color: '#f7faf8', fontSize: 34, lineHeight: 40, fontWeight: '800', maxWidth: 760 },
  heroBody: { marginTop: 12, color: 'rgba(247,250,248,0.88)', fontSize: 16, lineHeight: 24, maxWidth: 760 },
  heroActions: { marginTop: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  primaryCompact: { minWidth: 132, height: 46, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#c9893f', paddingHorizontal: 20 },
  primaryBtn: { marginTop: 22, height: 54, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#c9893f' },
  primaryText: { color: '#fffaf3', fontSize: 16, lineHeight: 20, fontWeight: '800' },
  secondaryBtn: { minWidth: 132, height: 46, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(17,39,34,0.12)' },
  secondaryText: { color: '#17362f', fontSize: 15, lineHeight: 18, fontWeight: '800' },
  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionEyebrow: { color: '#516b62', fontSize: 12, lineHeight: 16, fontWeight: '800', textTransform: 'uppercase' },
  sectionTitle: { marginTop: 6, color: '#17221d', fontSize: 28, lineHeight: 34, fontWeight: '800', maxWidth: 760 },
  sectionBody: { marginTop: 8, color: '#5a6b64', fontSize: 15, lineHeight: 22, maxWidth: 760 },
  searchInput: { marginTop: 14, height: 52, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(23,34,29,0.14)', backgroundColor: '#fff', paddingHorizontal: 16, color: '#17221d', fontSize: 15, maxWidth: 420 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 14 },
  reportCard: { minWidth: 220, flexGrow: 1, flexBasis: 220, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(23,34,29,0.1)', backgroundColor: '#f8fbf9', padding: 18 },
  reportCardFeatured: { backgroundColor: '#112722', borderColor: '#112722' },
  reportCardActive: { borderColor: '#d69a3b', borderWidth: 2 },
  reportTitle: { color: '#17221d', fontSize: 19, lineHeight: 24, fontWeight: '800' },
  reportTitleFeatured: { color: '#f7faf8' },
  badge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: '#d69a3b', color: '#fffaf1', fontSize: 11, fontWeight: '800' },
  reportBody: { marginTop: 14, color: '#51615a', fontSize: 14, lineHeight: 20 },
  reportBodyFeatured: { color: 'rgba(247,250,248,0.84)' },
  previewBand: { paddingHorizontal: 20, paddingTop: 24, flexDirection: 'row', flexWrap: 'wrap', gap: 18, alignItems: 'center' },
  previewText: { flex: 1, minWidth: 280 },
  previewBox: { minWidth: 320, flexGrow: 1, flexBasis: 360, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(23,34,29,0.1)', backgroundColor: '#fbfdfc', padding: 18, alignItems: 'center' },
  workspace: { flexDirection: 'row', gap: 22, paddingHorizontal: 20, paddingTop: 24 },
  workspaceStack: { flexDirection: 'column' },
  formPanel: { flex: 0.96, minWidth: 320, borderRadius: 8, backgroundColor: '#fbfdfc', padding: 18, borderWidth: 1, borderColor: 'rgba(23,34,29,0.1)' },
  resultPanel: { flex: 1.2, minWidth: 320, gap: 16 },
  panelTitle: { color: '#17221d', fontSize: 28, lineHeight: 34, fontWeight: '800' },
  panelBody: { marginTop: 8, color: '#5a6b64', fontSize: 15, lineHeight: 22 },
  label: { marginTop: 18, color: '#2a3732', fontSize: 13, lineHeight: 18, fontWeight: '700' },
  activeText: { marginTop: 8, color: '#17362f', fontSize: 16, lineHeight: 22, fontWeight: '800' },
  chipScroller: { gap: 8, paddingTop: 8, paddingBottom: 2 },
  chip: { height: 42, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(23,34,29,0.14)', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: '#17362f', borderColor: '#17362f' },
  chipText: { color: '#264038', fontSize: 14, lineHeight: 18, fontWeight: '700' },
  chipTextActive: { color: '#f7faf8' },
  cityGrid: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cityCard: { minWidth: 118, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(23,34,29,0.12)', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 12 },
  cityCardActive: { backgroundColor: '#17362f', borderColor: '#17362f' },
  cityTitle: { color: '#1f342d', fontSize: 15, lineHeight: 18, fontWeight: '800' },
  cityTitleActive: { color: '#f7faf8' },
  cityRegion: { marginTop: 4, color: '#70837c', fontSize: 12, lineHeight: 16, fontWeight: '700' },
  cityRegionActive: { color: 'rgba(247,250,248,0.8)' },
  focusWrap: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  focusChip: { borderRadius: 8, borderWidth: 1, borderColor: 'rgba(23,34,29,0.14)', backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 10 },
  focusChipActive: { backgroundColor: '#17362f', borderColor: '#17362f' },
  focusText: { color: '#264038', fontSize: 14, lineHeight: 18, fontWeight: '700' },
  focusTextActive: { color: '#f5faf7' },
  resultHero: { borderRadius: 8, backgroundColor: '#fbfdfc', borderWidth: 1, borderColor: 'rgba(23,34,29,0.1)', padding: 18 },
  resultEyebrow: { color: '#6a7f76', fontSize: 12, lineHeight: 16, fontWeight: '800', textTransform: 'uppercase' },
  resultTitle: { marginTop: 8, color: '#17221d', fontSize: 26, lineHeight: 32, fontWeight: '800' },
  resultBody: { marginTop: 10, color: '#5a6b64', fontSize: 15, lineHeight: 22 },
  resultMeta: { marginTop: 12, color: '#7c8f87', fontSize: 13, lineHeight: 18, fontWeight: '700' },
  metricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metric: { flex: 1, minWidth: 150, borderRadius: 8, backgroundColor: '#fbfdfc', borderWidth: 1, borderColor: 'rgba(23,34,29,0.1)', padding: 16 },
  metricValue: { color: '#17221d', fontSize: 34, lineHeight: 38, fontWeight: '800' },
  metricLabel: { marginTop: 8, color: '#5a6b64', fontSize: 14, lineHeight: 20, fontWeight: '700' },
  resultCardShell: { borderRadius: 8, backgroundColor: '#fbfdfc', borderWidth: 1, borderColor: 'rgba(23,34,29,0.1)', padding: 18 },
  boxTitle: { color: '#17221d', fontSize: 18, lineHeight: 24, fontWeight: '800' },
  chartRow: { marginTop: 16, flexDirection: 'row', gap: 18, alignItems: 'center' },
  wheel: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafcfb', borderWidth: 1, borderColor: 'rgba(23,34,29,0.08)' },
  wheelOuter: { position: 'absolute', borderWidth: 16, borderColor: '#263f38' },
  wheelInner: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(23,34,29,0.18)' },
  wheelSign: { position: 'absolute', color: '#17362f', fontSize: 12, lineHeight: 14, fontWeight: '800' },
  houseDot: { position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(23,34,29,0.12)' },
  houseDotText: { color: '#17362f', fontSize: 12, lineHeight: 14, fontWeight: '800' },
  planetDot: { position: 'absolute', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  planetDotText: { color: '#fff', fontSize: 16, lineHeight: 18, fontWeight: '800' },
  planetTable: { flex: 1, minWidth: 250, gap: 10 },
  planetRow: { borderRadius: 8, backgroundColor: '#f6faf8', borderWidth: 1, borderColor: 'rgba(23,34,29,0.08)', padding: 12 },
  planetName: { color: '#17221d', fontSize: 15, lineHeight: 18, fontWeight: '800' },
  planetPos: { marginTop: 6, color: '#264038', fontSize: 14, lineHeight: 18, fontWeight: '700' },
  planetMeta: { marginTop: 4, color: '#70837c', fontSize: 12, lineHeight: 16, fontWeight: '700' },
  miniCard: { marginTop: 14, borderRadius: 8, backgroundColor: '#f6faf8', borderWidth: 1, borderColor: 'rgba(23,34,29,0.08)', padding: 14 },
  miniTitle: { color: '#17221d', fontSize: 18, lineHeight: 24, fontWeight: '800' },
  miniBody: { marginTop: 8, color: '#5a6b64', fontSize: 15, lineHeight: 22 },
  detailRow: { paddingTop: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(23,34,29,0.08)' },
  detailTitle: { color: '#17221d', fontSize: 17, lineHeight: 22, fontWeight: '800' },
  detailBody: { marginTop: 8, color: '#5a6b64', fontSize: 15, lineHeight: 22 },
  tagWrap: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tag: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#eef3ef', borderWidth: 1, borderColor: 'rgba(23,34,29,0.08)' },
  tagText: { color: '#20312a', fontSize: 14, lineHeight: 18, fontWeight: '700' },
  card: { minWidth: 240, flexGrow: 1, flexBasis: 240, borderRadius: 8, backgroundColor: '#fbfdfc', borderWidth: 1, borderColor: 'rgba(23,34,29,0.1)', padding: 18 },
  cardTitle: { color: '#17221d', fontSize: 20, lineHeight: 24, fontWeight: '800' },
  cardBody: { marginTop: 10, color: '#5a6b64', fontSize: 15, lineHeight: 22 },
  price: { marginTop: 10, color: '#112722', fontSize: 28, lineHeight: 32, fontWeight: '800' },
  simplePage: { paddingHorizontal: 20, paddingTop: 24, gap: 14 },
  accountCard: { maxWidth: 520, borderRadius: 8, backgroundColor: '#fbfdfc', borderWidth: 1, borderColor: 'rgba(23,34,29,0.1)', padding: 18 },
  textInput: { marginTop: 8, height: 54, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(23,34,29,0.14)', backgroundColor: '#fff', paddingHorizontal: 16, color: '#17221d', fontSize: 16 },
});
