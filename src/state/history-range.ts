import { observable } from "@legendapp/state";

import type { DateFilter } from "@/utils/activity-filter";

export const historyRange$ = observable<DateFilter>({ preset: "all" });

export function resetHistoryRange(): void {
  historyRange$.set({ preset: "all" });
}
