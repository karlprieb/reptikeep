import i18n from "@/i18n";

import { dateFormatter } from "./intl-cache";

function absoluteDateFormatter(): Intl.DateTimeFormat {
  return dateFormatter(i18n.language, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function isPortuguese(): boolean {
  return i18n.language === "pt" || i18n.language === "pt-BR";
}

type YearMonthDay = { year: number; month: number; day: number };

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28;
  }

  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function parseIsoCalendarDate(value: string): YearMonthDay | null {
  if (typeof value !== "string") return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return null;
  }

  if (!value.includes("T")) return { year, month, day };

  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) return null;

  return {
    year: instant.getFullYear(),
    month: instant.getMonth() + 1,
    day: instant.getDate(),
  };
}

export function toCalendarDate(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function fromUtcMidnight(date: Date): Date {
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function fromCalendarDate(value: string): Date | null {
  const parsed = parseIsoCalendarDate(value);
  if (!parsed) return null;

  return new Date(parsed.year, parsed.month - 1, parsed.day);
}

export function calendarDateOf(value: string): string | null {
  const day = fromCalendarDate(value);
  return day && toCalendarDate(day);
}

export function formatAbsoluteDate(value: string): string {
  const parsed = parseIsoCalendarDate(value);
  if (!parsed) return "—";

  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));

  if (!isPortuguese()) return absoluteDateFormatter().format(date);

  const formatPart = (options: Intl.DateTimeFormatOptions) =>
    dateFormatter(i18n.language, { ...options, timeZone: "UTC" }).format(date);

  return [
    formatPart({ day: "numeric" }),
    formatPart({ month: "short" }),
    formatPart({ year: "numeric" }),
  ].join(" ");
}

export function formatAxisDate(value: string): string {
  const parsed = parseIsoCalendarDate(value);
  if (!parsed) return "—";

  return dateFormatter(i18n.language, {
    month: "numeric",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day)));
}

function timeFormatter(): Intl.DateTimeFormat {
  return dateFormatter(i18n.language, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatAbsoluteTime(value: string): string | null {
  if (typeof value !== "string" || !value.includes("T")) return null;

  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) return null;

  return timeFormatter().format(instant);
}

export function formatClockTime(hour: number, minute: number): string {
  return timeFormatter().format(atClockTime(new Date(), hour, minute));
}

export function atClockTime(day: Date, hour: number, minute: number): Date {
  const at = new Date(day);
  at.setHours(hour, minute, 0, 0);

  return at;
}

const MS_PER_DAY = 86_400_000;

export const DAYS_BEFORE_MONTHS = 31;

export function daysSince(
  value: string,
  now: Date = new Date(),
): number | null {
  const parsed = parseIsoCalendarDate(value);
  if (!parsed) return null;

  const from = Date.UTC(parsed.year, parsed.month - 1, parsed.day);
  const to = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

  return Math.max(0, Math.round((to - from) / MS_PER_DAY));
}

export function relativeYearsMonths(
  value: string,
  now: Date = new Date(),
): { years: number; months: number } | null {
  const parsed = parseIsoCalendarDate(value);
  if (!parsed) return null;

  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1;
  const nowDay = now.getDate();

  let years = nowYear - parsed.year;
  let months = nowMonth - parsed.month;

  if (nowDay < parsed.day) {
    months -= 1;
  }

  if (months < 0) {
    months += 12;
    years -= 1;
  }

  if (years < 0) {
    years = 0;
    months = 0;
  }

  return { years, months };
}
