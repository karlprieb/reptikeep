import type { TFunction } from "i18next";

import type { FeedingActivity } from "@/state/feeding";
import type { WeightActivity } from "@/state/weight";
import type { AnimalActivity } from "@/utils/animal-activity";
import { daysSince, formatAbsoluteDate } from "@/utils/format-date";
import {
  formatSignedPercent,
  formatWeight,
  formatWeightDelta,
} from "@/utils/format-number";
import { previousRecord, weightChange } from "@/utils/weight-change";
import type { WeightUnit } from "@/utils/weight-unit";

export type DetailRow = {
  key: string;
  label: string;
  value: string;
  mono?: boolean;
  flagged?: boolean;
};

export type Detail = { header: string; rows: DetailRow[] };

function yesNo(t: TFunction, value: boolean): string {
  return t(value ? "activityDetail.yes" : "activityDetail.no");
}

function feedDetail(
  entry: Extract<AnimalActivity, { type: "feed" }>,
  t: TFunction,
  feedings: Record<string, FeedingActivity>,
  unit: WeightUnit,
): Detail {
  const { foodType, amount, weight, frozen, refused } = entry.record;

  const previous = previousRecord(
    entry.record.animalId,
    feedings,
    entry.occurredAt,
  );
  const interval = previous
    ? daysSince(previous.occurredAt, new Date(entry.occurredAt))
    : null;

  return {
    header: t("activityDetail.meal"),
    rows: [
      ...(foodType
        ? [
            {
              key: "foodType",
              label: t("feedingForm.foodType"),
              value: foodType,
            },
          ]
        : []),
      ...(amount
        ? [
            {
              key: "amount",
              label: t("feedingForm.measure.amount"),
              value: amount,
              mono: true,
            },
          ]
        : []),
      ...(weight != null
        ? [
            {
              key: "weight",
              label: t("feedingForm.feederWeight"),
              value: formatWeight(weight, unit),
              mono: true,
            },
          ]
        : []),
      {
        key: "frozen",
        label: t("feedingForm.frozen"),
        value: yesNo(t, frozen),
      },
      {
        key: "refused",
        label: t("feedingForm.refused"),
        value: yesNo(t, refused),
        flagged: refused,
      },
      ...(interval != null
        ? [
            {
              key: "interval",
              label: t("activityDetail.sincePrevious"),
              value: t("activityDetail.dayInterval", { count: interval }),
              mono: true,
            },
          ]
        : []),
    ],
  };
}

function weightDetail(
  entry: Extract<AnimalActivity, { type: "weight" }>,
  t: TFunction,
  weights: Record<string, WeightActivity>,
  unit: WeightUnit,
): Detail {
  const previous = previousRecord(
    entry.record.animalId,
    weights,
    entry.occurredAt,
  );
  const change = previous
    ? weightChange(previous.weight, entry.record.weight)
    : undefined;

  return {
    header: t("weightForm.weighIn"),
    rows: [
      {
        key: "weight",
        label: t("weightForm.weight"),
        value: formatWeight(entry.record.weight, unit),
        mono: true,
      },
      ...(previous
        ? [
            {
              key: "previous",
              label: t("weightForm.previous"),
              value: `${formatWeight(previous.weight, unit)} · ${formatAbsoluteDate(previous.occurredAt)}`,
              mono: true,
            },
          ]
        : []),
      ...(change
        ? [
            {
              key: "change",
              label: t("weightForm.change"),
              value: `${formatWeightDelta(change.deltaGrams, unit)} (${formatSignedPercent(change.percent)})`,
              mono: true,
              flagged: change.implausible,
            },
          ]
        : []),
    ],
  };
}

function habitatDetail(
  entry: Extract<AnimalActivity, { type: "habitat" }>,
  t: TFunction,
): Detail {
  return {
    header: t("habitatForm.upkeep"),
    rows: [
      {
        key: "water",
        label: t("habitatForm.water"),
        value: yesNo(t, entry.record.water),
      },
      ...(entry.record.cleaning === undefined
        ? []
        : [
            {
              key: "cleaning",
              label: t("habitatForm.cleaning"),
              value: yesNo(t, entry.record.cleaning),
            },
          ]),
    ],
  };
}

function medicalDetail(
  entry: Extract<AnimalActivity, { type: "medical" }>,
): Detail {
  return {
    header: entry.record.summary,
    rows: [],
  };
}

function observationDetail(
  entry: Extract<AnimalActivity, { type: "shed" | "poop" }>,
  t: TFunction,
): Detail {
  if (entry.type === "shed") {
    return {
      header: t("shedForm.observation"),
      rows: [
        {
          key: "issues",
          label: t("shedForm.issues"),
          value: yesNo(t, entry.record.issues),
          flagged: entry.record.issues,
        },
      ],
    };
  }

  return {
    header: t("defecationForm.observation"),
    rows: [
      {
        key: "type",
        label: t("defecationForm.type"),
        value: t(`timeline.poop.${entry.record.type}`),
      },
      {
        key: "issues",
        label: t("defecationForm.issues"),
        value: yesNo(t, entry.record.issues),
        flagged: entry.record.issues,
      },
    ],
  };
}

type ActivityDetailContext = {
  feedings: Record<string, FeedingActivity>;
  weights: Record<string, WeightActivity>;
  weightUnit: WeightUnit;
};

export function buildActivityDetail(
  entry: AnimalActivity,
  t: TFunction,
  { feedings, weights, weightUnit }: ActivityDetailContext,
): Detail {
  switch (entry.type) {
    case "feed":
      return feedDetail(entry, t, feedings, weightUnit);
    case "weight":
      return weightDetail(entry, t, weights, weightUnit);
    case "habitat":
      return habitatDetail(entry, t);
    case "medical":
      return medicalDetail(entry);
    default:
      return observationDetail(entry, t);
  }
}
