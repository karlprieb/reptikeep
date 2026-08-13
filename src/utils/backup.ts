import { batch, syncState, when } from "@legendapp/state";
import * as Sharing from "expo-sharing";
import { Directory, File, Paths } from "expo-file-system";
import { unzipSync, zipSync, type Zippable } from "fflate";

import { activityStores } from "@/state/activity-stores";
import { animals$, type Animal } from "@/state/animal";
import { careSchedules$ } from "@/state/care-schedule";
import {
  documents$,
  DOCUMENT_KINDS,
  type AnimalDocument,
  type DocumentKind,
} from "@/state/document";
import { defaults$ } from "@/state/logging-defaults";
import { reminders$ } from "@/state/reminders";
import { setLanguage, settings$ } from "@/state/settings";
import {
  DOCUMENT_EXTENSIONS,
  MAX_DOCUMENT_BYTES,
  deleteManagedAnimalDocument,
  getAnimalDocumentUri,
  managedAnimalDocumentUri,
  readAnimalDocumentBytes,
  sniffDocumentExtension,
  writeAnimalDocument,
  type DocumentExtension,
} from "@/utils/animal-document-storage";
import {
  deleteManagedAnimalPhoto,
  getAnimalPhotoUri,
  managedAnimalPhotoUri,
} from "@/utils/animal-photo-storage";
import { TEXT_LIMITS, clampTextFields } from "@/utils/text-limits";

const FORMAT = "app.reptikeep.backup";
const VERSION = 4;
const SUPPORTED_VERSIONS = [1, 2, 3, 4];
// whole archive is decoded in memory, so these ceilings are RAM-bound; streaming zip is the upgrade path if keepers hit them.
const MAX_ARCHIVE_BYTES = 80 * 1024 * 1024;
const MAX_EXPANDED_BYTES = 160 * 1024 * 1024;
const MAX_ENTRY_BYTES = MAX_DOCUMENT_BYTES;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_ENTRIES = 1024;
const MAX_RATIO = 100;
const DOCUMENT_PREFIX = "documents/";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

const activityTables = {
  feedings: activityStores.feed.$,
  weights: activityStores.weight.$,
  sheds: activityStores.shed.$,
  defecations: activityStores.poop.$,
  habitats: activityStores.habitat.$,
  medical: activityStores.medical.$,
} as const;

const activityNames = Object.keys(activityTables) as ActivityTable[];
type ActivityTable = keyof typeof activityTables;
type Table = Record<string, Record<string, unknown>>;
type Scopes = {
  husbandry: "all" | "selected" | "absent";
  preferences: "present" | "absent";
};

export type BackupSelection = {
  animalIds: string[];
  includePreferences: boolean;
};
export type RestoredBackup = {
  scopes: Scopes;
  animals: number;
  records: number;
  documents: number;
};
type BackupData = {
  animals?: Record<string, Animal>;
  feedings?: Table;
  weights?: Table;
  sheds?: Table;
  defecations?: Table;
  habitats?: Table;
  medical?: Table;
  documents?: Table;
  settings?: Record<string, unknown>;
  loggingDefaults?: Record<string, unknown>;
  reminders?: Record<string, unknown>;
  careSchedules?: Record<string, unknown>;
};

type DocumentEntry = { extension: string; bytes: Uint8Array };

type ParsedBackup = {
  manifest: {
    format: string;
    schemaVersion: number;
    createdAt: string;
    scopes: Scopes;
    inventory: Record<string, unknown>;
  };
  data: BackupData;
  photos: Record<string, Uint8Array>;
  documents: Record<string, DocumentEntry>;
};

function cacheDirectory(): Directory {
  return new Directory(
    Paths.cache,
    `reptikeep-backup-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
}

function safeId(id: unknown): id is string {
  return typeof id === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(id);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function exactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

function validInstant(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
  )
    return false;
  return new Date(value).toISOString() === value;
}

function validCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function assertSafe(value: unknown): asserts value is Record<string, unknown> {
  if (!isPlainObject(value)) throw new Error("Backup contains invalid data.");
  for (const [key, child] of Object.entries(value)) {
    if (["__proto__", "constructor", "prototype"].includes(key))
      throw new Error("Backup contains unsafe data.");
    if (isPlainObject(child)) assertSafe(child);
    if (Array.isArray(child))
      child.forEach((item) => isPlainObject(item) && assertSafe(item));
  }
}

function read16(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function read32(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24)) >>>
    0
  );
}

function inspectZip(bytes: Uint8Array): void {
  let eocd = -1;
  for (
    let index = bytes.length - 22;
    index >= Math.max(0, bytes.length - 0x10016);
    index -= 1
  )
    if (read32(bytes, index) === 0x06054b50) {
      eocd = index;
      break;
    }

  if (eocd < 0 || read16(bytes, eocd + 4) || read16(bytes, eocd + 6))
    throw new Error("Backup is not a supported ZIP archive.");

  const count = read16(bytes, eocd + 10);
  const length = read32(bytes, eocd + 12);
  let offset = read32(bytes, eocd + 16);
  if (count > MAX_ENTRIES || offset + length > eocd)
    throw new Error("Backup archive is invalid or too large.");

  let expanded = 0;
  const paths = new Set<string>();
  for (let index = 0; index < count; index += 1) {
    if (offset + 46 > eocd || read32(bytes, offset) !== 0x02014b50)
      throw new Error("Backup archive is invalid.");

    const flags = read16(bytes, offset + 8);
    const method = read16(bytes, offset + 10);
    const compressed = read32(bytes, offset + 20);
    const uncompressed = read32(bytes, offset + 24);
    const nameLength = read16(bytes, offset + 28);
    const extraLength = read16(bytes, offset + 30);
    const commentLength = read16(bytes, offset + 32);
    const end = offset + 46 + nameLength + extraLength + commentLength;

    if (
      end > eocd ||
      flags & 1 ||
      ![0, 8].includes(method) ||
      uncompressed > MAX_ENTRY_BYTES ||
      (compressed && uncompressed / compressed > MAX_RATIO)
    )
      throw new Error("Backup archive exceeds safety limits.");

    let path: string;
    try {
      path = new TextDecoder("utf-8", { fatal: true }).decode(
        bytes.slice(offset + 46, offset + 46 + nameLength),
      );
    } catch {
      throw new Error("Backup contains an invalid file path.");
    }

    if (
      !/^(manifest|data)\.json$|^photos\/[A-Za-z0-9_-]+\.webp$|^documents\/[A-Za-z0-9_-]+\.(pdf|jpg|png|heic)$/.test(
        path,
      ) ||
      paths.has(path.toLowerCase())
    )
      throw new Error("Backup contains an invalid file path.");

    paths.add(path.toLowerCase());
    expanded += uncompressed;
    if (expanded > MAX_EXPANDED_BYTES)
      throw new Error("Backup expands to too much data.");

    offset = end;
  }
  if (
    offset !== read32(bytes, eocd + 16) + length ||
    !paths.has("manifest.json") ||
    !paths.has("data.json")
  )
    throw new Error("Backup is missing required files.");
}

function parseJson(bytes: Uint8Array): Record<string, unknown> {
  if (bytes.byteLength > 4 * 1024 * 1024)
    throw new Error("Backup data is too large.");

  try {
    const value: unknown = JSON.parse(decoder.decode(bytes));
    assertSafe(value);
    return value;
  } catch {
    throw new Error("Backup JSON is invalid.");
  }
}

function validSchedule(value: unknown, allowOff = false): boolean {
  if (
    !isPlainObject(value) ||
    !exactKeys(value, ["frequency", "days"]) ||
    typeof value.frequency !== "string"
  )
    return false;

  if (allowOff && value.frequency === "off")
    return Object.keys(value).length === 1;

  if (
    ["daily", "everyOtherDay", "weekly", "everyTwoWeeks", "monthly"].includes(
      value.frequency,
    )
  )
    return Object.keys(value).length === 1;

  return (
    value.frequency === "custom" &&
    Object.keys(value).length === 2 &&
    Number.isInteger(value.days) &&
    (value.days as number) > 0
  );
}

function validAnimal(
  value: unknown,
  id: string,
  photos: Record<string, Uint8Array>,
): boolean {
  if (
    !isPlainObject(value) ||
    !exactKeys(value, [
      "id",
      "createdAt",
      "photo",
      "name",
      "commonName",
      "scientificName",
      "sex",
      "birthDate",
      "acquiredDate",
      "defaults",
      "feedingSchedule",
      "waterSchedule",
      "cleaningSchedule",
      "reminders",
    ]) ||
    value.id !== id ||
    !validInstant(value.createdAt) ||
    typeof value.name !== "string" ||
    !["unknown", "male", "female"].includes(value.sex as string)
  )
    return false;

  if (
    ["commonName", "scientificName"].some(
      (key) => value[key] !== undefined && typeof value[key] !== "string",
    ) ||
    (value.birthDate !== undefined && !validCalendarDate(value.birthDate)) ||
    (value.acquiredDate !== undefined && !validCalendarDate(value.acquiredDate))
  )
    return false;

  if (value.photo !== undefined && value.photo !== `photos/${id}.webp`)
    return false;

  if ((value.photo !== undefined) !== !!photos[id]) return false;

  if (
    value.defaults !== undefined &&
    (!isPlainObject(value.defaults) ||
      !exactKeys(value.defaults, [
        "mealMeasure",
        "frozen",
        "weightUnit",
        "poopType",
      ]) ||
      (value.defaults.mealMeasure !== undefined &&
        !["amount", "weight"].includes(value.defaults.mealMeasure as string)) ||
      (value.defaults.frozen !== undefined &&
        typeof value.defaults.frozen !== "boolean") ||
      (value.defaults.weightUnit !== undefined &&
        !["g", "kg", "lb"].includes(value.defaults.weightUnit as string)) ||
      (value.defaults.poopType !== undefined &&
        !["poop", "urate", "both"].includes(value.defaults.poopType as string)))
  )
    return false;

  return (
    (value.feedingSchedule === undefined ||
      validSchedule(value.feedingSchedule)) &&
    (value.waterSchedule === undefined ||
      validSchedule(value.waterSchedule, true)) &&
    (value.cleaningSchedule === undefined ||
      validSchedule(value.cleaningSchedule, true)) &&
    (value.reminders === undefined ||
      (isPlainObject(value.reminders) &&
        exactKeys(value.reminders, ["water", "cleaning"]) &&
        (value.reminders.water === undefined ||
          typeof value.reminders.water === "boolean") &&
        (value.reminders.cleaning === undefined ||
          typeof value.reminders.cleaning === "boolean")))
  );
}
function validActivity(
  name: ActivityTable,
  record: unknown,
  id: string,
  animals: Record<string, Animal>,
): boolean {
  if (
    !isPlainObject(record) ||
    !safeId(id) ||
    record.id !== id ||
    !safeId(record.animalId) ||
    !animals[record.animalId] ||
    !validInstant(record.createdAt) ||
    !validInstant(record.occurredAt)
  )
    return false;

  const allowed: Record<ActivityTable, string[]> = {
    feedings: [
      "id",
      "animalId",
      "createdAt",
      "occurredAt",
      "foodType",
      "amount",
      "weight",
      "notes",
      "frozen",
      "refused",
    ],
    weights: ["id", "animalId", "createdAt", "occurredAt", "weight", "notes"],
    sheds: ["id", "animalId", "createdAt", "occurredAt", "issues", "notes"],
    defecations: [
      "id",
      "animalId",
      "createdAt",
      "occurredAt",
      "issues",
      "type",
      "note",
    ],
    habitats: [
      "id",
      "animalId",
      "createdAt",
      "occurredAt",
      "water",
      "cleaning",
      "notes",
    ],
    medical: ["id", "animalId", "createdAt", "occurredAt", "summary", "notes"],
  };

  if (!exactKeys(record, allowed[name])) return false;

  const strings = ["foodType", "amount", "notes", "note"];
  if (
    strings.some(
      (key) => record[key] !== undefined && typeof record[key] !== "string",
    )
  )
    return false;

  if (name === "feedings")
    return (
      typeof record.frozen === "boolean" &&
      typeof record.refused === "boolean" &&
      (record.weight === undefined ||
        (typeof record.weight === "number" &&
          Number.isInteger(record.weight) &&
          record.weight >= 0))
    );

  if (name === "weights")
    return (
      typeof record.weight === "number" &&
      Number.isInteger(record.weight) &&
      record.weight >= 1
    );

  if (name === "sheds") return typeof record.issues === "boolean";

  if (name === "defecations")
    return (
      typeof record.issues === "boolean" &&
      ["poop", "urate", "both"].includes(record.type as string)
    );

  if (name === "medical")
    return (
      typeof record.summary === "string" &&
      record.summary.trim().length > 0 &&
      record.summary.length <= TEXT_LIMITS.summary &&
      (record.notes === undefined || typeof record.notes === "string")
    );

  return (
    typeof record.water === "boolean" &&
    (record.cleaning === undefined || typeof record.cleaning === "boolean")
  );
}

function validDocument(
  record: unknown,
  id: string,
  animals: Record<string, Animal>,
  entries: Record<string, DocumentEntry>,
  schemaVersion: number,
  activities: BackupData,
): boolean {
  if (
    !isPlainObject(record) ||
    !safeId(id) ||
    record.id !== id ||
    !exactKeys(record, [
      "id",
      "animalId",
      "createdAt",
      "title",
      "kind",
      "issuedDate",
      "file",
      "extension",
      "size",
      ...(schemaVersion >= 4 ? ["activityType", "activityId"] : []),
    ]) ||
    !safeId(record.animalId) ||
    !animals[record.animalId] ||
    !validInstant(record.createdAt) ||
    typeof record.title !== "string" ||
    record.title.length > TEXT_LIMITS.title ||
    !DOCUMENT_KINDS.includes(record.kind as DocumentKind) ||
    (record.issuedDate !== undefined && !validCalendarDate(record.issuedDate))
  )
    return false;

  if (
    !DOCUMENT_EXTENSIONS.includes(record.extension as DocumentExtension) ||
    record.file !== `${DOCUMENT_PREFIX}${id}.${record.extension}`
  )
    return false;

  const hasActivityType = record.activityType !== undefined;
  const hasActivityId = record.activityId !== undefined;
  if (hasActivityType !== hasActivityId) return false;
  if (hasActivityType) {
    if (
      schemaVersion < 4 ||
      record.activityType !== "medical" ||
      record.kind !== "medical"
    )
      return false;
    const activity = (activities.medical ?? {})[record.activityId as string];
    if (!activity || activity.animalId !== record.animalId) return false;
  }

  const entry = entries[id];

  return (
    !!entry &&
    entry.extension === record.extension &&
    entry.bytes.byteLength <= MAX_DOCUMENT_BYTES &&
    record.size === entry.bytes.byteLength &&
    sniffDocumentExtension(entry.bytes) === entry.extension
  );
}

function validate(parsed: ParsedBackup): void {
  const { data, manifest, photos, documents } = parsed;

  if (
    !isPlainObject(manifest) ||
    !exactKeys(manifest, [
      "format",
      "schemaVersion",
      "createdAt",
      "scopes",
      "inventory",
    ]) ||
    manifest.format !== FORMAT ||
    !SUPPORTED_VERSIONS.includes(manifest.schemaVersion as number) ||
    !validInstant(manifest.createdAt) ||
    !isPlainObject(manifest.scopes)
  )
    throw new Error("This is not a supported ReptiKeep backup.");

  const scopes = manifest.scopes as Scopes;

  if (!(
    ["all", "selected", "absent"].includes(scopes.husbandry) &&
    ["present", "absent"].includes(scopes.preferences)
  ))
    throw new Error("Backup scopes are invalid.");

  const keys = Object.keys(data);
  const schemaVersion = manifest.schemaVersion as number;
  const husbandryKeys = [
    "animals",
    ...activityNames.filter((name) => schemaVersion >= 4 || name !== "medical"),
    ...(schemaVersion >= 2 ? ["documents"] : []),
  ];
  const preferenceKeys = [
    "settings",
    "loggingDefaults",
    "reminders",
    "careSchedules",
  ];

  if (
    !keys.every(
      (key) => husbandryKeys.includes(key) || preferenceKeys.includes(key),
    ) ||
    (scopes.husbandry === "absent"
      ? husbandryKeys.some((key) => key in data)
      : husbandryKeys.some(
          (key) => !isPlainObject(data[key as keyof BackupData]),
        )) ||
    (scopes.preferences === "absent"
      ? preferenceKeys.some((key) => key in data)
      : preferenceKeys.some(
          (key) => !isPlainObject(data[key as keyof BackupData]),
        ))
  )
    throw new Error("Backup scopes do not match its data.");

  const animals = (data.animals ?? {}) as Record<string, Animal>;

  if (scopes.husbandry === "absent" && Object.keys(photos).length)
    throw new Error("Backup has an unexpected photo.");

  if (scopes.husbandry === "absent" && Object.keys(documents).length)
    throw new Error("Backup has an unexpected document.");

  for (const [id, photo] of Object.entries(photos))
    if (
      !animals[id] ||
      photo.byteLength > MAX_PHOTO_BYTES ||
      photo[0] !== 0x52 ||
      photo[1] !== 0x49 ||
      photo[2] !== 0x46 ||
      photo[3] !== 0x46 ||
      photo[8] !== 0x57 ||
      photo[9] !== 0x45 ||
      photo[10] !== 0x42 ||
      photo[11] !== 0x50
    )
      throw new Error("Backup has an invalid photo.");

  for (const [id, animal] of Object.entries(animals))
    if (!safeId(id) || !validAnimal(animal, id, photos))
      throw new Error("Backup has an invalid animal.");

  for (const name of activityNames)
    for (const [id, record] of Object.entries((data[name] ?? {}) as Table))
      if (!validActivity(name, record, id, animals))
        throw new Error("Backup has an invalid activity.");

  const documentRecords = (data.documents ?? {}) as Table;

  for (const [id, record] of Object.entries(documentRecords))
    if (!validDocument(record, id, animals, documents, schemaVersion, data))
      throw new Error("Backup has an invalid document.");

  for (const id of Object.keys(documents))
    if (!documentRecords[id])
      throw new Error("Backup has an unclaimed document file.");

  if (scopes.preferences === "present") {
    const settings = data.settings!;
    const defaults = data.loggingDefaults!;
    const reminders = data.reminders!;
    const schedules = data.careSchedules!;
    if (
      !exactKeys(settings, ["language", "reptileSort", "reptileView"]) ||
      !["system", "en", "pt-BR"].includes(settings.language as string) ||
      !isPlainObject(settings.reptileSort) ||
      !exactKeys(settings.reptileSort, ["field", "direction"]) ||
      !["name", "commonName", "scientificName", "lastActivity"].includes(
        settings.reptileSort.field as string,
      ) ||
      !["asc", "desc"].includes(settings.reptileSort.direction as string) ||
      !["single", "grid", "list"].includes(settings.reptileView as string) ||
      !exactKeys(defaults, [
        "mealMeasure",
        "frozen",
        "weightUnit",
        "poopType",
      ]) ||
      !["amount", "weight"].includes(defaults.mealMeasure as string) ||
      typeof defaults.frozen !== "boolean" ||
      !["g", "kg", "lb"].includes(defaults.weightUnit as string) ||
      !["poop", "urate", "both"].includes(defaults.poopType as string) ||
      !exactKeys(reminders, ["hour", "minute"]) ||
      !Number.isInteger(reminders.hour) ||
      !Number.isInteger(reminders.minute) ||
      (reminders.hour as number) < 0 ||
      (reminders.hour as number) > 23 ||
      (reminders.minute as number) < 0 ||
      (reminders.minute as number) > 59 ||
      !exactKeys(schedules, ["water", "cleaning"]) ||
      (schedules.water !== undefined && !validSchedule(schedules.water)) ||
      (schedules.cleaning !== undefined && !validSchedule(schedules.cleaning))
    )
      throw new Error("Backup has invalid preferences.");
  }
}

async function waitForHydration(): Promise<void> {
  const stores = [
    animals$,
    documents$,
    settings$,
    defaults$,
    reminders$,
    careSchedules$,
    ...Object.values(activityTables),
  ];

  await when(() =>
    stores.every((store) => syncState(store).isPersistLoaded.get()),
  );
}

function replaceActivityTable(name: ActivityTable, value: Table): void {
  switch (name) {
    case "feedings":
      activityTables.feedings.set(value as never);
      break;
    case "weights":
      activityTables.weights.set(value as never);
      break;
    case "sheds":
      activityTables.sheds.set(value as never);
      break;
    case "defecations":
      activityTables.defecations.set(value as never);
      break;
    case "habitats":
      activityTables.habitats.set(value as never);
      break;
    case "medical":
      activityTables.medical.set(value as never);
      break;
  }
}

function recordCount(data: BackupData): number {
  return activityNames.reduce(
    (count, name) => count + Object.keys(data[name] ?? {}).length,
    0,
  );
}

function documentCount(data: BackupData): number {
  return Object.keys(data.documents ?? {}).length;
}

export function backupName(now = new Date()): string {
  return `ReptiKeep-backup-${now.toISOString().slice(0, 10)}.zip`;
}

function remindersForBackup(
  reminders: Animal["reminders"],
): Animal["reminders"] {
  const value: NonNullable<Animal["reminders"]> = {};

  if (typeof reminders?.water === "boolean") value.water = reminders.water;

  if (typeof reminders?.cleaning === "boolean")
    value.cleaning = reminders.cleaning;

  return Object.keys(value).length ? value : undefined;
}

export function animalForBackup(animal: Animal): Animal {
  const defaults = animal.defaults
    ? {
        mealMeasure: ["amount", "weight"].includes(
          animal.defaults.mealMeasure as string,
        )
          ? animal.defaults.mealMeasure
          : undefined,
        frozen:
          typeof animal.defaults.frozen === "boolean"
            ? animal.defaults.frozen
            : undefined,
        weightUnit: ["g", "kg", "lb"].includes(
          animal.defaults.weightUnit as string,
        )
          ? animal.defaults.weightUnit
          : undefined,
        poopType: ["poop", "urate", "both"].includes(
          animal.defaults.poopType as string,
        )
          ? animal.defaults.poopType
          : undefined,
      }
    : undefined;

  return {
    id: animal.id,
    createdAt: animal.createdAt,
    photo: animal.photo ? `photos/${animal.id}.webp` : undefined,
    name: animal.name,
    commonName: animal.commonName,
    scientificName: animal.scientificName,
    sex: ["unknown", "male", "female"].includes(animal.sex)
      ? animal.sex
      : "unknown",
    birthDate: validCalendarDate(animal.birthDate)
      ? animal.birthDate
      : undefined,
    acquiredDate: validCalendarDate(animal.acquiredDate)
      ? animal.acquiredDate
      : undefined,
    defaults:
      defaults && Object.values(defaults).some((value) => value !== undefined)
        ? defaults
        : undefined,
    feedingSchedule: validSchedule(animal.feedingSchedule)
      ? animal.feedingSchedule
      : undefined,
    waterSchedule: validSchedule(animal.waterSchedule, true)
      ? animal.waterSchedule
      : undefined,
    cleaningSchedule: validSchedule(animal.cleaningSchedule, true)
      ? animal.cleaningSchedule
      : undefined,
    reminders: remindersForBackup(animal.reminders),
  };
}

function isBackupableDocument(document: unknown): document is AnimalDocument {
  if (!isPlainObject(document)) return false;
  const hasActivityType = document.activityType !== undefined;
  const hasActivityId = document.activityId !== undefined;
  if (hasActivityType !== hasActivityId) return false;
  if (hasActivityType) {
    if (document.activityType !== "medical") return false;
    const activity =
      activityStores.medical.$.peek()[document.activityId as string];
    if (!activity || activity.animalId !== document.animalId) return false;
  }

  return (
    isPlainObject(document) &&
    safeId(document.id) &&
    safeId(document.animalId) &&
    validInstant(document.createdAt) &&
    typeof document.title === "string" &&
    DOCUMENT_KINDS.includes(document.kind as DocumentKind) &&
    (document.issuedDate === undefined ||
      validCalendarDate(document.issuedDate)) &&
    typeof document.file === "string" &&
    DOCUMENT_EXTENSIONS.includes(document.extension as DocumentExtension) &&
    typeof document.size === "number" &&
    Number.isFinite(document.size) &&
    document.size >= 0
  );
}

function documentForBackup(
  document: AnimalDocument,
  bytes: Uint8Array,
): AnimalDocument {
  return clampTextFields({
    id: document.id,
    animalId: document.animalId,
    createdAt: document.createdAt,
    title: document.title,
    kind: DOCUMENT_KINDS.includes(document.kind) ? document.kind : "other",
    issuedDate: validCalendarDate(document.issuedDate)
      ? document.issuedDate
      : undefined,
    file: `${DOCUMENT_PREFIX}${document.id}.${document.extension}`,
    extension: document.extension,
    size: bytes.byteLength,
    ...(document.activityType && document.activityId
      ? {
          activityType: document.activityType,
          activityId: document.activityId,
        }
      : {}),
  });
}

export function preferencesForBackup() {
  const settings = settings$.peek();
  const sort = settings.reptileSort;
  const defaults = defaults$.peek();
  const reminders = reminders$.peek();
  const schedules = careSchedules$.peek();

  return {
    settings: {
      language: ["system", "en", "pt-BR"].includes(settings.language)
        ? settings.language
        : "system",
      reptileSort: {
        field: [
          "name",
          "commonName",
          "scientificName",
          "lastActivity",
        ].includes(sort?.field)
          ? sort.field
          : "name",
        direction: ["asc", "desc"].includes(sort?.direction)
          ? sort.direction
          : "asc",
      },
      reptileView: ["single", "grid", "list"].includes(settings.reptileView)
        ? settings.reptileView
        : "single",
    },
    loggingDefaults: {
      mealMeasure: ["amount", "weight"].includes(defaults.mealMeasure)
        ? defaults.mealMeasure
        : "weight",
      frozen: typeof defaults.frozen === "boolean" ? defaults.frozen : false,
      weightUnit: ["g", "kg", "lb"].includes(defaults.weightUnit)
        ? defaults.weightUnit
        : "g",
      poopType: ["poop", "urate", "both"].includes(defaults.poopType)
        ? defaults.poopType
        : "both",
    },
    reminders: {
      hour:
        Number.isInteger(reminders.hour) &&
        reminders.hour >= 0 &&
        reminders.hour <= 23
          ? reminders.hour
          : 9,
      minute:
        Number.isInteger(reminders.minute) &&
        reminders.minute >= 0 &&
        reminders.minute <= 59
          ? reminders.minute
          : 0,
    },
    careSchedules: {
      ...(validSchedule(schedules.water) ? { water: schedules.water } : {}),
      ...(validSchedule(schedules.cleaning)
        ? { cleaning: schedules.cleaning }
        : {}),
    },
  };
}

export async function createBackup(selection?: BackupSelection): Promise<File> {
  await waitForHydration();
  const all = !selection;
  const selected = new Set(selection?.animalIds ?? []);
  const sourceAnimals = animals$.peek();
  const ids = all
    ? Object.keys(sourceAnimals)
    : [...selected].filter((id) => !!sourceAnimals[id]);
  const scopes: Scopes = {
    husbandry: all || ids.length ? (all ? "all" : "selected") : "absent",
    preferences: all || selection?.includePreferences ? "present" : "absent",
  };

  if (scopes.husbandry === "absent" && scopes.preferences === "absent")
    throw new Error("Choose data to export.");

  const data: BackupData = {};
  const contents: Record<string, Uint8Array> = {};

  if (scopes.husbandry !== "absent") {
    data.animals = Object.fromEntries(
      ids.map((id) => [id, animalForBackup(sourceAnimals[id])]),
    );

    for (const name of activityNames)
      data[name] = Object.fromEntries(
        Object.entries(activityTables[name].peek()).filter(
          ([, record]) => all || selected.has(record.animalId),
        ),
      );

    data.documents = {};

    for (const document of Object.values(documents$.peek())) {
      if (!isBackupableDocument(document) || !data.animals[document.animalId])
        continue;

      const bytes = await readAnimalDocumentBytes(document.file);

      if (!bytes) throw new Error("An animal document file is missing.");

      if (bytes.byteLength > MAX_DOCUMENT_BYTES)
        throw new Error("An animal document is too large to back up.");

      const record = documentForBackup(document, bytes);
      contents[record.file] = bytes;

      data.documents[document.id] = record as unknown as Record<
        string,
        unknown
      >;
    }
  }

  if (scopes.preferences === "present")
    Object.assign(data, preferencesForBackup());

  for (const animal of Object.values(data.animals ?? {})) {
    if (!animal.photo) continue;

    const source = new File(getAnimalPhotoUri(sourceAnimals[animal.id].photo!));

    if (!source.exists || !source.name.toLowerCase().endsWith(".webp"))
      throw new Error("An animal photo is not a managed WebP file.");

    contents[animal.photo] = await source.bytes();
  }

  contents["data.json"] = encoder.encode(JSON.stringify(data));
  contents["manifest.json"] = encoder.encode(
    JSON.stringify({
      format: FORMAT,
      schemaVersion: VERSION,
      createdAt: new Date().toISOString(),
      scopes,
      inventory: {
        animals: Object.keys(data.animals ?? {}).length,
        records: recordCount(data),
        photos: Object.keys(contents).filter((path) =>
          path.startsWith("photos/"),
        ).length,
        documents: documentCount(data),
      },
    }),
  );
  const directory = cacheDirectory();
  directory.create({ intermediates: true });
  const archive = new File(directory, backupName());

  try {
    archive.write(
      zipSync(
        Object.fromEntries(
          Object.entries(contents).map(([path, bytes]) => [
            path,
            path.endsWith(".json") ? bytes : [bytes, { level: 0 }],
          ]),
        ) as Zippable,
        { level: 6 },
      ),
    );
    await parseBackup(archive);

    return archive;
  } catch (error) {
    if (directory.exists) directory.delete();
    throw error;
  }
}

export async function shareBackup(selection?: BackupSelection): Promise<void> {
  const archive = await createBackup(selection);

  try {
    if (!(await Sharing.isAvailableAsync()))
      throw new Error("Sharing is unavailable.");
    await Sharing.shareAsync(archive.uri, {
      mimeType: "application/zip",
      UTI: "com.pkware.zip-archive",
    });
  } finally {
    if (archive.parentDirectory.exists) archive.parentDirectory.delete();
  }
}

export async function parseBackup(file: File): Promise<ParsedBackup> {
  if (!file.exists || file.size > MAX_ARCHIVE_BYTES)
    throw new Error("Backup is unreadable or too large.");

  const bytes = await file.bytes();

  inspectZip(bytes);

  const entries = unzipSync(bytes);
  const manifest = parseJson(entries["manifest.json"]);
  const data = parseJson(entries["data.json"]) as BackupData;
  const documents: Record<string, DocumentEntry> = {};

  for (const [path, content] of Object.entries(entries)) {
    if (!path.startsWith(DOCUMENT_PREFIX)) continue;

    const name = path.slice(DOCUMENT_PREFIX.length);
    const dot = name.lastIndexOf(".");
    const id = name.slice(0, dot);

    if (documents[id]) throw new Error("Backup has a duplicate document.");

    documents[id] = { extension: name.slice(dot + 1), bytes: content };
  }

  const parsed = {
    manifest: manifest as ParsedBackup["manifest"],
    data,
    photos: Object.fromEntries(
      Object.entries(entries)
        .filter(([path]) => path.startsWith("photos/"))
        .map(([path, content]) => [path.slice(7, -5), content]),
    ),
    documents,
  };
  validate(parsed);
  return parsed;
}

// runtime rollback covers caught failures only; add a generation journal if photo commits must survive process termination.
export async function restoreBackup(file: File): Promise<RestoredBackup> {
  await waitForHydration();

  const parsed = await parseBackup(file);
  const { data, manifest, photos, documents } = parsed;
  const old = {
    animals: animals$.peek(),
    documents: documents$.peek(),
    settings: settings$.peek(),
    defaults: defaults$.peek(),
    reminders: reminders$.peek(),
    schedules: careSchedules$.peek(),
    activities: Object.fromEntries(
      activityNames.map((name) => [name, activityTables[name].peek()]),
    ),
  };
  const staging = cacheDirectory();

  staging.create({ intermediates: true });

  const oldPhotos: { uri: string; bytes: Uint8Array }[] = [];
  const oldDocuments: { document: AnimalDocument; bytes: Uint8Array }[] = [];
  const writtenDocumentUris: string[] = [];

  try {
    for (const animal of Object.values(old.animals))
      if (animal.photo) {
        const photo = new File(getAnimalPhotoUri(animal.photo));
        if (photo.exists)
          oldPhotos.push({ uri: animal.photo, bytes: await photo.bytes() });
      }

    for (const document of Object.values(old.documents)) {
      const bytes = await readAnimalDocumentBytes(document.file);
      if (bytes) oldDocuments.push({ document, bytes });
    }

    for (const [id, entry] of Object.entries(documents))
      writtenDocumentUris.push(
        writeAnimalDocument(
          id,
          entry.extension as DocumentExtension,
          entry.bytes,
        ),
      );

    for (const [id, bytes] of Object.entries(photos)) {
      const staged = new File(staging, `${id}.webp`);
      staged.write(bytes);
      const destination = new File(managedAnimalPhotoUri(id));
      destination.parentDirectory.create({
        idempotent: true,
        intermediates: true,
      });
      await staged.copy(destination, { overwrite: true });
    }

    batch(() => {
      if (manifest.scopes.husbandry !== "absent") {
        animals$.set(
          Object.fromEntries(
            Object.entries(data.animals ?? {}).map(([id, animal]) => [
              id,
              {
                ...animal,
                photo: animal.photo ? managedAnimalPhotoUri(id) : undefined,
              },
            ]),
          ),
        );

        for (const name of activityNames)
          replaceActivityTable(
            name,
            manifest.schemaVersion < 4 && name === "medical"
              ? {}
              : (data[name] ?? {}),
          );
        documents$.set(
          Object.fromEntries(
            Object.entries(
              (data.documents ?? {}) as unknown as Record<
                string,
                AnimalDocument
              >,
            ).map(([id, document]) => [
              id,
              {
                ...document,
                file: managedAnimalDocumentUri(id, document.extension),
              },
            ]),
          ),
        );
      }

      if (manifest.scopes.preferences === "present") {
        settings$.set(data.settings as never);
        defaults$.set(data.loggingDefaults as never);
        reminders$.set(data.reminders as never);
        careSchedules$.set(data.careSchedules as never);
      }
    });

    if (manifest.scopes.husbandry !== "absent") {
      for (const animal of Object.values(old.animals))
        if (animal.photo && !photos[animal.id])
          try {
            deleteManagedAnimalPhoto(animal.photo);
          } catch {}

      for (const document of Object.values(old.documents))
        if (
          !documents[document.id] ||
          getAnimalDocumentUri(document.file) !==
            managedAnimalDocumentUri(
              document.id,
              documents[document.id].extension as DocumentExtension,
            )
        )
          try {
            deleteManagedAnimalDocument(document.file);
          } catch {}
    }

    if (manifest.scopes.preferences === "present")
      setLanguage(data.settings!.language as "system" | "en" | "pt-BR");

    return {
      scopes: manifest.scopes,
      animals: Object.keys(data.animals ?? {}).length,
      records: recordCount(data),
      documents: documentCount(data),
    };
  } catch (error) {
    batch(() => {
      animals$.set(old.animals);
      documents$.set(old.documents);
      settings$.set(old.settings);
      defaults$.set(old.defaults);
      reminders$.set(old.reminders);
      careSchedules$.set(old.schedules);
      for (const name of activityNames)
        replaceActivityTable(name, old.activities[name] as Table);
    });

    for (const animal of Object.values(data.animals ?? {}))
      if (animal.photo && !old.animals[animal.id]?.photo)
        try {
          deleteManagedAnimalPhoto(managedAnimalPhotoUri(animal.id));
        } catch {}

    for (const uri of writtenDocumentUris) {
      try {
        deleteManagedAnimalDocument(uri);
      } catch {}
    }

    for (const photo of oldPhotos) {
      const destination = new File(getAnimalPhotoUri(photo.uri));
      destination.parentDirectory.create({
        idempotent: true,
        intermediates: true,
      });
      destination.write(photo.bytes);
    }

    for (const { document, bytes } of oldDocuments)
      writeAnimalDocument(document.id, document.extension, bytes);

    setLanguage(old.settings.language);
    throw error;
  } finally {
    if (staging.exists) staging.delete();
  }
}
