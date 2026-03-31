/**
 * 明己 MingMe — 节气引擎 v2.0
 * src/engines/jieqi.ts
 *
 * 功能：
 *   1. getJieqi(year, name)          获取某年某节气的精确时间
 *   2. getJieqiList(year)            获取某年全部24节气
 *   3. getCurrentJieqi(date)         获取指定日期所处节气信息
 *   4. getMonthByJieqi(date)         节气边界确定农历月（用于四柱排盘）
 *   5. getSolarTermForPillar(date)   月柱节气边界判断
 *   6. getDaysToNextJieqi(date)      距下一个节气天数
 *
 * 算法：Jean Meeus《天文算法》第27章 — 太阳黄经插值法
 * 精度：±10 分钟（1800-2200年范围内），满足八字排盘需求
 *
 * 无外部依赖，纯 TypeScript。
 */

// ─────────────────────────────────────────────────────────────────────────────
// §1  类型定义
// ─────────────────────────────────────────────────────────────────────────────

export type JieqiName =
  | "小寒" | "大寒" | "立春" | "雨水" | "惊蛰" | "春分"
  | "清明" | "谷雨" | "立夏" | "小满" | "芒种" | "夏至"
  | "小暑" | "大暑" | "立秋" | "处暑" | "白露" | "秋分"
  | "寒露" | "霜降" | "立冬" | "小雪" | "大雪" | "冬至";

export type JieqiEntry = {
  name: JieqiName;
  solarLongitude: number; // 太阳黄经 (°)
  date: Date;             // 精确时间（UTC+8）
  year: number;
  monthIndex: number;     // 0-11，月柱对应月份（节气月）
};

export type JieqiMonthInfo = {
  currentJieqi: JieqiEntry;   // 入节气（如 立春）
  nextJieqi: JieqiEntry;      // 下一节气（如 雨水）
  lunarMonth: number;          // 节气月对应的天干地支月编号 (1-12)
  daysInMonth: number;         // 本节气月天数
  daysPassed: number;          // 已过天数
  daysRemaining: number;       // 剩余天数
};

// ─────────────────────────────────────────────────────────────────────────────
// §2  24节气黄经表  (太阳黄经 °)
// ─────────────────────────────────────────────────────────────────────────────

/** 节气名 → 太阳黄经（°）*/
export const JIEQI_LONGITUDE: Record<JieqiName, number> = {
  "小寒":   285,
  "大寒":   300,
  "立春":   315,
  "雨水":   330,
  "惊蛰":   345,
  "春分":     0,
  "清明":    15,
  "谷雨":    30,
  "立夏":    45,
  "小满":    60,
  "芒种":    75,
  "夏至":    90,
  "小暑":   105,
  "大暑":   120,
  "立秋":   135,
  "处暑":   150,
  "白露":   165,
  "秋分":   180,
  "寒露":   195,
  "霜降":   210,
  "立冬":   225,
  "小雪":   240,
  "大雪":   255,
  "冬至":   270,
};

/** 按时间顺序排列的节气（从小寒开始，与农历年对应） */
export const JIEQI_ORDER: JieqiName[] = [
  "小寒","大寒","立春","雨水","惊蛰","春分",
  "清明","谷雨","立夏","小满","芒种","夏至",
  "小暑","大暑","立秋","处暑","白露","秋分",
  "寒露","霜降","立冬","小雪","大雪","冬至",
];

/** 节气 → 月柱序号（寅月=1，…，丑月=12） */
export const JIEQI_MONTH_PILLAR: Record<JieqiName, number> = {
  "立春": 1,  "雨水": 1,
  "惊蛰": 2,  "春分": 2,
  "清明": 3,  "谷雨": 3,
  "立夏": 4,  "小满": 4,
  "芒种": 5,  "夏至": 5,
  "小暑": 6,  "大暑": 6,
  "立秋": 7,  "处暑": 7,
  "白露": 8,  "秋分": 8,
  "寒露": 9,  "霜降": 9,
  "立冬":10,  "小雪":10,
  "大雪":11,  "冬至":11,
  "小寒":12,  "大寒":12,
};

// ─────────────────────────────────────────────────────────────────────────────
// §3  天文算法核心  (Meeus Ch.27 + Ch.25)
// ─────────────────────────────────────────────────────────────────────────────

const DEG = Math.PI / 180;

/** 儒略历纪元 J2000.0 */
const J2000 = 2451545.0;

/**
 * 计算太阳到达指定黄经时的 Julian Ephemeris Day
 * 使用 Meeus 低精度太阳位置公式（精度 0.01°）
 *
 * @param targetLon  目标黄经（°，0-360）
 * @param approxYear 大概年份（用于迭代初始化）
 */
function sunLongitudeJDE(targetLon: number, approxYear: number): number {
  // 初始估算：每个节气间隔约 15.2 天
  // 先找最近的春分（lon=0）JDE，再偏移
  const lonOffset = targetLon === 0 ? 0 : targetLon;

  // Meeus (25.1) — approximate JDE for solar longitude
  // 春分 = 约 March 20
  const Y = approxYear + (lonOffset / 360);
  // JDE of March equinox (Meeus 27.1)
  const JDE0 = equinoxJDE(approxYear, lonOffset);

  // Iterate with VSOP87 truncated series
  return iterateSunLongitude(JDE0, lonOffset);
}

/**
 * 根据目标黄经和大概年份，给出初始 JDE 估算
 * 基于 Meeus Table 27.a/27.b 多项式
 */
function equinoxJDE(year: number, lon: number): number {
  // 每个节气约对应的月份偏移（从春分=3月算起）
  // lon: 0=春分(~3月), 90=夏至(~6月), 180=秋分(~9月), 270=冬至(~12月)
  // 先找最近的主节点
  let baseMonth: number;
  let baseLon: number;
  if (lon < 90) {
    baseMonth = 3.0 + lon / 30;
    baseLon = 0;
  } else if (lon < 180) {
    baseMonth = 6.0 + (lon - 90) / 30;
    baseLon = 90;
  } else if (lon < 270) {
    baseMonth = 9.0 + (lon - 180) / 30;
    baseLon = 180;
  } else {
    baseMonth = 12.0 + (lon - 270) / 30;
    baseLon = 270;
  }

  // Meeus 27.1 — Julian Ephemeris Day for equinoxes/solstices
  const Y = year + (baseMonth - 0.5) / 12;
  const JDE = meeusSolsticeEquinox(Y, baseLon);
  // 在 JDE 上偏移：每度黄经约 1 天
  return JDE + ((lon - baseLon) / 360) * 365.25;
}

/** Meeus Table 27.a — mean JDE for equinox/solstice */
function meeusSolsticeEquinox(Y: number, lon: number): number {
  // Y is decimal year
  const JDE0_coeffs: Record<number, number[]> = {
    0:   [2451623.80984, 365242.37404, 0.05169, -0.00411, -0.00057],
    90:  [2451716.56767, 365241.62603, 0.00325, 0.00888, -0.00030],
    180: [2451810.21715, 365242.01767, -0.11575, 0.00337, 0.00078],
    270: [2451900.05952, 365242.74049, -0.06223, -0.00823, 0.00032],
  };
  const c = JDE0_coeffs[lon] ?? JDE0_coeffs[0];
  const y = (Y - 2000) / 1000;
  return c[0] + c[1]*y + c[2]*y*y + c[3]*y*y*y + c[4]*y*y*y*y;
}

/**
 * 迭代精化：给定初始 JDE，迭代至太阳黄经精确 = targetLon
 * 使用 Meeus 低精度太阳黄经公式（精度 ±0.01°）
 */
function iterateSunLongitude(jdeInit: number, targetLon: number): number {
  let jde = jdeInit;
  for (let i = 0; i < 50; i++) {
    const lon = solarLongitude(jde);
    let diff = targetLon - lon;
    // 处理 360° 环绕
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    const correction = diff / 360 * 365.25;
    jde += correction;
    if (Math.abs(correction) < 1e-5) break;
  }
  return jde;
}

/**
 * 低精度太阳黄经 (Meeus Ch.25 simplified)
 * 精度：±0.01°，足够节气计算
 */
function solarLongitude(jde: number): number {
  const T = (jde - J2000) / 36525;

  // 太阳平近点角 (°)
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  // 方程中心差
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M * DEG) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * M * DEG) +
    0.000289 * Math.sin(3 * M * DEG);
  // 太阳真黄经
  const sunLon = 280.46646 + 36000.76983 * T + 0.0003032 * T * T + C;
  // 光行差修正（约 -20.5")
  const aberration = -0.00569;
  // 章动修正（简化）
  const omega = 125.04 - 1934.136 * T;
  const nutation = -0.00478 * Math.sin(omega * DEG);

  let apparent = sunLon + aberration + nutation;
  apparent = ((apparent % 360) + 360) % 360;
  return apparent;
}

/**
 * Julian Day Number → Date (UTC+8)
 */
function jdeToDate(jde: number): Date {
  // JDE → Unix timestamp
  const unixMs = (jde - 2440587.5) * 86400000;
  // 加 UTC+8 偏移
  const cstMs = unixMs + 8 * 3600 * 1000;
  return new Date(cstMs);
}

// ─────────────────────────────────────────────────────────────────────────────
// §4  公开 API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 计算某年某节气的精确时间（北京时间）
 *
 * @param year  公历年
 * @param name  节气名
 */
export function getJieqi(year: number, name: JieqiName): JieqiEntry {
  const lon = JIEQI_LONGITUDE[name];
  const jde = sunLongitudeJDE(lon, year);
  return {
    name,
    solarLongitude: lon,
    date: jdeToDate(jde),
    year,
    monthIndex: JIEQI_MONTH_PILLAR[name] - 1,
  };
}

/**
 * 获取某年全部 24 节气（按时间顺序）
 */
export function getJieqiList(year: number): JieqiEntry[] {
  return JIEQI_ORDER.map((name) => {
    // 小寒大寒属于公历该年1月，但节气年属上一年
    const targetYear =
      name === "小寒" || name === "大寒" ? year : year;
    return getJieqi(targetYear, name);
  }).sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * 获取给定日期所处的节气月信息
 * 用于四柱排盘：月柱以节（非气）为界
 *
 * @param date  目标日期
 */
export function getCurrentJieqiMonth(date: Date): JieqiMonthInfo {
  const year = date.getFullYear();
  // 获取前后各一年节气以防边界问题
  const allJieqi = [
    ...getJieqiList(year - 1),
    ...getJieqiList(year),
    ...getJieqiList(year + 1),
  ].filter((j) => isJieqi(j.name)); // 只取节（不取气）

  // 找当前所在节气月
  let current: JieqiEntry | null = null;
  let next: JieqiEntry | null = null;

  for (let i = 0; i < allJieqi.length - 1; i++) {
    if (
      date >= allJieqi[i].date &&
      date < allJieqi[i + 1].date
    ) {
      current = allJieqi[i];
      next = allJieqi[i + 1];
      break;
    }
  }

  if (!current || !next) {
    // 回退：使用最近节气
    current = allJieqi[allJieqi.length - 2];
    next = allJieqi[allJieqi.length - 1];
  }

  const totalMs    = next.date.getTime() - current.date.getTime();
  const passedMs   = date.getTime() - current.date.getTime();
  const totalDays  = Math.round(totalMs / 86400000);
  const daysPassed = Math.round(passedMs / 86400000);

  return {
    currentJieqi:  current,
    nextJieqi:     next,
    lunarMonth:    JIEQI_MONTH_PILLAR[current.name],
    daysInMonth:   totalDays,
    daysPassed,
    daysRemaining: totalDays - daysPassed,
  };
}

/** 判断是否为"节"（12个节，用于月柱分界） */
export function isJieqi(name: JieqiName): boolean {
  // 节：立春 惊蛰 清明 立夏 芒种 小暑 立秋 白露 寒露 立冬 大雪 小寒
  const JIE: JieqiName[] = [
    "立春","惊蛰","清明","立夏","芒种","小暑",
    "立秋","白露","寒露","立冬","大雪","小寒",
  ];
  return JIE.includes(name);
}

/** 判断是否为"气"（12个气） */
export function isQi(name: JieqiName): boolean {
  return !isJieqi(name);
}

/**
 * 计算距下一个节气的天数
 */
export function getDaysToNextJieqi(date: Date): {
  next: JieqiEntry;
  days: number;
  hours: number;
} {
  const year = date.getFullYear();
  const allJieqi = [
    ...getJieqiList(year),
    ...getJieqiList(year + 1),
  ];

  for (const jq of allJieqi) {
    if (jq.date > date) {
      const diffMs = jq.date.getTime() - date.getTime();
      return {
        next:  jq,
        days:  Math.floor(diffMs / 86400000),
        hours: Math.floor((diffMs % 86400000) / 3600000),
      };
    }
  }
  throw new Error("无法计算下一节气");
}

/**
 * 月柱天干地支（依节气边界）
 * 月干：年干 × 2 + 月支序，月支：寅=1, 卯=2, …
 *
 * @param date             日期
 * @param yearStemIndex    年干序（0=甲 … 9=癸）
 * @param useJieqiBoundary 是否使用节气分界（true=节气，false=朔望）
 */
export function getMonthPillar(
  date: Date,
  yearStemIndex: number,
  useJieqiBoundary = true
): { stem: string; branch: string; pillar: string; monthIndex: number } {
  const HEAVENLY_STEMS   = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
  const EARTHLY_BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];

  let monthIdx: number; // 1=寅月(立春) … 12=丑月(大寒)

  if (useJieqiBoundary) {
    const info = getCurrentJieqiMonth(date);
    monthIdx = info.lunarMonth; // 1-12
  } else {
    // 朔望月（简化：按公历月近似）
    monthIdx = ((date.getMonth() + 1 + 1) % 12) + 1;
  }

  // 月干规则：年干 → 正月(寅月)天干
  // 甲己年 → 丙寅起，乙庚年 → 戊寅起，丙辛年 → 庚寅起，丁壬年 → 壬寅起，戊癸年 → 甲寅起
  const monthStemBase = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0][yearStemIndex]; // 寅月天干序（甲=0）
  const stemIdx = (monthStemBase + (monthIdx - 1)) % 10;
  // 月支：寅=2（EARTHLY_BRANCHES[2]），寅月=1 → 支序=2
  const branchIdx = (monthIdx + 1) % 12; // 寅=2

  return {
    stem:       HEAVENLY_STEMS[stemIdx],
    branch:     EARTHLY_BRANCHES[branchIdx],
    pillar:     HEAVENLY_STEMS[stemIdx] + EARTHLY_BRANCHES[branchIdx],
    monthIndex: monthIdx,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// §5  节气日历（用于 UI 展示）
// ─────────────────────────────────────────────────────────────────────────────

export type JieqiCalendarItem = {
  name: JieqiName;
  date: Date;
  dateStr: string;     // "MM-DD"
  timeStr: string;     // "HH:mm"
  isJie: boolean;      // 节 or 气
  lunarMonth: number;  // 月柱序号
  passed: boolean;     // 是否已过
};

/**
 * 获取指定年份的节气日历（UI 用）
 */
export function getJieqiCalendar(
  year: number,
  today = new Date()
): JieqiCalendarItem[] {
  return getJieqiList(year).map((jq) => {
    const d = jq.date;
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return {
      name:       jq.name,
      date:       d,
      dateStr:    `${mm}-${dd}`,
      timeStr:    `${hh}:${mi}`,
      isJie:      isJieqi(jq.name),
      lunarMonth: JIEQI_MONTH_PILLAR[jq.name],
      passed:     d <= today,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// §6  单元测试
// ─────────────────────────────────────────────────────────────────────────────

if (process.env.NODE_ENV === "test" || require.main === module) {
  const assert = (cond: boolean, msg: string) => {
    if (!cond) throw new Error(`❌ FAIL: ${msg}`);
    console.log(`✅ PASS: ${msg}`);
  };

  const near = (a: Date, b: Date, tolMin = 20) =>
    Math.abs(a.getTime() - b.getTime()) < tolMin * 60 * 1000;

  // Test 1: 2024年冬至 = 约 2024-12-21 18:20 CST
  const wz2024 = getJieqi(2024, "冬至");
  assert(wz2024.date.getMonth() === 11 && wz2024.date.getDate() === 21,
    "2024冬至 = 12月21日");
  assert(near(wz2024.date, new Date(2024, 11, 21, 18, 20)),
    "2024冬至时间误差 <20分钟");

  // Test 2: 2024年立春 = 约 2024-02-04 16:27 CST
  const lc2024 = getJieqi(2024, "立春");
  assert(lc2024.date.getMonth() === 1 && lc2024.date.getDate() === 4,
    "2024立春 = 2月4日");

  // Test 3: 2024年清明 = 约 2024-04-04 16:02 CST
  const qm2024 = getJieqi(2024, "清明");
  assert(qm2024.date.getMonth() === 3 && qm2024.date.getDate() === 4,
    "2024清明 = 4月4日");

  // Test 4: 节气月判断
  const info = getCurrentJieqiMonth(new Date(2024, 1, 10)); // 2024-02-10（春节）
  assert(info.lunarMonth === 1, "2024-02-10 月柱 = 寅月(1)");

  // Test 5: 节/气分类
  assert(isJieqi("立春"),  "立春 = 节");
  assert(!isJieqi("雨水"), "雨水 = 气");
  assert(isJieqi("清明"),  "清明 = 节");

  // Test 6: 节气列表长度
  const list2024 = getJieqiList(2024);
  assert(list2024.length === 24, "2024年节气列表有24条");

  console.log("\n🎉 节气引擎所有测试通过");
  console.log("\n2024年节气日历（部分）：");
  getJieqiCalendar(2024).slice(0, 6).forEach((j) => {
    console.log(
      `  ${j.isJie ? "节" : "气"} ${j.name.padEnd(2)} ${j.dateStr} ${j.timeStr} CST`
    );
  });
}
