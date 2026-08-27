import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";
import { mapAppShowcaseFeatureProps } from "./appShowcaseFeature.mapping";

vi.mock("#lib/jcr", () => import("#test/jahia"));

describe("mapAppShowcaseFeatureProps", () => {
	it("maps icon, title and description", () => {
		const node = makeNode({
			props: { "icon": "feat.svg", "jcr:title": "Titre", "description": "Texte" },
		});
		expect(mapAppShowcaseFeatureProps(node)).toEqual({
			iconUrl: "feat.svg",
			featureTitle: "Titre",
			featureText: "Texte",
		});
	});

	it("falls back to empty strings when properties are missing", () => {
		expect(mapAppShowcaseFeatureProps(makeNode())).toEqual({
			iconUrl: "",
			featureTitle: "",
			featureText: "",
		});
	});
});
