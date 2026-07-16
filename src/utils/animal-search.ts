import type { Animal } from "@/state/animal";

export function normalizeAnimalSearchText(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase();
}

export function searchAnimals(animals: Animal[], query: string): Animal[] {
  const normalizedQuery = normalizeAnimalSearchText(query.trim());

  return animals
    .map((animal, index) => ({ animal, index }))
    .filter(
      ({ animal }) =>
        !normalizedQuery ||
        normalizeAnimalSearchText(animal.name).includes(normalizedQuery),
    )
    .sort(
      (a, b) =>
        a.animal.name.localeCompare(b.animal.name, undefined, {
          sensitivity: "base",
        }) || a.index - b.index,
    )
    .map(({ animal }) => animal);
}
