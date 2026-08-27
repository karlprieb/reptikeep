import { useSelector as useValue } from "@legendapp/state/react";

import { AddFeedingSheet } from "@/components/add-feeding-sheet";
import { AnimalNotFound, useAnimalRoute } from "@/components/animal-route";
import { feedingStore } from "@/state/feeding";

export default function AddFeedingScreen() {
  const { animal, activityId } = useAnimalRoute();
  const activity = useValue(() =>
    activityId ? feedingStore.$[activityId].get() : undefined,
  );

  if (!animal || (activityId && activity?.animalId !== animal.id))
    return <AnimalNotFound />;

  return (
    <AddFeedingSheet
      animalId={animal.id}
      animalName={animal.name}
      activity={activity}
    />
  );
}
