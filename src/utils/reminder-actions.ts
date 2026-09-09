import { addAnimal, type Animal } from "@/state/animal";
import type { ReminderRoutine } from "@/state/care-schedule";
import type { ActivityType } from "@/constants/theme";
import { createFeedingActivity, feedingStore } from "@/state/feeding";
import { createHabitatActivity, habitatStore } from "@/state/habitat";
import { changedWater, cleanedEnclosure, wasAccepted } from "@/state/summary";
import { calendarDateOf, toCalendarDate } from "@/utils/format-date";
import type { CareReminder } from "@/utils/care-reminders";

export const ROUTINE_CATEGORY: Record<ReminderRoutine, ActivityType> = {
  feed: "feed",
  water: "habitat",
  cleaning: "habitat",
};

export function routineHref(reminder: CareReminder) {
  return reminder.routine === "feed"
    ? (`/animal/${reminder.animalId}/feed` as const)
    : (`/animal/${reminder.animalId}/habitat?routine=${reminder.routine}` as const);
}

function alreadyDoneToday(animalId: string, routine: ReminderRoutine): boolean {
  const today = toCalendarDate(new Date());

  if (routine === "feed") {
    return Object.values(feedingStore.$.peek()).some(
      (record) =>
        record.animalId === animalId &&
        wasAccepted(record) &&
        calendarDateOf(record.occurredAt) === today,
    );
  }

  const qualifies = routine === "water" ? changedWater : cleanedEnclosure;

  return Object.values(habitatStore.$.peek()).some(
    (record) =>
      record.animalId === animalId &&
      qualifies(record) &&
      calendarDateOf(record.occurredAt) === today,
  );
}

export function markRoutineDone(
  animalId: string,
  routine: ReminderRoutine,
): boolean {
  if (alreadyDoneToday(animalId, routine)) return false;

  if (routine === "feed") {
    feedingStore.add(createFeedingActivity({ animalId }));
    return true;
  }

  habitatStore.add(
    createHabitatActivity({
      animalId,
      water: routine === "water",
      cleaning: routine === "cleaning",
    }),
  );
  return true;
}

export function stopReminding(animal: Animal, routine: ReminderRoutine): void {
  addAnimal({
    ...animal,
    reminders: { ...animal.reminders, [routine]: false },
  });
}
