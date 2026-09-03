import { useValue } from "@legendapp/state/react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useTheme } from "@/hooks/use-theme";
import { useToday } from "@/hooks/use-today";
import { animals$ } from "@/state/animal";
import { careSchedules$, type ReminderRoutine } from "@/state/care-schedule";
import { reminders$ } from "@/state/reminders";
import { summaries$, summaryLookups } from "@/state/summary";
import { careReminders, type CareReminder } from "@/utils/care-reminders";
import {
  daysSince,
  formatClockTime,
  fromCalendarDate,
} from "@/utils/format-date";
import { stopReminding } from "@/utils/reminder-actions";

export type DueState = {
  text: string;
  color: string;
};

export function useRemindersData() {
  const { t } = useTranslation();
  const theme = useTheme();
  const today = useToday();

  const animals = useValue(animals$);
  const collectionWater = useValue(careSchedules$.water);
  const collectionCleaning = useValue(careSchedules$.cleaning);
  const summaries = useValue(summaries$);
  const reminderTime = useValue(reminders$);

  const reminders = useMemo(() => {
    const { lastFed, lastWater, lastClean } = summaryLookups(summaries);

    return careReminders(
      animals,
      { water: collectionWater, cleaning: collectionCleaning },
      { feed: lastFed, water: lastWater, cleaning: lastClean },
    );
  }, [animals, collectionCleaning, collectionWater, summaries]);

  const dueState = (reminder: CareReminder): DueState => {
    if (reminder.dueOn < today) {
      return {
        text: t("schedule.overdue", { count: daysSince(reminder.dueOn) ?? 0 }),
        color: theme.danger,
      };
    }

    if (reminder.dueOn === today) {
      return { text: t("reminders.dueToday"), color: theme.textSecondary };
    }

    const dueDate = fromCalendarDate(reminder.dueOn);
    return {
      text: t("reminders.dueIn", {
        count: dueDate ? (daysSince(today, dueDate) ?? 0) : 0,
      }),
      color: theme.textMuted,
    };
  };

  const sections = [
    {
      key: "overdue",
      title: t("reminders.section.overdue"),
      items: reminders.filter((reminder) => reminder.dueOn < today),
    },
    {
      key: "today",
      title: t("reminders.section.today"),
      items: reminders.filter((reminder) => reminder.dueOn === today),
    },
    {
      key: "upcoming",
      title: t("reminders.section.upcoming"),
      items: reminders.filter((reminder) => reminder.dueOn > today),
    },
  ].filter((section) => section.items.length > 0);

  const handleStopReminding = (animalId: string, routine: ReminderRoutine) => {
    const animal = animals[animalId];
    if (animal) stopReminding(animal, routine);
  };

  const clockTime = formatClockTime(reminderTime.hour, reminderTime.minute);

  return { reminders, dueState, sections, handleStopReminding, clockTime };
}
