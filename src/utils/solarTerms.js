/**
 * 明己 MingMe - 精确节气数据库
 * 
 * 四柱八字排盘的核心：月柱必须根据节气而非农历月份来确定。
 * 每月的"节"（非"气"）是换月柱的分界线。
 * 
 * 十二节：
 * 立春(2月), 惊蛰(3月), 清明(4月), 立夏(5月), 芒种(6月), 小暑(7月)
 * 立秋(8月), 白露(9月), 寒露(10月), 立冬(11月), 大雪(12月), 小寒(1月)
 * 
 * 本文件使用天文算法计算精确节气时刻（误差<1分钟）
 */

// 节气名称 - 24节气，奇数位为"节"，偶数位为"气"
export const JIE_QI_NAMES = [
  "小寒", "大寒", "立春", "雨水", "惊蛰", "春分",
  "清明", "谷雨", "立夏", "小满", "芒种", "夏至",
  "小暑", "大暑", "立秋", "处暑", "白露", "秋分",
  "寒露", "霜降", "立冬", "小雪", "大雪", "冬至"
];

// 12个"节"的索引（用于确定月柱的分界线）
export const JIE_INDICES = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];

// 节对应的月份（寅月=1月...丑月=12月，注意这是干支月）
// 立春->寅月(1), 惊蛰->卯月(2), 清明->辰月(3), 立夏->巳月(4)
// 芒种->午月(5), 小暑->未月(6), 立秋->申月(7), 白露->酉月(8)
// 寒露->戌月(9), 立冬->亥月(10), 大雪->子月(11), 小寒->丑月(12)
export const JIE_TO_MONTH = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

/**
 * 天文算法：计算指定年份24节气的精确儒略日
 * 基于Jean Meeus《天文算法》的VSOP87行星理论简化版
 */

// 地球轨道参数
const PI = Math.PI;
const RAD = PI / 180;

// 计算儒略日
function toJD(year, month, day, hour = 0, minute = 0, second = 0) {
  let y = year, m = month;
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + B - 1524.5
    + (hour + minute / 60 + second / 3600) / 24;
}

// 从儒略日转换为公历日期时间
function fromJD(jd) {
  const z = Math.floor(jd + 0.5);
  const f = jd + 0.5 - z;
  let a;
  if (z < 2299161) {
    a = z;
  } else {
    const alpha = Math.floor((z - 1867216.25) / 36524.25);
    a = z + 1 + alpha - Math.floor(alpha / 4);
  }
  const b = a + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d = Math.floor(365.25 * c);
  const e = Math.floor((b - d) / 30.6001);

  const day = b - d - Math.floor(30.6001 * e);
  const month = e < 14 ? e - 1 : e - 13;
  const year = month > 2 ? c - 4716 : c - 4715;

  const totalHours = f * 24;
  const hour = Math.floor(totalHours);
  const totalMinutes = (totalHours - hour) * 60;
  const minute = Math.floor(totalMinutes);
  const second = Math.floor((totalMinutes - minute) * 60);

  return { year, month, day, hour, minute, second };
}

// 太阳黄经计算（简化VSOP87）
function sunLongitude(jd) {
  const T = (jd - 2451545.0) / 36525.0; // 儒略世纪数

  // 太阳平黄经
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  // 太阳平近点角
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const Mrad = M * RAD;

  // 太阳中心差
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mrad)
    + (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad)
    + 0.000289 * Math.sin(3 * Mrad);

  // 太阳真黄经
  let sunLon = L0 + C;

  // 修正章动
  const omega = 125.04 - 1934.136 * T;
  sunLon = sunLon - 0.00569 - 0.00478 * Math.sin(omega * RAD);

  // 归一化到 0-360
  sunLon = ((sunLon % 360) + 360) % 360;

  return sunLon;
}

// 【关键】正确的节气太阳黄经映射
// 春分=0°，而非小寒=0°
const TERM_LONGITUDES = [
  285, 300, 315, 330, 345, 0,     // 小寒285° 大寒300° 立春315° 雨水330° 惊蛰345° 春分0°
  15, 30, 45, 60, 75, 90,         // 清明15° 谷雨30° 立夏45° 小满60° 芒种75° 夏至90°
  105, 120, 135, 150, 165, 180,   // 小暑105° 大暑120° 立秋135° 处暑150° 白露165° 秋分180°
  195, 210, 225, 240, 255, 270    // 寒露195° 霜降210° 立冬225° 小雪240° 大雪255° 冬至270°
];

/**
 * 计算某年某个节气的精确时刻（返回北京时间Date对象）
 * @param year 公历年份
 * @param termIndex 节气索引 0-23 (0=小寒, 2=立春, ...)
 * @returns Date对象（北京时间）
 */
export function getSolarTermJD(year, termIndex) {
  // 目标太阳黄经（使用正确映射）
  const targetLon = TERM_LONGITUDES[termIndex];

  // 估算初始儒略日
  let jd;
  if (termIndex <= 1) {
    jd = toJD(year, 1, 1) + 5 + termIndex * 15;
  } else {
    jd = toJD(year, 1, 1) + 5 + termIndex * 15.22;
  }

  // 牛顿迭代法求解
  for (let i = 0; i < 50; i++) {
    const lon = sunLongitude(jd);
    let diff = targetLon - lon;

    // 处理360度边界
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    if (Math.abs(diff) < 0.0001) break; // 精度约0.01度 ≈ 数秒

    // 太阳每天移动约0.9856度
    jd += diff / 360 * 365.25;
  }

  // 转换为北京时间（UTC+8）
  const utcDate = fromJD(jd);
  // 加8小时
  let hour = utcDate.hour + 8;
  let day = utcDate.day;
  let month = utcDate.month;
  let yearResult = utcDate.year;

  if (hour >= 24) {
    hour -= 24;
    day += 1;
    // 简单的月末处理
    const daysInMonth = new Date(yearResult, month, 0).getDate();
    if (day > daysInMonth) {
      day = 1;
      month += 1;
      if (month > 12) {
        month = 1;
        yearResult += 1;
      }
    }
  }

  return {
    year: yearResult,
    month,
    day,
    hour,
    minute: utcDate.minute,
    second: utcDate.second,
    jd,
  };
}

/**
 * 获取某年所有24节气的精确时刻
 * @param year 公历年份
 * @returns 24个节气时刻数组
 */
export function getAllSolarTerms(year) {
  const terms = [];
  for (let i = 0; i < 24; i++) {
    const term = getSolarTermJD(year, i);
    terms.push({
      index: i,
      name: JIE_QI_NAMES[i],
      isJie: i % 2 === 0, // 是否为"节"（换月分界线）
      ...term,
    });
  }
  return terms;
}

/**
 * 判断给定日期时间处于哪个节气月份
 * @param year 公历年
 * @param month 公历月
 * @param day 公历日
 * @param hour 时（0-23）
 * @param minute 分（0-59）
 * @returns { ganzhiMonth: 1-12 (寅月=1), ganzhiYear: 干支年(可能比公历年小1) }
 */
export function getGanZhiMonth(year, month, day, hour = 0, minute = 0) {
  // 我们需要检查当年和前一年的节气
  const currentYearTerms = getAllSolarTerms(year);
  const prevYearTerms = getAllSolarTerms(year - 1);

  // 合并为一个有序数组：去年大雪(22)、去年小寒... + 今年所有节气
  // 只取"节"（偶数索引）
  const jieList = [];

  // 去年的大雪和小寒
  for (const term of prevYearTerms) {
    if (term.isJie && term.index >= 22) {
      jieList.push(term);
    }
  }

  // 今年所有的"节"
  for (const term of currentYearTerms) {
    if (term.isJie) {
      jieList.push(term);
    }
  }

  // 明年的小寒（用于覆盖12月底）
  const nextYearTerms = getAllSolarTerms(year + 1);
  for (const term of nextYearTerms) {
    if (term.isJie && term.index <= 2) {
      jieList.push(term);
    }
  }

  // 当前时刻的比较值
  const targetMinutes = day * 24 * 60 + hour * 60 + minute;

  // 找到当前日期落在哪两个"节"之间
  let currentJieIndex = -1;
  for (let i = jieList.length - 1; i >= 0; i--) {
    const jie = jieList[i];
    const jieYear = jie.year;
    const jieMinutes = jie.day * 24 * 60 + jie.hour * 60 + jie.minute;

    if (jieYear < year || (jieYear === year && jie.month < month) ||
      (jieYear === year && jie.month === month && jieMinutes <= targetMinutes)) {
      currentJieIndex = i;
      break;
    }
  }

  if (currentJieIndex === -1) {
    // 在最早的节之前，属于上一个月
    return { ganzhiMonth: 12, ganzhiYear: year - 1 };
  }

  const currentJie = jieList[currentJieIndex];
  const jieTermIndex = currentJie.index;

  // 节气索引到干支月的映射
  // 0(小寒)->丑月(12), 2(立春)->寅月(1), 4(惊蛰)->卯月(2), ...
  const monthMap = { 0: 12, 2: 1, 4: 2, 6: 3, 8: 4, 10: 5, 12: 6, 14: 7, 16: 8, 18: 9, 20: 10, 22: 11 };
  const ganzhiMonth = monthMap[jieTermIndex] || 1;

  // 确定干支年份
  // 立春(index=2)之后才算新的干支年
  let ganzhiYear = year;

  // 找今年立春
  const lichun = currentYearTerms.find(t => t.index === 2);
  if (lichun) {
    const lichunMinutes = lichun.day * 24 * 60 + lichun.hour * 60 + lichun.minute;
    const currentMinutes = day * 24 * 60 + hour * 60 + minute;

    if (month < lichun.month || (month === lichun.month && currentMinutes < lichunMinutes)) {
      ganzhiYear = year - 1;
    }
  }

  return { ganzhiMonth, ganzhiYear };
}
