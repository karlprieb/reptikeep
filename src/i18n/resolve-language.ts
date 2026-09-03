export type SupportedLanguage = "en" | "pt-BR";

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ["en", "pt-BR"];

const BASE_LANGUAGE_MAP: Record<string, SupportedLanguage> = {
  pt: "pt-BR",
};

const SWIFT_UI_LOCALE_IDENTIFIERS: Record<SupportedLanguage, string> = {
  en: "en_US",
  "pt-BR": "pt_BR",
};

export function swiftUILocaleIdentifier(language: SupportedLanguage): string {
  return SWIFT_UI_LOCALE_IDENTIFIERS[language];
}

export function resolveLanguage(
  override: string | undefined,
  deviceLocales: { languageCode?: string | null }[],
): SupportedLanguage {
  if (override && (SUPPORTED_LANGUAGES as string[]).includes(override)) {
    return override as SupportedLanguage;
  }

  for (const locale of deviceLocales) {
    const base = locale.languageCode;
    if (base && BASE_LANGUAGE_MAP[base]) {
      return BASE_LANGUAGE_MAP[base];
    }
  }

  return "en";
}
