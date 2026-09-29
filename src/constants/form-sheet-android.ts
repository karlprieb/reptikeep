import { StyleSheet } from "react-native";

import { Spacing } from "@/constants/theme";
import type { useTheme } from "@/hooks/use-theme";

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
