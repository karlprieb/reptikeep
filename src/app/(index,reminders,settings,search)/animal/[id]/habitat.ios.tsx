import { useSelector as useValue } from "@legendapp/state/react";
import { useLocalSearchParams } from "expo-router";

import { AddHabitatSheet } from "@/components/add-habitat-sheet";
import { AnimalNotFound, useAnimalRoute } from "@/components/animal-route";
import { CARE_ROUTINES, type CareRoutine } from "@/state/care-schedule";
import { habitatStore } from "@/state/habitat";

function toRoutine(value: string | undefined): CareRoutine | undefined {
  return CARE_ROUTINES.find((routine) => routine === value);
}

export default function AddHabitatScreen() {
  const { animal, activityId } = useAnimalRoute();
  const { routine } = useLocalSearchParams<{ routine?: string }>();
  const activity = useValue(() =>
    activityId ? habitatStore.$[activityId].get() : undefined,
  );

  if (!animal) return <AnimalNotFound />;

  return (
    <AddHabitatSheet
      animalId={animal.id}
      animalName={animal.name}
      activity={activity}
      routine={toRoutine(routine)}
    />
  );
}
