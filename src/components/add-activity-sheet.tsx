import {
  BottomSheet,
  Button,
  Circle,
  GlassEffectContainer,
  HStack,
  Host,
  Image,
  ScrollView,
  Spacer,
  Text,
  VStack,
  ZStack,
} from "@expo/ui/swift-ui";
import {
  accessibilityElement,
  accessibilityHint,
  accessibilityLabel,
  buttonBorderShape,
  buttonStyle,
  contentShape,
  controlSize,
  font,
  foregroundStyle,
  frame,
  glassEffect,
  lineLimit,
  padding,
  presentationBackground,
  presentationDragIndicator,
  shapes,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import { useState } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import { useTranslation } from "react-i18next";

import {
  ActivitySymbols,
  CategoryColors,
  Radius,
  Spacing,
  type ActivityType,
} from "@/constants/theme";
import { typeFont } from "@/constants/type-font";
import { useTheme } from "@/hooks/use-theme";

const SINGLE_COLUMN_FONT_SCALE = 1.6;

const BADGE_DIAMETER = 64;
const BADGE_SYMBOL_SIZE = 30;
const CARD_MIN_HEIGHT = 180;
const CLOSE_BUTTON_SIZE = 48;

export function selectCardColumns(fontScale: number): 1 | 2 {
  return fontScale >= SINGLE_COLUMN_FONT_SCALE ? 1 : 2;
}

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

export function cardRows(columns: 1 | 2): ActivityCard[][] {
  if (columns === 1) return ACTIVITY_CARDS.map((card) => [card]);

  return ACTIVITY_CARDS.reduce<ActivityCard[][]>((rows, card, index) => {
    if (index % 2 === 0) rows.push([card]);
    else rows[rows.length - 1].push(card);
    return rows;
  }, []);
}

const HEADER_HEIGHT = 80;
const USABLE_SHEET_FRACTION = 0.92;

export function sheetScrolls(
  columns: 1 | 2,
  rowCount: number,
  windowHeight: number,
  fontScale: number,
): boolean {
  if (columns === 1) return true;

  const rowHeight =
    CARD_MIN_HEIGHT * Math.min(fontScale, SINGLE_COLUMN_FONT_SCALE);
  const content =
    HEADER_HEIGHT +
    rowCount * rowHeight +
    (rowCount - 1) * Spacing.sm +
    Spacing.xl * 2;

  return content > windowHeight * USABLE_SHEET_FRACTION;
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
  const { width, height, fontScale } = useWindowDimensions();
  const columns = selectCardColumns(fontScale);

  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);
  const contentWidth = width - Spacing.lg * 2;
  const cardWidth =
    columns === 2 ? (contentWidth - Spacing.sm) / 2 : contentWidth;

  const rows = cardRows(columns);
  const scrolls = sheetScrolls(columns, rows.length, height, fontScale);

  const handlePick = (type: ActivityType) => {
    onPick(type);
    onClose();
  };

  const presentation = [
    presentationBackground(theme.bg),
    presentationDragIndicator("visible"),
  ];

  const body = (
    <VStack
      alignment="leading"
      spacing={Spacing.lg}
      modifiers={[
        padding({
          horizontal: Spacing.lg,
          top: Spacing.xl,
          bottom: Spacing.xl,
        }),
        ...(scrolls ? [] : presentation),
      ]}
    >
      <HStack
        alignment="top"
        spacing={Spacing.md}
        modifiers={[frame({ width: contentWidth })]}
      >
        <VStack
          alignment="leading"
          spacing={Spacing["2xs"]}
          modifiers={[
            frame({
              width: contentWidth - CLOSE_BUTTON_SIZE - Spacing.md,
              alignment: "topLeading",
            }),
          ]}
        >
          <Text modifiers={[typeFont("title"), foregroundStyle(theme.text)]}>
            {t("addRecord.title")}
          </Text>
          <Text
            modifiers={[
              typeFont("bodyL"),
              foregroundStyle(theme.textSecondary),
            ]}
          >
            {t("addRecord.prompt", { animalName })}
          </Text>
        </VStack>

        <Button
          onPress={onClose}
          modifiers={[
            controlSize("large"),
            buttonStyle("glass"),
            buttonBorderShape("circle"),
            tint(theme.textSecondary),
            frame({
              width: CLOSE_BUTTON_SIZE,
              height: CLOSE_BUTTON_SIZE,
            }),
            accessibilityLabel(t("addRecord.close")),
            accessibilityHint(t("addRecord.closeHint")),
          ]}
        >
          <Image
            systemName="xmark"
            modifiers={[
              font({ size: 17, weight: "semibold" }),
              foregroundStyle(theme.textSecondary),
            ]}
          />
        </Button>
      </HStack>
      <GlassEffectContainer spacing={0}>
        <VStack alignment="leading" spacing={Spacing.sm}>
          {rows.map((row) => (
            <HStack
              key={row[0].type}
              alignment="top"
              spacing={Spacing.sm}
              modifiers={[frame({ width: contentWidth, alignment: "leading" })]}
            >
              {row.map((card) => (
                <Button
                  key={card.type}
                  onPress={() => handlePick(card.type)}
                  modifiers={[
                    buttonStyle("plain"),
                    accessibilityElement("combine"),
                    accessibilityLabel(t(card.titleKey)),
                    accessibilityHint(t(card.descriptionKey)),
                  ]}
                >
                  <VStack
                    alignment="leading"
                    spacing={Spacing.md}
                    modifiers={[
                      padding({ all: Spacing.md }),
                      frame({
                        minWidth: cardWidth,
                        maxWidth: cardWidth,
                        minHeight: CARD_MIN_HEIGHT,
                        alignment: "topLeading",
                      }),
                      glassEffect({
                        glass: { variant: "regular", interactive: true },
                        shape: "roundedRectangle",
                        cornerRadius: Radius.xl,
                      }),
                      contentShape(
                        shapes.roundedRectangle({ cornerRadius: Radius.xl }),
                      ),
                    ]}
                  >
                    <ZStack
                      modifiers={[
                        frame({
                          width: BADGE_DIAMETER,
                          height: BADGE_DIAMETER,
                        }),
                      ]}
                    >
                      <Circle
                        modifiers={[foregroundStyle(CategoryColors[card.type])]}
                      />
                      <Image
                        systemName={ActivitySymbols[card.type]}
                        modifiers={[
                          font({
                            size: BADGE_SYMBOL_SIZE,
                            weight: "semibold",
                          }),
                          foregroundStyle(theme.onPrimary),
                        ]}
                      />
                    </ZStack>

                    <Spacer />

                    <VStack alignment="leading" spacing={Spacing["2xs"]}>
                      <Text
                        modifiers={[
                          typeFont("heading"),
                          foregroundStyle(theme.text),
                          lineLimit(1),
                        ]}
                      >
                        {t(card.titleKey)}
                      </Text>
                      <Text
                        modifiers={[
                          typeFont("body"),
                          foregroundStyle(theme.textSecondary),
                          lineLimit(1),
                        ]}
                      >
                        {t(card.descriptionKey)}
                      </Text>
                    </VStack>
                  </VStack>
                </Button>
              ))}
            </HStack>
          ))}
        </VStack>
      </GlassEffectContainer>
    </VStack>
  );

  if (!mounted) return null;

  return (
    <Host style={styles.host} matchContents pointerEvents="box-none">
      <BottomSheet
        isPresented={visible}
        fitToContents={!scrolls}
        onIsPresentedChange={(isPresented) => {
          if (!isPresented) onClose();
        }}
        onDismiss={() => {
          onClose();
          onDismiss?.();
          setMounted(false);
        }}
      >
        {scrolls ? (
          <ScrollView modifiers={presentation}>{body}</ScrollView>
        ) : (
          body
        )}
      </BottomSheet>
    </Host>
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
