import { observable, type Observable } from "@legendapp/state";
import { syncObservable } from "@legendapp/state/sync";

import type { ActivityType } from "@/constants/theme";
import { clampTextFields } from "@/utils/text-limits";

import { persistedAsWritten, persistPlugin } from "./persist";
import { summarize } from "./summary";

export interface ActivityRecord {
  id: string;
  animalId: string;
  createdAt: string;
  occurredAt: string;
}

export function createActivityStore<T extends ActivityRecord>(
  name: string,
  type: ActivityType,
) {
  const records$ = observable<Record<string, ActivityRecord>>({});

  const refresh = (animalIds: Iterable<string>) => {
    const records = records$.peek();
    for (const animalId of new Set(animalIds)) {
      summarize(type, animalId, records);
    }
  };

  // Hydration parses the whole table, so it waits until something actually
  // reads or writes these records. The collection screens read the summaries
  // instead, which is what keeps a large history off the launch path.
  let hydrated = false;

  const hydrate = () => {
    if (hydrated) return;
    hydrated = true;

    syncObservable(records$, {
      persist: {
        name,
        plugin: persistPlugin,
        transform: persistedAsWritten(),
      },
    });
  };

  return {
    get $(): Observable<Record<string, T>> {
      hydrate();
      return records$ as unknown as Observable<Record<string, T>>;
    },

    /** Loads the table without reading it, for a screen that is about to. */
    hydrate,

    add(record: T): void {
      hydrate();
      const clamped = clampTextFields(record);
      const previous = records$.peek()[clamped.id];
      records$.set({ ...records$.peek(), [clamped.id]: clamped });
      refresh(
        previous ? [clamped.animalId, previous.animalId] : [clamped.animalId],
      );
    },

    remove(id: string): void {
      hydrate();
      const { [id]: removed, ...rest } = records$.peek();
      if (!removed) return;

      records$.set(rest);
      refresh([removed.animalId]);
    },

    removeForAnimal(animalId: string): void {
      hydrate();
      records$.set(
        Object.fromEntries(
          Object.entries(records$.peek()).filter(
            ([, record]) => record.animalId !== animalId,
          ),
        ),
      );
      refresh([animalId]);
    },

    clear(): void {
      hydrate();
      const cleared = Object.values(records$.peek()).map(
        (record) => record.animalId,
      );
      records$.set({});
      refresh(cleared);
    },

    /** Rebuilds every animal's entry — for restore, and to repair drift. */
    resummarize(): void {
      hydrate();
      refresh(Object.values(records$.peek()).map((record) => record.animalId));
    },
  };
}

export function forAnimal<T extends ActivityRecord>(
  animalId: string,
  records: Record<string, T>,
): T[] {
  return Object.values(records)
    .filter((record) => record.animalId === animalId)
    .map((record) => ({ record, occurred: Date.parse(record.occurredAt) }))
    .sort((a, b) => b.occurred - a.occurred)
    .map((item) => item.record);
}
