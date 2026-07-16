import { resolveLanguage, SUPPORTED_LANGUAGES } from "../resolve-language";

describe("resolveLanguage", () => {
  describe("override", () => {
    it("uses override when supported", () => {
      expect(resolveLanguage("pt-BR", [{ languageCode: "en" }])).toBe("pt-BR");
    });

    it("uses override over device language", () => {
      expect(resolveLanguage("en", [{ languageCode: "pt" }])).toBe("en");
    });

    it("ignores unsupported override and falls through to device", () => {
      expect(resolveLanguage("fr", [{ languageCode: "pt" }])).toBe("pt-BR");
    });

    it("treats 'system' as no override", () => {
      expect(resolveLanguage("system", [{ languageCode: "pt" }])).toBe("pt-BR");
    });
  });

  describe("device language matching", () => {
    it("maps Portuguese device to pt-BR", () => {
      expect(resolveLanguage(undefined, [{ languageCode: "pt" }])).toBe(
        "pt-BR",
      );
    });

    it("maps pt-PT device to pt-BR", () => {
      expect(resolveLanguage(undefined, [{ languageCode: "pt" }])).toBe(
        "pt-BR",
      );
    });

    it("maps en-GB device to en", () => {
      expect(resolveLanguage(undefined, [{ languageCode: "en" }])).toBe("en");
    });

    it("maps en device to en", () => {
      expect(resolveLanguage(undefined, [{ languageCode: "en" }])).toBe("en");
    });

    it("falls back to en for unsupported language", () => {
      expect(resolveLanguage(undefined, [{ languageCode: "fr" }])).toBe("en");
    });

    it("falls back to en for empty locales", () => {
      expect(resolveLanguage(undefined, [])).toBe("en");
    });

    it("matches first supported locale in list", () => {
      expect(
        resolveLanguage(undefined, [
          { languageCode: "fr" },
          { languageCode: "pt" },
        ]),
      ).toBe("pt-BR");
    });
  });

  describe("SUPPORTED_LANGUAGES", () => {
    it("contains exactly en and pt-BR", () => {
      expect(SUPPORTED_LANGUAGES).toEqual(["en", "pt-BR"]);
    });
  });
});
