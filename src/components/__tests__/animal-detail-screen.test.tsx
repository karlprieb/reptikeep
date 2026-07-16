import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Alert } from "react-native";

import AnimalDetailScreen from "../../app/(index,reminders,settings,search)/animal/[id]";
import { animals$, type Animal } from "@/state/animal";

jest.mock("expo-router/react-navigation", () => ({
  useHeaderHeight: () => 96,
}));

const WILLOW: Animal = {
  id: "willow",
  createdAt: "2026-01-02T00:00:00.000Z",
  name: "Willow",
  commonName: "Morelia viridis",
  sex: "female",
};

type AlertButton = { text?: string; onPress?: () => void };

function pressAlertButton(text: string) {
  const buttons = jest.mocked(Alert.alert).mock.calls[0][2] as AlertButton[];
  const button = buttons.find((candidate) => candidate.text === text);
  expect(button).toBeDefined();
  button?.onPress?.();
}

beforeEach(() => {
  animals$.set({ [WILLOW.id]: WILLOW });
  jest.mocked(useLocalSearchParams).mockReturnValue({ id: WILLOW.id });
  jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
  animals$.set({});
});

describe("AnimalDetailScreen actions menu", () => {
  it("opens the edit sheet for this animal", () => {
    const screen = render(<AnimalDetailScreen />);

    fireEvent.press(screen.getByLabelText("Edit reptile"));

    expect(router.push).toHaveBeenCalledWith("/animal/willow/edit");
  });

  it("warns that deletion cannot be undone, and changes nothing unless confirmed", () => {
    const screen = render(<AnimalDetailScreen />);

    fireEvent.press(screen.getByLabelText("Delete reptile"));

    expect(Alert.alert).toHaveBeenCalledWith(
      "Delete Willow?",
      expect.stringContaining("no way to undo"),
      expect.any(Array),
    );

    pressAlertButton("Cancel");
    screen.unmount();

    expect(animals$.peek().willow).toBeDefined();
    expect(router.back).not.toHaveBeenCalled();
  });

  it("deletes only once the screen has left, so the pop never shows not-found", async () => {
    const screen = render(<AnimalDetailScreen />);
    fireEvent.press(screen.getByLabelText("Delete reptile"));

    pressAlertButton("Delete");

    expect(router.back).toHaveBeenCalledTimes(1);
    expect(animals$.peek().willow).toBeDefined();

    screen.unmount();

    await waitFor(() => {
      expect(animals$.peek().willow).toBeUndefined();
    });
  });
});
