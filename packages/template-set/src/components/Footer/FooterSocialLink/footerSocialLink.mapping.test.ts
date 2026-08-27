import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));

import {
	mapFooterSocialLinkPropsClient,
	mapFooterSocialLinkPropsServer,
} from "./footerSocialLink.mapping";

describe("mapFooterSocialLinkProps", () => {
	it("maps network and url", () => {
		const node = makeNode({
			id: "social-1",
			props: { network: "instagram", url: "https://insta" },
		});
		expect(mapFooterSocialLinkPropsClient(node)).toEqual({
			id: "social-1",
			network: "instagram",
			url: "https://insta",
		});
	});

	it("falls back to facebook and '#'", () => {
		expect(mapFooterSocialLinkPropsServer(makeNode({ id: "social-2" }))).toEqual({
			id: "social-2",
			network: "facebook",
			url: "#",
		});
	});
});
