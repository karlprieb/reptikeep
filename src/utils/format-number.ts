import { gramsToUnit, type WeightUnit } from "./weight-unit";

const WEIGHT_FORMATTER = new Intl.NumberFormat("en-US");
const PERCENT_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

const MINUS = "−";

export function formatWeight(grams: number, unit: WeightUnit): string {
  return `${WEIGHT_FORMATTER.format(gramsToUnit(grams, unit))} ${unit}`;
}

export function formatWeightDelta(grams: number, unit: WeightUnit): string {
  const value = gramsToUnit(grams, unit);
  if (value === 0) return `±0 ${unit}`;

  return `${value > 0 ? "+" : MINUS}${WEIGHT_FORMATTER.format(Math.abs(value))} ${unit}`;
}

export function formatPercent(percent: number): string {
  return `${PERCENT_FORMATTER.format(Math.round(Math.abs(percent) * 10) / 10)}%`;
}

export function formatSignedPercent(percent: number): string {
  const rounded = Math.round(percent * 10) / 10;
  if (rounded === 0) return "±0%";

  return `${rounded > 0 ? "+" : MINUS}${PERCENT_FORMATTER.format(Math.abs(rounded))}%`;
}
