import { observablePersistMMKV } from "@legendapp/state/persist-plugins/mmkv";
import type { SyncTransform } from "@legendapp/state/sync";

export const persistPlugin = observablePersistMMKV({ id: "reptikeep" });

function datesToIsoStrings(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) return value.map(datesToIsoStrings);

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [
        key,
        datesToIsoStrings(inner),
      ]),
    );
  }

  return value;
}

export function persistedAsWritten<T>(
  migrate?: (value: T) => T,
): SyncTransform<T> {
  return {
    load: (value) => {
      const asWritten = datesToIsoStrings(value) as T;
      return migrate ? migrate(asWritten) : asWritten;
    },
  };
}
