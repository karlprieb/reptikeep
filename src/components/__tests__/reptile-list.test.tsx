import { fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";

import { AnimalCard } from "@/components/animal-card";
import { ReptileEmptyState, ReptileList } from "@/components/reptile-list";
import { Colors } from "@/constants/theme";
import type { Animal } from "@/state/animal";
import { careSchedules$ } from "@/state/care-schedule";
import {
  cardBadgeAllowance,
  NO_PHOTO_SINGLE_COLUMN_HEIGHT,
  selectCardHeight,
  selectColumnCount,
} from "@/utils/reptile-list-layout";

function makeAnimal(
  overrides: Partial<Animal> & Pick<Animal, "id" | "name">,
): Animal {
  return {
    createdAt: "2026-01-01T00:00:00.000Z",
    commonName: "Leopard gecko",
    sex: "male",
    ...overrides,
  };
}

beforeEach(() => {
  careSchedules$.water.set(undefined);
});

describe("ReptileList", () => {
  it("renders the empty state when there are no animals", async () => {
    const { getByLabelText, queryByText } = await render(
      <ReptileList animals={[]} onAddPress={jest.fn()} />,
    );

    expect(getByLabelText("Add reptile")).toBeTruthy();
    expect(queryByText("Buddy")).toBeNull();
  });

  it("renders exactly one name entry per animal", async () => {
    const animals: Animal[] = [
      makeAnimal({ id: "1", name: "Buddy" }),
      makeAnimal({ id: "2", name: "Iggy" }),
      makeAnimal({ id: "3", name: "Rex" }),
    ];

    const { getByText, getAllByText } = await render(
      <ReptileList animals={animals} onAddPress={jest.fn()} />,
    );

    expect(getByText("Buddy")).toBeTruthy();
    expect(getByText("Iggy")).toBeTruthy();
    expect(getByText("Rex")).toBeTruthy();
    expect(getAllByText(/^(Buddy|Iggy|Rex)$/)).toHaveLength(3);
  });

  it("renders the dense row list instead of cards when viewMode is list", async () => {
    const animals: Animal[] = [makeAnimal({ id: "1", name: "Rex" })];

    const { getByText, queryByText } = await render(
      <ReptileList animals={animals} viewMode="list" onAddPress={jest.fn()} />,
    );

    expect(getByText("Rex")).toBeTruthy();
    expect(getByText("Never fed")).toBeTruthy();
    expect(queryByText("Leopard gecko")).toBeNull();
  });

  it("invokes onAddPress from the empty-list branch", async () => {
    const onAddPress = jest.fn();
    const { getByLabelText } = await render(
      <ReptileList animals={[]} onAddPress={onAddPress} />,
    );

    await fireEvent.press(getByLabelText("Add reptile"));
    expect(onAddPress).toHaveBeenCalledTimes(1);
  });

  it("invokes onAddPress directly on ReptileEmptyState", async () => {
    const onAddPress = jest.fn();
    const { getByLabelText } = await render(
      <ReptileEmptyState onAddPress={onAddPress} />,
    );

    await fireEvent.press(getByLabelText("Add reptile"));
    expect(onAddPress).toHaveBeenCalledTimes(1);
  });

  it("renders each animal's card with name, common name, and sex symbol", async () => {
    const animals: Animal[] = [
      makeAnimal({
        id: "1",
        name: "Buddy",
        commonName: "Ball python",
        scientificName: "Python regius",
        sex: "male",
      }),
      makeAnimal({
        id: "2",
        name: "Iggy",
        commonName: "Green iguana",
        sex: "female",
      }),
    ];

    const { getByText, queryByText } = await render(
      <ReptileList animals={animals} onAddPress={jest.fn()} />,
    );

    expect(getByText("Buddy")).toBeTruthy();
    expect(getByText("Ball python")).toBeTruthy();
    expect(getByText("Python regius")).toBeTruthy();
    expect(getByText("♂")).toBeTruthy();

    expect(getByText("Iggy")).toBeTruthy();
    expect(getByText("Green iguana")).toBeTruthy();
    expect(getByText("♀")).toBeTruthy();
    expect(queryByText("Iguana iguana")).toBeNull();
  });

  it("renders no sex symbol when sex is unknown", async () => {
    const animals: Animal[] = [
      makeAnimal({ id: "1", name: "Rex", sex: "unknown" }),
    ];

    const { queryByText } = await render(
      <ReptileList animals={animals} onAddPress={jest.fn()} />,
    );

    expect(queryByText("♂")).toBeNull();
    expect(queryByText("♀")).toBeNull();
  });

  it("says so on the card when an animal has never been fed", async () => {
    const animals: Animal[] = [makeAnimal({ id: "1", name: "Rex" })];

    const { getByText } = await render(
      <ReptileList animals={animals} onAddPress={jest.fn()} />,
    );

    expect(getByText("Never fed")).toBeTruthy();
  });

  it("dates the last feeding on the card when one is known", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-03-10T12:00:00.000Z"));
    const animals: Animal[] = [makeAnimal({ id: "1", name: "Rex" })];

    const { getByText } = await render(
      <ReptileList
        animals={animals}
        lastFed={{ "1": "2026-03-07T12:00:00.000Z" }}
        onAddPress={jest.fn()}
      />,
    );

    expect(getByText("3 days ago")).toBeTruthy();
    jest.useRealTimers();
  });

  it("shows how many days a scheduled animal is overdue", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-03-10T12:00:00.000Z"));
    const animals: Animal[] = [
      makeAnimal({
        id: "1",
        name: "Rex",
        feedingSchedule: { frequency: "weekly" },
      }),
    ];

    const screen = await render(
      <ReptileList
        animals={animals}
        lastFed={{ "1": "2026-03-01T12:00:00.000Z" }}
        onAddPress={jest.fn()}
      />,
    );

    expect(
      screen.getByText("2 days overdue", { includeHiddenElements: true }),
    ).toBeTruthy();
    expect(screen.queryByText("9 days ago")).toBeNull();
    expect(screen.getByRole("button").props.accessibilityLabel).toContain(
      "2 days overdue",
    );
    jest.useRealTimers();
  });

  it("stays at one status line while the collection water cadence is met", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-03-10T12:00:00.000Z"));
    careSchedules$.water.set({ frequency: "weekly" });
    const animals: Animal[] = [makeAnimal({ id: "1", name: "Rex" })];

    const screen = await render(
      <ReptileList
        animals={animals}
        lastWaterChange={{ "1": "2026-03-08T12:00:00.000Z" }}
        onAddPress={jest.fn()}
      />,
    );

    expect(screen.queryByText("Water overdue")).toBeNull();
    jest.useRealTimers();
  });

  it("shows one overdue warning once the collection water cadence is missed", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-03-10T12:00:00.000Z"));
    careSchedules$.water.set({ frequency: "weekly" });
    const animals: Animal[] = [makeAnimal({ id: "1", name: "Rex" })];

    const screen = await render(
      <ReptileList
        animals={animals}
        lastWaterChange={{ "1": "2026-03-01T12:00:00.000Z" }}
        onAddPress={jest.fn()}
      />,
    );

    expect(
      screen.getByText("Water overdue", { includeHiddenElements: true }),
    ).toBeTruthy();
    expect(screen.getByLabelText("drop.fill")).toBeTruthy();
    expect(screen.getByRole("button").props.accessibilityLabel).toContain(
      "Water overdue",
    );
    jest.useRealTimers();
  });

  it("combines feed and water into one overdue warning", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-03-10T12:00:00.000Z"));
    careSchedules$.water.set({ frequency: "weekly" });
    const animals: Animal[] = [
      makeAnimal({
        id: "1",
        name: "Rex",
        feedingSchedule: { frequency: "weekly" },
      }),
    ];

    const screen = await render(
      <ReptileList
        animals={animals}
        lastFed={{ "1": "2026-03-01T12:00:00.000Z" }}
        lastWaterChange={{ "1": "2026-03-01T12:00:00.000Z" }}
        onAddPress={jest.fn()}
      />,
    );

    expect(
      screen.getByText("2 days overdue", { includeHiddenElements: true }),
    ).toBeTruthy();
    expect(
      screen.getByText("Water overdue", { includeHiddenElements: true }),
    ).toBeTruthy();
    expect(screen.getByLabelText("fork.knife")).toBeTruthy();
    expect(screen.getByLabelText("drop.fill")).toBeTruthy();
    expect(screen.getByRole("button").props.accessibilityLabel).toEqual(
      expect.stringContaining("2 days overdue"),
    );
    expect(screen.getByRole("button").props.accessibilityLabel).toEqual(
      expect.stringContaining("Water overdue"),
    );
    jest.useRealTimers();
  });

  it("honors an animal's own water cadence over the collection's", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-03-10T12:00:00.000Z"));
    careSchedules$.water.set({ frequency: "monthly" });
    const animals: Animal[] = [
      makeAnimal({
        id: "1",
        name: "Rex",
        waterSchedule: { frequency: "custom", days: 3 },
      }),
      makeAnimal({
        id: "2",
        name: "Iggy",
        waterSchedule: { frequency: "off" },
      }),
    ];

    const screen = await render(
      <ReptileList
        animals={animals}
        lastWaterChange={{
          "1": "2026-03-01T12:00:00.000Z",
          "2": "2026-01-01T12:00:00.000Z",
        }}
        onAddPress={jest.fn()}
      />,
    );

    expect(
      screen.getAllByText("Water overdue", { includeHiddenElements: true }),
    ).toHaveLength(1);
    jest.useRealTimers();
  });

  it("navigates to the animal detail route when a card is tapped", async () => {
    const animals: Animal[] = [makeAnimal({ id: "abc", name: "Buddy" })];

    const { getByRole } = await render(
      <ReptileList animals={animals} onAddPress={jest.fn()} />,
    );

    await fireEvent.press(getByRole("button"));
    expect(router.push).toHaveBeenCalledWith("/animal/abc");
  });
});

describe("AnimalCard", () => {
  it("invokes onPress when tapped", async () => {
    const onPress = jest.fn();
    const { getByRole } = await render(
      <AnimalCard
        animal={makeAnimal({ id: "1", name: "Buddy" })}
        width={200}
        height={200}
        theme={Colors.light}
        onPress={onPress}
      />,
    );

    await fireEvent.press(getByRole("button"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("exposes the card as a button labelled with the animal's details", async () => {
    const { getByRole } = await render(
      <AnimalCard
        animal={makeAnimal({
          id: "1",
          name: "Buddy",
          commonName: "Ball python",
        })}
        width={200}
        height={200}
        theme={Colors.light}
        onPress={() => {}}
      />,
    );

    const button = getByRole("button");
    expect(button.props.accessibilityLabel).toContain("Buddy");
    expect(button.props.accessibilityLabel).toContain("Ball python");
    expect(button.props.accessibilityLabel).toContain("Male");
    expect(button.props.accessibilityHint).toBe("Opens details for Buddy");
  });
});

describe("selectColumnCount", () => {
  it("follows the view mode: single stays 1 column, grid is 2", () => {
    expect(selectColumnCount("cards")).toBe(1);
    expect(selectColumnCount("grid")).toBe(2);
  });

  it("falls back to one column at the accessibility text sizes regardless of view mode", () => {
    expect(selectColumnCount("grid", 1.5)).toBe(2);
    expect(selectColumnCount("grid", 1.75)).toBe(1);
    expect(selectColumnCount("grid", 3.1)).toBe(1);
    expect(selectColumnCount("cards", 1.75)).toBe(1);
  });
});

describe("cardBadgeAllowance", () => {
  it("sizes every grid card for the busiest one so the row stays even", () => {
    expect(cardBadgeAllowance(2, [0, 3, 1])).toEqual([3, 3, 3]);
  });

  it("lets a single column size each card for its own badges", () => {
    expect(cardBadgeAllowance(1, [0, 3, 1])).toEqual([0, 3, 1]);
  });

  it("copes with an empty collection", () => {
    expect(cardBadgeAllowance(2, [])).toEqual([]);
  });
});

describe("selectCardHeight", () => {
  it("uses a compact height for a single-column animal without a photo", () => {
    const animal = makeAnimal({ id: "1", name: "Willow" });

    expect(selectCardHeight(animal, 1, 370)).toBe(
      NO_PHOTO_SINGLE_COLUMN_HEIGHT,
    );
  });

  it("keeps photo cards square in a single column", () => {
    const animal = makeAnimal({
      id: "1",
      name: "Willow",
      photo: "file:///willow.jpg",
    });

    expect(selectCardHeight(animal, 1, 370)).toBe(370);
  });

  it("keeps a consistent portrait grid height with or without photos", () => {
    const animal = makeAnimal({ id: "1", name: "Willow" });

    expect(selectCardHeight(animal, 2, 200)).toBe(250);
  });

  it("adds headroom for the text block as the reading size grows", () => {
    const animal = makeAnimal({ id: "1", name: "Willow" });

    expect(selectCardHeight(animal, 2, 200, 1.5)).toBe(250 + 74);
  });

  it("stops adding headroom past twice the default reading size", () => {
    const animal = makeAnimal({ id: "1", name: "Willow" });

    expect(selectCardHeight(animal, 2, 200, 3.1)).toBe(
      selectCardHeight(animal, 2, 200, 2),
    );
  });
});
