import { describe, it, expect } from "vitest";
import { pickMobileAppHref } from "./mobileAppHref";

const IPHONE =
	"Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const IPAD =
	"Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const ANDROID =
	"Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
const DESKTOP =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const urls = {
	hrefIos: "https://apps.apple.com/app",
	hrefAndroid: "https://play.google.com/store/apps",
	fallbackHref: "https://sofinco.fr/app",
};

describe("pickMobileAppHref", () => {
	it("serves the App Store URL on iPhone and iPad", () => {
		expect(pickMobileAppHref(IPHONE, urls)).toBe(urls.hrefIos);
		expect(pickMobileAppHref(IPAD, urls)).toBe(urls.hrefIos);
	});

	it("serves the Play Store URL on Android", () => {
		expect(pickMobileAppHref(ANDROID, urls)).toBe(urls.hrefAndroid);
	});

	it("falls back on desktop, on an empty user-agent, and when the matching store URL is missing", () => {
		expect(pickMobileAppHref(DESKTOP, urls)).toBe(urls.fallbackHref);
		expect(pickMobileAppHref("", urls)).toBe(urls.fallbackHref);
		expect(pickMobileAppHref(ANDROID, { hrefIos: urls.hrefIos, fallbackHref: "/repli" })).toBe(
			"/repli",
		);
	});

	it("returns undefined when no fallback is provided and no store URL matches", () => {
		expect(pickMobileAppHref(DESKTOP, { hrefIos: urls.hrefIos })).toBeUndefined();
	});
});
