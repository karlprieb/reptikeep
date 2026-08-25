import {
  DropdownMenu,
  DropdownMenuItem,
  HorizontalDivider,
  Host,
  Icon,
  IconButton,
  Text as ComposeText,
} from "@expo/ui/jetpack-compose";
import { useEffect, useMemo, useState } from "react";
import {
  Animated,
  StatusBar,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Spacing } from "@/constants/theme";
import { useColorScheme, useTheme } from "@/hooks/use-theme";

const CHECK_ICON = require("@/assets/images/icons/check.xml");

const TITLE_LARGE = {
  fontFamily: "Solway-Bold",
  fontSize: 22,
  lineHeight: 28,
} as const;

const LABEL_LARGE = {
  fontFamily: "default",
  fontSize: 14,
  fontWeight: "500",
  lineHeight: 20,
  letterSpacing: 0.1,
} as const;

const BAR_HEIGHT = 64;
const LIFT_RANGE = 8;
const EDGE_INSET = 4;
const TOUCH_TARGET = 48;
const ACTION_ICON_SIZE = 24;

export type AppBarMenuItem =
  | { key: string; type: "divider" }
  | {
      key: string;
      type: "item";
      label: string;
      selected: boolean;
      onPress: () => void;
    };

export type MaterialAppBarProps = {
  title: string;
  scrollY: Animated.Value;
  onHeightChange: (height: number) => void;
  menu?: {
    icon: ImageSourcePropType;
    accessibilityLabel: string;
    items: readonly AppBarMenuItem[];
  };
};

export function MaterialAppBar({
  title,
  scrollY,
  onHeightChange,
  menu,
}: MaterialAppBarProps) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();

  const barHeight = insets.top + BAR_HEIGHT;

  useEffect(() => {
    onHeightChange(barHeight);
  }, [barHeight, onHeightChange]);

  const lifted = useMemo(
    () =>
      scrollY.interpolate({
        inputRange: [0, LIFT_RANGE],
        outputRange: [0, 1],
        extrapolate: "clamp",
      }),
    [scrollY],
  );

  return (
    <View style={[styles.bar, { height: barHeight, paddingTop: insets.top }]}>
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

      <View style={styles.row}>
        <View style={styles.title}>
          <Host matchContents={{ horizontal: false, vertical: true }}>
            <ComposeText
              style={TITLE_LARGE}
              color={theme.text}
              maxLines={1}
              overflow="ellipsis"
            >
              {title}
            </ComposeText>
          </Host>
        </View>

        {menu ? <AppBarMenu {...menu} /> : null}
      </View>
    </View>
  );
}

type AppBarMenuProps = NonNullable<MaterialAppBarProps["menu"]>;

function AppBarMenu({ icon, accessibilityLabel, items }: AppBarMenuProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.menu}>
      <Host matchContents>
        <DropdownMenu
          expanded={expanded}
          onDismissRequest={() => setExpanded(false)}
          color={theme.surface}
        >
          <DropdownMenu.Trigger>
            <IconButton
              onClick={() => setExpanded(true)}
              colors={{ contentColor: theme.textSecondary }}
            >
              <Icon
                source={icon}
                tint={theme.textSecondary}
                size={ACTION_ICON_SIZE}
                contentDescription={accessibilityLabel}
              />
            </IconButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Items>
            {items.map((item) =>
              item.type === "divider" ? (
                <HorizontalDivider key={item.key} color={theme.border} />
              ) : (
                <DropdownMenuItem
                  key={item.key}
                  onClick={() => {
                    item.onPress();
                    setExpanded(false);
                  }}
                >
                  <DropdownMenuItem.Text>
                    <ComposeText style={LABEL_LARGE} color={theme.text}>
                      {item.label}
                    </ComposeText>
                  </DropdownMenuItem.Text>
                  {item.selected ? (
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
              ),
            )}
          </DropdownMenu.Items>
        </DropdownMenu>
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  row: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: EDGE_INSET,
  },
  title: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
  },
  menu: {
    minWidth: TOUCH_TARGET,
    minHeight: TOUCH_TARGET,
    alignItems: "center",
    justifyContent: "center",
  },
});
