import { useSelector as useValue } from "@legendapp/state/react";

import { AddShedSheet } from "@/components/add-shed-sheet";
import { AnimalNotFound, useAnimalRoute } from "@/components/animal-route";
import { shedStore } from "@/state/shed";

export default function AddShedScreen() {
  const { animal, activityId } = useAnimalRoute();
  const activity = useValue(() =>
    activityId ? shedStore.$[activityId].get() : undefined,
  );

  if (!animal || (activityId && activity?.animalId !== animal.id))
    return <AnimalNotFound />;

  return (
    <AddShedSheet
      animalId={animal.id}
      animalName={animal.name}
      activity={activity}
    />
  );
}
