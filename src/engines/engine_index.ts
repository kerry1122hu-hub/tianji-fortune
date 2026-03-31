import { Solar } from "lunar-typescript";

import {
  lunarToSolar,
  solarToLunar,
  getLunarYearInfo,
  getLunarMonthDays,
  formatLunarDate,
  formatSolarAsLunar,
  getGanZhi,
  getZodiac,
  LunarDate,
} from "./engine_lunar";
import {
  getJieqi,
  getJieqiList,
  getCurrentJieqiMonth,
  getDaysToNextJieqi,
  getJieqiCalendar,
  isJieqi,
  JieqiName,
  JieqiEntry,
  JieqiCalendarItem,
} from "./engine_jieqi";
import {
  analyzePillars,
  cityTrueSolarOffset,
  getCityLon,
  getTenGod,
  getWuXingFromBranch,
  getWuXingFromStem,
  toTrueSolarTime,
  FourPillars,
  Pillar,
  TenGod,
  WuXing,
} from "./engine_sizhu";

export type CalendarType = "solar" | "lunar";

export const TIAN_GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
export const DI_ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;
export const SHENG_KE = {
  木: { sheng: "火", ke: "土", beiSheng: "水", beiKe: "金" },
  火: { sheng: "土", ke: "金", beiSheng: "木", beiKe: "水" },
  土: { sheng: "金", ke: "水", beiSheng: "火", beiKe: "木" },
  金: { sheng: "水", ke: "木", beiSheng: "土", beiKe: "火" },
  水: { sheng: "木", ke: "火", beiSheng: "金", beiKe: "土" },
} as const;
export const WX_EMOJIS: Record<WuXing, string> = {
  木: "🌳",
  火: "🔥",
  土: "⛰️",
  金: "🪙",
  水: "💧",
};

const FIVE_ELEMENTS: WuXing[] = ["木", "火", "土", "金", "水"];
const PILLAR_KEYS = ["year", "month", "day", "hour"] as const;
const SHI_CHEN_TIMES = [
  "23:00-01:00",
  "01:00-03:00",
  "03:00-05:00",
  "05:00-07:00",
  "07:00-09:00",
  "09:00-11:00",
  "11:00-13:00",
  "13:00-15:00",
  "15:00-17:00",
  "17:00-19:00",
  "19:00-21:00",
  "21:00-23:00",
] as const;

export type EngineInput = {
  calendarType: CalendarType;
  solarDate?: string;
  lunarYear?: number;
  lunarMonth?: number;
  lunarDay?: number;
  lunarIsLeapMonth?: boolean;
  birthTime: string;
  birthCity: string;
  useTrueSolarTime: boolean;
  useJieqiBoundary: boolean;
  gender?: "male" | "female";
};

export type PillarDetails = {
  stemTenGod: string;
  branchTenGods: string[];
  hiddenStems: string[];
  hiddenStemTenGods: string[];
  naYin: string;
  xunKong: string;
};

export type DaYunItem = {
  index: number;
  gan: string;
  zhi: string;
  ganZhi: string;
  startYear: number;
  endYear: number;
  startAge: number;
  endAge: number;
  liuNian: Array<{
    year: number;
    age: number;
    gan: string;
    zhi: string;
    ganZhi: string;
  }>;
};

export type ClassicalDecisionRules = {
  keyRule:
    | "天元羸弱，宫吉不及为荣"
    | "中下兴隆，卦凶不能成咎"
    | "尊凶卑吉，救疗无功"
    | "尊吉卑凶，逢灾自愈";
  supportPattern: "禄有三会" | "灾有五期";
  warningPattern: "闻喜不喜" | "当忧不忧";
  summary: string;
  stageSummary: string;
  reasons: string[];
  confidence: "low" | "medium" | "high";
};

export type EngineOutput = {
  solarDate: Date;
  lunar: LunarDate;
  pillars: FourPillars;
  trueSolarOffsetMin?: number;
  correctedTime: Date;
  currentJieqiMonth: ReturnType<typeof getCurrentJieqiMonth>;
  nextJieqi: ReturnType<typeof getDaysToNextJieqi>;
  birthYearJieqi: JieqiCalendarItem[];
  tenGods: {
    year: TenGod;
    month: TenGod;
    hour: TenGod;
    summary: string;
  };
  wuXingCount: Record<WuXing, number>;
  wuXingRatio: Record<WuXing, number>;
  analysis: ReturnType<typeof analyzePillars>;
  naYin: string;
  naYinDetails: {
    year: string;
    month: string;
    day: string;
    hour: string;
  };
  kongWang: string[];
  kongWangDetails: {
    year: string;
    month: string;
    day: string;
    hour: string;
  };
  pillarDetails: {
    year: PillarDetails;
    month: PillarDetails;
    day: PillarDetails;
    hour: PillarDetails;
  };
  diShiDetails: {
    year: string;
    month: string;
    day: string;
    hour: string;
  };
  xunDetails: {
    year: string;
    month: string;
    day: string;
    hour: string;
  };
  shenShaDetails: {
    year: string[];
    month: string[];
    day: string[];
    hour: string[];
  };
  specialCombinations: Array<{
    type: string;
    name: string;
    pillars: string[];
    effect: string;
  }>;
  taiYuan: string;
  mingGong: string;
  shenGong: string;
  taiXi: string;
  daYun: DaYunItem[];
  classicalDecisionRules: ClassicalDecisionRules;
  liuNianPillar: { gan: string; zhi: string; ganZhi: string; year: number };
  todayPillar: { gan: string; zhi: string; ganZhi: string; date: string };
  guiRen: string[];
  wenChang: string;
  yiMa: string;
  formatted: {
    pillarsTable: string;
    lunarDateStr: string;
    birthSummary: string;
    ganzhi: string;
  };
};

function parseSolarDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function parseBirthTime(time: string): { hour: number; minute: number } {
  const [hour, minute] = time.split(":").map((item) => parseInt(item, 10) || 0);
  return { hour, minute };
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`;
}

function formatDateTime(date: Date): string {
  return `${formatDate(date)} ${`${date.getHours()}`.padStart(2, "0")}:${`${date.getMinutes()}`.padStart(2, "0")}`;
}

function buildPillar(name: string): Pillar {
  const stem = name.charAt(0);
  const branch = name.charAt(1);
  return {
    stem,
    branch,
    name,
    wuXingS: getWuXingFromStem(stem),
    wuXingB: getWuXingFromBranch(branch),
  };
}

function normalizeSolarInput(input: EngineInput): { solarDate: Date; solarDateTime: Date } {
  const { hour, minute } = parseBirthTime(input.birthTime);
  let solarDate: Date;

  if (input.calendarType === "solar") {
    if (!input.solarDate) {
      throw new Error("公历出生日期不能为空");
    }
    solarDate = parseSolarDate(input.solarDate);
  } else {
    solarDate = lunarToSolar({
      year: input.lunarYear ?? 1990,
      month: input.lunarMonth ?? 1,
      day: input.lunarDay ?? 1,
      isLeapMonth: input.lunarIsLeapMonth ?? false,
    });
  }

  return {
    solarDate,
    solarDateTime: new Date(
      solarDate.getFullYear(),
      solarDate.getMonth(),
      solarDate.getDate(),
      hour,
      minute,
      0,
      0
    ),
  };
}

function getCorrectedTime(input: EngineInput, solarDateTime: Date): { correctedTime: Date; trueSolarOffsetMin?: number } {
  if (!input.useTrueSolarTime) {
    return { correctedTime: solarDateTime };
  }

  const trueSolarOffsetMin = cityTrueSolarOffset(input.birthCity, solarDateTime);
  return {
    correctedTime: toTrueSolarTime(solarDateTime, input.birthCity),
    trueSolarOffsetMin,
  };
}

function countWuXing(pillars: FourPillars, hiddenStemMap: Record<typeof PILLAR_KEYS[number], string[]>): Record<WuXing, number> {
  const count = Object.fromEntries(FIVE_ELEMENTS.map((item) => [item, 0])) as Record<WuXing, number>;

  PILLAR_KEYS.forEach((key) => {
    const pillar = pillars[key];
    count[pillar.wuXingS] += 1;
    count[pillar.wuXingB] += 1;
    hiddenStemMap[key].forEach((stem) => {
      count[getWuXingFromStem(stem)] += 0.5;
    });
  });

  return count;
}

function buildTenGodSummary(tenGods: { year: TenGod; month: TenGod; hour: TenGod }): string {
  const counts: Record<string, number> = {};
  [tenGods.year, tenGods.month, tenGods.hour].forEach((item) => {
    counts[item] = (counts[item] || 0) + 1;
  });
  return Object.entries(counts).sort((left, right) => right[1] - left[1])[0]?.[0] || "比肩";
}

function formatPillarsTable(output: {
  pillars: FourPillars;
  pillarDetails: EngineOutput["pillarDetails"];
  lunar: LunarDate;
  naYinDetails: EngineOutput["naYinDetails"];
  kongWangDetails: EngineOutput["kongWangDetails"];
  correctedTime: Date;
  trueSolarOffsetMin?: number;
}): string {
  const { pillars, pillarDetails, lunar, naYinDetails, kongWangDetails, correctedTime, trueSolarOffsetMin } = output;
  return [
    "四柱命盘",
    `年柱 ${pillars.year.name}  藏干 ${pillarDetails.year.hiddenStems.join(" / ") || "--"}  十神 ${pillarDetails.year.stemTenGod}`,
    `月柱 ${pillars.month.name}  藏干 ${pillarDetails.month.hiddenStems.join(" / ") || "--"}  十神 ${pillarDetails.month.stemTenGod}`,
    `日柱 ${pillars.day.name}  藏干 ${pillarDetails.day.hiddenStems.join(" / ") || "--"}  十神 日主`,
    `时柱 ${pillars.hour.name}  藏干 ${pillarDetails.hour.hiddenStems.join(" / ") || "--"}  十神 ${pillarDetails.hour.stemTenGod}`,
    `农历 ${formatLunarDate(lunar)}`,
    `纳音 年${naYinDetails.year} / 月${naYinDetails.month} / 日${naYinDetails.day} / 时${naYinDetails.hour}`,
    `空亡 年${kongWangDetails.year} / 月${kongWangDetails.month} / 日${kongWangDetails.day} / 时${kongWangDetails.hour}`,
    `真太阳时 ${formatDateTime(correctedTime)}${trueSolarOffsetMin !== undefined ? ` (${trueSolarOffsetMin >= 0 ? "+" : ""}${trueSolarOffsetMin.toFixed(1)}分钟)` : ""}`,
  ].join("\n");
}

function buildDaYunList(eightChar: any, gender: "male" | "female" = "male"): DaYunItem[] {
  const yun = eightChar.getYun(gender === "male" ? 1 : 0, 1);
  return yun
    .getDaYun()
    .filter((item: any) => item.getGanZhi())
    .map((item: any) => {
      const ganZhi = item.getGanZhi();
      return {
        index: item.getIndex(),
        gan: ganZhi.charAt(0),
        zhi: ganZhi.charAt(1),
        ganZhi,
        startYear: item.getStartYear(),
        endYear: item.getEndYear(),
        startAge: item.getStartAge(),
        endAge: item.getEndAge(),
        liuNian: item.getLiuNian().map((liuNian: any) => {
          const value = liuNian.getGanZhi();
          return {
            year: liuNian.getYear(),
            age: liuNian.getAge(),
            gan: value.charAt(0),
            zhi: value.charAt(1),
            ganZhi: value,
          };
        }),
      };
    });
}

function getCurrentAgeFromBirth(correctedTime: Date) {
  const now = new Date();
  let age = now.getFullYear() - correctedTime.getFullYear();
  const monthDiff = now.getMonth() - correctedTime.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < correctedTime.getDate())) {
    age -= 1;
  }
  return Math.max(age, 0);
}

function getCurrentDaYunItem(daYun: DaYunItem[], age: number) {
  return daYun.find((item) => age >= item.startAge && age <= item.endAge) || daYun[0] || null;
}

function buildClassicalDecisionRules(args: {
  correctedTime: Date;
  analysis: ReturnType<typeof analyzePillars>;
  daYun: DaYunItem[];
  liuNianPillar: { gan: string; zhi: string; ganZhi: string; year: number };
}): ClassicalDecisionRules {
  const { correctedTime, analysis, daYun, liuNianPillar } = args;
  const age = getCurrentAgeFromBirth(correctedTime);
  const currentDaYun = getCurrentDaYunItem(daYun, age);
  const summaryText = `${analysis?.summary || ""} ${analysis?.gejuHint || ""}`.trim();
  const isWeak = /弱|偏弱/.test(summaryText);
  const isStrong = /旺|偏旺|身强|偏强/.test(summaryText);
  const hasStructureSupport = /格|成|清/.test(summaryText) || !!currentDaYun;
  const hasLuckSupport = !!currentDaYun && !!liuNianPillar?.ganZhi;

  let keyRule: ClassicalDecisionRules["keyRule"] = "尊凶卑吉，救疗无功";
  let supportPattern: ClassicalDecisionRules["supportPattern"] = "灾有五期";
  let warningPattern: ClassicalDecisionRules["warningPattern"] = "当忧不忧";
  let confidence: ClassicalDecisionRules["confidence"] = "medium";

  if (isWeak && !hasStructureSupport) {
    keyRule = "天元羸弱，宫吉不及为荣";
    supportPattern = "灾有五期";
    warningPattern = "闻喜不喜";
    confidence = "high";
  } else if (isWeak && hasLuckSupport) {
    keyRule = "中下兴隆，卦凶不能成咎";
    supportPattern = "禄有三会";
    warningPattern = "当忧不忧";
  } else if (isStrong && hasStructureSupport) {
    keyRule = "尊吉卑凶，逢灾自愈";
    supportPattern = "禄有三会";
    warningPattern = "当忧不忧";
  } else if (isStrong) {
    keyRule = "尊凶卑吉，救疗无功";
    supportPattern = "灾有五期";
    warningPattern = "闻喜不喜";
  }

  const daYunLabel = currentDaYun ? `${currentDaYun.ganZhi}大运` : "当前大运";
  const liuNianLabel = liuNianPillar?.ganZhi ? `${liuNianPillar.ganZhi}流年` : "当前流年";
  const focusWord = analysis?.gejuHint || analysis?.summary || "当前结构";

  const reasons = [
    `以月令和日主关系为先，看当前命盘的主轴是否站得住。`,
    `当前年龄约 ${age} 岁，所走阶段以 ${daYunLabel} 为主。`,
    `${liuNianLabel} 负责触发当年的外部节奏，决定事情是放大还是落地。`,
  ];

  const summaryMap: Record<ClassicalDecisionRules["keyRule"], string> = {
    "天元羸弱，宫吉不及为荣": `你的底盘现在更像“需要先稳住自己”，即使外部看上去有机会，也不适合贸然放大。${daYunLabel} 更强调补底和修边界，${liuNianLabel} 只是提醒，不是结果本身。`,
    "中下兴隆，卦凶不能成咎": `你的原局并非一路顺推，但当前 ${daYunLabel} 能把弱处托住，所以这年更适合借势修正，而不是被短期波动吓住。`,
    "尊凶卑吉，救疗无功": `眼前的问题不在表层顺不顺，而在核心结构有没有站稳。${daYunLabel} 还在逼你看清真正短板，${liuNianLabel} 只是把它催出来。`,
    "尊吉卑凶，逢灾自愈": `你的主结构是站得住的，所以即便今年有波动，也更像过程中的校正。${daYunLabel} 给的是主航线，${liuNianLabel} 更多是在提醒你别偏航。`,
  };

  const stageMap: Record<ClassicalDecisionRules["keyRule"], string> = {
    "天元羸弱，宫吉不及为荣": `阶段上先稳住根基，再谈扩张。${daYunLabel} 适合收口、补位、整理关系和资源，别被${liuNianLabel}表面的热闹带着走。`,
    "中下兴隆，卦凶不能成咎": `阶段上属于“先难后顺”。${daYunLabel} 在替你托底，${liuNianLabel} 更适合小步推进、边走边修，而不是一次压重注。`,
    "尊凶卑吉，救疗无功": `阶段上要把判断重心放回核心位置。${daYunLabel} 已经指出主要课题，${liuNianLabel} 会把拖延、犹豫或分心放大。`,
    "尊吉卑凶，逢灾自愈": `阶段上主线仍然向前。${daYunLabel} 给的是稳定推进的空间，${liuNianLabel} 带来的波动更多是校准节奏，不是推翻方向。`,
  };

  return {
    keyRule,
    supportPattern,
    warningPattern,
    summary: summaryMap[keyRule],
    stageSummary: stageMap[keyRule],
    reasons: [...reasons, `核心判断依据更接近“${focusWord}”。`],
    confidence,
  };
}

export function getDayMasterStrength(dayGan: string, wxCount: Record<string, number>) {
  const dayWx = getWuXingFromStem(dayGan);
  const helpWx = SHENG_KE[dayWx].beiSheng;
  const total = Number(wxCount?.[dayWx] || 0) + Number(wxCount?.[helpWx] || 0);

  if (total >= 4) return { strength: "旺", desc: "日主偏旺，宜泄不宜补" };
  if (total >= 3) return { strength: "中和", desc: "日主中和，五行较为均衡" };
  return { strength: "弱", desc: "日主偏弱，宜补不宜泄" };
}

export function getTianYiGuiRen(dayGan: string) {
  const table: Record<string, string[]> = {
    甲: ["丑", "未"],
    乙: ["子", "申"],
    丙: ["亥", "酉"],
    丁: ["亥", "酉"],
    戊: ["丑", "未"],
    己: ["子", "申"],
    庚: ["丑", "未"],
    辛: ["寅", "午"],
    壬: ["卯", "巳"],
    癸: ["卯", "巳"],
  };
  return table[dayGan] || [];
}

export function getWenChangGuiRen(dayGan: string) {
  const table: Record<string, string> = {
    甲: "巳",
    乙: "午",
    丙: "申",
    丁: "酉",
    戊: "申",
    己: "酉",
    庚: "亥",
    辛: "子",
    壬: "寅",
    癸: "卯",
  };
  return table[dayGan] || "";
}

export function getYiMa(dayZhi: string) {
  const table: Record<string, string> = {
    寅: "申",
    午: "申",
    戌: "申",
    申: "寅",
    子: "寅",
    辰: "寅",
    巳: "亥",
    酉: "亥",
    丑: "亥",
    亥: "巳",
    卯: "巳",
    未: "巳",
  };
  return table[dayZhi] || "";
}

/* export function getTaoHua(dayZhi: string) {
  const table: Record<string, string> = {
    鐢? "閰?,
    瀛? "閰?,
    杈? "閰?,
    瀵? "鍗?,
    鍗? "鍗?,
    鎴? "鍗?,
    浜? "瀛?,
    鍗? "瀛?,
    鏈? "瀛?,
    宸? "鍗?,
    閰? "鍗?,
    涓? "鍗?,
  };
  return table[dayZhi] || "";
}

export function getJiangXing(dayZhi: string) {
  const table: Record<string, string> = {
    鐢? "瀛?,
    瀛? "瀛?,
    杈? "瀛?,
    瀵? "鍗?,
    鍗? "鍗?,
    鎴? "鍗?,
    浜? "鍗?,
    鍗? "鍗?,
    鏈? "鍗?,
    宸? "閰?,
    閰? "閰?,
    涓? "閰?,
  };
  return table[dayZhi] || "";
}

export function getHuaGai(dayZhi: string) {
  const table: Record<string, string> = {
    鐢? "杈?,
    瀛? "杈?,
    杈? "杈?,
    瀵? "鏈?,
    鍗? "鏈?,
    鎴? "鏈?,
    浜? "鎴?,
    鍗? "鎴?,
    鏈? "鎴?,
    宸? "涓?,
    閰? "涓?,
    涓? "涓?,
  };
  return table[dayZhi] || "";
}

}
*/

export function getTaoHua(dayZhi: string) {
  const table: Record<string, string> = {
    申: "酉",
    子: "酉",
    辰: "酉",
    寅: "卯",
    午: "卯",
    戌: "卯",
    亥: "子",
    卯: "子",
    未: "子",
    巳: "午",
    酉: "午",
    丑: "午",
  };
  return table[dayZhi] || "";
}

export function getJiangXing(dayZhi: string) {
  const table: Record<string, string> = {
    申: "子",
    子: "子",
    辰: "子",
    寅: "卯",
    午: "卯",
    戌: "卯",
    亥: "午",
    卯: "午",
    未: "午",
    巳: "酉",
    酉: "酉",
    丑: "酉",
  };
  return table[dayZhi] || "";
}

export function getHuaGai(dayZhi: string) {
  const table: Record<string, string> = {
    申: "辰",
    子: "辰",
    辰: "辰",
    亥: "未",
    卯: "未",
    未: "未",
    寅: "戌",
    午: "戌",
    戌: "戌",
    巳: "丑",
    酉: "丑",
    丑: "丑",
  };
  return table[dayZhi] || "";
}

function buildShenShaDetails(pillars: FourPillars) {
  const pillarBranches = {
    year: pillars.year.branch,
    month: pillars.month.branch,
    day: pillars.day.branch,
    hour: pillars.hour.branch,
  } as const;
  const guiRen = getTianYiGuiRen(pillars.day.stem);
  const wenChang = getWenChangGuiRen(pillars.day.stem);
  const yiMa = getYiMa(pillars.day.branch);
  const taoHua = getTaoHua(pillars.day.branch);
  const jiangXing = getJiangXing(pillars.day.branch);
  const huaGai = getHuaGai(pillars.day.branch);

  return Object.fromEntries(
    Object.entries(pillarBranches).map(([key, branch]) => {
      const items = [
        guiRen.includes(branch) ? "澶╀箼璐典汉" : "",
        wenChang === branch ? "鏂囨槍" : "",
        yiMa === branch ? "椹块┈" : "",
        taoHua === branch ? "妗冭姳" : "",
        jiangXing === branch ? "灏嗘槦" : "",
        huaGai === branch ? "鍗庣洊" : "",
      ].filter(Boolean);
      return [key, items];
    })
  ) as EngineOutput["shenShaDetails"];
}

function buildShenShaDetailsClean(pillars: FourPillars) {
  const pillarBranches = {
    year: pillars.year.branch,
    month: pillars.month.branch,
    day: pillars.day.branch,
    hour: pillars.hour.branch,
  } as const;
  const guiRen = getTianYiGuiRen(pillars.day.stem);
  const wenChang = getWenChangGuiRen(pillars.day.stem);
  const yiMa = getYiMa(pillars.day.branch);
  const taoHua = getTaoHua(pillars.day.branch);
  const jiangXing = getJiangXing(pillars.day.branch);
  const huaGai = getHuaGai(pillars.day.branch);

  return Object.fromEntries(
    Object.entries(pillarBranches).map(([key, branch]) => {
      const items = [
        guiRen.includes(branch) ? "天乙贵人" : "",
        wenChang === branch ? "文昌" : "",
        yiMa === branch ? "驿马" : "",
        taoHua === branch ? "桃花" : "",
        jiangXing === branch ? "将星" : "",
        huaGai === branch ? "华盖" : "",
      ].filter(Boolean);
      return [key, items];
    })
  ) as EngineOutput["shenShaDetails"];
}

function buildAcademicShenShaDetails(
  pillars: FourPillars,
  options: {
    gender?: "male" | "female";
    dayNaYin?: string;
  } = {}
) {
  const STEM = {
    jia: "\u7532",
    yi: "\u4e59",
    bing: "\u4e19",
    ding: "\u4e01",
    wu: "\u620a",
    ji: "\u5df1",
    geng: "\u5e9a",
    xin: "\u8f9b",
    ren: "\u58ec",
    gui: "\u7678",
  } as const;
  const BRANCH = {
    zi: "\u5b50",
    chou: "\u4e11",
    yin: "\u5bc5",
    mao: "\u536f",
    chen: "\u8fb0",
    si: "\u5df3",
    wu: "\u5348",
    wei: "\u672a",
    shen: "\u7533",
    you: "\u9149",
    xu: "\u620c",
    hai: "\u4ea5",
  } as const;
  const SHEN_SHA = {
    tianDe: "\u5929\u5fb7",
    yueDe: "\u6708\u5fb7",
    tianYi: "\u5929\u4e59",
    taiJi: "\u592a\u6781",
    sanQi: "\u4e09\u5947",
    wenChang: "\u6587\u660c",
    guoYin: "\u56fd\u5370",
    fuXing: "\u798f\u661f",
    xueTang: "\u5b66\u5802",
    ciGuan: "\u8bcd\u9986",
    deXiu: "\u5fb7\u79c0",
    yiMa: "\u9a7f\u9a6c",
    taoHua: "\u6843\u82b1",
    xianChi: "\u54b8\u6c60",
    jiangXing: "\u5c06\u661f",
    huaGai: "\u534e\u76d6",
    hongLuan: "\u7ea2\u9e3e",
    tianXi: "\u5929\u559c",
    tianYiMed: "\u5929\u533b",
    luShen: "\u7984",
    gongLu: "\u62f1\u7984",
    jinYu: "\u91d1\u8206",
    jinShen: "\u91d1\u795e",
    tianShe: "\u5929\u8d66",
    tianChu: "\u5929\u53a8",
    guanFu: "\u5b98\u7b26",
    panAn: "\u6500\u978d",
    siJiGuan: "\u56db\u5b63\u5173",
    yanWangGuan: "\u960e\u738b\u5173",
    zhaiSha: "\u5b85\u715e",
    sangMen: "\u4e27\u95e8",
    diaoKe: "\u540a\u5ba2",
    piMa: "\u62ab\u9ebb",
    yangRen: "\u7f8a\u5203",
    jieSha: "\u52ab\u715e",
    zaiSha: "\u707e\u715e",
    gouSha: "\u52fe\u715e",
    jiaoSha: "\u7ede\u715e",
    wangShen: "\u4ea1\u795e",
    yuanChen: "\u5143\u8fb0",
    guChen: "\u5b64\u8fb0",
    guaSu: "\u5be1\u5bbf",
    guLuan: "\u5b64\u9e3e",
    tianLuo: "\u5929\u7f57",
    diWang: "\u5730\u7f51",
    kuiGang: "\u9b41\u7f61",
    shiEDaBai: "\u5341\u6076\u5927\u8d25",
    yinYangChaCuo: "\u9634\u9633\u5dee\u9519",
    siFei: "\u56db\u5e9f",
    liuXia: "\u6d41\u971e",
    baZhuan: "\u516b\u4e13",
  } as const;

  const pillarBranches = {
    year: pillars.year.branch,
    month: pillars.month.branch,
    day: pillars.day.branch,
    hour: pillars.hour.branch,
  } as const;

  const dayStem = pillars.day.stem;
  const dayBranch = pillars.day.branch;
  const yearBranch = pillars.year.branch;
  const yearStem = pillars.year.stem;
  const monthBranch = pillars.month.branch;
  const branchRefs = [yearBranch, dayBranch];
  const gender = options.gender || "male";
  const dayNaYin = options.dayNaYin || "";

  const tianYiMap: Record<string, string[]> = {
    [STEM.jia]: [BRANCH.chou, BRANCH.wei],
    [STEM.wu]: [BRANCH.chou, BRANCH.wei],
    [STEM.yi]: [BRANCH.zi, BRANCH.shen],
    [STEM.ji]: [BRANCH.zi, BRANCH.shen],
    [STEM.bing]: [BRANCH.hai, BRANCH.you],
    [STEM.ding]: [BRANCH.hai, BRANCH.you],
    [STEM.geng]: [BRANCH.yin, BRANCH.wu],
    [STEM.xin]: [BRANCH.yin, BRANCH.wu],
    [STEM.ren]: [BRANCH.mao, BRANCH.si],
    [STEM.gui]: [BRANCH.mao, BRANCH.si],
  };
  const tianDeMap: Record<string, string> = {
    [BRANCH.yin]: STEM.ding,
    [BRANCH.mao]: BRANCH.shen,
    [BRANCH.chen]: STEM.ren,
    [BRANCH.si]: STEM.xin,
    [BRANCH.wu]: BRANCH.hai,
    [BRANCH.wei]: STEM.jia,
    [BRANCH.shen]: STEM.gui,
    [BRANCH.you]: BRANCH.yin,
    [BRANCH.xu]: STEM.bing,
    [BRANCH.hai]: STEM.yi,
    [BRANCH.zi]: BRANCH.si,
    [BRANCH.chou]: STEM.geng,
  };
  const yueDeMap: Record<string, string> = {
    [BRANCH.yin]: STEM.bing,
    [BRANCH.wu]: STEM.bing,
    [BRANCH.xu]: STEM.bing,
    [BRANCH.shen]: STEM.ren,
    [BRANCH.zi]: STEM.ren,
    [BRANCH.chen]: STEM.ren,
    [BRANCH.hai]: STEM.jia,
    [BRANCH.mao]: STEM.jia,
    [BRANCH.wei]: STEM.jia,
    [BRANCH.si]: STEM.geng,
    [BRANCH.you]: STEM.geng,
    [BRANCH.chou]: STEM.geng,
  };
  const tianYiMedMap: Record<string, string> = {
    [BRANCH.yin]: BRANCH.chou,
    [BRANCH.mao]: BRANCH.yin,
    [BRANCH.chen]: BRANCH.mao,
    [BRANCH.si]: BRANCH.chen,
    [BRANCH.wu]: BRANCH.si,
    [BRANCH.wei]: BRANCH.wu,
    [BRANCH.shen]: BRANCH.wei,
    [BRANCH.you]: BRANCH.shen,
    [BRANCH.xu]: BRANCH.you,
    [BRANCH.hai]: BRANCH.xu,
    [BRANCH.zi]: BRANCH.hai,
    [BRANCH.chou]: BRANCH.zi,
  };
  const tianChuMap: Record<string, string> = {
    [STEM.jia]: BRANCH.si,
    [STEM.yi]: BRANCH.wu,
    [STEM.bing]: BRANCH.si,
    [STEM.ding]: BRANCH.wu,
    [STEM.wu]: BRANCH.shen,
    [STEM.ji]: BRANCH.you,
    [STEM.geng]: BRANCH.hai,
    [STEM.xin]: BRANCH.zi,
    [STEM.ren]: BRANCH.yin,
    [STEM.gui]: BRANCH.mao,
  };
  const wenChangMap: Record<string, string> = {
    [STEM.jia]: BRANCH.si,
    [STEM.yi]: BRANCH.wu,
    [STEM.bing]: BRANCH.shen,
    [STEM.ding]: BRANCH.you,
    [STEM.wu]: BRANCH.shen,
    [STEM.ji]: BRANCH.you,
    [STEM.geng]: BRANCH.hai,
    [STEM.xin]: BRANCH.zi,
    [STEM.ren]: BRANCH.yin,
    [STEM.gui]: BRANCH.mao,
  };
  const fuXingMap: Record<string, string> = {
    [STEM.jia]: BRANCH.yin,
    [STEM.yi]: BRANCH.chou,
    [STEM.bing]: BRANCH.zi,
    [STEM.ding]: BRANCH.hai,
    [STEM.wu]: BRANCH.shen,
    [STEM.ji]: BRANCH.wei,
    [STEM.geng]: BRANCH.wu,
    [STEM.xin]: BRANCH.si,
    [STEM.ren]: BRANCH.chen,
    [STEM.gui]: BRANCH.mao,
  };
  const ciGuanMap: Record<string, string> = {
    [STEM.jia]: "\u5e9a\u5bc5",
    [STEM.yi]: "\u8f9b\u536f",
    [STEM.bing]: "\u4e59\u5df3",
    [STEM.ding]: "\u620a\u5348",
    [STEM.wu]: "\u4e01\u5df3",
    [STEM.ji]: "\u5e9a\u5348",
    [STEM.geng]: "\u58ec\u7533",
    [STEM.xin]: "\u7678\u9149",
    [STEM.ren]: "\u7678\u4ea5",
    [STEM.gui]: "\u58ec\u620c",
  };
  const taiJiMap: Record<string, string[]> = {
    [STEM.jia]: [BRANCH.zi, BRANCH.wu],
    [STEM.yi]: [BRANCH.zi, BRANCH.wu],
    [STEM.bing]: [BRANCH.mao, BRANCH.you],
    [STEM.ding]: [BRANCH.mao, BRANCH.you],
    [STEM.wu]: [BRANCH.chen, BRANCH.xu, BRANCH.chou, BRANCH.wei],
    [STEM.ji]: [BRANCH.chen, BRANCH.xu, BRANCH.chou, BRANCH.wei],
    [STEM.geng]: [BRANCH.yin, BRANCH.hai],
    [STEM.xin]: [BRANCH.yin, BRANCH.hai],
    [STEM.ren]: [BRANCH.si, BRANCH.shen],
    [STEM.gui]: [BRANCH.si, BRANCH.shen],
  };
  const guoYinMap: Record<string, string> = {
    [STEM.jia]: BRANCH.xu,
    [STEM.yi]: BRANCH.hai,
    [STEM.bing]: BRANCH.chou,
    [STEM.ding]: BRANCH.yin,
    [STEM.wu]: BRANCH.chou,
    [STEM.ji]: BRANCH.yin,
    [STEM.geng]: BRANCH.chen,
    [STEM.xin]: BRANCH.si,
    [STEM.ren]: BRANCH.wei,
    [STEM.gui]: BRANCH.shen,
  };
  const luShenMap: Record<string, string> = {
    [STEM.jia]: BRANCH.yin,
    [STEM.yi]: BRANCH.mao,
    [STEM.bing]: BRANCH.si,
    [STEM.ding]: BRANCH.wu,
    [STEM.wu]: BRANCH.si,
    [STEM.ji]: BRANCH.wu,
    [STEM.geng]: BRANCH.shen,
    [STEM.xin]: BRANCH.you,
    [STEM.ren]: BRANCH.hai,
    [STEM.gui]: BRANCH.zi,
  };
  const yiMaMap: Record<string, string> = {
    [BRANCH.shen]: BRANCH.yin,
    [BRANCH.zi]: BRANCH.yin,
    [BRANCH.chen]: BRANCH.yin,
    [BRANCH.yin]: BRANCH.shen,
    [BRANCH.wu]: BRANCH.shen,
    [BRANCH.xu]: BRANCH.shen,
    [BRANCH.hai]: BRANCH.si,
    [BRANCH.mao]: BRANCH.si,
    [BRANCH.wei]: BRANCH.si,
    [BRANCH.si]: BRANCH.hai,
    [BRANCH.you]: BRANCH.hai,
    [BRANCH.chou]: BRANCH.hai,
  };
  const taoHuaMap: Record<string, string> = {
    [BRANCH.shen]: BRANCH.you,
    [BRANCH.zi]: BRANCH.you,
    [BRANCH.chen]: BRANCH.you,
    [BRANCH.yin]: BRANCH.mao,
    [BRANCH.wu]: BRANCH.mao,
    [BRANCH.xu]: BRANCH.mao,
    [BRANCH.hai]: BRANCH.zi,
    [BRANCH.mao]: BRANCH.zi,
    [BRANCH.wei]: BRANCH.zi,
    [BRANCH.si]: BRANCH.wu,
    [BRANCH.you]: BRANCH.wu,
    [BRANCH.chou]: BRANCH.wu,
  };
  const jiangXingMap: Record<string, string> = {
    [BRANCH.shen]: BRANCH.zi,
    [BRANCH.zi]: BRANCH.zi,
    [BRANCH.chen]: BRANCH.zi,
    [BRANCH.hai]: BRANCH.mao,
    [BRANCH.mao]: BRANCH.mao,
    [BRANCH.wei]: BRANCH.mao,
    [BRANCH.yin]: BRANCH.wu,
    [BRANCH.wu]: BRANCH.wu,
    [BRANCH.xu]: BRANCH.wu,
    [BRANCH.si]: BRANCH.you,
    [BRANCH.you]: BRANCH.you,
    [BRANCH.chou]: BRANCH.you,
  };
  const huaGaiMap: Record<string, string> = {
    [BRANCH.shen]: BRANCH.chen,
    [BRANCH.zi]: BRANCH.chen,
    [BRANCH.chen]: BRANCH.chen,
    [BRANCH.hai]: BRANCH.wei,
    [BRANCH.mao]: BRANCH.wei,
    [BRANCH.wei]: BRANCH.wei,
    [BRANCH.yin]: BRANCH.xu,
    [BRANCH.wu]: BRANCH.xu,
    [BRANCH.xu]: BRANCH.xu,
    [BRANCH.si]: BRANCH.chou,
    [BRANCH.you]: BRANCH.chou,
    [BRANCH.chou]: BRANCH.chou,
  };
  const hongLuanMap: Record<string, string> = {
    [BRANCH.zi]: BRANCH.mao,
    [BRANCH.chou]: BRANCH.yin,
    [BRANCH.yin]: BRANCH.chou,
    [BRANCH.mao]: BRANCH.zi,
    [BRANCH.chen]: BRANCH.hai,
    [BRANCH.si]: BRANCH.xu,
    [BRANCH.wu]: BRANCH.you,
    [BRANCH.wei]: BRANCH.shen,
    [BRANCH.shen]: BRANCH.wei,
    [BRANCH.you]: BRANCH.wu,
    [BRANCH.xu]: BRANCH.si,
    [BRANCH.hai]: BRANCH.chen,
  };
  const tianXiMap: Record<string, string> = {
    [BRANCH.zi]: BRANCH.you,
    [BRANCH.chou]: BRANCH.shen,
    [BRANCH.yin]: BRANCH.wei,
    [BRANCH.mao]: BRANCH.wu,
    [BRANCH.chen]: BRANCH.si,
    [BRANCH.si]: BRANCH.chen,
    [BRANCH.wu]: BRANCH.mao,
    [BRANCH.wei]: BRANCH.yin,
    [BRANCH.shen]: BRANCH.chou,
    [BRANCH.you]: BRANCH.zi,
    [BRANCH.xu]: BRANCH.hai,
    [BRANCH.hai]: BRANCH.xu,
  };
  const jinYuMap: Record<string, string> = {
    [STEM.jia]: BRANCH.chen,
    [STEM.yi]: BRANCH.si,
    [STEM.bing]: BRANCH.wei,
    [STEM.ding]: BRANCH.shen,
    [STEM.wu]: BRANCH.wei,
    [STEM.ji]: BRANCH.shen,
    [STEM.geng]: BRANCH.xu,
    [STEM.xin]: BRANCH.hai,
    [STEM.ren]: BRANCH.chou,
    [STEM.gui]: BRANCH.yin,
  };
  const yangRenMap: Record<string, string> = {
    [STEM.jia]: BRANCH.mao,
    [STEM.yi]: BRANCH.chen,
    [STEM.bing]: BRANCH.wu,
    [STEM.ding]: BRANCH.wei,
    [STEM.wu]: BRANCH.wu,
    [STEM.ji]: BRANCH.wei,
    [STEM.geng]: BRANCH.you,
    [STEM.xin]: BRANCH.xu,
    [STEM.ren]: BRANCH.zi,
    [STEM.gui]: BRANCH.chou,
  };
  const jieShaMap: Record<string, string> = {
    [BRANCH.shen]: BRANCH.si,
    [BRANCH.zi]: BRANCH.si,
    [BRANCH.chen]: BRANCH.si,
    [BRANCH.yin]: BRANCH.hai,
    [BRANCH.wu]: BRANCH.hai,
    [BRANCH.xu]: BRANCH.hai,
    [BRANCH.hai]: BRANCH.shen,
    [BRANCH.mao]: BRANCH.shen,
    [BRANCH.wei]: BRANCH.shen,
    [BRANCH.si]: BRANCH.yin,
    [BRANCH.you]: BRANCH.yin,
    [BRANCH.chou]: BRANCH.yin,
  };
  const zaiShaMap: Record<string, string> = {
    [BRANCH.shen]: BRANCH.wu,
    [BRANCH.zi]: BRANCH.wu,
    [BRANCH.chen]: BRANCH.wu,
    [BRANCH.yin]: BRANCH.zi,
    [BRANCH.wu]: BRANCH.zi,
    [BRANCH.xu]: BRANCH.zi,
    [BRANCH.hai]: BRANCH.you,
    [BRANCH.mao]: BRANCH.you,
    [BRANCH.wei]: BRANCH.you,
    [BRANCH.si]: BRANCH.mao,
    [BRANCH.you]: BRANCH.mao,
    [BRANCH.chou]: BRANCH.mao,
  };
  const wangShenMap: Record<string, string> = {
    [BRANCH.shen]: BRANCH.hai,
    [BRANCH.zi]: BRANCH.hai,
    [BRANCH.chen]: BRANCH.hai,
    [BRANCH.yin]: BRANCH.si,
    [BRANCH.wu]: BRANCH.si,
    [BRANCH.xu]: BRANCH.si,
    [BRANCH.hai]: BRANCH.yin,
    [BRANCH.mao]: BRANCH.yin,
    [BRANCH.wei]: BRANCH.yin,
    [BRANCH.si]: BRANCH.shen,
    [BRANCH.you]: BRANCH.shen,
    [BRANCH.chou]: BRANCH.shen,
  };
  const guChenMap: Record<string, string> = {
    [BRANCH.hai]: BRANCH.yin,
    [BRANCH.zi]: BRANCH.yin,
    [BRANCH.chou]: BRANCH.yin,
    [BRANCH.yin]: BRANCH.si,
    [BRANCH.mao]: BRANCH.si,
    [BRANCH.chen]: BRANCH.si,
    [BRANCH.si]: BRANCH.shen,
    [BRANCH.wu]: BRANCH.shen,
    [BRANCH.wei]: BRANCH.shen,
    [BRANCH.shen]: BRANCH.hai,
    [BRANCH.you]: BRANCH.hai,
    [BRANCH.xu]: BRANCH.hai,
  };
  const guaSuMap: Record<string, string> = {
    [BRANCH.hai]: BRANCH.xu,
    [BRANCH.zi]: BRANCH.xu,
    [BRANCH.chou]: BRANCH.xu,
    [BRANCH.yin]: BRANCH.chou,
    [BRANCH.mao]: BRANCH.chou,
    [BRANCH.chen]: BRANCH.chou,
    [BRANCH.si]: BRANCH.chen,
    [BRANCH.wu]: BRANCH.chen,
    [BRANCH.wei]: BRANCH.chen,
    [BRANCH.shen]: BRANCH.wei,
    [BRANCH.you]: BRANCH.wei,
    [BRANCH.xu]: BRANCH.wei,
  };
  const kuiGangDays = new Set(["\u5e9a\u8fb0", "\u5e9a\u620c", "\u58ec\u8fb0", "\u620a\u620c"]);
  const shiEDaBaiDays = new Set(["\u7532\u8fb0", "\u4e59\u5df3", "\u4e19\u7533", "\u4e01\u4ea5", "\u620a\u620c", "\u5df1\u4e11", "\u5e9a\u8fb0", "\u8f9b\u5df3", "\u58ec\u7533", "\u7678\u4ea5"]);
  const yinYangChaCuoDays = new Set(["\u4e19\u5b50", "\u4e01\u4e11", "\u620a\u5bc5", "\u8f9b\u536f", "\u58ec\u8fb0", "\u7678\u5df3", "\u4e19\u5348", "\u4e01\u672a", "\u620a\u7533", "\u8f9b\u9149", "\u58ec\u620c", "\u7678\u4ea5"]);
  const jinShenPillars = new Set(["\u4e59\u4e11", "\u5df1\u5df3", "\u7678\u9149"]);
  const tianSheDays: Record<string, string> = {
    "\u6625": "\u620a\u5bc5",
    "\u590f": "\u7532\u5348",
    "\u79cb": "\u620a\u7533",
    "\u51ac": "\u7532\u5b50",
  };
  const dayGanZhi = `${pillars.day.stem}${pillars.day.branch}`;
  const pillarGanZhiMap = {
    year: `${pillars.year.stem}${pillars.year.branch}`,
    month: `${pillars.month.stem}${pillars.month.branch}`,
    day: `${pillars.day.stem}${pillars.day.branch}`,
    hour: `${pillars.hour.stem}${pillars.hour.branch}`,
  } as const;
  const chartStems = Object.values(pillarGanZhiMap).map((item) => item.charAt(0));
  const chartBranches = Object.values(pillarGanZhiMap).map((item) => item.charAt(1));
  const monthSeason =
    [BRANCH.yin, BRANCH.mao, BRANCH.chen].includes(monthBranch) ? "\u6625"
      : [BRANCH.si, BRANCH.wu, BRANCH.wei].includes(monthBranch) ? "\u590f"
      : [BRANCH.shen, BRANCH.you, BRANCH.xu].includes(monthBranch) ? "\u79cb"
      : "\u51ac";
  const getPrevBranch = (branch: string, steps: number) => {
    const idx = DI_ZHI.indexOf(branch as never);
    if (idx < 0) return "";
    return DI_ZHI[(idx - steps + 12 * 10) % 12];
  };
  const getNextBranch = (branch: string, steps: number) => {
    const idx = DI_ZHI.indexOf(branch as never);
    if (idx < 0) return "";
    return DI_ZHI[(idx + steps) % 12];
  };
  const guanFuBranch = getPrevBranch(yearBranch, 5);
  const sangMenBranch = getPrevBranch(yearBranch, 2);
  const diaoKeBranch = getPrevBranch(yearBranch, 10);
  const piMaBranch = getPrevBranch(yearBranch, 3);
  const monthNumber = Number(monthBranch === BRANCH.yin ? 1
    : monthBranch === BRANCH.mao ? 2
      : monthBranch === BRANCH.chen ? 3
        : monthBranch === BRANCH.si ? 4
          : monthBranch === BRANCH.wu ? 5
            : monthBranch === BRANCH.wei ? 6
              : monthBranch === BRANCH.shen ? 7
                : monthBranch === BRANCH.you ? 8
                  : monthBranch === BRANCH.xu ? 9
                    : monthBranch === BRANCH.hai ? 10
                      : monthBranch === BRANCH.zi ? 11
                        : 12);
  const yearStemYang = [STEM.jia, STEM.bing, STEM.wu, STEM.geng, STEM.ren].includes(yearStem);
  const useForwardGenderRule = (gender === "male" && yearStemYang) || (gender === "female" && !yearStemYang);
  const yuanChenForward: Record<string, string> = {
    [BRANCH.zi]: BRANCH.wei,
    [BRANCH.chou]: BRANCH.shen,
    [BRANCH.yin]: BRANCH.you,
    [BRANCH.mao]: BRANCH.xu,
    [BRANCH.chen]: BRANCH.hai,
    [BRANCH.si]: BRANCH.zi,
    [BRANCH.wu]: BRANCH.chou,
    [BRANCH.wei]: BRANCH.yin,
    [BRANCH.shen]: BRANCH.mao,
    [BRANCH.you]: BRANCH.chen,
    [BRANCH.xu]: BRANCH.si,
    [BRANCH.hai]: BRANCH.wu,
  };
  const yuanChenBackward: Record<string, string> = {
    [BRANCH.zi]: BRANCH.si,
    [BRANCH.chou]: BRANCH.wu,
    [BRANCH.yin]: BRANCH.wei,
    [BRANCH.mao]: BRANCH.shen,
    [BRANCH.chen]: BRANCH.you,
    [BRANCH.si]: BRANCH.xu,
    [BRANCH.wu]: BRANCH.hai,
    [BRANCH.wei]: BRANCH.zi,
    [BRANCH.shen]: BRANCH.chou,
    [BRANCH.you]: BRANCH.yin,
    [BRANCH.xu]: BRANCH.mao,
    [BRANCH.hai]: BRANCH.chen,
  };
  const gouShaMapForward: Record<string, string> = {
    [BRANCH.zi]: BRANCH.you,
    [BRANCH.chou]: BRANCH.xu,
    [BRANCH.yin]: BRANCH.hai,
    [BRANCH.mao]: BRANCH.zi,
    [BRANCH.chen]: BRANCH.chou,
    [BRANCH.si]: BRANCH.yin,
    [BRANCH.wu]: BRANCH.mao,
    [BRANCH.wei]: BRANCH.chen,
    [BRANCH.shen]: BRANCH.si,
    [BRANCH.you]: BRANCH.wu,
    [BRANCH.xu]: BRANCH.wei,
    [BRANCH.hai]: BRANCH.shen,
  };
  const jiaoShaMapForward: Record<string, string> = {
    [BRANCH.zi]: BRANCH.mao,
    [BRANCH.chou]: BRANCH.chen,
    [BRANCH.yin]: BRANCH.si,
    [BRANCH.mao]: BRANCH.wu,
    [BRANCH.chen]: BRANCH.wei,
    [BRANCH.si]: BRANCH.shen,
    [BRANCH.wu]: BRANCH.you,
    [BRANCH.wei]: BRANCH.xu,
    [BRANCH.shen]: BRANCH.hai,
    [BRANCH.you]: BRANCH.zi,
    [BRANCH.xu]: BRANCH.chou,
    [BRANCH.hai]: BRANCH.yin,
  };
  const xueTangByNaYin: Record<string, string> = {
    "\u91d1": "\u8f9b\u5df3",
    "\u6728": "\u5df1\u4ea5",
    "\u6c34": "\u7532\u7533",
    "\u571f": "\u620a\u7533",
    "\u706b": "\u4e19\u5bc5",
  };
  const deXiuByMonthGroup = [
    { branches: [BRANCH.yin, BRANCH.wu, BRANCH.xu], de: [STEM.bing, STEM.ding], xiu: [STEM.wu, STEM.gui] },
    { branches: [BRANCH.shen, BRANCH.zi, BRANCH.chen], de: [STEM.ren, STEM.gui, STEM.wu, STEM.ji], xiu: [STEM.bing, STEM.xin, STEM.jia, STEM.ji] },
    { branches: [BRANCH.si, BRANCH.you, BRANCH.chou], de: [STEM.geng, STEM.xin], xiu: [STEM.yi, STEM.geng] },
    { branches: [BRANCH.hai, BRANCH.mao, BRANCH.wei], de: [STEM.jia, STEM.yi], xiu: [STEM.ding, STEM.ren] },
  ];
  const luBranchByStem: Record<string, string> = {
    [STEM.jia]: BRANCH.yin,
    [STEM.yi]: BRANCH.mao,
    [STEM.bing]: BRANCH.si,
    [STEM.ding]: BRANCH.wu,
    [STEM.wu]: BRANCH.si,
    [STEM.ji]: BRANCH.wu,
    [STEM.geng]: BRANCH.shen,
    [STEM.xin]: BRANCH.you,
    [STEM.ren]: BRANCH.hai,
    [STEM.gui]: BRANCH.zi,
  };
  const gongLuPairs: Record<string, string[]> = {
    [BRANCH.yin]: [BRANCH.chou, BRANCH.mao],
    [BRANCH.mao]: [BRANCH.yin, BRANCH.chen],
    [BRANCH.si]: [BRANCH.chen, BRANCH.wu],
    [BRANCH.wu]: [BRANCH.si, BRANCH.wei],
    [BRANCH.shen]: [BRANCH.wei, BRANCH.you],
    [BRANCH.you]: [BRANCH.shen, BRANCH.xu],
    [BRANCH.hai]: [BRANCH.xu, BRANCH.zi],
    [BRANCH.zi]: [BRANCH.hai, BRANCH.chou],
  };
  const guLuanDays = new Set(["\u4e59\u5df3", "\u4e01\u5df3", "\u8f9b\u4ea5", "\u620a\u7533", "\u7532\u5bc5", "\u620a\u5348", "\u58ec\u5b50", "\u4e19\u5348"]);
  const siFeiDaysBySeason: Record<string, string[]> = {
    "\u6625": ["\u5e9a\u7533", "\u8f9b\u9149"],
    "\u590f": ["\u58ec\u5b50", "\u7678\u4ea5"],
    "\u79cb": ["\u7532\u5bc5", "\u4e59\u536f"],
    "\u51ac": ["\u4e19\u5348", "\u4e01\u5df3"],
  };
  const liuXiaMap: Record<string, string> = {
    [STEM.jia]: BRANCH.you,
    [STEM.yi]: BRANCH.xu,
    [STEM.bing]: BRANCH.wei,
    [STEM.ding]: BRANCH.shen,
    [STEM.wu]: BRANCH.si,
    [STEM.ji]: BRANCH.wu,
    [STEM.geng]: BRANCH.chen,
    [STEM.xin]: BRANCH.mao,
    [STEM.ren]: BRANCH.hai,
    [STEM.gui]: BRANCH.yin,
  };
  const baZhuanDays = new Set([
    "\u7532\u5bc5",
    "\u4e59\u536f",
    "\u4e01\u672a",
    "\u620a\u620c",
    "\u5df1\u672a",
    "\u5e9a\u7533",
    "\u8f9b\u9149",
    "\u7678\u4e11",
  ]);

  const uniquePush = (bucket: string[], value: string) => {
    if (value && !bucket.includes(value)) bucket.push(value);
  };

  return Object.fromEntries(
    Object.entries(pillarBranches).map(([key, branch]) => {
      const items: string[] = [];
      const pillarStem =
        key === "year" ? pillars.year.stem
          : key === "month" ? pillars.month.stem
          : key === "day" ? pillars.day.stem
          : pillars.hour.stem;
      const pillarGanZhi = pillarGanZhiMap[key as keyof typeof pillarGanZhiMap];

      if (tianDeMap[monthBranch] === branch || tianDeMap[monthBranch] === pillarStem) uniquePush(items, SHEN_SHA.tianDe);
      if (yueDeMap[monthBranch] === pillarStem) uniquePush(items, SHEN_SHA.yueDe);
      if ((tianYiMap[dayStem] || []).includes(branch)) uniquePush(items, SHEN_SHA.tianYi);
      if ((tianYiMap[yearStem] || []).includes(branch)) uniquePush(items, SHEN_SHA.tianYi);
      if ((taiJiMap[dayStem] || []).includes(branch)) uniquePush(items, SHEN_SHA.taiJi);
      if (monthBranch && tianYiMedMap[monthBranch] === branch) uniquePush(items, SHEN_SHA.tianYiMed);
      if (tianChuMap[dayStem] === branch || tianChuMap[yearStem] === branch) uniquePush(items, SHEN_SHA.tianChu);
      if (wenChangMap[dayStem] === branch) uniquePush(items, SHEN_SHA.wenChang);
      if (guoYinMap[dayStem] === branch || guoYinMap[yearStem] === branch) uniquePush(items, SHEN_SHA.guoYin);
      if (fuXingMap[dayStem] === branch) uniquePush(items, SHEN_SHA.fuXing);
      if (luShenMap[dayStem] === branch) uniquePush(items, SHEN_SHA.luShen);
      if (jinYuMap[dayStem] === branch) uniquePush(items, SHEN_SHA.jinYu);
      if (yangRenMap[dayStem] === branch) uniquePush(items, SHEN_SHA.yangRen);
      if (ciGuanMap[dayStem] === pillarGanZhi) uniquePush(items, SHEN_SHA.ciGuan);
      if (xueTangByNaYin[dayNaYin.slice(-1)] === pillarGanZhi) uniquePush(items, SHEN_SHA.xueTang);
      if (hongLuanMap[yearBranch] === branch) uniquePush(items, SHEN_SHA.hongLuan);
      if (tianXiMap[yearBranch] === branch) uniquePush(items, SHEN_SHA.tianXi);
      if (useForwardGenderRule ? gouShaMapForward[yearBranch] === branch : jiaoShaMapForward[yearBranch] === branch) uniquePush(items, SHEN_SHA.gouSha);
      if (useForwardGenderRule ? jiaoShaMapForward[yearBranch] === branch : gouShaMapForward[yearBranch] === branch) uniquePush(items, SHEN_SHA.jiaoSha);
      if ((useForwardGenderRule ? yuanChenForward[yearBranch] : yuanChenBackward[yearBranch]) === branch) uniquePush(items, SHEN_SHA.yuanChen);

      branchRefs.forEach((ref) => {
        if (yiMaMap[ref] === branch) uniquePush(items, SHEN_SHA.yiMa);
        if (getNextBranch(yiMaMap[ref], 1) === branch) uniquePush(items, SHEN_SHA.panAn);
        if (taoHuaMap[ref] === branch) uniquePush(items, SHEN_SHA.taoHua);
        if (taoHuaMap[ref] === branch) uniquePush(items, SHEN_SHA.xianChi);
        if (jiangXingMap[ref] === branch) uniquePush(items, SHEN_SHA.jiangXing);
        if (huaGaiMap[ref] === branch) uniquePush(items, SHEN_SHA.huaGai);
        if (jieShaMap[ref] === branch) uniquePush(items, SHEN_SHA.jieSha);
        if (zaiShaMap[ref] === branch) uniquePush(items, SHEN_SHA.zaiSha);
        if (wangShenMap[ref] === branch) uniquePush(items, SHEN_SHA.wangShen);
      });
      if (guChenMap[yearBranch] === branch) uniquePush(items, SHEN_SHA.guChen);
      if (guaSuMap[yearBranch] === branch) uniquePush(items, SHEN_SHA.guaSu);
      if ((branch === BRANCH.xu || branch === BRANCH.hai) && [BRANCH.chen, BRANCH.si, BRANCH.xu, BRANCH.hai].includes(dayBranch)) uniquePush(items, SHEN_SHA.tianLuo);
      if ((branch === BRANCH.chen || branch === BRANCH.si) && [BRANCH.chen, BRANCH.si, BRANCH.xu, BRANCH.hai].includes(dayBranch)) uniquePush(items, SHEN_SHA.diWang);
      if ((key === "day" || key === "hour") && branch === guanFuBranch) uniquePush(items, SHEN_SHA.guanFu);
      if (branch === sangMenBranch) uniquePush(items, SHEN_SHA.sangMen);
      if (branch === diaoKeBranch) uniquePush(items, SHEN_SHA.diaoKe);
      if (branch === piMaBranch) uniquePush(items, SHEN_SHA.piMa);
      if (key === "day" && kuiGangDays.has(dayGanZhi)) uniquePush(items, SHEN_SHA.kuiGang);
      if (key === "day" && shiEDaBaiDays.has(dayGanZhi)) uniquePush(items, SHEN_SHA.shiEDaBai);
      if (key === "day" && yinYangChaCuoDays.has(dayGanZhi)) uniquePush(items, SHEN_SHA.yinYangChaCuo);
      if (jinShenPillars.has(`${pillarStem}${branch}`)) uniquePush(items, SHEN_SHA.jinShen);
      if (key === "day" && tianSheDays[monthSeason] === dayGanZhi) uniquePush(items, SHEN_SHA.tianShe);
      if (key === "day" && guLuanDays.has(dayGanZhi)) uniquePush(items, SHEN_SHA.guLuan);
      if (key === "day" && (siFeiDaysBySeason[monthSeason] || []).includes(dayGanZhi)) uniquePush(items, SHEN_SHA.siFei);
      if (liuXiaMap[dayStem] === branch) uniquePush(items, SHEN_SHA.liuXia);
      if (key === "day" && baZhuanDays.has(dayGanZhi)) uniquePush(items, SHEN_SHA.baZhuan);
      if (
        key === "hour"
        && (
          ([1, 2, 3].includes(monthNumber) && [BRANCH.chou, BRANCH.wei].includes(branch))
          || ([4, 5, 6].includes(monthNumber) && [BRANCH.chen, BRANCH.xu].includes(branch))
          || ([7, 8, 9].includes(monthNumber) && [BRANCH.zi, BRANCH.wu].includes(branch))
          || ([10, 11, 12].includes(monthNumber) && [BRANCH.yin, BRANCH.mao].includes(branch))
        )
      ) {
        uniquePush(items, SHEN_SHA.yanWangGuan);
      }
      if (
        key === "hour"
        && (
          ([1, 2, 3].includes(monthNumber) && [BRANCH.chou, BRANCH.si].includes(branch))
          || ([4, 5, 6].includes(monthNumber) && [BRANCH.chen, BRANCH.shen].includes(branch))
          || ([7, 8, 9].includes(monthNumber) && [BRANCH.wei, BRANCH.xu].includes(branch))
          || ([10, 11, 12].includes(monthNumber) && [BRANCH.xu, BRANCH.yin].includes(branch))
        )
      ) {
        uniquePush(items, SHEN_SHA.siJiGuan);
      }
      if (key === "day" && jieShaMap[yearBranch] === branch) uniquePush(items, SHEN_SHA.zhaiSha);

      if (
        [yearStem, pillars.month.stem, pillars.day.stem, pillars.hour.stem].includes("\u4e59")
        && [yearStem, pillars.month.stem, pillars.day.stem, pillars.hour.stem].includes("\u4e19")
        && [yearStem, pillars.month.stem, pillars.day.stem, pillars.hour.stem].includes("\u4e01")
        && ["\u4e59", "\u4e19", "\u4e01"].includes(pillarStem)
      ) uniquePush(items, SHEN_SHA.sanQi);
      if (
        [yearStem, pillars.month.stem, pillars.day.stem, pillars.hour.stem].includes("\u7532")
        && [yearStem, pillars.month.stem, pillars.day.stem, pillars.hour.stem].includes("\u620a")
        && [yearStem, pillars.month.stem, pillars.day.stem, pillars.hour.stem].includes("\u5e9a")
        && ["\u7532", "\u620a", "\u5e9a"].includes(pillarStem)
      ) uniquePush(items, SHEN_SHA.sanQi);
      if (
        [yearStem, pillars.month.stem, pillars.day.stem, pillars.hour.stem].includes("\u8f9b")
        && [yearStem, pillars.month.stem, pillars.day.stem, pillars.hour.stem].includes("\u58ec")
        && [yearStem, pillars.month.stem, pillars.day.stem, pillars.hour.stem].includes("\u7678")
        && ["\u8f9b", "\u58ec", "\u7678"].includes(pillarStem)
      ) uniquePush(items, SHEN_SHA.sanQi);

      const deXiuGroup = deXiuByMonthGroup.find((group) => group.branches.includes(monthBranch));
      if (deXiuGroup) {
        const hasDe = chartStems.some((stem) => deXiuGroup.de.includes(stem));
        const hasXiu = chartStems.some((stem) => deXiuGroup.xiu.includes(stem));
        if (hasDe && hasXiu && (deXiuGroup.de.includes(pillarStem) || deXiuGroup.xiu.includes(pillarStem))) {
          uniquePush(items, SHEN_SHA.deXiu);
        }
      }

      const luTarget = luBranchByStem[dayStem];
      const gongPair = luTarget ? gongLuPairs[luTarget] : null;
      if (gongPair && !chartBranches.includes(luTarget) && gongPair.includes(branch) && gongPair.every((item) => chartBranches.includes(item))) {
        uniquePush(items, SHEN_SHA.gongLu);
      }

      return [key, items];
    })
  ) as EngineOutput["shenShaDetails"];
}

function buildSpecialCombinations(pillars: FourPillars) {
  const entries = [
    { key: "year", label: "年柱", gan: pillars.year.stem, zhi: pillars.year.branch },
    { key: "month", label: "月柱", gan: pillars.month.stem, zhi: pillars.month.branch },
    { key: "day", label: "日柱", gan: pillars.day.stem, zhi: pillars.day.branch },
    { key: "hour", label: "时柱", gan: pillars.hour.stem, zhi: pillars.hour.branch },
  ];

  const results: EngineOutput["specialCombinations"] = [];
  const pushUnique = (item: EngineOutput["specialCombinations"][number]) => {
    if (!results.find((existing) => existing.type === item.type && existing.name === item.name && existing.pillars.join("|") === item.pillars.join("|"))) {
      results.push(item);
    }
  };

  const stemHeMap: Record<string, { match: string; effect: string }> = {
    "\u7532": { match: "\u5df1", effect: "甲己合土，偏向整合资源、落地现实。" },
    "\u4e59": { match: "\u5e9a", effect: "乙庚合金，偏向决断、规则、执行。" },
    "\u4e19": { match: "\u8f9b", effect: "丙辛合水，偏向表达、流动、应变。" },
    "\u4e01": { match: "\u58ec", effect: "丁壬合木，偏向生发、连接、成长。" },
    "\u620a": { match: "\u7678", effect: "戊癸合火，偏向目标感、热度和推动。" },
    "\u5df1": { match: "\u7532", effect: "甲己合土，偏向整合资源、落地现实。" },
    "\u5e9a": { match: "\u4e59", effect: "乙庚合金，偏向决断、规则、执行。" },
    "\u8f9b": { match: "\u4e19", effect: "丙辛合水，偏向表达、流动、应变。" },
    "\u58ec": { match: "\u4e01", effect: "丁壬合木，偏向生发、连接、成长。" },
    "\u7678": { match: "\u620a", effect: "戊癸合火，偏向目标感、热度和推动。" },
  };
  const zhiLiuHeMap: Record<string, { match: string; effect: string }> = {
    "\u5b50": { match: "\u4e11", effect: "子丑六合，偏向现实合作与承接。" },
    "\u4e11": { match: "\u5b50", effect: "子丑六合，偏向现实合作与承接。" },
    "\u5bc5": { match: "\u4ea5", effect: "寅亥六合，偏向连接、助力与成长。" },
    "\u4ea5": { match: "\u5bc5", effect: "寅亥六合，偏向连接、助力与成长。" },
    "\u536f": { match: "\u620c", effect: "卯戌六合，偏向关系黏性与目标协同。" },
    "\u620c": { match: "\u536f", effect: "卯戌六合，偏向关系黏性与目标协同。" },
    "\u8fb0": { match: "\u9149", effect: "辰酉六合，偏向规则、秩序与结果收束。" },
    "\u9149": { match: "\u8fb0", effect: "辰酉六合，偏向规则、秩序与结果收束。" },
    "\u5df3": { match: "\u7533", effect: "巳申六合，偏向流动、变化与机动性。" },
    "\u7533": { match: "\u5df3", effect: "巳申六合，偏向流动、变化与机动性。" },
    "\u5348": { match: "\u672a", effect: "午未六合，偏向缓和、修复与情感承接。" },
    "\u672a": { match: "\u5348", effect: "午未六合，偏向缓和、修复与情感承接。" },
  };
  const zhiChongMap: Record<string, { match: string; effect: string }> = {
    "\u5b50": { match: "\u5348", effect: "子午冲，节奏和关系容易两极拉扯。" },
    "\u5348": { match: "\u5b50", effect: "子午冲，节奏和关系容易两极拉扯。" },
    "\u4e11": { match: "\u672a", effect: "丑未冲，现实责任和内在感受容易相顶。" },
    "\u672a": { match: "\u4e11", effect: "丑未冲，现实责任和内在感受容易相顶。" },
    "\u5bc5": { match: "\u7533", effect: "寅申冲，行动方向和环境变化容易强碰。" },
    "\u7533": { match: "\u5bc5", effect: "寅申冲，行动方向和环境变化容易强碰。" },
    "\u536f": { match: "\u9149", effect: "卯酉冲，表达方式和关系判断容易对撞。" },
    "\u9149": { match: "\u536f", effect: "卯酉冲，表达方式和关系判断容易对撞。" },
    "\u8fb0": { match: "\u620c", effect: "辰戌冲，旧结构和新调整容易强烈碰撞。" },
    "\u620c": { match: "\u8fb0", effect: "辰戌冲，旧结构和新调整容易强烈碰撞。" },
    "\u5df3": { match: "\u4ea5", effect: "巳亥冲，想法与现实行动容易反向牵扯。" },
    "\u4ea5": { match: "\u5df3", effect: "巳亥冲，想法与现实行动容易反向牵扯。" },
  };
  const zhiHaiMap: Record<string, { match: string; effect: string }> = {
    "\u5b50": { match: "\u672a", effect: "子未害，情绪与责任之间容易暗耗。" },
    "\u672a": { match: "\u5b50", effect: "子未害，情绪与责任之间容易暗耗。" },
    "\u4e11": { match: "\u5348", effect: "丑午害，现实推进和人情感受容易别扭。" },
    "\u5348": { match: "\u4e11", effect: "丑午害，现实推进和人情感受容易别扭。" },
    "\u5bc5": { match: "\u5df3", effect: "寅巳害，方向感和执行感容易互相牵制。" },
    "\u5df3": { match: "\u5bc5", effect: "寅巳害，方向感和执行感容易互相牵制。" },
    "\u536f": { match: "\u8fb0", effect: "卯辰害，表达和现实细节容易卡住。" },
    "\u8fb0": { match: "\u536f", effect: "卯辰害，表达和现实细节容易卡住。" },
    "\u7533": { match: "\u4ea5", effect: "申亥害，变动和稳定之间容易暗中消耗。" },
    "\u4ea5": { match: "\u7533", effect: "申亥害，变动和稳定之间容易暗中消耗。" },
    "\u9149": { match: "\u620c", effect: "酉戌害，判断标准和关系感受容易别扭。" },
    "\u620c": { match: "\u9149", effect: "酉戌害，判断标准和关系感受容易别扭。" },
  };
  const zhiPoMap: Record<string, { match: string; effect: string }> = {
    "\u5b50": { match: "\u9149", effect: "子酉破，关系判断和表达边界容易被打乱。" },
    "\u9149": { match: "\u5b50", effect: "子酉破，关系判断和表达边界容易被打乱。" },
    "\u4e11": { match: "\u8fb0", effect: "丑辰破，现实安排和细节秩序容易出裂口。" },
    "\u8fb0": { match: "\u4e11", effect: "丑辰破，现实安排和细节秩序容易出裂口。" },
    "\u5bc5": { match: "\u4ea5", effect: "寅亥破，行动方向和长期期待容易拆开。" },
    "\u4ea5": { match: "\u5bc5", effect: "寅亥破，行动方向和长期期待容易拆开。" },
    "\u536f": { match: "\u5348", effect: "卯午破，关系温度和节奏安排容易不对拍。" },
    "\u5348": { match: "\u536f", effect: "卯午破，关系温度和节奏安排容易不对拍。" },
    "\u672a": { match: "\u620c", effect: "未戌破，责任承担和结果承接容易松动。" },
    "\u620c": { match: "\u672a", effect: "未戌破，责任承担和结果承接容易松动。" },
    "\u5df3": { match: "\u7533", effect: "巳申破，计划执行和变化节奏容易互相打断。" },
    "\u7533": { match: "\u5df3", effect: "巳申破，计划执行和变化节奏容易互相打断。" },
  };

  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      const left = entries[i];
      const right = entries[j];
      if (stemHeMap[left.gan]?.match === right.gan) {
        pushUnique({ type: "天干五合", name: `${left.gan}${right.gan}合`, pillars: [left.label, right.label], effect: stemHeMap[left.gan].effect });
      }
      if (zhiLiuHeMap[left.zhi]?.match === right.zhi) {
        pushUnique({ type: "地支六合", name: `${left.zhi}${right.zhi}合`, pillars: [left.label, right.label], effect: zhiLiuHeMap[left.zhi].effect });
      }
      if (zhiChongMap[left.zhi]?.match === right.zhi) {
        pushUnique({ type: "地支六冲", name: `${left.zhi}${right.zhi}冲`, pillars: [left.label, right.label], effect: zhiChongMap[left.zhi].effect });
      }
      if (zhiHaiMap[left.zhi]?.match === right.zhi) {
        pushUnique({ type: "地支六害", name: `${left.zhi}${right.zhi}害`, pillars: [left.label, right.label], effect: zhiHaiMap[left.zhi].effect });
      }
      if (zhiPoMap[left.zhi]?.match === right.zhi) {
        pushUnique({ type: "地支六破", name: `${left.zhi}${right.zhi}破`, pillars: [left.label, right.label], effect: zhiPoMap[left.zhi].effect });
      }
    }
  }

  const branchSet = new Set(entries.map((item) => item.zhi));
  [
    { branches: ["\u5bc5", "\u5df3", "\u7533"], type: "地支三刑", name: "寅巳申三刑", effect: "方向、执行和变化之间容易互相逼迫，节奏偏紧。" },
    { branches: ["\u4e11", "\u672a", "\u620c"], type: "地支三刑", name: "丑未戌三刑", effect: "现实压力、责任分配和结果承接容易互相卡住。" },
    { branches: ["\u5b50", "\u536f"], type: "地支相刑", name: "子卯刑", effect: "情绪反应和关系表达容易互相牵扯。" },
  ].forEach((combo) => {
    if (combo.branches.every((branch) => branchSet.has(branch))) {
      pushUnique({ type: combo.type, name: combo.name, pillars: entries.filter((item) => combo.branches.includes(item.zhi)).map((item) => item.label), effect: combo.effect });
    }
  });

  [
    { branches: ["\u7533", "\u5b50", "\u8fb0"], type: "地支三合", name: "申子辰三合", effect: "水局成象，偏向流动、应变、信息和资源调度。" },
    { branches: ["\u5bc5", "\u5348", "\u620c"], type: "地支三合", name: "寅午戌三合", effect: "火局成象，偏向表达、目标感和推动力。" },
    { branches: ["\u4ea5", "\u536f", "\u672a"], type: "地支三合", name: "亥卯未三合", effect: "木局成象，偏向成长、链接、扩展和生发。" },
    { branches: ["\u5df3", "\u9149", "\u4e11"], type: "地支三合", name: "巳酉丑三合", effect: "金局成象，偏向秩序、规则、结果与执行。" },
    { branches: ["\u4ea5", "\u5b50", "\u4e11"], type: "地支三会", name: "亥子丑三会", effect: "水气汇聚，偏向流动、信息与适应。" },
    { branches: ["\u5bc5", "\u536f", "\u8fb0"], type: "地支三会", name: "寅卯辰三会", effect: "木气汇聚，偏向成长、启动与扩张。" },
    { branches: ["\u5df3", "\u5348", "\u672a"], type: "地支三会", name: "巳午未三会", effect: "火气汇聚，偏向热度、表达与推动。" },
    { branches: ["\u7533", "\u9149", "\u620c"], type: "地支三会", name: "申酉戌三会", effect: "金气汇聚，偏向秩序、执行与结果导向。" },
  ].forEach((combo) => {
    if (combo.branches.every((branch) => branchSet.has(branch))) {
      pushUnique({ type: combo.type, name: combo.name, pillars: entries.filter((item) => combo.branches.includes(item.zhi)).map((item) => item.label), effect: combo.effect });
    }
  });

  [
    { branches: ["\u7533", "\u5b50"], target: "\u8fb0", name: "申子半合", effect: "水势已起，信息和流动性开始加强。" },
    { branches: ["\u5b50", "\u8fb0"], target: "\u7533", name: "子辰半合", effect: "水势渐成，资源联动和调度感增强。" },
    { branches: ["\u7533", "\u8fb0"], target: "\u5b50", name: "申辰拱合", effect: "两端相拱，容易把“子”位主题推出来，偏向流动与连接。" },
    { branches: ["\u5bc5", "\u5348"], target: "\u620c", name: "寅午半合", effect: "火势渐旺，表达、推动和行动热度上升。" },
    { branches: ["\u5348", "\u620c"], target: "\u5bc5", name: "午戌半合", effect: "火势渐旺，目标感和执行热度增强。" },
    { branches: ["\u5bc5", "\u620c"], target: "\u5348", name: "寅戌拱合", effect: "两端相拱，容易把“午”位主题推出来，偏向推动和爆发。" },
    { branches: ["\u4ea5", "\u536f"], target: "\u672a", name: "亥卯半合", effect: "木气渐生，成长、扩展和关系连接增强。" },
    { branches: ["\u536f", "\u672a"], target: "\u4ea5", name: "卯未半合", effect: "木气渐生，协同和生发感增强。" },
    { branches: ["\u4ea5", "\u672a"], target: "\u536f", name: "亥未拱合", effect: "两端相拱，容易把“卯”位主题推出来，偏向连接和生发。" },
    { branches: ["\u5df3", "\u9149"], target: "\u4e11", name: "巳酉半合", effect: "金气渐成，秩序、判断和执行要求更强。" },
    { branches: ["\u9149", "\u4e11"], target: "\u5df3", name: "酉丑半合", effect: "金气渐成，规则与结果感更强。" },
    { branches: ["\u5df3", "\u4e11"], target: "\u9149", name: "巳丑拱合", effect: "两端相拱，容易把“酉”位主题推出来，偏向判断和结果收束。" },
  ].forEach((combo) => {
    const present = combo.branches.every((branch) => branchSet.has(branch));
    if (present) {
      pushUnique({
        type: combo.name.includes("拱合") ? "拱合" : "半合",
        name: combo.name,
        pillars: entries.filter((item) => combo.branches.includes(item.zhi)).map((item) => item.label),
        effect: `${combo.effect} 若再遇${combo.target}，力量会更完整。`,
      });
    }
  });

  ["\u8fb0", "\u5348", "\u9149", "\u4ea5"].forEach((branch) => {
    const matched = entries.filter((item) => item.zhi === branch);
    if (matched.length >= 2) {
      pushUnique({
        type: "自刑",
        name: `${branch}${branch}自刑`,
        pillars: matched.map((item) => item.label),
        effect: `${branch}支重复时，容易在同一主题上反复内耗、较劲或自我拉扯。`,
      });
    }
  });

  [
    { left: "\u5bc5", right: "\u4e11", name: "寅丑暗合", effect: "行动方向和现实盘算容易在暗处牵连。" },
    { left: "\u7533", right: "\u536f", name: "申卯暗合", effect: "变化节奏和关系表达之间容易产生隐性拉扯。" },
    { left: "\u5348", right: "\u4ea5", name: "午亥暗合", effect: "热度推动和内在感受之间容易出现暗线牵引。" },
  ].forEach((combo) => {
    const matched = entries.filter((item) => item.zhi === combo.left || item.zhi === combo.right);
    if (matched.length >= 2 && matched.some((item) => item.zhi === combo.left) && matched.some((item) => item.zhi === combo.right)) {
      pushUnique({
        type: "暗合",
        name: combo.name,
        pillars: matched.map((item) => item.label),
        effect: combo.effect,
      });
    }
  });

  [
    { left: "\u5b50", right: "\u672a", name: "子未穿", effect: "情绪需求和现实责任容易互相刺穿，表面平静但内里较耗。" },
    { left: "\u4e11", right: "\u5348", name: "丑午穿", effect: "现实安排和行动节奏容易互相打断，推进感起伏较大。" },
    { left: "\u5bc5", right: "\u5df3", name: "寅巳穿", effect: "方向判断和执行欲望容易互相顶撞，做事会急。" },
    { left: "\u536f", right: "\u8fb0", name: "卯辰穿", effect: "表达、关系和细节现实之间容易互相卡住。" },
    { left: "\u7533", right: "\u4ea5", name: "申亥穿", effect: "变化需求和稳定预期之间容易出现深层撕扯。" },
    { left: "\u9149", right: "\u620c", name: "酉戌穿", effect: "标准感和关系感受容易彼此伤到，判断会更敏感。" },
  ].forEach((combo) => {
    const matched = entries.filter((item) => item.zhi === combo.left || item.zhi === combo.right);
    if (matched.length >= 2 && matched.some((item) => item.zhi === combo.left) && matched.some((item) => item.zhi === combo.right)) {
      pushUnique({
        type: "穿",
        name: combo.name,
        pillars: matched.map((item) => item.label),
        effect: combo.effect,
      });
    }
  });

  Object.entries(
    entries.reduce<Record<string, string[]>>((acc, item) => {
      const key = `${item.gan}${item.zhi}`;
      acc[key] = acc[key] || [];
      acc[key].push(item.label);
      return acc;
    }, {})
  )
    .filter(([, pillarLabels]) => pillarLabels.length >= 2)
    .forEach(([ganZhi, pillarLabels]) => {
      pushUnique({
        type: "伏吟",
        name: `${ganZhi}伏吟`,
        pillars: pillarLabels,
        effect: "同一柱意象重复出现，相关主题会被放大，也容易带来反复、停滞或加深体会。",
      });
    });

  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      const left = entries[i];
      const right = entries[j];
      if (zhiChongMap[left.zhi]?.match === right.zhi) {
        pushUnique({
          type: "反吟",
          name: `${left.gan}${left.zhi}与${right.gan}${right.zhi}反吟`,
          pillars: [left.label, right.label],
          effect: "对应柱位形成强烈对照，事情容易反复、对冲，先有拉扯再找平衡。",
        });
      }
    }
  }

  return results;
}

function buildSpecialCombinationsV2(pillars: FourPillars) {
  const entries = [
    { label: "\u5e74\u67f1", gan: pillars.year.stem, zhi: pillars.year.branch },
    { label: "\u6708\u67f1", gan: pillars.month.stem, zhi: pillars.month.branch },
    { label: "\u65e5\u67f1", gan: pillars.day.stem, zhi: pillars.day.branch },
    { label: "\u65f6\u67f1", gan: pillars.hour.stem, zhi: pillars.hour.branch },
  ];
  const results: EngineOutput["specialCombinations"] = [];
  const hasAll = (branches: string[]) => branches.every((branch) => entries.some((item) => item.zhi === branch));
  const labelsOf = (branches: string[]) => entries.filter((item) => branches.includes(item.zhi)).map((item) => item.label);
  const add = (type: string, name: string, pillarsUsed: string[], effect: string) => {
    const key = `${type}|${name}|${pillarsUsed.join("|")}`;
    if (!results.some((item) => `${item.type}|${item.name}|${item.pillars.join("|")}` === key)) {
      results.push({ type, name, pillars: pillarsUsed, effect });
    }
  };

  const stemHeMap: Record<string, { match: string; name: string; effect: string }> = {
    "\u7532": { match: "\u5df1", name: "\u7532\u5df1\u5408", effect: "\u66f4\u504f\u5411\u8d44\u6e90\u6574\u5408\u3001\u73b0\u5b9e\u843d\u5730\u548c\u628a\u4e8b\u60c5\u505a\u6210\u3002" },
    "\u4e59": { match: "\u5e9a", name: "\u4e59\u5e9a\u5408", effect: "\u66f4\u504f\u5411\u5224\u65ad\u3001\u89c4\u5219\u3001\u6267\u884c\u548c\u7ed3\u679c\u5bfc\u5411\u3002" },
    "\u4e19": { match: "\u8f9b", name: "\u4e19\u8f9b\u5408", effect: "\u66f4\u504f\u5411\u8868\u8fbe\u3001\u53d8\u901a\u3001\u4eba\u9645\u6d41\u52a8\u548c\u8d44\u6e90\u8fde\u63a5\u3002" },
    "\u4e01": { match: "\u58ec", name: "\u4e01\u58ec\u5408", effect: "\u66f4\u504f\u5411\u751f\u53d1\u3001\u8fde\u63a5\u3001\u6210\u957f\u548c\u6301\u7eed\u6269\u5f20\u3002" },
    "\u620a": { match: "\u7678", name: "\u620a\u7678\u5408", effect: "\u66f4\u504f\u5411\u76ee\u6807\u611f\u3001\u70ed\u5ea6\u548c\u63a8\u52a8\u529b\u3002" },
    "\u5df1": { match: "\u7532", name: "\u7532\u5df1\u5408", effect: "\u66f4\u504f\u5411\u8d44\u6e90\u6574\u5408\u3001\u73b0\u5b9e\u843d\u5730\u548c\u628a\u4e8b\u60c5\u505a\u6210\u3002" },
    "\u5e9a": { match: "\u4e59", name: "\u4e59\u5e9a\u5408", effect: "\u66f4\u504f\u5411\u5224\u65ad\u3001\u89c4\u5219\u3001\u6267\u884c\u548c\u7ed3\u679c\u5bfc\u5411\u3002" },
    "\u8f9b": { match: "\u4e19", name: "\u4e19\u8f9b\u5408", effect: "\u66f4\u504f\u5411\u8868\u8fbe\u3001\u53d8\u901a\u3001\u4eba\u9645\u6d41\u52a8\u548c\u8d44\u6e90\u8fde\u63a5\u3002" },
    "\u58ec": { match: "\u4e01", name: "\u4e01\u58ec\u5408", effect: "\u66f4\u504f\u5411\u751f\u53d1\u3001\u8fde\u63a5\u3001\u6210\u957f\u548c\u6301\u7eed\u6269\u5f20\u3002" },
    "\u7678": { match: "\u620a", name: "\u620a\u7678\u5408", effect: "\u66f4\u504f\u5411\u76ee\u6807\u611f\u3001\u70ed\u5ea6\u548c\u63a8\u52a8\u529b\u3002" },
  };
  const liuHeMap: Record<string, { match: string; name: string; effect: string }> = {
    "\u5b50": { match: "\u4e11", name: "\u5b50\u4e11\u5408", effect: "\u66f4\u504f\u5411\u5408\u4f5c\u627f\u63a5\u3001\u73b0\u5b9e\u7ed1\u5b9a\u548c\u8d44\u6e90\u5bf9\u63a5\u3002" },
    "\u4e11": { match: "\u5b50", name: "\u5b50\u4e11\u5408", effect: "\u66f4\u504f\u5411\u5408\u4f5c\u627f\u63a5\u3001\u73b0\u5b9e\u7ed1\u5b9a\u548c\u8d44\u6e90\u5bf9\u63a5\u3002" },
    "\u5bc5": { match: "\u4ea5", name: "\u5bc5\u4ea5\u5408", effect: "\u66f4\u504f\u5411\u8fde\u63a5\u3001\u52a9\u529b\u3001\u6210\u957f\u548c\u5bf9\u5916\u6253\u5f00\u3002" },
    "\u4ea5": { match: "\u5bc5", name: "\u5bc5\u4ea5\u5408", effect: "\u66f4\u504f\u5411\u8fde\u63a5\u3001\u52a9\u529b\u3001\u6210\u957f\u548c\u5bf9\u5916\u6253\u5f00\u3002" },
    "\u536f": { match: "\u620c", name: "\u536f\u620c\u5408", effect: "\u66f4\u504f\u5411\u5173\u7cfb\u9ed8\u5951\u3001\u76ee\u6807\u534f\u540c\u548c\u957f\u7ebf\u7ef4\u6301\u3002" },
    "\u620c": { match: "\u536f", name: "\u536f\u620c\u5408", effect: "\u66f4\u504f\u5411\u5173\u7cfb\u9ed8\u5951\u3001\u76ee\u6807\u534f\u540c\u548c\u957f\u7ebf\u7ef4\u6301\u3002" },
    "\u8fb0": { match: "\u9149", name: "\u8fb0\u9149\u5408", effect: "\u66f4\u504f\u5411\u79e9\u5e8f\u3001\u89c4\u5219\u3001\u7ec6\u8282\u7ba1\u7406\u548c\u7ed3\u679c\u6536\u675f\u3002" },
    "\u9149": { match: "\u8fb0", name: "\u8fb0\u9149\u5408", effect: "\u66f4\u504f\u5411\u79e9\u5e8f\u3001\u89c4\u5219\u3001\u7ec6\u8282\u7ba1\u7406\u548c\u7ed3\u679c\u6536\u675f\u3002" },
    "\u5df3": { match: "\u7533", name: "\u5df3\u7533\u5408", effect: "\u66f4\u504f\u5411\u53d8\u5316\u3001\u6d41\u52a8\u3001\u8c03\u6574\u548c\u5bf9\u5916\u673a\u4f1a\u3002" },
    "\u7533": { match: "\u5df3", name: "\u5df3\u7533\u5408", effect: "\u66f4\u504f\u5411\u53d8\u5316\u3001\u6d41\u52a8\u3001\u8c03\u6574\u548c\u5bf9\u5916\u673a\u4f1a\u3002" },
    "\u5348": { match: "\u672a", name: "\u5348\u672a\u5408", effect: "\u66f4\u504f\u5411\u5173\u7cfb\u8c03\u548c\u3001\u60c5\u7eea\u627f\u63a5\u548c\u7f13\u548c\u4fee\u590d\u3002" },
    "\u672a": { match: "\u5348", name: "\u5348\u672a\u5408", effect: "\u66f4\u504f\u5411\u5173\u7cfb\u8c03\u548c\u3001\u60c5\u7eea\u627f\u63a5\u548c\u7f13\u548c\u4fee\u590d\u3002" },
  };
  const chongMap: Record<string, { match: string; name: string; effect: string }> = {
    "\u5b50": { match: "\u5348", name: "\u5b50\u5348\u51b2", effect: "\u8282\u594f\u3001\u5173\u7cfb\u548c\u60c5\u7eea\u5bb9\u6613\u51fa\u73b0\u4e24\u6781\u62c9\u6240\u3002" },
    "\u5348": { match: "\u5b50", name: "\u5b50\u5348\u51b2", effect: "\u8282\u594f\u3001\u5173\u7cfb\u548c\u60c5\u7eea\u5bb9\u6613\u51fa\u73b0\u4e24\u6781\u62c9\u6240\u3002" },
    "\u4e11": { match: "\u672a", name: "\u4e11\u672a\u51b2", effect: "\u73b0\u5b9e\u8d23\u4efb\u548c\u5185\u5728\u611f\u53d7\u5bb9\u6613\u4e92\u76f8\u9876\u649e\u3002" },
    "\u672a": { match: "\u4e11", name: "\u4e11\u672a\u51b2", effect: "\u73b0\u5b9e\u8d23\u4efb\u548c\u5185\u5728\u611f\u53d7\u5bb9\u6613\u4e92\u76f8\u9876\u649e\u3002" },
    "\u5bc5": { match: "\u7533", name: "\u5bc5\u7533\u51b2", effect: "\u884c\u52a8\u65b9\u5411\u548c\u73af\u5883\u53d8\u5316\u5bb9\u6613\u5f3a\u78b0\u3002" },
    "\u7533": { match: "\u5bc5", name: "\u5bc5\u7533\u51b2", effect: "\u884c\u52a8\u65b9\u5411\u548c\u73af\u5883\u53d8\u5316\u5bb9\u6613\u5f3a\u78b0\u3002" },
    "\u536f": { match: "\u9149", name: "\u536f\u9149\u51b2", effect: "\u8868\u8fbe\u65b9\u5f0f\u548c\u5173\u7cfb\u5224\u65ad\u5bb9\u6613\u5bf9\u649e\u3002" },
    "\u9149": { match: "\u536f", name: "\u536f\u9149\u51b2", effect: "\u8868\u8fbe\u65b9\u5f0f\u548c\u5173\u7cfb\u5224\u65ad\u5bb9\u6613\u5bf9\u649e\u3002" },
    "\u8fb0": { match: "\u620c", name: "\u8fb0\u620c\u51b2", effect: "\u65e7\u7ed3\u6784\u548c\u65b0\u8c03\u6574\u5bb9\u6613\u51fa\u73b0\u5f3a\u70c8\u78b0\u649e\u3002" },
    "\u620c": { match: "\u8fb0", name: "\u8fb0\u620c\u51b2", effect: "\u65e7\u7ed3\u6784\u548c\u65b0\u8c03\u6574\u5bb9\u6613\u51fa\u73b0\u5f3a\u70c8\u78b0\u649e\u3002" },
    "\u5df3": { match: "\u4ea5", name: "\u5df3\u4ea5\u51b2", effect: "\u60f3\u6cd5\u4e0e\u73b0\u5b9e\u884c\u52a8\u5f88\u5bb9\u6613\u53cd\u5411\u62c9\u6240\u3002" },
    "\u4ea5": { match: "\u5df3", name: "\u5df3\u4ea5\u51b2", effect: "\u60f3\u6cd5\u4e0e\u73b0\u5b9e\u884c\u52a8\u5f88\u5bb9\u6613\u53cd\u5411\u62c9\u6240\u3002" },
  };
  const haiMap: Record<string, { match: string; name: string; effect: string }> = {
    "\u5b50": { match: "\u672a", name: "\u5b50\u672a\u5bb3", effect: "\u60c5\u7eea\u9700\u6c42\u548c\u73b0\u5b9e\u8d23\u4efb\u4e4b\u95f4\u5bb9\u6613\u6697\u8017\u3002" },
    "\u672a": { match: "\u5b50", name: "\u5b50\u672a\u5bb3", effect: "\u60c5\u7eea\u9700\u6c42\u548c\u73b0\u5b9e\u8d23\u4efb\u4e4b\u95f4\u5bb9\u6613\u6697\u8017\u3002" },
    "\u4e11": { match: "\u5348", name: "\u4e11\u5348\u5bb3", effect: "\u73b0\u5b9e\u63a8\u8fdb\u548c\u4eba\u60c5\u611f\u53d7\u5bb9\u6613\u51fa\u73b0\u522b\u626d\u3002" },
    "\u5348": { match: "\u4e11", name: "\u4e11\u5348\u5bb3", effect: "\u73b0\u5b9e\u63a8\u8fdb\u548c\u4eba\u60c5\u611f\u53d7\u5bb9\u6613\u51fa\u73b0\u522b\u626d\u3002" },
    "\u5bc5": { match: "\u5df3", name: "\u5bc5\u5df3\u5bb3", effect: "\u65b9\u5411\u611f\u548c\u6267\u884c\u611f\u5bb9\u6613\u4e92\u76f8\u7275\u5236\u3002" },
    "\u5df3": { match: "\u5bc5", name: "\u5bc5\u5df3\u5bb3", effect: "\u65b9\u5411\u611f\u548c\u6267\u884c\u611f\u5bb9\u6613\u4e92\u76f8\u7275\u5236\u3002" },
    "\u536f": { match: "\u8fb0", name: "\u536f\u8fb0\u5bb3", effect: "\u8868\u8fbe\u548c\u73b0\u5b9e\u7ec6\u8282\u5bb9\u6613\u4e92\u5361\u3002" },
    "\u8fb0": { match: "\u536f", name: "\u536f\u8fb0\u5bb3", effect: "\u8868\u8fbe\u548c\u73b0\u5b9e\u7ec6\u8282\u5bb9\u6613\u4e92\u5361\u3002" },
    "\u7533": { match: "\u4ea5", name: "\u7533\u4ea5\u5bb3", effect: "\u53d8\u52a8\u9700\u6c42\u548c\u7a33\u5b9a\u9884\u671f\u4e4b\u95f4\u5bb9\u6613\u51fa\u73b0\u6df1\u5c42\u6d88\u8017\u3002" },
    "\u4ea5": { match: "\u7533", name: "\u7533\u4ea5\u5bb3", effect: "\u53d8\u52a8\u9700\u6c42\u548c\u7a33\u5b9a\u9884\u671f\u4e4b\u95f4\u5bb9\u6613\u51fa\u73b0\u6df1\u5c42\u6d88\u8017\u3002" },
    "\u9149": { match: "\u620c", name: "\u9149\u620c\u5bb3", effect: "\u5224\u65ad\u6807\u51c6\u548c\u5173\u7cfb\u611f\u53d7\u5bb9\u6613\u5f7c\u6b64\u522b\u626d\u3002" },
    "\u620c": { match: "\u9149", name: "\u9149\u620c\u5bb3", effect: "\u5224\u65ad\u6807\u51c6\u548c\u5173\u7cfb\u611f\u53d7\u5bb9\u6613\u5f7c\u6b64\u522b\u626d\u3002" },
  };
  const poMap: Record<string, { match: string; name: string; effect: string }> = {
    "\u5b50": { match: "\u9149", name: "\u5b50\u9149\u7834", effect: "\u5173\u7cfb\u5224\u65ad\u548c\u8868\u8fbe\u8fb9\u754c\u5f88\u5bb9\u6613\u88ab\u6253\u4e71\u3002" },
    "\u9149": { match: "\u5b50", name: "\u5b50\u9149\u7834", effect: "\u5173\u7cfb\u5224\u65ad\u548c\u8868\u8fbe\u8fb9\u754c\u5f88\u5bb9\u6613\u88ab\u6253\u4e71\u3002" },
    "\u4e11": { match: "\u8fb0", name: "\u4e11\u8fb0\u7834", effect: "\u73b0\u5b9e\u5b89\u6392\u548c\u7ec6\u8282\u79e9\u5e8f\u5bb9\u6613\u51fa\u73b0\u88c2\u53e3\u3002" },
    "\u8fb0": { match: "\u4e11", name: "\u4e11\u8fb0\u7834", effect: "\u73b0\u5b9e\u5b89\u6392\u548c\u7ec6\u8282\u79e9\u5e8f\u5bb9\u6613\u51fa\u73b0\u88c2\u53e3\u3002" },
    "\u5bc5": { match: "\u4ea5", name: "\u5bc5\u4ea5\u7834", effect: "\u884c\u52a8\u65b9\u5411\u548c\u957f\u671f\u9884\u671f\u5bb9\u6613\u88ab\u62c6\u5f00\u3002" },
    "\u4ea5": { match: "\u5bc5", name: "\u5bc5\u4ea5\u7834", effect: "\u884c\u52a8\u65b9\u5411\u548c\u957f\u671f\u9884\u671f\u5bb9\u6613\u88ab\u62c6\u5f00\u3002" },
    "\u536f": { match: "\u5348", name: "\u536f\u5348\u7834", effect: "\u5173\u7cfb\u6e29\u5ea6\u548c\u8282\u594f\u5b89\u6392\u5bb9\u6613\u4e0d\u5bf9\u62cd\u3002" },
    "\u5348": { match: "\u536f", name: "\u536f\u5348\u7834", effect: "\u5173\u7cfb\u6e29\u5ea6\u548c\u8282\u594f\u5b89\u6392\u5bb9\u6613\u4e0d\u5bf9\u62cd\u3002" },
    "\u672a": { match: "\u620c", name: "\u672a\u620c\u7834", effect: "\u8d23\u4efb\u627f\u62c5\u548c\u7ed3\u679c\u627f\u63a5\u5bb9\u6613\u51fa\u73b0\u677e\u52a8\u3002" },
    "\u620c": { match: "\u672a", name: "\u672a\u620c\u7834", effect: "\u8d23\u4efb\u627f\u62c5\u548c\u7ed3\u679c\u627f\u63a5\u5bb9\u6613\u51fa\u73b0\u677e\u52a8\u3002" },
    "\u5df3": { match: "\u7533", name: "\u5df3\u7533\u7834", effect: "\u8ba1\u5212\u6267\u884c\u548c\u53d8\u5316\u8282\u594f\u5bb9\u6613\u4e92\u76f8\u6253\u65ad\u3002" },
    "\u7533": { match: "\u5df3", name: "\u5df3\u7533\u7834", effect: "\u8ba1\u5212\u6267\u884c\u548c\u53d8\u5316\u8282\u594f\u5bb9\u6613\u4e92\u76f8\u6253\u65ad\u3002" },
  };

  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      const left = entries[i];
      const right = entries[j];
      if (stemHeMap[left.gan]?.match === right.gan) add("\u5929\u5e72\u4e94\u5408", stemHeMap[left.gan].name, [left.label, right.label], stemHeMap[left.gan].effect);
      if (liuHeMap[left.zhi]?.match === right.zhi) add("\u5730\u652f\u516d\u5408", liuHeMap[left.zhi].name, [left.label, right.label], liuHeMap[left.zhi].effect);
      if (chongMap[left.zhi]?.match === right.zhi) add("\u5730\u652f\u516d\u51b2", chongMap[left.zhi].name, [left.label, right.label], chongMap[left.zhi].effect);
      if (haiMap[left.zhi]?.match === right.zhi) add("\u5730\u652f\u516d\u5bb3", haiMap[left.zhi].name, [left.label, right.label], haiMap[left.zhi].effect);
      if (poMap[left.zhi]?.match === right.zhi) add("\u5730\u652f\u516d\u7834", poMap[left.zhi].name, [left.label, right.label], poMap[left.zhi].effect);
    }
  }

  [
    { branches: ["\u5bc5", "\u5df3", "\u7533"], type: "\u5730\u652f\u4e09\u5211", name: "\u5bc5\u5df3\u7533\u4e09\u5211", effect: "\u65b9\u5411\u3001\u6267\u884c\u548c\u53d8\u5316\u4e4b\u95f4\u5bb9\u6613\u4e92\u76f8\u903c\u8feb\uff0c\u8282\u594f\u504f\u7d27\u3002" },
    { branches: ["\u4e11", "\u672a", "\u620c"], type: "\u5730\u652f\u4e09\u5211", name: "\u4e11\u672a\u620c\u4e09\u5211", effect: "\u73b0\u5b9e\u538b\u529b\u3001\u8d23\u4efb\u5206\u914d\u548c\u7ed3\u679c\u627f\u63a5\u5bb9\u6613\u4e92\u76f8\u5361\u4f4f\u3002" },
    { branches: ["\u5b50", "\u536f"], type: "\u5730\u652f\u76f8\u5211", name: "\u5b50\u536f\u5211", effect: "\u60c5\u7eea\u53cd\u5e94\u548c\u5173\u7cfb\u8868\u8fbe\u5bb9\u6613\u4e92\u76f8\u7275\u6240\u3002" },
    { branches: ["\u7533", "\u5b50", "\u8fb0"], type: "\u5730\u652f\u4e09\u5408", name: "\u7533\u5b50\u8fb0\u4e09\u5408", effect: "\u66f4\u504f\u5411\u4fe1\u606f\u6d41\u52a8\u3001\u53d8\u901a\u548c\u8d44\u6e90\u8c03\u5ea6\u3002" },
    { branches: ["\u5bc5", "\u5348", "\u620c"], type: "\u5730\u652f\u4e09\u5408", name: "\u5bc5\u5348\u620c\u4e09\u5408", effect: "\u66f4\u504f\u5411\u76ee\u6807\u611f\u3001\u63a8\u52a8\u529b\u548c\u884c\u52a8\u70ed\u5ea6\u3002" },
    { branches: ["\u4ea5", "\u536f", "\u672a"], type: "\u5730\u652f\u4e09\u5408", name: "\u4ea5\u536f\u672a\u4e09\u5408", effect: "\u66f4\u504f\u5411\u6210\u957f\u3001\u6269\u5c55\u548c\u7ed3\u5408\u5173\u7cfb\u3002" },
    { branches: ["\u5df3", "\u9149", "\u4e11"], type: "\u5730\u652f\u4e09\u5408", name: "\u5df3\u9149\u4e11\u4e09\u5408", effect: "\u66f4\u504f\u5411\u79e9\u5e8f\u3001\u6267\u884c\u548c\u7ed3\u679c\u5bfc\u5411\u3002" },
    { branches: ["\u4ea5", "\u5b50", "\u4e11"], type: "\u5730\u652f\u4e09\u4f1a", name: "\u4ea5\u5b50\u4e11\u4e09\u4f1a", effect: "\u4fe1\u606f\u3001\u6d41\u52a8\u548c\u9002\u5e94\u80fd\u529b\u4f1a\u66f4\u5f3a\u3002" },
    { branches: ["\u5bc5", "\u536f", "\u8fb0"], type: "\u5730\u652f\u4e09\u4f1a", name: "\u5bc5\u536f\u8fb0\u4e09\u4f1a", effect: "\u542f\u52a8\u3001\u6210\u957f\u548c\u6269\u5c55\u4e3b\u9898\u4f1a\u88ab\u653e\u5927\u3002" },
    { branches: ["\u5df3", "\u5348", "\u672a"], type: "\u5730\u652f\u4e09\u4f1a", name: "\u5df3\u5348\u672a\u4e09\u4f1a", effect: "\u70ed\u5ea6\u3001\u8868\u8fbe\u548c\u63a8\u8fdb\u611f\u4f1a\u66f4\u660e\u663e\u3002" },
    { branches: ["\u7533", "\u9149", "\u620c"], type: "\u5730\u652f\u4e09\u4f1a", name: "\u7533\u9149\u620c\u4e09\u4f1a", effect: "\u6807\u51c6\u3001\u79e9\u5e8f\u548c\u7ed3\u679c\u5bfc\u5411\u4f1a\u66f4\u5f3a\u3002" },
  ].forEach((combo) => {
    if (hasAll(combo.branches)) add(combo.type, combo.name, labelsOf(combo.branches), combo.effect);
  });

  [
    { branches: ["\u7533", "\u5b50"], target: "\u8fb0", type: "\u534a\u5408", name: "\u7533\u5b50\u534a\u5408", effect: "\u6c34\u52bf\u5df2\u8d77\uff0c\u4fe1\u606f\u6d41\u52a8\u548c\u53d8\u901a\u611f\u5f00\u59cb\u52a0\u5f3a\u3002" },
    { branches: ["\u5b50", "\u8fb0"], target: "\u7533", type: "\u534a\u5408", name: "\u5b50\u8fb0\u534a\u5408", effect: "\u6c34\u52bf\u6e10\u6210\uff0c\u8d44\u6e90\u8054\u52a8\u548c\u8c03\u5ea6\u611f\u589e\u5f3a\u3002" },
    { branches: ["\u5bc5", "\u5348"], target: "\u620c", type: "\u534a\u5408", name: "\u5bc5\u5348\u534a\u5408", effect: "\u706b\u52bf\u6e10\u65fa\uff0c\u8868\u8fbe\u3001\u63a8\u52a8\u529b\u548c\u884c\u52a8\u70ed\u5ea6\u4e0a\u5347\u3002" },
    { branches: ["\u5348", "\u620c"], target: "\u5bc5", type: "\u534a\u5408", name: "\u5348\u620c\u534a\u5408", effect: "\u76ee\u6807\u611f\u548c\u6267\u884c\u70ed\u5ea6\u6301\u7eed\u4e0a\u5347\u3002" },
    { branches: ["\u4ea5", "\u536f"], target: "\u672a", type: "\u534a\u5408", name: "\u4ea5\u536f\u534a\u5408", effect: "\u6210\u957f\u3001\u8fde\u63a5\u548c\u534f\u4f5c\u4f1a\u66f4\u5bb9\u6613\u88ab\u63a8\u52a8\u3002" },
    { branches: ["\u536f", "\u672a"], target: "\u4ea5", type: "\u534a\u5408", name: "\u536f\u672a\u534a\u5408", effect: "\u7ed3\u5408\u5173\u7cfb\u548c\u751f\u53d1\u4e3b\u9898\u4f1a\u66f4\u5bb9\u6613\u88ab\u5f15\u52a8\u3002" },
    { branches: ["\u5df3", "\u9149"], target: "\u4e11", type: "\u534a\u5408", name: "\u5df3\u9149\u534a\u5408", effect: "\u79e9\u5e8f\u3001\u89c4\u5219\u548c\u7ed3\u679c\u611f\u4f1a\u6e10\u6e10\u62c9\u9ad8\u3002" },
    { branches: ["\u9149", "\u4e11"], target: "\u5df3", type: "\u534a\u5408", name: "\u9149\u4e11\u534a\u5408", effect: "\u5224\u65ad\u6807\u51c6\u548c\u7ed3\u679c\u5bfc\u5411\u4f1a\u8d8a\u6765\u8d8a\u5f3a\u3002" },
    { branches: ["\u7533", "\u8fb0"], target: "\u5b50", type: "\u62f1\u5408", name: "\u7533\u8fb0\u62f1\u5408", effect: "\u4e24\u7aef\u76f8\u62f1\uff0c\u5bb9\u6613\u628a\u5b50\u4f4d\u4e3b\u9898\u63a8\u51fa\u6765\u3002" },
    { branches: ["\u5bc5", "\u620c"], target: "\u5348", type: "\u62f1\u5408", name: "\u5bc5\u620c\u62f1\u5408", effect: "\u4e24\u7aef\u76f8\u62f1\uff0c\u5bb9\u6613\u628a\u5348\u4f4d\u4e3b\u9898\u63a8\u51fa\u6765\u3002" },
    { branches: ["\u4ea5", "\u672a"], target: "\u536f", type: "\u62f1\u5408", name: "\u4ea5\u672a\u62f1\u5408", effect: "\u4e24\u7aef\u76f8\u62f1\uff0c\u5bb9\u6613\u628a\u536f\u4f4d\u4e3b\u9898\u63a8\u51fa\u6765\u3002" },
    { branches: ["\u5df3", "\u4e11"], target: "\u9149", type: "\u62f1\u5408", name: "\u5df3\u4e11\u62f1\u5408", effect: "\u4e24\u7aef\u76f8\u62f1\uff0c\u5bb9\u6613\u628a\u9149\u4f4d\u4e3b\u9898\u63a8\u51fa\u6765\u3002" },
  ].forEach((combo) => {
    if (hasAll(combo.branches)) add(combo.type, combo.name, labelsOf(combo.branches), `${combo.effect} 若再见${combo.target}，力量会更完整。`);
  });

  ["\u8fb0", "\u5348", "\u9149", "\u4ea5"].forEach((branch) => {
    const matched = entries.filter((item) => item.zhi === branch);
    if (matched.length >= 2) add("\u81ea\u5211", `${branch}${branch}\u81ea\u5211`, matched.map((item) => item.label), `${branch}支重复时，容易在同一主题上反复内耗、自我拉扯。`);
  });

  [
    { left: "\u5bc5", right: "\u4e11", name: "\u5bc5\u4e11\u6697\u5408", effect: "\u884c\u52a8\u65b9\u5411\u548c\u73b0\u5b9e\u76d8\u7b97\u5bb9\u6613\u5728\u6697\u5904\u7275\u8fde\u3002" },
    { left: "\u7533", right: "\u536f", name: "\u7533\u536f\u6697\u5408", effect: "\u53d8\u5316\u8282\u594f\u548c\u5173\u7cfb\u8868\u8fbe\u4e4b\u95f4\u5bb9\u6613\u51fa\u73b0\u9690\u6027\u62c9\u6240\u3002" },
    { left: "\u5348", right: "\u4ea5", name: "\u5348\u4ea5\u6697\u5408", effect: "\u70ed\u5ea6\u63a8\u52a8\u548c\u5185\u5728\u611f\u53d7\u4e4b\u95f4\u5bb9\u6613\u51fa\u73b0\u6697\u7ebf\u7275\u5f15\u3002" },
  ].forEach((combo) => {
    if (hasAll([combo.left, combo.right])) add("\u6697\u5408", combo.name, labelsOf([combo.left, combo.right]), combo.effect);
  });

  [
    { left: "\u5b50", right: "\u672a", name: "\u5b50\u672a\u7a7f", effect: "\u60c5\u7eea\u9700\u6c42\u548c\u73b0\u5b9e\u8d23\u4efb\u5bb9\u6613\u4e92\u76f8\u523a\u7a7f\u3002" },
    { left: "\u4e11", right: "\u5348", name: "\u4e11\u5348\u7a7f", effect: "\u73b0\u5b9e\u5b89\u6392\u548c\u884c\u52a8\u8282\u594f\u5bb9\u6613\u4e92\u76f8\u6253\u65ad\u3002" },
    { left: "\u5bc5", right: "\u5df3", name: "\u5bc5\u5df3\u7a7f", effect: "\u65b9\u5411\u5224\u65ad\u548c\u6267\u884c\u6b32\u671b\u5bb9\u6613\u4e92\u76f8\u9876\u649e\u3002" },
    { left: "\u536f", right: "\u8fb0", name: "\u536f\u8fb0\u7a7f", effect: "\u8868\u8fbe\u548c\u7ec6\u8282\u73b0\u5b9e\u4e4b\u95f4\u5bb9\u6613\u4e92\u76f8\u5361\u4f4f\u3002" },
    { left: "\u7533", right: "\u4ea5", name: "\u7533\u4ea5\u7a7f", effect: "\u53d8\u5316\u9700\u6c42\u548c\u7a33\u5b9a\u9884\u671f\u4e4b\u95f4\u5bb9\u6613\u51fa\u73b0\u6df1\u5c42\u6495\u626f\u3002" },
    { left: "\u9149", right: "\u620c", name: "\u9149\u620c\u7a7f", effect: "\u6807\u51c6\u611f\u548c\u5173\u7cfb\u611f\u53d7\u5bb9\u6613\u5f7c\u6b64\u4f24\u5230\u3002" },
  ].forEach((combo) => {
    if (hasAll([combo.left, combo.right])) add("\u7a7f", combo.name, labelsOf([combo.left, combo.right]), combo.effect);
  });

  Object.entries(
    entries.reduce<Record<string, string[]>>((acc, item) => {
      const key = `${item.gan}${item.zhi}`;
      acc[key] = acc[key] || [];
      acc[key].push(item.label);
      return acc;
    }, {})
  ).forEach(([ganZhi, labels]) => {
    if (labels.length >= 2) add("\u4f0f\u541f", `${ganZhi}\u4f0f\u541f`, labels, "\u540c\u4e00\u67f1\u610f\u8c61\u91cd\u590d\u51fa\u73b0\uff0c\u76f8\u5173\u4e3b\u9898\u5f88\u5bb9\u6613\u88ab\u653e\u5927\u3002");
  });

  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      const left = entries[i];
      const right = entries[j];
      if (chongMap[left.zhi]?.match === right.zhi) {
        add("\u53cd\u541f", `${left.gan}${left.zhi}\u4e0e${right.gan}${right.zhi}\u53cd\u541f`, [left.label, right.label], "\u5bf9\u5e94\u67f1\u4f4d\u5f62\u6210\u5f3a\u5bf9\u7167\uff0c\u4e8b\u60c5\u5bb9\u6613\u53cd\u590d\u3001\u5bf9\u51b2\u3002");
      }
    }
  }

  return results;
}

export function getJiFang(dayGan: string) {
  const wx = getWuXingFromStem(dayGan);
  const table: Record<WuXing, { ji: string; xiong: string; color: string; num: string; jiWx: string }> = {
    木: { ji: "北方、东方", xiong: "西方", color: "黑色、绿色", num: "1、3", jiWx: "水、木" },
    火: { ji: "东方、南方", xiong: "北方", color: "绿色、红色", num: "3、7", jiWx: "木、火" },
    土: { ji: "南方、中央", xiong: "东方", color: "红色、黄色", num: "7、5", jiWx: "火、土" },
    金: { ji: "中央、西方", xiong: "南方", color: "黄色、白色", num: "5、9", jiWx: "土、金" },
    水: { ji: "西方、北方", xiong: "中央", color: "白色、黑色", num: "9、1", jiWx: "金、水" },
  };
  return table[wx];
}

export function getJiShi(dayZhi: string) {
  const zhiIdx = DI_ZHI.indexOf(dayZhi as never);
  const liuHe = [1, 0, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
  const sanHe1 = (zhiIdx + 4) % 12;
  const sanHe2 = (zhiIdx + 8) % 12;

  return [
    { zhi: DI_ZHI[liuHe[zhiIdx]], time: SHI_CHEN_TIMES[liuHe[zhiIdx]], level: "上吉", reason: "六合" },
    { zhi: DI_ZHI[sanHe1], time: SHI_CHEN_TIMES[sanHe1], level: "中吉", reason: "三合" },
    { zhi: DI_ZHI[sanHe2], time: SHI_CHEN_TIMES[sanHe2], level: "中吉", reason: "三合" },
  ];
}

export function getDailyFortune(dayGanZhi: { gan: string; zhi: string }, birthDayGan: string) {
  const dayWx = getWuXingFromStem(dayGanZhi.gan);
  const myWx = getWuXingFromStem(birthDayGan);
  const rel = SHENG_KE[myWx];

  if (dayWx === rel.beiSheng) {
    return {
      score: 92,
      theme: "大吉 · 贵人相助",
      advice: "今日得印星庇佑，气场提升，适合推进关键事项。",
      business: "适合谈判签约、重要沟通、向上汇报",
      people: "年长者、领导、专业人士更容易成为助力",
      caution: "顺势而为，但关键细节仍要复核",
    };
  }
  if (dayWx === myWx) {
    return {
      score: 78,
      theme: "中吉 · 同气相求",
      advice: "今日更适合团队协作与并肩推进，联动比单打独斗更有效。",
      business: "适合开会协同、共创、合伙沟通",
      people: "同辈、同事、同行更容易给到支持",
      caution: "注意边界与分工，避免争功",
    };
  }
  if (dayWx === rel.sheng) {
    return {
      score: 72,
      theme: "小吉 · 才华展现",
      advice: "今日利于表达、策划和创意输出，但要避免思路太散。",
      business: "适合内容创作、方案设计、表达展示",
      people: "年轻人、执行层更容易给到反馈",
      caution: "创意很多时，先抓一个主轴",
    };
  }
  if (dayWx === rel.ke) {
    return {
      score: 75,
      theme: "中吉 · 财星透出",
      advice: "今日利于推进成交、回款和资源置换，主动出击效果更好。",
      business: "适合销售、回款、商务合作、轻量投资判断",
      people: "客户、合作方是资源入口",
      caution: "有财可求，但忌贪快",
    };
  }
  return {
    score: 52,
    theme: "平运 · 守成为上",
    advice: "今日外部压力较强，适合完善准备、做复盘，不宜冒进。",
    business: "适合复盘、审查、学习、修正流程",
    people: "与上级或规则系统互动时要更稳",
    caution: "重要决策可以放慢半拍",
  };
}

export function getLiuNianFortune(liuNianGanZhi: { gan: string; zhi: string }, birthDayGan: string) {
  return getDailyFortune(liuNianGanZhi, birthDayGan);
}

export function getDayPillarForDate(date: Date) {
  const ganZhi = Solar.fromDate(date).getLunar().getEightChar().getDay();
  return { gan: ganZhi.charAt(0), zhi: ganZhi.charAt(1), ganZhi };
}

export function getYearPillarForDate(date: Date) {
  const ganZhi = Solar.fromDate(date).getLunar().getEightChar().getYear();
  return { gan: ganZhi.charAt(0), zhi: ganZhi.charAt(1), ganZhi };
}

export function computeChart(input: EngineInput): EngineOutput {
  const { solarDate, solarDateTime } = normalizeSolarInput(input);
  const { correctedTime, trueSolarOffsetMin } = getCorrectedTime(input, solarDateTime);
  const correctedSolar = Solar.fromDate(correctedTime);
  const correctedLunar = correctedSolar.getLunar();
  const eightChar = correctedLunar.getEightChar();

  const pillars: FourPillars = {
    year: buildPillar(eightChar.getYear()),
    month: buildPillar(eightChar.getMonth()),
    day: buildPillar(eightChar.getDay()),
    hour: buildPillar(eightChar.getTime()),
  };

  const hiddenStemMap = {
    year: eightChar.getYearHideGan(),
    month: eightChar.getMonthHideGan(),
    day: eightChar.getDayHideGan(),
    hour: eightChar.getTimeHideGan(),
  };

  const pillarDetails: EngineOutput["pillarDetails"] = {
    year: {
      stemTenGod: eightChar.getYearShiShenGan(),
      branchTenGods: eightChar.getYearShiShenZhi(),
      hiddenStems: hiddenStemMap.year,
      hiddenStemTenGods: hiddenStemMap.year.map((stem: string) => getTenGod(pillars.day.stem, stem)),
      naYin: eightChar.getYearNaYin(),
      xunKong: eightChar.getYearXunKong(),
    },
    month: {
      stemTenGod: eightChar.getMonthShiShenGan(),
      branchTenGods: eightChar.getMonthShiShenZhi(),
      hiddenStems: hiddenStemMap.month,
      hiddenStemTenGods: hiddenStemMap.month.map((stem: string) => getTenGod(pillars.day.stem, stem)),
      naYin: eightChar.getMonthNaYin(),
      xunKong: eightChar.getMonthXunKong(),
    },
    day: {
      stemTenGod: eightChar.getDayShiShenGan(),
      branchTenGods: eightChar.getDayShiShenZhi(),
      hiddenStems: hiddenStemMap.day,
      hiddenStemTenGods: hiddenStemMap.day.map((stem: string) => getTenGod(pillars.day.stem, stem)),
      naYin: eightChar.getDayNaYin(),
      xunKong: eightChar.getDayXunKong(),
    },
    hour: {
      stemTenGod: eightChar.getTimeShiShenGan(),
      branchTenGods: eightChar.getTimeShiShenZhi(),
      hiddenStems: hiddenStemMap.hour,
      hiddenStemTenGods: hiddenStemMap.hour.map((stem: string) => getTenGod(pillars.day.stem, stem)),
      naYin: eightChar.getTimeNaYin(),
      xunKong: eightChar.getTimeXunKong(),
    },
  };
  const diShiDetails = {
    year: eightChar.getYearDiShi(),
    month: eightChar.getMonthDiShi(),
    day: eightChar.getDayDiShi(),
    hour: eightChar.getTimeDiShi(),
  };
  const xunDetails = {
    year: eightChar.getYearXun(),
    month: eightChar.getMonthXun(),
    day: eightChar.getDayXun(),
    hour: eightChar.getTimeXun(),
  };
  const shenShaDetails = buildAcademicShenShaDetails(pillars, {
    gender: input.gender,
    dayNaYin: pillarDetails.day.naYin,
  });
  const specialCombinations = buildSpecialCombinationsV2(pillars);

  const lunar = solarToLunar(correctedTime);
  const wuXingCount = countWuXing(pillars, hiddenStemMap);
  const total = Object.values(wuXingCount).reduce((sum, value) => sum + value, 0) || 1;
  const wuXingRatio = Object.fromEntries(
    FIVE_ELEMENTS.map((item) => [item, Number((wuXingCount[item] / total).toFixed(4))])
  ) as Record<WuXing, number>;

  const analysis = analyzePillars({ pillars, wuXingCount } as any);
  const tenGods = {
    year: getTenGod(pillars.day.stem, pillars.year.stem),
    month: getTenGod(pillars.day.stem, pillars.month.stem),
    hour: getTenGod(pillars.day.stem, pillars.hour.stem),
    summary: buildTenGodSummary({
      year: getTenGod(pillars.day.stem, pillars.year.stem),
      month: getTenGod(pillars.day.stem, pillars.month.stem),
      hour: getTenGod(pillars.day.stem, pillars.hour.stem),
    }),
  };

  const naYinDetails = {
    year: eightChar.getYearNaYin(),
    month: eightChar.getMonthNaYin(),
    day: eightChar.getDayNaYin(),
    hour: eightChar.getTimeNaYin(),
  };
  const kongWangDetails = {
    year: eightChar.getYearXunKong(),
    month: eightChar.getMonthXunKong(),
    day: eightChar.getDayXunKong(),
    hour: eightChar.getTimeXunKong(),
  };

  const now = new Date();
  const todayPillar = getDayPillarForDate(now);
  const liuNianPillar = { ...getYearPillarForDate(now), year: now.getFullYear() };
  const daYun = buildDaYunList(eightChar, input.gender || "male");
  const classicalDecisionRules = buildClassicalDecisionRules({
    correctedTime,
    analysis,
    daYun,
    liuNianPillar,
  });
  const currentJieqiMonth = getCurrentJieqiMonth(correctedTime);
  const nextJieqi = getDaysToNextJieqi(correctedTime);
  const birthYearJieqi = getJieqiCalendar(solarDate.getFullYear(), solarDate);

  return {
    solarDate,
    lunar,
    pillars,
    trueSolarOffsetMin,
    correctedTime,
    currentJieqiMonth,
    nextJieqi,
    birthYearJieqi,
    tenGods,
    wuXingCount,
    wuXingRatio,
    analysis,
    naYin: naYinDetails.day,
    naYinDetails,
    kongWang: [
      `年柱 ${kongWangDetails.year}`,
      `月柱 ${kongWangDetails.month}`,
      `日柱 ${kongWangDetails.day}`,
      `时柱 ${kongWangDetails.hour}`,
    ],
    kongWangDetails,
    pillarDetails,
    diShiDetails,
    xunDetails,
    shenShaDetails,
    specialCombinations,
    taiYuan: eightChar.getTaiYuan(),
    mingGong: eightChar.getMingGong(),
    shenGong: eightChar.getShenGong(),
    taiXi: eightChar.getTaiXi(),
    daYun,
    classicalDecisionRules,
    liuNianPillar,
    todayPillar: { ...todayPillar, date: formatDate(now) },
    guiRen: getTianYiGuiRen(pillars.day.stem),
    wenChang: getWenChangGuiRen(pillars.day.stem),
    yiMa: getYiMa(pillars.day.branch),
    formatted: {
      pillarsTable: formatPillarsTable({
        pillars,
        pillarDetails,
        lunar,
        naYinDetails,
        kongWangDetails,
        correctedTime,
        trueSolarOffsetMin,
      }),
      lunarDateStr: formatLunarDate(lunar),
      birthSummary: `${formatDate(solarDate)} ${input.birthTime} ${input.birthCity}${trueSolarOffsetMin !== undefined ? `（真太阳时 ${trueSolarOffsetMin >= 0 ? "+" : ""}${trueSolarOffsetMin.toFixed(1)} 分钟）` : ""}`,
      ganzhi: `${pillars.year.name}年 ${pillars.month.name}月 ${pillars.day.name}日 ${pillars.hour.name}时`,
    },
  };
}

export function getTodayHint(chart: EngineOutput) {
  const dayStemStrength = chart.analysis.dayStemStrength;
  const keyword = dayStemStrength === "旺" ? "主动推进" : dayStemStrength === "相" ? "稳步修整" : "借力前行";
  const body =
    dayStemStrength === "旺"
      ? "今天适合推进重要事项，但要避免过度发散。"
      : dayStemStrength === "相"
      ? "今天更适合校准节奏，先把判断做稳，再决定怎么动。"
      : "今天适合借人借势，先补能量，再做关键推进。";

  return {
    keyword,
    body,
    jieqiName: chart.nextJieqi.next.name,
    daysToNext: chart.nextJieqi.days,
  };
}

export function getStageSummary(chart: EngineOutput) {
  const actions =
    chart.analysis.dayStemStrength === "旺"
      ? ["主动推进重点事项", "避免同时开太多战线", "减少情绪化承诺"]
      : chart.analysis.dayStemStrength === "相"
      ? ["先确认优先级", "按周推进关键节点", "保持作息稳定"]
      : ["优先补能量", "多借外力合作", "缩短犹豫时间"];

  return {
    stageName: `${chart.currentJieqiMonth.currentJieqi.name}阶段`,
    stageSummary: chart.analysis.gejuHint,
    actions,
    monthInfo: `距离下一节气 ${chart.nextJieqi.next.name} 还有 ${chart.nextJieqi.days} 天`,
  };
}

export function getWuXingRadar(chart: EngineOutput) {
  const colorMap: Record<WuXing, string> = {
    木: "#4CAF50",
    火: "#FF5722",
    土: "#FF9800",
    金: "#9E9E9E",
    水: "#2196F3",
  };

  return FIVE_ELEMENTS.map((item) => ({
    name: item,
    value: Math.round((chart.wuXingRatio[item] || 0) * 100),
    color: colorMap[item],
  }));
}

export {
  lunarToSolar,
  solarToLunar,
  getLunarYearInfo,
  getLunarMonthDays,
  formatLunarDate,
  formatSolarAsLunar,
  getGanZhi,
  getZodiac,
  getJieqi,
  getJieqiList,
  getCurrentJieqiMonth,
  getDaysToNextJieqi,
  getJieqiCalendar,
  isJieqi,
  cityTrueSolarOffset,
  toTrueSolarTime,
  getCityLon,
  getTenGod,
  getWuXingFromStem,
  getWuXingFromBranch,
  LunarDate,
  JieqiName,
  JieqiEntry,
  JieqiCalendarItem,
  FourPillars,
  Pillar,
  TenGod,
  WuXing,
};
