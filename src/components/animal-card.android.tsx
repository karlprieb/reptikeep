import {
  Box,
  Column,
  Host,
  Icon,
  RNHostView,
  Row,
  Text,
} from "@expo/ui/jetpack-compose";
import {
  align,
  alpha,
  background,
  clickable,
  clip,
  height,
  matchParentSize,
  padding,
  Shapes,
  width,
} from "@expo/ui/jetpack-compose/modifiers";
import { LinearGradient } from "expo-linear-gradient";
import { memo } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { useTranslation } from "react-i18next";

import { Radius, Spacing, type Theme } from "@/constants/theme";
import {
  composeSexSymbolStyle,
  composeTextStyle,
} from "@/constants/type-font-compose";
import type { Animal } from "@/state/animal";
import type { CareSchedule } from "@/state/care-schedule";
import { overdueRoutines, SEX_SYMBOLS } from "@/utils/animal-card-status";
import { getAnimalPhotoUri } from "@/utils/animal-photo-storage";
import { feedingStatus } from "@/utils/feeding-status";

const SCRIM_COLOR = "14,9,4";
const SCRIM_MAX_ALPHA = 0.92;
const ON_PHOTO_TEXT = "#FFFFFF";
const ON_PHOTO_TEXT_SECONDARY = "rgba(255, 255, 255, 0.82)";
const ICON_MAX_SCALE = 2;

const CARE_ICONS = {
  feed: require("@/assets/images/icons/restaurant.xml"),
  water: require("@/assets/images/icons/water-drop.xml"),
  cleaning: require("@/assets/images/icons/sparkle.xml"),
} as const;

type OverdueTask = {
  id: "feed" | "water" | "cleaning";
  icon: (typeof CARE_ICONS)[keyof typeof CARE_ICONS];
  label: string;
};

export type AnimalCardProps = {
  animal: Animal;
  width: number;
  height: number;
  theme: Theme;
  lastFedAt?: string;
  waterSchedule?: CareSchedule;
  lastWaterChangeAt?: string;
  cleaningSchedule?: CareSchedule;
  lastCleanAt?: string;
  placeholderLayout?: "compact" | "grid";
  onPress: () => void;
};

function PhotoScrim({
  cardWidth,
  scrimHeight,
}: {
  cardWidth: number;
  scrimHeight: number;
}) {
  return (
    <Box
      modifiers={[width(cardWidth), height(scrimHeight), align("bottomStart")]}
    >
      <RNHostView modifiers={[matchParentSize()]}>
        <LinearGradient
          colors={[
            `rgba(${SCRIM_COLOR}, 0)`,
            `rgba(${SCRIM_COLOR}, ${SCRIM_MAX_ALPHA})`,
          ]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.scrimGradient}
        />
      </RNHostView>
    </Box>
  );
}

function AnimalCardBase({
  animal,
  width: cardWidth,
  height: cardHeight,
  theme,
  lastFedAt,
  waterSchedule,
  lastWaterChangeAt,
  cleaningSchedule,
  lastCleanAt,
  placeholderLayout = "grid",
  onPress,
}: AnimalCardProps) {
  const { t } = useTranslation();
  const { fontScale } = useWindowDimensions();
  const iconSize = Spacing.md * Math.min(fontScale, ICON_MAX_SCALE);
  const isPlaceholder = !animal.photo;
  const monogram = animal.name.trim().slice(0, 1).toLocaleUpperCase();
  const symbol = SEX_SYMBOLS[animal.sex];
  const sex = animal.sex === "unknown" ? null : t(`sex.${animal.sex}`);
  const hint = t("a11y.animalCard.hint", { animalName: animal.name });
  const titleColor = isPlaceholder ? theme.text : ON_PHOTO_TEXT;
  const subtitleColor = isPlaceholder
    ? theme.textSecondary
    : ON_PHOTO_TEXT_SECONDARY;

  const feeding = feedingStatus(t, lastFedAt, animal.feedingSchedule);
  const { water: waterOverdue, cleaning: cleaningOverdue } = overdueRoutines({
    feedingSchedule: animal.feedingSchedule,
    lastFedAt,
    waterSchedule,
    lastWaterChangeAt,
    cleaningSchedule,
    lastCleanAt,
  });
  const overdueTasks: OverdueTask[] = [
    ...(feeding.overdue
      ? [{ id: "feed" as const, icon: CARE_ICONS.feed, label: feeding.line }]
      : []),
    ...(waterOverdue
      ? [
          {
            id: "water" as const,
            icon: CARE_ICONS.water,
            label: t("water.overdue"),
          },
        ]
      : []),
    ...(cleaningOverdue
      ? [
          {
            id: "cleaning" as const,
            icon: CARE_ICONS.cleaning,
            label: t("cleaning.overdue"),
          },
        ]
      : []),
  ];
  const feedingColor = feeding.overdue ? theme.danger : subtitleColor;

  const label = [
    animal.name,
    animal.commonName,
    animal.scientificName,
    sex,
    ...(overdueTasks.length > 0
      ? overdueTasks.map((task) => task.label)
      : [lastFedAt ? `${t("detail.lastFed")} ${feeding.line}` : feeding.line]),
  ]
    .filter((part): part is string => Boolean(part))
    .join(", ");

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
    >
      <Host
        style={{ width: cardWidth, height: cardHeight }}
        matchContents={false}
      >
        <Box
          contentAlignment="topStart"
          modifiers={[
            width(cardWidth),
            height(cardHeight),
            clip(Shapes.RoundedCorner(Radius.md)),
            clickable(onPress),
          ]}
        >
          {animal.photo ? (
            <RNHostView modifiers={[matchParentSize()]}>
              <Image
                source={{ uri: getAnimalPhotoUri(animal.photo) }}
                style={styles.photo}
                resizeMode="cover"
                accessibilityIgnoresInvertColors
              />
            </RNHostView>
          ) : (
            <Box
              modifiers={[matchParentSize(), background(theme.surfaceSunken)]}
            />
          )}

          {isPlaceholder ? (
            <Text
              style={composeTextStyle("displayXl")}
              color={theme.textMuted}
              modifiers={[
                alpha(0.36),
                padding(Spacing.lg, Spacing.lg, Spacing.lg, 0),
                align(
                  placeholderLayout === "compact" ? "centerEnd" : "topCenter",
                ),
              ]}
            >
              {monogram}
            </Text>
          ) : (
            <PhotoScrim cardWidth={cardWidth} scrimHeight={cardHeight / 1.5} />
          )}

          <Column
            modifiers={[
              width(cardWidth),
              padding(Spacing.md, Spacing.sm, Spacing.md, 0),
              align("topStart"),
            ]}
            verticalArrangement={{ spacedBy: Spacing["2xs"] }}
          >
            {overdueTasks.length > 0 ? (
              overdueTasks.map((task) => (
                <Row
                  key={task.id}
                  verticalAlignment="center"
                  horizontalArrangement={{ spacedBy: Spacing["2xs"] }}
                  modifiers={[
                    clip(Shapes.RoundedCorner(Radius.pill)),
                    background(theme.dangerSurface),
                    padding(
                      Spacing.xs,
                      Spacing["2xs"],
                      Spacing.xs,
                      Spacing["2xs"],
                    ),
                  ]}
                >
                  <Icon
                    source={task.icon}
                    tint={theme.danger}
                    size={iconSize}
                  />
                  <Text
                    style={composeTextStyle("bodyS")}
                    color={theme.danger}
                    maxLines={2}
                    overflow="ellipsis"
                  >
                    {task.label}
                  </Text>
                </Row>
              ))
            ) : (
              <Row
                verticalAlignment="center"
                horizontalArrangement={{ spacedBy: Spacing["2xs"] }}
              >
                <Icon
                  source={CARE_ICONS.feed}
                  tint={feedingColor}
                  size={iconSize}
                />
                <Text
                  style={composeTextStyle("bodyS")}
                  color={feedingColor}
                  maxLines={2}
                  overflow="ellipsis"
                >
                  {feeding.line}
                </Text>
              </Row>
            )}
          </Column>

          <Column
            modifiers={[
              width(cardWidth),
              padding(Spacing.md, 0, Spacing.md, Spacing.md),
              align("bottomStart"),
            ]}
            verticalArrangement={{ spacedBy: Spacing["2xs"] }}
          >
            <Text
              style={composeTextStyle("title")}
              color={titleColor}
              maxLines={1}
              overflow="ellipsis"
            >
              {animal.name}
              {symbol ? (
                <Text
                  style={composeSexSymbolStyle("title")}
                >{` ${symbol}`}</Text>
              ) : null}
            </Text>

            {animal.commonName ? (
              <Text
                style={composeTextStyle("body")}
                color={subtitleColor}
                maxLines={2}
                overflow="ellipsis"
              >
                {animal.commonName}
              </Text>
            ) : null}

            {animal.scientificName ? (
              <Text
                style={{ ...composeTextStyle("bodyS"), fontStyle: "italic" }}
                color={subtitleColor}
                maxLines={1}
                overflow="ellipsis"
              >
                {animal.scientificName}
              </Text>
            ) : null}
          </Column>
        </Box>
      </Host>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  photo: {
    width: "100%",
    height: "100%",
  },
  scrimGradient: {
    width: "100%",
    height: "100%",
  },
});

export const AnimalCard = memo(AnimalCardBase);
