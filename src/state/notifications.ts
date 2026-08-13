import { observe } from "@legendapp/state";
import * as Notifications from "expo-notifications";
import { AppState } from "react-native";

import i18n from "@/i18n";
import { activityStores } from "@/state/activity-stores";
import { animals$ } from "@/state/animal";
import { CARE_ROUTINES, careSchedules$ } from "@/state/care-schedule";
import { reminders$ } from "@/state/reminders";
import { settings$ } from "@/state/settings";
import { lastCareByAnimal } from "@/utils/animal-activity";
import {
  careReminders,
  reminderDigest,
  type ReminderDay,
} from "@/utils/care-reminders";
import { atClockTime, fromCalendarDate } from "@/utils/format-date";

const HORIZON_DAYS = 14;

const NAMES_SHOWN = 3;

const SETTLE_MS = 250;

export type ReminderPermission = "granted" | "ask" | "blocked";

function toPermission({
  granted,
  canAskAgain,
}: Notifications.NotificationPermissionsStatus): ReminderPermission {
  if (granted) return "granted";

  return canAskAgain ? "ask" : "blocked";
}

export async function reminderPermission(): Promise<ReminderPermission> {
  return toPermission(await Notifications.getPermissionsAsync());
}

export async function requestReminderPermission(): Promise<ReminderPermission> {
  return toPermission(await Notifications.requestPermissionsAsync());
}

function notificationBody(routines: ReminderDay["routines"]): string {
  return routines
    .map(({ routine, names }) => {
      const shown = names.slice(0, NAMES_SHOWN).join(", ");
      const rest = names.length - NAMES_SHOWN;

      return i18n.t("reminders.notification.line", {
        routine: i18n.t(`reminders.routine.${routine}`),
        names:
          rest > 0
            ? i18n.t("reminders.notification.overflow", {
                names: shown,
                count: rest,
              })
            : shown,
      });
    })
    .join("\n");
}

let generation = 0;
let settling: ReturnType<typeof setTimeout> | undefined;

async function reschedule(): Promise<void> {
  const run = (generation += 1);

  const days = reminderDigest(
    careReminders(
      animals$.peek(),
      careSchedules$.peek(),
      lastCareByAnimal(activityStores.habitat.$.peek()),
    ),
    new Date(),
    HORIZON_DAYS,
  );

  await Notifications.cancelAllScheduledNotificationsAsync();
  if (run !== generation || days.length === 0) return;

  const asked = await reminderPermission();
  const permission =
    asked === "ask" ? await requestReminderPermission() : asked;
  if (permission !== "granted" || run !== generation) return;

  const { hour, minute } = reminders$.peek();

  for (const day of days) {
    const date = fromCalendarDate(day.date);
    if (!date) continue;

    const at = atClockTime(date, hour, minute);
    if (at.getTime() <= Date.now()) continue;

    await Notifications.scheduleNotificationAsync({
      identifier: `care-${day.date}`,
      content: {
        title: i18n.t("reminders.notification.title"),
        body: notificationBody(day.routines),
        data: { url: "/reminders" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: at,
      },
    });

    if (run !== generation) return;
  }
}

function rescheduleSoon(): void {
  if (settling) clearTimeout(settling);

  settling = setTimeout(() => {
    reschedule().catch(() => undefined);
  }, SETTLE_MS);
}

export function startReminderScheduler(): () => void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  const stopObserving = observe(() => {
    animals$.get();
    for (const routine of CARE_ROUTINES) careSchedules$[routine].get();
    activityStores.habitat.$.get();
    reminders$.get();
    settings$.language.get();

    rescheduleSoon();
  });

  const foreground = AppState.addEventListener("change", (state) => {
    if (state === "active") rescheduleSoon();
  });

  return () => {
    stopObserving();
    foreground.remove();
    if (settling) clearTimeout(settling);
  };
}
