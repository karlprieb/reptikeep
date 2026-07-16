import {
  Host,
  HStack,
  Image,
  Rectangle,
  Text,
  VStack,
  ZStack,
} from "@expo/ui/swift-ui";
import {
  accessibilityHidden,
  accessibilityHint,
  accessibilityLabel,
  aspectRatio,
  background,
  clipShape,
  cornerRadius,
  foregroundStyle,
  frame,
  glassEffect,
  italic,
  lineLimit,
  opacity,
  padding,
  resizable,
} from "@expo/ui/swift-ui/modifiers";
import { Pressable, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

import {
  ActivitySymbols,
  Radius,
  Spacing,
  type SFSymbolName,
  type Theme,
} from "@/constants/theme";
import { typeFont } from "@/constants/type-font";
import type { Animal } from "@/state/animal";
import type { CareSchedule } from "@/state/care-schedule";
import { getAnimalPhotoUri } from "@/utils/animal-photo-storage";
import { feedingStatus } from "@/utils/feeding-status";
import { scheduleDaysOverdue } from "@/utils/schedule";

export const SEX_SYMBOLS: Record<Animal["sex"], string | null> = {
  unknown: null,
  male: "♂",
  female: "♀",
};

export const CARD_ASPECT_RATIO = 0.8;

const SCRIM_GRADIENT_COLORS = ["rgba(14, 9, 4, 1)", "rgba(14, 9, 4, 0)"];
const ON_PHOTO_TEXT = "#FFFFFF";
const ON_PHOTO_TEXT_SECONDARY = "rgba(255, 255, 255, 0.82)";

type OverdueTask = {
  id: "feed" | "water";
  icon: SFSymbolName;
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
  placeholderLayout?: "compact" | "grid";
  onPress: () => void;
};

export function AnimalCard({
  animal,
  width,
  height,
  theme,
  lastFedAt,
  waterSchedule,
  lastWaterChangeAt,
  placeholderLayout = "grid",
  onPress,
}: AnimalCardProps) {
  const { t } = useTranslation();
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
  const waterOverdue =
    scheduleDaysOverdue(lastWaterChangeAt, waterSchedule) !== null;
  const overdueTasks: OverdueTask[] = [
    ...(feeding.overdue
      ? [
          {
            id: "feed" as const,
            icon: ActivitySymbols.feed,
            label: feeding.line,
          },
        ]
      : []),
    ...(waterOverdue
      ? [
          {
            id: "water" as const,
            icon: "drop.fill" as SFSymbolName,
            label: t("water.overdue"),
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
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}
    >
      <Host style={{ width, height }} matchContents={false}>
        <ZStack
          alignment="bottomLeading"
          modifiers={[
            frame({ width, height }),
            cornerRadius(Radius.lg),
            accessibilityLabel(label),
            accessibilityHint(hint),
          ]}
        >
          {animal.photo ? (
            <>
              <Image
                uiImage={getAnimalPhotoUri(animal.photo)}
                modifiers={[
                  resizable(),
                  aspectRatio({ contentMode: "fill" }),
                  frame({ width, height }),
                ]}
              />
              <Rectangle
                modifiers={[
                  frame({ width, height: height / 1.5 }),
                  foregroundStyle({
                    type: "linearGradient",
                    colors: SCRIM_GRADIENT_COLORS,
                    startPoint: { x: 0.5, y: 1 },
                    endPoint: { x: 0.5, y: 0 },
                  }),
                ]}
              />
            </>
          ) : (
            <>
              <Rectangle
                modifiers={[
                  frame({ width, height }),
                  foregroundStyle(theme.surfaceSunken),
                ]}
              />
              <Text
                modifiers={[
                  typeFont("displayXl"),
                  foregroundStyle(theme.textMuted),
                  opacity(0.36),
                  padding({ horizontal: Spacing.lg, top: Spacing.lg }),
                  frame({
                    width,
                    height,
                    alignment:
                      placeholderLayout === "compact" ? "trailing" : "top",
                  }),
                  accessibilityHidden(true),
                ]}
              >
                {monogram}
              </Text>
            </>
          )}

          <VStack
            alignment="leading"
            spacing={Spacing["2xs"]}
            modifiers={[
              padding({ horizontal: Spacing.md, top: Spacing.sm }),
              frame({ width, height, alignment: "topLeading" }),
              accessibilityHidden(true),
            ]}
          >
            {overdueTasks.length > 0 ? (
              <VStack alignment="leading" spacing={Spacing["2xs"]}>
                {overdueTasks.map((task) => (
                  <HStack
                    key={task.id}
                    spacing={Spacing["2xs"]}
                    modifiers={[
                      padding({
                        vertical: Spacing["2xs"],
                        horizontal: Spacing.xs,
                      }),
                      ...(animal.photo
                        ? [
                            glassEffect({
                              glass: {
                                variant: "regular",
                                tint: theme.dangerSurface,
                              },
                              shape: "capsule",
                            }),
                          ]
                        : [
                            background(theme.dangerSurface),
                            clipShape("capsule"),
                          ]),
                    ]}
                  >
                    <Image
                      systemName={task.icon}
                      modifiers={[
                        typeFont("bodyS"),
                        foregroundStyle(theme.danger),
                        frame({ width: Spacing.md, alignment: "leading" }),
                      ]}
                    />
                    <Text
                      testID={`animal-card-overdue-${task.id}`}
                      modifiers={[
                        typeFont("bodyS"),
                        foregroundStyle(theme.danger),
                        lineLimit(2),
                      ]}
                    >
                      {task.label}
                    </Text>
                  </HStack>
                ))}
              </VStack>
            ) : (
              <HStack
                spacing={Spacing["2xs"]}
                modifiers={[padding({ top: Spacing["2xs"] })]}
              >
                <Image
                  systemName={feeding.icon}
                  modifiers={[
                    typeFont("bodyS"),
                    foregroundStyle(feedingColor),
                    frame({ width: Spacing.md, alignment: "leading" }),
                  ]}
                />
                <Text
                  modifiers={[
                    typeFont("bodyS"),
                    foregroundStyle(feedingColor),
                    lineLimit(2),
                  ]}
                >
                  {feeding.line}
                </Text>
              </HStack>
            )}
          </VStack>

          <VStack
            alignment="leading"
            spacing={Spacing["2xs"]}
            modifiers={[
              padding({ horizontal: Spacing.md, bottom: Spacing.md }),
              frame({ width, height, alignment: "bottomLeading" }),
            ]}
          >
            <HStack spacing={Spacing["2xs"]}>
              <Text
                modifiers={[
                  typeFont("title"),
                  foregroundStyle(titleColor),
                  lineLimit(1),
                ]}
              >
                {animal.name}
              </Text>
              {symbol ? (
                <Text
                  modifiers={[
                    typeFont("title", { systemFace: true }),
                    foregroundStyle(titleColor),
                  ]}
                >
                  {symbol}
                </Text>
              ) : null}
            </HStack>

            {animal.commonName ? (
              <Text
                modifiers={[
                  typeFont("body"),
                  foregroundStyle(subtitleColor),
                  lineLimit(2),
                ]}
              >
                {animal.commonName}
              </Text>
            ) : null}

            {animal.scientificName ? (
              <Text
                modifiers={[
                  typeFont("bodyS"),
                  foregroundStyle(subtitleColor),
                  italic(),
                  lineLimit(1),
                ]}
              >
                {animal.scientificName}
              </Text>
            ) : null}
          </VStack>
        </ZStack>
      </Host>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.72,
  },
});
