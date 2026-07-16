import {
  REPTILE_SPECIES,
  searchReptileCommonName,
} from "@/constants/reptile-species";

describe("searchReptileCommonName", () => {
  it("matches a prefix of the localized common name, case-insensitively", () => {
    const results = searchReptileCommonName("ba", "en");

    expect(results.map((species) => species.commonNames.en)).toContain(
      "Ball Python",
    );
    for (const species of results) {
      expect(species.commonNames.en.toLowerCase().startsWith("ba")).toBe(true);
    }
  });

  it("does not match a name that only contains the query mid-word", () => {
    const results = searchReptileCommonName("python", "en");

    expect(
      results.some((species) => species.commonNames.en === "Ball Python"),
    ).toBe(false);
  });

  it("searches the language it is given, independently of the others", () => {
    const enResults = searchReptileCommonName("ball", "en");
    const ptResults = searchReptileCommonName("ball", "pt-BR");

    expect(enResults.map((species) => species.scientificName)).toContain(
      "Python regius",
    );
    expect(ptResults).toEqual([]);
  });

  it("returns nothing for a blank query rather than the whole list", () => {
    expect(searchReptileCommonName("", "en")).toEqual([]);
    expect(searchReptileCommonName("   ", "en")).toEqual([]);
  });

  it("has a unique scientific name per entry", () => {
    const names = REPTILE_SPECIES.map((species) => species.scientificName);

    expect(new Set(names).size).toBe(names.length);
  });
});
