import { useSelector as useValue } from "@legendapp/state/react";
import { useCallback, useMemo, useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import { useTranslation } from "react-i18next";

import type { ActivityType } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { Animal } from "@/state/animal";
import { activityStores } from "@/state/activity-stores";
import { careSchedules$, resolveSchedule } from "@/state/care-schedule";
import { useAnimalDefaults } from "@/state/logging-defaults";
import { presentTypes } from "@/utils/activity-filter";
import {
  animalActivityFeed,
  latestAcceptedFeeding,
  latestEnclosureClean,
  latestWaterChange,
} from "@/utils/animal-activity";
import { scheduleDaysOverdue } from "@/utils/schedule";
import {
  buildDateStats,
  buildFeedStat,
  buildIdentityLabel,
  buildRoutineStat,
  buildWeightStat,
  buildWeightTrend,
  type Stat,
} from "@/utils/animal-detail-stats";
import { weightChartData } from "@/utils/weight-chart";

export function useAnimalDetail(animal: Animal) {
  const theme = useTheme();
  const { t } = useTranslation();
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

  const trend = buildWeightTrend(weightTrend, weightUnit, t);

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

  const identityLabel = buildIdentityLabel(animal, sex);
  const dateStats = buildDateStats(animal, t);

  const currentStats: Stat[] = [
    buildWeightStat(latestWeight, weightUnit, t),
    buildFeedStat(latestFeed, overdueDays, theme.danger, t),
  ];
  if (waterSchedule || latestWater) {
    currentStats.push(
      buildRoutineStat(
        {
          key: "water",
          labelKey: "detail.lastWaterChange",
          noneKey: "water.noneLogged",
          latest: latestWater,
          overdueDays: waterOverdueDays,
          dangerColor: theme.danger,
        },
        t,
      ),
    );
  }
  if (cleaningSchedule || latestClean) {
    currentStats.push(
      buildRoutineStat(
        {
          key: "cleaning",
          labelKey: "detail.lastClean",
          noneKey: "cleaning.noneLogged",
          latest: latestClean,
          overdueDays: cleaningOverdueDays,
          dangerColor: theme.danger,
        },
        t,
      ),
    );
  }

  return {
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
  };
}
