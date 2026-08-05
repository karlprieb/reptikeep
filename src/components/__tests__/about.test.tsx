import { fireEvent, render } from "@testing-library/react-native";
import * as Linking from "expo-linking";
import { router } from "expo-router";

import AboutScreen from "@/app/(index,reminders,settings,search)/about";
import SettingsScreen from "@/app/(index,reminders,settings,search)/settings";

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { version: "0.1.0" } },
}));

jest.mock("expo-linking", () => ({
  openURL: jest.fn(async () => true),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe("About", () => {
  it("opens from Settings", () => {
    const screen = render(<SettingsScreen />);

    fireEvent.press(screen.getByLabelText("About"));

    expect(router.push).toHaveBeenCalledWith("/about");
  });

  it("shows the app identity and configured version", () => {
    const screen = render(<AboutScreen />);

    expect(screen.getByText("ReptiKeep")).toBeTruthy();
    expect(screen.getByText("Feed. Shed. Repeat.")).toBeTruthy();
    expect(screen.getByText("Version 0.1.0")).toBeTruthy();
    expect(screen.getByLabelText("ReptiKeep app logo")).toBeTruthy();
  });

  it("opens the repository with the system URL handler", () => {
    const screen = render(<AboutScreen />);

    fireEvent.press(screen.getByLabelText("GitHub repository"));

    expect(Linking.openURL).toHaveBeenCalledWith(
      "https://github.com/karlprieb/reptikeep",
    );
  });
});
