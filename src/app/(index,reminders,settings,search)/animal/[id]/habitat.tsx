import { useSelector as useValue } from "@legendapp/state/react";

import { AddHabitatSheet } from "@/components/add-habitat-sheet";
import { AnimalNotFound, useAnimalRoute } from "@/components/animal-route";
import { habitatStore } from "@/state/habitat";

export default function AddHabitatScreen() {
  const { animal, activityId } = useAnimalRoute();
  const activity = useValue(() =>
    activityId ? habitatStore.$[activityId].get() : undefined,
  );

  if (!animal) return <AnimalNotFound />;

  return (
    <AddHabitatSheet
      animalId={animal.id}
      animalName={animal.name}
      activity={activity}
    />
  );
}
