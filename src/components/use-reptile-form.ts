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

export function useReptileForm(animal?: Animal) {
  const { t, i18n } = useTranslation();
  const language = i18n.language as SupportedLanguage;

  const existingPhoto = animal?.photo
    ? getAnimalPhotoUri(animal.photo)
    : undefined;

  const [name, setName] = useState(animal?.name ?? "");
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
  const [photo, setPhoto] = useState<AnimalPhotoSource | undefined>(
    existingPhoto ? { uri: existingPhoto } : undefined,
  );
  const [defaults, setDefaults] = useState<AnimalLoggingDefaults>(
    animal?.defaults ?? {},
  );
  const [usesFeedingSchedule, setUsesFeedingSchedule] = useState(
    Boolean(animal?.feedingSchedule),
  );
  const [feedingSelection, setFeedingSelection] = useState<ScheduleSelection>(
    scheduleSelection(animal?.feedingSchedule, "weekly"),
  );
  const [feedingDays, setFeedingDays] = useState(
    scheduleCustomDays(animal?.feedingSchedule),
  );
  const [waterSelection, setWaterSelection] = useState<ScheduleSelection>(
    scheduleSelection(animal?.waterSchedule, SCHEDULE_INHERIT),
  );
  const [waterDays, setWaterDays] = useState(
    scheduleCustomDays(animal?.waterSchedule),
  );
  const [waterReminder, setWaterReminder] = useState(
    animal?.reminders?.water !== false,
  );
  const [cleaningSelection, setCleaningSelection] = useState<ScheduleSelection>(
    scheduleSelection(animal?.cleaningSchedule, SCHEDULE_INHERIT),
  );
  const [cleaningDays, setCleaningDays] = useState(
    scheduleCustomDays(animal?.cleaningSchedule),
  );
  const [cleaningReminder, setCleaningReminder] = useState(
    animal?.reminders?.cleaning !== false,
  );
  const globalDefaults = useValue(defaults$);
  const collectionWater = useValue(careSchedules$.water);
  const collectionCleaning = useValue(careSchedules$.cleaning);
  const reminderTime = useValue(reminders$);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const savingRef = useRef(false);

  const photoUri = photo?.uri;
  const feedingValid =
    !usesFeedingSchedule || isScheduleValid(feedingSelection, feedingDays);
  const waterValid = isScheduleValid(waterSelection, waterDays);
  const waterScheduled =
    waterSelection === SCHEDULE_INHERIT
      ? Boolean(collectionWater)
      : waterSelection !== "off";
  const cleaningValid = isScheduleValid(cleaningSelection, cleaningDays);
  const cleaningScheduled =
    cleaningSelection === SCHEDULE_INHERIT
      ? Boolean(collectionCleaning)
      : cleaningSelection !== "off";
  const canSave =
    name.trim().length > 0 &&
    feedingValid &&
    waterValid &&
    cleaningValid &&
    !isSaving;

  const saveNew = async (fields: ReptileFormFields) => {
    const created = createAnimal(fields);
    const managedPhoto = photo
      ? await importAnimalPhoto(photo, created.id)
      : undefined;

    try {
      addAnimal(managedPhoto ? { ...created, photo: managedPhoto } : created);
    } catch (error) {
      deleteManagedAnimalPhoto(managedPhoto);
      throw error;
    }
  };

  const saveEdit = async (current: Animal, fields: ReptileFormFields) => {
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
  };

  const handleConfirm = async () => {
    if (!canSave || savingRef.current) return;

    savingRef.current = true;
    setIsSaving(true);
    setSaveError(undefined);

    try {
      const fields: ReptileFormFields = {
        name: name.trim(),
        commonName: commonName.trim() || undefined,
        scientificName: scientificName.trim() || undefined,
        sex,
        acquiredDate: knowsAcquired ? toCalendarDate(acquiredDate) : undefined,
        birthDate: knownBirthDate ? toCalendarDate(birthDate) : undefined,
        defaults,
        feedingSchedule: usesFeedingSchedule
          ? careScheduleFromFields(feedingSelection, feedingDays)
          : undefined,
        waterSchedule: scheduleFromFields(waterSelection, waterDays),
        cleaningSchedule: scheduleFromFields(cleaningSelection, cleaningDays),
        reminders: { water: waterReminder, cleaning: cleaningReminder },
      };
      if (animal) await saveEdit(animal, fields);
      else await saveNew(fields);

      router.back();
    } catch {
      setSaveError(t("reptileForm.photoSaveError"));
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const handlePickPhoto = async () => {
    setSaveError(undefined);

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setSaveError(t("reptileForm.photoPermissionError"));
        return;
      }

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

  const handleSelectSpecies = (species: ReptileSpecies) => {
    const commonName = species.commonNames[language];
    setCommonName(commonName);
    setScientificName(species.scientificName);
    setCommonSuggestionsDismissed(true);
    setScientificSuggestionsDismissed(true);
  };

  const handleWaterReminder = (on: boolean) => {
    setWaterReminder(on);
    if (on) void requestReminderPermission();
  };

  const handleCleaningReminder = (on: boolean) => {
    setCleaningReminder(on);
    if (on) void requestReminderPermission();
  };

  const waterFooter = !waterValid
    ? t("schedule.invalidDays")
    : [
        animal
          ? t("waterSchedule.animalFooter", { animalName: animal.name })
          : t("waterSchedule.animalFooterNew"),
        waterScheduled && waterReminder
          ? t("reminders.timeFooter", {
              time: formatClockTime(reminderTime.hour, reminderTime.minute),
            })
          : null,
      ]
        .filter((part): part is string => Boolean(part))
        .join(" ");

  const cleaningFooter = !cleaningValid
    ? t("schedule.invalidDays")
    : [
        animal
          ? t("cleaningSchedule.animalFooter", { animalName: animal.name })
          : t("cleaningSchedule.animalFooterNew"),
        cleaningScheduled && cleaningReminder
          ? t("reminders.timeFooter", {
              time: formatClockTime(reminderTime.hour, reminderTime.minute),
            })
          : null,
      ]
        .filter((part): part is string => Boolean(part))
        .join(" ");

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
    commonName,
    setCommonName,
    scientificName,
    setScientificName,
    commonSuggestions,
    scientificSuggestions,
    setCommonSuggestionsDismissed,
    setScientificSuggestionsDismissed,
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
    photoUri,
    defaults,
    setDefaults,
    usesFeedingSchedule,
    setUsesFeedingSchedule,
    feedingSelection,
    setFeedingSelection,
    feedingDays,
    setFeedingDays,
    feedingValid,
    waterSelection,
    setWaterSelection,
    waterDays,
    setWaterDays,
    waterValid,
    waterScheduled,
    cleaningSelection,
    setCleaningSelection,
    cleaningDays,
    setCleaningDays,
    cleaningValid,
    cleaningScheduled,
    waterReminder,
    cleaningReminder,
    canSave,
    isSaving,
    saveError,
    waterFooter,
    cleaningFooter,
    handleConfirm,
    handlePickPhoto,
    handleRemovePhoto,
    handleSelectSpecies,
    handleWaterReminder,
    handleCleaningReminder,
  };
}

export type ReptileFormController = ReturnType<typeof useReptileForm>;
