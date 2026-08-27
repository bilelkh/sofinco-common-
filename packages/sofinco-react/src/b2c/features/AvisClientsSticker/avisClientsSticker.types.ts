export interface AvisClientsStickerProps {
  avisLogoUrl?: string;
  ratingScore?: number | null;
  ratingReviewsCount?: number | null;
  avisTitle?: string;
  direction?: "row" | "column";
  variant?: "red" | "accent";
  theme?: "light" | "dark";
}
