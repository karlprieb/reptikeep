import {
  Box,
  Column,
  Host,
  Icon,
  RNHostView,
  Row,
  Text,
} from "@expo/ui/jetpack-compose";
import {
  background,
  clip,
  fillMaxSize,
  fillMaxWidth,
  height,
  padding,
  Shapes,
} from "@expo/ui/jetpack-compose/modifiers";
import { useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import type { ImageSourcePropType } from "react-native";

import { CategoryColors, Radius, Spacing } from "@/constants/theme";
import { composeTextStyle } from "@/constants/type-font-compose";
import { useTheme } from "@/hooks/use-theme";
import type { WeightChartPoint } from "@/utils/weight-chart";

import TRENDING_DOWN_ICON from "@/assets/images/icons/trending-down.xml";
import TRENDING_FLAT_ICON from "@/assets/images/icons/trending-flat.xml";
import TRENDING_UP_ICON from "@/assets/images/icons/trending-up.xml";

const PLOT_HEIGHT = 96;
const LINE_WIDTH = 3;
const DOT_RADIUS = 3.5;

export type WeightTrendChartProps = {
  title: string;
  points: WeightChartPoint[];
  span: string;
  change: string;
  direction: "up" | "down" | "flat";
  window: string | null;
  summaryLabel: string;
};

const DIRECTION_ICON: Record<
  WeightTrendChartProps["direction"],
  ImageSourcePropType
> = {
  up: TRENDING_UP_ICON,
  down: TRENDING_DOWN_ICON,
  flat: TRENDING_FLAT_ICON,
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
      <Column
        horizontalAlignment="start"
        verticalArrangement={{ spacedBy: Spacing["2xs"] }}
        modifiers={[
          fillMaxWidth(),
          clip(Shapes.RoundedCorner(Radius.lg)),
          background(theme.surface),
          padding(Spacing.md, Spacing.md, Spacing.md, Spacing.md),
        ]}
      >
        <Text
          style={{ ...composeTextStyle("label"), letterSpacing: 1.89 }}
          color={theme.textMuted}
        >
          {title.toUpperCase()}
        </Text>

        <Row
          verticalAlignment="center"
          horizontalArrangement={{ spacedBy: Spacing["2xs"] }}
        >
          <Icon
            source={DIRECTION_ICON[direction]}
            tint={changeColor}
            size={15}
          />
          <Text style={composeTextStyle("data")} color={changeColor}>
            {change}
          </Text>
          {window ? (
            <Text style={composeTextStyle("bodyS")} color={theme.textMuted}>
              {`· ${window}`}
            </Text>
          ) : null}
        </Row>

        <Box modifiers={[fillMaxWidth(), height(PLOT_HEIGHT)]}>
          <RNHostView modifiers={[fillMaxSize()]}>
            <View
              style={styles.sparklineHost}
              accessible
              accessibilityLabel={summaryLabel}
            >
              <Sparkline
                points={points}
                color={CategoryColors.weight}
                height={PLOT_HEIGHT}
              />
            </View>
          </RNHostView>
        </Box>

        <Text style={composeTextStyle("data")} color={theme.textMuted}>
          {span}
        </Text>
      </Column>
    </Host>
  );
}

function Sparkline({
  points,
  color,
  height,
}: {
  points: WeightChartPoint[];
  color: string;
  height: number;
}) {
  const [width, setWidth] = useState(0);
  const onLayout = (event: LayoutChangeEvent) =>
    setWidth(event.nativeEvent.layout.width);

  if (points.length < 2) {
    return <View style={{ height }} onLayout={onLayout} />;
  }

  const ys = points.map((point) => point.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const range = maxY - minY || 1;
  const pad = DOT_RADIUS + LINE_WIDTH;
  const plotWidth = width - pad * 2;
  const plotHeight = height - pad * 2;
  const stepX = width > 0 ? plotWidth / (points.length - 1) : 0;

  const coords = points.map((point, index) => ({
    x: pad + index * stepX,
    y: pad + plotHeight - ((point.y - minY) / range) * plotHeight,
  }));

  return (
    <View style={{ width: "100%", height }} onLayout={onLayout}>
      {width > 0
        ? coords.slice(1).map((point, index) => {
            const prev = coords[index];
            const dx = point.x - prev.x;
            const dy = point.y - prev.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

            return (
              <View
                key={index}
                style={{
                  position: "absolute",
                  left: (prev.x + point.x) / 2 - length / 2,
                  top: (prev.y + point.y) / 2 - LINE_WIDTH / 2,
                  width: length,
                  height: LINE_WIDTH,
                  borderRadius: LINE_WIDTH / 2,
                  backgroundColor: color,
                  transform: [{ rotate: `${angle}deg` }],
                }}
              />
            );
          })
        : null}
      {width > 0
        ? coords.map((point, index) => (
            <View
              key={`dot-${index}`}
              style={{
                position: "absolute",
                left: point.x - DOT_RADIUS,
                top: point.y - DOT_RADIUS,
                width: DOT_RADIUS * 2,
                height: DOT_RADIUS * 2,
                borderRadius: DOT_RADIUS,
                backgroundColor: color,
              }}
            />
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    width: "100%",
  },
  sparklineHost: {
    width: "100%",
    height: "100%",
  },
});
