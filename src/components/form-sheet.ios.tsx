import { Picker, Text } from "@expo/ui/swift-ui";
import {
  accessibilityHint,
  accessibilityLabel,
  background,
  environment,
  foregroundStyle,
  listRowBackground,
  pickerStyle,
  scrollContentBackground,
  tag,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import { router, Stack } from "expo-router";
import { StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

import { Typography } from "@/constants/theme";
import { typeFont } from "@/constants/type-font";
import { useTheme } from "@/hooks/use-theme";
import type { SupportedLanguage } from "@/i18n/resolve-language";
import { swiftUILocaleIdentifier } from "@/i18n/resolve-language";
import { asEditOf, optionalText, useDraft } from "@/utils/form-sheet-shared";

export { asEditOf, optionalText, useDraft };

export type FormSheetChromeProps = {
  namespace: string;
  animalName?: string;
  editing?: boolean;
  saveDisabled: boolean;
  cancelDisabled?: boolean;
  onSave: () => void;
};

export function FormSheetChrome({
  namespace,
  animalName,
  editing = false,
  saveDisabled,
  cancelDisabled = false,
  onSave,
}: FormSheetChromeProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <>
      <Stack.Title
        style={{ fontFamily: Typography.title.fontFamily, color: theme.text }}
      >
        {t(`${namespace}.${editing ? "editTitle" : "title"}`)}
      </Stack.Title>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          tintColor={theme.textSecondary}
          accessibilityLabel={t(`${namespace}.cancel`)}
          accessibilityHint={t(`${namespace}.cancelHint`)}
          disabled={cancelDisabled}
          onPress={() => router.back()}
        >
          {t(`${namespace}.cancel`)}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          tintColor={theme.primary}
          style={{ color: theme.onPrimary }}
          accessibilityLabel={t(`${namespace}.save`)}
          accessibilityHint={t(
            `${namespace}.${editing ? "editSaveHint" : "saveHint"}`,
            { animalName },
          )}
          variant="done"
          disabled={saveDisabled}
          onPress={onSave}
        >
          {t(`${namespace}.save`)}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
    </>
  );
}

export function FormSectionHeader({ children }: { children: string }) {
  const theme = useTheme();

  return (
    <Text
      modifiers={[typeFont("heading"), foregroundStyle(theme.textSecondary)]}
    >
      {children}
    </Text>
  );
}

export function FormSectionFooter({
  children,
  color,
}: {
  children: string;
  color?: string;
}) {
  const theme = useTheme();

  return (
    <Text
      modifiers={[
        typeFont("bodyS"),
        foregroundStyle(color ?? theme.textSecondary),
      ]}
    >
      {children}
    </Text>
  );
}

const INHERIT = "inherit";

type DefaultPickerProps<T extends string> = {
  label: string;
  hint: string;
  options: readonly T[];
  describe: (value: T) => string;
  inherited?: T;
  value: T | undefined;
  onChange: (value: T | undefined) => void;
};

export function DefaultPicker<T extends string>({
  label,
  hint,
  options,
  describe,
  inherited,
  value,
  onChange,
}: DefaultPickerProps<T>) {
  const theme = useTheme();
  const { t } = useTranslation();

  const rows = [
    ...(inherited === undefined
      ? []
      : [
          {
            key: INHERIT,
            text: t("defaults.followGlobal", { value: describe(inherited) }),
          },
        ]),
    ...options.map((option) => ({ key: option, text: describe(option) })),
  ];

  return (
    <Picker
      label={label}
      selection={value ?? INHERIT}
      onSelectionChange={(selected) =>
        onChange(selected === INHERIT ? undefined : (selected as T))
      }
      modifiers={[
        accessibilityLabel(label),
        accessibilityHint(hint),
        pickerStyle("menu"),
        listRowBackground(theme.surface),
      ]}
    >
      {rows.map((row) => (
        <Text key={row.key} modifiers={[tag(row.key)]}>
          {row.text}
        </Text>
      ))}
    </Picker>
  );
}

export function useFormModifiers() {
  const theme = useTheme();
  const { i18n } = useTranslation();

  return {
    form: [
      tint(theme.primary),
      scrollContentBackground("hidden"),
      background(theme.bg),
      environment(
        "locale",
        swiftUILocaleIdentifier(i18n.language as SupportedLanguage),
      ),
    ],
    row: [listRowBackground(theme.surface)],
  };
}

export const formSheetStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  host: {
    flex: 1,
  },
});
