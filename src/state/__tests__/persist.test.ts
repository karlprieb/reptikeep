import { internal } from "@legendapp/state";

import { toCalendarDates, type Animal } from "@/state/animal";
import { persistedAsWritten } from "@/state/persist";

const { safeParse, safeStringify } = internal;

function roundTrip<T>(value: T): T {
  return safeParse(safeStringify(value));
}

function load<T>(value: T, migrate?: (v: T) => T): T {
  const { load: run } = persistedAsWritten<T>(migrate);
  return run!(roundTrip(value), "get") as T;
}

describe("persistedAsWritten", () => {
  const iso = "2026-07-21T15:38:00.000Z";

  it("is answering a real revival, not a hypothetical one", () => {
    expect(roundTrip({ occurredAt: iso }).occurredAt).toBeInstanceOf(Date);
  });

  it("returns instants as the strings they were written as", () => {
    const record = { id: "a", occurredAt: iso, createdAt: iso };

    expect(load(record)).toEqual(record);
  });

  it("reaches instants nested inside a keyed table", () => {
    const table = { a: { id: "a", occurredAt: iso } };

    expect(load(table).a.occurredAt).toBe(iso);
  });

  it("leaves everything that is not an instant alone", () => {
    const record = {
      count: 3,
      flag: false,
      missing: undefined,
      empty: null,
      calendarDate: "2019-04-12",
      words: ["a", "b"],
    };

    expect(load(record)).toEqual(record);
  });

  it("runs the migration after the revival is undone", () => {
    const seen: unknown[] = [];
    load({ occurredAt: iso }, (value) => {
      seen.push(value.occurredAt);
      return value;
    });

    expect(seen).toEqual([iso]);
  });
});

describe("toCalendarDates", () => {
  function animal(overrides: Partial<Animal>): Record<string, Animal> {
    return {
      a: {
        id: "a",
        createdAt: "2026-01-02T00:00:00.000Z",
        name: "Willow",
        sex: "female",
        ...overrides,
      },
    };
  }

  it("carries a legacy instant forward as the day it was picked", () => {
    const picked = new Date(2019, 3, 12);
    const migrated = toCalendarDates(
      animal({ birthDate: picked.toISOString() }),
    );

    expect(migrated.a.birthDate).toBe("2019-04-12");
  });

  it("migrates a late-evening pick to that evening's day, not the next", () => {
    const lateEvening = new Date(2019, 3, 12, 23, 30);
    const migrated = toCalendarDates(
      animal({ acquiredDate: lateEvening.toISOString() }),
    );

    expect(migrated.a.acquiredDate).toBe("2019-04-12");
  });

  it("is idempotent, because it runs on every load", () => {
    const once = toCalendarDates(animal({ birthDate: "2019-04-12" }));

    expect(toCalendarDates(once)).toEqual(once);
  });

  it("leaves an absent date absent rather than inventing one", () => {
    const migrated = toCalendarDates(animal({}));

    expect(migrated.a.birthDate).toBeUndefined();
    expect(migrated.a.acquiredDate).toBeUndefined();
  });

  it("does not touch the record's own createdAt instant", () => {
    const migrated = toCalendarDates(animal({}));

    expect(migrated.a.createdAt).toBe("2026-01-02T00:00:00.000Z");
  });
});
