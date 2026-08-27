import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));
vi.mock("#lib/cta", () => ({ getRequiredCtaProps: vi.fn(() => ({ label: "CTA", href: "/x" })) }));

import { mapOfferSlideRateProps } from "./offerSlideRate.mapping";

describe("mapOfferSlideRateProps", () => {
	it("maps a rate slide", () => {
		const node = makeNode({
			id: "r1",
			props: { rateValue: "0.9", rateSuffix: "%", description: "D", eyebrow: "E" },
		});
		expect(mapOfferSlideRateProps(node)).toEqual({
			variant: "rate",
			id: "r1",
			rateValue: "0.9",
			rateSuffix: "%",
			description: "D",
			eyebrow: "E",
			cta: { label: "CTA", href: "/x" },
		});
	});
});
