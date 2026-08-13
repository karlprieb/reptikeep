import { useSelector as useValue } from "@legendapp/state/react";
import { router, Stack } from "expo-router";
import { useMemo } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

import { IOSPageHeader } from "@/components/page-header";
import { ReptileList } from "@/components/reptile-list";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { animals$ } from "@/state/animal";
import { activityStores } from "@/state/activity-stores";
import {
  setReptileSort,
  setReptileView,
  settings$,
  type ReptileViewMode,
} from "@/state/settings";
import {
  lastActivityByAnimal,
  lastCareByAnimal,
  lastFedByAnimal,
} from "@/utils/animal-activity";
import type { AnimalSortField, SortDirection } from "@/utils/animal-sort";
import { sortAnimals } from "@/utils/animal-sort";

const handleAdd = () => router.push("/add-reptile");

const SORT_FIELDS: AnimalSortField[] = [
  "name",
  "commonName",
  "scientificName",
  "lastActivity",
];

const VIEW_MODES: {
  mode: ReptileViewMode;
  icon: "square.grid.2x2" | "square" | "list.bullet";
}[] = [
  { mode: "single", icon: "square" },
  { mode: "grid", icon: "square.grid.2x2" },
  { mode: "list", icon: "list.bullet" },
];

export default function ReptilesScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const animalsRecord = useValue(animals$);
  const feedings = useValue(activityStores.feed.$);
  const weights = useValue(activityStores.weight.$);
  const sheds = useValue(activityStores.shed.$);
  const poops = useValue(activityStores.poop.$);
  const habitats = useValue(activityStores.habitat.$);
  const sort = useValue(settings$.reptileSort);
  const view = useValue(settings$.reptileView);

  const lastFed = useMemo(() => lastFedByAnimal(feedings), [feedings]);
  const lastCare = useMemo(() => lastCareByAnimal(habitats), [habitats]);
  const lastActivity = useMemo(
    () => lastActivityByAnimal(feedings, weights, sheds, poops, habitats),
    [feedings, weights, sheds, poops, habitats],
  );
  const animals = useMemo(
    () => sortAnimals(Object.values(animalsRecord), sort, lastActivity),
    [animalsRecord, sort, lastActivity],
  );

  const isEmpty = animals.length === 0;

  const setSortField = (field: AnimalSortField) =>
    setReptileSort({ ...sort, field });
  const setSortDirection = (direction: SortDirection) =>
    setReptileSort({ ...sort, direction });

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.bg }]}
        contentInsetAdjustmentBehavior={isEmpty ? "never" : "automatic"}
        alwaysBounceVertical={!isEmpty}
        contentContainerStyle={[styles.content, isEmpty && styles.emptyContent]}
      >
        <ReptileList
          animals={animals}
          lastFed={lastFed}
          lastWaterChange={lastCare.water}
          lastClean={lastCare.cleaning}
          viewMode={view}
          onAddPress={handleAdd}
        />
      </ScrollView>

      <IOSPageHeader
        title={t("reptiles.title")}
        actions={[
          {
            key: "add",
            icon: "plus",
            accessibilityLabel: t("a11y.addReptile.label"),
            accessibilityHint: t("a11y.addReptile.hint"),
            tintColor: theme.primary,
            onPress: handleAdd,
          },
        ]}
        menu={
          <Stack.Toolbar.Menu
            icon="ellipsis.circle"
            tintColor={theme.textSecondary}
            accessibilityLabel={t("reptiles.options")}
            accessibilityHint={t("reptiles.optionsHint")}
          >
            <Stack.Toolbar.Menu inline>
              <Stack.Toolbar.Menu
                title={t("reptiles.sort.by")}
                icon="arrow.up.arrow.down"
              >
                <Stack.Toolbar.Menu inline>
                  {SORT_FIELDS.map((field) => (
                    <Stack.Toolbar.MenuAction
                      key={field}
                      isOn={sort.field === field}
                      onPress={() => setSortField(field)}
                    >
                      {t(`reptiles.sort.${field}`)}
                    </Stack.Toolbar.MenuAction>
                  ))}
                </Stack.Toolbar.Menu>
                <Stack.Toolbar.Menu inline>
                  <Stack.Toolbar.MenuAction
                    icon="arrow.up"
                    isOn={sort.direction === "asc"}
                    onPress={() => setSortDirection("asc")}
                  >
                    {t("reptiles.sort.ascending")}
                  </Stack.Toolbar.MenuAction>
                  <Stack.Toolbar.MenuAction
                    icon="arrow.down"
                    isOn={sort.direction === "desc"}
                    onPress={() => setSortDirection("desc")}
                  >
                    {t("reptiles.sort.descending")}
                  </Stack.Toolbar.MenuAction>
                </Stack.Toolbar.Menu>
              </Stack.Toolbar.Menu>
            </Stack.Toolbar.Menu>
            <Stack.Toolbar.Menu inline>
              {VIEW_MODES.map(({ mode, icon }) => (
                <Stack.Toolbar.MenuAction
                  key={mode}
                  icon={icon}
                  isOn={view === mode}
                  onPress={() => setReptileView(mode)}
                >
                  {t(`reptiles.view.${mode}`)}
                </Stack.Toolbar.MenuAction>
              ))}
            </Stack.Toolbar.Menu>
          </Stack.Toolbar.Menu>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  content: {
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
});
