import { FloatingActionButton, Host, Icon } from "@expo/ui/jetpack-compose";

import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

const ADD_ICON = require("@/assets/images/icons/add.xml");

const FAB_SIZE = 56;

export const FAB_CLEARANCE = FAB_SIZE + Spacing.lg;

export type AddReptileFabProps = {
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint: string;
};

export function AddReptileFab({
  onPress,
  accessibilityLabel,
  accessibilityHint,
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
            contentDescription={[accessibilityLabel, accessibilityHint].join(
              ", ",
            )}
          />
        </FloatingActionButton.Icon>
      </FloatingActionButton>
    </Host>
  );
}
