import {
  Divider,
  HStack,
  Host,
  Image,
  Rectangle,
  Text,
  VStack,
  ZStack,
} from "@expo/ui/swift-ui";
import {
  accessibilityAddTraits,
  accessibilityElement,
  accessibilityHidden,
  accessibilityHint,
  accessibilityLabel,
  aspectRatio,
  background,
  clipShape,
  contentShape,
  foregroundStyle,
  frame,
  lineLimit,
  onTapGesture,
  padding,
  resizable,
  shapes,
  strokeBorder,
} from "@expo/ui/swift-ui/modifiers";
import { router } from "expo-router";
import { StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

import { Radius, Spacing, type Theme } from "@/constants/theme";
import { typeFont } from "@/constants/type-font";
import type { Animal } from "@/state/animal";
import { useTheme } from "@/hooks/use-theme";
import { SEX_SYMBOLS } from "@/utils/animal-card-status";
import { getAnimalPhotoUri } from "@/utils/animal-photo-storage";
import { feedingStatus } from "@/utils/feeding-status";

const THUMBNAIL_SIZE = 44;

type ReptileRowProps = {
  animal: Animal;
  lastFedAt?: string;
  theme: Theme;
  divided: boolean;
  textInset: number;
};

function ReptileRow({
  animal,
  lastFedAt,
  theme,
  divided,
  textInset,
}: ReptileRowProps) {
  const { t } = useTranslation();
  const feeding = feedingStatus(t, lastFedAt, animal.feedingSchedule);
  const feedingColor = feeding.overdue ? theme.danger : theme.textSecondary;
  const symbol = SEX_SYMBOLS[animal.sex];
  const sex = animal.sex === "unknown" ? null : t(`sex.${animal.sex}`);
  const monogram = animal.name.trim().slice(0, 1).toLocaleUpperCase();

  const hint = t("a11y.animalCard.hint", { animalName: animal.name });
  const label = [
    animal.name,
    animal.commonName,
    animal.scientificName,
    sex,
    feeding.line,
  ]
    .filter((part): part is string => Boolean(part))
    .join(", ");

  const openDetail = () => router.push(`/animal/${animal.id}`);

  return (
    <VStack spacing={0} modifiers={[frame({ maxWidth: Infinity })]}>
      {divided ? (
        <Divider modifiers={[padding({ leading: textInset })]} />
      ) : null}

      <HStack
        alignment="center"
        spacing={Spacing.sm}
        modifiers={[
          padding({ horizontal: Spacing.md, vertical: Spacing.sm }),
          frame({ maxWidth: Infinity }),
          contentShape(shapes.rectangle()),
          onTapGesture(openDetail),
          accessibilityElement("combine"),
          accessibilityAddTraits(["isButton"]),
          accessibilityLabel(label),
          accessibilityHint(hint),
        ]}
      >
        <ZStack
          modifiers={[frame({ width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE })]}
        >
          {animal.photo ? (
            <Image
              uiImage={getAnimalPhotoUri(animal.photo)}
              modifiers={[
                resizable(),
                aspectRatio({ contentMode: "fill" }),
                frame({ width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE }),
                clipShape("roundedRectangle", Radius.sm),
              ]}
            />
          ) : (
            <>
              <Rectangle
                modifiers={[
                  frame({ width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE }),
                  foregroundStyle(theme.surfaceSunken),
                  clipShape("roundedRectangle", Radius.sm),
                ]}
              />
              <Text
                modifiers={[
                  typeFont("body"),
                  foregroundStyle(theme.textMuted),
                  accessibilityHidden(true),
                ]}
              >
                {monogram}
              </Text>
            </>
          )}
        </ZStack>

        <VStack
          alignment="leading"
          spacing={Spacing["2xs"]}
          modifiers={[frame({ maxWidth: Infinity, alignment: "leading" })]}
        >
          <HStack spacing={Spacing["2xs"]}>
            <Text
              modifiers={[
                typeFont("title"),
                foregroundStyle(theme.text),
                lineLimit(1),
              ]}
            >
              {animal.name}
            </Text>
            {symbol ? (
              <Text
                modifiers={[
                  typeFont("title", { systemFace: true }),
                  foregroundStyle(theme.text),
                ]}
              >
                {symbol}
              </Text>
            ) : null}
          </HStack>

          <HStack spacing={Spacing["2xs"]}>
            <Image
              systemName={feeding.icon}
              modifiers={[typeFont("bodyS"), foregroundStyle(feedingColor)]}
            />
            <Text
              modifiers={[
                typeFont("bodyS"),
                foregroundStyle(feedingColor),
                lineLimit(1),
              ]}
            >
              {feeding.line}
            </Text>
          </HStack>
        </VStack>
      </HStack>
    </VStack>
  );
}

export type ReptileRowsProps = {
  animals: Animal[];
  lastFed?: Record<string, string>;
};

export function ReptileRows({ animals, lastFed }: ReptileRowsProps) {
  const theme = useTheme();
  const textInset = Spacing.md + THUMBNAIL_SIZE + Spacing.sm;

  return (
    <Host
      style={styles.host}
      matchContents={{ horizontal: false, vertical: true }}
    >
      <VStack
        spacing={0}
        modifiers={[
          frame({ maxWidth: Infinity }),
          background(theme.surface),
          clipShape("roundedRectangle", Radius.lg),
          strokeBorder({
            color: theme.border,
            style: { lineWidth: StyleSheet.hairlineWidth },
            shape: "roundedRectangle",
            cornerRadius: Radius.lg,
          }),
        ]}
      >
        {animals.map((animal, index) => (
          <ReptileRow
            key={animal.id}
            animal={animal}
            lastFedAt={lastFed?.[animal.id]}
            theme={theme}
            divided={index > 0}
            textInset={textInset}
          />
        ))}
      </VStack>
    </Host>
  );
}

const styles = StyleSheet.create({
  host: {
    width: "100%",
  },
});
