import {
  Button,
  Form,
  Host,
  Image,
  Section,
  Text,
  VStack,
} from "@expo/ui/swift-ui";
import {
  accessibilityAddTraits,
  accessibilityHint,
  accessibilityLabel,
  foregroundStyle,
  frame,
  listRowBackground,
  padding,
  resizable,
} from "@expo/ui/swift-ui/modifiers";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { Image as RNImage, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

import { useFormModifiers } from "@/components/form-sheet";
import { Spacing } from "@/constants/theme";
import { typeStyle } from "@/constants/type-font";
import { useColorScheme, useTheme } from "@/hooks/use-theme";

const REPOSITORY_URL = "https://github.com/karlprieb/reptikeep";

export default function AboutScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const theme = useTheme();
  const formModifiers = useFormModifiers();
  const version = Constants.expoConfig?.version ?? "Unknown";
  const logoUri = RNImage.resolveAssetSource(
    colorScheme === "dark"
      ? require("../../../assets/splash-icon-dark.png")
      : require("../../../assets/splash-icon-light.png"),
  ).uri;

  const openRepository = () => {
    void Linking.openURL(REPOSITORY_URL).catch(() => undefined);
  };

  return (
    <Host style={styles.host} useViewportSizeMeasurement>
      <Form modifiers={formModifiers.form}>
        <Section>
          <VStack
            spacing={Spacing.xs}
            modifiers={[
              frame({ maxWidth: Infinity }),
              padding({ vertical: Spacing.lg }),
              listRowBackground(theme.surface),
            ]}
          >
            <Image
              uiImage={logoUri}
              modifiers={[
                resizable(),
                frame({ width: 176, height: 176 }),
                accessibilityLabel(t("about.logoLabel")),
                accessibilityAddTraits(["isImage"]),
              ]}
            />
            <Text
              modifiers={[...typeStyle("title"), foregroundStyle(theme.text)]}
            >
              ReptiKeep
            </Text>
            <Text modifiers={[foregroundStyle(theme.textSecondary)]}>
              {t("about.tagline")}
            </Text>
            <Text
              modifiers={[
                ...typeStyle("data"),
                foregroundStyle(theme.textSecondary),
              ]}
            >
              {t("about.version", { version })}
            </Text>
          </VStack>
        </Section>

        <Section>
          <Button
            label={t("about.repository")}
            systemImage="chevron.left.forwardslash.chevron.right"
            onPress={openRepository}
            modifiers={[
              listRowBackground(theme.surface),
              accessibilityHint(t("a11y.about.repositoryHint")),
              accessibilityAddTraits(["isLink"]),
            ]}
          />
        </Section>
      </Form>
    </Host>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
  },
});
