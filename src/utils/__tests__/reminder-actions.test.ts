import { createFeedingActivity, feedingStore } from "@/state/feeding";
import { habitatStore } from "@/state/habitat";
import { markRoutineDone } from "@/utils/reminder-actions";

const ANIMAL = "a1";
const YESTERDAY = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

describe("markRoutineDone", () => {
  beforeEach(() => {
    feedingStore.clear();
    habitatStore.clear();
  });

  it("logs once per routine per calendar day, ignoring repeat taps", () => {
    expect(markRoutineDone(ANIMAL, "feed")).toBe(true);
    expect(markRoutineDone(ANIMAL, "feed")).toBe(false);
    expect(markRoutineDone(ANIMAL, "feed")).toBe(false);

    expect(Object.keys(feedingStore.$.peek())).toHaveLength(1);
  });

  it("tracks water and cleaning independently, both idempotent", () => {
    markRoutineDone(ANIMAL, "water");
    markRoutineDone(ANIMAL, "water");
    markRoutineDone(ANIMAL, "cleaning");
    markRoutineDone(ANIMAL, "cleaning");

    expect(Object.keys(habitatStore.$.peek())).toHaveLength(2);
  });

  it("does not block a different animal's routine", () => {
    markRoutineDone(ANIMAL, "feed");
    markRoutineDone("a2", "feed");

    expect(Object.keys(feedingStore.$.peek())).toHaveLength(2);
  });

  it("allows today's log when the last one was yesterday", () => {
    feedingStore.add(
      createFeedingActivity({ animalId: ANIMAL, occurredAt: YESTERDAY }),
    );

    expect(markRoutineDone(ANIMAL, "feed")).toBe(true);
    expect(Object.keys(feedingStore.$.peek())).toHaveLength(2);
  });
});
