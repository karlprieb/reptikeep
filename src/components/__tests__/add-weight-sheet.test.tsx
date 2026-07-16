import { act, fireEvent, render } from "@testing-library/react-native";

import { AddWeightSheet } from "@/components/add-weight-sheet";
import { addAnimal, animals$, createAnimal } from "@/state/animal";
import { defaults$ } from "@/state/logging-defaults";
import { weightStore, type WeightActivity } from "@/state/weight";

const ANIMAL_ID = "animal-1";

const EXISTING: WeightActivity = {
  id: "weight-1",
  animalId: ANIMAL_ID,
  createdAt: "2026-07-21T10:00:00.000Z",
  occurredAt: "2026-07-21T10:00:00.000Z",
  weight: 450,
};

function saved(): WeightActivity {
  return Object.values(weightStore.$.peek())[0];
}

beforeEach(() => {
  act(() => {
    weightStore.clear();
    animals$.set({});
    defaults$.weightUnit.set("g");
    addAnimal({
      ...createAnimal({ name: "Juno", commonName: "Ball python" }),
      id: ANIMAL_ID,
    });
  });
});

describe("AddWeightSheet weight unit", () => {
  it("opens a new weigh-in in the animal's unit", () => {
    act(() => defaults$.weightUnit.set("lb"));

    const screen = render(
      <AddWeightSheet animalId={ANIMAL_ID} animalName="Juno" />,
    );

    expect(screen.getByPlaceholderText("Weight in lb")).toBeTruthy();
  });

  it("lets an animal override the global unit", () => {
    act(() => {
      defaults$.weightUnit.set("lb");
      animals$[ANIMAL_ID].defaults.set({ weightUnit: "kg" });
    });

    const screen = render(
      <AddWeightSheet animalId={ANIMAL_ID} animalName="Juno" />,
    );

    expect(screen.getByPlaceholderText("Weight in kg")).toBeTruthy();
  });

  it("keeps the stored grams when an edit saves an untouched field", () => {
    act(() => {
      weightStore.add(EXISTING);
      defaults$.weightUnit.set("lb");
    });

    const screen = render(
      <AddWeightSheet
        animalId={ANIMAL_ID}
        animalName="Juno"
        activity={EXISTING}
      />,
    );

    fireEvent.press(screen.getByLabelText("Save"));

    expect(saved().weight).toBe(450);
  });

  it("converts a retyped weight from the unit it was entered in", () => {
    act(() => {
      weightStore.add(EXISTING);
      defaults$.weightUnit.set("lb");
    });

    const screen = render(
      <AddWeightSheet
        animalId={ANIMAL_ID}
        animalName="Juno"
        activity={EXISTING}
      />,
    );

    fireEvent.changeText(screen.getByPlaceholderText("Weight in lb"), "2");
    fireEvent.press(screen.getByLabelText("Save"));

    expect(saved().weight).toBe(907);
  });

  it("stores a new weigh-in as grams whatever unit it was typed in", () => {
    act(() => defaults$.weightUnit.set("kg"));

    const screen = render(
      <AddWeightSheet animalId={ANIMAL_ID} animalName="Juno" />,
    );

    fireEvent.changeText(screen.getByPlaceholderText("Weight in kg"), "1.2");
    fireEvent.press(screen.getByLabelText("Save"));

    expect(saved().weight).toBe(1200);
  });
});
