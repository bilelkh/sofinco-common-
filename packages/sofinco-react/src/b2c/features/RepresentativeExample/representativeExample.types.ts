import type { CtaProps } from "@shared/ui/Cta/Cta.type";

/**
 * Representative example variants.
 *
 * This type is used to adapt the credit label in the metadata and in the
 * component rendering.
 */
export type ProductVariant = "pretPerso" | "creditRenouvelable" | "rachatCredit";

/**
 * Row in the representative example table.
 *
 * Each row represents a contractual item that is already translated and
 * already formatted in content.
 */
export interface TableRow {
	/** Label displayed in the table header. */
	label: string;
	/** Value displayed in the corresponding cell. */
	value: string;
	/** Indicates whether the row should use the highlighted visual style. */
	highlighted?: boolean;
	/**
	 * Enlarges the label and the value one step, `--text-base` → `--text-lg`.
	 *
	 * Independent from `highlighted`, which only drives the colours: the highlighted column
	 * needs both, otherwise it renders smaller than the enlarged rows around it.
	 */
	largeText?: boolean;
}

/**
 * Props for the `RepresentativeExample` component.
 *
 * These data drive the credit example, the repayment table, and the related
 * legal content.
 */
export interface RepresentativeExampleProps {
	/** Business variant used to adapt the displayed product type. */
	variant: ProductVariant;
	/** Main title displayed above the example. */
	title: string;
	/** Subtitle in HTML format. */
	subtitle: string;
	/** Label displayed above the borrowed amount. */
	amountLabel: string;
	/** Borrowed amount displayed in the card. */
	exampleAmount: string;
	/** Summary table rows displayed below the card. */
	rows: TableRow[];
	/** Optional insurance legal text, already assembled and in HTML format. */
	insuranceLegalText: string;
	/** Call-to-action button displayed at the bottom of the component. */
	cta?: CtaProps;
}
