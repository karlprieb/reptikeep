import { useSelector as useValue } from "@legendapp/state/react";
import { router } from "expo-router";
import { memo, useCallback, useMemo, useState } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useTranslation } from "react-i18next";

import { AnimalCard } from "@/components/animal-card";
import { EmptyState } from "@/components/empty-state";
import { ReptileRows } from "@/components/reptile-rows";
import { MaxContentWidth, Spacing, type Theme } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { Animal } from "@/state/animal";
import {
  careSchedules$,
  resolveSchedule,
  type CareSchedule,
} from "@/state/care-schedule";
import type { ReptileViewMode } from "@/state/settings";
import { CARD_ASPECT_RATIO, overdueCount } from "@/utils/animal-card-status";

export type ReptileEmptyStateProps = {
  onAddPress: () => void;
  showAction?: boolean;
};

export function ReptileEmptyState({
  onAddPress,
  showAction = true,
}: ReptileEmptyStateProps) {
  const { t } = useTranslation();
  const offersAdd = showAction && Platform.OS !== "android";

  return (
    <EmptyState
      title={t("reptiles.empty.title")}
      description={t("reptiles.empty.subtitle")}
      action={
        offersAdd
          ? {
              label: t("reptiles.add"),
              accessibilityLabel: t("a11y.addReptile.label"),
              accessibilityHint: t("a11y.addReptile.hint"),
              onPress: onAddPress,
            }
          : undefined
      }
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
  scrollY?: Animated.Value;
  contentInsetTop?: number;
};

const CARD_GAP = Spacing.md;

const CARD_PAGE = 8;

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
  scrollY,
  contentInsetTop,
}: ReptileListProps) {
  const { width, fontScale } = useWindowDimensions();
  const theme = useTheme();
  const collectionWater = useValue(careSchedules$.water);
  const collectionCleaning = useValue(careSchedules$.cleaning);
  const [limit, setLimit] = useState(CARD_PAGE);

  const openAnimal = useCallback(
    (id: string) => router.push(`/animal/${id}`),
    [],
  );

  const growNearEnd = useCallback(
    ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement, contentSize } = nativeEvent;
      const remaining =
        contentSize.height - contentOffset.y - layoutMeasurement.height;

      if (remaining < layoutMeasurement.height * 2) {
        setLimit((current) => Math.min(current + CARD_PAGE, animals.length));
      }
    },
    [animals.length],
  );

  const handleScroll = useMemo(
    () =>
      scrollY
        ? Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
            useNativeDriver: true,
            listener: growNearEnd,
          })
        : growNearEnd,
    [scrollY, growNearEnd],
  );

  const trackScrollOnly = useMemo(
    () =>
      scrollY
        ? Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
            useNativeDriver: true,
          })
        : undefined,
    [scrollY],
  );

  const insetStyle = contentInsetTop ? { paddingTop: contentInsetTop } : null;

  if (animals.length === 0) {
    return (
      <Animated.ScrollView
        style={[styles.scroll, { backgroundColor: theme.bg }]}
        contentInsetAdjustmentBehavior="never"
        alwaysBounceVertical={false}
        contentContainerStyle={[
          styles.content,
          styles.emptyContent,
          insetStyle,
        ]}
      >
        <ReptileEmptyState onAddPress={onAddPress} />
      </Animated.ScrollView>
    );
  }

  if (viewMode === "list") {
    return (
      <Animated.ScrollView
        style={[styles.scroll, { backgroundColor: theme.bg }]}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, insetStyle]}
        onScroll={trackScrollOnly}
        scrollEventThrottle={16}
      >
        <ReptileRows animals={animals} lastFed={lastFed} />
      </Animated.ScrollView>
    );
  }

  const contentWidth = Math.min(width, MaxContentWidth) - Spacing.md * 2;
  const columns = selectColumnCount(viewMode, fontScale);
  const cardWidth =
    columns === 2 ? (contentWidth - CARD_GAP) / 2 : contentWidth;
  const cards = animals.slice(0, limit).map((animal) => {
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
    <Animated.ScrollView
      style={[styles.scroll, { backgroundColor: theme.bg }]}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[styles.content, insetStyle]}
      onScroll={handleScroll}
      scrollEventThrottle={16}
    >
      <View style={styles.grid}>
        {cards.map((card, index) => (
          <ReptileCardCell
            key={card.animal.id}
            animal={card.animal}
            cardWidth={cardWidth}
            cardHeight={selectCardHeight(
              card.animal,
              columns,
              cardWidth,
              fontScale,
              allowance[index],
            )}
            theme={theme}
            lastFedAt={lastFed?.[card.animal.id]}
            waterSchedule={card.waterSchedule}
            lastWaterChangeAt={card.lastWaterChangeAt}
            cleaningSchedule={card.cleaningSchedule}
            lastCleanAt={card.lastCleanAt}
            placeholderLayout={columns === 1 ? "compact" : "grid"}
            onOpen={openAnimal}
          />
        ))}
      </View>
    </Animated.ScrollView>
  );
}

type ReptileCardCellProps = {
  animal: Animal;
  cardWidth: number;
  cardHeight: number;
  theme: Theme;
  lastFedAt?: string;
  waterSchedule?: CareSchedule;
  lastWaterChangeAt?: string;
  cleaningSchedule?: CareSchedule;
  lastCleanAt?: string;
  placeholderLayout?: "compact" | "grid";
  onOpen: (id: string) => void;
};

const ReptileCardCell = memo(function ReptileCardCell({
  animal,
  cardWidth,
  cardHeight,
  theme,
  lastFedAt,
  waterSchedule,
  lastWaterChangeAt,
  cleaningSchedule,
  lastCleanAt,
  placeholderLayout,
  onOpen,
}: ReptileCardCellProps) {
  return (
    <View style={{ width: cardWidth }}>
      <AnimalCard
        animal={animal}
        width={cardWidth}
        height={cardHeight}
        theme={theme}
        lastFedAt={lastFedAt}
        waterSchedule={waterSchedule}
        lastWaterChangeAt={lastWaterChangeAt}
        cleaningSchedule={cleaningSchedule}
        lastCleanAt={lastCleanAt}
        placeholderLayout={placeholderLayout}
        onPress={() => onOpen(animal.id)}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    width: "100%",
  },
  content: {
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  grid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
});
