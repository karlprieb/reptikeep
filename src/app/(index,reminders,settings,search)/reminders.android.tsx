import {
  Box,
  Button,
  Column,
  Host,
  Icon,
  IconButton,
  Row,
  Text,
} from "@expo/ui/jetpack-compose";
import {
  background,
  clickable,
  clip,
  fillMaxWidth,
  padding,
  semantics,
  Shapes,
  size,
  weight,
} from "@expo/ui/jetpack-compose/modifiers";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  AppState,
  Linking,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { useTranslation } from "react-i18next";

import { EmptyState } from "@/components/empty-state";
import { MaterialAppBar } from "@/components/material-app-bar";
import { ThemedText } from "@/components/themed-text";
import {
  CategoryColors,
  Radius,
  Spacing,
  StackAboveFontScale,
  type Theme,
} from "@/constants/theme";
import { composeTextStyle } from "@/constants/type-font-compose";
import { useTheme } from "@/hooks/use-theme";
import { useToday } from "@/hooks/use-today";
import { addAnimal, animals$, type Animal } from "@/state/animal";
import { careSchedules$, type CareRoutine } from "@/state/care-schedule";
import { createHabitatActivity, habitatStore } from "@/state/habitat";
import {
  reminderPermission,
  requestReminderPermission,
  rescheduleSoon,
  type ReminderPermission,
} from "@/state/notifications";
import { reminders$ } from "@/state/reminders";
import { summaries$, summaryLookups } from "@/state/summary";
import { careReminders, type CareReminder } from "@/utils/care-reminders";
import {
  daysSince,
  formatAbsoluteDate,
  formatClockTime,
  fromCalendarDate,
} from "@/utils/format-date";
import { panelRowHeight } from "@/utils/panel-row";
import { useSelector as useValue } from "@legendapp/state/react";

import CALENDAR_ICON from "@/assets/images/icons/calendar-month.xml";
import NOTIFICATIONS_OFF_ICON from "@/assets/images/icons/notifications-off.xml";
import RADIO_UNCHECKED_ICON from "@/assets/images/icons/radio-button-unchecked.xml";
import SPARKLE_ICON from "@/assets/images/icons/sparkle.xml";
import WATER_DROP_ICON from "@/assets/images/icons/water-drop.xml";

const ROUTINE_ICONS = {
  water: WATER_DROP_ICON,
  cleaning: SPARKLE_ICON,
} as const;

const BADGE_SIZE = 28;
const BADGE_MAX_SCALE = 2;
const SYMBOL_RATIO = 0.6;
const CHECKBOX_SYMBOL = 24;
const CHECKBOX_HIT = 48;
const SWIPE_ACTION_WIDTH = 96;
const REMINDERS_PAGE = 60;
const ROW_BLOCKS: Parameters<typeof panelRowHeight>[0] = [
  ["body", 1],
  ["bodyS", 1],
];
const STACKED_ROW_BLOCKS: Parameters<typeof panelRowHeight>[0] = [
  ["body", 2],
  ["bodyS", 2],
  ["data", 1],
  ["bodyS", 2],
];

type DueState = {
  text: string;
  color: string;
};

function markRoutineDone(animalId: string, routine: CareRoutine): void {
  habitatStore.add(
    createHabitatActivity({
      animalId,
      water: routine === "water",
      cleaning: routine === "cleaning",
    }),
  );
}

function stopReminding(animal: Animal, routine: CareRoutine): void {
  addAnimal({
    ...animal,
    reminders: { ...animal.reminders, [routine]: false },
  });
}

function SwipeAction({
  icon,
  label,
  backgroundColor: bg,
  contentColor,
  rowHeight,
  onPress,
}: {
  icon: typeof CALENDAR_ICON;
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
        modifiers={[
          size(SWIPE_ACTION_WIDTH, rowHeight),
          background(bg),
          clickable(onPress),
        ]}
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

type ReminderRowProps = {
  reminder: CareReminder;
  state: DueState;
  theme: Theme;
  badgeSize: number;
  stacked: boolean;
  divided: boolean;
  rowHeight: number;
  onStopReminding: () => void;
};

function ReminderRow({
  reminder,
  state,
  theme,
  badgeSize,
  stacked,
  divided,
  rowHeight,
  onStopReminding,
}: ReminderRowProps) {
  const { t } = useTranslation();
  const swipeableRef = useRef<InstanceType<typeof Swipeable>>(null);
  const routine = t(`reminders.routine.${reminder.routine}`);
  const due = formatAbsoluteDate(reminder.dueOn);

  const openDetail = () =>
    router.push(
      `/animal/${reminder.animalId}/habitat?routine=${reminder.routine}`,
    );

  const openEdit = () => {
    swipeableRef.current?.close();
    router.push(`/animal/${reminder.animalId}/edit`);
  };

  const stopReminding = () => {
    swipeableRef.current?.close();
    onStopReminding();
  };

  const name = (
    <Text
      style={composeTextStyle("body")}
      color={theme.text}
      maxLines={stacked ? 2 : 1}
      overflow="ellipsis"
    >
      {reminder.animalName}
    </Text>
  );

  const routineLine = (
    <Text
      style={composeTextStyle("bodyS")}
      color={theme.textSecondary}
      maxLines={2}
      overflow="ellipsis"
    >
      {routine}
    </Text>
  );

  const dueDate = (
    <Text
      style={composeTextStyle("data")}
      color={theme.textSecondary}
      maxLines={1}
      overflow="ellipsis"
    >
      {due}
    </Text>
  );

  const stateLine = (
    <Text
      style={composeTextStyle("bodyS")}
      color={state.color}
      maxLines={stacked ? 2 : 1}
      overflow="ellipsis"
    >
      {state.text}
    </Text>
  );

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
            icon={CALENDAR_ICON}
            label={t("reminders.swipe.schedule")}
            backgroundColor={theme.primary}
            contentColor={theme.onPrimary}
            rowHeight={rowHeight}
            onPress={openEdit}
          />
        )}
        renderRightActions={() => (
          <SwipeAction
            icon={NOTIFICATIONS_OFF_ICON}
            label={t("reminders.swipe.mute")}
            backgroundColor={theme.danger}
            contentColor={theme.onPrimary}
            rowHeight={rowHeight}
            onPress={stopReminding}
          />
        )}
      >
        <Host
          style={{
            width: "100%",
            height: rowHeight,
            backgroundColor: theme.surface,
          }}
          matchContents={false}
          seedColor={theme.primary}
        >
          <Row
            verticalAlignment="center"
            horizontalArrangement={{ spacedBy: Spacing.xs }}
            modifiers={[fillMaxWidth(), padding(Spacing.md, 0, Spacing.md, 0)]}
          >
            <Row
              verticalAlignment="center"
              horizontalArrangement={{ spacedBy: Spacing.sm }}
              modifiers={[
                weight(1),
                clickable(openDetail),
                semantics({
                  contentDescription: [
                    reminder.animalName,
                    routine,
                    state.text,
                    due,
                    t("a11y.reminders.row.hint"),
                  ].join(", "),
                  role: "button",
                  mergeDescendants: true,
                }),
              ]}
            >
              <Box
                contentAlignment="center"
                modifiers={[
                  size(badgeSize, badgeSize),
                  clip(Shapes.Circle),
                  background(CategoryColors.habitat),
                ]}
              >
                <Icon
                  source={ROUTINE_ICONS[reminder.routine]}
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
                  {name}
                  {routineLine}
                  {dueDate}
                  {stateLine}
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
                    {name}
                    {routineLine}
                  </Column>
                  <Column
                    horizontalAlignment="end"
                    verticalArrangement={{ spacedBy: Spacing["2xs"] }}
                  >
                    {dueDate}
                    {stateLine}
                  </Column>
                </Row>
              )}
            </Row>

            <IconButton
              onClick={() =>
                markRoutineDone(reminder.animalId, reminder.routine)
              }
              colors={{ contentColor: theme.primary }}
            >
              <Icon
                source={RADIO_UNCHECKED_ICON}
                tint={theme.primary}
                size={CHECKBOX_SYMBOL}
                contentDescription={[
                  t(`a11y.reminders.done.${reminder.routine}.label`, {
                    animalName: reminder.animalName,
                  }),
                  t(`a11y.reminders.done.${reminder.routine}.hint`),
                ].join(", ")}
              />
            </IconButton>
          </Row>
        </Host>
      </Swipeable>
    </View>
  );
}

type ReminderPanelProps = {
  items: CareReminder[];
  dueState: (reminder: CareReminder) => DueState;
  theme: Theme;
  badgeSize: number;
  checkboxSize: number;
  stacked: boolean;
  onStopReminding: (animalId: string, routine: CareRoutine) => void;
};

function ReminderPanel({
  items,
  dueState,
  theme,
  badgeSize,
  checkboxSize,
  stacked,
  onStopReminding,
}: ReminderPanelProps) {
  const { fontScale } = useWindowDimensions();
  const rowHeight = panelRowHeight(
    stacked ? STACKED_ROW_BLOCKS : ROW_BLOCKS,
    fontScale,
    Math.max(badgeSize, checkboxSize),
  );

  return (
    <View
      style={[
        styles.panel,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      {items.map((reminder, index) => (
        <ReminderRow
          key={`${reminder.animalId}:${reminder.routine}`}
          reminder={reminder}
          state={dueState(reminder)}
          theme={theme}
          badgeSize={badgeSize}
          stacked={stacked}
          divided={index > 0}
          rowHeight={rowHeight}
          onStopReminding={() =>
            onStopReminding(reminder.animalId, reminder.routine)
          }
        />
      ))}
    </View>
  );
}

type PermissionNoticeProps = {
  permission: Exclude<ReminderPermission, "granted">;
  time: string;
  theme: Theme;
  onGrant: (permission: ReminderPermission) => void;
};

function PermissionNotice({
  permission,
  time,
  theme,
  onGrant,
}: PermissionNoticeProps) {
  const { t } = useTranslation();
  const blocked = permission === "blocked";
  const label = blocked
    ? t("reminders.permission.openSettings")
    : t("reminders.permission.action");
  const hint = blocked
    ? t("a11y.reminders.openSettings.hint")
    : t("a11y.reminders.allow.hint");

  return (
    <View
      style={[
        styles.panel,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      <Host
        style={styles.host}
        matchContents={{ horizontal: false, vertical: true }}
        seedColor={theme.primary}
      >
        <Column
          modifiers={[
            fillMaxWidth(),
            padding(Spacing.md, Spacing.md, Spacing.md, Spacing.md),
          ]}
          verticalArrangement={{ spacedBy: Spacing.sm }}
        >
          <Row
            verticalAlignment="top"
            horizontalArrangement={{ spacedBy: Spacing.sm }}
          >
            <Icon
              source={NOTIFICATIONS_OFF_ICON}
              tint={theme.warning}
              size={24}
            />
            <Column
              horizontalAlignment="start"
              verticalArrangement={{ spacedBy: Spacing["2xs"] }}
              modifiers={[weight(1)]}
            >
              <Text style={composeTextStyle("heading")} color={theme.text}>
                {t("reminders.permission.title")}
              </Text>
              <Text
                style={composeTextStyle("bodyS")}
                color={theme.textSecondary}
              >
                {blocked
                  ? t("reminders.permission.blocked")
                  : t("reminders.permission.ask", { time })}
              </Text>
            </Column>
          </Row>

          <Button
            onClick={() => {
              if (blocked) Linking.openSettings();
              else
                void requestReminderPermission().then((next) => {
                  onGrant(next);
                  if (next === "granted") rescheduleSoon();
                });
            }}
            colors={{
              containerColor: theme.primary,
              contentColor: theme.onPrimary,
            }}
            modifiers={[
              fillMaxWidth(),
              semantics({
                contentDescription: [label, hint].join(", "),
                role: "button",
                mergeDescendants: true,
              }),
            ]}
          >
            <Text style={composeTextStyle("body")} color={theme.onPrimary}>
              {label}
            </Text>
          </Button>
        </Column>
      </Host>
    </View>
  );
}

export default function RemindersScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { fontScale } = useWindowDimensions();

  const animals = useValue(animals$);
  const collectionWater = useValue(careSchedules$.water);
  const collectionCleaning = useValue(careSchedules$.cleaning);
  const summaries = useValue(summaries$);
  const reminderTime = useValue(reminders$);
  const [permission, setPermission] = useState<ReminderPermission>();

  const [scrollY] = useState(() => new Animated.Value(0));
  const [appBarHeight, setAppBarHeight] = useState(0);
  const [limit, setLimit] = useState(REMINDERS_PAGE);

  useEffect(() => {
    const read = () => void reminderPermission().then(setPermission);
    read();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") read();
    });

    return () => subscription.remove();
  }, []);

  const handleStopReminding = (animalId: string, routine: CareRoutine) => {
    const animal = animals[animalId];
    if (animal) stopReminding(animal, routine);
  };

  const today = useToday();
  const reminders = useMemo(() => {
    const { lastWater, lastClean } = summaryLookups(summaries);

    return careReminders(
      animals,
      { water: collectionWater, cleaning: collectionCleaning },
      { water: lastWater, cleaning: lastClean },
    );
  }, [animals, collectionCleaning, collectionWater, summaries]);

  const dueState = (reminder: CareReminder): DueState => {
    if (reminder.dueOn < today) {
      return {
        text: t("schedule.overdue", { count: daysSince(reminder.dueOn) ?? 0 }),
        color: theme.danger,
      };
    }

    if (reminder.dueOn === today) {
      return { text: t("reminders.dueToday"), color: theme.textSecondary };
    }

    const dueDate = fromCalendarDate(reminder.dueOn);
    return {
      text: t("reminders.dueIn", {
        count: dueDate ? (daysSince(today, dueDate) ?? 0) : 0,
      }),
      color: theme.textMuted,
    };
  };

  const sections = [
    {
      key: "overdue",
      title: t("reminders.section.overdue"),
      items: reminders.filter((reminder) => reminder.dueOn < today),
    },
    {
      key: "today",
      title: t("reminders.section.today"),
      items: reminders.filter((reminder) => reminder.dueOn === today),
    },
    {
      key: "upcoming",
      title: t("reminders.section.upcoming"),
      items: reminders.filter((reminder) => reminder.dueOn > today),
    },
  ].filter((section) => section.items.length > 0);

  let remainingLimit = limit;
  const visibleSections = sections.map((section) => {
    const visibleItems = section.items.slice(0, Math.max(0, remainingLimit));
    remainingLimit -= visibleItems.length;
    return { ...section, visibleItems };
  });

  const growNearEnd = useCallback(
    ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement, contentSize } = nativeEvent;
      const remaining =
        contentSize.height - contentOffset.y - layoutMeasurement.height;

      if (remaining < layoutMeasurement.height * 2) {
        setLimit((current) =>
          Math.min(current + REMINDERS_PAGE, reminders.length),
        );
      }
    },
    [reminders.length],
  );

  const badgeSize = Math.round(
    BADGE_SIZE * Math.min(fontScale, BADGE_MAX_SCALE),
  );
  const stacked = fontScale >= StackAboveFontScale;
  const clockTime = formatClockTime(reminderTime.hour, reminderTime.minute);

  return (
    <>
      <Animated.ScrollView
        style={[styles.scroll, { backgroundColor: theme.bg }]}
        contentContainerStyle={[styles.content, { paddingTop: appBarHeight }]}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true, listener: growNearEnd },
        )}
      >
        {reminders.length === 0 ? (
          <EmptyState
            title={t("reminders.empty.title")}
            description={t("reminders.empty.subtitle")}
          />
        ) : (
          <>
            {permission && permission !== "granted" ? (
              <PermissionNotice
                permission={permission}
                time={clockTime}
                theme={theme}
                onGrant={setPermission}
              />
            ) : null}

            {visibleSections.map((section) => (
              <View key={section.key} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <ThemedText type="label" themeColor="textMuted">
                    {section.title.toUpperCase()}
                  </ThemedText>
                  <ThemedText type="data" themeColor="textMuted">
                    {section.items.length}
                  </ThemedText>
                </View>

                <ReminderPanel
                  items={section.visibleItems}
                  dueState={dueState}
                  theme={theme}
                  badgeSize={badgeSize}
                  checkboxSize={CHECKBOX_HIT}
                  stacked={stacked}
                  onStopReminding={handleStopReminding}
                />
              </View>
            ))}

            <ThemedText type="bodyS" themeColor="textMuted">
              {t("reminders.timeFooter", { time: clockTime })}
            </ThemedText>
          </>
        )}
      </Animated.ScrollView>

      <MaterialAppBar
        title={t("reminders.title")}
        scrollY={scrollY}
        onHeightChange={setAppBarHeight}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    width: "100%",
  },
  content: {
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing["2xl"],
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing["2xs"],
    gap: Spacing.sm,
  },
  host: {
    width: "100%",
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
