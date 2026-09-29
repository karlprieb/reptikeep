import {
  StackAboveFontScale,
  Spacing,
  type ActivityType,
} from "@/constants/theme";

export const CARD_MIN_HEIGHT = 180;

export function selectCardColumns(fontScale: number): 1 | 2 {
  return fontScale >= StackAboveFontScale ? 1 : 2;
}

export type ActivityCard = {
  type: ActivityType;
  titleKey: string;
  descriptionKey: string;
};

export const ACTIVITY_CARDS: ActivityCard[] = [
  {
    type: "feed",
    titleKey: "addRecord.feeding.title",
    descriptionKey: "addRecord.feeding.description",
  },
  {
    type: "weight",
    titleKey: "addRecord.weight.title",
    descriptionKey: "addRecord.weight.description",
  },
  {
    type: "shed",
    titleKey: "addRecord.shed.title",
    descriptionKey: "addRecord.shed.description",
  },
  {
    type: "poop",
    titleKey: "addRecord.defecation.title",
    descriptionKey: "addRecord.defecation.description",
  },
  {
    type: "habitat",
    titleKey: "addRecord.habitat.title",
    descriptionKey: "addRecord.habitat.description",
  },
  {
    type: "medical",
    titleKey: "addRecord.medical.title",
    descriptionKey: "addRecord.medical.description",
  },
];

export function cardRows(columns: 1 | 2): ActivityCard[][] {
  if (columns === 1) return ACTIVITY_CARDS.map((card) => [card]);

  return ACTIVITY_CARDS.reduce<ActivityCard[][]>((rows, card, index) => {
    if (index % 2 === 0) rows.push([card]);
    else rows[rows.length - 1].push(card);
    return rows;
  }, []);
}

const HEADER_HEIGHT = 80;
const USABLE_SHEET_FRACTION = 0.92;

export function sheetScrolls(
  columns: 1 | 2,
  rowCount: number,
  windowHeight: number,
  fontScale: number,
): boolean {
  if (columns === 1) return true;

  const rowHeight = CARD_MIN_HEIGHT * Math.min(fontScale, StackAboveFontScale);
  const content =
    HEADER_HEIGHT +
    rowCount * rowHeight +
    (rowCount - 1) * Spacing.sm +
    Spacing.xl * 2;

  return content > windowHeight * USABLE_SHEET_FRACTION;
}
