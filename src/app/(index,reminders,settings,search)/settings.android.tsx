import {
  Column,
  DropdownMenu,
  DropdownMenuItem,
  Host,
  Icon,
  OutlinedTextField,
  Row,
  Switch,
  Text,
  TimePickerDialog,
  useNativeState,
} from "@expo/ui/jetpack-compose";
import {
  clickable,
  defaultMinSize,
  fillMaxWidth,
  padding,
  semantics,
  toggleable,
  weight,
} from "@expo/ui/jetpack-compose/modifiers";
import { useValue } from "@legendapp/state/react";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";

import { MaterialAppBar } from "@/components/material-app-bar";
import { Spacing, type Theme } from "@/constants/theme";
import { composeTextStyle, SECTION_LABEL } from "@/constants/type-font-compose";
import { useCareScheduleEditor } from "@/hooks/use-care-schedule-editor";
import { useTheme } from "@/hooks/use-theme";
import { SCHEDULE_FREQUENCIES } from "@/state/care-schedule";
import { DEFECATION_TYPES } from "@/state/defecation";
import { defaults$, FEEDING_MEASURES } from "@/state/logging-defaults";
import { reminders$ } from "@/state/reminders";
import { settings$, setLanguage, type LanguageSetting } from "@/state/settings";
import { atClockTime, formatClockTime } from "@/utils/format-date";
import type { ScheduleSelection } from "@/utils/schedule";
import { WEIGHT_UNITS } from "@/utils/weight-unit";

import CHECK_ICON from "@/assets/images/icons/check.xml";

const ROW_MIN_HEIGHT = 64;
const ACTION_ICON_SIZE = 24;

const LANGUAGE_OPTIONS: { value: LanguageSetting; labelKey: string }[] = [
  { value: "system", labelKey: "settings.followDevice" },
  { value: "en", labelKey: "settings.english" },
  { value: "pt-BR", labelKey: "settings.portuguese" },
];

export default function SettingsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const currentLanguage = useValue(settings$.language);
  const globalDefaults = useValue(defaults$);
  const water = useCareScheduleEditor("water");
  const cleaning = useCareScheduleEditor("cleaning");
  const reminderTime = useValue(reminders$);

  const [scrollY] = useState(() => new Animated.Value(0));
  const [appBarHeight, setAppBarHeight] = useState(0);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const reminderLabel = formatClockTime(reminderTime.hour, reminderTime.minute);
  const reminderDate = useMemo(
    () => atClockTime(new Date(), reminderTime.hour, reminderTime.minute),
    [reminderTime.hour, reminderTime.minute],
  );

  const frequencyItems = SCHEDULE_FREQUENCIES.map((value) => ({
    value: value as ScheduleSelection,
    label: t(`schedule.frequency.${value}`),
  }));

  return (
    <>
      <Animated.ScrollView
        style={[styles.scroll, { backgroundColor: theme.bg }]}
        contentContainerStyle={{
          paddingTop: appBarHeight,
          paddingBottom: Spacing["2xl"],
        }}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
      >
        <Host
          style={styles.host}
          matchContents={{ horizontal: false, vertical: true }}
          seedColor={theme.primary}
        >
          <Column modifiers={[fillMaxWidth()]}>
            <SectionHeader theme={theme} title={t("defaults.section")} />
            <MenuRow
              theme={theme}
              title={t("defaults.mealMeasure")}
              value={t(`feedingForm.measure.${globalDefaults.mealMeasure}`)}
              hint={t("a11y.defaults.mealMeasure.hint")}
              items={FEEDING_MEASURES.map((value) => ({
                value,
                label: t(`feedingForm.measure.${value}`),
              }))}
              selected={globalDefaults.mealMeasure}
              onSelect={(value) => defaults$.mealMeasure.set(value)}
            />
            <ToggleRow
              theme={theme}
              title={t("defaults.frozen")}
              supporting={t(
                globalDefaults.frozen
                  ? "defaults.frozenYes"
                  : "defaults.frozenNo",
              )}
              hint={t("a11y.defaults.frozen.hint")}
              checked={globalDefaults.frozen}
              onCheckedChange={(value) => defaults$.frozen.set(value)}
            />
            <MenuRow
              theme={theme}
              title={t("defaults.weightUnit")}
              value={t(`feedingForm.units.${globalDefaults.weightUnit}`)}
              hint={t("a11y.defaults.weightUnit.hint")}
              items={WEIGHT_UNITS.map((value) => ({
                value,
                label: t(`feedingForm.units.${value}`),
              }))}
              selected={globalDefaults.weightUnit}
              onSelect={(value) => defaults$.weightUnit.set(value)}
            />
            <MenuRow
              theme={theme}
              title={t("defaults.poopType")}
              value={t(`timeline.poop.${globalDefaults.poopType}`)}
              hint={t("a11y.defaults.poopType.hint")}
              items={DEFECATION_TYPES.map((value) => ({
                value,
                label: t(`timeline.poop.${value}`),
              }))}
              selected={globalDefaults.poopType}
              onSelect={(value) => defaults$.poopType.set(value)}
            />
            <SectionFooter theme={theme} text={t("defaults.globalFooter")} />

            <SectionHeader
              theme={theme}
              title={t("reminders.settings.section")}
            />
            <NavRow
              theme={theme}
              title={t("reminders.settings.time")}
              value={reminderLabel}
              hint={t("a11y.reminders.time.hint")}
              onClick={() => setShowTimePicker(true)}
            />
            <SectionFooter
              theme={theme}
              text={t("reminders.settings.footer")}
            />

            <SectionHeader theme={theme} title={t("waterSchedule.section")} />
            <ToggleRow
              theme={theme}
              title={t("waterSchedule.enabled")}
              hint={t("a11y.waterSchedule.enabled.hint")}
              checked={Boolean(water.schedule)}
              onCheckedChange={water.setEnabled}
            />
            {water.schedule ? (
              <MenuRow
                theme={theme}
                title={t("schedule.frequency.label")}
                value={t(`schedule.frequency.${water.selection}`)}
                hint={t("a11y.waterSchedule.frequency.hint")}
                items={frequencyItems}
                selected={water.selection}
                onSelect={water.setSelection}
              />
            ) : null}
            {water.schedule && water.selection === "custom" ? (
              <DaysRow
                theme={theme}
                value={water.days}
                onChange={water.setDays}
                valid={water.valid}
                hint={t("a11y.waterSchedule.customDays.hint")}
              />
            ) : null}
            <SectionFooter
              theme={theme}
              text={
                water.valid
                  ? t("waterSchedule.globalFooter")
                  : t("schedule.invalidDays")
              }
              color={water.valid ? undefined : theme.danger}
            />

            <SectionHeader
              theme={theme}
              title={t("cleaningSchedule.section")}
            />
            <ToggleRow
              theme={theme}
              title={t("cleaningSchedule.enabled")}
              hint={t("a11y.cleaningSchedule.enabled.hint")}
              checked={Boolean(cleaning.schedule)}
              onCheckedChange={cleaning.setEnabled}
            />
            {cleaning.schedule ? (
              <MenuRow
                theme={theme}
                title={t("schedule.frequency.label")}
                value={t(`schedule.frequency.${cleaning.selection}`)}
                hint={t("a11y.cleaningSchedule.frequency.hint")}
                items={frequencyItems}
                selected={cleaning.selection}
                onSelect={cleaning.setSelection}
              />
            ) : null}
            {cleaning.schedule && cleaning.selection === "custom" ? (
              <DaysRow
                theme={theme}
                value={cleaning.days}
                onChange={cleaning.setDays}
                valid={cleaning.valid}
                hint={t("a11y.cleaningSchedule.customDays.hint")}
              />
            ) : null}
            <SectionFooter
              theme={theme}
              text={
                cleaning.valid
                  ? t("cleaningSchedule.globalFooter")
                  : t("schedule.invalidDays")
              }
              color={cleaning.valid ? undefined : theme.danger}
            />

            <SectionHeader theme={theme} title={t("settings.general")} />
            <MenuRow
              theme={theme}
              title={t("settings.language")}
              value={t(
                LANGUAGE_OPTIONS.find(
                  (option) => option.value === currentLanguage,
                )?.labelKey ?? "settings.followDevice",
              )}
              hint={t("a11y.language.hint")}
              items={LANGUAGE_OPTIONS.map((option) => ({
                value: option.value,
                label: t(option.labelKey),
              }))}
              selected={currentLanguage}
              onSelect={setLanguage}
            />
            <NavRow
              theme={theme}
              title={t("backup.title")}
              hint={t("a11y.backup.open")}
              onClick={() => router.push("/backup-restore" as never)}
            />
            <SectionFooter theme={theme} text={t("settings.subtitle")} />

            <NavRow
              theme={theme}
              title={t("about.title")}
              hint={t("a11y.about.openHint")}
              onClick={() => router.push("/about")}
              modifiersTop
            />
          </Column>
        </Host>
      </Animated.ScrollView>

      {showTimePicker ? (
        <View style={styles.dialogHost} pointerEvents="box-none">
          <Host matchContents seedColor={theme.primary}>
            <TimePickerDialog
              initialDate={reminderDate.toISOString()}
              onDateSelected={(next) => {
                reminders$.set({
                  hour: next.getHours(),
                  minute: next.getMinutes(),
                });
                setShowTimePicker(false);
              }}
              onDismissRequest={() => setShowTimePicker(false)}
              color={theme.primary}
              elementColors={{
                containerColor: theme.surface,
                clockDialColor: theme.surfaceSunken,
                clockDialSelectedContentColor: theme.onPrimary,
                clockDialUnselectedContentColor: theme.text,
                selectorColor: theme.primary,
                timeSelectorSelectedContainerColor: theme.primary,
                timeSelectorSelectedContentColor: theme.onPrimary,
                timeSelectorUnselectedContainerColor: theme.surfaceSunken,
                timeSelectorUnselectedContentColor: theme.text,
                periodSelectorBorderColor: theme.border,
                periodSelectorSelectedContainerColor: theme.primary,
                periodSelectorSelectedContentColor: theme.onPrimary,
                periodSelectorUnselectedContainerColor: theme.surface,
                periodSelectorUnselectedContentColor: theme.text,
              }}
              confirmButtonLabel={t("settings.ok")}
              dismissButtonLabel={t("settings.cancel")}
            />
          </Host>
        </View>
      ) : null}

      <MaterialAppBar
        title={t("settings.title")}
        scrollY={scrollY}
        onHeightChange={setAppBarHeight}
      />
    </>
  );
}

function SectionHeader({ theme, title }: { theme: Theme; title: string }) {
  return (
    <Text
      style={SECTION_LABEL}
      color={theme.textSecondary}
      modifiers={[padding(Spacing.lg, Spacing.lg, Spacing.lg, Spacing.xs)]}
    >
      {title}
    </Text>
  );
}

function SectionFooter({
  theme,
  text,
  color,
}: {
  theme: Theme;
  text: string;
  color?: string;
}) {
  return (
    <Text
      style={composeTextStyle("bodyS")}
      color={color ?? theme.textSecondary}
      modifiers={[padding(Spacing.lg, Spacing.xs, Spacing.lg, 0)]}
    >
      {text}
    </Text>
  );
}

function RowText({
  theme,
  title,
  supporting,
}: {
  theme: Theme;
  title: string;
  supporting?: string;
}) {
  return (
    <Column
      horizontalAlignment="start"
      verticalArrangement="center"
      modifiers={[weight(1)]}
    >
      <Text style={composeTextStyle("bodyL")} color={theme.text}>
        {title}
      </Text>
      {supporting ? (
        <Text style={composeTextStyle("body")} color={theme.textSecondary}>
          {supporting}
        </Text>
      ) : null}
    </Column>
  );
}

function NavRow({
  theme,
  title,
  value,
  hint,
  onClick,
  modifiersTop,
}: {
  theme: Theme;
  title: string;
  value?: string;
  hint?: string;
  onClick: () => void;
  modifiersTop?: boolean;
}) {
  return (
    <Row
      verticalAlignment="center"
      modifiers={[
        fillMaxWidth(),
        defaultMinSize({ minHeight: ROW_MIN_HEIGHT }),
        clickable(onClick),
        semantics({
          contentDescription: [title, value, hint].filter(Boolean).join(", "),
          role: "button",
          mergeDescendants: true,
        }),
        padding(
          Spacing.lg,
          modifiersTop ? Spacing.lg : Spacing.sm,
          Spacing.lg,
          Spacing.sm,
        ),
      ]}
    >
      <RowText theme={theme} title={title} supporting={value} />
    </Row>
  );
}

function ToggleRow({
  theme,
  title,
  supporting,
  hint,
  checked,
  onCheckedChange,
}: {
  theme: Theme;
  title: string;
  supporting?: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <Row
      verticalAlignment="center"
      modifiers={[
        fillMaxWidth(),
        defaultMinSize({ minHeight: ROW_MIN_HEIGHT }),
        toggleable(checked, () => onCheckedChange(!checked), {
          role: "switch",
        }),
        semantics({
          contentDescription: [title, supporting, hint]
            .filter(Boolean)
            .join(", "),
          mergeDescendants: true,
        }),
        padding(Spacing.lg, Spacing.sm, Spacing.lg, Spacing.sm),
      ]}
    >
      <RowText theme={theme} title={title} supporting={supporting} />
      <Switch
        value={checked}
        onCheckedChange={onCheckedChange}
        colors={{
          checkedThumbColor: theme.onPrimary,
          checkedTrackColor: theme.primary,
          uncheckedThumbColor: theme.textMuted,
          uncheckedTrackColor: theme.surfaceSunken,
          uncheckedBorderColor: theme.textMuted,
        }}
      />
    </Row>
  );
}

function MenuRow<T extends string>({
  theme,
  title,
  value,
  hint,
  items,
  selected,
  onSelect,
}: {
  theme: Theme;
  title: string;
  value: string;
  hint?: string;
  items: { value: T; label: string }[];
  selected: T | undefined;
  onSelect: (value: T) => void;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  return (
    <DropdownMenu
      expanded={expanded}
      onDismissRequest={() => setExpanded(false)}
      color={theme.surface}
    >
      <DropdownMenu.Trigger>
        <Row
          verticalAlignment="center"
          modifiers={[
            fillMaxWidth(),
            defaultMinSize({ minHeight: ROW_MIN_HEIGHT }),
            clickable(() => setExpanded(true)),
            semantics({
              contentDescription: [title, value, hint]
                .filter(Boolean)
                .join(", "),
              role: "dropdownList",
              mergeDescendants: true,
            }),
            padding(Spacing.lg, Spacing.sm, Spacing.lg, Spacing.sm),
          ]}
        >
          <RowText theme={theme} title={title} supporting={value} />
        </Row>
      </DropdownMenu.Trigger>
      <DropdownMenu.Items>
        {items.map((item) => (
          <DropdownMenuItem
            key={item.value}
            onClick={() => {
              onSelect(item.value);
              setExpanded(false);
            }}
          >
            <DropdownMenuItem.Text>
              <Text style={SECTION_LABEL} color={theme.text}>
                {item.label}
              </Text>
            </DropdownMenuItem.Text>
            {item.value === selected ? (
              <DropdownMenuItem.TrailingIcon>
                <Icon
                  source={CHECK_ICON}
                  tint={theme.primary}
                  size={ACTION_ICON_SIZE}
                  contentDescription={t("a11y.selected")}
                />
              </DropdownMenuItem.TrailingIcon>
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenu.Items>
    </DropdownMenu>
  );
}

function DaysRow({
  theme,
  value,
  onChange,
  valid,
  hint,
}: {
  theme: Theme;
  value: string;
  onChange: (value: string) => void;
  valid: boolean;
  hint?: string;
}) {
  const { t } = useTranslation();
  const text = useNativeState(value);

  useEffect(() => {
    text.set(value);
  }, [text, value]);

  return (
    <Column
      modifiers={[
        fillMaxWidth(),
        padding(Spacing.lg, Spacing.xs, Spacing.lg, Spacing.sm),
      ]}
    >
      <OutlinedTextField
        value={text}
        onValueChange={onChange}
        keyboardOptions={{ keyboardType: "number" }}
        isError={!valid}
        singleLine
        modifiers={[
          fillMaxWidth(),
          semantics({
            contentDescription: [t("schedule.customDays"), hint]
              .filter(Boolean)
              .join(", "),
          }),
        ]}
        colors={{
          focusedTextColor: theme.text,
          unfocusedTextColor: theme.text,
          cursorColor: theme.primaryStrong,
          focusedIndicatorColor: theme.primaryStrong,
          unfocusedIndicatorColor: theme.textMuted,
          errorIndicatorColor: theme.danger,
          focusedLabelColor: theme.text,
          unfocusedLabelColor: theme.textSecondary,
          errorLabelColor: theme.danger,
        }}
      >
        <OutlinedTextField.Label>
          <Text>{t("schedule.customDays")}</Text>
        </OutlinedTextField.Label>
      </OutlinedTextField>
    </Column>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    width: "100%",
  },
  host: {
    width: "100%",
  },
  dialogHost: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  },
});
