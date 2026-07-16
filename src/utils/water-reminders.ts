import type { Animal } from "@/state/animal";
import { resolveSchedule, type CareSchedule } from "@/state/care-schedule";
import { fromCalendarDate, toCalendarDate } from "@/utils/format-date";
import { scheduleIntervalDays } from "@/utils/schedule";

export type WaterReminder = {
  animalId: string;
  animalName: string;
  /** A calendar date: bare `YYYY-MM-DD`, the day the change comes due. */
  dueOn: string;
};

export type ReminderDay = {
  date: string;
  names: string[];
};

function addDays(value: string, days: number): string | null {
  const from = fromCalendarDate(value);
  if (!from) return null;

  from.setDate(from.getDate() + days);
  return toCalendarDate(from);
}

export function waterReminders(
  animals: Record<string, Animal>,
  collection: CareSchedule | undefined,
  lastWaterChange: Record<string, string>,
): WaterReminder[] {
  return Object.values(animals)
    .flatMap((animal) => {
      if (animal.reminders?.water === false) return [];

      const schedule = resolveSchedule(collection, animal.waterSchedule);
      if (!schedule) return [];

      const interval = scheduleIntervalDays(schedule);
      if (interval === null) return [];

      const dueOn = addDays(
        lastWaterChange[animal.id] ?? animal.createdAt,
        interval,
      );

      return dueOn
        ? [{ animalId: animal.id, animalName: animal.name, dueOn }]
        : [];
    })
    .sort(
      (a, b) =>
        a.dueOn.localeCompare(b.dueOn) ||
        a.animalName.localeCompare(b.animalName) ||
        a.animalId.localeCompare(b.animalId),
    );
}

export function reminderDigest(
  reminders: WaterReminder[],
  today: Date,
  horizonDays: number,
): ReminderDay[] {
  const days: ReminderDay[] = [];

  for (let offset = 0; offset < horizonDays; offset += 1) {
    const day = new Date(today);
    day.setDate(day.getDate() + offset);
    const date = toCalendarDate(day);

    const names = reminders
      .filter((reminder) => reminder.dueOn <= date)
      .map((reminder) => reminder.animalName);

    if (names.length > 0) days.push({ date, names });
  }

  return days;
}
