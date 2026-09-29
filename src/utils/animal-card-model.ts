import type { TFunction } from "i18next";

import type { Animal } from "@/state/animal";
import type { CareSchedule } from "@/state/care-schedule";
import { overdueRoutines } from "@/utils/animal-card-status";
import { feedingStatus } from "@/utils/feeding-status";

export type OverdueTaskId = "feed" | "water" | "cleaning";

export type AnimalCardModelInput = {
  animal: Animal;
  lastFedAt?: string;
  waterSchedule?: CareSchedule;
  lastWaterChangeAt?: string;
  cleaningSchedule?: CareSchedule;
  lastCleanAt?: string;
};

export function buildAnimalCardModel(
  t: TFunction,
  {
    animal,
    lastFedAt,
    waterSchedule,
    lastWaterChangeAt,
    cleaningSchedule,
    lastCleanAt,
  }: AnimalCardModelInput,
) {
  const sex = animal.sex === "unknown" ? null : t(`sex.${animal.sex}`);
  const feeding = feedingStatus(t, lastFedAt, animal.feedingSchedule);
  const { water, cleaning } = overdueRoutines({
    feedingSchedule: animal.feedingSchedule,
    lastFedAt,
    waterSchedule,
    lastWaterChangeAt,
    cleaningSchedule,
    lastCleanAt,
  });

  const overdueTasks: { id: OverdueTaskId; label: string }[] = [];
  if (feeding.overdue) overdueTasks.push({ id: "feed", label: feeding.line });
  if (water) overdueTasks.push({ id: "water", label: t("water.overdue") });
  if (cleaning) {
    overdueTasks.push({ id: "cleaning", label: t("cleaning.overdue") });
  }

  const status =
    overdueTasks.length > 0
      ? overdueTasks.map((task) => task.label)
      : [lastFedAt ? `${t("detail.lastFed")} ${feeding.line}` : feeding.line];
  const label = [
    animal.name,
    animal.commonName,
    animal.scientificName,
    sex,
    ...status,
  ]
    .filter((part): part is string => Boolean(part))
    .join(", ");

  return { sex, feeding, overdueTasks, label };
}
