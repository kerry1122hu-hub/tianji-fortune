/**
 * 明己 MingMe - 商业择日模块
 * 
 * 功能：
 * 1. 用户输入想做的事（签约、开业、出行、面试等）
 * 2. 系统扫描未来30天，推荐最佳日期+时辰
 * 3. 解释为什么推荐这个日期
 */

import { getDayPillar, getHourPillar, getDailyFortune, getJiShi,
         getJiFang, getTianYiGuiRen, TIAN_GAN, DI_ZHI, WU_XING,
         SHENG_KE, SHI_CHEN_TIMES } from './baziEngine';

// 事项类型定义
export const EVENT_TYPES = {
  sign_contract: {
    'zh-Hans': '签约签合同',
    'zh-Hant': '簽約簽合同',
    'en': 'Sign Contract',
    icon: '📝',
    needElements: ['beiSheng', 'ke'], // 印星（贵人助力）+ 财星（利财）
    avoidElements: ['beiKe'],          // 避开官杀
    weight: { beiSheng: 3, ke: 2, same: 1, sheng: 0, beiKe: -3 },
  },
  open_business: {
    'zh-Hans': '开业开张',
    'zh-Hant': '開業開張',
    'en': 'Grand Opening',
    icon: '🏪',
    needElements: ['ke', 'beiSheng'],  // 财星为主，印星辅助
    avoidElements: ['beiKe'],
    weight: { ke: 3, beiSheng: 2, same: 1, sheng: 1, beiKe: -3 },
  },
  negotiation: {
    'zh-Hans': '商务谈判',
    'zh-Hant': '商務談判',
    'en': 'Business Negotiation',
    icon: '🤝',
    needElements: ['beiSheng', 'same'], // 印星（贵人）+ 比肩（助力）
    avoidElements: ['beiKe', 'sheng'],   // 避官杀和食伤（口舌）
    weight: { beiSheng: 3, same: 2, ke: 1, sheng: -1, beiKe: -3 },
  },
  job_interview: {
    'zh-Hans': '面试求职',
    'zh-Hant': '面試求職',
    'en': 'Job Interview',
    icon: '💼',
    needElements: ['beiSheng'],  // 印星（上级赏识）
    avoidElements: ['beiKe', 'sheng'],
    weight: { beiSheng: 3, same: 1, ke: 0, sheng: -2, beiKe: -2 },
  },
  travel: {
    'zh-Hans': '出差出行',
    'zh-Hant': '出差出行',
    'en': 'Business Travel',
    icon: '✈️',
    needElements: ['sheng', 'beiSheng'], // 食伤（活动力）+ 印星（安全）
    avoidElements: ['beiKe'],
    weight: { sheng: 2, beiSheng: 2, same: 1, ke: 1, beiKe: -2 },
  },
  investment: {
    'zh-Hans': '投资理财',
    'zh-Hant': '投資理財',
    'en': 'Investment',
    icon: '📈',
    needElements: ['ke'],        // 财星为主
    avoidElements: ['beiKe', 'sheng'],
    weight: { ke: 3, beiSheng: 1, same: 1, sheng: -1, beiKe: -3 },
  },
  launch_product: {
    'zh-Hans': '产品发布',
    'zh-Hant': '產品發佈',
    'en': 'Product Launch',
    icon: '🚀',
    needElements: ['sheng', 'beiSheng'], // 食伤（展示）+ 印星（品质）
    avoidElements: ['beiKe'],
    weight: { sheng: 3, beiSheng: 2, ke: 1, same: 1, beiKe: -2 },
  },
  meeting: {
    'zh-Hans': '重要会议',
    'zh-Hant': '重要會議',
    'en': 'Important Meeting',
    icon: '📋',
    needElements: ['beiSheng', 'same'],
    avoidElements: ['beiKe'],
    weight: { beiSheng: 3, same: 2, sheng: 1, ke: 0, beiKe: -2 },
  },
};

/**
 * 计算某一天对于某个事项的适合度评分
 */
function scoreDayForEvent(dayPillar, birthDayGan, eventType) {
  const dayWx = WU_XING[TIAN_GAN.indexOf(dayPillar.gan)];
  const myWx = WU_XING[TIAN_GAN.indexOf(birthDayGan)];
  const rel = SHENG_KE[myWx];
  const weights = eventType.weight;

  let score = 60; // 基础分

  // 根据五行关系加减分
  if (dayWx === rel.beiSheng) score += weights.beiSheng * 8;   // 印星
  else if (dayWx === myWx) score += weights.same * 8;           // 比肩
  else if (dayWx === rel.sheng) score += weights.sheng * 8;     // 食伤
  else if (dayWx === rel.ke) score += weights.ke * 8;           // 财星
  else score += weights.beiKe * 8;                               // 官杀

  // 天乙贵人加分
  const guiRen = getTianYiGuiRen(birthDayGan);
  if (guiRen.includes(dayPillar.zhi)) score += 8;

  // 六合加分
  const liuHeMap = { "子":"丑","丑":"子","寅":"亥","卯":"戌","辰":"酉","巳":"申",
                     "午":"未","未":"午","申":"巳","酉":"辰","戌":"卯","亥":"寅" };
  // 日支与日主地支六合
  if (liuHeMap[dayPillar.zhi]) score += 3;

  // 限制在0-100
  score = Math.max(0, Math.min(100, score));

  return score;
}

/**
 * 为某日某事项找最佳时辰
 */
function findBestHours(dayPillar, birthDayGan, eventType) {
  const results = [];

  for (let h = 0; h < 24; h += 2) {
    const hourPillar = getHourPillar(dayPillar.gan, h);
    const hourWx = WU_XING[TIAN_GAN.indexOf(hourPillar.gan)];
    const myWx = WU_XING[TIAN_GAN.indexOf(birthDayGan)];
    const rel = SHENG_KE[myWx];

    let hourScore = 50;
    if (hourWx === rel.beiSheng) hourScore += 20;
    else if (hourWx === myWx) hourScore += 10;
    else if (hourWx === rel.ke) hourScore += 15;
    else if (hourWx === rel.sheng) hourScore += 5;
    else hourScore -= 10;

    const zhiIdx = h === 23 || h === 0 ? 0 : Math.ceil(h / 2);

    results.push({
      hour: h,
      hourPillar,
      score: Math.max(0, Math.min(100, hourScore)),
      zhi: DI_ZHI[zhiIdx],
      timeRange: SHI_CHEN_TIMES[zhiIdx],
    });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 3);
}

/**
 * 生成择日建议理由
 */
function generateReason(dayPillar, birthDayGan, score, eventType, locale = 'zh-Hans') {
  const dayWx = WU_XING[TIAN_GAN.indexOf(dayPillar.gan)];
  const myWx = WU_XING[TIAN_GAN.indexOf(birthDayGan)];
  const rel = SHENG_KE[myWx];

  const reasons = {
    'zh-Hans': [],
    'zh-Hant': [],
    'en': [],
  };

  if (dayWx === rel.beiSheng) {
    reasons['zh-Hans'].push('印星透出，贵人助力，有利于获得支持和认可');
    reasons['zh-Hant'].push('印星透出，貴人助力，有利於獲得支持和認可');
    reasons['en'].push('Resource star active — support and recognition from mentors likely');
  }
  if (dayWx === rel.ke) {
    reasons['zh-Hans'].push('财星当值，利于财务相关事项');
    reasons['zh-Hant'].push('財星當值，利於財務相關事項');
    reasons['en'].push('Wealth star present — favorable for financial matters');
  }
  if (dayWx === myWx) {
    reasons['zh-Hans'].push('比肩助力，同辈相助，团队配合顺畅');
    reasons['zh-Hant'].push('比肩助力，同輩相助，團隊配合順暢');
    reasons['en'].push('Companion energy — teamwork and peer support are strong');
  }
  if (dayWx === rel.sheng) {
    reasons['zh-Hans'].push('食伤生发，创意和表达力增强');
    reasons['zh-Hant'].push('食傷生發，創意和表達力增強');
    reasons['en'].push('Output star active — creativity and expression are enhanced');
  }

  const guiRen = getTianYiGuiRen(birthDayGan);
  if (guiRen.includes(dayPillar.zhi)) {
    reasons['zh-Hans'].push('天乙贵人临日，逢凶化吉');
    reasons['zh-Hant'].push('天乙貴人臨日，逢凶化吉');
    reasons['en'].push('Noble Helper present — obstacles turn into opportunities');
  }

  if (score >= 85) {
    reasons['zh-Hans'].push('综合评分极高，是难得的吉日');
    reasons['zh-Hant'].push('綜合評分極高，是難得的吉日');
    reasons['en'].push('Overall score is exceptionally high — a rare auspicious day');
  }

  return reasons[locale] || reasons['zh-Hans'];
}

/**
 * 商业择日主函数
 * @param birthDayGan 日主天干
 * @param eventTypeKey 事项类型（如 'sign_contract'）
 * @param days 扫描天数（默认30天）
 * @param locale 语言
 * @returns 推荐日期列表（按评分排序）
 */
export function selectBestDates(birthDayGan, eventTypeKey, days = 30, locale = 'zh-Hans') {
  const eventType = EVENT_TYPES[eventTypeKey];
  if (!eventType) return [];

  const today = new Date();
  const candidates = [];

  for (let i = 1; i <= days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);

    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekDay = date.getDay();

    const dayPillar = getDayPillar(year, month, day);
    const score = scoreDayForEvent(dayPillar, birthDayGan, eventType);
    const bestHours = findBestHours(dayPillar, birthDayGan, eventType);
    const reasons = generateReason(dayPillar, birthDayGan, score, eventType, locale);
    const jiFang = getJiFang(birthDayGan);

    candidates.push({
      date: { year, month, day, weekDay },
      dateStr: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      dayPillar,
      score,
      bestHours,
      reasons,
      jiFang,
      isWeekend: weekDay === 0 || weekDay === 6,
    });
  }

  // 按评分排序
  candidates.sort((a, b) => b.score - a.score);

  // 返回前5个最佳日期
  return {
    eventType: eventTypeKey,
    eventName: eventType[locale] || eventType['zh-Hans'],
    eventIcon: eventType.icon,
    recommendations: candidates.slice(0, 5),
    allDays: candidates,
  };
}

/**
 * 获取所有事项类型列表
 */
export function getEventTypeList(locale = 'zh-Hans') {
  return Object.entries(EVENT_TYPES).map(([key, val]) => ({
    key,
    name: val[locale] || val['zh-Hans'],
    icon: val.icon,
  }));
}
