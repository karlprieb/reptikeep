import { randomUUID } from "expo-crypto";

import { createActivityStore, type ActivityRecord } from "./activity-store";

export interface HabitatActivity extends ActivityRecord {
  water: boolean;
  notes?: string;
}

export type CreateHabitatInput = Omit<
  HabitatActivity,
  "id" | "createdAt" | "occurredAt" | "water"
> & {
  occurredAt?: string;
  water?: boolean;
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
  };
}

export const habitatStore = createActivityStore<HabitatActivity>("habitats");
