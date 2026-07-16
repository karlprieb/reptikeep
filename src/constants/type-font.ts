import { font, kerning } from "@expo/ui/swift-ui/modifiers";

import {
  TypeScale,
  Typography,
  type TextStyleAnchor,
  type TypographyAlias,
} from "@/constants/theme";

type FontWeightName =
  "regular" | "medium" | "semibold" | "bold" | "heavy" | "black";

const WEIGHT_NAMES: Record<number, FontWeightName> = {
  400: "regular",
  500: "medium",
  600: "semibold",
  700: "bold",
  800: "heavy",
  900: "black",
};

export type TypeFontParams = {
  family?: string;
  size: number;
  textStyle: TextStyleAnchor;
  weight?: FontWeightName;
};

export type TypeFontOptions = {
  systemFace?: boolean;
};

export function typeFontParams(
  alias: TypographyAlias,
  options?: TypeFontOptions,
): TypeFontParams {
  const token = Typography[alias];
  const family = options?.systemFace ? undefined : token.fontFamily;

  const params: TypeFontParams = {
    size: token.fontSize,
    textStyle: TypeScale[alias].textStyle,
  };

  if (family) {
    params.family = family;
    return params;
  }

  const weight = WEIGHT_NAMES[token.fontWeight];
  if (weight && weight !== "regular") {
    params.weight = weight;
  }

  return params;
}

export function typeFont(alias: TypographyAlias, options?: TypeFontOptions) {
  return font(typeFontParams(alias, options));
}

export function typeStyle(alias: TypographyAlias, options?: TypeFontOptions) {
  const token = Typography[alias];
  const modifiers = [typeFont(alias, options)];

  if ("letterSpacing" in token) {
    modifiers.push(kerning(token.letterSpacing));
  }

  return modifiers;
}
