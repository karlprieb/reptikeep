import { observable } from "@legendapp/state";
import { useValue } from "@legendapp/state/react";
import { syncObservable } from "@legendapp/state/sync";

import { isWeightUnit, type WeightUnit } from "@/utils/weight-unit";

import { animals$ } from "./animal";
import type { DefecationType } from "./defecation";
import { persistPlugin } from "./persist";

export type FeedingMeasure = "amount" | "weight";

export const FEEDING_MEASURES: readonly FeedingMeasure[] = ["amount", "weight"];

export type LoggingDefaults = {
  mealMeasure: FeedingMeasure;
  frozen: boolean;
  weightUnit: WeightUnit;
  poopType: DefecationType;
};

export type AnimalLoggingDefaults = Partial<LoggingDefaults>;

const FALLBACK: LoggingDefaults = {
  mealMeasure: "weight",
  frozen: false,
  weightUnit: "g",
  poopType: "both",
};

export const defaults$ = observable<LoggingDefaults>({ ...FALLBACK });

syncObservable(defaults$, {
  persist: {
    name: "logging-defaults",
    plugin: persistPlugin,
  },
});

function resolve(
  global: LoggingDefaults,
  animal: AnimalLoggingDefaults | undefined,
): LoggingDefaults {
  const unit = animal?.weightUnit ?? global.weightUnit;

  return {
    mealMeasure: animal?.mealMeasure ?? global.mealMeasure,
    frozen: animal?.frozen ?? global.frozen,
    weightUnit: isWeightUnit(unit) ? unit : FALLBACK.weightUnit,
    poopType: animal?.poopType ?? global.poopType,
  };
}

export function animalDefaults(animalId: string): LoggingDefaults {
  return resolve(defaults$.peek(), animals$[animalId].defaults.peek());
}

export function useAnimalDefaults(animalId: string): LoggingDefaults {
  return resolve(useValue(defaults$), useValue(animals$[animalId].defaults));
}
