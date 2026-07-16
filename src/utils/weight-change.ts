import { forAnimal, type ActivityRecord } from "@/state/activity-store";

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
): T | undefined {
  const beforeTime = new Date(before).getTime();
  if (!Number.isFinite(beforeTime)) return undefined;

  return forAnimal(animalId, records).find(
    (record) => new Date(record.occurredAt).getTime() < beforeTime,
  );
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
