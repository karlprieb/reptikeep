import { observable } from "@legendapp/state";
import { syncObservable } from "@legendapp/state/sync";

import { persistPlugin } from "./persist";

export const SCHEDULE_FREQUENCIES = [
  "daily",
  "everyOtherDay",
  "weekly",
  "everyTwoWeeks",
  "monthly",
  "custom",
] as const;

export type ScheduleFrequency = (typeof SCHEDULE_FREQUENCIES)[number];

export type CareSchedule =
  | { frequency: Exclude<ScheduleFrequency, "custom"> }
  | { frequency: "custom"; days: number };

export type AnimalSchedule = CareSchedule | { frequency: "off" };

export const careSchedules$ = observable<{ water?: CareSchedule }>({});

syncObservable(careSchedules$, {
  persist: {
    name: "care-schedules",
    plugin: persistPlugin,
  },
});

export function resolveSchedule(
  collection: CareSchedule | undefined,
  animal: AnimalSchedule | undefined,
): CareSchedule | undefined {
  if (!animal) return collection;

  return animal.frequency === "off" ? undefined : animal;
}
