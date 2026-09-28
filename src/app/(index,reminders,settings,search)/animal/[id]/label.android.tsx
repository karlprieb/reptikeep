import {
  Column,
  ExtendedFloatingActionButton,
  Host,
  Icon,
  IconButton,
  Row,
  Text as ComposeText,
} from "@expo/ui/jetpack-compose";
import {
  defaultMinSize,
  fillMaxWidth,
  padding,
  weight,
} from "@expo/ui/jetpack-compose/modifiers";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { Animated, StatusBar, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PdfRendererView from "react-native-pdf-renderer";
import { useTranslation } from "react-i18next";

import { AnimalNotFound, useAnimalRoute } from "@/components/animal-route";
import {
  ACTION_ICON_SIZE,
  FormSheetSnackbar,
  MenuField,
  Section,
  SegmentedField,
  SwitchRow,
  TITLE_LARGE,
  TOP_BAR_HEIGHT,
  useScrollLift,
  type SnackbarHostRef,
} from "@/components/form-sheet";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useLabelEditor } from "@/hooks/use-label-editor";
import { useColorScheme, useTheme } from "@/hooks/use-theme";
import {
  LABEL_SIZES,
  LABEL_TARGETS,
  labelGeometry,
  labelPageGeometry,
  PAPER_SIZES,
} from "@/utils/animal-label";

import ARROW_BACK_ICON from "@/assets/images/icons/arrow-back.xml";
import PRINT_ICON from "@/assets/images/icons/print.xml";
import SHARE_ICON from "@/assets/images/icons/share.xml";

const PREVIEW = labelPageGeometry("tag");

export default function AnimalLabelScreen() {
  const theme = useTheme();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { animal } = useAnimalRoute();
  const { lifted, onScroll } = useScrollLift();
  const snackbar = useRef<SnackbarHostRef>(null);
  const [topBarHeight, setTopBarHeight] = useState(insets.top + TOP_BAR_HEIGHT);
  const [fabHeight, setFabHeight] = useState(0);

  const showMessage = (message: string) => {
    void snackbar.current?.showSnackbar({ message, duration: "short" });
  };
  const label = useLabelEditor(animal, () => showMessage(t("label.error")));

  if (!animal) return <AnimalNotFound />;

  const iconSize = ACTION_ICON_SIZE;
  const handlePrint = () =>
    label.hasContent ? void label.print() : showMessage(t("label.empty"));
  const handleShare = () =>
    label.hasContent ? void label.share() : showMessage(t("label.empty"));

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: topBarHeight,
          paddingBottom: insets.bottom + Spacing.lg + fabHeight + Spacing.lg,
          paddingHorizontal: Spacing.md,
        }}
        scrollEventThrottle={16}
        onScroll={onScroll}
      >
        <View
          style={[
            styles.previewWrap,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          {label.hasContent ? (
            <View
              style={[
                styles.previewPaper,
                { aspectRatio: PREVIEW.widthPt / PREVIEW.heightPt },
              ]}
            >
              {label.previewUri ? (
                <PdfRendererView
                  source={label.previewUri}
                  singlePage
                  style={styles.pdf}
                />
              ) : null}
            </View>
          ) : (
            <View
              style={[
                styles.empty,
                { aspectRatio: PREVIEW.widthPt / PREVIEW.heightPt },
              ]}
            >
              <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                {t("label.empty")}
              </ThemedText>
            </View>
          )}
        </View>

        <Host
          style={styles.host}
          matchContents={{ horizontal: false, vertical: true }}
          seedColor={theme.primary}
        >
          <Column
            verticalArrangement={{ spacedBy: Spacing.xl }}
            horizontalAlignment="start"
            modifiers={[fillMaxWidth()]}
          >
            <Section title={t("label.size.label")}>
              <SegmentedField
                value={label.size}
                options={LABEL_SIZES}
                labelFor={(value) =>
                  t("label.size.dimensions", {
                    width: labelGeometry(value).widthMm,
                    height: labelGeometry(value).heightMm,
                  })
                }
                onChange={label.changeSize}
                theme={theme}
              />
            </Section>

            <Section>
              <MenuField
                label={t("label.target.label")}
                value={t(`label.target.${label.target}`)}
                theme={theme}
                iconSize={iconSize}
                items={LABEL_TARGETS.map((value) => ({
                  value,
                  label: t(`label.target.${value}`),
                  selected: value === label.target,
                }))}
                onSelect={label.changeTarget}
              />
            </Section>

            <Section>
              <MenuField
                label={t("label.paper.label")}
                value={t(`label.paper.${label.paper}`)}
                theme={theme}
                iconSize={iconSize}
                items={PAPER_SIZES.map((value) => ({
                  value,
                  label: t(`label.paper.${value}`),
                  selected: value === label.paper,
                }))}
                onSelect={label.changePaper}
              />
            </Section>

            <Section
              title={t("label.fields.section")}
              footer={t(`label.footer.${label.target}`, {
                animalName: animal.name,
              })}
            >
              {label.fieldKeys.map((key) => (
                <SwitchRow
                  key={key}
                  label={t(`label.fields.${key}`)}
                  checked={label.fields[key]}
                  onCheckedChange={(value) => label.toggleField(key, value)}
                  theme={theme}
                />
              ))}
            </Section>
          </Column>
        </Host>
      </Animated.ScrollView>

      <View
        style={[styles.topBar, { paddingTop: insets.top }]}
        pointerEvents="box-none"
        onLayout={(event) => setTopBarHeight(event.nativeEvent.layout.height)}
      >
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
        <Host
          style={styles.topBarHost}
          matchContents={{ horizontal: false, vertical: true }}
          seedColor={theme.primary}
        >
          <Row
            verticalAlignment="center"
            horizontalArrangement={{ spacedBy: Spacing["2xs"] }}
            modifiers={[
              fillMaxWidth(),
              defaultMinSize({ minHeight: TOP_BAR_HEIGHT }),
              padding(4, Spacing["2xs"], Spacing.md, Spacing["2xs"]),
            ]}
          >
            <IconButton
              onClick={() => router.back()}
              colors={{ contentColor: theme.text }}
            >
              <Icon
                source={ARROW_BACK_ICON}
                tint={theme.text}
                size={iconSize}
                contentDescription={t("animal.back")}
              />
            </IconButton>

            <ComposeText
              style={TITLE_LARGE}
              color={theme.text}
              maxLines={1}
              overflow="ellipsis"
              modifiers={[weight(1)]}
            >
              {t("label.title")}
            </ComposeText>

            <IconButton
              onClick={handleShare}
              colors={{ contentColor: theme.text }}
            >
              <Icon
                source={SHARE_ICON}
                tint={theme.text}
                size={iconSize}
                contentDescription={t("label.share")}
              />
            </IconButton>
          </Row>
        </Host>
      </View>

      <View
        style={[styles.fabWrap, { bottom: insets.bottom + Spacing.lg }]}
        pointerEvents="box-none"
        onLayout={(event) => setFabHeight(event.nativeEvent.layout.height)}
      >
        <Host matchContents seedColor={theme.primary}>
          <ExtendedFloatingActionButton
            onClick={handlePrint}
            containerColor={theme.primary}
          >
            <ExtendedFloatingActionButton.Icon>
              <Icon
                source={PRINT_ICON}
                tint={theme.onPrimary}
                size={iconSize}
                contentDescription={t("a11y.label.print.hint")}
              />
            </ExtendedFloatingActionButton.Icon>
            <ExtendedFloatingActionButton.Text>
              <ComposeText color={theme.onPrimary}>
                {t("label.print")}
              </ComposeText>
            </ExtendedFloatingActionButton.Text>
          </ExtendedFloatingActionButton>
        </Host>
      </View>

      <FormSheetSnackbar
        ref={snackbar}
        insetsBottom={insets.bottom}
        theme={theme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  previewWrap: {
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  previewPaper: {
    width: "100%",
    borderRadius: Radius.sm,
    overflow: "hidden",
  },
  pdf: { flex: 1 },
  empty: { width: "100%", justifyContent: "center" },
  emptyText: { textAlign: "center" },
  host: { width: "100%" },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  topBarHost: { width: "100%" },
  fabWrap: {
    position: "absolute",
    right: Spacing.lg,
  },
});
