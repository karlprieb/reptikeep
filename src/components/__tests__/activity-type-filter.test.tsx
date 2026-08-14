import { fireEvent, render, screen } from "@testing-library/react-native";

import {
  ActivityTypeFilter,
  presentTypes,
} from "@/components/activity-type-filter";
import type { ActivityType } from "@/constants/theme";
import type { AnimalActivity } from "@/utils/animal-activity";
import "@/i18n";

function entry(type: ActivityType): AnimalActivity {
  return { type, id: `${type}-1` } as AnimalActivity;
}

describe("presentTypes", () => {
  it("lists only the types with records, in canonical order", () => {
    expect(
      presentTypes([entry("medical"), entry("feed"), entry("poop")]),
    ).toEqual(["feed", "poop", "medical"]);
  });

  it("collapses repeats and returns nothing for an empty feed", () => {
    expect(presentTypes([entry("shed"), entry("shed")])).toEqual(["shed"]);
    expect(presentTypes([])).toEqual([]);
  });
});

describe("ActivityTypeFilter", () => {
  it("selects a type and clears it by pressing the selected chip again", () => {
    const onSelect = jest.fn();

    const { rerender } = render(
      <ActivityTypeFilter
        types={["feed", "shed"]}
        selected={null}
        onSelect={onSelect}
      />,
    );

    fireEvent.press(screen.getByLabelText("Feed"));
    expect(onSelect).toHaveBeenCalledWith("feed");

    rerender(
      <ActivityTypeFilter
        types={["feed", "shed"]}
        selected="feed"
        onSelect={onSelect}
      />,
    );

    fireEvent.press(screen.getByLabelText("Feed"));
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });

  it("offers an All chip that clears the filter", () => {
    const onSelect = jest.fn();

    render(
      <ActivityTypeFilter
        types={["feed", "shed"]}
        selected="shed"
        onSelect={onSelect}
      />,
    );

    fireEvent.press(screen.getByLabelText("All"));
    expect(onSelect).toHaveBeenCalledWith(null);
  });
});
