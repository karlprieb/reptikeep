import { feedingStore } from "@/state/feeding";
import { habitatStore } from "@/state/habitat";
import { resummarizeActivities } from "@/state/activity-stores";
import { lastActivityAt, summaries$ } from "@/state/summary";
import { weightStore } from "@/state/weight";
import { lastCareByAnimal, lastFedByAnimal } from "@/utils/animal-activity";

const ANIMAL = "a1";
const OTHER = "a2";

function feeding(
  id: string,
  occurredAt: string,
  over: Partial<{ animalId: string; refused: boolean }> = {},
) {
  return {
    id,
    animalId: over.animalId ?? ANIMAL,
    createdAt: occurredAt,
    occurredAt,
    frozen: false,
    refused: over.refused ?? false,
  };
}

function habitat(
  id: string,
  occurredAt: string,
  over: Partial<{ animalId: string; water: boolean; cleaning: boolean }> = {},
) {
  return {
    id,
    animalId: over.animalId ?? ANIMAL,
    createdAt: occurredAt,
    occurredAt,
    water: over.water ?? false,
    cleaning: over.cleaning ?? false,
  };
}

/** The summary must always equal what a fresh scan of the records would say. */
function expectSummaryMatchesRecords() {
  const fed = lastFedByAnimal(feedingStore.$.peek());
  const care = lastCareByAnimal(habitatStore.$.peek());
  const summary = summaries$.peek();

  for (const animalId of new Set([
    ...Object.keys(fed),
    ...Object.keys(care.water),
    ...Object.keys(care.cleaning),
  ])) {
    expect(summary[animalId]?.lastFedAt).toBe(fed[animalId]);
    expect(summary[animalId]?.lastWaterAt).toBe(care.water[animalId]);
    expect(summary[animalId]?.lastCleanAt).toBe(care.cleaning[animalId]);
  }
}

describe("activity summaries", () => {
  beforeEach(() => {
    feedingStore.clear();
    habitatStore.clear();
    weightStore.clear();
    summaries$.set({});
  });

  it("records the newest accepted feeding, not the newest feeding", () => {
    feedingStore.add(feeding("f1", "2026-07-01T00:00:00.000Z"));
    feedingStore.add(feeding("f2", "2026-07-09T00:00:00.000Z"));
    feedingStore.add(
      feeding("refused", "2026-07-20T00:00:00.000Z", { refused: true }),
    );

    expect(summaries$.peek()[ANIMAL].lastFedAt).toBe(
      "2026-07-09T00:00:00.000Z",
    );
    expectSummaryMatchesRecords();
  });

  it("keeps water and cleaning disjoint", () => {
    habitatStore.add(
      habitat("h1", "2026-07-02T00:00:00.000Z", { water: true }),
    );
    habitatStore.add(
      habitat("h2", "2026-07-20T00:00:00.000Z", { cleaning: true }),
    );

    const summary = summaries$.peek()[ANIMAL];
    expect(summary.lastWaterAt).toBe("2026-07-02T00:00:00.000Z");
    expect(summary.lastCleanAt).toBe("2026-07-20T00:00:00.000Z");
    expectSummaryMatchesRecords();
  });

  it("falls back to the previous record when the newest is deleted", () => {
    feedingStore.add(feeding("f1", "2026-07-01T00:00:00.000Z"));
    feedingStore.add(feeding("f2", "2026-07-09T00:00:00.000Z"));

    feedingStore.remove("f2");

    expect(summaries$.peek()[ANIMAL].lastFedAt).toBe(
      "2026-07-01T00:00:00.000Z",
    );
    expectSummaryMatchesRecords();
  });

  it("clears the entry when an animal's last record goes", () => {
    feedingStore.add(feeding("f1", "2026-07-01T00:00:00.000Z"));
    feedingStore.remove("f1");

    expect(summaries$.peek()[ANIMAL].lastFedAt).toBeUndefined();
  });

  it("leaves other animals alone", () => {
    feedingStore.add(feeding("mine", "2026-07-01T00:00:00.000Z"));
    feedingStore.add(
      feeding("theirs", "2026-07-20T00:00:00.000Z", { animalId: OTHER }),
    );

    expect(summaries$.peek()[ANIMAL].lastFedAt).toBe(
      "2026-07-01T00:00:00.000Z",
    );
    expect(summaries$.peek()[OTHER].lastFedAt).toBe("2026-07-20T00:00:00.000Z");
    expectSummaryMatchesRecords();
  });

  it("drops an animal's records without touching anyone else", () => {
    feedingStore.add(feeding("mine", "2026-07-01T00:00:00.000Z"));
    feedingStore.add(
      feeding("theirs", "2026-07-20T00:00:00.000Z", { animalId: OTHER }),
    );

    feedingStore.removeForAnimal(ANIMAL);

    expect(summaries$.peek()[ANIMAL].lastFedAt).toBeUndefined();
    expect(summaries$.peek()[OTHER].lastFedAt).toBe("2026-07-20T00:00:00.000Z");
    expectSummaryMatchesRecords();
  });

  it("tracks the newest occurrence across every type", () => {
    feedingStore.add(feeding("f1", "2026-07-01T00:00:00.000Z"));
    weightStore.add({
      id: "w1",
      animalId: ANIMAL,
      createdAt: "2026-07-15T00:00:00.000Z",
      occurredAt: "2026-07-15T00:00:00.000Z",
      weight: 100,
    });

    expect(lastActivityAt(summaries$.peek()[ANIMAL])).toBe(
      "2026-07-15T00:00:00.000Z",
    );
  });

  it("rebuilds from the records after a bulk load", () => {
    feedingStore.add(feeding("f1", "2026-07-09T00:00:00.000Z"));
    summaries$.set({});

    feedingStore.resummarize();

    expect(summaries$.peek()[ANIMAL].lastFedAt).toBe(
      "2026-07-09T00:00:00.000Z",
    );
    expectSummaryMatchesRecords();
  });

  it("drops stale summaries for animals with no records on resummarize", () => {
    summaries$.set({
      [ANIMAL]: { lastFedAt: "2020-01-01T00:00:00.000Z" },
    });

    resummarizeActivities();

    expect(summaries$.peek()[ANIMAL]).toBeUndefined();
  });
});
