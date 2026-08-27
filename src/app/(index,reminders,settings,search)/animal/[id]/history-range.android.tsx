import { Column, Host } from "@expo/ui/jetpack-compose";
import { fillMaxWidth } from "@expo/ui/jetpack-compose/modifiers";
import { router, useLocalSearchParams } from "expo-router";
import { Animated, useWindowDimensions, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimalNotFound, useAnimalRoute } from "@/components/animal-route";
import {
  ACTION_ICON_SIZE,
  DateField,
  FormSheetTopBar,
  formSheetAndroidStyles as styles,
  Section,
  TOP_BAR_HEIGHT,
  useDraft,
  useScrollLift,
} from "@/components/form-sheet";
import { Spacing, StackAboveFontScale } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { fromCalendarDate, toCalendarDate } from "@/utils/format-date";

type RangeDraft = {
  from: Date;
  to: Date;
};

export default function HistoryRangeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { fontScale } = useWindowDimensions();
  const { animal } = useAnimalRoute();
  const { id, from, to, earliest, type } = useLocalSearchParams<{
    id?: string;
    from?: string;
    to?: string;
    earliest?: string;
    type?: string;
  }>();
  const { lifted, onScroll } = useScrollLift();

  const today = new Date();
  const earliestDate = fromCalendarDate(earliest ?? "") ?? today;
  const [draft, updateDraft] = useDraft<RangeDraft>(() => ({
    from: fromCalendarDate(from ?? "") ?? earliestDate,
    to: fromCalendarDate(to ?? "") ?? today,
  }));

  if (!animal) return <AnimalNotFound />;

  const handleSave = () =>
    router.dismissTo(
      `/animal/${id}/history?type=${type ?? ""}&preset=custom&from=${toCalendarDate(draft.from)}&to=${toCalendarDate(draft.to)}`,
    );

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
            <Section footer={t("timeline.range.customPrompt")}>
              <DateField
                label={t("timeline.range.from")}
                date={draft.from}
                onSelect={(value) => updateDraft({ from: value })}
                theme={theme}
                iconSize={iconSize}
                confirmLabel={t("timeline.range.apply")}
                dismissLabel={t("timeline.range.cancel")}
                minDate={earliestDate}
                maxDate={draft.to}
              />
              <DateField
                label={t("timeline.range.to")}
                date={draft.to}
                onSelect={(value) => updateDraft({ to: value })}
                theme={theme}
                iconSize={iconSize}
                confirmLabel={t("timeline.range.apply")}
                dismissLabel={t("timeline.range.cancel")}
                minDate={draft.from}
                maxDate={today}
              />
            </Section>
          </Column>
        </Host>
      </Animated.ScrollView>

      <FormSheetTopBar
        namespace="timeline.range"
        title={t("timeline.range.customTitle")}
        saveLabel={t("timeline.range.apply")}
        cancelLabel={t("timeline.range.cancel")}
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
