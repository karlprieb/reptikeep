import { useSelector as useValue } from "@legendapp/state/react";

import { AddMedicalSheet } from "@/components/add-medical-sheet";
import { AnimalNotFound, useAnimalRoute } from "@/components/animal-route";
import { medicalStore } from "@/state/medical";

export default function AddMedicalScreen() {
  const { animal, activityId } = useAnimalRoute();
  const activity = useValue(() =>
    activityId ? medicalStore.$[activityId].get() : undefined,
  );

  if (!animal) return <AnimalNotFound />;

  return (
    <AddMedicalSheet
      animalId={animal.id}
      animalName={animal.name}
      activity={activity}
    />
  );
}
