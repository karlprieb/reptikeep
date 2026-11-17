import type { TFunction } from "i18next";

import type { FeedingActivity } from "@/state/feeding";
import type { MedicalActivity } from "@/state/medical";
import { formatAbsoluteDate, formatAbsoluteTime } from "@/utils/format-date";

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
      record.animalId === feeding.animalId,
  );
}

export function takenFeedings(
  medical: Record<string, MedicalActivity>,
  exceptRecordId?: string,
): Set<string> {
  return new Set(
    Object.values(medical)
      .filter(
        (record) =>
          record.kind === "regurgitation" &&
          record.feedingId &&
          record.id !== exceptRecordId,
      )
      .map((record) => record.feedingId!),
  );
}

export function feedingLabel(feeding: FeedingActivity): string {
  return [
    formatAbsoluteDate(feeding.occurredAt),
    formatAbsoluteTime(feeding.occurredAt),
    feeding.foodType,
    feeding.amount,
  ]
    .filter(Boolean)
    .join(" · ");
}

export const NO_FEEDING = "none";

export function feedingChoices(
  feedings: FeedingActivity[],
  t: TFunction,
): { value: string; label: string }[] {
  return [
    ...feedings.map((feeding) => ({
      value: feeding.id,
      label: feedingLabel(feeding),
    })),
    { value: NO_FEEDING, label: t("medicalForm.feedingNone") },
  ];
}
