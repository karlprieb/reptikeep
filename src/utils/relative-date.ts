import type { TFunction } from "i18next";

import {
  DAYS_BEFORE_MONTHS,
  daysSince,
  relativeYearsMonths,
} from "@/utils/format-date";

export function relativeLine(
  iso: string,
  suffix: "old" | "ago",
  t: TFunction,
  now?: Date,
): string {
  const days = daysSince(iso, now);
  if (days === null) return t("detail.unknownValue");

  if (days >= DAYS_BEFORE_MONTHS) {
    const duration = relativeYearsMonths(iso, now);
    if (duration === null) return t("detail.unknownValue");

    if (duration.years === 0) {
      const key =
        suffix === "old"
          ? "detail.relative.monthsOld"
          : "detail.relative.monthsAgo";
      return t(key, { count: duration.months });
    }

    if (duration.months === 0) {
      const key =
        suffix === "old"
          ? "detail.relative.yearsOld"
          : "detail.relative.yearsAgo";
      return t(key, { count: duration.years });
    }

    const key =
      suffix === "old"
        ? "detail.relative.yearsMonthsOld"
        : "detail.relative.yearsMonthsAgo";

    return t(key, { years: duration.years, count: duration.months });
  }

  if (suffix === "old") {
    return days === 0
      ? t("detail.relative.bornToday")
      : t("detail.relative.daysOld", { count: days });
  }

  if (days === 0) return t("detail.relative.today");
  if (days === 1) return t("detail.relative.yesterday");
  return t("detail.relative.daysAgo", { count: days });
}
