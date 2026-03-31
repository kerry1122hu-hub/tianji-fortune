import {
  DI_ZHI,
  SHENG_KE,
  TIAN_GAN,
  WX_EMOJIS,
  getDailyFortune,
  getDayPillarForDate,
  getJiFang,
  getJiShi,
  getWuXingFromStem,
} from "../engines/engine_index";
import { Solar } from "lunar-typescript";

function formatLunarInfo(date) {
  const solar = Solar.fromDate(date);
  const lunar = solar.getLunar();
  const jie = lunar.getJie();
  const qi = lunar.getQi();
  const times = (lunar.getTimes?.() || []).map((item) => ({
    ganZhi: item.getGanZhi?.() || "--",
    zhi: item.getZhi?.() || "--",
    tianShen: item.getTianShen?.() || "--",
    luck: item.getTianShenLuck?.() || "--",
    start: item.getMinHm?.() || "--",
    end: item.getMaxHm?.() || "--",
    yi: item.getYi?.() || [],
    ji: item.getJi?.() || [],
  }));

  return {
    lunarDateText: `农历${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
    lunarMonthText: lunar.getMonthInChinese(),
    lunarDayText: lunar.getDayInChinese(),
    yearGanZhi: lunar.getYearInGanZhi(),
    monthGanZhi: lunar.getMonthInGanZhi(),
    dayGanZhi: lunar.getDayInGanZhi(),
    solarTerm: jie || qi || "--",
    pengZu: lunar.getPengZuGan?.() && lunar.getPengZuZhi?.() ? `${lunar.getPengZuGan()} ${lunar.getPengZuZhi()}` : "--",
    dayYi: lunar.getDayYi?.() || [],
    dayJi: lunar.getDayJi?.() || [],
    xiu: lunar.getXiu?.() || "--",
    zheng: lunar.getZheng?.() || "--",
    animal: lunar.getAnimal?.() || "--",
    times,
  };
}

function getSpecialTags(dayPillar, birthDayGan, score) {
  const tags = [];
  const dayWx = getWuXingFromStem(dayPillar.gan);
  const myWx = getWuXingFromStem(birthDayGan);
  const rel = SHENG_KE[myWx];

  const guiRenMap = {
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

  if (guiRenMap[birthDayGan]?.includes(dayPillar.zhi)) {
    tags.push({ type: "guiren", label: { "zh-Hans": "贵人日", "zh-Hant": "貴人日", en: "Noble Day" } });
  }

  if (score >= 90) {
    tags.push({ type: "tianDe", label: { "zh-Hans": "大吉日", "zh-Hant": "大吉日", en: "Great Day" } });
  }

  if (dayWx === rel.ke) {
    tags.push({ type: "wealth", label: { "zh-Hans": "财星日", "zh-Hant": "財星日", en: "Wealth Day" } });
  }

  if (dayWx === rel.beiSheng) {
    tags.push({ type: "resource", label: { "zh-Hans": "印星日", "zh-Hant": "印星日", en: "Support Day" } });
  }

  return tags;
}

function getYiJi(dayPillar, birthDayGan) {
  const dayWx = getWuXingFromStem(dayPillar.gan);
  const myWx = getWuXingFromStem(birthDayGan);
  const rel = SHENG_KE[myWx];
  const yi = [];
  const ji = [];

  if (dayWx === rel.beiSheng) {
    yi.push({ "zh-Hans": "签约", "zh-Hant": "簽約", en: "Sign contracts" });
    yi.push({ "zh-Hans": "拜访客户", "zh-Hant": "拜訪客戶", en: "Visit clients" });
    yi.push({ "zh-Hans": "求职面试", "zh-Hant": "求職面試", en: "Job interviews" });
    ji.push({ "zh-Hans": "冒险投资", "zh-Hant": "冒險投資", en: "Risky investments" });
  } else if (dayWx === myWx) {
    yi.push({ "zh-Hans": "团队协作", "zh-Hant": "團隊協作", en: "Teamwork" });
    yi.push({ "zh-Hans": "合伙洽谈", "zh-Hant": "合伙洽談", en: "Partnerships" });
    ji.push({ "zh-Hans": "独自决策", "zh-Hant": "獨自決策", en: "Solo decisions" });
    ji.push({ "zh-Hans": "借贷担保", "zh-Hant": "借貸擔保", en: "Loans & guarantees" });
  } else if (dayWx === rel.sheng) {
    yi.push({ "zh-Hans": "创意策划", "zh-Hant": "創意策劃", en: "Creative planning" });
    yi.push({ "zh-Hans": "文案写作", "zh-Hant": "文案寫作", en: "Content writing" });
    ji.push({ "zh-Hans": "争执硬碰", "zh-Hant": "爭執硬碰", en: "Heated conflicts" });
  } else if (dayWx === rel.ke) {
    yi.push({ "zh-Hans": "催收回款", "zh-Hant": "催收回款", en: "Collect payments" });
    yi.push({ "zh-Hans": "商务推进", "zh-Hant": "商務推進", en: "Business development" });
    ji.push({ "zh-Hans": "大额消费", "zh-Hant": "大額消費", en: "Big purchases" });
  } else {
    yi.push({ "zh-Hans": "复盘总结", "zh-Hant": "復盤總結", en: "Review & reflect" });
    yi.push({ "zh-Hans": "学习充电", "zh-Hant": "學習充電", en: "Study & learn" });
    ji.push({ "zh-Hans": "启动新项目", "zh-Hant": "啟動新項目", en: "Start new projects" });
    ji.push({ "zh-Hans": "冲动消费", "zh-Hant": "衝動消費", en: "Impulse spending" });
  }

  return { yi, ji };
}

function markBestDays(calendar) {
  if (!calendar.length) return;
  const sorted = [...calendar].sort((a, b) => b.fortune.score - a.fortune.score);

  const bestSign = sorted.find((item) => item.fortune.score >= 85);
  if (bestSign) {
    bestSign.tags.push({
      type: "bestSign",
      label: { "zh-Hans": "最佳签约日", "zh-Hant": "最佳簽約日", en: "Best Signing Day" },
    });
  }

  const bestWealth = sorted.find((item) => item.tags.some((tag) => tag.type === "wealth") && item !== bestSign);
  if (bestWealth) {
    bestWealth.tags.push({
      type: "bestWealth",
      label: { "zh-Hans": "最佳求财日", "zh-Hant": "最佳求財日", en: "Best Wealth Day" },
    });
  }
}

export function generateFortuneCalendar(birthDayGan, days = 30, startDate = null) {
  const start = startDate ? new Date(startDate) : new Date();
  const calendar = [];

  for (let index = 0; index < days; index += 1) {
    const date = new Date(start);
    date.setDate(date.getDate() + index);

    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekDay = date.getDay();
    const dayPillar = getDayPillarForDate(date);
    const fortune = getDailyFortune(dayPillar, birthDayGan);
    const jiFang = getJiFang(birthDayGan);
    const jiShi = getJiShi(dayPillar.zhi);
    const lunarInfo = formatLunarInfo(date);
    const tags = getSpecialTags(dayPillar, birthDayGan, fortune.score);
    const yiJi = getYiJi(dayPillar, birthDayGan);

    calendar.push({
      date: { year, month, day, weekDay },
      dateStr: `${year}-${`${month}`.padStart(2, "0")}-${`${day}`.padStart(2, "0")}`,
      dayPillar,
      fortune,
      jiFang,
      luckyDirection: jiFang?.ji || "--",
      unluckyDirection: jiFang?.xiong || "--",
      luckyColor: jiFang?.color || "--",
      luckyNumber: jiFang?.num || "--",
      luckyElements: jiFang?.jiWx || "--",
      jiShi,
      lunarInfo,
      hourlyLuck: lunarInfo.times,
      tags,
      yiJi,
      isToday: index === 0,
      isWeekend: weekDay === 0 || weekDay === 6,
    });
  }

  markBestDays(calendar);
  return calendar;
}

export function getMonthSummary(calendar) {
  const scores = calendar.map((item) => item.fortune.score);
  const averageScore = Math.round(scores.reduce((sum, value) => sum + value, 0) / (scores.length || 1));
  const bestScore = Math.max(...scores);
  const worstScore = Math.min(...scores);
  const bestDay = calendar.find((item) => item.fortune.score === bestScore);
  const worstDay = calendar.find((item) => item.fortune.score === worstScore);

  return {
    averageScore,
    bestScore,
    worstScore,
    goodDays: scores.filter((item) => item >= 75).length,
    cautionDays: scores.filter((item) => item < 60).length,
    bestDay,
    worstDay,
    totalDays: calendar.length,
  };
}

export { DI_ZHI, SHENG_KE, TIAN_GAN, WX_EMOJIS };
