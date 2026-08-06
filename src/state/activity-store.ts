import { observable, type Observable } from "@legendapp/state";
import { syncObservable } from "@legendapp/state/sync";

import { clampTextFields } from "@/utils/text-limits";

import { persistedAsWritten, persistPlugin } from "./persist";

export interface ActivityRecord {
  id: string;
  animalId: string;
  createdAt: string;
  occurredAt: string;
}

export function createActivityStore<T extends ActivityRecord>(name: string) {
  const records$ = observable<Record<string, ActivityRecord>>({});

  syncObservable(records$, {
    persist: {
      name,
      plugin: persistPlugin,
      transform: persistedAsWritten(),
    },
  });

  return {
    $: records$ as unknown as Observable<Record<string, T>>,

    add(record: T): void {
      const clamped = clampTextFields(record);
      records$.set({ ...records$.peek(), [clamped.id]: clamped });
    },

    remove(id: string): void {
      const { [id]: removed, ...rest } = records$.peek();
      if (!removed) return;

      records$.set(rest);
    },

    removeForAnimal(animalId: string): void {
      records$.set(
        Object.fromEntries(
          Object.entries(records$.peek()).filter(
            ([, record]) => record.animalId !== animalId,
          ),
        ),
      );
    },

    clear(): void {
      records$.set({});
    },
  };
}

export function forAnimal<T extends ActivityRecord>(
  animalId: string,
  records: Record<string, T>,
): T[] {
  return Object.values(records)
    .filter((record) => record.animalId === animalId)
    .sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    );
}
