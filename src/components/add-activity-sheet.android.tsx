import {
  Box,
  Column,
  Host,
  Icon,
  IconButton,
  ModalBottomSheet,
  Row,
  Text,
  type ModalBottomSheetRef,
} from "@expo/ui/jetpack-compose";
import {
  background,
  clickable,
  clip,
  defaultMinSize,
  fillMaxWidth,
  padding,
  Shapes,
  size,
  verticalScroll,
  weight,
} from "@expo/ui/jetpack-compose/modifiers";
import { useRef, useState } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import { useTranslation } from "react-i18next";

import { ActivityIcons } from "@/constants/activity-icons";
import {
  CategoryColors,
  Radius,
  Spacing,
  type ActivityType,
} from "@/constants/theme";
import { composeTextStyle } from "@/constants/type-font-compose";
import { useTheme } from "@/hooks/use-theme";

import CLOSE_ICON from "@/assets/images/icons/close.xml";

const BADGE_DIAMETER = 64;
const BADGE_SYMBOL_RATIO = 0.55;
const CARD_MIN_HEIGHT = 156;

type AddActivitySheetProps = {
  visible: boolean;
  animalName: string;
  onClose: () => void;
  onDismiss?: () => void;
  onPick: (type: ActivityType) => void;
};

type ActivityCard = {
  type: ActivityType;
  titleKey: string;
  descriptionKey: string;
};

const ACTIVITY_CARDS: ActivityCard[] = [
  {
    type: "feed",
    titleKey: "addRecord.feeding.title",
    descriptionKey: "addRecord.feeding.description",
  },
  {
    type: "weight",
    titleKey: "addRecord.weight.title",
    descriptionKey: "addRecord.weight.description",
  },
  {
    type: "shed",
    titleKey: "addRecord.shed.title",
    descriptionKey: "addRecord.shed.description",
  },
  {
    type: "poop",
    titleKey: "addRecord.defecation.title",
    descriptionKey: "addRecord.defecation.description",
  },
  {
    type: "habitat",
    titleKey: "addRecord.habitat.title",
    descriptionKey: "addRecord.habitat.description",
  },
  {
    type: "medical",
    titleKey: "addRecord.medical.title",
    descriptionKey: "addRecord.medical.description",
  },
];

function cardRows(cards: ActivityCard[]): ActivityCard[][] {
  return cards.reduce<ActivityCard[][]>((rows, card, index) => {
    if (index % 2 === 0) rows.push([card]);
    else rows[rows.length - 1].push(card);
    return rows;
  }, []);
}

export function AddActivitySheet({
  visible,
  animalName,
  onClose,
  onDismiss,
  onPick,
}: AddActivitySheetProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { fontScale } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const sheetRef = useRef<ModalBottomSheetRef>(null);
  if (visible && !mounted) setMounted(true);

  const finishClosing = () => {
    void sheetRef.current?.hide().then(() => {
      setMounted(false);
      onDismiss?.();
    });
  };

  const requestClose = () => {
    onClose();
    finishClosing();
  };

  const handlePick = (type: ActivityType) => {
    onPick(type);
    finishClosing();
  };

  if (!mounted) return null;

  const iconSize = 24 * Math.min(fontScale, 2);

  return (
    <Host style={styles.host} matchContents pointerEvents="box-none">
      <ModalBottomSheet
        ref={sheetRef}
        onDismissRequest={requestClose}
        skipPartiallyExpanded
        containerColor={theme.bg}
        contentColor={theme.text}
        scrimColor="rgba(26, 20, 14, 0.4)"
      >
        <Column
          horizontalAlignment="start"
          verticalArrangement={{ spacedBy: Spacing.lg }}
          modifiers={[
            fillMaxWidth(),
            padding(Spacing.lg, 0, Spacing.lg, Spacing.xl),
            verticalScroll(),
          ]}
        >
          <Row verticalAlignment="top" modifiers={[fillMaxWidth()]}>
            <Column
              horizontalAlignment="start"
              verticalArrangement={{ spacedBy: Spacing["2xs"] }}
              modifiers={[weight(1)]}
            >
              <Text style={composeTextStyle("title")} color={theme.text}>
                {t("addRecord.title")}
              </Text>
              <Text
                style={composeTextStyle("bodyL")}
                color={theme.textSecondary}
              >
                {t("addRecord.prompt", { animalName })}
              </Text>
            </Column>

            <IconButton
              onClick={requestClose}
              colors={{ contentColor: theme.textSecondary }}
            >
              <Icon
                source={CLOSE_ICON}
                tint={theme.textSecondary}
                size={iconSize}
                contentDescription={t("addRecord.close")}
              />
            </IconButton>
          </Row>

          <Column
            horizontalAlignment="start"
            verticalArrangement={{ spacedBy: Spacing.sm }}
            modifiers={[fillMaxWidth()]}
          >
            {cardRows(ACTIVITY_CARDS).map((row) => (
              <Row
                key={row[0].type}
                verticalAlignment="top"
                horizontalArrangement={{ spacedBy: Spacing.sm }}
                modifiers={[fillMaxWidth()]}
              >
                {row.map((card) => (
                  <ActivityCardButton
                    key={card.type}
                    card={card}
                    theme={theme}
                    onPress={() => handlePick(card.type)}
                    accessibilityLabel={t(card.titleKey)}
                    accessibilityDescription={t(card.descriptionKey)}
                  />
                ))}
              </Row>
            ))}
          </Column>
        </Column>
      </ModalBottomSheet>
    </Host>
  );
}

function ActivityCardButton({
  card,
  theme,
  onPress,
  accessibilityLabel,
  accessibilityDescription,
}: {
  card: ActivityCard;
  theme: ReturnType<typeof useTheme>;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityDescription: string;
}) {
  return (
    <Box
      modifiers={[
        weight(1),
        defaultMinSize({ minHeight: CARD_MIN_HEIGHT }),
        clip(Shapes.RoundedCorner(Radius.xl)),
        background(theme.surface),
        clickable(onPress),
      ]}
    >
      <Column
        horizontalAlignment="start"
        verticalArrangement="spaceBetween"
        modifiers={[
          fillMaxWidth(),
          defaultMinSize({ minHeight: CARD_MIN_HEIGHT }),
          padding(Spacing.md, Spacing.md, Spacing.md, Spacing.md),
        ]}
      >
        <Box
          contentAlignment="center"
          modifiers={[
            size(BADGE_DIAMETER, BADGE_DIAMETER),
            clip(Shapes.Circle),
            background(CategoryColors[card.type]),
          ]}
        >
          <Icon
            source={ActivityIcons[card.type]}
            tint={theme.onPrimary}
            size={Math.round(BADGE_DIAMETER * BADGE_SYMBOL_RATIO)}
            contentDescription={accessibilityLabel}
          />
        </Box>

        <Column
          horizontalAlignment="start"
          verticalArrangement={{ spacedBy: Spacing["2xs"] }}
        >
          <Text
            style={composeTextStyle("heading")}
            color={theme.text}
            maxLines={1}
            overflow="ellipsis"
          >
            {accessibilityLabel}
          </Text>
          <Text
            style={composeTextStyle("body")}
            color={theme.textSecondary}
            maxLines={1}
            overflow="ellipsis"
          >
            {accessibilityDescription}
          </Text>
        </Column>
      </Column>
    </Box>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
});
