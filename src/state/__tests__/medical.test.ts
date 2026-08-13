import { removeActivity } from "@/state/activity-stores";
import { addDocument, documents$ } from "@/state/document";
import {
  createMedicalActivity,
  medicalStore,
  saveMedicalActivity,
} from "@/state/medical";
import * as storage from "@/utils/animal-document-storage";
import { TEXT_LIMITS } from "@/utils/text-limits";

jest.mock("@/utils/animal-document-storage", () => ({
  deleteManagedAnimalDocument: jest.fn(),
  importAnimalDocument: jest.fn(),
  inspectDocumentSource: jest.fn(() => ({ extension: "pdf", size: 8 })),
  clearManagedAnimalDocuments: jest.fn(),
}));

const mockImport = jest.mocked(storage.importAnimalDocument);
const mockDelete = jest.mocked(storage.deleteManagedAnimalDocument);

describe("medical activity integrity", () => {
  beforeEach(() => {
    medicalStore.clear();
    documents$.set({});
    jest.clearAllMocks();
  });

  it("creates a timestamped medical record", () => {
    const record = createMedicalActivity({
      animalId: "animal-1",
      summary: "Examined by vet",
      occurredAt: "2024-03-15T10:30:00.000Z",
    });

    expect(record).toMatchObject({
      animalId: "animal-1",
      summary: "Examined by vet",
      occurredAt: "2024-03-15T10:30:00.000Z",
    });
    expect(record.id).toBeTruthy();
    expect(record.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("trims and clamps summaries while rejecting whitespace", () => {
    expect(
      createMedicalActivity({
        animalId: "animal-1",
        summary: `  ${"S".repeat(TEXT_LIMITS.summary + 20)}  `,
      }).summary,
    ).toBe("S".repeat(TEXT_LIMITS.summary));
    expect(() =>
      createMedicalActivity({ animalId: "animal-1", summary: "   " }),
    ).toThrow("required");
    expect(() =>
      medicalStore.add({
        id: "invalid",
        animalId: "animal-1",
        createdAt: "2026-01-01T00:00:00.000Z",
        occurredAt: "2026-01-01T00:00:00.000Z",
        summary: "   ",
      }),
    ).toThrow("required");
  });

  it("rejects incomplete, non-medical, missing, and cross-animal links", () => {
    expect(() =>
      addDocument({
        id: "doc-1",
        animalId: "animal-1",
        createdAt: "2026-01-01T00:00:00.000Z",
        title: "Exam",
        kind: "medical",
        file: "file:///doc-1.pdf",
        extension: "pdf",
        size: 8,
        activityType: "medical",
      }),
    ).toThrow("incomplete");

    const record = createMedicalActivity({
      animalId: "animal-1",
      summary: "Exam",
    });
    medicalStore.add(record);
    expect(() =>
      addDocument({
        id: "doc-kind",
        animalId: "animal-1",
        createdAt: "2026-01-01T00:00:00.000Z",
        title: "Exam",
        kind: "invoice",
        file: "file:///doc-kind.pdf",
        extension: "pdf",
        size: 8,
        activityType: "medical",
        activityId: record.id,
      }),
    ).toThrow("medical kind");

    expect(() =>
      addDocument({
        id: "doc-cross-animal",
        animalId: "animal-2",
        createdAt: "2026-01-01T00:00:00.000Z",
        title: "Exam",
        kind: "medical",
        file: "file:///doc-cross-animal.pdf",
        extension: "pdf",
        size: 8,
        activityType: "medical",
        activityId: record.id,
      }),
    ).toThrow("invalid");

    expect(() =>
      addDocument({
        id: "doc-2",
        animalId: "animal-1",
        createdAt: "2026-01-01T00:00:00.000Z",
        title: "Exam",
        kind: "medical",
        file: "file:///doc-2.pdf",
        extension: "pdf",
        size: 8,
        activityType: "medical",
        activityId: "missing",
      }),
    ).toThrow("invalid");
  });

  it("rolls back every imported byte when a later import fails", async () => {
    const record = createMedicalActivity({
      animalId: "animal-1",
      summary: "Exam",
    });
    mockImport
      .mockResolvedValueOnce({ uri: "file:///managed/doc-1.pdf", size: 8 })
      .mockRejectedValueOnce(new Error("copy failed"));

    await expect(
      saveMedicalActivity(record, [
        { uri: "file:///one.pdf", title: "One" },
        { uri: "file:///two.pdf", title: "Two" },
      ]),
    ).rejects.toThrow("copy failed");

    expect(medicalStore.$.peek()).toEqual({});
    expect(documents$.peek()).toEqual({});
    expect(mockDelete).toHaveBeenCalledWith("file:///managed/doc-1.pdf");
  });

  it("keeps edit identity and removes old files only after a successful import", async () => {
    const record = createMedicalActivity({
      animalId: "animal-1",
      summary: "Old",
    });
    medicalStore.add(record);
    addDocument({
      id: "old-doc",
      animalId: "animal-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      title: "Old",
      kind: "medical",
      file: "file:///managed/old.pdf",
      extension: "pdf",
      size: 8,
      activityType: "medical",
      activityId: record.id,
    });
    mockImport.mockRejectedValueOnce(new Error("copy failed"));

    await expect(
      saveMedicalActivity(
        { ...record, summary: "New" },
        [{ uri: "file:///new.pdf", title: "New" }],
        ["old-doc"],
      ),
    ).rejects.toThrow("copy failed");

    expect(medicalStore.$.peek()[record.id].summary).toBe("Old");
    expect(documents$.peek()["old-doc"]).toBeTruthy();
    expect(mockDelete).not.toHaveBeenCalledWith("file:///managed/old.pdf");
  });

  it("continues best-effort cleanup after a deletion throws", () => {
    const record = createMedicalActivity({
      animalId: "animal-1",
      summary: "Exam",
    });
    medicalStore.add(record);
    documents$.set(
      Object.fromEntries(
        ["one", "two"].map((id) => [
          id,
          {
            id,
            animalId: "animal-1",
            createdAt: "2026-01-01T00:00:00.000Z",
            title: id,
            kind: "medical" as const,
            file: `file:///managed/${id}.pdf`,
            extension: "pdf" as const,
            size: 8,
            activityType: "medical" as const,
            activityId: record.id,
          },
        ]),
      ),
    );
    mockDelete.mockImplementationOnce(() => {
      throw new Error("delete failed");
    });

    expect(() => removeActivity("medical", record.id)).not.toThrow();
    expect(mockDelete).toHaveBeenCalledTimes(2);
    expect(documents$.peek()).toEqual({});
  });

  it("cascades linked metadata and managed bytes for a single activity", () => {
    const record = createMedicalActivity({
      animalId: "animal-1",
      summary: "Exam",
    });
    medicalStore.add(record);
    documents$.set({
      "doc-1": {
        id: "doc-1",
        animalId: "animal-1",
        createdAt: "2026-01-01T00:00:00.000Z",
        title: "Exam",
        kind: "medical",
        file: "file:///managed/doc-1.pdf",
        extension: "pdf",
        size: 8,
        activityType: "medical",
        activityId: record.id,
      },
    });

    removeActivity("medical", record.id);
    removeActivity("medical", record.id);

    expect(medicalStore.$.peek()).toEqual({});
    expect(documents$.peek()).toEqual({});
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });
});
