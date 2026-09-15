import { useValue } from "@legendapp/state/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { feedingStore } from "@/state/feeding";
import type { FeedingActivity } from "@/state/feeding";

export const FOOD_TYPE_SUGGESTION_LIMIT = 5;
const BLUR_CLOSE_DELAY_MS = 150;

function rankFoodTypes(
  animalId: string,
  records: Record<string, FeedingActivity>,
): string[] {
  const counts = new Map<
    string,
    { display: string; count: number; latestOccurredAt: number }
  >();

  for (const record of Object.values(records)) {
    if (record.animalId !== animalId) continue;
    const foodType = record.foodType?.trim();
    if (!foodType) continue;

    const key = foodType.toLowerCase();
    const occurredAt = Date.parse(record.occurredAt);
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
      if (occurredAt > existing.latestOccurredAt) {
        existing.display = foodType;
        existing.latestOccurredAt = occurredAt;
      }
    } else {
      counts.set(key, {
        display: foodType,
        count: 1,
        latestOccurredAt: occurredAt,
      });
    }
  }

  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .map((entry) => entry.display);
}

function filterFoodTypes(foodTypes: string[], query: string): string[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return foodTypes;
  return foodTypes.filter((foodType) =>
    foodType.toLowerCase().includes(needle),
  );
}

type TextState = { set: (value: string) => void };
type SelectionState = { set: (value: { start: number; end: number }) => void };

type UseFoodTypeSuggestionsParams = {
  animalId: string;
  text: TextState;
  selection: SelectionState;
  query: string;
  onSelect: (value: string) => void;
};

export function useFoodTypeSuggestions({
  animalId,
  text,
  selection,
  query,
  onSelect,
}: UseFoodTypeSuggestionsParams) {
  const records = useValue(feedingStore.$);
  const ranked = useMemo(
    () => rankFoodTypes(animalId, records),
    [animalId, records],
  );
  const filtered = useMemo(
    () => filterFoodTypes(ranked, query),
    [ranked, query],
  );
  const isOnlyExactMatch =
    filtered.length === 1 &&
    filtered[0].toLowerCase() === query.trim().toLowerCase();
  const suggestions = isOnlyExactMatch
    ? []
    : filtered.slice(0, FOOD_TYPE_SUGGESTION_LIMIT);

  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const selectedValueRef = useRef<string | null>(null);

  useEffect(() => () => clearTimeout(blurTimer.current), []);

  useEffect(() => {
    const selected = selectedValueRef.current;
    if (selected === null) return;
    if (query.trim().toLowerCase() === selected.trim().toLowerCase()) return;
    selectedValueRef.current = null;
    setDismissed(false);
  }, [query]);

  const handleFocusChange = (isFocused: boolean) => {
    clearTimeout(blurTimer.current);
    if (isFocused) {
      setDismissed(false);
      setFocused(true);
    } else {
      blurTimer.current = setTimeout(
        () => setFocused(false),
        BLUR_CLOSE_DELAY_MS,
      );
    }
  };

  const dismiss = () => {
    clearTimeout(blurTimer.current);
    setDismissed(true);
  };

  const select = (option: string) => {
    clearTimeout(blurTimer.current);
    text.set(option);
    selection.set({ start: option.length, end: option.length });
    onSelect(option);
    selectedValueRef.current = option;
    setDismissed(true);
  };

  return {
    suggestions,
    visible: focused && !dismissed && suggestions.length > 0,
    handleFocusChange,
    dismiss,
    select,
  };
}
