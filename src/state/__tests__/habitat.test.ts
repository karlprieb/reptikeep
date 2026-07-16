import { createHabitatActivity } from "@/state/habitat";

describe("createHabitatActivity", () => {
  it("generates distinct ids across calls", () => {
    const a = createHabitatActivity({ animalId: "animal-1" });
    const b = createHabitatActivity({ animalId: "animal-1" });
    expect(a.id).not.toBe(b.id);
  });

  it("sets createdAt to an ISO 8601 string", () => {
    const h = createHabitatActivity({ animalId: "animal-1" });
    expect(h.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
  });

  it("defaults occurredAt to the current instant", () => {
    const before = new Date().toISOString();
    const h = createHabitatActivity({ animalId: "animal-1" });
    const after = new Date().toISOString();
    expect(h.occurredAt >= before).toBe(true);
    expect(h.occurredAt <= after).toBe(true);
  });

  it("preserves a caller-supplied occurredAt", () => {
    const supplied = "2024-03-15T10:30:00.000Z";
    const h = createHabitatActivity({
      animalId: "animal-1",
      occurredAt: supplied,
    });
    expect(h.occurredAt).toBe(supplied);
  });

  it("defaults water to true", () => {
    expect(createHabitatActivity({ animalId: "animal-1" }).water).toBe(true);
  });

  it("honors water when set to false", () => {
    const h = createHabitatActivity({ animalId: "animal-1", water: false });
    expect(h.water).toBe(false);
  });

  it("carries through optional notes when supplied", () => {
    const h = createHabitatActivity({
      animalId: "animal-1",
      notes: "Scrubbed the water bowl",
    });
    expect(h.notes).toBe("Scrubbed the water bowl");
  });

  it("leaves notes undefined when not supplied", () => {
    expect(
      createHabitatActivity({ animalId: "animal-1" }).notes,
    ).toBeUndefined();
  });
});
