import type { IconKey } from "@shared/ui/svg";
import type { CtaProps } from "@shared/ui/Cta/Cta.type";

/**
 * One comparison criterion displayed as a row in the table.
 *
 * Each row contains the criterion label and one value for each compared column.
 */
export interface ComparativeTableRow {
	/** Row's id */
	id: string;
	/** Criterion label displayed in the first column on desktop and as a row heading on mobile. */
	label: string;
	/** Value displayed in the left comparison column. */
	leftValue: { label: string; icon?: IconKey };
	/** Value displayed in the right comparison column. */
	rightValue: { label: string; icon?: IconKey };
}

export interface ComparativeTableProps {
	/** Component title rendered above the table. */
	title: string;
	/** Introductory text displayed below the title. */
	subtitle: string;
	/** Accessible label for the desktop row-header column. */
	rowHeaderLabel: string;
	/** Header label for the left comparison column. */
	leftColumnLabel: string;
	/** Header label for the right comparison column. */
	rightColumnLabel: string;
	/** CTA displayed below the left column on desktop and in the mobile actions area. */
	leftColumnButton: CtaProps | null;
	/** CTA displayed below the right column on desktop and in the mobile actions area. */
	rightColumnButton: CtaProps | null;
	/** Comparison rows rendered in both desktop and mobile table layouts. */
	rows: ComparativeTableRow[];
}
