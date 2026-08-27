import { useSelector as useValue } from "@legendapp/state/react";
import { Host } from "@expo/ui";
import {
  DatePicker,
  Form,
  LabeledContent,
  Picker,
  Section,
  Text,
  TextField,
  useNativeState,
} from "@expo/ui/swift-ui";
import {
  accessibilityLabel,
  datePickerStyle,
  foregroundStyle,
  keyboardType,
  lineLimit,
  minimumScaleFactor,
  pickerStyle,
  tag,
  textInputAutocapitalization,
} from "@expo/ui/swift-ui/modifiers";
import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

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
import { typeFont } from "@/constants/type-font";
import { useTheme } from "@/hooks/use-theme";
import { animalDefaults } from "@/state/logging-defaults";
import {
  weightStore,
  createWeightActivity,
  type WeightActivity,
} from "@/state/weight";
import { formatAbsoluteDate } from "@/utils/format-date";
import {
  formatSignedPercent,
  formatWeight,
  formatWeightDelta,
} from "@/utils/format-number";
import { previousRecord, weightChange } from "@/utils/weight-change";
import {
  convertWeightFieldOnUnitChange,
  gramsToField,
  WEIGHT_UNITS,
  type WeightUnit,
  weightFieldToGrams,
} from "@/utils/weight-unit";

const MIN_WEIGHT_GRAMS = 1;

type AddWeightSheetProps = {
  animalId: string;
  animalName: string;
  activity?: WeightActivity;
};

type WeightDraft = {
  occurredAt: Date;
  weight: string;
  unit: WeightUnit;
  notes: string;
};

function createInitialDraft(
  unit: WeightUnit,
  activity?: WeightActivity,
): WeightDraft {
  return {
    occurredAt: activity ? new Date(activity.occurredAt) : new Date(),
    weight: gramsToField(activity?.weight, unit),
    unit,
    notes: activity?.notes ?? "",
  };
}

export function AddWeightSheet({
  animalId,
  animalName,
  activity,
}: AddWeightSheetProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const modifiers = useFormModifiers();
  const weights = useValue(weightStore.$);
  const { weightUnit } = animalDefaults(animalId);
  const [draft, updateDraft] = useDraft(() =>
    createInitialDraft(weightUnit, activity),
  );
  const weightText = useNativeState(gramsToField(activity?.weight, weightUnit));
  const notesText = useNativeState(activity?.notes ?? "");

  const grams = weightFieldToGrams(draft.weight, draft.unit, activity?.weight);
  const canSave = grams !== undefined && grams >= MIN_WEIGHT_GRAMS;
  const invalid = draft.weight.trim().length > 0 && !canSave;

  const previous = previousRecord(
    animalId,
    weights,
    draft.occurredAt.toISOString(),
    activity?.id,
  );
  const change =
    previous && canSave ? weightChange(previous.weight, grams) : undefined;

  const handleSave = () => {
    if (!canSave) return;

    const record = createWeightActivity({
      animalId,
      occurredAt: draft.occurredAt.toISOString(),
      weight: grams,
      notes: optionalText(draft.notes),
    });

    weightStore.add(activity ? asEditOf(record, activity) : record);

    router.back();
  };

  const footer = invalid
    ? { text: t("weightForm.invalidWeight"), color: theme.danger }
    : change?.implausible
      ? { text: t("weightForm.implausible"), color: theme.warning }
      : {
          text: t(previous ? "weightForm.hint" : "weightForm.firstHint", {
            animalName,
          }),
        };

  return (
    <>
      <FormSheetChrome
        namespace="weightForm"
        animalName={animalName}
        editing={Boolean(activity)}
        saveDisabled={!canSave}
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
                <FormSectionHeader>{t("weightForm.weighIn")}</FormSectionHeader>
              }
              footer={
                <FormSectionFooter color={footer.color}>
                  {footer.text}
                </FormSectionFooter>
              }
              modifiers={modifiers.row}
            >
              <TextField
                text={weightText}
                autoFocus
                placeholder={t("weightForm.weightPlaceholder", {
                  unit: t(`weightForm.unitShort.${draft.unit}`),
                })}
                onTextChange={(value) => updateDraft({ weight: value })}
                modifiers={[
                  accessibilityLabel(t("weightForm.weight")),
                  keyboardType("decimal-pad"),
                ]}
              />
              <Picker
                label={t("weightForm.unit")}
                selection={draft.unit}
                onSelectionChange={(value) => {
                  const unit = value as WeightUnit;
                  const nextWeight = convertWeightFieldOnUnitChange(
                    draft.weight,
                    draft.unit,
                    unit,
                    activity?.weight,
                  );
                  weightText.set(nextWeight);
                  updateDraft({ weight: nextWeight, unit });
                }}
                modifiers={[
                  accessibilityLabel(t("weightForm.unit")),
                  pickerStyle("segmented"),
                ]}
              >
                {WEIGHT_UNITS.map((unit) => (
                  <Text key={unit} modifiers={[tag(unit)]}>
                    {t(`weightForm.unitShort.${unit}`)}
                  </Text>
                ))}
              </Picker>

              {previous ? (
                <LabeledContent label={t("weightForm.previous")}>
                  <Text
                    modifiers={[
                      typeFont("data"),
                      foregroundStyle(theme.textSecondary),
                      lineLimit(1),
                      minimumScaleFactor(0.7),
                    ]}
                  >
                    {`${formatWeight(previous.weight, draft.unit)} · ${formatAbsoluteDate(previous.occurredAt)}`}
                  </Text>
                </LabeledContent>
              ) : null}

              {change ? (
                <LabeledContent label={t("weightForm.change")}>
                  <Text
                    modifiers={[
                      typeFont("data"),
                      foregroundStyle(
                        change.implausible ? theme.warning : theme.text,
                      ),
                      lineLimit(1),
                      minimumScaleFactor(0.7),
                    ]}
                  >
                    {`${formatWeightDelta(change.deltaGrams, draft.unit)} (${formatSignedPercent(change.percent)})`}
                  </Text>
                </LabeledContent>
              ) : null}
            </Section>

            <Section
              header={
                <FormSectionHeader>{t("weightForm.timing")}</FormSectionHeader>
              }
              footer={
                <FormSectionFooter>
                  {t("weightForm.timingHint", { animalName })}
                </FormSectionFooter>
              }
              modifiers={modifiers.row}
            >
              <DatePicker
                title={t("weightForm.when")}
                selection={draft.occurredAt}
                range={{ end: new Date() }}
                displayedComponents={["date", "hourAndMinute"]}
                onDateChange={(value) => updateDraft({ occurredAt: value })}
                modifiers={[datePickerStyle("compact")]}
              />
            </Section>

            <Section
              header={
                <FormSectionHeader>{t("weightForm.notes")}</FormSectionHeader>
              }
              modifiers={modifiers.row}
            >
              <TextField
                text={notesText}
                placeholder={t("weightForm.notesPlaceholder")}
                axis="vertical"
                onTextChange={(value) => updateDraft({ notes: value })}
                modifiers={[
                  accessibilityLabel(t("weightForm.notes")),
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
