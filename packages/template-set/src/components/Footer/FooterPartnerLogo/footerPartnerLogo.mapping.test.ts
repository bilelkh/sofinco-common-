import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));

import {
	mapFooterPartnerLogoPropsClient,
	mapFooterPartnerLogoPropsServer,
} from "./footerPartnerLogo.mapping";

describe("mapFooterPartnerLogoProps", () => {
	it("maps title, logo, link and disclaimer", () => {
		const node = makeNode({
			id: "partner-1",
			props: {
				"jcr:title": "Partenaire",
				"logoImage": "logo.png",
				"linkUrl": "https://p",
				"openInNewTab": false,
				"disclaimer": "mention",
			},
		});
		expect(mapFooterPartnerLogoPropsClient(node)).toEqual({
			id: "partner-1",
			title: "Partenaire",
			imageUrl: "logo.png",
			altText: "Partenaire",
			linkUrl: "https://p",
			openInNewTab: false,
			disclaimer: "mention",
		});
	});

	it("defaults openInNewTab to true", () => {
		expect(mapFooterPartnerLogoPropsServer(makeNode()).openInNewTab).toBe(true);
	});
});
