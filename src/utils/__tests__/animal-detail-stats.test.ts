import i18n from "@/i18n";
import {
  buildFeedStat,
  buildRoutineStat,
  buildWeightTrend,
} from "@/utils/animal-detail-stats";
import type { WeightChartData } from "@/utils/weight-chart";

const t = i18n.getFixedT("en");

function record(weight: number, occurredAt: string) {
  return { weight, occurredAt } as NonNullable<WeightChartData["first"]>;
}

function chart(overrides: Partial<WeightChartData>): WeightChartData {
  return {
    points: [],
    count: 2,
    total: 2,
    first: record(100, "2026-01-01T00:00:00.000Z"),
    last: record(150, "2026-02-01T00:00:00.000Z"),
    deltaGrams: 50,
    ...overrides,
  };
}

describe("buildWeightTrend", () => {
  it("needs at least two weigh-ins", () => {
    expect(buildWeightTrend(chart({ count: 1 }), "g", t)).toBeNull();
    expect(buildWeightTrend(chart({ first: null }), "g", t)).toBeNull();
  });

  it("reports direction from the gram delta", () => {
    expect(buildWeightTrend(chart({}), "g", t)?.direction).toBe("up");
    expect(buildWeightTrend(chart({ deltaGrams: -5 }), "g", t)?.direction).toBe(
      "down",
    );
    expect(buildWeightTrend(chart({ deltaGrams: 0 }), "g", t)?.direction).toBe(
      "flat",
    );
  });

  it("shows a window label only when older weigh-ins were dropped", () => {
    expect(buildWeightTrend(chart({}), "g", t)?.window).toBeNull();
    expect(
      buildWeightTrend(chart({ total: 12 }), "g", t)?.window,
    ).not.toBeNull();
  });
});

describe("buildFeedStat", () => {
  it("shows the overdue count in the danger colour", () => {
    const stat = buildFeedStat(
      { occurredAt: "2026-03-01T00:00:00Z" },
      2,
      "red",
      t,
    );

    expect(stat.secondary).toBe("2 days overdue");
    expect(stat.secondaryColor).toBe("red");
  });

  it("says nothing was logged when there is no feeding", () => {
    const stat = buildFeedStat(undefined, null, "red", t);

    expect(stat.secondary).toBe("No feeding logged");
    expect(stat.secondaryColor).toBeUndefined();
  });
});

describe("buildRoutineStat", () => {
  const input = {
    key: "water" as const,
    labelKey: "detail.lastWaterChange",
    noneKey: "water.noneLogged",
    dangerColor: "red",
  };

  it("prefers the overdue count even with no record", () => {
    const stat = buildRoutineStat(
      { ...input, latest: undefined, overdueDays: 3 },
      t,
    );

    expect(stat.secondary).toBe("3 days overdue");
  });

  it("falls back to the none-logged copy", () => {
    const stat = buildRoutineStat(
      { ...input, latest: undefined, overdueDays: null },
      t,
    );

    expect(stat.secondary).toBe("No water change logged");
  });
});
