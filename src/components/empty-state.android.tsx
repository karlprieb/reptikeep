import { Button, Column, Host, Text } from "@expo/ui/jetpack-compose";
import { fillMaxWidth, padding } from "@expo/ui/jetpack-compose/modifiers";
import { StyleSheet } from "react-native";

import { Spacing, type SFSymbolName } from "@/constants/theme";
import { composeTextStyle } from "@/constants/type-font-compose";
import { useTheme } from "@/hooks/use-theme";

export type EmptyStateProps = {
  title: string;
  description: string;
  systemImage?: SFSymbolName;
  action?: {
    label: string;
    accessibilityLabel?: string;
    accessibilityHint?: string;
    onPress: () => void;
  };
};

export function EmptyStateContent({
  title,
  description,
  action,
}: EmptyStateProps) {
  const theme = useTheme();

  return (
    <Column
      horizontalAlignment="center"
      verticalArrangement={{ spacedBy: Spacing.sm }}
      modifiers={[
        fillMaxWidth(),
        padding(Spacing.lg, Spacing.md, Spacing.lg, Spacing.md),
      ]}
    >
      <Text
        style={composeTextStyle("heading")}
        color={theme.text}
        modifiers={[padding(0, Spacing.sm, 0, 0)]}
      >
        {title}
      </Text>
      <Text style={composeTextStyle("body")} color={theme.textSecondary}>
        {description}
      </Text>
      {action ? (
        <Button
          onClick={action.onPress}
          colors={{
            containerColor: theme.primary,
            contentColor: theme.onPrimary,
          }}
          modifiers={[padding(0, Spacing.sm, 0, 0)]}
        >
          <Text style={composeTextStyle("body")} color={theme.onPrimary}>
            {action.label}
          </Text>
        </Button>
      ) : null}
    </Column>
  );
}

export function EmptyState(props: EmptyStateProps) {
  return (
    <Host
      style={styles.host}
      matchContents={{ horizontal: false, vertical: true }}
    >
      <EmptyStateContent {...props} />
    </Host>
  );
}

const styles = StyleSheet.create({
  host: {
    width: "100%",
  },
});
