import {
  Box,
  Column,
  Host,
  OutlinedTextField,
  Text,
  useNativeState,
} from "@expo/ui/jetpack-compose";
import {
  background,
  border,
  clickable,
  clip,
  defaultMinSize,
  dropShadow,
  fillMaxWidth,
  height,
  offset,
  onGloballyPositioned,
  padding,
  semantics,
  Shapes,
  width,
} from "@expo/ui/jetpack-compose/modifiers";
import { router } from "expo-router";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Animated, BackHandler, useWindowDimensions, View } from "react-native";
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
import { Radius, Spacing, StackAboveFontScale } from "@/constants/theme";
import { composeTextStyle } from "@/constants/type-font-compose";
import { useFoodTypeSuggestions } from "@/hooks/use-food-type-suggestions";
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
  const foodTypeSelection = useNativeState({
    start: (activity?.foodType ?? "").length,
    end: (activity?.foodType ?? "").length,
  });
  const formOriginRef = useRef({ x: 0, y: 0 });
  const foodFieldLayoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const [overlayGeometry, setOverlayGeometry] = useState({
    offsetX: 0,
    offsetY: 0,
    width: 0,
  });
  const syncOverlayGeometry = () => {
    const next = {
      offsetX: foodFieldLayoutRef.current.x - formOriginRef.current.x,
      offsetY:
        foodFieldLayoutRef.current.y -
        formOriginRef.current.y +
        foodFieldLayoutRef.current.height,
      width: foodFieldLayoutRef.current.width,
    };
    setOverlayGeometry((prev) =>
      prev.offsetX === next.offsetX &&
      prev.offsetY === next.offsetY &&
      prev.width === next.width
        ? prev
        : next,
    );
  };
  const handleFormLayout = (layout: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => {
    formOriginRef.current = layout;
    syncOverlayGeometry();
  };
  const handleFoodFieldLayout = (layout: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => {
    foodFieldLayoutRef.current = layout;
    syncOverlayGeometry();
  };
  const { lifted, onScroll } = useScrollLift();
  const foodSuggestions = useFoodTypeSuggestions({
    animalId,
    text: fields.foodType,
    selection: foodTypeSelection,
    query: draft.foodType,
    onSelect: (value) => updateDraft({ foodType: value }),
  });

  const handleBackPress = useEffectEvent(() => {
    foodSuggestions.dismiss();
    return true;
  });

  useEffect(() => {
    if (!foodSuggestions.visible) return;
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      handleBackPress,
    );
    return () => subscription.remove();
  }, [foodSuggestions.visible]);

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
          <Box
            modifiers={[
              fillMaxWidth(),
              // eslint-disable-next-line react-hooks/refs -- runs from a native layout callback, never during render
              onGloballyPositioned(handleFormLayout),
            ]}
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
                  selection={foodTypeSelection}
                  onValueChange={(value) => updateDraft({ foodType: value })}
                  onFocusChanged={foodSuggestions.handleFocusChange}
                  colors={fieldColors(theme)}
                  keyboardOptions={{ capitalization: "sentences" }}
                  singleLine
                  modifiers={[
                    fillMaxWidth(),
                    // eslint-disable-next-line react-hooks/refs -- runs from a native layout callback, never during render
                    onGloballyPositioned(handleFoodFieldLayout),
                    semantics({ role: "dropdownList" }),
                  ]}
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
                        const nextWeight = convertWeightFieldOnUnitChange(
                          draft.weight,
                          draft.weightUnit,
                          weightUnit,
                          activity?.weight,
                        );
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

            {foodSuggestions.visible ? (
              <Box
                modifiers={[
                  offset(overlayGeometry.offsetX, overlayGeometry.offsetY),
                  width(overlayGeometry.width),
                ]}
              >
                <Box
                  modifiers={[
                    fillMaxWidth(),
                    height(
                      foodSuggestions.suggestions.length * 48 + Spacing.md * 2,
                    ),
                    clickable(foodSuggestions.dismiss, { indication: false }),
                  ]}
                />
                <Column
                  modifiers={[
                    fillMaxWidth(),
                    dropShadow(Shapes.RoundedCorner(Radius.xs), {
                      radius: 10,
                      offsetY: 3,
                      alpha: 0.3,
                    }),
                    clip(Shapes.RoundedCorner(Radius.xs)),
                    background(theme.surface),
                    border(1, theme.border),
                  ]}
                >
                  {foodSuggestions.suggestions.map((option) => (
                    <Box
                      key={option}
                      contentAlignment="centerStart"
                      modifiers={[
                        fillMaxWidth(),
                        defaultMinSize({ minHeight: 48 }),
                        clickable(() => foodSuggestions.select(option)),
                        padding(Spacing.md, 0, Spacing.md, 0),
                        semantics({
                          contentDescription: option,
                          role: "button",
                          mergeDescendants: true,
                        }),
                      ]}
                    >
                      <Text style={composeTextStyle("body")} color={theme.text}>
                        {option}
                      </Text>
                    </Box>
                  ))}
                </Column>
              </Box>
            ) : null}
          </Box>
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
