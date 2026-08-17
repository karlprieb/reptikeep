import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import { VISIBLE_LIMIT } from "@/components/activity-timeline";
import { AnimalDetail } from "@/components/animal-detail";
import type { Animal } from "@/state/animal";
import { careSchedules$ } from "@/state/care-schedule";
import { defecationStore } from "@/state/defecation";
import { feedingStore } from "@/state/feeding";
import { habitatStore } from "@/state/habitat";
import { shedStore } from "@/state/shed";
import { weightStore } from "@/state/weight";
import i18n from "@/i18n";

const ANIMAL_ID = "1";

function makeAnimal(
  overrides: Partial<Animal> & Pick<Animal, "id" | "name">,
): Animal {
  return {
    createdAt: "2026-01-01T00:00:00.000Z",
    commonName: "Leopard gecko",
    sex: "female",
    ...overrides,
  };
}

function renderDetail(animal: Animal) {
  return render(<AnimalDetail animal={animal} onAddActivity={() => {}} />);
}

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

beforeEach(() => {
  act(() => {
    feedingStore.clear();
    weightStore.clear();
    shedStore.clear();
    defecationStore.clear();
    habitatStore.clear();
    careSchedules$.water.set(undefined);
  });
});

describe("AnimalDetail identity", () => {
  it("renders identity as plain text when the animal has no photo", () => {
    const { getByText, queryByTestId, queryByText } = renderDetail(
      makeAnimal({
        id: ANIMAL_ID,
        name: "Iggy",
        commonName: "Green iguana",
        scientificName: "Iguana iguana",
        sex: "female",
      }),
    );

    expect(queryByTestId("expo-ui-zstack")).toBeNull();
    expect(getByText("Iggy")).toBeTruthy();
    expect(getByText("Green iguana")).toBeTruthy();
    expect(getByText("Iguana iguana")).toBeTruthy();
    expect(getByText("Female")).toBeTruthy();
    expect(queryByText("♀")).toBeNull();
  });

  it("renders identity over the photo when the animal has one", () => {
    const { getByTestId, getByText } = renderDetail(
      makeAnimal({
        id: ANIMAL_ID,
        name: "Iggy",
        commonName: "Green iguana",
        photo: "file:///animal-photos/1.jpg",
      }),
    );

    expect(getByTestId("expo-ui-zstack")).toBeTruthy();
    expect(getByText("Iggy")).toBeTruthy();
    expect(getByText("Green iguana")).toBeTruthy();
  });

  it("omits the sex label when sex is unknown", () => {
    const { queryByText } = renderDetail(
      makeAnimal({ id: ANIMAL_ID, name: "Rex", sex: "unknown" }),
    );

    expect(queryByText("Male")).toBeNull();
    expect(queryByText("Female")).toBeNull();
  });
});

describe("AnimalDetail stat boxes", () => {
  it("hides both date boxes when neither date is known", () => {
    const { queryByText } = renderDetail(
      makeAnimal({ id: ANIMAL_ID, name: "Iggy" }),
    );

    expect(queryByText("BIRTH DATE")).toBeNull();
    expect(queryByText("ACQUIRED")).toBeNull();
  });

  it("shows only the box that has a date when just one is known", () => {
    const { getByText, queryByText } = renderDetail(
      makeAnimal({ id: ANIMAL_ID, name: "Iggy", acquiredDate: "2020-02-01" }),
    );

    expect(getByText("ACQUIRED")).toBeTruthy();
    expect(getByText("Feb 1, 2020")).toBeTruthy();
    expect(queryByText("BIRTH DATE")).toBeNull();
  });

  it("shows an explicit unknown state instead of a fabricated weight or feed", () => {
    const { getByText, getAllByText } = renderDetail(
      makeAnimal({ id: ANIMAL_ID, name: "Iggy" }),
    );

    expect(getByText("CURRENT WEIGHT")).toBeTruthy();
    expect(getByText("LAST FED")).toBeTruthy();
    expect(getAllByText("—")).toHaveLength(2);
    expect(getByText("No weight logged")).toBeTruthy();
    expect(getByText("No feeding logged")).toBeTruthy();
  });

  it("uses the latest accepted feeding and shows overdue days", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-03-10T12:00:00.000Z"));
    act(() => {
      feedingStore.$.set({
        accepted: {
          id: "accepted",
          animalId: ANIMAL_ID,
          createdAt: "2026-03-01T12:00:00.000Z",
          occurredAt: "2026-03-01T12:00:00.000Z",
          frozen: true,
          refused: false,
        },
        refused: {
          id: "refused",
          animalId: ANIMAL_ID,
          createdAt: "2026-03-09T12:00:00.000Z",
          occurredAt: "2026-03-09T12:00:00.000Z",
          frozen: true,
          refused: true,
        },
      });
    });

    const screen = renderDetail(
      makeAnimal({
        id: ANIMAL_ID,
        name: "Iggy",
        feedingSchedule: { frequency: "weekly" },
      }),
    );

    expect(screen.getByText("2 days overdue")).toBeTruthy();
    expect(
      screen.getByLabelText(/Last fed, Mar 1, 2026, 2 days overdue/),
    ).toBeTruthy();
    expect(screen.queryByText("Yesterday")).toBeNull();
    jest.useRealTimers();
  });

  it("treats refused-only history as no feeding logged", () => {
    act(() => {
      feedingStore.$.set({
        refused: {
          id: "refused",
          animalId: ANIMAL_ID,
          createdAt: daysAgo(1),
          occurredAt: daysAgo(1),
          frozen: true,
          refused: true,
        },
      });
    });

    const screen = renderDetail(
      makeAnimal({
        id: ANIMAL_ID,
        name: "Iggy",
        feedingSchedule: { frequency: "daily" },
      }),
    );

    expect(screen.getByText("No feeding logged")).toBeTruthy();
    expect(screen.queryByText(/overdue/)).toBeNull();
  });

  it("hides the water box for an animal with no cadence and no record", () => {
    const { queryByText } = renderDetail(
      makeAnimal({ id: ANIMAL_ID, name: "Iggy" }),
    );

    expect(queryByText("LAST WATER CHANGE")).toBeNull();
  });

  it("shows the water box once the collection has a cadence", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-03-10T12:00:00.000Z"));
    act(() => {
      careSchedules$.water.set({ frequency: "weekly" });
    });

    const { getByText } = renderDetail(
      makeAnimal({
        id: ANIMAL_ID,
        name: "Iggy",
        createdAt: "2026-03-08T12:00:00.000Z",
      }),
    );

    expect(getByText("LAST WATER CHANGE")).toBeTruthy();
    expect(getByText("No water change logged")).toBeTruthy();
  });

  it("counts a never-logged routine overdue from the day the animal was added", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-03-10T12:00:00.000Z"));
    act(() => {
      careSchedules$.water.set({ frequency: "weekly" });
    });

    const { getByText, queryByText } = renderDetail(
      makeAnimal({
        id: ANIMAL_ID,
        name: "Iggy",
        createdAt: "2026-03-01T12:00:00.000Z",
      }),
    );

    expect(getByText("2 days overdue")).toBeTruthy();
    expect(queryByText("No water change logged")).toBeNull();
  });

  it("counts water overdue from the last record that changed water", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-03-10T12:00:00.000Z"));
    act(() => {
      careSchedules$.water.set({ frequency: "weekly" });
      habitatStore.$.set({
        changed: {
          id: "changed",
          animalId: ANIMAL_ID,
          createdAt: "2026-03-01T12:00:00.000Z",
          occurredAt: "2026-03-01T12:00:00.000Z",
          water: true,
        },
        cleanOnly: {
          id: "cleanOnly",
          animalId: ANIMAL_ID,
          createdAt: "2026-03-09T12:00:00.000Z",
          occurredAt: "2026-03-09T12:00:00.000Z",
          water: false,
        },
      });
    });

    const screen = renderDetail(makeAnimal({ id: ANIMAL_ID, name: "Iggy" }));

    expect(
      screen.getByLabelText(/Last water change, Mar 1, 2026, 2 days overdue/),
    ).toBeTruthy();
    jest.useRealTimers();
  });

  it("lets an animal opt out of the collection cadence", () => {
    act(() => {
      careSchedules$.water.set({ frequency: "weekly" });
    });

    const { queryByText } = renderDetail(
      makeAnimal({
        id: ANIMAL_ID,
        name: "Iggy",
        waterSchedule: { frequency: "off" },
      }),
    );

    expect(queryByText("LAST WATER CHANGE")).toBeNull();
  });

  it("surfaces the most recent weight, not the oldest", () => {
    act(() => {
      weightStore.$.set({
        old: {
          id: "old",
          animalId: ANIMAL_ID,
          createdAt: daysAgo(30),
          occurredAt: daysAgo(30),
          weight: 980,
        },
        recent: {
          id: "recent",
          animalId: ANIMAL_ID,
          createdAt: daysAgo(2),
          occurredAt: daysAgo(2),
          weight: 1340,
        },
      });
    });

    const { getByText, getAllByText } = renderDetail(
      makeAnimal({ id: ANIMAL_ID, name: "Iggy" }),
    );

    expect(getAllByText("1,340 g")).toHaveLength(2);
    expect(getAllByText("980 g")).toHaveLength(1);
    expect(getByText("2 days ago")).toBeTruthy();
  });
});

describe("AnimalDetail activity timeline", () => {
  it("invites the first record when the animal has no history", () => {
    const { getByText } = renderDetail(
      makeAnimal({ id: ANIMAL_ID, name: "Iggy" }),
    );

    expect(getByText("Recent activity")).toBeTruthy();
    expect(getByText("Nothing logged yet")).toBeTruthy();
    expect(
      getByText("Everything you record for Iggy will appear here."),
    ).toBeTruthy();
  });

  it("renders records from every store with their worded detail line", () => {
    act(() => {
      feedingStore.$.set({
        f1: {
          id: "f1",
          animalId: ANIMAL_ID,
          createdAt: "2026-07-21T10:00:00.000Z",
          occurredAt: "2026-07-21T10:00:00.000Z",
          foodType: "Mouse",
          amount: "2 hoppers",
          weight: 12,
          frozen: true,
          refused: true,
        },
      });
      weightStore.$.set({
        w1: {
          id: "w1",
          animalId: ANIMAL_ID,
          createdAt: "2026-07-14T10:00:00.000Z",
          occurredAt: "2026-07-14T10:00:00.000Z",
          weight: 1340,
        },
      });
      shedStore.$.set({
        s1: {
          id: "s1",
          animalId: ANIMAL_ID,
          createdAt: "2026-07-02T10:00:00.000Z",
          occurredAt: "2026-07-02T10:00:00.000Z",
          issues: false,
        },
      });
      defecationStore.$.set({
        d1: {
          id: "d1",
          animalId: ANIMAL_ID,
          createdAt: "2026-06-28T10:00:00.000Z",
          occurredAt: "2026-06-28T10:00:00.000Z",
          issues: false,
          type: "both",
        },
      });
    });

    const { getByText, queryByText } = renderDetail(
      makeAnimal({ id: ANIMAL_ID, name: "Iggy" }),
    );

    expect(queryByText("Nothing logged yet")).toBeNull();
    expect(getByText("Refused · Mouse · 2 hoppers · 12 g")).toBeTruthy();
    expect(getByText("Feces & urate")).toBeTruthy();
    expect(getByText("Jul 2, 2026")).toBeTruthy();
    expect(getByText("Jul 14, 2026")).toBeTruthy();
  });

  it("caps the list and offers the whole history from its last row", () => {
    const total = VISIBLE_LIMIT + 3;

    act(() => {
      shedStore.$.set(
        Object.fromEntries(
          Array.from({ length: total }, (_, index) => [
            `s${index}`,
            {
              id: `s${index}`,
              animalId: ANIMAL_ID,
              createdAt: daysAgo(index),
              occurredAt: daysAgo(index),
              issues: false,
            },
          ]),
        ),
      );
    });

    const { getByText, getAllByText } = renderDetail(
      makeAnimal({ id: ANIMAL_ID, name: "Iggy" }),
    );

    expect(getAllByText("Shed")).toHaveLength(VISIBLE_LIMIT);

    fireEvent.press(getByText(`See all ${total} records`));

    expect(router.push).toHaveBeenCalledWith(`/animal/${ANIMAL_ID}/history`);
  });

  it("narrows the list to one type and keeps a path to that type's history", () => {
    const sheds = VISIBLE_LIMIT + 3;

    act(() => {
      feedingStore.$.set({
        f1: {
          id: "f1",
          animalId: ANIMAL_ID,
          createdAt: daysAgo(0),
          occurredAt: daysAgo(0),
          foodType: "Mouse",
          frozen: false,
          refused: false,
        },
      });
      shedStore.$.set(
        Object.fromEntries(
          Array.from({ length: sheds }, (_, index) => [
            `s${index}`,
            {
              id: `s${index}`,
              animalId: ANIMAL_ID,
              createdAt: daysAgo(index + 1),
              occurredAt: daysAgo(index + 1),
              issues: false,
            },
          ]),
        ),
      );
    });

    const { getByLabelText, getByText, queryByText } = renderDetail(
      makeAnimal({ id: ANIMAL_ID, name: "Iggy" }),
    );

    expect(queryByText("Mouse")).toBeTruthy();
    expect(queryByText(`See all ${sheds + 1} records`)).toBeTruthy();

    fireEvent.press(getByLabelText("Shed"));

    expect(queryByText("Mouse")).toBeNull();

    fireEvent.press(getByText(`See all ${sheds} records`));

    expect(router.push).toHaveBeenCalledWith(
      `/animal/${ANIMAL_ID}/history?type=shed`,
    );
  });

  it("clears a filter whose last record disappears", () => {
    act(() => {
      feedingStore.$.set({
        f1: {
          id: "f1",
          animalId: ANIMAL_ID,
          createdAt: daysAgo(0),
          occurredAt: daysAgo(0),
          foodType: "Mouse",
          frozen: false,
          refused: false,
        },
      });
      shedStore.$.set({
        s1: {
          id: "s1",
          animalId: ANIMAL_ID,
          createdAt: daysAgo(1),
          occurredAt: daysAgo(1),
          issues: false,
        },
      });
    });

    const { getByLabelText, queryByLabelText, queryByText } = renderDetail(
      makeAnimal({ id: ANIMAL_ID, name: "Iggy" }),
    );

    fireEvent.press(getByLabelText("Shed"));
    expect(queryByText("Mouse")).toBeNull();

    act(() => {
      shedStore.$.set({});
    });

    expect(queryByLabelText("Shed")).toBeNull();
    expect(queryByText("Mouse")).toBeTruthy();
    expect(queryByText("Nothing logged yet")).toBeNull();

    act(() => {
      shedStore.$.set({
        s2: {
          id: "s2",
          animalId: ANIMAL_ID,
          createdAt: daysAgo(2),
          occurredAt: daysAgo(2),
          issues: false,
        },
      });
    });

    expect(queryByLabelText("Shed")).toBeTruthy();
    expect(queryByText("Mouse")).toBeTruthy();
  });

  it("hides the type filter when every record shares one type", () => {
    act(() => {
      shedStore.$.set({
        s1: {
          id: "s1",
          animalId: ANIMAL_ID,
          createdAt: daysAgo(1),
          occurredAt: daysAgo(1),
          issues: false,
        },
      });
    });

    const { queryByLabelText } = renderDetail(
      makeAnimal({ id: ANIMAL_ID, name: "Iggy" }),
    );

    expect(queryByLabelText("All")).toBeNull();
  });
});

describe("AnimalDetail accessibility", () => {
  it("labels each stat box with field name, value, and supporting line", () => {
    act(() => {
      weightStore.$.set({
        w1: {
          id: "w1",
          animalId: ANIMAL_ID,
          createdAt: daysAgo(2),
          occurredAt: daysAgo(2),
          weight: 1340,
        },
      });
    });

    const { getByLabelText } = renderDetail(
      makeAnimal({
        id: ANIMAL_ID,
        name: "Iggy",
        birthDate: "2019-04-12",
        acquiredDate: "2020-02-01",
      }),
    );

    expect(
      getByLabelText(/^Birth date, Apr 12, 2019, \d+ (yr \d+ mo|mo) old$/),
    ).toBeTruthy();
    expect(getByLabelText(/Acquired, Feb 1, 2020, .+ ago/)).toBeTruthy();
    expect(getByLabelText(/Current weight, 1,340 g, 2 days ago/)).toBeTruthy();
    expect(getByLabelText(/Last fed, —, No feeding logged/)).toBeTruthy();
  });

  it("labels each timeline row with type, date, and detail together", () => {
    act(() => {
      feedingStore.$.set({
        f1: {
          id: "f1",
          animalId: ANIMAL_ID,
          createdAt: "2026-07-21T10:00:00.000Z",
          occurredAt: "2026-07-21T10:00:00.000Z",
          foodType: "Mouse",
          frozen: true,
          refused: false,
        },
      });
    });

    const { getByLabelText } = renderDetail(
      makeAnimal({ id: ANIMAL_ID, name: "Iggy" }),
    );

    expect(getByLabelText(/Feed, Jul 21, 2026, Mouse/)).toBeTruthy();
  });
});

describe("AnimalDetail localization", () => {
  it("localizes overdue wording in pt-BR", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-03-10T12:00:00.000Z"));
    act(() => {
      feedingStore.$.set({
        accepted: {
          id: "accepted",
          animalId: ANIMAL_ID,
          createdAt: "2026-03-01T12:00:00.000Z",
          occurredAt: "2026-03-01T12:00:00.000Z",
          frozen: true,
          refused: false,
        },
      });
    });
    await act(async () => {
      await i18n.changeLanguage("pt-BR");
    });

    const screen = renderDetail(
      makeAnimal({
        id: ANIMAL_ID,
        name: "Iggy",
        feedingSchedule: { frequency: "weekly" },
      }),
    );

    expect(screen.getByText("2 dias de atraso")).toBeTruthy();

    await act(async () => {
      await i18n.changeLanguage("en");
    });
    jest.useRealTimers();
  });

  it("renders pt-BR stat labels and timeline copy when language is set", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-07-16T12:00:00.000Z"));
    await act(async () => {
      await i18n.changeLanguage("pt-BR");
    });

    const { getByText, queryByText } = renderDetail(
      makeAnimal({ id: ANIMAL_ID, name: "Iggy", birthDate: "2019-04-12" }),
    );

    await waitFor(() => {
      expect(getByText("DATA DE NASCIMENTO")).toBeTruthy();
    });

    expect(getByText(/\d+ anos? e \d+ meses? de vida/)).toBeTruthy();
    expect(queryByText(/\b(?:yr|mo|old)\b/i)).toBeNull();
    expect(getByText("PESO ATUAL")).toBeTruthy();
    expect(getByText("ÚLTIMA ALIMENTAÇÃO")).toBeTruthy();
    expect(getByText("Atividades recentes")).toBeTruthy();
    expect(getByText("Nada registrado ainda")).toBeTruthy();

    await act(async () => {
      await i18n.changeLanguage("en");
    });
    jest.useRealTimers();
  });

  it("hides the months figure in pt-BR when the age lands on an exact year", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-04-12T12:00:00.000Z"));
    await act(async () => {
      await i18n.changeLanguage("pt-BR");
    });

    const { getByText } = renderDetail(
      makeAnimal({ id: ANIMAL_ID, name: "Iggy", birthDate: "2019-04-12" }),
    );

    await waitFor(() => {
      expect(getByText("7 anos de vida")).toBeTruthy();
    });

    await act(async () => {
      await i18n.changeLanguage("en");
    });
    jest.useRealTimers();
  });
});

describe("AnimalDetail weight trend", () => {
  function logWeights(entries: { id: string; days: number; weight: number }[]) {
    act(() => {
      weightStore.$.set(
        Object.fromEntries(
          entries.map(({ id, days, weight }) => [
            id,
            {
              id,
              animalId: ANIMAL_ID,
              createdAt: daysAgo(days),
              occurredAt: daysAgo(days),
              weight,
            },
          ]),
        ),
      );
    });
  }

  it("hides the chart until there are two weigh-ins to compare", () => {
    logWeights([{ id: "only", days: 5, weight: 400 }]);

    const { queryByText } = renderDetail(
      makeAnimal({ id: ANIMAL_ID, name: "Iggy" }),
    );

    expect(queryByText("WEIGHT TREND")).toBeNull();
  });

  it("charts every weigh-in and states the change since the first", () => {
    logWeights([
      { id: "a", days: 60, weight: 400 },
      { id: "b", days: 30, weight: 430 },
      { id: "c", days: 2, weight: 460 },
    ]);

    const { getByLabelText, getByText } = renderDetail(
      makeAnimal({ id: ANIMAL_ID, name: "Iggy" }),
    );

    expect(getByText("WEIGHT TREND")).toBeTruthy();
    expect(getByText("+60 g")).toBeTruthy();
    expect(
      getByLabelText(
        /^Weight trend, 3 weigh-ins from .+ to .+\. Latest 460 g\. Change \+60 g since the first weigh-in\.$/,
      ),
    ).toBeTruthy();
  });

  it("says how many weigh-ins the chart is showing when history is longer", () => {
    logWeights(
      Array.from({ length: 12 }, (_, index) => ({
        id: `w${index}`,
        days: 100 - index * 5,
        weight: 400 + index,
      })),
    );

    const { getByText } = renderDetail(
      makeAnimal({ id: ANIMAL_ID, name: "Iggy" }),
    );

    expect(getByText("· last 8")).toBeTruthy();
  });

  it("relabels the axis when the language changes while it is on screen", async () => {
    logWeights([
      { id: "a", days: 60, weight: 400 },
      { id: "b", days: 30, weight: 430 },
    ]);

    const { getByText, queryByText } = renderDetail(
      makeAnimal({ id: ANIMAL_ID, name: "Iggy" }),
    );

    const [month, day] = [
      new Date(daysAgo(30)).getMonth() + 1,
      new Date(daysAgo(30)).getDate(),
    ];
    expect(getByText(`${month}/${day}`)).toBeTruthy();

    await act(async () => {
      await i18n.changeLanguage("pt-BR");
    });

    await waitFor(() => {
      expect(
        getByText(
          `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`,
        ),
      ).toBeTruthy();
    });
    expect(queryByText(`${month}/${day}`)).toBeNull();

    await act(async () => {
      await i18n.changeLanguage("en");
    });
  });
});
