import type { Animal } from "@/state/animal";
import { searchAnimals } from "@/utils/animal-search";

function animal(
  overrides: Partial<Animal> & Pick<Animal, "id" | "name">,
): Animal {
  return {
    createdAt: "2026-01-01T00:00:00.000Z",
    sex: "unknown",
    ...overrides,
  };
}

const ANIMALS = [
  animal({ id: "1", name: "Ziggy", commonName: "Leopard gecko" }),
  animal({ id: "2", name: "Ágata", scientificName: "Pantherophis" }),
  animal({ id: "3", name: "Milo" }),
];

describe("searchAnimals", () => {
  it("returns all animals for an empty or whitespace-only query", () => {
    expect(searchAnimals(ANIMALS, "").map(({ name }) => name)).toEqual([
      "Ágata",
      "Milo",
      "Ziggy",
    ]);
    expect(searchAnimals(ANIMALS, "   ").map(({ name }) => name)).toEqual([
      "Ágata",
      "Milo",
      "Ziggy",
    ]);
  });

  it("matches name substrings without case or diacritic sensitivity", () => {
    expect(searchAnimals(ANIMALS, "GAT").map(({ id }) => id)).toEqual(["2"]);
    expect(searchAnimals(ANIMALS, "agata").map(({ id }) => id)).toEqual(["2"]);
  });

  it("only searches animal names", () => {
    expect(searchAnimals(ANIMALS, "leopard")).toEqual([]);
    expect(searchAnimals(ANIMALS, "pantherophis")).toEqual([]);
  });

  it("returns no animals when nothing matches", () => {
    expect(searchAnimals(ANIMALS, "python")).toEqual([]);
  });

  it("preserves source order when names collate equally", () => {
    const agata = animal({ id: "4", name: "Agata" });
    const accentedAgata = animal({ id: "5", name: "Ágata" });

    expect(searchAnimals([accentedAgata, agata], "agata")).toEqual([
      accentedAgata,
      agata,
    ]);
  });

  it("does not mutate the source array", () => {
    const source = [...ANIMALS];
    searchAnimals(source, "");
    expect(source).toEqual(ANIMALS);
  });
});
