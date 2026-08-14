import { HStack, Host, Image, ScrollView, Text } from "@expo/ui/swift-ui";
import {
  accessibilityAddTraits,
  accessibilityElement,
  accessibilityHint,
  accessibilityLabel,
  background,
  clipShape,
  contentShape,
  foregroundStyle,
  lineLimit,
  onTapGesture,
  padding,
  shapes,
  strokeBorder,
} from "@expo/ui/swift-ui/modifiers";
import { StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

import {
  ActivitySymbols,
  CategoryColors,
  Spacing,
  type ActivityType,
  type SFSymbolName,
  type Theme,
} from "@/constants/theme";
import { typeFont } from "@/constants/type-font";
import { useTheme } from "@/hooks/use-theme";
import type { AnimalActivity } from "@/utils/animal-activity";

export function presentTypes(entries: AnimalActivity[]): ActivityType[] {
  const seen = new Set(entries.map((entry) => entry.type));

  return (Object.keys(CategoryColors) as ActivityType[]).filter((type) =>
    seen.has(type),
  );
}

type ChipProps = {
  label: string;
  hint: string;
  symbol: SFSymbolName;
  symbolColor: string;
  selected: boolean;
  theme: Theme;
  onPress: () => void;
};

function Chip({
  label,
  hint,
  symbol,
  symbolColor,
  selected,
  theme,
  onPress,
}: ChipProps) {
  return (
    <HStack
      spacing={Spacing["2xs"]}
      modifiers={[
        padding({ vertical: Spacing.xs, horizontal: Spacing.sm }),
        background(selected ? theme.primary : theme.surface),
        clipShape("capsule"),
        ...(selected
          ? []
          : [
              strokeBorder({
                color: theme.border,
                style: { lineWidth: StyleSheet.hairlineWidth },
                shape: "capsule",
              }),
            ]),
        contentShape(shapes.capsule()),
        onTapGesture(onPress),
        accessibilityElement("combine"),
        accessibilityAddTraits(
          selected ? ["isButton", "isSelected"] : ["isButton"],
        ),
        accessibilityLabel(label),
        accessibilityHint(hint),
      ]}
    >
      <Image
        systemName={symbol}
        modifiers={[
          typeFont("bodyS"),
          foregroundStyle(selected ? theme.onPrimary : symbolColor),
        ]}
      />
      <Text
        modifiers={[
          typeFont("bodyS"),
          foregroundStyle(selected ? theme.onPrimary : theme.text),
          lineLimit(1),
        ]}
      >
        {label}
      </Text>
    </HStack>
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
  const hint = t("timeline.filter.hint");

  return (
    <Host
      style={styles.host}
      matchContents={{ horizontal: false, vertical: true }}
    >
      <ScrollView axes="horizontal" showsIndicators={false}>
        <HStack spacing={Spacing.xs}>
          <Chip
            label={t("timeline.filter.all")}
            hint={t("timeline.filter.allHint")}
            symbol="list.bullet"
            symbolColor={theme.textMuted}
            selected={selected === null}
            theme={theme}
            onPress={() => onSelect(null)}
          />

          {types.map((type) => (
            <Chip
              key={type}
              label={t(`activity.type.${type}`)}
              hint={hint}
              symbol={ActivitySymbols[type]}
              symbolColor={CategoryColors[type]}
              selected={selected === type}
              theme={theme}
              onPress={() => onSelect(selected === type ? null : type)}
            />
          ))}
        </HStack>
      </ScrollView>
    </Host>
  );
}

const styles = StyleSheet.create({
  host: {
    width: "100%",
  },
});
