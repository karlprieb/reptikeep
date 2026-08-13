import type { Animal } from "@/state/animal";
import {
  CARE_ROUTINES,
  resolveSchedule,
  type AnimalSchedule,
  type CareRoutine,
  type CareSchedule,
} from "@/state/care-schedule";
import { fromCalendarDate, toCalendarDate } from "@/utils/format-date";
import { scheduleIntervalDays } from "@/utils/schedule";

export type CareReminder = {
  animalId: string;
  animalName: string;
  routine: CareRoutine;
  /** A calendar date: bare `YYYY-MM-DD`, the day the routine comes due. */
  dueOn: string;
};

export type ReminderDay = {
  date: string;
  routines: { routine: CareRoutine; names: string[] }[];
};

function addDays(value: string, days: number): string | null {
  const from = fromCalendarDate(value);
  if (!from) return null;

  from.setDate(from.getDate() + days);
  return toCalendarDate(from);
}

function animalSchedule(
  animal: Animal,
  routine: CareRoutine,
): AnimalSchedule | undefined {
  return routine === "water" ? animal.waterSchedule : animal.cleaningSchedule;
}

export function careReminders(
  animals: Record<string, Animal>,
  collection: Partial<Record<CareRoutine, CareSchedule>>,
  lastDone: Record<CareRoutine, Record<string, string>>,
): CareReminder[] {
  return CARE_ROUTINES.flatMap((routine) =>
    Object.values(animals).flatMap((animal) => {
      if (animal.reminders?.[routine] === false) return [];

      const schedule = resolveSchedule(
        collection[routine],
        animalSchedule(animal, routine),
      );
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

    const routines = CARE_ROUTINES.flatMap((routine) => {
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
