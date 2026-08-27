import { describe, it, expect } from "vitest";
import type { BreadcrumbItem } from "sofinco-react";
import { buildBreadcrumbList } from "./breadcrumbList";

const ORIGIN = "https://www.sofinco.fr";
const CANONICAL = "https://www.sofinco.fr/credit-pret/pret-personnel";
const OPTS = { origin: ORIGIN, canonical: CANONICAL, id: `${CANONICAL}#breadcrumb` };

const item = (over: Partial<BreadcrumbItem>): BreadcrumbItem => ({
	id: over.label ?? "id",
	label: "Page",
	url: "/page",
	isCurrent: false,
	isClickable: true,
	...over,
});

describe("buildBreadcrumbList", () => {
	it("absolutise les URLs et numérote les positions à partir de 1", () => {
		const node = buildBreadcrumbList(
			[
				item({ label: "Accueil Sofinco", url: "/" }),
				item({ label: "Prêt personnel", url: "/credit-pret/pret-personnel", isCurrent: true }),
			],
			OPTS,
		);

		expect(node).toEqual({
			"@type": "BreadcrumbList",
			"@id": `${CANONICAL}#breadcrumb`,
			"itemListElement": [
				{
					"@type": "ListItem",
					"position": 1,
					"name": "Accueil Sofinco",
					"item": "https://www.sofinco.fr/",
				},
				{ "@type": "ListItem", "position": 2, "name": "Prêt personnel", "item": CANONICAL },
			],
		});
	});

	it("désigne la page courante par son canonical, pas par son URL de nœud", () => {
		const node = buildBreadcrumbList(
			[
				item({ label: "Accueil", url: "/" }),
				item({ label: "Produit", url: "/sites/sofinco/produit.html", isCurrent: true }),
			],
			OPTS,
		);
		expect((node?.itemListElement as { item: string }[])[1].item).toBe(CANONICAL);
	});

	it("écarte les entrées sans destination et renumérote sans trou", () => {
		const node = buildBreadcrumbList(
			[
				item({ label: "Accueil", url: "/" }),
				item({ label: "Regroupement", url: "", isClickable: false }),
				item({ label: "Produit", url: "/produit", isCurrent: true }),
			],
			OPTS,
		);
		expect(node?.itemListElement).toHaveLength(2);
		expect((node?.itemListElement as { position: number }[]).map((i) => i.position)).toEqual([
			1, 2,
		]);
	});

	it("n'émet rien en dessous de deux entrées exploitables", () => {
		expect(buildBreadcrumbList([], OPTS)).toBeNull();
		expect(
			buildBreadcrumbList([item({ label: "Accueil", url: "/", isCurrent: true })], OPTS),
		).toBeNull();
		expect(
			buildBreadcrumbList(
				[item({ label: "Accueil", url: "/" }), item({ label: "Regroupement", url: "" })],
				OPTS,
			),
		).toBeNull();
	});
});
