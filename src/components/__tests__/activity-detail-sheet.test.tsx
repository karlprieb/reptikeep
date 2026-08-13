import { act, fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";
import { Alert } from "react-native";

import { ActivityDetailSheet } from "@/components/activity-detail-sheet";
import { defecationStore, type DefecationActivity } from "@/state/defecation";
import { feedingStore, type FeedingActivity } from "@/state/feeding";
import { weightStore, type WeightActivity } from "@/state/weight";
import { toActivity } from "@/utils/animal-activity";

const ANIMAL_ID = "animal-1";

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

const FEEDING: FeedingActivity = {
  id: "feed-1",
  animalId: ANIMAL_ID,
  createdAt: "2026-07-21T10:00:00.000Z",
  occurredAt: "2026-07-21T10:00:00.000Z",
  foodType: "Small rat",
  amount: "1",
  frozen: true,
  refused: true,
  notes: "Took it head-first.",
};

function renderDetail(
  entry: Parameters<typeof ActivityDetailSheet>[0]["entry"],
) {
  return render(<ActivityDetailSheet entry={entry} animalName="Juno" />);
}

beforeEach(() => {
  act(() => {
    feedingStore.clear();
    weightStore.clear();
    defecationStore.clear();
  });
});

describe("ActivityDetailSheet content", () => {
  it("shows a feeding's own fields, its flags, and its notes", () => {
    act(() => feedingStore.$.set({ [FEEDING.id]: FEEDING }));

    const screen = renderDetail(toActivity("feed", FEEDING));

    expect(screen.getByText("Jul 21, 2026")).toBeTruthy();
    expect(screen.getByText("Small rat")).toBeTruthy();
    expect(screen.getByText("Frozen/thawed food")).toBeTruthy();
    expect(screen.getByText("Refused")).toBeTruthy();
    expect(screen.getAllByText("Yes")).toHaveLength(2);
    expect(screen.getByText("Took it head-first.")).toBeTruthy();
  });

  it("states the interval since the previous feeding", () => {
    const previous: FeedingActivity = {
      ...FEEDING,
      id: "feed-0",
      createdAt: daysAgo(21),
      occurredAt: daysAgo(21),
    };
    const latest: FeedingActivity = {
      ...FEEDING,
      id: "feed-1",
      createdAt: daysAgo(7),
      occurredAt: daysAgo(7),
    };
    act(() =>
      feedingStore.$.set({ [previous.id]: previous, [latest.id]: latest }),
    );

    const screen = renderDetail(toActivity("feed", latest));

    expect(screen.getByText("Since previous")).toBeTruthy();
    expect(screen.getByText("14 days")).toBeTruthy();
  });

  it("omits the interval on the first record of its kind", () => {
    act(() => feedingStore.$.set({ [FEEDING.id]: FEEDING }));

    const screen = renderDetail(toActivity("feed", FEEDING));

    expect(screen.queryByText("Since previous")).toBeNull();
  });

  it("compares a weigh-in against the one before it", () => {
    const previous: WeightActivity = {
      id: "w0",
      animalId: ANIMAL_ID,
      createdAt: daysAgo(30),
      occurredAt: daysAgo(30),
      weight: 1000,
    };
    const latest: WeightActivity = {
      id: "w1",
      animalId: ANIMAL_ID,
      createdAt: daysAgo(2),
      occurredAt: daysAgo(2),
      weight: 1100,
    };
    act(() =>
      weightStore.$.set({ [previous.id]: previous, [latest.id]: latest }),
    );

    const screen = renderDetail(toActivity("weight", latest));

    expect(screen.getByText("1,100 g")).toBeTruthy();
    expect(screen.getByText("+100 g (+10%)")).toBeTruthy();
  });

  it("says a backdated record was written down later", () => {
    const backdated: DefecationActivity = {
      id: "d1",
      animalId: ANIMAL_ID,
      occurredAt: "2026-07-21T10:00:00.000Z",
      createdAt: "2026-07-24T18:00:00.000Z",
      type: "both",
      issues: true,
    };

    const screen = renderDetail(toActivity("poop", backdated));

    expect(screen.getByText("Feces & urate")).toBeTruthy();
    expect(
      screen.getByText("Logged on Jul 24, 2026, after the fact."),
    ).toBeTruthy();
  });
});

describe("ActivityDetailSheet actions", () => {
  it("warns that linked documents are deleted with medical records", () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation();
    const record = {
      id: "medical-1",
      animalId: ANIMAL_ID,
      createdAt: "2026-07-25T18:00:00.000Z",
      occurredAt: "2026-07-25T18:00:00.000Z",
      summary: "Annual exam",
    };

    const screen = renderDetail(toActivity("medical", record));
    fireEvent.press(screen.getByLabelText("Delete record"));

    expect(alert).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining("linked document"),
      expect.any(Array),
    );
  });

  it("replaces itself with the record's own form sheet on edit", () => {
    act(() => feedingStore.$.set({ [FEEDING.id]: FEEDING }));

    const screen = renderDetail(toActivity("feed", FEEDING));
    fireEvent.press(screen.getByLabelText("Edit record"));

    expect(router.replace).toHaveBeenCalledWith(
      `/animal/${ANIMAL_ID}/feed?activityId=${FEEDING.id}`,
    );
  });

  it("confirms, deletes, then dismisses on delete", () => {
    act(() => feedingStore.$.set({ [FEEDING.id]: FEEDING }));
    jest
      .spyOn(Alert, "alert")
      .mockImplementation((_title, _message, buttons) => {
        const confirm = buttons?.find((button) => button.text === "Delete");
        act(() => confirm?.onPress?.());
      });

    const screen = renderDetail(toActivity("feed", FEEDING));
    fireEvent.press(screen.getByLabelText("Delete record"));

    expect(feedingStore.$.peek()[FEEDING.id]).toBeUndefined();
    expect(router.back).toHaveBeenCalled();
  });
});
