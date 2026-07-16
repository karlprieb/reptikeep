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

  return [...animals].sort((a, b) => {
    if (sort.field === "lastActivity") {
      const aAt = lastActivity[a.id];
      const bAt = lastActivity[b.id];
      if (!aAt && !bAt) return collate(a.name, b.name);
      if (!aAt) return 1;
      if (!bAt) return -1;
      return (new Date(aAt).getTime() - new Date(bAt).getTime()) * sign;
    }

    const aValue = a[sort.field];
    const bValue = b[sort.field];
    if (!aValue && !bValue) return collate(a.name, b.name);
    if (!aValue) return 1;
    if (!bValue) return -1;
    return collate(aValue, bValue) * sign;
  });
}
