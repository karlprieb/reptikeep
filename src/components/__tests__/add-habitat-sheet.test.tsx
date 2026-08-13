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
    expect(screen.getByLabelText("Enclosure cleaned")).toBeTruthy();
    expect(screen.getByPlaceholderText("Add an observation")).toBeTruthy();
  });

  it("saves an untouched record as a water change only", () => {
    const screen = render(
      <AddHabitatSheet animalId={ANIMAL_ID} animalName="Willow" />,
    );

    fireEvent.press(screen.getByLabelText("Save"));

    const [habitat] = Object.values(habitatStore.$.peek());
    expect(habitat).toMatchObject({
      animalId: ANIMAL_ID,
      water: true,
      cleaning: false,
    });
    expect(habitat.notes).toBeUndefined();
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it("opens on the cleaning routine when a reminder sent it there", () => {
    const screen = render(
      <AddHabitatSheet
        animalId={ANIMAL_ID}
        animalName="Willow"
        routine="cleaning"
      />,
    );

    fireEvent.press(screen.getByLabelText("Save"));

    expect(Object.values(habitatStore.$.peek())[0]).toMatchObject({
      water: false,
      cleaning: true,
    });
  });

  it("opens on the water routine when a reminder sent it there", () => {
    const screen = render(
      <AddHabitatSheet
        animalId={ANIMAL_ID}
        animalName="Willow"
        routine="water"
      />,
    );

    fireEvent.press(screen.getByLabelText("Save"));

    expect(Object.values(habitatStore.$.peek())[0]).toMatchObject({
      water: true,
      cleaning: false,
    });
  });

  it("saves both toggles on together as one record", () => {
    const screen = render(
      <AddHabitatSheet animalId={ANIMAL_ID} animalName="Willow" />,
    );

    fireEvent.press(screen.getByLabelText("Enclosure cleaned"));
    fireEvent.press(screen.getByLabelText("Save"));

    const [habitat] = Object.values(habitatStore.$.peek());
    expect(habitat).toMatchObject({
      animalId: ANIMAL_ID,
      water: true,
      cleaning: true,
    });
  });

  it("saves cleaning alone with water turned off, and says each switch counts", () => {
    const screen = render(
      <AddHabitatSheet animalId={ANIMAL_ID} animalName="Willow" />,
    );

    fireEvent.press(screen.getByLabelText("Water changed"));
    fireEvent.press(screen.getByLabelText("Enclosure cleaned"));
    expect(screen.getByText(/counts toward its own schedule/)).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Save"));

    const [habitat] = Object.values(habitatStore.$.peek());
    expect(habitat).toMatchObject({
      animalId: ANIMAL_ID,
      water: false,
      cleaning: true,
    });
  });

  it("saves both toggles off as a note-only record", () => {
    const screen = render(
      <AddHabitatSheet animalId={ANIMAL_ID} animalName="Willow" />,
    );

    fireEvent.press(screen.getByLabelText("Water changed"));
    expect(screen.getByText(/no schedule counts this/)).toBeTruthy();

    fireEvent.changeText(
      screen.getByPlaceholderText("Add an observation"),
      " Replaced the substrate ",
    );
    fireEvent.press(screen.getByLabelText("Save"));

    const [habitat] = Object.values(habitatStore.$.peek());
    expect(habitat).toMatchObject({
      animalId: ANIMAL_ID,
      water: false,
      cleaning: false,
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
    cleaning: true,
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
    expect(
      screen.getByLabelText("Enclosure cleaned").props.accessibilityState,
    ).toEqual({ checked: true });
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
      cleaning: true,
      notes: "Scrubbed the glass",
    });
  });
});
