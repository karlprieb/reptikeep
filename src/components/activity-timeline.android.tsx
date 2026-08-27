import { Box, Column, Host, Icon, Row, Text } from "@expo/ui/jetpack-compose";
import {
  background,
  clickable,
  clip,
  fillMaxSize,
  fillMaxWidth,
  padding,
  semantics,
  Shapes,
  size,
  weight,
} from "@expo/ui/jetpack-compose/modifiers";
import { router } from "expo-router";
import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  StyleSheet,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { useTranslation } from "react-i18next";

import { EmptyStateContent } from "@/components/empty-state";
import {
  CategoryColors,
  Radius,
  Spacing,
  StackAboveFontScale,
  type Theme,
} from "@/constants/theme";
import { ActivityIcons } from "@/constants/activity-icons";
import { composeTextStyle } from "@/constants/type-font-compose";
import { useTheme } from "@/hooks/use-theme";
import { removeActivity } from "@/state/activity-stores";
import { useAnimalDefaults } from "@/state/logging-defaults";
import {
  previousOfSameType,
  type AnimalActivity,
} from "@/utils/animal-activity";
import { confirmDeleteActivity } from "@/utils/confirm-delete-activity";
import { describeActivity, describeChange } from "@/utils/describe-activity";
import { formatAbsoluteDate } from "@/utils/format-date";
import { panelRowHeight } from "@/utils/panel-row";
import type { WeightUnit } from "@/utils/weight-unit";

import CHEVRON_RIGHT_ICON from "@/assets/images/icons/chevron-right.xml";
import DELETE_ICON from "@/assets/images/icons/delete.xml";
import MODE_EDIT_ICON from "@/assets/images/icons/mode-edit.xml";
import TRENDING_DOWN_ICON from "@/assets/images/icons/trending-down.xml";
import TRENDING_FLAT_ICON from "@/assets/images/icons/trending-flat.xml";
import TRENDING_UP_ICON from "@/assets/images/icons/trending-up.xml";

export const VISIBLE_LIMIT = 20;
const BADGE_SIZE = 28;
const BADGE_MAX_SCALE = 2;
const SYMBOL_RATIO = 0.6;
const SWIPE_ACTION_WIDTH = 96;
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

const DIRECTION_ICON = {
  up: TRENDING_UP_ICON,
  down: TRENDING_DOWN_ICON,
  flat: TRENDING_FLAT_ICON,
};

function SwipeAction({
  icon,
  label,
  backgroundColor: bg,
  contentColor,
  rowHeight,
  onPress,
}: {
  icon: ImageSourcePropType;
  label: string;
  backgroundColor: string;
  contentColor: string;
  rowHeight: number;
  onPress: () => void;
}) {
  return (
    <Host
      style={{ width: SWIPE_ACTION_WIDTH, height: rowHeight }}
      matchContents={false}
    >
      <Box
        contentAlignment="center"
        modifiers={[fillMaxSize(), background(bg), clickable(onPress)]}
      >
        <Column
          horizontalAlignment="center"
          verticalArrangement={{ spacedBy: Spacing["2xs"] }}
        >
          <Icon source={icon} tint={contentColor} size={20} />
          <Text style={composeTextStyle("bodyS")} color={contentColor}>
            {label}
          </Text>
        </Column>
      </Box>
    </Host>
  );
}

type ActivityRowProps = {
  entry: AnimalActivity;
  previous?: AnimalActivity;
  theme: Theme;
  unit: WeightUnit;
  badgeSize: number;
  stacked: boolean;
  divided: boolean;
  rowHeight: number;
  rowBackground: string;
};

function ActivityRow({
  entry,
  previous,
  theme,
  unit,
  badgeSize,
  stacked,
  divided,
  rowHeight,
  rowBackground,
}: ActivityRowProps) {
  const { t } = useTranslation();
  const swipeableRef = useRef<InstanceType<typeof Swipeable>>(null);
  const typeName = t(`activity.type.${entry.type}`);
  const date = formatAbsoluteDate(entry.occurredAt);
  const { detail, flagged } = describeActivity(entry, t, unit);
  const change = describeChange(entry, previous, theme, t, unit);
  const animalId = entry.record.animalId;

  const openDetail = () =>
    router.push(
      `/animal/${animalId}/activity?type=${entry.type}&activityId=${entry.id}`,
    );

  const openEdit = () => {
    swipeableRef.current?.close();
    router.push(`/animal/${animalId}/${entry.type}?activityId=${entry.id}`);
  };

  const confirmDelete = () => {
    swipeableRef.current?.close();
    confirmDeleteActivity(
      t,
      typeName,
      () => removeActivity(entry.type, entry.id),
      entry.type === "medical",
    );
  };

  const title = (
    <Text
      style={composeTextStyle("body")}
      color={theme.text}
      maxLines={stacked ? 2 : 1}
      overflow="ellipsis"
    >
      {typeName}
    </Text>
  );

  const when = (
    <Text
      style={composeTextStyle("data")}
      color={theme.textSecondary}
      maxLines={1}
      overflow="ellipsis"
    >
      {date}
    </Text>
  );

  const since = change ? (
    <Row
      verticalAlignment="center"
      horizontalArrangement={{ spacedBy: Spacing["2xs"] }}
    >
      {change.direction ? (
        <Icon
          source={DIRECTION_ICON[change.direction]}
          tint={change.color}
          size={13}
        />
      ) : null}
      <Text
        style={composeTextStyle("bodyS")}
        color={change.color}
        maxLines={stacked ? 2 : 1}
        overflow="ellipsis"
      >
        {change.text}
      </Text>
    </Row>
  ) : null;

  const detailLine = detail ? (
    <Text
      style={composeTextStyle("bodyS")}
      color={flagged ? theme.warning : theme.textSecondary}
      maxLines={2}
      overflow="ellipsis"
    >
      {detail}
    </Text>
  ) : null;

  return (
    <View>
      {divided ? (
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
      ) : null}

      <Swipeable
        ref={swipeableRef}
        overshootLeft={false}
        overshootRight={false}
        renderLeftActions={() => (
          <SwipeAction
            icon={MODE_EDIT_ICON}
            label={t("timeline.swipe.edit")}
            backgroundColor={theme.primary}
            contentColor={theme.onPrimary}
            rowHeight={rowHeight}
            onPress={openEdit}
          />
        )}
        renderRightActions={() => (
          <SwipeAction
            icon={DELETE_ICON}
            label={t("timeline.swipe.delete")}
            backgroundColor={theme.danger}
            contentColor={theme.onPrimary}
            rowHeight={rowHeight}
            onPress={confirmDelete}
          />
        )}
      >
        <Host
          style={{
            width: "100%",
            height: rowHeight,
            backgroundColor: rowBackground,
          }}
          matchContents={false}
        >
          <Box
            contentAlignment="centerStart"
            modifiers={[
              fillMaxSize(),
              padding(Spacing.md, 0, Spacing.md, 0),
              clickable(openDetail),
              semantics({
                contentDescription: [typeName, date, detail, change?.spoken]
                  .filter((part): part is string => Boolean(part))
                  .join(", "),
                role: "button",
                mergeDescendants: true,
              }),
            ]}
          >
            <Row
              verticalAlignment="center"
              horizontalArrangement={{ spacedBy: Spacing.sm }}
              modifiers={[fillMaxWidth()]}
            >
              <Box
                contentAlignment="center"
                modifiers={[
                  size(badgeSize, badgeSize),
                  clip(Shapes.Circle),
                  background(CategoryColors[entry.type]),
                ]}
              >
                <Icon
                  source={ActivityIcons[entry.type]}
                  tint={theme.onPrimary}
                  size={Math.round(badgeSize * SYMBOL_RATIO)}
                />
              </Box>

              {stacked ? (
                <Column
                  horizontalAlignment="start"
                  verticalArrangement={{ spacedBy: Spacing["2xs"] }}
                  modifiers={[weight(1)]}
                >
                  {title}
                  {when}
                  {since}
                  {detailLine}
                </Column>
              ) : (
                <Row
                  verticalAlignment="center"
                  horizontalArrangement={{ spacedBy: Spacing.xs }}
                  modifiers={[weight(1)]}
                >
                  <Column
                    horizontalAlignment="start"
                    verticalArrangement={{ spacedBy: Spacing["2xs"] }}
                    modifiers={[weight(1)]}
                  >
                    {title}
                    {detailLine}
                  </Column>
                  <Column
                    horizontalAlignment="end"
                    verticalArrangement={{ spacedBy: Spacing["2xs"] }}
                  >
                    {when}
                    {since}
                  </Column>
                </Row>
              )}
            </Row>
          </Box>
        </Host>
      </Swipeable>
    </View>
  );
}

function SeeAllRow({
  count,
  theme,
  rowHeight,
  rowBackground,
  onPress,
}: {
  count: number;
  theme: Theme;
  rowHeight: number;
  rowBackground: string;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const label = t("timeline.showAll", { count });

  return (
    <View>
      <View style={[styles.divider, { backgroundColor: theme.border }]} />
      <Host
        style={{
          width: "100%",
          height: rowHeight,
          backgroundColor: rowBackground,
        }}
        matchContents={false}
      >
        <Box
          contentAlignment="centerStart"
          modifiers={[
            fillMaxSize(),
            padding(Spacing.md, 0, Spacing.md, 0),
            clickable(onPress),
          ]}
        >
          <Row
            verticalAlignment="center"
            horizontalArrangement="spaceBetween"
            modifiers={[fillMaxWidth()]}
          >
            <Text style={composeTextStyle("body")} color={theme.primary}>
              {label}
            </Text>
            <Icon
              source={CHEVRON_RIGHT_ICON}
              tint={theme.textMuted}
              size={16}
            />
          </Row>
        </Box>
      </Host>
    </View>
  );
}

const HISTORY_PAGE = 60;

export type ActivityHistoryListProps = {
  entries: AnimalActivity[];
  animalId: string;
  background?: string;
  header?: ReactNode;
  scrollY?: Animated.Value;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

export function ActivityHistoryList({
  entries,
  animalId,
  background: backgroundColor,
  header,
  scrollY,
  contentContainerStyle,
}: ActivityHistoryListProps) {
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();
  const { weightUnit } = useAnimalDefaults(animalId);
  const [limit, setLimit] = useState(HISTORY_PAGE);
  const [localScrollY] = useState(() => new Animated.Value(0));
  const rowBackground = backgroundColor ?? theme.bg;

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

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY ?? localScrollY } } }],
    { useNativeDriver: true, listener: growNearEnd },
  );

  return (
    <Animated.ScrollView
      style={[
        styles.historyScroll,
        backgroundColor ? { backgroundColor } : null,
      ]}
      contentContainerStyle={contentContainerStyle}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      {header}
      <View>
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
            rowHeight={rowHeight}
            rowBackground={rowBackground}
          />
        ))}
      </View>
    </Animated.ScrollView>
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

  const previous = useMemo(() => previousOfSameType(entries), [entries]);
  const rowHeight = panelRowHeight(
    stacked ? STACKED_ROW_BLOCKS : ROW_BLOCKS,
    fontScale,
    badgeSize,
  );

  if (visible.length === 0) {
    return (
      <Host
        style={styles.host}
        matchContents={{ horizontal: false, vertical: true }}
      >
        <Column
          verticalArrangement="top"
          modifiers={[
            fillMaxWidth(),
            clip(Shapes.RoundedCorner(Radius.lg)),
            background(theme.surface),
          ]}
        >
          <EmptyStateContent
            title={t("timeline.empty.title")}
            description={t("timeline.empty.subtitle", { animalName })}
            action={{
              label: t("timeline.empty.action"),
              onPress: onAddActivity,
            }}
          />
        </Column>
      </Host>
    );
  }

  return (
    <View
      style={[
        styles.panel,
        { backgroundColor: theme.surface, borderColor: theme.border },
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
          rowHeight={rowHeight}
          rowBackground={theme.surface}
        />
      ))}

      {seeAll ? (
        <SeeAllRow
          count={entries.length}
          theme={theme}
          rowHeight={rowHeight}
          rowBackground={theme.surface}
          onPress={seeAll}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    width: "100%",
  },
  historyScroll: {
    flex: 1,
  },
  panel: {
    width: "100%",
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    width: "100%",
  },
});
