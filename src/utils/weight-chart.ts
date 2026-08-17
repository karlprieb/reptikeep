import type { WeightActivity } from "@/state/weight";

import { formatAxisDate } from "./format-date";
import { gramsToUnit, type WeightUnit } from "./weight-unit";

const WEIGHT_TREND_LIMIT = 8;

export type WeightChartPoint = {
  x: string;
  y: number;
};

export type WeightChartData = {
  points: WeightChartPoint[];
  count: number;
  total: number;
  first: WeightActivity | null;
  last: WeightActivity | null;
  deltaGrams: number;
};

function timestamp(value: string): number {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function byOccurred(a: WeightActivity, b: WeightActivity): number {
  const byOccurred = timestamp(a.occurredAt) - timestamp(b.occurredAt);
  if (byOccurred !== 0) return byOccurred;

  const byCreated = timestamp(a.createdAt) - timestamp(b.createdAt);
  if (byCreated !== 0) return byCreated;

  return a.id.localeCompare(b.id);
}

export function weightChartData(
  records: Record<string, WeightActivity>,
  animalId: string,
  unit: WeightUnit,
  limit = WEIGHT_TREND_LIMIT,
): WeightChartData {
  const sorted = Object.values(records)
    .filter((record) => record.animalId === animalId)
    .sort(byOccurred);

  const window = sorted.slice(-limit);
  const first = window[0] ?? null;
  const last = window[window.length - 1] ?? null;

  return {
    points: window.map((record) => ({
      x: formatAxisDate(record.occurredAt),
      y: gramsToUnit(record.weight, unit),
    })),
    count: window.length,
    total: sorted.length,
    first,
    last,
    deltaGrams:
      first && last ? Math.round(last.weight) - Math.round(first.weight) : 0,
  };
}
