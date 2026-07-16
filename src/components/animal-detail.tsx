import { useSelector as useValue } from "@legendapp/state/react";
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
  foregroundStyle,
  frame,
  italic,
  lineLimit,
  minimumScaleFactor,
  onGeometryChange,
  padding,
  resizable,
  strokeBorder,
} from "@expo/ui/swift-ui/modifiers";
import { useCallback, useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { useTranslation } from "react-i18next";

import { ActivityPanel, VISIBLE_LIMIT } from "@/components/activity-timeline";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing, type Theme } from "@/constants/theme";
import { typeFont, typeStyle } from "@/constants/type-font";
import { useTheme } from "@/hooks/use-theme";
import type { Animal } from "@/state/animal";
import { activityStores } from "@/state/activity-stores";
import { careSchedules$, resolveSchedule } from "@/state/care-schedule";
import { useAnimalDefaults } from "@/state/logging-defaults";
import {
  animalActivityFeed,
  latestAcceptedFeeding,
  latestWaterChange,
} from "@/utils/animal-activity";
import { getAnimalPhotoUri } from "@/utils/animal-photo-storage";
import { formatAbsoluteDate } from "@/utils/format-date";
import { scheduleDaysOverdue } from "@/utils/schedule";
import { formatWeight } from "@/utils/format-number";
import { relativeLine } from "@/utils/relative-date";

const GRADIENT_BAND_FRACTION = 0.55;

type Stat = {
  key: string;
  label: string;
  value: string;
  secondary?: string;
  secondaryColor?: string;
};

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
  minHeight: number;
  onMeasure: (key: string, height: number) => void;
};

function StatBox({ stat, theme, minHeight, onMeasure }: StatBoxProps) {
  return (
    <VStack
      modifiers={[
        frame({ maxWidth: Infinity, minHeight, alignment: "topLeading" }),
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
          onGeometryChange(({ height }) => onMeasure(stat.key, height)),
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

export type AnimalDetailProps = {
  animal: Animal;
  onAddActivity: () => void;
};

export function AnimalDetail({ animal, onAddActivity }: AnimalDetailProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const sex = animal.sex === "unknown" ? null : t(`sex.${animal.sex}`);

  const [statHeights, setStatHeights] = useState<Record<string, number>>({});
  const measureStat = useCallback((key: string, height: number) => {
    setStatHeights((current) =>
      current[key] === height ? current : { ...current, [key]: height },
    );
  }, []);

  const feedings = useValue(activityStores.feed.$);
  const habitats = useValue(activityStores.habitat.$);
  const activity = animalActivityFeed(animal.id, {
    feedings,
    habitats,
    weights: useValue(activityStores.weight.$),
    sheds: useValue(activityStores.shed.$),
    defecations: useValue(activityStores.poop.$),
  });

  const { weightUnit } = useAnimalDefaults(animal.id);
  const latestWeight = activity.find((entry) => entry.type === "weight");
  const latestFeed = latestAcceptedFeeding(feedings, animal.id);
  const overdueDays = scheduleDaysOverdue(
    latestFeed?.occurredAt,
    animal.feedingSchedule,
  );

  const waterSchedule = resolveSchedule(
    useValue(careSchedules$.water),
    animal.waterSchedule,
  );
  const latestWater = latestWaterChange(habitats, animal.id);
  const waterOverdueDays = scheduleDaysOverdue(
    latestWater?.occurredAt,
    waterSchedule,
  );

  const gradientBand = width * GRADIENT_BAND_FRACTION;
  const identityLabel = [
    animal.name,
    animal.commonName,
    animal.scientificName,
    sex,
  ]
    .filter((part): part is string => Boolean(part))
    .join(", ");

  const dateStats: Stat[] = [
    ...(animal.birthDate
      ? [
          {
            key: "birth",
            label: t("detail.birthDate"),
            value: formatAbsoluteDate(animal.birthDate),
            secondary: relativeLine(animal.birthDate, "old", t),
          },
        ]
      : []),
    ...(animal.acquiredDate
      ? [
          {
            key: "acquired",
            label: t("detail.acquired"),
            value: formatAbsoluteDate(animal.acquiredDate),
            secondary: relativeLine(animal.acquiredDate, "ago", t),
          },
        ]
      : []),
  ];

  const currentStats: Stat[] = [
    {
      key: "weight",
      label: t("detail.currentWeight"),
      value: latestWeight
        ? formatWeight(latestWeight.record.weight, weightUnit)
        : t("detail.unknownValue"),
      secondary: latestWeight
        ? relativeLine(latestWeight.occurredAt, "ago", t)
        : t("detail.noWeight"),
    },
    {
      key: "lastFed",
      label: t("detail.lastFed"),
      value: latestFeed
        ? formatAbsoluteDate(latestFeed.occurredAt)
        : t("detail.unknownValue"),
      secondary: latestFeed
        ? overdueDays
          ? t("schedule.overdue", { count: overdueDays })
          : relativeLine(latestFeed.occurredAt, "ago", t)
        : t("feeding.noFeedingLogged"),
      secondaryColor: overdueDays ? theme.danger : undefined,
    },
    ...(waterSchedule || latestWater
      ? [
          {
            key: "water",
            label: t("detail.lastWaterChange"),
            value: latestWater
              ? formatAbsoluteDate(latestWater.occurredAt)
              : t("detail.unknownValue"),
            secondary: latestWater
              ? waterOverdueDays
                ? t("schedule.overdue", { count: waterOverdueDays })
                : relativeLine(latestWater.occurredAt, "ago", t)
              : t("water.noneLogged"),
            secondaryColor: waterOverdueDays ? theme.danger : undefined,
          },
        ]
      : []),
  ];

  const tallestStat = Math.max(
    0,
    ...[...dateStats, ...currentStats].map(
      (stat) => statHeights[stat.key] ?? 0,
    ),
  );

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
              uiImage={getAnimalPhotoUri(animal.photo)}
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
                  <StatBox
                    key={stat.key}
                    stat={stat}
                    theme={theme}
                    minHeight={tallestStat}
                    onMeasure={measureStat}
                  />
                ))}
              </HStack>
            ))}
          </VStack>
        </Host>
      </View>

      <View style={styles.timeline}>
        <ThemedText type="heading">{t("timeline.title")}</ThemedText>

        <ActivityPanel
          entries={activity}
          animalId={animal.id}
          animalName={animal.name}
          onAddActivity={onAddActivity}
          limit={VISIBLE_LIMIT}
          onSeeAll={() => router.push(`/animal/${animal.id}/history`)}
        />
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
  timeline: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    gap: Spacing.sm,
  },
});
