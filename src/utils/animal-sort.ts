import type { Animal } from "@/state/animal";

export type AnimalSortField =
  "name" | "commonName" | "scientificName" | "lastActivity";
export type SortDirection = "asc" | "desc";

export interface AnimalSort {
  field: AnimalSortField;
  direction: SortDirection;
}

const collate = (a: string, b: string) =>
  a.localeCompare(b, undefined, { sensitivity: "base" });

export function sortAnimals(
  animals: Animal[],
  sort: AnimalSort,
  lastActivity: Record<string, string>,
): Animal[] {
  const sign = sort.direction === "asc" ? 1 : -1;
  const activeAt = new Map<string, number>();

  if (sort.field === "lastActivity") {
    for (const animal of animals) {
      const at = lastActivity[animal.id];
      if (at) activeAt.set(animal.id, Date.parse(at));
    }
  }

  return [...animals].sort((a, b) => {
    if (sort.field === "lastActivity") {
      const aAt = activeAt.get(a.id);
      const bAt = activeAt.get(b.id);
      if (aAt === undefined && bAt === undefined)
        return collate(a.name, b.name);
      if (aAt === undefined) return 1;
      if (bAt === undefined) return -1;
      return (aAt - bAt) * sign;
    }

    const aValue = a[sort.field];
    const bValue = b[sort.field];
    if (!aValue && !bValue) return collate(a.name, b.name);
    if (!aValue) return 1;
    if (!bValue) return -1;
    return collate(aValue, bValue) * sign;
  });
}
