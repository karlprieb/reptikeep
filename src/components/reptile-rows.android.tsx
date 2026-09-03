import {
  Box,
  Column,
  Host,
  ListItem,
  RNHostView,
  Shape,
  Surface,
  Text,
} from "@expo/ui/jetpack-compose";
import {
  background,
  clip,
  fillMaxSize,
  fillMaxWidth,
  semantics,
  Shapes,
  size,
} from "@expo/ui/jetpack-compose/modifiers";
import { router } from "expo-router";
import { Image, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

import { Radius, Spacing, type Theme } from "@/constants/theme";
import {
  composeSexSymbolStyle,
  composeTextStyle,
} from "@/constants/type-font-compose";
import type { Animal } from "@/state/animal";
import { useTheme } from "@/hooks/use-theme";
import { SEX_SYMBOLS } from "@/utils/animal-card-status";
import { getAnimalPhotoUri } from "@/utils/animal-photo-storage";
import { feedingStatus } from "@/utils/feeding-status";

const THUMBNAIL_SIZE = 56;

const LIST_HEADLINE = {
  fontFamily: "Solway-Bold",
  fontSize: 16,
  lineHeight: 24,
} as const;

const GROUP_OUTER_RADIUS = Radius.lg;
const GROUP_INNER_RADIUS = Radius.xs;

function groupShape(first: boolean, last: boolean) {
  const top = first ? GROUP_OUTER_RADIUS : GROUP_INNER_RADIUS;
  const bottom = last ? GROUP_OUTER_RADIUS : GROUP_INNER_RADIUS;

  return Shape.RoundedCorner({
    cornerRadii: {
      topStart: top,
      topEnd: top,
      bottomStart: bottom,
      bottomEnd: bottom,
    },
  });
}

type ReptileRowProps = {
  animal: Animal;
  lastFedAt?: string;
  theme: Theme;
  first: boolean;
  last: boolean;
};

function ReptileRow({
  animal,
  lastFedAt,
  theme,
  first,
  last,
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
    hint,
  ]
    .filter((part): part is string => Boolean(part))
    .join(", ");

  const openDetail = () => router.push(`/animal/${animal.id}`);

  return (
    <Surface
      onClick={openDetail}
      color={theme.surface}
      shape={groupShape(first, last)}
      border={{ width: 1, color: theme.border }}
      modifiers={[
        fillMaxWidth(),
        semantics({
          contentDescription: label,
          role: "button",
          mergeDescendants: true,
        }),
      ]}
    >
      <ListItem
        colors={{
          containerColor: theme.surface,
          contentColor: theme.text,
          supportingContentColor: feedingColor,
        }}
        modifiers={[fillMaxWidth()]}
      >
        <ListItem.LeadingContent>
          <Box
            modifiers={[
              size(THUMBNAIL_SIZE, THUMBNAIL_SIZE),
              clip(Shapes.RoundedCorner(Radius.sm)),
              background(theme.surfaceSunken),
            ]}
          >
            {animal.photo ? (
              <RNHostView modifiers={[fillMaxSize()]}>
                <Image
                  source={{ uri: getAnimalPhotoUri(animal.photo) }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                  accessibilityIgnoresInvertColors
                />
              </RNHostView>
            ) : (
              <Column
                horizontalAlignment="center"
                verticalArrangement="center"
                modifiers={[fillMaxSize()]}
              >
                <Text
                  style={composeTextStyle("body")}
                  color={theme.textSecondary}
                >
                  {monogram}
                </Text>
              </Column>
            )}
          </Box>
        </ListItem.LeadingContent>
        <ListItem.HeadlineContent>
          <Text
            style={LIST_HEADLINE}
            color={theme.text}
            maxLines={1}
            overflow="ellipsis"
          >
            {animal.name}
            {symbol ? (
              <Text style={composeSexSymbolStyle(LIST_HEADLINE)}>
                {` ${symbol}`}
              </Text>
            ) : null}
          </Text>
        </ListItem.HeadlineContent>
        <ListItem.SupportingContent>
          <Text style={composeTextStyle("body")} color={feedingColor}>
            {feeding.line}
          </Text>
        </ListItem.SupportingContent>
      </ListItem>
    </Surface>
  );
}

export type ReptileRowsProps = {
  animals: Animal[];
  lastFed?: Record<string, string>;
};

export function ReptileRows({ animals, lastFed }: ReptileRowsProps) {
  const theme = useTheme();

  return (
    <Host
      style={styles.host}
      matchContents={{ horizontal: false, vertical: true }}
    >
      <Column
        modifiers={[fillMaxWidth()]}
        verticalArrangement={{ spacedBy: Spacing["2xs"] }}
      >
        {animals.map((animal, index) => (
          <ReptileRow
            key={animal.id}
            animal={animal}
            lastFedAt={lastFed?.[animal.id]}
            theme={theme}
            first={index === 0}
            last={index === animals.length - 1}
          />
        ))}
      </Column>
    </Host>
  );
}

const styles = StyleSheet.create({
  host: {
    width: "100%",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
});
