import { readLabelDefaults } from "@/hooks/use-label-editor";

jest.mock("expo-sharing", () => ({ shareAsync: jest.fn() }));
jest.mock("expo-print", () => ({ printToFileAsync: jest.fn() }));
jest.mock("expo-file-system", () => ({ File: jest.fn(), Paths: {} }));
jest.mock("expo-image-manipulator", () => ({
  ImageManipulator: { manipulate: jest.fn() },
  SaveFormat: { JPEG: "jpeg" },
}));

describe("readLabelDefaults", () => {
  it("keeps valid saved choices", () => {
    expect(
      readLabelDefaults({
        size: "custom",
        target: "log",
        paper: "letter",
        customWidthMm: 90,
      }),
    ).toEqual({
      size: "custom",
      target: "log",
      paper: "letter",
      customWidthMm: 90,
    });
  });

  it("falls back per field when a saved value is unknown or missing", () => {
    expect(
      readLabelDefaults({
        size: "poster" as never,
        target: undefined,
        paper: "a4",
        customWidthMm: 999,
      }),
    ).toEqual({
      size: "card",
      target: "profile",
      paper: "a4",
      customWidthMm: 122,
    });
    expect(readLabelDefaults(undefined)).toEqual({
      size: "card",
      target: "profile",
      paper: "a4",
      customWidthMm: 122,
    });
  });
});
