import type { Animal } from "@/state/animal";
import {
  REMINDER_ROUTINES,
  resolveSchedule,
  type CareRoutine,
  type CareSchedule,
  type ReminderRoutine,
} from "@/state/care-schedule";
import { fromCalendarDate, toCalendarDate } from "@/utils/format-date";
import { scheduleIntervalDays } from "@/utils/schedule";

export type CareReminder = {
  animalId: string;
  animalName: string;
  routine: ReminderRoutine;
  dueOn: string;
};

export type ReminderDay = {
  date: string;
  routines: { routine: ReminderRoutine; names: string[] }[];
};

function addDays(value: string, days: number): string | null {
  const from = fromCalendarDate(value);
  if (!from) return null;

  from.setDate(from.getDate() + days);
  return toCalendarDate(from);
}

function scheduleFor(
  animal: Animal,
  routine: ReminderRoutine,
  collection: Partial<Record<CareRoutine, CareSchedule>>,
): CareSchedule | undefined {
  if (routine === "feed") return animal.feedingSchedule;

  const animalOverride =
    routine === "water" ? animal.waterSchedule : animal.cleaningSchedule;
  return resolveSchedule(collection[routine], animalOverride);
}

export function careReminders(
  animals: Record<string, Animal>,
  collection: Partial<Record<CareRoutine, CareSchedule>>,
  lastDone: Record<ReminderRoutine, Record<string, string>>,
): CareReminder[] {
  return REMINDER_ROUTINES.flatMap((routine) =>
    Object.values(animals).flatMap((animal) => {
      const enabled = animal.reminders?.[routine];
      if (routine === "feed" ? enabled !== true : enabled === false) return [];

      const schedule = scheduleFor(animal, routine, collection);
      if (!schedule) return [];

      const interval = scheduleIntervalDays(schedule);
      if (interval === null) return [];

      const dueOn = addDays(
        lastDone[routine][animal.id] ?? animal.createdAt,
        interval,
      );

      return dueOn
        ? [{ animalId: animal.id, animalName: animal.name, routine, dueOn }]
        : [];
    }),
  ).sort(
    (a, b) =>
      a.dueOn.localeCompare(b.dueOn) ||
      a.animalName.localeCompare(b.animalName) ||
      a.routine.localeCompare(b.routine) ||
      a.animalId.localeCompare(b.animalId),
  );
}

export function reminderDigest(
  reminders: CareReminder[],
  today: Date,
  horizonDays: number,
): ReminderDay[] {
  const days: ReminderDay[] = [];

  for (let offset = 0; offset < horizonDays; offset += 1) {
    const day = new Date(today);
    day.setDate(day.getDate() + offset);
    const date = toCalendarDate(day);

    const routines = REMINDER_ROUTINES.flatMap((routine) => {
      const names = reminders
        .filter(
          (reminder) => reminder.routine === routine && reminder.dueOn <= date,
        )
        .map((reminder) => reminder.animalName);

      return names.length > 0 ? [{ routine, names }] : [];
    });

    if (routines.length > 0) days.push({ date, routines });
  }

  return days;
}
