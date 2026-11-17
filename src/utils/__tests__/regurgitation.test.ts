import { createFeedingActivity } from "@/state/feeding";
import { createMedicalActivity } from "@/state/medical";
import {
  feedingChoices,
  feedingLabel,
  recentFeedings,
  regurgitationFor,
  takenFeedings,
} from "@/utils/regurgitation";

const NOW = new Date("2026-03-20T12:00:00.000Z");

function feeding(id: string, occurredAt: string, refused = false) {
  return {
    ...createFeedingActivity({ animalId: "a", occurredAt, refused }),
    id,
  };
}

const feedings = {
  recent: feeding("recent", "2026-03-17T12:00:00.000Z"),
  older: feeding("older", "2026-03-10T12:00:00.000Z"),
  stale: feeding("stale", "2026-03-01T12:00:00.000Z"),
  refused: feeding("refused", "2026-03-18T12:00:00.000Z", true),
  future: feeding("future", "2026-03-21T12:00:00.000Z"),
  other: { ...feeding("other", "2026-03-19T12:00:00.000Z"), animalId: "b" },
};

const ids = (include?: string, before = NOW) =>
  recentFeedings(feedings, "a", before, include).map((f) => f.id);

describe("recentFeedings", () => {
  it("lists accepted feedings from the last 14 days, newest first", () => {
    expect(ids()).toEqual(["recent", "older"]);
  });

  it("keeps an already linked feeding older than the window", () => {
    expect(ids("stale")).toEqual(["recent", "older", "stale"]);
  });

  it("never keeps a linked feeding that is later, refused or another animal's", () => {
    expect(ids("future")).toEqual(["recent", "older"]);
    expect(ids("refused")).toEqual(["recent", "older"]);
    expect(ids("other")).toEqual(["recent", "older"]);
  });

  it("drops a linked feeding once the regurgitation is backdated before it", () => {
    expect(ids("recent", new Date("2026-03-15T12:00:00.000Z"))).toEqual([
      "older",
      "stale",
    ]);
  });
});

describe("regurgitationFor", () => {
  it("finds only same-animal regurgitations linked to the feeding", () => {
    const linked = createMedicalActivity({
      animalId: "a",
      summary: "Regurgitation",
      kind: "regurgitation",
      feedingId: "recent",
    });
    const foreign = {
      ...linked,
      id: "foreign",
      animalId: "b",
      feedingId: "older",
    };
    const medical = { [linked.id]: linked, foreign };

    expect(regurgitationFor(medical, feedings.recent)).toBe(linked);
    expect(regurgitationFor(medical, feedings.older)).toBeUndefined();
  });
});

describe("takenFeedings", () => {
  it("hides feedings another regurgitation already links, but not the one being edited", () => {
    const linked = createMedicalActivity({
      animalId: "a",
      summary: "Regurgitation",
      kind: "regurgitation",
      feedingId: "recent",
    });
    const medical = { [linked.id]: linked };

    expect(
      recentFeedings(feedings, "a", NOW, undefined, takenFeedings(medical)).map(
        (f) => f.id,
      ),
    ).toEqual(["older"]);
    expect(
      recentFeedings(
        feedings,
        "a",
        NOW,
        "recent",
        takenFeedings(medical, linked.id),
      ).map((f) => f.id),
    ).toEqual(["recent", "older"]);
  });
});

describe("regurgitationFor validity", () => {
  it("ignores a link once the feeding moved after it or was refused", () => {
    const linked = createMedicalActivity({
      animalId: "a",
      occurredAt: "2026-03-18T12:00:00.000Z",
      summary: "Regurgitation",
      kind: "regurgitation",
      feedingId: "recent",
    });
    const medical = { [linked.id]: linked };

    expect(
      regurgitationFor(medical, {
        ...feedings.recent,
        occurredAt: "2026-03-19T12:00:00.000Z",
      }),
    ).toBeUndefined();
    expect(
      regurgitationFor(medical, { ...feedings.recent, refused: true }),
    ).toBeUndefined();
  });
});

describe("meal labels", () => {
  const t = ((key: string) => key) as never;

  it("include the feeder weight", () => {
    expect(feedingLabel({ ...feedings.recent, weight: 45 }, "g")).toContain(
      "45 g",
    );
  });

  it("keep a deleted link as its own choice", () => {
    expect(feedingChoices([], t, "g", "gone").map((c) => c.value)).toEqual([
      "gone",
      "none",
    ]);
  });
});

describe("takenFeedings ownership", () => {
  it("keeps a meal reserved even while its link is not displayed", () => {
    const linked = createMedicalActivity({
      animalId: "a",
      occurredAt: "2026-03-16T12:00:00.000Z",
      summary: "Regurgitation",
      kind: "regurgitation",
      feedingId: "recent",
    });
    const medical = { [linked.id]: linked };

    expect(regurgitationFor(medical, feedings.recent)).toBeUndefined();
    expect(takenFeedings(medical).has("recent")).toBe(true);
  });
});
