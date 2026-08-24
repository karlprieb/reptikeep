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
import { StyleSheet, View } from "react-native";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import {
  DefaultPicker,
  FormSectionFooter,
  FormSectionHeader,
  FormSheetChrome,
  useFormModifiers,
} from "@/components/form-sheet";
import { ScheduleFields } from "@/components/schedule-fields";
import { describeSchedule } from "@/utils/schedule";
import { ThemedText } from "@/components/themed-text";
import { FROZEN_TAGS, useReptileForm } from "@/components/use-reptile-form";
import { Spacing } from "@/constants/theme";
import { typeFont } from "@/constants/type-font";
import { useTheme } from "@/hooks/use-theme";
import type { Animal } from "@/state/animal";
import type { ReptileSpecies } from "@/constants/reptile-species";
import { FEEDING_MEASURES } from "@/state/logging-defaults";
import { DEFECATION_TYPES } from "@/state/defecation";
import { WEIGHT_UNITS } from "@/utils/weight-unit";

type ReptileFormSheetProps = {
  animal?: Animal;
};

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
  const { t } = useTranslation();
  const modifiers = useFormModifiers();
  const form = useReptileForm(animal);

  const {
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
  } = form;
  const nameText = useNativeState(name);
  const commonNameText = useNativeState(commonName);
  const scientificNameText = useNativeState(scientificName);
  useEffect(() => nameText.set(name), [name, nameText]);
  useEffect(() => commonNameText.set(commonName), [commonName, commonNameText]);
  useEffect(
    () => scientificNameText.set(scientificName),
    [scientificName, scientificNameText],
  );

  return (
    <>
      <FormSheetChrome
        namespace={animal ? "editReptile" : "newReptile"}
        animalName={animal?.name}
        saveDisabled={!canSave}
        cancelDisabled={isSaving}
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
                    minHeight: 140,
                    maxHeight: 140,
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
                    accessibilityLabel(
                      `${t("waterSchedule.section")}: ${t("reminders.enabled")}`,
                    ),
                    accessibilityHint(t("a11y.reminders.water.hint")),
                  ]}
                />
              ) : null}
            </Section>

            <Section
              header={
                <FormSectionHeader>
                  {t("cleaningSchedule.section")}
                </FormSectionHeader>
              }
              footer={
                <FormSectionFooter
                  color={cleaningValid ? undefined : theme.danger}
                >
                  {cleaningFooter}
                </FormSectionFooter>
              }
              modifiers={modifiers.row}
            >
              <ScheduleFields
                subject={t("cleaningSchedule.section")}
                hint={t("a11y.cleaningSchedule.frequency.hint")}
                daysHint={t("a11y.cleaningSchedule.customDays.hint")}
                inheritedLabel={t("defaults.followGlobal", {
                  value: describeSchedule(collectionCleaning, t),
                })}
                offLabel={t("schedule.off")}
                selection={cleaningSelection}
                onSelectionChange={setCleaningSelection}
                customDays={cleaningDays}
                onCustomDaysChange={setCleaningDays}
              />
              {cleaningScheduled ? (
                <Toggle
                  label={t("reminders.enabled")}
                  isOn={cleaningReminder}
                  onIsOnChange={handleCleaningReminder}
                  modifiers={[
                    accessibilityLabel(
                      `${t("cleaningSchedule.section")}: ${t("reminders.enabled")}`,
                    ),
                    accessibilityHint(t("a11y.reminders.cleaning.hint")),
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
                inherited={form.globalDefaults?.mealMeasure}
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
                inherited={form.frozenTag(globalDefaults.frozen)}
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
