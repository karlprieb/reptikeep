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
  type LayoutChangeEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Spacing } from "@/constants/theme";
import { useColorScheme, useTheme } from "@/hooks/use-theme";

const CHECK_ICON = require("@/assets/images/icons/check.xml");

const HEADLINE_MEDIUM = {
  fontFamily: "Solway-ExtraBold",
  fontSize: 28,
  lineHeight: 36,
} as const;

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

const TOP_ROW_HEIGHT = 64;
const TITLE_LINE_HEIGHT = HEADLINE_MEDIUM.lineHeight;
const TITLE_BOTTOM_PADDING = 12;
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
  const [titleHeight, setTitleHeight] = useState<number>(TITLE_LINE_HEIGHT);

  const range = Math.max(1, titleHeight + TITLE_BOTTOM_PADDING);
  const expandedHeight = insets.top + TOP_ROW_HEIGHT + range;

  useEffect(() => {
    onHeightChange(expandedHeight);
  }, [expandedHeight, onHeightChange]);

  const { lift, pin, expandedTitle, collapsedTitle, lifted } = useMemo(() => {
    const clamped = (inputRange: number[], outputRange: number[]) =>
      scrollY.interpolate({ inputRange, outputRange, extrapolate: "clamp" });

    return {
      lift: clamped([0, range], [0, -range]),
      pin: clamped([0, range], [0, range]),
      expandedTitle: clamped([0, range * 0.6], [1, 0]),
      collapsedTitle: clamped([range * 0.5, range], [0, 1]),
      lifted: clamped([0, range], [0, 1]),
    };
  }, [scrollY, range]);

  const measureTitle = (event: LayoutChangeEvent) =>
    setTitleHeight(event.nativeEvent.layout.height);

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          height: expandedHeight,
          backgroundColor: theme.bg,
          transform: [{ translateY: lift }],
        },
      ]}
    >
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={scheme === "dark" ? "light-content" : "dark-content"}
      />

      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: theme.surface, opacity: lifted },
        ]}
      />

      <Animated.Text
        numberOfLines={1}
        onLayout={measureTitle}
        style={[
          styles.expandedTitle,
          HEADLINE_MEDIUM,
          {
            top: insets.top + TOP_ROW_HEIGHT,
            color: theme.text,
            opacity: expandedTitle,
          },
        ]}
      >
        {title}
      </Animated.Text>

      <Animated.View
        style={[
          styles.topRow,
          { marginTop: insets.top, transform: [{ translateY: pin }] },
        ]}
      >
        <Animated.Text
          numberOfLines={1}
          style={[
            styles.collapsedTitle,
            TITLE_LARGE,
            { color: theme.text, opacity: collapsedTitle },
          ]}
        >
          {title}
        </Animated.Text>

        {menu ? <AppBarMenu {...menu} /> : null}
      </Animated.View>
    </Animated.View>
  );
}

type AppBarMenuProps = NonNullable<MaterialAppBarProps["menu"]>;

function AppBarMenu({ icon, accessibilityLabel, items }: AppBarMenuProps) {
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
  topRow: {
    height: TOP_ROW_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: EDGE_INSET,
  },
  collapsedTitle: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
  },
  expandedTitle: {
    position: "absolute",
    left: Spacing.md,
    right: Spacing.md,
  },
  menu: {
    minWidth: TOUCH_TARGET,
    minHeight: TOUCH_TARGET,
    alignItems: "center",
    justifyContent: "center",
  },
});
