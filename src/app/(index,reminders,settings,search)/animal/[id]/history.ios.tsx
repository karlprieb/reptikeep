import { Button, HStack, Host, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import {
  accessibilityElement,
  accessibilityHint,
  accessibilityLabel,
  background,
  buttonStyle,
  clipShape,
  foregroundStyle,
  frame,
  strokeBorder,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import { Stack } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

import {
  ActivityHistoryList,
  ActivityPanel,
} from "@/components/activity-timeline";
import { ActivityTypeFilter } from "@/components/activity-type-filter";
import { AddActivitySheet } from "@/components/add-activity-sheet";
import { AnimalNotFound, useAnimalRoute } from "@/components/animal-route";
import { EmptyStateContent } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import {
  MaxContentWidth,
  Radius,
  Spacing,
  StackAboveFontScale,
} from "@/constants/theme";
import { typeFont } from "@/constants/type-font";
import { useAddActivity } from "@/hooks/use-add-activity";
import { useHistoryFilters } from "@/hooks/use-history-filters";
import { useTheme } from "@/hooks/use-theme";
import { RANGE_PRESETS } from "@/utils/activity-filter";
import { formatAbsoluteDate } from "@/utils/format-date";

function RangeSummaryRow({
  from,
  to,
  count,
  stacked,
  onClear,
}: {
  from: string;
  to: string;
  count: number;
  stacked: boolean;
  onClear: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();

  const spanText = t("timeline.range.span", {
    from: formatAbsoluteDate(from),
    to: formatAbsoluteDate(to),
  });
  const countText = t("timeline.filtered.count", { count });

  const summary = (
    <>
      <VStack
        alignment="leading"
        spacing={Spacing["2xs"]}
        modifiers={[
          frame({ maxWidth: Infinity, alignment: "leading" }),
          accessibilityElement("combine"),
          accessibilityLabel(`${spanText}, ${countText}`),
        ]}
      >
        <Text modifiers={[typeFont("data"), foregroundStyle(theme.text)]}>
          {spanText}
        </Text>
        <Text modifiers={[typeFont("bodyS"), foregroundStyle(theme.textMuted)]}>
          {countText}
        </Text>
      </VStack>

      {stacked ? null : <Spacer />}

      <Button
        label={t("timeline.range.clear")}
        onPress={onClear}
        modifiers={[
          buttonStyle("plain"),
          typeFont("body"),
          foregroundStyle(theme.accentInk),
          tint(theme.accentInk),
          accessibilityLabel(t("timeline.range.clear")),
          accessibilityHint(t("timeline.range.clearHint")),
        ]}
      />
    </>
  );

  return (
    <Host
      style={styles.rangeHost}
      matchContents={{ horizontal: false, vertical: true }}
    >
      {stacked ? (
        <VStack
          alignment="leading"
          spacing={Spacing.xs}
          modifiers={[frame({ maxWidth: Infinity })]}
        >
          {summary}
        </VStack>
      ) : (
        <HStack
          alignment="center"
          spacing={Spacing.xs}
          modifiers={[frame({ maxWidth: Infinity })]}
        >
          {summary}
        </HStack>
      )}
    </Host>
  );
}

function FilteredEmptyPanel({
  animalName,
  onClear,
}: {
  animalName: string;
  onClear: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Host
      style={styles.panelHost}
      matchContents={{ horizontal: false, vertical: true }}
    >
      <VStack
        spacing={0}
        modifiers={[
          frame({ maxWidth: Infinity }),
          background(theme.surface),
          clipShape("roundedRectangle", Radius.lg),
          strokeBorder({
            color: theme.border,
            style: { lineWidth: StyleSheet.hairlineWidth },
            shape: "roundedRectangle",
            cornerRadius: Radius.lg,
          }),
        ]}
      >
        <EmptyStateContent
          title={t("timeline.filtered.empty.title")}
          description={t("timeline.filtered.empty.subtitle", { animalName })}
          systemImage="line.3.horizontal.decrease.circle"
          action={{
            label: t("timeline.filtered.empty.action"),
            onPress: onClear,
          }}
        />
      </VStack>
    </Host>
  );
}

export default function AnimalHistoryScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { fontScale } = useWindowDimensions();
  const { id, animal } = useAnimalRoute();
  const {
    entries,
    types,
    filter,
    activeType,
    shown,
    range,
    activeRange,
    setType,
    setPreset,
    clearFilters,
    openCustomRange,
  } = useHistoryFilters(id);
  const addActivity = useAddActivity(animal?.id);

  if (!animal) return <AnimalNotFound />;

  const stacked = fontScale >= StackAboveFontScale;

  const filterBar = (
    <View style={styles.filterBar}>
      {types.length > 1 ? (
        <ActivityTypeFilter
          types={types}
          selected={activeType}
          onSelect={setType}
        />
      ) : null}
      {range ? (
        <RangeSummaryRow
          from={range.from}
          to={range.to}
          count={shown.length}
          stacked={stacked}
          onClear={() => setPreset("all")}
        />
      ) : null}
    </View>
  );

  return (
    <>
      {entries.length === 0 ? (
        <ScrollView
          style={[{ backgroundColor: theme.bg }, styles.list]}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.content}
        >
          <View style={styles.panelWrap}>
            <ActivityPanel
              entries={entries}
              animalId={id}
              animalName={animal.name}
              onAddActivity={addActivity.open}
            />
          </View>
        </ScrollView>
      ) : shown.length === 0 ? (
        <ScrollView
          style={[{ backgroundColor: theme.bg }, styles.list]}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.content}
        >
          {filterBar}
          <View style={styles.panelWrap}>
            <FilteredEmptyPanel
              animalName={animal.name}
              onClear={clearFilters}
            />
          </View>
        </ScrollView>
      ) : (
        <ActivityHistoryList
          entries={shown}
          animalId={id}
          background={theme.bg}
          header={filterBar}
        />
      )}

      <PageHeader
        title={t("timeline.historyTitle")}
        actions={[
          {
            key: "add",
            icon: "plus",
            tintColor: theme.text,
            accessibilityLabel: t("animal.addActivity"),
            onPress: addActivity.open,
          },
        ]}
        menu={
          <Stack.Toolbar.Menu
            icon={
              activeRange
                ? "line.3.horizontal.decrease.circle.fill"
                : "line.3.horizontal.decrease.circle"
            }
            tintColor={activeRange ? theme.text : theme.textSecondary}
            accessibilityLabel={t("timeline.range.label")}
            accessibilityHint={t("timeline.range.hint")}
          >
            <Stack.Toolbar.Menu inline>
              {RANGE_PRESETS.map((preset) => (
                <Stack.Toolbar.MenuAction
                  key={preset}
                  isOn={filter.preset === preset}
                  onPress={() => setPreset(preset)}
                >
                  {t(`timeline.range.${preset}`)}
                </Stack.Toolbar.MenuAction>
              ))}
            </Stack.Toolbar.Menu>
            <Stack.Toolbar.Menu inline>
              <Stack.Toolbar.MenuAction
                icon="calendar"
                isOn={filter.preset === "custom"}
                onPress={openCustomRange}
              >
                {t("timeline.range.custom")}
              </Stack.Toolbar.MenuAction>
            </Stack.Toolbar.Menu>
          </Stack.Toolbar.Menu>
        }
      />

      <AddActivitySheet
        visible={addActivity.visible}
        animalName={animal.name}
        onClose={addActivity.close}
        onDismiss={addActivity.dismiss}
        onPick={addActivity.pick}
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    width: "100%",
  },
  content: {
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  panelWrap: {
    paddingHorizontal: Spacing.md,
  },
  filterBar: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  rangeHost: {
    width: "100%",
  },
  panelHost: {
    width: "100%",
  },
});
