import { batch } from "@legendapp/state";

import { clearActivities } from "@/state/activity-stores";
import { clearAnimals } from "@/state/animal";
import { clearDocuments } from "@/state/document";
import { clearSummaries } from "@/state/summary";

export function resetAppData(): void {
  batch(() => {
    clearActivities();
    clearDocuments();
    clearAnimals();
    clearSummaries();
  });
}
