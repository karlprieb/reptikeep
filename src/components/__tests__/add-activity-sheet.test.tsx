import {
  cardRows,
  selectCardColumns,
  sheetScrolls,
} from "@/components/add-activity-sheet";

describe("selectCardColumns", () => {
  it("keeps two columns through the largest non-accessibility size", () => {
    expect(selectCardColumns(1.0)).toBe(2);
    expect(selectCardColumns(1.35)).toBe(2);
  });

  it("collapses to one column at and above the AX1 threshold", () => {
    expect(selectCardColumns(1.6)).toBe(1);
    expect(selectCardColumns(2.35)).toBe(1);
  });
});

describe("sheetScrolls", () => {
  const TALL = 874;
  const SHORT = 667;

  it("lets the current card set hug a tall phone, and scrolls a short one", () => {
    const rows = cardRows(2).length;

    expect(rows).toBe(3);
    expect(sheetScrolls(2, rows, TALL, 1)).toBe(false);
    expect(sheetScrolls(2, rows, SHORT, 1)).toBe(true);
  });

  it("scrolls once a larger reading size grows the cards past the sheet", () => {
    expect(sheetScrolls(2, 3, TALL, 1.35)).toBe(true);
  });

  it("always scrolls in a single column", () => {
    expect(sheetScrolls(1, cardRows(1).length, TALL, 2)).toBe(true);
  });
});
