import {
  Button,
  Circle,
  Form,
  Host,
  HStack,
  Image,
  LabeledContent,
  Section,
  Text,
  VStack,
  ZStack,
} from "@expo/ui/swift-ui";
import {
  accessibilityElement,
  accessibilityLabel,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  listRowBackground,
  minimumScaleFactor,
} from "@expo/ui/swift-ui/modifiers";
import { router, Stack } from "expo-router";
import { useWindowDimensions, View } from "react-native";
import { useTranslation } from "react-i18next";

import {
  FormSectionFooter,
  FormSectionHeader,
  useFormModifiers,
} from "@/components/form-sheet";
import { formSheetStyles as styles } from "@/constants/form-sheet-ios";
import {
  ActivitySymbols,
  CategoryColors,
  Spacing,
  Typography,
} from "@/constants/theme";
import { typeFont } from "@/constants/type-font";
import { useActivityDetail } from "@/hooks/use-activity-detail";
import { useTheme } from "@/hooks/use-theme";
import type { AnimalActivity } from "@/utils/animal-activity";
import { relativeLine } from "@/utils/relative-date";

const BADGE_DIAMETER = 52;
const BADGE_SYMBOL_RATIO = 0.46;
const BADGE_MAX_SCALE = 1.6;

export type ActivityDetailSheetProps = {
  entry: AnimalActivity;
  animalName: string;
};

export function ActivityDetailSheet({
  entry,
  animalName,
}: ActivityDetailSheetProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { fontScale } = useWindowDimensions();
  const modifiers = useFormModifiers();

  const {
    animalId,
    typeName,
    detail,
    notes,
    linkedDocuments,
    occurredDate,
    occurredTime,
    recordedDate,
    backdated,
    openEdit: handleEdit,
    confirmDelete: handleDelete,
  } = useActivityDetail(entry);

  const badgeSize = Math.round(
    BADGE_DIAMETER * Math.min(fontScale, BADGE_MAX_SCALE),
  );

  return (
    <>
      <Stack.Title
        style={{ fontFamily: Typography.title.fontFamily, color: theme.text }}
      >
        {typeName}
      </Stack.Title>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          tintColor={theme.textSecondary}
          accessibilityLabel={t("activityDetail.done")}
          accessibilityHint={t("activityDetail.doneHint")}
          onPress={() => router.back()}
        >
          {t("activityDetail.done")}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu
          icon="ellipsis"
          tintColor={theme.text}
          accessibilityLabel={t("activityDetail.actions")}
          accessibilityHint={t("activityDetail.actionsHint")}
        >
          <Stack.Toolbar.MenuAction
            icon="square.and.pencil"
            onPress={handleEdit}
          >
            {t("activityDetail.edit")}
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            icon="trash"
            destructive
            onPress={handleDelete}
          >
            {t("activityDetail.delete")}
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>

      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <Host
          style={styles.host}
          useViewportSizeMeasurement
          seedColor={theme.primary}
        >
          <Form modifiers={modifiers.form}>
            <Section
              footer={
                <FormSectionFooter>
                  {backdated
                    ? t("activityDetail.recordedOn", { date: recordedDate })
                    : t("activityDetail.loggedFor", { animalName })}
                </FormSectionFooter>
              }
              modifiers={modifiers.row}
            >
              <HStack
                alignment="center"
                spacing={Spacing.md}
                modifiers={[
                  frame({ maxWidth: Infinity, alignment: "leading" }),
                  accessibilityElement("combine"),
                  accessibilityLabel(
                    [typeName, occurredDate, occurredTime]
                      .filter((part): part is string => Boolean(part))
                      .join(", "),
                  ),
                ]}
              >
                <ZStack
                  modifiers={[frame({ width: badgeSize, height: badgeSize })]}
                >
                  <Circle
                    modifiers={[foregroundStyle(CategoryColors[entry.type])]}
                  />
                  <Image
                    systemName={ActivitySymbols[entry.type]}
                    modifiers={[
                      font({
                        size: Math.round(badgeSize * BADGE_SYMBOL_RATIO),
                        weight: "semibold",
                      }),
                      foregroundStyle(theme.onPrimary),
                    ]}
                  />
                </ZStack>

                <VStack alignment="leading" spacing={Spacing["2xs"]}>
                  <Text
                    modifiers={[
                      typeFont("title"),
                      foregroundStyle(theme.text),
                      lineLimit(1),
                      minimumScaleFactor(0.7),
                    ]}
                  >
                    {occurredDate}
                  </Text>
                  <Text
                    modifiers={[
                      typeFont("bodyS"),
                      foregroundStyle(theme.textSecondary),
                    ]}
                  >
                    {[occurredTime, relativeLine(entry.occurredAt, "ago", t)]
                      .filter((part): part is string => Boolean(part))
                      .join(" · ")}
                  </Text>
                </VStack>
              </HStack>
            </Section>

            <Section
              header={
                detail.rows.length ? (
                  <FormSectionHeader>{detail.header}</FormSectionHeader>
                ) : undefined
              }
              modifiers={modifiers.row}
            >
              {detail.rows.length ? (
                detail.rows.map((row) => (
                  <LabeledContent
                    key={row.key}
                    label={row.label}
                    modifiers={[listRowBackground(theme.surface)]}
                  >
                    <Text
                      modifiers={[
                        typeFont(row.mono ? "data" : "body"),
                        foregroundStyle(
                          row.flagged ? theme.warning : theme.textSecondary,
                        ),
                        lineLimit(1),
                        minimumScaleFactor(0.7),
                      ]}
                    >
                      {row.value}
                    </Text>
                  </LabeledContent>
                ))
              ) : (
                <Text
                  modifiers={[
                    typeFont("body"),
                    foregroundStyle(theme.text),
                    frame({ maxWidth: Infinity, alignment: "leading" }),
                  ]}
                >
                  {detail.header}
                </Text>
              )}
            </Section>

            {linkedDocuments.length ? (
              <Section
                header={
                  <FormSectionHeader>
                    {t("medicalForm.documents")}
                  </FormSectionHeader>
                }
                modifiers={modifiers.row}
              >
                {linkedDocuments.map((document) => (
                  <Button
                    key={document.id}
                    onPress={() =>
                      router.push(
                        `/animal/${animalId}/document-preview?documentId=${document.id}`,
                      )
                    }
                  >
                    <Text>{document.title}</Text>
                  </Button>
                ))}
              </Section>
            ) : null}

            {notes ? (
              <Section
                header={
                  <FormSectionHeader>
                    {t("activityDetail.notes")}
                  </FormSectionHeader>
                }
                modifiers={modifiers.row}
              >
                <Text
                  modifiers={[
                    typeFont("body"),
                    foregroundStyle(theme.text),
                    frame({ maxWidth: Infinity, alignment: "leading" }),
                  ]}
                >
                  {notes}
                </Text>
              </Section>
            ) : null}
          </Form>
        </Host>
      </View>
    </>
  );
}
