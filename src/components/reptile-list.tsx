import { useSelector as useValue } from "@legendapp/state/react";
import { router } from "expo-router";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { useTranslation } from "react-i18next";

import {
  AnimalCard,
  CARD_ASPECT_RATIO,
  overdueCount,
} from "@/components/animal-card";
import { EmptyState } from "@/components/empty-state";
import { ReptileRows } from "@/components/reptile-rows";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { Animal } from "@/state/animal";
import { careSchedules$, resolveSchedule } from "@/state/care-schedule";
import type { ReptileViewMode } from "@/state/settings";

export type ReptileEmptyStateProps = {
  onAddPress: () => void;
};

export function ReptileEmptyState({ onAddPress }: ReptileEmptyStateProps) {
  const { t } = useTranslation();

  return (
    <EmptyState
      title={t("reptiles.empty.title")}
      description={t("reptiles.empty.subtitle")}
      action={{
        label: t("reptiles.add"),
        accessibilityLabel: t("a11y.addReptile.label"),
        accessibilityHint: t("a11y.addReptile.hint"),
        onPress: onAddPress,
      }}
    />
  );
}

export type ReptileListProps = {
  animals: Animal[];
  lastFed?: Record<string, string>;
  lastWaterChange?: Record<string, string>;
  lastClean?: Record<string, string>;
  viewMode?: ReptileViewMode;
  onAddPress: () => void;
};

const CARD_GAP = Spacing.md;

const SQUARE_ASPECT_RATIO = 1;
export const NO_PHOTO_SINGLE_COLUMN_HEIGHT = 176;

const TEXT_BLOCK_HEIGHT = 148;
const MAX_TEXT_SCALE = 2;
const OVERDUE_BADGE_HEIGHT = 30;

const ACCESSIBILITY_TEXT_SCALE = 1.75;

export function selectColumnCount(
  viewMode: ReptileViewMode,
  fontScale = 1,
): 1 | 2 {
  if (fontScale >= ACCESSIBILITY_TEXT_SCALE) return 1;

  return viewMode === "grid" ? 2 : 1;
}

export function cardBadgeAllowance(columns: 1 | 2, badges: number[]): number[] {
  if (columns === 1) return badges;

  const tallest = Math.max(0, ...badges);
  return badges.map(() => tallest);
}

export function selectCardHeight(
  animal: Animal,
  columns: 1 | 2,
  cardWidth: number,
  fontScale = 1,
  overdueBadges = 0,
): number {
  const scale = Math.min(Math.max(fontScale, 1), MAX_TEXT_SCALE);
  const badgeLines = columns === 2 ? 2 : 1;
  const headroom =
    TEXT_BLOCK_HEIGHT * (scale - 1) +
    OVERDUE_BADGE_HEIGHT * scale * badgeLines * Math.max(0, overdueBadges - 1);

  if (columns === 1 && !animal.photo) {
    return Math.min(cardWidth, NO_PHOTO_SINGLE_COLUMN_HEIGHT) + headroom;
  }

  const aspectRatio = columns === 2 ? CARD_ASPECT_RATIO : SQUARE_ASPECT_RATIO;
  return cardWidth / aspectRatio + headroom;
}

export function ReptileList({
  animals,
  lastFed,
  lastWaterChange,
  lastClean,
  viewMode = "single",
  onAddPress,
}: ReptileListProps) {
  const { width, fontScale } = useWindowDimensions();
  const theme = useTheme();
  const collectionWater = useValue(careSchedules$.water);
  const collectionCleaning = useValue(careSchedules$.cleaning);

  if (animals.length === 0) {
    return <ReptileEmptyState onAddPress={onAddPress} />;
  }

  if (viewMode === "list") {
    return <ReptileRows animals={animals} lastFed={lastFed} />;
  }

  const contentWidth = Math.min(width, MaxContentWidth) - Spacing.md * 2;
  const columns = selectColumnCount(viewMode, fontScale);
  const cardWidth =
    columns === 2 ? (contentWidth - CARD_GAP) / 2 : contentWidth;
  const cards = animals.map((animal) => {
    const waterSchedule = resolveSchedule(
      collectionWater,
      animal.waterSchedule,
    );
    const cleaningSchedule = resolveSchedule(
      collectionCleaning,
      animal.cleaningSchedule,
    );
    const lastWaterChangeAt = lastWaterChange?.[animal.id] ?? animal.createdAt;
    const lastCleanAt = lastClean?.[animal.id] ?? animal.createdAt;

    return {
      animal,
      waterSchedule,
      lastWaterChangeAt,
      cleaningSchedule,
      lastCleanAt,
      badges: overdueCount({
        feedingSchedule: animal.feedingSchedule,
        lastFedAt: lastFed?.[animal.id],
        waterSchedule,
        lastWaterChangeAt,
        cleaningSchedule,
        lastCleanAt,
      }),
    };
  });

  const allowance = cardBadgeAllowance(
    columns,
    cards.map((card) => card.badges),
  );

  return (
    <View style={styles.grid}>
      {cards.map((card, index) => {
        const { animal } = card;
        const cardHeight = selectCardHeight(
          animal,
          columns,
          cardWidth,
          fontScale,
          allowance[index],
        );

        return (
          <View key={animal.id} style={{ width: cardWidth }}>
            <AnimalCard
              animal={animal}
              width={cardWidth}
              height={cardHeight}
              theme={theme}
              lastFedAt={lastFed?.[animal.id]}
              waterSchedule={card.waterSchedule}
              lastWaterChangeAt={card.lastWaterChangeAt}
              cleaningSchedule={card.cleaningSchedule}
              lastCleanAt={card.lastCleanAt}
              placeholderLayout={columns === 1 ? "compact" : "grid"}
              onPress={() => router.push(`/animal/${animal.id}`)}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
});
