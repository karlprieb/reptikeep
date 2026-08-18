import { Spacing, Typography, type TypographyAlias } from "@/constants/theme";

export function panelRowHeight(
  blocks: [TypographyAlias, number][],
  fontScale: number,
  badgeSize: number,
): number {
  const scale = Math.max(fontScale, 1);
  const text =
    blocks.reduce(
      (total, [alias, lines]) =>
        total + Typography[alias].lineHeight * lines * scale,
      0,
    ) +
    Spacing["2xs"] * Math.max(0, blocks.length - 1);

  return Math.ceil(Math.max(badgeSize, text)) + Spacing.sm * 2;
}
