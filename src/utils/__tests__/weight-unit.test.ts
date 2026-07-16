import { weightInputToGrams } from "@/utils/weight-unit";

describe("weightInputToGrams", () => {
  it.each([
    ["25", "g", 25],
    ["0.025", "kg", 25],
    ["1", "lb", 453.59237],
    ["0,5", "kg", 500],
  ] as const)("converts %s %s to grams", (value, unit, expected) => {
    expect(weightInputToGrams(value, unit)).toBeCloseTo(expected);
  });

  it.each(["", " ", "not a number", "-1"])(
    "rejects invalid input %p",
    (value) => {
      expect(weightInputToGrams(value, "g")).toBeUndefined();
    },
  );
});
