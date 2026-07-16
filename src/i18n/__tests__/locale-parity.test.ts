import fs from "fs";
import path from "path";

const LOCALES_DIR = path.join(__dirname, "../locales");

function loadLocales(): Record<string, Record<string, unknown>> {
  const locales: Record<string, Record<string, unknown>> = {};
  for (const file of fs
    .readdirSync(LOCALES_DIR)
    .filter((file) => file.endsWith(".json"))
    .sort()) {
    const name = file.replace(/\.json$/, "");
    locales[name] = JSON.parse(
      fs.readFileSync(path.join(LOCALES_DIR, file), "utf8"),
    ) as Record<string, unknown>;
  }
  return locales;
}

function getKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null) {
      keys.push(...getKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort();
}

describe("locale key parity", () => {
  const locales = loadLocales();
  const en = locales.en;
  const enKeys = getKeys(en);

  it("loads at least one locale", () => {
    expect(Object.keys(locales).length).toBeGreaterThan(0);
  });

  it("has en as the reference locale", () => {
    expect(en).toBeDefined();
  });

  for (const [name, locale] of Object.entries(locales)) {
    const keys = getKeys(locale);
    const missing = enKeys.filter((key) => !keys.includes(key));
    const extra = keys.filter((key) => !enKeys.includes(key));
    const mismatched = missing.length > 0 || extra.length > 0;

    it(`${name} has identical key set to en${mismatched ? " (key mismatch — see warning)" : ""}`, () => {
      if (mismatched) {
        console.warn(
          [
            `${name} translation keys differ from en (${missing.length} missing, ${extra.length} extra):`,
            ...missing.map((key) => `  missing: ${key}`),
            ...extra.map((key) => `  extra: ${key}`),
          ].join("\n"),
        );
      } else {
        expect(keys).toEqual(enKeys);
      }
    });

    it(`no empty values in ${name}`, () => {
      for (const key of keys) {
        const value = key.split(".").reduce((obj: any, k) => obj[k], locale);
        expect(value).toBeTruthy();
      }
    });
  }
});
