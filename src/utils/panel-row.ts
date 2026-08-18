import { Spacing, Typography, type TypographyAlias } from "@/constants/theme";

export const ROW_MAX_TEXT_SCALE = 2;

export function panelRowHeight(
  blocks: [TypographyAlias, number][],
  fontScale: number,
  badgeSize: number,
): number {
  const scale = Math.min(Math.max(fontScale, 1), ROW_MAX_TEXT_SCALE);
  const text =
    blocks.reduce(
      (total, [alias, lines]) =>
        total + Typography[alias].lineHeight * lines * scale,
      0,
    ) +
    Spacing["2xs"] * Math.max(0, blocks.length - 1);

  return Math.ceil(Math.max(badgeSize, text)) + Spacing.sm * 2;
}
