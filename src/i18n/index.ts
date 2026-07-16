import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import ptBR from "./locales/pt-BR.json";

export { resolveLanguage } from "./resolve-language";
export type { SupportedLanguage } from "./resolve-language";

// eslint-disable-next-line import/no-named-as-default-member
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    "pt-BR": { translation: ptBR },
  },
  fallbackLng: "en",
  supportedLngs: ["en", "pt-BR", "pt"],
  nonExplicitSupportedLngs: true,
  interpolation: { escapeValue: false },
});

export default i18n;
