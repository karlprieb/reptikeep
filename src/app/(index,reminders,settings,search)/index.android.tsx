import { useSelector as useValue } from "@legendapp/state/react";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Animated } from "react-native";
import { useTranslation } from "react-i18next";

import { AddReptileFab } from "@/components/add-reptile-fab";
import {
  MaterialAppBar,
  type AppBarMenuItem,
} from "@/components/material-app-bar";
import { ReptileList } from "@/components/reptile-list";
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

const MENU_ICON = require("@/assets/images/icons/more-vert.xml");

const SORT_FIELDS: AnimalSortField[] = [
  "name",
  "commonName",
  "scientificName",
  "lastActivity",
];

const SORT_DIRECTIONS: SortDirection[] = ["asc", "desc"];

const VIEW_MODES: ReptileViewMode[] = ["single", "grid", "list"];

const DIRECTION_LABELS: Record<SortDirection, "ascending" | "descending"> = {
  asc: "ascending",
  desc: "descending",
};

export default function ReptilesScreen() {
  const { t } = useTranslation();
  const animalsRecord = useValue(animals$);
  const summaries = useValue(summaries$);
  const sort = useValue(settings$.reptileSort);
  const view = useValue(settings$.reptileView);

  const [scrollY] = useState(() => new Animated.Value(0));
  const [appBarHeight, setAppBarHeight] = useState(0);

  const { lastFed, lastWater, lastClean, lastActivity } = useMemo(
    () => summaryLookups(summaries),
    [summaries],
  );
  const animals = useMemo(
    () => sortAnimals(Object.values(animalsRecord), sort, lastActivity),
    [animalsRecord, sort, lastActivity],
  );

  const menuItems: AppBarMenuItem[] = [
    ...SORT_FIELDS.map<AppBarMenuItem>((field) => ({
      key: `sort-${field}`,
      type: "item",
      label: t(`reptiles.sort.${field}`),
      selected: sort.field === field,
      onPress: () => setReptileSort({ ...sort, field }),
    })),
    { key: "direction-divider", type: "divider" },
    ...SORT_DIRECTIONS.map<AppBarMenuItem>((direction) => ({
      key: `direction-${direction}`,
      type: "item",
      label: t(`reptiles.sort.${DIRECTION_LABELS[direction]}`),
      selected: sort.direction === direction,
      onPress: () => setReptileSort({ ...sort, direction }),
    })),
    { key: "view-divider", type: "divider" },
    ...VIEW_MODES.map<AppBarMenuItem>((mode) => ({
      key: `view-${mode}`,
      type: "item",
      label: t(`reptiles.view.${mode}`),
      selected: view === mode,
      onPress: () => {
        scrollY.setValue(0);
        setReptileView(mode);
      },
    })),
  ];

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
        scrollY={scrollY}
        contentInsetTop={appBarHeight}
      />

      <AddReptileFab
        onPress={handleAdd}
        accessibilityLabel={t("a11y.addReptile.label")}
        accessibilityHint={t("a11y.addReptile.hint")}
      />

      <MaterialAppBar
        title={t("reptiles.title")}
        scrollY={scrollY}
        onHeightChange={setAppBarHeight}
        menu={{
          icon: MENU_ICON,
          accessibilityLabel: t("reptiles.options"),
          items: menuItems,
        }}
      />
    </>
  );
}
