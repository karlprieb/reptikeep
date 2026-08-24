import { useTranslation } from "react-i18next";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export default function RemindersScreen() {
  const { t } = useTranslation();

  return (
    <>
      <EmptyState
        title={t("reminders.title")}
        description={t("reminders.androidComingSoon")}
      />
      <PageHeader title={t("reminders.title")} />
    </>
  );
}
