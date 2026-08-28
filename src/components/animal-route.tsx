import { useSelector as useValue } from "@legendapp/state/react";
import { useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";

import { EmptyState } from "@/components/empty-state";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { animals$ } from "@/state/animal";

export function useAnimalRoute() {
  const { id, activityId } = useLocalSearchParams<{
    id: string;
    activityId?: string;
  }>();
  const animal = useValue(() => (id ? animals$[id].get() : undefined));

  return { id, animal, activityId };
}

export type AnimalNotFoundProps = {
  title?: string;
  description?: string;
};

export function AnimalNotFound({ title, description }: AnimalNotFoundProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.notFound, { backgroundColor: theme.bg }]}>
      <EmptyState
        title={title ?? t("animal.notFound")}
        description={description ?? t("animal.notFoundSubtitle")}
        systemImage="questionmark.circle"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  notFound: {
    flex: 1,
    justifyContent: "center",
    padding: Spacing.lg,
  },
});
