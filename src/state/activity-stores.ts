import { batch } from "@legendapp/state";

import type { ActivityType } from "@/constants/theme";
import { deleteManagedAnimalDocument } from "@/utils/animal-document-storage";

import { defecationStore } from "./defecation";
import { feedingStore } from "./feeding";
import { habitatStore } from "./habitat";
import { removeDocumentsForActivity } from "./document";
import { medicalStore } from "./medical";
import { shedStore } from "./shed";
import { summaryState$ } from "./summary";
import { weightStore } from "./weight";

export const activityStores = {
  feed: feedingStore,
  weight: weightStore,
  shed: shedStore,
  poop: defecationStore,
  habitat: habitatStore,
  medical: medicalStore,
} as const;

export function removeActivity(type: ActivityType, id: string): void {
  let linked: ReturnType<typeof removeDocumentsForActivity> = [];

  batch(() => {
    activityStores[type].remove(id);
    if (type === "medical") linked = removeDocumentsForActivity(type, id);
  });

  for (const document of linked) {
    try {
      deleteManagedAnimalDocument(document.file);
    } catch {}
  }
}

export function removeActivitiesForAnimal(animalId: string): void {
  for (const store of Object.values(activityStores)) {
    store.removeForAnimal(animalId);
  }
}

export function clearActivities(): void {
  for (const store of Object.values(activityStores)) store.clear();
}

/** Rebuilds every summary from the records — after a restore, or to repair. */
export function resummarizeActivities(): void {
  for (const store of Object.values(activityStores)) store.resummarize();
  summaryState$.backfilled.set(true);
}

/**
 * Builds the summaries once for a collection recorded before they existed.
 * Hydrates every table, so callers run it after the first screen is up.
 */
export function backfillSummaries(): void {
  if (summaryState$.backfilled.peek()) return;

  resummarizeActivities();
}
