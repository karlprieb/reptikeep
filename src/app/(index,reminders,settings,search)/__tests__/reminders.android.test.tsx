import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import RemindersScreen from "@/app/(index,reminders,settings,search)/reminders.android";
import { addAnimal, animals$, clearAnimals, type Animal } from "@/state/animal";
import { careSchedules$ } from "@/state/care-schedule";
import { feedingStore } from "@/state/feeding";
import { habitatStore } from "@/state/habitat";
import * as notificationsState from "@/state/notifications";
import { exactAlarmPrompt$ } from "@/state/exact-alarm-prompt";
import { clearSummaries } from "@/state/summary";

const ANIMAL_ID = "a1";

function setPlatform(os: "ios" | "android") {
  Object.defineProperty(Platform, "OS", { value: os, configurable: true });
}

function makeAnimal(
  overrides: Partial<Animal> & Pick<Animal, "id" | "name">,
): Animal {
  return {
    createdAt: "2020-01-01T00:00:00.000Z",
    sex: "unknown",
    waterSchedule: { frequency: "daily" },
    ...overrides,
  };
}

async function renderScreen() {
  const screen = await render(<RemindersScreen />);
  return screen;
}

beforeEach(async () => {
  await act(async () => {
    clearAnimals();
    habitatStore.clear();
    feedingStore.clear();
    clearSummaries();
    careSchedules$.water.set(undefined);
    careSchedules$.cleaning.set(undefined);
  });
});

describe("RemindersScreen row navigation", () => {
  it("opens the habitat log when a row is tapped", async () => {
    await act(async () =>
      addAnimal(makeAnimal({ id: ANIMAL_ID, name: "Buddy" })),
    );

    const { getByLabelText } = await renderScreen();

    await fireEvent.press(getByLabelText(/^Buddy,/));

    expect(router.push).toHaveBeenCalledWith(
      `/animal/${ANIMAL_ID}/habitat?routine=water`,
    );
  });

  it("opens the reptile's edit screen from the leading swipe action", async () => {
    await act(async () =>
      addAnimal(makeAnimal({ id: ANIMAL_ID, name: "Buddy" })),
    );

    const { getByText } = await renderScreen();

    await fireEvent.press(getByText("Schedule"));

    expect(router.push).toHaveBeenCalledWith(`/animal/${ANIMAL_ID}/edit`);
  });
});

describe("RemindersScreen mark done", () => {
  it("logs a water change for the animal", async () => {
    await act(async () =>
      addAnimal(makeAnimal({ id: ANIMAL_ID, name: "Buddy" })),
    );

    const { getByLabelText } = await renderScreen();

    await fireEvent.press(getByLabelText(/Water changed for Buddy/));

    const logged = Object.values(habitatStore.$.peek());
    expect(logged).toHaveLength(1);
    expect(logged[0]).toMatchObject({ animalId: ANIMAL_ID, water: true });
  });

  it("logs a feeding for the animal", async () => {
    await act(() =>
      addAnimal(
        makeAnimal({
          id: ANIMAL_ID,
          name: "Buddy",
          feedingSchedule: { frequency: "weekly" },
          reminders: { feed: true },
        }),
      ),
    );

    const { getByLabelText } = await renderScreen();

    await fireEvent.press(getByLabelText(/Fed Buddy/));

    const logged = Object.values(feedingStore.$.peek());
    expect(logged).toHaveLength(1);
    expect(logged[0]).toMatchObject({ animalId: ANIMAL_ID, refused: false });
  });

  it("shows an alert instead of logging again the same day", async () => {
    await act(async () =>
      addAnimal(makeAnimal({ id: ANIMAL_ID, name: "Buddy" })),
    );

    const { getByLabelText, getByText } = await renderScreen();

    await fireEvent.press(getByLabelText(/Water changed for Buddy/));
    await fireEvent.press(getByLabelText(/Water changed for Buddy/));

    expect(getByText("Already done today")).toBeTruthy();
    expect(
      getByText("Buddy's water has already been changed today."),
    ).toBeTruthy();
    expect(Object.values(habitatStore.$.peek())).toHaveLength(1);

    await fireEvent.press(getByText("Got it"));

    expect(() => getByText("Already done today")).toThrow();
  });
});

describe("RemindersScreen mute", () => {
  it("turns off the routine reminder from the trailing swipe action", async () => {
    await act(async () =>
      addAnimal(makeAnimal({ id: ANIMAL_ID, name: "Buddy" })),
    );

    const { getByText } = await renderScreen();

    await fireEvent.press(getByText("Turn off"));

    expect(animals$.peek()[ANIMAL_ID]?.reminders?.water).toBe(false);
  });
});

describe("RemindersScreen exact alarms", () => {
  beforeEach(() => setPlatform("android"));
  afterEach(() => setPlatform("ios"));

  const firstTrigger = () =>
    (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0]
      .trigger;

  async function scheduleWithExactAlarms(granted: boolean) {
    jest.restoreAllMocks();
    jest
      .spyOn(Notifications, "getExactAlarmPermissionsAsync")
      .mockResolvedValue({ granted } as never);

    jest.useFakeTimers();
    await act(async () =>
      addAnimal(makeAnimal({ id: ANIMAL_ID, name: "Buddy" })),
    );
    await act(async () => {
      notificationsState.rescheduleSoon();
      jest.advanceTimersByTime(300);
    });
    jest.useRealTimers();
  }

  it("schedules alarm clock triggers when exact alarms are granted", async () => {
    await scheduleWithExactAlarms(true);

    expect(firstTrigger()).toMatchObject({ delivery: "alarmClock" });
  });

  it("keeps plain date triggers when exact alarms are denied", async () => {
    await scheduleWithExactAlarms(false);

    expect(firstTrigger().delivery).toBeUndefined();
  });
});

describe("RemindersScreen exact alarm card", () => {
  beforeEach(() => {
    setPlatform("android");
    exactAlarmPrompt$.dismissed.set(false);
  });
  afterEach(() => {
    setPlatform("ios");
    jest.restoreAllMocks();
  });

  it("stays hidden while exact alarms are granted", async () => {
    jest
      .spyOn(Notifications, "getExactAlarmPermissionsAsync")
      .mockResolvedValue({ granted: true } as never);
    await act(async () =>
      addAnimal(makeAnimal({ id: ANIMAL_ID, name: "Buddy" })),
    );

    const { queryByText } = await renderScreen();

    await waitFor(() =>
      expect(Notifications.getExactAlarmPermissionsAsync).toHaveBeenCalled(),
    );
    expect(queryByText("Exact alarms")).toBeNull();
  });

  it("shows while denied and stays dismissed once closed", async () => {
    jest
      .spyOn(Notifications, "getExactAlarmPermissionsAsync")
      .mockResolvedValue({ granted: false } as never);
    await act(async () =>
      addAnimal(makeAnimal({ id: ANIMAL_ID, name: "Buddy" })),
    );

    const { findByText, getByLabelText, queryByText } = await renderScreen();

    await findByText("Exact alarms");
    await fireEvent.press(getByLabelText("Dismiss"));

    expect(queryByText("Exact alarms")).toBeNull();
    expect(exactAlarmPrompt$.dismissed.get()).toBe(true);
  });
});

describe("RemindersScreen permission grant", () => {
  it("rebuilds the notification schedule once permission is granted", async () => {
    await act(async () =>
      addAnimal(makeAnimal({ id: ANIMAL_ID, name: "Buddy" })),
    );

    jest
      .spyOn(Notifications, "getPermissionsAsync")
      .mockResolvedValueOnce({ granted: false, canAskAgain: true } as never);
    jest
      .spyOn(Notifications, "requestPermissionsAsync")
      .mockResolvedValueOnce({ granted: true, canAskAgain: true } as never);
    const rescheduleSpy = jest
      .spyOn(notificationsState, "rescheduleSoon")
      .mockImplementation(() => undefined);

    const { getByLabelText } = await renderScreen();

    await fireEvent.press(getByLabelText(/Turn on notifications/));

    await waitFor(() => expect(rescheduleSpy).toHaveBeenCalled());
  });
});
