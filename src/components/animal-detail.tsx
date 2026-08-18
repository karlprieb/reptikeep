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
import { useCallback, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from "react-native";
import { useTranslation } from "react-i18next";

import { ActivityPanel, VISIBLE_LIMIT } from "@/components/activity-timeline";
import {
  ActivityTypeFilter,
  presentTypes,
} from "@/components/activity-type-filter";
import { ThemedText } from "@/components/themed-text";
import {
  Radius,
  Spacing,
  type ActivityType,
  type Theme,
} from "@/constants/theme";
import { typeFont, typeStyle } from "@/constants/type-font";
import { useTheme } from "@/hooks/use-theme";
import type { Animal } from "@/state/animal";
import { activityStores } from "@/state/activity-stores";
import { careSchedules$, resolveSchedule } from "@/state/care-schedule";
import { useAnimalDefaults } from "@/state/logging-defaults";
import {
  animalActivityFeed,
  latestAcceptedFeeding,
  latestEnclosureClean,
  latestWaterChange,
} from "@/utils/animal-activity";
import { getAnimalPhotoUri } from "@/utils/animal-photo-storage";
import { formatAbsoluteDate } from "@/utils/format-date";
import { scheduleDaysOverdue } from "@/utils/schedule";
import { formatWeight, formatWeightDelta } from "@/utils/format-number";
import { relativeLine } from "@/utils/relative-date";
import { WeightTrendChart } from "@/components/weight-trend-chart";
import { weightChartData } from "@/utils/weight-chart";

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

export type AnimalDetailProps = {
  animal: Animal;
  onAddActivity: () => void;
};

export function AnimalDetail({ animal, onAddActivity }: AnimalDetailProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const sex = animal.sex === "unknown" ? null : t(`sex.${animal.sex}`);

  const feedings = useValue(activityStores.feed.$);
  const habitats = useValue(activityStores.habitat.$);
  const weights = useValue(activityStores.weight.$);
  const sheds = useValue(activityStores.shed.$);
  const defecations = useValue(activityStores.poop.$);
  const medical = useValue(activityStores.medical.$);

  const activity = useMemo(
    () =>
      animalActivityFeed(animal.id, {
        feedings,
        habitats,
        weights,
        sheds,
        defecations,
        medical,
      }),
    [animal.id, defecations, feedings, habitats, medical, sheds, weights],
  );

  const [typeFilter, setTypeFilter] = useState<ActivityType | null>(null);
  const [panelReserve, setPanelReserve] = useState(0);

  const types = useMemo(() => presentTypes(activity), [activity]);
  if (typeFilter && !types.includes(typeFilter)) setTypeFilter(null);
  const activeType =
    typeFilter && types.includes(typeFilter) ? typeFilter : null;
  const shown = useMemo(
    () =>
      activeType
        ? activity.filter((entry) => entry.type === activeType)
        : activity,
    [activity, activeType],
  );

  const holdPanelHeight = useCallback(
    ({ nativeEvent }: LayoutChangeEvent) => {
      if (!activeType) setPanelReserve(nativeEvent.layout.height);
    },
    [activeType],
  );

  const { weightUnit } = useAnimalDefaults(animal.id);
  const latestWeight = activity.find((entry) => entry.type === "weight");

  const weightTrend = useMemo(
    () => weightChartData(weights, animal.id, weightUnit),
    [weights, animal.id, weightUnit],
  );

  const trend =
    weightTrend.count > 1 && weightTrend.first && weightTrend.last
      ? {
          span: t("weightTrend.span", {
            first: formatAbsoluteDate(weightTrend.first.occurredAt),
            last: formatAbsoluteDate(weightTrend.last.occurredAt),
          }),
          change: formatWeightDelta(weightTrend.deltaGrams, weightUnit),
          direction:
            weightTrend.deltaGrams > 0
              ? ("up" as const)
              : weightTrend.deltaGrams < 0
                ? ("down" as const)
                : ("flat" as const),
          window:
            weightTrend.total > weightTrend.count
              ? t("weightTrend.window", { count: weightTrend.count })
              : null,
          summary: t("weightTrend.summary", {
            count: weightTrend.count,
            first: formatAbsoluteDate(weightTrend.first.occurredAt),
            last: formatAbsoluteDate(weightTrend.last.occurredAt),
            latest: formatWeight(weightTrend.last.weight, weightUnit),
            change: formatWeightDelta(weightTrend.deltaGrams, weightUnit),
          }),
        }
      : null;

  const latestFeed = useMemo(
    () => latestAcceptedFeeding(feedings, animal.id),
    [feedings, animal.id],
  );
  const overdueDays = scheduleDaysOverdue(
    latestFeed?.occurredAt,
    animal.feedingSchedule,
  );

  const waterSchedule = resolveSchedule(
    useValue(careSchedules$.water),
    animal.waterSchedule,
  );
  const latestWater = useMemo(
    () => latestWaterChange(habitats, animal.id),
    [habitats, animal.id],
  );
  const waterOverdueDays = scheduleDaysOverdue(
    latestWater?.occurredAt ?? animal.createdAt,
    waterSchedule,
  );

  const cleaningSchedule = resolveSchedule(
    useValue(careSchedules$.cleaning),
    animal.cleaningSchedule,
  );
  const latestClean = useMemo(
    () => latestEnclosureClean(habitats, animal.id),
    [habitats, animal.id],
  );
  const cleaningOverdueDays = scheduleDaysOverdue(
    latestClean?.occurredAt ?? animal.createdAt,
    cleaningSchedule,
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
            secondary: waterOverdueDays
              ? t("schedule.overdue", { count: waterOverdueDays })
              : latestWater
                ? relativeLine(latestWater.occurredAt, "ago", t)
                : t("water.noneLogged"),
            secondaryColor: waterOverdueDays ? theme.danger : undefined,
          },
        ]
      : []),
    ...(cleaningSchedule || latestClean
      ? [
          {
            key: "cleaning",
            label: t("detail.lastClean"),
            value: latestClean
              ? formatAbsoluteDate(latestClean.occurredAt)
              : t("detail.unknownValue"),
            secondary: cleaningOverdueDays
              ? t("schedule.overdue", { count: cleaningOverdueDays })
              : latestClean
                ? relativeLine(latestClean.occurredAt, "ago", t)
                : t("cleaning.noneLogged"),
            secondaryColor: cleaningOverdueDays ? theme.danger : undefined,
          },
        ]
      : []),
  ];

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
