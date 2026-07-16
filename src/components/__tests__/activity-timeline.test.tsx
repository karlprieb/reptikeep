import { act, fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";
import { Alert } from "react-native";

import { ActivityPanel, VISIBLE_LIMIT } from "@/components/activity-timeline";
import { shedStore, type ShedActivity } from "@/state/shed";
import type { AnimalActivity } from "@/utils/animal-activity";

const ANIMAL_ID = "animal-1";

const SHED: ShedActivity = {
  id: "shed-1",
  animalId: ANIMAL_ID,
  createdAt: "2026-07-21T10:00:00.000Z",
  occurredAt: "2026-07-21T10:00:00.000Z",
  issues: false,
};

const ENTRY: AnimalActivity = {
  id: SHED.id,
  type: "shed",
  occurredAt: SHED.occurredAt,
  record: SHED,
};

function renderTimeline() {
  return render(
    <ActivityPanel
      entries={[ENTRY]}
      animalId={ANIMAL_ID}
      animalName="Juno"
      onAddActivity={() => {}}
      limit={VISIBLE_LIMIT}
      onSeeAll={() => {}}
    />,
  );
}

beforeEach(() => {
  act(() => {
    shedStore.clear();
    shedStore.$.set({ [SHED.id]: SHED });
  });
});

describe("ActivityPanel row navigation", () => {
  it("opens the record's detail sheet when the row is tapped", () => {
    const screen = renderTimeline();

    fireEvent.press(screen.getByLabelText("Shed, Jul 21 2026"));

    expect(router.push).toHaveBeenCalledWith(
      `/animal/${ANIMAL_ID}/activity?type=shed&activityId=${SHED.id}`,
    );
  });

  it("opens the record's own form sheet from the leading swipe action", () => {
    const screen = renderTimeline();

    fireEvent.press(screen.getByLabelText("Edit"));

    expect(router.push).toHaveBeenCalledWith(
      `/animal/${ANIMAL_ID}/shed?activityId=${SHED.id}`,
    );
  });
});

describe("ActivityPanel delete", () => {
  it("confirms before the trailing swipe action deletes anything", () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const screen = renderTimeline();

    fireEvent.press(screen.getByLabelText("Delete"));

    expect(alert).toHaveBeenCalledWith(
      "Delete this Shed record?",
      expect.stringContaining("no way to undo"),
      expect.any(Array),
    );
    expect(shedStore.$.peek()[SHED.id]).toBeDefined();
  });

  it("deletes only once the confirmation is accepted", () => {
    jest
      .spyOn(Alert, "alert")
      .mockImplementation((_title, _message, buttons) => {
        const confirm = buttons?.find((button) => button.text === "Delete");
        act(() => confirm?.onPress?.());
      });
    const screen = renderTimeline();

    fireEvent.press(screen.getByLabelText("Delete"));

    expect(shedStore.$.peek()[SHED.id]).toBeUndefined();
  });
});

const EARLIER_SHED: ShedActivity = {
  id: "shed-0",
  animalId: ANIMAL_ID,
  createdAt: "2026-07-09T10:00:00.000Z",
  occurredAt: "2026-07-09T10:00:00.000Z",
  issues: false,
};

const EARLIER_ENTRY: AnimalActivity = {
  id: EARLIER_SHED.id,
  type: "shed",
  occurredAt: EARLIER_SHED.occurredAt,
  record: EARLIER_SHED,
};

function weightEntry(id: string, grams: number, day: string): AnimalActivity {
  const occurredAt = `2026-07-${day}T10:00:00.000Z`;

  return {
    id,
    type: "weight",
    occurredAt,
    record: {
      id,
      animalId: ANIMAL_ID,
      createdAt: occurredAt,
      occurredAt,
      weight: grams,
    },
  };
}

function renderEntries(entries: AnimalActivity[]) {
  return render(
    <ActivityPanel
      entries={entries}
      animalId={ANIMAL_ID}
      animalName="Juno"
      onAddActivity={() => {}}
      limit={VISIBLE_LIMIT}
      onSeeAll={() => {}}
    />,
  );
}

describe("ActivityPanel change since the previous record", () => {
  it("dates a shed by the interval that closed since the last one", () => {
    const screen = renderEntries([ENTRY, EARLIER_ENTRY]);

    expect(screen.getByText("12 days since last")).toBeTruthy();
  });

  it("leaves the oldest record of a type without an interval", () => {
    const screen = renderEntries([ENTRY, EARLIER_ENTRY]);

    expect(screen.queryAllByText(/days since last$/)).toHaveLength(1);
  });

  it("states a weight gain unsigned, and speaks it signed", () => {
    const screen = renderEntries([
      weightEntry("w2", 145, "21"),
      weightEntry("w1", 123, "09"),
    ]);

    expect(screen.getByText("22 g · 17.9%")).toBeTruthy();
    expect(screen.getByLabelText(/Change: \+22 g \(\+17\.9%\)/)).toBeTruthy();
  });

  it("states a weight loss the same way", () => {
    const screen = renderEntries([
      weightEntry("w2", 131, "21"),
      weightEntry("w1", 145, "09"),
    ]);

    expect(screen.getByText("14 g · 9.7%")).toBeTruthy();
    expect(screen.getByLabelText(/Change: −14 g \(−9\.7%\)/)).toBeTruthy();
  });
});
