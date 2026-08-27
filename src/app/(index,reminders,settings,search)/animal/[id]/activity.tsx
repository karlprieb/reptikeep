import { useSelector as useValue } from "@legendapp/state/react";
import { useLocalSearchParams } from "expo-router";

import { ActivityDetailSheet } from "@/components/activity-detail-sheet";
import { AnimalNotFound, useAnimalRoute } from "@/components/animal-route";
import type { ActivityType } from "@/constants/theme";
import { activityStores } from "@/state/activity-stores";
import { toActivity } from "@/utils/animal-activity";

function isActivityType(value: string | undefined): value is ActivityType {
  return value !== undefined && Object.hasOwn(activityStores, value);
}

export default function ActivityDetailScreen() {
  const { animal, activityId } = useAnimalRoute();
  const { type } = useLocalSearchParams<{ type?: string }>();
  const record = useValue(() =>
    isActivityType(type) && activityId
      ? activityStores[type].$[activityId].get()
      : undefined,
  );

  if (
    !animal ||
    !record ||
    !isActivityType(type) ||
    record.animalId !== animal.id
  )
    return <AnimalNotFound />;

  return (
    <ActivityDetailSheet
      entry={toActivity(type, record)}
      animalName={animal.name}
    />
  );
}
