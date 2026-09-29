import type { TFunction } from "i18next";

import type { Animal } from "@/state/animal";
import type { AnimalActivity } from "@/utils/animal-activity";
import { formatAbsoluteDate } from "@/utils/format-date";
import { formatWeight, formatWeightDelta } from "@/utils/format-number";
import { relativeLine } from "@/utils/relative-date";
import type { WeightUnit } from "@/utils/weight-unit";
import type { WeightChartData } from "@/utils/weight-chart";

export type Stat = {
  key: string;
  label: string;
  value: string;
  secondary?: string;
  secondaryColor?: string;
};

type Logged = { occurredAt: string } | undefined;

function trendDirection(deltaGrams: number) {
  if (deltaGrams > 0) return "up" as const;
  if (deltaGrams < 0) return "down" as const;
  return "flat" as const;
}

export function buildWeightTrend(
  data: WeightChartData,
  unit: WeightUnit,
  t: TFunction,
) {
  const { first, last } = data;
  if (data.count <= 1 || !first || !last) return null;

  const span = {
    first: formatAbsoluteDate(first.occurredAt),
    last: formatAbsoluteDate(last.occurredAt),
  };
  const change = formatWeightDelta(data.deltaGrams, unit);

  return {
    span: t("weightTrend.span", span),
    change,
    direction: trendDirection(data.deltaGrams),
    window:
      data.total > data.count
        ? t("weightTrend.window", { count: data.count })
        : null,
    summary: t("weightTrend.summary", {
      count: data.count,
      ...span,
      latest: formatWeight(last.weight, unit),
      change,
    }),
  };
}

export function buildIdentityLabel(animal: Animal, sex: string | null) {
  return [animal.name, animal.commonName, animal.scientificName, sex]
    .filter((part): part is string => Boolean(part))
    .join(", ");
}

export function buildDateStats(animal: Animal, t: TFunction): Stat[] {
  const stats: Stat[] = [];
  if (animal.birthDate) {
    stats.push({
      key: "birth",
      label: t("detail.birthDate"),
      value: formatAbsoluteDate(animal.birthDate),
      secondary: relativeLine(animal.birthDate, "old", t),
    });
  }
  if (animal.acquiredDate) {
    stats.push({
      key: "acquired",
      label: t("detail.acquired"),
      value: formatAbsoluteDate(animal.acquiredDate),
      secondary: relativeLine(animal.acquiredDate, "ago", t),
    });
  }

  return stats;
}

export function buildWeightStat(
  latest: Extract<AnimalActivity, { type: "weight" }> | undefined,
  unit: WeightUnit,
  t: TFunction,
): Stat {
  return {
    key: "weight",
    label: t("detail.currentWeight"),
    value: latest
      ? formatWeight(latest.record.weight, unit)
      : t("detail.unknownValue"),
    secondary: latest
      ? relativeLine(latest.occurredAt, "ago", t)
      : t("detail.noWeight"),
  };
}

export function buildFeedStat(
  latest: Logged,
  overdueDays: number | null,
  dangerColor: string,
  t: TFunction,
): Stat {
  const secondary = () => {
    if (!latest) return t("feeding.noFeedingLogged");
    if (overdueDays) return t("schedule.overdue", { count: overdueDays });
    return relativeLine(latest.occurredAt, "ago", t);
  };

  return {
    key: "lastFed",
    label: t("detail.lastFed"),
    value: latest
      ? formatAbsoluteDate(latest.occurredAt)
      : t("detail.unknownValue"),
    secondary: secondary(),
    secondaryColor: overdueDays ? dangerColor : undefined,
  };
}

type RoutineStatInput = {
  key: "water" | "cleaning";
  labelKey: string;
  noneKey: string;
  latest: Logged;
  overdueDays: number | null;
  dangerColor: string;
};

export function buildRoutineStat(
  {
    key,
    labelKey,
    noneKey,
    latest,
    overdueDays,
    dangerColor,
  }: RoutineStatInput,
  t: TFunction,
): Stat {
  const secondary = () => {
    if (overdueDays) return t("schedule.overdue", { count: overdueDays });
    if (latest) return relativeLine(latest.occurredAt, "ago", t);
    return t(noneKey);
  };

  return {
    key,
    label: t(labelKey),
    value: latest
      ? formatAbsoluteDate(latest.occurredAt)
      : t("detail.unknownValue"),
    secondary: secondary(),
    secondaryColor: overdueDays ? dangerColor : undefined,
  };
}
