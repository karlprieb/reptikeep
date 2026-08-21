import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useTranslation } from "react-i18next";

import { useTheme } from "@/hooks/use-theme";

const REPTILES_ICON = require("@/assets/images/tabIcons/reptiles.png");

export default function AppTabs() {
  const colors = useTheme();
  const { t } = useTranslation();

  return (
    <NativeTabs
      backgroundColor={colors.bg}
      indicatorColor={colors.surface}
      iconColor={{ default: colors.textSecondary, selected: colors.primary }}
      labelStyle={{
        default: { color: colors.textSecondary },
        selected: { color: colors.primary },
      }}
      minimizeBehavior="onScrollDown"
      blurEffect="systemChromeMaterial"
    >
      <NativeTabs.Trigger name="(index)">
        <NativeTabs.Trigger.Label>
          {t("tabs.reptiles")}
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={REPTILES_ICON} renderingMode="template" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(reminders)">
        <NativeTabs.Trigger.Label>
          {t("tabs.reminders")}
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "bell", selected: "bell.fill" }}
          md={{ default: "notifications", selected: "notifications_active" }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(settings)">
        <NativeTabs.Trigger.Label>
          {t("tabs.settings")}
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "gearshape", selected: "gearshape.fill" }}
          md="settings"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(search)" role="search">
        <NativeTabs.Trigger.Label>{t("tabs.search")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
