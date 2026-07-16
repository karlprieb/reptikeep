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
  accessibilityHint,
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
import {
  createHabitatActivity,
  habitatStore,
  type HabitatActivity,
} from "@/state/habitat";

type AddHabitatSheetProps = {
  animalId: string;
  animalName: string;
  activity?: HabitatActivity;
};

type HabitatDraft = {
  occurredAt: Date;
  water: boolean;
  notes: string;
};

function createInitialDraft(activity?: HabitatActivity): HabitatDraft {
  return {
    occurredAt: activity ? new Date(activity.occurredAt) : new Date(),
    water: activity?.water ?? true,
    notes: activity?.notes ?? "",
  };
}

export function AddHabitatSheet({
  animalId,
  animalName,
  activity,
}: AddHabitatSheetProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const modifiers = useFormModifiers();
  const [draft, updateDraft] = useDraft(() => createInitialDraft(activity));
  const notesText = useNativeState(activity?.notes ?? "");

  const handleSave = () => {
    const record = createHabitatActivity({
      animalId,
      occurredAt: draft.occurredAt.toISOString(),
      water: draft.water,
      notes: optionalText(draft.notes),
    });

    habitatStore.add(activity ? asEditOf(record, activity) : record);

    router.back();
  };

  return (
    <>
      <FormSheetChrome
        namespace="habitatForm"
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
                <FormSectionHeader>{t("habitatForm.timing")}</FormSectionHeader>
              }
              footer={
                <FormSectionFooter>
                  {t("habitatForm.timingHint", { animalName })}
                </FormSectionFooter>
              }
              modifiers={modifiers.row}
            >
              <DatePicker
                title={t("habitatForm.when")}
                selection={draft.occurredAt}
                range={{ end: new Date() }}
                displayedComponents={["date", "hourAndMinute"]}
                onDateChange={(value) => updateDraft({ occurredAt: value })}
                modifiers={[datePickerStyle("compact")]}
              />
            </Section>

            <Section
              header={
                <FormSectionHeader>{t("habitatForm.upkeep")}</FormSectionHeader>
              }
              footer={
                <FormSectionFooter>
                  {draft.water
                    ? t("habitatForm.waterHint")
                    : t("habitatForm.noWaterHint")}
                </FormSectionFooter>
              }
              modifiers={modifiers.row}
            >
              <Toggle
                label={t("habitatForm.water")}
                isOn={draft.water}
                onIsOnChange={(water) => updateDraft({ water })}
                modifiers={[accessibilityHint(t("a11y.habitatForm.water"))]}
              />
            </Section>

            <Section
              header={
                <FormSectionHeader>{t("habitatForm.notes")}</FormSectionHeader>
              }
              modifiers={modifiers.row}
            >
              <TextField
                text={notesText}
                placeholder={t("habitatForm.notesPlaceholder")}
                axis="vertical"
                onTextChange={(notes) => updateDraft({ notes })}
                modifiers={[
                  accessibilityLabel(t("habitatForm.notes")),
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
