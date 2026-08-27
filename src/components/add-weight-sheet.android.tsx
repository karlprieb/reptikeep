import { useSelector as useValue } from "@legendapp/state/react";
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
  asEditOf,
  DATA_STYLE,
  DateTimeField,
  fieldColors,
  FormSheetTopBar,
  formSheetAndroidStyles as styles,
  LabeledRow,
  optionalText,
  Section,
  SegmentedField,
  TOP_BAR_HEIGHT,
  useDraft,
  useScrollLift,
} from "@/components/form-sheet";
import { Spacing, StackAboveFontScale } from "@/constants/theme";
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
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { fontScale } = useWindowDimensions();
  const weights = useValue(weightStore.$);
  const { weightUnit } = animalDefaults(animalId);
  const [draft, updateDraft] = useDraft(() =>
    createInitialDraft(weightUnit, activity),
  );
  const weightText = useNativeState(gramsToField(activity?.weight, weightUnit));
  const notesText = useNativeState(activity?.notes ?? "");
  const { lifted, onScroll } = useScrollLift();

  const grams = weightFieldToGrams(
    draft.weight,
    draft.unit,
    activity && { grams: activity.weight, unit: weightUnit },
  );
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
          color: undefined,
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
              title={t("weightForm.weighIn")}
              footer={footer.text}
              footerColor={footer.color}
            >
              <OutlinedTextField
                value={weightText}
                onValueChange={(value) => updateDraft({ weight: value })}
                colors={fieldColors(theme)}
                keyboardOptions={{ keyboardType: "decimal" }}
                isError={invalid}
                autoFocus
                singleLine
                textStyle={DATA_STYLE}
                modifiers={[fillMaxWidth()]}
              >
                <OutlinedTextField.Label>
                  <Text>
                    {t("weightForm.weightPlaceholder", {
                      unit: t(`weightForm.unitShort.${draft.unit}`),
                    })}
                  </Text>
                </OutlinedTextField.Label>
              </OutlinedTextField>

              <SegmentedField
                value={draft.unit}
                options={WEIGHT_UNITS}
                labelFor={(unit) => t(`weightForm.unitShort.${unit}`)}
                onChange={(unit) => updateDraft({ unit })}
                theme={theme}
              />

              {previous ? (
                <LabeledRow label={t("weightForm.previous")} theme={theme}>
                  <Text style={DATA_STYLE} color={theme.textSecondary}>
                    {`${formatWeight(previous.weight, draft.unit)} · ${formatAbsoluteDate(previous.occurredAt)}`}
                  </Text>
                </LabeledRow>
              ) : null}

              {change ? (
                <LabeledRow label={t("weightForm.change")} theme={theme}>
                  <Text
                    style={DATA_STYLE}
                    color={change.implausible ? theme.warning : theme.text}
                  >
                    {`${formatWeightDelta(change.deltaGrams, draft.unit)} (${formatSignedPercent(change.percent)})`}
                  </Text>
                </LabeledRow>
              ) : null}
            </Section>

            <Section
              title={t("weightForm.timing")}
              footer={t("weightForm.timingHint", { animalName })}
            >
              <DateTimeField
                label={t("weightForm.when")}
                date={draft.occurredAt}
                onSelect={(value) => updateDraft({ occurredAt: value })}
                theme={theme}
                iconSize={iconSize}
                confirmLabel={t("newReptile.save")}
                dismissLabel={t("newReptile.cancel")}
                maxDate={new Date()}
              />
            </Section>

            <Section title={t("weightForm.notes")}>
              <OutlinedTextField
                value={notesText}
                onValueChange={(value) => updateDraft({ notes: value })}
                colors={fieldColors(theme)}
                keyboardOptions={{ capitalization: "sentences" }}
                singleLine={false}
                minLines={3}
                maxLines={4}
                modifiers={[fillMaxWidth()]}
              >
                <OutlinedTextField.Label>
                  <Text>{t("weightForm.notesPlaceholder")}</Text>
                </OutlinedTextField.Label>
              </OutlinedTextField>
            </Section>
          </Column>
        </Host>
      </Animated.ScrollView>

      <FormSheetTopBar
        namespace="weightForm"
        editing={Boolean(activity)}
        saveDisabled={!canSave}
        onCancel={() => router.back()}
        onSave={handleSave}
        lifted={lifted}
        insetsTop={insets.top}
        iconSize={iconSize}
      />
    </View>
  );
}
