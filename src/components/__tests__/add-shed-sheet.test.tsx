import { act, fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";

import { AddShedSheet } from "@/components/add-shed-sheet";
import { shedStore, type ShedActivity } from "@/state/shed";

const ANIMAL_ID = "animal-1";

beforeEach(async () => {
  await act(() => shedStore.clear());
});

describe("AddShedSheet", () => {
  it("renders the default fields", async () => {
    const screen = await render(
      <AddShedSheet animalId={ANIMAL_ID} animalName="Willow" />,
    );

    expect(screen.getByText("Log shed")).toBeTruthy();
    expect(screen.getByLabelText("Issues noticed")).toBeTruthy();
    expect(screen.getByPlaceholderText("Add an observation")).toBeTruthy();
  });

  it("saves an untouched shed with no notes", async () => {
    const screen = await render(
      <AddShedSheet animalId={ANIMAL_ID} animalName="Willow" />,
    );

    await fireEvent.press(screen.getByLabelText("Save"));

    const [shed] = Object.values(shedStore.$.peek());
    expect(shed).toMatchObject({ animalId: ANIMAL_ID, issues: false });
    expect(shed.notes).toBeUndefined();
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it("saves issues and notes", async () => {
    const screen = await render(
      <AddShedSheet animalId={ANIMAL_ID} animalName="Willow" />,
    );

    await fireEvent.press(screen.getByLabelText("Issues noticed"));
    await fireEvent.changeText(
      screen.getByPlaceholderText("Add an observation"),
      " Retained eye cap ",
    );
    await fireEvent.press(screen.getByLabelText("Save"));

    const [shed] = Object.values(shedStore.$.peek());
    expect(shed).toMatchObject({
      animalId: ANIMAL_ID,
      issues: true,
      notes: "Retained eye cap",
    });
  });
});

describe("AddShedSheet editing an existing record", () => {
  const EXISTING: ShedActivity = {
    id: "shed-1",
    animalId: ANIMAL_ID,
    createdAt: "2026-07-20T09:00:00.000Z",
    occurredAt: "2026-07-21T10:00:00.000Z",
    issues: true,
    notes: "Retained eye cap",
  };

  it("opens on the record's own values, under an editing title", async () => {
    const screen = await render(
      <AddShedSheet
        animalId={ANIMAL_ID}
        animalName="Willow"
        activity={EXISTING}
      />,
    );

    expect(screen.getByText("Edit shed")).toBeTruthy();
    expect(screen.getByDisplayValue("Retained eye cap")).toBeTruthy();
    expect(
      screen.getByLabelText("Issues noticed").props.accessibilityState,
    ).toEqual({ checked: true });
  });

  it("writes over the record rather than logging a second one", async () => {
    await act(() => shedStore.$.set({ [EXISTING.id]: EXISTING }));

    const screen = await render(
      <AddShedSheet
        animalId={ANIMAL_ID}
        animalName="Willow"
        activity={EXISTING}
      />,
    );
    await fireEvent.changeText(
      screen.getByPlaceholderText("Add an observation"),
      "Came off whole",
    );
    await fireEvent.press(screen.getByLabelText("Save"));

    const records = Object.values(shedStore.$.peek());
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      id: EXISTING.id,
      createdAt: EXISTING.createdAt,
      occurredAt: EXISTING.occurredAt,
      notes: "Came off whole",
      issues: true,
    });
  });
});
