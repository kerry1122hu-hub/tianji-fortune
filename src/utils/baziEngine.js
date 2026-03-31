/**
 * 明己 MingMe - 四柱八字核心排盘引擎
 */

import { getGanZhiMonth, getAllSolarTerms } from './solarTerms';

export const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
export const WU_XING = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'];
export const DZ_WX = ['水', '土', '木', '木', '土', '火', '火', '土', '金', '金', '土', '水'];
export const SHENG_XIAO = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];

export const WX_COLORS = {
  木: '#2ECC71',
  火: '#E74C3C',
  土: '#F39C12',
  金: '#F1C40F',
  水: '#3498DB',
};

export const WX_EMOJIS = {
  木: '🌿',
  火: '🔥',
  土: '🟫',
  金: '🪙',
  水: '💧',
};

export const SHENG_KE = {
  木: { sheng: '火', ke: '土', beiSheng: '水', beiKe: '金' },
  火: { sheng: '土', ke: '金', beiSheng: '木', beiKe: '水' },
  土: { sheng: '金', ke: '水', beiSheng: '火', beiKe: '木' },
  金: { sheng: '水', ke: '木', beiSheng: '土', beiKe: '火' },
  水: { sheng: '木', ke: '火', beiSheng: '金', beiKe: '土' },
};

export const CANG_GAN = {
  子: ['癸'],
  丑: ['己', '癸', '辛'],
  寅: ['甲', '丙', '戊'],
  卯: ['乙'],
  辰: ['戊', '乙', '癸'],
  巳: ['丙', '庚', '戊'],
  午: ['丁', '己'],
  未: ['己', '丁', '乙'],
  申: ['庚', '壬', '戊'],
  酉: ['辛'],
  戌: ['戊', '辛', '丁'],
  亥: ['壬', '甲'],
};

const NA_YIN_TABLE = [
  '海中金', '海中金', '炉中火', '炉中火', '大林木', '大林木',
  '路旁土', '路旁土', '剑锋金', '剑锋金', '山头火', '山头火',
  '涧下水', '涧下水', '城头土', '城头土', '白蜡金', '白蜡金',
  '杨柳木', '杨柳木', '泉中水', '泉中水', '屋上土', '屋上土',
  '霹雳火', '霹雳火', '松柏木', '松柏木', '长流水', '长流水',
  '砂石金', '砂石金', '山下火', '山下火', '平地木', '平地木',
  '壁上土', '壁上土', '金箔金', '金箔金', '覆灯火', '覆灯火',
  '天河水', '天河水', '大驿土', '大驿土', '钗钏金', '钗钏金',
  '桑柘木', '桑柘木', '大溪水', '大溪水', '沙中土', '沙中土',
  '天上火', '天上火', '石榴木', '石榴木', '大海水', '大海水',
];

export const SHI_CHEN_TIMES = [
  '23:00-01:00', '01:00-03:00', '03:00-05:00', '05:00-07:00',
  '07:00-09:00', '09:00-11:00', '11:00-13:00', '13:00-15:00',
  '15:00-17:00', '17:00-19:00', '19:00-21:00', '21:00-23:00',
];

function getJiaZiIndex(ganIdx, zhiIdx) {
  for (let i = 0; i < 60; i += 1) {
    if (i % 10 === ganIdx && i % 12 === zhiIdx) return i;
  }
  return 0;
}

export function getNaYin(gan, zhi) {
  const ganIdx = TIAN_GAN.indexOf(gan);
  const zhiIdx = DI_ZHI.indexOf(zhi);
  const jzIdx = getJiaZiIndex(ganIdx, zhiIdx);
  return NA_YIN_TABLE[jzIdx] || '海中金';
}

export function getYearPillar(ganzhiYear) {
  const offset = (ganzhiYear - 4) % 60;
  const idx = ((offset % 60) + 60) % 60;
  return {
    gan: TIAN_GAN[idx % 10],
    zhi: DI_ZHI[idx % 12],
  };
}

export function getMonthPillar(ganzhiYear, ganzhiMonth) {
  const yearGanIdx = ((ganzhiYear - 4) % 10 + 10) % 10;
  const monthGanStart = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0];
  const startGan = monthGanStart[yearGanIdx];
  const ganIdx = (startGan + ganzhiMonth - 1) % 10;
  const zhiIdx = (ganzhiMonth + 1) % 12;
  return {
    gan: TIAN_GAN[ganIdx],
    zhi: DI_ZHI[zhiIdx],
  };
}

export function getDayPillar(year, month, day) {
  function julianDayNumber(y, m, d) {
    const a = Math.floor((14 - m) / 12);
    const yr = y + 4800 - a;
    const mo = m + 12 * a - 3;
    return d + Math.floor((153 * mo + 2) / 5) + 365 * yr + Math.floor(yr / 4) - Math.floor(yr / 100) + Math.floor(yr / 400) - 32045;
  }

  const jdn = julianDayNumber(year, month, day);
  const refJDN = julianDayNumber(2024, 1, 1);
  const diff = jdn - refJDN;
  const jzIndex = ((diff % 60) + 60) % 60;
  return {
    gan: TIAN_GAN[jzIndex % 10],
    zhi: DI_ZHI[jzIndex % 12],
  };
}

export function getHourPillar(dayGan, hour) {
  const zhiIdx = hour === 23 || hour === 0 ? 0 : Math.ceil(hour / 2);
  const dayGanIdx = TIAN_GAN.indexOf(dayGan);
  const hourGanStart = [0, 2, 4, 6, 8, 0, 2, 4, 6, 8];
  const ganIdx = (hourGanStart[dayGanIdx] + zhiIdx) % 10;
  return {
    gan: TIAN_GAN[ganIdx],
    zhi: DI_ZHI[zhiIdx],
  };
}

export function getShiShen(dayGan, otherGan) {
  if (dayGan === otherGan) return '比肩';
  const dayWx = WU_XING[TIAN_GAN.indexOf(dayGan)];
  const otherWx = WU_XING[TIAN_GAN.indexOf(otherGan)];
  const same = TIAN_GAN.indexOf(dayGan) % 2 === TIAN_GAN.indexOf(otherGan) % 2;
  if (dayWx === otherWx) return same ? '比肩' : '劫财';
  if (SHENG_KE[dayWx].sheng === otherWx) return same ? '食神' : '伤官';
  if (SHENG_KE[dayWx].ke === otherWx) return same ? '偏财' : '正财';
  if (SHENG_KE[dayWx].beiKe === otherWx) return same ? '七杀' : '正官';
  if (SHENG_KE[dayWx].beiSheng === otherWx) return same ? '偏印' : '正印';
  return '比肩';
}

export function getWuXingCount(pillars) {
  const count = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  pillars.forEach((p) => {
    const ganIdx = TIAN_GAN.indexOf(p.gan);
    if (ganIdx >= 0) count[WU_XING[ganIdx]] += 1;
    const zhiIdx = DI_ZHI.indexOf(p.zhi);
    if (zhiIdx >= 0) count[DZ_WX[zhiIdx]] += 1;
  });
  return count;
}

export function getDaYun(yearGan, monthPillar, gender, birthYear, birthMonth, birthDay) {
  const yearGanIdx = TIAN_GAN.indexOf(yearGan);
  const isYangYear = yearGanIdx % 2 === 0;
  const isMale = gender === 'male';
  const isShun = (isYangYear && isMale) || (!isYangYear && !isMale);

  const monthGanIdx = TIAN_GAN.indexOf(monthPillar.gan);
  const monthZhiIdx = DI_ZHI.indexOf(monthPillar.zhi);
  const terms = getAllSolarTerms(birthYear);
  const birthDate = new Date(birthYear, birthMonth - 1, birthDay);

  let startAge = 3;
  const jieTerms = terms.filter((t) => t.isJie).map((t) => ({
    ...t,
    date: new Date(t.year, t.month - 1, t.day, t.hour, t.minute),
  }));
  const prevTerms = getAllSolarTerms(birthYear - 1).filter((t) => t.isJie).map((t) => ({
    ...t,
    date: new Date(t.year, t.month - 1, t.day, t.hour, t.minute),
  }));
  const nextTerms = getAllSolarTerms(birthYear + 1).filter((t) => t.isJie).map((t) => ({
    ...t,
    date: new Date(t.year, t.month - 1, t.day, t.hour, t.minute),
  }));
  const allJie = [...prevTerms, ...jieTerms, ...nextTerms].sort((a, b) => a.date - b.date);

  if (isShun) {
    const nextJie = allJie.find((j) => j.date > birthDate);
    if (nextJie) {
      const diffDays = Math.abs(nextJie.date - birthDate) / (1000 * 60 * 60 * 24);
      startAge = Math.round((diffDays / 3) * 10) / 10;
    }
  } else {
    const prevJie = [...allJie].reverse().find((j) => j.date <= birthDate);
    if (prevJie) {
      const diffDays = Math.abs(birthDate - prevJie.date) / (1000 * 60 * 60 * 24);
      startAge = Math.round((diffDays / 3) * 10) / 10;
    }
  }

  const daYunList = [];
  for (let i = 1; i <= 8; i += 1) {
    const offset = isShun ? i : -i;
    const ganIdx = ((monthGanIdx + offset) % 10 + 10) % 10;
    const zhiIdx = ((monthZhiIdx + offset) % 12 + 12) % 12;
    const age = Math.round(startAge) + (i - 1) * 10;
    daYunList.push({
      gan: TIAN_GAN[ganIdx],
      zhi: DI_ZHI[zhiIdx],
      startAge: age,
      endAge: age + 9,
      startYear: birthYear + age,
      endYear: birthYear + age + 9,
    });
  }

  return { daYunList, startAge: Math.round(startAge) };
}

export function getTianYiGuiRen(dayGan) {
  const table = {
    甲: ['丑', '未'], 乙: ['子', '申'], 丙: ['亥', '酉'], 丁: ['亥', '酉'], 戊: ['丑', '未'],
    己: ['子', '申'], 庚: ['丑', '未'], 辛: ['寅', '午'], 壬: ['卯', '巳'], 癸: ['卯', '巳'],
  };
  return table[dayGan] || [];
}

export function getWenChangGuiRen(dayGan) {
  const table = {
    甲: '巳', 乙: '午', 丙: '申', 丁: '酉', 戊: '申',
    己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯',
  };
  return table[dayGan] || '';
}

export function getYiMa(dayZhi) {
  const table = {
    寅: '申', 午: '申', 戌: '申',
    申: '寅', 子: '寅', 辰: '寅',
    巳: '亥', 酉: '亥', 丑: '亥',
    亥: '巳', 卯: '巳', 未: '巳',
  };
  return table[dayZhi] || '';
}

export function getJiFang(dayGan) {
  const wx = WU_XING[TIAN_GAN.indexOf(dayGan)];
  const table = {
    木: { ji: '北方、东方', xiong: '西方', color: '黑色、绿色', num: '1、3', jiWx: '水、木' },
    火: { ji: '东方、南方', xiong: '北方', color: '绿色、红色', num: '3、7', jiWx: '木、火' },
    土: { ji: '南方、中央', xiong: '东方', color: '红色、黄色', num: '7、5', jiWx: '火、土' },
    金: { ji: '中央、西方', xiong: '南方', color: '黄色、白色', num: '5、9', jiWx: '土、金' },
    水: { ji: '西方、北方', xiong: '中央', color: '白色、黑色', num: '9、1', jiWx: '金、水' },
  };
  return table[wx];
}

export function getJiShi(dayZhi) {
  const zhiIdx = DI_ZHI.indexOf(dayZhi);
  const liuHe = [1, 0, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
  const sanHe1 = (zhiIdx + 4) % 12;
  const sanHe2 = (zhiIdx + 8) % 12;
  return [
    { zhi: DI_ZHI[liuHe[zhiIdx]], time: SHI_CHEN_TIMES[liuHe[zhiIdx]], level: '上吉', reason: '六合' },
    { zhi: DI_ZHI[sanHe1], time: SHI_CHEN_TIMES[sanHe1], level: '中吉', reason: '三合' },
    { zhi: DI_ZHI[sanHe2], time: SHI_CHEN_TIMES[sanHe2], level: '中吉', reason: '三合' },
  ];
}

function getMonthBranchSupportScore(dayWx, monthZhi) {
  const monthWx = DZ_WX[DI_ZHI.indexOf(monthZhi)];
  const relation = SHENG_KE[dayWx];
  if (monthWx === dayWx) return 28;
  if (monthWx === relation.beiSheng) return 18;
  if (monthWx === relation.sheng) return -10;
  if (monthWx === relation.ke) return -12;
  if (monthWx === relation.beiKe) return -18;
  return 0;
}

function getHiddenStemRootScore(dayGan, branchZhi, weight = 1) {
  const hidden = CANG_GAN[branchZhi] || [];
  const dayWx = WU_XING[TIAN_GAN.indexOf(dayGan)];
  const relation = SHENG_KE[dayWx];
  let score = 0;

  hidden.forEach((gan, index) => {
    const hiddenWx = WU_XING[TIAN_GAN.indexOf(gan)];
    const layerWeight = index === 0 ? 1 : index === 1 ? 0.65 : 0.4;
    if (gan === dayGan) score += 12 * weight * layerWeight;
    else if (hiddenWx === dayWx) score += 8 * weight * layerWeight;
    else if (hiddenWx === relation.beiSheng) score += 6 * weight * layerWeight;
    else if (hiddenWx === relation.sheng) score -= 4 * weight * layerWeight;
    else if (hiddenWx === relation.ke) score -= 5 * weight * layerWeight;
    else if (hiddenWx === relation.beiKe) score -= 7 * weight * layerWeight;
  });

  return score;
}

function getVisibleStemScore(dayGan, pillars) {
  const dayWx = WU_XING[TIAN_GAN.indexOf(dayGan)];
  const relation = SHENG_KE[dayWx];
  let score = 0;

  pillars.forEach((pillar, index) => {
    if (index === 2) return;
    const gan = pillar?.gan;
    const ganWx = WU_XING[TIAN_GAN.indexOf(gan)];
    const weight = index === 1 ? 1.15 : 1;
    if (gan === dayGan) score += 12 * weight;
    else if (ganWx === dayWx) score += 9 * weight;
    else if (ganWx === relation.beiSheng) score += 8 * weight;
    else if (ganWx === relation.sheng) score -= 7 * weight;
    else if (ganWx === relation.ke) score -= 6 * weight;
    else if (ganWx === relation.beiKe) score -= 9 * weight;
  });

  return score;
}

function getElementCrowdScore(dayGan, wxCount) {
  const dayWx = WU_XING[TIAN_GAN.indexOf(dayGan)];
  const helpWx = SHENG_KE[dayWx].beiSheng;
  const drainWx = SHENG_KE[dayWx].sheng;
  const wealthWx = SHENG_KE[dayWx].ke;
  const officerWx = SHENG_KE[dayWx].beiKe;
  return (
    (wxCount[dayWx] || 0) * 4 +
    (wxCount[helpWx] || 0) * 3 -
    (wxCount[drainWx] || 0) * 2 -
    (wxCount[wealthWx] || 0) * 2 -
    (wxCount[officerWx] || 0) * 3
  );
}

export function getDayMasterStrength(dayGan, pillars, wxCount) {
  const monthPillar = pillars?.[1] || {};
  const dayWx = WU_XING[TIAN_GAN.indexOf(dayGan)];
  const monthScore = getMonthBranchSupportScore(dayWx, monthPillar?.zhi);
  const rootScore = (pillars || []).reduce(
    (total, pillar, index) => total + getHiddenStemRootScore(dayGan, pillar?.zhi, index === 1 ? 1.2 : 1),
    0
  );
  const stemScore = getVisibleStemScore(dayGan, pillars || []);
  const crowdScore = getElementCrowdScore(dayGan, wxCount || {});
  const rawScore = 50 + monthScore + rootScore + stemScore + crowdScore;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  if (score >= 72) return { score, strength: '偏强', desc: '日主得令有根，帮扶明显，整体偏强，宜疏泄与调衡并行。' };
  if (score >= 60) return { score, strength: '中和偏强', desc: '日主帮扶略多于受制，整体仍在可调范围内，宜稳中求进。' };
  if (score >= 48) return { score, strength: '中和', desc: '日主扶抑大致均衡，整体处于中和状态，宜结合阶段判断取舍。' };
  if (score >= 36) return { score, strength: '中和偏弱', desc: '日主受制与消耗略多，整体偏弱但仍可调，宜先稳身再谋推进。' };
  return { score, strength: '偏弱', desc: '日主失令或受制较多，整体偏弱，宜先扶身稳住，再谈泄耗与求财。' };
}

export function getDailyFortune(dayGanZhi, birthDayGan) {
  const dayWx = WU_XING[TIAN_GAN.indexOf(dayGanZhi.gan)];
  const myWx = WU_XING[TIAN_GAN.indexOf(birthDayGan)];
  const rel = SHENG_KE[myWx];
  let score, theme, advice, business, people, caution;

  if (dayWx === rel.beiSheng) {
    score = 92;
    theme = '大吉 · 贵人相助';
    advice = '今日更容易得到支持与提携，适合主动推进重要安排，把关键会面、签约、沟通放到前面。';
    business = '适合谈判签约、推进合作、向上沟通、处理关键事务。';
    people = '年长者、上级、专业人士更容易成为今天的助力。';
    caution = '顺势推进即可，但重要细节仍要再核对一遍。';
  } else if (dayWx === myWx) {
    score = 78;
    theme = '中吉 · 同气相求';
    advice = '今天更适合借力团队与同伴，不必什么都自己扛，合作往往比单打独斗更有效。';
    business = '适合团队讨论、头脑风暴、同伴协作、对齐分工。';
    people = '同辈朋友、同行伙伴、平级同事更容易给你支持。';
    caution = '合作中记得先讲清边界和分工，避免后续拉扯。';
  } else if (dayWx === rel.sheng) {
    score = 72;
    theme = '小吉 · 才华展现';
    advice = '今天适合表达观点、输出内容和整理想法，把脑中的东西说清楚、写清楚，会更容易被看见。';
    business = '适合创意策划、内容表达、方案呈现、产品打磨。';
    people = '年轻人、学生、下属或新鲜视角会带来启发。';
    caution = '灵感多时更要聚焦重点，别同时铺太多线。';
  } else if (dayWx === rel.ke) {
    score = 75;
    theme = '中吉 · 财务推进';
    advice = '今天适合把与收益、结果、成交有关的事情往前推，但节奏要稳，不必急着一步到位。';
    business = '适合收款催款、销售转化、预算梳理、资源配置。';
    people = '客户、合作对象、能带来结果的人脉值得重点跟进。';
    caution = '可以争取结果，但不要为了快而做出过激判断。';
  } else {
    score = 52;
    theme = '平运 · 以守为主';
    advice = '今天更适合先稳住节奏，处理基础工作、复盘问题、补齐准备，不必强行求快。';
    business = '适合复盘整理、风险检查、查漏补缺、学习充电。';
    people = '面对上级或规则压力时，保持克制会比硬碰硬更稳。';
    caution = '重大决定可以放一放，等状态更清楚时再定。';
  }

  return { score, theme, advice, business, people, caution };
}

export function getLiuNianFortune(liuNianGanZhi, birthDayGan) {
  return getDailyFortune(liuNianGanZhi, birthDayGan);
}

export function fullBaZiChart(year, month, day, hour, gender) {
  const { ganzhiMonth, ganzhiYear } = getGanZhiMonth(year, month, day, hour, 0);
  const yearPillar = getYearPillar(ganzhiYear);
  const monthPillar = getMonthPillar(ganzhiYear, ganzhiMonth);
  const dayPillar = getDayPillar(year, month, day);
  const hourPillar = getHourPillar(dayPillar.gan, hour);

  const pillars = [
    { label: '年', ...yearPillar },
    { label: '月', ...monthPillar },
    { label: '日', ...dayPillar },
    { label: '时', ...hourPillar },
  ];

  const shiShen = pillars.map((p, i) => (i === 2 ? '日主' : getShiShen(dayPillar.gan, p.gan)));
  const wxCount = getWuXingCount(pillars);
  const dayStrength = getDayMasterStrength(dayPillar.gan, pillars, wxCount);
  const naYin = getNaYin(yearPillar.gan, yearPillar.zhi);
  const dayNaYin = getNaYin(dayPillar.gan, dayPillar.zhi);
  const shengXiao = SHENG_XIAO[((ganzhiYear - 4) % 12 + 12) % 12];
  const daYun = getDaYun(yearPillar.gan, monthPillar, gender, year, month, day);
  const guiRen = getTianYiGuiRen(dayPillar.gan);
  const wenChang = getWenChangGuiRen(dayPillar.gan);
  const yiMa = getYiMa(dayPillar.zhi);

  const today = new Date();
  const todayPillar = getDayPillar(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const dailyFortune = getDailyFortune(todayPillar, dayPillar.gan);
  const jiFang = getJiFang(dayPillar.gan);
  const jiShi = getJiShi(todayPillar.zhi);

  const liuNianYear = today.getFullYear();
  const liuNianPillar = getYearPillar(liuNianYear);
  const liuNianFortune = getLiuNianFortune(liuNianPillar, dayPillar.gan);

  return {
    pillars,
    shiShen,
    wxCount,
    dayStrength,
    naYin,
    dayNaYin,
    shengXiao,
    gender,
    birthInfo: { year, month, day, hour },
    daYun: daYun.daYunList,
    startAge: daYun.startAge,
    guiRen,
    wenChang,
    yiMa,
    todayPillar,
    dailyFortune,
    jiFang,
    jiShi,
    liuNianYear,
    liuNianPillar,
    liuNianFortune,
    dayGan: dayPillar.gan,
    dayWuXing: WU_XING[TIAN_GAN.indexOf(dayPillar.gan)],
  };
}
