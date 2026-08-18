import { randomUUID } from "expo-crypto";

import { createActivityStore, type ActivityRecord } from "./activity-store";

export interface HabitatActivity extends ActivityRecord {
  water: boolean;
  cleaning?: boolean;
  notes?: string;
}

export type CreateHabitatInput = Omit<
  HabitatActivity,
  "id" | "createdAt" | "occurredAt" | "water" | "cleaning"
> & {
  occurredAt?: string;
  water?: boolean;
  cleaning?: boolean;
};

export function createHabitatActivity(
  input: CreateHabitatInput,
): HabitatActivity {
  return {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    water: input.water ?? true,
    cleaning: input.cleaning ?? false,
  };
}

export const habitatStore = createActivityStore<HabitatActivity>(
  "habitats",
  "habitat",
);
