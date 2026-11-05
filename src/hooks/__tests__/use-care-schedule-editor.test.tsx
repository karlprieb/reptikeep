import { act, renderHook } from "@testing-library/react-native";

import { useCareScheduleEditor } from "@/hooks/use-care-schedule-editor";
import { careSchedules$ } from "@/state/care-schedule";

describe("useCareScheduleEditor", () => {
  beforeEach(async () => {
    await act(() => {
      careSchedules$.water.set({ frequency: "weekly" });
      careSchedules$.cleaning.set({ frequency: "weekly" });
    });
  });

  afterEach(async () => {
    await act(() => {
      careSchedules$.water.set(undefined);
      careSchedules$.cleaning.set(undefined);
    });
  });

  it("holds an invalid custom selection locally without writing it", async () => {
    const { result } = await renderHook(() => useCareScheduleEditor("water"));

    await act(() => result.current.setSelection("custom"));

    expect(result.current.selection).toBe("custom");
    expect(result.current.valid).toBe(false);
    expect(careSchedules$.water.peek()?.frequency).toBe("weekly");
  });

  it("writes the custom interval once valid days are entered", async () => {
    const { result } = await renderHook(() => useCareScheduleEditor("water"));

    await act(() => result.current.setSelection("custom"));
    await act(() => result.current.setDays("9"));

    expect(result.current.valid).toBe(true);
    expect(careSchedules$.water.peek()).toEqual({
      frequency: "custom",
      days: 9,
    });
  });

  it("does not overwrite the stored schedule with empty or non-positive days", async () => {
    const { result } = await renderHook(() => useCareScheduleEditor("water"));

    await act(() => result.current.setDays(""));
    expect(careSchedules$.water.peek()?.frequency).toBe("weekly");

    await act(() => result.current.setDays("0"));
    expect(careSchedules$.water.peek()?.frequency).toBe("weekly");
  });

  it("clears the routine when disabled", async () => {
    const { result } = await renderHook(() => useCareScheduleEditor("water"));

    await act(() => result.current.setEnabled(false));

    expect(careSchedules$.water.peek()).toBeUndefined();
  });
});
