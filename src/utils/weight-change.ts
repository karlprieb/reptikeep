import type { ActivityRecord } from "@/state/activity-store";

const IMPLAUSIBLE_CHANGE_RATIO = 0.5;

export type WeightChange = {
  deltaGrams: number;
  percent: number;
  implausible: boolean;
};

export function previousRecord<T extends ActivityRecord>(
  animalId: string,
  records: Record<string, T>,
  before: string,
  excludeId?: string,
): T | undefined {
  const beforeTime = Date.parse(before);
  if (!Number.isFinite(beforeTime)) return undefined;

  let latest: T | undefined;
  let latestTime = -Infinity;

  for (const record of Object.values(records)) {
    if (record.animalId !== animalId || record.id === excludeId) continue;

    const time = Date.parse(record.occurredAt);
    if (!(time < beforeTime) || time <= latestTime) continue;

    latest = record;
    latestTime = time;
  }

  return latest;
}

export function weightChange(
  previousGrams: number,
  grams: number,
): WeightChange {
  const deltaGrams = Math.round(grams) - Math.round(previousGrams);
  const percent = previousGrams > 0 ? (deltaGrams / previousGrams) * 100 : 0;

  return {
    deltaGrams,
    percent,
    implausible:
      previousGrams > 0 &&
      Math.abs(deltaGrams) / previousGrams > IMPLAUSIBLE_CHANGE_RATIO,
  };
}
