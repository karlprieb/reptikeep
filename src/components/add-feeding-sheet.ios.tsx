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
  keyboardType,
  lineLimit,
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
import { useTheme } from "@/hooks/use-theme";
import {
  feedingStore,
  createFeedingActivity,
  type FeedingActivity,
} from "@/state/feeding";
import {
  animalDefaults,
  FEEDING_MEASURES,
  type FeedingMeasure,
  type LoggingDefaults,
} from "@/state/logging-defaults";
import {
  convertWeightFieldOnUnitChange,
  gramsToField,
  WEIGHT_UNITS,
  type WeightUnit,
  weightFieldToGrams,
} from "@/utils/weight-unit";

type AddFeedingSheetProps = {
  animalId: string;
  animalName: string;
  activity?: FeedingActivity;
};

type FeedingDraft = {
  occurredAt: Date;
  foodType: string;
  measure: FeedingMeasure;
  amount: string;
  weight: string;
  weightUnit: WeightUnit;
  frozen: boolean;
  refused: boolean;
  notes: string;
};

function createInitialDraft(
  activity: FeedingActivity | undefined,
  defaults: LoggingDefaults,
): FeedingDraft {
  return {
    occurredAt: activity ? new Date(activity.occurredAt) : new Date(),
    foodType: activity?.foodType ?? "",
    measure: activity
      ? activity.weight != null
        ? "weight"
        : "amount"
      : defaults.mealMeasure,
    amount: activity?.amount ?? "",
    weight: gramsToField(activity?.weight, defaults.weightUnit),
    weightUnit: defaults.weightUnit,
    frozen: activity?.frozen ?? defaults.frozen,
    refused: activity?.refused ?? false,
    notes: activity?.notes ?? "",
  };
}

export function AddFeedingSheet({
  animalId,
  animalName,
  activity,
}: AddFeedingSheetProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const modifiers = useFormModifiers();
  const defaults = animalDefaults(animalId);
  const [draft, updateDraft] = useDraft(() =>
    createInitialDraft(activity, defaults),
  );
  const fields = {
    foodType: useNativeState(activity?.foodType ?? ""),
    amount: useNativeState(activity?.amount ?? ""),
    weight: useNativeState(gramsToField(activity?.weight, defaults.weightUnit)),
    notes: useNativeState(activity?.notes ?? ""),
  };

  const parsedWeight = weightFieldToGrams(
    draft.weight,
    draft.weightUnit,
    activity?.weight,
  );
  const invalidWeight =
    draft.measure === "weight" &&
    draft.weight.trim().length > 0 &&
    parsedWeight === undefined;

  const handleSave = () => {
    if (invalidWeight) return;

    const record = createFeedingActivity({
      animalId,
      occurredAt: draft.occurredAt.toISOString(),
      foodType: optionalText(draft.foodType),
      amount:
        draft.measure === "amount" ? optionalText(draft.amount) : undefined,
      weight: draft.measure === "weight" ? parsedWeight : undefined,
      notes: optionalText(draft.notes),
      frozen: draft.frozen,
      refused: draft.refused,
    });

    feedingStore.add(activity ? asEditOf(record, activity) : record);

    router.back();
  };

  return (
    <>
      <FormSheetChrome
        namespace="feedingForm"
        animalName={animalName}
        editing={Boolean(activity)}
        saveDisabled={invalidWeight}
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
                <FormSectionHeader>{t("feedingForm.timing")}</FormSectionHeader>
              }
              footer={
                <FormSectionFooter>
                  {t("feedingForm.timingHint", { animalName })}
                </FormSectionFooter>
              }
              modifiers={modifiers.row}
            >
              <DatePicker
                title={t("feedingForm.when")}
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
                  {t("feedingForm.mealDetails")}
                </FormSectionHeader>
              }
              footer={
                <FormSectionFooter
                  color={invalidWeight ? theme.danger : undefined}
                >
                  {invalidWeight
                    ? t("feedingForm.invalidWeight")
                    : t(
                        draft.measure === "amount"
                          ? "feedingForm.amountHint"
                          : "feedingForm.weightHint",
                      )}
                </FormSectionFooter>
              }
              modifiers={modifiers.row}
            >
              <TextField
                text={fields.foodType}
                placeholder={t("feedingForm.foodType")}
                onTextChange={(value) => updateDraft({ foodType: value })}
                modifiers={[
                  accessibilityLabel(t("feedingForm.foodType")),
                  textInputAutocapitalization("sentences"),
                ]}
              />
              <Picker
                label={t("feedingForm.measureBy")}
                selection={draft.measure}
                onSelectionChange={(value) =>
                  updateDraft({ measure: value as FeedingMeasure })
                }
                modifiers={[
                  accessibilityLabel(t("feedingForm.measureBy")),
                  pickerStyle("segmented"),
                ]}
              >
                {FEEDING_MEASURES.map((measure) => (
                  <Text key={measure} modifiers={[tag(measure)]}>
                    {t(`feedingForm.measure.${measure}`)}
                  </Text>
                ))}
              </Picker>
              {draft.measure === "amount" ? (
                <TextField
                  text={fields.amount}
                  placeholder={t("feedingForm.amount")}
                  onTextChange={(value) => updateDraft({ amount: value })}
                  modifiers={[accessibilityLabel(t("feedingForm.amount"))]}
                />
              ) : (
                <>
                  <TextField
                    text={fields.weight}
                    placeholder={t("feedingForm.feederWeight")}
                    onTextChange={(value) => updateDraft({ weight: value })}
                    modifiers={[
                      accessibilityLabel(t("feedingForm.feederWeight")),
                      keyboardType("decimal-pad"),
                    ]}
                  />
                  <Picker
                    label={t("feedingForm.weightUnit")}
                    selection={draft.weightUnit}
                    onSelectionChange={(value) => {
                      const weightUnit = value as WeightUnit;
                      const nextWeight = convertWeightFieldOnUnitChange(
                        draft.weight,
                        draft.weightUnit,
                        weightUnit,
                        activity?.weight,
                      );
                      fields.weight.set(nextWeight);
                      updateDraft({ weight: nextWeight, weightUnit });
                    }}
                    modifiers={[pickerStyle("menu")]}
                  >
                    {WEIGHT_UNITS.map((unit) => (
                      <Text key={unit} modifiers={[tag(unit)]}>
                        {t(`feedingForm.units.${unit}`)}
                      </Text>
                    ))}
                  </Picker>
                </>
              )}
            </Section>

            <Section
              header={
                <FormSectionHeader>
                  {t("feedingForm.outcome")}
                </FormSectionHeader>
              }
              modifiers={modifiers.row}
            >
              <Toggle
                label={t("feedingForm.frozen")}
                isOn={draft.frozen}
                onIsOnChange={(value) => updateDraft({ frozen: value })}
              />
              <Toggle
                label={t("feedingForm.refused")}
                isOn={draft.refused}
                onIsOnChange={(value) => updateDraft({ refused: value })}
              />
            </Section>

            <Section
              header={
                <FormSectionHeader>{t("feedingForm.notes")}</FormSectionHeader>
              }
              modifiers={modifiers.row}
            >
              <TextField
                text={fields.notes}
                placeholder={t("feedingForm.notesPlaceholder")}
                axis="vertical"
                onTextChange={(value) => updateDraft({ notes: value })}
                modifiers={[
                  accessibilityLabel(t("feedingForm.notes")),
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
