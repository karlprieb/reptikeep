import { useSelector as useValue } from "@legendapp/state/react";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";

import type { ActivityType } from "@/constants/theme";
import { activityStores } from "@/state/activity-stores";
import {
  filterActivity,
  isRangePreset,
  resolveDateFilter,
  type DateFilter,
  type RangePreset,
  presentTypes,
} from "@/utils/activity-filter";
import { animalActivityFeed } from "@/utils/animal-activity";
import {
  calendarDateOf,
  fromCalendarDate,
  toCalendarDate,
} from "@/utils/format-date";

export function useHistoryFilters(id: string) {
  const feedings = useValue(activityStores.feed.$);
  const weights = useValue(activityStores.weight.$);
  const sheds = useValue(activityStores.shed.$);
  const defecations = useValue(activityStores.poop.$);
  const habitats = useValue(activityStores.habitat.$);
  const medical = useValue(activityStores.medical.$);

  const { type, preset, from, to } = useLocalSearchParams<{
    type?: string;
    preset?: string;
    from?: string;
    to?: string;
  }>();

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

  const types = useMemo(() => presentTypes(entries), [entries]);

  const filter = useMemo<DateFilter>(
    () =>
      preset === "custom" && from && to
        ? { preset: "custom", from, to }
        : { preset: isRangePreset(preset) ? preset : "all" },
    [preset, from, to],
  );

  const selectedType =
    type !== undefined && type in activityStores
      ? (type as ActivityType)
      : null;
  const activeType =
    selectedType && types.includes(selectedType) ? selectedType : null;

  const today = toCalendarDate(new Date());
  const shown = useMemo(
    () =>
      filterActivity(
        entries,
        filter,
        activeType,
        fromCalendarDate(today) ?? new Date(),
      ),
    [entries, filter, activeType, today],
  );

  const range = resolveDateFilter(
    filter,
    fromCalendarDate(today) ?? new Date(),
  );
  const activeRange = filter.preset !== "all";

  const setType = (next: ActivityType | null) =>
    router.setParams({ type: next ?? "" });
  const setPreset = (next: RangePreset) =>
    router.setParams({ preset: next, from: "", to: "" });
  const clearFilters = () =>
    router.setParams({ type: "", preset: "all", from: "", to: "" });

  const earliest =
    entries.length > 0
      ? (calendarDateOf(entries[entries.length - 1].occurredAt) ?? today)
      : today;
  const seed = range ?? { from: earliest, to: today };

  const openCustomRange = () =>
    router.push(
      `/animal/${id}/history-range?from=${seed.from}&to=${seed.to}&earliest=${earliest}&type=${activeType ?? ""}`,
    );

  return {
    entries,
    types,
    filter,
    activeType,
    shown,
    range,
    activeRange,
    setType,
    setPreset,
    clearFilters,
    openCustomRange,
  };
}
