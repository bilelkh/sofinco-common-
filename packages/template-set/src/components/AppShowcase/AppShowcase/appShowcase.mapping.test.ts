import { describe, it, expect, vi, beforeEach } from "vitest";
import type { JCRNodeWrapper } from "org.jahia.services.content";

// The real `#lib/jcr` helpers pull in the whole Jahia SSR library chain
// (`@jahia/javascript-modules-library`, `useServerContext`, i18n…), which cannot
// run in a plain node test. We mock them and drive their return values from a
// `__props` bag carried by each fake node, so the mapping logic itself is what's
// under test. Same for the QR mapper, whose own dependency tree is irrelevant here.
vi.mock("#lib/jcr", () => ({
	str: vi.fn(),
	imgUrl: vi.fn(),
	getChildNodesByType: vi.fn(),
	getChildNode: vi.fn(),
}));
vi.mock("#cms/QrSticker/qr.mapper", () => ({
	mapQrStickerProps: vi.fn(),
}));
vi.mock("#lib/renderContext", () => ({
	addCacheDependency: vi.fn(),
}));

import { str, imgUrl, getChildNodesByType, getChildNode } from "#lib/jcr";
import { mapQrStickerProps } from "#cms/QrSticker/qr.mapper";
import { addCacheDependency } from "#lib/renderContext";
import { mapAppShowcasePropsServer, mapAppMobilePropsClient } from "./appShowcase.mapping";

/** Minimal stand-in for a JCRNodeWrapper: a property bag + optional children / qr node. */
interface FakeNode {
	__props?: Record<string, string>;
	__children?: JCRNodeWrapper[];
	__qr?: JCRNodeWrapper | null;
	getPath: () => string;
}

function fakeNode(
	props: Record<string, string> = {},
	children: JCRNodeWrapper[] = [],
	qr: JCRNodeWrapper | null = null,
): JCRNodeWrapper {
	const node: FakeNode = {
		__props: props,
		__children: children,
		__qr: qr,
		getPath: () => "/sites/demo/home/appShowcase",
	};
	return node as unknown as JCRNodeWrapper;
}

const t = (key: string) => key;

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(str).mockImplementation(
		(node: JCRNodeWrapper, prop: string) => (node as unknown as FakeNode).__props?.[prop] ?? "",
	);
	vi.mocked(imgUrl).mockImplementation(
		(node: JCRNodeWrapper, prop: string) => (node as unknown as FakeNode).__props?.[prop] ?? "",
	);
	vi.mocked(getChildNodesByType).mockImplementation(
		(node: JCRNodeWrapper) => (node as unknown as FakeNode).__children ?? [],
	);
	// Mirrors the real helper: a `hasNode` miss returns null rather than letting the raw
	// JCR `getNode` throw a PathNotFoundException.
	vi.mocked(getChildNode).mockImplementation((node: JCRNodeWrapper, name: string) =>
		name === "qrCode" ? ((node as unknown as FakeNode).__qr ?? null) : null,
	);
	vi.mocked(mapQrStickerProps).mockReturnValue({
		src: "qr.png",
		iosUrl: "https://ios",
		androidUrl: "https://android",
	} as ReturnType<typeof mapQrStickerProps>);
});

describe("mapAppShowcasePropsServer", () => {
	it("maps every common property when present", () => {
		const node = fakeNode({
			"backgroundColor": "white",
			"mainIcon": "icon.svg",
			"jcr:title": "Mon appli",
			"subtitle": "Sous-titre",
			"mobileImage": "mobile.jpg",
		});

		expect(mapAppShowcasePropsServer(node)).toEqual({
			backgroundColor: "white",
			mainIconUrl: "icon.svg",
			title: "Mon appli",
			subtitle: "Sous-titre",
			mobileImageUrl: "mobile.jpg",
		});
	});

	it("falls back to 'blueDark' background and empty strings when properties are missing", () => {
		const result = mapAppShowcasePropsServer(fakeNode());
		expect(result.backgroundColor).toBe("blueDark");
		expect(result.title).toBe("");
		expect(result.subtitle).toBe("");
		expect(result.mainIconUrl).toBe("");
	});
});

describe("mapAppMobilePropsClient", () => {
	it("maps the single image and wires the QR code data", () => {
		const node = fakeNode(
			{
				"backgroundColor": "white",
				"mainIcon": "picto.svg",
				"jcr:title": "Titre",
				"subtitle": "Sub",
				"mobileImage": "mobile.jpg",
			},
			[],
			fakeNode(),
		);

		const result = mapAppMobilePropsClient(node, t);

		expect(result.img).toBe("mobile.jpg");
		expect(result.picto).toBe("picto.svg");
		expect(result.imgQrCode).toBe("qr.png");
		expect(result.mobileCtaHrefIos).toBe("https://ios");
		expect(result.mobileCtaHrefAndroid).toBe("https://android");
	});

	it("leaves the QR fields undefined and skips the QR mapper when there is no qrCode node", () => {
		const node = fakeNode({ mobileImage: "mobile.jpg" });

		const result = mapAppMobilePropsClient(node, t);

		expect(getChildNode).toHaveBeenCalledWith(node, "qrCode");
		expect(mapQrStickerProps).not.toHaveBeenCalled();
		expect(result.imgQrCode).toBeUndefined();
		expect(result.mobileCtaHrefIos).toBeUndefined();
		expect(result.mobileCtaHrefAndroid).toBeUndefined();
		expect(result.img).toBe("mobile.jpg");
	});

	it("passes the qrCode node and the translation function to the QR mapper", () => {
		const qr = fakeNode();
		mapAppMobilePropsClient(fakeNode({}, [], qr), t);

		expect(mapQrStickerProps).toHaveBeenCalledWith(qr, t);
	});

	it("tolerates a QR mapping without urls", () => {
		vi.mocked(mapQrStickerProps).mockReturnValue({
			src: "qr.png",
		} as ReturnType<typeof mapQrStickerProps>);

		const result = mapAppMobilePropsClient(fakeNode({}, [], fakeNode()), t);

		expect(result.imgQrCode).toBe("qr.png");
		expect(result.mobileCtaHrefIos).toBeUndefined();
		expect(result.mobileCtaHrefAndroid).toBeUndefined();
	});

	it("falls back to an empty string when the image is not set", () => {
		expect(mapAppMobilePropsClient(fakeNode({}, [], fakeNode()), t).img).toBe("");
	});

	it("maps feature children into cards and caps them at 4", () => {
		const features = Array.from({ length: 6 }, (_, i) =>
			fakeNode({ "jcr:title": `Feature ${i}`, "description": `Text ${i}`, "icon": `icon${i}.svg` }),
		);
		const node = fakeNode({}, features, fakeNode());

		const cards = mapAppMobilePropsClient(node, t).cards;

		expect(cards).toHaveLength(4);
		expect(cards[0]).toEqual({
			id: 0,
			label: "Feature 0",
			labelComplement: "Text 0",
			picto: "icon0.svg",
		});
		expect(cards.map((card) => card.id)).toEqual([0, 1, 2, 3]);
	});

	it("returns no cards when the node has no feature children", () => {
		expect(mapAppMobilePropsClient(fakeNode({}, [], fakeNode()), t).cards).toEqual([]);
	});

	describe("when the autocreated qrCode child has been deleted", () => {
		// `qrCode` is mandatory/autocreated, but a contributor can still remove it.
		// The mapping must degrade instead of throwing and taking the page down.
		it("still renders the rest of the props", () => {
			const node = fakeNode(
				{ "jcr:title": "Titre", "mobileImage": "mobile.jpg", "mainIcon": "picto.svg" },
				[fakeNode({ "jcr:title": "Feature 0" })],
				null,
			);

			const result = mapAppMobilePropsClient(node, t);

			expect(result.title).toBe("Titre");
			expect(result.img).toBe("mobile.jpg");
			expect(result.picto).toBe("picto.svg");
			expect(result.cards).toHaveLength(1);
		});

		it("leaves the QR-derived props undefined and never calls the QR mapper", () => {
			const result = mapAppMobilePropsClient(fakeNode({}, [], null), t);

			expect(result.imgQrCode).toBeUndefined();
			expect(result.mobileCtaHrefIos).toBeUndefined();
			expect(result.mobileCtaHrefAndroid).toBeUndefined();
			expect(mapQrStickerProps).not.toHaveBeenCalled();
		});

		it("declares a cache dependency on the missing child's path so its recreation flushes the fragment", () => {
			mapAppMobilePropsClient(fakeNode({}, [], null), t);

			expect(addCacheDependency).toHaveBeenCalledWith({
				path: "/sites/demo/home/appShowcase/qrCode",
			});
		});
	});
});
