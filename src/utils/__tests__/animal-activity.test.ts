import type { DefecationActivity } from "@/state/defecation";
import type { FeedingActivity } from "@/state/feeding";
import type { HabitatActivity } from "@/state/habitat";
import type { ShedActivity } from "@/state/shed";
import type { WeightActivity } from "@/state/weight";
import {
  animalActivityFeed,
  lastActivityByAnimal,
  lastFedByAnimal,
  lastWaterChangeByAnimal,
  latestWaterChange,
  previousOfSameType,
  type ActivityStores,
} from "@/utils/animal-activity";

const ANIMAL = "a1";

function feeding(over: Partial<FeedingActivity> & Pick<FeedingActivity, "id">) {
  return {
    animalId: ANIMAL,
    createdAt: "2026-07-01T00:00:00.000Z",
    occurredAt: "2026-07-01T00:00:00.000Z",
    frozen: false,
    refused: false,
    ...over,
  } satisfies FeedingActivity;
}

function weight(over: Partial<WeightActivity> & Pick<WeightActivity, "id">) {
  return {
    animalId: ANIMAL,
    createdAt: "2026-07-01T00:00:00.000Z",
    occurredAt: "2026-07-01T00:00:00.000Z",
    weight: 100,
    ...over,
  } satisfies WeightActivity;
}

function shed(over: Partial<ShedActivity> & Pick<ShedActivity, "id">) {
  return {
    animalId: ANIMAL,
    createdAt: "2026-07-01T00:00:00.000Z",
    occurredAt: "2026-07-01T00:00:00.000Z",
    issues: false,
    ...over,
  } satisfies ShedActivity;
}

function defecation(
  over: Partial<DefecationActivity> & Pick<DefecationActivity, "id">,
) {
  return {
    animalId: ANIMAL,
    createdAt: "2026-07-01T00:00:00.000Z",
    occurredAt: "2026-07-01T00:00:00.000Z",
    issues: false,
    type: "poop" as const,
    ...over,
  } satisfies DefecationActivity;
}

function habitat(over: Partial<HabitatActivity> & Pick<HabitatActivity, "id">) {
  return {
    animalId: ANIMAL,
    createdAt: "2026-07-01T00:00:00.000Z",
    occurredAt: "2026-07-01T00:00:00.000Z",
    water: true,
    ...over,
  } satisfies HabitatActivity;
}

function stores(over: Partial<ActivityStores> = {}): ActivityStores {
  return {
    feedings: {},
    weights: {},
    sheds: {},
    defecations: {},
    habitats: {},
    ...over,
  };
}

describe("animalActivityFeed", () => {
  it("returns an empty list when the animal has no records", () => {
    expect(animalActivityFeed(ANIMAL, stores())).toEqual([]);
  });

  it("merges every store into one list, newest occurrence first", () => {
    const feed = animalActivityFeed(
      ANIMAL,
      stores({
        feedings: {
          f: feeding({ id: "f", occurredAt: "2026-07-21T00:00:00.000Z" }),
        },
        weights: {
          w: weight({ id: "w", occurredAt: "2026-07-14T00:00:00.000Z" }),
        },
        sheds: { s: shed({ id: "s", occurredAt: "2026-07-02T00:00:00.000Z" }) },
        defecations: {
          d: defecation({ id: "d", occurredAt: "2026-07-28T00:00:00.000Z" }),
        },
        habitats: {
          h: habitat({ id: "h", occurredAt: "2026-07-18T00:00:00.000Z" }),
        },
      }),
    );

    expect(feed.map((entry) => entry.type)).toEqual([
      "poop",
      "feed",
      "habitat",
      "weight",
      "shed",
    ]);
  });

  it("excludes records belonging to other animals", () => {
    const feed = animalActivityFeed(
      ANIMAL,
      stores({
        feedings: {
          mine: feeding({ id: "mine" }),
          theirs: feeding({ id: "theirs", animalId: "someone-else" }),
        },
      }),
    );

    expect(feed.map((entry) => entry.id)).toEqual(["mine"]);
  });

  it("orders by occurrence, not by entry time", () => {
    const feed = animalActivityFeed(
      ANIMAL,
      stores({
        feedings: {
          backdated: feeding({
            id: "backdated",
            occurredAt: "2026-07-01T00:00:00.000Z",
            createdAt: "2026-07-08T12:00:00.000Z",
          }),
          today: feeding({
            id: "today",
            occurredAt: "2026-07-08T00:00:00.000Z",
            createdAt: "2026-07-08T09:00:00.000Z",
          }),
        },
      }),
    );

    expect(feed.map((entry) => entry.id)).toEqual(["today", "backdated"]);
  });

  it("breaks an occurrence tie with the most recently entered record", () => {
    const feed = animalActivityFeed(
      ANIMAL,
      stores({
        sheds: {
          first: shed({ id: "first", createdAt: "2026-07-08T09:00:00.000Z" }),
          second: shed({ id: "second", createdAt: "2026-07-08T10:00:00.000Z" }),
        },
      }),
    );

    expect(feed.map((entry) => entry.id)).toEqual(["second", "first"]);
  });

  it("orders identical timestamps deterministically so the list never reshuffles", () => {
    const built = stores({
      sheds: { b: shed({ id: "b" }), a: shed({ id: "a" }) },
      weights: { c: weight({ id: "c" }) },
    });

    const first = animalActivityFeed(ANIMAL, built).map((entry) => entry.id);
    const second = animalActivityFeed(ANIMAL, built).map((entry) => entry.id);

    expect(first).toEqual(second);
    expect(first).toHaveLength(3);
  });

  it("carries the source record so a renderer can word its own detail", () => {
    const [entry] = animalActivityFeed(
      ANIMAL,
      stores({
        feedings: { f: feeding({ id: "f", foodType: "Mouse", refused: true }) },
      }),
    );

    expect(entry.type).toBe("feed");
    if (entry.type !== "feed") throw new Error("expected a feeding entry");
    expect(entry.record.foodType).toBe("Mouse");
    expect(entry.record.refused).toBe(true);
  });
});

describe("lastFedByAnimal", () => {
  it("keeps the newest accepted feeding per animal and omits the never-fed", () => {
    const latest = lastFedByAnimal({
      a: feeding({ id: "a", occurredAt: "2026-07-01T00:00:00.000Z" }),
      b: feeding({ id: "b", occurredAt: "2026-07-09T00:00:00.000Z" }),
      c: feeding({ id: "c", occurredAt: "2026-07-05T00:00:00.000Z" }),
      refused: feeding({
        id: "refused",
        occurredAt: "2026-07-12T00:00:00.000Z",
        refused: true,
      }),
      d: feeding({
        id: "d",
        animalId: "a2",
        occurredAt: "2026-06-02T00:00:00.000Z",
      }),
      refusedOnly: feeding({
        id: "refusedOnly",
        animalId: "a3",
        refused: true,
      }),
    });

    expect(latest).toEqual({
      [ANIMAL]: "2026-07-09T00:00:00.000Z",
      a2: "2026-06-02T00:00:00.000Z",
    });
    expect(latest.a3).toBeUndefined();
  });
});

describe("water change lookups", () => {
  const records = {
    old: habitat({ id: "old", occurredAt: "2026-07-02T00:00:00.000Z" }),
    newest: habitat({ id: "newest", occurredAt: "2026-07-20T00:00:00.000Z" }),
    cleanOnly: habitat({
      id: "cleanOnly",
      occurredAt: "2026-07-28T00:00:00.000Z",
      water: false,
    }),
    other: habitat({
      id: "other",
      animalId: "a2",
      occurredAt: "2026-06-02T00:00:00.000Z",
    }),
    cleanOnlyAnimal: habitat({
      id: "cleanOnlyAnimal",
      animalId: "a3",
      water: false,
    }),
  };

  it("takes the newest record that actually changed water", () => {
    expect(latestWaterChange(records, ANIMAL)?.id).toBe("newest");
  });

  it("omits an animal whose only habitat records changed no water", () => {
    expect(latestWaterChange(records, "a3")).toBeUndefined();
    expect(lastWaterChangeByAnimal(records)).toEqual({
      [ANIMAL]: "2026-07-20T00:00:00.000Z",
      a2: "2026-06-02T00:00:00.000Z",
    });
  });
});

describe("previousOfSameType", () => {
  it("pairs each entry with the closest older record of its own type", () => {
    const entries = animalActivityFeed(
      ANIMAL,
      stores({
        feedings: {
          f2: feeding({ id: "f2", occurredAt: "2026-07-21T00:00:00.000Z" }),
          f1: feeding({ id: "f1", occurredAt: "2026-07-07T00:00:00.000Z" }),
        },
        sheds: {
          s2: shed({ id: "s2", occurredAt: "2026-07-14T00:00:00.000Z" }),
          s1: shed({ id: "s1", occurredAt: "2026-07-02T00:00:00.000Z" }),
        },
      }),
    );

    const previous = previousOfSameType(entries);

    expect(previous["feed:f2"]?.id).toBe("f1");
    expect(previous["shed:s2"]?.id).toBe("s1");
    expect(previous["feed:f1"]).toBeUndefined();
    expect(previous["shed:s1"]).toBeUndefined();
  });
});

describe("lastActivityByAnimal", () => {
  it("takes the newest occurredAt per animal across every store given, refused or not", () => {
    const latest = lastActivityByAnimal(
      {
        f1: feeding({ id: "f1", occurredAt: "2026-07-01T00:00:00.000Z" }),
        f2: feeding({
          id: "f2",
          occurredAt: "2026-07-20T00:00:00.000Z",
          refused: true,
        }),
      },
      {
        s1: shed({
          id: "s1",
          animalId: "a2",
          occurredAt: "2026-07-15T00:00:00.000Z",
        }),
      },
    );

    expect(latest.a1).toBe("2026-07-20T00:00:00.000Z");
    expect(latest.a2).toBe("2026-07-15T00:00:00.000Z");
  });

  it("returns an empty record when every store given is empty", () => {
    expect(lastActivityByAnimal({}, {})).toEqual({});
  });
});
