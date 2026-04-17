import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, ImageBackground, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { CITY_OPTIONS, ENGINE_INFO, generateInterpretationPreview, getBirthFormOptions, getCitySearchText, getDayOptions, getInterpretationFocusOptions, getReportOptions } from './interpretationEngineBridge';

const reportOptions = getReportOptions();
const focusOptions = getInterpretationFocusOptions();
const birthOptions = getBirthFormOptions();
const WHEEL_ITEM_HEIGHT = 48;
const WHEEL_VIEWPORT_HEIGHT = 176;
const WHEEL_VERTICAL_PADDING = (WHEEL_VIEWPORT_HEIGHT - WHEEL_ITEM_HEIGHT) / 2;
const RECENT_CITY_STORAGE_KEY = 'mingsky_recent_cities_v1';
const navItems = [
  { key: 'home', label: '家', sub: 'Home' },
  { key: 'reports', label: '报告', sub: 'Reports' },
  { key: 'tools', label: '工具', sub: 'Tools' },
  { key: 'pricing', label: '定价', sub: 'Pricing' },
  { key: 'account', label: '我的', sub: '登录/注册' },
];
const genderOptions = ['女', '男', '其他'];
const pricingPlans = [
  { key: 'trial', title: '免费试用', price: '¥0', body: '先体验基础信息填写、报告入口浏览与首版解读结果。', cta: '正在使用' },
  { key: 'monthly', title: '明空会员月卡', price: '¥68 / 月', body: '解锁完整长报告、月度更新、关系与财运专题。', cta: '开通月卡' },
  { key: 'yearly', title: '明空会员年卡', price: '¥588 / 年', body: '适合长期跟踪人格、关系与年度节奏变化。', cta: '开通年卡' },
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

function normalizeCityQuery(value) {
  return String(value || '').trim().toLowerCase();
}

function cityMatchesQuery(city, rawQuery) {
  const query = normalizeCityQuery(rawQuery);
  if (!query) return false;
  const haystack = getCitySearchText(city);
  const compactHaystack = haystack.replace(/\s+/g, '');
  const compactQuery = query.replace(/\s+/g, '');
  return haystack.includes(query) || compactHaystack.includes(compactQuery);
}

function readRecentCityKeys() {
  try {
    const storage = globalThis?.localStorage;
    if (!storage) return [];
    const parsed = JSON.parse(storage.getItem(RECENT_CITY_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch (error) {
    return [];
  }
}

function writeRecentCityKeys(keys) {
  try {
    const storage = globalThis?.localStorage;
    if (!storage) return;
    storage.setItem(RECENT_CITY_STORAGE_KEY, JSON.stringify(keys));
  } catch (error) {
    // ignore persistence errors in private mode or restricted environments
  }
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

function WheelColumn({ label, items, selectedValue, onSelect, width = 90 }) {
  const scrollRef = useRef(null);
  const selectedIndex = Math.max(0, items.findIndex((item) => (typeof item === 'string' ? item : item.value) === selectedValue));

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ y: selectedIndex * WHEEL_ITEM_HEIGHT, animated: false });
  }, [selectedIndex]);

  const snapToValue = (event) => {
    const index = Math.round(event.nativeEvent.contentOffset.y / WHEEL_ITEM_HEIGHT);
    const item = items[Math.max(0, Math.min(items.length - 1, index))];
    if (!item) return;
    const value = typeof item === 'string' ? item : item.value;
    if (value !== selectedValue) onSelect(value);
  };

  return (
    <View style={[styles.wheelColumn, { width }]}>
      <Text style={styles.wheelLabel}>{label}</Text>
      <View style={styles.wheelShell}>
        <ScrollView
          ref={scrollRef}
          style={styles.wheelViewport}
          contentContainerStyle={styles.wheelContent}
          showsVerticalScrollIndicator={false}
          snapToInterval={WHEEL_ITEM_HEIGHT}
          decelerationRate="fast"
          nestedScrollEnabled
          onMomentumScrollEnd={snapToValue}
          onScrollEndDrag={snapToValue}
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

function getCityDisplayLabel(city) {
  if (!city) return '';
  return city.nativeLabel ? `${city.nativeLabel} · ${city.label}` : city.label;
}

const MUNICIPALITY_KEYS = new Set(['beijing', 'shanghai', 'tianjin', 'chongqing']);
const CAPITAL_CITY_KEYS = new Set([
  'beijing', 'shanghai', 'tianjin', 'chongqing', 'guangzhou', 'hangzhou', 'nanjing', 'wuhan', 'changsha',
  'chengdu', 'xian', 'zhengzhou', 'jinan', 'haerbin', 'changchun', 'shenyang', 'shijiazhuang', 'taiyuan',
  'hefei', 'fuzhou', 'nanchang', 'nanning', 'haikou', 'kunming', 'guiyang', 'lanzhou', 'xining', 'yinchuan',
  'lhasa', 'urumqi', 'hohhot',
]);

function getCityTierLabel(city) {
  if (!city) return '';
  if (city.region !== 'China') return '海外城市';
  if (MUNICIPALITY_KEYS.has(city.key)) return '直辖市';
  if (CAPITAL_CITY_KEYS.has(city.key)) return '省会城市';
  return '地级市';
}

function formatCoordinate(value, positiveLabel, negativeLabel) {
  const suffix = value >= 0 ? positiveLabel : negativeLabel;
  return `${Math.abs(value).toFixed(2)}°${suffix}`;
}

function getCityDetailLine(city) {
  if (!city) return '';
  return `${getCityTierLabel(city)} · ${city.province || city.region} · ${city.timezone}`;
}

function getCityLocationLine(city) {
  if (!city) return '';
  return `${formatCoordinate(city.latitude, 'N', 'S')} · ${formatCoordinate(city.longitude, 'E', 'W')}`;
}

function getChartLocationLine(chartMeta) {
  if (!chartMeta) return '';
  return `${formatCoordinate(chartMeta.latitude, 'N', 'S')} · ${formatCoordinate(chartMeta.longitude, 'E', 'W')}`;
}

function InlineCitySelector({ selectedCity, search, onChangeSearch, onSelectCity, onOpenLibrary, recentCities }) {
  const searchResults = useMemo(() => search.trim() ? CITY_OPTIONS.filter((city) => cityMatchesQuery(city, search)).slice(0, 8) : [], [search]);
  const quickResults = useMemo(() => {
    if (recentCities?.length) return recentCities.slice(0, 6);
    return CITY_OPTIONS.filter((city) => city.region === 'China').slice(0, 8);
  }, [recentCities]);
  const suggestionTitle = search.trim() ? '联想结果' : '热门城市';
  const suggestionItems = search.trim() ? searchResults : quickResults;

  return (
    <View style={styles.cityInlineWrap}>
      <TextInput
        value={search}
        onChangeText={onChangeSearch}
        style={styles.citySearchInput}
        placeholder="搜索城市：北京 / beijing / bj"
        placeholderTextColor="#72857d"
      />
      {search.trim() ? (
        <View style={styles.citySuggestionPanel}>
          <Text style={styles.citySuggestionLabel}>联想结果</Text>
          {searchResults.length ? searchResults.map((city) => (
            <Pressable key={city.key} style={styles.citySuggestionItem} onPress={() => { onSelectCity(city.key); onChangeSearch(''); }}>
              <View style={styles.citySuggestionTextWrap}>
                <Text style={styles.citySuggestionTitle}>{getCityDisplayLabel(city)}</Text>
                <Text style={styles.citySuggestionMeta}>{getCityTierLabel(city)} · {city.province || city.region}</Text>
              </View>
              <Text style={styles.citySuggestionAction}>选择</Text>
            </Pressable>
          )) : (
            <View style={styles.citySuggestionEmpty}>
              <Text style={styles.citySuggestionEmptyText}>没有找到匹配城市，试试中文、拼音全拼或首字母。</Text>
            </View>
          )}
        </View>
      ) : null}
      <View style={styles.cityCurrentRow}>
        <View>
          <Text style={styles.cityCurrentTitle}>{getCityDisplayLabel(selectedCity)}</Text>
          <Text style={styles.cityCurrentMeta}>{getCityDetailLine(selectedCity)}</Text>
          <Text style={styles.cityCurrentMetaSub}>{getCityLocationLine(selectedCity)}</Text>
        </View>
        <Pressable style={styles.cityLibraryBtn} onPress={onOpenLibrary}>
          <Text style={styles.cityLibraryBtnText}>更多城市</Text>
        </Pressable>
      </View>
      {recentCities?.length ? (
        <View style={styles.cityRecentWrap}>
          <Text style={styles.cityRecentLabel}>最近使用</Text>
          <View style={styles.cityRecentRow}>
            {recentCities.slice(0, 6).map((city) => {
              const active = city.key === selectedCity.key;
              return (
                <Pressable key={`recent-${city.key}`} style={[styles.cityRecentChip, active && styles.cityRecentChipActive]} onPress={() => onSelectCity(city.key)}>
                  <Text style={[styles.cityRecentChipText, active && styles.cityRecentChipTextActive]}>{city.nativeLabel || city.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
      <Text style={styles.citySuggestionLabel}>{suggestionTitle}</Text>
      <View style={styles.cityQuickList}>
        {suggestionItems.map((city) => {
          const active = city.key === selectedCity.key;
          return (
            <Pressable key={city.key} style={[styles.cityQuickItem, active && styles.cityQuickItemActive]} onPress={() => { onSelectCity(city.key); onChangeSearch(''); }}>
              <Text style={[styles.cityQuickTitle, active && styles.cityQuickTitleActive]}>{getCityDisplayLabel(city)}</Text>
              <Text style={[styles.cityQuickMeta, active && styles.cityQuickMetaActive]}>{getCityTierLabel(city)} · {city.province || city.region}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function BirthMomentRow({ year, month, day, hour, minute, setYear, setMonth, setDay, setHour, setMinute, dayOptions }) {
  return (
    <View style={styles.birthMomentWrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.birthMomentRow}>
        <WheelColumn label="年" items={birthOptions.years} selectedValue={year} onSelect={setYear} width={92} />
        <WheelColumn label="月" items={birthOptions.months} selectedValue={month} onSelect={setMonth} width={74} />
        <WheelColumn label="日" items={dayOptions} selectedValue={day} onSelect={setDay} width={74} />
        <WheelColumn label="时" items={birthOptions.hours} selectedValue={hour} onSelect={setHour} width={74} />
        <WheelColumn label="分" items={birthOptions.minutes} selectedValue={minute} onSelect={setMinute} width={74} />
      </ScrollView>
    </View>
  );
}

function AccountField({ label, children }) {
  return (
    <View style={styles.accountField}>
      <Text style={styles.accountLabel}>{label}</Text>
      {children}
    </View>
  );
}

function CityPickerModal({ visible, onClose, selectedCityKey, onSelect }) {
  const [search, setSearch] = useState('');
  const selectedCity = useMemo(() => CITY_OPTIONS.find((city) => city.key === selectedCityKey) || CITY_OPTIONS[0], [selectedCityKey]);
  const [scope, setScope] = useState('中国省份');
  const [province, setProvince] = useState('北京市');
  const [overseasRegion, setOverseasRegion] = useState('Australia');
  const provinces = useMemo(() => [...new Set(CITY_OPTIONS.filter((city) => city.region === 'China').map((city) => city.province).filter(Boolean))], []);
  const overseasRegions = useMemo(() => [...new Set(CITY_OPTIONS.filter((city) => city.region !== 'China').map((city) => city.region))], []);
  const searchResults = useMemo(() => search.trim() ? CITY_OPTIONS.filter((city) => cityMatchesQuery(city, search)) : [], [search]);
  const hasSearch = Boolean(search.trim());
  const regionCities = useMemo(() => {
    if (scope === '海外城市') return CITY_OPTIONS.filter((city) => city.region === overseasRegion);
    return CITY_OPTIONS.filter((city) => city.region === 'China' && city.province === province);
  }, [overseasRegion, province, scope]);
  const displayCities = hasSearch ? searchResults : regionCities;
  const cityPaneTitle = hasSearch ? '快速搜索结果' : scope === '海外城市' ? overseasRegion : '地级市';
  const cityPaneMeta = hasSearch
    ? `${displayCities.length} 个匹配`
    : scope === '海外城市'
      ? `${overseasRegion} · ${displayCities.length} 个城市`
      : `${province} · ${displayCities.length} 个城市`;
  useEffect(() => {
    if (selectedCity.region === 'China' && selectedCity.province) {
      setScope('中国省份');
      setProvince(selectedCity.province);
    }
    if (selectedCity.region !== 'China') {
      setScope('海外城市');
      setOverseasRegion(selectedCity.region);
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
          <View style={styles.modalSearchWrap}><TextInput value={search} onChangeText={setSearch} placeholder="中文 / 拼音 / 首字母：北京、beijing、bj" placeholderTextColor="#72857d" style={styles.modalSearchInput} /></View>
          <View style={styles.cityModeHint}>
            <Text style={styles.cityModeText}>支持三种方式同时使用：左侧省份导航、右侧地级市列表、顶部快速搜索。</Text>
          </View>
          <View style={styles.cityColumns}>
            <ScrollView style={styles.regionList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              <Pressable onPress={() => setScope('中国省份')} style={[styles.regionItem, scope === '中国省份' && styles.regionItemActive]}><Text style={[styles.regionText, scope === '中国省份' && styles.regionTextActive]}>中国省份</Text></Pressable>
              {scope === '中国省份' ? provinces.map((item) => { const active = item === province; const cityCount = CITY_OPTIONS.filter((city) => city.region === 'China' && city.province === item).length; return <Pressable key={item} onPress={() => setProvince(item)} style={[styles.regionItem, active && styles.regionItemActive]}><Text style={[styles.regionText, active && styles.regionTextActive]}>{item}</Text><Text style={[styles.regionCount, active && styles.regionCountActive]}>{cityCount} 城</Text></Pressable>; }) : null}
              <Pressable onPress={() => setScope('海外城市')} style={[styles.regionItem, scope === '海外城市' && styles.regionItemActive]}><Text style={[styles.regionText, scope === '海外城市' && styles.regionTextActive]}>海外城市</Text></Pressable>
              {scope === '海外城市' ? overseasRegions.map((item) => { const active = item === overseasRegion; const cityCount = CITY_OPTIONS.filter((city) => city.region === item).length; return <Pressable key={item} onPress={() => setOverseasRegion(item)} style={[styles.regionItem, active && styles.regionItemActive]}><Text style={[styles.regionText, active && styles.regionTextActive]}>{item}</Text><Text style={[styles.regionCount, active && styles.regionCountActive]}>{cityCount} 城</Text></Pressable>; }) : null}
            </ScrollView>
            <ScrollView style={styles.cityList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              <View style={styles.cityPaneHeader}>
                <Text style={styles.cityPaneTitle}>{cityPaneTitle}</Text>
                <Text style={styles.cityPaneMeta}>{cityPaneMeta}</Text>
              </View>
              {displayCities.length ? displayCities.map((city) => {
                const active = city.key === selectedCityKey;
                return <Pressable key={city.key} onPress={() => { onSelect(city.key); if (city.region === 'China' && city.province) { setScope('中国省份'); setProvince(city.province); } else { setScope('海外城市'); setOverseasRegion(city.region); } setSearch(''); onClose(); }} style={[styles.cityListItem, active && styles.cityListItemActive]}><Text style={[styles.cityListTitle, active && styles.cityListTitleActive]}>{getCityDisplayLabel(city)}</Text><Text style={[styles.cityListMeta, active && styles.cityListMetaActive]}>{getCityDetailLine(city)}</Text><Text style={[styles.cityListMetaSub, active && styles.cityListMetaSubActive]}>{getCityLocationLine(city)}</Text></Pressable>;
              }) : <View style={styles.cityEmpty}><Text style={styles.cityEmptyText}>没有找到匹配城市，请换一个关键词，或先从左侧省份进入。</Text></View>}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function InterpretationWebApp() {
  const [activePage, setActivePage] = useState('home');
  const [accountMode, setAccountMode] = useState('register');
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
  const [recentCityKeys, setRecentCityKeys] = useState([]);
  const [accountName, setAccountName] = useState('');
  const [accountGender, setAccountGender] = useState('女');
  const [accountPhone, setAccountPhone] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountNotice, setAccountNotice] = useState('');
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [resultTab, setResultTab] = useState('overview');
  const [reportChapterIndex, setReportChapterIndex] = useState(0);
  const [cityPickerVisible, setCityPickerVisible] = useState(false);
  const [generatedResult, setGeneratedResult] = useState(() => generateInterpretationPreview(buildInput({ reportType: 'past-life', year: '1994', month: '09', day: '17', hour: '08', minute: '30', cityKey: 'beijing', focus: 'self' })));
  const { width } = useWindowDimensions();
  const isNarrow = width < 980;
  const dayOptions = useMemo(() => getDayOptions(year, month), [year, month]);
  const selectedCity = useMemo(() => CITY_OPTIONS.find((city) => city.key === cityKey) || CITY_OPTIONS[0], [cityKey]);
  const recentCities = useMemo(() => recentCityKeys.map((key) => CITY_OPTIONS.find((city) => city.key === key)).filter(Boolean), [recentCityKeys]);
  const filteredReports = useMemo(() => !reportSearch.trim() ? reportOptions : reportOptions.filter((report) => `${report.title} ${report.intro}`.toLowerCase().includes(reportSearch.trim().toLowerCase())), [reportSearch]);
  const activeReport = useMemo(() => reportOptions.find((item) => item.key === reportType) || reportOptions[0], [reportType]);
  const reportChapters = useMemo(() => {
    const chartOverviewBody = `本命盘以 ${generatedResult.chartMeta.city} 为观察地点，时区为 ${generatedResult.chartMeta.timezone}，换算后的 UTC 时间为 ${generatedResult.chartMeta.utcTime}。上升点落在 ${generatedResult.chartMeta.ascSign}，因此整份报告的外在节奏、第一印象与宫位展开都会围绕这条轴线展开。`;
    const planetPositionsBody = generatedResult.chartVisual.planets
      .slice(0, 6)
      .map((planet) => `${planet.symbol} ${planet.label} 位于 ${planet.position}，${planet.house}，当前呈现为${planet.motion}。`)
      .join(' ');
    const aspectBody = generatedResult.chartVisual.aspects.length
      ? generatedResult.chartVisual.aspects
        .map((aspect) => `${aspect.label}（容许度 ${aspect.orb}）会把相应主题推到更前台。`)
        .join(' ')
      : '当前结果页没有提取到足够强的主要相位，因此本次解读会更依赖行星落点与宫位主轴。';

    return [
      ...generatedResult.detailSections.map((section) => ({ ...section, kind: 'narrative' })),
      { title: '星盘总览', body: chartOverviewBody, kind: 'chart_overview' },
      { title: '行星位置', body: planetPositionsBody, kind: 'planet_positions' },
      { title: '关键相位', body: aspectBody, kind: 'major_aspects' },
    ];
  }, [generatedResult]);
  const activeChapter = reportChapters[reportChapterIndex] || reportChapters[0];
  useEffect(() => {
    setRecentCityKeys(readRecentCityKeys());
  }, []);
  const onReportChange = (report) => { setReportType(report.key); setFocus(report.focus); setReportChapterIndex(0); };
  const onSelectCity = (nextKey) => {
    setCityKey(nextKey);
    setRecentCityKeys((previous) => {
      const next = [nextKey, ...previous.filter((item) => item !== nextKey)].slice(0, 8);
      writeRecentCityKeys(next);
      return next;
    });
  };
  const onRegister = () => {
    if (!accountName.trim() || !accountGender || !accountPhone.trim() || !accountEmail.trim() || !accountPassword.trim()) {
      setAccountNotice('请先完整填写姓名、性别、出生日期、电话、邮箱和密码。');
      setRegistrationComplete(false);
      return;
    }
    setRegistrationComplete(true);
    setAccountNotice('注册资料已保存，可以继续前往定价页开通会员。');
  };
  const onGenerate = () => { setGeneratedResult(generateInterpretationPreview(buildInput({ reportType, year, month, day, hour, minute, cityKey, focus }))); setActivePage('reports'); setResultTab('overview'); setReportChapterIndex(0); };

  return (
    <>
      <CityPickerModal visible={cityPickerVisible} onClose={() => setCityPickerVisible(false)} selectedCityKey={cityKey} onSelect={onSelectCity} />
      <ScrollView style={styles.page} contentContainerStyle={styles.content}>
        <View style={styles.shell}>
          <View style={styles.topNav}>
            <View style={[styles.topNavInner, isNarrow && styles.topNavInnerMobile]}>
              <View style={styles.topNavMainRow}>
                <View style={styles.brandLockup}>
                  <Image source={require('../../assets/mingsky-logo.png')} style={styles.brandLogo} />
                  <View>
                    <Text style={styles.brandTitle}>MingSky Astrology</Text>
                    <Text style={styles.brandSubtitle}>明空星占</Text>
                  </View>
                </View>
                <Pressable style={[styles.navCta, isNarrow && styles.navCtaMobile]} onPress={() => setActivePage('account')}>
                  <Text style={styles.navCtaText}>登录/注册</Text>
                </Pressable>
              </View>
              {isNarrow ? (
                <View style={styles.navRowMobile}>
                  {navItems.map((item) => {
                    const active = item.key === activePage;
                    return <Pressable key={item.key} onPress={() => setActivePage(item.key)} style={[styles.navTab, styles.navTabMobile, active && styles.navTabMobileActive]}><Text style={[styles.navText, styles.navTextMobile, active && styles.navTextActive]}>{item.label}</Text></Pressable>;
                  })}
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navRow}>
                  {navItems.map((item) => { const active = item.key === activePage; return <Pressable key={item.key} onPress={() => setActivePage(item.key)} style={styles.navTab}><Text style={[styles.navText, active && styles.navTextActive]}>{item.label}</Text><Text style={[styles.navSub, active && styles.navSubActive]}>{item.sub}</Text></Pressable>; })}
                </ScrollView>
              )}
            </View>
          </View>

          {activePage === 'home' ? (
            <>
              <View style={styles.heroBand}>
                <ImageBackground source={require('../../assets/mingsky-logo.png')} resizeMode="cover" imageStyle={styles.heroImage} style={[styles.heroWrap, isNarrow && styles.heroWrapMobile]}>
                  <View style={[styles.heroOverlay, isNarrow && styles.heroOverlayMobile]}>
                    <View style={styles.heroContent}>
                      <View style={styles.heroBrandRow}>
                        <Image source={require('../../assets/mingsky-logo.png')} style={styles.heroLogo} />
                        <Text style={[styles.heroEyebrow, isNarrow && styles.heroEyebrowMobile]}>MingSky Astrology · 明空星占</Text>
                      </View>
                      <View style={[styles.heroPill, isNarrow && styles.heroPillMobile]}>
                        <Text style={styles.heroPillText}>已陪伴 393,762+ 次星盘解读</Text>
                      </View>
                      <Text style={[styles.heroTitle, isNarrow && styles.heroTitleMobile]}>你的私人 AI 占星顾问，用一份真正可读的报告理解自己。</Text>
                      <Text style={[styles.heroBody, isNarrow && styles.heroBodyMobile]}>明空星占把星盘计算、结构化解释与长篇报告结合在一起。你可以快速生成性格报告、关系报告、月度预测、兼容性、财务潜力、前世报告与生命进化报告。</Text>
                      <View style={[styles.heroActions, isNarrow && styles.heroActionsMobile]}>
                        <Pressable style={[styles.primaryCompact, isNarrow && styles.heroButtonMobile]} onPress={() => { setAccountMode('register'); setActivePage('account'); }}><Text style={styles.primaryText}>立即开始</Text></Pressable>
                        <Pressable style={[styles.secondaryBtn, isNarrow && styles.heroButtonMobile]} onPress={() => setActivePage('reports')}><Text style={styles.secondaryText}>免费试用</Text></Pressable>
                      </View>
                    </View>
                    <View style={[styles.heroShowcase, isNarrow && styles.heroShowcaseStack]}>
                      <View style={styles.desktopMock}>
                        <View style={styles.desktopChrome}>
                          <View style={styles.chromeDots}>
                            <View style={[styles.chromeDot, { backgroundColor: '#ff6f62' }]} />
                            <View style={[styles.chromeDot, { backgroundColor: '#f5bf4f' }]} />
                            <View style={[styles.chromeDot, { backgroundColor: '#60c554' }]} />
                          </View>
                          <Text style={styles.desktopTitle}>YOUR BIRTH CHART</Text>
                        </View>
                        <View style={styles.desktopBody}>
                          <ChartWheel chartVisual={generatedResult.chartVisual} compact={false} />
                        </View>
                      </View>
                      <View style={styles.phoneMock}>
                        <View style={styles.phoneNotch} />
                        <Text style={styles.phoneTitle}>明空星占</Text>
                        <Text style={styles.phoneMeta}>{year}-{month}-{day} {hour}:{minute}</Text>
                        <View style={styles.phoneList}>
                          {homeCards.slice(0, 4).map((item) => (
                            <View key={item[0]} style={styles.phoneListItem}>
                              <Text style={styles.phoneListTitle}>{item[0]}</Text>
                              <Text style={styles.phoneListBody}>{item[1]}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    </View>
                  </View>
                </ImageBackground>
              </View>
              <View style={styles.section}>
                <View style={[styles.homeIntake, isNarrow && styles.workspaceStack, isNarrow && styles.homeIntakeMobile]}>
                  <View style={[styles.homeIntakeText, isNarrow && styles.homeIntakeTextMobile]}>
                    <Text style={styles.sectionEyebrow}>Quick Start</Text>
                    <Text style={styles.sectionTitle}>首页直接输入出生日期与城市，再进入完整报告。</Text>
                    <Text style={styles.sectionBody}>先在首页完成出生日期、出生时间和出生城市选择，生成后直接跳到带星盘结果的报告页。</Text>
                    <View style={styles.quickStartRail}>
                      <View style={styles.quickStartChip}><Text style={styles.quickStartChipText}>5 分钟拿到首版结果</Text></View>
                      <View style={styles.quickStartChip}><Text style={styles.quickStartChipText}>滚轮式时间输入</Text></View>
                      <View style={styles.quickStartChip}><Text style={styles.quickStartChipText}>省份 + 城市 + 搜索</Text></View>
                    </View>
                  </View>
                  <View style={[styles.homeIntakeForm, isNarrow && styles.homeIntakeFormMobile]}>
                    <Text style={styles.formIntro}>先完成出生信息，再进入完整长报告与星盘结果页。</Text>
                    <Text style={styles.label}>出生年 / 月 / 日 / 时 / 分</Text>
                    <BirthMomentRow year={year} month={month} day={day} hour={hour} minute={minute} setYear={setYear} setMonth={setMonth} setDay={setDay} setHour={setHour} setMinute={setMinute} dayOptions={dayOptions} />
                    <Text style={styles.label}>出生城市</Text>
                    <InlineCitySelector selectedCity={selectedCity} search={citySearch} onChangeSearch={setCitySearch} onSelectCity={onSelectCity} onOpenLibrary={() => setCityPickerVisible(true)} recentCities={recentCities} />
                    <Pressable style={styles.primaryBtn} onPress={onGenerate}><Text style={styles.primaryText}>生成解读</Text></Pressable>
                  </View>
                </View>
                <View style={styles.reportShelfHeader}>
                  <View>
                    <Text style={styles.sectionEyebrow}>Featured Reports</Text>
                    <Text style={styles.sectionTitle}>先看最吸引人的报告入口，再决定从哪一份开始。</Text>
                    <Text style={styles.sectionBody}>首页优先展示最容易转化的报告类型，尤其是前世报告、性格报告和兼容性报告，让用户一眼知道这款应用能带来什么。</Text>
                  </View>
                  <Pressable style={styles.reportShelfAction} onPress={() => setActivePage('reports')}>
                    <Text style={styles.reportShelfActionText}>查看全部报告</Text>
                  </Pressable>
                </View>
                <View style={styles.reportShelfGrid}>
                  {homeCards.map((item, index) => (
                    <Pressable key={item[0]} onPress={() => setActivePage('reports')} style={[styles.reportFeatureCard, index === 0 && styles.reportFeatureCardPrimary, index > 0 && index < 3 && styles.reportFeatureCardWide]}>
                      <View style={styles.reportFeatureTop}>
                        <Text style={[styles.reportFeatureKicker, index === 0 && styles.reportFeatureKickerPrimary]}>{index === 0 ? '热门主推' : '精选报告'}</Text>
                        {index === 0 ? <Text style={styles.reportFeatureBadge}>推荐</Text> : null}
                      </View>
                      <Text style={[styles.reportFeatureTitle, index === 0 && styles.reportFeatureTitlePrimary]}>{item[0]}</Text>
                      <Text style={[styles.reportFeatureBody, index === 0 && styles.reportFeatureBodyPrimary]}>{item[1]}</Text>
                      <View style={styles.reportFeatureFooter}>
                        <Text style={[styles.reportFeatureLink, index === 0 && styles.reportFeatureLinkPrimary]}>进入报告</Text>
                        <Text style={[styles.reportFeatureArrow, index === 0 && styles.reportFeatureLinkPrimary]}>→</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>
            </>
          ) : null}

          {activePage === 'reports' ? (
            <>
              <View style={[styles.section, isNarrow && styles.sectionMobile]}>
                <Text style={styles.sectionEyebrow}>Reports</Text>
                <Text style={[styles.sectionTitle, isNarrow && styles.sectionTitleMobile]}>报告选择 + 滚轴式输入 + 城市选择器</Text>
                <TextInput value={reportSearch} onChangeText={setReportSearch} style={styles.searchInput} placeholder="搜索报告：前世 / 性格 / 关系 / 财富" placeholderTextColor="#72857d" />
                <View style={styles.grid}>{filteredReports.map((report) => <ReportCard key={report.key} report={report} active={report.key === reportType} onPress={() => onReportChange(report)} />)}</View>
              </View>
              <View style={[styles.workspace, isNarrow && styles.workspaceStack, isNarrow && styles.workspaceMobile]}>
                <View style={[styles.formPanel, isNarrow && styles.formPanelMobile]}>
                  <Text style={styles.panelTitle}>出生信息</Text>
                  <Text style={styles.panelBody}>出生日期和出生时间都改成滚轴式选择，出生城市则用“搜索 + 左右两栏”的方式。</Text>
                  <Text style={styles.label}>当前报告</Text>
                  <Text style={styles.activeText}>{activeReport.title}</Text>
                  <Text style={styles.label}>出生年 / 月 / 日 / 时 / 分</Text>
                  <BirthMomentRow year={year} month={month} day={day} hour={hour} minute={minute} setYear={setYear} setMonth={setMonth} setDay={setDay} setHour={setHour} setMinute={setMinute} dayOptions={dayOptions} />
                  <Text style={styles.label}>出生城市</Text>
                  <InlineCitySelector selectedCity={selectedCity} search={citySearch} onChangeSearch={setCitySearch} onSelectCity={onSelectCity} onOpenLibrary={() => setCityPickerVisible(true)} recentCities={recentCities} />
                  <Text style={styles.label}>先看哪条主线</Text>
                  <View style={styles.focusWrap}>{focusOptions.map((option) => { const active = option.key === focus; return <Pressable key={option.key} onPress={() => setFocus(option.key)} style={[styles.focusChip, active && styles.focusChipActive]}><Text style={[styles.focusText, active && styles.focusTextActive]}>{option.label}</Text></Pressable>; })}</View>
                  <Pressable style={styles.primaryBtn} onPress={onGenerate}><Text style={styles.primaryText}>生成解读</Text></Pressable>
                </View>

                <View style={[styles.resultPanel, isNarrow && styles.resultPanelMobile]}>
                  <View style={styles.resultHero}>
                    <View style={styles.resultHeroTop}>
                      <Text style={styles.resultEyebrow}>{generatedResult.reportTitle}</Text>
                      <View style={styles.resultHeroBadge}><Text style={styles.resultHeroBadgeText}>{activeReport.title}</Text></View>
                    </View>
                    <Text style={styles.resultTitle}>{generatedResult.headline}</Text>
                    <Text style={styles.resultBody}>{generatedResult.summary}</Text>
                    <View style={styles.resultMetaRail}>
                      <View style={styles.resultMetaChip}><Text style={styles.resultMetaChipText}>{generatedResult.chartMeta.date}</Text></View>
                      <View style={styles.resultMetaChip}><Text style={styles.resultMetaChipText}>{generatedResult.chartMeta.time}</Text></View>
                      <View style={styles.resultMetaChip}><Text style={styles.resultMetaChipText}>{generatedResult.chartMeta.city}</Text></View>
                      <View style={styles.resultMetaChip}><Text style={styles.resultMetaChipText}>{generatedResult.chartMeta.timezone}</Text></View>
                      <View style={styles.resultMetaChip}><Text style={styles.resultMetaChipText}>ASC {generatedResult.chartMeta.ascSign}</Text></View>
                    </View>
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
                  {resultTab === 'report' ? <View style={styles.resultCard}><View style={styles.reportCover}><Text style={styles.reportCoverEyebrow}>{generatedResult.reportTitle}</Text><Text style={styles.reportCoverTitle}>{generatedResult.headline}</Text><Text style={styles.reportCoverBody}>{generatedResult.summary}</Text><View style={styles.reportCoverMetaRow}><View style={styles.reportMetaChip}><Text style={styles.reportMetaChipText}>{generatedResult.chartMeta.date}</Text></View><View style={styles.reportMetaChip}><Text style={styles.reportMetaChipText}>{generatedResult.chartMeta.time}</Text></View><View style={styles.reportMetaChip}><Text style={styles.reportMetaChipText}>{generatedResult.chartMeta.city}</Text></View><View style={styles.reportMetaChip}><Text style={styles.reportMetaChipText}>{generatedResult.chartMeta.timezone}</Text></View><View style={styles.reportMetaChip}><Text style={styles.reportMetaChipText}>ASC {generatedResult.chartMeta.ascSign}</Text></View></View></View><View style={styles.reportToc}><Text style={styles.reportTocTitle}>章节目录</Text><View style={styles.sectionRail}>{reportChapters.map((section, index) => { const active = index === reportChapterIndex; return <Pressable key={`${section.title}-${index}`} onPress={() => setReportChapterIndex(index)} style={[styles.sectionPill, active && styles.sectionPillActive]}><Text style={[styles.sectionPillNumber, active && styles.sectionPillNumberActive]}>{index + 1}</Text><Text style={[styles.sectionPillText, active && styles.sectionPillTextActive]}>{section.title}</Text></Pressable>; })}</View></View><View style={styles.reportBodyWrap}>{activeChapter ? <View style={[styles.reportSectionCard, styles.reportSectionCardFeatured]}><Text style={styles.reportSectionIndex}>Chapter {reportChapterIndex + 1}</Text><Text style={styles.reportSectionTitle}>{activeChapter.title}</Text><Text style={styles.reportSectionLead}>{generatedResult.insights[reportChapterIndex]?.title || generatedResult.tags[reportChapterIndex]?.label || '目录已与当前章节联动，你可以先按目录跳读，再回到完整正文。'}</Text><Text style={styles.reportSectionBody}>{activeChapter.body}</Text>{generatedResult.actionItems[reportChapterIndex] ? <View style={styles.reportCallout}><Text style={styles.reportCalloutLabel}>本章落点</Text><Text style={styles.reportCalloutText}>{generatedResult.actionItems[reportChapterIndex]}</Text></View> : null}</View> : null}{reportChapters.map((section, index) => index === reportChapterIndex ? null : <View key={section.title} style={styles.reportSectionCard}><Text style={styles.reportSectionIndex}>Chapter {index + 1}</Text><Text style={styles.reportSectionTitle}>{section.title}</Text><Text style={styles.reportSectionLead}>{index < generatedResult.insights.length ? generatedResult.insights[index]?.title : '本章补充盘面、行星位置或相位的正式说明。'}</Text><Text style={styles.reportSectionBody}>{section.body}</Text></View>)}</View></View> : null}
                  {resultTab === 'chart' ? <View style={styles.resultCard}><Text style={styles.boxTitle}>真实盘面概览</Text><View style={styles.innerCard}><Text style={styles.engineTitle}>Calculation Input</Text><Text style={styles.engineBody}>{generatedResult.chartMeta.city} · {generatedResult.chartMeta.province} · {generatedResult.chartMeta.timezone}</Text><Text style={styles.engineBody}>{getChartLocationLine(generatedResult.chartMeta)} · UTC {generatedResult.chartMeta.utcTime}</Text><Text style={styles.engineBody}>{generatedResult.chartMeta.engine} · ASC {generatedResult.chartMeta.ascSign}</Text></View><View style={[styles.chartRow, isNarrow && styles.workspaceStack]}><ChartWheel chartVisual={generatedResult.chartVisual} /><View style={styles.planetTable}>{generatedResult.chartVisual.planets.map((planet) => <View key={planet.code} style={styles.planetRow}><Text style={styles.planetName}>{planet.symbol} {planet.label}</Text><Text style={styles.planetPos}>{planet.position}</Text><Text style={styles.planetMeta}>{planet.house} · {planet.motion}</Text></View>)}</View></View><View style={styles.innerCard}><Text style={styles.boxTitle}>行星位置说明</Text>{generatedResult.chartVisual.planets.slice(0, 8).map((planet) => <View key={`detail-${planet.code}`} style={styles.detailRow}><Text style={styles.detailTitle}>{planet.symbol} {planet.label}</Text><Text style={styles.detailBody}>{planet.position}，{planet.house}，当前为{planet.motion}。这一颗星会把对应主题推到更可见的位置。</Text></View>)}</View><View style={styles.innerCard}><Text style={styles.boxTitle}>关键相位说明</Text>{generatedResult.chartVisual.aspects.map((aspect) => <View key={`aspect-${aspect.code}`} style={styles.detailRow}><Text style={styles.detailTitle}>{aspect.label}</Text><Text style={styles.detailBody}>容许度 {aspect.orb}。这组相位会让两股动力彼此拉扯、互相放大，通常也是正文里最值得反复回看的结构。</Text></View>)}</View></View> : null}
                  {resultTab === 'themes' ? <View style={styles.resultCard}><Text style={styles.boxTitle}>结构化主题</Text><View style={styles.tagWrap}>{generatedResult.tags.map((tag) => <View key={tag.code} style={styles.tag}><Text style={styles.tagText}>{tag.label}</Text></View>)}</View><View style={styles.innerCard}><Text style={styles.boxTitle}>证据与关键相位</Text>{generatedResult.evidence.map((item) => <View key={item.code} style={styles.detailRow}><Text style={styles.detailTitle}>{item.label}</Text><Text style={styles.detailBody}>{item.system}</Text></View>)}{generatedResult.chartVisual.aspects.map((aspect) => <View key={aspect.code} style={styles.detailRow}><Text style={styles.detailTitle}>{aspect.label}</Text><Text style={styles.detailBody}>Orb {aspect.orb}</Text></View>)}</View></View> : null}
                  {resultTab === 'plan' ? <View style={styles.resultCard}><Text style={styles.boxTitle}>下一步行动</Text>{generatedResult.actionItems.map((item, index) => <View key={`${item}-${index}`} style={styles.actionRow}><View style={styles.actionIndex}><Text style={styles.actionIndexText}>{index + 1}</Text></View><Text style={styles.actionText}>{item}</Text></View>)}</View> : null}
                </View>
              </View>
            </>
          ) : null}

          {activePage === 'tools' ? <View style={styles.simplePage}><Text style={styles.sectionEyebrow}>Tools</Text><Text style={styles.sectionTitle}>工具页</Text></View> : null}
          {activePage === 'pricing' ? (
            <View style={styles.simplePage}>
              <Text style={styles.sectionEyebrow}>Pricing</Text>
              <Text style={styles.sectionTitle}>选择适合你的明空会员方案</Text>
              <Text style={styles.sectionBody}>注册完成后即可从这里继续开通会员，解锁完整长报告、专题报告和更多持续更新内容。</Text>
              <View style={styles.pricingGrid}>
                {pricingPlans.map((plan) => (
                  <View key={plan.key} style={styles.pricingCard}>
                    <Text style={styles.pricingTitle}>{plan.title}</Text>
                    <Text style={styles.pricingPrice}>{plan.price}</Text>
                    <Text style={styles.pricingBody}>{plan.body}</Text>
                    <Pressable style={styles.pricingCta}><Text style={styles.pricingCtaText}>{plan.cta}</Text></Pressable>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          {activePage === 'account' ? (
            <View style={styles.simplePage}>
              <Text style={styles.sectionEyebrow}>Account</Text>
              <Text style={styles.sectionTitle}>注册后继续进入会员定价与完整报告</Text>
              <Text style={styles.sectionBody}>立即开始会先完成基础账号注册。注册页要求填写姓名、性别、出生日期、电话、邮箱与密码；完成后可直接前往定价页。</Text>
              <View style={styles.accountPanel}>
                <View style={styles.accountTabs}>
                  <Pressable style={[styles.accountTab, accountMode === 'register' && styles.accountTabActive]} onPress={() => setAccountMode('register')}><Text style={[styles.accountTabText, accountMode === 'register' && styles.accountTabTextActive]}>注册</Text></Pressable>
                  <Pressable style={[styles.accountTab, accountMode === 'login' && styles.accountTabActive]} onPress={() => setAccountMode('login')}><Text style={[styles.accountTabText, accountMode === 'login' && styles.accountTabTextActive]}>登录</Text></Pressable>
                </View>
                {accountMode === 'register' ? (
                  <>
                    <View style={styles.accountGrid}>
                      <AccountField label="姓名">
                        <TextInput value={accountName} onChangeText={setAccountName} style={styles.accountInput} placeholder="请输入姓名" placeholderTextColor="#8c92ad" />
                      </AccountField>
                      <AccountField label="性别">
                        <View style={styles.genderRow}>
                          {genderOptions.map((option) => {
                            const active = option === accountGender;
                            return <Pressable key={option} style={[styles.genderChip, active && styles.genderChipActive]} onPress={() => setAccountGender(option)}><Text style={[styles.genderChipText, active && styles.genderChipTextActive]}>{option}</Text></Pressable>;
                          })}
                        </View>
                      </AccountField>
                      <AccountField label="出生日期 / 时间">
                        <BirthMomentRow year={year} month={month} day={day} hour={hour} minute={minute} setYear={setYear} setMonth={setMonth} setDay={setDay} setHour={setHour} setMinute={setMinute} dayOptions={dayOptions} />
                      </AccountField>
                      <AccountField label="手机号码">
                        <TextInput value={accountPhone} onChangeText={setAccountPhone} style={styles.accountInput} placeholder="请输入手机号码" placeholderTextColor="#8c92ad" keyboardType="phone-pad" />
                      </AccountField>
                      <AccountField label="邮箱">
                        <TextInput value={accountEmail} onChangeText={setAccountEmail} style={styles.accountInput} placeholder="请输入邮箱" placeholderTextColor="#8c92ad" keyboardType="email-address" autoCapitalize="none" />
                      </AccountField>
                      <AccountField label="设置密码">
                        <TextInput value={accountPassword} onChangeText={setAccountPassword} style={styles.accountInput} placeholder="请设置密码" placeholderTextColor="#8c92ad" secureTextEntry autoCapitalize="none" />
                      </AccountField>
                    </View>
                    <Pressable style={styles.primaryBtn} onPress={onRegister}><Text style={styles.primaryText}>完成注册</Text></Pressable>
                    {accountNotice ? <Text style={styles.accountNotice}>{accountNotice}</Text> : null}
                    {registrationComplete ? (
                      <Pressable style={styles.secondaryWideBtn} onPress={() => setActivePage('pricing')}>
                        <Text style={styles.secondaryText}>前往定价页</Text>
                      </Pressable>
                    ) : null}
                  </>
                ) : (
                  <View style={styles.loginPanel}>
                    <AccountField label="邮箱 / 手机号">
                      <TextInput value={accountEmail} onChangeText={setAccountEmail} style={styles.accountInput} placeholder="请输入邮箱或手机号" placeholderTextColor="#8c92ad" />
                    </AccountField>
                    <AccountField label="密码">
                      <TextInput value={accountPassword} onChangeText={setAccountPassword} style={styles.accountInput} placeholder="请输入密码" placeholderTextColor="#8c92ad" secureTextEntry />
                    </AccountField>
                    <Pressable style={styles.primaryBtn} onPress={() => setActivePage('pricing')}><Text style={styles.primaryText}>登录并查看定价</Text></Pressable>
                  </View>
                )}
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f6f3ef' }, content: { paddingBottom: 36 }, shell: { width: '100%' }, rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  topNav: { position: 'sticky', top: 0, zIndex: 30, borderBottomWidth: 1, borderBottomColor: 'rgba(21,29,51,0.05)', backgroundColor: 'rgba(255,251,246,0.98)' }, topNavInner: { minHeight: 82, paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 18 }, topNavInnerMobile: { minHeight: 0, flexDirection: 'column', alignItems: 'stretch', gap: 10, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10 }, topNavMainRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, brandLockup: { flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0, flexShrink: 1 }, brandLogo: { width: 52, height: 52, borderRadius: 14, backgroundColor: '#0d1930' }, brandTitle: { color: '#171b31', fontSize: 24, lineHeight: 28, fontWeight: '800' }, brandSubtitle: { color: '#69708b', fontSize: 14, lineHeight: 18, fontWeight: '700' }, navRow: { flexGrow: 1, justifyContent: 'center', gap: 24, paddingHorizontal: 16 }, navRowMobile: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, padding: 4, borderRadius: 18, backgroundColor: '#ece8df' }, navTab: { minWidth: 82, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 }, navTabMobile: { flex: 1, minWidth: 0, borderRadius: 14, backgroundColor: 'transparent', paddingVertical: 10, paddingHorizontal: 2 }, navTabMobileActive: { backgroundColor: '#ffffff', shadowColor: '#151d33', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }, navText: { color: '#1d2140', fontSize: 16, lineHeight: 20, fontWeight: '700' }, navTextMobile: { fontSize: 12, lineHeight: 15, fontWeight: '800' }, navSub: { marginTop: 4, color: '#9aa0b6', fontSize: 11, lineHeight: 14, fontWeight: '700' }, navTextActive: { color: '#141829' }, navSubActive: { color: '#6b54d4' }, navCta: { minWidth: 118, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7d38d7', paddingHorizontal: 18 }, navCtaMobile: { minWidth: 100, height: 38, paddingHorizontal: 14, borderRadius: 14, backgroundColor: '#15192b', shadowColor: '#15192b', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }, navCtaText: { color: '#ffffff', fontSize: 14, lineHeight: 18, fontWeight: '800' },
  heroBand: { paddingHorizontal: 12, paddingTop: 10 }, heroWrap: { minHeight: 720, justifyContent: 'space-between', borderRadius: 24, overflow: 'hidden', backgroundColor: '#121524' }, heroWrapMobile: { minHeight: 0 }, heroImage: { borderRadius: 24, opacity: 0.07 }, heroOverlay: { flex: 1, borderRadius: 24, paddingHorizontal: 24, paddingTop: 36, paddingBottom: 0, backgroundColor: 'rgba(18,21,36,0.96)', alignItems: 'center', shadowColor: '#11131f', shadowOpacity: 0.16, shadowRadius: 22, shadowOffset: { width: 0, height: 12 } }, heroOverlayMobile: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 18 }, heroContent: { width: '100%', maxWidth: 980, alignItems: 'center' }, heroBrandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, heroLogo: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#0d1930' }, heroEyebrow: { color: '#d3b06a', fontSize: 13, lineHeight: 18, fontWeight: '800' }, heroEyebrowMobile: { fontSize: 12, lineHeight: 16 }, heroPill: { marginTop: 18, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10, backgroundColor: '#fffaf4' }, heroPillMobile: { marginTop: 14, paddingHorizontal: 14, paddingVertical: 8 }, heroPillText: { color: '#7b57ff', fontSize: 13, lineHeight: 16, fontWeight: '800' }, heroTitle: { marginTop: 22, color: '#f8f4ef', fontSize: 52, lineHeight: 60, fontWeight: '800', maxWidth: 920, textAlign: 'center' }, heroTitleMobile: { marginTop: 16, fontSize: 34, lineHeight: 41, maxWidth: 320 }, heroBody: { marginTop: 16, color: 'rgba(248,244,239,0.84)', fontSize: 18, lineHeight: 28, maxWidth: 860, textAlign: 'center' }, heroBodyMobile: { marginTop: 12, fontSize: 14, lineHeight: 22, maxWidth: 310 }, heroActions: { marginTop: 24, flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }, heroActionsMobile: { width: '100%', gap: 10, marginTop: 18 }, heroButtonMobile: { width: '100%', height: 50 }, heroShowcase: { width: '100%', maxWidth: 1080, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 18, marginTop: 42, paddingBottom: 0 }, heroShowcaseStack: { flexDirection: 'column', alignItems: 'center', display: 'none' }, desktopMock: { flex: 1, minWidth: 320, maxWidth: 820, borderTopLeftRadius: 18, borderTopRightRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: '#f8f6ff', overflow: 'hidden', shadowColor: '#0d0b28', shadowOpacity: 0.18, shadowRadius: 20, shadowOffset: { width: 0, height: 14 } }, desktopChrome: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, backgroundColor: '#ece7f7', borderBottomWidth: 1, borderBottomColor: 'rgba(53,38,103,0.1)' }, chromeDots: { flexDirection: 'row', gap: 8 }, chromeDot: { width: 10, height: 10, borderRadius: 5 }, desktopTitle: { color: '#6954c8', fontSize: 13, lineHeight: 16, fontWeight: '800' }, desktopBody: { alignItems: 'center', justifyContent: 'center', paddingVertical: 22, paddingHorizontal: 18 }, phoneMock: { width: 220, borderRadius: 28, backgroundColor: '#ffffff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 18, marginBottom: 18, shadowColor: '#0d0b28', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 10 } }, phoneNotch: { alignSelf: 'center', width: 78, height: 10, borderRadius: 999, backgroundColor: '#dfe1ef' }, phoneTitle: { marginTop: 14, color: '#6b54d4', fontSize: 18, lineHeight: 22, fontWeight: '800', textAlign: 'center' }, phoneMeta: { marginTop: 6, color: '#7a7f95', fontSize: 11, lineHeight: 15, textAlign: 'center' }, phoneList: { marginTop: 16, gap: 10 }, phoneListItem: { borderRadius: 8, backgroundColor: '#f5f4fb', padding: 10 }, phoneListTitle: { color: '#1d2140', fontSize: 13, lineHeight: 16, fontWeight: '800' }, phoneListBody: { marginTop: 5, color: '#747b92', fontSize: 11, lineHeight: 16 }, primaryCompact: { minWidth: 180, height: 54, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: '#8c33db', paddingHorizontal: 26 }, primaryBtn: { marginTop: 22, height: 54, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#c9893f' }, primaryText: { color: '#fffaf3', fontSize: 16, lineHeight: 20, fontWeight: '800' }, secondaryBtn: { minWidth: 180, height: 54, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 26, backgroundColor: '#4f54e8' }, secondaryText: { color: '#f7faf8', fontSize: 15, lineHeight: 18, fontWeight: '800' },
  section: { paddingHorizontal: 20, paddingTop: 24 }, sectionMobile: { paddingHorizontal: 12, paddingTop: 16 }, sectionEyebrow: { color: '#6b54d4', fontSize: 12, lineHeight: 16, fontWeight: '800', textTransform: 'uppercase' }, sectionTitle: { marginTop: 6, color: '#171b31', fontSize: 32, lineHeight: 38, fontWeight: '800', maxWidth: 760 }, sectionTitleMobile: { fontSize: 24, lineHeight: 30 }, sectionBody: { marginTop: 10, color: '#626a84', fontSize: 15, lineHeight: 24, maxWidth: 640 }, homeIntake: { marginBottom: 24, flexDirection: 'row', gap: 22, alignItems: 'stretch', borderRadius: 22, backgroundColor: '#171338', borderWidth: 1, borderColor: 'rgba(121,99,255,0.22)', padding: 24, shadowColor: '#1d2140', shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } }, homeIntakeMobile: { marginBottom: 18, gap: 14, borderRadius: 24, backgroundColor: '#15192b', borderColor: 'rgba(255,255,255,0.06)', padding: 16 }, homeIntakeText: { flex: 1, minWidth: 240, paddingTop: 4 }, homeIntakeTextMobile: { paddingTop: 0 }, quickStartRail: { marginTop: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, quickStartChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }, quickStartChipText: { color: '#f4f2ff', fontSize: 12, lineHeight: 16, fontWeight: '700' }, homeIntakeForm: { flex: 1.1, minWidth: 300, borderRadius: 18, backgroundColor: '#ffffff', padding: 20, borderWidth: 1, borderColor: 'rgba(33,39,67,0.08)' }, homeIntakeFormMobile: { minWidth: 0, borderRadius: 20, padding: 16, backgroundColor: '#fffdf9' }, formIntro: { color: '#707796', fontSize: 13, lineHeight: 20 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 14 }, card: { minWidth: 240, flexGrow: 1, flexBasis: 240, borderRadius: 8, backgroundColor: '#fbfdfc', borderWidth: 1, borderColor: 'rgba(23,34,29,0.1)', padding: 18 }, cardTitle: { color: '#17221d', fontSize: 20, lineHeight: 24, fontWeight: '800' }, cardBody: { marginTop: 10, color: '#5a6b64', fontSize: 15, lineHeight: 22 }, reportShelfHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginTop: 4, marginBottom: 18, flexWrap: 'wrap' }, reportShelfAction: { minWidth: 130, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(107,84,212,0.2)', backgroundColor: '#ffffff', paddingHorizontal: 16 }, reportShelfActionText: { color: '#6b54d4', fontSize: 14, lineHeight: 18, fontWeight: '800' }, reportShelfGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 }, reportFeatureCard: { flexGrow: 1, flexBasis: 260, minWidth: 250, borderRadius: 18, backgroundColor: '#ffffff', borderWidth: 1, borderColor: 'rgba(33,39,67,0.08)', padding: 20, shadowColor: '#1d2140', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }, reportFeatureCardPrimary: { flexBasis: 540, minWidth: 320, backgroundColor: '#111331', borderColor: '#111331' }, reportFeatureCardWide: { flexBasis: 320 }, reportFeatureTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, reportFeatureKicker: { color: '#7a80a0', fontSize: 12, lineHeight: 16, fontWeight: '800', textTransform: 'uppercase' }, reportFeatureKickerPrimary: { color: 'rgba(255,255,255,0.72)' }, reportFeatureBadge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, backgroundColor: '#f6bf45', color: '#3e2c00', fontSize: 11, lineHeight: 14, fontWeight: '800' }, reportFeatureTitle: { marginTop: 14, color: '#171b31', fontSize: 24, lineHeight: 30, fontWeight: '800' }, reportFeatureTitlePrimary: { color: '#ffffff' }, reportFeatureBody: { marginTop: 10, color: '#69708b', fontSize: 15, lineHeight: 24 }, reportFeatureBodyPrimary: { color: 'rgba(255,255,255,0.82)' }, reportFeatureFooter: { marginTop: 22, flexDirection: 'row', alignItems: 'center', gap: 8 }, reportFeatureLink: { color: '#6b54d4', fontSize: 14, lineHeight: 18, fontWeight: '800' }, reportFeatureLinkPrimary: { color: '#f6bf45' }, reportFeatureArrow: { color: '#6b54d4', fontSize: 18, lineHeight: 18, fontWeight: '800' },
  searchInput: { marginTop: 14, height: 52, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(23,34,29,0.14)', backgroundColor: '#fff', paddingHorizontal: 16, color: '#17221d', fontSize: 15, maxWidth: 420 }, reportCard: { minWidth: 220, flexGrow: 1, flexBasis: 220, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(23,34,29,0.1)', backgroundColor: '#f8fbf9', padding: 18 }, reportCardFeatured: { backgroundColor: '#112722', borderColor: '#112722' }, reportCardActive: { borderColor: '#d69a3b', borderWidth: 2 }, reportTitle: { color: '#17221d', fontSize: 19, lineHeight: 24, fontWeight: '800' }, reportTitleFeatured: { color: '#f7faf8' }, badge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: '#d69a3b', color: '#fffaf1', fontSize: 11, fontWeight: '800' }, reportBody: { marginTop: 14, color: '#51615a', fontSize: 14, lineHeight: 20 }, reportBodyFeatured: { color: 'rgba(247,250,248,0.84)' },
  workspace: { flexDirection: 'row', gap: 22, paddingHorizontal: 20, paddingTop: 24 }, workspaceMobile: { paddingHorizontal: 12, paddingTop: 16, gap: 16 }, workspaceStack: { flexDirection: 'column' }, formPanel: { flex: 0.96, minWidth: 320, borderRadius: 18, backgroundColor: '#ffffff', padding: 22, borderWidth: 1, borderColor: 'rgba(33,39,67,0.08)', shadowColor: '#1d2140', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }, formPanelMobile: { minWidth: 0, borderRadius: 20, padding: 16, backgroundColor: '#fffdf9' }, panelTitle: { color: '#171b31', fontSize: 30, lineHeight: 36, fontWeight: '800' }, panelBody: { marginTop: 8, color: '#626a84', fontSize: 15, lineHeight: 24 }, label: { marginTop: 18, color: '#4d5370', fontSize: 13, lineHeight: 18, fontWeight: '700' }, activeText: { marginTop: 8, color: '#6b54d4', fontSize: 16, lineHeight: 22, fontWeight: '800' },
  wheelRow: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, birthMomentWrap: { marginTop: 12, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(107,84,212,0.14)', backgroundColor: '#ffffff', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 10, shadowColor: '#1d2140', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }, birthMomentRow: { gap: 12, paddingRight: 18, paddingBottom: 4, alignItems: 'flex-start' }, wheelColumn: { gap: 10 }, wheelLabel: { color: '#6f7693', fontSize: 12, lineHeight: 16, fontWeight: '800', textTransform: 'uppercase', paddingLeft: 4 }, wheelShell: { position: 'relative' }, wheelViewport: { height: WHEEL_VIEWPORT_HEIGHT, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(107,84,212,0.14)', backgroundColor: '#f8f7ff', shadowColor: '#1d2140', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }, wheelContent: { paddingVertical: WHEEL_VERTICAL_PADDING }, wheelItem: { height: WHEEL_ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center', marginHorizontal: 8, borderRadius: 14 }, wheelItemActive: { backgroundColor: '#6b54d4', shadowColor: '#6b54d4', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }, wheelText: { color: '#4d5370', fontSize: 16, lineHeight: 19, fontWeight: '700' }, wheelTextActive: { color: '#ffffff' }, wheelSelectionBand: { position: 'absolute', left: 8, right: 8, top: WHEEL_VERTICAL_PADDING, height: WHEEL_ITEM_HEIGHT, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(107,84,212,0.24)', backgroundColor: 'rgba(107,84,212,0.08)' }, wheelFadeTop: { position: 'absolute', left: 1, right: 1, top: 1, height: 40, borderTopLeftRadius: 18, borderTopRightRadius: 18, backgroundColor: 'rgba(248,247,255,0.9)' }, wheelFadeBottom: { position: 'absolute', left: 1, right: 1, bottom: 1, height: 40, borderBottomLeftRadius: 18, borderBottomRightRadius: 18, backgroundColor: 'rgba(248,247,255,0.9)' },
  cityInlineWrap: { marginTop: 10, gap: 10, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(107,84,212,0.1)', backgroundColor: '#fbfaff', padding: 12 }, citySearchInput: { height: 52, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(107,84,212,0.14)', backgroundColor: '#ffffff', paddingHorizontal: 14, color: '#17221d', fontSize: 15, shadowColor: '#1d2140', shadowOpacity: 0.03, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } }, citySuggestionPanel: { borderRadius: 16, borderWidth: 1, borderColor: 'rgba(107,84,212,0.12)', backgroundColor: '#ffffff', padding: 10, gap: 6, shadowColor: '#1d2140', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } }, citySuggestionLabel: { color: '#69708b', fontSize: 12, lineHeight: 16, fontWeight: '800', textTransform: 'uppercase' }, citySuggestionItem: { minHeight: 58, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: '#f8f7ff', borderWidth: 1, borderColor: 'rgba(107,84,212,0.08)' }, citySuggestionTextWrap: { flex: 1, gap: 4 }, citySuggestionTitle: { color: '#171b31', fontSize: 14, lineHeight: 18, fontWeight: '800' }, citySuggestionMeta: { color: '#72857d', fontSize: 12, lineHeight: 16, fontWeight: '700' }, citySuggestionAction: { color: '#6b54d4', fontSize: 12, lineHeight: 16, fontWeight: '800' }, citySuggestionEmpty: { paddingHorizontal: 12, paddingVertical: 14, borderRadius: 12, backgroundColor: '#f8f7ff' }, citySuggestionEmptyText: { color: '#72857d', fontSize: 12, lineHeight: 18, fontWeight: '700' }, cityCurrentRow: { minHeight: 82, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(107,84,212,0.12)', backgroundColor: '#f7f7fd', paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }, cityCurrentTitle: { color: '#171b31', fontSize: 16, lineHeight: 20, fontWeight: '800' }, cityCurrentMeta: { marginTop: 4, color: '#6c7390', fontSize: 12, lineHeight: 16, fontWeight: '700' }, cityCurrentMetaSub: { marginTop: 4, color: '#9aa0b6', fontSize: 11, lineHeight: 15, fontWeight: '700' }, cityLibraryBtn: { borderRadius: 10, backgroundColor: '#6b54d4', paddingHorizontal: 12, paddingVertical: 9 }, cityLibraryBtnText: { color: '#ffffff', fontSize: 12, lineHeight: 16, fontWeight: '800' }, cityRecentWrap: { gap: 8 }, cityRecentLabel: { color: '#69708b', fontSize: 12, lineHeight: 16, fontWeight: '800', textTransform: 'uppercase' }, cityRecentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, cityRecentChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#ffffff', borderWidth: 1, borderColor: 'rgba(107,84,212,0.12)' }, cityRecentChipActive: { backgroundColor: '#6b54d4', borderColor: '#6b54d4' }, cityRecentChipText: { color: '#4d5370', fontSize: 12, lineHeight: 16, fontWeight: '800' }, cityRecentChipTextActive: { color: '#ffffff' }, cityQuickList: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, cityQuickItem: { minWidth: 120, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(107,84,212,0.1)', backgroundColor: '#ffffff', paddingHorizontal: 12, paddingVertical: 12 }, cityQuickItemActive: { backgroundColor: '#6b54d4', borderColor: '#6b54d4' }, cityQuickTitle: { color: '#171b31', fontSize: 13, lineHeight: 16, fontWeight: '800' }, cityQuickTitleActive: { color: '#ffffff' }, cityQuickMeta: { marginTop: 4, color: '#72857d', fontSize: 11, lineHeight: 14, fontWeight: '700' }, cityQuickMetaActive: { color: 'rgba(255,255,255,0.8)' },
  focusWrap: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, focusChip: { borderRadius: 8, borderWidth: 1, borderColor: 'rgba(23,34,29,0.14)', backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 10 }, focusChipActive: { backgroundColor: '#17362f', borderColor: '#17362f' }, focusText: { color: '#264038', fontSize: 14, lineHeight: 18, fontWeight: '700' }, focusTextActive: { color: '#f5faf7' },
  resultPanel: { flex: 1.2, minWidth: 320, gap: 16 }, resultPanelMobile: { minWidth: 0, gap: 12 }, resultHero: { borderRadius: 22, backgroundColor: '#171338', borderWidth: 1, borderColor: 'rgba(121,99,255,0.22)', padding: 22, shadowColor: '#1d2140', shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 10 } }, resultHeroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }, resultHeroBadge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' }, resultHeroBadgeText: { color: '#f5f3ff', fontSize: 12, lineHeight: 16, fontWeight: '800' }, resultEyebrow: { color: '#b8a4ff', fontSize: 12, lineHeight: 16, fontWeight: '800', textTransform: 'uppercase' }, resultTitle: { marginTop: 12, color: '#ffffff', fontSize: 30, lineHeight: 36, fontWeight: '800' }, resultBody: { marginTop: 12, color: 'rgba(255,255,255,0.84)', fontSize: 15, lineHeight: 24 }, resultMeta: { marginTop: 12, color: '#7c8f87', fontSize: 13, lineHeight: 18, fontWeight: '700' }, resultMetaRail: { marginTop: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, resultMetaChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' }, resultMetaChipText: { color: '#f4f2ff', fontSize: 12, lineHeight: 16, fontWeight: '700' }, metricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, metric: { flex: 1, minWidth: 150, borderRadius: 16, backgroundColor: '#ffffff', borderWidth: 1, borderColor: 'rgba(33,39,67,0.08)', padding: 18, shadowColor: '#1d2140', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }, metricValue: { color: '#6b54d4', fontSize: 34, lineHeight: 38, fontWeight: '800' }, metricLabel: { marginTop: 8, color: '#69708b', fontSize: 14, lineHeight: 20, fontWeight: '700' }, resultTabRow: { gap: 10, paddingRight: 20 }, resultTab: { borderRadius: 999, borderWidth: 1, borderColor: 'rgba(107,84,212,0.16)', backgroundColor: '#ffffff', paddingHorizontal: 16, paddingVertical: 10 }, resultTabActive: { backgroundColor: '#6b54d4', borderColor: '#6b54d4' }, resultTabText: { color: '#535a77', fontSize: 14, lineHeight: 18, fontWeight: '800' }, resultTabTextActive: { color: '#ffffff' },
  resultCard: { borderRadius: 18, backgroundColor: '#ffffff', borderWidth: 1, borderColor: 'rgba(33,39,67,0.08)', padding: 22, shadowColor: '#1d2140', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }, innerCard: { marginTop: 18, borderRadius: 16, backgroundColor: '#f7f7fd', borderWidth: 1, borderColor: 'rgba(107,84,212,0.08)', padding: 16 }, boxTitle: { color: '#171b31', fontSize: 20, lineHeight: 26, fontWeight: '800' }, chartRow: { marginTop: 18, flexDirection: 'row', gap: 18, alignItems: 'center' },
  wheel: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafcfb', borderWidth: 1, borderColor: 'rgba(23,34,29,0.08)' }, wheelOuter: { position: 'absolute', borderWidth: 16, borderColor: '#263f38' }, wheelInner: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(23,34,29,0.18)' }, wheelSign: { position: 'absolute', color: '#17362f', fontSize: 12, lineHeight: 14, fontWeight: '800' }, houseDot: { position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(23,34,29,0.12)' }, houseDotText: { color: '#17362f', fontSize: 12, lineHeight: 14, fontWeight: '800' }, planetDot: { position: 'absolute', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, planetDotText: { color: '#fff', fontSize: 16, lineHeight: 18, fontWeight: '800' }, planetTable: { flex: 1, minWidth: 250, gap: 10 }, planetRow: { borderRadius: 8, backgroundColor: '#f6faf8', borderWidth: 1, borderColor: 'rgba(23,34,29,0.08)', padding: 12 }, planetName: { color: '#17221d', fontSize: 15, lineHeight: 18, fontWeight: '800' }, planetPos: { marginTop: 6, color: '#264038', fontSize: 14, lineHeight: 18, fontWeight: '700' }, planetMeta: { marginTop: 4, color: '#70837c', fontSize: 12, lineHeight: 16, fontWeight: '700' },
  miniCard: { marginTop: 16, borderRadius: 16, backgroundColor: '#f7f7fd', borderWidth: 1, borderColor: 'rgba(107,84,212,0.08)', padding: 16 }, miniTitle: { color: '#171b31', fontSize: 18, lineHeight: 24, fontWeight: '800' }, miniBody: { marginTop: 8, color: '#626a84', fontSize: 15, lineHeight: 24 }, moduleGrid: { marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 14 }, moduleCard: { flexGrow: 1, flexBasis: 180, minWidth: 180, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(107,84,212,0.08)', backgroundColor: '#f7f7fd', padding: 16 }, moduleTitle: { color: '#171b31', fontSize: 15, lineHeight: 18, fontWeight: '800' }, moduleBody: { marginTop: 8, color: '#626a84', fontSize: 14, lineHeight: 22 }, reportCover: { borderRadius: 22, padding: 24, backgroundColor: '#171338' }, reportCoverEyebrow: { color: '#b8a4ff', fontSize: 12, lineHeight: 16, fontWeight: '800', textTransform: 'uppercase' }, reportCoverTitle: { marginTop: 10, color: '#ffffff', fontSize: 32, lineHeight: 38, fontWeight: '800', maxWidth: 760 }, reportCoverBody: { marginTop: 12, color: 'rgba(255,255,255,0.84)', fontSize: 15, lineHeight: 24, maxWidth: 760 }, reportCoverMetaRow: { marginTop: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, reportMetaChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' }, reportMetaChipText: { color: '#f4f2ff', fontSize: 13, lineHeight: 16, fontWeight: '700' }, reportToc: { marginTop: 18, borderRadius: 18, backgroundColor: '#f7f7fd', borderWidth: 1, borderColor: 'rgba(107,84,212,0.08)', padding: 18 }, reportTocTitle: { color: '#171b31', fontSize: 18, lineHeight: 24, fontWeight: '800' }, sectionRail: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, sectionPill: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#ffffff', borderWidth: 1, borderColor: 'rgba(107,84,212,0.12)' }, sectionPillActive: { backgroundColor: '#6b54d4', borderColor: '#6b54d4' }, sectionPillNumber: { color: '#6b54d4', fontSize: 12, lineHeight: 14, fontWeight: '800' }, sectionPillNumberActive: { color: '#ffffff' }, sectionPillText: { color: '#3c4260', fontSize: 13, lineHeight: 16, fontWeight: '700' }, sectionPillTextActive: { color: '#ffffff' }, reportBodyWrap: { marginTop: 8, gap: 16 }, reportSectionCard: { marginTop: 14, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(33,39,67,0.08)', backgroundColor: '#ffffff', padding: 20 }, reportSectionCardFeatured: { borderColor: 'rgba(107,84,212,0.24)', backgroundColor: '#faf8ff', shadowColor: '#6b54d4', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }, reportSectionIndex: { color: '#6b54d4', fontSize: 12, lineHeight: 16, fontWeight: '800', textTransform: 'uppercase' }, reportSectionTitle: { marginTop: 8, color: '#171b31', fontSize: 22, lineHeight: 28, fontWeight: '800' }, reportSectionLead: { marginTop: 10, color: '#313754', fontSize: 15, lineHeight: 24, fontWeight: '700' }, reportSectionBody: { marginTop: 10, color: '#626a84', fontSize: 15, lineHeight: 25 }, reportCallout: { marginTop: 14, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(246,191,69,0.28)', backgroundColor: '#fff9ec', padding: 16 }, reportCalloutLabel: { color: '#a36b24', fontSize: 12, lineHeight: 16, fontWeight: '800', textTransform: 'uppercase' }, reportCalloutText: { marginTop: 8, color: '#6a4a21', fontSize: 14, lineHeight: 22, fontWeight: '600' }, actionRow: { marginTop: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 16, backgroundColor: '#f7f7fd', borderWidth: 1, borderColor: 'rgba(107,84,212,0.08)', padding: 16 }, actionIndex: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#6b54d4', alignItems: 'center', justifyContent: 'center' }, actionIndexText: { color: '#ffffff', fontSize: 13, lineHeight: 16, fontWeight: '800' }, actionText: { flex: 1, color: '#3c4260', fontSize: 15, lineHeight: 24, fontWeight: '600' }, engineNote: { marginTop: 16, borderRadius: 16, backgroundColor: '#f7f7fd', borderWidth: 1, borderColor: 'rgba(107,84,212,0.08)', padding: 16 }, engineTitle: { color: '#171b31', fontSize: 15, lineHeight: 18, fontWeight: '800' }, engineBody: { marginTop: 6, color: '#626a84', fontSize: 13, lineHeight: 20 }, detailRow: { paddingTop: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(107,84,212,0.08)' }, detailTitle: { color: '#171b31', fontSize: 17, lineHeight: 22, fontWeight: '800' }, detailBody: { marginTop: 8, color: '#626a84', fontSize: 15, lineHeight: 22 }, tagWrap: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, tag: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#f3efff', borderWidth: 1, borderColor: 'rgba(107,84,212,0.12)' }, tagText: { color: '#4c3eb1', fontSize: 14, lineHeight: 18, fontWeight: '700' },
  modalScrim: { flex: 1, backgroundColor: 'rgba(9,16,14,0.48)', alignItems: 'center', justifyContent: 'center', padding: 18 }, modalCard: { width: '100%', maxWidth: 920, height: '88%', maxHeight: 780, borderRadius: 18, backgroundColor: '#fbfdfc', overflow: 'hidden' }, modalHeader: { paddingHorizontal: 18, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(23,34,29,0.08)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, modalTitle: { color: '#17221d', fontSize: 22, lineHeight: 26, fontWeight: '800' }, modalDone: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#eef3ef' }, modalDoneText: { color: '#17362f', fontSize: 14, lineHeight: 18, fontWeight: '800' }, modalSearchWrap: { padding: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(23,34,29,0.08)' }, modalSearchInput: { height: 52, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(23,34,29,0.14)', backgroundColor: '#fff', paddingHorizontal: 14, color: '#17221d', fontSize: 15 }, modalBody: { paddingHorizontal: 18 }, searchRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(23,34,29,0.08)' }, searchRowActive: { backgroundColor: '#f4f8f5' }, searchTitle: { color: '#17221d', fontSize: 15, lineHeight: 18, fontWeight: '800' }, searchTitleActive: { color: '#17362f' }, searchMeta: { marginTop: 4, color: '#72857d', fontSize: 12, lineHeight: 16, fontWeight: '700' }, cityModeHint: { paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(23,34,29,0.08)', backgroundColor: '#f6faf8' }, cityModeText: { color: '#5c6f67', fontSize: 13, lineHeight: 18, fontWeight: '700' }, cityColumns: { flex: 1, flexDirection: 'row', minHeight: 0 }, regionList: { width: 220, flexGrow: 0, flexShrink: 0, borderRightWidth: 1, borderRightColor: 'rgba(23,34,29,0.08)', backgroundColor: '#f3f7f4' }, regionItem: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(23,34,29,0.05)' }, regionItemActive: { backgroundColor: '#17362f' }, regionText: { color: '#264038', fontSize: 14, lineHeight: 18, fontWeight: '700' }, regionTextActive: { color: '#f7faf8' }, regionCount: { marginTop: 4, color: '#95a8a0', fontSize: 11, lineHeight: 14, fontWeight: '700' }, regionCountActive: { color: 'rgba(247,250,248,0.72)' }, regionHint: { paddingHorizontal: 16, paddingVertical: 8 }, regionHintText: { color: '#72857d', fontSize: 12, lineHeight: 16, fontWeight: '700' }, cityList: { flex: 1, minHeight: 0, paddingHorizontal: 18 }, cityPaneHeader: { paddingTop: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(23,34,29,0.08)' }, cityPaneTitle: { color: '#17221d', fontSize: 16, lineHeight: 20, fontWeight: '800' }, cityPaneMeta: { marginTop: 4, color: '#72857d', fontSize: 12, lineHeight: 16, fontWeight: '700' }, cityListItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(23,34,29,0.08)' }, cityListItemActive: { backgroundColor: '#f4f8f5' }, cityListTitle: { color: '#17221d', fontSize: 15, lineHeight: 18, fontWeight: '800' }, cityListTitleActive: { color: '#17362f' }, cityListMeta: { marginTop: 4, color: '#72857d', fontSize: 12, lineHeight: 16, fontWeight: '700' }, cityListMetaActive: { color: '#406257' }, cityListMetaSub: { marginTop: 4, color: '#98a9a2', fontSize: 11, lineHeight: 15, fontWeight: '700' }, cityListMetaSubActive: { color: '#5d7d72' }, cityEmpty: { paddingVertical: 28, alignItems: 'center', justifyContent: 'center' }, cityEmptyText: { maxWidth: 320, color: '#72857d', fontSize: 13, lineHeight: 20, fontWeight: '700', textAlign: 'center' },
  simplePage: { paddingHorizontal: 20, paddingTop: 24, gap: 14 }, pricingGrid: { marginTop: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 16 }, pricingCard: { flexGrow: 1, flexBasis: 240, minWidth: 240, borderRadius: 18, backgroundColor: '#ffffff', borderWidth: 1, borderColor: 'rgba(33,39,67,0.08)', padding: 22, shadowColor: '#1d2140', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }, pricingTitle: { color: '#171b31', fontSize: 22, lineHeight: 28, fontWeight: '800' }, pricingPrice: { marginTop: 12, color: '#6b54d4', fontSize: 30, lineHeight: 34, fontWeight: '800' }, pricingBody: { marginTop: 10, color: '#626a84', fontSize: 14, lineHeight: 22 }, pricingCta: { marginTop: 18, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171338' }, pricingCtaText: { color: '#ffffff', fontSize: 14, lineHeight: 18, fontWeight: '800' }, accountPanel: { marginTop: 18, borderRadius: 22, backgroundColor: '#ffffff', borderWidth: 1, borderColor: 'rgba(33,39,67,0.08)', padding: 22, shadowColor: '#1d2140', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }, accountTabs: { flexDirection: 'row', gap: 10 }, accountTab: { minWidth: 112, height: 42, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(107,84,212,0.16)', backgroundColor: '#ffffff' }, accountTabActive: { backgroundColor: '#6b54d4', borderColor: '#6b54d4' }, accountTabText: { color: '#535a77', fontSize: 14, lineHeight: 18, fontWeight: '800' }, accountTabTextActive: { color: '#ffffff' }, accountGrid: { marginTop: 18, gap: 16 }, accountField: { gap: 8 }, accountLabel: { color: '#4d5370', fontSize: 13, lineHeight: 18, fontWeight: '700' }, accountInput: { height: 50, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(107,84,212,0.14)', backgroundColor: '#fbfaff', paddingHorizontal: 14, color: '#171b31', fontSize: 15 }, genderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, genderChip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(107,84,212,0.14)', backgroundColor: '#ffffff' }, genderChipActive: { backgroundColor: '#6b54d4', borderColor: '#6b54d4' }, genderChipText: { color: '#535a77', fontSize: 14, lineHeight: 18, fontWeight: '800' }, genderChipTextActive: { color: '#ffffff' }, accountNotice: { marginTop: 12, color: '#6b54d4', fontSize: 14, lineHeight: 22, fontWeight: '700' }, secondaryWideBtn: { marginTop: 14, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#5450f6' }, loginPanel: { marginTop: 18, gap: 16 },
});
