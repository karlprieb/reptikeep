import {
  clearManagedAnimalPhotos,
  deleteManagedAnimalPhoto,
  getAnimalPhotoUri,
  importAnimalPhoto,
  isManagedAnimalPhoto,
} from "@/utils/animal-photo-storage";

let mockProcessedUri = "file:///cache/processed-animal-photo.webp";
let mockProcessError: Error | undefined;

jest.mock("@/utils/image-processing", () => ({
  processAnimalPhoto: jest.fn(async (_sourceUri: string) => {
    if (mockProcessError) throw mockProcessError;
    return mockProcessedUri;
  }),
}));

const mockProcessAnimalPhoto = jest.requireMock("@/utils/image-processing")
  .processAnimalPhoto as jest.Mock;

const mockFiles = new Set<string>();
const mockDirectories = new Set<string>();
const mockCopyCalls: {
  source: string;
  destination: string;
  overwrite?: boolean;
}[] = [];
const mockDeleteCalls: string[] = [];
const mockRenameCalls: { from: string; to: string }[] = [];
let mockCopyError: Error | undefined;
let mockRenameError: Error | undefined;

jest.mock("expo-file-system", () => {
  const joinUri = (parts: ({ uri: string } | string)[]) => {
    const values = parts.map((part) =>
      typeof part === "string" ? part : part.uri,
    );
    return values
      .map((value, index) =>
        index === 0 ? value.replace(/\/$/, "") : value.replace(/^\//, ""),
      )
      .join("/");
  };

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
      for (const uri of [...mockFiles]) {
        if (uri.startsWith(`${this.uri}/`)) mockFiles.delete(uri);
      }
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

    get parentDirectory() {
      const separator = this.uri.lastIndexOf("/");
      return new MockDirectory(this.uri.slice(0, separator));
    }

    async copy(destination: MockFile, options?: { overwrite?: boolean }) {
      mockCopyCalls.push({
        source: this.uri,
        destination: destination.uri,
        overwrite: options?.overwrite,
      });
      if (mockCopyError) throw mockCopyError;
      mockFiles.add(destination.uri);
    }

    rename(newName: string) {
      mockRenameCalls.push({ from: this.uri, to: newName });
      if (mockRenameError) throw mockRenameError;
      const dirUri = this.uri.substring(0, this.uri.lastIndexOf("/"));
      const newUri = `${dirUri}/${newName}`;
      mockFiles.delete(this.uri);
      mockFiles.add(newUri);
    }

    delete() {
      mockDeleteCalls.push(this.uri);
      mockFiles.delete(this.uri);
    }
  }

  return {
    Directory: MockDirectory,
    File: MockFile,
    Paths: {
      document: { uri: "file:///documents" },
      extname: (path: string) => {
        const name =
          decodeURIComponent(new URL(path).pathname).split("/").pop() ?? "";
        const dot = name.lastIndexOf(".");
        return dot > 0 ? name.slice(dot) : "";
      },
    },
  };
});

const MANAGED_DIRECTORY = "file:///documents/animal-photos";
const CACHE_DIR = "file:///cache";

beforeEach(() => {
  mockFiles.clear();
  mockDirectories.clear();
  mockCopyCalls.length = 0;
  mockDeleteCalls.length = 0;
  mockRenameCalls.length = 0;
  mockCopyError = undefined;
  mockRenameError = undefined;
  mockProcessError = undefined;
  mockProcessedUri = "file:///cache/processed-animal-photo.webp";
});

describe("importAnimalPhoto", () => {
  it("processes source, stages, renames atomically, deletes cache", async () => {
    mockProcessedUri = `${CACHE_DIR}/processed-animal-photo.webp`;
    mockFiles.add(mockProcessedUri);

    const uri = await importAnimalPhoto(
      { uri: "file:///picker/Snake.HEIC" },
      "animal-123",
    );

    expect(mockProcessAnimalPhoto).toHaveBeenCalledWith(
      "file:///picker/Snake.HEIC",
    );
    expect(mockDirectories).toContain(MANAGED_DIRECTORY);

    expect(mockCopyCalls).toEqual([
      {
        source: "file:///cache/processed-animal-photo.webp",
        destination: `${MANAGED_DIRECTORY}/animal-123.webp.staging`,
        overwrite: true,
      },
    ]);

    expect(mockRenameCalls).toEqual([
      {
        from: `${MANAGED_DIRECTORY}/animal-123.webp.staging`,
        to: "animal-123.webp",
      },
    ]);

    expect(mockDeleteCalls).toContain(
      "file:///cache/processed-animal-photo.webp",
    );

    expect(uri).toBe(`${MANAGED_DIRECTORY}/animal-123.webp`);
  });

  it("always stores with a .webp extension regardless of source format", async () => {
    const uri = await importAnimalPhoto(
      { uri: "file:///picker/photo.png?width=200" },
      "animal-456",
    );

    expect(uri).toBe(`${MANAGED_DIRECTORY}/animal-456.webp`);
  });

  it("sanitises the animal id in the filename", async () => {
    const uri = await importAnimalPhoto(
      { uri: "file:///picker/photo.jpg" },
      "animal-789!@#$",
    );

    expect(uri).toBe(`${MANAGED_DIRECTORY}/animal-789.webp`);
  });

  it("deletes cache file even when processing fails", async () => {
    mockProcessedUri = `${CACHE_DIR}/processed.webp`;
    mockFiles.add(mockProcessedUri);
    mockProcessError = new Error("encoding failed");

    await expect(
      importAnimalPhoto({ uri: "file:///picker/photo.png" }, "animal-111"),
    ).rejects.toThrow("encoding failed");

    expect(mockFiles).not.toContain(`${MANAGED_DIRECTORY}/animal-111.webp`);
    expect(mockCopyCalls).toHaveLength(0);
  });

  it("deletes the staging file and cache when rename fails", async () => {
    mockProcessedUri = `${CACHE_DIR}/processed.webp`;
    mockFiles.add(mockProcessedUri);
    mockRenameError = new Error("rename failed");

    await expect(
      importAnimalPhoto({ uri: "file:///picker/photo.png" }, "animal-789"),
    ).rejects.toThrow("rename failed");

    expect(mockFiles).not.toContain(
      `${MANAGED_DIRECTORY}/animal-789.webp.staging`,
    );
    expect(mockDeleteCalls).toContain(
      `${MANAGED_DIRECTORY}/animal-789.webp.staging`,
    );
    expect(mockDeleteCalls).toContain(`${CACHE_DIR}/processed.webp`);
  });

  it("retains any previously valid managed photo when replacement fails", async () => {
    const existingPhoto = `${MANAGED_DIRECTORY}/animal-retain.webp`;
    mockFiles.add(existingPhoto);
    mockCopyError = new Error("copy failed");

    await expect(
      importAnimalPhoto({ uri: "file:///picker/new.jpg" }, "animal-retain"),
    ).rejects.toThrow("copy failed");

    expect(mockFiles).toContain(existingPhoto);
  });
});

describe("getAnimalPhotoUri", () => {
  it("rebuilds the URI from the current managed directory, ignoring a stale container path", () => {
    const stale = "file:///old-container/Documents/animal-photos/animal-1.webp";

    expect(getAnimalPhotoUri(stale)).toBe(`${MANAGED_DIRECTORY}/animal-1.webp`);
  });
});

describe("managed photo cleanup", () => {
  it("recognizes only files directly inside the managed directory", () => {
    expect(isManagedAnimalPhoto(`${MANAGED_DIRECTORY}/animal-1.webp`)).toBe(
      true,
    );
    expect(
      isManagedAnimalPhoto("file:///documents/animal-photos-backup/a.webp"),
    ).toBe(false);
    expect(isManagedAnimalPhoto(`${MANAGED_DIRECTORY}/nested/a.webp`)).toBe(
      false,
    );
    expect(isManagedAnimalPhoto("file:///picker/a.webp")).toBe(false);
  });

  it("deletes a managed photo but leaves an external photo untouched", () => {
    const managed = `${MANAGED_DIRECTORY}/animal-1.webp`;
    const external = "file:///picker/library-photo.webp";
    mockFiles.add(managed);
    mockFiles.add(external);

    deleteManagedAnimalPhoto(managed);
    deleteManagedAnimalPhoto(external);

    expect(mockFiles).not.toContain(managed);
    expect(mockFiles).toContain(external);
    expect(mockDeleteCalls).toContain(managed);
  });

  it("clears the complete managed directory when it exists", () => {
    mockDirectories.add(MANAGED_DIRECTORY);
    mockFiles.add(`${MANAGED_DIRECTORY}/animal-1.webp`);
    mockFiles.add(`${MANAGED_DIRECTORY}/animal-2.webp`);

    clearManagedAnimalPhotos();

    expect(mockDirectories).not.toContain(MANAGED_DIRECTORY);
    expect(mockFiles).not.toContain(`${MANAGED_DIRECTORY}/animal-1.webp`);
    expect(mockFiles).not.toContain(`${MANAGED_DIRECTORY}/animal-2.webp`);
    expect(mockDeleteCalls).toContain(MANAGED_DIRECTORY);
  });
});
