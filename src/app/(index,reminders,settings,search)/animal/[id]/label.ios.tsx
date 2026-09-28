import { Form, Host, Section, Text, Toggle } from "@expo/ui/swift-ui";
import {
  foregroundStyle,
  listRowBackground,
} from "@expo/ui/swift-ui/modifiers";
import { Stack } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { Alert, StyleSheet, View } from "react-native";
import PdfRendererView from "react-native-pdf-renderer";
import { useTranslation } from "react-i18next";

import { AnimalNotFound, useAnimalRoute } from "@/components/animal-route";
import { DefaultPicker, useFormModifiers } from "@/components/form-sheet";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing, Typography } from "@/constants/theme";
import { useLabelEditor } from "@/hooks/use-label-editor";
import { useTheme } from "@/hooks/use-theme";
import {
  LABEL_SIZES,
  LABEL_TARGETS,
  labelGeometry,
  labelPageGeometry,
  PAPER_SIZES,
} from "@/utils/animal-label";

const PREVIEW = labelPageGeometry("tag");

export default function AnimalLabelScreen() {
  const theme = useTheme();
  const headerHeight = useHeaderHeight();
  const { t } = useTranslation();
  const { animal } = useAnimalRoute();
  const formModifiers = useFormModifiers();
  const label = useLabelEditor(animal, () => Alert.alert(t("label.error")));

  if (!animal) return <AnimalNotFound />;

  return (
    <>
      <Stack.Title
        style={{ fontFamily: Typography.title.fontFamily, color: theme.text }}
      >
        {t("label.title")}
      </Stack.Title>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="printer"
          tintColor={theme.text}
          disabled={!label.hasContent}
          accessibilityLabel={t("label.print")}
          accessibilityHint={t("a11y.label.print.hint")}
          onPress={() => void label.print()}
        />
        <Stack.Toolbar.Button
          icon="square.and.arrow.up"
          tintColor={theme.text}
          disabled={!label.hasContent}
          accessibilityLabel={t("label.share")}
          accessibilityHint={t("a11y.label.share.hint")}
          onPress={() => void label.share()}
        />
      </Stack.Toolbar>

      <View
        style={[
          styles.container,
          { backgroundColor: theme.bg, paddingTop: headerHeight },
        ]}
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

        <Host style={styles.host} useViewportSizeMeasurement>
          <Form modifiers={formModifiers.form}>
            <Section>
              <DefaultPicker
                label={t("label.size.label")}
                hint={t("a11y.label.size.hint")}
                options={LABEL_SIZES}
                describe={(value) =>
                  t("label.size.dimensions", {
                    width: labelGeometry(value).widthMm,
                    height: labelGeometry(value).heightMm,
                  })
                }
                value={label.size}
                onChange={(value) => value && label.changeSize(value)}
              />
              <DefaultPicker
                label={t("label.target.label")}
                hint={t("a11y.label.target.hint")}
                options={LABEL_TARGETS}
                describe={(value) => t(`label.target.${value}`)}
                value={label.target}
                onChange={(value) => value && label.changeTarget(value)}
              />
              <DefaultPicker
                label={t("label.paper.label")}
                hint={t("a11y.label.paper.hint")}
                options={PAPER_SIZES}
                describe={(value) => t(`label.paper.${value}`)}
                value={label.paper}
                onChange={(value) => value && label.changePaper(value)}
              />
            </Section>
            <Section
              header={
                <Text modifiers={[foregroundStyle(theme.textSecondary)]}>
                  {t("label.fields.section")}
                </Text>
              }
              footer={
                <Text modifiers={[foregroundStyle(theme.textSecondary)]}>
                  {t(`label.footer.${label.target}`, {
                    animalName: animal.name,
                  })}
                </Text>
              }
            >
              {label.fieldKeys.map((key) => (
                <Toggle
                  key={key}
                  label={t(`label.fields.${key}`)}
                  isOn={label.fields[key]}
                  onIsOnChange={(value) => label.toggleField(key, value)}
                  modifiers={[listRowBackground(theme.surface)]}
                />
              ))}
            </Section>
          </Form>
        </Host>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  previewWrap: {
    padding: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  previewPaper: {
    width: "100%",
    borderRadius: Radius.sm,
    overflow: "hidden",
  },
  pdf: { flex: 1 },
  empty: { width: "100%", justifyContent: "center" },
  emptyText: { textAlign: "center" },
  host: { flex: 1 },
});
