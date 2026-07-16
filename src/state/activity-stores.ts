import type { ActivityType } from "@/constants/theme";

import { defecationStore } from "./defecation";
import { feedingStore } from "./feeding";
import { habitatStore } from "./habitat";
import { shedStore } from "./shed";
import { weightStore } from "./weight";

export const activityStores = {
  feed: feedingStore,
  weight: weightStore,
  shed: shedStore,
  poop: defecationStore,
  habitat: habitatStore,
} as const;

export function removeActivity(type: ActivityType, id: string): void {
  activityStores[type].remove(id);
}

export function removeActivitiesForAnimal(animalId: string): void {
  for (const store of Object.values(activityStores)) {
    store.removeForAnimal(animalId);
  }
}

export function clearActivities(): void {
  for (const store of Object.values(activityStores)) store.clear();
}
