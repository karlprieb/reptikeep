import { router } from "expo-router";
import {
  Box,
  Column,
  Host,
  RNHostView,
  Row,
  Text as ComposeText,
} from "@expo/ui/jetpack-compose";
import {
  align,
  background,
  border,
  clip,
  fillMaxWidth,
  height,
  padding,
  semantics,
  Shapes,
  weight,
  width,
} from "@expo/ui/jetpack-compose/modifiers";
import { LinearGradient } from "expo-linear-gradient";
import { Image, StyleSheet, View, useWindowDimensions } from "react-native";
import { useTranslation } from "react-i18next";

import { ActivityPanel, VISIBLE_LIMIT } from "@/components/activity-timeline";
import { ActivityTypeFilter } from "@/components/activity-type-filter";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing, type Theme } from "@/constants/theme";
import { composeTextStyle } from "@/constants/type-font-compose";
import { useAnimalDetail } from "@/hooks/use-animal-detail";
import type { Stat } from "@/utils/animal-detail-stats";
import { useTheme } from "@/hooks/use-theme";
import type { Animal } from "@/state/animal";
import { getAnimalPhotoUri } from "@/utils/animal-photo-storage";
import { WeightTrendChart } from "@/components/weight-trend-chart";

const GRADIENT_BAND_FRACTION = 0.55;

function hexToRgb(hex: string): string {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `${r},${g},${b}`;
}

function HeroScrim({
  bg,
  cardWidth,
  scrimHeight,
}: {
  bg: string;
  cardWidth: number;
  scrimHeight: number;
}) {
  const rgb = hexToRgb(bg);

  return (
    <Box
      modifiers={[width(cardWidth), height(scrimHeight), align("bottomStart")]}
    >
      <RNHostView modifiers={[width(cardWidth), height(scrimHeight)]}>
        <LinearGradient
          colors={[`rgba(${rgb}, 0)`, `rgba(${rgb}, 1)`]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ width: cardWidth, height: scrimHeight }}
        />
      </RNHostView>
    </Box>
  );
}

function pairs(stats: Stat[]): Stat[][] {
  return stats.reduce<Stat[][]>((rows, stat, index) => {
    if (index % 2 === 0) rows.push([stat]);
    else rows[rows.length - 1].push(stat);
    return rows;
  }, []);
}

function StatBox({ stat, theme }: { stat: Stat; theme: Theme }) {
  return (
    <Column
      horizontalAlignment="start"
      verticalArrangement={{ spacedBy: Spacing["2xs"] }}
      modifiers={[
        weight(1),
        clip(Shapes.RoundedCorner(Radius.lg)),
        background(theme.surface),
        border(StyleSheet.hairlineWidth, theme.border),
        padding(Spacing.md, Spacing.md, Spacing.md, Spacing.md),
        semantics({
          contentDescription: [stat.label, stat.value, stat.secondary]
            .filter((part): part is string => Boolean(part))
            .join(", "),
          mergeDescendants: true,
        }),
      ]}
    >
      <ComposeText
        style={{ ...composeTextStyle("label"), letterSpacing: 1.89 }}
        color={theme.textMuted}
        maxLines={2}
        overflow="ellipsis"
      >
        {stat.label.toUpperCase()}
      </ComposeText>
      <ComposeText
        style={composeTextStyle("data")}
        color={theme.text}
        maxLines={1}
        overflow="ellipsis"
      >
        {stat.value}
      </ComposeText>
      {stat.secondary ? (
        <ComposeText
          style={composeTextStyle("bodyS")}
          color={stat.secondaryColor ?? theme.textSecondary}
          minLines={2}
          maxLines={2}
          overflow="ellipsis"
        >
          {stat.secondary}
        </ComposeText>
      ) : null}
    </Column>
  );
}

function StatRow({ row, theme }: { row: Stat[]; theme: Theme }) {
  return (
    <Row
      verticalAlignment="top"
      horizontalArrangement={{ spacedBy: Spacing.md }}
      modifiers={[fillMaxWidth()]}
    >
      {row.map((stat) => (
        <StatBox key={stat.key} stat={stat} theme={theme} />
      ))}
    </Row>
  );
}

export type AnimalDetailProps = {
  animal: Animal;
  onAddActivity: () => void;
};

export function AnimalDetail({ animal, onAddActivity }: AnimalDetailProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();
  const {
    types,
    setTypeFilter,
    activeType,
    shown,
    panelReserve,
    holdPanelHeight,
    trend,
    sex,
    weightTrend,
    identityLabel,
    dateStats,
    currentStats,
  } = useAnimalDetail(animal);
  const gradientBand = windowWidth * GRADIENT_BAND_FRACTION;

  return (
    <View>
      {animal.photo ? (
        <Host
          style={{ width: windowWidth, height: windowWidth }}
          matchContents={false}
        >
          <Box
            contentAlignment="bottomStart"
            modifiers={[width(windowWidth), height(windowWidth)]}
          >
            <RNHostView modifiers={[width(windowWidth), height(windowWidth)]}>
              <Image
                source={{ uri: getAnimalPhotoUri(animal.photo) }}
                style={styles.photo}
                resizeMode="cover"
                accessible
                accessibilityLabel={identityLabel}
                accessibilityIgnoresInvertColors
              />
            </RNHostView>

            <HeroScrim
              bg={theme.bg}
              cardWidth={windowWidth}
              scrimHeight={gradientBand}
            />

            <Column
              horizontalAlignment="start"
              verticalArrangement={{ spacedBy: Spacing["2xs"] }}
              modifiers={[
                width(windowWidth),
                padding(Spacing.md, 0, Spacing.md, Spacing.md),
                align("bottomStart"),
              ]}
            >
              <ComposeText
                style={composeTextStyle("display")}
                color={theme.text}
                maxLines={1}
                overflow="ellipsis"
              >
                {animal.name}
              </ComposeText>

              {animal.commonName ? (
                <ComposeText
                  style={composeTextStyle("bodyL")}
                  color={theme.textSecondary}
                  maxLines={1}
                  overflow="ellipsis"
                >
                  {animal.commonName}
                </ComposeText>
              ) : null}

              {animal.scientificName ? (
                <ComposeText
                  style={{ ...composeTextStyle("bodyS"), fontStyle: "italic" }}
                  color={theme.textSecondary}
                  maxLines={1}
                  overflow="ellipsis"
                >
                  {animal.scientificName}
                </ComposeText>
              ) : null}

              {sex ? (
                <ComposeText
                  style={composeTextStyle("bodyS")}
                  color={theme.textMuted}
                >
                  {sex}
                </ComposeText>
              ) : null}
            </Column>
          </Box>
        </Host>
      ) : (
        <View style={styles.identityPlain} accessibilityLabel={identityLabel}>
          <ThemedText type="display">{animal.name}</ThemedText>
          {animal.commonName ? (
            <ThemedText type="bodyL" themeColor="textSecondary">
              {animal.commonName}
            </ThemedText>
          ) : null}
          {animal.scientificName ? (
            <ThemedText
              type="bodyS"
              themeColor="textSecondary"
              style={styles.scientificName}
            >
              {animal.scientificName}
            </ThemedText>
          ) : null}
          {sex ? (
            <ThemedText type="bodyS" themeColor="textMuted">
              {sex}
            </ThemedText>
          ) : null}
        </View>
      )}

      <View style={styles.statGrid}>
        <Host
          style={styles.statHost}
          matchContents={{ horizontal: false, vertical: true }}
        >
          <Column
            verticalArrangement={{ spacedBy: Spacing.md }}
            modifiers={[fillMaxWidth()]}
          >
            {[...pairs(dateStats), ...pairs(currentStats)].map((row) => (
              <StatRow key={row[0].key} row={row} theme={theme} />
            ))}
          </Column>
        </Host>
      </View>

      {trend ? (
        <View style={styles.weightTrend}>
          <WeightTrendChart
            title={t("weightTrend.title")}
            points={weightTrend.points}
            span={trend.span}
            change={trend.change}
            direction={trend.direction}
            window={trend.window}
            summaryLabel={[t("weightTrend.title"), trend.window, trend.summary]
              .filter((part): part is string => Boolean(part))
              .join(", ")}
          />
        </View>
      ) : null}

      <View style={styles.timeline}>
        <ThemedText type="heading">{t("timeline.title")}</ThemedText>

        {types.length > 1 ? (
          <ActivityTypeFilter
            types={types}
            selected={activeType}
            onSelect={setTypeFilter}
          />
        ) : null}

        <View style={{ minHeight: panelReserve }}>
          <View onLayout={holdPanelHeight}>
            <ActivityPanel
              entries={shown}
              animalId={animal.id}
              animalName={animal.name}
              onAddActivity={onAddActivity}
              limit={VISIBLE_LIMIT}
              onSeeAll={() =>
                router.push(
                  activeType
                    ? `/animal/${animal.id}/history?type=${activeType}`
                    : `/animal/${animal.id}/history`,
                )
              }
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  identityPlain: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xs,
    gap: Spacing["2xs"],
  },
  scientificName: {
    fontStyle: "italic",
  },
  statGrid: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  statHost: {
    width: "100%",
  },
  weightTrend: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  timeline: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    gap: Spacing.sm,
  },
  photo: {
    width: "100%",
    height: "100%",
  },
});
