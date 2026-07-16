import {
  Button,
  DatePicker,
  Form,
  Host,
  Image,
  Picker,
  Section,
  Text,
  TextField,
  Toggle,
  VStack,
  useNativeState,
} from "@expo/ui/swift-ui";
import {
  accessibilityHint,
  accessibilityLabel,
  aspectRatio,
  buttonStyle,
  clipped,
  datePickerStyle,
  font,
  foregroundStyle,
  frame,
  listRowBackground,
  listRowInsets,
  pickerStyle,
  resizable,
  tag,
  textInputAutocapitalization,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import { useValue } from "@legendapp/state/react";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";

import {
  DefaultPicker,
  FormSectionFooter,
  FormSectionHeader,
  FormSheetChrome,
  useFormModifiers,
} from "@/components/form-sheet";
import {
  careScheduleFromFields,
  describeSchedule,
  isScheduleValid,
  SCHEDULE_INHERIT,
  ScheduleFields,
  scheduleCustomDays,
  scheduleFromFields,
  scheduleSelection,
  type ScheduleSelection,
} from "@/components/schedule-fields";
import { ThemedText } from "@/components/themed-text";
import {
  searchReptileCommonName,
  searchScientificName,
  type ReptileSpecies,
} from "@/constants/reptile-species";
import { Spacing } from "@/constants/theme";
import { typeFont } from "@/constants/type-font";
import { useTheme } from "@/hooks/use-theme";
import type { SupportedLanguage } from "@/i18n/resolve-language";
import { addAnimal, createAnimal, type Animal } from "@/state/animal";
import {
  careSchedules$,
  type AnimalSchedule,
  type CareSchedule,
} from "@/state/care-schedule";
import { DEFECATION_TYPES } from "@/state/defecation";
import {
  defaults$,
  FEEDING_MEASURES,
  type AnimalLoggingDefaults,
} from "@/state/logging-defaults";
import { requestReminderPermission } from "@/state/notifications";
import { reminders$ } from "@/state/reminders";
import {
  formatClockTime,
  fromCalendarDate,
  toCalendarDate,
} from "@/utils/format-date";
import { WEIGHT_UNITS } from "@/utils/weight-unit";
import {
  deleteManagedAnimalPhoto,
  getAnimalPhotoUri,
  importAnimalPhoto,
  isManagedAnimalPhoto,
  type AnimalPhotoSource,
} from "@/utils/animal-photo-storage";

const SEX_VALUES: Animal["sex"][] = ["unknown", "male", "female"];

const FROZEN_TAGS = ["true", "false"] as const;
const frozenTag = (frozen: boolean) => (frozen ? "true" : "false");

const PHOTO_WELL_HEIGHT = 140;

const SPECIES_SUGGESTION_LIMIT = 5;

type ReptileFormSheetProps = {
  animal?: Animal;
};

type ReptileFields = {
  name: string;
  commonName?: string;
  scientificName?: string;
  sex: Animal["sex"];
  birthDate?: string;
  acquiredDate?: string;
  defaults?: AnimalLoggingDefaults;
  feedingSchedule?: CareSchedule;
  waterSchedule?: AnimalSchedule;
  reminders?: Animal["reminders"];
};

function toDate(stored?: string): Date {
  return (stored ? fromCalendarDate(stored) : null) ?? new Date();
}

function SpeciesSuggestionRows({
  suggestions,
  labelFor,
  onSelect,
  hint,
  color,
}: {
  suggestions: ReptileSpecies[];
  labelFor: (species: ReptileSpecies) => string;
  onSelect: (species: ReptileSpecies) => void;
  hint: string;
  color: string;
}) {
  return (
    <>
      {suggestions.map((species) => (
        <Button
          key={species.scientificName}
          label={labelFor(species)}
          systemImage="text.magnifyingglass"
          onPress={() => onSelect(species)}
          modifiers={[foregroundStyle(color), accessibilityHint(hint)]}
        />
      ))}
    </>
  );
}

export function ReptileFormSheet({ animal }: ReptileFormSheetProps) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const language = i18n.language as SupportedLanguage;
  const modifiers = useFormModifiers();

  const existingPhoto = animal?.photo
    ? getAnimalPhotoUri(animal.photo)
    : undefined;

  const nameText = useNativeState(animal?.name ?? "");
  const commonNameText = useNativeState(animal?.commonName ?? "");
  const scientificNameText = useNativeState(animal?.scientificName ?? "");
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
  const globalDefaults = useValue(defaults$);
  const collectionWater = useValue(careSchedules$.water);
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
  const canSave =
    name.trim().length > 0 && feedingValid && waterValid && !isSaving;

  const saveNew = async (fields: ReptileFields) => {
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

  const saveEdit = async (current: Animal, fields: ReptileFields) => {
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
      const fields: ReptileFields = {
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
        reminders: { water: waterReminder },
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
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    if (asset) {
      setPhoto({ uri: asset.uri });
      setSaveError(undefined);
    }
  };

  const handleRemovePhoto = () => {
    setPhoto(undefined);
    setSaveError(undefined);
  };

  const handleSelectSpecies = (species: ReptileSpecies) => {
    const commonName = species.commonNames[language];
    setCommonName(commonName);
    commonNameText.set(commonName);
    setScientificName(species.scientificName);
    scientificNameText.set(species.scientificName);
    setCommonSuggestionsDismissed(true);
    setScientificSuggestionsDismissed(true);
  };

  const handleWaterReminder = (on: boolean) => {
    setWaterReminder(on);
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

  const sexLabels: Record<Animal["sex"], string> = {
    unknown: t("sex.unknown"),
    male: t("sex.male"),
    female: t("sex.female"),
  };
  return (
    <>
      <FormSheetChrome
        namespace={animal ? "editReptile" : "newReptile"}
        animalName={animal?.name}
        saveDisabled={!canSave}
        onSave={handleConfirm}
      />

      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <Host
          style={styles.host}
          useViewportSizeMeasurement
          seedColor={theme.primary}
        >
          <Form modifiers={modifiers.form}>
            <Section>
              <Button
                onPress={handlePickPhoto}
                modifiers={[
                  buttonStyle("plain"),
                  listRowBackground(theme.surfaceSunken),
                  listRowInsets({
                    top: 0,
                    leading: 0,
                    bottom: 0,
                    trailing: 0,
                  }),
                  frame({
                    maxWidth: Infinity,
                    minHeight: PHOTO_WELL_HEIGHT,
                    maxHeight: PHOTO_WELL_HEIGHT,
                    alignment: "center",
                  }),
                  accessibilityLabel(
                    photoUri
                      ? t("reptileForm.changePhoto")
                      : t("reptileForm.addPhoto"),
                  ),
                ]}
              >
                {photoUri ? (
                  <Image
                    uiImage={photoUri}
                    modifiers={[
                      resizable(),
                      aspectRatio({ contentMode: "fill" }),
                      frame({ maxWidth: Infinity, maxHeight: Infinity }),
                      clipped(),
                    ]}
                  />
                ) : (
                  <VStack spacing={Spacing["2xs"]}>
                    <Image
                      systemName="camera.fill"
                      modifiers={[
                        font({ size: 28 }),
                        foregroundStyle(theme.textSecondary),
                      ]}
                    />
                    <Text
                      modifiers={[
                        typeFont("bodyS"),
                        foregroundStyle(theme.textSecondary),
                      ]}
                    >
                      {t("reptileForm.addPhoto")}
                    </Text>
                  </VStack>
                )}
              </Button>

              {photoUri ? (
                <Button
                  label={t("reptileForm.removePhoto")}
                  systemImage="trash"
                  role="destructive"
                  onPress={handleRemovePhoto}
                  modifiers={[
                    tint(theme.danger),
                    foregroundStyle(theme.danger),
                    listRowBackground(theme.surface),
                  ]}
                />
              ) : null}
            </Section>

            <Section
              header={
                <FormSectionHeader>
                  {t("reptileForm.details")}
                </FormSectionHeader>
              }
              modifiers={modifiers.row}
            >
              <TextField
                text={nameText}
                placeholder={t("reptileForm.name")}
                onTextChange={setName}
                modifiers={[
                  accessibilityLabel(t("reptileForm.name")),
                  textInputAutocapitalization("words"),
                ]}
              />
              <TextField
                text={commonNameText}
                placeholder={t("reptileForm.commonName")}
                onTextChange={(value) => {
                  setCommonName(value);
                  setCommonSuggestionsDismissed(false);
                }}
                modifiers={[
                  accessibilityLabel(t("reptileForm.commonName")),
                  textInputAutocapitalization("words"),
                ]}
              />
              <SpeciesSuggestionRows
                suggestions={commonSuggestions}
                labelFor={(species) =>
                  `${species.commonNames[language]} · ${species.scientificName}`
                }
                onSelect={handleSelectSpecies}
                hint={t("a11y.reptileForm.speciesSuggestion.hint")}
                color={theme.textSecondary}
              />
              <TextField
                text={scientificNameText}
                placeholder={t("reptileForm.scientificName")}
                onTextChange={(value) => {
                  setScientificName(value);
                  setScientificSuggestionsDismissed(false);
                }}
                modifiers={[
                  accessibilityLabel(t("reptileForm.scientificName")),
                  textInputAutocapitalization("words"),
                ]}
              />
              <SpeciesSuggestionRows
                suggestions={scientificSuggestions}
                labelFor={(species) =>
                  `${species.scientificName} · ${species.commonNames[language]}`
                }
                onSelect={handleSelectSpecies}
                hint={t("a11y.reptileForm.speciesSuggestion.hint")}
                color={theme.textSecondary}
              />
            </Section>
            <Section modifiers={modifiers.row}>
              <Picker
                label={t("reptileForm.sex")}
                selection={sex}
                onSelectionChange={(value) => setSex(value as Animal["sex"])}
                modifiers={[pickerStyle("menu")]}
              >
                {SEX_VALUES.map((value) => (
                  <Text key={value} modifiers={[tag(value)]}>
                    {sexLabels[value]}
                  </Text>
                ))}
              </Picker>
              <Toggle
                label={t("reptileForm.knownBirthDate")}
                isOn={knownBirthDate}
                onIsOnChange={setKnownBirthDate}
              />
              {knownBirthDate ? (
                <DatePicker
                  title={t("reptileForm.birthDate")}
                  selection={birthDate}
                  displayedComponents={["date"]}
                  onDateChange={setBirthDate}
                  modifiers={[datePickerStyle("compact")]}
                />
              ) : null}
              <DatePicker
                title={t("reptileForm.acquired")}
                selection={acquiredDate}
                displayedComponents={["date"]}
                onDateChange={(value) => {
                  setAcquiredDate(value);
                  setKnowsAcquired(true);
                }}
                modifiers={[datePickerStyle("compact")]}
              />
            </Section>

            <Section
              header={
                <FormSectionHeader>
                  {t("feedingSchedule.section")}
                </FormSectionHeader>
              }
              footer={
                <FormSectionFooter
                  color={feedingValid ? undefined : theme.danger}
                >
                  {feedingValid
                    ? t("feedingSchedule.footer")
                    : t("schedule.invalidDays")}
                </FormSectionFooter>
              }
              modifiers={modifiers.row}
            >
              <Toggle
                label={t("feedingSchedule.enabled")}
                isOn={usesFeedingSchedule}
                onIsOnChange={setUsesFeedingSchedule}
                modifiers={[
                  accessibilityHint(t("a11y.feedingSchedule.enabled.hint")),
                ]}
              />
              {usesFeedingSchedule ? (
                <ScheduleFields
                  subject={t("feedingSchedule.section")}
                  hint={t("a11y.feedingSchedule.frequency.hint")}
                  daysHint={t("a11y.feedingSchedule.customDays.hint")}
                  selection={feedingSelection}
                  onSelectionChange={setFeedingSelection}
                  customDays={feedingDays}
                  onCustomDaysChange={setFeedingDays}
                />
              ) : null}
            </Section>

            <Section
              header={
                <FormSectionHeader>
                  {t("waterSchedule.section")}
                </FormSectionHeader>
              }
              footer={
                <FormSectionFooter
                  color={waterValid ? undefined : theme.danger}
                >
                  {waterFooter}
                </FormSectionFooter>
              }
              modifiers={modifiers.row}
            >
              <ScheduleFields
                subject={t("waterSchedule.section")}
                hint={t("a11y.waterSchedule.frequency.hint")}
                daysHint={t("a11y.waterSchedule.customDays.hint")}
                inheritedLabel={t("defaults.followGlobal", {
                  value: describeSchedule(collectionWater, t),
                })}
                offLabel={t("schedule.off")}
                selection={waterSelection}
                onSelectionChange={setWaterSelection}
                customDays={waterDays}
                onCustomDaysChange={setWaterDays}
              />
              {waterScheduled ? (
                <Toggle
                  label={t("reminders.enabled")}
                  isOn={waterReminder}
                  onIsOnChange={handleWaterReminder}
                  modifiers={[
                    accessibilityHint(t("a11y.reminders.water.hint")),
                  ]}
                />
              ) : null}
            </Section>

            <Section
              header={
                <FormSectionHeader>{t("defaults.section")}</FormSectionHeader>
              }
              footer={
                <FormSectionFooter>
                  {animal
                    ? t("defaults.animalFooter", { animalName: animal.name })
                    : t("defaults.animalFooterNew")}
                </FormSectionFooter>
              }
              modifiers={modifiers.row}
            >
              <DefaultPicker
                label={t("defaults.mealMeasure")}
                hint={t("a11y.defaults.mealMeasure.hint")}
                options={FEEDING_MEASURES}
                describe={(value) => t(`feedingForm.measure.${value}`)}
                inherited={globalDefaults.mealMeasure}
                value={defaults.mealMeasure}
                onChange={(mealMeasure) =>
                  setDefaults((current) => ({ ...current, mealMeasure }))
                }
              />
              <DefaultPicker
                label={t("defaults.frozen")}
                hint={t("a11y.defaults.frozen.hint")}
                options={FROZEN_TAGS}
                describe={(value) =>
                  t(
                    value === "true"
                      ? "defaults.frozenYes"
                      : "defaults.frozenNo",
                  )
                }
                inherited={frozenTag(globalDefaults.frozen)}
                value={
                  defaults.frozen === undefined
                    ? undefined
                    : frozenTag(defaults.frozen)
                }
                onChange={(value) =>
                  setDefaults((current) => ({
                    ...current,
                    frozen: value && value === "true",
                  }))
                }
              />
              <DefaultPicker
                label={t("defaults.weightUnit")}
                hint={t("a11y.defaults.weightUnit.hint")}
                options={WEIGHT_UNITS}
                describe={(value) => t(`feedingForm.units.${value}`)}
                inherited={globalDefaults.weightUnit}
                value={defaults.weightUnit}
                onChange={(weightUnit) =>
                  setDefaults((current) => ({ ...current, weightUnit }))
                }
              />
              <DefaultPicker
                label={t("defaults.poopType")}
                hint={t("a11y.defaults.poopType.hint")}
                options={DEFECATION_TYPES}
                describe={(value) => t(`timeline.poop.${value}`)}
                inherited={globalDefaults.poopType}
                value={defaults.poopType}
                onChange={(poopType) =>
                  setDefaults((current) => ({ ...current, poopType }))
                }
              />
            </Section>
          </Form>
        </Host>

        {saveError ? (
          <View style={[styles.saveError, { borderTopColor: theme.border }]}>
            <ThemedText
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              selectable
              type="bodyS"
              themeColor="danger"
            >
              {saveError}
            </ThemedText>
          </View>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  host: {
    flex: 1,
  },
  saveError: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing["2xs"],
  },
});
