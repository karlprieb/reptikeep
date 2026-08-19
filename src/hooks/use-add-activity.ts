import { router } from "expo-router";
import { useRef, useState } from "react";

import type { ActivityType } from "@/constants/theme";

export function useAddActivity(animalId: string | undefined) {
  const [visible, setVisible] = useState(false);
  const pending = useRef<ActivityType | null>(null);

  return {
    visible,
    open: () => setVisible(true),
    close: () => setVisible(false),
    pick: (type: ActivityType) => {
      pending.current = type;
      setVisible(false);
    },
    dismiss: () => {
      const type = pending.current;
      pending.current = null;

      if (type && animalId) router.push(`/animal/${animalId}/${type}`);
    },
  };
}
