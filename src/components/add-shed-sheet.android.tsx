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
  SwitchRow,
  TOP_BAR_HEIGHT,
  useDraft,
  useScrollLift,
} from "@/components/form-sheet";
import { Spacing, StackAboveFontScale } from "@/constants/theme";
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
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { fontScale } = useWindowDimensions();
  const [draft, updateDraft] = useDraft(() => createInitialDraft(activity));
  const notesText = useNativeState(activity?.notes ?? "");
  const { lifted, onScroll } = useScrollLift();

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
              title={t("shedForm.timing")}
              footer={t("shedForm.timingHint", { animalName })}
            >
              <DateTimeField
                label={t("shedForm.when")}
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
              title={t("shedForm.observation")}
              footer={t("shedForm.issuesHint")}
            >
              <SwitchRow
                label={t("shedForm.issues")}
                checked={draft.issues}
                onCheckedChange={(issues) => updateDraft({ issues })}
                theme={theme}
              />
            </Section>

            <Section title={t("shedForm.notes")}>
              <OutlinedTextField
                value={notesText}
                onValueChange={(notes) => updateDraft({ notes })}
                colors={fieldColors(theme)}
                keyboardOptions={{ capitalization: "sentences" }}
                singleLine={false}
                minLines={3}
                maxLines={4}
                modifiers={[fillMaxWidth()]}
              >
                <OutlinedTextField.Label>
                  <Text>{t("shedForm.notesPlaceholder")}</Text>
                </OutlinedTextField.Label>
              </OutlinedTextField>
            </Section>
          </Column>
        </Host>
      </Animated.ScrollView>

      <FormSheetTopBar
        namespace="shedForm"
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
