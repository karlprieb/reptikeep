import { useSelector as useValue } from "@legendapp/state/react";

import { AddWeightSheet } from "@/components/add-weight-sheet";
import { AnimalNotFound, useAnimalRoute } from "@/components/animal-route";
import { weightStore } from "@/state/weight";

export default function AddWeightScreen() {
  const { animal, activityId } = useAnimalRoute();
  const activity = useValue(() =>
    activityId ? weightStore.$[activityId].get() : undefined,
  );

  if (!animal || (activityId && activity?.animalId !== animal.id))
    return <AnimalNotFound />;

  return (
    <AddWeightSheet
      animalId={animal.id}
      animalName={animal.name}
      activity={activity}
    />
  );
}
