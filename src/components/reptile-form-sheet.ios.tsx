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
import {
  FROZEN_TAGS,
  useReptileForm,
  type ReptileFormController,
} from "@/components/use-reptile-form";
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

type RowModifiers = ReturnType<typeof useFormModifiers>["row"];

type FormSectionProps = {
  form: ReptileFormController;
  rowModifiers: RowModifiers;
};

function PhotoSection({ form }: { form: ReptileFormController }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { photoUri, handlePickPhoto, handleRemovePhoto } = form;

  return (
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
            photoUri ? t("reptileForm.changePhoto") : t("reptileForm.addPhoto"),
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
  );
}

type NameFieldStates = {
  nameText: ReturnType<typeof useNativeState<string>>;
  commonNameText: ReturnType<typeof useNativeState<string>>;
  scientificNameText: ReturnType<typeof useNativeState<string>>;
};

function DetailsSection({
  form,
  rowModifiers,
  nameText,
  commonNameText,
  scientificNameText,
}: FormSectionProps & NameFieldStates) {
  const theme = useTheme();
  const { t } = useTranslation();
  const {
    language,
    setName,
    setCommonName,
    setScientificName,
    commonSuggestions,
    scientificSuggestions,
    setCommonSuggestionsDismissed,
    setScientificSuggestionsDismissed,
    handleSelectSpecies,
  } = form;
  return (
    <Section
      header={<FormSectionHeader>{t("reptileForm.details")}</FormSectionHeader>}
      modifiers={rowModifiers}
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
  );
}

function ProfileSection({ form, rowModifiers }: FormSectionProps) {
  const { t } = useTranslation();
  const {
    SEX_VALUES,
    sexLabels,
    sex,
    setSex,
    knownBirthDate,
    setKnownBirthDate,
    birthDate,
    setBirthDate,
    acquiredDate,
    setAcquiredDate,
    setKnowsAcquired,
  } = form;

  return (
    <Section modifiers={rowModifiers}>
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
  );
}

function FeedingSection({ form, rowModifiers }: FormSectionProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const {
    feedingValid,
    feedingFooter,
    usesFeedingSchedule,
    setUsesFeedingSchedule,
    feedingSelection,
    setFeedingSelection,
    feedingDays,
    setFeedingDays,
    feedingReminder,
    handleFeedingReminder,
  } = form;

  return (
    <Section
      header={
        <FormSectionHeader>{t("feedingSchedule.section")}</FormSectionHeader>
      }
      footer={
        <FormSectionFooter color={feedingValid ? undefined : theme.danger}>
          {feedingValid ? feedingFooter : t("schedule.invalidDays")}
        </FormSectionFooter>
      }
      modifiers={rowModifiers}
    >
      <Toggle
        label={t("feedingSchedule.enabled")}
        isOn={usesFeedingSchedule}
        onIsOnChange={setUsesFeedingSchedule}
        modifiers={[accessibilityHint(t("a11y.feedingSchedule.enabled.hint"))]}
      />
      {usesFeedingSchedule ? (
        <>
          <ScheduleFields
            subject={t("feedingSchedule.section")}
            hint={t("a11y.feedingSchedule.frequency.hint")}
            daysHint={t("a11y.feedingSchedule.customDays.hint")}
            selection={feedingSelection}
            onSelectionChange={setFeedingSelection}
            customDays={feedingDays}
            onCustomDaysChange={setFeedingDays}
          />
          <Toggle
            label={t("reminders.enabled")}
            isOn={feedingReminder}
            onIsOnChange={handleFeedingReminder}
            modifiers={[
              accessibilityLabel(
                `${t("feedingSchedule.section")}: ${t("reminders.enabled")}`,
              ),
              accessibilityHint(t("a11y.reminders.feed.hint")),
            ]}
          />
        </>
      ) : null}
    </Section>
  );
}

type CareRoutineSectionProps = {
  routine: "water" | "cleaning";
  rowModifiers: RowModifiers;
  collectionSchedule: Parameters<typeof describeSchedule>[0];
  selection: ReptileFormController["waterSelection"];
  onSelectionChange: ReptileFormController["setWaterSelection"];
  days: string;
  onDaysChange: (days: string) => void;
  valid: boolean;
  footer: string;
  scheduled: boolean;
  reminder: boolean;
  onReminderChange: (on: boolean) => void;
};

function CareRoutineSection({
  routine,
  rowModifiers,
  collectionSchedule,
  selection,
  onSelectionChange,
  days,
  onDaysChange,
  valid,
  footer,
  scheduled,
  reminder,
  onReminderChange,
}: CareRoutineSectionProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const scheduleKey = `${routine}Schedule` as const;

  return (
    <Section
      header={
        <FormSectionHeader>{t(`${scheduleKey}.section`)}</FormSectionHeader>
      }
      footer={
        <FormSectionFooter color={valid ? undefined : theme.danger}>
          {footer}
        </FormSectionFooter>
      }
      modifiers={rowModifiers}
    >
      <ScheduleFields
        subject={t(`${scheduleKey}.section`)}
        hint={t(`a11y.${scheduleKey}.frequency.hint`)}
        daysHint={t(`a11y.${scheduleKey}.customDays.hint`)}
        inheritedLabel={t("defaults.followGlobal", {
          value: describeSchedule(collectionSchedule, t),
        })}
        offLabel={t("schedule.off")}
        selection={selection}
        onSelectionChange={onSelectionChange}
        customDays={days}
        onCustomDaysChange={onDaysChange}
      />
      {scheduled ? (
        <Toggle
          label={t("reminders.enabled")}
          isOn={reminder}
          onIsOnChange={onReminderChange}
          modifiers={[
            accessibilityLabel(
              `${t(`${scheduleKey}.section`)}: ${t("reminders.enabled")}`,
            ),
            accessibilityHint(t(`a11y.reminders.${routine}.hint`)),
          ]}
        />
      ) : null}
    </Section>
  );
}

function DefaultsSection({ form, rowModifiers }: FormSectionProps) {
  const { t } = useTranslation();
  const { animal, defaults, setDefaults, globalDefaults, frozenTag } = form;

  return (
    <Section
      header={<FormSectionHeader>{t("defaults.section")}</FormSectionHeader>}
      footer={
        <FormSectionFooter>
          {animal
            ? t("defaults.animalFooter", { animalName: animal.name })
            : t("defaults.animalFooterNew")}
        </FormSectionFooter>
      }
      modifiers={rowModifiers}
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
          t(value === "true" ? "defaults.frozenYes" : "defaults.frozenNo")
        }
        inherited={frozenTag(globalDefaults.frozen)}
        value={
          defaults.frozen === undefined ? undefined : frozenTag(defaults.frozen)
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
  );
}

function SaveErrorBanner({ message }: { message: string }) {
  const theme = useTheme();

  return (
    <View style={[styles.saveError, { borderTopColor: theme.border }]}>
      <ThemedText
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive"
        selectable
        type="bodyS"
        themeColor="danger"
      >
        {message}
      </ThemedText>
    </View>
  );
}

export function ReptileFormSheet({ animal }: ReptileFormSheetProps) {
  const theme = useTheme();
  const modifiers = useFormModifiers();
  const form = useReptileForm(animal);
  const rowModifiers = modifiers.row;
  const nameText = useNativeState(form.name);
  const commonNameText = useNativeState(form.commonName);
  const scientificNameText = useNativeState(form.scientificName);
  useEffect(() => nameText.set(form.name), [form.name, nameText]);
  useEffect(
    () => commonNameText.set(form.commonName),
    [form.commonName, commonNameText],
  );
  useEffect(
    () => scientificNameText.set(form.scientificName),
    [form.scientificName, scientificNameText],
  );

  return (
    <>
      <FormSheetChrome
        namespace={animal ? "editReptile" : "newReptile"}
        animalName={animal?.name}
        saveDisabled={!form.canSave}
        cancelDisabled={form.isSaving}
        onSave={form.handleConfirm}
      />

      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <Host
          style={styles.host}
          useViewportSizeMeasurement
          seedColor={theme.primary}
        >
          <Form modifiers={modifiers.form}>
            <PhotoSection form={form} />
            <DetailsSection
              form={form}
              rowModifiers={rowModifiers}
              nameText={nameText}
              commonNameText={commonNameText}
              scientificNameText={scientificNameText}
            />
            <ProfileSection form={form} rowModifiers={rowModifiers} />
            <FeedingSection form={form} rowModifiers={rowModifiers} />
            <CareRoutineSection
              routine="water"
              rowModifiers={rowModifiers}
              collectionSchedule={form.collectionWater}
              selection={form.waterSelection}
              onSelectionChange={form.setWaterSelection}
              days={form.waterDays}
              onDaysChange={form.setWaterDays}
              valid={form.waterValid}
              footer={form.waterFooter}
              scheduled={form.waterScheduled}
              reminder={form.waterReminder}
              onReminderChange={form.handleWaterReminder}
            />
            <CareRoutineSection
              routine="cleaning"
              rowModifiers={rowModifiers}
              collectionSchedule={form.collectionCleaning}
              selection={form.cleaningSelection}
              onSelectionChange={form.setCleaningSelection}
              days={form.cleaningDays}
              onDaysChange={form.setCleaningDays}
              valid={form.cleaningValid}
              footer={form.cleaningFooter}
              scheduled={form.cleaningScheduled}
              reminder={form.cleaningReminder}
              onReminderChange={form.handleCleaningReminder}
            />
            <DefaultsSection form={form} rowModifiers={rowModifiers} />
          </Form>
        </Host>

        {form.saveError ? <SaveErrorBanner message={form.saveError} /> : null}
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
