import i18n from "@/i18n";

import { gramsToUnit, type WeightUnit } from "./weight-unit";

function numberFormatter(
  options?: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  return new Intl.NumberFormat(i18n.language, options);
}

function oneDecimalFormatter(): Intl.NumberFormat {
  return numberFormatter({ maximumFractionDigits: 1 });
}

const MINUS = "−";
const KIB = 1024;

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < KIB) return `${oneDecimalFormatter().format(bytes)} B`;

  const kibibytes = bytes / KIB;
  if (kibibytes < KIB) return `${oneDecimalFormatter().format(kibibytes)} KB`;

  return `${oneDecimalFormatter().format(kibibytes / KIB)} MB`;
}

export function formatWeight(grams: number, unit: WeightUnit): string {
  return `${numberFormatter().format(gramsToUnit(grams, unit))} ${unit}`;
}

export function formatWeightDelta(grams: number, unit: WeightUnit): string {
  const value = gramsToUnit(grams, unit);
  if (value === 0) return `±0 ${unit}`;

  return `${value > 0 ? "+" : MINUS}${numberFormatter().format(Math.abs(value))} ${unit}`;
}

export function formatPercent(percent: number): string {
  return `${oneDecimalFormatter().format(Math.round(Math.abs(percent) * 10) / 10)}%`;
}

export function formatSignedPercent(percent: number): string {
  const rounded = Math.round(percent * 10) / 10;
  if (rounded === 0) return "±0%";

  return `${rounded > 0 ? "+" : MINUS}${oneDecimalFormatter().format(Math.abs(rounded))}%`;
}
