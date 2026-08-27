export const WEIGHT_UNITS = ["g", "kg", "lb"] as const;

export type WeightUnit = (typeof WEIGHT_UNITS)[number];

const GRAMS_PER_UNIT: Record<WeightUnit, number> = {
  g: 1,
  kg: 1_000,
  lb: 453.59237,
};

const UNIT_DIGITS: Record<WeightUnit, number> = { g: 0, kg: 2, lb: 2 };

export function isWeightUnit(value: unknown): value is WeightUnit {
  return (WEIGHT_UNITS as readonly unknown[]).includes(value);
}

export function gramsToUnit(grams: number, unit: WeightUnit): number {
  const factor = 10 ** UNIT_DIGITS[unit];
  return Math.round((grams / GRAMS_PER_UNIT[unit]) * factor) / factor;
}

export function gramsToField(
  grams: number | undefined,
  unit: WeightUnit,
): string {
  return grams === undefined ? "" : String(gramsToUnit(grams, unit));
}

export function weightFieldToGrams(
  text: string,
  unit: WeightUnit,
  original?: { grams: number; unit: WeightUnit },
): number | undefined {
  if (original && unit === original.unit) {
    if (text === gramsToField(original.grams, unit)) return original.grams;
  }

  const parsed = weightInputToGrams(text, unit);
  return parsed === undefined ? undefined : Math.round(parsed);
}

export function weightInputToGrams(
  value: string,
  unit: WeightUnit,
): number | undefined {
  const normalized = value.trim().replace(",", ".");
  if (normalized.length === 0) return undefined;

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;

  return parsed * GRAMS_PER_UNIT[unit];
}

export function convertWeightFieldOnUnitChange(
  text: string,
  fromUnit: WeightUnit,
  toUnit: WeightUnit,
  originalGrams?: number,
): string {
  const grams =
    originalGrams !== undefined &&
    text === gramsToField(originalGrams, fromUnit)
      ? originalGrams
      : weightInputToGrams(text, fromUnit);

  return grams === undefined ? text : gramsToField(grams, toUnit);
}
