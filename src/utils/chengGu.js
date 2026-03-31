const YEAR_WEIGHT_QIAN = {
  甲子: 12, 丙子: 16, 戊子: 15, 庚子: 7, 壬子: 5,
  乙丑: 9, 丁丑: 8, 己丑: 7, 辛丑: 7, 癸丑: 7,
  甲寅: 12, 丙寅: 6, 戊寅: 8, 庚寅: 9, 壬寅: 9,
  乙卯: 8, 丁卯: 7, 己卯: 19, 辛卯: 12, 癸卯: 12,
  甲辰: 8, 丙辰: 8, 戊辰: 12, 庚辰: 12, 壬辰: 10,
  乙巳: 7, 丁巳: 6, 己巳: 5, 辛巳: 6, 癸巳: 7,
  甲午: 15, 丙午: 13, 戊午: 19, 庚午: 9, 壬午: 8,
  乙未: 6, 丁未: 5, 己未: 6, 辛未: 8, 癸未: 7,
  甲申: 5, 丙申: 5, 戊申: 14, 庚申: 8, 壬申: 7,
  乙酉: 15, 丁酉: 14, 己酉: 5, 辛酉: 16, 癸酉: 8,
  甲戌: 15, 丙戌: 6, 戊戌: 14, 庚戌: 9, 壬戌: 10,
  乙亥: 9, 丁亥: 16, 己亥: 9, 辛亥: 17, 癸亥: 6,
};

const MONTH_WEIGHT_QIAN = {
  1: 6,
  2: 7,
  3: 18,
  4: 9,
  5: 5,
  6: 16,
  7: 9,
  8: 15,
  9: 18,
  10: 8,
  11: 9,
  12: 5,
};

const DAY_WEIGHT_QIAN = {
  1: 5,
  2: 10,
  3: 8,
  4: 15,
  5: 16,
  6: 15,
  7: 8,
  8: 16,
  9: 8,
  10: 16,
  11: 9,
  12: 17,
  13: 8,
  14: 17,
  15: 10,
  16: 8,
  17: 9,
  18: 18,
  19: 5,
  20: 15,
  21: 10,
  22: 9,
  23: 8,
  24: 9,
  25: 15,
  26: 18,
  27: 7,
  28: 8,
  29: 16,
  30: 6,
};

const HOUR_WEIGHT_QIAN = {
  子: 16,
  丑: 6,
  寅: 7,
  卯: 10,
  辰: 9,
  巳: 16,
  午: 10,
  未: 8,
  申: 8,
  酉: 9,
  戌: 6,
  亥: 6,
};

function formatQian(qian) {
  const liang = Math.floor(qian / 10);
  const remainder = qian % 10;
  if (!liang) return `${remainder}钱`;
  if (!remainder) return `${liang}两`;
  return `${liang}两${remainder}钱`;
}

function getBandSummary(totalQian) {
  if (totalQian <= 29) {
    return {
      level: '骨重偏轻',
      summary: '前期更需要靠自己摸索，节奏容易先紧后松，越往后越要靠稳定能力把日子立住。',
      modern: '适合先练硬技能、稳现金流、少走投机路线，把可持续能力放在第一位。',
    };
  }
  if (totalQian <= 39) {
    return {
      level: '骨重中平',
      summary: '属于先积累后见效的类型，前期不一定显山露水，但持续经营后会越来越稳。',
      modern: '适合做可复利的事，把专业、口碑和长期关系慢慢做厚。',
    };
  }
  if (totalQian <= 49) {
    return {
      level: '骨重偏稳',
      summary: '整体属于能把资源慢慢聚起来的类型，中年后更容易进入顺手期。',
      modern: '适合长期主义路线，越到后期越能看出积累的价值。',
    };
  }
  if (totalQian <= 59) {
    return {
      level: '骨重较厚',
      summary: '这类配置通常带着比较强的承载力和兑现力，机会来时更容易接得住。',
      modern: '适合在关键阶段主动承担，更早布局主业和资源位。',
    };
  }
  return {
    level: '骨重较高',
    summary: '整体格局感和承载力更强，容易在后期进入资源、名望或稳定成果同步上升的区间。',
    modern: '更重要的不是再加速，而是学会选重点，避免高配能力被分散消耗。',
  };
}

export function calculateChengGu({
  yearGanZhi,
  lunarMonth,
  lunarDay,
  hourZhi,
  isLeapMonth = false,
}) {
  const yearQian = YEAR_WEIGHT_QIAN[yearGanZhi] || 0;
  const monthQian = MONTH_WEIGHT_QIAN[Math.abs(Number(lunarMonth) || 0)] || 0;
  const dayQian = DAY_WEIGHT_QIAN[Number(lunarDay) || 0] || 0;
  const hourQian = HOUR_WEIGHT_QIAN[hourZhi] || 0;
  const leapBonusQian = isLeapMonth ? 1 : 0;
  const totalQian = yearQian + monthQian + dayQian + hourQian + leapBonusQian;
  const band = getBandSummary(totalQian);

  return {
    totalQian,
    totalText: formatQian(totalQian),
    yearQian,
    monthQian,
    dayQian,
    hourQian,
    leapBonusQian,
    yearText: formatQian(yearQian),
    monthText: formatQian(monthQian),
    dayText: formatQian(dayQian),
    hourText: formatQian(hourQian),
    leapBonusText: leapBonusQian ? formatQian(leapBonusQian) : '0钱',
    ...band,
  };
}
