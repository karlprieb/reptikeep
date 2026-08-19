import {
  filterActivity,
  resolveDateFilter,
  type DateFilter,
} from "@/utils/activity-filter";
import type { AnimalActivity } from "@/utils/animal-activity";
import { calendarDateOf, formatAbsoluteDate } from "@/utils/format-date";

function entry(
  id: string,
  occurredAt: string,
  type: AnimalActivity["type"] = "shed",
): AnimalActivity {
  return { id, type, occurredAt, record: {} } as AnimalActivity;
}

describe("resolveDateFilter", () => {
  const now = new Date(2026, 7, 19, 12, 0);

  it("returns null for the all preset", () => {
    expect(resolveDateFilter({ preset: "all" }, now)).toBeNull();
  });

  it("passes a custom filter through untouched", () => {
    expect(
      resolveDateFilter(
        { preset: "custom", from: "2026-01-01", to: "2026-02-01" },
        now,
      ),
    ).toEqual({ from: "2026-01-01", to: "2026-02-01" });
  });

  it("resolves 7d as seven days including today", () => {
    expect(resolveDateFilter({ preset: "7d" }, now)).toEqual({
      from: "2026-08-13",
      to: "2026-08-19",
    });
  });

  it("resolves 30d as thirty days including today", () => {
    expect(resolveDateFilter({ preset: "30d" }, now)).toEqual({
      from: "2026-07-21",
      to: "2026-08-19",
    });
  });

  it("resolves 3m against the injected now", () => {
    expect(resolveDateFilter({ preset: "3m" }, now)).toEqual({
      from: "2026-05-19",
      to: "2026-08-19",
    });
  });

  it("resolves 1y against the injected now", () => {
    expect(resolveDateFilter({ preset: "1y" }, now)).toEqual({
      from: "2025-08-19",
      to: "2026-08-19",
    });
  });
});

describe("filterActivity", () => {
  const now = new Date(2026, 7, 19, 12, 0);
  const filter: DateFilter = {
    preset: "custom",
    from: "2026-08-01",
    to: "2026-08-10",
  };

  it("keeps a record dated exactly on the from bound", () => {
    const entries = [entry("a", "2026-08-01")];
    expect(filterActivity(entries, filter, null, now)).toEqual(entries);
  });

  it("keeps a record dated exactly on the to bound", () => {
    const entries = [entry("a", "2026-08-10")];
    expect(filterActivity(entries, filter, null, now)).toEqual(entries);
  });

  it("keeps a full ISO instant late in the day on the to bound", () => {
    const lateOnTo = new Date(2026, 7, 10, 23, 59, 59).toISOString();
    const entries = [entry("a", lateOnTo)];
    expect(filterActivity(entries, filter, null, now)).toEqual(entries);
  });

  it("drops the day before from", () => {
    const dayBefore = new Date(2026, 6, 31, 23, 59, 59).toISOString();
    const entries = [entry("a", dayBefore)];
    expect(filterActivity(entries, filter, null, now)).toEqual([]);
  });

  it("drops the day after to", () => {
    const entries = [entry("a", "2026-08-11")];
    expect(filterActivity(entries, filter, null, now)).toEqual([]);
  });

  it("returns the input untouched for the all preset", () => {
    const entries = [entry("a", "2020-01-01"), entry("b", "2030-01-01")];
    expect(filterActivity(entries, { preset: "all" }, null, now)).toEqual(
      entries,
    );
  });

  it("composes type and range filters", () => {
    const entries = [
      entry("a", "2026-08-05", "shed"),
      entry("b", "2026-08-05", "feed"),
      entry("c", "2026-08-20", "shed"),
    ];

    expect(filterActivity(entries, filter, "shed", now)).toEqual([entries[0]]);
  });
});

describe("filter day and displayed day agree", () => {
  it("puts a late-evening instant on the same day it renders", () => {
    const lateEvening = new Date(2026, 7, 10, 23, 30).toISOString();

    expect(calendarDateOf(lateEvening)).toBe("2026-08-10");
    expect(formatAbsoluteDate(lateEvening)).toBe(
      formatAbsoluteDate("2026-08-10"),
    );
  });

  it("puts an early-morning instant on the same day it renders", () => {
    const earlyMorning = new Date(2026, 7, 11, 0, 30).toISOString();

    expect(calendarDateOf(earlyMorning)).toBe("2026-08-11");
    expect(formatAbsoluteDate(earlyMorning)).toBe(
      formatAbsoluteDate("2026-08-11"),
    );
  });
});
