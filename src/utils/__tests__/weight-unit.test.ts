import {
  convertWeightFieldOnUnitChange,
  weightFieldToGrams,
  weightInputToGrams,
} from "@/utils/weight-unit";

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

describe("convertWeightFieldOnUnitChange", () => {
  it("preserves the exact original value when the field is untouched", () => {
    // 450 g rounds to "0.99" lb, which would reparse to 449 g if not
    // compared back against the original.
    expect(convertWeightFieldOnUnitChange("450", "g", "lb", 450)).toBe("0.99");
    expect(convertWeightFieldOnUnitChange("0.99", "lb", "g", 450)).toBe("450");
  });

  it("reparses user-edited text instead of the original value", () => {
    expect(convertWeightFieldOnUnitChange("500", "g", "kg", 450)).toBe("0.5");
  });

  it("reparses when there is no original value (new record)", () => {
    expect(convertWeightFieldOnUnitChange("1", "kg", "g", undefined)).toBe(
      "1000",
    );
  });

  it("leaves unparsable text unchanged", () => {
    expect(convertWeightFieldOnUnitChange("", "g", "kg", undefined)).toBe("");
    expect(
      convertWeightFieldOnUnitChange("not a number", "g", "kg", undefined),
    ).toBe("not a number");
  });
});

describe("weightFieldToGrams", () => {
  it("preserves the original grams when saving in a different unit than it was stored in", () => {
    // Same scenario as convertWeightFieldOnUnitChange: 450 g switched to
    // lb displays as "0.99", which must not reparse to 449 on save.
    expect(weightFieldToGrams("0.99", "lb", 450)).toBe(450);
  });

  it("reparses when the text no longer matches the original", () => {
    expect(weightFieldToGrams("1", "lb", 450)).toBe(454);
  });

  it("reparses when there is no original value (new record)", () => {
    expect(weightFieldToGrams("1", "kg", undefined)).toBe(1000);
  });
});
