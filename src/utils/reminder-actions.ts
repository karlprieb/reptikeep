import { addAnimal, type Animal } from "@/state/animal";
import type { ReminderRoutine } from "@/state/care-schedule";
import type { ActivityType } from "@/constants/theme";
import { createFeedingActivity, feedingStore } from "@/state/feeding";
import { createHabitatActivity, habitatStore } from "@/state/habitat";
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

export function markRoutineDone(
  animalId: string,
  routine: ReminderRoutine,
): void {
  if (routine === "feed") {
    feedingStore.add(createFeedingActivity({ animalId }));
    return;
  }

  habitatStore.add(
    createHabitatActivity({
      animalId,
      water: routine === "water",
      cleaning: routine === "cleaning",
    }),
  );
}

export function stopReminding(animal: Animal, routine: ReminderRoutine): void {
  addAnimal({
    ...animal,
    reminders: { ...animal.reminders, [routine]: false },
  });
}
