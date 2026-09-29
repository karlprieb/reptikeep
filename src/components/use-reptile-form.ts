import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useValue } from "@legendapp/state/react";
import type { SupportedLanguage } from "@/i18n/resolve-language";
import {
  careScheduleFromFields,
  isScheduleValid,
  SCHEDULE_INHERIT,
  type ScheduleSelection,
  scheduleCustomDays,
  scheduleFromFields,
  scheduleSelection,
} from "@/utils/schedule";
import {
  careSchedules$,
  type AnimalSchedule,
  type CareSchedule,
} from "@/state/care-schedule";
import {
  type ReptileSpecies,
  searchReptileCommonName,
  searchScientificName,
} from "@/constants/reptile-species";
import {
  defaults$,
  type AnimalLoggingDefaults,
} from "@/state/logging-defaults";
import {
  deleteManagedAnimalPhoto,
  getAnimalPhotoUri,
  importAnimalPhoto,
  isManagedAnimalPhoto,
  type AnimalPhotoSource,
} from "@/utils/animal-photo-storage";
import {
  formatClockTime,
  fromCalendarDate,
  toCalendarDate,
} from "@/utils/format-date";
import { addAnimal, createAnimal, type Animal } from "@/state/animal";
import { reminders$ } from "@/state/reminders";
import { requestReminderPermission } from "@/state/notifications";

export const SEX_VALUES: Animal["sex"][] = ["unknown", "male", "female"];

export const FROZEN_TAGS = ["true", "false"] as const;
const frozenTag = (frozen: boolean) => (frozen ? "true" : "false");

export const SPECIES_SUGGESTION_LIMIT = 5;

export type ReptileFormFields = {
  name: string;
  commonName?: string;
  scientificName?: string;
  sex: Animal["sex"];
  birthDate?: string;
  acquiredDate?: string;
  defaults?: AnimalLoggingDefaults;
  feedingSchedule?: CareSchedule;
  waterSchedule?: AnimalSchedule;
  cleaningSchedule?: AnimalSchedule;
  reminders?: Animal["reminders"];
};

function toDate(stored?: string): Date {
  return (stored ? fromCalendarDate(stored) : null) ?? new Date();
}

function addAnimalOrDiscardPhoto(record: Animal, managedPhoto?: string) {
  try {
    addAnimal(record);
  } catch (error) {
    deleteManagedAnimalPhoto(managedPhoto);
    throw error;
  }
}

type Translate = ReturnType<typeof useTranslation>["t"];
type ClockTime = { hour: number; minute: number };

function useSpeciesFields(
  animal: Animal | undefined,
  language: SupportedLanguage,
) {
  const [commonName, setCommonName] = useState(animal?.commonName ?? "");
  const [scientificName, setScientificName] = useState(
    animal?.scientificName ?? "",
  );
  const [commonSuggestionsDismissed, setCommonSuggestionsDismissed] =
    useState(true);
  const [scientificSuggestionsDismissed, setScientificSuggestionsDismissed] =
    useState(true);
  const commonSuggestions = commonSuggestionsDismissed
    ? []
    : searchReptileCommonName(commonName, language).slice(
        0,
        SPECIES_SUGGESTION_LIMIT,
      );
  const scientificSuggestions = scientificSuggestionsDismissed
    ? []
    : searchScientificName(scientificName).slice(0, SPECIES_SUGGESTION_LIMIT);

  const handleSelectSpecies = (species: ReptileSpecies) => {
    setCommonName(species.commonNames[language]);
    setScientificName(species.scientificName);
    setCommonSuggestionsDismissed(true);
    setScientificSuggestionsDismissed(true);
  };

  return {
    commonName,
    setCommonName,
    scientificName,
    setScientificName,
    commonSuggestions,
    scientificSuggestions,
    setCommonSuggestionsDismissed,
    setScientificSuggestionsDismissed,
    handleSelectSpecies,
  };
}

function usePhotoField(
  existingPhoto: string | undefined,
  setSaveError: (message: string | undefined) => void,
  t: Translate,
) {
  const [photo, setPhoto] = useState<AnimalPhotoSource | undefined>(
    existingPhoto ? { uri: existingPhoto } : undefined,
  );

  const handlePickPhoto = async () => {
    setSaveError(undefined);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      if (asset) {
        setPhoto({ uri: asset.uri });
        setSaveError(undefined);
      }
    } catch {
      setSaveError(t("reptileForm.photoPickError"));
    }
  };

  const handleRemovePhoto = () => {
    setPhoto(undefined);
    setSaveError(undefined);
  };

  return { photo, handlePickPhoto, handleRemovePhoto };
}

function useRoutineFields(
  schedule: AnimalSchedule | CareSchedule | undefined,
  defaultSelection: ScheduleSelection,
  initialReminder: boolean,
) {
  const [selection, setSelection] = useState<ScheduleSelection>(() =>
    scheduleSelection(schedule, defaultSelection),
  );
  const [days, setDays] = useState(() => scheduleCustomDays(schedule));
  const [reminder, setReminder] = useState(initialReminder);

  const handleReminder = (on: boolean) => {
    setReminder(on);
    if (on) void requestReminderPermission();
  };

  return {
    selection,
    setSelection,
    days,
    setDays,
    reminder,
    handleReminder,
    valid: isScheduleValid(selection, days),
  };
}

function isRoutineScheduled(
  selection: ScheduleSelection,
  collectionSchedule: unknown,
) {
  return selection === SCHEDULE_INHERIT
    ? Boolean(collectionSchedule)
    : selection !== "off";
}

function joinFooter(parts: (string | null)[]) {
  return parts.filter((part): part is string => Boolean(part)).join(" ");
}

function reminderTimeFooter(t: Translate, time: ClockTime) {
  return t("reminders.timeFooter", {
    time: formatClockTime(time.hour, time.minute),
  });
}

type RoutineFooterInput = {
  scheduleKey: "waterSchedule" | "cleaningSchedule";
  animal: Animal | undefined;
  valid: boolean;
  scheduled: boolean;
  reminder: boolean;
  time: ClockTime;
  t: Translate;
};

function routineFooter({
  scheduleKey,
  animal,
  valid,
  scheduled,
  reminder,
  time,
  t,
}: RoutineFooterInput) {
  if (!valid) return t("schedule.invalidDays");

  return joinFooter([
    animal
      ? t(`${scheduleKey}.animalFooter`, { animalName: animal.name })
      : t(`${scheduleKey}.animalFooterNew`),
    scheduled && reminder ? reminderTimeFooter(t, time) : null,
  ]);
}

async function saveNew(fields: ReptileFormFields, photo?: AnimalPhotoSource) {
  const created = createAnimal(fields);
  const managedPhoto = photo
    ? await importAnimalPhoto(photo, created.id)
    : undefined;

  addAnimalOrDiscardPhoto(
    managedPhoto ? { ...created, photo: managedPhoto } : created,
    managedPhoto,
  );
}

async function saveEdit(
  current: Animal,
  fields: ReptileFormFields,
  photo: AnimalPhotoSource | undefined,
  existingPhoto: string | undefined,
) {
  let nextPhoto: string | undefined;
  if (photo) {
    nextPhoto = isManagedAnimalPhoto(photo.uri)
      ? existingPhoto
      : await importAnimalPhoto(photo, current.id);
  }

  addAnimal({ ...current, ...fields, photo: nextPhoto });

  if (existingPhoto && existingPhoto !== nextPhoto) {
    deleteManagedAnimalPhoto(existingPhoto);
  }
}

export function useReptileForm(animal?: Animal) {
  const { t, i18n } = useTranslation();
  const language = i18n.language as SupportedLanguage;

  const existingPhoto = animal?.photo
    ? getAnimalPhotoUri(animal.photo)
    : undefined;

  const [name, setName] = useState(animal?.name ?? "");
  const species = useSpeciesFields(animal, language);
  const [sex, setSex] = useState<Animal["sex"]>(animal?.sex ?? "unknown");
  const [knownBirthDate, setKnownBirthDate] = useState(
    Boolean(animal?.birthDate),
  );
  const [birthDate, setBirthDate] = useState(() => toDate(animal?.birthDate));
  const [acquiredDate, setAcquiredDate] = useState(() =>
    toDate(animal?.acquiredDate),
  );
  const [knowsAcquired, setKnowsAcquired] = useState(
    !animal || Boolean(animal.acquiredDate),
  );
  const [defaults, setDefaults] = useState<AnimalLoggingDefaults>(
    animal?.defaults ?? {},
  );
  const [usesFeedingSchedule, setUsesFeedingSchedule] = useState(
    Boolean(animal?.feedingSchedule),
  );
  const feeding = useRoutineFields(
    animal?.feedingSchedule,
    "weekly",
    animal ? animal.reminders?.feed === true : true,
  );
  const water = useRoutineFields(
    animal?.waterSchedule,
    SCHEDULE_INHERIT,
    animal?.reminders?.water !== false,
  );
  const cleaning = useRoutineFields(
    animal?.cleaningSchedule,
    SCHEDULE_INHERIT,
    animal?.reminders?.cleaning !== false,
  );
  const globalDefaults = useValue(defaults$);
  const collectionWater = useValue(careSchedules$.water);
  const collectionCleaning = useValue(careSchedules$.cleaning);
  const reminderTime = useValue(reminders$);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const savingRef = useRef(false);
  const { photo, handlePickPhoto, handleRemovePhoto } = usePhotoField(
    existingPhoto,
    setSaveError,
    t,
  );

  const feedingValid = !usesFeedingSchedule || feeding.valid;
  const waterScheduled = isRoutineScheduled(water.selection, collectionWater);
  const cleaningScheduled = isRoutineScheduled(
    cleaning.selection,
    collectionCleaning,
  );
  const canSave =
    name.trim().length > 0 &&
    feedingValid &&
    water.valid &&
    cleaning.valid &&
    !isSaving;

  const buildFields = (): ReptileFormFields => ({
    name: name.trim(),
    commonName: species.commonName.trim() || undefined,
    scientificName: species.scientificName.trim() || undefined,
    sex,
    acquiredDate: knowsAcquired ? toCalendarDate(acquiredDate) : undefined,
    birthDate: knownBirthDate ? toCalendarDate(birthDate) : undefined,
    defaults,
    feedingSchedule: usesFeedingSchedule
      ? careScheduleFromFields(feeding.selection, feeding.days)
      : undefined,
    waterSchedule: scheduleFromFields(water.selection, water.days),
    cleaningSchedule: scheduleFromFields(cleaning.selection, cleaning.days),
    reminders: {
      feed: feeding.reminder,
      water: water.reminder,
      cleaning: cleaning.reminder,
    },
  });

  const handleConfirm = async () => {
    if (!canSave || savingRef.current) return;

    const fields = buildFields();
    savingRef.current = true;
    setIsSaving(true);
    setSaveError(undefined);

    const saved = animal
      ? saveEdit(animal, fields, photo, existingPhoto)
      : saveNew(fields, photo);
    try {
      await saved;
      router.back();
    } catch {
      setSaveError(t("reptileForm.photoSaveError"));
    }
    savingRef.current = false;
    setIsSaving(false);
  };

  const feedingFooter = joinFooter([
    t("feedingSchedule.footer"),
    usesFeedingSchedule && feeding.reminder
      ? reminderTimeFooter(t, reminderTime)
      : null,
  ]);

  const waterFooter = routineFooter({
    scheduleKey: "waterSchedule",
    animal,
    valid: water.valid,
    scheduled: waterScheduled,
    reminder: water.reminder,
    time: reminderTime,
    t,
  });

  const cleaningFooter = routineFooter({
    scheduleKey: "cleaningSchedule",
    animal,
    valid: cleaning.valid,
    scheduled: cleaningScheduled,
    reminder: cleaning.reminder,
    time: reminderTime,
    t,
  });

  const sexLabels: Record<Animal["sex"], string> = {
    unknown: t("sex.unknown"),
    male: t("sex.male"),
    female: t("sex.female"),
  };

  return {
    animal,
    language,
    SEX_VALUES,
    globalDefaults,
    collectionWater,
    collectionCleaning,
    frozenTag,
    sexLabels,
    name,
    setName,
    commonName: species.commonName,
    setCommonName: species.setCommonName,
    scientificName: species.scientificName,
    setScientificName: species.setScientificName,
    commonSuggestions: species.commonSuggestions,
    scientificSuggestions: species.scientificSuggestions,
    setCommonSuggestionsDismissed: species.setCommonSuggestionsDismissed,
    setScientificSuggestionsDismissed:
      species.setScientificSuggestionsDismissed,
    sex,
    setSex,
    knownBirthDate,
    setKnownBirthDate,
    birthDate,
    setBirthDate,
    acquiredDate,
    setAcquiredDate,
    knowsAcquired,
    setKnowsAcquired,
    photoUri: photo?.uri,
    defaults,
    setDefaults,
    usesFeedingSchedule,
    setUsesFeedingSchedule,
    feedingSelection: feeding.selection,
    setFeedingSelection: feeding.setSelection,
    feedingDays: feeding.days,
    setFeedingDays: feeding.setDays,
    feedingValid,
    feedingReminder: feeding.reminder,
    feedingFooter,
    waterSelection: water.selection,
    setWaterSelection: water.setSelection,
    waterDays: water.days,
    setWaterDays: water.setDays,
    waterValid: water.valid,
    waterScheduled,
    cleaningSelection: cleaning.selection,
    setCleaningSelection: cleaning.setSelection,
    cleaningDays: cleaning.days,
    setCleaningDays: cleaning.setDays,
    cleaningValid: cleaning.valid,
    cleaningScheduled,
    waterReminder: water.reminder,
    cleaningReminder: cleaning.reminder,
    canSave,
    isSaving,
    saveError,
    waterFooter,
    cleaningFooter,
    handleConfirm,
    handlePickPhoto,
    handleRemovePhoto,
    handleSelectSpecies: species.handleSelectSpecies,
    handleFeedingReminder: feeding.handleReminder,
    handleWaterReminder: water.handleReminder,
    handleCleaningReminder: cleaning.handleReminder,
  };
}

export type ReptileFormController = ReturnType<typeof useReptileForm>;
