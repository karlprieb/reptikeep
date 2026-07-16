import { randomUUID } from "expo-crypto";

import { createActivityStore, type ActivityRecord } from "./activity-store";

export interface ShedActivity extends ActivityRecord {
  issues: boolean;
  notes?: string;
}

export type CreateShedInput = Omit<
  ShedActivity,
  "id" | "createdAt" | "occurredAt" | "issues"
> & {
  occurredAt?: string;
  issues?: boolean;
};

export function createShedActivity(input: CreateShedInput): ShedActivity {
  return {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    issues: input.issues ?? false,
  };
}

export const shedStore = createActivityStore<ShedActivity>("sheds");
