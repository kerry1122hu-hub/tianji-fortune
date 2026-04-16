import React, { useEffect, useMemo, useState } from 'react';
import { ImageBackground, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { CITY_OPTIONS, ENGINE_INFO, generateInterpretationPreview, getBirthFormOptions, getCitySearchText, getDayOptions, getInterpretationFocusOptions, getReportOptions } from './interpretationEngineBridge';

const reportOptions = getReportOptions();
const focusOptions = getInterpretationFocusOptions();
const birthOptions = getBirthFormOptions();
const navItems = [
  { key: 'home', label: '家', sub: 'Home' },
  { key: 'reports', label: '报告', sub: 'Reports' },
  { key: 'tools', label: '工具', sub: 'Tools' },
  { key: 'pricing', label: '定价', sub: 'Pricing' },
  { key: 'account', label: '我的', sub: '登录/注册' },
];
const resultTabs = [
  { key: 'overview', label: '总览' },
  { key: 'report', label: '报告' },
  { key: 'chart', label: '星盘' },
  { key: 'themes', label: '主题' },
  { key: 'plan', label: '行动' },
];
const homeCards = [
  ['前世报告', '探索前世，发现人生意义'],
  ['性格报告', '发现你个性的核心'],
  ['关系报告', '深入了解你的人际关系特征'],
  ['月度预测报告', '利用个性化指导规划你的月度计划'],
  ['兼容性报告', '揭开你关系中的动态'],
  ['财务潜力报告', '了解你的财务优势和机遇'],
  ['生命进化报告', '把成长课题整理成长期方向'],
];

const buildInput = (s) => ({ reportType: s.reportType, birthDate: `${s.year}-${s.month}-${s.day}`, birthTime: `${s.hour}:${s.minute}`, cityKey: s.cityKey, focus: s.focus });

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

function WheelColumn({ label, items, selectedValue, onSelect, width = 90 }) {
  return (
    <View style={[styles.wheelColumn, { width }]}>
      <Text style={styles.wheelLabel}>{label}</Text>
      <View style={styles.wheelShell}>
        <ScrollView
          style={styles.wheelViewport}
          contentContainerStyle={styles.wheelContent}
          showsVerticalScrollIndicator={false}
          snapToInterval={50}
          decelerationRate="fast"
        >
          {items.map((item) => {
            const value = typeof item === 'string' ? item : item.value;
            const display = typeof item === 'string' ? item : item.label;
            const active = value === selectedValue;
            return <Pressable key={`${label}-${value}`} onPress={() => onSelect(value)} style={[styles.wheelItem, active && styles.wheelItemActive]}><Text style={[styles.wheelText, active && styles.wheelTextActive]}>{display}</Text></Pressable>;
          })}
        </ScrollView>
        <View pointerEvents="none" style={styles.wheelSelectionBand} />
        <View pointerEvents="none" style={styles.wheelFadeTop} />
        <View pointerEvents="none" style={styles.wheelFadeBottom} />
      </View>
    </View>
  );
}

function ChartWheel({ chartVisual, compact }) {
  const size = compact ? 280 : 340;
  const center = size / 2;
  const ring = size / 2 - 18;
  const houseRing = size / 2 - 66;
  const planetRing = size / 2 - 108;
  const pos = (deg, radius) => { const rad = ((deg - 90) * Math.PI) / 180; return { left: center + Math.cos(rad) * radius, top: center + Math.sin(rad) * radius }; };
  return (
    <View style={[styles.wheel, { width: size, height: size, borderRadius: size / 2 }]}>
      <View style={[styles.wheelOuter, { width: size, height: size, borderRadius: size / 2 }]} />
      <View style={[styles.wheelInner, { width: size - 72, height: size - 72, borderRadius: (size - 72) / 2, left: 36, top: 36 }]} />
      {chartVisual.houses.map((house) => { const p = pos(house.longitude + 15, ring - 14); return <Text key={`sign-${house.houseNumber}`} style={[styles.wheelSign, { left: p.left - 18, top: p.top - 10 }]}>{house.signLabel}</Text>; })}
      {chartVisual.houses.map((house) => { const p = pos(house.longitude + 15, houseRing); return <View key={`house-${house.houseNumber}`} style={[styles.houseDot, { left: p.left - 12, top: p.top - 12 }]}><Text style={styles.houseDotText}>{house.houseNumber}</Text></View>; })}
      {chartVisual.rawPlanets.map((planet, index) => { const p = pos(planet.longitude, planetRing - (index % 3) * 12); return <View key={planet.code} style={[styles.planetDot, { left: p.left - 16, top: p.top - 16, backgroundColor: planet.color }]}><Text style={styles.planetDotText}>{planet.symbol}</Text></View>; })}
    </View>
  );
}

function InlineCitySelector({ selectedCity, search, onChangeSearch, onSelectCity, onOpenLibrary }) {
  const quickResults = useMemo(() => {
    if (!search.trim()) {
      return CITY_OPTIONS.filter((city) => city.region === 'China').slice(0, 8);
    }
    return CITY_OPTIONS.filter((city) => getCitySearchText(city).includes(search.trim().toLowerCase())).slice(0, 10);
  }, [search]);

  return (
    <View style={styles.cityInlineWrap}>
      <TextInput
        value={search}
        onChangeText={onChangeSearch}
        style={styles.citySearchInput}
        placeholder="搜索出生城市，例如：北京 / 杭州 / 广州"
        placeholderTextColor="#72857d"
      />
      <View style={styles.cityCurrentRow}>
        <View>
          <Text style={styles.cityCurrentTitle}>{selectedCity.label}</Text>
          <Text style={styles.cityCurrentMeta}>{selectedCity.province || selectedCity.region} · {selectedCity.timezone}</Text>
        </View>
        <Pressable style={styles.cityLibraryBtn} onPress={onOpenLibrary}>
          <Text style={styles.cityLibraryBtnText}>更多城市</Text>
        </Pressable>
      </View>
      <View style={styles.cityQuickList}>
        {quickResults.map((city) => {
          const active = city.key === selectedCity.key;
          return (
            <Pressable key={city.key} style={[styles.cityQuickItem, active && styles.cityQuickItemActive]} onPress={() => { onSelectCity(city.key); onChangeSearch(''); }}>
              <Text style={[styles.cityQuickTitle, active && styles.cityQuickTitleActive]}>{city.label}</Text>
              <Text style={styles.cityQuickMeta}>{city.province || city.region}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function BirthMomentRow({ year, month, day, hour, minute, setYear, setMonth, setDay, setHour, setMinute, dayOptions }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.birthMomentRow}>
      <WheelColumn label="年" items={birthOptions.years} selectedValue={year} onSelect={setYear} width={92} />
      <WheelColumn label="月" items={birthOptions.months} selectedValue={month} onSelect={setMonth} width={74} />
      <WheelColumn label="日" items={dayOptions} selectedValue={day} onSelect={setDay} width={74} />
      <WheelColumn label="时" items={birthOptions.hours} selectedValue={hour} onSelect={setHour} width={74} />
      <WheelColumn label="分" items={birthOptions.minutes} selectedValue={minute} onSelect={setMinute} width={74} />
    </ScrollView>
  );
}

function CityPickerModal({ visible, onClose, selectedCityKey, onSelect }) {
  const [search, setSearch] = useState('');
  const selectedCity = useMemo(() => CITY_OPTIONS.find((city) => city.key === selectedCityKey) || CITY_OPTIONS[0], [selectedCityKey]);
  const [scope, setScope] = useState('中国省份');
  const [province, setProvince] = useState('北京市');
  const provinces = useMemo(() => [...new Set(CITY_OPTIONS.filter((city) => city.region === 'China').map((city) => city.province).filter(Boolean))], []);
  const overseasRegions = useMemo(() => [...new Set(CITY_OPTIONS.filter((city) => city.region !== 'China').map((city) => city.region))], []);
  const searchResults = useMemo(() => search.trim() ? CITY_OPTIONS.filter((city) => getCitySearchText(city).includes(search.trim().toLowerCase())) : [], [search]);
  const regionCities = useMemo(() => {
    if (scope === '海外城市') return CITY_OPTIONS.filter((city) => city.region !== 'China');
    return CITY_OPTIONS.filter((city) => city.region === 'China' && city.province === province);
  }, [province, scope]);
  useEffect(() => {
    if (selectedCity.region === 'China' && selectedCity.province) {
      setScope('中国省份');
      setProvince(selectedCity.province);
    }
    if (selectedCity.region !== 'China') {
      setScope('海外城市');
    }
  }, [selectedCity]);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalScrim}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>选择出生城市</Text>
            <Pressable onPress={onClose} style={styles.modalDone}><Text style={styles.modalDoneText}>完成</Text></Pressable>
          </View>
          <View style={styles.modalSearchWrap}><TextInput value={search} onChangeText={setSearch} placeholder="搜索国家或城市" placeholderTextColor="#72857d" style={styles.modalSearchInput} /></View>
          {search.trim() ? (
            <ScrollView style={styles.modalBody}>
              {searchResults.map((city) => {
                const active = city.key === selectedCityKey;
                return <Pressable key={city.key} onPress={() => { onSelect(city.key); if (city.region === 'China' && city.province) { setScope('中国省份'); setProvince(city.province); } else { setScope('海外城市'); } setSearch(''); onClose(); }} style={[styles.searchRow, active && styles.searchRowActive]}><Text style={[styles.searchTitle, active && styles.searchTitleActive]}>{city.label}</Text><Text style={styles.searchMeta}>{city.province || city.region} · {city.timezone}</Text></Pressable>;
              })}
            </ScrollView>
          ) : (
            <View style={styles.cityColumns}>
              <ScrollView style={styles.regionList}>
                <Pressable onPress={() => setScope('中国省份')} style={[styles.regionItem, scope === '中国省份' && styles.regionItemActive]}><Text style={[styles.regionText, scope === '中国省份' && styles.regionTextActive]}>中国省份</Text></Pressable>
                {scope === '中国省份' ? provinces.map((item) => { const active = item === province; return <Pressable key={item} onPress={() => setProvince(item)} style={[styles.regionItem, active && styles.regionItemActive]}><Text style={[styles.regionText, active && styles.regionTextActive]}>{item}</Text></Pressable>; }) : null}
                <Pressable onPress={() => setScope('海外城市')} style={[styles.regionItem, scope === '海外城市' && styles.regionItemActive]}><Text style={[styles.regionText, scope === '海外城市' && styles.regionTextActive]}>海外城市</Text></Pressable>
                {scope === '海外城市' ? overseasRegions.map((item) => <View key={item} style={styles.regionHint}><Text style={styles.regionHintText}>{item}</Text></View>) : null}
              </ScrollView>
              <ScrollView style={styles.cityList}>
                {regionCities.map((city) => { const active = city.key === selectedCityKey; return <Pressable key={city.key} onPress={() => { onSelect(city.key); onClose(); }} style={[styles.cityListItem, active && styles.cityListItemActive]}><Text style={[styles.cityListTitle, active && styles.cityListTitleActive]}>{city.label}</Text><Text style={styles.cityListMeta}>{city.province || city.region} · {city.timezone}</Text></Pressable>; })}
              </ScrollView>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
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
  const [cityKey, setCityKey] = useState('beijing');
  const [citySearch, setCitySearch] = useState('');
  const [resultTab, setResultTab] = useState('overview');
  const [cityPickerVisible, setCityPickerVisible] = useState(false);
  const [generatedResult, setGeneratedResult] = useState(() => generateInterpretationPreview(buildInput({ reportType: 'past-life', year: '1994', month: '09', day: '17', hour: '08', minute: '30', cityKey: 'beijing', focus: 'self' })));
  const { width } = useWindowDimensions();
  const isNarrow = width < 980;
  const dayOptions = useMemo(() => getDayOptions(year, month), [year, month]);
  const selectedCity = useMemo(() => CITY_OPTIONS.find((city) => city.key === cityKey) || CITY_OPTIONS[0], [cityKey]);
  const filteredReports = useMemo(() => !reportSearch.trim() ? reportOptions : reportOptions.filter((report) => `${report.title} ${report.intro}`.toLowerCase().includes(reportSearch.trim().toLowerCase())), [reportSearch]);
  const activeReport = useMemo(() => reportOptions.find((item) => item.key === reportType) || reportOptions[0], [reportType]);
  const onReportChange = (report) => { setReportType(report.key); setFocus(report.focus); };
  const onGenerate = () => { setGeneratedResult(generateInterpretationPreview(buildInput({ reportType, year, month, day, hour, minute, cityKey, focus }))); setActivePage('reports'); setResultTab('overview'); };

  return (
    <>
      <CityPickerModal visible={cityPickerVisible} onClose={() => setCityPickerVisible(false)} selectedCityKey={cityKey} onSelect={setCityKey} />
      <ScrollView style={styles.page} contentContainerStyle={styles.content}>
        <View style={styles.shell}>
          <View style={styles.topNav}>
            <View><Text style={styles.brandTitle}>MingSky Astrology</Text><Text style={styles.brandSubtitle}>明空星占</Text></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navRow}>
              {navItems.map((item) => { const active = item.key === activePage; return <Pressable key={item.key} onPress={() => setActivePage(item.key)} style={[styles.navTab, active && styles.navTabActive]}><Text style={[styles.navText, active && styles.navTextActive]}>{item.label}</Text><Text style={[styles.navSub, active && styles.navTextActive]}>{item.sub}</Text></Pressable>; })}
            </ScrollView>
          </View>

          {activePage === 'home' ? (
            <>
              <View style={styles.heroBand}>
                <ImageBackground source={require('../../assets/splash.png')} resizeMode="cover" imageStyle={styles.heroImage} style={styles.heroWrap}>
                  <View style={styles.heroOverlay}>
                    <Text style={styles.heroEyebrow}>MingSky Reports</Text>
                    <Text style={styles.heroTitle}>把五个主栏目固定在首页顶部，再把热门报告摆到第一屏。</Text>
                    <Text style={styles.heroBody}>用户先看到前世报告、性格报告、关系报告等关键入口，再进入滚轴式出生信息填写，整体更像正式 APP。</Text>
                    <View style={styles.heroActions}>
                      <Pressable style={styles.primaryCompact} onPress={() => setActivePage('reports')}><Text style={styles.primaryText}>开始生成</Text></Pressable>
                      <Pressable style={styles.secondaryBtn} onPress={() => setActivePage('pricing')}><Text style={styles.secondaryText}>查看会员</Text></Pressable>
                    </View>
                  </View>
                </ImageBackground>
              </View>
              <View style={styles.section}>
                <View style={[styles.homeIntake, isNarrow && styles.workspaceStack]}>
                  <View style={styles.homeIntakeText}>
                    <Text style={styles.sectionEyebrow}>Quick Start</Text>
                    <Text style={styles.sectionTitle}>首页直接输入出生日期与城市，再进入完整报告。</Text>
                    <Text style={styles.sectionBody}>先在首页完成出生日期、出生时间和出生城市选择，生成后直接跳到带星盘结果的报告页。</Text>
                  </View>
                  <View style={styles.homeIntakeForm}>
                    <Text style={styles.label}>出生年 / 月 / 日 / 时 / 分</Text>
                    <BirthMomentRow year={year} month={month} day={day} hour={hour} minute={minute} setYear={setYear} setMonth={setMonth} setDay={setDay} setHour={setHour} setMinute={setMinute} dayOptions={dayOptions} />
                    <Text style={styles.label}>出生城市</Text>
                    <InlineCitySelector selectedCity={selectedCity} search={citySearch} onChangeSearch={setCitySearch} onSelectCity={setCityKey} onOpenLibrary={() => setCityPickerVisible(true)} />
                    <Pressable style={styles.primaryBtn} onPress={onGenerate}><Text style={styles.primaryText}>生成解读</Text></Pressable>
                  </View>
                </View>
                <Text style={styles.sectionEyebrow}>Featured Reports</Text>
                <Text style={styles.sectionTitle}>首页先展示真正吸引人的报告</Text>
                <View style={styles.grid}>{homeCards.map((item) => <View key={item[0]} style={styles.card}><Text style={styles.cardTitle}>{item[0]}</Text><Text style={styles.cardBody}>{item[1]}</Text></View>)}</View>
              </View>
            </>
          ) : null}

          {activePage === 'reports' ? (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionEyebrow}>Reports</Text>
                <Text style={styles.sectionTitle}>报告选择 + 滚轴式输入 + 城市选择器</Text>
                <TextInput value={reportSearch} onChangeText={setReportSearch} style={styles.searchInput} placeholder="搜索报告：前世 / 性格 / 关系 / 财富" placeholderTextColor="#72857d" />
                <View style={styles.grid}>{filteredReports.map((report) => <ReportCard key={report.key} report={report} active={report.key === reportType} onPress={() => onReportChange(report)} />)}</View>
              </View>
              <View style={[styles.workspace, isNarrow && styles.workspaceStack]}>
                <View style={styles.formPanel}>
                  <Text style={styles.panelTitle}>出生信息</Text>
                  <Text style={styles.panelBody}>出生日期和出生时间都改成滚轴式选择，出生城市则用“搜索 + 左右两栏”的方式。</Text>
                  <Text style={styles.label}>当前报告</Text>
                  <Text style={styles.activeText}>{activeReport.title}</Text>
                  <Text style={styles.label}>出生年 / 月 / 日 / 时 / 分</Text>
                  <BirthMomentRow year={year} month={month} day={day} hour={hour} minute={minute} setYear={setYear} setMonth={setMonth} setDay={setDay} setHour={setHour} setMinute={setMinute} dayOptions={dayOptions} />
                  <Text style={styles.label}>出生城市</Text>
                  <InlineCitySelector selectedCity={selectedCity} search={citySearch} onChangeSearch={setCitySearch} onSelectCity={setCityKey} onOpenLibrary={() => setCityPickerVisible(true)} />
                  <Text style={styles.label}>先看哪条主线</Text>
                  <View style={styles.focusWrap}>{focusOptions.map((option) => { const active = option.key === focus; return <Pressable key={option.key} onPress={() => setFocus(option.key)} style={[styles.focusChip, active && styles.focusChipActive]}><Text style={[styles.focusText, active && styles.focusTextActive]}>{option.label}</Text></Pressable>; })}</View>
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
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.resultTabRow}>
                    {resultTabs.map((tab) => { const active = resultTab === tab.key; return <Pressable key={tab.key} onPress={() => setResultTab(tab.key)} style={[styles.resultTab, active && styles.resultTabActive]}><Text style={[styles.resultTabText, active && styles.resultTabTextActive]}>{tab.label}</Text></Pressable>; })}
                  </ScrollView>
                  {resultTab === 'overview' ? <View style={styles.resultCard}><Text style={styles.boxTitle}>本次先看这三张结果卡</Text><View style={styles.moduleGrid}>{generatedResult.reportModules.map((item) => <View key={item.key} style={styles.moduleCard}><Text style={styles.moduleTitle}>{item.title}</Text><Text style={styles.moduleBody}>{item.body}</Text></View>)}</View>{generatedResult.insights.map((insight) => <View key={insight.code} style={styles.miniCard}><Text style={styles.miniTitle}>{insight.title}</Text><Text style={styles.miniBody}>{insight.body}</Text></View>)}<View style={styles.engineNote}><Text style={styles.engineTitle}>Engine</Text><Text style={styles.engineBody}>{ENGINE_INFO.id} · {ENGINE_INFO.version} · {ENGINE_INFO.license} · {ENGINE_INFO.author}</Text></View></View> : null}
                  {resultTab === 'report' ? <View style={styles.resultCard}><View style={styles.reportCover}><Text style={styles.reportCoverEyebrow}>{generatedResult.reportTitle}</Text><Text style={styles.reportCoverTitle}>{generatedResult.headline}</Text><Text style={styles.reportCoverBody}>{generatedResult.summary}</Text><View style={styles.reportCoverMetaRow}><View style={styles.reportMetaChip}><Text style={styles.reportMetaChipText}>{generatedResult.chartMeta.date}</Text></View><View style={styles.reportMetaChip}><Text style={styles.reportMetaChipText}>{generatedResult.chartMeta.time}</Text></View><View style={styles.reportMetaChip}><Text style={styles.reportMetaChipText}>{generatedResult.chartMeta.city}</Text></View></View></View><View style={styles.reportToc}><Text style={styles.reportTocTitle}>章节目录</Text><View style={styles.sectionRail}>{generatedResult.detailSections.map((section, index) => <View key={`${section.title}-${index}`} style={styles.sectionPill}><Text style={styles.sectionPillNumber}>{index + 1}</Text><Text style={styles.sectionPillText}>{section.title}</Text></View>)}</View></View><View style={styles.reportBodyWrap}>{generatedResult.detailSections.map((section, index) => <View key={section.title} style={styles.reportSectionCard}><Text style={styles.reportSectionIndex}>Chapter {index + 1}</Text><Text style={styles.reportSectionTitle}>{section.title}</Text><Text style={styles.reportSectionLead}>{generatedResult.insights[index]?.title || generatedResult.tags[index]?.label || '当前章节会展开这一条主轴。'}</Text><Text style={styles.reportSectionBody}>{section.body}</Text>{generatedResult.actionItems[index] ? <View style={styles.reportCallout}><Text style={styles.reportCalloutLabel}>本章落点</Text><Text style={styles.reportCalloutText}>{generatedResult.actionItems[index]}</Text></View> : null}</View>)}</View></View> : null}
                  {resultTab === 'chart' ? <View style={styles.resultCard}><Text style={styles.boxTitle}>真实盘面概览</Text><View style={[styles.chartRow, isNarrow && styles.workspaceStack]}><ChartWheel chartVisual={generatedResult.chartVisual} /><View style={styles.planetTable}>{generatedResult.chartVisual.planets.map((planet) => <View key={planet.code} style={styles.planetRow}><Text style={styles.planetName}>{planet.symbol} {planet.label}</Text><Text style={styles.planetPos}>{planet.position}</Text><Text style={styles.planetMeta}>{planet.house} · {planet.motion}</Text></View>)}</View></View></View> : null}
                  {resultTab === 'themes' ? <View style={styles.resultCard}><Text style={styles.boxTitle}>结构化主题</Text><View style={styles.tagWrap}>{generatedResult.tags.map((tag) => <View key={tag.code} style={styles.tag}><Text style={styles.tagText}>{tag.label}</Text></View>)}</View><View style={styles.innerCard}><Text style={styles.boxTitle}>证据与关键相位</Text>{generatedResult.evidence.map((item) => <View key={item.code} style={styles.detailRow}><Text style={styles.detailTitle}>{item.label}</Text><Text style={styles.detailBody}>{item.system}</Text></View>)}{generatedResult.chartVisual.aspects.map((aspect) => <View key={aspect.code} style={styles.detailRow}><Text style={styles.detailTitle}>{aspect.label}</Text><Text style={styles.detailBody}>Orb {aspect.orb}</Text></View>)}</View></View> : null}
                  {resultTab === 'plan' ? <View style={styles.resultCard}><Text style={styles.boxTitle}>下一步行动</Text>{generatedResult.actionItems.map((item, index) => <View key={`${item}-${index}`} style={styles.actionRow}><View style={styles.actionIndex}><Text style={styles.actionIndexText}>{index + 1}</Text></View><Text style={styles.actionText}>{item}</Text></View>)}</View> : null}
                </View>
              </View>
            </>
          ) : null}

          {activePage === 'tools' ? <View style={styles.simplePage}><Text style={styles.sectionEyebrow}>Tools</Text><Text style={styles.sectionTitle}>工具页</Text></View> : null}
          {activePage === 'pricing' ? <View style={styles.simplePage}><Text style={styles.sectionEyebrow}>Pricing</Text><Text style={styles.sectionTitle}>定价页</Text></View> : null}
          {activePage === 'account' ? <View style={styles.simplePage}><Text style={styles.sectionEyebrow}>Account</Text><Text style={styles.sectionTitle}>登录 / 注册</Text></View> : null}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#edf2ee' }, content: { paddingBottom: 36 }, shell: { width: '100%' }, rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  topNav: { position: 'sticky', top: 0, zIndex: 30, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10, gap: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(17,39,34,0.08)', backgroundColor: 'rgba(237,242,238,0.97)' }, brandTitle: { color: '#112722', fontSize: 24, lineHeight: 28, fontWeight: '800' }, brandSubtitle: { color: '#61776d', fontSize: 14, lineHeight: 18, fontWeight: '700' }, navRow: { gap: 10, paddingRight: 20 }, navTab: { width: 100, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(17,39,34,0.12)', backgroundColor: '#fff', alignItems: 'center' }, navTabActive: { backgroundColor: '#112722', borderColor: '#112722' }, navText: { color: '#1f342d', fontSize: 14, lineHeight: 18, fontWeight: '800' }, navSub: { marginTop: 2, color: '#70837c', fontSize: 11, lineHeight: 14, fontWeight: '700' }, navTextActive: { color: '#f7faf8' },
  heroBand: { paddingHorizontal: 20, paddingTop: 8 }, heroWrap: { minHeight: 320, justifyContent: 'flex-end' }, heroImage: { borderRadius: 8 }, heroOverlay: { borderRadius: 8, paddingHorizontal: 24, paddingVertical: 28, backgroundColor: 'rgba(10,20,22,0.58)' }, heroEyebrow: { color: '#e7c36c', fontSize: 13, lineHeight: 18, fontWeight: '800' }, heroTitle: { marginTop: 10, color: '#f7faf8', fontSize: 34, lineHeight: 40, fontWeight: '800', maxWidth: 760 }, heroBody: { marginTop: 12, color: 'rgba(247,250,248,0.88)', fontSize: 16, lineHeight: 24, maxWidth: 760 }, heroActions: { marginTop: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, primaryCompact: { minWidth: 132, height: 46, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#c9893f', paddingHorizontal: 20 }, primaryBtn: { marginTop: 22, height: 54, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#c9893f' }, primaryText: { color: '#fffaf3', fontSize: 16, lineHeight: 20, fontWeight: '800' }, secondaryBtn: { minWidth: 132, height: 46, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(17,39,34,0.12)' }, secondaryText: { color: '#17362f', fontSize: 15, lineHeight: 18, fontWeight: '800' },
  section: { paddingHorizontal: 20, paddingTop: 24 }, sectionEyebrow: { color: '#516b62', fontSize: 12, lineHeight: 16, fontWeight: '800', textTransform: 'uppercase' }, sectionTitle: { marginTop: 6, color: '#17221d', fontSize: 28, lineHeight: 34, fontWeight: '800', maxWidth: 760 }, sectionBody: { marginTop: 10, color: '#5a6b64', fontSize: 15, lineHeight: 22, maxWidth: 640 }, homeIntake: { marginBottom: 18, flexDirection: 'row', gap: 18, alignItems: 'flex-start', borderRadius: 8, backgroundColor: '#fbfdfc', borderWidth: 1, borderColor: 'rgba(23,34,29,0.1)', padding: 18 }, homeIntakeText: { flex: 1, minWidth: 240 }, homeIntakeForm: { flex: 1.1, minWidth: 300 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 14 }, card: { minWidth: 240, flexGrow: 1, flexBasis: 240, borderRadius: 8, backgroundColor: '#fbfdfc', borderWidth: 1, borderColor: 'rgba(23,34,29,0.1)', padding: 18 }, cardTitle: { color: '#17221d', fontSize: 20, lineHeight: 24, fontWeight: '800' }, cardBody: { marginTop: 10, color: '#5a6b64', fontSize: 15, lineHeight: 22 },
  searchInput: { marginTop: 14, height: 52, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(23,34,29,0.14)', backgroundColor: '#fff', paddingHorizontal: 16, color: '#17221d', fontSize: 15, maxWidth: 420 }, reportCard: { minWidth: 220, flexGrow: 1, flexBasis: 220, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(23,34,29,0.1)', backgroundColor: '#f8fbf9', padding: 18 }, reportCardFeatured: { backgroundColor: '#112722', borderColor: '#112722' }, reportCardActive: { borderColor: '#d69a3b', borderWidth: 2 }, reportTitle: { color: '#17221d', fontSize: 19, lineHeight: 24, fontWeight: '800' }, reportTitleFeatured: { color: '#f7faf8' }, badge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: '#d69a3b', color: '#fffaf1', fontSize: 11, fontWeight: '800' }, reportBody: { marginTop: 14, color: '#51615a', fontSize: 14, lineHeight: 20 }, reportBodyFeatured: { color: 'rgba(247,250,248,0.84)' },
  workspace: { flexDirection: 'row', gap: 22, paddingHorizontal: 20, paddingTop: 24 }, workspaceStack: { flexDirection: 'column' }, formPanel: { flex: 0.96, minWidth: 320, borderRadius: 8, backgroundColor: '#fbfdfc', padding: 18, borderWidth: 1, borderColor: 'rgba(23,34,29,0.1)' }, panelTitle: { color: '#17221d', fontSize: 28, lineHeight: 34, fontWeight: '800' }, panelBody: { marginTop: 8, color: '#5a6b64', fontSize: 15, lineHeight: 22 }, label: { marginTop: 18, color: '#2a3732', fontSize: 13, lineHeight: 18, fontWeight: '700' }, activeText: { marginTop: 8, color: '#17362f', fontSize: 16, lineHeight: 22, fontWeight: '800' },
  wheelRow: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, birthMomentRow: { marginTop: 10, gap: 10, paddingRight: 12 }, wheelColumn: { gap: 8 }, wheelLabel: { color: '#5a6b64', fontSize: 12, lineHeight: 16, fontWeight: '700' }, wheelShell: { position: 'relative' }, wheelViewport: { height: 192, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(23,34,29,0.12)', backgroundColor: '#fff' }, wheelContent: { paddingVertical: 52 }, wheelItem: { minHeight: 42, alignItems: 'center', justifyContent: 'center', marginHorizontal: 8, marginVertical: 4, borderRadius: 8 }, wheelItemActive: { backgroundColor: '#17362f' }, wheelText: { color: '#264038', fontSize: 15, lineHeight: 18, fontWeight: '700' }, wheelTextActive: { color: '#f7faf8' }, wheelSelectionBand: { position: 'absolute', left: 6, right: 6, top: 73, height: 46, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(201,137,63,0.42)', backgroundColor: 'rgba(201,137,63,0.08)' }, wheelFadeTop: { position: 'absolute', left: 1, right: 1, top: 1, height: 38, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: 'rgba(251,253,252,0.82)' }, wheelFadeBottom: { position: 'absolute', left: 1, right: 1, bottom: 1, height: 38, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, backgroundColor: 'rgba(251,253,252,0.82)' },
  cityInlineWrap: { marginTop: 10, gap: 10 }, citySearchInput: { height: 50, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(23,34,29,0.14)', backgroundColor: '#fff', paddingHorizontal: 14, color: '#17221d', fontSize: 15 }, cityCurrentRow: { minHeight: 60, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(23,34,29,0.1)', backgroundColor: '#f6faf8', paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }, cityCurrentTitle: { color: '#17221d', fontSize: 16, lineHeight: 20, fontWeight: '800' }, cityCurrentMeta: { marginTop: 4, color: '#72857d', fontSize: 12, lineHeight: 16, fontWeight: '700' }, cityLibraryBtn: { borderRadius: 8, backgroundColor: '#17362f', paddingHorizontal: 12, paddingVertical: 9 }, cityLibraryBtnText: { color: '#f7faf8', fontSize: 12, lineHeight: 16, fontWeight: '800' }, cityQuickList: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, cityQuickItem: { minWidth: 92, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(23,34,29,0.1)', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10 }, cityQuickItemActive: { backgroundColor: '#17362f', borderColor: '#17362f' }, cityQuickTitle: { color: '#17221d', fontSize: 13, lineHeight: 16, fontWeight: '800' }, cityQuickTitleActive: { color: '#f7faf8' }, cityQuickMeta: { marginTop: 4, color: '#72857d', fontSize: 11, lineHeight: 14, fontWeight: '700' },
  focusWrap: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, focusChip: { borderRadius: 8, borderWidth: 1, borderColor: 'rgba(23,34,29,0.14)', backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 10 }, focusChipActive: { backgroundColor: '#17362f', borderColor: '#17362f' }, focusText: { color: '#264038', fontSize: 14, lineHeight: 18, fontWeight: '700' }, focusTextActive: { color: '#f5faf7' },
  resultPanel: { flex: 1.2, minWidth: 320, gap: 16 }, resultHero: { borderRadius: 8, backgroundColor: '#fbfdfc', borderWidth: 1, borderColor: 'rgba(23,34,29,0.1)', padding: 18 }, resultEyebrow: { color: '#6a7f76', fontSize: 12, lineHeight: 16, fontWeight: '800', textTransform: 'uppercase' }, resultTitle: { marginTop: 8, color: '#17221d', fontSize: 26, lineHeight: 32, fontWeight: '800' }, resultBody: { marginTop: 10, color: '#5a6b64', fontSize: 15, lineHeight: 22 }, resultMeta: { marginTop: 12, color: '#7c8f87', fontSize: 13, lineHeight: 18, fontWeight: '700' }, metricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, metric: { flex: 1, minWidth: 150, borderRadius: 8, backgroundColor: '#fbfdfc', borderWidth: 1, borderColor: 'rgba(23,34,29,0.1)', padding: 16 }, metricValue: { color: '#17221d', fontSize: 34, lineHeight: 38, fontWeight: '800' }, metricLabel: { marginTop: 8, color: '#5a6b64', fontSize: 14, lineHeight: 20, fontWeight: '700' }, resultTabRow: { gap: 10, paddingRight: 20 }, resultTab: { borderRadius: 8, borderWidth: 1, borderColor: 'rgba(23,34,29,0.12)', backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 10 }, resultTabActive: { backgroundColor: '#17362f', borderColor: '#17362f' }, resultTabText: { color: '#264038', fontSize: 14, lineHeight: 18, fontWeight: '800' }, resultTabTextActive: { color: '#f7faf8' },
  resultCard: { borderRadius: 8, backgroundColor: '#fbfdfc', borderWidth: 1, borderColor: 'rgba(23,34,29,0.1)', padding: 18 }, innerCard: { marginTop: 16, borderRadius: 8, backgroundColor: '#f6faf8', borderWidth: 1, borderColor: 'rgba(23,34,29,0.08)', padding: 14 }, boxTitle: { color: '#17221d', fontSize: 18, lineHeight: 24, fontWeight: '800' }, chartRow: { marginTop: 16, flexDirection: 'row', gap: 18, alignItems: 'center' },
  wheel: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafcfb', borderWidth: 1, borderColor: 'rgba(23,34,29,0.08)' }, wheelOuter: { position: 'absolute', borderWidth: 16, borderColor: '#263f38' }, wheelInner: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(23,34,29,0.18)' }, wheelSign: { position: 'absolute', color: '#17362f', fontSize: 12, lineHeight: 14, fontWeight: '800' }, houseDot: { position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(23,34,29,0.12)' }, houseDotText: { color: '#17362f', fontSize: 12, lineHeight: 14, fontWeight: '800' }, planetDot: { position: 'absolute', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, planetDotText: { color: '#fff', fontSize: 16, lineHeight: 18, fontWeight: '800' }, planetTable: { flex: 1, minWidth: 250, gap: 10 }, planetRow: { borderRadius: 8, backgroundColor: '#f6faf8', borderWidth: 1, borderColor: 'rgba(23,34,29,0.08)', padding: 12 }, planetName: { color: '#17221d', fontSize: 15, lineHeight: 18, fontWeight: '800' }, planetPos: { marginTop: 6, color: '#264038', fontSize: 14, lineHeight: 18, fontWeight: '700' }, planetMeta: { marginTop: 4, color: '#70837c', fontSize: 12, lineHeight: 16, fontWeight: '700' },
  miniCard: { marginTop: 14, borderRadius: 8, backgroundColor: '#f6faf8', borderWidth: 1, borderColor: 'rgba(23,34,29,0.08)', padding: 14 }, miniTitle: { color: '#17221d', fontSize: 18, lineHeight: 24, fontWeight: '800' }, miniBody: { marginTop: 8, color: '#5a6b64', fontSize: 15, lineHeight: 22 }, moduleGrid: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, moduleCard: { flexGrow: 1, flexBasis: 180, minWidth: 180, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(23,34,29,0.08)', backgroundColor: '#f6faf8', padding: 14 }, moduleTitle: { color: '#17221d', fontSize: 15, lineHeight: 18, fontWeight: '800' }, moduleBody: { marginTop: 8, color: '#5a6b64', fontSize: 14, lineHeight: 20 }, reportCover: { borderRadius: 8, padding: 22, backgroundColor: '#112722' }, reportCoverEyebrow: { color: '#e7c36c', fontSize: 12, lineHeight: 16, fontWeight: '800', textTransform: 'uppercase' }, reportCoverTitle: { marginTop: 10, color: '#f7faf8', fontSize: 30, lineHeight: 36, fontWeight: '800', maxWidth: 760 }, reportCoverBody: { marginTop: 12, color: 'rgba(247,250,248,0.88)', fontSize: 15, lineHeight: 24, maxWidth: 760 }, reportCoverMetaRow: { marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, reportMetaChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(247,250,248,0.12)', borderWidth: 1, borderColor: 'rgba(247,250,248,0.18)' }, reportMetaChipText: { color: '#f7faf8', fontSize: 13, lineHeight: 16, fontWeight: '700' }, reportToc: { marginTop: 16, borderRadius: 8, backgroundColor: '#f6faf8', borderWidth: 1, borderColor: 'rgba(23,34,29,0.08)', padding: 16 }, reportTocTitle: { color: '#17221d', fontSize: 17, lineHeight: 22, fontWeight: '800' }, sectionRail: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, sectionPill: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#eef3ef', borderWidth: 1, borderColor: 'rgba(23,34,29,0.08)' }, sectionPillNumber: { color: '#17362f', fontSize: 12, lineHeight: 14, fontWeight: '800' }, sectionPillText: { color: '#20312a', fontSize: 13, lineHeight: 16, fontWeight: '700' }, reportBodyWrap: { marginTop: 6, gap: 14 }, reportSectionCard: { marginTop: 14, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(23,34,29,0.08)', backgroundColor: '#f8fbf9', padding: 18 }, reportSectionIndex: { color: '#70837c', fontSize: 12, lineHeight: 16, fontWeight: '800', textTransform: 'uppercase' }, reportSectionTitle: { marginTop: 8, color: '#17221d', fontSize: 22, lineHeight: 28, fontWeight: '800' }, reportSectionLead: { marginTop: 10, color: '#17362f', fontSize: 15, lineHeight: 22, fontWeight: '700' }, reportSectionBody: { marginTop: 10, color: '#5a6b64', fontSize: 15, lineHeight: 24 }, reportCallout: { marginTop: 14, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(201,137,63,0.22)', backgroundColor: '#fff9f1', padding: 14 }, reportCalloutLabel: { color: '#a36b24', fontSize: 12, lineHeight: 16, fontWeight: '800', textTransform: 'uppercase' }, reportCalloutText: { marginTop: 8, color: '#6a4a21', fontSize: 14, lineHeight: 21, fontWeight: '600' }, actionRow: { marginTop: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 8, backgroundColor: '#f6faf8', borderWidth: 1, borderColor: 'rgba(23,34,29,0.08)', padding: 14 }, actionIndex: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#17362f', alignItems: 'center', justifyContent: 'center' }, actionIndexText: { color: '#f7faf8', fontSize: 13, lineHeight: 16, fontWeight: '800' }, actionText: { flex: 1, color: '#20312a', fontSize: 15, lineHeight: 22, fontWeight: '600' }, engineNote: { marginTop: 16, borderRadius: 8, backgroundColor: '#eef3ef', borderWidth: 1, borderColor: 'rgba(23,34,29,0.08)', padding: 14 }, engineTitle: { color: '#17221d', fontSize: 15, lineHeight: 18, fontWeight: '800' }, engineBody: { marginTop: 6, color: '#5a6b64', fontSize: 13, lineHeight: 18 }, detailRow: { paddingTop: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(23,34,29,0.08)' }, detailTitle: { color: '#17221d', fontSize: 17, lineHeight: 22, fontWeight: '800' }, detailBody: { marginTop: 8, color: '#5a6b64', fontSize: 15, lineHeight: 22 }, tagWrap: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, tag: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#eef3ef', borderWidth: 1, borderColor: 'rgba(23,34,29,0.08)' }, tagText: { color: '#20312a', fontSize: 14, lineHeight: 18, fontWeight: '700' },
  modalScrim: { flex: 1, backgroundColor: 'rgba(9,16,14,0.48)', alignItems: 'center', justifyContent: 'center', padding: 18 }, modalCard: { width: '100%', maxWidth: 860, maxHeight: '88%', borderRadius: 8, backgroundColor: '#fbfdfc', overflow: 'hidden' }, modalHeader: { paddingHorizontal: 18, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(23,34,29,0.08)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, modalTitle: { color: '#17221d', fontSize: 22, lineHeight: 26, fontWeight: '800' }, modalDone: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#eef3ef' }, modalDoneText: { color: '#17362f', fontSize: 14, lineHeight: 18, fontWeight: '800' }, modalSearchWrap: { padding: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(23,34,29,0.08)' }, modalSearchInput: { height: 50, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(23,34,29,0.14)', backgroundColor: '#fff', paddingHorizontal: 14, color: '#17221d', fontSize: 15 }, modalBody: { paddingHorizontal: 18 }, searchRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(23,34,29,0.08)' }, searchRowActive: { backgroundColor: '#f4f8f5' }, searchTitle: { color: '#17221d', fontSize: 15, lineHeight: 18, fontWeight: '800' }, searchTitleActive: { color: '#17362f' }, searchMeta: { marginTop: 4, color: '#72857d', fontSize: 12, lineHeight: 16, fontWeight: '700' }, cityColumns: { flexDirection: 'row', minHeight: 420 }, regionList: { width: 220, borderRightWidth: 1, borderRightColor: 'rgba(23,34,29,0.08)', backgroundColor: '#f3f7f4' }, regionItem: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(23,34,29,0.05)' }, regionItemActive: { backgroundColor: '#17362f' }, regionText: { color: '#264038', fontSize: 14, lineHeight: 18, fontWeight: '700' }, regionTextActive: { color: '#f7faf8' }, regionHint: { paddingHorizontal: 16, paddingVertical: 8 }, regionHintText: { color: '#72857d', fontSize: 12, lineHeight: 16, fontWeight: '700' }, cityList: { flex: 1, paddingHorizontal: 18 }, cityListItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(23,34,29,0.08)' }, cityListItemActive: { backgroundColor: '#f4f8f5' }, cityListTitle: { color: '#17221d', fontSize: 15, lineHeight: 18, fontWeight: '800' }, cityListTitleActive: { color: '#17362f' }, cityListMeta: { marginTop: 4, color: '#72857d', fontSize: 12, lineHeight: 16, fontWeight: '700' },
  simplePage: { paddingHorizontal: 20, paddingTop: 24, gap: 14 },
});
