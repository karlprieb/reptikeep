import type { ActivityType } from "@/constants/theme";
import type { AnimalActivity } from "@/utils/animal-activity";
import { calendarDateOf, toCalendarDate } from "@/utils/format-date";

export type RangePreset = "all" | "7d" | "30d" | "3m" | "1y";

export type DateFilter =
  { preset: RangePreset } | { preset: "custom"; from: string; to: string };

export const RANGE_PRESETS: RangePreset[] = ["all", "7d", "30d", "3m", "1y"];

function monthsBefore(now: Date, months: number): Date {
  const shifted = new Date(now.getFullYear(), now.getMonth() - months, 1);
  const lastDay = new Date(
    shifted.getFullYear(),
    shifted.getMonth() + 1,
    0,
  ).getDate();
  shifted.setDate(Math.min(now.getDate(), lastDay));

  return shifted;
}

export function isRangePreset(value: string | undefined): value is RangePreset {
  return value !== undefined && (RANGE_PRESETS as string[]).includes(value);
}

export function resolveDateFilter(
  filter: DateFilter,
  now: Date = new Date(),
): { from: string; to: string } | null {
  if (filter.preset === "custom") {
    return { from: filter.from, to: filter.to };
  }

  if (filter.preset === "all") return null;

  const from = new Date(now);

  switch (filter.preset) {
    case "7d":
      from.setDate(from.getDate() - 6);
      break;
    case "30d":
      from.setDate(from.getDate() - 29);
      break;
    case "3m":
      return {
        from: toCalendarDate(monthsBefore(now, 3)),
        to: toCalendarDate(now),
      };
    case "1y":
      return {
        from: toCalendarDate(monthsBefore(now, 12)),
        to: toCalendarDate(now),
      };
  }

  return { from: toCalendarDate(from), to: toCalendarDate(now) };
}

export function filterActivity(
  entries: AnimalActivity[],
  filter: DateFilter,
  type: ActivityType | null,
  now: Date = new Date(),
): AnimalActivity[] {
  const range = resolveDateFilter(filter, now);

  return entries.filter((entry) => {
    if (type && entry.type !== type) return false;
    if (!range) return true;

    const day = calendarDateOf(entry.occurredAt);
    if (!day) return false;

    return range.from <= day && day <= range.to;
  });
}
