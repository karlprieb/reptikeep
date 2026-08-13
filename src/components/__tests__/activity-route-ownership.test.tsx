import { render } from "@testing-library/react-native";
import { useLocalSearchParams } from "expo-router";

import ActivityDetailScreen from "../../app/(index,reminders,settings,search)/animal/[id]/activity";
import AddMedicalScreen from "../../app/(index,reminders,settings,search)/animal/[id]/medical";
import { animals$, type Animal } from "@/state/animal";
import { createMedicalActivity, medicalStore } from "@/state/medical";

const ANIMALS: Record<string, Animal> = {
  first: {
    id: "first",
    createdAt: "2026-01-01T00:00:00.000Z",
    name: "First",
    commonName: "Ball python",
    sex: "unknown",
  },
  second: {
    id: "second",
    createdAt: "2026-01-02T00:00:00.000Z",
    name: "Second",
    commonName: "Corn snake",
    sex: "unknown",
  },
};

describe("activity route ownership", () => {
  beforeEach(() => {
    animals$.set(ANIMALS);
    medicalStore.clear();
  });

  it("rejects a detail route whose activity belongs to another animal", () => {
    const activity = createMedicalActivity({
      animalId: "second",
      summary: "Exam",
    });
    medicalStore.add(activity);
    jest.mocked(useLocalSearchParams).mockReturnValue({
      id: "first",
      type: "medical",
      activityId: activity.id,
    });

    const screen = render(<ActivityDetailScreen />);

    expect(screen.getByText("Animal not found")).toBeTruthy();
    expect(screen.queryByText("Exam")).toBeNull();
  });

  it("rejects an edit route whose activity belongs to another animal", () => {
    const activity = createMedicalActivity({
      animalId: "second",
      summary: "Exam",
    });
    medicalStore.add(activity);
    jest.mocked(useLocalSearchParams).mockReturnValue({
      id: "first",
      activityId: activity.id,
    });

    const screen = render(<AddMedicalScreen />);

    expect(screen.getByText("Animal not found")).toBeTruthy();
    expect(screen.queryByText("Edit medical record")).toBeNull();
  });
});
