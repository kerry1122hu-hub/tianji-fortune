const fs = require('fs');
const path = require('path');
const allTheCities = require('all-the-cities');
const chinaLocation = require('china-location/dist/location.json');
const { pinyin } = require('pinyin-pro');

const OUTPUT_PATH = path.resolve(__dirname, '..', 'generatedCityRegistry.js');
const ALLOWED_FEATURE_CODES = new Set(['PPLC', 'PPLA', 'PPLA2', 'PPLA3', 'PPLA4', 'PPL']);
const MAINLAND_EXCLUDED_CODES = new Set(['710000', '810000', '820000']);

const CHINA_MATCHERS = {
  '安徽省|宿州市': { matchName: 'Suzhou', pick: 'smallest', key: 'suzhou-ah' },
  '江苏省|苏州市': { matchName: 'Suzhou', pick: 'largest', key: 'suzhou' },
  '江苏省|泰州市': { matchName: 'Taizhou', pick: 'smallest', key: 'taizhou-js' },
  '浙江省|台州市': { matchName: 'Taizhou', pick: 'largest', key: 'taizhou-zj' },
  '山西省|吕梁市': { matchName: 'Luliang' },
  '内蒙古自治区|呼和浩特市': { matchName: 'Hohhot', key: 'hohhot' },
  '内蒙古自治区|鄂尔多斯市': { matchName: 'Ordos', key: 'ordos' },
  '内蒙古自治区|呼伦贝尔市': { matchName: 'Hulunbuir' },
  '内蒙古自治区|巴彦淖尔市': { matchName: 'Bayannur' },
  '内蒙古自治区|乌兰察布市': { matchName: 'Ulanqab' },
  '辽宁省|盘锦市': { matchName: 'Panjin' },
  '黑龙江省|哈尔滨市': { matchName: 'Harbin', key: 'haerbin' },
  '黑龙江省|齐齐哈尔市': { matchName: 'Qiqihar', key: 'qiqihar' },
  '黑龙江省|七台河市': { matchName: 'Qitaihe' },
  '江苏省|宿迁市': { matchName: 'Suqian' },
  '安徽省|铜陵市': { matchName: 'Tongling' },
  '安徽省|宣城市': { matchName: 'Xuancheng' },
  '江西省|鹰潭市': { matchName: 'Yingtan' },
  '山东省|东营市': { matchName: 'Dongying' },
  '河南省|三门峡市': { matchName: 'Sanmenxia' },
  '湖南省|永州市': { matchName: 'Yongzhou' },
  '广西壮族自治区|防城港市': { matchName: 'Fangchenggang' },
  '广西壮族自治区|百色市': { matchName: 'Baise' },
  '广西壮族自治区|贺州市': { matchName: 'Hezhou' },
  '广西壮族自治区|河池市': { matchName: 'Hechi' },
  '广西壮族自治区|崇左市': { matchName: 'Chongzuo' },
  '海南省|三沙市': { matchName: 'Sansha' },
  '海南省|儋州市': { matchName: 'Danzhou' },
  '四川省|雅安市': { matchName: "Ya'an", key: 'yaan' },
  '云南省|普洱市': { matchName: "Pu'er", key: 'puer' },
  '云南省|临沧市': { matchName: 'Lincang' },
  '西藏自治区|拉萨市': { matchName: 'Lhasa', key: 'lhasa' },
  '西藏自治区|昌都市': { matchName: 'Qamdo', key: 'changdu' },
  '西藏自治区|林芝市': { matchName: 'Nyingchi', key: 'linzhi' },
  '西藏自治区|山南市': { matchName: 'Shannan' },
  '西藏自治区|那曲市': { matchName: 'Nagqu' },
  '陕西省|延安市': { matchName: "Yan'an", key: 'yanan' },
  '陕西省|商洛市': { matchName: 'Shangluo' },
  '青海省|海东市': { matchName: 'Haidong' },
  '宁夏回族自治区|固原市': { matchName: 'Guyuan', key: 'guyuan' },
  '新疆维吾尔自治区|乌鲁木齐市': { matchName: 'Urumqi', key: 'urumqi' },
  '新疆维吾尔自治区|克拉玛依市': { matchName: 'Karamay', key: 'karamay' },
  '新疆维吾尔自治区|吐鲁番市': { matchName: 'Turpan' },
};

const CHINA_TIMEZONE_BY_PROVINCE = {
  新疆维吾尔自治区: 'Asia/Urumqi',
};

const MANUAL_COORDINATE_OVERRIDES = {
  '山西省|吕梁市': { label: 'Luliang', latitude: 37.5193, longitude: 111.1445 },
  '内蒙古自治区|呼伦贝尔市': { label: 'Hulunbuir', latitude: 49.2116, longitude: 119.7658 },
  '内蒙古自治区|乌兰察布市': { label: 'Ulanqab', latitude: 40.9948, longitude: 113.1326 },
  '辽宁省|盘锦市': { label: 'Panjin', latitude: 41.1198, longitude: 122.0708 },
  '黑龙江省|七台河市': { label: 'Qitaihe', latitude: 45.7706, longitude: 131.0031 },
  '江苏省|宿迁市': { label: 'Suqian', latitude: 33.963, longitude: 118.2752 },
  '安徽省|铜陵市': { label: 'Tongling', latitude: 30.9454, longitude: 117.8115 },
  '安徽省|宣城市': { label: 'Xuancheng', latitude: 30.9408, longitude: 118.7583 },
  '江西省|鹰潭市': { label: 'Yingtan', latitude: 28.2602, longitude: 117.0692 },
  '山东省|东营市': { label: 'Dongying', latitude: 37.4348, longitude: 118.6747 },
  '河南省|三门峡市': { label: 'Sanmenxia', latitude: 34.7725, longitude: 111.2003 },
  '湖南省|永州市': { label: 'Yongzhou', latitude: 26.4203, longitude: 111.613 },
  '广西壮族自治区|防城港市': { label: 'Fangchenggang', latitude: 21.6869, longitude: 108.3547 },
  '广西壮族自治区|百色市': { label: 'Baise', latitude: 23.9052, longitude: 106.6186 },
  '广西壮族自治区|贺州市': { label: 'Hezhou', latitude: 24.4035, longitude: 111.5672 },
  '广西壮族自治区|河池市': { label: 'Hechi', latitude: 24.6959, longitude: 108.0854 },
  '广西壮族自治区|崇左市': { label: 'Chongzuo', latitude: 22.3771, longitude: 107.3649 },
  '海南省|三沙市': { label: 'Sansha', latitude: 16.8327, longitude: 112.334 },
  '海南省|儋州市': { label: 'Danzhou', latitude: 19.5211, longitude: 109.5807 },
  '四川省|雅安市': { label: "Ya'an", latitude: 29.9805, longitude: 103.0415 },
  '云南省|普洱市': { label: "Pu'er", latitude: 22.8252, longitude: 100.9662 },
  '云南省|临沧市': { label: 'Lincang', latitude: 23.8777, longitude: 100.0888 },
  '西藏自治区|林芝市': { label: 'Nyingchi', latitude: 29.6547, longitude: 94.3623 },
  '西藏自治区|山南市': { label: 'Shannan', latitude: 29.2363, longitude: 91.7665 },
  '陕西省|延安市': { label: "Yan'an", latitude: 36.5854, longitude: 109.4898 },
  '陕西省|商洛市': { label: 'Shangluo', latitude: 33.8704, longitude: 109.9404 },
  '青海省|海东市': { label: 'Haidong', latitude: 36.5029, longitude: 102.1043 },
  '宁夏回族自治区|固原市': { label: 'Guyuan', latitude: 36.0158, longitude: 106.2426 },
};

const GLOBAL_CITY_SPECS = [
  { key: 'hong-kong', name: 'Hong Kong', country: 'HK', region: 'Hong Kong', province: 'Hong Kong', timezone: 'Asia/Hong_Kong', nativeLabel: '香港', aliases: ['hk'] },
  { key: 'macau', name: 'Macau', country: 'MO', region: 'Macau', province: 'Macau', timezone: 'Asia/Macau', nativeLabel: '澳门', aliases: ['macao'] },
  { key: 'taipei', name: 'Taipei', country: 'TW', region: 'Taiwan', province: 'Taipei', timezone: 'Asia/Taipei', nativeLabel: '台北', aliases: ['tai bei'] },
  { key: 'new-taipei', name: 'New Taipei', country: 'TW', region: 'Taiwan', province: 'New Taipei', timezone: 'Asia/Taipei', nativeLabel: '新北', manualCoords: { latitude: 25.0121, longitude: 121.4657 } },
  { key: 'taoyuan', name: 'Taoyuan City', country: 'TW', region: 'Taiwan', province: 'Taoyuan', timezone: 'Asia/Taipei', nativeLabel: '桃园', manualCoords: { latitude: 24.9937, longitude: 121.301 } },
  { key: 'taichung', name: 'Taichung', country: 'TW', region: 'Taiwan', province: 'Taichung', timezone: 'Asia/Taipei', nativeLabel: '台中', manualCoords: { latitude: 24.1477, longitude: 120.6736 } },
  { key: 'tainan', name: 'Tainan', country: 'TW', region: 'Taiwan', province: 'Tainan', timezone: 'Asia/Taipei', nativeLabel: '台南', manualCoords: { latitude: 22.9999, longitude: 120.227 } },
  { key: 'kaohsiung', name: 'Kaohsiung', country: 'TW', region: 'Taiwan', province: 'Kaohsiung', timezone: 'Asia/Taipei', nativeLabel: '高雄', manualCoords: { latitude: 22.6273, longitude: 120.3014 } },
  { key: 'keelung', name: 'Keelung', country: 'TW', region: 'Taiwan', province: 'Keelung', timezone: 'Asia/Taipei', nativeLabel: '基隆', manualCoords: { latitude: 25.1276, longitude: 121.7392 } },
  { key: 'hsinchu', name: 'Hsinchu', country: 'TW', region: 'Taiwan', province: 'Hsinchu', timezone: 'Asia/Taipei', nativeLabel: '新竹', manualCoords: { latitude: 24.8138, longitude: 120.9675 } },
  { key: 'chiayi', name: 'Chiayi', country: 'TW', region: 'Taiwan', province: 'Chiayi', timezone: 'Asia/Taipei', nativeLabel: '嘉义', manualCoords: { latitude: 23.4801, longitude: 120.4491 } },
  { key: 'singapore', name: 'Singapore', country: 'SG', region: 'Singapore', province: 'Singapore', timezone: 'Asia/Singapore', nativeLabel: '新加坡', aliases: ['xjp'] },
  { key: 'kuala-lumpur', name: 'Kuala Lumpur', country: 'MY', region: 'Malaysia', province: 'Kuala Lumpur', timezone: 'Asia/Kuala_Lumpur', nativeLabel: '吉隆坡' },
  { key: 'johor-bahru', name: 'Johor Bahru', country: 'MY', region: 'Malaysia', province: 'Johor', timezone: 'Asia/Kuala_Lumpur', nativeLabel: '新山' },
  { key: 'george-town', name: 'George Town', country: 'MY', region: 'Malaysia', province: 'Penang', timezone: 'Asia/Kuala_Lumpur', nativeLabel: '槟城', aliases: ['penang'] },
  { key: 'malacca', name: 'Malacca', country: 'MY', region: 'Malaysia', province: 'Malacca', timezone: 'Asia/Kuala_Lumpur', nativeLabel: '马六甲' },
  { key: 'bangkok', name: 'Bangkok', country: 'TH', region: 'Thailand', province: 'Bangkok', timezone: 'Asia/Bangkok', nativeLabel: '曼谷' },
  { key: 'chiang-mai', name: 'Chiang Mai', country: 'TH', region: 'Thailand', province: 'Chiang Mai', timezone: 'Asia/Bangkok', nativeLabel: '清迈' },
  { key: 'phuket', name: 'Phuket', country: 'TH', region: 'Thailand', province: 'Phuket', timezone: 'Asia/Bangkok', nativeLabel: '普吉' },
  { key: 'manila', name: 'Manila', country: 'PH', region: 'Philippines', province: 'Metro Manila', timezone: 'Asia/Manila', nativeLabel: '马尼拉' },
  { key: 'cebu', name: 'Cebu City', country: 'PH', region: 'Philippines', province: 'Cebu', timezone: 'Asia/Manila', nativeLabel: '宿务', aliases: ['cebu city'] },
  { key: 'davao', name: 'Davao', country: 'PH', region: 'Philippines', province: 'Davao del Sur', timezone: 'Asia/Manila', nativeLabel: '达沃' },
  { key: 'jakarta', name: 'Jakarta', country: 'ID', region: 'Indonesia', province: 'Jakarta', timezone: 'Asia/Jakarta', nativeLabel: '雅加达' },
  { key: 'surabaya', name: 'Surabaya', country: 'ID', region: 'Indonesia', province: 'East Java', timezone: 'Asia/Jakarta', nativeLabel: '泗水' },
  { key: 'medan', name: 'Medan', country: 'ID', region: 'Indonesia', province: 'North Sumatra', timezone: 'Asia/Jakarta', nativeLabel: '棉兰' },
  { key: 'tokyo', name: 'Tokyo', country: 'JP', region: 'Japan', province: 'Tokyo', timezone: 'Asia/Tokyo', nativeLabel: '东京' },
  { key: 'osaka', name: 'Osaka', country: 'JP', region: 'Japan', province: 'Osaka', timezone: 'Asia/Tokyo', nativeLabel: '大阪' },
  { key: 'yokohama', name: 'Yokohama', country: 'JP', region: 'Japan', province: 'Kanagawa', timezone: 'Asia/Tokyo', nativeLabel: '横滨' },
  { key: 'kyoto', name: 'Kyoto', country: 'JP', region: 'Japan', province: 'Kyoto', timezone: 'Asia/Tokyo', nativeLabel: '京都' },
  { key: 'nagoya', name: 'Nagoya', country: 'JP', region: 'Japan', province: 'Aichi', timezone: 'Asia/Tokyo', nativeLabel: '名古屋' },
  { key: 'fukuoka', name: 'Fukuoka', country: 'JP', region: 'Japan', province: 'Fukuoka', timezone: 'Asia/Tokyo', nativeLabel: '福冈' },
  { key: 'seoul', name: 'Seoul', country: 'KR', region: 'South Korea', province: 'Seoul', timezone: 'Asia/Seoul', nativeLabel: '首尔' },
  { key: 'busan', name: 'Busan', country: 'KR', region: 'South Korea', province: 'Busan', timezone: 'Asia/Seoul', nativeLabel: '釜山' },
  { key: 'jeju', name: 'Jeju City', country: 'KR', region: 'South Korea', province: 'Jeju', timezone: 'Asia/Seoul', nativeLabel: '济州' },
  { key: 'sydney', name: 'Sydney', country: 'AU', region: 'Australia', province: 'New South Wales', timezone: 'Australia/Sydney', nativeLabel: '悉尼' },
  { key: 'melbourne', name: 'Melbourne', country: 'AU', region: 'Australia', province: 'Victoria', timezone: 'Australia/Melbourne', nativeLabel: '墨尔本' },
  { key: 'brisbane', name: 'Brisbane', country: 'AU', region: 'Australia', province: 'Queensland', timezone: 'Australia/Brisbane', nativeLabel: '布里斯班' },
  { key: 'perth', name: 'Perth', country: 'AU', region: 'Australia', province: 'Western Australia', timezone: 'Australia/Perth', nativeLabel: '珀斯' },
  { key: 'adelaide', name: 'Adelaide', country: 'AU', region: 'Australia', province: 'South Australia', timezone: 'Australia/Adelaide', nativeLabel: '阿德莱德' },
  { key: 'canberra', name: 'Canberra', country: 'AU', region: 'Australia', province: 'Australian Capital Territory', timezone: 'Australia/Sydney', nativeLabel: '堪培拉' },
  { key: 'gold-coast', name: 'Gold Coast', country: 'AU', region: 'Australia', province: 'Queensland', timezone: 'Australia/Brisbane', nativeLabel: '黄金海岸' },
  { key: 'auckland', name: 'Auckland', country: 'NZ', region: 'New Zealand', province: 'Auckland', timezone: 'Pacific/Auckland', nativeLabel: '奥克兰' },
  { key: 'wellington', name: 'Wellington', country: 'NZ', region: 'New Zealand', province: 'Wellington', timezone: 'Pacific/Auckland', nativeLabel: '惠灵顿' },
  { key: 'christchurch', name: 'Christchurch', country: 'NZ', region: 'New Zealand', province: 'Canterbury', timezone: 'Pacific/Auckland', nativeLabel: '基督城' },
  { key: 'vancouver', name: 'Vancouver', country: 'CA', region: 'Canada', province: 'British Columbia', timezone: 'America/Vancouver', nativeLabel: '温哥华' },
  { key: 'toronto', name: 'Toronto', country: 'CA', region: 'Canada', province: 'Ontario', timezone: 'America/Toronto', nativeLabel: '多伦多' },
  { key: 'montreal', name: 'Montreal', country: 'CA', region: 'Canada', province: 'Quebec', timezone: 'America/Toronto', nativeLabel: '蒙特利尔' },
  { key: 'calgary', name: 'Calgary', country: 'CA', region: 'Canada', province: 'Alberta', timezone: 'America/Edmonton', nativeLabel: '卡尔加里' },
  { key: 'edmonton', name: 'Edmonton', country: 'CA', region: 'Canada', province: 'Alberta', timezone: 'America/Edmonton', nativeLabel: '埃德蒙顿' },
  { key: 'ottawa', name: 'Ottawa', country: 'CA', region: 'Canada', province: 'Ontario', timezone: 'America/Toronto', nativeLabel: '渥太华' },
  { key: 'richmond-ca', name: 'Richmond', country: 'CA', region: 'Canada', province: 'British Columbia', timezone: 'America/Vancouver', nativeLabel: '列治文', manualCoords: { latitude: 49.1666, longitude: -123.1336 } },
  { key: 'new-york', name: 'New York City', country: 'US', region: 'United States', province: 'New York', timezone: 'America/New_York', nativeLabel: '纽约', aliases: ['nyc'] },
  { key: 'los-angeles', name: 'Los Angeles', country: 'US', region: 'United States', province: 'California', timezone: 'America/Los_Angeles', nativeLabel: '洛杉矶', aliases: ['la'] },
  { key: 'san-francisco', name: 'San Francisco', country: 'US', region: 'United States', province: 'California', timezone: 'America/Los_Angeles', nativeLabel: '旧金山', aliases: ['sf'] },
  { key: 'seattle', name: 'Seattle', country: 'US', region: 'United States', province: 'Washington', timezone: 'America/Los_Angeles', nativeLabel: '西雅图' },
  { key: 'san-jose-us', name: 'San Jose', country: 'US', region: 'United States', province: 'California', timezone: 'America/Los_Angeles', nativeLabel: '圣何塞' },
  { key: 'irvine', name: 'Irvine', country: 'US', region: 'United States', province: 'California', timezone: 'America/Los_Angeles', nativeLabel: '尔湾' },
  { key: 'boston', name: 'Boston', country: 'US', region: 'United States', province: 'Massachusetts', timezone: 'America/New_York', nativeLabel: '波士顿' },
  { key: 'chicago', name: 'Chicago', country: 'US', region: 'United States', province: 'Illinois', timezone: 'America/Chicago', nativeLabel: '芝加哥' },
  { key: 'houston', name: 'Houston', country: 'US', region: 'United States', province: 'Texas', timezone: 'America/Chicago', nativeLabel: '休斯敦' },
  { key: 'dallas', name: 'Dallas', country: 'US', region: 'United States', province: 'Texas', timezone: 'America/Chicago', nativeLabel: '达拉斯' },
  { key: 'washington-dc', name: 'Washington', country: 'US', region: 'United States', province: 'District of Columbia', timezone: 'America/New_York', nativeLabel: '华盛顿', aliases: ['dc'], manualCoords: { latitude: 38.9072, longitude: -77.0369 } },
  { key: 'london', name: 'London', country: 'GB', region: 'United Kingdom', province: 'England', timezone: 'Europe/London', nativeLabel: '伦敦' },
  { key: 'manchester', name: 'Manchester', country: 'GB', region: 'United Kingdom', province: 'England', timezone: 'Europe/London', nativeLabel: '曼彻斯特' },
  { key: 'birmingham-uk', name: 'Birmingham', country: 'GB', region: 'United Kingdom', province: 'England', timezone: 'Europe/London', nativeLabel: '伯明翰' },
  { key: 'paris', name: 'Paris', country: 'FR', region: 'France', province: 'Ile-de-France', timezone: 'Europe/Paris', nativeLabel: '巴黎' },
  { key: 'berlin', name: 'Berlin', country: 'DE', region: 'Germany', province: 'Berlin', timezone: 'Europe/Berlin', nativeLabel: '柏林' },
  { key: 'frankfurt', name: 'Frankfurt am Main', country: 'DE', region: 'Germany', province: 'Hesse', timezone: 'Europe/Berlin', nativeLabel: '法兰克福', aliases: ['frankfurt'] },
  { key: 'munich', name: 'Munich', country: 'DE', region: 'Germany', province: 'Bavaria', timezone: 'Europe/Berlin', nativeLabel: '慕尼黑' },
  { key: 'amsterdam', name: 'Amsterdam', country: 'NL', region: 'Netherlands', province: 'North Holland', timezone: 'Europe/Amsterdam', nativeLabel: '阿姆斯特丹' },
  { key: 'milan', name: 'Milan', country: 'IT', region: 'Italy', province: 'Lombardy', timezone: 'Europe/Rome', nativeLabel: '米兰' },
  { key: 'rome', name: 'Rome', country: 'IT', region: 'Italy', province: 'Lazio', timezone: 'Europe/Rome', nativeLabel: '罗马' },
  { key: 'madrid', name: 'Madrid', country: 'ES', region: 'Spain', province: 'Community of Madrid', timezone: 'Europe/Madrid', nativeLabel: '马德里' },
  { key: 'barcelona', name: 'Barcelona', country: 'ES', region: 'Spain', province: 'Catalonia', timezone: 'Europe/Madrid', nativeLabel: '巴塞罗那' },
  { key: 'zurich', name: 'Zurich', country: 'CH', region: 'Switzerland', province: 'Zurich', timezone: 'Europe/Zurich', nativeLabel: '苏黎世' },
  { key: 'vienna', name: 'Vienna', country: 'AT', region: 'Austria', province: 'Vienna', timezone: 'Europe/Vienna', nativeLabel: '维也纳' },
  { key: 'dubai', name: 'Dubai', country: 'AE', region: 'UAE', province: 'Dubai', timezone: 'Asia/Dubai', nativeLabel: '迪拜' },
  { key: 'abu-dhabi', name: 'Abu Dhabi', country: 'AE', region: 'UAE', province: 'Abu Dhabi', timezone: 'Asia/Dubai', nativeLabel: '阿布扎比' },
  { key: 'doha', name: 'Doha', country: 'QA', region: 'Qatar', province: 'Doha', timezone: 'Asia/Qatar', nativeLabel: '多哈' },
  { key: 'riyadh', name: 'Riyadh', country: 'SA', region: 'Saudi Arabia', province: 'Riyadh', timezone: 'Asia/Riyadh', nativeLabel: '利雅得' },
];

function normalizeAscii(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '');
}

function stripChineseSuffix(value) {
  return String(value || '')
    .replace(/特别行政区$/, '')
    .replace(/自治州$/, '')
    .replace(/地区$/, '')
    .replace(/盟$/, '')
    .replace(/市$/, '');
}

function chineseToPinyin(value) {
  return pinyin(stripChineseSuffix(value), {
    toneType: 'none',
    type: 'array',
    nonZh: 'consecutive',
    v: true,
  }).join('');
}

function chineseToInitials(value) {
  return pinyin(stripChineseSuffix(value), {
    pattern: 'first',
    toneType: 'none',
    separator: '',
    nonZh: 'consecutive',
    v: true,
  });
}

function titleCaseWords(value) {
  return String(value || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildSearchText(parts) {
  return parts
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function buildWorldIndex(cities) {
  const index = new Map();
  for (const city of cities) {
    if (!ALLOWED_FEATURE_CODES.has(city.featureCode)) continue;
    const key = normalizeAscii(city.name);
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(city);
  }
  return index;
}

function chooseCandidate(candidates, pickMode) {
  if (!candidates.length) return null;
  const ordered = [...candidates].sort((left, right) => (right.population || 0) - (left.population || 0));
  if (pickMode === 'smallest') return ordered[ordered.length - 1];
  return ordered[0];
}

function createChinaCityKey(label, fallback, overrideKey) {
  if (overrideKey) return overrideKey;
  const normalized = normalizeAscii(label);
  if (normalized) return normalized;
  return normalizeAscii(fallback);
}

function findGlobalCity(spec) {
  const matched = allTheCities
    .filter((city) => city.country === spec.country && ALLOWED_FEATURE_CODES.has(city.featureCode))
    .filter((city) => normalizeAscii(city.name) === normalizeAscii(spec.name))
    .sort((left, right) => (right.population || 0) - (left.population || 0));
  if (matched[0]) return matched[0];
  if (spec.manualCoords) {
    return {
      name: spec.name,
      loc: { coordinates: [spec.manualCoords.longitude, spec.manualCoords.latitude] },
    };
  }
  return null;
}

function buildChinaCities() {
  const worldIndex = buildWorldIndex(allTheCities.filter((city) => city.country === 'CN'));
  const cities = [];
  const unresolved = [];

  for (const [provinceCode, provinceData] of Object.entries(chinaLocation)) {
    if (MAINLAND_EXCLUDED_CODES.has(provinceCode)) continue;
    if (provinceData.name === '台湾省') continue;
    for (const cityData of Object.values(provinceData.cities || {})) {
      if (!cityData.name.endsWith('市')) continue;

      const matcherKey = `${provinceData.name}|${cityData.name}`;
      const matcher = CHINA_MATCHERS[matcherKey] || {};
      const nativeLabel = stripChineseSuffix(cityData.name);
      const matchName = matcher.matchName || chineseToPinyin(cityData.name);
      const candidates = worldIndex.get(normalizeAscii(matchName)) || [];
      const candidate = chooseCandidate(candidates, matcher.pick);
      const manualOverride = MANUAL_COORDINATE_OVERRIDES[matcherKey];

      if (!candidate && !manualOverride) {
        unresolved.push(matcherKey);
        continue;
      }

      const label = candidate?.name || manualOverride.label;
      const latitude = candidate ? Number(candidate.loc.coordinates[1].toFixed(4)) : manualOverride.latitude;
      const longitude = candidate ? Number(candidate.loc.coordinates[0].toFixed(4)) : manualOverride.longitude;
      const key = createChinaCityKey(label, nativeLabel, matcher.key);
      const provincePinyin = chineseToPinyin(provinceData.name);
      const provinceInitials = chineseToInitials(provinceData.name);
      const cityPinyin = chineseToPinyin(cityData.name);
      const cityInitials = chineseToInitials(cityData.name);
      const aliases = Array.from(new Set([
        cityData.name,
        nativeLabel,
        provinceData.name,
        cityPinyin,
        cityInitials,
        provincePinyin,
        provinceInitials,
        matcher.matchName,
      ].filter(Boolean)));

      cities.push({
        key,
        label,
        nativeLabel,
        region: 'China',
        province: provinceData.name,
        timezone: CHINA_TIMEZONE_BY_PROVINCE[provinceData.name] || 'Asia/Shanghai',
        latitude,
        longitude,
        aliases,
        searchText: buildSearchText([
          label,
          nativeLabel,
          cityData.name,
          provinceData.name,
          cityPinyin,
          cityInitials,
          provincePinyin,
          provinceInitials,
          CHINA_TIMEZONE_BY_PROVINCE[provinceData.name] || 'Asia/Shanghai',
        ]),
      });
    }
  }

  if (unresolved.length) {
    console.warn('Unresolved China city matches:', unresolved);
  }

  return cities;
}

function buildGlobalCities() {
  return GLOBAL_CITY_SPECS.map((spec) => {
    const candidate = findGlobalCity(spec);
    if (!candidate) {
      throw new Error(`Missing global city match for ${spec.key} (${spec.name})`);
    }

    const nativePinyin = chineseToPinyin(spec.nativeLabel);
    const nativeInitials = chineseToInitials(spec.nativeLabel);
    return {
      key: spec.key,
      label: candidate.name,
      nativeLabel: spec.nativeLabel,
      region: spec.region,
      province: spec.province,
      timezone: spec.timezone,
      latitude: Number(candidate.loc.coordinates[1].toFixed(4)),
      longitude: Number(candidate.loc.coordinates[0].toFixed(4)),
      aliases: spec.aliases || [],
      searchText: buildSearchText([
        candidate.name,
        spec.nativeLabel,
        spec.region,
        spec.province,
        spec.timezone,
        nativePinyin,
        nativeInitials,
        ...(spec.aliases || []),
      ]),
    };
  });
}

function serializeCity(city) {
  return `  ${JSON.stringify(city)}`;
}

function buildOutputFile(cities) {
  return `export const CITY_OPTIONS = [\n${cities.map(serializeCity).join(',\n')}\n];\n\nexport function getCitySearchText(city) {\n  return city?.searchText || '';\n}\n`;
}

const chinaCities = buildChinaCities();
const globalCities = buildGlobalCities();
const allCities = [...chinaCities, ...globalCities];

fs.writeFileSync(OUTPUT_PATH, buildOutputFile(allCities), 'utf8');
console.log(`Wrote ${allCities.length} cities to ${OUTPUT_PATH}`);

