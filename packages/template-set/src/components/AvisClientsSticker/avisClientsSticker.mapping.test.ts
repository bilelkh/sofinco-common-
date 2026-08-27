import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeNode } from "#test/jahia";

let siteNode = makeNode();

vi.mock("#lib/jcr", async () => {
	const real = await import("#test/jahia");
	return { ...real, getGlobalSettingsNode: vi.fn() };
});
vi.mock("#lib/javaBridge", () => ({ getReviewServiceBridge: vi.fn() }));
vi.mock("#lib/siteConfigs", () => ({
	avisClientPath: "avis-clients-settings",
	verifiedReviewConfigRelPath: "contents/config/avis-verifies/config",
}));
vi.mock("@jahia/javascript-modules-library", () => ({
	useServerContext: vi.fn(() => ({ renderContext: { getSite: () => siteNode } })),
}));

import { getGlobalSettingsNode } from "#lib/jcr";
import { getReviewServiceBridge } from "#lib/javaBridge";
import { mapAvisClientsStickerPropsClient } from "./avisClientsSticker.mapping";

const t = (k: string) => `t:${k}`;
const settings = (over: Record<string, unknown> = {}) =>
	makeNode({
		props: { isGlobalActive: true, verifiedLogo: "logo.png", avisTitle: "Avis", ...over },
	});

beforeEach(() => {
	vi.mocked(getGlobalSettingsNode).mockReset();
	vi.mocked(getReviewServiceBridge).mockReset();
	siteNode = makeNode();
});

describe("mapAvisClientsStickerPropsClient", () => {
	it("returns {} when there is no settings node", () => {
		vi.mocked(getGlobalSettingsNode).mockReturnValue(null);
		expect(mapAvisClientsStickerPropsClient(makeNode({ props: { isActive: true } }), t)).toEqual(
			{},
		);
	});

	it("returns {} when globally or locally disabled", () => {
		vi.mocked(getGlobalSettingsNode).mockReturnValue(settings({ isGlobalActive: false }));
		expect(mapAvisClientsStickerPropsClient(makeNode({ props: { isActive: true } }), t)).toEqual(
			{},
		);

		vi.mocked(getGlobalSettingsNode).mockReturnValue(settings());
		expect(mapAvisClientsStickerPropsClient(makeNode({ props: { isActive: false } }), t)).toEqual(
			{},
		);
	});

	it("maps logo + title without a rating when the bridge is unavailable", () => {
		vi.mocked(getGlobalSettingsNode).mockReturnValue(settings());
		vi.mocked(getReviewServiceBridge).mockReturnValue(null);
		expect(mapAvisClientsStickerPropsClient(makeNode({ props: { isActive: true } }), t)).toEqual({
			avisLogoUrl: "logo.png",
			avisTitle: "Avis",
		});
	});

	it("adds the live rating when the bridge resolves an average", () => {
		const config = makeNode({ id: "cfg" });
		siteNode = makeNode({ named: { "contents/config/avis-verifies/config": config } });
		vi.mocked(getGlobalSettingsNode).mockReturnValue(settings({ avisTitle: "" }));
		const getAverageRate = vi.fn(() => ({ average: 4.6, nbReview: 240 }));
		vi.mocked(getReviewServiceBridge).mockReturnValue({ fetchReviews: vi.fn(), getAverageRate });

		const result = mapAvisClientsStickerPropsClient(makeNode({ props: { isActive: true } }), t);
		expect(result).toEqual({
			avisLogoUrl: "logo.png",
			avisTitle: "t:footer.avisTitle", // empty title → translation fallback
			ratingScore: 4.6,
			ratingReviewsCount: 240,
		});
		expect(getAverageRate).toHaveBeenCalledWith(config);
	});

	it("skips the rating when no config node is found under the site", () => {
		siteNode = makeNode(); // no named config child
		vi.mocked(getGlobalSettingsNode).mockReturnValue(settings());
		vi.mocked(getReviewServiceBridge).mockReturnValue({
			fetchReviews: vi.fn(),
			getAverageRate: vi.fn(),
		});
		const result = mapAvisClientsStickerPropsClient(makeNode({ props: { isActive: true } }), t);
		expect(result.ratingScore).toBeUndefined();
	});
});
