import {
  Button,
  DatePicker,
  Form,
  Host,
  Picker,
  Section,
  Text,
  Toggle,
} from "@expo/ui/swift-ui";
import {
  accessibilityHint,
  datePickerStyle,
  foregroundStyle,
  listRowBackground,
  pickerStyle,
  tag,
} from "@expo/ui/swift-ui/modifiers";
import { useValue } from "@legendapp/state/react";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

import { DefaultPicker, useFormModifiers } from "@/components/form-sheet";
import { PageHeader } from "@/components/page-header";
import {
  careScheduleFromFields,
  isScheduleValid,
  ScheduleFields,
  scheduleCustomDays,
  type ScheduleSelection,
} from "@/components/schedule-fields";
import { useTheme } from "@/hooks/use-theme";
import { careSchedules$ } from "@/state/care-schedule";
import { DEFECATION_TYPES } from "@/state/defecation";
import { defaults$, FEEDING_MEASURES } from "@/state/logging-defaults";
import { reminders$ } from "@/state/reminders";
import { settings$, setLanguage, type LanguageSetting } from "@/state/settings";
import { atClockTime } from "@/utils/format-date";
import { WEIGHT_UNITS } from "@/utils/weight-unit";

const LANGUAGE_OPTIONS: { value: LanguageSetting; labelKey: string }[] = [
  { value: "system", labelKey: "settings.followDevice" },
  { value: "en", labelKey: "settings.english" },
  { value: "pt-BR", labelKey: "settings.portuguese" },
];

export default function SettingsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const formModifiers = useFormModifiers();
  const currentLanguage = useValue(settings$.language);
  const globalDefaults = useValue(defaults$);
  const water = useValue(careSchedules$.water);
  const cleaning = useValue(careSchedules$.cleaning);
  const reminderTime = useValue(reminders$);
  const reminderDate = useMemo(
    () => atClockTime(new Date(), reminderTime.hour, reminderTime.minute),
    [reminderTime.hour, reminderTime.minute],
  );
  const [waterDays, setWaterDays] = useState(() => scheduleCustomDays(water));
  const [cleaningDays, setCleaningDays] = useState(() =>
    scheduleCustomDays(cleaning),
  );

  const waterValid = isScheduleValid(water?.frequency ?? "weekly", waterDays);
  const cleaningValid = isScheduleValid(
    cleaning?.frequency ?? "weekly",
    cleaningDays,
  );

  const handleWaterSelection = (selection: ScheduleSelection) =>
    careSchedules$.water.set(careScheduleFromFields(selection, waterDays));

  const handleWaterDays = (value: string) => {
    setWaterDays(value);
    if (isScheduleValid("custom", value)) {
      careSchedules$.water.set({
        frequency: "custom",
        days: Number(value.trim()),
      });
    }
  };

  const handleCleaningSelection = (selection: ScheduleSelection) =>
    careSchedules$.cleaning.set(
      careScheduleFromFields(selection, cleaningDays),
    );

  const handleCleaningDays = (value: string) => {
    setCleaningDays(value);
    if (isScheduleValid("custom", value)) {
      careSchedules$.cleaning.set({
        frequency: "custom",
        days: Number(value.trim()),
      });
    }
  };

  return (
    <>
      <Host style={styles.host} useViewportSizeMeasurement>
        <Form modifiers={formModifiers.form}>
          <Section
            header={
              <Text modifiers={[foregroundStyle(theme.textSecondary)]}>
                {t("defaults.section")}
              </Text>
            }
            footer={
              <Text modifiers={[foregroundStyle(theme.textSecondary)]}>
                {t("defaults.globalFooter")}
              </Text>
            }
          >
            <DefaultPicker
              label={t("defaults.mealMeasure")}
              hint={t("a11y.defaults.mealMeasure.hint")}
              options={FEEDING_MEASURES}
              describe={(value) => t(`feedingForm.measure.${value}`)}
              value={globalDefaults.mealMeasure}
              onChange={(value) => value && defaults$.mealMeasure.set(value)}
            />
            <Toggle
              label={t("defaults.frozen")}
              isOn={globalDefaults.frozen}
              onIsOnChange={(value) => defaults$.frozen.set(value)}
              modifiers={[
                listRowBackground(theme.surface),
                accessibilityHint(t("a11y.defaults.frozen.hint")),
              ]}
            />
            <DefaultPicker
              label={t("defaults.weightUnit")}
              hint={t("a11y.defaults.weightUnit.hint")}
              options={WEIGHT_UNITS}
              describe={(value) => t(`feedingForm.units.${value}`)}
              value={globalDefaults.weightUnit}
              onChange={(value) => value && defaults$.weightUnit.set(value)}
            />
            <DefaultPicker
              label={t("defaults.poopType")}
              hint={t("a11y.defaults.poopType.hint")}
              options={DEFECATION_TYPES}
              describe={(value) => t(`timeline.poop.${value}`)}
              value={globalDefaults.poopType}
              onChange={(value) => value && defaults$.poopType.set(value)}
            />
          </Section>

          <Section
            header={
              <Text modifiers={[foregroundStyle(theme.textSecondary)]}>
                {t("reminders.settings.section")}
              </Text>
            }
            footer={
              <Text modifiers={[foregroundStyle(theme.textSecondary)]}>
                {t("reminders.settings.footer")}
              </Text>
            }
          >
            <DatePicker
              title={t("reminders.settings.time")}
              selection={reminderDate}
              displayedComponents={["hourAndMinute"]}
              onDateChange={(value) =>
                reminders$.set({
                  hour: value.getHours(),
                  minute: value.getMinutes(),
                })
              }
              modifiers={[
                datePickerStyle("compact"),
                listRowBackground(theme.surface),
                accessibilityHint(t("a11y.reminders.time.hint")),
              ]}
            />
          </Section>

          <Section
            header={
              <Text modifiers={[foregroundStyle(theme.textSecondary)]}>
                {t("waterSchedule.section")}
              </Text>
            }
            footer={
              <Text
                modifiers={[
                  foregroundStyle(
                    waterValid ? theme.textSecondary : theme.danger,
                  ),
                ]}
              >
                {waterValid
                  ? t("waterSchedule.globalFooter")
                  : t("schedule.invalidDays")}
              </Text>
            }
          >
            <Toggle
              label={t("waterSchedule.enabled")}
              isOn={Boolean(water)}
              onIsOnChange={(on) =>
                careSchedules$.water.set(
                  on ? { frequency: "weekly" } : undefined,
                )
              }
              modifiers={[
                listRowBackground(theme.surface),
                accessibilityHint(t("a11y.waterSchedule.enabled.hint")),
              ]}
            />
            {water ? (
              <ScheduleFields
                subject={t("waterSchedule.section")}
                hint={t("a11y.waterSchedule.frequency.hint")}
                daysHint={t("a11y.waterSchedule.customDays.hint")}
                selection={water.frequency}
                onSelectionChange={handleWaterSelection}
                customDays={waterDays}
                onCustomDaysChange={handleWaterDays}
              />
            ) : null}
          </Section>

          <Section
            header={
              <Text modifiers={[foregroundStyle(theme.textSecondary)]}>
                {t("cleaningSchedule.section")}
              </Text>
            }
            footer={
              <Text
                modifiers={[
                  foregroundStyle(
                    cleaningValid ? theme.textSecondary : theme.danger,
                  ),
                ]}
              >
                {cleaningValid
                  ? t("cleaningSchedule.globalFooter")
                  : t("schedule.invalidDays")}
              </Text>
            }
          >
            <Toggle
              label={t("cleaningSchedule.enabled")}
              isOn={Boolean(cleaning)}
              onIsOnChange={(on) =>
                careSchedules$.cleaning.set(
                  on ? { frequency: "weekly" } : undefined,
                )
              }
              modifiers={[
                listRowBackground(theme.surface),
                accessibilityHint(t("a11y.cleaningSchedule.enabled.hint")),
              ]}
            />
            {cleaning ? (
              <ScheduleFields
                subject={t("cleaningSchedule.section")}
                hint={t("a11y.cleaningSchedule.frequency.hint")}
                daysHint={t("a11y.cleaningSchedule.customDays.hint")}
                selection={cleaning.frequency}
                onSelectionChange={handleCleaningSelection}
                customDays={cleaningDays}
                onCustomDaysChange={handleCleaningDays}
              />
            ) : null}
          </Section>

          <Section
            header={
              <Text modifiers={[foregroundStyle(theme.textSecondary)]}>
                {t("settings.general")}
              </Text>
            }
            footer={
              <Text modifiers={[foregroundStyle(theme.textSecondary)]}>
                {t("settings.subtitle")}
              </Text>
            }
          >
            <Picker
              label={t("settings.language")}
              systemImage="globe"
              selection={currentLanguage}
              onSelectionChange={(value) =>
                setLanguage(value as LanguageSetting)
              }
              modifiers={[
                pickerStyle("menu"),
                listRowBackground(theme.surface),
                accessibilityHint(t("a11y.language.hint")),
              ]}
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <Text key={option.value} modifiers={[tag(option.value)]}>
                  {t(option.labelKey)}
                </Text>
              ))}
            </Picker>
            <Button
              label={t("backup.title")}
              systemImage="arrow.triangle.2.circlepath"
              onPress={() => router.push("/backup-restore" as never)}
              modifiers={[
                listRowBackground(theme.surface),
                accessibilityHint(t("a11y.backup.open")),
              ]}
            />
          </Section>

          <Section>
            <Button
              label={t("about.title")}
              systemImage="info.circle"
              onPress={() => router.push("/about")}
              modifiers={[
                listRowBackground(theme.surface),
                accessibilityHint(t("a11y.about.openHint")),
              ]}
            />
          </Section>
        </Form>
      </Host>
      <PageHeader title={t("settings.title")} />
    </>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
  },
});
