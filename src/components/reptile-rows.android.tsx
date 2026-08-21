import {
  Box,
  Column,
  Host,
  HorizontalDivider,
  ListItem,
  RNHostView,
  Surface,
  Text,
} from "@expo/ui/jetpack-compose";
import {
  background,
  clip,
  height,
  Shapes,
  width,
} from "@expo/ui/jetpack-compose/modifiers";
import { router } from "expo-router";
import { Image } from "react-native";
import { useTranslation } from "react-i18next";

import { Radius, type Theme } from "@/constants/theme";
import { composeTextStyle } from "@/constants/type-font-compose";
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
};

function ReptileRow({ animal, lastFedAt, theme, divided }: ReptileRowProps) {
  const { t } = useTranslation();
  const feeding = feedingStatus(t, lastFedAt, animal.feedingSchedule);
  const feedingColor = feeding.overdue ? theme.danger : theme.textSecondary;
  const symbol = SEX_SYMBOLS[animal.sex];
  const monogram = animal.name.trim().slice(0, 1).toLocaleUpperCase();

  const openDetail = () => router.push(`/animal/${animal.id}`);

  return (
    <>
      {divided ? <HorizontalDivider color={theme.border} /> : null}
      <Surface onClick={openDetail} color="transparent">
        <ListItem
          colors={{
            containerColor: theme.surface,
            contentColor: theme.text,
            leadingContentColor: theme.textMuted,
            supportingContentColor: feedingColor,
          }}
        >
          <ListItem.LeadingContent>
            {animal.photo ? (
              <RNHostView
                modifiers={[width(THUMBNAIL_SIZE), height(THUMBNAIL_SIZE)]}
              >
                <Image
                  source={{ uri: getAnimalPhotoUri(animal.photo) }}
                  style={{
                    width: THUMBNAIL_SIZE,
                    height: THUMBNAIL_SIZE,
                    borderRadius: Radius.sm,
                  }}
                  resizeMode="cover"
                />
              </RNHostView>
            ) : (
              <Column
                horizontalAlignment="center"
                verticalArrangement="center"
                modifiers={[
                  width(THUMBNAIL_SIZE),
                  height(THUMBNAIL_SIZE),
                  clip(Shapes.RoundedCorner(Radius.sm)),
                ]}
              >
                <Text style={composeTextStyle("body")} color={theme.textMuted}>
                  {monogram}
                </Text>
              </Column>
            )}
          </ListItem.LeadingContent>
          <ListItem.HeadlineContent>
            <Text style={composeTextStyle("title")} color={theme.text}>
              {[animal.name, symbol].filter(Boolean).join(" ")}
            </Text>
          </ListItem.HeadlineContent>
          <ListItem.SupportingContent>
            <Text style={composeTextStyle("bodyS")} color={feedingColor}>
              {feeding.line}
            </Text>
          </ListItem.SupportingContent>
        </ListItem>
      </Surface>
    </>
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
      style={{ width: "100%" }}
      matchContents={{ horizontal: false, vertical: true }}
    >
      <Box
        modifiers={[
          clip(Shapes.RoundedCorner(Radius.lg)),
          background(theme.surface),
        ]}
      >
        <Surface
          color="transparent"
          border={{ width: 1, color: theme.border }}
          modifiers={[clip(Shapes.RoundedCorner(Radius.lg))]}
        >
          <Column>
            {animals.map((animal, index) => (
              <ReptileRow
                key={animal.id}
                animal={animal}
                lastFedAt={lastFed?.[animal.id]}
                theme={theme}
                divided={index > 0}
              />
            ))}
          </Column>
        </Surface>
      </Box>
    </Host>
  );
}
