import type { Animal } from "@/state/animal";
import type { ReptileViewMode } from "@/state/settings";
import { CARD_ASPECT_RATIO } from "@/utils/animal-card-status";

const SQUARE_ASPECT_RATIO = 1;
export const NO_PHOTO_SINGLE_COLUMN_HEIGHT = 148;

const TEXT_BLOCK_HEIGHT = 148;
const MAX_TEXT_SCALE = 2;
const OVERDUE_BADGE_HEIGHT = 30;

const ACCESSIBILITY_TEXT_SCALE = 1.75;

export function selectColumnCount(
  viewMode: ReptileViewMode,
  fontScale = 1,
): 1 | 2 {
  if (fontScale >= ACCESSIBILITY_TEXT_SCALE) return 1;

  return viewMode === "grid" ? 2 : 1;
}

export function cardBadgeAllowance(columns: 1 | 2, badges: number[]): number[] {
  if (columns === 1) return badges;

  const tallest = Math.max(0, ...badges);
  return badges.map(() => tallest);
}

export function selectCardHeight(
  animal: Animal,
  columns: 1 | 2,
  cardWidth: number,
  fontScale = 1,
  overdueBadges = 0,
): number {
  const scale = Math.min(Math.max(fontScale, 1), MAX_TEXT_SCALE);
  const badgeLines = columns === 2 ? 2 : 1;
  const headroom =
    TEXT_BLOCK_HEIGHT * (scale - 1) +
    OVERDUE_BADGE_HEIGHT * scale * badgeLines * Math.max(0, overdueBadges - 1);

  if (columns === 1 && !animal.photo) {
    return Math.min(cardWidth, NO_PHOTO_SINGLE_COLUMN_HEIGHT) + headroom;
  }

  const aspectRatio = columns === 2 ? CARD_ASPECT_RATIO : SQUARE_ASPECT_RATIO;
  return cardWidth / aspectRatio + headroom;
}
