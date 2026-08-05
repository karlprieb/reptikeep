import { batch, observable } from "@legendapp/state";
import { syncObservable } from "@legendapp/state/sync";
import { randomUUID } from "expo-crypto";

import {
  clearManagedAnimalPhotos,
  deleteManagedAnimalPhoto,
} from "@/utils/animal-photo-storage";

import { toCalendarDate } from "@/utils/format-date";

import { persistedAsWritten, persistPlugin } from "./persist";
import { removeActivitiesForAnimal } from "./activity-stores";
import { removeDocumentsForAnimal } from "./document";
import type { AnimalSchedule, CareSchedule } from "./care-schedule";
import type { AnimalLoggingDefaults } from "./logging-defaults";

export interface Animal {
  id: string;
  /** An instant: full UTC ISO, `YYYY-MM-DDTHH:MM:SS.sssZ`. */
  createdAt: string;
  photo?: string;
  name: string;
  commonName?: string;
  scientificName?: string;
  sex: "unknown" | "male" | "female";
  /** A calendar date: bare `YYYY-MM-DD`, no time and no zone. */
  birthDate?: string;
  /** A calendar date: bare `YYYY-MM-DD`, no time and no zone. */
  acquiredDate?: string;
  defaults?: AnimalLoggingDefaults;
  feedingSchedule?: CareSchedule;
  waterSchedule?: AnimalSchedule;
  reminders?: { water?: boolean };
}

export type CreateAnimalInput = Omit<Animal, "id" | "createdAt" | "sex"> & {
  sex?: Animal["sex"];
};

export function createAnimal(input: CreateAnimalInput): Animal {
  return {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    sex: input.sex ?? "unknown",
  };
}

export const animals$ = observable<Record<string, Animal>>({});

export function addAnimal(animal: Animal): void {
  animals$.set({ ...animals$.peek(), [animal.id]: animal });
}

export function clearAnimals(): void {
  animals$.set({});
  clearManagedAnimalPhotos();
}

export function removeAnimal(id: string): void {
  const photoUri = animals$.peek()[id]?.photo;

  batch(() => {
    const { [id]: _, ...rest } = animals$.peek();
    animals$.set(rest);
    removeActivitiesForAnimal(id);
    removeDocumentsForAnimal(id);
  });

  deleteManagedAnimalPhoto(photoUri);
}

export function toCalendarDates(
  animals: Record<string, Animal>,
): Record<string, Animal> {
  const asCalendarDate = (value: string | undefined) =>
    value?.includes("T") ? toCalendarDate(new Date(value)) : value;

  return Object.fromEntries(
    Object.entries(animals).map(([id, animal]) => [
      id,
      {
        ...animal,
        birthDate: asCalendarDate(animal.birthDate),
        acquiredDate: asCalendarDate(animal.acquiredDate),
      },
    ]),
  );
}

syncObservable(animals$, {
  persist: {
    name: "animals",
    plugin: persistPlugin,
    transform: persistedAsWritten(toCalendarDates),
  },
});
