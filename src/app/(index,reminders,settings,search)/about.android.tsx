import {
  Box,
  Column,
  Host,
  Icon,
  ListItem,
  RNHostView,
  Shape,
  Surface,
  Text,
} from "@expo/ui/jetpack-compose";
import {
  fillMaxSize,
  fillMaxWidth,
  padding,
  semantics,
  size,
} from "@expo/ui/jetpack-compose/modifiers";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { Image, ScrollView, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

import { Radius, Spacing, type Theme } from "@/constants/theme";
import { composeTextStyle } from "@/constants/type-font-compose";
import { useColorScheme, useTheme } from "@/hooks/use-theme";

import CODE_ICON from "@/assets/images/icons/code.xml";

const REPOSITORY_URL = "https://github.com/karlprieb/reptikeep";
const LOGO_SIZE = 176;
const ACTION_ICON_SIZE = 24;

export default function AboutScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const version = Constants.expoConfig?.version ?? "Unknown";
  const logoUri = Image.resolveAssetSource(
    colorScheme === "dark"
      ? require("../../../assets/splash-icon-dark.png")
      : require("../../../assets/splash-icon-light.png"),
  ).uri;

  const openRepository = () => {
    void Linking.openURL(REPOSITORY_URL).catch(() => undefined);
  };

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.content}
    >
      <Host
        style={styles.host}
        matchContents={{ horizontal: false, vertical: true }}
        seedColor={theme.primary}
      >
        <Column modifiers={[fillMaxWidth()]}>
          <Column
            horizontalAlignment="center"
            verticalArrangement={{ spacedBy: Spacing.xs }}
            modifiers={[
              fillMaxWidth(),
              padding(
                Spacing["2xl"],
                Spacing["2xl"],
                Spacing["2xl"],
                Spacing.lg,
              ),
            ]}
          >
            <Box modifiers={[size(LOGO_SIZE, LOGO_SIZE)]}>
              <RNHostView modifiers={[fillMaxSize()]}>
                <Image
                  source={{ uri: logoUri }}
                  style={styles.logo}
                  resizeMode="contain"
                  accessibilityIgnoresInvertColors
                  accessibilityLabel={t("about.logoLabel")}
                />
              </RNHostView>
            </Box>
            <Text style={composeTextStyle("title")} color={theme.text}>
              ReptiKeep
            </Text>
            <Text style={composeTextStyle("body")} color={theme.textSecondary}>
              {t("about.tagline")}
            </Text>
            <Text style={composeTextStyle("data")} color={theme.textSecondary}>
              {t("about.version", { version })}
            </Text>
          </Column>

          <Column
            modifiers={[
              fillMaxWidth(),
              padding(Spacing.lg, 0, Spacing.lg, Spacing.lg),
            ]}
          >
            <RepositoryRow
              theme={theme}
              label={t("about.repository")}
              hint={t("a11y.about.repositoryHint")}
              onPress={openRepository}
            />
          </Column>
        </Column>
      </Host>
    </ScrollView>
  );
}

function RepositoryRow({
  theme,
  label,
  hint,
  onPress,
}: {
  theme: Theme;
  label: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <Surface
      onClick={onPress}
      color={theme.surface}
      shape={Shape.RoundedCorner({
        cornerRadii: {
          topStart: Radius.md,
          topEnd: Radius.md,
          bottomStart: Radius.md,
          bottomEnd: Radius.md,
        },
      })}
      border={{ width: 1, color: theme.border }}
      modifiers={[
        fillMaxWidth(),
        semantics({
          contentDescription: `${label}, ${hint}`,
          role: "button",
          mergeDescendants: true,
        }),
      ]}
    >
      <ListItem
        colors={{
          containerColor: theme.surface,
          contentColor: theme.text,
          leadingContentColor: theme.primary,
        }}
      >
        <ListItem.LeadingContent>
          <Icon
            source={CODE_ICON}
            tint={theme.primary}
            size={ACTION_ICON_SIZE}
          />
        </ListItem.LeadingContent>
        <ListItem.HeadlineContent>
          <Text style={composeTextStyle("bodyL")} color={theme.text}>
            {label}
          </Text>
        </ListItem.HeadlineContent>
      </ListItem>
    </Surface>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    width: "100%",
  },
  content: {
    paddingBottom: Spacing["2xl"],
  },
  host: {
    width: "100%",
  },
  logo: {
    width: "100%",
    height: "100%",
  },
});
