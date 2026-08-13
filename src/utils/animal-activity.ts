import type { ActivityType } from "@/constants/theme";
import type { ActivityRecord } from "@/state/activity-store";
import { CARE_ROUTINES, type CareRoutine } from "@/state/care-schedule";
import type { DefecationActivity } from "@/state/defecation";
import type { FeedingActivity } from "@/state/feeding";
import type { HabitatActivity } from "@/state/habitat";
import type { ShedActivity } from "@/state/shed";
import type { WeightActivity } from "@/state/weight";

export type AnimalActivity =
  | { id: string; type: "feed"; occurredAt: string; record: FeedingActivity }
  | { id: string; type: "weight"; occurredAt: string; record: WeightActivity }
  | { id: string; type: "shed"; occurredAt: string; record: ShedActivity }
  | {
      id: string;
      type: "poop";
      occurredAt: string;
      record: DefecationActivity;
    }
  | {
      id: string;
      type: "habitat";
      occurredAt: string;
      record: HabitatActivity;
    };

export function toActivity(
  type: ActivityType,
  record:
    | FeedingActivity
    | WeightActivity
    | ShedActivity
    | DefecationActivity
    | HabitatActivity,
): AnimalActivity {
  return {
    id: record.id,
    type,
    occurredAt: record.occurredAt,
    record,
  } as AnimalActivity;
}

export function previousOfSameType(
  entries: AnimalActivity[],
): Record<string, AnimalActivity> {
  const previous: Record<string, AnimalActivity> = {};
  const older: Partial<Record<AnimalActivity["type"], AnimalActivity>> = {};

  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    const prior = older[entry.type];
    if (prior) previous[`${entry.type}:${entry.id}`] = prior;
    older[entry.type] = entry;
  }

  return previous;
}

function latestQualifying<T extends ActivityRecord>(
  records: Record<string, T>,
  qualifies: (record: T) => boolean,
): Record<string, T> {
  const latest: Record<string, T> = {};

  for (const record of Object.values(records)) {
    const current = latest[record.animalId];
    if (
      qualifies(record) &&
      (!current ||
        new Date(record.occurredAt).getTime() >
          new Date(current.occurredAt).getTime())
    ) {
      latest[record.animalId] = record;
    }
  }

  return latest;
}

function occurredAtByAnimal<T extends ActivityRecord>(
  latest: Record<string, T>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(latest).map(([animalId, record]) => [
      animalId,
      record.occurredAt,
    ]),
  );
}

const wasAccepted = (feeding: FeedingActivity) => !feeding.refused;
const changedWater = (habitat: HabitatActivity) => habitat.water;
const cleanedEnclosure = (habitat: HabitatActivity) =>
  habitat.cleaning === true;

export function latestAcceptedFeeding(
  feedings: Record<string, FeedingActivity>,
  animalId: string,
): FeedingActivity | undefined {
  return latestQualifying(feedings, wasAccepted)[animalId];
}

export function lastFedByAnimal(
  feedings: Record<string, FeedingActivity>,
): Record<string, string> {
  return occurredAtByAnimal(latestQualifying(feedings, wasAccepted));
}

export function latestWaterChange(
  habitats: Record<string, HabitatActivity>,
  animalId: string,
): HabitatActivity | undefined {
  return latestQualifying(habitats, changedWater)[animalId];
}

export function latestEnclosureClean(
  habitats: Record<string, HabitatActivity>,
  animalId: string,
): HabitatActivity | undefined {
  return latestQualifying(habitats, cleanedEnclosure)[animalId];
}

export function lastCareByAnimal(
  habitats: Record<string, HabitatActivity>,
): Record<CareRoutine, Record<string, string>> {
  return CARE_ROUTINES.reduce(
    (byRoutine, routine) => {
      byRoutine[routine] = occurredAtByAnimal(
        latestQualifying(
          habitats,
          routine === "water" ? changedWater : cleanedEnclosure,
        ),
      );
      return byRoutine;
    },
    {} as Record<CareRoutine, Record<string, string>>,
  );
}

export function lastActivityByAnimal(
  ...stores: Record<string, ActivityRecord>[]
): Record<string, string> {
  const latest: Record<string, string> = {};

  for (const store of stores) {
    for (const record of Object.values(store)) {
      const current = latest[record.animalId];
      if (
        !current ||
        new Date(record.occurredAt).getTime() > new Date(current).getTime()
      ) {
        latest[record.animalId] = record.occurredAt;
      }
    }
  }

  return latest;
}

export type ActivityStores = {
  feedings: Record<string, FeedingActivity>;
  weights: Record<string, WeightActivity>;
  sheds: Record<string, ShedActivity>;
  defecations: Record<string, DefecationActivity>;
  habitats: Record<string, HabitatActivity>;
};

export function animalActivityFeed(
  animalId: string,
  { feedings, weights, sheds, defecations, habitats }: ActivityStores,
): AnimalActivity[] {
  const byType = {
    feed: feedings,
    weight: weights,
    shed: sheds,
    poop: defecations,
    habitat: habitats,
  };

  return (
    Object.entries(byType).flatMap(([type, records]) =>
      Object.values(records)
        .filter((record) => record.animalId === animalId)
        .map((record) => ({
          id: record.id,
          type,
          occurredAt: record.occurredAt,
          record,
        })),
    ) as AnimalActivity[]
  ).sort((a, b) => {
    const occurred =
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
    if (occurred !== 0) return occurred;

    const created =
      new Date(b.record.createdAt).getTime() -
      new Date(a.record.createdAt).getTime();
    if (created !== 0) return created;

    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}
