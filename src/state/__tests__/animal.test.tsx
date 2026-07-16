import { observable } from "@legendapp/state";
import { useSelector as useValue } from "@legendapp/state/react";
import { act, render } from "@testing-library/react-native";
import { useMemo } from "react";
import { Text } from "react-native";

import {
  addAnimal,
  animals$,
  createAnimal,
  removeAnimal,
} from "@/state/animal";
import * as photoStorage from "@/utils/animal-photo-storage";

jest.mock("@/utils/animal-photo-storage", () => ({
  clearManagedAnimalPhotos: jest.fn(),
  deleteManagedAnimalPhoto: jest.fn(),
}));

const mockDeleteManagedAnimalPhoto = jest.mocked(
  photoStorage.deleteManagedAnimalPhoto,
);

describe("createAnimal", () => {
  it("generates distinct ids across calls", () => {
    const a = createAnimal({ name: "Buddy", commonName: "Gecko" });
    const b = createAnimal({ name: "Iggy", commonName: "Iguana" });
    expect(a.id).not.toBe(b.id);
  });

  it("preserves an optional feeding schedule", () => {
    expect(
      createAnimal({
        name: "Buddy",
        commonName: "Gecko",
        feedingSchedule: { frequency: "custom", days: 9 },
      }).feedingSchedule,
    ).toEqual({ frequency: "custom", days: 9 });
    expect(
      createAnimal({ name: "Iggy", commonName: "Iguana" }).feedingSchedule,
    ).toBeUndefined();
  });
});

describe("removeAnimal photo cleanup", () => {
  beforeEach(() => {
    animals$.set({});
    mockDeleteManagedAnimalPhoto.mockClear();
  });

  afterEach(() => {
    animals$.set({});
  });

  it("removes the target animal and requests cleanup for its photo only", () => {
    const target = createAnimal({
      name: "Buddy",
      commonName: "Gecko",
      photo: "file:///documents/animal-photos/buddy.jpg",
    });
    const other = createAnimal({
      name: "Iggy",
      commonName: "Iguana",
      photo: "file:///documents/animal-photos/iggy.jpg",
    });
    addAnimal(target);
    addAnimal(other);

    removeAnimal(target.id);

    expect(animals$.peek()).toEqual({ [other.id]: other });
    expect(mockDeleteManagedAnimalPhoto).toHaveBeenCalledWith(target.photo);
    expect(mockDeleteManagedAnimalPhoto).not.toHaveBeenCalledWith(other.photo);
  });

  it("removes an animal without a photo without a filesystem error", () => {
    const animal = createAnimal({ name: "Noel", commonName: "Corn snake" });
    addAnimal(animal);

    expect(() => removeAnimal(animal.id)).not.toThrow();
    expect(animals$.peek()).toEqual({});
    expect(mockDeleteManagedAnimalPhoto).toHaveBeenCalledWith(undefined);
  });
});

describe("adding a new key to a Record observable", () => {
  type Item = { id: string; name: string };

  function Probe({
    source$,
  }: {
    source$: ReturnType<typeof observable<Record<string, Item>>>;
  }) {
    const record = useValue(source$);
    const count = useMemo(() => Object.keys(record ?? {}).length, [record]);
    return <Text testID="count">{count}</Text>;
  }

  it("bracket .set() on a new key does NOT notify useSelector subscribers", () => {
    const items$ = observable<Record<string, Item>>({});
    const { getByTestId } = render(<Probe source$={items$} />);

    act(() => {
      items$["a1"].set({ id: "a1", name: "Buddy" });
    });

    expect(getByTestId("count").props.children).toBe(0);
    expect(items$.peek()).toEqual({ a1: { id: "a1", name: "Buddy" } });
  });

  it("whole-object .set() with a merged copy DOES notify useSelector subscribers", () => {
    const items$ = observable<Record<string, Item>>({});
    const { getByTestId } = render(<Probe source$={items$} />);

    act(() => {
      items$.set({ ...items$.peek(), a1: { id: "a1", name: "Buddy" } });
    });

    expect(getByTestId("count").props.children).toBe(1);
  });
});
