import { File } from "expo-file-system";
import { zipSync } from "fflate";

import { animals$, type Animal } from "@/state/animal";
import { activityStores } from "@/state/activity-stores";
import { documents$, type AnimalDocument } from "@/state/document";
import { createBackup, parseBackup, restoreBackup } from "@/utils/backup";

const mockFiles = new Map<string, Uint8Array>();
const mockDirectories = new Set<string>();
let mockFailCopyDestination: string | undefined;

jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => undefined),
}));

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

    get name() {
      return this.uri.split("/").pop() ?? "";
    }

    get size() {
      return mockFiles.get(this.uri)?.byteLength;
    }

    get parentDirectory() {
      return new MockDirectory(this.uri.slice(0, this.uri.lastIndexOf("/")));
    }

    async bytes() {
      const bytes = mockFiles.get(this.uri);
      if (!bytes) throw new Error(`missing file ${this.uri}`);
      return bytes;
    }

    write(bytes: Uint8Array) {
      mockDirectories.add(this.uri.slice(0, this.uri.lastIndexOf("/")));
      mockFiles.set(this.uri, bytes);
    }

    async copy(destination: MockFile) {
      if (destination.uri === mockFailCopyDestination)
        throw new Error("copy failed");
      const bytes = mockFiles.get(this.uri);
      if (!bytes) throw new Error(`missing file ${this.uri}`);
      mockFiles.set(destination.uri, bytes);
    }

    rename(newName: string) {
      const directory = this.uri.slice(0, this.uri.lastIndexOf("/"));
      const bytes = mockFiles.get(this.uri)!;
      mockFiles.delete(this.uri);
      mockFiles.set(`${directory}/${newName}`, bytes);
    }

    delete() {
      mockFiles.delete(this.uri);
    }
  }

  return {
    Directory: MockDirectory,
    File: MockFile,
    Paths: {
      document: { uri: "file:///documents" },
      cache: { uri: "file:///cache" },
    },
  };
});

const DOCUMENTS_DIRECTORY = "file:///documents/animal-documents";

const PDF_BYTES = new Uint8Array([
  0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34,
]);
const JPG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const WEBP_BYTES = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
]);

const animal: Animal = {
  id: "animal-1",
  createdAt: "2026-01-01T00:00:00.000Z",
  name: "Zé",
  sex: "female",
};

const invoice: AnimalDocument = {
  id: "doc-invoice",
  animalId: "animal-1",
  createdAt: "2026-02-01T00:00:00.000Z",
  title: "Nota fiscal 4471",
  kind: "invoice",
  issuedDate: "2025-03-12",
  file: `${DOCUMENTS_DIRECTORY}/doc-invoice.pdf`,
  extension: "pdf",
  size: PDF_BYTES.byteLength,
};

const certificate: AnimalDocument = {
  id: "doc-origin",
  animalId: "animal-1",
  createdAt: "2026-02-02T00:00:00.000Z",
  title: "Certificado de origem",
  kind: "origin",
  file: `${DOCUMENTS_DIRECTORY}/doc-origin.jpg`,
  extension: "jpg",
  size: JPG_BYTES.byteLength,
};

function seed(): void {
  animals$.set({ [animal.id]: animal });
  documents$.set({ [invoice.id]: invoice, [certificate.id]: certificate });
  mockFiles.set(invoice.file, PDF_BYTES);
  mockFiles.set(certificate.file, JPG_BYTES);
  mockDirectories.add(DOCUMENTS_DIRECTORY);
}

function writeArchive(
  contents: Record<string, Uint8Array | [Uint8Array, { level: 0 }]>,
): File {
  const archive = new File("file:///cache/handmade/backup.zip");
  archive.write(zipSync(contents, { level: 0 }));
  return archive;
}

function json(value: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(value));
}

function manifest(schemaVersion: number, inventory: Record<string, number>) {
  return {
    format: "app.reptikeep.backup",
    schemaVersion,
    createdAt: "2026-08-05T00:00:00.000Z",
    scopes: { husbandry: "all", preferences: "absent" },
    inventory,
  };
}

function husbandryOnly(documents?: Record<string, unknown>) {
  return {
    animals: {
      [animal.id]: {
        id: animal.id,
        createdAt: animal.createdAt,
        name: animal.name,
        sex: animal.sex,
      },
    },
    feedings: {},
    weights: {},
    sheds: {},
    defecations: {},
    habitats: {},
    ...(documents ? { documents } : {}),
  };
}

function exportedDocument(overrides: Record<string, unknown> = {}) {
  return {
    id: invoice.id,
    animalId: invoice.animalId,
    createdAt: invoice.createdAt,
    title: invoice.title,
    kind: invoice.kind,
    issuedDate: invoice.issuedDate,
    file: `documents/${invoice.id}.pdf`,
    extension: "pdf",
    size: PDF_BYTES.byteLength,
    ...overrides,
  };
}

beforeEach(() => {
  mockFiles.clear();
  mockDirectories.clear();
  mockFailCopyDestination = undefined;
  animals$.set({});
  documents$.set({});
  for (const store of Object.values(activityStores)) store.clear();
});

describe("backup export", () => {
  it("carries every document of an exported animal at schema v2", async () => {
    seed();

    const parsed = await parseBackup(await createBackup());

    expect(parsed.manifest.schemaVersion).toBe(2);
    expect(parsed.manifest.inventory.documents).toBe(2);
    expect(Object.keys(parsed.documents).sort()).toEqual([
      "doc-invoice",
      "doc-origin",
    ]);
    expect(parsed.documents["doc-invoice"].bytes).toEqual(PDF_BYTES);
    expect(parsed.data.documents!["doc-invoice"]).toEqual(exportedDocument());
  });

  it("leaves out documents of animals excluded from a selective export", async () => {
    seed();

    const parsed = await parseBackup(
      await createBackup({ animalIds: [], includePreferences: true }),
    );

    expect(parsed.data.documents).toBeUndefined();
    expect(Object.keys(parsed.documents)).toHaveLength(0);
  });

  it("refuses to export when a document file has gone missing", async () => {
    seed();
    mockFiles.delete(invoice.file);

    await expect(createBackup()).rejects.toThrow("missing");
  });

  it("skips malformed persisted documents", async () => {
    seed();
    documents$.set({
      ...documents$.peek(),
      corrupt: { animalId: animal.id } as AnimalDocument,
    });

    const parsed = await parseBackup(await createBackup());

    expect(parsed.manifest.inventory.documents).toBe(2);
    expect(parsed.data.documents).toEqual({
      [invoice.id]: exportedDocument(),
      [certificate.id]: {
        ...certificate,
        file: `documents/${certificate.id}.jpg`,
      },
    });
  });
});

describe("backup restore", () => {
  it("restores documents and their bytes onto managed paths", async () => {
    seed();
    const archive = await createBackup();

    animals$.set({});
    documents$.set({});
    mockFiles.delete(invoice.file);
    mockFiles.delete(certificate.file);

    const restored = await restoreBackup(archive);

    expect(restored.documents).toBe(2);
    expect(documents$.peek()["doc-invoice"]).toEqual({
      ...exportedDocument(),
      file: `${DOCUMENTS_DIRECTORY}/doc-invoice.pdf`,
    });
    expect(mockFiles.get(`${DOCUMENTS_DIRECTORY}/doc-invoice.pdf`)).toEqual(
      PDF_BYTES,
    );
    expect(mockFiles.get(`${DOCUMENTS_DIRECTORY}/doc-origin.jpg`)).toEqual(
      JPG_BYTES,
    );
  });

  it("clears documents and their files when restoring a v1 backup", async () => {
    seed();
    const archive = writeArchive({
      "manifest.json": json(manifest(1, { animals: 1, records: 0, photos: 0 })),
      "data.json": json(husbandryOnly()),
    });

    const restored = await restoreBackup(archive);

    expect(restored.documents).toBe(0);
    expect(documents$.peek()).toEqual({});
    expect(mockFiles.has(invoice.file)).toBe(false);
    expect(mockFiles.has(certificate.file)).toBe(false);
  });

  it("removes documents whose animals the backup replaces", async () => {
    seed();
    const archive = writeArchive({
      "manifest.json": json(
        manifest(2, { animals: 1, records: 0, photos: 0, documents: 0 }),
      ),
      "data.json": json(husbandryOnly({})),
    });

    await restoreBackup(archive);

    expect(documents$.peek()).toEqual({});
    expect(mockFiles.has(invoice.file)).toBe(false);
  });

  it("removes an extension-changed document when state replacement fails", async () => {
    seed();
    const data = {
      ...husbandryOnly({
        [invoice.id]: exportedDocument({
          file: `documents/${invoice.id}.jpg`,
          extension: "jpg",
          size: JPG_BYTES.byteLength,
        }),
      }),
      animals: {
        [animal.id]: {
          ...animal,
          photo: `photos/${animal.id}.webp`,
        },
      },
    };
    const archive = writeArchive({
      "manifest.json": json(
        manifest(2, { animals: 1, records: 0, photos: 1, documents: 1 }),
      ),
      "data.json": json(data),
      [`documents/${invoice.id}.jpg`]: JPG_BYTES,
      [`photos/${animal.id}.webp`]: WEBP_BYTES,
    });
    mockFailCopyDestination = `file:///documents/animal-photos/${animal.id}.webp`;

    await expect(restoreBackup(archive)).rejects.toThrow("copy failed");

    expect(documents$.peek()).toEqual({
      [invoice.id]: invoice,
      [certificate.id]: certificate,
    });
    expect(mockFiles.get(invoice.file)).toEqual(PDF_BYTES);
    expect(mockFiles.has(`${DOCUMENTS_DIRECTORY}/${invoice.id}.jpg`)).toBe(
      false,
    );
  });
});

describe("backup validation", () => {
  const inventory = { animals: 1, records: 0, photos: 0, documents: 1 };

  it("rejects a document whose bytes do not match its declared type", async () => {
    const archive = writeArchive({
      "manifest.json": json(manifest(2, inventory)),
      "data.json": json(husbandryOnly({ [invoice.id]: exportedDocument() })),
      "documents/doc-invoice.pdf": JPG_BYTES,
    });

    await expect(parseBackup(archive)).rejects.toThrow("invalid document");
  });

  it("rejects a document file with no matching record", async () => {
    const archive = writeArchive({
      "manifest.json": json(manifest(2, inventory)),
      "data.json": json(husbandryOnly({})),
      "documents/doc-invoice.pdf": PDF_BYTES,
    });

    await expect(parseBackup(archive)).rejects.toThrow("unclaimed document");
  });

  it("rejects a document record with no file in the archive", async () => {
    const archive = writeArchive({
      "manifest.json": json(manifest(2, inventory)),
      "data.json": json(husbandryOnly({ [invoice.id]: exportedDocument() })),
    });

    await expect(parseBackup(archive)).rejects.toThrow("invalid document");
  });

  it("rejects a document whose declared size was tampered with", async () => {
    const archive = writeArchive({
      "manifest.json": json(manifest(2, inventory)),
      "data.json": json(
        husbandryOnly({ [invoice.id]: exportedDocument({ size: 1 }) }),
      ),
      "documents/doc-invoice.pdf": PDF_BYTES,
    });

    await expect(parseBackup(archive)).rejects.toThrow("invalid document");
  });

  it("rejects a document belonging to an animal outside the backup", async () => {
    const archive = writeArchive({
      "manifest.json": json(manifest(2, inventory)),
      "data.json": json(
        husbandryOnly({
          [invoice.id]: exportedDocument({ animalId: "animal-absent" }),
        }),
      ),
      "documents/doc-invoice.pdf": PDF_BYTES,
    });

    await expect(parseBackup(archive)).rejects.toThrow("invalid document");
  });

  it("rejects an unsupported document format at the archive path level", async () => {
    const archive = writeArchive({
      "manifest.json": json(manifest(2, inventory)),
      "data.json": json(husbandryOnly({})),
      "documents/doc-invoice.docx": PDF_BYTES,
    });

    await expect(parseBackup(archive)).rejects.toThrow("invalid file path");
  });

  it("rejects a document over the size limit", async () => {
    const huge = new Uint8Array(10 * 1024 * 1024 + 1);
    for (let index = 0; index < huge.length; index += 1) huge[index] = index;
    huge.set(PDF_BYTES);

    const archive = writeArchive({
      "manifest.json": json(manifest(2, inventory)),
      "data.json": json(
        husbandryOnly({
          [invoice.id]: exportedDocument({ size: huge.byteLength }),
        }),
      ),
      "documents/doc-invoice.pdf": [huge, { level: 0 }],
    });

    await expect(parseBackup(archive)).rejects.toThrow("safety limits");
  });

  it("rejects a v2 backup that claims documents in a preferences-only scope", async () => {
    const archive = writeArchive({
      "manifest.json": json({
        ...manifest(2, inventory),
        scopes: { husbandry: "absent", preferences: "absent" },
      }),
      "data.json": json({}),
      "documents/doc-invoice.pdf": PDF_BYTES,
    });

    await expect(parseBackup(archive)).rejects.toThrow("unexpected document");
  });
});
