import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
  router,
  type Href,
} from "expo-router";
import * as Notifications from "expo-notifications";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useEffect } from "react";

import "@/i18n";
import "@/state/settings";
import AppTabs from "@/components/app-tabs";
import { useColorScheme } from "@/hooks/use-theme";
import { backfillSummaries } from "@/state/activity-stores";
import { startReminderScheduler } from "@/state/notifications";

const scheduleIdle = (fn: () => void) => {
  if (typeof requestIdleCallback === "function") {
    const handle = requestIdleCallback(fn, { timeout: 5000 });
    return () => cancelIdleCallback(handle);
  }

  const timer = setTimeout(fn, 0);
  return () => clearTimeout(timer);
};

function useNotificationRouting() {
  useEffect(() => {
    const redirect = (notification: Notifications.Notification) => {
      const url = notification.request.content.data?.url;
      if (typeof url === "string") router.push(url as Href);
    };

    const launched = Notifications.getLastNotificationResponse();
    if (launched) redirect(launched.notification);

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => redirect(response.notification),
    );

    return () => subscription.remove();
  }, []);
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  useNotificationRouting();
  useEffect(startReminderScheduler, []);
  useEffect(() => {
    const cancel = scheduleIdle(backfillSummaries);

    return cancel;
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <AppTabs />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
