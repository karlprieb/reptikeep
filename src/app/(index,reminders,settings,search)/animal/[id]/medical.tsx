import { useSelector as useValue } from "@legendapp/state/react";
import { useLocalSearchParams } from "expo-router";

import { AddMedicalSheet } from "@/components/add-medical-sheet";
import { AnimalNotFound, useAnimalRoute } from "@/components/animal-route";
import { medicalKind, medicalStore } from "@/state/medical";

export default function AddMedicalScreen() {
  const { animal, activityId } = useAnimalRoute();
  const params = useLocalSearchParams<{ kind?: string; feedingId?: string }>();
  const activity = useValue(() =>
    activityId ? medicalStore.$[activityId].get() : undefined,
  );

  if (!animal || (activityId && activity?.animalId !== animal.id))
    return <AnimalNotFound />;

  const kind = activity
    ? medicalKind(activity)
    : params.kind === "regurgitation"
      ? "regurgitation"
      : "general";

  return (
    <AddMedicalSheet
      animalId={animal.id}
      animalName={animal.name}
      activity={activity}
      kind={kind}
      feedingId={activity?.feedingId ?? params.feedingId}
    />
  );
}
