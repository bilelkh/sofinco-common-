import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));
vi.mock("#lib/cta", () => ({
	getCtaProps: vi.fn(() => ({
		label: "CTA",
		href: "/x",
		target: "_self",
		ctaSection: "s",
		variant: "accent",
	})),
}));

import {
	mapCardAdvantagesPropsClient,
	mapCardAdvantagesPropsServer,
} from "./cardAdvantages.mapping";

const baseProps = {
	"jcr:title": "Titre",
	"subtitle": "Sous-titre",
	"cardImage": "card.jpg",
	"momentsTitle": "Moments",
	"momentsSubtitle": "Sous moments",
	"imageDesktop": "d.jpg",
	"imageMobile": "m.jpg",
};

describe("mapCardAdvantagesPropsServer", () => {
	it("maps the common props with a resolved CTA", () => {
		const result = mapCardAdvantagesPropsServer(makeNode({ props: baseProps }));
		expect(result).toMatchObject({
			title: "Titre",
			subtitle: "Sous-titre",
			cardImage: "card.jpg",
			momentsTitle: "Moments",
			imageDesktop: "d.jpg",
			imageMobile: "m.jpg",
		});
		expect(result.cta).toMatchObject({ label: "CTA" });
	});
});

describe("mapCardAdvantagesPropsClient", () => {
	it("maps the child sofnt:cardArgument nodes into arguments", () => {
		const argA = makeNode({
			id: "a",
			nodeTypes: ["sofnt:cardArgument"],
			props: { "jcr:title": "A", "description": "da" },
		});
		const argB = makeNode({
			id: "b",
			nodeTypes: ["sofnt:cardArgument"],
			props: { "jcr:title": "B", "description": "db" },
		});
		const node = makeNode({ props: baseProps, children: [argA, argB] });

		const result = mapCardAdvantagesPropsClient(node);
		expect(result.arguments).toEqual([
			{ id: "a", title: "A", description: "da" },
			{ id: "b", title: "B", description: "db" },
		]);
	});

	it("returns an empty arguments array when there are no children", () => {
		expect(mapCardAdvantagesPropsClient(makeNode({ props: baseProps })).arguments).toEqual([]);
	});
});
