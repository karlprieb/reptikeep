import { randomUUID } from "expo-crypto";

import { createActivityStore, type ActivityRecord } from "./activity-store";

export interface WeightActivity extends ActivityRecord {
  weight: number;
  notes?: string;
}

export type CreateWeightInput = Omit<
  WeightActivity,
  "id" | "createdAt" | "occurredAt" | "weight"
> & {
  occurredAt?: string;
  weight: number;
};

export function createWeightActivity(input: CreateWeightInput): WeightActivity {
  return {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    weight: Math.max(1, Math.round(input.weight)),
  };
}

export const weightStore = createActivityStore<WeightActivity>("weights");
