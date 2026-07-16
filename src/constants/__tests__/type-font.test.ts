import { typeFontParams } from "@/constants/type-font";
import { TypeScale, Typography, type TypographyAlias } from "@/constants/theme";

const ALIASES = Object.keys(Typography) as TypographyAlias[];

const SYSTEM_FACE_ALIASES: TypographyAlias[] = [
  "heading",
  "bodyL",
  "body",
  "bodyS",
  "label",
];

describe("typeFontParams", () => {
  it("maps every alias to its canonical text-style anchor", () => {
    for (const alias of ALIASES) {
      expect(typeFontParams(alias).textStyle).toBe(TypeScale[alias].textStyle);
    }
  });

  it("passes each alias's own size through unchanged", () => {
    for (const alias of ALIASES) {
      expect(typeFontParams(alias).size).toBe(Typography[alias].fontSize);
    }
  });

  it("never returns a params object without a textStyle", () => {
    for (const alias of ALIASES) {
      expect(typeFontParams(alias).textStyle).toBeTruthy();
    }
  });

  describe("system-face aliases", () => {
    it.each(SYSTEM_FACE_ALIASES)("omits the family key for %s", (alias) => {
      const params = typeFontParams(alias);
      expect(params.family).toBeUndefined();
      expect(Object.prototype.hasOwnProperty.call(params, "family")).toBe(
        false,
      );
    });

    it("carries a weight for non-regular system-face aliases", () => {
      expect(typeFontParams("heading").weight).toBe("bold");
      expect(typeFontParams("label").weight).toBe("medium");
    });

    it("omits weight for regular system-face aliases", () => {
      expect(typeFontParams("body").weight).toBeUndefined();
      expect(typeFontParams("bodyL").weight).toBeUndefined();
      expect(typeFontParams("bodyS").weight).toBeUndefined();
    });
  });

  describe("bundled-face aliases", () => {
    it("resolves the display faces to their Solway files", () => {
      expect(typeFontParams("displayXl").family).toBe("Solway-ExtraBold");
      expect(typeFontParams("display").family).toBe("Solway-ExtraBold");
      expect(typeFontParams("title").family).toBe("Solway-Bold");
    });

    it("resolves the data face to Space Mono", () => {
      expect(typeFontParams("data").family).toBe("SpaceMono-Bold");
    });

    it("omits weight when a family is set, since the file carries it", () => {
      expect(typeFontParams("displayXl").weight).toBeUndefined();
      expect(typeFontParams("title").weight).toBeUndefined();
      expect(typeFontParams("data").weight).toBeUndefined();
    });
  });

  it("never resolves any alias to a bundled UI face", () => {
    const families = ALIASES.map(
      (alias) => typeFontParams(alias).family,
    ).filter((family): family is string => family !== undefined);

    expect(families).not.toHaveLength(0);
    for (const family of families) {
      expect(family).not.toMatch(/Inter/i);
    }
  });
});
