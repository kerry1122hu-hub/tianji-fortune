import { Lunar, LunarYear, Solar } from 'lunar-typescript';

export type LunarDate = {
  year: number;
  month: number;
  day: number;
  isLeapMonth: boolean;
  yearName?: string;
  zodiac?: string;
  monthName?: string;
  dayName?: string;
};

export type LunarYearInfo = {
  year: number;
  springFestival: Date;
  leapMonth: number;
  monthDays: number[];
  totalDays: number;
};

function assertRange(year: number) {
  if (year < 1900 || year > 2100) {
    throw new RangeError(`农历年 ${year} 超出支持范围 (1900-2100)`);
  }
}

function buildLunarDate(lunar: InstanceType<typeof Lunar>): LunarDate {
  const rawMonth = lunar.getMonth();
  return {
    year: lunar.getYear(),
    month: Math.abs(rawMonth),
    day: lunar.getDay(),
    isLeapMonth: rawMonth < 0,
    yearName: `${lunar.getYearInGanZhi()}年`,
    zodiac: lunar.getYearShengXiao(),
    monthName: `${rawMonth < 0 ? '闰' : ''}${lunar.getMonthInChinese()}月`,
    dayName: lunar.getDayInChinese(),
  };
}

export function getLunarYearInfo(lunarYear: number): LunarYearInfo {
  assertRange(lunarYear);
  const year = LunarYear.fromYear(lunarYear);
  const months = year
    .getMonths()
    .filter((item) => item.getYear() === lunarYear)
    .sort((left, right) => Math.abs(left.getMonth()) - Math.abs(right.getMonth()) || left.getMonth() - right.getMonth());
  const leapMonth = months.find((item) => item.isLeap())?.getMonth() || 0;
  const springFestival = Lunar.fromYmd(lunarYear, 1, 1).getSolar();

  return {
    year: lunarYear,
    springFestival: new Date(springFestival.getYear(), springFestival.getMonth() - 1, springFestival.getDay()),
    leapMonth: Math.abs(leapMonth),
    monthDays: months.map((item) => item.getDayCount()),
    totalDays: months.reduce((sum, item) => sum + item.getDayCount(), 0),
  };
}

export function lunarToSolar(lunar: LunarDate): Date {
  assertRange(lunar.year);
  const lunarMonth = lunar.isLeapMonth ? -Math.abs(lunar.month) : Math.abs(lunar.month);
  const date = Lunar.fromYmd(lunar.year, lunarMonth, lunar.day).getSolar();
  return new Date(date.getYear(), date.getMonth() - 1, date.getDay());
}

export function solarToLunar(date: Date): LunarDate {
  const solar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate());
  return buildLunarDate(solar.getLunar());
}

export function getLunarMonthDays(lunarYear: number, month: number, isLeap = false): number {
  assertRange(lunarYear);
  const year = LunarYear.fromYear(lunarYear);
  const targetMonth = isLeap ? -Math.abs(month) : Math.abs(month);
  const found = year
    .getMonths()
    .find((item) => item.getYear() === lunarYear && item.getMonth() === targetMonth);
  return found ? found.getDayCount() : 0;
}

export function getHeavenlyStem(lunarYear: number): string {
  assertRange(lunarYear);
  return Lunar.fromYmd(lunarYear, 1, 1).getYearGan();
}

export function getEarthlyBranch(lunarYear: number): string {
  assertRange(lunarYear);
  return Lunar.fromYmd(lunarYear, 1, 1).getYearZhi();
}

export function getZodiac(lunarYear: number): string {
  assertRange(lunarYear);
  return Lunar.fromYmd(lunarYear, 1, 1).getYearShengXiao();
}

export function getGanZhi(lunarYear: number): string {
  assertRange(lunarYear);
  return Lunar.fromYmd(lunarYear, 1, 1).getYearInGanZhi();
}

export function formatLunarDate(lunar: LunarDate): string {
  const lunarMonth = lunar.isLeapMonth ? -Math.abs(lunar.month) : Math.abs(lunar.month);
  const source = Lunar.fromYmd(lunar.year, lunarMonth, lunar.day);
  return `${source.getYearInGanZhi()}年（${source.getYearShengXiao()}年）${lunar.isLeapMonth ? '闰' : ''}${source.getMonthInChinese()}月${source.getDayInChinese()}`;
}

export function formatSolarAsLunar(date: Date): string {
  return formatLunarDate(solarToLunar(date));
}
