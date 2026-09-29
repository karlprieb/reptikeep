import { router } from "expo-router";
import {
  HStack,
  Host,
  Image,
  Rectangle,
  Text,
  VStack,
  ZStack,
} from "@expo/ui/swift-ui";
import {
  accessibilityElement,
  accessibilityLabel,
  aspectRatio,
  background,
  clipped,
  clipShape,
  fixedSize,
  foregroundStyle,
  frame,
  italic,
  lineLimit,
  minimumScaleFactor,
  padding,
  resizable,
  strokeBorder,
} from "@expo/ui/swift-ui/modifiers";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { useTranslation } from "react-i18next";

import { ActivityPanel, VISIBLE_LIMIT } from "@/components/activity-timeline";
import { ActivityTypeFilter } from "@/components/activity-type-filter";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing, type Theme } from "@/constants/theme";
import { typeFont, typeStyle } from "@/constants/type-font";
import { useAnimalDetail } from "@/hooks/use-animal-detail";
import type { Stat } from "@/utils/animal-detail-stats";
import { useTheme } from "@/hooks/use-theme";
import type { Animal } from "@/state/animal";
import { useAnimalPhotoUri } from "@/utils/animal-photo-storage";
import { WeightTrendChart } from "@/components/weight-trend-chart";

const GRADIENT_BAND_FRACTION = 0.55;

function pairs(stats: Stat[]): Stat[][] {
  return stats.reduce<Stat[][]>((rows, stat, index) => {
    if (index % 2 === 0) rows.push([stat]);
    else rows[rows.length - 1].push(stat);
    return rows;
  }, []);
}

type StatBoxProps = {
  stat: Stat;
  theme: Theme;
};

function StatBox({ stat, theme }: StatBoxProps) {
  return (
    <VStack
      modifiers={[
        frame({
          maxWidth: Infinity,
          maxHeight: Infinity,
          alignment: "topLeading",
        }),
        background(theme.surface),
        clipShape("roundedRectangle", Radius.lg),
        strokeBorder({
          color: theme.border,
          style: { lineWidth: StyleSheet.hairlineWidth },
          shape: "roundedRectangle",
          cornerRadius: Radius.lg,
        }),
        accessibilityElement("combine"),
        accessibilityLabel(
          [stat.label, stat.value, stat.secondary]
            .filter((part): part is string => Boolean(part))
            .join(", "),
        ),
      ]}
    >
      <VStack
        alignment="leading"
        spacing={Spacing["2xs"]}
        modifiers={[
          padding({ all: Spacing.md }),
          frame({ maxWidth: Infinity, alignment: "topLeading" }),
          fixedSize({ horizontal: false, vertical: true }),
        ]}
      >
        <Text
          modifiers={[
            ...typeStyle("label"),
            foregroundStyle(theme.textMuted),
            padding({ bottom: Spacing["2xs"] }),
          ]}
        >
          {stat.label.toUpperCase()}
        </Text>
        <Text
          modifiers={[
            typeFont("data"),
            foregroundStyle(theme.text),
            lineLimit(1),
            minimumScaleFactor(0.7),
          ]}
        >
          {stat.value}
        </Text>
        {stat.secondary ? (
          <Text
            modifiers={[
              typeFont("bodyS"),
              foregroundStyle(stat.secondaryColor ?? theme.textSecondary),
            ]}
          >
            {stat.secondary}
          </Text>
        ) : null}
      </VStack>
    </VStack>
  );
}

type PlainIdentityProps = {
  animal: Animal;
  sex: string | null;
  identityLabel: string;
};

function PlainIdentity({ animal, sex, identityLabel }: PlainIdentityProps) {
  return (
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
  );
}

export type AnimalDetailProps = {
  animal: Animal;
  onAddActivity: () => void;
};

export function AnimalDetail({ animal, onAddActivity }: AnimalDetailProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const photoUri = useAnimalPhotoUri(animal.photo ?? "");
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
  const gradientBand = width * GRADIENT_BAND_FRACTION;

  return (
    <View>
      {animal.photo ? (
        <Host style={{ width, height: width }} matchContents={false}>
          <ZStack
            alignment="bottomLeading"
            modifiers={[
              frame({ width, height: width }),
              accessibilityLabel(identityLabel),
            ]}
          >
            <Image
              uiImage={photoUri}
              modifiers={[
                resizable(),
                aspectRatio({ contentMode: "fill" }),
                frame({ width, height: width }),
                clipped(),
              ]}
            />

            <Rectangle
              modifiers={[
                frame({ width, height: gradientBand }),
                foregroundStyle({
                  type: "linearGradient",
                  colors: [`${theme.bg}00`, theme.bg],
                  startPoint: { x: 0.5, y: 0 },
                  endPoint: { x: 0.5, y: 1 },
                }),
              ]}
            />

            <VStack
              alignment="leading"
              spacing={Spacing["2xs"]}
              modifiers={[
                padding({ horizontal: Spacing.md, bottom: Spacing.md }),
                frame({ width, alignment: "leading" }),
              ]}
            >
              <Text
                modifiers={[
                  typeFont("display"),
                  foregroundStyle(theme.text),
                  lineLimit(1),
                ]}
              >
                {animal.name}
              </Text>

              {animal.commonName ? (
                <Text
                  modifiers={[
                    typeFont("bodyL"),
                    foregroundStyle(theme.textSecondary),
                    lineLimit(1),
                  ]}
                >
                  {animal.commonName}
                </Text>
              ) : null}

              {animal.scientificName ? (
                <Text
                  modifiers={[
                    typeFont("bodyS"),
                    foregroundStyle(theme.textSecondary),
                    italic(),
                    lineLimit(1),
                  ]}
                >
                  {animal.scientificName}
                </Text>
              ) : null}

              {sex ? (
                <Text
                  modifiers={[
                    typeFont("bodyS"),
                    foregroundStyle(theme.textMuted),
                  ]}
                >
                  {sex}
                </Text>
              ) : null}
            </VStack>
          </ZStack>
        </Host>
      ) : (
        <PlainIdentity
          animal={animal}
          sex={sex}
          identityLabel={identityLabel}
        />
      )}

      <View style={styles.statGrid}>
        <Host
          style={styles.statHost}
          matchContents={{ horizontal: false, vertical: true }}
        >
          <VStack
            spacing={Spacing.md}
            modifiers={[frame({ maxWidth: Infinity })]}
          >
            {[...pairs(dateStats), ...pairs(currentStats)].map((row) => (
              <HStack
                key={row[0].key}
                alignment="top"
                spacing={Spacing.md}
                modifiers={[frame({ maxWidth: Infinity })]}
              >
                {row.map((stat) => (
                  <StatBox key={stat.key} stat={stat} theme={theme} />
                ))}
              </HStack>
            ))}
          </VStack>
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
});
