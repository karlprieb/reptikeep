import { useSelector as useValue } from "@legendapp/state/react";
import { router } from "expo-router";
import { useCallback, useMemo } from "react";
import { FlatList, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

import {
  ActivityHistoryRow,
  ActivityPanel,
} from "@/components/activity-timeline";
import { AnimalNotFound, useAnimalRoute } from "@/components/animal-route";
import { IOSPageHeader } from "@/components/page-header";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { activityStores } from "@/state/activity-stores";
import {
  animalActivityFeed,
  previousOfSameType,
  type AnimalActivity,
} from "@/utils/animal-activity";

const goBack = () => router.back();
const activityKey = (entry: AnimalActivity) => `${entry.type}:${entry.id}`;

export default function AnimalHistoryScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { id, animal } = useAnimalRoute();
  const feedings = useValue(activityStores.feed.$);
  const weights = useValue(activityStores.weight.$);
  const sheds = useValue(activityStores.shed.$);
  const defecations = useValue(activityStores.poop.$);
  const habitats = useValue(activityStores.habitat.$);

  const activity = useMemo(
    () =>
      animalActivityFeed(id, {
        feedings,
        weights,
        sheds,
        defecations,
        habitats,
      }),
    [defecations, feedings, habitats, id, sheds, weights],
  );
  const previous = useMemo(() => previousOfSameType(activity), [activity]);

  const renderActivity = useCallback(
    ({ item, index }: { item: AnimalActivity; index: number }) => (
      <ActivityHistoryRow
        entry={item}
        previous={previous[activityKey(item)]}
        divided={index > 0}
      />
    ),
    [previous],
  );

  if (!animal) return <AnimalNotFound />;

  return (
    <>
      <FlatList
        style={[{ backgroundColor: theme.bg }, styles.list]}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        data={activity}
        keyExtractor={activityKey}
        renderItem={renderActivity}
        initialNumToRender={10}
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={50}
        windowSize={7}
        removeClippedSubviews
        ListEmptyComponent={
          <ActivityPanel
            entries={activity}
            animalId={id}
            animalName={animal.name}
            onAddActivity={goBack}
          />
        }
      />

      <IOSPageHeader title={t("timeline.historyTitle")} />
    </>
  );
}

const styles = StyleSheet.create({
  list: {
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
