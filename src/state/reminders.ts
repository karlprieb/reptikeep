import { observable } from "@legendapp/state";
import { syncObservable } from "@legendapp/state/sync";

import { persistPlugin } from "./persist";

export const reminders$ = observable({ hour: 9, minute: 0 });

syncObservable(reminders$, {
  persist: {
    name: "reminders",
    plugin: persistPlugin,
  },
});
