import { randomUUID } from "expo-crypto";

import { createActivityStore, type ActivityRecord } from "./activity-store";

export type DefecationType = "poop" | "urate" | "both";

export const DEFECATION_TYPES: readonly DefecationType[] = [
  "poop",
  "urate",
  "both",
];

export interface DefecationActivity extends ActivityRecord {
  issues: boolean;
  type: DefecationType;
  note?: string;
}

export type CreateDefecationInput = Omit<
  DefecationActivity,
  "id" | "createdAt" | "occurredAt" | "issues" | "type"
> & {
  occurredAt?: string;
  issues?: boolean;
  type?: DefecationType;
};

export function createDefecationActivity(
  input: CreateDefecationInput,
): DefecationActivity {
  return {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    issues: input.issues ?? false,
    type: input.type ?? "poop",
  };
}

export const defecationStore = createActivityStore<DefecationActivity>(
  "defecations",
  "poop",
);
