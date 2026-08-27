import type { TFunction } from "i18next";

import type { Theme } from "@/constants/theme";
import type { AnimalActivity } from "@/utils/animal-activity";
import { daysSince } from "@/utils/format-date";
import {
  formatPercent,
  formatSignedPercent,
  formatWeight,
  formatWeightDelta,
} from "@/utils/format-number";
import { weightChange } from "@/utils/weight-change";
import type { WeightUnit } from "@/utils/weight-unit";

export function describeActivity(
  entry: AnimalActivity,
  t: TFunction,
  unit: WeightUnit,
): { detail: string | null; flagged: boolean } {
  switch (entry.type) {
    case "feed": {
      const { foodType, amount, weight, refused } = entry.record;
      const parts = [
        refused ? t("timeline.refused") : null,
        foodType,
        amount,
        weight != null ? formatWeight(weight, unit) : null,
      ].filter((part): part is string => Boolean(part));

      return { detail: parts.join(" · ") || null, flagged: refused };
    }
    case "weight":
      return {
        detail: formatWeight(entry.record.weight, unit),
        flagged: false,
      };
    case "shed":
      return {
        detail: entry.record.issues ? t("timeline.issues") : null,
        flagged: entry.record.issues,
      };
    case "poop": {
      const { type, issues } = entry.record;
      const parts = [
        t(`timeline.poop.${type}`),
        issues ? t("timeline.issues") : null,
      ].filter((part): part is string => Boolean(part));

      return { detail: parts.join(" · "), flagged: issues };
    }
    case "medical":
      return { detail: entry.record.summary, flagged: false };
    case "habitat": {
      const parts = [
        entry.record.water ? t("timeline.waterChanged") : null,
        entry.record.cleaning ? t("timeline.enclosureCleaned") : null,
      ].filter((part): part is string => Boolean(part));

      return { detail: parts.join(" · ") || null, flagged: false };
    }
  }
}

export type ActivityChange = {
  text: string;
  spoken: string;
  color: string;
  direction?: "up" | "down" | "flat";
};

export function describeChange(
  entry: AnimalActivity,
  previous: AnimalActivity | undefined,
  theme: Theme,
  t: TFunction,
  unit: WeightUnit,
): ActivityChange | null {
  if (!previous || entry.type === "medical") return null;

  if (entry.type === "weight" && previous.type === "weight") {
    const { deltaGrams, percent } = weightChange(
      previous.record.weight,
      entry.record.weight,
    );

    return {
      text: `${formatWeight(Math.abs(deltaGrams), unit)} · ${formatPercent(percent)}`,
      spoken: `${t("weightForm.change")}: ${formatWeightDelta(deltaGrams, unit)} (${formatSignedPercent(percent)})`,
      color:
        deltaGrams > 0
          ? theme.success
          : deltaGrams < 0
            ? theme.danger
            : theme.textSecondary,
      direction: deltaGrams > 0 ? "up" : deltaGrams < 0 ? "down" : "flat",
    };
  }

  const days = daysSince(previous.occurredAt, new Date(entry.occurredAt));
  if (days === null) return null;

  const interval = t("timeline.sinceLast", { count: days });

  return { text: interval, spoken: interval, color: theme.textMuted };
}
