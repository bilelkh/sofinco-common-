import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));

import {
	buildConnectUrl,
	mapLoginButtonProps,
	CONNECT_ACTION,
	DEFAULT_LABEL,
	DEFAULT_REDIRECT_URL,
} from "./loginButton.mapping";

describe("buildConnectUrl", () => {
	it("builds the jahia-oauth connect-action URL and preserves the naming contract", () => {
		const url = buildConnectUrl("/cms/render/live/fr", "/sites/sofinco/home");
		expect(url).toBe("/cms/render/live/fr/sites/sofinco/home.connectToSofincoAction.do");
		// Guardrail: the suffix must match connectToActionName in the sofinco-core .cfg.
		expect(url.endsWith(`.${CONNECT_ACTION}.do`)).toBe(true);
		expect(url.endsWith(".connectToSofincoAction.do")).toBe(true);
	});
});

describe("mapLoginButtonProps", () => {
	it("reads the contributed label, redirect URL and variant", () => {
		const node = makeNode({
			props: { buttonLabel: "Connexion", redirectUrl: "/espace-client", variant: "accent" },
		});
		expect(mapLoginButtonProps(node)).toEqual({
			label: "Connexion",
			redirectUrl: "/espace-client",
			variant: "accent",
		});
	});

	it("falls back to defaults when the fields are blank", () => {
		const node = makeNode({});
		expect(mapLoginButtonProps(node)).toEqual({
			label: DEFAULT_LABEL,
			redirectUrl: DEFAULT_REDIRECT_URL,
			variant: "primary",
		});
	});

	it.each([
		["//evil.com", DEFAULT_REDIRECT_URL],
		["/\\evil.com", DEFAULT_REDIRECT_URL],
		["/foo\\bar", DEFAULT_REDIRECT_URL],
		["/\tfoo", DEFAULT_REDIRECT_URL],
		["/ foo", DEFAULT_REDIRECT_URL],
		["https://evil.com", DEFAULT_REDIRECT_URL],
		["http://evil.com", DEFAULT_REDIRECT_URL],
		["javascript:alert(1)", DEFAULT_REDIRECT_URL],
		["evil.com", DEFAULT_REDIRECT_URL],
		["/espace-client", "/espace-client"],
		["/espace-client?foo=bar&baz=1", "/espace-client?foo=bar&baz=1"],
		["/", "/"],
	])("rejects off-site redirectUrl %p, keeping only same-origin paths", (input, expected) => {
		const node = makeNode({ props: { redirectUrl: input } });
		expect(mapLoginButtonProps(node).redirectUrl).toBe(expected);
	});
});
