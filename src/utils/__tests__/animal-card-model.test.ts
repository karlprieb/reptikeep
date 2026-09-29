import i18n from "@/i18n";
import type { Animal } from "@/state/animal";
import { buildAnimalCardModel } from "@/utils/animal-card-model";

const t = i18n.getFixedT("en");

const animal: Animal = {
  id: "a1",
  name: "Mimosa",
  commonName: "Ball python",
  scientificName: "Python regius",
  sex: "female",
  createdAt: "2026-01-01T00:00:00.000Z",
  feedingSchedule: { frequency: "weekly" },
};

describe("buildAnimalCardModel", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-03-10T12:00:00.000Z"));
  });
  afterEach(() => jest.useRealTimers());

  it("lists overdue tasks in feed, water, cleaning order", () => {
    const { overdueTasks } = buildAnimalCardModel(t, {
      animal,
      lastFedAt: "2026-03-01T12:00:00.000Z",
      waterSchedule: { frequency: "weekly" },
      lastWaterChangeAt: "2026-02-01T12:00:00.000Z",
      cleaningSchedule: { frequency: "weekly" },
      lastCleanAt: "2026-02-01T12:00:00.000Z",
    });

    expect(overdueTasks.map((task) => task.id)).toEqual([
      "feed",
      "water",
      "cleaning",
    ]);
  });

  it("puts identity, sex and overdue labels in the accessibility label", () => {
    const { label } = buildAnimalCardModel(t, {
      animal,
      lastFedAt: "2026-03-01T12:00:00.000Z",
    });

    expect(label).toBe(
      "Mimosa, Ball python, Python regius, Female, 2 days overdue",
    );
  });

  it("falls back to the last fed line when nothing is overdue", () => {
    const { overdueTasks, label } = buildAnimalCardModel(t, {
      animal,
      lastFedAt: "2026-03-08T12:00:00.000Z",
    });

    expect(overdueTasks).toEqual([]);
    expect(label.endsWith("Last fed 2 days ago")).toBe(true);
  });

  it("omits the sex when it is unknown", () => {
    const { label } = buildAnimalCardModel(t, {
      animal: { ...animal, sex: "unknown", commonName: undefined },
    });

    expect(label.startsWith("Mimosa, Python regius, ")).toBe(true);
  });
});
