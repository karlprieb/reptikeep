import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { addAnimal, clearAnimals, type Animal } from "@/state/animal";
import { careSchedules$ } from "@/state/care-schedule";
import { rescheduleSoon } from "@/state/notifications";
import { reminders$ } from "@/state/reminders";

const scheduled = Notifications.scheduleNotificationAsync as jest.Mock;

async function reschedule() {
  rescheduleSoon();
  await jest.advanceTimersByTimeAsync(300);
  for (let i = 0; i < 20; i += 1) await Promise.resolve();
}

function setPlatform(os: "ios" | "android") {
  Object.defineProperty(Platform, "OS", { value: os, configurable: true });
}

const REX: Animal = {
  id: "rex",
  name: "Rex",
  createdAt: "2020-01-01T00:00:00.000Z",
  sex: "unknown",
  birthDate: "2021-07-20",
};

beforeEach(() => {
  jest.useFakeTimers({ now: new Date(2026, 6, 20, 8) });
  jest.clearAllMocks();
  setPlatform("ios");
  clearAnimals();
  careSchedules$.set({});
  reminders$.set({ hour: 9, minute: 0, birthdays: true });
  addAnimal(REX);
});

afterEach(() => {
  setPlatform("ios");
  jest.useRealTimers();
});

it("schedules a birthday that opens the animal", async () => {
  await reschedule();

  expect(scheduled).toHaveBeenCalledTimes(1);
  expect(scheduled.mock.calls[0][0].content).toMatchObject({
    title: "Happy birthday, Rex!",
    body: "Rex turns 5 today.",
    data: { url: "/animal/rex" },
  });
});

it("never asks for permission for birthdays alone", async () => {
  (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
    granted: false,
    canAskAgain: true,
  });

  await reschedule();

  expect(Notifications.getPermissionsAsync).toHaveBeenCalled();
  expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  expect(scheduled).not.toHaveBeenCalled();
});

it("still asks for permission when a care reminder is due", async () => {
  (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
    granted: false,
    canAskAgain: true,
  });
  careSchedules$.set({ water: { frequency: "daily" } });

  await reschedule();

  expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
});

it("schedules nothing when birthdays are turned off", async () => {
  reminders$.birthdays.set(false);

  await reschedule();

  expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
  expect(scheduled).not.toHaveBeenCalled();
});

it("caps the birthday list on iOS so care reminders stay scheduled", async () => {
  const careIds = () =>
    scheduled.mock.calls
      .map(([request]) => request.identifier as string)
      .filter((id) => id.startsWith("care-"));
  careSchedules$.set({ water: { frequency: "daily" } });
  reminders$.birthdays.set(false);
  await reschedule();
  const careOnly = careIds();
  expect(careOnly.length).toBeGreaterThan(0);

  scheduled.mockClear();
  reminders$.birthdays.set(true);
  for (let i = 0; i < 70; i += 1)
    addAnimal({ ...REX, id: `rex-${i}`, name: `Rex ${i}` });

  await reschedule();

  expect(scheduled).toHaveBeenCalledTimes(64);
  expect(careIds()).toEqual(careOnly);
});

it("does not cap the birthday list on Android", async () => {
  setPlatform("android");
  for (let i = 0; i < 70; i += 1)
    addAnimal({ ...REX, id: `rex-${i}`, name: `Rex ${i}` });

  await reschedule();

  expect(scheduled).toHaveBeenCalledTimes(71);
});
