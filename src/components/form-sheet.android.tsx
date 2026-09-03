import {
  Box,
  Button,
  Column,
  DatePickerDialog,
  DropdownMenuItem,
  ExposedDropdownMenu,
  ExposedDropdownMenuBox,
  Host,
  Icon,
  IconButton,
  ListItem,
  OutlinedTextField,
  Row,
  SegmentedButton,
  SingleChoiceSegmentedButtonRow,
  Snackbar,
  SnackbarHost,
  Switch,
  Text,
  TimePickerDialog,
  useNativeState,
  type SnackbarHostRef,
} from "@expo/ui/jetpack-compose";
import {
  clip,
  defaultMinSize,
  fillMaxWidth,
  menuAnchor,
  padding,
  semantics,
  Shapes,
  toggleable,
  weight,
} from "@expo/ui/jetpack-compose/modifiers";
import { useEffect, useState } from "react";
import { Animated, StatusBar, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Radius, Spacing } from "@/constants/theme";
import { composeTextStyle } from "@/constants/type-font-compose";
import { useColorScheme, useTheme } from "@/hooks/use-theme";
import {
  atClockTime,
  formatAbsoluteDate,
  toCalendarDate,
} from "@/utils/format-date";
import {
  ACTION_ICON_SIZE,
  asEditOf,
  optionalText,
  TITLE_LARGE,
  TOP_BAR_HEIGHT,
  useDraft,
  useScrollLift,
} from "@/utils/form-sheet-shared";

import CALENDAR_ICON from "@/assets/images/icons/calendar-month.xml";
import CHECK_ICON from "@/assets/images/icons/check.xml";
import CLOSE_ICON from "@/assets/images/icons/close.xml";
import DROPDOWN_ICON from "@/assets/images/icons/arrow-drop-down.xml";

export {
  ACTION_ICON_SIZE,
  asEditOf,
  optionalText,
  TITLE_LARGE,
  TOP_BAR_HEIGHT,
  useDraft,
  useScrollLift,
};

export const EDGE_INSET = 4;

export const LABEL_LARGE = {
  fontFamily: "default",
  fontSize: 14,
  fontWeight: "500",
  lineHeight: 20,
  letterSpacing: 0.1,
} as const;

export const TITLE_SMALL = {
  fontFamily: "default",
  fontSize: 14,
  fontWeight: "500",
  lineHeight: 20,
  letterSpacing: 0.1,
} as const;

export const DATA_STYLE = {
  fontFamily: "SpaceMono-Bold",
  fontSize: 15,
  fontWeight: "700",
} as const;

export type FormTheme = ReturnType<typeof useTheme>;

export function fieldColors(theme: FormTheme) {
  return {
    focusedTextColor: theme.text,
    unfocusedTextColor: theme.text,
    disabledTextColor: theme.textMuted,
    errorTextColor: theme.text,
    cursorColor: theme.primaryStrong,
    errorCursorColor: theme.danger,
    focusedIndicatorColor: theme.primaryStrong,
    unfocusedIndicatorColor: theme.textMuted,
    disabledIndicatorColor: theme.border,
    errorIndicatorColor: theme.danger,
    focusedLabelColor: theme.text,
    unfocusedLabelColor: theme.textSecondary,
    disabledLabelColor: theme.textMuted,
    errorLabelColor: theme.danger,
    focusedPlaceholderColor: theme.textSecondary,
    unfocusedPlaceholderColor: theme.textSecondary,
    focusedTrailingIconColor: theme.textSecondary,
    unfocusedTrailingIconColor: theme.textSecondary,
    errorTrailingIconColor: theme.danger,
    focusedSupportingTextColor: theme.textSecondary,
    unfocusedSupportingTextColor: theme.textSecondary,
    errorSupportingTextColor: theme.danger,
  };
}

export type FormSheetTopBarProps = {
  namespace: string;
  editing?: boolean;
  title?: string;
  saveLabel?: string;
  cancelLabel?: string;
  saveDisabled: boolean;
  cancelDisabled?: boolean;
  onCancel: () => void;
  onSave: () => void;
  lifted: Animated.AnimatedInterpolation<number>;
  insetsTop: number;
  iconSize: number;
};

export function FormSheetTopBar({
  namespace,
  editing = false,
  title,
  saveLabel,
  cancelLabel,
  saveDisabled,
  cancelDisabled = false,
  onCancel,
  onSave,
  lifted,
  insetsTop,
  iconSize,
}: FormSheetTopBarProps) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const { t } = useTranslation();

  return (
    <View
      style={[topBarStyles.topBar, { paddingTop: insetsTop }]}
      pointerEvents="box-none"
    >
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={scheme === "dark" ? "light-content" : "dark-content"}
      />
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: theme.bg }]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: theme.surface, opacity: lifted },
        ]}
      />
      <Host
        style={topBarStyles.topBarHost}
        matchContents={{ horizontal: false, vertical: true }}
        seedColor={theme.primary}
      >
        <Row
          verticalAlignment="center"
          horizontalArrangement={{ spacedBy: Spacing["2xs"] }}
          modifiers={[
            fillMaxWidth(),
            defaultMinSize({ minHeight: TOP_BAR_HEIGHT }),
            padding(EDGE_INSET, Spacing["2xs"], Spacing.md, Spacing["2xs"]),
          ]}
        >
          <IconButton
            onClick={onCancel}
            enabled={!cancelDisabled}
            colors={{ contentColor: theme.textSecondary }}
          >
            <Icon
              source={CLOSE_ICON}
              tint={theme.textSecondary}
              size={iconSize}
              contentDescription={cancelLabel ?? t(`${namespace}.cancel`)}
            />
          </IconButton>

          <Text
            style={TITLE_LARGE}
            color={theme.text}
            maxLines={1}
            overflow="ellipsis"
            modifiers={[weight(1)]}
          >
            {title ?? t(`${namespace}.${editing ? "editTitle" : "title"}`)}
          </Text>

          <Button
            onClick={onSave}
            enabled={!saveDisabled}
            colors={{
              containerColor: theme.primary,
              contentColor: theme.onPrimary,
              disabledContainerColor: theme.surfaceSunken,
              disabledContentColor: theme.textMuted,
            }}
          >
            <Text style={LABEL_LARGE}>
              {saveLabel ?? t(`${namespace}.save`)}
            </Text>
          </Button>
        </Row>
      </Host>
    </View>
  );
}

const topBarStyles = StyleSheet.create({
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  topBarHost: {
    width: "100%",
  },
});

export function Section({
  title,
  footer,
  footerColor,
  children,
}: {
  title?: string;
  footer?: string;
  footerColor?: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();

  return (
    <Column
      horizontalAlignment="start"
      verticalArrangement={{ spacedBy: Spacing.md }}
      modifiers={[fillMaxWidth()]}
    >
      {title ? (
        <Text style={TITLE_SMALL} color={theme.textSecondary}>
          {title}
        </Text>
      ) : null}
      {children}
      {footer ? (
        <Text
          style={composeTextStyle("bodyS")}
          color={footerColor ?? theme.textSecondary}
        >
          {footer}
        </Text>
      ) : null}
    </Column>
  );
}

export function LabeledRow({
  label,
  theme,
  children,
}: {
  label: string;
  theme: FormTheme;
  children: React.ReactNode;
}) {
  return (
    <Row
      verticalAlignment="center"
      horizontalArrangement="spaceBetween"
      modifiers={[fillMaxWidth()]}
    >
      <Text style={composeTextStyle("body")} color={theme.text}>
        {label}
      </Text>
      {children}
    </Row>
  );
}

export function SwitchRow({
  label,
  checked,
  onCheckedChange,
  theme,
  hint,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  theme: FormTheme;
  hint?: string;
}) {
  return (
    <Box
      modifiers={[
        fillMaxWidth(),
        clip(Shapes.RoundedCorner(Radius.md)),
        toggleable(checked, () => onCheckedChange(!checked), {
          role: "switch",
        }),
        semantics({
          contentDescription: [label, hint].filter(Boolean).join(", "),
          mergeDescendants: true,
        }),
      ]}
    >
      <ListItem
        colors={{ containerColor: theme.bg, contentColor: theme.text }}
        modifiers={[fillMaxWidth()]}
      >
        <ListItem.HeadlineContent>
          <Text style={composeTextStyle("body")} color={theme.text}>
            {label}
          </Text>
        </ListItem.HeadlineContent>
        <ListItem.TrailingContent>
          <Switch
            value={checked}
            enabled={false}
            colors={{
              checkedThumbColor: theme.onPrimary,
              checkedTrackColor: theme.primary,
              uncheckedThumbColor: theme.textMuted,
              uncheckedTrackColor: theme.surfaceSunken,
              uncheckedBorderColor: theme.textMuted,
              disabledCheckedThumbColor: theme.onPrimary,
              disabledCheckedTrackColor: theme.primary,
              disabledUncheckedThumbColor: theme.textMuted,
              disabledUncheckedTrackColor: theme.surfaceSunken,
              disabledUncheckedBorderColor: theme.textMuted,
            }}
          />
        </ListItem.TrailingContent>
      </ListItem>
    </Box>
  );
}

export function MenuField<T extends string>({
  label,
  value,
  theme,
  iconSize,
  items,
  onSelect,
  hint,
}: {
  label: string;
  value: string;
  theme: FormTheme;
  iconSize: number;
  items: { value: T; label: string; selected: boolean }[];
  onSelect: (value: T) => void;
  hint?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const text = useNativeState(value);

  useEffect(() => {
    text.set(value);
  }, [text, value]);

  return (
    <ExposedDropdownMenuBox
      expanded={expanded}
      onExpandedChange={setExpanded}
      modifiers={[fillMaxWidth()]}
    >
      <OutlinedTextField
        value={text}
        readOnly
        singleLine
        colors={fieldColors(theme)}
        modifiers={[
          menuAnchor(),
          fillMaxWidth(),
          semantics({
            contentDescription: [label, value, hint].filter(Boolean).join(", "),
            mergeDescendants: true,
          }),
        ]}
      >
        <OutlinedTextField.Label>
          <Text>{label}</Text>
        </OutlinedTextField.Label>
        <OutlinedTextField.TrailingIcon>
          <Icon
            source={DROPDOWN_ICON}
            tint={theme.textSecondary}
            size={iconSize}
          />
        </OutlinedTextField.TrailingIcon>
      </OutlinedTextField>
      <ExposedDropdownMenu
        expanded={expanded}
        onDismissRequest={() => setExpanded(false)}
        containerColor={theme.surface}
      >
        {items.map((item) => (
          <DropdownMenuItem
            key={item.value}
            onClick={() => {
              onSelect(item.value);
              setExpanded(false);
            }}
          >
            <DropdownMenuItem.Text>
              <Text style={composeTextStyle("body")} color={theme.text}>
                {item.label}
              </Text>
            </DropdownMenuItem.Text>
            {item.selected ? (
              <DropdownMenuItem.TrailingIcon>
                <Icon
                  source={CHECK_ICON}
                  tint={theme.primaryStrong}
                  size={iconSize}
                />
              </DropdownMenuItem.TrailingIcon>
            ) : null}
          </DropdownMenuItem>
        ))}
      </ExposedDropdownMenu>
    </ExposedDropdownMenuBox>
  );
}

export function SegmentedField<T extends string>({
  value,
  options,
  labelFor,
  onChange,
  theme,
}: {
  value: T;
  options: readonly T[];
  labelFor: (value: T) => string;
  onChange: (value: T) => void;
  theme: FormTheme;
}) {
  return (
    <SingleChoiceSegmentedButtonRow modifiers={[fillMaxWidth()]}>
      {options.map((option) => (
        <SegmentedButton
          key={option}
          selected={value === option}
          onClick={() => onChange(option)}
          colors={{
            activeContainerColor: theme.primary,
            activeContentColor: theme.onPrimary,
            activeBorderColor: theme.primary,
            inactiveContainerColor: theme.surface,
            inactiveContentColor: theme.textSecondary,
            inactiveBorderColor: theme.border,
          }}
        >
          <SegmentedButton.Label>
            <Text style={LABEL_LARGE}>{labelFor(option)}</Text>
          </SegmentedButton.Label>
        </SegmentedButton>
      ))}
    </SingleChoiceSegmentedButtonRow>
  );
}

export function DateField({
  label,
  date,
  onSelect,
  theme,
  iconSize,
  confirmLabel,
  dismissLabel,
  minDate,
  maxDate,
}: {
  label: string;
  date: Date;
  onSelect: (date: Date) => void;
  theme: FormTheme;
  iconSize: number;
  confirmLabel: string;
  dismissLabel: string;
  minDate?: Date;
  maxDate?: Date;
}) {
  const { t } = useTranslation();
  const [showDialog, setShowDialog] = useState(false);
  const value = toCalendarDate(date);
  const displayText = formatAbsoluteDate(value);
  const text = useNativeState(displayText);

  useEffect(() => {
    text.set(displayText);
  }, [text, displayText]);

  return (
    <ExposedDropdownMenuBox
      expanded={showDialog}
      onExpandedChange={setShowDialog}
      modifiers={[fillMaxWidth()]}
    >
      <OutlinedTextField
        value={text}
        readOnly
        singleLine
        colors={fieldColors(theme)}
        textStyle={DATA_STYLE}
        modifiers={[
          menuAnchor(),
          fillMaxWidth(),
          semantics({
            contentDescription: [
              label,
              displayText,
              t("reptileForm.selectDate"),
            ].join(", "),
            mergeDescendants: true,
          }),
        ]}
      >
        <OutlinedTextField.Label>
          <Text>{label}</Text>
        </OutlinedTextField.Label>
        <OutlinedTextField.TrailingIcon>
          <Icon
            source={CALENDAR_ICON}
            tint={theme.textSecondary}
            size={iconSize}
          />
        </OutlinedTextField.TrailingIcon>
      </OutlinedTextField>
      {showDialog ? (
        <DatePickerDialog
          initialDate={value}
          selectableDates={
            minDate || maxDate ? { start: minDate, end: maxDate } : undefined
          }
          onDateSelected={(next) => {
            onSelect(
              atClockTime(
                new Date(
                  next.getUTCFullYear(),
                  next.getUTCMonth(),
                  next.getUTCDate(),
                ),
                date.getHours(),
                date.getMinutes(),
              ),
            );
            setShowDialog(false);
          }}
          onDismissRequest={() => setShowDialog(false)}
          color={theme.primary}
          confirmButtonLabel={confirmLabel}
          dismissButtonLabel={dismissLabel}
        />
      ) : null}
    </ExposedDropdownMenuBox>
  );
}

export function DateTimeField({
  label,
  date,
  onSelect,
  theme,
  iconSize,
  confirmLabel,
  dismissLabel,
  maxDate,
}: {
  label: string;
  date: Date;
  onSelect: (date: Date) => void;
  theme: FormTheme;
  iconSize: number;
  confirmLabel: string;
  dismissLabel: string;
  maxDate?: Date;
}) {
  const { t } = useTranslation();
  const [stage, setStage] = useState<"none" | "date" | "time">("none");
  const [pendingDay, setPendingDay] = useState<Date>();
  const calendarValue = toCalendarDate(date);
  const displayText = `${formatAbsoluteDate(calendarValue)} · ${timeLabel(date)}`;
  const text = useNativeState(displayText);

  useEffect(() => {
    text.set(displayText);
  }, [text, displayText]);

  return (
    <ExposedDropdownMenuBox
      expanded={stage !== "none"}
      onExpandedChange={(expanded) => setStage(expanded ? "date" : "none")}
      modifiers={[fillMaxWidth()]}
    >
      <OutlinedTextField
        value={text}
        readOnly
        singleLine
        colors={fieldColors(theme)}
        textStyle={DATA_STYLE}
        modifiers={[
          menuAnchor(),
          fillMaxWidth(),
          semantics({
            contentDescription: [
              label,
              displayText,
              t("reptileForm.selectDate"),
            ].join(", "),
            mergeDescendants: true,
          }),
        ]}
      >
        <OutlinedTextField.Label>
          <Text>{label}</Text>
        </OutlinedTextField.Label>
        <OutlinedTextField.TrailingIcon>
          <Icon
            source={CALENDAR_ICON}
            tint={theme.textSecondary}
            size={iconSize}
          />
        </OutlinedTextField.TrailingIcon>
      </OutlinedTextField>
      {stage === "date" ? (
        <DatePickerDialog
          initialDate={calendarValue}
          selectableDates={maxDate ? { end: maxDate } : undefined}
          onDateSelected={(next) => {
            setPendingDay(
              new Date(
                next.getUTCFullYear(),
                next.getUTCMonth(),
                next.getUTCDate(),
              ),
            );
            setStage("time");
          }}
          onDismissRequest={() => setStage("none")}
          color={theme.primary}
          confirmButtonLabel={confirmLabel}
          dismissButtonLabel={dismissLabel}
        />
      ) : null}
      {stage === "time" && pendingDay ? (
        <TimePickerDialog
          initialDate={date.toISOString()}
          confirmButtonLabel={confirmLabel}
          dismissButtonLabel={dismissLabel}
          color={theme.primary}
          onDateSelected={(picked) => {
            const next = atClockTime(
              pendingDay,
              picked.getHours(),
              picked.getMinutes(),
            );
            onSelect(maxDate && next > maxDate ? maxDate : next);
            setStage("none");
          }}
          onDismissRequest={() => setStage("none")}
        />
      ) : null}
    </ExposedDropdownMenuBox>
  );
}

function timeLabel(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function FormSheetSnackbar({
  ref,
  insetsBottom,
  theme,
}: {
  ref: React.Ref<SnackbarHostRef>;
  insetsBottom: number;
  theme: FormTheme;
}) {
  return (
    <View
      style={[
        formSheetAndroidStyles.snackbar,
        { bottom: insetsBottom + Spacing.md },
      ]}
      pointerEvents="box-none"
    >
      <Host matchContents>
        <SnackbarHost ref={ref} modifiers={[fillMaxWidth()]}>
          <Snackbar
            containerColor={theme.surfaceSunken}
            contentColor={theme.text}
            actionContentColor={theme.text}
            dismissActionContentColor={theme.textSecondary}
          />
        </SnackbarHost>
      </Host>
    </View>
  );
}

export const formSheetAndroidStyles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    width: "100%",
  },
  host: {
    width: "100%",
  },
  snackbar: {
    position: "absolute",
    left: Spacing.md,
    right: Spacing.md,
  },
});

export type { SnackbarHostRef };
