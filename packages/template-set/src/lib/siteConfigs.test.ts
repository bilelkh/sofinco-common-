import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeNode } from "#test/jahia";

// siteConfigs reads from the real jcr helpers; we keep the data-driven shared impls but
// override getGlobalSettingsNode (which needs the SSR server context) with a controllable mock.
vi.mock("./jcr", async () => {
	const real = await import("#test/jahia");
	return { ...real, getGlobalSettingsNode: vi.fn() };
});

import { getGlobalSettingsNode } from "./jcr";
import {
	getQrAppSettings,
	qrCodePath,
	avisClientPath,
	verifiedReviewConfigRelPath,
} from "./siteConfigs";

beforeEach(() => vi.mocked(getGlobalSettingsNode).mockReset());

describe("path constants", () => {
	it("exposes the expected JCR config paths", () => {
		expect(qrCodePath).toBe("qr-app-settings");
		expect(avisClientPath).toBe("avis-clients-settings");
		expect(verifiedReviewConfigRelPath).toBe("contents/config/avis-verifies/config");
	});
});

describe("getQrAppSettings", () => {
	const site = makeNode();

	it("returns null when there is no app-settings node", () => {
		vi.mocked(getGlobalSettingsNode).mockReturnValue(null);
		expect(getQrAppSettings(site)).toBeNull();
	});

	it("returns null when the app is globally disabled", () => {
		vi.mocked(getGlobalSettingsNode).mockReturnValue(
			makeNode({ props: { isGlobalAppActive: false } }),
		);
		expect(getQrAppSettings(site)).toBeNull();
	});

	it("maps the QR mobile props (with label fallbacks) when active", () => {
		vi.mocked(getGlobalSettingsNode).mockReturnValue(
			makeNode({
				props: { isGlobalAppActive: true, iosUrl: "ios", androidUrl: "and", fallbackNode: "/fb" },
			}),
		);
		expect(getQrAppSettings(site)).toEqual({
			iosUrl: "ios",
			androidUrl: "and",
			fallbackUrl: "/fb",
			ctaLabelHeader: "APP",
			ctaLabelFooter: "Télécharger l'app.",
		});
	});

	it("defaults isGlobalAppActive to true when the property is absent", () => {
		vi.mocked(getGlobalSettingsNode).mockReturnValue(makeNode({ props: { iosUrl: "ios" } }));
		expect(getQrAppSettings(site)).not.toBeNull();
	});
});
