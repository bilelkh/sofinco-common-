import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));
vi.mock("#lib/cta", () => ({
	getCtaProps: vi.fn((_node, ctaSection: string, variant: string) => ({
		label: `cta:${ctaSection}`,
		href: "/l",
		target: "_self",
		ctaSection,
		variant,
	})),
}));

import { mapComparativeTableProps } from "./comparativeTable.mapping";

const makeRow = (props: Record<string, string>, id?: string) =>
	makeNode({ id, nodeTypes: ["sofnt:comparativeTableRow"], props });

describe("mapComparativeTableProps", () => {
	it("maps scalar fields, both column CTAs and the comparison rows", () => {
		const node = makeNode({
			props: {
				"jcr:title": "Titre",
				"subtitle": "Sous-titre",
				"rowHeaderLabel": "Critère",
				"leftColumnLabel": "Prêt personnel",
				"rightColumnLabel": "Crédit renouvelable",
			},
			named: {
				leftColumnButton: makeNode() as never,
				rightColumnButton: makeNode() as never,
			},
			children: [
				makeRow(
					{
						label: "Montant",
						leftValueLabel: "De 3 001 € à 75 000 €",
						leftValueIcon: "check-valid",
						rightValueLabel: "Jusqu'à 10 000 €",
						rightValueIcon: "x-invalid",
					},
					"row-1",
				),
			],
		});

		expect(mapComparativeTableProps(node)).toEqual({
			title: "Titre",
			subtitle: "Sous-titre",
			rowHeaderLabel: "Critère",
			leftColumnLabel: "Prêt personnel",
			rightColumnLabel: "Crédit renouvelable",
			leftColumnButton: {
				label: "cta:comparative-table-left-cta",
				href: "/l",
				target: "_self",
				ctaSection: "comparative-table-left-cta",
				variant: "primary",
			},
			rightColumnButton: {
				label: "cta:comparative-table-right-cta",
				href: "/l",
				target: "_self",
				ctaSection: "comparative-table-right-cta",
				variant: "accent",
			},
			rows: [
				{
					id: "row-1",
					label: "Montant",
					leftValue: { label: "De 3 001 € à 75 000 €", icon: "check-valid" },
					rightValue: { label: "Jusqu'à 10 000 €", icon: "x-invalid" },
				},
			],
		});
	});

	it("treats the 'none' icon value and a missing icon as no icon", () => {
		const node = makeNode({
			children: [
				makeRow({
					label: "Taux",
					leftValueLabel: "Fixe",
					leftValueIcon: "none",
					rightValueLabel: "Révisable",
				}),
			],
		});

		const [row] = mapComparativeTableProps(node).rows;
		expect(row.leftValue.icon).toBeUndefined();
		expect(row.rightValue.icon).toBeUndefined();
	});

	it("returns an empty rows array when there are no row children", () => {
		const node = makeNode({ props: { "jcr:title": "Vide" } });
		expect(mapComparativeTableProps(node).rows).toEqual([]);
	});

	it("returns null for a column button when its child node is missing", () => {
		const node = makeNode({ props: { "jcr:title": "Sans boutons" } });
		const result = mapComparativeTableProps(node);
		expect(result.leftColumnButton).toBeNull();
		expect(result.rightColumnButton).toBeNull();
	});
});
