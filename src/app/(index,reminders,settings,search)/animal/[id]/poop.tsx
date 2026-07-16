import { useSelector as useValue } from "@legendapp/state/react";

import { AddDefecationSheet } from "@/components/add-defecation-sheet";
import { AnimalNotFound, useAnimalRoute } from "@/components/animal-route";
import { defecationStore } from "@/state/defecation";

export default function AddDefecationScreen() {
  const { animal, activityId } = useAnimalRoute();
  const activity = useValue(() =>
    activityId ? defecationStore.$[activityId].get() : undefined,
  );

  if (!animal) return <AnimalNotFound />;

  return (
    <AddDefecationSheet
      animalId={animal.id}
      animalName={animal.name}
      activity={activity}
    />
  );
}
