import { observe } from "@legendapp/state";
import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import { AppState, Platform } from "react-native";

import i18n from "@/i18n";
import { animals$ } from "@/state/animal";
import { CARE_ROUTINES, careSchedules$ } from "@/state/care-schedule";
import { reminders$ } from "@/state/reminders";
import { settings$ } from "@/state/settings";
import { summaries$, summaryLookups } from "@/state/summary";
import {
  careReminders,
  reminderDigest,
  upcomingBirthdays,
  type ReminderDay,
} from "@/utils/care-reminders";
import { atClockTime, fromCalendarDate } from "@/utils/format-date";

const HORIZON_DAYS = 14;

const IOS_PENDING_LIMIT = 64;

const CARE_CHANNEL_ID = "care-reminders";

async function ensureCareChannel(): Promise<void> {
  await Notifications.setNotificationChannelAsync(CARE_CHANNEL_ID, {
    name: i18n.t("reminders.channel.name"),
    importance: AndroidImportance.HIGH,
  });
}

function careLookups() {
  const { lastFed, lastWater, lastClean } = summaryLookups(summaries$.peek());

  return { feed: lastFed, water: lastWater, cleaning: lastClean };
}

const NAMES_SHOWN = 3;

const SETTLE_MS = 250;

export type ReminderPermission = "granted" | "ask" | "blocked";

export type ExactAlarmPermission = "granted" | "denied";

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

function toExactAlarm({ granted }: { granted: boolean }): ExactAlarmPermission {
  return granted ? "granted" : "denied";
}

export async function exactAlarmPermission(): Promise<ExactAlarmPermission> {
  return toExactAlarm(await Notifications.getExactAlarmPermissionsAsync());
}

export async function requestExactAlarmPermission(): Promise<ExactAlarmPermission> {
  return toExactAlarm(await Notifications.requestExactAlarmPermissionsAsync());
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
    careReminders(animals$.peek(), careSchedules$.peek(), careLookups()),
    new Date(),
    HORIZON_DAYS,
  );

  const { hour, minute, birthdays: birthdaysOn } = reminders$.peek();
  const upcoming = birthdaysOn
    ? upcomingBirthdays(animals$.peek(), new Date(), HORIZON_DAYS)
    : [];
  // shortcut: iOS keeps only the soonest IOS_PENDING_LIMIT pending notifications, so cap birthdays to what is left after care; shorten the horizon if keepers hit the cap
  const birthdays =
    Platform.OS === "ios"
      ? upcoming.slice(0, Math.max(0, IOS_PENDING_LIMIT - days.length))
      : upcoming;

  await Notifications.cancelAllScheduledNotificationsAsync();
  if (run !== generation || (days.length === 0 && birthdays.length === 0))
    return;

  const asked = await reminderPermission();
  const permission =
    asked === "ask" && days.length > 0
      ? await requestReminderPermission()
      : asked;
  if (permission !== "granted" || run !== generation) return;

  await ensureCareChannel();
  if (run !== generation) return;

  const alarmClock =
    Platform.OS === "android" && (await exactAlarmPermission()) === "granted";
  if (run !== generation) return;

  const trigger = (at: Date) => ({
    type: Notifications.SchedulableTriggerInputTypes.DATE,
    date: at,
    channelId: CARE_CHANNEL_ID,
    ...(alarmClock ? { delivery: "alarmClock" as const } : null),
  });

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
      trigger: trigger(at),
    });

    if (run !== generation) return;
  }

  for (const birthday of birthdays) {
    const date = fromCalendarDate(birthday.date);
    if (!date) continue;

    const at = atClockTime(date, hour, minute);
    if (at.getTime() <= Date.now()) continue;

    await Notifications.scheduleNotificationAsync({
      identifier: `birthday-${birthday.animalId}-${birthday.date}`,
      content: {
        title: i18n.t("reminders.notification.birthdayTitle", {
          name: birthday.name,
        }),
        body: i18n.t("reminders.notification.birthdayBody", {
          name: birthday.name,
          count: birthday.age,
        }),
        data: { url: `/animal/${birthday.animalId}` },
      },
      trigger: trigger(at),
    });

    if (run !== generation) return;
  }
}

export function rescheduleSoon(): void {
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
    summaries$.get();
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
