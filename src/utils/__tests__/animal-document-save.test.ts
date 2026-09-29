import { addDocument, type AnimalDocument } from "@/state/document";
import { saveAnimalDocument } from "@/utils/animal-document-save";
import {
  deleteManagedAnimalDocument,
  getAnimalDocumentUri,
  importAnimalDocument,
  readAnimalDocumentBytes,
  writeAnimalDocument,
} from "@/utils/animal-document-storage";

jest.mock("@/state/document", () => ({
  addDocument: jest.fn(),
  newDocumentId: jest.fn(() => "new-id"),
}));

jest.mock("@/utils/animal-document-storage", () => ({
  deleteManagedAnimalDocument: jest.fn(),
  getAnimalDocumentUri: jest.fn((file: string) => `managed/${file}`),
  importAnimalDocument: jest.fn(),
  inspectDocumentSource: jest.fn(),
  readAnimalDocumentBytes: jest.fn(),
  writeAnimalDocument: jest.fn(),
}));

const existing: AnimalDocument = {
  id: "doc-1",
  animalId: "animal-1",
  createdAt: "2024-01-01T00:00:00.000Z",
  title: "Old title",
  kind: "medical",
  file: "doc-1.pdf",
  extension: "pdf",
  size: 10,
};

const base = {
  animalId: "animal-1",
  title: "Title",
  kind: "other" as const,
};

const addFails = () =>
  (addDocument as jest.Mock).mockImplementationOnce(() => {
    throw new Error("add failed");
  });

describe("saveAnimalDocument", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("imports a new file and adds the record", async () => {
    (importAnimalDocument as jest.Mock).mockResolvedValue({
      uri: "managed/new-id.pdf",
      size: 42,
    });

    await saveAnimalDocument({
      ...base,
      pickedFile: { uri: "cache/a.pdf", extension: "pdf" },
    });

    expect(importAnimalDocument).toHaveBeenCalledWith(
      "cache/a.pdf",
      "new-id",
      "pdf",
    );
    expect(addDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "new-id",
        file: "managed/new-id.pdf",
        size: 42,
        extension: "pdf",
      }),
    );
    expect(deleteManagedAnimalDocument).not.toHaveBeenCalled();
  });

  it("deletes the newly imported file and rethrows when adding fails", async () => {
    (importAnimalDocument as jest.Mock).mockResolvedValue({
      uri: "managed/new-id.pdf",
      size: 42,
    });
    addFails();

    await expect(
      saveAnimalDocument({
        ...base,
        pickedFile: { uri: "cache/a.pdf", extension: "pdf" },
      }),
    ).rejects.toThrow("add failed");

    expect(deleteManagedAnimalDocument).toHaveBeenCalledTimes(1);
    expect(deleteManagedAnimalDocument).toHaveBeenCalledWith(
      "managed/new-id.pdf",
    );
    expect(writeAnimalDocument).not.toHaveBeenCalled();
  });

  it("restores the overwritten bytes when replacing in place fails", async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    (readAnimalDocumentBytes as jest.Mock).mockResolvedValue(bytes);
    (importAnimalDocument as jest.Mock).mockResolvedValue({
      uri: "managed/doc-1.pdf",
      size: 99,
    });
    addFails();

    await expect(
      saveAnimalDocument({
        ...base,
        document: existing,
        pickedFile: { uri: "cache/b.pdf", extension: "pdf" },
      }),
    ).rejects.toThrow("add failed");

    expect(writeAnimalDocument).toHaveBeenCalledWith("doc-1", "pdf", bytes);
    expect(deleteManagedAnimalDocument).not.toHaveBeenCalled();
  });

  it("removes the new file and keeps the old one when replacing under a new name fails", async () => {
    (readAnimalDocumentBytes as jest.Mock).mockResolvedValue(
      new Uint8Array([1]),
    );
    (importAnimalDocument as jest.Mock).mockResolvedValue({
      uri: "managed/doc-1.png",
      size: 5,
    });
    addFails();

    await expect(
      saveAnimalDocument({
        ...base,
        document: existing,
        pickedFile: { uri: "cache/c.png", extension: "png" },
      }),
    ).rejects.toThrow("add failed");

    expect(deleteManagedAnimalDocument).toHaveBeenCalledTimes(1);
    expect(deleteManagedAnimalDocument).toHaveBeenCalledWith(
      "managed/doc-1.png",
    );
    expect(deleteManagedAnimalDocument).not.toHaveBeenCalledWith(
      getAnimalDocumentUri(existing.file),
    );
    expect(writeAnimalDocument).not.toHaveBeenCalled();
  });

  it("deletes the replaced file only after the record was saved", async () => {
    (readAnimalDocumentBytes as jest.Mock).mockResolvedValue(
      new Uint8Array([1]),
    );
    (importAnimalDocument as jest.Mock).mockResolvedValue({
      uri: "managed/doc-1.png",
      size: 5,
    });

    await saveAnimalDocument({
      ...base,
      document: existing,
      pickedFile: { uri: "cache/c.png", extension: "png" },
    });

    expect(deleteManagedAnimalDocument).toHaveBeenCalledTimes(1);
    expect(deleteManagedAnimalDocument).toHaveBeenCalledWith(
      "managed/doc-1.pdf",
    );
    expect((addDocument as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
      (deleteManagedAnimalDocument as jest.Mock).mock.invocationCallOrder[0],
    );
  });

  it("keeps the existing file when only the details change", async () => {
    await saveAnimalDocument({ ...base, document: existing });

    expect(importAnimalDocument).not.toHaveBeenCalled();
    expect(deleteManagedAnimalDocument).not.toHaveBeenCalled();
    expect(addDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "doc-1",
        file: "doc-1.pdf",
        size: 10,
        createdAt: existing.createdAt,
      }),
    );
  });

  it("throws without touching storage when there is no file to save", async () => {
    await expect(saveAnimalDocument(base)).rejects.toThrow("No file to save");

    expect(addDocument).not.toHaveBeenCalled();
    expect(deleteManagedAnimalDocument).not.toHaveBeenCalled();
  });
});
