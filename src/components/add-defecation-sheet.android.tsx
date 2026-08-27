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
  DateTimeField,
  fieldColors,
  FormSheetTopBar,
  formSheetAndroidStyles as styles,
  optionalText,
  Section,
  SegmentedField,
  SwitchRow,
  TOP_BAR_HEIGHT,
  useDraft,
  useScrollLift,
} from "@/components/form-sheet";
import { Spacing, StackAboveFontScale } from "@/constants/theme";
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
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { fontScale } = useWindowDimensions();
  const [draft, updateDraft] = useDraft(() =>
    createInitialDraft(animalId, activity),
  );
  const noteText = useNativeState(activity?.note ?? "");
  const { lifted, onScroll } = useScrollLift();

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
              title={t("defecationForm.observation")}
              footer={t("defecationForm.typeHint")}
            >
              <SegmentedField
                value={draft.type}
                options={DEFECATION_TYPES}
                labelFor={(type) => t(`timeline.poop.${type}`)}
                onChange={(type) => updateDraft({ type })}
                theme={theme}
              />
              <SwitchRow
                label={t("defecationForm.issues")}
                checked={draft.issues}
                onCheckedChange={(issues) => updateDraft({ issues })}
                theme={theme}
              />
            </Section>

            <Section
              title={t("defecationForm.timing")}
              footer={t("defecationForm.timingHint", { animalName })}
            >
              <DateTimeField
                label={t("defecationForm.when")}
                date={draft.occurredAt}
                onSelect={(value) => updateDraft({ occurredAt: value })}
                theme={theme}
                iconSize={iconSize}
                confirmLabel={t("newReptile.save")}
                dismissLabel={t("newReptile.cancel")}
                maxDate={new Date()}
              />
            </Section>

            <Section title={t("defecationForm.notes")}>
              <OutlinedTextField
                value={noteText}
                onValueChange={(note) => updateDraft({ note })}
                colors={fieldColors(theme)}
                keyboardOptions={{ capitalization: "sentences" }}
                singleLine={false}
                minLines={3}
                maxLines={4}
                modifiers={[fillMaxWidth()]}
              >
                <OutlinedTextField.Label>
                  <Text>{t("defecationForm.notesPlaceholder")}</Text>
                </OutlinedTextField.Label>
              </OutlinedTextField>
            </Section>
          </Column>
        </Host>
      </Animated.ScrollView>

      <FormSheetTopBar
        namespace="defecationForm"
        editing={Boolean(activity)}
        saveDisabled={false}
        onCancel={() => router.back()}
        onSave={handleSave}
        lifted={lifted}
        insetsTop={insets.top}
        iconSize={iconSize}
      />
    </View>
  );
}
