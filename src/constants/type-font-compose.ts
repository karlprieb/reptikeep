import type { Text } from "@expo/ui/jetpack-compose";
import type { ComponentProps } from "react";

import { Typography, type TypographyAlias } from "@/constants/theme";

type ComposeTextStyle = NonNullable<ComponentProps<typeof Text>["style"]>;

export function composeTextStyle(alias: TypographyAlias): ComposeTextStyle {
  const token = Typography[alias];

  return {
    ...token,
    fontFamily: token.fontFamily ?? "default",
    fontWeight: String(token.fontWeight) as ComposeTextStyle["fontWeight"],
  };
}

export const SECTION_LABEL = {
  fontFamily: "default",
  fontSize: 14,
  fontWeight: "500",
  lineHeight: 20,
  letterSpacing: 0.1,
} as const;

const SEX_SYMBOL_SCALE = 1.3;

export function composeSexSymbolStyle(
  beside: TypographyAlias | { fontSize: number; lineHeight: number },
): ComposeTextStyle {
  const token = typeof beside === "string" ? Typography[beside] : beside;

  return {
    fontFamily: "default",
    fontSize: Math.round(token.fontSize * SEX_SYMBOL_SCALE),
  };
}
