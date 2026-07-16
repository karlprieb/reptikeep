import { createFeedingActivity } from "@/state/feeding";

describe("createFeedingActivity", () => {
  it("generates distinct ids across calls", () => {
    const a = createFeedingActivity({ animalId: "animal-1" });
    const b = createFeedingActivity({ animalId: "animal-1" });
    expect(a.id).not.toBe(b.id);
  });

  it("sets createdAt to an ISO 8601 string", () => {
    const f = createFeedingActivity({ animalId: "animal-1" });
    expect(f.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
  });

  it("defaults occurredAt to the current instant", () => {
    const before = new Date().toISOString();
    const f = createFeedingActivity({ animalId: "animal-1" });
    const after = new Date().toISOString();
    expect(f.occurredAt >= before).toBe(true);
    expect(f.occurredAt <= after).toBe(true);
  });

  it("preserves a caller-supplied occurredAt", () => {
    const supplied = "2024-03-15T10:30:00.000Z";
    const f = createFeedingActivity({
      animalId: "animal-1",
      occurredAt: supplied,
    });
    expect(f.occurredAt).toBe(supplied);
  });

  it("defaults frozen and refused to false", () => {
    const f = createFeedingActivity({ animalId: "animal-1" });
    expect(f.frozen).toBe(false);
    expect(f.refused).toBe(false);
  });

  it("honors frozen and refused when set to true", () => {
    const f = createFeedingActivity({
      animalId: "animal-1",
      frozen: true,
      refused: true,
    });
    expect(f.frozen).toBe(true);
    expect(f.refused).toBe(true);
  });

  it("carries through optional fields when supplied", () => {
    const f = createFeedingActivity({
      animalId: "animal-1",
      foodType: "cricket",
      amount: "2",
      weight: 15,
      notes: "Ate eagerly, no leftovers",
    });
    expect(f.foodType).toBe("cricket");
    expect(f.amount).toBe("2");
    expect(f.weight).toBe(15);
    expect(f.notes).toBe("Ate eagerly, no leftovers");
  });

  it("leaves optional fields absent when not supplied", () => {
    const f = createFeedingActivity({ animalId: "animal-1" });
    expect(f.foodType).toBeUndefined();
    expect(f.amount).toBeUndefined();
    expect(f.weight).toBeUndefined();
    expect(f.notes).toBeUndefined();
  });

  it("rounds weight to a non-negative integer when present", () => {
    const f = createFeedingActivity({
      animalId: "animal-1",
      weight: 3.7,
    });
    expect(f.weight).toBe(4);
  });

  it("coerces negative weight to 0", () => {
    const f = createFeedingActivity({
      animalId: "animal-1",
      weight: -5,
    });
    expect(f.weight).toBe(0);
  });
});
