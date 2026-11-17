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
  semantics,
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
import type { MedicalKind } from "@/state/medical";
import {
  cardKey,
  cardRows,
  cardsFor,
  selectCardColumns,
  type ActivityCard,
  type AddSheetStep,
} from "@/utils/activity-sheet-layout";

import CLOSE_ICON from "@/assets/images/icons/close.xml";
import HOSPITAL_ICON from "@/assets/images/icons/local-hospital.xml";
import RESTAURANT_ICON from "@/assets/images/icons/restaurant.xml";

const KIND_ICONS = { general: HOSPITAL_ICON, regurgitation: RESTAURANT_ICON };

const BADGE_DIAMETER = 64;
const BADGE_SYMBOL_RATIO = 0.55;
const CARD_MIN_HEIGHT = 156;

type AddActivitySheetProps = {
  visible: boolean;
  animalName: string;
  step?: AddSheetStep;
  onClose: () => void;
  onDismiss?: () => void;
  onPick: (type: ActivityType, kind?: MedicalKind) => void;
};

export function AddActivitySheet({
  visible,
  animalName,
  step = "activity",
  onClose,
  onDismiss,
  onPick,
}: AddActivitySheetProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { width, fontScale } = useWindowDimensions();
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

  const handlePick = (type: ActivityType, kind?: MedicalKind) => {
    onPick(type, kind);
    finishClosing();
  };

  if (!mounted) return null;

  const iconSize = 24 * Math.min(fontScale, 2);
  const columns = selectCardColumns(fontScale);
  const cardMinHeight =
    columns === 2 ? (width - Spacing.lg * 2 - Spacing.sm) / 2 : CARD_MIN_HEIGHT;

  return (
    <Host key={step} style={styles.host} matchContents pointerEvents="box-none">
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
                {t(
                  step === "health"
                    ? "addRecord.healthTitle"
                    : "addRecord.title",
                )}
              </Text>
              <Text
                style={composeTextStyle("bodyL")}
                color={theme.textSecondary}
              >
                {t(
                  step === "health"
                    ? "addRecord.healthPrompt"
                    : "addRecord.prompt",
                  { animalName },
                )}
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
                contentDescription={[
                  t("addRecord.close"),
                  t("addRecord.closeHint"),
                ].join(", ")}
              />
            </IconButton>
          </Row>

          <Column
            horizontalAlignment="start"
            verticalArrangement={{ spacedBy: Spacing.sm }}
            modifiers={[fillMaxWidth()]}
          >
            {cardRows(columns, cardsFor(step)).map((row) => (
              <Row
                key={cardKey(row[0])}
                verticalAlignment="top"
                horizontalArrangement={{ spacedBy: Spacing.sm }}
                modifiers={[fillMaxWidth()]}
              >
                {row.map((card) => (
                  <ActivityCardButton
                    key={cardKey(card)}
                    card={card}
                    minHeight={cardMinHeight}
                    theme={theme}
                    onPress={() => handlePick(card.type, card.kind)}
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
  minHeight,
  theme,
  onPress,
  accessibilityLabel,
  accessibilityDescription,
}: {
  card: ActivityCard;
  minHeight: number;
  theme: ReturnType<typeof useTheme>;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityDescription: string;
}) {
  return (
    <Box
      contentAlignment="center"
      modifiers={[
        weight(1),
        defaultMinSize({ minHeight }),
        clip(Shapes.RoundedCorner(Radius.xl)),
        background(theme.surface),
        clickable(onPress),
        semantics({
          contentDescription: [
            accessibilityLabel,
            accessibilityDescription,
          ].join(", "),
          role: "button",
          mergeDescendants: true,
        }),
      ]}
    >
      <Column
        horizontalAlignment="center"
        verticalArrangement={{ spacedBy: Spacing.md }}
        modifiers={[
          fillMaxWidth(),
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
            source={
              card.kind ? KIND_ICONS[card.kind] : ActivityIcons[card.type]
            }
            tint={theme.onPrimary}
            size={Math.round(BADGE_DIAMETER * BADGE_SYMBOL_RATIO)}
          />
        </Box>

        <Column
          horizontalAlignment="center"
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
