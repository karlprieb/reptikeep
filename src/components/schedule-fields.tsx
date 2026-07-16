import {
  LabeledContent,
  Picker,
  Text,
  TextField,
  useNativeState,
} from "@expo/ui/swift-ui";
import {
  accessibilityHint,
  accessibilityLabel,
  keyboardType,
  listRowBackground,
  multilineTextAlignment,
  pickerStyle,
  tag,
} from "@expo/ui/swift-ui/modifiers";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

import { useTheme } from "@/hooks/use-theme";
import {
  SCHEDULE_FREQUENCIES,
  type AnimalSchedule,
  type CareSchedule,
  type ScheduleFrequency,
} from "@/state/care-schedule";

export const SCHEDULE_INHERIT = "inherit";
const SCHEDULE_OFF = "off";

export type ScheduleSelection =
  ScheduleFrequency | typeof SCHEDULE_INHERIT | typeof SCHEDULE_OFF;

export function scheduleSelection(
  schedule: AnimalSchedule | undefined,
  absent: ScheduleSelection,
): ScheduleSelection {
  return schedule?.frequency ?? absent;
}

export function scheduleCustomDays(
  schedule: AnimalSchedule | undefined,
): string {
  return schedule?.frequency === "custom" ? String(schedule.days) : "";
}

export function isScheduleValid(
  selection: ScheduleSelection,
  customDays: string,
): boolean {
  if (selection !== "custom") return true;

  const days = Number(customDays.trim());
  return customDays.trim().length > 0 && Number.isInteger(days) && days > 0;
}

export function scheduleFromFields(
  selection: ScheduleSelection,
  customDays: string,
): AnimalSchedule | undefined {
  if (selection === SCHEDULE_INHERIT) return undefined;
  if (selection === SCHEDULE_OFF) return { frequency: SCHEDULE_OFF };
  if (selection !== "custom") return { frequency: selection };

  return { frequency: "custom", days: Number(customDays.trim()) };
}

export function careScheduleFromFields(
  selection: ScheduleSelection,
  customDays: string,
): CareSchedule | undefined {
  const schedule = scheduleFromFields(selection, customDays);
  return schedule?.frequency === SCHEDULE_OFF ? undefined : schedule;
}

export function describeSchedule(
  schedule: CareSchedule | undefined,
  t: TFunction,
): string {
  if (!schedule) return t("schedule.off");

  return schedule.frequency === "custom"
    ? t("schedule.everyDays", { count: schedule.days })
    : t(`schedule.frequency.${schedule.frequency}`);
}

type ScheduleFieldsProps = {
  subject: string;
  hint: string;
  daysHint: string;
  inheritedLabel?: string;
  offLabel?: string;
  selection: ScheduleSelection;
  onSelectionChange: (value: ScheduleSelection) => void;
  customDays: string;
  onCustomDaysChange: (value: string) => void;
};

export function ScheduleFields({
  subject,
  hint,
  daysHint,
  inheritedLabel,
  offLabel,
  selection,
  onSelectionChange,
  customDays,
  onCustomDaysChange,
}: ScheduleFieldsProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const customDaysText = useNativeState(customDays);

  const frequencyLabel = t("schedule.frequency.label");
  const daysLabel = t("schedule.customDays");

  const rows = [
    ...(inheritedLabel
      ? [{ key: SCHEDULE_INHERIT, text: inheritedLabel }]
      : []),
    ...(offLabel ? [{ key: SCHEDULE_OFF, text: offLabel }] : []),
    ...SCHEDULE_FREQUENCIES.map((frequency) => ({
      key: frequency,
      text: t(`schedule.frequency.${frequency}`),
    })),
  ];

  return (
    <>
      <Picker
        label={frequencyLabel}
        selection={selection}
        onSelectionChange={(value) =>
          onSelectionChange(value as ScheduleSelection)
        }
        modifiers={[
          accessibilityLabel(`${subject}: ${frequencyLabel}`),
          accessibilityHint(hint),
          pickerStyle("menu"),
          listRowBackground(theme.surface),
        ]}
      >
        {rows.map((row) => (
          <Text key={row.key} modifiers={[tag(row.key)]}>
            {row.text}
          </Text>
        ))}
      </Picker>

      {selection === "custom" ? (
        <LabeledContent
          label={daysLabel}
          modifiers={[listRowBackground(theme.surface)]}
        >
          <TextField
            text={customDaysText}
            placeholder={t("schedule.customDaysPlaceholder")}
            onTextChange={onCustomDaysChange}
            modifiers={[
              accessibilityLabel(`${subject}: ${daysLabel}`),
              accessibilityHint(daysHint),
              keyboardType("numeric"),
              multilineTextAlignment("trailing"),
            ]}
          />
        </LabeledContent>
      ) : null}
    </>
  );
}
