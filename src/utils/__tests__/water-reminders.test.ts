import type { Animal } from "@/state/animal";
import type { CareSchedule } from "@/state/care-schedule";
import { reminderDigest, waterReminders } from "@/utils/water-reminders";

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

describe("waterReminders", () => {
  it("counts the interval from the last water change", () => {
    const reminders = waterReminders(byId(animal("Rex")), weekly, {
      Rex: "2026-07-16",
    });

    expect(reminders).toEqual([
      { animalId: "Rex", animalName: "Rex", dueOn: "2026-07-23" },
    ]);
  });

  it("counts from the day the animal was added when nothing is logged", () => {
    const reminders = waterReminders(byId(animal("Rex")), weekly, {});

    expect(reminders[0].dueOn).toBe("2026-07-08");
  });

  it("prefers an animal's own cadence and honours its opt-out", () => {
    const reminders = waterReminders(
      byId(
        animal("Own", { waterSchedule: { frequency: "daily" } }),
        animal("Off", { waterSchedule: { frequency: "off" } }),
      ),
      weekly,
      { Own: "2026-07-16", Off: "2026-07-16" },
    );

    expect(reminders).toEqual([
      { animalId: "Own", animalName: "Own", dueOn: "2026-07-17" },
    ]);
  });

  it("leaves out animals with reminders switched off, and unscheduled ones", () => {
    const reminders = waterReminders(
      byId(
        animal("Muted", { reminders: { water: false } }),
        animal("Unscheduled"),
      ),
      undefined,
      {},
    );

    expect(reminders).toEqual([]);
  });

  it("skips a custom cadence that carries no usable interval", () => {
    const reminders = waterReminders(
      byId(animal("Rex", { waterSchedule: { frequency: "custom", days: 0 } })),
      undefined,
      {},
    );

    expect(reminders).toEqual([]);
  });
});

describe("reminderDigest", () => {
  it("grows the day's list as each cadence comes due, and keeps what is owed", () => {
    const reminders = waterReminders(
      byId(
        animal("Rex", { waterSchedule: { frequency: "daily" } }),
        animal("Nala", { waterSchedule: { frequency: "everyOtherDay" } }),
      ),
      undefined,
      { Rex: "2026-07-20", Nala: "2026-07-20" },
    );

    expect(reminderDigest(reminders, TODAY, 4)).toEqual([
      { date: "2026-07-21", names: ["Rex"] },
      { date: "2026-07-22", names: ["Rex", "Nala"] },
      { date: "2026-07-23", names: ["Rex", "Nala"] },
    ]);
  });

  it("has nothing to say when nothing is due inside the horizon", () => {
    const reminders = waterReminders(byId(animal("Rex")), weekly, {
      Rex: "2026-07-20",
    });

    expect(reminderDigest(reminders, TODAY, 3)).toEqual([]);
  });
});
