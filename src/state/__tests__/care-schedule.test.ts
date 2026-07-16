import { resolveSchedule, type CareSchedule } from "@/state/care-schedule";

const WEEKLY: CareSchedule = { frequency: "weekly" };
const CUSTOM: CareSchedule = { frequency: "custom", days: 3 };

describe("resolveSchedule", () => {
  it("follows the collection cadence when the animal has said nothing", () => {
    expect(resolveSchedule(WEEKLY, undefined)).toBe(WEEKLY);
  });

  it("leaves an animal unscheduled when the collection has no cadence", () => {
    expect(resolveSchedule(undefined, undefined)).toBeUndefined();
  });

  it("prefers the animal's own cadence over the collection's", () => {
    expect(resolveSchedule(WEEKLY, CUSTOM)).toBe(CUSTOM);
  });

  it("opts the animal out of a collection cadence that is on", () => {
    expect(resolveSchedule(WEEKLY, { frequency: "off" })).toBeUndefined();
  });

  it("lets an animal keep its own cadence with the collection off", () => {
    expect(resolveSchedule(undefined, CUSTOM)).toBe(CUSTOM);
  });
});
