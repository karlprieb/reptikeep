import type { TFunction } from "i18next";

import type { FeedingActivity } from "@/state/feeding";
import type { MedicalActivity } from "@/state/medical";
import { formatAbsoluteDate, formatAbsoluteTime } from "@/utils/format-date";
import { formatWeight } from "@/utils/format-number";
import type { WeightUnit } from "@/utils/weight-unit";

export const REGURGITATION_WINDOW_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export function linkableFeeding(
  feeding: FeedingActivity | undefined,
  animalId: string,
  before: Date,
): feeding is FeedingActivity {
  return (
    feeding?.animalId === animalId &&
    !feeding.refused &&
    new Date(feeding.occurredAt).getTime() <= before.getTime()
  );
}

export function recentFeedings(
  feedings: Record<string, FeedingActivity>,
  animalId: string,
  before: Date,
  include?: string,
  taken: ReadonlySet<string> = new Set(),
): FeedingActivity[] {
  const start = before.getTime() - REGURGITATION_WINDOW_DAYS * DAY_MS;
  return Object.values(feedings)
    .filter(
      (feeding) =>
        linkableFeeding(feeding, animalId, before) &&
        !taken.has(feeding.id) &&
        (feeding.id === include ||
          new Date(feeding.occurredAt).getTime() >= start),
    )
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

export function regurgitationFor(
  medical: Record<string, MedicalActivity>,
  feeding: FeedingActivity,
): MedicalActivity | undefined {
  return Object.values(medical).find(
    (record) =>
      record.kind === "regurgitation" &&
      record.feedingId === feeding.id &&
      linkableFeeding(feeding, record.animalId, new Date(record.occurredAt)),
  );
}

export function takenFeedings(
  medical: Record<string, MedicalActivity>,
  feedings: Record<string, FeedingActivity>,
  exceptRecordId?: string,
): Set<string> {
  return new Set(
    Object.values(feedings)
      .filter((feeding) => {
        const owner = regurgitationFor(medical, feeding);
        return owner && owner.id !== exceptRecordId;
      })
      .map((feeding) => feeding.id),
  );
}

export function feedingLabel(
  feeding: FeedingActivity,
  unit: WeightUnit,
): string {
  return [
    formatAbsoluteDate(feeding.occurredAt),
    formatAbsoluteTime(feeding.occurredAt),
    feeding.foodType,
    feeding.amount,
    feeding.weight != null ? formatWeight(feeding.weight, unit) : undefined,
  ]
    .filter(Boolean)
    .join(" · ");
}

export const NO_FEEDING = "none";

export function feedingChoices(
  feedings: FeedingActivity[],
  t: TFunction,
  unit: WeightUnit,
  deletedId?: string,
): { value: string; label: string }[] {
  return [
    ...feedings.map((feeding) => ({
      value: feeding.id,
      label: feedingLabel(feeding, unit),
    })),
    ...(deletedId
      ? [{ value: deletedId, label: t("medicalForm.feedingDeleted") }]
      : []),
    { value: NO_FEEDING, label: t("medicalForm.feedingNone") },
  ];
}
