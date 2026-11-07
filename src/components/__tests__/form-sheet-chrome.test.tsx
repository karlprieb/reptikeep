import { fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";
import { Keyboard } from "react-native";

import { FormSheetChrome } from "@/components/form-sheet";

function renderChrome(onSave = jest.fn()) {
  return {
    onSave,
    screen: render(
      <FormSheetChrome
        namespace="shedForm"
        animalName="Willow"
        saveDisabled={false}
        onSave={onSave}
      />,
    ),
  };
}

describe("FormSheetChrome", () => {
  it("dismisses the keyboard before saving so a focused field resigns first", async () => {
    const calls: string[] = [];
    jest.spyOn(Keyboard, "dismiss").mockImplementation(() => {
      calls.push("dismiss");
    });
    const { screen } = renderChrome(() => calls.push("save"));

    await fireEvent.press((await screen).getByLabelText("Save"));

    expect(calls).toEqual(["dismiss", "save"]);
  });

  it("dismisses the keyboard before cancelling", async () => {
    const calls: string[] = [];
    jest.spyOn(Keyboard, "dismiss").mockImplementation(() => {
      calls.push("dismiss");
    });
    (router.back as jest.Mock).mockImplementation(() => calls.push("back"));
    const { screen } = renderChrome();

    await fireEvent.press((await screen).getByLabelText("Cancel"));

    expect(calls).toEqual(["dismiss", "back"]);
  });
});
