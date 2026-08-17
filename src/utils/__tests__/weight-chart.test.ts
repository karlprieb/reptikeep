import type { WeightActivity } from "@/state/weight";
import { weightChartData } from "@/utils/weight-chart";

function record(
  id: string,
  occurredAt: string,
  weight: number,
  createdAt = occurredAt,
): WeightActivity {
  return {
    id,
    animalId: "kaa",
    createdAt,
    occurredAt,
    weight,
  };
}

describe("weightChartData", () => {
  it("filters to one animal and sorts oldest to newest", () => {
    const weights: Record<string, WeightActivity> = {
      a: record("a", "2026-01-10T09:00:00.000Z", 400),
      c: record("c", "2026-05-20T09:00:00.000Z", 460),
      b: record("b", "2026-03-01T09:00:00.000Z", 430),
      other: {
        ...record("other", "2026-05-25T09:00:00.000Z", 900),
        animalId: "nagini",
      },
    };

    const data = weightChartData(weights, "kaa", "g");
    expect(data.count).toBe(3);
    expect(data.points.map((p) => p.y)).toEqual([400, 430, 460]);
    expect(data.first?.id).toBe("a");
    expect(data.last?.id).toBe("c");
  });

  it("labels each point with its own short date", () => {
    const weights: Record<string, WeightActivity> = {
      a: record("a", "2026-01-01T12:00:00.000Z", 400),
      b: record("b", "2026-04-17T12:00:00.000Z", 460),
    };

    const data = weightChartData(weights, "kaa", "g");
    expect(data.points.map((p) => p.x)).toEqual(["1/1", "4/17"]);
  });

  it("keeps only the most recent weigh-ins and reports the total", () => {
    const weights = Object.fromEntries(
      Array.from({ length: 14 }, (_, index) => [
        `w${index}`,
        record(
          `w${index}`,
          `2026-01-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
          400 + index,
        ),
      ]),
    );

    const data = weightChartData(weights, "kaa", "g", 10);
    expect(data.total).toBe(14);
    expect(data.count).toBe(10);
    expect(data.points[0].y).toBe(404);
    expect(data.points[9].y).toBe(413);
    expect(data.first?.id).toBe("w4");
    expect(data.last?.id).toBe("w13");
  });

  it("measures the change across the shown window, not all time", () => {
    const weights = {
      old: record("old", "2026-01-01T00:00:00.000Z", 100),
      a: record("a", "2026-02-01T00:00:00.000Z", 400),
      b: record("b", "2026-03-01T00:00:00.000Z", 460),
    };

    expect(weightChartData(weights, "kaa", "g", 2).deltaGrams).toBe(60);
  });

  it("converts grams to the requested unit", () => {
    const weights: Record<string, WeightActivity> = {
      a: record("a", "2026-01-01T00:00:00.000Z", 1000),
    };

    const data = weightChartData(weights, "kaa", "kg");
    expect(data.points[0].y).toBe(1);
  });

  it("breaks occurredAt ties by createdAt then id", () => {
    const weights: Record<string, WeightActivity> = {
      x: record("x", "2026-01-01T00:00:00.000Z", 100),
      y: record(
        "y",
        "2026-01-01T00:00:00.000Z",
        200,
        "2026-01-01T01:00:00.000Z",
      ),
    };

    const data = weightChartData(weights, "kaa", "g");
    expect(data.points.map((p) => p.y)).toEqual([100, 200]);
  });

  it("reports the change from the first to the last weigh-in", () => {
    const weights: Record<string, WeightActivity> = {
      a: record("a", "2026-01-10T00:00:00.000Z", 400),
      b: record("b", "2026-03-01T00:00:00.000Z", 460),
    };

    expect(weightChartData(weights, "kaa", "g").deltaGrams).toBe(60);
  });

  it("is empty for an animal with no weigh-ins", () => {
    const data = weightChartData({}, "kaa", "g");
    expect(data).toEqual({
      points: [],
      count: 0,
      total: 0,
      first: null,
      last: null,
      deltaGrams: 0,
    });
  });
});
