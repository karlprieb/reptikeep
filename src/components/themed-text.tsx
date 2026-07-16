import { Text, useWindowDimensions, type TextProps } from "react-native";

import { TypeScale, Typography, type ThemeColor } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type ThemedTextProps = TextProps & {
  type?: keyof typeof Typography;
  themeColor?: ThemeColor;
};

export function ThemedText({
  style,
  type = "body",
  themeColor,
  maxFontSizeMultiplier,
  allowFontScaling = true,
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();

  const ceiling = maxFontSizeMultiplier ?? TypeScale[type].maxMultiplier;
  const token = Typography[type];
  const scale = allowFontScaling ? Math.min(fontScale, ceiling) : 1;

  return (
    <Text
      style={[
        token,
        {
          lineHeight: token.lineHeight * scale,
          color: theme[themeColor ?? "text"],
        },
        style,
      ]}
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={ceiling}
      {...rest}
    />
  );
}
