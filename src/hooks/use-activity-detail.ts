import { useSelector as useValue } from "@legendapp/state/react";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { removeActivity } from "@/state/activity-stores";
import { documents$, documentsForActivity } from "@/state/document";
import { feedingStore } from "@/state/feeding";
import { useAnimalDefaults } from "@/state/logging-defaults";
import { weightStore } from "@/state/weight";
import { buildActivityDetail } from "@/utils/activity-detail";
import type { AnimalActivity } from "@/utils/animal-activity";
import { confirmDeleteActivity } from "@/utils/confirm-delete-activity";
import { formatAbsoluteDate, formatAbsoluteTime } from "@/utils/format-date";

export function useActivityDetail(entry: AnimalActivity) {
  const { t } = useTranslation();
  const feedings = useValue(feedingStore.$);
  const weights = useValue(weightStore.$);
  const documents = useValue(documents$);

  const typeName = t(`activity.type.${entry.type}`);
  const animalId = entry.record.animalId;
  const { weightUnit } = useAnimalDefaults(animalId);

  const detail = buildActivityDetail(entry, t, {
    feedings,
    weights,
    weightUnit,
  });
  const notes = entry.type === "poop" ? entry.record.note : entry.record.notes;
  const linkedDocuments =
    entry.type === "medical"
      ? documentsForActivity("medical", entry.id, documents)
      : [];
  const occurredDate = formatAbsoluteDate(entry.occurredAt);
  const recordedDate = formatAbsoluteDate(entry.record.createdAt);

  const openEdit = () =>
    router.replace(`/animal/${animalId}/${entry.type}?activityId=${entry.id}`);

  const confirmDelete = () =>
    confirmDeleteActivity(
      t,
      typeName,
      () => {
        removeActivity(entry.type, entry.id);
        router.back();
      },
      entry.type === "medical",
    );

  return {
    animalId,
    typeName,
    detail,
    notes,
    linkedDocuments,
    occurredDate,
    occurredTime: formatAbsoluteTime(entry.occurredAt),
    recordedDate,
    backdated: recordedDate !== occurredDate,
    openEdit,
    confirmDelete,
  };
}
