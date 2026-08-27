/**
 * One client review rendered as a slide inside the AvisClient carousel.
 * Provided by an external API; not editable from Jahia.
 */

import type { AvisClientsStickerProps } from "@b2c/features/AvisClientsSticker/avisClientsSticker.types";

export interface AvisItem {
  /** Stable unique identifier — used as React key. */
  id: string;
  /** Star rating, 1–5. */
  rating: number;
  /** Review body. */
  text: string;
  /** Author display name (e.g. "Gérard M."). */
  author: string;
  /** Date the operation was realized (free-form, already formatted). */
  realizedDate: string;
  /** Date the review was published (free-form, already formatted). */
  publishedDate: string;
  /** Visual tone — controls card background + accent colors. */
  tone?: AvisCardTone;
}

export type AvisCardTone = "lilac" | "peach" | "pink" | "yellow";

/**
 * Optional accessibility messages forwarded to Swiper's `A11y` module.
 */
export interface AvisClientA11y {
  containerLabel?: string;
  prevSlideLabel?: string;
  nextSlideLabel?: string;
  firstSlideLabel?: string;
  lastSlideLabel?: string;
  slideLabel?: string;
  slideRole?: string;
}

/**
 * Hard-coded "Avis Vérifiés" sticker shown above the title.
 * Will be replaced by a dedicated component later.
 */

export interface AvisClientProps {
  /** Section heading shown above the carousel. */
  title?: string;
  /** Optional intro paragraph displayed under the title. */
  subtitle?: string;
  /** Label of the "see all reviews" link displayed under the subtitle. */
  linkLabel?: string;
  /** Destination URL of the "see all reviews" link. */
  linkHref?: string;
  /** Review cards (sourced from an API). */
  items: AvisItem[];
  /** Override the hard-coded sticker content. */
  sticker?: AvisClientsStickerProps;
  a11y?: AvisClientA11y;
  className?: string;
}

export interface AvisCardProps {
  rating: number;
  text: string;
  author: string;
  realizedDate: string;
  publishedDate: string;
  tone?: AvisCardTone;
  className?: string;
}
