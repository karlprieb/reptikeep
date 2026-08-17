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
  buttonStyle,
  clipShape,
  contentShape,
  controlSize,
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
import { useValue } from "@legendapp/state/react";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AppState,
  Linking,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

import { EmptyState } from "@/components/empty-state";
import { IOSPageHeader } from "@/components/page-header";
import { ThemedText } from "@/components/themed-text";
import {
  CategoryColors,
  Radius,
  Spacing,
  type SFSymbolName,
  type Theme,
} from "@/constants/theme";
import { typeFont } from "@/constants/type-font";
import { useTheme } from "@/hooks/use-theme";
import { activityStores } from "@/state/activity-stores";
import { addAnimal, animals$, type Animal } from "@/state/animal";
import { careSchedules$, type CareRoutine } from "@/state/care-schedule";
import { createHabitatActivity, habitatStore } from "@/state/habitat";
import {
  reminderPermission,
  requestReminderPermission,
  type ReminderPermission,
} from "@/state/notifications";
import { reminders$ } from "@/state/reminders";
import { lastCareByAnimal } from "@/utils/animal-activity";
import { careReminders, type CareReminder } from "@/utils/care-reminders";
import {
  daysSince,
  formatAbsoluteDate,
  formatClockTime,
  fromCalendarDate,
  toCalendarDate,
} from "@/utils/format-date";

const ROUTINE_SYMBOLS: Record<CareRoutine, SFSymbolName> = {
  water: "drop.fill",
  cleaning: "sparkles",
};

const BADGE_SIZE = 28;
const BADGE_MAX_SCALE = 2;
const SYMBOL_RATIO = 0.54;
const STACK_ABOVE_FONT_SCALE = 1.6;
const CHECKBOX_SYMBOL = 22;
const CHECKBOX_HIT = 44;
const ROW_HEIGHT_ESTIMATE = 96;

type DueState = {
  text: string;
  color: string;
};

function panelModifiers(theme: Theme) {
  return [
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
}

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

type ReminderRowProps = {
  reminder: CareReminder;
  state: DueState;
  theme: Theme;
  badgeSize: number;
  checkboxSize: number;
  stacked: boolean;
  divided: boolean;
  textInset: number;
  rowHeight: number;
  onMeasure: (height: number) => void;
  onStopReminding: () => void;
};

function ReminderRow({
  reminder,
  state,
  theme,
  badgeSize,
  checkboxSize,
  stacked,
  divided,
  textInset,
  rowHeight,
  onMeasure,
  onStopReminding,
}: ReminderRowProps) {
  const { t } = useTranslation();
  const routine = t(`reminders.routine.${reminder.routine}`);
  const due = formatAbsoluteDate(reminder.dueOn);

  const name = (
    <Text
      modifiers={[
        typeFont("body"),
        foregroundStyle(theme.text),
        lineLimit(stacked ? 2 : 1),
      ]}
    >
      {reminder.animalName}
    </Text>
  );

  const routineLine = (
    <Text modifiers={[typeFont("bodyS"), foregroundStyle(theme.textSecondary)]}>
      {routine}
    </Text>
  );

  const dueDate = (
    <Text
      modifiers={[
        typeFont("data"),
        foregroundStyle(theme.textSecondary),
        lineLimit(1),
      ]}
    >
      {due}
    </Text>
  );

  const stateLine = (
    <Text
      modifiers={[
        typeFont("bodyS"),
        foregroundStyle(state.color),
        ...(stacked ? [] : [lineLimit(1)]),
      ]}
    >
      {state.text}
    </Text>
  );

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
          spacing={Spacing.xs}
          modifiers={[
            padding({ horizontal: Spacing.md }),
            frame({ maxWidth: Infinity, maxHeight: Infinity }),
          ]}
        >
          <HStack
            alignment="center"
            spacing={Spacing.sm}
            modifiers={[
              frame({ maxWidth: Infinity, maxHeight: Infinity }),
              contentShape(shapes.rectangle()),
              onTapGesture(() =>
                router.push(
                  `/animal/${reminder.animalId}/habitat?routine=${reminder.routine}`,
                ),
              ),
              accessibilityElement("combine"),
              accessibilityAddTraits(["isButton"]),
              accessibilityLabel(
                [reminder.animalName, routine, state.text, due].join(", "),
              ),
              accessibilityHint(t("a11y.reminders.row.hint")),
            ]}
          >
            <ZStack
              modifiers={[frame({ width: badgeSize, height: badgeSize })]}
            >
              <Circle modifiers={[foregroundStyle(CategoryColors.habitat)]} />
              <Image
                systemName={ROUTINE_SYMBOLS[reminder.routine]}
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
                  {name}
                  {routineLine}
                  {dueDate}
                  {stateLine}
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
                    {name}
                    {routineLine}
                  </VStack>

                  <VStack
                    alignment="trailing"
                    spacing={Spacing["2xs"]}
                    modifiers={[fixedSize({ horizontal: true })]}
                  >
                    {dueDate}
                    {stateLine}
                  </VStack>
                </HStack>
              )}
            </VStack>
          </HStack>

          <Button
            onPress={() => markRoutineDone(reminder.animalId, reminder.routine)}
            modifiers={[
              buttonStyle("borderless"),
              frame({ width: checkboxSize, height: checkboxSize }),
              contentShape(shapes.rectangle()),
              accessibilityLabel(
                t(`a11y.reminders.done.${reminder.routine}.label`, {
                  animalName: reminder.animalName,
                }),
              ),
              accessibilityHint(
                t(`a11y.reminders.done.${reminder.routine}.hint`),
              ),
            ]}
          >
            <Image
              systemName="circle"
              modifiers={[
                font({
                  size: Math.round(
                    checkboxSize * (CHECKBOX_SYMBOL / CHECKBOX_HIT),
                  ),
                }),
                foregroundStyle(theme.primary),
              ]}
            />
          </Button>
        </HStack>
      </VStack>

      <SwipeActions.Actions edge="leading">
        <Button
          label={t("reminders.swipe.schedule")}
          systemImage="calendar"
          onPress={() => router.push(`/animal/${reminder.animalId}/edit`)}
          modifiers={[tint(theme.primary)]}
        />
      </SwipeActions.Actions>

      <SwipeActions.Actions edge="trailing">
        <Button
          label={t("reminders.swipe.mute")}
          systemImage="bell.slash"
          onPress={onStopReminding}
          modifiers={[tint(theme.danger)]}
        />
      </SwipeActions.Actions>
    </SwipeActions>
  );
}

type ReminderPanelProps = {
  items: CareReminder[];
  dueState: (reminder: CareReminder) => DueState;
  theme: Theme;
  badgeSize: number;
  checkboxSize: number;
  stacked: boolean;
  textInset: number;
  onStopReminding: (animalId: string, routine: CareRoutine) => void;
};

function ReminderPanel({
  items,
  dueState,
  theme,
  badgeSize,
  checkboxSize,
  stacked,
  textInset,
  onStopReminding,
}: ReminderPanelProps) {
  const { fontScale } = useWindowDimensions();
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const measure = useCallback(
    (height: number) =>
      setMeasuredHeight((current) => Math.max(current, Math.ceil(height))),
    [],
  );

  const floor = Math.max(badgeSize, checkboxSize);
  const estimate = Math.round(
    ROW_HEIGHT_ESTIMATE * Math.min(fontScale, BADGE_MAX_SCALE),
  );
  const rowHeight = measuredHeight
    ? Math.max(floor, measuredHeight) + Spacing.sm * 2
    : estimate;

  return (
    <Host
      style={styles.host}
      matchContents={{ horizontal: false, vertical: true }}
    >
      <List
        modifiers={[
          listStyle("plain"),
          scrollDisabled(true),
          listRowSpacing(0),
          scrollContentBackground("hidden"),
          ...panelModifiers(theme),
          frame({ height: rowHeight * items.length }),
        ]}
      >
        {items.map((reminder, index) => (
          <ReminderRow
            key={`${reminder.animalId}:${reminder.routine}`}
            reminder={reminder}
            state={dueState(reminder)}
            theme={theme}
            badgeSize={badgeSize}
            checkboxSize={checkboxSize}
            stacked={stacked}
            divided={index > 0}
            textInset={textInset}
            rowHeight={rowHeight}
            onMeasure={measure}
            onStopReminding={() =>
              onStopReminding(reminder.animalId, reminder.routine)
            }
          />
        ))}
      </List>
    </Host>
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

  return (
    <Host
      style={styles.host}
      matchContents={{ horizontal: false, vertical: true }}
    >
      <VStack
        alignment="leading"
        spacing={Spacing.sm}
        modifiers={[...panelModifiers(theme), padding({ all: Spacing.md })]}
      >
        <HStack alignment="top" spacing={Spacing.sm}>
          <Image
            systemName="bell.slash"
            modifiers={[typeFont("heading"), foregroundStyle(theme.warning)]}
          />
          <VStack alignment="leading" spacing={Spacing["2xs"]}>
            <Text
              modifiers={[typeFont("heading"), foregroundStyle(theme.text)]}
            >
              {t("reminders.permission.title")}
            </Text>
            <Text
              modifiers={[
                typeFont("bodyS"),
                foregroundStyle(theme.textSecondary),
              ]}
            >
              {blocked
                ? t("reminders.permission.blocked")
                : t("reminders.permission.ask", { time })}
            </Text>
          </VStack>
        </HStack>

        <Button
          label={
            blocked
              ? t("reminders.permission.openSettings")
              : t("reminders.permission.action")
          }
          onPress={() => {
            if (blocked) Linking.openSettings();
            else void requestReminderPermission().then(onGrant);
          }}
          modifiers={[
            typeFont("body"),
            buttonStyle("glassProminent"),
            controlSize("large"),
            tint(theme.primary),
            foregroundStyle(theme.onPrimary),
            accessibilityHint(
              blocked
                ? t("a11y.reminders.openSettings.hint")
                : t("a11y.reminders.allow.hint"),
            ),
          ]}
        />
      </VStack>
    </Host>
  );
}

export default function RemindersScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { fontScale } = useWindowDimensions();

  const animals = useValue(animals$);
  const collectionWater = useValue(careSchedules$.water);
  const collectionCleaning = useValue(careSchedules$.cleaning);
  const habitats = useValue(activityStores.habitat.$);
  const reminderTime = useValue(reminders$);
  const [permission, setPermission] = useState<ReminderPermission>();

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

  const today = toCalendarDate(new Date());
  const reminders = useMemo(
    () =>
      careReminders(
        animals,
        { water: collectionWater, cleaning: collectionCleaning },
        lastCareByAnimal(habitats),
      ),
    [animals, collectionCleaning, collectionWater, habitats],
  );

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

  const badgeSize = Math.round(
    BADGE_SIZE * Math.min(fontScale, BADGE_MAX_SCALE),
  );
  const checkboxSize = Math.round(
    CHECKBOX_HIT * Math.min(fontScale, BADGE_MAX_SCALE),
  );
  const stacked = fontScale >= STACK_ABOVE_FONT_SCALE;
  const textInset = Spacing.md + badgeSize + Spacing.sm;
  const clockTime = formatClockTime(reminderTime.hour, reminderTime.minute);

  return (
    <>
      <ScrollView
        style={[styles.scroll, { backgroundColor: theme.bg }]}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        {reminders.length === 0 ? (
          <EmptyState
            title={t("reminders.empty.title")}
            description={t("reminders.empty.subtitle")}
            systemImage="bell"
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

            {sections.map((section) => (
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
                  items={section.items}
                  dueState={dueState}
                  theme={theme}
                  badgeSize={badgeSize}
                  checkboxSize={checkboxSize}
                  stacked={stacked}
                  textInset={textInset}
                  onStopReminding={handleStopReminding}
                />
              </View>
            ))}

            <ThemedText type="bodyS" themeColor="textMuted">
              {t("reminders.timeFooter", { time: clockTime })}
            </ThemedText>
          </>
        )}
      </ScrollView>
      <IOSPageHeader title={t("reminders.title")} />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
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
});
