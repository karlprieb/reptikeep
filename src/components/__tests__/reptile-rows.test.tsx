import { fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";

import { ReptileRows } from "@/components/reptile-rows";
import type { Animal } from "@/state/animal";

function makeAnimal(
  overrides: Partial<Animal> & Pick<Animal, "id" | "name">,
): Animal {
  return {
    createdAt: "2026-01-01T00:00:00.000Z",
    sex: "unknown",
    ...overrides,
  };
}

describe("ReptileRows", () => {
  it("renders one row per animal with its name and feeding status", () => {
    const animals: Animal[] = [
      makeAnimal({ id: "1", name: "Rex" }),
      makeAnimal({ id: "2", name: "Iggy" }),
    ];

    const { getByText, getAllByText } = render(
      <ReptileRows animals={animals} />,
    );

    expect(getByText("Rex")).toBeTruthy();
    expect(getByText("Iggy")).toBeTruthy();
    expect(getAllByText("Never fed")).toHaveLength(2);
  });

  it("shows a relative feeding line when a last-fed date is known", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-03-10T12:00:00.000Z"));
    const animals: Animal[] = [makeAnimal({ id: "1", name: "Rex" })];

    const { getByText } = render(
      <ReptileRows
        animals={animals}
        lastFed={{ "1": "2026-03-07T12:00:00.000Z" }}
      />,
    );

    expect(getByText("3 days ago")).toBeTruthy();
    jest.useRealTimers();
  });

  it("navigates to the animal detail route when a row is tapped", () => {
    const animals: Animal[] = [makeAnimal({ id: "abc", name: "Buddy" })];

    const { getByLabelText } = render(<ReptileRows animals={animals} />);

    fireEvent.press(getByLabelText("Buddy, Never fed"));
    expect(router.push).toHaveBeenCalledWith("/animal/abc");
  });
});
