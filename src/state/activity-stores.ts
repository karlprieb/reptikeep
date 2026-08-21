import { batch } from "@legendapp/state";

import type { ActivityType } from "@/constants/theme";
import { deleteManagedAnimalDocument } from "@/utils/animal-document-storage";

import { defecationStore } from "./defecation";
import { feedingStore } from "./feeding";
import { habitatStore } from "./habitat";
import { removeDocumentsForActivity } from "./document";
import { medicalStore } from "./medical";
import { shedStore } from "./shed";
import { clearSummaries, summaryState$ } from "./summary";
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

export function resummarizeActivities(): void {
  clearSummaries();
  for (const store of Object.values(activityStores)) store.resummarize();
  summaryState$.dirty.set(false);
}

export function backfillSummaries(): void {
  if (!summaryState$.dirty.peek()) return;

  resummarizeActivities();
}
