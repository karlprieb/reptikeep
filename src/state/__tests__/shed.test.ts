import { createShedActivity } from "@/state/shed";

describe("createShedActivity", () => {
  it("generates distinct ids across calls", () => {
    const a = createShedActivity({ animalId: "animal-1" });
    const b = createShedActivity({ animalId: "animal-1" });
    expect(a.id).not.toBe(b.id);
  });

  it("sets createdAt to an ISO 8601 string", () => {
    const s = createShedActivity({ animalId: "animal-1" });
    expect(s.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
  });

  it("defaults occurredAt to the current instant", () => {
    const before = new Date().toISOString();
    const s = createShedActivity({ animalId: "animal-1" });
    const after = new Date().toISOString();
    expect(s.occurredAt >= before).toBe(true);
    expect(s.occurredAt <= after).toBe(true);
  });

  it("preserves a caller-supplied occurredAt", () => {
    const supplied = "2024-03-15T10:30:00.000Z";
    const s = createShedActivity({
      animalId: "animal-1",
      occurredAt: supplied,
    });
    expect(s.occurredAt).toBe(supplied);
  });

  it("defaults issues to false", () => {
    const s = createShedActivity({ animalId: "animal-1" });
    expect(s.issues).toBe(false);
  });

  it("honors issues when set to true", () => {
    const s = createShedActivity({ animalId: "animal-1", issues: true });
    expect(s.issues).toBe(true);
  });

  it("carries through optional notes when supplied", () => {
    const s = createShedActivity({
      animalId: "animal-1",
      notes: "Patchy shed on tail",
    });
    expect(s.notes).toBe("Patchy shed on tail");
  });

  it("leaves notes undefined when not supplied", () => {
    const s = createShedActivity({ animalId: "animal-1" });
    expect(s.notes).toBeUndefined();
  });
});
