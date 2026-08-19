import {
  Button,
  Circle,
  Divider,
  HStack,
  Host,
  Image,
  List,
  SwipeActions,
  Text,
  VStack,
  ZStack,
} from "@expo/ui/swift-ui";
import {
  accessibilityAddTraits,
  accessibilityElement,
  accessibilityHint,
  accessibilityLabel,
  background,
  clipShape,
  contentShape,
  fixedSize,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  listRowBackground,
  listRowInsets,
  listRowSeparator,
  listRowSpacing,
  listStyle,
  onTapGesture,
  padding,
  scrollContentBackground,
  scrollDisabled,
  shapes,
  strokeBorder,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import { router } from "expo-router";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import { EmptyStateContent } from "@/components/empty-state";
import {
  ActivitySymbols,
  CategoryColors,
  Radius,
  Spacing,
  type SFSymbolName,
  type Theme,
  StackAboveFontScale,
} from "@/constants/theme";
import { typeFont } from "@/constants/type-font";
import { useTheme } from "@/hooks/use-theme";
import { removeActivity } from "@/state/activity-stores";
import { useAnimalDefaults } from "@/state/logging-defaults";
import {
  previousOfSameType,
  type AnimalActivity,
} from "@/utils/animal-activity";
import { confirmDeleteActivity } from "@/utils/confirm-delete-activity";
import { daysSince, formatAbsoluteDate } from "@/utils/format-date";
import {
  formatPercent,
  formatSignedPercent,
  formatWeight,
  formatWeightDelta,
} from "@/utils/format-number";
import { panelRowHeight } from "@/utils/panel-row";
import { weightChange } from "@/utils/weight-change";
import type { WeightUnit } from "@/utils/weight-unit";

export const VISIBLE_LIMIT = 20;
const BADGE_SIZE = 28;
const BADGE_MAX_SCALE = 2;
const SYMBOL_RATIO = 0.54;
const ROW_BLOCKS: Parameters<typeof panelRowHeight>[0] = [
  ["body", 1],
  ["bodyS", 2],
];
const STACKED_ROW_BLOCKS: Parameters<typeof panelRowHeight>[0] = [
  ["body", 2],
  ["data", 1],
  ["bodyS", 2],
  ["bodyS", 2],
];

function describeActivity(
  entry: AnimalActivity,
  t: TFunction,
  unit: WeightUnit,
): { detail: string | null; flagged: boolean } {
  switch (entry.type) {
    case "feed": {
      const { foodType, amount, weight, refused } = entry.record;
      const parts = [
        refused ? t("timeline.refused") : null,
        foodType,
        amount,
        weight != null ? formatWeight(weight, unit) : null,
      ].filter((part): part is string => Boolean(part));

      return { detail: parts.join(" · ") || null, flagged: refused };
    }
    case "weight":
      return {
        detail: formatWeight(entry.record.weight, unit),
        flagged: false,
      };
    case "shed":
      return {
        detail: entry.record.issues ? t("timeline.issues") : null,
        flagged: entry.record.issues,
      };
    case "poop": {
      const { type, issues } = entry.record;
      const parts = [
        t(`timeline.poop.${type}`),
        issues ? t("timeline.issues") : null,
      ].filter((part): part is string => Boolean(part));

      return { detail: parts.join(" · "), flagged: issues };
    }
    case "medical":
      return { detail: entry.record.summary, flagged: false };
    case "habitat": {
      const parts = [
        entry.record.water ? t("timeline.waterChanged") : null,
        entry.record.cleaning ? t("timeline.enclosureCleaned") : null,
      ].filter((part): part is string => Boolean(part));

      return { detail: parts.join(" · ") || null, flagged: false };
    }
  }
}

type RowChange = {
  text: string;
  spoken: string;
  color: string;
  symbol?: SFSymbolName;
};

function describeChange(
  entry: AnimalActivity,
  previous: AnimalActivity | undefined,
  theme: Theme,
  t: TFunction,
  unit: WeightUnit,
): RowChange | null {
  if (!previous || entry.type === "medical") return null;

  if (entry.type === "weight" && previous.type === "weight") {
    const { deltaGrams, percent } = weightChange(
      previous.record.weight,
      entry.record.weight,
    );

    return {
      text: `${formatWeight(Math.abs(deltaGrams), unit)} · ${formatPercent(percent)}`,
      spoken: `${t("weightForm.change")}: ${formatWeightDelta(deltaGrams, unit)} (${formatSignedPercent(percent)})`,
      color:
        deltaGrams > 0
          ? theme.success
          : deltaGrams < 0
            ? theme.danger
            : theme.textSecondary,
      symbol:
        deltaGrams > 0
          ? "arrow.up.right"
          : deltaGrams < 0
            ? "arrow.down.right"
            : "arrow.right",
    };
  }

  const days = daysSince(previous.occurredAt, new Date(entry.occurredAt));
  if (days === null) return null;

  const interval = t("timeline.sinceLast", { count: days });

  return { text: interval, spoken: interval, color: theme.textMuted };
}

type ActivityRowProps = {
  entry: AnimalActivity;
  previous?: AnimalActivity;
  theme: Theme;
  unit: WeightUnit;
  badgeSize: number;
  stacked: boolean;
  divided: boolean;
  textInset: number;
  rowHeight: number;
};

function ActivityRow({
  entry,
  previous,
  theme,
  unit,
  badgeSize,
  stacked,
  divided,
  textInset,
  rowHeight,
}: ActivityRowProps) {
  const { t } = useTranslation();
  const typeName = t(`activity.type.${entry.type}`);
  const date = formatAbsoluteDate(entry.occurredAt);
  const { detail, flagged } = describeActivity(entry, t, unit);
  const change = describeChange(entry, previous, theme, t, unit);
  const animalId = entry.record.animalId;

  const openDetail = () =>
    router.push(
      `/animal/${animalId}/activity?type=${entry.type}&activityId=${entry.id}`,
    );

  const openEdit = () =>
    router.push(`/animal/${animalId}/${entry.type}?activityId=${entry.id}`);

  const confirmDelete = () =>
    confirmDeleteActivity(
      t,
      typeName,
      () => removeActivity(entry.type, entry.id),
      entry.type === "medical",
    );

  const title = (
    <Text
      modifiers={[
        typeFont("body"),
        foregroundStyle(theme.text),
        lineLimit(stacked ? 2 : 1),
      ]}
    >
      {typeName}
    </Text>
  );

  const when = (
    <Text
      modifiers={[
        typeFont("data"),
        foregroundStyle(theme.textSecondary),
        lineLimit(1),
      ]}
    >
      {date}
    </Text>
  );

  const since = change ? (
    <HStack spacing={Spacing["2xs"]}>
      {change.symbol ? (
        <Image
          systemName={change.symbol}
          modifiers={[typeFont("bodyS"), foregroundStyle(change.color)]}
        />
      ) : null}
      <Text
        modifiers={[
          typeFont("bodyS"),
          foregroundStyle(change.color),
          ...(stacked ? [lineLimit(2)] : [lineLimit(1)]),
        ]}
      >
        {change.text}
      </Text>
    </HStack>
  ) : null;

  const detailLine = detail ? (
    <Text
      modifiers={[
        typeFont("bodyS"),
        foregroundStyle(flagged ? theme.warning : theme.textSecondary),
        lineLimit(2),
      ]}
    >
      {detail}
    </Text>
  ) : null;

  return (
    <SwipeActions
      modifiers={[
        listRowInsets({ top: 0, leading: 0, bottom: 0, trailing: 0 }),
        listRowBackground(theme.surface),
        listRowSeparator("hidden"),
      ]}
    >
      <VStack
        spacing={0}
        modifiers={[frame({ maxWidth: Infinity, height: rowHeight })]}
      >
        {divided ? (
          <Divider modifiers={[padding({ leading: textInset })]} />
        ) : null}

        <HStack
          alignment="center"
          spacing={Spacing.sm}
          modifiers={[
            padding({ horizontal: Spacing.md }),
            frame({ maxWidth: Infinity, maxHeight: Infinity }),
            contentShape(shapes.rectangle()),
            onTapGesture(openDetail),
            accessibilityElement("combine"),
            accessibilityAddTraits(["isButton"]),
            accessibilityLabel(
              [typeName, date, detail, change?.spoken]
                .filter((part): part is string => Boolean(part))
                .join(", "),
            ),
            accessibilityHint(t("timeline.openHint")),
          ]}
        >
          <ZStack modifiers={[frame({ width: badgeSize, height: badgeSize })]}>
            <Circle modifiers={[foregroundStyle(CategoryColors[entry.type])]} />
            <Image
              systemName={ActivitySymbols[entry.type]}
              modifiers={[
                font({
                  size: Math.round(badgeSize * SYMBOL_RATIO),
                  weight: "semibold",
                }),
                foregroundStyle(theme.onPrimary),
              ]}
            />
          </ZStack>

          <VStack
            alignment="leading"
            spacing={Spacing["2xs"]}
            modifiers={[frame({ maxWidth: Infinity, alignment: "leading" })]}
          >
            {stacked ? (
              <>
                {title}
                {when}
                {since}
                {detailLine}
              </>
            ) : (
              <HStack
                alignment="center"
                spacing={Spacing.xs}
                modifiers={[frame({ maxWidth: Infinity })]}
              >
                <VStack
                  alignment="leading"
                  spacing={Spacing["2xs"]}
                  modifiers={[
                    frame({ maxWidth: Infinity, alignment: "leading" }),
                  ]}
                >
                  {title}
                  {detailLine}
                </VStack>

                <VStack
                  alignment="trailing"
                  spacing={Spacing["2xs"]}
                  modifiers={[fixedSize({ horizontal: true })]}
                >
                  {when}
                  {since}
                </VStack>
              </HStack>
            )}
          </VStack>
        </HStack>
      </VStack>

      <SwipeActions.Actions edge="leading">
        <Button
          label={t("timeline.swipe.edit")}
          systemImage="square.and.pencil"
          onPress={openEdit}
          modifiers={[tint(theme.primary)]}
        />
      </SwipeActions.Actions>

      <SwipeActions.Actions edge="trailing">
        <Button
          label={t("timeline.swipe.delete")}
          systemImage="trash"
          onPress={confirmDelete}
          modifiers={[tint(theme.danger)]}
        />
      </SwipeActions.Actions>
    </SwipeActions>
  );
}

function SeeAllRow({
  count,
  theme,
  rowHeight,
  textInset,
  onPress,
}: {
  count: number;
  theme: Theme;
  rowHeight: number;
  textInset: number;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const label = t("timeline.showAll", { count });

  return (
    <VStack
      spacing={0}
      modifiers={[
        frame({ maxWidth: Infinity, height: rowHeight }),
        listRowInsets({ top: 0, leading: 0, bottom: 0, trailing: 0 }),
        listRowBackground(theme.surface),
        listRowSeparator("hidden"),
      ]}
    >
      <Divider modifiers={[padding({ leading: textInset })]} />

      <HStack
        alignment="center"
        spacing={Spacing.xs}
        modifiers={[
          padding({ leading: textInset, trailing: Spacing.md }),
          frame({ maxWidth: Infinity, maxHeight: Infinity }),
          contentShape(shapes.rectangle()),
          onTapGesture(onPress),
          accessibilityElement("combine"),
          accessibilityAddTraits(["isButton"]),
          accessibilityLabel(label),
          accessibilityHint(t("timeline.showAllHint")),
        ]}
      >
        <VStack
          alignment="leading"
          modifiers={[frame({ maxWidth: Infinity, alignment: "leading" })]}
        >
          <Text modifiers={[typeFont("body"), foregroundStyle(theme.primary)]}>
            {label}
          </Text>
        </VStack>

        <Image
          systemName="chevron.right"
          modifiers={[typeFont("bodyS"), foregroundStyle(theme.textMuted)]}
        />
      </HStack>
    </VStack>
  );
}

const HISTORY_PAGE = 60;

export type ActivityHistoryListProps = {
  entries: AnimalActivity[];
  animalId: string;
  background?: string;
  header?: ReactNode;
};

export function ActivityHistoryList({
  entries,
  animalId,
  background,
  header,
}: ActivityHistoryListProps) {
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();
  const { weightUnit } = useAnimalDefaults(animalId);
  const [limit, setLimit] = useState(HISTORY_PAGE);

  const badgeSize = Math.round(
    BADGE_SIZE * Math.min(fontScale, BADGE_MAX_SCALE),
  );
  const stacked = fontScale >= StackAboveFontScale;
  const rowHeight = panelRowHeight(
    stacked ? STACKED_ROW_BLOCKS : ROW_BLOCKS,
    fontScale,
    badgeSize,
  );
  const previous = useMemo(() => previousOfSameType(entries), [entries]);
  const visible = entries.slice(0, limit);

  const growNearEnd = useCallback(
    ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement, contentSize } = nativeEvent;
      const remaining =
        contentSize.height - contentOffset.y - layoutMeasurement.height;

      if (remaining < layoutMeasurement.height * 2) {
        setLimit((current) => Math.min(current + HISTORY_PAGE, entries.length));
      }
    },
    [entries.length],
  );

  return (
    <ScrollView
      style={[
        styles.historyHost,
        background ? { backgroundColor: background } : null,
      ]}
      contentInsetAdjustmentBehavior="automatic"
      onScroll={growNearEnd}
      scrollEventThrottle={64}
    >
      {header}
      <Host
        style={[styles.historyList, { height: rowHeight * visible.length }]}
        matchContents={false}
      >
        <List
          modifiers={[
            listStyle("plain"),
            scrollDisabled(true),
            listRowSpacing(0),
            scrollContentBackground("hidden"),
            frame({ height: rowHeight * visible.length }),
          ]}
        >
          {visible.map((entry, index) => (
            <ActivityRow
              key={`${entry.type}:${entry.id}`}
              entry={entry}
              previous={previous[`${entry.type}:${entry.id}`]}
              theme={theme}
              unit={weightUnit}
              badgeSize={badgeSize}
              stacked={stacked}
              divided={index > 0}
              textInset={Spacing.md + badgeSize + Spacing.sm}
              rowHeight={rowHeight}
            />
          ))}
        </List>
      </Host>
    </ScrollView>
  );
}

export type ActivityPanelProps = {
  entries: AnimalActivity[];
  animalId: string;
  animalName: string;
  onAddActivity: () => void;
  limit?: number;
  onSeeAll?: () => void;
};

export function ActivityPanel({
  entries,
  animalId,
  animalName,
  onAddActivity,
  limit,
  onSeeAll,
}: ActivityPanelProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { fontScale } = useWindowDimensions();
  const { weightUnit } = useAnimalDefaults(animalId);

  const badgeSize = Math.round(
    BADGE_SIZE * Math.min(fontScale, BADGE_MAX_SCALE),
  );
  const stacked = fontScale >= StackAboveFontScale;
  const visible = limit === undefined ? entries : entries.slice(0, limit);
  const seeAll = onSeeAll && entries.length > visible.length ? onSeeAll : null;

  const textInset = Spacing.md + badgeSize + Spacing.sm;

  const previous = useMemo(() => previousOfSameType(entries), [entries]);
  const rowHeight = panelRowHeight(
    stacked ? STACKED_ROW_BLOCKS : ROW_BLOCKS,
    fontScale,
    badgeSize,
  );
  const panelHeight = rowHeight * (visible.length + (seeAll ? 1 : 0));

  const panel = [
    frame({ maxWidth: Infinity }),
    background(theme.surface),
    clipShape("roundedRectangle", Radius.lg),
    strokeBorder({
      color: theme.border,
      style: { lineWidth: StyleSheet.hairlineWidth },
      shape: "roundedRectangle",
      cornerRadius: Radius.lg,
    }),
  ];

  return (
    <Host
      style={styles.panelHost}
      matchContents={{ horizontal: false, vertical: true }}
    >
      {visible.length === 0 ? (
        <VStack spacing={0} modifiers={panel}>
          <EmptyStateContent
            title={t("timeline.empty.title")}
            description={t("timeline.empty.subtitle", { animalName })}
            systemImage="list.bullet"
            action={{
              label: t("timeline.empty.action"),
              onPress: onAddActivity,
            }}
          />
        </VStack>
      ) : (
        <List
          modifiers={[
            listStyle("plain"),
            scrollDisabled(true),
            listRowSpacing(0),
            scrollContentBackground("hidden"),
            ...panel,
            frame({ height: panelHeight }),
          ]}
        >
          {visible.map((entry, index) => (
            <ActivityRow
              key={`${entry.type}:${entry.id}`}
              entry={entry}
              previous={previous[`${entry.type}:${entry.id}`]}
              theme={theme}
              unit={weightUnit}
              badgeSize={badgeSize}
              stacked={stacked}
              divided={index > 0}
              textInset={textInset}
              rowHeight={rowHeight}
            />
          ))}

          {seeAll ? (
            <SeeAllRow
              key="see-all"
              count={entries.length}
              theme={theme}
              rowHeight={rowHeight}
              textInset={textInset}
              onPress={seeAll}
            />
          ) : null}
        </List>
      )}
    </Host>
  );
}

const styles = StyleSheet.create({
  panelHost: {
    width: "100%",
  },
  historyHost: {
    flex: 1,
  },
  historyList: {
    width: "100%",
    overflow: "hidden",
  },
});
