import { createWeightActivity } from "@/state/weight";

describe("createWeightActivity", () => {
  it("generates distinct ids across calls", () => {
    const a = createWeightActivity({ animalId: "animal-1", weight: 42 });
    const b = createWeightActivity({ animalId: "animal-1", weight: 42 });
    expect(a.id).not.toBe(b.id);
  });

  it("sets createdAt to an ISO 8601 string", () => {
    const w = createWeightActivity({ animalId: "animal-1", weight: 42 });
    expect(w.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
  });

  it("defaults occurredAt to the current instant", () => {
    const before = new Date().toISOString();
    const w = createWeightActivity({ animalId: "animal-1", weight: 42 });
    const after = new Date().toISOString();
    expect(w.occurredAt >= before).toBe(true);
    expect(w.occurredAt <= after).toBe(true);
  });

  it("preserves a caller-supplied occurredAt", () => {
    const supplied = "2024-03-15T10:30:00.000Z";
    const w = createWeightActivity({
      animalId: "animal-1",
      weight: 42,
      occurredAt: supplied,
    });
    expect(w.occurredAt).toBe(supplied);
  });

  it("rounds weight to an integer", () => {
    const w = createWeightActivity({ animalId: "animal-1", weight: 42.7 });
    expect(w.weight).toBe(43);
  });

  it("clamps weight to at least 1", () => {
    const w = createWeightActivity({ animalId: "animal-1", weight: 0 });
    expect(w.weight).toBe(1);
  });

  it("clamps negative weight to 1", () => {
    const w = createWeightActivity({ animalId: "animal-1", weight: -5 });
    expect(w.weight).toBe(1);
  });

  it("carries through optional notes when supplied", () => {
    const w = createWeightActivity({
      animalId: "animal-1",
      weight: 42,
      notes: "Post-shed weigh-in",
    });
    expect(w.notes).toBe("Post-shed weigh-in");
  });

  it("leaves notes undefined when not supplied", () => {
    const w = createWeightActivity({ animalId: "animal-1", weight: 42 });
    expect(w.notes).toBeUndefined();
  });
});
