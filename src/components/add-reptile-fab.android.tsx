import { FloatingActionButton, Host, Icon } from "@expo/ui/jetpack-compose";

import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

const ADD_ICON = require("@/assets/images/icons/add.xml");

export type AddReptileFabProps = {
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint: string;
};

export function AddReptileFab({
  onPress,
  accessibilityLabel,
}: AddReptileFabProps) {
  const theme = useTheme();

  return (
    <Host
      matchContents
      style={{
        position: "absolute",
        right: Spacing.md,
        bottom: Spacing.lg,
      }}
    >
      <FloatingActionButton onClick={onPress} containerColor={theme.primary}>
        <FloatingActionButton.Icon>
          <Icon
            source={ADD_ICON}
            tint={theme.onPrimary}
            contentDescription={accessibilityLabel}
          />
        </FloatingActionButton.Icon>
      </FloatingActionButton>
    </Host>
  );
}
