import {
  clearManagedAnimalPhotos,
  deleteManagedAnimalPhoto,
  getAnimalPhotoUri,
  importAnimalPhoto,
  isManagedAnimalPhoto,
} from "@/utils/animal-photo-storage";

const mockFiles = new Set<string>();
const mockDirectories = new Set<string>();
const mockCopyCalls: {
  source: string;
  destination: string;
  overwrite?: boolean;
}[] = [];
const mockDeleteCalls: string[] = [];
let mockCopyError: Error | undefined;

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

beforeEach(() => {
  mockFiles.clear();
  mockDirectories.clear();
  mockCopyCalls.length = 0;
  mockDeleteCalls.length = 0;
  mockCopyError = undefined;
});

describe("importAnimalPhoto", () => {
  it("creates the managed directory and copies to an animal-id filename", async () => {
    const uri = await importAnimalPhoto(
      { uri: "file:///picker/Snake.HEIC" },
      "animal-123",
    );

    expect(mockDirectories).toContain(MANAGED_DIRECTORY);
    expect(mockCopyCalls).toEqual([
      {
        source: "file:///picker/Snake.HEIC",
        destination: `${MANAGED_DIRECTORY}/animal-123.heic`,
        overwrite: true,
      },
    ]);
    expect(uri).toBe(`${MANAGED_DIRECTORY}/animal-123.heic`);
  });

  it("ignores a query string when reading the extension", async () => {
    const uri = await importAnimalPhoto(
      { uri: "file:///picker/photo.png?width=200" },
      "animal-456",
    );

    expect(uri).toBe(`${MANAGED_DIRECTORY}/animal-456.png`);
  });

  it("falls back to a jpg extension when the source has none", async () => {
    const uri = await importAnimalPhoto(
      { uri: "file:///picker/photo" },
      "animal-654",
    );

    expect(uri).toBe(`${MANAGED_DIRECTORY}/animal-654.jpg`);
  });

  it("removes a partial destination and rejects when copy fails", async () => {
    mockCopyError = new Error("disk full");
    mockFiles.add(`${MANAGED_DIRECTORY}/animal-789.png`);

    await expect(
      importAnimalPhoto({ uri: "file:///picker/photo.png" }, "animal-789"),
    ).rejects.toThrow("disk full");
    expect(mockFiles).not.toContain(`${MANAGED_DIRECTORY}/animal-789.png`);
    expect(mockDeleteCalls).toContain(`${MANAGED_DIRECTORY}/animal-789.png`);
  });
});

describe("getAnimalPhotoUri", () => {
  it("rebuilds the URI from the current managed directory, ignoring a stale container path", () => {
    const stale = "file:///old-container/Documents/animal-photos/animal-1.jpg";

    expect(getAnimalPhotoUri(stale)).toBe(`${MANAGED_DIRECTORY}/animal-1.jpg`);
  });
});

describe("managed photo cleanup", () => {
  it("recognizes only files directly inside the managed directory", () => {
    expect(isManagedAnimalPhoto(`${MANAGED_DIRECTORY}/animal-1.jpg`)).toBe(
      true,
    );
    expect(
      isManagedAnimalPhoto("file:///documents/animal-photos-backup/a.jpg"),
    ).toBe(false);
    expect(isManagedAnimalPhoto(`${MANAGED_DIRECTORY}/nested/a.jpg`)).toBe(
      false,
    );
    expect(isManagedAnimalPhoto("file:///picker/a.jpg")).toBe(false);
  });

  it("deletes a managed photo but leaves an external photo untouched", () => {
    const managed = `${MANAGED_DIRECTORY}/animal-1.jpg`;
    const external = "file:///picker/library-photo.jpg";
    mockFiles.add(managed);
    mockFiles.add(external);

    deleteManagedAnimalPhoto(managed);
    deleteManagedAnimalPhoto(external);

    expect(mockFiles).not.toContain(managed);
    expect(mockFiles).toContain(external);
    expect(mockDeleteCalls).toEqual([managed]);
  });

  it("clears the complete managed directory when it exists", () => {
    mockDirectories.add(MANAGED_DIRECTORY);
    mockFiles.add(`${MANAGED_DIRECTORY}/animal-1.jpg`);
    mockFiles.add(`${MANAGED_DIRECTORY}/animal-2.webp`);

    clearManagedAnimalPhotos();

    expect(mockDirectories).not.toContain(MANAGED_DIRECTORY);
    expect(mockFiles).not.toContain(`${MANAGED_DIRECTORY}/animal-1.jpg`);
    expect(mockFiles).not.toContain(`${MANAGED_DIRECTORY}/animal-2.webp`);
    expect(mockDeleteCalls).toEqual([MANAGED_DIRECTORY]);
  });
});
