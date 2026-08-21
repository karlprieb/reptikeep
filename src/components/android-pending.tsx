import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";

import { EmptyState } from "@/components/empty-state";
import { useTheme } from "@/hooks/use-theme";

export default function AndroidPending() {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <EmptyState
        title={t("android.title")}
        description={t("android.description")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
  },
});
