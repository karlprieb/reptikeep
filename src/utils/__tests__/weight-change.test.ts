import type { WeightActivity } from "@/state/weight";
import { previousRecord, weightChange } from "@/utils/weight-change";

function record(
  id: string,
  occurredAt: string,
  weight: number,
): WeightActivity {
  return {
    id,
    animalId: "kaa",
    createdAt: occurredAt,
    occurredAt,
    weight,
  };
}

const weights: Record<string, WeightActivity> = {
  a: record("a", "2026-01-10T09:00:00.000Z", 400),
  b: record("b", "2026-03-01T09:00:00.000Z", 430),
  c: record("c", "2026-05-20T09:00:00.000Z", 460),
  other: {
    ...record("other", "2026-05-25T09:00:00.000Z", 900),
    animalId: "nagini",
  },
};

describe("previousRecord", () => {
  it("returns the most recent weigh-in before the given moment", () => {
    const found = previousRecord("kaa", weights, "2026-06-01T09:00:00.000Z");
    expect(found?.id).toBe("c");
  });

  it("compares a backdated entry against its own neighbour", () => {
    const found = previousRecord("kaa", weights, "2026-02-01T09:00:00.000Z");
    expect(found?.id).toBe("a");
  });

  it("ignores records for other animals", () => {
    const found = previousRecord("nagini", weights, "2026-06-01T09:00:00.000Z");
    expect(found?.id).toBe("other");
  });

  it("returns undefined when nothing precedes the moment", () => {
    expect(
      previousRecord("kaa", weights, "2026-01-01T09:00:00.000Z"),
    ).toBeUndefined();
  });

  it("excludes a record at the exact same moment", () => {
    expect(
      previousRecord("kaa", weights, "2026-01-10T09:00:00.000Z"),
    ).toBeUndefined();
  });

  it("returns undefined for an unparseable moment", () => {
    expect(previousRecord("kaa", weights, "not a date")).toBeUndefined();
  });
});

describe("weightChange", () => {
  it("reports a signed gain and its percentage", () => {
    expect(weightChange(400, 430)).toEqual({
      deltaGrams: 30,
      percent: 7.5,
      implausible: false,
    });
  });

  it("reports a loss as a negative delta", () => {
    const change = weightChange(400, 380);
    expect(change.deltaGrams).toBe(-20);
    expect(change.percent).toBe(-5);
    expect(change.implausible).toBe(false);
  });

  it("flags a likely unit slip", () => {
    expect(weightChange(430, 430_000).implausible).toBe(true);
    expect(weightChange(430, 1).implausible).toBe(true);
  });

  it("does not flag a change at the threshold", () => {
    expect(weightChange(400, 600).implausible).toBe(false);
    expect(weightChange(400, 601).implausible).toBe(true);
  });

  it("stays defined when there is no previous mass to divide by", () => {
    expect(weightChange(0, 400)).toEqual({
      deltaGrams: 400,
      percent: 0,
      implausible: false,
    });
  });
});
