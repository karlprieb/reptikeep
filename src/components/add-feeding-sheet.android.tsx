import {
  Column,
  Host,
  OutlinedTextField,
  Text,
  useNativeState,
} from "@expo/ui/jetpack-compose";
import { fillMaxWidth } from "@expo/ui/jetpack-compose/modifiers";
import { router } from "expo-router";
import { Animated, useWindowDimensions, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  ACTION_ICON_SIZE,
  DateTimeField,
  fieldColors,
  FormSheetTopBar,
  formSheetAndroidStyles as styles,
  MenuField,
  optionalText,
  Section,
  SegmentedField,
  SwitchRow,
  TOP_BAR_HEIGHT,
  asEditOf,
  useDraft,
  useScrollLift,
} from "@/components/form-sheet";
import { Spacing, StackAboveFontScale } from "@/constants/theme";
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
  gramsToField,
  WEIGHT_UNITS,
  type WeightUnit,
  weightFieldToGrams,
  weightInputToGrams,
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
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { fontScale } = useWindowDimensions();
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
  const { lifted, onScroll } = useScrollLift();

  const parsedWeight = weightFieldToGrams(
    draft.weight,
    draft.weightUnit,
    activity?.weight == null
      ? undefined
      : { grams: activity.weight, unit: defaults.weightUnit },
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

  const iconSize = ACTION_ICON_SIZE * Math.min(fontScale, 2);
  const horizontalInset = Spacing.md * Math.min(fontScale, StackAboveFontScale);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: insets.top + TOP_BAR_HEIGHT * Math.min(fontScale, 1.5),
          paddingBottom: insets.bottom + Spacing["2xl"],
          paddingHorizontal: horizontalInset,
        }}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={onScroll}
      >
        <Host
          style={styles.host}
          matchContents={{ horizontal: false, vertical: true }}
          seedColor={theme.primary}
        >
          <Column
            verticalArrangement={{ spacedBy: Spacing.xl }}
            horizontalAlignment="start"
            modifiers={[fillMaxWidth()]}
          >
            <Section
              title={t("feedingForm.timing")}
              footer={t("feedingForm.timingHint", { animalName })}
            >
              <DateTimeField
                label={t("feedingForm.when")}
                date={draft.occurredAt}
                onSelect={(value) => updateDraft({ occurredAt: value })}
                theme={theme}
                iconSize={iconSize}
                confirmLabel={t("newReptile.save")}
                dismissLabel={t("newReptile.cancel")}
                maxDate={new Date()}
              />
            </Section>

            <Section
              title={t("feedingForm.mealDetails")}
              footer={
                invalidWeight
                  ? t("feedingForm.invalidWeight")
                  : t(
                      draft.measure === "amount"
                        ? "feedingForm.amountHint"
                        : "feedingForm.weightHint",
                    )
              }
              footerColor={invalidWeight ? theme.danger : undefined}
            >
              <OutlinedTextField
                value={fields.foodType}
                onValueChange={(value) => updateDraft({ foodType: value })}
                colors={fieldColors(theme)}
                keyboardOptions={{ capitalization: "sentences" }}
                singleLine
                modifiers={[fillMaxWidth()]}
              >
                <OutlinedTextField.Label>
                  <Text>{t("feedingForm.foodType")}</Text>
                </OutlinedTextField.Label>
              </OutlinedTextField>

              <SegmentedField
                value={draft.measure}
                options={FEEDING_MEASURES}
                labelFor={(measure) => t(`feedingForm.measure.${measure}`)}
                onChange={(measure) => updateDraft({ measure })}
                theme={theme}
              />

              {draft.measure === "amount" ? (
                <OutlinedTextField
                  value={fields.amount}
                  onValueChange={(value) => updateDraft({ amount: value })}
                  colors={fieldColors(theme)}
                  singleLine
                  modifiers={[fillMaxWidth()]}
                >
                  <OutlinedTextField.Label>
                    <Text>{t("feedingForm.amount")}</Text>
                  </OutlinedTextField.Label>
                </OutlinedTextField>
              ) : (
                <>
                  <OutlinedTextField
                    value={fields.weight}
                    onValueChange={(value) => updateDraft({ weight: value })}
                    colors={fieldColors(theme)}
                    keyboardOptions={{ keyboardType: "decimal" }}
                    isError={invalidWeight}
                    singleLine
                    modifiers={[fillMaxWidth()]}
                  >
                    <OutlinedTextField.Label>
                      <Text>{t("feedingForm.feederWeight")}</Text>
                    </OutlinedTextField.Label>
                  </OutlinedTextField>
                  <MenuField
                    label={t("feedingForm.weightUnit")}
                    value={t(`feedingForm.units.${draft.weightUnit}`)}
                    theme={theme}
                    iconSize={iconSize}
                    items={WEIGHT_UNITS.map((unit) => ({
                      value: unit,
                      label: t(`feedingForm.units.${unit}`),
                      selected: unit === draft.weightUnit,
                    }))}
                    onSelect={(weightUnit) => {
                      const originalGrams = activity?.weight;
                      const currentGrams =
                        originalGrams !== undefined &&
                        draft.weight ===
                          gramsToField(originalGrams, draft.weightUnit)
                          ? originalGrams
                          : weightInputToGrams(draft.weight, draft.weightUnit);
                      const nextWeight =
                        currentGrams === undefined
                          ? draft.weight
                          : gramsToField(currentGrams, weightUnit);
                      fields.weight.set(nextWeight);
                      updateDraft({ weight: nextWeight, weightUnit });
                    }}
                  />
                </>
              )}
            </Section>

            <Section title={t("feedingForm.outcome")}>
              <SwitchRow
                label={t("feedingForm.frozen")}
                checked={draft.frozen}
                onCheckedChange={(frozen) => updateDraft({ frozen })}
                theme={theme}
              />
              <SwitchRow
                label={t("feedingForm.refused")}
                checked={draft.refused}
                onCheckedChange={(refused) => updateDraft({ refused })}
                theme={theme}
              />
            </Section>

            <Section title={t("feedingForm.notes")}>
              <OutlinedTextField
                value={fields.notes}
                onValueChange={(value) => updateDraft({ notes: value })}
                colors={fieldColors(theme)}
                keyboardOptions={{ capitalization: "sentences" }}
                singleLine={false}
                minLines={3}
                maxLines={4}
                modifiers={[fillMaxWidth()]}
              >
                <OutlinedTextField.Label>
                  <Text>{t("feedingForm.notesPlaceholder")}</Text>
                </OutlinedTextField.Label>
              </OutlinedTextField>
            </Section>
          </Column>
        </Host>
      </Animated.ScrollView>

      <FormSheetTopBar
        namespace="feedingForm"
        editing={Boolean(activity)}
        saveDisabled={invalidWeight}
        onCancel={() => router.back()}
        onSave={handleSave}
        lifted={lifted}
        insetsTop={insets.top}
        iconSize={iconSize}
      />
    </View>
  );
}
