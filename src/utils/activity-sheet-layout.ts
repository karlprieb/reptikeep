import {
  StackAboveFontScale,
  Spacing,
  type ActivityType,
} from "@/constants/theme";
import type { MedicalKind } from "@/state/medical";

export const CARD_MIN_HEIGHT = 180;

export function selectCardColumns(fontScale: number): 1 | 2 {
  return fontScale >= StackAboveFontScale ? 1 : 2;
}

export type ActivityCard = {
  type: ActivityType;
  titleKey: string;
  descriptionKey: string;
  kind?: MedicalKind;
};

export type AddSheetStep = "activity" | "health";

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

export const HEALTH_CARDS: ActivityCard[] = [
  {
    type: "medical",
    kind: "regurgitation",
    titleKey: "addRecord.regurgitation.title",
    descriptionKey: "addRecord.regurgitation.description",
  },
  {
    type: "medical",
    kind: "general",
    titleKey: "addRecord.medicalNote.title",
    descriptionKey: "addRecord.medicalNote.description",
  },
];

export const cardsFor = (step: AddSheetStep) =>
  step === "health" ? HEALTH_CARDS : ACTIVITY_CARDS;

export const cardKey = (card: ActivityCard) => card.kind ?? card.type;

export function cardRows(
  columns: 1 | 2,
  cards: ActivityCard[],
): ActivityCard[][] {
  if (columns === 1) return cards.map((card) => [card]);

  return cards.reduce<ActivityCard[][]>((rows, card, index) => {
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
