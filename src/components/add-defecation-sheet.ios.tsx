import { Host } from "@expo/ui";
import {
  DatePicker,
  Form,
  Picker,
  Section,
  Text,
  TextField,
  Toggle,
  useNativeState,
} from "@expo/ui/swift-ui";
import {
  accessibilityLabel,
  datePickerStyle,
  lineLimit,
  pickerStyle,
  tag,
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
  defecationStore,
  createDefecationActivity,
  DEFECATION_TYPES,
  type DefecationActivity,
  type DefecationType,
} from "@/state/defecation";
import { animalDefaults } from "@/state/logging-defaults";

type AddDefecationSheetProps = {
  animalId: string;
  animalName: string;
  activity?: DefecationActivity;
};

type DefecationDraft = {
  occurredAt: Date;
  type: DefecationType;
  issues: boolean;
  note: string;
};

function createInitialDraft(
  animalId: string,
  activity?: DefecationActivity,
): DefecationDraft {
  return {
    occurredAt: activity ? new Date(activity.occurredAt) : new Date(),
    type: activity?.type ?? animalDefaults(animalId).poopType,
    issues: activity?.issues ?? false,
    note: activity?.note ?? "",
  };
}

export function AddDefecationSheet({
  animalId,
  animalName,
  activity,
}: AddDefecationSheetProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const modifiers = useFormModifiers();
  const [draft, updateDraft] = useDraft(() =>
    createInitialDraft(animalId, activity),
  );
  const noteText = useNativeState(activity?.note ?? "");

  const handleSave = () => {
    const record = createDefecationActivity({
      animalId,
      occurredAt: draft.occurredAt.toISOString(),
      type: draft.type,
      issues: draft.issues,
      note: optionalText(draft.note),
    });

    defecationStore.add(activity ? asEditOf(record, activity) : record);

    router.back();
  };

  return (
    <>
      <FormSheetChrome
        namespace="defecationForm"
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
                <FormSectionHeader>
                  {t("defecationForm.observation")}
                </FormSectionHeader>
              }
              footer={
                <FormSectionFooter>
                  {t("defecationForm.typeHint")}
                </FormSectionFooter>
              }
              modifiers={modifiers.row}
            >
              <Picker
                label={t("defecationForm.type")}
                selection={draft.type}
                onSelectionChange={(type) =>
                  updateDraft({ type: type as DefecationType })
                }
                modifiers={[
                  accessibilityLabel(t("defecationForm.type")),
                  pickerStyle("segmented"),
                ]}
              >
                {DEFECATION_TYPES.map((type) => (
                  <Text key={type} modifiers={[tag(type)]}>
                    {t(`timeline.poop.${type}`)}
                  </Text>
                ))}
              </Picker>
              <Toggle
                label={t("defecationForm.issues")}
                isOn={draft.issues}
                onIsOnChange={(issues) => updateDraft({ issues })}
              />
            </Section>

            <Section
              header={
                <FormSectionHeader>
                  {t("defecationForm.timing")}
                </FormSectionHeader>
              }
              footer={
                <FormSectionFooter>
                  {t("defecationForm.timingHint", { animalName })}
                </FormSectionFooter>
              }
              modifiers={modifiers.row}
            >
              <DatePicker
                title={t("defecationForm.when")}
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
                  {t("defecationForm.notes")}
                </FormSectionHeader>
              }
              modifiers={modifiers.row}
            >
              <TextField
                text={noteText}
                placeholder={t("defecationForm.notesPlaceholder")}
                axis="vertical"
                onTextChange={(note) => updateDraft({ note })}
                modifiers={[
                  accessibilityLabel(t("defecationForm.notes")),
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
