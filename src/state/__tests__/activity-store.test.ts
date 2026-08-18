import {
  createActivityStore,
  forAnimal,
  type ActivityRecord,
} from "@/state/activity-store";

interface TestActivity extends ActivityRecord {
  label: string;
}

function record(
  id: string,
  animalId: string,
  occurredAt: string,
): TestActivity {
  return {
    id,
    animalId,
    createdAt: "2024-01-01T00:00:00.000Z",
    occurredAt,
    label: id,
  };
}

describe("createActivityStore", () => {
  const store = createActivityStore<TestActivity>("test-activities", "feed");

  beforeEach(() => store.clear());

  it("keys added records by id", () => {
    store.add(record("a1", "animal-1", "2024-03-15T09:00:00.000Z"));
    store.add(record("a2", "animal-1", "2024-03-15T14:00:00.000Z"));

    expect(Object.keys(store.$.peek())).toEqual(["a1", "a2"]);
  });

  it("replaces a record added again under the same id", () => {
    store.add(record("a1", "animal-1", "2024-03-15T09:00:00.000Z"));
    store.add(record("a1", "animal-1", "2024-03-16T09:00:00.000Z"));

    expect(Object.keys(store.$.peek())).toEqual(["a1"]);
    expect(store.$.peek().a1.occurredAt).toBe("2024-03-16T09:00:00.000Z");
  });

  it("remove drops one record and leaves the rest", () => {
    store.add(record("a1", "animal-1", "2024-03-15T09:00:00.000Z"));
    store.add(record("a2", "animal-1", "2024-03-15T14:00:00.000Z"));

    store.remove("a1");

    expect(Object.keys(store.$.peek())).toEqual(["a2"]);
  });

  it("remove is a no-op for an id that is not there", () => {
    store.add(record("a1", "animal-1", "2024-03-15T09:00:00.000Z"));
    const before = store.$.peek();

    store.remove("nothing");

    expect(store.$.peek()).toBe(before);
  });

  it("removeForAnimal drops only that animal's records", () => {
    store.add(record("a1", "animal-1", "2024-03-15T09:00:00.000Z"));
    store.add(record("a2", "animal-1", "2024-03-15T14:00:00.000Z"));
    store.add(record("b1", "animal-2", "2024-03-16T08:00:00.000Z"));

    store.removeForAnimal("animal-1");

    expect(Object.keys(store.$.peek())).toEqual(["b1"]);
  });

  it("removeForAnimal is a no-op for an animal with no records", () => {
    store.add(record("b1", "animal-2", "2024-03-16T08:00:00.000Z"));

    store.removeForAnimal("animal-1");

    expect(Object.keys(store.$.peek())).toEqual(["b1"]);
  });

  it("clear empties the store", () => {
    store.add(record("a1", "animal-1", "2024-03-15T09:00:00.000Z"));

    store.clear();

    expect(store.$.peek()).toEqual({});
  });
});

describe("forAnimal", () => {
  const records = {
    a1: record("a1", "animal-1", "2024-03-15T09:00:00.000Z"),
    a2: record("a2", "animal-1", "2024-03-15T14:00:00.000Z"),
    b1: record("b1", "animal-2", "2024-03-16T08:00:00.000Z"),
  };

  it("filters by animalId", () => {
    expect(forAnimal("animal-1", records).map((r) => r.id)).toEqual([
      "a2",
      "a1",
    ]);
  });

  it("orders newest occurredAt first", () => {
    expect(forAnimal("animal-1", records)[0].id).toBe("a2");
  });

  it("returns [] for an animal with no records", () => {
    expect(forAnimal("nobody", records)).toEqual([]);
  });
});
