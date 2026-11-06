import { observable } from "@legendapp/state";
import { syncObservable } from "@legendapp/state/sync";

import { persistPlugin } from "./persist";

export const exactAlarmPrompt$ = observable({ dismissed: false });

syncObservable(exactAlarmPrompt$, {
  persist: {
    name: "exact-alarm-prompt",
    plugin: persistPlugin,
  },
});

export function dismissExactAlarmPrompt(): void {
  exactAlarmPrompt$.dismissed.set(true);
}
