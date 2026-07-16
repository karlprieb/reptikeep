import { act, fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";

import { AddHabitatSheet } from "@/components/add-habitat-sheet";
import { habitatStore, type HabitatActivity } from "@/state/habitat";

const ANIMAL_ID = "animal-1";

beforeEach(() => {
  act(() => habitatStore.clear());
});

describe("AddHabitatSheet", () => {
  it("renders the default fields", () => {
    const screen = render(
      <AddHabitatSheet animalId={ANIMAL_ID} animalName="Willow" />,
    );

    expect(screen.getByText("Log habitat")).toBeTruthy();
    expect(screen.getByLabelText("Water changed")).toBeTruthy();
    expect(screen.getByPlaceholderText("Add an observation")).toBeTruthy();
  });

  it("saves an untouched record as a water change", () => {
    const screen = render(
      <AddHabitatSheet animalId={ANIMAL_ID} animalName="Willow" />,
    );

    fireEvent.press(screen.getByLabelText("Save"));

    const [habitat] = Object.values(habitatStore.$.peek());
    expect(habitat).toMatchObject({ animalId: ANIMAL_ID, water: true });
    expect(habitat.notes).toBeUndefined();
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it("saves upkeep with the water left alone, and says so", () => {
    const screen = render(
      <AddHabitatSheet animalId={ANIMAL_ID} animalName="Willow" />,
    );

    fireEvent.press(screen.getByLabelText("Water changed"));
    expect(screen.getByText(/will not count this/)).toBeTruthy();

    fireEvent.changeText(
      screen.getByPlaceholderText("Add an observation"),
      " Replaced the substrate ",
    );
    fireEvent.press(screen.getByLabelText("Save"));

    const [habitat] = Object.values(habitatStore.$.peek());
    expect(habitat).toMatchObject({
      animalId: ANIMAL_ID,
      water: false,
      notes: "Replaced the substrate",
    });
  });
});

describe("AddHabitatSheet editing an existing record", () => {
  const EXISTING: HabitatActivity = {
    id: "habitat-1",
    animalId: ANIMAL_ID,
    createdAt: "2026-07-20T09:00:00.000Z",
    occurredAt: "2026-07-21T10:00:00.000Z",
    water: false,
    notes: "Scrubbed the glass",
  };

  it("opens on the record's own values, under an editing title", () => {
    const screen = render(
      <AddHabitatSheet
        animalId={ANIMAL_ID}
        animalName="Willow"
        activity={EXISTING}
      />,
    );

    expect(screen.getByText("Edit habitat")).toBeTruthy();
    expect(screen.getByDisplayValue("Scrubbed the glass")).toBeTruthy();
    expect(
      screen.getByLabelText("Water changed").props.accessibilityState,
    ).toEqual({ checked: false });
  });

  it("writes over the record rather than logging a second one", () => {
    act(() => habitatStore.$.set({ [EXISTING.id]: EXISTING }));

    const screen = render(
      <AddHabitatSheet
        animalId={ANIMAL_ID}
        animalName="Willow"
        activity={EXISTING}
      />,
    );
    fireEvent.press(screen.getByLabelText("Water changed"));
    fireEvent.press(screen.getByLabelText("Save"));

    const records = Object.values(habitatStore.$.peek());
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      id: EXISTING.id,
      createdAt: EXISTING.createdAt,
      occurredAt: EXISTING.occurredAt,
      water: true,
      notes: "Scrubbed the glass",
    });
  });
});
