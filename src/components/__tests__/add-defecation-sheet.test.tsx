import { act, fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";

import { AddDefecationSheet } from "@/components/add-defecation-sheet";
import { defecationStore } from "@/state/defecation";
import { defaults$ } from "@/state/logging-defaults";

const ANIMAL_ID = "animal-1";

beforeEach(async () => {
  await act(() => {
    defecationStore.clear();
    defaults$.poopType.set("poop");
  });
});

describe("AddDefecationSheet", () => {
  it("renders the default fields", async () => {
    const screen = await render(
      <AddDefecationSheet animalId={ANIMAL_ID} animalName="Willow" />,
    );

    expect(screen.getByText("Log poop")).toBeTruthy();
    expect(screen.getByText("Feces")).toBeTruthy();
    expect(screen.getByText("Urate")).toBeTruthy();
    expect(screen.getByLabelText("Issues noticed")).toBeTruthy();
    expect(screen.getByPlaceholderText("Add an observation")).toBeTruthy();
  });

  it("saves an untouched defecation with the default type and no note", async () => {
    const screen = await render(
      <AddDefecationSheet animalId={ANIMAL_ID} animalName="Willow" />,
    );

    await fireEvent.press(screen.getByLabelText("Save"));

    const [defecation] = Object.values(defecationStore.$.peek());
    expect(defecation).toMatchObject({
      animalId: ANIMAL_ID,
      issues: false,
      type: "poop",
    });
    expect(defecation.note).toBeUndefined();
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it("saves the selected urate type, issues, and omits a whitespace-only note", async () => {
    const screen = await render(
      <AddDefecationSheet animalId={ANIMAL_ID} animalName="Willow" />,
    );

    await fireEvent(
      screen.getByTestId("expo-ui-picker"),
      "selectionChange",
      "urate",
    );
    await fireEvent.press(screen.getByLabelText("Issues noticed"));
    await fireEvent.changeText(
      screen.getByPlaceholderText("Add an observation"),
      "   ",
    );
    await fireEvent.press(screen.getByLabelText("Save"));

    const [defecation] = Object.values(defecationStore.$.peek());
    expect(defecation).toMatchObject({
      animalId: ANIMAL_ID,
      issues: true,
      type: "urate",
    });
    expect(defecation.note).toBeUndefined();
  });
});
