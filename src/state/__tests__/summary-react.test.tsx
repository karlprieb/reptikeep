import { useValue } from "@legendapp/state/react";
import { act, render } from "@testing-library/react-native";
import { Text } from "react-native";

import { createHabitatActivity, habitatStore } from "@/state/habitat";
import { summaries$ } from "@/state/summary";

function Probe() {
  const summaries = useValue(summaries$);

  return <Text testID="water">{summaries["a1"]?.lastWaterAt ?? "none"}</Text>;
}

describe("summary reactivity", () => {
  beforeEach(() => {
    act(() => {
      habitatStore.clear();
      summaries$.set({});
    });
  });

  afterEach(() => {
    act(() => {
      habitatStore.clear();
      summaries$.set({});
    });
  });

  it("re-renders useValue(summaries$) subscribers when a summary changes", () => {
    const { getByTestId } = render(<Probe />);

    expect(getByTestId("water").props.children).toBe("none");

    act(() => {
      habitatStore.add(createHabitatActivity({ animalId: "a1", water: true }));
    });

    const record = Object.values(habitatStore.$.peek())[0];
    expect(getByTestId("water").props.children).toBe(record.occurredAt);
  });

  it("a cleaning-only record advances lastCleanAt without touching lastWaterAt", () => {
    habitatStore.add(
      createHabitatActivity({
        animalId: "a1",
        water: true,
        occurredAt: "2026-07-01T00:00:00.000Z",
      }),
    );

    act(() => {
      habitatStore.add(
        createHabitatActivity({
          animalId: "a1",
          water: false,
          cleaning: true,
          occurredAt: "2026-07-20T00:00:00.000Z",
        }),
      );
    });

    const summary = summaries$.peek()["a1"];
    expect(summary.lastWaterAt).toBe("2026-07-01T00:00:00.000Z");
    expect(summary.lastCleanAt).toBe("2026-07-20T00:00:00.000Z");
  });
});
