import { useEffect, useState } from "react";
import { AppState, Platform } from "react-native";

import {
  exactAlarmPermission,
  reminderPermission,
  type ExactAlarmPermission,
  type ReminderPermission,
} from "@/state/notifications";

export function useReminderPermission() {
  const [permission, setPermission] = useState<ReminderPermission>();
  const [exactAlarm, setExactAlarm] = useState<ExactAlarmPermission>();

  useEffect(() => {
    const read = () => {
      void reminderPermission().then(setPermission);
      if (Platform.OS === "android")
        void exactAlarmPermission().then(setExactAlarm);
    };
    read();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") read();
    });

    return () => subscription.remove();
  }, []);

  return [permission, setPermission, exactAlarm, setExactAlarm] as const;
}
