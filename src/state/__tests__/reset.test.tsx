import { addAnimal, animals$, createAnimal } from "@/state/animal";
import { defecationStore, createDefecationActivity } from "@/state/defecation";
import { feedingStore, createFeedingActivity } from "@/state/feeding";
import { habitatStore, createHabitatActivity } from "@/state/habitat";
import { resetAppData } from "@/state/reset";
import { settings$ } from "@/state/settings";
import { shedStore, createShedActivity } from "@/state/shed";
import { weightStore, createWeightActivity } from "@/state/weight";
import * as photoStorage from "@/utils/animal-photo-storage";

jest.mock("@/utils/animal-photo-storage", () => ({
  clearManagedAnimalPhotos: jest.fn(),
  deleteManagedAnimalPhoto: jest.fn(),
}));

const mockClearManagedAnimalPhotos = jest.mocked(
  photoStorage.clearManagedAnimalPhotos,
);

describe("resetAppData", () => {
  beforeEach(() => {
    mockClearManagedAnimalPhotos.mockClear();
  });

  afterEach(() => {
    resetAppData();
    settings$.language.set("system");
  });

  it("clears husbandry data without changing app preferences", () => {
    const animal = createAnimal({ name: "Willow", commonName: "Python" });
    addAnimal(animal);
    defecationStore.add(createDefecationActivity({ animalId: animal.id }));
    feedingStore.add(createFeedingActivity({ animalId: animal.id }));
    habitatStore.add(createHabitatActivity({ animalId: animal.id }));
    shedStore.add(createShedActivity({ animalId: animal.id }));
    weightStore.add(createWeightActivity({ animalId: animal.id, weight: 420 }));
    settings$.language.set("pt-BR");

    resetAppData();

    expect(animals$.peek()).toEqual({});
    expect(defecationStore.$.peek()).toEqual({});
    expect(feedingStore.$.peek()).toEqual({});
    expect(habitatStore.$.peek()).toEqual({});
    expect(shedStore.$.peek()).toEqual({});
    expect(weightStore.$.peek()).toEqual({});
    expect(settings$.language.peek()).toBe("pt-BR");
    expect(mockClearManagedAnimalPhotos).toHaveBeenCalledTimes(1);
  });
});
