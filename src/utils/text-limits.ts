export const TEXT_LIMITS = {
  title: 200,
  name: 200,
  commonName: 200,
  scientificName: 200,
  foodType: 100,
  amount: 100,
  notes: 2000,
  note: 2000,
} as const;

export function clampTextFields<T extends object>(record: T): T {
  let clamped = record;

  for (const [key, limit] of Object.entries(TEXT_LIMITS)) {
    const value = (clamped as Record<string, unknown>)[key];
    if (typeof value !== "string") continue;

    const next = value.trim().slice(0, limit);
    if (next !== value) clamped = { ...clamped, [key]: next };
  }

  return clamped;
}
