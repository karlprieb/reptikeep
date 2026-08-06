import {
  DocumentTooLargeError,
  MAX_DOCUMENT_BYTES,
  UnsupportedDocumentError,
  clearManagedAnimalDocuments,
  deleteManagedAnimalDocument,
  documentMimeType,
  getAnimalDocumentUri,
  importAnimalDocument,
  inspectDocumentSource,
  isManagedAnimalDocument,
  sniffDocumentExtension,
  writeAnimalDocument,
} from "@/utils/animal-document-storage";

type MockEntry = { bytes: Uint8Array; size: number };

const mockFiles = new Map<string, MockEntry>();
const mockDirectories = new Set<string>();
const mockCopyCalls: { source: string; destination: string }[] = [];
const mockDeleteCalls: string[] = [];
const mockMoveCalls: { from: string; to: string }[] = [];
let mockCopyError: Error | undefined;
let mockMoveError: Error | undefined;

const PDF_BYTES = new Uint8Array([
  0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34,
]);
const JPG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

function isoBmff(major: string, ...compatible: string[]): Uint8Array {
  const brands = [major, "\0\0\0\0", ...compatible].join("");
  const header = `\0\0\0${String.fromCharCode(8 + brands.length)}ftyp${brands}`;
  return Uint8Array.from(header, (character) => character.charCodeAt(0));
}

const HEIC_BYTES = isoBmff("heic", "mif1");
const MP4_BYTES = isoBmff("isom", "iso2", "avc1", "mp41");

function setFile(
  uri: string,
  bytes: Uint8Array,
  size = bytes.byteLength,
): void {
  mockFiles.set(uri, { bytes, size });
}

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
      return mockFiles.get(this.uri)?.size;
    }

    get parentDirectory() {
      return new MockDirectory(this.uri.slice(0, this.uri.lastIndexOf("/")));
    }

    async copy(destination: MockFile) {
      mockCopyCalls.push({ source: this.uri, destination: destination.uri });
      if (mockCopyError) throw mockCopyError;
      const entry = mockFiles.get(this.uri);
      if (entry) mockFiles.set(destination.uri, entry);
    }

    async move(destination: MockFile, options?: { overwrite?: boolean }) {
      mockMoveCalls.push({ from: this.uri, to: destination.uri });
      if (mockMoveError) throw mockMoveError;
      if (mockFiles.has(destination.uri) && !options?.overwrite)
        throw new Error(`destination already exists: ${destination.uri}`);
      const entry = mockFiles.get(this.uri);
      mockFiles.delete(this.uri);
      if (entry) mockFiles.set(destination.uri, entry);
      this.uri = destination.uri;
    }

    open() {
      const bytes = mockFiles.get(this.uri)?.bytes ?? new Uint8Array();
      return {
        readBytes: (length: number) => bytes.subarray(0, length),
        close: () => {},
      };
    }

    write(bytes: Uint8Array) {
      mockFiles.set(this.uri, { bytes, size: bytes.byteLength });
    }

    delete() {
      mockDeleteCalls.push(this.uri);
      mockFiles.delete(this.uri);
    }
  }

  return {
    Directory: MockDirectory,
    File: MockFile,
    FileMode: { ReadOnly: "r" },
    Paths: { document: { uri: "file:///documents" } },
  };
});

const MANAGED_DIRECTORY = "file:///documents/animal-documents";

beforeEach(() => {
  mockFiles.clear();
  mockDirectories.clear();
  mockCopyCalls.length = 0;
  mockDeleteCalls.length = 0;
  mockMoveCalls.length = 0;
  mockCopyError = undefined;
  mockMoveError = undefined;
});

describe("sniffDocumentExtension", () => {
  it("recognizes the supported types by their bytes", () => {
    expect(sniffDocumentExtension(PDF_BYTES)).toBe("pdf");
    expect(sniffDocumentExtension(JPG_BYTES)).toBe("jpg");
    expect(sniffDocumentExtension(PNG_BYTES)).toBe("png");
    expect(sniffDocumentExtension(HEIC_BYTES)).toBe("heic");
    expect(sniffDocumentExtension(isoBmff("mif1", "heic"))).toBe("heic");
  });

  it("rejects other ISO-BMFF files and unknown bytes", () => {
    expect(sniffDocumentExtension(MP4_BYTES)).toBeUndefined();
    expect(sniffDocumentExtension(isoBmff("qt  "))).toBeUndefined();
    expect(sniffDocumentExtension(new Uint8Array([0x50, 0x4b, 3, 4]))).toBe(
      undefined,
    );
    expect(sniffDocumentExtension(new Uint8Array())).toBeUndefined();
  });

  it("maps types for the share sheet", () => {
    expect(documentMimeType("pdf")).toBe("application/pdf");
    expect(documentMimeType("jpg")).toBe("image/jpeg");
  });
});

describe("inspectDocumentSource", () => {
  it("classifies by content, ignoring an extensionless uri", () => {
    setFile("file:///picker/ABCD-1234", PDF_BYTES, 2048);

    expect(inspectDocumentSource("file:///picker/ABCD-1234")).toEqual({
      extension: "pdf",
      size: 2048,
    });
  });

  it("rejects a file whose bytes do not match its name", () => {
    setFile("file:///picker/renamed.pdf", MP4_BYTES);

    expect(() => inspectDocumentSource("file:///picker/renamed.pdf")).toThrow(
      UnsupportedDocumentError,
    );
  });

  it("rejects an unsupported type", () => {
    setFile("file:///picker/contract.docx", new Uint8Array([0x50, 0x4b, 3, 4]));

    expect(() => inspectDocumentSource("file:///picker/contract.docx")).toThrow(
      UnsupportedDocumentError,
    );
  });

  it("rejects a file over the size limit and reports its size", () => {
    const oversized = MAX_DOCUMENT_BYTES + 1;
    setFile("file:///picker/huge.pdf", PDF_BYTES, oversized);

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
  it("stages, commits atomically and reports the size", async () => {
    setFile("file:///picker/nota.pdf", PDF_BYTES, 4096);

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
    expect(mockMoveCalls).toEqual([
      {
        from: `${MANAGED_DIRECTORY}/doc-123.pdf.staging`,
        to: `${MANAGED_DIRECTORY}/doc-123.pdf`,
      },
    ]);
    expect(result).toEqual({
      uri: `${MANAGED_DIRECTORY}/doc-123.pdf`,
      size: 4096,
    });
  });

  it("replaces a document stored under the same name", async () => {
    const destination = `${MANAGED_DIRECTORY}/doc-123.pdf`;
    setFile(destination, PDF_BYTES, 4096);
    setFile("file:///picker/newer.pdf", PDF_BYTES, 128);

    const result = await importAnimalDocument(
      "file:///picker/newer.pdf",
      "doc-123",
      "pdf",
    );

    expect(result).toEqual({ uri: destination, size: 128 });
    expect(mockFiles.get(destination)?.size).toBe(128);
    expect(mockFiles.has(`${destination}.staging`)).toBe(false);
  });

  it("keeps the original format rather than re-encoding", async () => {
    setFile("file:///picker/scan.png", PNG_BYTES, 128);

    const result = await importAnimalDocument(
      "file:///picker/scan.png",
      "doc-png",
      "png",
    );

    expect(result.uri).toBe(`${MANAGED_DIRECTORY}/doc-png.png`);
  });

  it("sanitises the document id in the filename", async () => {
    setFile("file:///picker/a.pdf", PDF_BYTES, 10);

    const result = await importAnimalDocument(
      "file:///picker/a.pdf",
      "doc-789!@#$",
      "pdf",
    );

    expect(result.uri).toBe(`${MANAGED_DIRECTORY}/doc-789.pdf`);
  });

  it("refuses an oversized file without copying anything", async () => {
    setFile("file:///picker/huge.pdf", PDF_BYTES, MAX_DOCUMENT_BYTES + 1);

    await expect(
      importAnimalDocument("file:///picker/huge.pdf", "doc-big", "pdf"),
    ).rejects.toBeInstanceOf(DocumentTooLargeError);

    expect(mockCopyCalls).toHaveLength(0);
    expect(mockFiles.has(`${MANAGED_DIRECTORY}/doc-big.pdf`)).toBe(false);
  });

  it("deletes the staging file when the commit fails", async () => {
    setFile("file:///picker/a.pdf", PDF_BYTES, 10);
    mockMoveError = new Error("move failed");

    await expect(
      importAnimalDocument("file:///picker/a.pdf", "doc-fail", "pdf"),
    ).rejects.toThrow("move failed");

    expect(mockFiles.has(`${MANAGED_DIRECTORY}/doc-fail.pdf.staging`)).toBe(
      false,
    );
    expect(mockDeleteCalls).toContain(
      `${MANAGED_DIRECTORY}/doc-fail.pdf.staging`,
    );
  });

  it("retains a previously stored document when the replacement fails", async () => {
    const existing = `${MANAGED_DIRECTORY}/doc-keep.pdf`;
    setFile(existing, PDF_BYTES, 99);
    setFile("file:///picker/new.pdf", PDF_BYTES, 10);
    mockCopyError = new Error("copy failed");

    await expect(
      importAnimalDocument("file:///picker/new.pdf", "doc-keep", "pdf"),
    ).rejects.toThrow("copy failed");

    expect(mockFiles.get(existing)?.size).toBe(99);
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
    setFile(managed, PDF_BYTES, 10);

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
    setFile(`${MANAGED_DIRECTORY}/doc-1.pdf`, PDF_BYTES, 1);
    setFile(`${MANAGED_DIRECTORY}/doc-2.jpg`, JPG_BYTES, 2);

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
    expect(mockFiles.get(uri)?.size).toBe(4);
  });
});
