import { str, getChildNode, getChildNodesByType } from "#lib/jcr";
import { getCtaProps } from "#lib/cta";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { ComparativeTableProps, ComparativeTableRow, CtaProps } from "sofinco-react";

/** Sentinel value of the icon choicelist meaning "no icon". */
const ICON_NONE = "none";

type RowIcon = ComparativeTableRow["leftValue"]["icon"];

/**
 * Maps the icon choicelist value to a sofinco-react icon key, or `undefined` when none.
 * The CND constrains the value to `check-valid` / `x-invalid`, both valid `IconKey`s.
 */
const readIcon = (node: JCRNodeWrapper, property: string): RowIcon => {
	const icon = str(node, property, ICON_NONE);
	return icon && icon !== ICON_NONE ? (icon as RowIcon) : undefined;
};

const readRow = (node: JCRNodeWrapper): ComparativeTableRow => ({
	id: node.getIdentifier(),
	label: str(node, "label"),
	leftValue: { label: str(node, "leftValueLabel"), icon: readIcon(node, "leftValueIcon") },
	rightValue: { label: str(node, "rightValueLabel"), icon: readIcon(node, "rightValueIcon") },
});

const readButton = (
	node: JCRNodeWrapper,
	childName: string,
	ctaSection: string,
	variant: CtaProps["variant"],
): CtaProps | null => {
	const child = getChildNode(node, childName);
	return child ? getCtaProps(child, ctaSection, variant) : null;
};

export const mapComparativeTableProps = (node: JCRNodeWrapper): ComparativeTableProps => ({
	title: str(node, "jcr:title"),
	subtitle: str(node, "subtitle"),
	rowHeaderLabel: str(node, "rowHeaderLabel"),
	leftColumnLabel: str(node, "leftColumnLabel"),
	rightColumnLabel: str(node, "rightColumnLabel"),
	leftColumnButton: readButton(node, "leftColumnButton", "comparative-table-left-cta", "primary"),
	rightColumnButton: readButton(node, "rightColumnButton", "comparative-table-right-cta", "accent"),
	rows: getChildNodesByType(node, "sofnt:comparativeTableRow").map(readRow),
});
