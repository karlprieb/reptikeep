import { useValue } from "@legendapp/state/react";
import { useState } from "react";

import {
  careSchedules$,
  type CareRoutine,
  type CareSchedule,
} from "@/state/care-schedule";
import {
  careScheduleFromFields,
  isScheduleValid,
  scheduleCustomDays,
  type ScheduleSelection,
} from "@/utils/schedule";

export type CareScheduleEditor = {
  schedule: CareSchedule | undefined;
  selection: ScheduleSelection;
  days: string;
  valid: boolean;
  setSelection: (selection: ScheduleSelection) => void;
  setDays: (value: string) => void;
  setEnabled: (on: boolean) => void;
};

export function useCareScheduleEditor(
  routine: CareRoutine,
): CareScheduleEditor {
  const schedule = useValue(careSchedules$[routine]);
  const [selection, setSelectionState] = useState<ScheduleSelection>(
    () => schedule?.frequency ?? "weekly",
  );
  const [days, setDaysState] = useState(() => scheduleCustomDays(schedule));

  const valid = isScheduleValid(selection, days);

  const setSelection = (next: ScheduleSelection) => {
    setSelectionState(next);
    if (isScheduleValid(next, days)) {
      careSchedules$[routine].set(careScheduleFromFields(next, days));
    }
  };

  const setDays = (value: string) => {
    setDaysState(value);
    if (isScheduleValid("custom", value)) {
      careSchedules$[routine].set({
        frequency: "custom",
        days: Number(value.trim()),
      });
    }
  };

  const setEnabled = (on: boolean) => {
    setSelectionState("weekly");
    careSchedules$[routine].set(on ? { frequency: "weekly" } : undefined);
  };

  return {
    schedule,
    selection,
    days,
    valid,
    setSelection,
    setDays,
    setEnabled,
  };
}
