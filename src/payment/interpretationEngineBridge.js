import {
  AstroTime,
  Body,
  Ecliptic,
  EclipticGeoMoon,
  GeoVector,
  Observer,
  RotateVector,
  Rotation_HOR_ECL,
  SunPosition,
  SphereFromVector,
  Vector,
} from 'astronomy-engine';
import { runInterpretationPipeline } from './interpretation_engine';
import { TAG_REGISTRY } from './interpretation_engine/tag_matching/tag_registry';

const SIGN_CODES = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
const SIGN_LABELS = {
  aries: '白羊',
  taurus: '金牛',
  gemini: '双子',
  cancer: '巨蟹',
  leo: '狮子',
  virgo: '处女',
  libra: '天秤',
  scorpio: '天蝎',
  sagittarius: '射手',
  capricorn: '摩羯',
  aquarius: '水瓶',
  pisces: '双鱼',
};

const ELEMENT_BY_SIGN = {
  aries: 'fire',
  leo: 'fire',
  sagittarius: 'fire',
  taurus: 'earth',
  virgo: 'earth',
  capricorn: 'earth',
  gemini: 'air',
  libra: 'air',
  aquarius: 'air',
  cancer: 'water',
  scorpio: 'water',
  pisces: 'water',
};

const ELEMENT_LABELS = {
  fire: '火象',
  earth: '土象',
  air: '风象',
  water: '水象',
};

const PLANET_DEFS = [
  { code: 'SUN', label: '太阳', body: Body.Sun, symbol: '☉', color: '#f4a623' },
  { code: 'MOON', label: '月亮', body: Body.Moon, symbol: '☽', color: '#7c8cf5' },
  { code: 'MERCURY', label: '水星', body: Body.Mercury, symbol: '☿', color: '#35a77a' },
  { code: 'VENUS', label: '金星', body: Body.Venus, symbol: '♀', color: '#d86cb3' },
  { code: 'MARS', label: '火星', body: Body.Mars, symbol: '♂', color: '#ea5a47' },
  { code: 'JUPITER', label: '木星', body: Body.Jupiter, symbol: '♃', color: '#d9a441' },
  { code: 'SATURN', label: '土星', body: Body.Saturn, symbol: '♄', color: '#82715d' },
  { code: 'URANUS', label: '天王星', body: Body.Uranus, symbol: '♅', color: '#34b7cc' },
  { code: 'NEPTUNE', label: '海王星', body: Body.Neptune, symbol: '♆', color: '#5976f4' },
  { code: 'PLUTO', label: '冥王星', body: Body.Pluto, symbol: '♇', color: '#6f4f9f' },
];

export const ENGINE_INFO = {
  id: 'astronomy-engine',
  version: '2.1.19',
  license: 'MIT',
  author: 'Don Cross',
  runtimes: ['JavaScript', 'TypeScript', 'Python', 'C#'],
  summary: 'Active western chart engine for MingSky web results.',
};

const CITY_OPTIONS = [
  { key: 'beijing', label: 'Beijing', region: 'China', province: '北京市', timezone: 'Asia/Shanghai', latitude: 39.9042, longitude: 116.4074 },
  { key: 'shanghai', label: 'Shanghai', region: 'China', province: '上海市', timezone: 'Asia/Shanghai', latitude: 31.2304, longitude: 121.4737 },
  { key: 'tianjin', label: 'Tianjin', region: 'China', province: '天津市', timezone: 'Asia/Shanghai', latitude: 39.0842, longitude: 117.2009 },
  { key: 'chongqing', label: 'Chongqing', region: 'China', province: '重庆市', timezone: 'Asia/Shanghai', latitude: 29.563, longitude: 106.5516 },
  { key: 'guangzhou', label: 'Guangzhou', region: 'China', province: '广东省', timezone: 'Asia/Shanghai', latitude: 23.1291, longitude: 113.2644 },
  { key: 'shenzhen', label: 'Shenzhen', region: 'China', province: '广东省', timezone: 'Asia/Shanghai', latitude: 22.5431, longitude: 114.0579 },
  { key: 'foshan', label: 'Foshan', region: 'China', province: '广东省', timezone: 'Asia/Shanghai', latitude: 23.0219, longitude: 113.1219 },
  { key: 'hangzhou', label: 'Hangzhou', region: 'China', province: '浙江省', timezone: 'Asia/Shanghai', latitude: 30.2741, longitude: 120.1551 },
  { key: 'ningbo', label: 'Ningbo', region: 'China', province: '浙江省', timezone: 'Asia/Shanghai', latitude: 29.8683, longitude: 121.544 },
  { key: 'wenzhou', label: 'Wenzhou', region: 'China', province: '浙江省', timezone: 'Asia/Shanghai', latitude: 27.9949, longitude: 120.6994 },
  { key: 'nanjing', label: 'Nanjing', region: 'China', province: '江苏省', timezone: 'Asia/Shanghai', latitude: 32.0603, longitude: 118.7969 },
  { key: 'suzhou', label: 'Suzhou', region: 'China', province: '江苏省', timezone: 'Asia/Shanghai', latitude: 31.2989, longitude: 120.5853 },
  { key: 'wuhan', label: 'Wuhan', region: 'China', province: '湖北省', timezone: 'Asia/Shanghai', latitude: 30.5928, longitude: 114.3055 },
  { key: 'changsha', label: 'Changsha', region: 'China', province: '湖南省', timezone: 'Asia/Shanghai', latitude: 28.2282, longitude: 112.9388 },
  { key: 'chengdu', label: 'Chengdu', region: 'China', province: '四川省', timezone: 'Asia/Shanghai', latitude: 30.5728, longitude: 104.0668 },
  { key: 'xian', label: 'Xi’an', region: 'China', province: '陕西省', timezone: 'Asia/Shanghai', latitude: 34.3416, longitude: 108.9398 },
  { key: 'zhengzhou', label: 'Zhengzhou', region: 'China', province: '河南省', timezone: 'Asia/Shanghai', latitude: 34.7466, longitude: 113.6254 },
  { key: 'jinan', label: 'Jinan', region: 'China', province: '山东省', timezone: 'Asia/Shanghai', latitude: 36.6512, longitude: 117.1201 },
  { key: 'qingdao', label: 'Qingdao', region: 'China', province: '山东省', timezone: 'Asia/Shanghai', latitude: 36.0671, longitude: 120.3826 },
  { key: 'yantai', label: 'Yantai', region: 'China', province: '山东省', timezone: 'Asia/Shanghai', latitude: 37.4638, longitude: 121.4479 },
  { key: 'weihai', label: 'Weihai', region: 'China', province: '山东省', timezone: 'Asia/Shanghai', latitude: 37.5135, longitude: 122.1205 },
  { key: 'linyi', label: 'Linyi', region: 'China', province: '山东省', timezone: 'Asia/Shanghai', latitude: 35.1047, longitude: 118.3564 },
  { key: 'haerbin', label: 'Harbin', region: 'China', province: '黑龙江省', timezone: 'Asia/Shanghai', latitude: 45.8038, longitude: 126.5349 },
  { key: 'changchun', label: 'Changchun', region: 'China', province: '吉林省', timezone: 'Asia/Shanghai', latitude: 43.8171, longitude: 125.3235 },
  { key: 'shenyang', label: 'Shenyang', region: 'China', province: '辽宁省', timezone: 'Asia/Shanghai', latitude: 41.8057, longitude: 123.4315 },
  { key: 'shijiazhuang', label: 'Shijiazhuang', region: 'China', province: '河北省', timezone: 'Asia/Shanghai', latitude: 38.0428, longitude: 114.5149 },
  { key: 'taiyuan', label: 'Taiyuan', region: 'China', province: '山西省', timezone: 'Asia/Shanghai', latitude: 37.8706, longitude: 112.5489 },
  { key: 'hefei', label: 'Hefei', region: 'China', province: '安徽省', timezone: 'Asia/Shanghai', latitude: 31.8206, longitude: 117.2272 },
  { key: 'fuzhou', label: 'Fuzhou', region: 'China', province: '福建省', timezone: 'Asia/Shanghai', latitude: 26.0745, longitude: 119.2965 },
  { key: 'xiamen', label: 'Xiamen', region: 'China', province: '福建省', timezone: 'Asia/Shanghai', latitude: 24.4798, longitude: 118.0894 },
  { key: 'nanchang', label: 'Nanchang', region: 'China', province: '江西省', timezone: 'Asia/Shanghai', latitude: 28.6829, longitude: 115.8582 },
  { key: 'nanning', label: 'Nanning', region: 'China', province: '广西壮族自治区', timezone: 'Asia/Shanghai', latitude: 22.817, longitude: 108.3669 },
  { key: 'haikou', label: 'Haikou', region: 'China', province: '海南省', timezone: 'Asia/Shanghai', latitude: 20.044, longitude: 110.1983 },
  { key: 'kunming', label: 'Kunming', region: 'China', province: '云南省', timezone: 'Asia/Shanghai', latitude: 24.8797, longitude: 102.8332 },
  { key: 'guiyang', label: 'Guiyang', region: 'China', province: '贵州省', timezone: 'Asia/Shanghai', latitude: 26.647, longitude: 106.6302 },
  { key: 'lanzhou', label: 'Lanzhou', region: 'China', province: '甘肃省', timezone: 'Asia/Shanghai', latitude: 36.0611, longitude: 103.8343 },
  { key: 'xining', label: 'Xining', region: 'China', province: '青海省', timezone: 'Asia/Shanghai', latitude: 36.6171, longitude: 101.7782 },
  { key: 'yinchuan', label: 'Yinchuan', region: 'China', province: '宁夏回族自治区', timezone: 'Asia/Shanghai', latitude: 38.4872, longitude: 106.2309 },
  { key: 'lhasa', label: 'Lhasa', region: 'China', province: '西藏自治区', timezone: 'Asia/Shanghai', latitude: 29.652, longitude: 91.1721 },
  { key: 'urumqi', label: 'Urumqi', region: 'China', province: '新疆维吾尔自治区', timezone: 'Asia/Urumqi', latitude: 43.8256, longitude: 87.6168 },
  { key: 'kashgar', label: 'Kashgar', region: 'China', province: '新疆维吾尔自治区', timezone: 'Asia/Urumqi', latitude: 39.4677, longitude: 75.9898 },
  { key: 'perth', label: 'Perth', region: 'Australia', province: 'Western Australia', timezone: 'Australia/Perth', latitude: -31.9523, longitude: 115.8613 },
  { key: 'sydney', label: 'Sydney', region: 'Australia', province: 'New South Wales', timezone: 'Australia/Sydney', latitude: -33.8688, longitude: 151.2093 },
  { key: 'melbourne', label: 'Melbourne', region: 'Australia', province: 'Victoria', timezone: 'Australia/Melbourne', latitude: -37.8136, longitude: 144.9631 },
  { key: 'brisbane', label: 'Brisbane', region: 'Australia', province: 'Queensland', timezone: 'Australia/Brisbane', latitude: -27.4698, longitude: 153.0251 },
  { key: 'adelaide', label: 'Adelaide', region: 'Australia', province: 'South Australia', timezone: 'Australia/Adelaide', latitude: -34.9285, longitude: 138.6007 },
  { key: 'auckland', label: 'Auckland', region: 'New Zealand', province: 'Auckland', timezone: 'Pacific/Auckland', latitude: -36.8509, longitude: 174.7645 },
  { key: 'singapore', label: 'Singapore', region: 'Singapore', province: 'Singapore', timezone: 'Asia/Singapore', latitude: 1.3521, longitude: 103.8198 },
  { key: 'hong-kong', label: 'Hong Kong', region: 'Hong Kong', province: 'Hong Kong', timezone: 'Asia/Hong_Kong', latitude: 22.3193, longitude: 114.1694 },
  { key: 'taipei', label: 'Taipei', region: 'Taiwan', province: 'Taipei', timezone: 'Asia/Taipei', latitude: 25.033, longitude: 121.5654 },
  { key: 'tokyo', label: 'Tokyo', region: 'Japan', province: 'Tokyo', timezone: 'Asia/Tokyo', latitude: 35.6764, longitude: 139.65 },
  { key: 'osaka', label: 'Osaka', region: 'Japan', province: 'Osaka', timezone: 'Asia/Tokyo', latitude: 34.6937, longitude: 135.5022 },
  { key: 'seoul', label: 'Seoul', region: 'South Korea', province: 'Seoul', timezone: 'Asia/Seoul', latitude: 37.5665, longitude: 126.978 },
  { key: 'bangkok', label: 'Bangkok', region: 'Thailand', province: 'Bangkok', timezone: 'Asia/Bangkok', latitude: 13.7563, longitude: 100.5018 },
  { key: 'kuala-lumpur', label: 'Kuala Lumpur', region: 'Malaysia', province: 'Kuala Lumpur', timezone: 'Asia/Kuala_Lumpur', latitude: 3.139, longitude: 101.6869 },
  { key: 'jakarta', label: 'Jakarta', region: 'Indonesia', province: 'Jakarta', timezone: 'Asia/Jakarta', latitude: -6.2088, longitude: 106.8456 },
  { key: 'manila', label: 'Manila', region: 'Philippines', province: 'Metro Manila', timezone: 'Asia/Manila', latitude: 14.5995, longitude: 120.9842 },
  { key: 'dubai', label: 'Dubai', region: 'UAE', province: 'Dubai', timezone: 'Asia/Dubai', latitude: 25.2048, longitude: 55.2708 },
  { key: 'london', label: 'London', region: 'United Kingdom', province: 'England', timezone: 'Europe/London', latitude: 51.5072, longitude: -0.1276 },
  { key: 'paris', label: 'Paris', region: 'France', province: 'Île-de-France', timezone: 'Europe/Paris', latitude: 48.8566, longitude: 2.3522 },
  { key: 'berlin', label: 'Berlin', region: 'Germany', province: 'Berlin', timezone: 'Europe/Berlin', latitude: 52.52, longitude: 13.405 },
  { key: 'new-york', label: 'New York', region: 'United States', province: 'New York', timezone: 'America/New_York', latitude: 40.7128, longitude: -74.006 },
  { key: 'los-angeles', label: 'Los Angeles', region: 'United States', province: 'California', timezone: 'America/Los_Angeles', latitude: 34.0522, longitude: -118.2437 },
  { key: 'san-francisco', label: 'San Francisco', region: 'United States', province: 'California', timezone: 'America/Los_Angeles', latitude: 37.7749, longitude: -122.4194 },
  { key: 'toronto', label: 'Toronto', region: 'Canada', province: 'Ontario', timezone: 'America/Toronto', latitude: 43.6532, longitude: -79.3832 },
  { key: 'vancouver', label: 'Vancouver', region: 'Canada', province: 'British Columbia', timezone: 'America/Vancouver', latitude: 49.2827, longitude: -123.1207 },
  { key: 'amsterdam', label: 'Amsterdam', region: 'Netherlands', province: 'North Holland', timezone: 'Europe/Amsterdam', latitude: 52.3676, longitude: 4.9041 },
];

const REPORT_PRESETS = {
  home: {
    eyebrow: 'MingSky Signature',
    title: '把出生信息变成真正可读的星盘报告',
    summary: '先看热门报告，再进入可选择的出生信息面板，最后拿到真实天体位置驱动的结果页。',
  },
  'past-life': {
    title: '前世报告',
    focus: 'self',
    intro: '探索前世，发现人生意义',
  },
  personality: {
    title: '性格报告',
    focus: 'self',
    intro: '发现你个性的核心',
  },
  relationship: {
    title: '关系报告',
    focus: 'relationship',
    intro: '深入了解你的人际关系特征',
  },
  monthly: {
    title: '月度预测报告',
    focus: 'career',
    intro: '利用个性化指导规划你的月度计划',
  },
  compatibility: {
    title: '兼容性报告',
    focus: 'relationship',
    intro: '揭开你人际关系中的动态',
  },
  wealth: {
    title: '财务潜力报告',
    focus: 'wealth',
    intro: '了解你的财务优势和机遇',
  },
  evolution: {
    title: '生命进化报告',
    focus: 'career',
    intro: '把成长主题整理成更长期的方向感',
  },
};

const FOCUS_OPTIONS = [
  { key: 'self', label: '自我认知' },
  { key: 'relationship', label: '关系模式' },
  { key: 'career', label: '事业轨迹' },
  { key: 'wealth', label: '财富节奏' },
];

const ASPECT_RULES = [
  { type: 'conjunction', angle: 0, orb: 8, label: '合相' },
  { type: 'sextile', angle: 60, orb: 4, label: '六合' },
  { type: 'square', angle: 90, orb: 6, label: '刑相' },
  { type: 'trine', angle: 120, orb: 6, label: '拱相' },
  { type: 'opposition', angle: 180, orb: 8, label: '对冲' },
];

const TAG_LABELS = {
  'self.values.self_definition': '自我定位',
  'self.growth_pattern.self_reinvention': '自我重塑',
  'self.temperament.magnetic_visibility': '存在感与吸引力',
  'self.temperament.deep_internalization': '内在消化能力',
  'self.temperament.fast_reactivity': '反应速度快',
  'self.decision_style.analytic_patterning': '分析式思考',
  'self.decision_style.strategic_indirection': '策略感',
  'self.decision_style.dual_track_thinking': '双轨思维',
  'self.shadow.control_through_withdrawal': '退后掌控',
  'self.shadow.overresponsibility': '过度承担',
  'relationship.attachment_style.reassurance_hunger': '确认需求',
  'relationship.attachment_style.high_selectivity': '关系门槛高',
  'relationship.attachment_style.slow_to_trust': '慢热信任',
  'relationship.partnership_dynamics.intense_bonding': '强连结关系',
  'relationship.family_patterns.early_responsibility': '早期责任模式',
  'relationship.social_mode.selective_visibility': '选择性社交曝光',
  'relationship.social_mode.networked_support': '网络支持力',
  'career.strengths.earned_respect': '靠实力赢得信任',
  'career.trajectory.late_bloomer': '后劲型发展',
  'career.leadership_style.public_leadership': '公开领导力',
  'career.strengths.specialist_mastery': '专业深耕能力',
  'wealth.earning_style.volatile_growth': '波动型增长',
  'wealth.earning_style.accumulative_discipline': '积累型财富节奏',
  'health.vitality.fluctuating_reserves': '精力储备波动',
  'timing.upcoming_cycle.visibility_rise': '曝光上升期',
  'timing.current_season.consolidation_phase': '整固阶段',
  'purpose.lessons.delayed_maturation': '延迟成熟课题',
  'purpose.lessons.crisis_repatterning': '危机后的重组课题',
  'spirit.archetypes.sovereign_presence': '主场感',
  'spirit.symbolic_themes.inner_refinement': '内在打磨',
};

const INSIGHT_COPY = {
  self_definition_expands_through_visibility: {
    title: '你适合在被看见的环境里长出自我定义',
    body: '当表达空间、角色感和外部回应被同时打开时，你会更容易确认自己的位置，也更知道该把力量放到哪里。',
  },
  interiority_needs_trust_and_processing_space: {
    title: '你的感受需要先被消化，再被表达',
    body: '你不是没有情绪，而是更需要先在内在整理它们。安全感和处理空间一旦够了，你的表达反而会更准确。',
  },
  thinking_prefers_pattern_and_strategy: {
    title: '你更像一个先看结构再行动的人',
    body: '你习惯先理解走势、关系和成本，再决定什么时候推进。这样的思考方式让你在复杂局面里更稳。',
  },
  bonds_need_reassurance_but_open_slowly: {
    title: '你在关系里既需要确定感，也需要时间',
    body: '你不会轻易把信任一次性交出去，但一旦确认关系可靠，就会很认真地投入并长期经营。',
  },
  partnerships_can_be_intense_and_formative: {
    title: '重要关系常常会深刻地塑造你',
    body: '你与人的连结很少只是轻轻掠过，反而更容易成为你重新认识自己、确认边界与价值排序的场域。',
  },
  career_compounds_through_discipline: {
    title: '你的事业更像复利，不像爆发',
    body: '长期积累、专业深耕和稳定交付是你最可靠的增长方式。速度未必最早，但后劲往往更强。',
  },
  leadership_grows_with_public_exposure: {
    title: '越到台前，你越容易长出领导力',
    body: '当你开始承担公开角色、面向更大范围表达或整合资源时，存在感和带动力会明显变强。',
  },
  money_builds_best_with_patience_andStructure: {
    title: '你的财富节奏更适合稳扎稳打',
    body: '预算感、长期配置和风险边界，比情绪化冲动更适合你。把资源做成系统，会比赌一把更有效。',
  },
};

function clampValue(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeLongitude(value) {
  let next = value % 360;
  if (next < 0) next += 360;
  return next;
}

function longitudeDistance(left, right) {
  const delta = Math.abs(normalizeLongitude(left) - normalizeLongitude(right));
  return delta > 180 ? 360 - delta : delta;
}

function signedLongitudeDelta(left, right) {
  let delta = normalizeLongitude(right) - normalizeLongitude(left);
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta;
}

function getSignFromLongitude(longitude) {
  const normalized = normalizeLongitude(longitude);
  const index = Math.floor(normalized / 30) % 12;
  return {
    code: SIGN_CODES[index],
    label: SIGN_LABELS[SIGN_CODES[index]],
    degree: normalized % 30,
    index,
  };
}

function formatDegree(value) {
  const degree = Math.floor(value);
  const minute = Math.floor((value - degree) * 60);
  return `${degree}°${String(minute).padStart(2, '0')}`;
}

function hashSeed(input) {
  let value = 0;
  for (let index = 0; index < input.length; index += 1) {
    value = (value * 31 + input.charCodeAt(index)) % 2147483647;
  }
  return value;
}

function getTimeZoneOffsetMinutes(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const map = {};
  for (const part of parts) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }
  const utcEquivalent = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );
  return Math.round((utcEquivalent - date.getTime()) / 60000);
}

function zonedDateTimeToUtc(dateString, timeString, timeZone) {
  const [year, month, day] = dateString.split('-').map(Number);
  const [hour, minute] = timeString.split(':').map(Number);
  let guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  for (let index = 0; index < 4; index += 1) {
    const offsetMinutes = getTimeZoneOffsetMinutes(guess, timeZone);
    const refined = new Date(Date.UTC(year, month - 1, day, hour, minute, 0) - offsetMinutes * 60000);
    if (Math.abs(refined.getTime() - guess.getTime()) < 1000) return refined;
    guess = refined;
  }
  return guess;
}

function getCityByKey(cityKey) {
  return CITY_OPTIONS.find((city) => city.key === cityKey) || CITY_OPTIONS[0];
}

function calculateAscendantLongitude(date, observer) {
  const time = new AstroTime(date);
  const rotation = Rotation_HOR_ECL(time, observer);
  const eastVector = new Vector(0, -1, 0, time);
  const eclipticVector = RotateVector(rotation, eastVector);
  const sphere = SphereFromVector(eclipticVector);
  return normalizeLongitude(sphere.lon);
}

function getWholeSignHouseNumber(planetLongitude, ascLongitude) {
  const planetSign = getSignFromLongitude(planetLongitude).index;
  const ascSign = getSignFromLongitude(ascLongitude).index;
  return ((planetSign - ascSign + 12) % 12) + 1;
}

function buildHouseSigns(ascLongitude) {
  const ascSign = getSignFromLongitude(ascLongitude).index;
  return Array.from({ length: 12 }, (_, index) => {
    const signIndex = (ascSign + index) % 12;
    return {
      houseNumber: index + 1,
      sign: SIGN_CODES[signIndex],
      signLabel: SIGN_LABELS[SIGN_CODES[signIndex]],
      longitude: normalizeLongitude(signIndex * 30),
    };
  });
}

function getGeocentricLongitude(body, date) {
  if (body === Body.Sun) {
    return normalizeLongitude(SunPosition(date).elon);
  }
  if (body === Body.Moon) {
    return normalizeLongitude(EclipticGeoMoon(date).lon);
  }
  return normalizeLongitude(Ecliptic(GeoVector(body, date, true)).elon);
}

function buildPlanetPositions(date, ascLongitude) {
  return PLANET_DEFS.map((planet) => {
    const longitude = getGeocentricLongitude(planet.body, date);
    const longitudeTomorrow = getGeocentricLongitude(planet.body, new Date(date.getTime() + 86400000));
    const signedDelta = signedLongitudeDelta(longitude, longitudeTomorrow);
    const sign = getSignFromLongitude(longitude);
    return {
      code: planet.code,
      label: planet.label,
      symbol: planet.symbol,
      color: planet.color,
      longitude,
      sign: sign.code,
      signLabel: sign.label,
      signDegree: sign.degree,
      degreeText: formatDegree(sign.degree),
      houseNumber: getWholeSignHouseNumber(longitude, ascLongitude),
      motion: Math.abs(signedDelta) < 0.01 ? 'stationary' : signedDelta < 0 ? 'retrograde' : 'direct',
    };
  });
}

function buildAspectList(planets) {
  const aspects = [];
  for (let left = 0; left < planets.length; left += 1) {
    for (let right = left + 1; right < planets.length; right += 1) {
      const delta = longitudeDistance(planets[left].longitude, planets[right].longitude);
      const match = ASPECT_RULES.find((rule) => Math.abs(delta - rule.angle) <= rule.orb);
      if (!match) continue;
      const orb = Math.abs(delta - match.angle);
      aspects.push({
        code: `${planets[left].code}_${match.type.toUpperCase()}_${planets[right].code}`,
        type: match.type,
        label: match.label,
        left: planets[left],
        right: planets[right],
        orb,
        strengthScore: Number(clampValue(1 - orb / match.orb, 0.35, 1).toFixed(2)),
      });
    }
  }
  return aspects.sort((a, b) => a.orb - b.orb).slice(0, 12);
}

function buildDerivedMetrics(planets, ascSignCode) {
  const relevantPoints = planets.filter((planet) => ['SUN', 'MOON', 'MERCURY', 'VENUS', 'MARS', 'JUPITER', 'SATURN'].includes(planet.code));
  const elementScores = { fire: 0, earth: 0, air: 0, water: 0 };
  for (const point of [...relevantPoints, { sign: ascSignCode }]) {
    const element = ELEMENT_BY_SIGN[point.sign];
    elementScores[element] += 1;
  }

  const total = Object.values(elementScores).reduce((sum, value) => sum + value, 0) || 1;
  const dominantElement = Object.entries(elementScores).sort((left, right) => right[1] - left[1])[0][0];
  const angularCount = planets.filter((planet) => [1, 4, 7, 10].includes(planet.houseNumber)).length;

  const planetScores = planets.map((planet) => ({
    code: planet.code,
    score: ([1, 4, 7, 10].includes(planet.houseNumber) ? 1.2 : 0.75) + (planet.code === 'SUN' || planet.code === 'MOON' ? 0.35 : 0),
  }));
  const dominantPlanet = planetScores.sort((left, right) => right.score - left.score)[0]?.code || 'SUN';

  return [
    { metric_code: 'ELEMENT_FIRE_SCORE', value: Number((elementScores.fire / total).toFixed(2)) },
    { metric_code: 'ELEMENT_EARTH_SCORE', value: Number((elementScores.earth / total).toFixed(2)) },
    { metric_code: 'ELEMENT_AIR_SCORE', value: Number((elementScores.air / total).toFixed(2)) },
    { metric_code: 'ELEMENT_WATER_SCORE', value: Number((elementScores.water / total).toFixed(2)) },
    { metric_code: 'DOMINANT_ELEMENT', value: dominantElement.toUpperCase() },
    { metric_code: 'DOMINANT_PLANET', value: dominantPlanet },
    { metric_code: 'ANGULAR_HOUSE_SCORE', value: Number((angularCount / planets.length).toFixed(2)) },
  ];
}

function buildPatternFacts(planets) {
  const signBuckets = new Map();
  for (const planet of planets) {
    const bucket = signBuckets.get(planet.sign) || [];
    bucket.push(planet.code);
    signBuckets.set(planet.sign, bucket);
  }
  const stellium = [...signBuckets.values()].find((bucket) => bucket.length >= 3);
  if (!stellium) return [];
  return [{ pattern_code: 'STELLIUM', value: stellium }];
}

function pointFact(factId, planet) {
  return {
    fact_id: factId,
    fact_code: `${factId}_${planet.code.toLowerCase()}`,
    fact_type: 'point',
    qualifiers: {
      point_code: planet.code,
      sign: planet.sign,
      house_number: planet.houseNumber,
      motion: planet.motion,
      longitude_deg: Number(planet.longitude.toFixed(4)),
      sign_degree: Number(planet.signDegree.toFixed(4)),
    },
    confidence: 0.98,
  };
}

function houseFact(factId, house) {
  return {
    fact_id: factId,
    fact_code: `${factId}_house_${house.houseNumber}`,
    fact_type: 'house',
    qualifiers: {
      house_number: house.houseNumber,
      sign: house.sign,
      cusp_longitude_deg: Number(house.longitude.toFixed(4)),
    },
    confidence: 0.96,
  };
}

function aspectFact(factId, aspect) {
  return {
    fact_id: factId,
    fact_code: `${factId}_${aspect.code.toLowerCase()}`,
    fact_type: 'aspect',
    qualifiers: {
      point_a_code: aspect.left.code,
      point_b_code: aspect.right.code,
      aspect_type: aspect.type,
      orb_deg: Number(aspect.orb.toFixed(2)),
      strength_score: aspect.strengthScore,
      exact: aspect.orb <= 1,
    },
    confidence: 0.92,
  };
}

function metricFact(factId, metric) {
  return {
    fact_id: factId,
    fact_code: `${factId}_${metric.metric_code.toLowerCase()}`,
    fact_type: 'derived_metric',
    qualifiers: {
      metric_code: metric.metric_code,
    },
    value: metric.value,
    confidence: 0.9,
  };
}

function patternFact(factId, pattern) {
  return {
    fact_id: factId,
    fact_code: `${factId}_${pattern.pattern_code.toLowerCase()}`,
    fact_type: 'pattern',
    qualifiers: {
      pattern_code: pattern.pattern_code,
    },
    value: pattern.value,
    confidence: 0.88,
  };
}

function buildWesternChart(input) {
  const city = getCityByKey(input.cityKey);
  const utcDate = zonedDateTimeToUtc(input.birthDate, input.birthTime, city.timezone);
  const observer = new Observer(city.latitude, city.longitude, 0);
  const ascLongitude = calculateAscendantLongitude(utcDate, observer);
  const ascSign = getSignFromLongitude(ascLongitude);
  const houses = buildHouseSigns(ascLongitude);
  const planets = buildPlanetPositions(utcDate, ascLongitude);
  const aspects = buildAspectList(planets);
  const metrics = buildDerivedMetrics(planets, ascSign.code);
  const patterns = buildPatternFacts(planets);

  const westernFacts = [
    ...planets.map((planet, index) => pointFact(`p${index + 1}`, planet)),
    pointFact('p_asc', {
      code: 'ASC',
      sign: ascSign.code,
      houseNumber: 1,
      motion: 'direct',
      longitude: ascLongitude,
      signDegree: ascSign.degree,
    }),
    ...houses.map((house) => houseFact(`h${house.houseNumber}`, house)),
    ...aspects.map((aspect, index) => aspectFact(`a${index + 1}`, aspect)),
    ...metrics.map((metric, index) => metricFact(`m${index + 1}`, metric)),
    ...patterns.map((pattern, index) => patternFact(`pt${index + 1}`, pattern)),
  ];

  return {
    chart_id: `western-${utcDate.getTime()}-${city.key}`,
    chart_type: 'natal',
    subjects: [{ subject_id: 'web-user', birth_input: { time_accuracy: 'exact' } }],
    systems: [
      {
        system_code: 'western',
        confidence: { overall: 0.97, houses: 0.88, aspects: 0.92 },
        facts: westernFacts,
      },
    ],
    visual: {
      utcDate,
      city,
      observer,
      ascLongitude,
      ascSign,
      houses,
      planets,
      aspects,
      metrics,
    },
  };
}

function tagLabel(tagCode) {
  if (TAG_LABELS[tagCode]) return TAG_LABELS[tagCode];
  const match = TAG_REGISTRY.tags.find((tag) => tag.tag_code === tagCode);
  if (match?.label_zh) return match.label_zh;
  if (match?.label_en) return match.label_en;
  return tagCode.split('.').slice(-1)[0].replace(/_/g, ' ');
}

function buildInsightCopy(insight) {
  const preset = INSIGHT_COPY[insight.insight_code];
  if (preset) return preset;
  const label = tagLabel(insight.tag_refs?.[0] || insight.insight_code);
  return {
    title: label,
    body: `这条结论已经由结构化规则命中，可继续扩展为更长的报告段落。当前优先级为 ${insight.priority}，置信度约 ${Math.round(insight.confidence * 100)}%。`,
  };
}

function getReportOptions() {
  return Object.entries(REPORT_PRESETS)
    .filter(([key]) => key !== 'home')
    .map(([key, value]) => ({ key, title: value.title, focus: value.focus, intro: value.intro }));
}

function getBirthFormOptions() {
  const currentYear = new Date().getFullYear();
  return {
    years: Array.from({ length: 80 }, (_, index) => String(currentYear - 70 + index)),
    months: Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0')),
    hours: Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0')),
    minutes: ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'],
    cities: CITY_OPTIONS,
  };
}

function getDayOptions(year, month) {
  const daysInMonth = new Date(Number(year), Number(month), 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) => String(index + 1).padStart(2, '0'));
}

function describePlanetBlend(visual) {
  const sun = visual.planets.find((planet) => planet.code === 'SUN');
  const moon = visual.planets.find((planet) => planet.code === 'MOON');
  return `${sun.signLabel}太阳、${moon.signLabel}月亮、${visual.ascSign.label}上升，整体更偏向 ${ELEMENT_LABELS[visual.metrics.find((metric) => metric.metric_code === 'DOMINANT_ELEMENT')?.value?.toLowerCase?.() || 'fire']}表达。`;
}

function buildDetailSections(reportType, visual, insights, tags) {
  const sun = visual.planets.find((planet) => planet.code === 'SUN');
  const moon = visual.planets.find((planet) => planet.code === 'MOON');
  const strongestAspect = visual.aspects[0];
  const topTag = tags[0]?.label || '结构化主题';
  const topInsight = insights[0]?.title || '主轴判断';

  const sectionA = {
    title: '盘面底色',
    body: `${sun.label}落在${sun.signLabel}${sun.degreeText}，月亮落在${moon.signLabel}${moon.degreeText}，上升是${visual.ascSign.label}。这会让你的第一层表现、内在情绪和外部节奏呈现出很清楚的组合感。`,
  };

  const sectionB = strongestAspect
    ? {
        title: '关键结构',
        body: `当前盘面最醒目的结构之一是 ${strongestAspect.left.label}${strongestAspect.label}${strongestAspect.right.label}，容许度约 ${strongestAspect.orb.toFixed(1)}°。这类相位通常会把某个主题推到更显眼的位置。`,
      }
    : {
        title: '关键结构',
        body: `这次盘面更偏向宫位和元素分布给出主轴，其中 ${topTag} 是最值得先读的一条。`,
      };

  const sectionByReport = {
    'past-life': {
      title: '前世线索',
      body: `这一版前世报告先不走神秘叙事，而是从你反复出现的性格主轴和课题切入。${topInsight} 往往说明你带着熟悉的处理方式进入这一生。`,
    },
    personality: {
      title: '性格聚焦',
      body: `这份性格报告更强调你如何理解自己、如何做决定，以及你在人群里呈现出来的核心气质。当前最醒目的主题是 ${topTag}。`,
    },
    relationship: {
      title: '关系动态',
      body: `关系报告会优先看月亮、金星、火星和第七宫线索。你更需要的不是表面热闹，而是节奏稳定、回应清楚的互动。`,
    },
    monthly: {
      title: '月度节奏',
      body: `月度预测页会把当前盘面翻成更可执行的节奏建议。先稳住结构，再推进关键动作，会比全面铺开更有效。`,
    },
    compatibility: {
      title: '兼容观察',
      body: `兼容性报告当前先用你的单人盘做关系基线：你会如何建立信任、在哪些位置更容易感到消耗、什么样的互动最适合长期发展。`,
    },
    wealth: {
      title: '财富逻辑',
      body: `财务潜力报告更关注第二宫、金星、木星与土星的组合。比起情绪驱动，长期配置和清晰边界更适合你。`,
    },
    evolution: {
      title: '进化主轴',
      body: `生命进化报告会把成长主题拉长来看。你现在最重要的不是做更多，而是把已经成熟的部分沉淀成可重复的路径。`,
    },
  };

  return [sectionA, sectionB, sectionByReport[reportType] || sectionByReport.personality];
}

function buildHeadline(reportType, insights, visual) {
  if (insights[0]?.title) return insights[0].title;
  const preset = REPORT_PRESETS[reportType] || REPORT_PRESETS.personality;
  const sun = visual.planets.find((planet) => planet.code === 'SUN');
  return `${preset.title}：你的 ${sun.signLabel} 太阳正在定义这次结果的主轴`;
}

function buildSummary(reportType, visual, tags) {
  const preset = REPORT_PRESETS[reportType] || REPORT_PRESETS.personality;
  const topTags = tags.slice(0, 3).map((tag) => tag.label).join('、');
  return `${preset.intro}。这次结果主要由 ${describePlanetBlend(visual)} 当前最值得先看的主题是 ${topTags || '盘面结构'}。`;
}

function buildFallbackInsights(reportType) {
  const preset = REPORT_PRESETS[reportType] || REPORT_PRESETS.personality;
  return [
    { code: `${reportType}-fallback-1`, title: `${preset.title}主轴`, body: preset.intro, confidence: 0.72 },
  ];
}

function buildChartRows(visual) {
  return visual.planets.slice(0, 8).map((planet) => ({
    code: planet.code,
    label: planet.label,
    symbol: planet.symbol,
    position: `${planet.signLabel} ${planet.degreeText}`,
    house: `第 ${planet.houseNumber} 宫`,
    motion: planet.motion === 'retrograde' ? '逆行' : planet.motion === 'stationary' ? '停滞' : '顺行',
    longitude: planet.longitude,
  }));
}

export function getInterpretationFocusOptions() {
  return FOCUS_OPTIONS;
}

export { getReportOptions, getBirthFormOptions, getDayOptions, CITY_OPTIONS };

export function generateInterpretationPreview(input) {
  const reportType = input.reportType || 'personality';
  const reportPreset = REPORT_PRESETS[reportType] || REPORT_PRESETS.personality;
  const chartBundle = buildWesternChart(input);
  const pipeline = runInterpretationPipeline(chartBundle);

  const derivedInsights = pipeline.insights.slice(0, 3).map((insight) => {
    const copy = buildInsightCopy(insight);
    return {
      code: insight.insight_code,
      title: copy.title,
      body: copy.body,
      section: insight.section,
      confidence: insight.confidence,
    };
  });

  const derivedTags = pipeline.semantic_items.slice(0, 8).map((item) => ({
    code: item.tag_code,
    label: tagLabel(item.tag_code),
    crossSystem: item.cross_system_agreement,
  }));

  const derivedEvidence = pipeline.refs.refs.slice(0, 8).map((ref) => ({
    code: ref.ref_code,
    label: ref.ref_code.replace(/_/g, ' '),
    system: ref.system_code,
  }));

  const insights = derivedInsights.length ? derivedInsights : buildFallbackInsights(reportType);
  const tags = derivedTags.length
    ? derivedTags
    : [{ code: 'western.core', label: '西洋盘面主轴', crossSystem: false }];

  return {
    reportTitle: reportPreset.title,
    headline: buildHeadline(reportType, insights, chartBundle.visual),
    summary: buildSummary(reportType, chartBundle.visual, tags),
    insights,
    tags,
    evidence: derivedEvidence,
    crossSystemCount: pipeline.semantic_items.filter((item) => item.cross_system_agreement).length,
    detailSections: buildDetailSections(reportType, chartBundle.visual, insights, tags),
    chartMeta: {
      date: input.birthDate,
      time: input.birthTime,
      city: chartBundle.visual.city.label,
      timezone: chartBundle.visual.city.timezone,
    },
    chartVisual: {
      ascSign: chartBundle.visual.ascSign.label,
      ascLongitude: chartBundle.visual.ascLongitude,
      houses: chartBundle.visual.houses,
      planets: buildChartRows(chartBundle.visual),
      aspects: chartBundle.visual.aspects.slice(0, 5).map((aspect) => ({
        code: aspect.code,
        label: `${aspect.left.label}${aspect.label}${aspect.right.label}`,
        orb: `${aspect.orb.toFixed(1)}°`,
      })),
      rawPlanets: chartBundle.visual.planets,
    },
  };
}
