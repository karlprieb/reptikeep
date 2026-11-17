import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";

import type { ActivityType } from "@/constants/theme";
import type { MedicalKind } from "@/state/medical";
import type { AddSheetStep } from "@/utils/activity-sheet-layout";

type Pending = { type: ActivityType; kind?: MedicalKind };

export function useAddActivity(animalId: string | undefined) {
  const [opened, setOpened] = useState(false);
  const [step, setStep] = useState<AddSheetStep>("activity");
  const pending = useRef<Pending | null>(null);
  const { log } = useLocalSearchParams<{ log?: string }>();
  const openedFromLabel = log === "1" && Boolean(animalId);

  const hide = () => {
    setOpened(false);
    if (openedFromLabel) router.setParams({ log: undefined });
  };

  return {
    visible: opened || openedFromLabel,
    step,
    open: () => {
      setStep("activity");
      setOpened(true);
    },
    close: hide,
    pick: (type: ActivityType, kind?: MedicalKind) => {
      pending.current = { type, kind };
      hide();
    },
    dismiss: () => {
      const picked = pending.current;
      pending.current = null;
      if (!picked || !animalId) {
        setStep("activity");
        return;
      }

      if (picked.type === "medical" && !picked.kind) {
        setStep("health");
        setOpened(true);
        return;
      }

      setStep("activity");
      if (picked.kind)
        router.push({
          pathname: "/animal/[id]/medical",
          params: { id: animalId, kind: picked.kind },
        });
      else router.push(`/animal/${animalId}/${picked.type}`);
    },
  };
}
