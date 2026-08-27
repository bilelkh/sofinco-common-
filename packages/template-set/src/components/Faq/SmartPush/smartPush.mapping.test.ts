import { describe, it, expect, vi } from "vitest";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));

import {
	buildSmartPushInitBody,
	buildSmartPushInitScript,
	buildSmartPushLink,
	mapSmartPushConfig,
	SMARTPUSH_CONFIG_PATH,
	SMARTPUSH_TRIGGER_ID,
} from "./smartPush.mapping";

// Properties authored the way the (externally-owned) spnt:smartPush editor stores them:
// raw JS fragments — `tags` quoted for splicing inside [ ], `extraParams` an object-body
// fragment with its own trailing comma.
const configProps = {
	jsUrl: "https://assets.app.smart-tribune.com/sofinco/PUSH/public/push.main.js",
	analyticsUA: "UA-25995522-1",
	kbId: "198",
	cookieOptin: true,
	customVariables: "",
	tagsOr: true,
	searchFiltered: false,
	tags: '"homepage-push-3847","test-recette-6242"',
	thematicsFilter: "",
	entrypoint: "",
	buildName: "sofinco",
	extraParams: 'customResponses:["sofinco-2057"],',
};

const makeSite = (configNode = makeNode({ props: configProps })) =>
	makeNode({ named: { [SMARTPUSH_CONFIG_PATH]: configNode } });

/** Evaluates the init object-literal string the same way the browser would. */
const evalBody = (body: string): unknown => new Function(`return (${body})`)();

describe("mapSmartPushConfig", () => {
	it("returns null when the site is missing", () => {
		expect(mapSmartPushConfig(null)).toBeNull();
	});

	it("returns null when the config node is absent", () => {
		expect(mapSmartPushConfig(makeNode())).toBeNull();
	});

	it("returns null when mandatory jsUrl/kbId are empty", () => {
		const site = makeSite(makeNode({ props: { ...configProps, jsUrl: "", kbId: "" } }));
		expect(mapSmartPushConfig(site)).toBeNull();
	});

	it("projects the spnt:smartPush node into a raw-fragment DTO", () => {
		expect(mapSmartPushConfig(makeSite())).toEqual({
			jsUrl: "https://assets.app.smart-tribune.com/sofinco/PUSH/public/push.main.js",
			analyticsUA: "UA-25995522-1",
			kbId: "198",
			cookieOptin: true,
			customVariables: "",
			tagsOr: true,
			searchFiltered: false,
			tags: '"homepage-push-3847","test-recette-6242"',
			thematicsFilter: "",
			entrypoint: "",
			buildName: "sofinco",
			extraParams: 'customResponses:["sofinco-2057"],',
		});
	});

	it("defaults searchFiltered to true when the property is unset", () => {
		const { searchFiltered, ...rest } = configProps;
		void searchFiltered;
		expect(mapSmartPushConfig(makeSite(makeNode({ props: rest })))!.searchFiltered).toBe(true);
	});
});

describe("buildSmartPushInitBody", () => {
	const cfg = mapSmartPushConfig(makeSite())!;

	it("splices raw fragments into a valid JS object literal (JSP contract)", () => {
		const body = buildSmartPushInitBody(cfg);
		// The literal must be valid JS and evaluate to the expected stPush.init payload.
		expect(evalBody(body)).toEqual({
			analyticsUA: "UA-25995522-1",
			kbId: 198,
			locale: "fr",
			cookieOptin: true,
			customResponses: ["sofinco-2057"],
			buildName: "sofinco",
			searchFiltered: false,
			filters: { thematics: [], tagsOr: ["homepage-push-3847", "test-recette-6242"] },
		});
	});

	it("uses the `tags` filter key when tagsOr is false", () => {
		const body = buildSmartPushInitBody({ ...cfg, tagsOr: false });
		expect((evalBody(body) as { filters: Record<string, unknown> }).filters).toMatchObject({
			tags: ["homepage-push-3847", "test-recette-6242"],
		});
	});

	it("typed searchFiltered wins over a stray searchFiltered left in extraParams", () => {
		const body = buildSmartPushInitBody({
			...cfg,
			searchFiltered: true,
			extraParams: 'searchFiltered:{ tags: ["sofinco-2057"] },customResponses:["sofinco-2057"],',
		});
		// Last duplicate key wins → the typed boolean, never the object fragment.
		expect((evalBody(body) as { searchFiltered: unknown }).searchFiltered).toBe(true);
	});

	it("omits optional keys when empty and stays valid JS", () => {
		const body = buildSmartPushInitBody({
			...cfg,
			analyticsUA: "",
			buildName: "",
			entrypoint: "",
			customVariables: "",
			extraParams: "",
			tags: "",
			thematicsFilter: "",
		});
		const obj = evalBody(body) as Record<string, unknown>;
		expect(obj).not.toHaveProperty("analyticsUA");
		expect(obj).not.toHaveProperty("buildName");
		expect(obj.filters).toEqual({ thematics: [], tagsOr: [] });
	});
});

describe("buildSmartPushInitScript", () => {
	const cfg = mapSmartPushConfig(makeSite())!;

	it("emits an idempotent lazy-loading bootstrap bound to the trigger", () => {
		const script = buildSmartPushInitScript(cfg);
		expect(script).toContain("window.__ST_PUSH_BOOT__");
		expect(script).toContain("window.stPushJsUrl=JS_URL");
		expect(script).toContain("STPUSHLoaded");
		expect(script).toContain("STPUSHCanBeOpened");
		expect(script).toContain(SMARTPUSH_TRIGGER_ID);
		expect(script).toContain(cfg.jsUrl);
		// the raw init body is inlined into the stPush.init(...) call
		expect(script).toContain(buildSmartPushInitBody(cfg));
	});
});

describe("buildSmartPushLink", () => {
	it("builds the trigger Link with a left icon and the delegated-click id", () => {
		expect(buildSmartPushLink()).toEqual({
			id: SMARTPUSH_TRIGGER_ID,
			href: "#",
			label: "Aide & Contact",
			iconLeft: "message-circle-question-mark",
			iconVariant: "primary",
			tracking: { event: "click_menu_myspace", menu_level_1: "Aide & Contact" },
		});
	});
});
