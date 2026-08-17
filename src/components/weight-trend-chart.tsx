import { Chart, HStack, Host, Image, Text, VStack } from "@expo/ui/swift-ui";
import {
  accessibilityElement,
  accessibilityLabel,
  background,
  clipShape,
  dynamicTypeSize,
  foregroundStyle,
  frame,
  lineLimit,
  padding,
  strokeBorder,
} from "@expo/ui/swift-ui/modifiers";
import { StyleSheet } from "react-native";

import {
  CategoryColors,
  Radius,
  Spacing,
  type SFSymbolName,
} from "@/constants/theme";
import { typeFont, typeStyle } from "@/constants/type-font";
import { useTheme } from "@/hooks/use-theme";
import { formatAxisDate } from "@/utils/format-date";
import type { WeightChartPoint } from "@/utils/weight-chart";

const PLOT_HEIGHT = 132;
// SwiftUI symbolSize(_ area:) takes an area, not a diameter — this is a ~12pt dot.
const SYMBOL_AREA = 116;
const LINE_WIDTH = 4;
const AXIS_TYPE_CEILING = "large";

export type WeightTrendChartProps = {
  title: string;
  points: WeightChartPoint[];
  span: string;
  change: string;
  direction: "up" | "down" | "flat";
  window: string | null;
  summaryLabel: string;
};

const DIRECTION_SYMBOL: Record<
  WeightTrendChartProps["direction"],
  SFSymbolName
> = {
  up: "arrow.up.right",
  down: "arrow.down.right",
  flat: "arrow.right",
};

export function WeightTrendChart({
  title,
  points,
  span,
  change,
  direction,
  window,
  summaryLabel,
}: WeightTrendChartProps) {
  const theme = useTheme();

  const changeColor =
    direction === "up"
      ? theme.success
      : direction === "down"
        ? theme.danger
        : theme.textSecondary;

  return (
    <Host
      style={styles.host}
      matchContents={{ horizontal: false, vertical: true }}
    >
      <VStack
        modifiers={[
          frame({ maxWidth: Infinity }),
          background(theme.surface),
          clipShape("roundedRectangle", Radius.lg),
          strokeBorder({
            color: theme.border,
            style: { lineWidth: StyleSheet.hairlineWidth },
            shape: "roundedRectangle",
            cornerRadius: Radius.lg,
          }),
          accessibilityElement("combine"),
          accessibilityLabel(summaryLabel),
        ]}
      >
        <VStack
          alignment="leading"
          spacing={Spacing["2xs"]}
          modifiers={[
            padding({ all: Spacing.md }),
            frame({ maxWidth: Infinity, alignment: "topLeading" }),
          ]}
        >
          <Text
            modifiers={[
              ...typeStyle("label"),
              foregroundStyle(theme.textMuted),
              padding({ bottom: Spacing["2xs"] }),
            ]}
          >
            {title.toUpperCase()}
          </Text>

          <HStack alignment="center" spacing={Spacing["2xs"]}>
            <Image
              systemName={DIRECTION_SYMBOL[direction]}
              modifiers={[typeFont("bodyS"), foregroundStyle(changeColor)]}
            />
            <Text
              modifiers={[
                typeFont("data"),
                foregroundStyle(changeColor),
                lineLimit(1),
              ]}
            >
              {change}
            </Text>

            {window ? (
              <Text
                modifiers={[
                  typeFont("bodyS"),
                  foregroundStyle(theme.textMuted),
                  lineLimit(1),
                ]}
              >
                {`· ${window}`}
              </Text>
            ) : null}
          </HStack>

          <Chart
            type="line"
            data={points.map((point) => ({
              x: formatAxisDate(point.x),
              y: point.y,
            }))}
            showGrid
            animate={false}
            lineStyle={{
              color: CategoryColors.weight,
              width: LINE_WIDTH,
              pointStyle: "circle",
              pointSize: SYMBOL_AREA,
            }}
            modifiers={[
              frame({ maxWidth: Infinity, height: PLOT_HEIGHT }),
              padding({ vertical: Spacing.xs }),
              dynamicTypeSize({ max: AXIS_TYPE_CEILING }),
              accessibilityElement("ignore"),
            ]}
          />

          <Text
            modifiers={[
              typeFont("data"),
              foregroundStyle(theme.textMuted),
              lineLimit(2),
            ]}
          >
            {span}
          </Text>
        </VStack>
      </VStack>
    </Host>
  );
}

const styles = StyleSheet.create({
  host: {
    width: "100%",
  },
});
