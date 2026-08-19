import { Host } from "@expo/ui";
import { DatePicker, Form, Section } from "@expo/ui/swift-ui";
import { datePickerStyle } from "@expo/ui/swift-ui/modifiers";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { AnimalNotFound, useAnimalRoute } from "@/components/animal-route";
import {
  FormSectionFooter,
  formSheetStyles as styles,
  useDraft,
  useFormModifiers,
} from "@/components/form-sheet";
import { Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { historyRange$ } from "@/state/history-range";
import { fromCalendarDate, toCalendarDate } from "@/utils/format-date";

type RangeDraft = {
  from: Date;
  to: Date;
};

export default function HistoryRangeScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const modifiers = useFormModifiers();
  const { animal } = useAnimalRoute();
  const { from, to, earliest } = useLocalSearchParams<{
    from?: string;
    to?: string;
    earliest?: string;
  }>();

  const today = new Date();
  const earliestDate = fromCalendarDate(earliest ?? "") ?? today;
  const [draft, updateDraft] = useDraft<RangeDraft>(() => ({
    from: fromCalendarDate(from ?? "") ?? earliestDate,
    to: fromCalendarDate(to ?? "") ?? today,
  }));

  if (!animal) return <AnimalNotFound />;

  const handleSave = () => {
    historyRange$.set({
      preset: "custom",
      from: toCalendarDate(draft.from),
      to: toCalendarDate(draft.to),
    });

    router.back();
  };

  return (
    <>
      <Stack.Title
        style={{ fontFamily: Typography.title.fontFamily, color: theme.text }}
      >
        {t("timeline.range.customTitle")}
      </Stack.Title>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          tintColor={theme.textSecondary}
          accessibilityLabel={t("timeline.range.cancel")}
          accessibilityHint={t("timeline.range.cancelHint")}
          onPress={() => router.back()}
        >
          {t("timeline.range.cancel")}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          tintColor={theme.primary}
          style={{ color: theme.onPrimary }}
          accessibilityLabel={t("timeline.range.apply")}
          accessibilityHint={t("timeline.range.applyHint")}
          variant="done"
          onPress={handleSave}
        >
          {t("timeline.range.apply")}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>

      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <Host
          style={styles.host}
          useViewportSizeMeasurement
          seedColor={theme.primary}
        >
          <Form modifiers={modifiers.form}>
            <Section
              footer={
                <FormSectionFooter>
                  {t("timeline.range.customPrompt")}
                </FormSectionFooter>
              }
              modifiers={modifiers.row}
            >
              <DatePicker
                title={t("timeline.range.from")}
                selection={draft.from}
                range={{ start: earliestDate, end: draft.to }}
                displayedComponents={["date"]}
                onDateChange={(value) => updateDraft({ from: value })}
                modifiers={[datePickerStyle("compact")]}
              />
              <DatePicker
                title={t("timeline.range.to")}
                selection={draft.to}
                range={{ start: draft.from, end: today }}
                displayedComponents={["date"]}
                onDateChange={(value) => updateDraft({ to: value })}
                modifiers={[datePickerStyle("compact")]}
              />
            </Section>
          </Form>
        </Host>
      </View>
    </>
  );
}
