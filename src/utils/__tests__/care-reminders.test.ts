import type { Animal } from "@/state/animal";
import type { CareSchedule, ReminderRoutine } from "@/state/care-schedule";
import { careReminders, reminderDigest } from "@/utils/care-reminders";

const TODAY = new Date(2026, 6, 20);

const weekly: CareSchedule = { frequency: "weekly" };

const ADDED_ON = new Date(2026, 6, 1, 9).toISOString();

function animal(id: string, fields: Partial<Animal> = {}): Animal {
  return {
    id,
    createdAt: ADDED_ON,
    name: id,
    commonName: "Pantherophis guttatus",
    sex: "unknown",
    ...fields,
  };
}

function byId(...animals: Animal[]): Record<string, Animal> {
  return Object.fromEntries(animals.map((entry) => [entry.id, entry]));
}

function lastDone(
  overrides: Partial<Record<ReminderRoutine, Record<string, string>>> = {},
): Record<ReminderRoutine, Record<string, string>> {
  return { feed: {}, water: {}, cleaning: {}, ...overrides };
}

describe("careReminders", () => {
  it("counts the interval from the last time a routine was done", () => {
    const reminders = careReminders(
      byId(animal("Rex")),
      { water: weekly },
      lastDone({ water: { Rex: "2026-07-16" } }),
    );

    expect(reminders).toEqual([
      {
        animalId: "Rex",
        animalName: "Rex",
        routine: "water",
        dueOn: "2026-07-23",
      },
    ]);
  });

  it("produces a reminder per routine the collection schedules", () => {
    const reminders = careReminders(
      byId(animal("Rex")),
      { water: weekly, cleaning: weekly },
      lastDone({
        water: { Rex: "2026-07-16" },
        cleaning: { Rex: "2026-07-18" },
      }),
    );

    expect(reminders).toEqual([
      {
        animalId: "Rex",
        animalName: "Rex",
        routine: "water",
        dueOn: "2026-07-23",
      },
      {
        animalId: "Rex",
        animalName: "Rex",
        routine: "cleaning",
        dueOn: "2026-07-25",
      },
    ]);
  });

  it("counts from the day the animal was added when nothing is logged", () => {
    const reminders = careReminders(
      byId(animal("Rex")),
      { water: weekly },
      lastDone(),
    );

    expect(reminders[0].dueOn).toBe("2026-07-08");
  });

  it("prefers an animal's own cadence and honours its opt-out", () => {
    const reminders = careReminders(
      byId(
        animal("Own", { waterSchedule: { frequency: "daily" } }),
        animal("Off", { waterSchedule: { frequency: "off" } }),
      ),
      { water: weekly },
      lastDone({ water: { Own: "2026-07-16", Off: "2026-07-16" } }),
    );

    expect(reminders).toEqual([
      {
        animalId: "Own",
        animalName: "Own",
        routine: "water",
        dueOn: "2026-07-17",
      },
    ]);
  });

  it("leaves out animals with reminders switched off, and unscheduled ones", () => {
    const reminders = careReminders(
      byId(
        animal("Muted", { reminders: { water: false } }),
        animal("Unscheduled"),
      ),
      {},
      lastDone(),
    );

    expect(reminders).toEqual([]);
  });

  it("drops a muted routine without silencing its sibling routine", () => {
    const reminders = careReminders(
      byId(animal("Rex", { reminders: { water: false } })),
      { water: weekly, cleaning: weekly },
      lastDone({
        water: { Rex: "2026-07-16" },
        cleaning: { Rex: "2026-07-16" },
      }),
    );

    expect(reminders).toEqual([
      {
        animalId: "Rex",
        animalName: "Rex",
        routine: "cleaning",
        dueOn: "2026-07-23",
      },
    ]);
  });

  it("skips a custom cadence that carries no usable interval", () => {
    const reminders = careReminders(
      byId(animal("Rex", { waterSchedule: { frequency: "custom", days: 0 } })),
      {},
      lastDone(),
    );

    expect(reminders).toEqual([]);
  });

  it("keeps a cleaning-only last-done date from moving the water due date, and vice versa", () => {
    const reminders = careReminders(
      byId(animal("Rex")),
      { water: weekly, cleaning: weekly },
      lastDone({ cleaning: { Rex: "2026-07-16" } }),
    );

    const water = reminders.find((reminder) => reminder.routine === "water");
    const cleaning = reminders.find(
      (reminder) => reminder.routine === "cleaning",
    );

    expect(water?.dueOn).toBe("2026-07-08");
    expect(cleaning?.dueOn).toBe("2026-07-23");
  });

  it("reminds for feeding from the animal's own schedule, with no collection default", () => {
    const reminders = careReminders(
      byId(
        animal("Rex", {
          feedingSchedule: weekly,
          reminders: { feed: true },
        }),
      ),
      {},
      lastDone({ feed: { Rex: "2026-07-16" } }),
    );

    expect(reminders).toEqual([
      {
        animalId: "Rex",
        animalName: "Rex",
        routine: "feed",
        dueOn: "2026-07-23",
      },
    ]);
  });

  it("leaves feeding out for an animal with no feeding schedule", () => {
    const reminders = careReminders(byId(animal("Rex")), {}, lastDone());

    expect(reminders).toEqual([]);
  });

  it("leaves feeding out until explicitly opted in, even with a schedule set", () => {
    const reminders = careReminders(
      byId(animal("Rex", { feedingSchedule: weekly })),
      {},
      lastDone({ feed: { Rex: "2026-07-16" } }),
    );

    expect(reminders).toEqual([]);
  });

  it("honours a muted feeding reminder", () => {
    const reminders = careReminders(
      byId(
        animal("Rex", {
          feedingSchedule: weekly,
          reminders: { feed: false },
        }),
      ),
      {},
      lastDone({ feed: { Rex: "2026-07-16" } }),
    );

    expect(reminders).toEqual([]);
  });
});

describe("reminderDigest", () => {
  it("groups a day's names by routine, growing as each cadence comes due", () => {
    const reminders = careReminders(
      byId(
        animal("Rex", { waterSchedule: { frequency: "daily" } }),
        animal("Nala", { cleaningSchedule: { frequency: "everyOtherDay" } }),
      ),
      {},
      lastDone({
        water: { Rex: "2026-07-20" },
        cleaning: { Nala: "2026-07-20" },
      }),
    );

    expect(reminderDigest(reminders, TODAY, 4)).toEqual([
      {
        date: "2026-07-21",
        routines: [{ routine: "water", names: ["Rex"] }],
      },
      {
        date: "2026-07-22",
        routines: [
          { routine: "water", names: ["Rex"] },
          { routine: "cleaning", names: ["Nala"] },
        ],
      },
      {
        date: "2026-07-23",
        routines: [
          { routine: "water", names: ["Rex"] },
          { routine: "cleaning", names: ["Nala"] },
        ],
      },
    ]);
  });

  it("has nothing to say when nothing is due inside the horizon", () => {
    const reminders = careReminders(
      byId(animal("Rex")),
      { water: weekly },
      lastDone({ water: { Rex: "2026-07-20" } }),
    );

    expect(reminderDigest(reminders, TODAY, 3)).toEqual([]);
  });
});
