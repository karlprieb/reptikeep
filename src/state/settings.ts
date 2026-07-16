import { observable } from "@legendapp/state";
import { syncObservable } from "@legendapp/state/sync";
import * as Localization from "expo-localization";

import i18n, { resolveLanguage, type SupportedLanguage } from "@/i18n";
import type { AnimalSort } from "@/utils/animal-sort";
import { persistPlugin } from "./persist";

export type LanguageSetting = "system" | SupportedLanguage;

export type ReptileViewMode = "single" | "grid" | "list";

const DEFAULT_REPTILE_SORT: AnimalSort = { field: "name", direction: "asc" };

export const settings$ = observable({
  language: "system" as LanguageSetting,
  reptileSort: DEFAULT_REPTILE_SORT,
  reptileView: "single" as ReptileViewMode,
});

export function setLanguage(lang: LanguageSetting): void {
  settings$.language.set(lang);
  applyLanguage(lang);
}

export function setReptileSort(sort: AnimalSort): void {
  settings$.reptileSort.set(sort);
}

export function setReptileView(view: ReptileViewMode): void {
  settings$.reptileView.set(view);
}

function applyLanguage(lang: LanguageSetting): void {
  const deviceLocales = Localization.getLocales();
  const override = lang === "system" ? undefined : lang;
  const resolved = resolveLanguage(override, deviceLocales);
  i18n.changeLanguage(resolved);
}

syncObservable(settings$, {
  persist: {
    name: "settings",
    plugin: persistPlugin,
  },
});

const currentOverride = settings$.language.peek();
applyLanguage(currentOverride);
