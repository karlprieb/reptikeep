import { useSelector as useValue } from "@legendapp/state/react";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

import {
  ActivityHistoryList,
  ActivityPanel,
} from "@/components/activity-timeline";
import { presentTypes } from "@/components/activity-type-filter";
import { AnimalNotFound, useAnimalRoute } from "@/components/animal-route";
import { IOSPageHeader } from "@/components/page-header";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { activityStores } from "@/state/activity-stores";
import { animalActivityFeed } from "@/utils/animal-activity";

const goBack = () => router.back();

export default function AnimalHistoryScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { id, animal } = useAnimalRoute();
  const feedings = useValue(activityStores.feed.$);
  const weights = useValue(activityStores.weight.$);
  const sheds = useValue(activityStores.shed.$);
  const defecations = useValue(activityStores.poop.$);
  const habitats = useValue(activityStores.habitat.$);
  const medical = useValue(activityStores.medical.$);

  const { type } = useLocalSearchParams<{ type?: string }>();

  const entries = useMemo(
    () =>
      animalActivityFeed(id, {
        feedings,
        weights,
        sheds,
        defecations,
        habitats,
        medical,
      }),
    [defecations, feedings, habitats, id, medical, sheds, weights],
  );

  const activeType = presentTypes(entries).find(
    (candidate) => candidate === type,
  );
  const activity = useMemo(
    () =>
      activeType
        ? entries.filter((entry) => entry.type === activeType)
        : entries,
    [activeType, entries],
  );
  if (!animal) return <AnimalNotFound />;

  return (
    <>
      {activity.length === 0 ? (
        <ScrollView
          style={[{ backgroundColor: theme.bg }, styles.list]}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.content}
        >
          <ActivityPanel
            entries={activity}
            animalId={id}
            animalName={animal.name}
            onAddActivity={goBack}
          />
        </ScrollView>
      ) : (
        <ActivityHistoryList
          entries={activity}
          animalId={id}
          background={theme.bg}
        />
      )}

      <IOSPageHeader
        title={
          activeType
            ? t(`activity.type.${activeType}`)
            : t("timeline.historyTitle")
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    width: "100%",
  },
  content: {
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
});
