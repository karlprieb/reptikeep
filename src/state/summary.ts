import { observable } from "@legendapp/state";
import { syncObservable } from "@legendapp/state/sync";

import type { ActivityType } from "@/constants/theme";

import type { ActivityRecord } from "./activity-store";
import type { FeedingActivity } from "./feeding";
import type { HabitatActivity } from "./habitat";
import { persistedAsWritten, persistPlugin } from "./persist";

export type AnimalSummary = {
  lastFedAt?: string;
  lastWaterAt?: string;
  lastCleanAt?: string;
  lastByType?: Partial<Record<ActivityType, string>>;
};

export const summaries$ = observable<Record<string, AnimalSummary>>({});

syncObservable(summaries$, {
  persist: {
    name: "activity-summary",
    plugin: persistPlugin,
    transform: persistedAsWritten(),
  },
});

export const summaryState$ = observable<{ dirty?: boolean }>({ dirty: true });

syncObservable(summaryState$, {
  persist: { name: "activity-summary-state", plugin: persistPlugin },
});

function latest(a: string | undefined, b: string): string {
  if (a === undefined) return b;

  return Date.parse(b) > Date.parse(a) ? b : a;
}

function latestFor<T extends ActivityRecord>(
  records: Record<string, T>,
  animalId: string,
  qualifies: (record: T) => boolean,
): string | undefined {
  let newest: string | undefined;

  for (const record of Object.values(records)) {
    if (record.animalId !== animalId || !qualifies(record)) continue;
    newest = latest(newest, record.occurredAt);
  }

  return newest;
}

const always = () => true;
const wasAccepted = (feeding: FeedingActivity) => !feeding.refused;
const changedWater = (habitat: HabitatActivity) => habitat.water;
const cleanedEnclosure = (habitat: HabitatActivity) =>
  habitat.cleaning === true;

export function summarize<T extends ActivityRecord>(
  type: ActivityType,
  animalId: string,
  records: Record<string, T>,
): void {
  const current = summaries$[animalId].peek() ?? {};
  const next: AnimalSummary = {
    ...current,
    lastByType: {
      ...current.lastByType,
      [type]: latestFor(records, animalId, always),
    },
  };

  if (type === "feed") {
    const feedings = records as unknown as Record<string, FeedingActivity>;
    next.lastFedAt = latestFor(feedings, animalId, wasAccepted);
  }

  if (type === "habitat") {
    const habitats = records as unknown as Record<string, HabitatActivity>;
    next.lastWaterAt = latestFor(habitats, animalId, changedWater);
    next.lastCleanAt = latestFor(habitats, animalId, cleanedEnclosure);
  }

  summaries$[animalId].set(next);
}

export function summarizeAll<T extends ActivityRecord>(
  type: ActivityType,
  records: Record<string, T>,
): void {
  const byAnimal: Record<
    string,
    {
      newest?: string;
      lastFedAt?: string;
      lastWaterAt?: string;
      lastCleanAt?: string;
    }
  > = {};

  for (const record of Object.values(records)) {
    let entry = byAnimal[record.animalId];
    if (!entry) {
      entry = {};
      byAnimal[record.animalId] = entry;
    }

    entry.newest = latest(entry.newest, record.occurredAt);

    if (type === "feed") {
      const feeding = record as unknown as FeedingActivity;
      if (wasAccepted(feeding)) {
        entry.lastFedAt = latest(entry.lastFedAt, record.occurredAt);
      }
    }

    if (type === "habitat") {
      const habitat = record as unknown as HabitatActivity;
      if (changedWater(habitat)) {
        entry.lastWaterAt = latest(entry.lastWaterAt, record.occurredAt);
      }
      if (cleanedEnclosure(habitat)) {
        entry.lastCleanAt = latest(entry.lastCleanAt, record.occurredAt);
      }
    }
  }

  const current = summaries$.peek();
  for (const [animalId, entry] of Object.entries(byAnimal)) {
    const existing = current[animalId] ?? {};
    const next: AnimalSummary = {
      ...existing,
      lastByType: { ...existing.lastByType, [type]: entry.newest },
    };

    if (type === "feed") next.lastFedAt = entry.lastFedAt;
    if (type === "habitat") {
      next.lastWaterAt = entry.lastWaterAt;
      next.lastCleanAt = entry.lastCleanAt;
    }

    summaries$[animalId].set(next);
  }
}

export function lastActivityAt(summary: AnimalSummary): string | undefined {
  let newest: string | undefined;

  for (const at of Object.values(summary.lastByType ?? {})) {
    if (at) newest = latest(newest, at);
  }

  return newest;
}

export function summaryLookups(summaries: Record<string, AnimalSummary>): {
  lastFed: Record<string, string>;
  lastWater: Record<string, string>;
  lastClean: Record<string, string>;
  lastActivity: Record<string, string>;
} {
  const lastFed: Record<string, string> = {};
  const lastWater: Record<string, string> = {};
  const lastClean: Record<string, string> = {};
  const lastActivity: Record<string, string> = {};

  for (const [animalId, summary] of Object.entries(summaries)) {
    if (summary.lastFedAt) lastFed[animalId] = summary.lastFedAt;
    if (summary.lastWaterAt) lastWater[animalId] = summary.lastWaterAt;
    if (summary.lastCleanAt) lastClean[animalId] = summary.lastCleanAt;

    const newest = lastActivityAt(summary);
    if (newest) lastActivity[animalId] = newest;
  }

  return { lastFed, lastWater, lastClean, lastActivity };
}

export function forgetAnimalSummary(animalId: string): void {
  const { [animalId]: removed, ...rest } = summaries$.peek();
  if (!removed) return;

  summaries$.set(rest);
}

export function clearSummaries(): void {
  summaries$.set({});
}
