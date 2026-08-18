import { randomUUID } from "expo-crypto";

import { createActivityStore, type ActivityRecord } from "./activity-store";

export interface FeedingActivity extends ActivityRecord {
  foodType?: string;
  amount?: string;
  weight?: number;
  notes?: string;
  frozen: boolean;
  refused: boolean;
}

export type CreateFeedingInput = Omit<
  FeedingActivity,
  "id" | "createdAt" | "occurredAt" | "frozen" | "refused"
> & {
  occurredAt?: string;
  frozen?: boolean;
  refused?: boolean;
};

export function createFeedingActivity(
  input: CreateFeedingInput,
): FeedingActivity {
  return {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    frozen: input.frozen ?? false,
    refused: input.refused ?? false,
    weight:
      input.weight !== undefined
        ? Math.round(Math.max(0, input.weight))
        : undefined,
  };
}

export const feedingStore = createActivityStore<FeedingActivity>(
  "feedings",
  "feed",
);
