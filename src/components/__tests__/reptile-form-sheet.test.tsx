import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";

import { ReptileFormSheet } from "@/components/reptile-form-sheet";
import * as animalState from "@/state/animal";
import { careSchedules$ } from "@/state/care-schedule";
import * as photoStorage from "@/utils/animal-photo-storage";

jest.mock("@/utils/animal-photo-storage", () => ({
  importAnimalPhoto: jest.fn(),
  deleteManagedAnimalPhoto: jest.fn(),
  clearManagedAnimalPhotos: jest.fn(),
  getAnimalPhotoUri: (photo: string) => photo,
  isManagedAnimalPhoto: (uri: string) => uri.includes("/animal-photos/"),
}));

jest.mock("expo-image-picker", () => ({
  PermissionStatus: { GRANTED: "granted" },
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

const mockImportAnimalPhoto = jest.mocked(photoStorage.importAnimalPhoto);
const mockDeleteManagedAnimalPhoto = jest.mocked(
  photoStorage.deleteManagedAnimalPhoto,
);
const mockRequestMediaLibraryPermissionsAsync = jest.mocked(
  ImagePicker.requestMediaLibraryPermissionsAsync,
);
const mockLaunchImageLibraryAsync = jest.mocked(
  ImagePicker.launchImageLibraryAsync,
);

const PICKED_PHOTO = {
  uri: "file:///picker/willow.heic",
  fileName: "willow.heic",
  mimeType: "image/heic",
  width: 1200,
  height: 800,
};
const REPLACEMENT_PHOTO = {
  ...PICKED_PHOTO,
  uri: "file:///picker/latest-willow.heic",
  fileName: "latest-willow.heic",
};
const MANAGED_PHOTO = "file:///documents/animal-photos/test-uuid-1.webp";

async function pickPhoto(screen: ReturnType<typeof render>): Promise<void> {
  fireEvent.press(screen.getByLabelText("Add photo"));
  await waitFor(() => {
    expect(screen.getByLabelText("Change photo")).toBeTruthy();
  });
}

beforeEach(() => {
  animalState.animals$.set({});
  careSchedules$.water.set(undefined);
  mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({
    granted: true,
    status: ImagePicker.PermissionStatus.GRANTED,
    expires: "never",
    canAskAgain: true,
    accessPrivileges: "all",
  });
  mockLaunchImageLibraryAsync.mockResolvedValue({
    canceled: false,
    assets: [PICKED_PHOTO],
  });
  mockImportAnimalPhoto.mockResolvedValue(MANAGED_PHOTO);
});

afterEach(() => {
  jest.restoreAllMocks();
  animalState.animals$.set({});
});

describe("ReptileFormSheet species autocomplete", () => {
  it("suggests a common-name match while typing and fills both fields on tap", async () => {
    const screen = render(<ReptileFormSheet />);

    fireEvent.changeText(screen.getByPlaceholderText("Common name"), "ba");
    const suggestion = await screen.findByText("Ball Python · Python regius");

    fireEvent.press(suggestion);

    expect(screen.getByDisplayValue("Ball Python")).toBeTruthy();
    expect(screen.getByDisplayValue("Python regius")).toBeTruthy();
    expect(screen.queryByText(/Ball Python ·/)).toBeNull();
  });

  it("suggests a scientific-name match while typing and fills both fields on tap", async () => {
    const screen = render(<ReptileFormSheet />);

    fireEvent.changeText(
      screen.getByPlaceholderText("Scientific name"),
      "Python reg",
    );
    const suggestion = await screen.findByText("Python regius · Ball Python");

    fireEvent.press(suggestion);

    expect(screen.getByDisplayValue("Ball Python")).toBeTruthy();
    expect(screen.getByDisplayValue("Python regius")).toBeTruthy();
    expect(screen.queryByText(/Python regius ·/)).toBeNull();
  });

  it("does not open a suggestion list for a prefilled edit before the keeper types", () => {
    const screen = renderEdit(existingAnimal());

    expect(screen.queryByText(/Green tree python ·/)).toBeNull();
    expect(screen.queryByText(/Morelia viridis ·/)).toBeNull();
  });
});

describe("ReptileFormSheet feeding schedule", () => {
  it("defaults a newly enabled schedule to weekly", async () => {
    const screen = render(<ReptileFormSheet />);
    fireEvent.changeText(screen.getByPlaceholderText("Name"), "Willow");

    expect(screen.queryByLabelText("Feeding schedule: Frequency")).toBeNull();
    fireEvent.press(screen.getByLabelText("Use feeding schedule"));
    expect(screen.getByLabelText("Feeding schedule: Frequency")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Save"));

    await waitFor(() => {
      expect(Object.values(animalState.animals$.peek())).toHaveLength(1);
    });
    expect(
      Object.values(animalState.animals$.peek())[0].feedingSchedule,
    ).toEqual({ frequency: "weekly" });
  });

  it("requires a positive whole number for a custom schedule", async () => {
    const screen = render(<ReptileFormSheet />);
    fireEvent.changeText(screen.getByPlaceholderText("Name"), "Willow");
    fireEvent.press(screen.getByLabelText("Use feeding schedule"));
    fireEvent(
      screen.getByLabelText("Feeding schedule: Frequency"),
      "selectionChange",
      "custom",
    );

    expect(screen.getByText(/whole number of days/)).toBeTruthy();
    expect(
      screen.getByLabelText("Save").props.accessibilityState.disabled,
    ).toBe(true);

    fireEvent.changeText(screen.getByPlaceholderText("Days"), "2.5");
    expect(
      screen.getByLabelText("Save").props.accessibilityState.disabled,
    ).toBe(true);

    fireEvent.changeText(screen.getByPlaceholderText("Days"), "9");
    expect(
      screen.getByLabelText("Save").props.accessibilityState.disabled,
    ).toBe(false);
    fireEvent.press(screen.getByLabelText("Save"));

    await waitFor(() => {
      expect(Object.values(animalState.animals$.peek())).toHaveLength(1);
    });
    expect(
      Object.values(animalState.animals$.peek())[0].feedingSchedule,
    ).toEqual({ frequency: "custom", days: 9 });
  });
});

describe("ReptileFormSheet water schedule", () => {
  const WATER = "Water change schedule: Frequency";

  async function saveNamed(screen: ReturnType<typeof render>, name: string) {
    fireEvent.changeText(screen.getByPlaceholderText("Name"), name);
    fireEvent.press(screen.getByLabelText("Save"));
    await waitFor(() => {
      expect(Object.values(animalState.animals$.peek())).toHaveLength(1);
    });
    return Object.values(animalState.animals$.peek())[0];
  }

  it("stores nothing while the row is left following the collection", async () => {
    const screen = render(<ReptileFormSheet />);
    const animal = await saveNamed(screen, "Willow");

    expect(animal.waterSchedule).toBeUndefined();
  });

  it("names the collection cadence in the row that defers to it", () => {
    careSchedules$.water.set({ frequency: "custom", days: 4 });
    const screen = render(<ReptileFormSheet />);

    expect(screen.getByText("Follow global · Every 4 days")).toBeTruthy();
  });

  it("says the collection has none when no cadence is set", () => {
    const screen = render(<ReptileFormSheet />);

    expect(screen.getAllByText("Follow global · Off")).toHaveLength(2);
  });

  it("stores an explicit opt-out, which absence could not express", async () => {
    careSchedules$.water.set({ frequency: "weekly" });
    const screen = render(<ReptileFormSheet />);
    fireEvent(screen.getByLabelText(WATER), "selectionChange", "off");

    const animal = await saveNamed(screen, "Willow");

    expect(animal.waterSchedule).toEqual({ frequency: "off" });
  });

  it("stores a cadence of the animal's own", async () => {
    const screen = render(<ReptileFormSheet />);
    fireEvent(screen.getByLabelText(WATER), "selectionChange", "everyOtherDay");

    const animal = await saveNamed(screen, "Willow");

    expect(animal.waterSchedule).toEqual({ frequency: "everyOtherDay" });
  });

  it("blocks the save on a custom cadence that is not a whole day count", () => {
    const screen = render(<ReptileFormSheet />);
    fireEvent.changeText(screen.getByPlaceholderText("Name"), "Willow");
    fireEvent(screen.getByLabelText(WATER), "selectionChange", "custom");

    expect(screen.getByText(/whole number of days/)).toBeTruthy();
    expect(
      screen.getByLabelText("Save").props.accessibilityState.disabled,
    ).toBe(true);

    fireEvent.changeText(screen.getByPlaceholderText("Days"), "0");
    expect(
      screen.getByLabelText("Save").props.accessibilityState.disabled,
    ).toBe(true);

    fireEvent.changeText(screen.getByPlaceholderText("Days"), "5");
    expect(
      screen.getByLabelText("Save").props.accessibilityState.disabled,
    ).toBe(false);
  });

  it("prefills an existing cadence and can hand the animal back to the collection", async () => {
    const screen = renderEdit(
      existingAnimal({ waterSchedule: { frequency: "custom", days: 12 } }),
    );

    expect(screen.getByDisplayValue("12")).toBeTruthy();
    fireEvent(screen.getByLabelText(WATER), "selectionChange", "inherit");
    fireEvent.press(screen.getByLabelText("Save"));

    await waitFor(() => {
      expect(animalState.animals$.peek().willow.waterSchedule).toBeUndefined();
    });
  });
});

describe("ReptileFormSheet photo persistence", () => {
  it("imports the latest selected photo before saving its managed URI", async () => {
    mockLaunchImageLibraryAsync
      .mockResolvedValueOnce({ canceled: false, assets: [PICKED_PHOTO] })
      .mockResolvedValueOnce({ canceled: false, assets: [REPLACEMENT_PHOTO] });
    const screen = render(<ReptileFormSheet />);
    fireEvent.changeText(screen.getByPlaceholderText("Name"), "Willow");
    await pickPhoto(screen);
    fireEvent.press(screen.getByLabelText("Change photo"));
    await waitFor(() => {
      expect(mockLaunchImageLibraryAsync).toHaveBeenCalledTimes(2);
    });

    fireEvent.press(screen.getByLabelText("Save"));

    await waitFor(() => {
      expect(Object.values(animalState.animals$.peek())).toHaveLength(1);
    });
    const animal = Object.values(animalState.animals$.peek())[0];
    expect(mockImportAnimalPhoto).toHaveBeenCalledWith(
      { uri: REPLACEMENT_PHOTO.uri },
      animal.id,
    );
    expect(animal.photo).toBe(MANAGED_PHOTO);
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it("still saves an animal when no photo is selected", async () => {
    const screen = render(<ReptileFormSheet />);
    fireEvent.changeText(screen.getByPlaceholderText("Name"), "Noel");

    fireEvent.press(screen.getByLabelText("Save"));

    await waitFor(() => {
      expect(Object.values(animalState.animals$.peek())).toHaveLength(1);
    });
    const animal = Object.values(animalState.animals$.peek())[0];
    expect(animal.photo).toBeUndefined();
    expect(mockImportAnimalPhoto).not.toHaveBeenCalled();
  });

  it("retains the form and preview after import failure, then saves without the photo", async () => {
    mockImportAnimalPhoto.mockRejectedValueOnce(new Error("disk full"));
    const screen = render(<ReptileFormSheet />);
    fireEvent.changeText(screen.getByPlaceholderText("Name"), "Willow");
    await pickPhoto(screen);

    fireEvent.press(screen.getByLabelText("Save"));

    const error = await screen.findByText(
      "We couldn't save this photo. Try again or remove it to save without a photo.",
    );
    expect(error.props.accessibilityRole).toBe("alert");
    expect(screen.getByDisplayValue("Willow")).toBeTruthy();
    expect(screen.getByLabelText("Change photo")).toBeTruthy();
    expect(animalState.animals$.peek()).toEqual({});
    expect(router.back).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText("Remove photo"));
    expect(screen.getByLabelText("Add photo")).toBeTruthy();
    expect(screen.queryByText(/couldn't save this photo/)).toBeNull();

    fireEvent.press(screen.getByLabelText("Save"));
    await waitFor(() => {
      expect(Object.values(animalState.animals$.peek())).toHaveLength(1);
    });
    expect(Object.values(animalState.animals$.peek())[0].photo).toBeUndefined();
  });

  it("guards repeated confirm activation while import is pending", async () => {
    let resolveImport: (uri: string) => void = () => undefined;
    mockImportAnimalPhoto.mockReturnValueOnce(
      new Promise<string>((resolve) => {
        resolveImport = resolve;
      }),
    );
    const screen = render(<ReptileFormSheet />);
    fireEvent.changeText(screen.getByPlaceholderText("Name"), "Willow");
    await pickPhoto(screen);

    const save = screen.getByLabelText("Save");
    fireEvent.press(save);
    fireEvent.press(save);

    expect(mockImportAnimalPhoto).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveImport(MANAGED_PHOTO);
    });
    await waitFor(() => {
      expect(Object.values(animalState.animals$.peek())).toHaveLength(1);
    });
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it("deletes the imported photo when adding the record fails", async () => {
    jest.spyOn(animalState, "addAnimal").mockImplementationOnce(() => {
      throw new Error("persistence failed");
    });
    const screen = render(<ReptileFormSheet />);
    fireEvent.changeText(screen.getByPlaceholderText("Name"), "Willow");
    await pickPhoto(screen);

    fireEvent.press(screen.getByLabelText("Save"));

    await screen.findByText(/couldn't save this photo/);
    expect(mockDeleteManagedAnimalPhoto).toHaveBeenCalledWith(MANAGED_PHOTO);
    expect(animalState.animals$.peek()).toEqual({});
    expect(router.back).not.toHaveBeenCalled();
  });

  it("explains a denied photo permission instead of doing nothing", async () => {
    mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({
      granted: false,
      status: ImagePicker.PermissionStatus.DENIED,
      expires: "never",
      canAskAgain: true,
      accessPrivileges: "none",
    });
    const screen = render(<ReptileFormSheet />);
    fireEvent.changeText(screen.getByPlaceholderText("Name"), "Willow");

    fireEvent.press(screen.getByLabelText("Add photo"));

    await screen.findByText(
      "ReptiKeep needs access to your photos to add one.",
    );
    expect(mockLaunchImageLibraryAsync).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Add photo")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Save"));
    await waitFor(() => {
      expect(Object.values(animalState.animals$.peek())).toHaveLength(1);
    });
    expect(Object.values(animalState.animals$.peek())[0].photo).toBeUndefined();
  });

  it("reports a picker that rejects and leaves the form usable", async () => {
    mockLaunchImageLibraryAsync.mockRejectedValueOnce(
      new Error("picker unavailable"),
    );
    const screen = render(<ReptileFormSheet />);
    fireEvent.changeText(screen.getByPlaceholderText("Name"), "Willow");

    fireEvent.press(screen.getByLabelText("Add photo"));

    await screen.findByText("We couldn't open your photo library. Try again.");
    expect(screen.getByLabelText("Add photo")).toBeTruthy();

    await pickPhoto(screen);
    expect(screen.queryByText(/couldn't open your photo library/)).toBeNull();
  });

  it("reports a permission request that rejects", async () => {
    mockRequestMediaLibraryPermissionsAsync.mockRejectedValueOnce(
      new Error("permission service down"),
    );
    const screen = render(<ReptileFormSheet />);

    fireEvent.press(screen.getByLabelText("Add photo"));

    await screen.findByText("We couldn't open your photo library. Try again.");
    expect(mockLaunchImageLibraryAsync).not.toHaveBeenCalled();
  });
});

const EXISTING_PHOTO = "file:///documents/animal-photos/willow.webp";

function existingAnimal(
  overrides: Partial<animalState.Animal> = {},
): animalState.Animal {
  return {
    id: "willow",
    createdAt: "2026-01-02T00:00:00.000Z",
    name: "Willow",
    commonName: "Green tree python",
    scientificName: "Morelia viridis",
    sex: "female",
    birthDate: "2023-05-04",
    acquiredDate: "2024-06-07",
    ...overrides,
  };
}

function renderEdit(animal: animalState.Animal) {
  animalState.animals$.set({ [animal.id]: animal });
  return render(<ReptileFormSheet animal={animal} />);
}

describe("ReptileFormSheet edit mode", () => {
  it("prefills the reptile and saves changes in place", async () => {
    const screen = renderEdit(existingAnimal());
    expect(screen.getByDisplayValue("Willow")).toBeTruthy();
    expect(screen.getByDisplayValue("Green tree python")).toBeTruthy();
    expect(screen.getByDisplayValue("Morelia viridis")).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText("Name"), "Willow Jr");
    fireEvent.press(screen.getByLabelText("Save"));

    await waitFor(() => {
      expect(animalState.animals$.peek().willow.name).toBe("Willow Jr");
    });
    const stored = animalState.animals$.peek();
    expect(Object.keys(stored)).toEqual(["willow"]);
    expect(stored.willow.commonName).toBe("Green tree python");
    expect(stored.willow.scientificName).toBe("Morelia viridis");
    expect(stored.willow.birthDate).toBe("2023-05-04");
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it("prefills and removes an existing feeding schedule", async () => {
    const screen = renderEdit(
      existingAnimal({
        feedingSchedule: { frequency: "custom", days: 12 },
      }),
    );

    expect(screen.getByDisplayValue("12")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Use feeding schedule"));
    expect(screen.queryByLabelText("Feeding schedule: Frequency")).toBeNull();
    fireEvent.press(screen.getByLabelText("Save"));

    await waitFor(() => {
      expect(
        animalState.animals$.peek().willow.feedingSchedule,
      ).toBeUndefined();
    });
  });

  it("clears the birth date when the keeper turns it off", async () => {
    const screen = renderEdit(existingAnimal());

    fireEvent.press(screen.getByLabelText("Known birth date"));
    fireEvent.press(screen.getByLabelText("Save"));

    await waitFor(() => {
      expect(animalState.animals$.peek().willow.birthDate).toBeUndefined();
    });
  });

  it("leaves a missing acquired date missing rather than stamping today", async () => {
    const screen = renderEdit(
      existingAnimal({ acquiredDate: undefined, birthDate: undefined }),
    );

    fireEvent.changeText(screen.getByPlaceholderText("Name"), "Willow Jr");
    fireEvent.press(screen.getByLabelText("Save"));

    await waitFor(() => {
      expect(animalState.animals$.peek().willow.name).toBe("Willow Jr");
    });
    expect(animalState.animals$.peek().willow.acquiredDate).toBeUndefined();
  });

  it("removes an existing photo and deletes the managed file", async () => {
    const screen = renderEdit(existingAnimal({ photo: EXISTING_PHOTO }));
    expect(screen.getByLabelText("Change photo")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Remove photo"));
    expect(screen.getByLabelText("Add photo")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Save"));

    await waitFor(() => {
      expect(animalState.animals$.peek().willow.photo).toBeUndefined();
    });
    expect(mockImportAnimalPhoto).not.toHaveBeenCalled();
    expect(mockDeleteManagedAnimalPhoto).toHaveBeenCalledWith(EXISTING_PHOTO);
  });

  it("keeps an untouched photo without reimporting or deleting it", async () => {
    const screen = renderEdit(existingAnimal({ photo: EXISTING_PHOTO }));

    fireEvent.press(screen.getByLabelText("Save"));

    await waitFor(() => {
      expect(router.back).toHaveBeenCalledTimes(1);
    });
    expect(animalState.animals$.peek().willow.photo).toBe(EXISTING_PHOTO);
    expect(mockImportAnimalPhoto).not.toHaveBeenCalled();
    expect(mockDeleteManagedAnimalPhoto).not.toHaveBeenCalled();
  });

  it("imports a replacement photo and deletes the one it replaced", async () => {
    const screen = renderEdit(existingAnimal({ photo: EXISTING_PHOTO }));

    fireEvent.press(screen.getByLabelText("Change photo"));
    await waitFor(() => {
      expect(mockLaunchImageLibraryAsync).toHaveBeenCalledTimes(1);
    });

    fireEvent.press(screen.getByLabelText("Save"));

    await waitFor(() => {
      expect(animalState.animals$.peek().willow.photo).toBe(MANAGED_PHOTO);
    });
    expect(mockImportAnimalPhoto).toHaveBeenCalledWith(
      { uri: PICKED_PHOTO.uri },
      "willow",
    );
    expect(mockDeleteManagedAnimalPhoto).toHaveBeenCalledWith(EXISTING_PHOTO);
  });
});
