import { TEXT_LIMITS, clampTextFields } from "@/utils/text-limits";

describe("clampTextFields", () => {
  it("truncates free text to its limit", () => {
    const record = clampTextFields({
      title: "a".repeat(TEXT_LIMITS.title + 50),
      notes: "b".repeat(TEXT_LIMITS.notes + 50),
    });

    expect(record.title).toHaveLength(TEXT_LIMITS.title);
    expect(record.notes).toHaveLength(TEXT_LIMITS.notes);
  });

  it("trims surrounding whitespace", () => {
    expect(clampTextFields({ name: "  Zé  " })).toEqual({ name: "Zé" });
  });

  it("leaves identifiers, paths and dates untouched", () => {
    const record = {
      id: "doc-1",
      animalId: "animal-1",
      createdAt: "2026-02-01T00:00:00.000Z",
      file: "  file:///documents/animal-documents/doc-1.pdf  ",
      extension: "pdf",
      size: 4096,
      title: "Nota fiscal",
    };

    expect(clampTextFields(record)).toEqual(record);
  });

  it("keeps non-string values as they are", () => {
    expect(clampTextFields({ notes: undefined, amount: 3 })).toEqual({
      notes: undefined,
      amount: 3,
    });
  });
});
