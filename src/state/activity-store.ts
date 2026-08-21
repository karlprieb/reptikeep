import { observable, type Observable } from "@legendapp/state";
import { syncObservable } from "@legendapp/state/sync";

import type { ActivityType } from "@/constants/theme";
import { clampTextFields } from "@/utils/text-limits";

import { persistedAsWritten, persistPlugin } from "./persist";
import { summarize, summarizeAll, summaryState$ } from "./summary";

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
    summaryState$.dirty.set(true);
  };

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

    resummarize(): void {
      hydrate();
      summarizeAll(type, records$.peek());
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
