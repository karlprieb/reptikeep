import {
  Box,
  Column,
  DropdownMenu,
  DropdownMenuItem,
  Host,
  Icon,
  IconButton,
  Row,
  Text,
} from "@expo/ui/jetpack-compose";
import {
  background,
  clickable,
  clip,
  fillMaxWidth,
  padding,
  Shapes,
  size,
  weight,
} from "@expo/ui/jetpack-compose/modifiers";
import { router } from "expo-router";
import { useState } from "react";
import {
  Animated,
  StatusBar,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LabeledRow, Section } from "@/components/form-sheet";
import {
  formSheetAndroidStyles as styles,
  DATA_STYLE,
} from "@/constants/form-sheet-android";
import {
  ACTION_ICON_SIZE,
  TITLE_LARGE,
  TOP_BAR_HEIGHT,
  useScrollLift,
} from "@/utils/form-sheet-shared";
import { ActivityIcons } from "@/constants/activity-icons";
import { CategoryColors, Spacing } from "@/constants/theme";
import { composeTextStyle } from "@/constants/type-font-compose";
import { useActivityDetail } from "@/hooks/use-activity-detail";
import { useColorScheme, useTheme } from "@/hooks/use-theme";
import type { AnimalActivity } from "@/utils/animal-activity";
import { relativeLine } from "@/utils/relative-date";

import ARROW_BACK_ICON from "@/assets/images/icons/arrow-back.xml";
import DELETE_ICON from "@/assets/images/icons/delete.xml";
import DESCRIPTION_ICON from "@/assets/images/icons/description.xml";
import MODE_EDIT_ICON from "@/assets/images/icons/mode-edit.xml";
import MORE_VERT_ICON from "@/assets/images/icons/more-vert.xml";

const BADGE_DIAMETER = 52;
const BADGE_SYMBOL_RATIO = 0.55;
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
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { fontScale } = useWindowDimensions();
  const { lifted, onScroll } = useScrollLift();
  const [menuOpen, setMenuOpen] = useState(false);

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
    openEdit,
    confirmDelete,
  } = useActivityDetail(entry);

  const badgeSize = Math.round(
    BADGE_DIAMETER * Math.min(fontScale, BADGE_MAX_SCALE),
  );
  const iconSize = ACTION_ICON_SIZE * Math.min(fontScale, 2);
  const horizontalInset = Spacing.md * Math.min(fontScale, 1.6);

  const handleEdit = () => {
    setMenuOpen(false);
    openEdit();
  };

  const handleDelete = () => {
    setMenuOpen(false);
    confirmDelete();
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: insets.top + TOP_BAR_HEIGHT * Math.min(fontScale, 1.5),
          paddingBottom: insets.bottom + Spacing["2xl"],
          paddingHorizontal: horizontalInset,
        }}
        scrollEventThrottle={16}
        onScroll={onScroll}
      >
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
            <Section
              footer={
                backdated
                  ? t("activityDetail.recordedOn", { date: recordedDate })
                  : t("activityDetail.loggedFor", { animalName })
              }
            >
              <Row
                verticalAlignment="center"
                horizontalArrangement={{ spacedBy: Spacing.md }}
                modifiers={[fillMaxWidth()]}
              >
                <Box
                  contentAlignment="center"
                  modifiers={[
                    size(badgeSize, badgeSize),
                    clip(Shapes.Circle),
                    background(CategoryColors[entry.type]),
                  ]}
                >
                  <Icon
                    source={ActivityIcons[entry.type]}
                    tint={theme.onPrimary}
                    size={Math.round(badgeSize * BADGE_SYMBOL_RATIO)}
                    contentDescription={typeName}
                  />
                </Box>

                <Column
                  horizontalAlignment="start"
                  verticalArrangement={{ spacedBy: Spacing["2xs"] }}
                  modifiers={[weight(1)]}
                >
                  <Text
                    style={{ ...TITLE_LARGE, fontSize: 21, lineHeight: 26.25 }}
                    color={theme.text}
                    maxLines={1}
                    overflow="ellipsis"
                  >
                    {occurredDate}
                  </Text>
                  <Text
                    style={composeTextStyle("bodyS")}
                    color={theme.textSecondary}
                  >
                    {[occurredTime, relativeLine(entry.occurredAt, "ago", t)]
                      .filter((part): part is string => Boolean(part))
                      .join(" · ")}
                  </Text>
                </Column>
              </Row>
            </Section>

            <Section title={detail.rows.length ? detail.header : undefined}>
              {detail.rows.length ? (
                detail.rows.map((row) => (
                  <LabeledRow key={row.key} label={row.label} theme={theme}>
                    <Text
                      style={row.mono ? DATA_STYLE : composeTextStyle("body")}
                      color={row.flagged ? theme.warning : theme.textSecondary}
                      maxLines={1}
                      overflow="ellipsis"
                    >
                      {row.value}
                    </Text>
                  </LabeledRow>
                ))
              ) : (
                <Text
                  style={composeTextStyle("body")}
                  color={theme.text}
                  modifiers={[fillMaxWidth()]}
                >
                  {detail.header}
                </Text>
              )}
            </Section>

            {linkedDocuments.length ? (
              <Section title={t("medicalForm.documents")}>
                {linkedDocuments.map((document) => (
                  <Box
                    key={document.id}
                    modifiers={[
                      fillMaxWidth(),
                      clickable(() =>
                        router.push(
                          `/animal/${animalId}/document-preview?documentId=${document.id}`,
                        ),
                      ),
                    ]}
                  >
                    <Row
                      verticalAlignment="center"
                      horizontalArrangement={{ spacedBy: Spacing.xs }}
                      modifiers={[
                        fillMaxWidth(),
                        padding(0, Spacing["2xs"], 0, Spacing["2xs"]),
                      ]}
                    >
                      <Icon
                        source={DESCRIPTION_ICON}
                        tint={theme.textSecondary}
                        size={iconSize}
                      />
                      <Text
                        style={composeTextStyle("body")}
                        color={theme.text}
                        maxLines={1}
                        overflow="ellipsis"
                      >
                        {document.title}
                      </Text>
                    </Row>
                  </Box>
                ))}
              </Section>
            ) : null}

            {notes ? (
              <Section title={t("activityDetail.notes")}>
                <Text
                  style={composeTextStyle("body")}
                  color={theme.text}
                  modifiers={[fillMaxWidth()]}
                >
                  {notes}
                </Text>
              </Section>
            ) : null}
          </Column>
        </Host>
      </Animated.ScrollView>

      <View
        style={[topBarStyles.topBar, { paddingTop: insets.top }]}
        pointerEvents="box-none"
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
          style={topBarStyles.topBarHost}
          matchContents={{ horizontal: false, vertical: true }}
          seedColor={theme.primary}
        >
          <Row
            verticalAlignment="center"
            horizontalArrangement={{ spacedBy: Spacing["2xs"] }}
            modifiers={[
              fillMaxWidth(),
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
                contentDescription={t("activityDetail.done")}
              />
            </IconButton>

            <Text
              style={TITLE_LARGE}
              color={theme.text}
              maxLines={1}
              overflow="ellipsis"
              modifiers={[weight(1)]}
            >
              {typeName}
            </Text>

            <DropdownMenu
              expanded={menuOpen}
              onDismissRequest={() => setMenuOpen(false)}
              color={theme.surface}
            >
              <DropdownMenu.Trigger>
                <IconButton
                  onClick={() => setMenuOpen(true)}
                  colors={{ contentColor: theme.text }}
                >
                  <Icon
                    source={MORE_VERT_ICON}
                    tint={theme.text}
                    size={iconSize}
                    contentDescription={t("activityDetail.actions")}
                  />
                </IconButton>
              </DropdownMenu.Trigger>
              <DropdownMenu.Items>
                <DropdownMenuItem onClick={handleEdit}>
                  <DropdownMenuItem.Text>
                    <Text style={composeTextStyle("body")} color={theme.text}>
                      {t("activityDetail.edit")}
                    </Text>
                  </DropdownMenuItem.Text>
                  <DropdownMenuItem.LeadingIcon>
                    <Icon
                      source={MODE_EDIT_ICON}
                      tint={theme.text}
                      size={iconSize}
                    />
                  </DropdownMenuItem.LeadingIcon>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDelete}
                  elementColors={{
                    textColor: theme.danger,
                    leadingIconColor: theme.danger,
                  }}
                >
                  <DropdownMenuItem.Text>
                    <Text style={composeTextStyle("body")} color={theme.danger}>
                      {t("activityDetail.delete")}
                    </Text>
                  </DropdownMenuItem.Text>
                  <DropdownMenuItem.LeadingIcon>
                    <Icon
                      source={DELETE_ICON}
                      tint={theme.danger}
                      size={iconSize}
                    />
                  </DropdownMenuItem.LeadingIcon>
                </DropdownMenuItem>
              </DropdownMenu.Items>
            </DropdownMenu>
          </Row>
        </Host>
      </View>
    </View>
  );
}

const topBarStyles = StyleSheet.create({
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  topBarHost: {
    width: "100%",
  },
});
