import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", async () => {
	const real = await import("#test/jahia");
	return { ...real, getGlobalSettingsNode: vi.fn() };
});
vi.mock("#lib/renderContext", () => ({ isEditMode: vi.fn(() => false), addCacheDependency: vi.fn() }));
vi.mock("#lib/siteConfigs", () => ({ qrCodePath: "qr-app-settings" }));

import { getGlobalSettingsNode } from "#lib/jcr";
import { isEditMode } from "#lib/renderContext";
import { mapQrStickerProps } from "./qr.mapper";

const t = (k: string) => `t:${k}`;

const settings = (over: Record<string, unknown> = {}) =>
	makeNode({
		props: {
			isGlobalAppActive: true,
			qrLabel: "Scan",
			qrImageRef: "qr.png",
			iosUrl: "ios",
			androidUrl: "and",
			fallbackNode: "/fb",
			appCtaLabelHeader: "APP2",
			appCtaLabelFooter: "Foot",
			...over,
		},
	});

beforeEach(() => {
	vi.mocked(getGlobalSettingsNode).mockReset();
	vi.mocked(isEditMode).mockReturnValue(false);
});

describe("mapQrStickerProps", () => {
	it("returns the inactive default when there is no settings node", () => {
		vi.mocked(getGlobalSettingsNode).mockReturnValue(null);
		expect(mapQrStickerProps(makeNode({ props: { isActive: true } }), t)).toEqual({
			src: "",
			isActive: false,
		});
	});

	it("returns the inactive default when globally disabled", () => {
		vi.mocked(getGlobalSettingsNode).mockReturnValue(settings({ isGlobalAppActive: false }));
		expect(mapQrStickerProps(makeNode({ props: { isActive: true } }), t)).toEqual({
			src: "",
			isActive: false,
		});
	});

	it("maps the full QR props when global + local are active", () => {
		vi.mocked(getGlobalSettingsNode).mockReturnValue(settings());
		expect(mapQrStickerProps(makeNode({ props: { isActive: true } }), t)).toEqual({
			text: "Scan",
			src: "qr.png",
			isActive: true,
			iosUrl: "ios",
			androidUrl: "and",
			fallbackUrl: "/fb",
			ctaLabelHeader: "APP2",
			ctaLabelFooter: "Foot",
		});
	});

	it("returns the inactive default when local display is off and not in edit mode", () => {
		vi.mocked(getGlobalSettingsNode).mockReturnValue(settings());
		expect(mapQrStickerProps(makeNode({ props: { isActive: false } }), t)).toEqual({
			src: "",
			isActive: false,
		});
	});

	it("renders in edit mode even when local display is off (but isActive stays false)", () => {
		vi.mocked(getGlobalSettingsNode).mockReturnValue(settings({ qrLabel: "" }));
		vi.mocked(isEditMode).mockReturnValue(true);
		const result = mapQrStickerProps(makeNode({ props: { isActive: false } }), t);
		expect(result.isActive).toBe(false);
		expect(result.text).toBe("t:qrSticker.defaultLabel");
		expect(result.src).toBe("qr.png");
	});
});
