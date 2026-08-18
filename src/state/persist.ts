import { observablePersistMMKV } from "@legendapp/state/persist-plugins/mmkv";
import type { SyncTransform } from "@legendapp/state/sync";

export const persistPlugin = observablePersistMMKV({ id: "reptikeep" });

function datesToIsoStrings(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const asWritten = datesToIsoStrings(value[index]);
      if (asWritten !== value[index]) value[index] = asWritten;
    }

    return value;
  }

  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;

    for (const key of Object.keys(record)) {
      const asWritten = datesToIsoStrings(record[key]);
      if (asWritten !== record[key]) record[key] = asWritten;
    }

    return record;
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
