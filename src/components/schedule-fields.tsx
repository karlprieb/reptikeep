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
import { useTranslation } from "react-i18next";

import { useTheme } from "@/hooks/use-theme";
import { SCHEDULE_FREQUENCIES } from "@/state/care-schedule";
import {
  SCHEDULE_INHERIT,
  SCHEDULE_OFF,
  type ScheduleSelection,
} from "@/utils/schedule";

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
