import { useState } from "react";
import { Animated } from "react-native";

export function useDraft<T extends object>(
  initial: () => T,
): [T, (patch: Partial<T>) => void] {
  const [draft, setDraft] = useState(initial);

  return [draft, (patch) => setDraft((current) => ({ ...current, ...patch }))];
}

export function optionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function asEditOf<T extends { id: string; createdAt: string }>(
  record: T,
  existing: T,
): T {
  return { ...record, id: existing.id, createdAt: existing.createdAt };
}

export const TOP_BAR_HEIGHT = 64;
export const ACTION_ICON_SIZE = 24;

export const TITLE_LARGE = {
  fontFamily: "Solway-Bold",
  fontSize: 22,
  lineHeight: 28,
} as const;

const LIFT_RANGE = 8;

export function useScrollLift() {
  const [scrollY] = useState(() => new Animated.Value(0));
  const lifted = scrollY.interpolate({
    inputRange: [0, LIFT_RANGE],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true },
  );

  return { scrollY, lifted, onScroll };
}
