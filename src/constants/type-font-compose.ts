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
