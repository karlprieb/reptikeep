import { useSelector as useValue } from "@legendapp/state/react";
import {
  Column,
  DropdownMenu,
  DropdownMenuItem,
  Host,
  HorizontalDivider,
  Icon,
  IconButton,
  Row,
  Text,
  TextButton,
} from "@expo/ui/jetpack-compose";
import {
  background,
  clip,
  fillMaxWidth,
  padding,
  Shapes,
  weight,
} from "@expo/ui/jetpack-compose/modifiers";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  Animated,
  StatusBar,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  ActivityHistoryList,
  ActivityPanel,
} from "@/components/activity-timeline";
import {
  ActivityTypeFilter,
  presentTypes,
} from "@/components/activity-type-filter";
import { AddActivitySheet } from "@/components/add-activity-sheet";
import { AnimalNotFound, useAnimalRoute } from "@/components/animal-route";
import { EmptyStateContent } from "@/components/empty-state";
import {
  ACTION_ICON_SIZE,
  TOP_BAR_HEIGHT,
  useScrollLift,
} from "@/components/form-sheet";
import { Radius, Spacing, type ActivityType } from "@/constants/theme";
import { composeTextStyle } from "@/constants/type-font-compose";
import { useAddActivity } from "@/hooks/use-add-activity";
import { useColorScheme, useTheme } from "@/hooks/use-theme";
import { activityStores } from "@/state/activity-stores";
import {
  filterActivity,
  isRangePreset,
  RANGE_PRESETS,
  resolveDateFilter,
  type DateFilter,
  type RangePreset,
} from "@/utils/activity-filter";
import { animalActivityFeed } from "@/utils/animal-activity";
import {
  calendarDateOf,
  formatAbsoluteDate,
  fromCalendarDate,
  toCalendarDate,
} from "@/utils/format-date";

import ADD_ICON from "@/assets/images/icons/add.xml";
import ARROW_BACK_ICON from "@/assets/images/icons/arrow-back.xml";
import CALENDAR_ICON from "@/assets/images/icons/calendar-month.xml";
import CHECK_ICON from "@/assets/images/icons/check.xml";
import FILTER_LIST_ICON from "@/assets/images/icons/filter-list.xml";

function RangeSummaryRow({
  from,
  to,
  count,
  onClear,
}: {
  from: string;
  to: string;
  count: number;
  onClear: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();

  const spanText = t("timeline.range.span", {
    from: formatAbsoluteDate(from),
    to: formatAbsoluteDate(to),
  });
  const countText = t("timeline.filtered.count", { count });

  return (
    <Host
      style={historyStyles.rangeHost}
      matchContents={{ horizontal: false, vertical: true }}
    >
      <Row
        verticalAlignment="center"
        horizontalArrangement="spaceBetween"
        modifiers={[fillMaxWidth()]}
      >
        <Column
          horizontalAlignment="start"
          verticalArrangement={{ spacedBy: Spacing["2xs"] }}
        >
          <Text style={composeTextStyle("data")} color={theme.text}>
            {spanText}
          </Text>
          <Text style={composeTextStyle("bodyS")} color={theme.textMuted}>
            {countText}
          </Text>
        </Column>

        <TextButton onClick={onClear} colors={{ contentColor: theme.primary }}>
          <Text style={composeTextStyle("body")} color={theme.primary}>
            {t("timeline.range.clear")}
          </Text>
        </TextButton>
      </Row>
    </Host>
  );
}

function FilteredEmptyPanel({
  animalName,
  onClear,
}: {
  animalName: string;
  onClear: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Host
      style={historyStyles.rangeHost}
      matchContents={{ horizontal: false, vertical: true }}
    >
      <Column
        verticalArrangement="top"
        modifiers={[
          fillMaxWidth(),
          clip(Shapes.RoundedCorner(Radius.lg)),
          background(theme.surface),
        ]}
      >
        <EmptyStateContent
          title={t("timeline.filtered.empty.title")}
          description={t("timeline.filtered.empty.subtitle", { animalName })}
          action={{
            label: t("timeline.filtered.empty.action"),
            onPress: onClear,
          }}
        />
      </Column>
    </Host>
  );
}

export default function AnimalHistoryScreen() {
  const theme = useTheme();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { fontScale } = useWindowDimensions();
  const { id, animal } = useAnimalRoute();
  const feedings = useValue(activityStores.feed.$);
  const weights = useValue(activityStores.weight.$);
  const sheds = useValue(activityStores.shed.$);
  const defecations = useValue(activityStores.poop.$);
  const habitats = useValue(activityStores.habitat.$);
  const medical = useValue(activityStores.medical.$);
  const [menuOpen, setMenuOpen] = useState(false);
  const { scrollY, lifted, onScroll } = useScrollLift();

  const { type, preset, from, to } = useLocalSearchParams<{
    type?: string;
    preset?: string;
    from?: string;
    to?: string;
  }>();

  const entries = useMemo(
    () =>
      animalActivityFeed(id, {
        feedings,
        weights,
        sheds,
        defecations,
        habitats,
        medical,
      }),
    [defecations, feedings, habitats, id, medical, sheds, weights],
  );

  const types = useMemo(() => presentTypes(entries), [entries]);
  const addActivity = useAddActivity(id);

  const filter = useMemo<DateFilter>(
    () =>
      preset === "custom" && from && to
        ? { preset: "custom", from, to }
        : { preset: isRangePreset(preset) ? preset : "all" },
    [preset, from, to],
  );

  const selectedType =
    type !== undefined && type in activityStores
      ? (type as ActivityType)
      : null;
  const activeType =
    selectedType && types.includes(selectedType) ? selectedType : null;

  const today = toCalendarDate(new Date());
  const shown = useMemo(
    () =>
      filterActivity(
        entries,
        filter,
        activeType,
        fromCalendarDate(today) ?? new Date(),
      ),
    [entries, filter, activeType, today],
  );

  if (!animal) return <AnimalNotFound />;

  const range = resolveDateFilter(
    filter,
    fromCalendarDate(today) ?? new Date(),
  );
  const activeRange = filter.preset !== "all";
  const iconSize = ACTION_ICON_SIZE * Math.min(fontScale, 2);

  const setType = (next: ActivityType | null) =>
    router.setParams({ type: next ?? "" });
  const setPreset = (next: RangePreset) => {
    setMenuOpen(false);
    router.setParams({ preset: next, from: "", to: "" });
  };
  const clearFilters = () =>
    router.setParams({ type: "", preset: "all", from: "", to: "" });

  const earliest =
    entries.length > 0
      ? (calendarDateOf(entries[entries.length - 1].occurredAt) ?? today)
      : today;
  const seed = range ?? { from: earliest, to: today };

  const openCustomRange = () => {
    setMenuOpen(false);
    router.push(
      `/animal/${id}/history-range?from=${seed.from}&to=${seed.to}&earliest=${earliest}&type=${activeType ?? ""}`,
    );
  };

  const filterBar =
    types.length > 1 || range ? (
      <View style={historyStyles.filterBar}>
        {types.length > 1 ? (
          <ActivityTypeFilter
            types={types}
            selected={activeType}
            onSelect={setType}
          />
        ) : null}
        {range ? (
          <RangeSummaryRow
            from={range.from}
            to={range.to}
            count={shown.length}
            onClear={() => setPreset("all")}
          />
        ) : null}
      </View>
    ) : null;

  const contentPaddingTop =
    insets.top + TOP_BAR_HEIGHT * Math.min(fontScale, 1.5);

  return (
    <View style={[historyStyles.root, { backgroundColor: theme.bg }]}>
      {entries.length === 0 ? (
        <Animated.ScrollView
          style={historyStyles.scroll}
          contentContainerStyle={{
            paddingTop: contentPaddingTop,
            paddingBottom: insets.bottom + Spacing.xl,
            paddingHorizontal: Spacing.md,
          }}
          scrollEventThrottle={16}
          onScroll={onScroll}
        >
          <ActivityPanel
            entries={entries}
            animalId={id}
            animalName={animal.name}
            onAddActivity={addActivity.open}
          />
        </Animated.ScrollView>
      ) : shown.length === 0 ? (
        <Animated.ScrollView
          style={historyStyles.scroll}
          contentContainerStyle={{
            paddingTop: contentPaddingTop,
            paddingBottom: insets.bottom + Spacing.xl,
            paddingHorizontal: Spacing.md,
          }}
          scrollEventThrottle={16}
          onScroll={onScroll}
        >
          {filterBar}
          <FilteredEmptyPanel animalName={animal.name} onClear={clearFilters} />
        </Animated.ScrollView>
      ) : (
        <ActivityHistoryList
          entries={shown}
          animalId={id}
          background={theme.bg}
          header={filterBar}
          scrollY={scrollY}
          contentContainerStyle={{
            paddingTop: contentPaddingTop,
            paddingBottom: insets.bottom + Spacing.xl,
            paddingHorizontal: Spacing.md,
          }}
        />
      )}

      <View
        style={[historyStyles.topBar, { paddingTop: insets.top }]}
        pointerEvents="box-none"
      >
        <StatusBar
          translucent
          backgroundColor="transparent"
          barStyle={scheme === "dark" ? "light-content" : "dark-content"}
        />
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.bg }]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: theme.surface, opacity: lifted },
          ]}
        />
        <Host
          style={historyStyles.topBarHost}
          matchContents={{ horizontal: false, vertical: true }}
          seedColor={theme.primary}
        >
          <Row
            verticalAlignment="center"
            horizontalArrangement={{ spacedBy: Spacing["2xs"] }}
            modifiers={[
              fillMaxWidth(),
              padding(4, Spacing["2xs"], Spacing.md, Spacing["2xs"]),
            ]}
          >
            <IconButton
              onClick={() => router.back()}
              colors={{ contentColor: theme.textSecondary }}
            >
              <Icon
                source={ARROW_BACK_ICON}
                tint={theme.textSecondary}
                size={iconSize}
                contentDescription={t("activityDetail.done")}
              />
            </IconButton>

            <Text
              color={theme.text}
              maxLines={1}
              overflow="ellipsis"
              modifiers={[weight(1)]}
              style={{
                fontFamily: "Solway-Bold",
                fontSize: 22,
                lineHeight: 28,
              }}
            >
              {t("timeline.historyTitle")}
            </Text>

            <IconButton
              onClick={addActivity.open}
              colors={{ contentColor: theme.primary }}
            >
              <Icon
                source={ADD_ICON}
                tint={theme.primary}
                size={iconSize}
                contentDescription={t("animal.addActivity")}
              />
            </IconButton>

            <DropdownMenu
              expanded={menuOpen}
              onDismissRequest={() => setMenuOpen(false)}
              color={theme.surface}
            >
              <DropdownMenu.Trigger>
                <IconButton
                  onClick={() => setMenuOpen(true)}
                  colors={{
                    contentColor: activeRange
                      ? theme.primary
                      : theme.textSecondary,
                  }}
                >
                  <Icon
                    source={FILTER_LIST_ICON}
                    tint={activeRange ? theme.primary : theme.textSecondary}
                    size={iconSize}
                    contentDescription={t("timeline.range.label")}
                  />
                </IconButton>
              </DropdownMenu.Trigger>
              <DropdownMenu.Items>
                {RANGE_PRESETS.map((rangePreset) => (
                  <DropdownMenuItem
                    key={rangePreset}
                    onClick={() => setPreset(rangePreset)}
                  >
                    <DropdownMenuItem.Text>
                      <Text style={composeTextStyle("body")} color={theme.text}>
                        {t(`timeline.range.${rangePreset}`)}
                      </Text>
                    </DropdownMenuItem.Text>
                    {filter.preset === rangePreset ? (
                      <DropdownMenuItem.TrailingIcon>
                        <Icon
                          source={CHECK_ICON}
                          tint={theme.primaryStrong}
                          size={iconSize}
                        />
                      </DropdownMenuItem.TrailingIcon>
                    ) : null}
                  </DropdownMenuItem>
                ))}
                <HorizontalDivider color={theme.border} />
                <DropdownMenuItem onClick={openCustomRange}>
                  <DropdownMenuItem.Text>
                    <Text style={composeTextStyle("body")} color={theme.text}>
                      {t("timeline.range.custom")}
                    </Text>
                  </DropdownMenuItem.Text>
                  <DropdownMenuItem.LeadingIcon>
                    <Icon
                      source={CALENDAR_ICON}
                      tint={theme.text}
                      size={iconSize}
                    />
                  </DropdownMenuItem.LeadingIcon>
                  {filter.preset === "custom" ? (
                    <DropdownMenuItem.TrailingIcon>
                      <Icon
                        source={CHECK_ICON}
                        tint={theme.primaryStrong}
                        size={iconSize}
                      />
                    </DropdownMenuItem.TrailingIcon>
                  ) : null}
                </DropdownMenuItem>
              </DropdownMenu.Items>
            </DropdownMenu>
          </Row>
        </Host>
      </View>

      <AddActivitySheet
        visible={addActivity.visible}
        animalName={animal.name}
        onClose={addActivity.close}
        onDismiss={addActivity.dismiss}
        onPick={addActivity.pick}
      />
    </View>
  );
}

const historyStyles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  filterBar: {
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  rangeHost: {
    width: "100%",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  topBarHost: {
    width: "100%",
  },
});
