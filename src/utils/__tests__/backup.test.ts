import {
  animalForBackup,
  backupName,
  parseBackup,
  preferencesForBackup,
} from "@/utils/backup";
import { strToU8, unzipSync, zipSync } from "fflate";

jest.mock("expo-sharing", () => ({}));
jest.mock("expo-file-system", () => ({
  File: class {},
  Directory: class {},
  Paths: {},
}));

const settings$ = jest.requireActual("@/state/settings").settings$;
const defaults$ = jest.requireActual("@/state/logging-defaults").defaults$;
const reminders$ = jest.requireActual("@/state/reminders").reminders$;
const careSchedules$ = jest.requireActual(
  "@/state/care-schedule",
).careSchedules$;

function archive(
  manifest: object,
  data: object,
  extra: Record<string, Uint8Array> = {},
) {
  const bytes = zipSync({
    "manifest.json": strToU8(JSON.stringify(manifest)),
    "data.json": strToU8(JSON.stringify(data)),
    ...extra,
  });
  return { exists: true, size: bytes.length, bytes: async () => bytes } as any;
}

const webp = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 4, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
]);
const animal = {
  id: "willow-1",
  createdAt: "2026-01-01T00:00:00.000Z",
  name: "Willow",
  sex: "female",
};
const manifest = {
  format: "app.reptikeep.backup",
  schemaVersion: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  scopes: { husbandry: "selected", preferences: "absent" },
  inventory: { animals: 1, records: 0, photos: 0 },
};
const husbandry = {
  animals: { "willow-1": animal },
  feedings: {},
  weights: {},
  sheds: {},
  defecations: {},
  habitats: {},
};

function activity(name: string, extra: object = {}) {
  return {
    id: `${name}-1`,
    animalId: "willow-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    occurredAt: "2026-01-01T00:00:00.000Z",
    ...extra,
  };
}

describe("backup archive validation", () => {
  it("uses a portable dated ZIP name", () => {
    expect(backupName(new Date("2026-04-03T00:00:00Z"))).toBe(
      "ReptiKeep-backup-2026-04-03.zip",
    );
  });

  it("normalizes persisted animals to the current backup schema", () => {
    expect(
      animalForBackup({
        ...animal,
        photo: "file:///animal.jpg",
        legacyField: "ignored",
      } as never),
    ).toEqual({
      ...animal,
      photo: "photos/willow-1.webp",
      commonName: undefined,
      scientificName: undefined,
      birthDate: undefined,
      acquiredDate: undefined,
      defaults: undefined,
      feedingSchedule: undefined,
      waterSchedule: undefined,
      reminders: undefined,
    });
  });

  it("normalizes a cleaning schedule and reminder alongside water", () => {
    expect(
      animalForBackup({
        ...animal,
        cleaningSchedule: { frequency: "monthly" },
        reminders: { water: true, cleaning: false },
      } as never),
    ).toMatchObject({
      cleaningSchedule: { frequency: "monthly" },
      reminders: { water: true, cleaning: false },
    });
  });

  it("normalizes a muted feeding reminder alongside water and cleaning", () => {
    expect(
      animalForBackup({
        ...animal,
        reminders: { feed: false, water: true, cleaning: false },
      } as never),
    ).toMatchObject({
      reminders: { feed: false, water: true, cleaning: false },
    });
  });

  it("normalizes persisted preferences to the current backup schema", () => {
    settings$.set({
      language: "legacy",
      reptileSort: { field: "legacy", direction: "legacy" },
      reptileView: "legacy",
      stale: true,
    } as never);
    defaults$.set({
      mealMeasure: "legacy",
      frozen: "yes",
      weightUnit: "oz",
      poopType: "legacy",
    } as never);
    reminders$.set({ hour: 99, minute: -1, stale: true } as never);
    careSchedules$.set({
      water: { frequency: "legacy" },
      stale: true,
    } as never);

    expect(preferencesForBackup()).toEqual({
      settings: {
        language: "system",
        reptileSort: { field: "name", direction: "asc" },
        reptileView: "single",
      },
      loggingDefaults: {
        mealMeasure: "weight",
        frozen: false,
        weightUnit: "g",
        poopType: "both",
      },
      reminders: { hour: 9, minute: 0 },
      careSchedules: {},
    });
  });

  it("round-trips a cleaning schedule alongside water in preferences", () => {
    careSchedules$.set({
      water: { frequency: "weekly" },
      cleaning: { frequency: "monthly" },
    });

    expect(preferencesForBackup().careSchedules).toEqual({
      water: { frequency: "weekly" },
      cleaning: { frequency: "monthly" },
    });
  });

  it("round-trips backup contents with worker-free ZIP APIs", () => {
    const contents = {
      "manifest.json": strToU8(JSON.stringify(manifest)),
      "data.json": strToU8(JSON.stringify(husbandry)),
    };

    expect(unzipSync(zipSync(contents))).toEqual(contents);
  });

  it("accepts a complete selected husbandry scope", async () => {
    await expect(
      parseBackup(archive(manifest, husbandry)),
    ).resolves.toMatchObject({ manifest });
  });

  it("requires every activity table in a husbandry scope", async () => {
    const { habitats: _, ...missing } = husbandry;
    await expect(parseBackup(archive(manifest, missing))).rejects.toThrow(
      "scopes",
    );
  });

  it.each([
    ["feedings", activity("feed", { frozen: false, refused: false })],
    ["weights", activity("weight", { weight: 12 })],
    ["sheds", activity("shed", { issues: false })],
    ["defecations", activity("waste", { issues: false, type: "both" })],
    ["habitats", activity("habitat", { water: true })],
  ])("validates %s activity semantics", async (table, record) => {
    await expect(
      parseBackup(
        archive(manifest, { ...husbandry, [table]: { [record.id]: record } }),
      ),
    ).resolves.toBeDefined();
    await expect(
      parseBackup(
        archive(manifest, {
          ...husbandry,
          [table]: { [record.id]: { ...record, occurredAt: "2026-1-01" } },
        }),
      ),
    ).rejects.toThrow("activity");
  });

  it("restores a legacy habitat record that has no cleaning key at all", async () => {
    const record = activity("habitat", { water: true });
    await expect(
      parseBackup(
        archive(manifest, { ...husbandry, habitats: { [record.id]: record } }),
      ),
    ).resolves.toMatchObject({ data: { habitats: { [record.id]: record } } });
  });

  it("accepts a habitat record with an explicit cleaning boolean", async () => {
    const record = activity("habitat", { water: true, cleaning: true });
    await expect(
      parseBackup(
        archive(manifest, { ...husbandry, habitats: { [record.id]: record } }),
      ),
    ).resolves.toMatchObject({ data: { habitats: { [record.id]: record } } });
  });

  it("rejects a habitat record with an unrecognized key", async () => {
    const record = activity("habitat", { water: true, extra: true });
    await expect(
      parseBackup(
        archive(manifest, { ...husbandry, habitats: { [record.id]: record } }),
      ),
    ).rejects.toThrow("activity");
  });

  it("rejects traversal paths before inflate", async () => {
    await expect(
      parseBackup(archive(manifest, husbandry, { "../photo.webp": webp })),
    ).rejects.toThrow("invalid file path");
  });

  it("rejects an excessive compression ratio before inflate", async () => {
    await expect(
      parseBackup(
        archive(manifest, husbandry, {
          "photos/willow-1.webp": new Uint8Array(6 * 1024 * 1024),
        }),
      ),
    ).rejects.toThrow("safety limits");
  });

  it("requires relative WebP photo references and signatures", async () => {
    const withPhoto = {
      ...husbandry,
      animals: { "willow-1": { ...animal, photo: "photos/willow-1.webp" } },
    };
    await expect(
      parseBackup(
        archive(manifest, withPhoto, { "photos/willow-1.webp": webp }),
      ),
    ).resolves.toBeDefined();
    await expect(
      parseBackup(
        archive(
          manifest,
          {
            ...withPhoto,
            animals: { "willow-1": { ...animal, photo: "file:///photo.webp" } },
          },
          { "photos/willow-1.webp": webp },
        ),
      ),
    ).rejects.toThrow("animal");
    await expect(
      parseBackup(
        archive(manifest, withPhoto, {
          "photos/willow-1.webp": new Uint8Array([1]),
        }),
      ),
    ).rejects.toThrow("photo");
  });

  it("rejects an animal with an unrecognized reminders key", async () => {
    const withAnimal = {
      ...husbandry,
      animals: {
        "willow-1": { ...animal, reminders: { water: true, extra: true } },
      },
    };
    await expect(parseBackup(archive(manifest, withAnimal))).rejects.toThrow(
      "animal",
    );
  });

  it("accepts an animal with a feed reminders key", async () => {
    const withAnimal = {
      ...husbandry,
      animals: {
        "willow-1": {
          ...animal,
          reminders: { feed: false, water: true, cleaning: false },
        },
      },
    };
    await expect(
      parseBackup(archive(manifest, withAnimal)),
    ).resolves.toMatchObject({
      data: { animals: withAnimal.animals },
    });
  });

  it("rejects preferences with an unrecognized care schedule key", async () => {
    const preferences = {
      settings: {
        language: "en",
        reptileSort: { field: "name", direction: "asc" },
        reptileView: "single",
      },
      loggingDefaults: {
        mealMeasure: "weight",
        frozen: false,
        weightUnit: "g",
        poopType: "both",
      },
      reminders: { hour: 9, minute: 0 },
      careSchedules: { water: { frequency: "weekly" }, extra: true },
    };
    const preferenceManifest = {
      ...manifest,
      scopes: { husbandry: "absent", preferences: "present" },
    };
    await expect(
      parseBackup(archive(preferenceManifest, preferences)),
    ).rejects.toThrow("preferences");
  });

  it("rejects invalid preference objects", async () => {
    const preferences = {
      settings: {
        language: "en",
        reptileSort: { field: "name", direction: "asc" },
        reptileView: "single",
      },
      loggingDefaults: {
        mealMeasure: "weight",
        frozen: false,
        weightUnit: "g",
        poopType: "both",
      },
      reminders: { hour: 9, minute: 0 },
      careSchedules: {},
    };
    const preferenceManifest = {
      ...manifest,
      scopes: { husbandry: "absent", preferences: "present" },
    };
    await expect(
      parseBackup(archive(preferenceManifest, preferences)),
    ).resolves.toBeDefined();
    await expect(
      parseBackup(
        archive(preferenceManifest, {
          ...preferences,
          reminders: { hour: 24, minute: 0 },
        }),
      ),
    ).rejects.toThrow("preferences");
  });
});
