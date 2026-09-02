import { useEffect, useState } from "react";
import { AppState } from "react-native";

import {
  reminderPermission,
  type ReminderPermission,
} from "@/state/notifications";

export function useReminderPermission() {
  const [permission, setPermission] = useState<ReminderPermission>();

  useEffect(() => {
    const read = () => void reminderPermission().then(setPermission);
    read();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") read();
    });

    return () => subscription.remove();
  }, []);

  return [permission, setPermission] as const;
}
