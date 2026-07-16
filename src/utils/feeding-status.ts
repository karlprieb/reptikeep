import type { TFunction } from "i18next";

import { ActivitySymbols, type SFSymbolName } from "@/constants/theme";
import type { CareSchedule } from "@/state/care-schedule";
import { relativeLine } from "@/utils/relative-date";
import { scheduleDaysOverdue } from "@/utils/schedule";

export interface FeedingStatus {
  line: string;
  icon: SFSymbolName;
  overdue: boolean;
}

export function feedingStatus(
  t: TFunction,
  lastFedAt: string | undefined,
  schedule: CareSchedule | undefined,
): FeedingStatus {
  const overdueDays = scheduleDaysOverdue(lastFedAt, schedule);

  return {
    line: overdueDays
      ? t("schedule.overdue", { count: overdueDays })
      : lastFedAt
        ? relativeLine(lastFedAt, "ago", t)
        : t("feeding.neverFed"),
    icon: ActivitySymbols.feed,
    overdue: Boolean(overdueDays),
  };
}
