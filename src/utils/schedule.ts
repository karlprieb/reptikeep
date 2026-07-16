import type { CareSchedule } from "@/state/care-schedule";
import { daysSince } from "@/utils/format-date";

const FIXED_INTERVAL_DAYS = {
  daily: 1,
  everyOtherDay: 2,
  weekly: 7,
  everyTwoWeeks: 14,
  monthly: 30,
} as const;

export function scheduleIntervalDays(schedule: CareSchedule): number | null {
  if (schedule.frequency !== "custom") {
    return FIXED_INTERVAL_DAYS[schedule.frequency];
  }

  return Number.isInteger(schedule.days) && schedule.days > 0
    ? schedule.days
    : null;
}

export function scheduleDaysOverdue(
  lastOccurredAt: string | undefined,
  schedule: CareSchedule | undefined,
  now?: Date,
): number | null {
  if (!lastOccurredAt || !schedule) return null;

  const elapsedDays = daysSince(lastOccurredAt, now);
  const intervalDays = scheduleIntervalDays(schedule);
  if (elapsedDays === null || intervalDays === null) return null;

  const overdue = elapsedDays - intervalDays;
  return overdue > 0 ? overdue : null;
}
