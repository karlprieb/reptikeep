import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";

import type { ActivityType } from "@/constants/theme";

export function useAddActivity(animalId: string | undefined) {
  const [opened, setOpened] = useState(false);
  const pending = useRef<ActivityType | null>(null);
  const { log } = useLocalSearchParams<{ log?: string }>();
  const openedFromLabel = log === "1" && Boolean(animalId);

  const hide = () => {
    setOpened(false);
    if (openedFromLabel) router.setParams({ log: undefined });
  };

  return {
    visible: opened || openedFromLabel,
    open: () => setOpened(true),
    close: hide,
    pick: (type: ActivityType) => {
      pending.current = type;
      hide();
    },
    dismiss: () => {
      const type = pending.current;
      pending.current = null;

      if (type && animalId) router.push(`/animal/${animalId}/${type}`);
    },
  };
}
