import type { Image } from "@expo/ui/swift-ui";
import type { ComponentProps } from "react";

const Primitives = {
  bark: {
    50: "#FBF7EE",
    100: "#F7F1E4",
    200: "#F2E4CC",
    300: "#E3D0AF",
    400: "#C4AC85",
    500: "#9C845F",
    600: "#6E5A3E",
    700: "#4A3A28",
    800: "#3B2A1D",
    900: "#241B12",
    950: "#120D09",
  },
  caramel: {
    50: "#FAF0E2",
    100: "#F3DFC5",
    200: "#E9C99E",
    300: "#DCAE73",
    400: "#C98A4B",
    500: "#A66A32",
    600: "#855224",
    700: "#623C1B",
  },
  moss: {
    100: "#EDF2E4",
    200: "#C9D8B0",
    300: "#93AE6E",
    400: "#5F7E42",
    500: "#44602E",
    600: "#2E421F",
  },
} as const;

export const Colors = {
  light: {
    bg: Primitives.bark[50],
    surface: "#FFFDF8",
    surfaceSunken: Primitives.bark[200],
    border: "#E7DDCB",
    text: Primitives.bark[800],
    textSecondary: Primitives.bark[600],
    textMuted: Primitives.bark[500],
    primary: Primitives.caramel[400],
    onPrimary: "#2C1F14",
    primaryStrong: Primitives.caramel[500],
    primarySurface: "#3D2712",
    success: Primitives.moss[500],
    successSurface: Primitives.moss[100],
    warning: "#B7791F",
    warningSurface: Primitives.caramel[100],
    danger: "#A83A2E",
    dangerSurface: "#F6E3DF",
    dangerStrong: "#7A2A21",
    info: "#3E6E72",
    infoSurface: "#E4EEEF",
    infoStrong: "#28494C",
  },
  dark: {
    bg: Primitives.bark[950],
    surface: Primitives.bark[900],
    surfaceSunken: "#2E2318",
    border: "#3A2C1D",
    text: Primitives.bark[200],
    textSecondary: Primitives.bark[400],
    textMuted: Primitives.bark[500],
    primary: Primitives.caramel[400],
    onPrimary: "#2C1F14",
    primaryStrong: Primitives.caramel[300],
    primarySurface: "#3D2712",
    success: Primitives.moss[300],
    successSurface: "#26301A",
    warning: "#E0A94E",
    warningSurface: "#3A2C1D",
    danger: "#D96A5B",
    dangerSurface: "#3A211C",
    dangerStrong: "#D96A5B",
    info: "#7FB2B6",
    infoSurface: "#1E2E30",
    infoStrong: "#7FB2B6",
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export type Theme = (typeof Colors)[keyof typeof Colors];

export type ActivityType =
  "feed" | "shed" | "poop" | "weight" | "habitat" | "medical";

export const CategoryColors: Record<ActivityType, string> = {
  feed: "#C98A4B",
  shed: "#B9AED6",
  poop: "#8A6844",
  weight: "#7FB2B6",
  habitat: "#5F7E42",
  medical: "#C76D7A",
} as const;

export type SFSymbolName = NonNullable<
  ComponentProps<typeof Image>["systemName"]
>;

export const ActivitySymbols: Record<ActivityType, SFSymbolName> = {
  feed: "fork.knife",
  shed: "moon",
  poop: "drop",
  weight: "scalemass",
  habitat: "leaf",
  medical: "cross.case",
};

const SYSTEM_FACE = undefined;

export const Typography = {
  displayXl: {
    fontFamily: "Solway-ExtraBold",
    fontSize: 34,
    fontWeight: 800,
    lineHeight: 39.1,
  },
  display: {
    fontFamily: "Solway-ExtraBold",
    fontSize: 27,
    fontWeight: 800,
    lineHeight: 32.4,
  },
  title: {
    fontFamily: "Solway-Bold",
    fontSize: 21,
    fontWeight: 700,
    lineHeight: 26.25,
  },
  heading: {
    fontFamily: SYSTEM_FACE,
    fontSize: 17,
    fontWeight: 700,
    lineHeight: 22.95,
  },
  bodyL: {
    fontFamily: SYSTEM_FACE,
    fontSize: 16,
    fontWeight: 400,
    lineHeight: 24.8,
  },
  body: {
    fontFamily: SYSTEM_FACE,
    fontSize: 14.5,
    fontWeight: 400,
    lineHeight: 22.48,
  },
  bodyS: {
    fontFamily: SYSTEM_FACE,
    fontSize: 13,
    fontWeight: 400,
    lineHeight: 19.5,
  },
  label: {
    fontFamily: SYSTEM_FACE,
    fontSize: 10.5,
    fontWeight: 500,
    lineHeight: 12.6,
    letterSpacing: 1.89,
  },
  data: {
    fontFamily: "SpaceMono-Bold",
    fontSize: 15,
    fontWeight: 700,
    lineHeight: 19.5,
  },
} as const;

export type TypographyAlias = keyof typeof Typography;

export type TextStyleAnchor =
  | "largeTitle"
  | "title"
  | "title2"
  | "title3"
  | "headline"
  | "subheadline"
  | "body"
  | "callout"
  | "footnote"
  | "caption"
  | "caption2";

export const TypeScale: Record<
  TypographyAlias,
  { textStyle: TextStyleAnchor; maxMultiplier: number }
> = {
  displayXl: { textStyle: "largeTitle", maxMultiplier: 1.56 },
  display: { textStyle: "title", maxMultiplier: 1.57 },
  title: { textStyle: "title2", maxMultiplier: 1.55 },
  heading: { textStyle: "headline", maxMultiplier: 2.59 },
  bodyL: { textStyle: "body", maxMultiplier: 3.12 },
  body: { textStyle: "subheadline", maxMultiplier: 3.27 },
  bodyS: { textStyle: "footnote", maxMultiplier: 3.38 },
  label: { textStyle: "caption2", maxMultiplier: 3.82 },
  data: { textStyle: "subheadline", maxMultiplier: 3.27 },
};

export const Spacing = {
  "2xs": 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  "2xl": 48,
} as const;

export const Radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const MaxContentWidth = 800;

export const StackAboveFontScale = 1.6;
