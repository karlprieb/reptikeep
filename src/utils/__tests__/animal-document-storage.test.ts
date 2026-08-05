import {
  DocumentTooLargeError,
  MAX_DOCUMENT_BYTES,
  UnsupportedDocumentError,
  clearManagedAnimalDocuments,
  deleteManagedAnimalDocument,
  documentExtension,
  documentMimeType,
  getAnimalDocumentUri,
  importAnimalDocument,
  inspectDocumentSource,
  isManagedAnimalDocument,
  writeAnimalDocument,
} from "@/utils/animal-document-storage";

const mockFiles = new Map<string, number>();
const mockDirectories = new Set<string>();
const mockCopyCalls: { source: string; destination: string }[] = [];
const mockDeleteCalls: string[] = [];
const mockRenameCalls: { from: string; to: string }[] = [];
let mockCopyError: Error | undefined;
let mockRenameError: Error | undefined;

jest.mock("expo-file-system", () => {
  const joinUri = (parts: ({ uri: string } | string)[]) =>
    parts
      .map((part) => (typeof part === "string" ? part : part.uri))
      .map((value, index) =>
        index === 0 ? value.replace(/\/$/, "") : value.replace(/^\//, ""),
      )
      .join("/");

  class MockDirectory {
    uri: string;

    constructor(...parts: ({ uri: string } | string)[]) {
      this.uri = joinUri(parts);
    }

    get exists() {
      return mockDirectories.has(this.uri);
    }

    create() {
      mockDirectories.add(this.uri);
    }

    delete() {
      mockDeleteCalls.push(this.uri);
      mockDirectories.delete(this.uri);
      for (const uri of [...mockFiles.keys()])
        if (uri.startsWith(`${this.uri}/`)) mockFiles.delete(uri);
    }
  }

  class MockFile {
    uri: string;

    constructor(...parts: ({ uri: string } | string)[]) {
      this.uri = joinUri(parts);
    }

    get exists() {
      return mockFiles.has(this.uri);
    }

    get size() {
      return mockFiles.get(this.uri);
    }

    get parentDirectory() {
      return new MockDirectory(this.uri.slice(0, this.uri.lastIndexOf("/")));
    }

    async copy(destination: MockFile) {
      mockCopyCalls.push({ source: this.uri, destination: destination.uri });
      if (mockCopyError) throw mockCopyError;
      mockFiles.set(destination.uri, mockFiles.get(this.uri) ?? 0);
    }

    rename(newName: string) {
      mockRenameCalls.push({ from: this.uri, to: newName });
      if (mockRenameError) throw mockRenameError;
      const directory = this.uri.slice(0, this.uri.lastIndexOf("/"));
      const size = mockFiles.get(this.uri) ?? 0;
      mockFiles.delete(this.uri);
      mockFiles.set(`${directory}/${newName}`, size);
    }

    write(bytes: Uint8Array) {
      mockFiles.set(this.uri, bytes.byteLength);
    }

    delete() {
      mockDeleteCalls.push(this.uri);
      mockFiles.delete(this.uri);
    }
  }

  return {
    Directory: MockDirectory,
    File: MockFile,
    Paths: { document: { uri: "file:///documents" } },
  };
});

const MANAGED_DIRECTORY = "file:///documents/animal-documents";

beforeEach(() => {
  mockFiles.clear();
  mockDirectories.clear();
  mockCopyCalls.length = 0;
  mockDeleteCalls.length = 0;
  mockRenameCalls.length = 0;
  mockCopyError = undefined;
  mockRenameError = undefined;
});

describe("documentExtension", () => {
  it("accepts the supported types and normalises aliases", () => {
    expect(documentExtension("nota-fiscal.pdf")).toBe("pdf");
    expect(documentExtension("scan.JPEG")).toBe("jpg");
    expect(documentExtension("file:///picker/IMG_0001.HEIF")).toBe("heic");
    expect(documentExtension("file:///picker/a.png?width=200")).toBe("png");
  });

  it("rejects anything else", () => {
    expect(documentExtension("contract.docx")).toBeUndefined();
    expect(documentExtension("archive.zip")).toBeUndefined();
    expect(documentExtension("no-extension")).toBeUndefined();
  });

  it("maps types for the share sheet", () => {
    expect(documentMimeType("pdf")).toBe("application/pdf");
    expect(documentMimeType("jpg")).toBe("image/jpeg");
  });
});

describe("inspectDocumentSource", () => {
  it("prefers the picker-supplied name over an extensionless uri", () => {
    mockFiles.set("file:///picker/ABCD-1234", 2048);

    expect(
      inspectDocumentSource("file:///picker/ABCD-1234", "nota fiscal.pdf"),
    ).toEqual({ extension: "pdf", size: 2048 });
  });

  it("rejects an unsupported type before touching the file system", () => {
    expect(() => inspectDocumentSource("file:///picker/contract.docx")).toThrow(
      UnsupportedDocumentError,
    );
  });

  it("rejects a file over the size limit and reports its size", () => {
    const oversized = MAX_DOCUMENT_BYTES + 1;
    mockFiles.set("file:///picker/huge.pdf", oversized);

    try {
      inspectDocumentSource("file:///picker/huge.pdf");
      throw new Error("expected a DocumentTooLargeError");
    } catch (error) {
      expect(error).toBeInstanceOf(DocumentTooLargeError);
      expect((error as DocumentTooLargeError).size).toBe(oversized);
    }
  });

  it("rejects a source that is not readable", () => {
    expect(() => inspectDocumentSource("file:///picker/gone.pdf")).toThrow(
      "unreadable",
    );
  });
});

describe("importAnimalDocument", () => {
  it("stages, renames atomically and reports the size", async () => {
    mockFiles.set("file:///picker/nota.pdf", 4096);

    const result = await importAnimalDocument(
      "file:///picker/nota.pdf",
      "doc-123",
      "pdf",
    );

    expect(mockDirectories).toContain(MANAGED_DIRECTORY);
    expect(mockCopyCalls).toEqual([
      {
        source: "file:///picker/nota.pdf",
        destination: `${MANAGED_DIRECTORY}/doc-123.pdf.staging`,
      },
    ]);
    expect(mockRenameCalls).toEqual([
      {
        from: `${MANAGED_DIRECTORY}/doc-123.pdf.staging`,
        to: "doc-123.pdf",
      },
    ]);
    expect(result).toEqual({
      uri: `${MANAGED_DIRECTORY}/doc-123.pdf`,
      size: 4096,
    });
  });

  it("keeps the original format rather than re-encoding", async () => {
    mockFiles.set("file:///picker/scan.png", 128);

    const result = await importAnimalDocument(
      "file:///picker/scan.png",
      "doc-png",
      "png",
    );

    expect(result.uri).toBe(`${MANAGED_DIRECTORY}/doc-png.png`);
  });

  it("sanitises the document id in the filename", async () => {
    mockFiles.set("file:///picker/a.pdf", 10);

    const result = await importAnimalDocument(
      "file:///picker/a.pdf",
      "doc-789!@#$",
      "pdf",
    );

    expect(result.uri).toBe(`${MANAGED_DIRECTORY}/doc-789.pdf`);
  });

  it("refuses an oversized file without copying anything", async () => {
    mockFiles.set("file:///picker/huge.pdf", MAX_DOCUMENT_BYTES + 1);

    await expect(
      importAnimalDocument("file:///picker/huge.pdf", "doc-big", "pdf"),
    ).rejects.toBeInstanceOf(DocumentTooLargeError);

    expect(mockCopyCalls).toHaveLength(0);
    expect(mockFiles.has(`${MANAGED_DIRECTORY}/doc-big.pdf`)).toBe(false);
  });

  it("deletes the staging file when the rename fails", async () => {
    mockFiles.set("file:///picker/a.pdf", 10);
    mockRenameError = new Error("rename failed");

    await expect(
      importAnimalDocument("file:///picker/a.pdf", "doc-fail", "pdf"),
    ).rejects.toThrow("rename failed");

    expect(mockFiles.has(`${MANAGED_DIRECTORY}/doc-fail.pdf.staging`)).toBe(
      false,
    );
    expect(mockDeleteCalls).toContain(
      `${MANAGED_DIRECTORY}/doc-fail.pdf.staging`,
    );
  });

  it("retains a previously stored document when the replacement fails", async () => {
    const existing = `${MANAGED_DIRECTORY}/doc-keep.pdf`;
    mockFiles.set(existing, 99);
    mockFiles.set("file:///picker/new.pdf", 10);
    mockCopyError = new Error("copy failed");

    await expect(
      importAnimalDocument("file:///picker/new.pdf", "doc-keep", "pdf"),
    ).rejects.toThrow("copy failed");

    expect(mockFiles.get(existing)).toBe(99);
  });
});

describe("getAnimalDocumentUri", () => {
  it("rebuilds the URI from the current managed directory, ignoring a stale container path", () => {
    const stale = "file:///old-container/Documents/animal-documents/doc-1.pdf";

    expect(getAnimalDocumentUri(stale)).toBe(`${MANAGED_DIRECTORY}/doc-1.pdf`);
  });
});

describe("managed document cleanup", () => {
  it("recognizes only files directly inside the managed directory", () => {
    expect(isManagedAnimalDocument(`${MANAGED_DIRECTORY}/doc-1.pdf`)).toBe(
      true,
    );
    expect(
      isManagedAnimalDocument("file:///documents/animal-documents-old/a.pdf"),
    ).toBe(false);
    expect(isManagedAnimalDocument(`${MANAGED_DIRECTORY}/nested/a.pdf`)).toBe(
      false,
    );
    expect(isManagedAnimalDocument("file:///picker/a.pdf")).toBe(false);
  });

  it("deletes through a stale container path", () => {
    const managed = `${MANAGED_DIRECTORY}/doc-1.pdf`;
    mockFiles.set(managed, 10);

    deleteManagedAnimalDocument(
      "file:///old-container/Documents/animal-documents/doc-1.pdf",
    );

    expect(mockFiles.has(managed)).toBe(false);
    expect(mockDeleteCalls).toContain(managed);
  });

  it("ignores a missing document", () => {
    deleteManagedAnimalDocument(`${MANAGED_DIRECTORY}/absent.pdf`);
    deleteManagedAnimalDocument(undefined);

    expect(mockDeleteCalls).toHaveLength(0);
  });

  it("clears the complete managed directory when it exists", () => {
    mockDirectories.add(MANAGED_DIRECTORY);
    mockFiles.set(`${MANAGED_DIRECTORY}/doc-1.pdf`, 1);
    mockFiles.set(`${MANAGED_DIRECTORY}/doc-2.jpg`, 2);

    clearManagedAnimalDocuments();

    expect(mockDirectories).not.toContain(MANAGED_DIRECTORY);
    expect(mockFiles.size).toBe(0);
    expect(mockDeleteCalls).toContain(MANAGED_DIRECTORY);
  });
});

describe("writeAnimalDocument", () => {
  it("creates the managed directory and writes the bytes", () => {
    const uri = writeAnimalDocument(
      "doc-restored",
      "pdf",
      new Uint8Array([0x25, 0x50, 0x44, 0x46]),
    );

    expect(uri).toBe(`${MANAGED_DIRECTORY}/doc-restored.pdf`);
    expect(mockDirectories).toContain(MANAGED_DIRECTORY);
    expect(mockFiles.get(uri)).toBe(4);
  });
});
