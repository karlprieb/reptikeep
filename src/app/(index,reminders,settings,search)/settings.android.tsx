import { useTranslation } from "react-i18next";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export default function SettingsScreen() {
  const { t } = useTranslation();

  return (
    <>
      <EmptyState
        title={t("settings.title")}
        description={t("settings.androidComingSoon")}
      />
      <PageHeader title={t("settings.title")} />
    </>
  );
}
