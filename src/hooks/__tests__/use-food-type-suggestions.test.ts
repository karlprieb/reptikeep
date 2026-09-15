import { act, renderHook } from "@testing-library/react-native";

import { useFoodTypeSuggestions } from "@/hooks/use-food-type-suggestions";
import { createFeedingActivity, feedingStore } from "@/state/feeding";

function seed(animalId: string, foodType: string, occurredAt: string) {
  feedingStore.add(createFeedingActivity({ animalId, foodType, occurredAt }));
}

function renderSuggestions(animalId: string, initialQuery: string) {
  const text = { set: jest.fn() };
  const selection = { set: jest.fn() };
  const onSelect = jest.fn();

  const utils = renderHook(
    ({ query }: { query: string }) =>
      useFoodTypeSuggestions({ animalId, text, selection, query, onSelect }),
    { initialProps: { query: initialQuery } },
  );

  return { ...utils, text, selection, onSelect };
}

describe("useFoodTypeSuggestions", () => {
  beforeEach(() => {
    feedingStore.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("ranks food types by how often they were used, most-used first", () => {
    seed("animal-1", "Rato", "2024-01-01T00:00:00.000Z");
    seed("animal-1", "Rato", "2024-01-02T00:00:00.000Z");
    seed("animal-1", "Codornas", "2024-01-03T00:00:00.000Z");

    const { result } = renderSuggestions("animal-1", "");
    act(() => result.current.handleFocusChange(true));

    expect(result.current.suggestions).toEqual(["Rato", "Codornas"]);
  });

  it("dedupes case-insensitively and keeps the casing of the most recently occurred record", () => {
    seed("animal-1", "cricket", "2024-01-05T00:00:00.000Z");
    seed("animal-1", "Cricket", "2024-01-01T00:00:00.000Z");

    const { result } = renderSuggestions("animal-1", "");
    act(() => result.current.handleFocusChange(true));

    expect(result.current.suggestions).toEqual(["cricket"]);
  });

  it("ignores records belonging to other animals", () => {
    seed("animal-1", "Rato", "2024-01-01T00:00:00.000Z");
    seed("animal-2", "Codornas", "2024-01-01T00:00:00.000Z");

    const { result } = renderSuggestions("animal-1", "");
    act(() => result.current.handleFocusChange(true));

    expect(result.current.suggestions).toEqual(["Rato"]);
  });

  it("filters the ranked list by substring as the query changes", () => {
    seed("animal-1", "Rato", "2024-01-01T00:00:00.000Z");
    seed("animal-1", "Ratos", "2024-01-02T00:00:00.000Z");
    seed("animal-1", "Codornas", "2024-01-03T00:00:00.000Z");

    const { result, rerender } = renderSuggestions("animal-1", "");
    act(() => result.current.handleFocusChange(true));

    rerender({ query: "Rat" });

    expect(result.current.suggestions).toEqual(["Rato", "Ratos"]);
  });

  it("caps the list at five suggestions", () => {
    const foodTypes = ["A", "B", "C", "D", "E", "F"];
    foodTypes.forEach((foodType, index) => {
      for (let i = 0; i <= index; i++) {
        seed("animal-1", foodType, `2024-01-0${index + 1}T0${i}:00:00.000Z`);
      }
    });

    const { result } = renderSuggestions("animal-1", "");
    act(() => result.current.handleFocusChange(true));

    expect(result.current.suggestions).toEqual(["F", "E", "D", "C", "B"]);
  });

  it("suppresses the list when the only match already equals the query", () => {
    seed("animal-1", "Rato", "2024-01-01T00:00:00.000Z");

    const { result } = renderSuggestions("animal-1", "Rato");
    act(() => result.current.handleFocusChange(true));

    expect(result.current.suggestions).toEqual([]);
    expect(result.current.visible).toBe(false);
  });

  it("opens on focus and debounce-closes 150ms after blur", () => {
    seed("animal-1", "Rato", "2024-01-01T00:00:00.000Z");
    jest.useFakeTimers();

    const { result } = renderSuggestions("animal-1", "");
    expect(result.current.visible).toBe(false);

    act(() => result.current.handleFocusChange(true));
    expect(result.current.visible).toBe(true);

    act(() => result.current.handleFocusChange(false));
    expect(result.current.visible).toBe(true);

    act(() => jest.advanceTimersByTime(150));
    expect(result.current.visible).toBe(false);
  });

  it("stays closed after dismiss() until the field is genuinely refocused", () => {
    seed("animal-1", "Rato", "2024-01-01T00:00:00.000Z");
    seed("animal-1", "Ratos", "2024-01-02T00:00:00.000Z");

    const { result, rerender } = renderSuggestions("animal-1", "Rat");
    act(() => result.current.handleFocusChange(true));
    expect(result.current.visible).toBe(true);

    act(() => result.current.dismiss());
    expect(result.current.visible).toBe(false);

    rerender({ query: "Rato" });
    expect(result.current.visible).toBe(false);

    act(() => result.current.handleFocusChange(true));
    expect(result.current.visible).toBe(true);
  });

  it("select() fills the text, places the cursor at the end, and closes the list", () => {
    seed("animal-1", "Rato", "2024-01-01T00:00:00.000Z");

    const { result, text, selection, onSelect } = renderSuggestions(
      "animal-1",
      "Rat",
    );
    act(() => result.current.handleFocusChange(true));

    act(() => result.current.select("Rato"));

    expect(text.set).toHaveBeenCalledWith("Rato");
    expect(selection.set).toHaveBeenCalledWith({ start: 4, end: 4 });
    expect(onSelect).toHaveBeenCalledWith("Rato");
    expect(result.current.visible).toBe(false);
  });

  it("reopens filtered as soon as the selected text is edited again", () => {
    seed("animal-1", "Ratos", "2024-01-01T00:00:00.000Z");
    seed("animal-1", "Codorna", "2024-01-02T00:00:00.000Z");
    seed("animal-1", "Ratos grandes", "2024-01-03T00:00:00.000Z");

    const { result, rerender } = renderSuggestions("animal-1", "Rat");
    act(() => result.current.handleFocusChange(true));

    act(() => result.current.select("Ratos"));
    rerender({ query: "Ratos" });
    expect(result.current.suggestions).toEqual(["Ratos", "Ratos grandes"]);
    expect(result.current.visible).toBe(false);

    rerender({ query: "Rato" });

    expect(result.current.suggestions).toEqual(["Ratos", "Ratos grandes"]);
    expect(result.current.visible).toBe(true);
  });

  it("does not let a stale selection undo an explicit dismiss after refocus", () => {
    seed("animal-1", "Ratos", "2024-01-01T00:00:00.000Z");
    seed("animal-1", "Ratos grandes", "2024-01-02T00:00:00.000Z");

    const { result, rerender } = renderSuggestions("animal-1", "Rat");
    act(() => result.current.handleFocusChange(true));

    act(() => result.current.select("Ratos"));
    rerender({ query: "Ratos" });

    act(() => result.current.handleFocusChange(true));
    expect(result.current.visible).toBe(true);

    act(() => result.current.dismiss());
    expect(result.current.visible).toBe(false);

    rerender({ query: "Rato" });
    expect(result.current.visible).toBe(false);
  });

  it("clears the pending blur timer on unmount", () => {
    seed("animal-1", "Rato", "2024-01-01T00:00:00.000Z");
    jest.useFakeTimers();
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const { result, unmount } = renderSuggestions("animal-1", "");
    act(() => result.current.handleFocusChange(true));
    act(() => result.current.handleFocusChange(false));

    unmount();
    act(() => jest.advanceTimersByTime(150));

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
