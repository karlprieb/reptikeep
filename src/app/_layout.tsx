import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
  router,
  type Href,
} from "expo-router";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";

import "@/i18n";
import "@/state/settings";
import AppTabs from "@/components/app-tabs";
import { useColorScheme } from "@/hooks/use-theme";
import { startReminderScheduler } from "@/state/notifications";

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

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AppTabs />
    </ThemeProvider>
  );
}
