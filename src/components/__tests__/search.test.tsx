import { fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";

import SearchScreen from "@/app/(index,reminders,settings,search)/search";
import { animals$, type Animal } from "@/state/animal";
import { activityStores } from "@/state/activity-stores";

const REX: Animal = {
  id: "rex",
  createdAt: "2026-01-01T00:00:00.000Z",
  name: "Rex",
  sex: "unknown",
};
const AGATA: Animal = {
  id: "agata",
  createdAt: "2026-01-01T00:00:00.000Z",
  name: "Ágata",
  sex: "female",
};

beforeEach(() => {
  animals$.set({ [REX.id]: REX, [AGATA.id]: AGATA });
  activityStores.feed.$.set({});
  jest.clearAllMocks();
});

afterEach(() => {
  animals$.set({});
  activityStores.feed.$.set({});
});

describe("SearchScreen", () => {
  it("shows the localized page title", () => {
    const screen = render(<SearchScreen />);

    expect(screen.getByTestId("stack-title").props.children).toBe("Search");
  });

  it("shows all animals in name order before typing and filters live", () => {
    const screen = render(<SearchScreen />);

    expect(screen.getAllByText("Ágata")).toHaveLength(1);
    expect(screen.getAllByText("Rex")).toHaveLength(1);

    fireEvent.changeText(
      screen.getByPlaceholderText("Search reptiles"),
      "agata",
    );

    expect(screen.getByText("Ágata")).toBeTruthy();
    expect(screen.queryByText("Rex")).toBeNull();
  });

  it("shows a no-results state for a nonmatching query", () => {
    const screen = render(<SearchScreen />);

    fireEvent.changeText(
      screen.getByPlaceholderText("Search reptiles"),
      "python",
    );

    expect(screen.getByText("No reptiles found")).toBeTruthy();
    expect(screen.getByText("No reptiles match “python”.")).toBeTruthy();
  });

  it("resets the query when Cancel is pressed", () => {
    const screen = render(<SearchScreen />);
    fireEvent.changeText(screen.getByPlaceholderText("Search reptiles"), "rex");

    fireEvent.press(screen.getByTestId("stack-search-cancel"));

    expect(screen.getByText("Ágata")).toBeTruthy();
    expect(screen.getByText("Rex")).toBeTruthy();
  });

  it("opens the selected animal detail", () => {
    const screen = render(<SearchScreen />);

    fireEvent.press(screen.getByLabelText("Rex, Never fed"));

    expect(router.push).toHaveBeenCalledWith("/animal/rex");
  });

  it("shows the shared empty state and routes its action to Add reptile", () => {
    animals$.set({});
    const screen = render(<SearchScreen />);

    expect(screen.getByText("No reptiles yet")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Add reptile"));
    expect(router.push).toHaveBeenCalledWith("/add-reptile");
  });
});
