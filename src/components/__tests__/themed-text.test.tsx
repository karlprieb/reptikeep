import { render, screen } from "@testing-library/react-native";
import { StyleSheet, useWindowDimensions } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { TypeScale, Typography } from "@/constants/theme";

jest.mock("react-native/Libraries/Utilities/useWindowDimensions");

const mockedUseWindowDimensions = jest.mocked(useWindowDimensions);

function setFontScale(fontScale: number) {
  mockedUseWindowDimensions.mockReturnValue({
    width: 402,
    height: 874,
    scale: 3,
    fontScale,
  });
}

function flatStyleOf(text: string) {
  return StyleSheet.flatten(screen.getByText(text).props.style);
}

beforeEach(() => {
  setFontScale(1);
});

describe("ThemedText Dynamic Type scaling", () => {
  it("caps a display alias at its mapped multiplier", () => {
    render(<ThemedText type="displayXl">Willow</ThemedText>);

    expect(screen.getByText("Willow").props.maxFontSizeMultiplier).toBe(
      TypeScale.displayXl.maxMultiplier,
    );
    expect(TypeScale.displayXl.maxMultiplier).toBeLessThan(2);
  });

  it("lets a small alias keep its full multiplier", () => {
    render(<ThemedText type="label">LAST FED</ThemedText>);

    expect(screen.getByText("LAST FED").props.maxFontSizeMultiplier).toBe(
      TypeScale.label.maxMultiplier,
    );
    expect(TypeScale.label.maxMultiplier).toBeGreaterThan(3);
  });

  it("applies the body multiplier when no type is given", () => {
    render(<ThemedText>Fed 4 days ago</ThemedText>);

    expect(screen.getByText("Fed 4 days ago").props.maxFontSizeMultiplier).toBe(
      TypeScale.body.maxMultiplier,
    );
  });

  it("lets a caller override the alias default", () => {
    render(
      <ThemedText type="displayXl" maxFontSizeMultiplier={1.2}>
        Willow
      </ThemedText>,
    );

    expect(screen.getByText("Willow").props.maxFontSizeMultiplier).toBe(1.2);
  });

  it("never disables font scaling by default", () => {
    render(<ThemedText type="body">Fed 4 days ago</ThemedText>);

    expect(screen.getByText("Fed 4 days ago").props.allowFontScaling).not.toBe(
      false,
    );
  });

  it("leaves the authored line height alone at the default text size", () => {
    render(<ThemedText type="label">LAST FED</ThemedText>);

    expect(flatStyleOf("LAST FED").lineHeight).toBeCloseTo(
      Typography.label.lineHeight,
    );
  });

  it("scales line height with the text size so glyphs keep their line box", () => {
    setFontScale(2.5);
    render(<ThemedText type="body">Fed 4 days ago</ThemedText>);

    expect(flatStyleOf("Fed 4 days ago").lineHeight).toBeCloseTo(
      Typography.body.lineHeight * 2.5,
    );
  });

  it("caps line height at the same multiplier that caps font size", () => {
    setFontScale(5);
    render(<ThemedText type="displayXl">Willow</ThemedText>);

    expect(flatStyleOf("Willow").lineHeight).toBeCloseTo(
      Typography.displayXl.lineHeight * TypeScale.displayXl.maxMultiplier,
    );
  });

  it("shrinks line height alongside a below-default text size", () => {
    setFontScale(0.8);
    render(<ThemedText type="body">Fed 4 days ago</ThemedText>);

    expect(flatStyleOf("Fed 4 days ago").lineHeight).toBeCloseTo(
      Typography.body.lineHeight * 0.8,
    );
  });

  it("holds the line height still when a caller opts out of scaling", () => {
    setFontScale(3);
    render(
      <ThemedText type="body" allowFontScaling={false}>
        Fed 4 days ago
      </ThemedText>,
    );

    expect(flatStyleOf("Fed 4 days ago").lineHeight).toBeCloseTo(
      Typography.body.lineHeight,
    );
  });

  it("gives display aliases a tighter ceiling than body aliases", () => {
    expect(TypeScale.displayXl.maxMultiplier).toBeLessThan(
      TypeScale.body.maxMultiplier,
    );
    expect(TypeScale.display.maxMultiplier).toBeLessThan(
      TypeScale.bodyS.maxMultiplier,
    );
  });
});
