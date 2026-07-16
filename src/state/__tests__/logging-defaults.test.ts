import { addAnimal, animals$, createAnimal } from "@/state/animal";
import { animalDefaults, defaults$ } from "@/state/logging-defaults";

const ANIMAL_ID = "animal-1";

function seedAnimal(defaults?: Record<string, unknown>) {
  addAnimal({
    ...createAnimal({ name: "Juno", commonName: "Ball python" }),
    id: ANIMAL_ID,
    ...(defaults ? { defaults } : {}),
  });
}

beforeEach(() => {
  animals$.set({});
  defaults$.set({
    mealMeasure: "amount",
    frozen: false,
    weightUnit: "g",
    poopType: "poop",
  });
});

describe("animalDefaults", () => {
  it("falls back to the global setting for an animal with no overrides", () => {
    seedAnimal();
    defaults$.weightUnit.set("kg");

    expect(animalDefaults(ANIMAL_ID)).toEqual({
      mealMeasure: "amount",
      frozen: false,
      weightUnit: "kg",
      poopType: "poop",
    });
  });

  it("prefers the animal's own value over the global one", () => {
    seedAnimal({ weightUnit: "lb", poopType: "both" });
    defaults$.weightUnit.set("kg");

    const resolved = animalDefaults(ANIMAL_ID);
    expect(resolved.weightUnit).toBe("lb");
    expect(resolved.poopType).toBe("both");
  });

  it("follows the global setting field by field, not all or nothing", () => {
    seedAnimal({ weightUnit: "lb" });
    defaults$.mealMeasure.set("weight");

    const resolved = animalDefaults(ANIMAL_ID);
    expect(resolved.weightUnit).toBe("lb");
    expect(resolved.mealMeasure).toBe("weight");
  });

  it("keeps false as an override rather than reading it as absent", () => {
    seedAnimal({ frozen: false });
    defaults$.frozen.set(true);

    expect(animalDefaults(ANIMAL_ID).frozen).toBe(false);
  });

  it("resolves an animal that does not exist to the global defaults", () => {
    defaults$.poopType.set("urate");

    expect(animalDefaults("missing").poopType).toBe("urate");
  });

  it("refuses a unit corrupted in storage, which would misread every weight", () => {
    seedAnimal({ weightUnit: "stones" });

    expect(animalDefaults(ANIMAL_ID).weightUnit).toBe("g");
  });
});
