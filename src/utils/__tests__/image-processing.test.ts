import { processAnimalPhoto } from "@/utils/image-processing";

const mockSaveAsync = jest.fn();
const mockRenderAsync = jest.fn();
const mockResize = jest.fn();
const mockContextRelease = jest.fn();

jest.mock("expo-image-manipulator", () => ({
  ImageManipulator: {
    manipulate: jest.fn(() => ({
      resize: mockResize,
      renderAsync: mockRenderAsync,
      release: mockContextRelease,
    })),
  },
  SaveFormat: { WEBP: "webp", JPEG: "jpeg", PNG: "png" },
}));

function createMockRef(width: number, height: number) {
  return { width, height, saveAsync: mockSaveAsync, release: jest.fn() };
}

beforeEach(() => {
  mockRenderAsync.mockResolvedValue(createMockRef(4000, 3000));
  mockSaveAsync.mockResolvedValue({ uri: "file:///cache/processed.webp" });
});

describe("processAnimalPhoto", () => {
  it("resizes landscape images whose long edge exceeds 2048", async () => {
    const uri = await processAnimalPhoto("file:///picker/large.heic");

    expect(mockResize).toHaveBeenCalledWith({ width: 2048 });
    expect(mockSaveAsync).toHaveBeenCalledWith({
      format: "webp",
      compress: 0.8,
    });
    expect(uri).toBe("file:///cache/processed.webp");
  });

  it("resizes portrait images on their height", async () => {
    mockRenderAsync.mockResolvedValue(createMockRef(3000, 4000));

    await processAnimalPhoto("file:///picker/portrait.heic");

    expect(mockResize).toHaveBeenCalledWith({ height: 2048 });
  });

  it("skips resize when long edge is exactly at the threshold", async () => {
    mockRenderAsync.mockResolvedValue(createMockRef(2048, 1536));

    const uri = await processAnimalPhoto("file:///picker/exact.heic");

    expect(mockResize).not.toHaveBeenCalled();
    expect(mockSaveAsync).toHaveBeenCalledWith({
      format: "webp",
      compress: 0.8,
    });
    expect(uri).toBe("file:///cache/processed.webp");
  });

  it("releases context resources after processing", async () => {
    await processAnimalPhoto("file:///picker/photo.jpg");

    expect(mockContextRelease).toHaveBeenCalledTimes(1);
  });

  it("releases context resources even when processing fails", async () => {
    mockSaveAsync.mockRejectedValue(new Error("encoding error"));

    await expect(
      processAnimalPhoto("file:///picker/broken.jpg"),
    ).rejects.toThrow("encoding error");

    expect(mockContextRelease).toHaveBeenCalledTimes(1);
  });
});
