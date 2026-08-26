import { act, renderHook } from "@testing-library/react-native";

import { useCareScheduleEditor } from "@/hooks/use-care-schedule-editor";
import { careSchedules$ } from "@/state/care-schedule";

describe("useCareScheduleEditor", () => {
  beforeEach(() => {
    act(() => {
      careSchedules$.water.set({ frequency: "weekly" });
      careSchedules$.cleaning.set({ frequency: "weekly" });
    });
  });

  afterEach(() => {
    act(() => {
      careSchedules$.water.set(undefined);
      careSchedules$.cleaning.set(undefined);
    });
  });

  it("holds an invalid custom selection locally without writing it", () => {
    const { result } = renderHook(() => useCareScheduleEditor("water"));

    act(() => result.current.setSelection("custom"));

    expect(result.current.selection).toBe("custom");
    expect(result.current.valid).toBe(false);
    expect(careSchedules$.water.peek()?.frequency).toBe("weekly");
  });

  it("writes the custom interval once valid days are entered", () => {
    const { result } = renderHook(() => useCareScheduleEditor("water"));

    act(() => result.current.setSelection("custom"));
    act(() => result.current.setDays("9"));

    expect(result.current.valid).toBe(true);
    expect(careSchedules$.water.peek()).toEqual({
      frequency: "custom",
      days: 9,
    });
  });

  it("does not overwrite the stored schedule with empty or non-positive days", () => {
    const { result } = renderHook(() => useCareScheduleEditor("water"));

    act(() => result.current.setDays(""));
    expect(careSchedules$.water.peek()?.frequency).toBe("weekly");

    act(() => result.current.setDays("0"));
    expect(careSchedules$.water.peek()?.frequency).toBe("weekly");
  });

  it("clears the routine when disabled", () => {
    const { result } = renderHook(() => useCareScheduleEditor("water"));

    act(() => result.current.setEnabled(false));

    expect(careSchedules$.water.peek()).toBeUndefined();
  });
});
