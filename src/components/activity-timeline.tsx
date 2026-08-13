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
  onGeometryChange,
  onTapGesture,
  padding,
  scrollContentBackground,
  scrollDisabled,
  shapes,
  strokeBorder,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
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
import { weightChange } from "@/utils/weight-change";
import type { WeightUnit } from "@/utils/weight-unit";

export const VISIBLE_LIMIT = 8;
const BADGE_SIZE = 28;
const BADGE_MAX_SCALE = 2;
const SYMBOL_RATIO = 0.54;
const STACK_ABOVE_FONT_SCALE = 1.6;
const ROW_HEIGHT_ESTIMATE = 96;

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
  onMeasure: (height: number) => void;
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
  onMeasure,
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
          ...(stacked ? [] : [lineLimit(1)]),
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
        ...(stacked ? [] : [lineLimit(2)]),
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
            modifiers={[
              frame({ maxWidth: Infinity, alignment: "leading" }),
              onGeometryChange((geometry) => onMeasure(geometry.height)),
            ]}
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
  onMeasure,
}: {
  count: number;
  theme: Theme;
  rowHeight: number;
  textInset: number;
  onPress: () => void;
  onMeasure: (height: number) => void;
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
          modifiers={[
            frame({ maxWidth: Infinity, alignment: "leading" }),
            onGeometryChange((geometry) => onMeasure(geometry.height)),
          ]}
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

export function ActivityHistoryRow({
  entry,
  previous,
  divided,
}: {
  entry: AnimalActivity;
  previous?: AnimalActivity;
  divided: boolean;
}) {
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();
  const { weightUnit } = useAnimalDefaults(entry.record.animalId);
  const [measuredHeight, setMeasuredHeight] = useState<number>();
  const badgeSize = Math.round(
    BADGE_SIZE * Math.min(fontScale, BADGE_MAX_SCALE),
  );
  const stacked = fontScale >= STACK_ABOVE_FONT_SCALE;
  const estimate = Math.round(
    ROW_HEIGHT_ESTIMATE * Math.min(fontScale, BADGE_MAX_SCALE),
  );
  const rowHeight = measuredHeight
    ? Math.ceil(Math.max(badgeSize, measuredHeight)) + Spacing.sm * 2
    : estimate;

  return (
    <Host style={{ width: "100%", height: rowHeight }}>
      <ActivityRow
        entry={entry}
        previous={previous}
        theme={theme}
        unit={weightUnit}
        badgeSize={badgeSize}
        stacked={stacked}
        divided={divided}
        textInset={Spacing.md + badgeSize + Spacing.sm}
        rowHeight={rowHeight}
        onMeasure={setMeasuredHeight}
      />
    </Host>
  );
}

export function useMeasuredText() {
  const [heights, setHeights] = useState<Record<string, number>>({});

  const measure = useCallback(
    (key: string) => (height: number) =>
      setHeights((current) =>
        current[key] === height ? current : { ...current, [key]: height },
      ),
    [],
  );

  return { heights, measure };
}

export function uniformRowHeight(
  keys: string[],
  heights: Record<string, number>,
  badgeSize: number,
): number | undefined {
  const measured = keys.map((key) => heights[key]);
  if (measured.some((value) => value === undefined)) return undefined;

  return Math.ceil(Math.max(badgeSize, ...measured)) + Spacing.sm * 2;
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
  const stacked = fontScale >= STACK_ABOVE_FONT_SCALE;
  const visible = limit === undefined ? entries : entries.slice(0, limit);
  const seeAll = onSeeAll && entries.length > visible.length ? onSeeAll : null;

  const textInset = Spacing.md + badgeSize + Spacing.sm;

  const rowKeys = [
    ...visible.map((entry) => `${entry.type}:${entry.id}`),
    ...(seeAll ? ["see-all"] : []),
  ];
  const previous = previousOfSameType(entries);
  const { heights, measure } = useMeasuredText();

  const estimate = Math.round(
    ROW_HEIGHT_ESTIMATE * Math.min(fontScale, BADGE_MAX_SCALE),
  );
  const rowHeight = uniformRowHeight(rowKeys, heights, badgeSize) ?? estimate;
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
              onMeasure={measure(`${entry.type}:${entry.id}`)}
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
              onMeasure={measure("see-all")}
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
});
