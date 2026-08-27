import { FilterChip, Host, Icon, Row, Text } from "@expo/ui/jetpack-compose";
import { horizontalScroll } from "@expo/ui/jetpack-compose/modifiers";
import { StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

import { ActivityIcons } from "@/constants/activity-icons";
import { CategoryColors, Spacing, type ActivityType } from "@/constants/theme";
import { composeTextStyle } from "@/constants/type-font-compose";
import { useTheme } from "@/hooks/use-theme";

import LIST_ICON from "@/assets/images/icons/list.xml";

export function presentTypes(
  entries: { type: ActivityType }[],
): ActivityType[] {
  const seen = new Set(entries.map((entry) => entry.type));

  return (Object.keys(CategoryColors) as ActivityType[]).filter((type) =>
    seen.has(type),
  );
}

export type ActivityTypeFilterProps = {
  types: ActivityType[];
  selected: ActivityType | null;
  onSelect: (type: ActivityType | null) => void;
};

export function ActivityTypeFilter({
  types,
  selected,
  onSelect,
}: ActivityTypeFilterProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  const chipColors = {
    containerColor: theme.surface,
    labelColor: theme.text,
    iconColor: theme.textMuted,
    selectedContainerColor: theme.primary,
    selectedLabelColor: theme.onPrimary,
    selectedLeadingIconColor: theme.onPrimary,
  };

  return (
    <Host
      style={styles.host}
      matchContents={{ horizontal: false, vertical: true }}
    >
      <Row
        verticalAlignment="center"
        horizontalArrangement={{ spacedBy: Spacing.xs }}
        modifiers={[horizontalScroll()]}
      >
        <FilterChip
          selected={selected === null}
          onClick={() => onSelect(null)}
          colors={chipColors}
          border={selected === null ? undefined : { color: theme.border }}
        >
          <FilterChip.Label>
            <Text style={composeTextStyle("bodyS")}>
              {t("timeline.filter.all")}
            </Text>
          </FilterChip.Label>
          <FilterChip.LeadingIcon>
            <Icon source={LIST_ICON} size={18} />
          </FilterChip.LeadingIcon>
        </FilterChip>

        {types.map((type) => (
          <FilterChip
            key={type}
            selected={selected === type}
            onClick={() => onSelect(selected === type ? null : type)}
            colors={chipColors}
            border={selected === type ? undefined : { color: theme.border }}
          >
            <FilterChip.Label>
              <Text style={composeTextStyle("bodyS")}>
                {t(`activity.type.${type}`)}
              </Text>
            </FilterChip.Label>
            <FilterChip.LeadingIcon>
              <Icon
                source={ActivityIcons[type]}
                tint={
                  selected === type ? theme.onPrimary : CategoryColors[type]
                }
                size={18}
              />
            </FilterChip.LeadingIcon>
          </FilterChip>
        ))}
      </Row>
    </Host>
  );
}

const styles = StyleSheet.create({
  host: {
    width: "100%",
  },
});
