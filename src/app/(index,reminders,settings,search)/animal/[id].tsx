import { router, Stack } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";

import { AddActivitySheet } from "@/components/add-activity-sheet";
import { AnimalDetail } from "@/components/animal-detail";
import { AnimalNotFound, useAnimalRoute } from "@/components/animal-route";
import { Spacing, type ActivityType } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { removeAnimal } from "@/state/animal";

export default function AnimalDetailScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const headerHeight = useHeaderHeight();
  const { id, animal } = useAnimalRoute();
  const [addOpen, setAddOpen] = useState(false);
  const pendingActivity = useRef<ActivityType | null>(null);
  const pendingDelete = useRef(false);

  const openAddSheet = useCallback(() => setAddOpen(true), []);
  const closeAddSheet = useCallback(() => setAddOpen(false), []);
  const handlePickActivity = useCallback((type: ActivityType) => {
    pendingActivity.current = type;
    setAddOpen(false);
  }, []);
  const handleActivityPickerDismiss = useCallback(() => {
    const type = pendingActivity.current;
    pendingActivity.current = null;

    if (type && id) router.push(`/animal/${id}/${type}`);
  }, [id]);

  useEffect(
    () => () => {
      if (pendingDelete.current && id) removeAnimal(id);
    },
    [id],
  );

  if (!animal) return <AnimalNotFound />;

  const confirmDelete = () =>
    Alert.alert(
      t("animal.deleteTitle", { animalName: animal.name }),
      t("animal.deleteMessage", { animalName: animal.name }),
      [
        { text: t("animal.cancel"), style: "cancel" },
        {
          text: t("animal.deleteConfirm"),
          style: "destructive",
          onPress: () => {
            pendingDelete.current = true;
            router.back();
          },
        },
      ],
    );

  return (
    <>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="plus"
          tintColor={theme.primary}
          accessibilityLabel={t("animal.addActivity")}
          onPress={openAddSheet}
        />
        <Stack.Toolbar.Menu
          icon="ellipsis"
          tintColor={theme.textSecondary}
          accessibilityLabel={t("animal.actions")}
          accessibilityHint={t("animal.actionsHint")}
        >
          <Stack.Toolbar.MenuAction
            icon="square.and.pencil"
            onPress={() => router.push(`/animal/${id}/edit`)}
          >
            {t("animal.edit")}
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            icon="trash"
            destructive
            onPress={confirmDelete}
          >
            {t("animal.delete")}
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>

      <ScrollView
        style={{ backgroundColor: theme.bg }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        <View style={animal.photo ? { marginTop: -headerHeight } : undefined}>
          <AnimalDetail animal={animal} onAddActivity={openAddSheet} />
        </View>
      </ScrollView>

      <AddActivitySheet
        visible={addOpen}
        animalName={animal.name}
        onClose={closeAddSheet}
        onDismiss={handleActivityPickerDismiss}
        onPick={handlePickActivity}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: Spacing.xl,
  },
});
