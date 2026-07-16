import { batch } from "@legendapp/state";

import { clearActivities } from "@/state/activity-stores";
import { clearAnimals } from "@/state/animal";

export function resetAppData(): void {
  batch(() => {
    clearActivities();
    clearAnimals();
  });
}
