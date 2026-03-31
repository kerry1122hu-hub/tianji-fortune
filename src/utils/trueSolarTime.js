/**
 * 明己 MingMe - 真太阳时校正
 * 
 * 中国标准时间基于东经120度（北京时间），但实际太阳时因经度不同而有差异。
 * 比如在新疆乌鲁木齐（东经87度），真太阳时比北京时间晚约2小时。
 * 
 * 八字排盘中的时柱应该基于出生地的真太阳时，而非标准时间。
 * 
 * 真太阳时 = 地方平太阳时 + 均时差
 * 地方平太阳时 = 标准时间 + (出生地经度 - 标准时区中央经度) × 4分钟/度
 */

import { CHINA_CITIES } from './chinaCities';

// 海外城市经纬度数据库
const OVERSEAS_CITIES = {
  // 港澳台
  "香港": { lng: 114.17, lat: 22.28, tz: 8 },
  "澳门": { lng: 113.54, lat: 22.20, tz: 8 },
  "台北": { lng: 121.56, lat: 25.04, tz: 8 },
  "高雄": { lng: 120.31, lat: 22.63, tz: 8 },
  "台中": { lng: 120.68, lat: 24.15, tz: 8 },

  // 东南亚
  "新加坡": { lng: 103.85, lat: 1.29, tz: 8 },
  "吉隆坡": { lng: 101.69, lat: 3.14, tz: 8 },
  "曼谷": { lng: 100.50, lat: 13.75, tz: 7 },
  "雅加达": { lng: 106.85, lat: -6.21, tz: 7 },
  "马尼拉": { lng: 120.98, lat: 14.60, tz: 8 },
  "胡志明市": { lng: 106.66, lat: 10.76, tz: 7 },
  "河内": { lng: 105.85, lat: 21.03, tz: 7 },
  "仰光": { lng: 96.16, lat: 16.87, tz: 6.5 },
  "金边": { lng: 104.92, lat: 11.56, tz: 7 },

  // 东亚
  "东京": { lng: 139.69, lat: 35.69, tz: 9 },
  "大阪": { lng: 135.50, lat: 34.69, tz: 9 },
  "首尔": { lng: 126.98, lat: 37.57, tz: 9 },

  // 北美
  "纽约": { lng: -74.01, lat: 40.71, tz: -5 },
  "洛杉矶": { lng: -118.24, lat: 34.05, tz: -8 },
  "旧金山": { lng: -122.42, lat: 37.77, tz: -8 },
  "芝加哥": { lng: -87.63, lat: 41.88, tz: -6 },
  "休斯顿": { lng: -95.37, lat: 29.76, tz: -6 },
  "温哥华": { lng: -123.12, lat: 49.28, tz: -8 },
  "多伦多": { lng: -79.38, lat: 43.65, tz: -5 },
  "西雅图": { lng: -122.33, lat: 47.61, tz: -8 },
  "波士顿": { lng: -71.06, lat: 42.36, tz: -5 },

  // 欧洲
  "伦敦": { lng: -0.12, lat: 51.51, tz: 0 },
  "巴黎": { lng: 2.35, lat: 48.86, tz: 1 },
  "柏林": { lng: 13.40, lat: 52.52, tz: 1 },
  "阿姆斯特丹": { lng: 4.90, lat: 52.37, tz: 1 },
  "米兰": { lng: 9.19, lat: 45.46, tz: 1 },
  "马德里": { lng: -3.70, lat: 40.42, tz: 1 },

  // 大洋洲
  "悉尼": { lng: 151.21, lat: -33.87, tz: 10 },
  "墨尔本": { lng: 144.96, lat: -37.81, tz: 10 },
  "布里斯班": { lng: 153.03, lat: -27.47, tz: 10 },
  "珀斯": { lng: 115.86, lat: -31.95, tz: 8 },
  "阿德莱德": { lng: 138.60, lat: -34.93, tz: 9.5 },
  "奥克兰": { lng: 174.76, lat: -36.85, tz: 12 },
  "惠灵顿": { lng: 174.78, lat: -41.29, tz: 12 },

  // 中东/印度
  "迪拜": { lng: 55.27, lat: 25.20, tz: 4 },
  "孟买": { lng: 72.88, lat: 19.08, tz: 5.5 },
};

// 英文城市名映射
export const CITY_EN_MAP = {
  "Beijing": "北京", "Shanghai": "上海", "Guangzhou": "广州", "Shenzhen": "深圳",
  "Chengdu": "成都", "Chongqing": "重庆", "Wuhan": "武汉", "Hangzhou": "杭州",
  "Nanjing": "南京", "Xi'an": "西安", "Hong Kong": "香港", "Macau": "澳门",
  "Taipei": "台北", "Singapore": "新加坡", "Kuala Lumpur": "吉隆坡",
  "Bangkok": "曼谷", "Tokyo": "东京", "Seoul": "首尔", "Osaka": "大阪",
  "New York": "纽约", "Los Angeles": "洛杉矶", "San Francisco": "旧金山",
  "Chicago": "芝加哥", "Vancouver": "温哥华", "Toronto": "多伦多",
  "Seattle": "西雅图", "Boston": "波士顿", "Houston": "休斯顿",
  "London": "伦敦", "Paris": "巴黎", "Berlin": "柏林", "Amsterdam": "阿姆斯特丹",
  "Sydney": "悉尼", "Melbourne": "墨尔本", "Brisbane": "布里斯班",
  "Perth": "珀斯", "Adelaide": "阿德莱德", "Auckland": "奥克兰",
  "Dubai": "迪拜", "Mumbai": "孟买", "Manila": "马尼拉", "Jakarta": "雅加达",
};

/**
 * 计算均时差（Equation of Time）
 * 返回值为分钟数
 */
function equationOfTime(year, month, day) {
  // 简化计算
  const n = Math.floor(275 * month / 9) - 2 * Math.floor((month + 9) / 12) + day - 30;
  const B = (360 / 365.25) * (n - 81) * (Math.PI / 180);
  const EoT = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  return EoT;
}

// 合并后的完整城市数据库（中国大陆327城 + 海外城市）
export const CITY_DATABASE = { ...CHINA_CITIES, ...OVERSEAS_CITIES };

/**
 * 计算真太阳时
 * @param year 公历年
 * @param month 公历月
 * @param day 公历日
 * @param hour 标准时间时（0-23）
 * @param minute 标准时间分（0-59）
 * @param cityName 城市名（中文或英文）
 * @returns { trueSolarHour, trueSolarMinute, correction } 真太阳时和修正分钟数
 */
export function getTrueSolarTime(year, month, day, hour, minute, cityName) {
  // 查找城市（先查合并库，再查英文映射）
  let city = CITY_DATABASE[cityName];
  if (!city && CITY_EN_MAP[cityName]) {
    city = CITY_DATABASE[CITY_EN_MAP[cityName]];
  }

  if (!city) {
    // 未找到城市，返回原始时间
    return { trueSolarHour: hour, trueSolarMinute: minute, correction: 0, city: cityName };
  }

  const tz = city.tz;
  const lng = city.lng;
  const centralMeridian = tz * 15; // 时区中央经线

  // 经度修正（分钟）= (出生地经度 - 时区中央经线) × 4
  const lngCorrection = (lng - centralMeridian) * 4;

  // 均时差修正
  const eotCorrection = equationOfTime(year, month, day);

  // 总修正（分钟）
  const totalCorrection = lngCorrection + eotCorrection;

  // 应用修正
  let totalMinutes = hour * 60 + minute + totalCorrection;

  // 处理跨日
  if (totalMinutes < 0) totalMinutes += 24 * 60;
  if (totalMinutes >= 24 * 60) totalMinutes -= 24 * 60;

  const trueSolarHour = Math.floor(totalMinutes / 60);
  const trueSolarMinute = Math.floor(totalMinutes % 60);

  return {
    trueSolarHour,
    trueSolarMinute,
    correction: Math.round(totalCorrection),
    city: cityName,
    lng: city.lng,
    lat: city.lat,
  };
}

/**
 * 获取城市列表（用于选择器）- 中国大陆按省分组，海外按地区分组
 */
export function getCityList() {
  // 中国大陆城市名列表（从chinaCities导入的）
  const chinaCityNames = Object.keys(CHINA_CITIES);
  
  // 海外城市按地区分组
  const overseasRegionMap = {
    "香港": "港澳台", "澳门": "港澳台", "台北": "港澳台", "高雄": "港澳台", "台中": "港澳台",
    "新加坡": "东南亚", "吉隆坡": "东南亚", "曼谷": "东南亚", "雅加达": "东南亚",
    "马尼拉": "东南亚", "胡志明市": "东南亚", "河内": "东南亚", "仰光": "东南亚", "金边": "东南亚",
    "东京": "东亚", "大阪": "东亚", "首尔": "东亚",
    "纽约": "北美", "洛杉矶": "北美", "旧金山": "北美", "芝加哥": "北美",
    "休斯顿": "北美", "温哥华": "北美", "多伦多": "北美", "西雅图": "北美", "波士顿": "北美",
    "伦敦": "欧洲", "巴黎": "欧洲", "柏林": "欧洲", "阿姆斯特丹": "欧洲",
    "米兰": "欧洲", "马德里": "欧洲",
    "悉尼": "大洋洲", "墨尔本": "大洋洲", "布里斯班": "大洋洲",
    "珀斯": "大洋洲", "阿德莱德": "大洋洲", "奥克兰": "大洋洲", "惠灵顿": "大洋洲",
    "迪拜": "其他", "孟买": "其他",
  };

  const regions = {
    "中国大陆": chinaCityNames,
    "港澳台": [],
    "东南亚": [],
    "东亚": [],
    "北美": [],
    "欧洲": [],
    "大洋洲": [],
    "其他": [],
  };

  Object.keys(OVERSEAS_CITIES).forEach(name => {
    const region = overseasRegionMap[name] || "其他";
    if (regions[region]) {
      regions[region].push(name);
    }
  });

  return regions;
}
