import { act, renderHook } from "@testing-library/react-native";

import { useToday } from "@/hooks/use-today";

describe("useToday", () => {
  it("flips to the next calendar date at local midnight", () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 0, 1, 23, 59, 0));

    const { result } = renderHook(() => useToday());
    expect(result.current).toBe("2026-01-01");

    act(() => {
      jest.advanceTimersByTime(65_000);
    });

    expect(result.current).toBe("2026-01-02");

    jest.useRealTimers();
  });
});
