import { useSelector as useValue } from "@legendapp/state/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { feedingStore } from "@/state/feeding";
import { useAnimalDefaults } from "@/state/logging-defaults";
import { medicalStore } from "@/state/medical";
import {
  feedingChoices,
  NO_FEEDING,
  recentFeedings,
  takenFeedings,
} from "@/utils/regurgitation";

export function useFeedingLink(
  animalId: string,
  occurredAt: Date,
  initialFeedingId: string | undefined,
  preselectLatest: boolean,
  editingId?: string,
) {
  const { t } = useTranslation();
  const feedings = useValue(feedingStore.$);
  const medical = useValue(medicalStore.$);
  const { weightUnit } = useAnimalDefaults(animalId);
  const [picked, setSelected] = useState<string>();
  const wanted = picked ?? initialFeedingId;
  const stored = editingId && initialFeedingId;
  const deletedId = stored && !feedings[stored] ? stored : undefined;
  const recent = recentFeedings(
    feedings,
    animalId,
    occurredAt,
    wanted,
    takenFeedings(medical, editingId),
  );
  const storedFeeding = stored ? feedings[stored] : undefined;
  const keepStored =
    storedFeeding?.animalId === animalId && !recent.includes(storedFeeding);
  const choices = feedingChoices(
    keepStored ? [...recent, storedFeeding] : recent,
    t,
    weightUnit,
    deletedId,
  );
  const isChoice = (id: string | undefined) =>
    choices.some((choice) => choice.value === id);
  // Derived on every render so a late-hydrating store (IndexedDB on web) and backdating both resolve.
  const selected = isChoice(wanted)
    ? wanted!
    : wanted === undefined && preselectLatest
      ? choices[0].value
      : NO_FEEDING;

  return {
    selected,
    setSelected,
    choices,
    selectedLabel: choices.find((choice) => choice.value === selected)?.label,
    feedingId: selected === NO_FEEDING ? undefined : selected,
  };
}
