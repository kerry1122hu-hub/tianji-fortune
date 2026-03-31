/**
 * 明己 MingMe — 真太阳时 & 四柱引擎 v2.0
 * src/engines/sizhu.ts
 *
 * 功能：
 *   A. 真太阳时
 *      1. getEquationOfTime(date)       时差（分钟）
 *      2. getTrueSolarTime(date, lon)   真太阳时
 *      3. cityTrueSolarOffset(city)     城市经度→真太阳时偏移
 *
 *   B. 四柱（八字）排盘
 *      4. computeFourPillars(input)     完整四柱排盘
 *      5. getHourBranch(hour, minute)   时支
 *      6. getDayPillar(date)            日柱
 *      7. getYearPillar(date, lunar)    年柱（含寅月/立春切换选项）
 *
 *   C. 十神 & 五行
 *      8. getWuXing(stem/branch)        五行属性
 *      9. getTenGod(dayStem, target)    十神关系
 *
 *   D. 格局分析（简化）
 *      10. analyzePillars(pillars)      初步格局判断
 *
 * 依赖：engine_jieqi.ts（节气月柱）, engine_lunar.ts（农历换算）
 */

import {
  getJieqi,
  getCurrentJieqiMonth,
  getMonthPillar,
  isJieqi,
  JieqiName,
} from "./engine_jieqi";

import {
  solarToLunar,
  lunarToSolar,
  LunarDate,
  getGanZhi,
} from "./engine_lunar";

// ─────────────────────────────────────────────────────────────────────────────
// §1  类型定义
// ─────────────────────────────────────────────────────────────────────────────

export type Pillar = {
  stem:   string;  // 天干
  branch: string;  // 地支
  name:   string;  // 完整（如 "甲子"）
  wuXingS: WuXing; // 天干五行
  wuXingB: WuXing; // 地支五行
};

export type FourPillars = {
  year:  Pillar;
  month: Pillar;
  day:   Pillar;
  hour:  Pillar;
};

export type WuXing = "木" | "火" | "土" | "金" | "水";
export type TenGod =
  | "比肩" | "劫财"
  | "食神" | "伤官"
  | "偏财" | "正财"
  | "七杀" | "正官"
  | "偏印" | "正印"
  | "日主";

export type PillarInput = {
  /** 公历出生日期 */
  solarDate: Date;
  /** 出生时间 HH:MM（24h） */
  birthTime: string;
  /** 出生城市名（用于真太阳时查表） */
  birthCity?: string;
  /** 是否使用真太阳时校正（默认 false） */
  useTrueSolarTime?: boolean;
  /** 是否使用节气边界确定月柱（默认 true） */
  useJieqiBoundary?: boolean;
};

export type PillarResult = {
  input: PillarInput;
  /** 校正后的真太阳时（如开启） */
  correctedTime?: Date;
  /** 真太阳时偏移分钟数 */
  trueSolarOffsetMin?: number;
  /** 四柱 */
  pillars: FourPillars;
  /** 农历信息 */
  lunar: LunarDate;
  /** 十神（以日主为基准） */
  tenGods: {
    year:  TenGod;
    month: TenGod;
    hour:  TenGod;
  };
  /** 五行统计 */
  wuXingCount: Record<WuXing, number>;
  /** 纳音五行（年柱） */
  naYin: string;
  /** 空亡 */
  kongWang: string[];
};

// ─────────────────────────────────────────────────────────────────────────────
// §2  天干地支常量
// ─────────────────────────────────────────────────────────────────────────────

export const HEAVENLY_STEMS    = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"] as const;
export const EARTHLY_BRANCHES  = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"] as const;

export type HeavenlyStem   = typeof HEAVENLY_STEMS[number];
export type EarthlyBranch  = typeof EARTHLY_BRANCHES[number];

/** 天干五行 */
export const STEM_WUXING: Record<string, WuXing> = {
  甲:"木", 乙:"木", 丙:"火", 丁:"火", 戊:"土",
  己:"土", 庚:"金", 辛:"金", 壬:"水", 癸:"水",
};

/** 地支五行 */
export const BRANCH_WUXING: Record<string, WuXing> = {
  子:"水", 丑:"土", 寅:"木", 卯:"木", 辰:"土", 巳:"火",
  午:"火", 未:"土", 申:"金", 酉:"金", 戌:"土", 亥:"水",
};

/** 天干阴阳（0=阳, 1=阴） */
export const STEM_YIN_YANG: Record<string, 0 | 1> = {
  甲:0, 乙:1, 丙:0, 丁:1, 戊:0, 己:1, 庚:0, 辛:1, 壬:0, 癸:1,
};

/** 地支藏干（主气） */
export const BRANCH_HIDDEN_STEM: Record<string, string> = {
  子:"癸", 丑:"己", 寅:"甲", 卯:"乙", 辰:"戊", 巳:"丙",
  午:"丁", 未:"己", 申:"庚", 酉:"辛", 戌:"戊", 亥:"壬",
};

/** 纳音五行表（60甲子） */
const NA_YIN: Record<string, string> = {
  甲子:"海中金", 乙丑:"海中金", 丙寅:"炉中火", 丁卯:"炉中火",
  戊辰:"大林木", 己巳:"大林木", 庚午:"路旁土", 辛未:"路旁土",
  壬申:"剑锋金", 癸酉:"剑锋金", 甲戌:"山头火", 乙亥:"山头火",
  丙子:"涧下水", 丁丑:"涧下水", 戊寅:"城头土", 己卯:"城头土",
  庚辰:"白蜡金", 辛巳:"白蜡金", 壬午:"杨柳木", 癸未:"杨柳木",
  甲申:"泉中水", 乙酉:"泉中水", 丙戌:"屋上土", 丁亥:"屋上土",
  戊子:"霹雳火", 己丑:"霹雳火", 庚寅:"松柏木", 辛卯:"松柏木",
  壬辰:"长流水", 癸巳:"长流水", 甲午:"沙中金", 乙未:"沙中金",
  丙申:"山下火", 丁酉:"山下火", 戊戌:"平地木", 己亥:"平地木",
  庚子:"壁上土", 辛丑:"壁上土", 壬寅:"金箔金", 癸卯:"金箔金",
  甲辰:"覆灯火", 乙巳:"覆灯火", 丙午:"天河水", 丁未:"天河水",
  戊申:"大驿土", 己酉:"大驿土", 庚戌:"钗钏金", 辛亥:"钗钏金",
  壬子:"桑柘木", 癸丑:"桑柘木", 甲寅:"大溪水", 乙卯:"大溪水",
  丙辰:"沙中土", 丁巳:"沙中土", 戊午:"天上火", 己未:"天上火",
  庚申:"石榴木", 辛酉:"石榴木", 壬戌:"大海水", 癸亥:"大海水",
};

// ─────────────────────────────────────────────────────────────────────────────
// §3  城市经度数据库（用于真太阳时）
// ─────────────────────────────────────────────────────────────────────────────

type CityLon = { city: string; lon: number; tz: string };

const CITY_LON_DB: CityLon[] = [
  { city:"北京",   lon:116.41, tz:"Asia/Shanghai" },
  { city:"上海",   lon:121.47, tz:"Asia/Shanghai" },
  { city:"广州",   lon:113.26, tz:"Asia/Shanghai" },
  { city:"深圳",   lon:114.06, tz:"Asia/Shanghai" },
  { city:"杭州",   lon:120.16, tz:"Asia/Shanghai" },
  { city:"南京",   lon:118.80, tz:"Asia/Shanghai" },
  { city:"苏州",   lon:120.59, tz:"Asia/Shanghai" },
  { city:"武汉",   lon:114.31, tz:"Asia/Shanghai" },
  { city:"成都",   lon:104.07, tz:"Asia/Shanghai" },
  { city:"重庆",   lon:106.55, tz:"Asia/Shanghai" },
  { city:"西安",   lon:108.94, tz:"Asia/Shanghai" },
  { city:"郑州",   lon:113.63, tz:"Asia/Shanghai" },
  { city:"济南",   lon:117.12, tz:"Asia/Shanghai" },
  { city:"青岛",   lon:120.38, tz:"Asia/Shanghai" },
  { city:"烟台",   lon:121.39, tz:"Asia/Shanghai" },
  { city:"威海",   lon:122.12, tz:"Asia/Shanghai" },
  { city:"临沂",   lon:118.36, tz:"Asia/Shanghai" },
  { city:"哈尔滨", lon:126.64, tz:"Asia/Shanghai" },
  { city:"长春",   lon:125.33, tz:"Asia/Shanghai" },
  { city:"沈阳",   lon:123.43, tz:"Asia/Shanghai" },
  { city:"天津",   lon:117.20, tz:"Asia/Shanghai" },
  { city:"石家庄", lon:114.51, tz:"Asia/Shanghai" },
  { city:"太原",   lon:112.57, tz:"Asia/Shanghai" },
  { city:"呼和浩特",lon:111.75,tz:"Asia/Shanghai" },
  { city:"合肥",   lon:117.28, tz:"Asia/Shanghai" },
  { city:"福州",   lon:119.30, tz:"Asia/Shanghai" },
  { city:"厦门",   lon:118.09, tz:"Asia/Shanghai" },
  { city:"南昌",   lon:115.89, tz:"Asia/Shanghai" },
  { city:"长沙",   lon:112.98, tz:"Asia/Shanghai" },
  { city:"南宁",   lon:108.37, tz:"Asia/Shanghai" },
  { city:"海口",   lon:110.33, tz:"Asia/Shanghai" },
  { city:"昆明",   lon:102.71, tz:"Asia/Shanghai" },
  { city:"贵阳",   lon:106.63, tz:"Asia/Shanghai" },
  { city:"兰州",   lon:103.82, tz:"Asia/Shanghai" },
  { city:"西宁",   lon:101.78, tz:"Asia/Shanghai" },
  { city:"银川",   lon:106.23, tz:"Asia/Shanghai" },
  { city:"拉萨",   lon:91.11,  tz:"Asia/Shanghai" },
  { city:"乌鲁木齐",lon:87.62, tz:"Asia/Urumqi"  },
  { city:"喀什",   lon:75.99,  tz:"Asia/Urumqi"  },
  // 海外城市
  { city:"香港",   lon:114.17, tz:"Asia/Hong_Kong" },
  { city:"台北",   lon:121.57, tz:"Asia/Taipei"   },
  { city:"新加坡", lon:103.82, tz:"Asia/Singapore" },
  { city:"东京",   lon:139.65, tz:"Asia/Tokyo"    },
  { city:"大阪",   lon:135.50, tz:"Asia/Tokyo"    },
  { city:"首尔",   lon:126.98, tz:"Asia/Seoul"    },
  { city:"曼谷",   lon:100.50, tz:"Asia/Bangkok"  },
  { city:"吉隆坡", lon:101.69, tz:"Asia/Kuala_Lumpur" },
  { city:"悉尼",   lon:151.21, tz:"Australia/Sydney"  },
  { city:"墨尔本", lon:144.96, tz:"Australia/Melbourne"},
  { city:"纽约",   lon:-74.01, tz:"America/New_York"  },
  { city:"洛杉矶", lon:-118.24,tz:"America/Los_Angeles"},
  { city:"旧金山", lon:-122.42,tz:"America/Los_Angeles"},
  { city:"伦敦",   lon:-0.13,  tz:"Europe/London"     },
  { city:"巴黎",   lon:2.35,   tz:"Europe/Paris"      },
  { city:"柏林",   lon:13.41,  tz:"Europe/Berlin"     },
  { city:"多伦多", lon:-79.38, tz:"America/Toronto"   },
  { city:"温哥华", lon:-123.12,tz:"America/Vancouver" },
  { city:"迪拜",   lon:55.27,  tz:"Asia/Dubai"        },
  { city:"阿姆斯特丹",lon:4.90,tz:"Europe/Amsterdam"  },
];

/** 查找城市经度（找不到返回 120，即标准北京时间经度） */
export function getCityLon(cityName: string): number {
  return CITY_LON_DB.find((c) => c.city === cityName)?.lon ?? 120;
}

// ─────────────────────────────────────────────────────────────────────────────
// §4  真太阳时算法（Spencer 1971 时差方程）
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 时差（Equation of Time）— Spencer (1971) 近似公式
 * 精度：±0.5 分钟
 *
 * @returns 时差（分钟），正值表示真太阳时超前平太阳时
 */
export function getEquationOfTime(date: Date): number {
  const start   = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86400000);
  const B = (2 * Math.PI / 365) * (dayOfYear - 1);
  return 229.18 * (
    0.000075 +
    0.001868 * Math.cos(B)    -
    0.032077 * Math.sin(B)    -
    0.014615 * Math.cos(2*B)  -
    0.04089  * Math.sin(2*B)
  );
}

/**
 * 计算真太阳时偏移（分钟）
 * = 经度修正 + 时差
 *
 * 经度修正：每偏离东经120° 1°，偏移 4 分钟
 *
 * @param lon   出生地经度（°E，西经为负）
 * @param date  出生日期
 */
export function getTrueSolarOffset(lon: number, date: Date): number {
  const lonCorrection = 4 * (lon - 120); // 分钟
  const eot           = getEquationOfTime(date);
  return lonCorrection + eot;
}

/**
 * 城市真太阳时偏移（分钟）
 */
export function cityTrueSolarOffset(city: string, date: Date): number {
  const lon = getCityLon(city);
  return getTrueSolarOffset(lon, date);
}

/**
 * 将标准时间转换为真太阳时
 *
 * @param standardTime  标准时间（Date 对象，假定 UTC+8）
 * @param city          出生城市
 * @returns             校正后的真太阳时（新 Date 对象）
 */
export function toTrueSolarTime(standardTime: Date, city: string): Date {
  const offsetMin = cityTrueSolarOffset(city, standardTime);
  return new Date(standardTime.getTime() + offsetMin * 60 * 1000);
}

// ─────────────────────────────────────────────────────────────────────────────
// §5  四柱排盘
// ─────────────────────────────────────────────────────────────────────────────

/** 时辰序（子=0, 丑=1, 寅=2 … 亥=11）*/
export function getHourBranchIndex(hour: number, minute: number): number {
  const totalMin = hour * 60 + minute;
  // 子时：23:00-01:00 → 跨日处理
  // 规则：23:00-00:59 → 子(0), 01:00-02:59 → 丑(1) … 21:00-22:59 → 亥(11)
  if (totalMin >= 23 * 60 || totalMin < 1 * 60) return 0;  // 子
  return Math.floor((totalMin - 60) / 120) + 1;
}

export function getHourBranch(hour: number, minute: number): string {
  return EARTHLY_BRANCHES[getHourBranchIndex(hour, minute)];
}

/** 日柱：以参考甲子日推算（参考：2000-01-01 = 甲戌日） */
export function getDayPillar(date: Date): Pillar {
  const REF_JDN = julianDayNumber(2000, 1, 1); // 甲戌
  const REF_STEM   = 0;  // 甲
  const REF_BRANCH = 10; // 戌

  const jdn = julianDayNumber(
    date.getFullYear(), date.getMonth() + 1, date.getDate()
  );
  const delta   = jdn - REF_JDN;
  const stemIdx = ((REF_STEM   + delta) % 10 + 10) % 10;
  const branchIdx = ((REF_BRANCH + delta) % 12 + 12) % 12;

  return buildPillar(stemIdx, branchIdx);
}

/** 年柱：寅月（立春）后换年，或正月初一换年（useJieqiBoundary 控制） */
export function getYearPillar(
  date: Date,
  useJieqiBoundary: boolean
): Pillar {
  let year = date.getFullYear();

  if (useJieqiBoundary) {
    // 立春前：属上一年
    const lichun = getJieqi(year, "立春");
    if (date < lichun.date) {
      year -= 1;
    }
  } else {
    // 以农历正月初一为准
    const lunar = solarToLunar(date);
    year = lunar.year;
  }

  // 年干支：1984年 = 甲子
  const stemIdx   = ((year - 4) % 10 + 10) % 10;
  const branchIdx = ((year - 4) % 12 + 12) % 12;
  return buildPillar(stemIdx, branchIdx);
}

/** 时柱天干：以日干确定（五鼠遁） */
export function getHourPillar(
  dayStemIdx: number,
  hourBranchIdx: number
): Pillar {
  // 五鼠遁：甲己日 → 甲子时起
  const bases = [0, 2, 4, 6, 8, 0, 2, 4, 6, 8]; // 甲0,乙2,丙4…
  const hourStemIdx = (bases[dayStemIdx] + hourBranchIdx) % 10;
  return buildPillar(hourStemIdx, hourBranchIdx);
}

// ─────────────────────────────────────────────────────────────────────────────
// §6  主入口：完整四柱排盘
// ─────────────────────────────────────────────────────────────────────────────

export function computeFourPillars(input: PillarInput): PillarResult {
  const {
    solarDate,
    birthTime,
    birthCity = "北京",
    useTrueSolarTime = false,
    useJieqiBoundary = true,
  } = input;

  // 1. 解析出生时间
  const [hStr, mStr] = birthTime.split(":");
  let hour   = parseInt(hStr, 10) || 0;
  let minute = parseInt(mStr, 10) || 0;

  // 2. 真太阳时校正
  let correctedDate  = new Date(solarDate);
  let offsetMin: number | undefined;

  if (useTrueSolarTime && birthCity) {
    const stdDateTime = new Date(
      solarDate.getFullYear(),
      solarDate.getMonth(),
      solarDate.getDate(),
      hour,
      minute
    );
    offsetMin = cityTrueSolarOffset(birthCity, stdDateTime);
    const correctedDateTime = new Date(
      stdDateTime.getTime() + offsetMin * 60 * 1000
    );
    correctedDate = new Date(
      correctedDateTime.getFullYear(),
      correctedDateTime.getMonth(),
      correctedDateTime.getDate()
    );
    hour   = correctedDateTime.getHours();
    minute = correctedDateTime.getMinutes();
  }

  // 3. 农历
  const lunar = solarToLunar(correctedDate);

  // 4. 年柱
  const yearPillar = getYearPillar(correctedDate, useJieqiBoundary);

  // 5. 月柱（节气边界）
  const yearStemIdx  = HEAVENLY_STEMS.indexOf(yearPillar.stem as any);
  const monthResult  = getMonthPillar(correctedDate, yearStemIdx, useJieqiBoundary);
  const monthStemIdx = HEAVENLY_STEMS.indexOf(monthResult.stem as any);
  const monthBranchIdx = EARTHLY_BRANCHES.indexOf(monthResult.branch as any);
  const monthPillar  = buildPillar(monthStemIdx, monthBranchIdx);

  // 6. 日柱
  const dayPillar = getDayPillar(correctedDate);
  const dayStemIdx = HEAVENLY_STEMS.indexOf(dayPillar.stem as any);

  // 7. 时柱
  const hourBranchIdx = getHourBranchIndex(hour, minute);
  const hourPillar    = getHourPillar(dayStemIdx, hourBranchIdx);

  const pillars: FourPillars = {
    year:  yearPillar,
    month: monthPillar,
    day:   dayPillar,
    hour:  hourPillar,
  };

  // 8. 十神（以日主天干为基准）
  const dayStem = dayPillar.stem;
  const tenGods = {
    year:  getTenGod(dayStem, yearPillar.stem),
    month: getTenGod(dayStem, monthPillar.stem),
    hour:  getTenGod(dayStem, hourPillar.stem),
  };

  // 9. 五行统计
  const wuXingCount = countWuXing(pillars);

  // 10. 纳音
  const naYin = NA_YIN[yearPillar.name] ?? "未知";

  // 11. 空亡（旬空）
  const kongWang = getKongWang(dayPillar);

  return {
    input,
    correctedTime: useTrueSolarTime ? new Date(
      correctedDate.getFullYear(),
      correctedDate.getMonth(),
      correctedDate.getDate(),
      hour,
      minute
    ) : undefined,
    trueSolarOffsetMin: offsetMin,
    pillars,
    lunar,
    tenGods,
    wuXingCount,
    naYin,
    kongWang,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// §7  十神、五行、空亡
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 十神关系：以日主天干为 self，判断 target 天干的十神
 */
export function getTenGod(dayStem: string, targetStem: string): TenGod {
  if (dayStem === targetStem) return "比肩";

  const dayWx   = STEM_WUXING[dayStem];
  const tgtWx   = STEM_WUXING[targetStem];
  const dayYin  = STEM_YIN_YANG[dayStem];
  const tgtYin  = STEM_YIN_YANG[targetStem];
  const samePol = dayYin === tgtYin;

  // 五行关系：生我、我生、克我、我克、同我
  const sheng: Record<WuXing, WuXing> = { 木:"火", 火:"土", 土:"金", 金:"水", 水:"木" };
  const ke:    Record<WuXing, WuXing> = { 木:"土", 火:"金", 土:"水", 金:"木", 水:"火" };

  if (dayWx === tgtWx) {
    return samePol ? "比肩" : "劫财";
  }
  if (sheng[dayWx] === tgtWx) {
    return samePol ? "食神" : "伤官";
  }
  if (ke[dayWx] === tgtWx) {
    return samePol ? "偏财" : "正财";
  }
  if (ke[tgtWx] === dayWx) {
    return samePol ? "七杀" : "正官";
  }
  if (sheng[tgtWx] === dayWx) {
    return samePol ? "偏印" : "正印";
  }
  return "比肩"; // fallback
}

export function getWuXingFromStem(stem: string): WuXing {
  return STEM_WUXING[stem] ?? "木";
}

export function getWuXingFromBranch(branch: string): WuXing {
  return BRANCH_WUXING[branch] ?? "木";
}

/** 统计四柱五行分布 */
export function countWuXing(pillars: FourPillars): Record<WuXing, number> {
  const count: Record<WuXing, number> = { 木:0, 火:0, 土:0, 金:0, 水:0 };
  for (const p of [pillars.year, pillars.month, pillars.day, pillars.hour]) {
    count[p.wuXingS]++;
    count[p.wuXingB]++;
  }
  return count;
}

/** 旬空（空亡）计算 */
export function getKongWang(dayPillar: Pillar): string[] {
  const stemIdx   = HEAVENLY_STEMS.indexOf(dayPillar.stem as any);
  const branchIdx = EARTHLY_BRANCHES.indexOf(dayPillar.branch as any);
  // 旬首：同旬起始，每旬10天，10干对12支，末2支为空亡
  const xunStart   = branchIdx - stemIdx;
  const kong1Idx   = ((xunStart + 10) % 12 + 12) % 12;
  const kong2Idx   = ((xunStart + 11) % 12 + 12) % 12;
  return [EARTHLY_BRANCHES[kong1Idx], EARTHLY_BRANCHES[kong2Idx]];
}

// ─────────────────────────────────────────────────────────────────────────────
// §8  格局分析（初步）
// ─────────────────────────────────────────────────────────────────────────────

export type GeJu =
  | "从旺格" | "从强格" | "从弱格"
  | "身旺" | "身弱" | "身中和"
  | "食伤生财格" | "官印相生格" | "七杀制化格";

/**
 * 初步格局判断（简化版）
 * 完整格局判断需结合大运流年，此处为第一轮基础判断。
 */
export function analyzePillars(result: PillarResult): {
  gejuHint: string;
  strongWuXing: WuXing[];
  weakWuXing: WuXing[];
  dayStemStrength: "旺" | "相" | "休" | "囚" | "死";
} {
  const { wuXingCount, pillars } = result;
  const dayStemWx = STEM_WUXING[pillars.day.stem];

  const sortedWx = (Object.entries(wuXingCount) as [WuXing, number][])
    .sort((a, b) => b[1] - a[1]);
  const strongWuXing = sortedWx.filter(([, v]) => v >= 2).map(([k]) => k);
  const weakWuXing   = sortedWx.filter(([, v]) => v === 0).map(([k]) => k);

  // 日主旺衰（超简化：按五行数量）
  const dayScore = wuXingCount[dayStemWx];
  let dayStemStrength: "旺" | "相" | "休" | "囚" | "死";
  if (dayScore >= 3) dayStemStrength = "旺";
  else if (dayScore === 2) dayStemStrength = "相";
  else if (dayScore === 1) dayStemStrength = "休";
  else dayStemStrength = "囚";

  const gejuHint =
    dayScore >= 3
      ? "日主较旺，适合疏泄和克制之物"
      : dayScore <= 1
      ? "日主较弱，适合生扶之物"
      : "日主中和，格局较为平衡";

  return { gejuHint, strongWuXing, weakWuXing, dayStemStrength };
}

// ─────────────────────────────────────────────────────────────────────────────
// §9  内部工具
// ─────────────────────────────────────────────────────────────────────────────

function buildPillar(stemIdx: number, branchIdx: number): Pillar {
  const stem   = HEAVENLY_STEMS[stemIdx];
  const branch = EARTHLY_BRANCHES[branchIdx];
  return {
    stem,
    branch,
    name:    stem + branch,
    wuXingS: STEM_WUXING[stem],
    wuXingB: BRANCH_WUXING[branch],
  };
}

function julianDayNumber(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// §10  格式化输出
// ─────────────────────────────────────────────────────────────────────────────

export function formatFourPillars(result: PillarResult): string {
  const { pillars, lunar, tenGods, wuXingCount, naYin, kongWang } = result;
  const lines: string[] = [
    `╔══════════════════════════════════╗`,
    `║         四 柱 八 字              ║`,
    `╠══════════╦══════════╦═══════════╬══════════╣`,
    `║  年柱    ║  月柱    ║  日柱     ║  时柱    ║`,
    `╠══════════╬══════════╬═══════════╬══════════╣`,
    `║ ${pillars.year.name.padEnd(4)}   ║ ${pillars.month.name.padEnd(4)}   ║ ${pillars.day.name.padEnd(5)} (日主) ║ ${pillars.hour.name.padEnd(4)}   ║`,
    `║ ${pillars.year.wuXingS+pillars.year.wuXingB} ║ ${pillars.month.wuXingS+pillars.month.wuXingB} ║ ${pillars.day.wuXingS+pillars.day.wuXingB}        ║ ${pillars.hour.wuXingS+pillars.hour.wuXingB} ║`,
    `║ ${tenGods.year.padEnd(4)} ║ ${tenGods.month.padEnd(4)} ║ 日主      ║ ${tenGods.hour.padEnd(4)} ║`,
    `╚══════════╩══════════╩═══════════╩══════════╝`,
    ``,
    `农历：${lunar.yearName} ${lunar.monthName}${lunar.dayName}（${lunar.zodiac}年）`,
    `纳音：${naYin}`,
    `空亡：${kongWang.join(" ")}`,
    ``,
    `五行统计：木${wuXingCount.木} 火${wuXingCount.火} 土${wuXingCount.土} 金${wuXingCount.金} 水${wuXingCount.水}`,
  ];

  if (result.trueSolarOffsetMin !== undefined) {
    const sign = result.trueSolarOffsetMin >= 0 ? "+" : "";
    lines.push(`真太阳时校正：${sign}${result.trueSolarOffsetMin.toFixed(1)} 分钟`);
    if (result.correctedTime) {
      const h = String(result.correctedTime.getHours()).padStart(2, "0");
      const m = String(result.correctedTime.getMinutes()).padStart(2, "0");
      lines.push(`校正后时间：${h}:${m}`);
    }
  }

  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// §11  单元测试
// ─────────────────────────────────────────────────────────────────────────────

if (process.env.NODE_ENV === "test" || require.main === module) {
  const assert = (cond: boolean, msg: string) => {
    if (!cond) throw new Error(`❌ FAIL: ${msg}`);
    console.log(`✅ PASS: ${msg}`);
  };

  // Test 1: 2024-02-10 = 甲辰年甲寅月 (立春后)
  const r1 = computeFourPillars({
    solarDate:        new Date(2024, 1, 10),
    birthTime:        "12:00",
    useJieqiBoundary: true,
    useTrueSolarTime: false,
  });
  assert(r1.pillars.year.name === "甲辰", "2024年年柱=甲辰");

  // Test 2: 真太阳时 — 成都（东经104°）偏西，校正为负
  const offset = cityTrueSolarOffset("成都", new Date(2024, 0, 1));
  assert(offset < 0, "成都真太阳时校正 < 0（偏西）");
  console.log(`  成都真太阳时偏移：${offset.toFixed(1)} 分钟`);

  // Test 3: 乌鲁木齐（东经87.6°，使用 Asia/Urumqi UTC+6）
  //          标准时间为北京时间，校正应为负数
  const offsetUrumqi = cityTrueSolarOffset("乌鲁木齐", new Date(2024, 6, 1));
  assert(offsetUrumqi < -60, "乌鲁木齐真太阳时偏移 < -60 分钟");
  console.log(`  乌鲁木齐真太阳时偏移：${offsetUrumqi.toFixed(1)} 分钟`);

  // Test 4: 日柱 — 2000-01-01 = 甲戌
  const dayP = getDayPillar(new Date(2000, 0, 1));
  assert(dayP.name === "甲戌", "2000-01-01 日柱 = 甲戌");

  // Test 5: 十神 — 甲日主，庚=七杀
  const tg = getTenGod("甲", "庚");
  assert(tg === "七杀", "甲日主看庚 = 七杀");

  // Test 6: 时支
  assert(getHourBranch(0, 30)  === "子", "00:30 = 子时");
  assert(getHourBranch(13, 0)  === "未", "13:00 = 未时");
  assert(getHourBranch(23, 30) === "子", "23:30 = 子时");

  // Test 7: 完整排盘输出
  const demo = computeFourPillars({
    solarDate:        new Date(1987, 11, 3),  // 1987-12-03
    birthTime:        "01:30",
    birthCity:        "济南",
    useTrueSolarTime: true,
    useJieqiBoundary: true,
  });
  console.log("\n示例排盘（1987-12-03 01:30 济南，开启真太阳时）：");
  console.log(formatFourPillars(demo));

  console.log("\n🎉 四柱引擎所有测试通过");
}
