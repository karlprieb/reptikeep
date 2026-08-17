import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { strToU8, zipSync, type Zippable } from "fflate";

type Scale = {
  animals: number;
  activitiesPerAnimal: number;
  photos: "all" | "half" | "none";
};

type Table = Record<string, Record<string, unknown>>;

type BackupData = {
  animals: Table;
  feedings: Table;
  weights: Table;
  sheds: Table;
  defecations: Table;
  habitats: Table;
  medical: Table;
  documents: Table;
  settings: Record<string, unknown>;
  loggingDefaults: Record<string, unknown>;
  reminders: Record<string, unknown>;
  careSchedules: Record<string, unknown>;
};

const scales = {
  typical: { animals: 10, activitiesPerAnimal: 250, photos: "all" },
  heavy: { animals: 100, activitiesPerAnimal: 1_000, photos: "half" },
  extreme: { animals: 100, activitiesPerAnimal: 10_000, photos: "all" },
  "hot-animal": { animals: 20, activitiesPerAnimal: 2_000, photos: "half" },
  reminders: { animals: 500, activitiesPerAnimal: 20, photos: "none" },
} as const satisfies Record<string, Scale>;

type ScaleName = keyof typeof scales;

const species = [
  ["Ball Python", "Python regius"],
  ["Corn Snake", "Pantherophis guttatus"],
  ["Leopard Gecko", "Eublepharis macularius"],
  ["Bearded Dragon", "Pogona vitticeps"],
  ["Crested Gecko", "Correlophus ciliatus"],
] as const;
const names = [
  "Willow",
  "Ember",
  "Mango",
  "Luna",
  "Noodle",
  "Pepper",
  "Jade",
  "Atlas",
];
const foods = ["Mouse", "Rat", "Cricket", "Dubia roach", "Mealworm"];
const medicalSummaries = [
  "Routine wellness exam",
  "Medication administered",
  "Veterinary follow-up",
];
const activityTables = [
  "feedings",
  "weights",
  "sheds",
  "defecations",
  "habitats",
  "medical",
] as const;
const baseTime = Date.parse("2026-08-01T12:00:00.000Z");
const photoFiles = [
  "add-record.webp",
  "animal.webp",
  "reminders.webp",
  "reptiles.webp",
];

function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index < 0 ? undefined : process.argv[index + 1];
}

function positiveInteger(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0)
    throw new Error(`Expected a non-negative integer, received ${value}.`);
  return parsed;
}

function iso(milliseconds: number): string {
  return new Date(milliseconds).toISOString();
}

function emptyData(): BackupData {
  return {
    animals: {},
    feedings: {},
    weights: {},
    sheds: {},
    defecations: {},
    habitats: {},
    medical: {},
    documents: {},
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
    careSchedules: {
      water: { frequency: "daily" },
      cleaning: { frequency: "weekly" },
    },
  };
}

function shouldHavePhoto(
  photos: Scale["photos"],
  animalIndex: number,
): boolean {
  return photos === "all" || (photos === "half" && animalIndex % 2 === 0);
}

async function buildBackup(
  scale: Scale,
  seed: number,
  hotAnimal: boolean,
) {
  const rng = random(seed);
  const data = emptyData();
  const contents: Record<string, Uint8Array | [Uint8Array, { level: 0 }]> = {};
  let recordCount = 0;
  let photoCount = 0;
  const photos = await Promise.all(
    photoFiles.map((file) => readFile(resolve("assets/screenshots", file))),
  );

  const compact = scale.animals * scale.activitiesPerAnimal >= 1_000_000;

  for (let animalIndex = 0; animalIndex < scale.animals; animalIndex++) {
    const animalId = compact
      ? `a-${(animalIndex + 1).toString(36)}`
      : `animal-${String(animalIndex + 1).padStart(4, "0")}`;
    const [commonName, scientificName] = species[animalIndex % species.length];
    const hasPhoto = shouldHavePhoto(scale.photos, animalIndex);
    const createdAt = iso(baseTime - (animalIndex + 365) * 86_400_000);
    data.animals[animalId] = {
      id: animalId,
      createdAt,
      name: `${names[animalIndex % names.length]} ${animalIndex + 1}`,
      commonName,
      scientificName,
      sex: ["unknown", "male", "female"][animalIndex % 3],
      birthDate: `${2015 + (animalIndex % 10)}-0${(animalIndex % 9) + 1}-15`,
      acquiredDate: `${2020 + (animalIndex % 6)}-06-01`,
      defaults: {
        mealMeasure: animalIndex % 2 ? "amount" : "weight",
        frozen: animalIndex % 3 === 0,
        weightUnit: "g",
        poopType: ["poop", "urate", "both"][animalIndex % 3],
      },
      feedingSchedule: {
        frequency: "custom",
        days: 5 + (animalIndex % 10),
      },
      waterSchedule:
        animalIndex % 11 === 0
          ? { frequency: "off" }
          : { frequency: "daily" },
      cleaningSchedule:
        animalIndex % 13 === 0
          ? { frequency: "off" }
          : { frequency: "weekly" },
      reminders: { water: true, cleaning: animalIndex % 4 !== 0 },
      ...(hasPhoto ? { photo: `photos/${animalId}.webp` } : {}),
    };

    if (hasPhoto) {
      contents[`photos/${animalId}.webp`] = [
        photos[animalIndex % photos.length],
        { level: 0 },
      ];
      photoCount++;
    }

    const activities =
      hotAnimal && animalIndex === 0 ? 25_000 : scale.activitiesPerAnimal;
    for (let activityIndex = 0; activityIndex < activities; activityIndex++) {
      const table = activityTables[activityIndex % activityTables.length];
      const id = compact
        ? `r${(animalIndex + 1).toString(36)}-${(activityIndex + 1).toString(36)}`
        : `${table}-${String(animalIndex + 1).padStart(4, "0")}-${String(activityIndex + 1).padStart(6, "0")}`;
      const ageDays = Math.floor(
        Math.pow(rng(), 2.2) * (365 * 8) + activityIndex / 20,
      );
      const occurredAt = iso(baseTime - ageDays * 86_400_000 - animalIndex);
      const common = { id, animalId, createdAt: occurredAt, occurredAt };
      let record: Record<string, unknown>;

      switch (table) {
        case "feedings":
          record = {
            ...common,
            foodType: foods[Math.floor(rng() * foods.length)],
            amount: `${1 + Math.floor(rng() * 4)}`,
            weight: Math.floor(rng() * 150),
            frozen: rng() < 0.8,
            refused: rng() < 0.08,
            ...(!compact && rng() < 0.15
              ? { notes: "Observed normal feeding response." }
              : {}),
          };
          break;
        case "weights":
          record = {
            ...common,
            weight: 50 + animalIndex * 12 + Math.floor(rng() * 1_500),
            ...(!compact && rng() < 0.1
              ? { notes: "Measured before feeding." }
              : {}),
          };
          break;
        case "sheds":
          record = {
            ...common,
            issues: rng() < 0.06,
            ...(!compact && rng() < 0.15
              ? { notes: "Complete shed recorded." }
              : {}),
          };
          break;
        case "defecations":
          record = {
            ...common,
            issues: rng() < 0.04,
            type: ["poop", "urate", "both"][activityIndex % 3],
            ...(!compact && rng() < 0.15
              ? { note: "Normal appearance." }
              : {}),
          };
          break;
        case "habitats":
          record = {
            ...common,
            water:
              Math.floor(activityIndex / activityTables.length) % 4 === 0 ||
              Math.floor(activityIndex / activityTables.length) % 4 === 2,
            cleaning:
              Math.floor(activityIndex / activityTables.length) % 4 === 1 ||
              Math.floor(activityIndex / activityTables.length) % 4 === 2,
            ...(!compact && rng() < 0.15
              ? { notes: "Routine habitat care." }
              : {}),
          };
          break;
        case "medical":
          record = {
            ...common,
            summary:
              medicalSummaries[
                Math.floor(rng() * medicalSummaries.length)
              ],
            ...(!compact && rng() < 0.3
              ? { notes: "No complications observed." }
              : {}),
          };
          break;
      }

      data[table][id] = record;
      recordCount++;
    }
  }

  const manifest = {
    format: "app.reptikeep.backup",
    schemaVersion: 4,
    createdAt: iso(baseTime),
    scopes: { husbandry: "all", preferences: "present" },
    inventory: {
      animals: scale.animals,
      records: recordCount,
      photos: photoCount,
      documents: 0,
    },
  };
  contents["data.json"] = strToU8(JSON.stringify(data));
  contents["manifest.json"] = strToU8(JSON.stringify(manifest));

  return {
    bytes: zipSync(contents as Zippable, {
      level: 6,
      mtime: "2026-08-01T12:00:00.000Z",
    }),
    inventory: manifest.inventory,
  };
}

function usage(): never {
  console.error(
    `Usage: npm run generate:performance-backup -- --scale <${Object.keys(scales).join("|")}> [--seed 42] [--animals N] [--activities N] [--output path]`,
  );
  process.exit(1);
}

async function main() {
  const scaleName = (argument("scale") ?? "typical") as ScaleName;
  const preset = scales[scaleName];
  if (!preset || process.argv.includes("--help")) usage();

  const seed = positiveInteger(argument("seed"), 42);
  const scale: Scale = {
    ...preset,
    animals: positiveInteger(argument("animals"), preset.animals),
    activitiesPerAnimal: positiveInteger(
      argument("activities"),
      preset.activitiesPerAnimal,
    ),
  };
  const output = resolve(
    argument("output") ?? `performance-${scaleName}-seed-${seed}.zip`,
  );
  const generated = await buildBackup(
    scale,
    seed,
    scaleName === "hot-animal",
  );
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, generated.bytes);
  console.log(
    JSON.stringify(
      {
        output,
        seed,
        scale: scaleName,
        ...generated.inventory,
        bytes: generated.bytes.byteLength,
      },
      null,
      2,
    ),
  );
}

await main();
