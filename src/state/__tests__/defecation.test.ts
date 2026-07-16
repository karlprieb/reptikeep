import { createDefecationActivity } from "@/state/defecation";

describe("createDefecationActivity", () => {
  it("generates distinct ids across calls", () => {
    const a = createDefecationActivity({ animalId: "animal-1" });
    const b = createDefecationActivity({ animalId: "animal-1" });
    expect(a.id).not.toBe(b.id);
  });

  it("sets createdAt to an ISO 8601 string", () => {
    const d = createDefecationActivity({ animalId: "animal-1" });
    expect(d.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
  });

  it("defaults occurredAt to the current instant", () => {
    const before = new Date().toISOString();
    const d = createDefecationActivity({ animalId: "animal-1" });
    const after = new Date().toISOString();
    expect(d.occurredAt >= before).toBe(true);
    expect(d.occurredAt <= after).toBe(true);
  });

  it("preserves a caller-supplied occurredAt", () => {
    const supplied = "2024-03-15T10:30:00.000Z";
    const d = createDefecationActivity({
      animalId: "animal-1",
      occurredAt: supplied,
    });
    expect(d.occurredAt).toBe(supplied);
  });

  it("defaults issues to false", () => {
    const d = createDefecationActivity({ animalId: "animal-1" });
    expect(d.issues).toBe(false);
  });

  it("honors issues when set to true", () => {
    const d = createDefecationActivity({ animalId: "animal-1", issues: true });
    expect(d.issues).toBe(true);
  });

  it("defaults type to poop", () => {
    const d = createDefecationActivity({ animalId: "animal-1" });
    expect(d.type).toBe("poop");
  });

  it("honors type when set to urate", () => {
    const d = createDefecationActivity({
      animalId: "animal-1",
      type: "urate",
    });
    expect(d.type).toBe("urate");
  });

  it("honors type when set to both", () => {
    const d = createDefecationActivity({
      animalId: "animal-1",
      type: "both",
    });
    expect(d.type).toBe("both");
  });

  it("carries through optional note when supplied", () => {
    const d = createDefecationActivity({
      animalId: "animal-1",
      note: "Slightly runny",
    });
    expect(d.note).toBe("Slightly runny");
  });

  it("leaves note undefined when not supplied", () => {
    const d = createDefecationActivity({ animalId: "animal-1" });
    expect(d.note).toBeUndefined();
  });
});
