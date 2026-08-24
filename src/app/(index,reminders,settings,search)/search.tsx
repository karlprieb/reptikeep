import { useSelector as useValue } from "@legendapp/state/react";
import { router, Stack, useFocusEffect } from "expo-router";
import type { SearchBarCommands } from "react-native-screens";
import { useCallback, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ReptileEmptyState } from "@/components/reptile-list";
import { ReptileRows } from "@/components/reptile-rows";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { animals$ } from "@/state/animal";
import { activityStores } from "@/state/activity-stores";
import { lastFedByAnimal } from "@/utils/animal-activity";
import { searchAnimals } from "@/utils/animal-search";

export default function SearchScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const searchBarRef = useRef<SearchBarCommands>(null);
  const [query, setQuery] = useState("");
  const animalsRecord = useValue(animals$);
  const feedings = useValue(activityStores.feed.$);
  const animals = useMemo(() => Object.values(animalsRecord), [animalsRecord]);
  const lastFed = useMemo(() => lastFedByAnimal(feedings), [feedings]);
  const results = useMemo(
    () => searchAnimals(animals, query),
    [animals, query],
  );

  useFocusEffect(
    useCallback(() => {
      const frame = requestAnimationFrame(() => {
        searchBarRef.current?.focus();
      });

      return () => cancelAnimationFrame(frame);
    }, []),
  );

  const handleCancel = () => {
    setQuery("");
  };

  const isEmpty = animals.length === 0;
  const hasNoResults = !isEmpty && results.length === 0;

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.bg }]}
        contentInsetAdjustmentBehavior={isEmpty ? "never" : "automatic"}
        alwaysBounceVertical={!isEmpty}
        contentContainerStyle={[styles.content, isEmpty && styles.emptyContent]}
      >
        {isEmpty ? (
          <ReptileEmptyState onAddPress={() => router.push("/add-reptile")} />
        ) : hasNoResults ? (
          <EmptyState
            title={t("search.noResults.title")}
            description={t("search.noResults.description", { query })}
            systemImage="magnifyingglass"
          />
        ) : (
          <ReptileRows animals={results} lastFed={lastFed} />
        )}
      </ScrollView>
      <PageHeader title={t("search.title")} />
      <Stack.SearchBar
        ref={searchBarRef}
        autoCapitalize="none"
        placeholder={t("search.placeholder")}
        placement="integrated"
        onChangeText={(event) => setQuery(event.nativeEvent.text)}
        onCancelButtonPress={handleCancel}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  content: {
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
});
