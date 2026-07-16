import type { Animal } from "@/state/animal";
import { sortAnimals } from "@/utils/animal-sort";

function animal(over: Partial<Animal> & Pick<Animal, "id" | "name">): Animal {
  return {
    createdAt: "2026-07-01T00:00:00.000Z",
    sex: "unknown",
    ...over,
  } satisfies Animal;
}

const ZED = animal({ id: "1", name: "Zed", commonName: "Ball python" });
const AMY = animal({ id: "2", name: "Amy" });
const MIA = animal({ id: "3", name: "Mia", commonName: "Leopard gecko" });

describe("sortAnimals", () => {
  it("sorts by name ascending and descending", () => {
    const asc = sortAnimals(
      [ZED, AMY, MIA],
      { field: "name", direction: "asc" },
      {},
    );
    expect(asc.map((a) => a.name)).toEqual(["Amy", "Mia", "Zed"]);

    const desc = sortAnimals(
      [ZED, AMY, MIA],
      { field: "name", direction: "desc" },
      {},
    );
    expect(desc.map((a) => a.name)).toEqual(["Zed", "Mia", "Amy"]);
  });

  it("pushes animals missing the sort field to the end in both directions", () => {
    const asc = sortAnimals(
      [ZED, AMY, MIA],
      { field: "commonName", direction: "asc" },
      {},
    );
    expect(asc.map((a) => a.name)).toEqual(["Zed", "Mia", "Amy"]);

    const desc = sortAnimals(
      [ZED, AMY, MIA],
      { field: "commonName", direction: "desc" },
      {},
    );
    expect(desc.map((a) => a.name)).toEqual(["Mia", "Zed", "Amy"]);
  });

  it("sorts by last activity using the supplied lookup, oldest first when ascending", () => {
    const lastActivity = {
      "1": "2026-07-10T00:00:00.000Z",
      "2": "2026-07-05T00:00:00.000Z",
    };

    const asc = sortAnimals(
      [ZED, AMY, MIA],
      { field: "lastActivity", direction: "asc" },
      lastActivity,
    );
    expect(asc.map((a) => a.name)).toEqual(["Amy", "Zed", "Mia"]);

    const desc = sortAnimals(
      [ZED, AMY, MIA],
      { field: "lastActivity", direction: "desc" },
      lastActivity,
    );
    expect(desc.map((a) => a.name)).toEqual(["Zed", "Amy", "Mia"]);
  });

  it("does not mutate the input array", () => {
    const input = [ZED, AMY, MIA];
    sortAnimals(input, { field: "name", direction: "asc" }, {});
    expect(input).toEqual([ZED, AMY, MIA]);
  });
});
