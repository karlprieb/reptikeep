import { Host } from "@expo/ui";
import {
  DatePicker,
  Form,
  Section,
  TextField,
  Toggle,
  useNativeState,
} from "@expo/ui/swift-ui";
import {
  accessibilityLabel,
  datePickerStyle,
  lineLimit,
  textInputAutocapitalization,
} from "@expo/ui/swift-ui/modifiers";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import {
  asEditOf,
  FormSectionFooter,
  FormSectionHeader,
  FormSheetChrome,
  formSheetStyles as styles,
  optionalText,
  useDraft,
  useFormModifiers,
} from "@/components/form-sheet";
import { useTheme } from "@/hooks/use-theme";
import { shedStore, createShedActivity, type ShedActivity } from "@/state/shed";

type AddShedSheetProps = {
  animalId: string;
  animalName: string;
  activity?: ShedActivity;
};

type ShedDraft = {
  occurredAt: Date;
  issues: boolean;
  notes: string;
};

function createInitialDraft(activity?: ShedActivity): ShedDraft {
  return {
    occurredAt: activity ? new Date(activity.occurredAt) : new Date(),
    issues: activity?.issues ?? false,
    notes: activity?.notes ?? "",
  };
}

export function AddShedSheet({
  animalId,
  animalName,
  activity,
}: AddShedSheetProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const modifiers = useFormModifiers();
  const [draft, updateDraft] = useDraft(() => createInitialDraft(activity));
  const notesText = useNativeState(activity?.notes ?? "");

  const handleSave = () => {
    const record = createShedActivity({
      animalId,
      occurredAt: draft.occurredAt.toISOString(),
      issues: draft.issues,
      notes: optionalText(draft.notes),
    });

    shedStore.add(activity ? asEditOf(record, activity) : record);

    router.back();
  };

  return (
    <>
      <FormSheetChrome
        namespace="shedForm"
        animalName={animalName}
        editing={Boolean(activity)}
        saveDisabled={false}
        onSave={handleSave}
      />

      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <Host
          style={styles.host}
          useViewportSizeMeasurement
          seedColor={theme.primary}
        >
          <Form modifiers={modifiers.form}>
            <Section
              header={
                <FormSectionHeader>{t("shedForm.timing")}</FormSectionHeader>
              }
              footer={
                <FormSectionFooter>
                  {t("shedForm.timingHint", { animalName })}
                </FormSectionFooter>
              }
              modifiers={modifiers.row}
            >
              <DatePicker
                title={t("shedForm.when")}
                selection={draft.occurredAt}
                range={{ end: new Date() }}
                displayedComponents={["date", "hourAndMinute"]}
                onDateChange={(value) => updateDraft({ occurredAt: value })}
                modifiers={[datePickerStyle("compact")]}
              />
            </Section>

            <Section
              header={
                <FormSectionHeader>
                  {t("shedForm.observation")}
                </FormSectionHeader>
              }
              footer={
                <FormSectionFooter>
                  {t("shedForm.issuesHint")}
                </FormSectionFooter>
              }
              modifiers={modifiers.row}
            >
              <Toggle
                label={t("shedForm.issues")}
                isOn={draft.issues}
                onIsOnChange={(issues) => updateDraft({ issues })}
              />
            </Section>

            <Section
              header={
                <FormSectionHeader>{t("shedForm.notes")}</FormSectionHeader>
              }
              modifiers={modifiers.row}
            >
              <TextField
                text={notesText}
                placeholder={t("shedForm.notesPlaceholder")}
                axis="vertical"
                onTextChange={(notes) => updateDraft({ notes })}
                modifiers={[
                  accessibilityLabel(t("shedForm.notes")),
                  lineLimit(4, { reservesSpace: true }),
                  textInputAutocapitalization("sentences"),
                ]}
              />
            </Section>
          </Form>
        </Host>
      </View>
    </>
  );
}
