import i18n from "@/i18n";
import {
  formatFileSize,
  formatPercent,
  formatSignedPercent,
  formatWeight,
  formatWeightDelta,
} from "@/utils/format-number";

describe("formatWeight", () => {
  it("groups thousands and appends the unit", () => {
    expect(formatWeight(1340, "g")).toBe("1,340 g");
  });

  it("leaves small weights ungrouped", () => {
    expect(formatWeight(84, "g")).toBe("84 g");
  });

  it("rounds to whole grams", () => {
    expect(formatWeight(1340.6, "g")).toBe("1,341 g");
  });

  it("formats zero rather than falling back to a placeholder", () => {
    expect(formatWeight(0, "g")).toBe("0 g");
  });

  it("converts stored grams into the unit it is asked for", () => {
    expect(formatWeight(1340, "kg")).toBe("1.34 kg");
    expect(formatWeight(453.59237, "lb")).toBe("1 lb");
  });

  it("stops at two places, which is all an integer-gram record can claim", () => {
    expect(formatWeight(450, "lb")).toBe("0.99 lb");
    expect(formatWeight(7, "kg")).toBe("0.01 kg");
  });
});

describe("formatWeightDelta", () => {
  it("marks a gain with a plus", () => {
    expect(formatWeightDelta(18, "g")).toBe("+18 g");
  });

  it("marks a loss with a typographic minus", () => {
    expect(formatWeightDelta(-1240, "g")).toBe("−1,240 g");
  });

  it("reads no change as an explicit zero", () => {
    expect(formatWeightDelta(0, "g")).toBe("±0 g");
    expect(formatWeightDelta(0.4, "g")).toBe("±0 g");
  });

  it("keeps the sign after converting", () => {
    expect(formatWeightDelta(-1240, "kg")).toBe("−1.24 kg");
    expect(formatWeightDelta(1240, "lb")).toBe("+2.73 lb");
  });

  it("reads a change too small for the unit as no change", () => {
    expect(formatWeightDelta(4, "kg")).toBe("±0 kg");
  });
});

describe("formatSignedPercent", () => {
  it("keeps one decimal place", () => {
    expect(formatSignedPercent(4.44)).toBe("+4.4%");
  });

  it("drops a trailing zero decimal", () => {
    expect(formatSignedPercent(-5)).toBe("−5%");
  });

  it("reads no change as an explicit zero", () => {
    expect(formatSignedPercent(0.02)).toBe("±0%");
  });
});

describe("formatPercent", () => {
  it("drops the sign, which the arrow beside it carries", () => {
    expect(formatPercent(17.86)).toBe("17.9%");
    expect(formatPercent(-9.66)).toBe("9.7%");
    expect(formatPercent(23)).toBe("23%");
    expect(formatPercent(0)).toBe("0%");
  });
});

describe("formatFileSize", () => {
  it("steps up through the byte units", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(18223)).toBe("17.8 KB");
    expect(formatFileSize(10 * 1024 * 1024)).toBe("10 MB");
  });

  it("reads an unusable size as a placeholder", () => {
    expect(formatFileSize(-1)).toBe("—");
    expect(formatFileSize(Number.NaN)).toBe("—");
  });
});

describe("locale awareness", () => {
  it("uses the active language's separators", async () => {
    await i18n.changeLanguage("pt-BR");

    try {
      expect(formatWeight(1340, "g")).toBe("1.340 g");
      expect(formatWeight(1340, "kg")).toBe("1,34 kg");
      expect(formatWeightDelta(-1240, "kg")).toBe("−1,24 kg");
      expect(formatPercent(17.86)).toBe("17,9%");
      expect(formatFileSize(18223)).toBe("17,8 KB");
    } finally {
      await i18n.changeLanguage("en");
    }
  });
});
