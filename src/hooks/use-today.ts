import { useEffect, useState } from "react";
import { AppState } from "react-native";

import { toCalendarDate } from "@/utils/format-date";

const MIDNIGHT_BUFFER_MS = 5_000;

function currentCalendarDate(): string {
  return toCalendarDate(new Date());
}

function msUntilNextMidnight(): number {
  const now = new Date();
  const next = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
  );

  return next.getTime() - now.getTime() + MIDNIGHT_BUFFER_MS;
}

export function useToday(): string {
  const [today, setToday] = useState(currentCalendarDate);

  useEffect(() => {
    const refresh = () => setToday(currentCalendarDate());

    let timer: ReturnType<typeof setTimeout>;
    const scheduleNext = () => {
      timer = setTimeout(() => {
        refresh();
        scheduleNext();
      }, msUntilNextMidnight());
    };
    scheduleNext();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });

    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, []);

  return today;
}
