import { fireEvent, render } from "@testing-library/react-native";

import { PageHeader } from "@/components/page-header";

describe("PageHeader", () => {
  it("renders the title", async () => {
    const { getByText } = await render(<PageHeader title="Reptiles" />);

    expect(getByText("Reptiles")).toBeTruthy();
  });

  it("renders no toolbar when actions is undefined", async () => {
    const { queryByTestId } = await render(<PageHeader title="Reptiles" />);

    expect(queryByTestId("stack-toolbar")).toBeNull();
    expect(queryByTestId("stack-toolbar-button")).toBeNull();
  });

  it("renders no toolbar when actions is empty", async () => {
    const { queryByTestId } = await render(
      <PageHeader title="Reptiles" actions={[]} />,
    );

    expect(queryByTestId("stack-toolbar")).toBeNull();
    expect(queryByTestId("stack-toolbar-button")).toBeNull();
  });

  it("renders exactly one toolbar button per action", async () => {
    const actions = [
      { key: "add", onPress: jest.fn(), accessibilityLabel: "Add" },
      { key: "filter", onPress: jest.fn(), accessibilityLabel: "Filter" },
      { key: "sort", onPress: jest.fn(), accessibilityLabel: "Sort" },
    ];

    const { getAllByTestId } = await render(
      <PageHeader title="Reptiles" actions={actions} />,
    );

    expect(getAllByTestId("stack-toolbar-button")).toHaveLength(3);
  });

  it("passes each action's props through and invokes its onPress", async () => {
    const onPress = jest.fn();
    const actions = [
      {
        key: "add",
        onPress,
        accessibilityLabel: "Add reptile",
        accessibilityHint: "Adds a new reptile",
      },
    ];

    const { getByLabelText } = await render(
      <PageHeader title="Reptiles" actions={actions} />,
    );

    const button = getByLabelText("Add reptile");
    expect(button.props.accessibilityHint).toBe("Adds a new reptile");

    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
