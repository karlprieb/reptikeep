import { Spacing, Typography } from "@/constants/theme";
import { panelRowHeight } from "@/utils/panel-row";

const PADDING = Spacing.sm * 2;

describe("panelRowHeight", () => {
  it("sums the line heights of every block plus the gaps between them", () => {
    expect(
      panelRowHeight(
        [
          ["body", 1],
          ["bodyS", 2],
        ],
        1,
        0,
      ),
    ).toBe(
      Math.ceil(Typography.body.lineHeight + Typography.bodyS.lineHeight * 2) +
        Spacing["2xs"] +
        PADDING,
    );
  });

  it("never returns less than the badge it has to fit", () => {
    expect(panelRowHeight([["bodyS", 1]], 1, 200)).toBe(200 + PADDING);
  });

  it("grows with Dynamic Type", () => {
    const blocks: [Parameters<typeof panelRowHeight>[0][number][0], number][] =
      [
        ["body", 1],
        ["bodyS", 2],
      ];

    expect(panelRowHeight(blocks, 1.5, 0)).toBeGreaterThan(
      panelRowHeight(blocks, 1, 0),
    );
  });

  it("does not cap the scale, so accessibility sizes grow without clipping", () => {
    const blocks: [Parameters<typeof panelRowHeight>[0][number][0], number][] =
      [["body", 1]];

    expect(panelRowHeight(blocks, 5, 0)).toBeGreaterThan(
      panelRowHeight(blocks, 2, 0),
    );
  });

  it("does not shrink below the unscaled height", () => {
    expect(panelRowHeight([["body", 1]], 0.5, 0)).toBe(
      panelRowHeight([["body", 1]], 1, 0),
    );
  });
});
