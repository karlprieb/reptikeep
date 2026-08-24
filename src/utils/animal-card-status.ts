import type { Animal } from "@/state/animal";
import type { CareSchedule } from "@/state/care-schedule";
import { scheduleDaysOverdue } from "@/utils/schedule";

export const SEX_SYMBOLS: Record<Animal["sex"], string | null> = {
  unknown: null,
  male: "♂",
  female: "♀",
};

export const CARD_ASPECT_RATIO = 0.8;

export type OverdueInput = {
  feedingSchedule?: CareSchedule;
  lastFedAt?: string;
  waterSchedule?: CareSchedule;
  lastWaterChangeAt?: string;
  cleaningSchedule?: CareSchedule;
  lastCleanAt?: string;
};

export function overdueRoutines(input: OverdueInput) {
  return {
    feed: scheduleDaysOverdue(input.lastFedAt, input.feedingSchedule) !== null,
    water:
      scheduleDaysOverdue(input.lastWaterChangeAt, input.waterSchedule) !==
      null,
    cleaning:
      scheduleDaysOverdue(input.lastCleanAt, input.cleaningSchedule) !== null,
  };
}

export function overdueCount(input: OverdueInput): number {
  return Object.values(overdueRoutines(input)).filter(Boolean).length;
}
