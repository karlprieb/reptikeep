import type { TFunction } from "i18next";

import type {
  AnimalSchedule,
  CareSchedule,
  ScheduleFrequency,
} from "@/state/care-schedule";
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

export const SCHEDULE_INHERIT = "inherit";
export const SCHEDULE_OFF = "off";

export type ScheduleSelection =
  ScheduleFrequency | typeof SCHEDULE_INHERIT | typeof SCHEDULE_OFF;

export function scheduleSelection(
  schedule: AnimalSchedule | undefined,
  absent: ScheduleSelection,
): ScheduleSelection {
  return schedule?.frequency ?? absent;
}

export function scheduleCustomDays(
  schedule: AnimalSchedule | undefined,
): string {
  return schedule?.frequency === "custom" ? String(schedule.days) : "";
}

export function isScheduleValid(
  selection: ScheduleSelection,
  customDays: string,
): boolean {
  if (selection !== "custom") return true;

  const days = Number(customDays.trim());
  return customDays.trim().length > 0 && Number.isInteger(days) && days > 0;
}

export function scheduleFromFields(
  selection: ScheduleSelection,
  customDays: string,
): AnimalSchedule | undefined {
  if (selection === SCHEDULE_INHERIT) return undefined;
  if (selection === SCHEDULE_OFF) return { frequency: SCHEDULE_OFF };
  if (selection !== "custom") return { frequency: selection };

  return { frequency: "custom", days: Number(customDays.trim()) };
}

export function careScheduleFromFields(
  selection: ScheduleSelection,
  customDays: string,
): CareSchedule | undefined {
  const schedule = scheduleFromFields(selection, customDays);
  return schedule?.frequency === SCHEDULE_OFF ? undefined : schedule;
}

export function describeSchedule(
  schedule: CareSchedule | undefined,
  t: TFunction,
): string {
  if (!schedule) return t("schedule.off");

  return schedule.frequency === "custom"
    ? t("schedule.everyDays", { count: schedule.days })
    : t(`schedule.frequency.${schedule.frequency}`);
}
