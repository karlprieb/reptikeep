import {
  Button,
  ContentUnavailableView,
  Host,
  VStack,
} from "@expo/ui/swift-ui";
import {
  accessibilityHint,
  accessibilityLabel,
  buttonStyle,
  controlSize,
  foregroundStyle,
  frame,
  padding,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import { StyleSheet } from "react-native";

import { Spacing, type SFSymbolName } from "@/constants/theme";
import { typeFont } from "@/constants/type-font";
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
  systemImage,
  action,
}: EmptyStateProps) {
  const theme = useTheme();

  return (
    <VStack
      spacing={Spacing.sm}
      modifiers={[
        frame({ maxWidth: Infinity }),
        padding({ vertical: Spacing.md }),
      ]}
    >
      <ContentUnavailableView
        title={title}
        description={description}
        systemImage={systemImage}
        modifiers={[foregroundStyle(theme.text)]}
      />
      {action ? (
        <Button
          label={action.label}
          onPress={action.onPress}
          modifiers={[
            typeFont("body"),
            buttonStyle("glassProminent"),
            controlSize("large"),
            tint(theme.primary),
            foregroundStyle(theme.onPrimary),
            accessibilityLabel(action.accessibilityLabel ?? action.label),
            ...(action.accessibilityHint
              ? [accessibilityHint(action.accessibilityHint)]
              : []),
          ]}
        />
      ) : null}
    </VStack>
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
