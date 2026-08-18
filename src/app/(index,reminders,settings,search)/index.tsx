import { useSelector as useValue } from "@legendapp/state/react";
import { router, Stack } from "expo-router";
import { useMemo } from "react";

import { useTranslation } from "react-i18next";

import { IOSPageHeader } from "@/components/page-header";
import { ReptileList } from "@/components/reptile-list";
import { useTheme } from "@/hooks/use-theme";
import { animals$ } from "@/state/animal";
import {
  setReptileSort,
  setReptileView,
  settings$,
  type ReptileViewMode,
} from "@/state/settings";
import { summaries$, summaryLookups } from "@/state/summary";
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
  const summaries = useValue(summaries$);
  const sort = useValue(settings$.reptileSort);
  const view = useValue(settings$.reptileView);

  const { lastFed, lastWater, lastClean, lastActivity } = useMemo(
    () => summaryLookups(summaries),
    [summaries],
  );
  const animals = useMemo(
    () => sortAnimals(Object.values(animalsRecord), sort, lastActivity),
    [animalsRecord, sort, lastActivity],
  );

  const setSortField = (field: AnimalSortField) =>
    setReptileSort({ ...sort, field });
  const setSortDirection = (direction: SortDirection) =>
    setReptileSort({ ...sort, direction });

  return (
    <>
      <ReptileList
        key={view}
        animals={animals}
        lastFed={lastFed}
        lastWaterChange={lastWater}
        lastClean={lastClean}
        viewMode={view}
        onAddPress={handleAdd}
      />

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
