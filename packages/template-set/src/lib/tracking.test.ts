import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeNode } from "#test/jahia";
import type { RenderContext } from "org.jahia.services.render";

// Keep the data-driven jcr helpers (findAncestor/getChildNode/str) but control the
// settings-node lookup, which depends on the SSR server context.
vi.mock("#lib/jcr", async () => {
	const real = await import("#test/jahia");
	return { ...real, getGlobalSettingsNode: vi.fn() };
});
// `server` / `useServerContext` ne sont jamais atteints ici (tous les helpers sont
// appelés avec un RenderContext explicite), mais ils doivent figurer dans le mock :
// `#lib/renderContext`, désormais importé par `tracking.ts`, les importe, et le mock
// de Vitest lève sur l'accès à un export absent.
vi.mock("@jahia/javascript-modules-library", () => ({
	buildNodeUrl: vi.fn((node: { getUrl(): string }) => node.getUrl()),
	useServerContext: vi.fn(),
	server: { render: { addCacheDependency: vi.fn() } },
}));

import { getGlobalSettingsNode } from "#lib/jcr";
import {
	readGaContainerId,
	readDidomiNoticeId,
	readEulerianConfig,
	buildEulerianPageTag,
	buildTrackingContext,
	buildHeadScripts,
	escapeForInlineScript,
	consentBootstrap,
	consentModeBootstrap,
} from "./tracking";

const site = makeNode();

function settingsParent(
	gaProps: Record<string, string>,
	numberlyProps: Record<string, string>,
	didomiProps: Record<string, string> = {},
) {
	return makeNode({
		named: {
			ga: makeNode({ props: gaProps }),
			numberly: makeNode({ props: numberlyProps }),
			didomi: makeNode({ props: didomiProps }),
		},
	});
}

const NOTICE_ID = "919c37a4-6a0f-451f-93fb-995168820925";

beforeEach(() => vi.mocked(getGlobalSettingsNode).mockReset());

describe("readGaContainerId", () => {
	it("returns a valid GTM id", () => {
		vi.mocked(getGlobalSettingsNode).mockReturnValue(
			settingsParent({ gtmContainerId: "GTM-ABCD12" }, {}),
		);
		expect(readGaContainerId(site)).toBe("GTM-ABCD12");
	});
	it("returns '' for an invalid id", () => {
		vi.mocked(getGlobalSettingsNode).mockReturnValue(
			settingsParent({ gtmContainerId: "nope" }, {}),
		);
		expect(readGaContainerId(site)).toBe("");
	});
	it("returns '' when there is no site", () => {
		expect(readGaContainerId(null)).toBe("");
	});
});

describe("readDidomiNoticeId", () => {
	it("renvoie le notice id quand il est au format UUID", () => {
		vi.mocked(getGlobalSettingsNode).mockReturnValue(
			settingsParent({}, {}, { noticeId: NOTICE_ID }),
		);
		expect(readDidomiNoticeId(site)).toBe(NOTICE_ID);
	});

	it("rejette un id malformé plutôt que d'émettre un loader mort", () => {
		vi.mocked(getGlobalSettingsNode).mockReturnValue(
			settingsParent({}, {}, { noticeId: "919c37a4" }),
		);
		expect(readDidomiNoticeId(site)).toBe("");
	});

	it("renvoie une chaîne vide sans nœud de config", () => {
		vi.mocked(getGlobalSettingsNode).mockReturnValue(null);
		expect(readDidomiNoticeId(site)).toBe("");
		expect(readDidomiNoticeId(null)).toBe("");
	});
});

describe("readEulerianConfig", () => {
	it("returns host + rtgsite for a valid host", () => {
		vi.mocked(getGlobalSettingsNode).mockReturnValue(
			settingsParent({}, { eaTrackerHost: "tag.example.com", rtgsite: "client" }),
		);
		expect(readEulerianConfig(site)).toEqual({
			host: "tag.example.com",
			rtgsite: "client",
			didomiVendorId: "",
		});
	});
	it("defaults rtgsite to 'prospect'", () => {
		vi.mocked(getGlobalSettingsNode).mockReturnValue(
			settingsParent({}, { eaTrackerHost: "tag.example.com" }),
		);
		expect(readEulerianConfig(site)?.rtgsite).toBe("prospect");
	});
	it("remonte l'id vendor Didomi quand il est renseigné", () => {
		vi.mocked(getGlobalSettingsNode).mockReturnValue(
			settingsParent({}, { eaTrackerHost: "tag.example.com", didomiVendorId: "c:eulerian" }),
		);
		expect(readEulerianConfig(site)?.didomiVendorId).toBe("c:eulerian");
	});
	/*
	 * Pas de repli codé en dur, MÊME maintenant qu'on connaît la valeur (`413`, l'id IAB
	 * d'Eulerian relevé sur la notice de production). Un vendor IAB doit encore être activé
	 * dans CHAQUE notice : recopier `413` ici l'imposerait à des environnements où il n'est
	 * peut-être pas activé, et le consentement y serait indéterminé — donc refusé, donc
	 * Eulerian muet. Vide = pas de garde, signalé à l'exécution par
	 * `__SOFINCO_CONSENT_UNGATED__`.
	 */
	it("laisse l'id vendor vide quand la propriété est absente", () => {
		vi.mocked(getGlobalSettingsNode).mockReturnValue(
			settingsParent({}, { eaTrackerHost: "tag.example.com" }),
		);
		expect(readEulerianConfig(site)?.didomiVendorId).toBe("");
	});
	it("returns null for an invalid host", () => {
		vi.mocked(getGlobalSettingsNode).mockReturnValue(
			settingsParent({}, { eaTrackerHost: "not a host" }),
		);
		expect(readEulerianConfig(site)).toBeNull();
	});
});

describe("buildEulerianPageTag", () => {
	const cfg = { host: "h", rtgsite: "client", didomiVendorId: "" };
	const rcWith = (pageNode: ReturnType<typeof makeNode>, uri = "/credit/perso") =>
		({
			getMainResource: () => ({ getNode: () => pageNode }),
			getRequest: () => ({ getRequestURI: () => uri }),
		}) as unknown as RenderContext;

	it("builds the alternating EA_push array for a taggable page", () => {
		const pageNode = makeNode({
			nodeTypes: ["jnt:page", "spmix:eaPageOptions"],
			props: { pg: "PG", pagename: "PageName" },
		});
		const tag = buildEulerianPageTag(rcWith(pageNode), cfg);
		expect(tag?.slice(0, 8)).toEqual([
			"rtgsite",
			"client",
			"rtgpg",
			"PG",
			"rtgpagename",
			"PageName",
			"path",
			"|credit|perso",
		]);
	});

	it("returns null when the page lacks the eaPageOptions mixin", () => {
		const pageNode = makeNode({ nodeTypes: ["jnt:page"] });
		expect(buildEulerianPageTag(rcWith(pageNode), cfg)).toBeNull();
	});

	it("returns null when there is no ancestor page", () => {
		const orphan = makeNode({ nodeTypes: ["spnt:news"] });
		expect(buildEulerianPageTag(rcWith(orphan), cfg)).toBeNull();
	});
});

describe("buildTrackingContext", () => {
	it("assembles global + page + categorisation context", () => {
		vi.mocked(getGlobalSettingsNode).mockReturnValue(
			settingsParent({ env_template: "prod", canal_origin: "web" }, {}),
		);
		const pageNode = makeNode({
			nodeTypes: ["jnt:page", "spmix:eaPageOptions"],
			url: "/credit",
			props: {
				"jcr:title": "Crédit",
				"pagename": "credit_home",
				"idmetacat": "M",
				"idcat": "C",
				"idsubcat": "S",
				"pg": "PG",
			},
		});
		const rc = {
			getSite: () => site,
			getMainResource: () => ({ getNode: () => pageNode }),
			getURLGenerator: () => ({
				getServer: () => "https://www.sofinco.fr",
				getCurrent: () => "/credit",
			}),
			getRequest: () => ({ getQueryString: () => "a=1", getRequestURI: () => "/credit" }),
		} as unknown as RenderContext;

		expect(buildTrackingContext(rc)).toMatchObject({
			env_template: "prod",
			canal_origin: "web",
			page_title: "Crédit",
			page_url: "https://www.sofinco.fr/credit?a=1",
			virtualPageTitle: "credit_home",
			virtualPageURL: "credit_home",
			page_type: "PG",
			page_category_level_1: "M",
			page_category_level_2: "C",
			page_category_level_3: "S",
			page_template: "PG",
		});
	});
});

/**
 * Câblage anciennement inline dans `templates/Layout.tsx` — donc hors couverture.
 * Une chaîne vide vaut « ne rends pas ce <script> » : c'est ce contrat que ces
 * tests verrouillent. `trackingBootstrap` est stubbé à "" par le plugin
 * `?inline-script` de `vitest.config.ts`.
 */
describe("buildHeadScripts", () => {
	const taggablePage = makeNode({
		nodeTypes: ["jnt:page", "spmix:eaPageOptions"],
		url: "/credit",
		props: { "jcr:title": "Crédit", "pg": "PG", "pagename": "credit_home" },
	});

	const rcWith = (pageNode = taggablePage) =>
		({
			// Navigation réelle, AFFIRMÉE. Sans cette méthode les tests ci-dessous
			// passeraient par le repli « au moindre doute, mode live » : ils
			// vérifieraient le filet de sécurité, pas le mode live lui-même.
			isLiveMode: () => true,
			getSite: () => site,
			getMainResource: () => ({ getNode: () => pageNode }),
			getURLGenerator: () => ({
				getServer: () => "https://www.sofinco.fr",
				getCurrent: () => "/credit",
			}),
			getRequest: () => ({ getQueryString: () => "", getRequestURI: () => "/credit" }),
		}) as unknown as RenderContext;

	it("émet GTM et Eulerian quand les deux canaux sont configurés", () => {
		vi.mocked(getGlobalSettingsNode).mockReturnValue(
			settingsParent({ gtmContainerId: "GTM-ABCD12" }, { eaTrackerHost: "tag.example.com" }),
		);
		const scripts = buildHeadScripts(rcWith());

		expect(scripts.gtmId).toBe("GTM-ABCD12");
		expect(scripts.gtmSnippet).toContain("'GTM-ABCD12'");
		expect(scripts.eulerianBootstrap).toContain("'tag.example.com','EA_push'");
		expect(scripts.eulerianPageTag).toContain('"rtgpg","PG"');
	});

	it("n'émet ni snippet GTM ni noscript quand le container est absent", () => {
		vi.mocked(getGlobalSettingsNode).mockReturnValue(
			settingsParent({}, { eaTrackerHost: "tag.example.com" }),
		);
		const scripts = buildHeadScripts(rcWith());

		expect(scripts.gtmId).toBe("");
		expect(scripts.gtmSnippet).toBe("");
		// Eulerian reste indépendant de GA.
		expect(scripts.eulerianBootstrap).not.toBe("");
	});

	it("n'émet aucun script Eulerian quand l'hôte n'est pas configuré", () => {
		vi.mocked(getGlobalSettingsNode).mockReturnValue(
			settingsParent({ gtmContainerId: "GTM-ABCD12" }, {}),
		);
		const scripts = buildHeadScripts(rcWith());

		expect(scripts.eulerianBootstrap).toBe("");
		expect(scripts.eulerianPageTag).toBe("");
		expect(scripts.gtmSnippet).not.toBe("");
	});

	it("garde loader et EA_push en phase quand la page n'est pas taggable", () => {
		vi.mocked(getGlobalSettingsNode).mockReturnValue(
			settingsParent({}, { eaTrackerHost: "tag.example.com" }),
		);
		const scripts = buildHeadScripts(rcWith(makeNode({ nodeTypes: ["jnt:page"] })));

		// Config Eulerian valide mais page sans `spmix:eaPageOptions` : émettre le
		// loader seul chargerait le tag sans jamais pousser d'événement de page.
		expect(scripts.eulerianBootstrap).toBe("");
		expect(scripts.eulerianPageTag).toBe("");
	});

	/**
	 * Un `RenderContext` de contribution : `isLiveMode` répond `false` quel que soit
	 * l'outil, c'est le seul signal lu. Le mode nommé est posé en plus pour que la
	 * fixture ressemble au contexte réel et pour nommer le cas dans le rapport.
	 */
	const authoringRc = (mode: "isEditMode" | "isPreviewMode" | "isContributionMode") =>
		({
			...(rcWith() as unknown as object),
			isLiveMode: () => false,
			[mode]: () => true,
		}) as unknown as RenderContext;

	it.each(["isEditMode", "isPreviewMode", "isContributionMode"] as const)(
		"n'émet aucun tag éditeur en contribution (%s)",
		(mode) => {
			vi.mocked(getGlobalSettingsNode).mockReturnValue(
				settingsParent(
					{ gtmContainerId: "GTM-ABCD12" },
					{ eaTrackerHost: "tag.example.com" },
					{ noticeId: NOTICE_ID },
				),
			);
			const scripts = buildHeadScripts(authoringRc(mode));

			// gtmId vide éteint aussi le <noscript> du body, côté Layout.
			expect(scripts.gtmId).toBe("");
			expect(scripts.gtmSnippet).toBe("");
			expect(scripts.eulerianBootstrap).toBe("");
			expect(scripts.eulerianPageTag).toBe("");
			/*
			 * Les défauts Consent Mode suivent le CMP : sans bannière à afficher, il n'y a
			 * pas de consentement à recueillir, donc aucun signal à poser. Les poser quand
			 * même n'aurait qu'un effet — bloquer des tags qui, de toute façon, ne sont pas
			 * émis en contribution.
			 */
			expect(scripts.consentMode).toBe("");
			/*
			 * Le CMP suit la même règle : une modale de consentement par-dessus le Page
			 * Builder le rendrait inutilisable, et le consentement d'un contributeur n'a
			 * aucune valeur. Les TROIS modes comptent — c'est en aperçu, pas en édition,
			 * qu'on cherche d'abord à vérifier un rendu.
			 */
			expect(scripts.didomiBootstrap).toBe("");
			// Le délégué de clics reste posé : les îlots hydratés appellent trackEvent.
			expect(scripts.trackingContext).toContain("window.__SOFINCO_TRACKING_CONTEXT__=");
			/*
			 * Celui du consentement aussi, sans condition : il ne dépend d'aucune config
			 * et reste inerte tant qu'aucun CMP n'est chargé. Comparaison au script du
			 * module plutôt qu'à son contenu — les imports `?inline-script` sont
			 * neutralisés sous Vitest, et le comportement a ses propres tests DOM
			 * (consent-bootstrap.test.ts).
			 */
			expect(scripts.consentBootstrap).toBe(consentBootstrap);
		},
	);

	it("émet le loader Didomi avec le notice id configuré", () => {
		vi.mocked(getGlobalSettingsNode).mockReturnValue(
			settingsParent({ gtmContainerId: "GTM-ABCD12" }, {}, { noticeId: NOTICE_ID }),
		);
		const scripts = buildHeadScripts(rcWith());

		expect(scripts.didomiBootstrap).toContain(`("${NOTICE_ID}")`);
		expect(scripts.didomiBootstrap).toContain("__tcfapi");
	});

	it("n'émet aucun loader Didomi sans notice id valide", () => {
		vi.mocked(getGlobalSettingsNode).mockReturnValue(settingsParent({}, {}, { noticeId: "nope" }));
		expect(buildHeadScripts(rcWith()).didomiBootstrap).toBe("");
	});

	/*
	 * LIMITE ASSUMÉE de ces deux cas : `?inline-script` est stubbé à "" sous Vitest, donc
	 * les deux branches produisent la même valeur et l'assertion ne distingue rien. Elles
	 * documentent l'intention et rattraperaient un refactor qui renverrait autre chose.
	 *
	 * Ce qui est RÉELLEMENT vérifiable, c'est la dépendance au CMP à travers la garde
	 * Eulerian — construite par template littéral, donc non stubbée : cf. « n'émet aucune
	 * garde quand aucun CMP n'est configuré » plus bas. Le comportement du script, lui, a
	 * son propre banc DOM (consent-mode-bootstrap.test.ts).
	 */
	it("émet les défauts Consent Mode avec le CMP", () => {
		vi.mocked(getGlobalSettingsNode).mockReturnValue(
			settingsParent({ gtmContainerId: "GTM-ABCD12" }, {}, { noticeId: NOTICE_ID }),
		);
		expect(buildHeadScripts(rcWith()).consentMode).toBe(consentModeBootstrap);
	});

	/*
	 * Sans CMP, poser des défauts « denied » que rien ne viendrait jamais mettre à jour
	 * éteindrait toute la mesure. Le comportement d'avant est alors conservé à
	 * l'identique — c'est le seul cas où l'absence de signal est le bon choix.
	 */
	it("n'émet aucun défaut Consent Mode sans CMP configuré", () => {
		vi.mocked(getGlobalSettingsNode).mockReturnValue(
			settingsParent({ gtmContainerId: "GTM-ABCD12" }, {}, { noticeId: "nope" }),
		);
		expect(buildHeadScripts(rcWith()).consentMode).toBe("");
	});

	it("conditionne loader et EA_push Eulerian au consentement du vendor", () => {
		vi.mocked(getGlobalSettingsNode).mockReturnValue(
			settingsParent(
				{},
				{ eaTrackerHost: "tag.example.com", didomiVendorId: "c:eulerian" },
				{ noticeId: NOTICE_ID },
			),
		);
		const scripts = buildHeadScripts(rcWith());

		// Les DEUX sont gardés, par le même vendor : un loader chargé sans son EA_push
		// déposerait le cookie Eulerian sans jamais mesurer quoi que ce soit.
		expect(scripts.eulerianBootstrap).toContain(`window.__SOFINCO_ON_CONSENT__("c:eulerian"`);
		expect(scripts.eulerianPageTag).toContain(`window.__SOFINCO_ON_CONSENT__("c:eulerian"`);
		// Le tag lui-même est bien à l'intérieur de la garde, pas à côté.
		expect(scripts.eulerianBootstrap).toContain("'tag.example.com','EA_push'");
		expect(scripts.eulerianPageTag).toContain('"rtgpg","PG"');
	});

	/*
	 * Repli explicite du CND : sans id vendor, le tag part comme avant. Mieux vaut une
	 * non-conformité visible et documentée qu'un tag éteint sans que personne ne
	 * comprenne pourquoi.
	 */
	it("émet Eulerian sans garde quand aucun id vendor n'est configuré", () => {
		vi.mocked(getGlobalSettingsNode).mockReturnValue(
			settingsParent({}, { eaTrackerHost: "tag.example.com" }, { noticeId: NOTICE_ID }),
		);
		const scripts = buildHeadScripts(rcWith());

		expect(scripts.eulerianBootstrap).not.toContain("__SOFINCO_ON_CONSENT__");
		expect(scripts.eulerianPageTag).not.toContain("__SOFINCO_ON_CONSENT__");
	});

	/*
	 * Le pendant du test précédent, et le seul qui rende ce repli réellement « visible » :
	 * sans ce marqueur, une page servant Eulerian SANS garde est indiscernable, dans le
	 * navigateur, d'une page où la garde passe. C'est ainsi que le trou a vécu en production.
	 */
	it("signale l'absence de garde dans __SOFINCO_CONSENT_UNGATED__", () => {
		vi.mocked(getGlobalSettingsNode).mockReturnValue(
			settingsParent({}, { eaTrackerHost: "tag.example.com" }, { noticeId: NOTICE_ID }),
		);
		const scripts = buildHeadScripts(rcWith());

		expect(scripts.eulerianBootstrap).toContain("__SOFINCO_CONSENT_UNGATED__");
		expect(scripts.eulerianBootstrap).toContain("push('eulerian')");
		// Sur le seul bootstrap : `eulerianPageTag` le pousserait une seconde fois.
		expect(scripts.eulerianPageTag).not.toContain("__SOFINCO_CONSENT_UNGATED__");
	});

	it("ne signale rien quand la garde est en place", () => {
		vi.mocked(getGlobalSettingsNode).mockReturnValue(
			settingsParent(
				{},
				{ eaTrackerHost: "tag.example.com", didomiVendorId: "413" },
				{ noticeId: NOTICE_ID },
			),
		);
		const scripts = buildHeadScripts(rcWith());

		expect(scripts.eulerianBootstrap).not.toContain("__SOFINCO_CONSENT_UNGATED__");
		expect(scripts.eulerianBootstrap).toContain(`window.__SOFINCO_ON_CONSENT__("413"`);
	});

	it("n'émet aucune garde quand aucun CMP n'est configuré", () => {
		vi.mocked(getGlobalSettingsNode).mockReturnValue(
			settingsParent({}, { eaTrackerHost: "tag.example.com", didomiVendorId: "c:eulerian" }, {}),
		);
		const scripts = buildHeadScripts(rcWith());

		expect(scripts.consentMode).toBe("");
		expect(scripts.eulerianBootstrap).not.toContain("__SOFINCO_ON_CONSENT__");
		// Pas de CMP = aucun consentement à recueillir, donc aucune anomalie à signaler.
		expect(scripts.eulerianBootstrap).not.toContain("__SOFINCO_CONSENT_UNGATED__");
	});

	it("émet toujours le délégué de consentement, quelle que soit la config", () => {
		vi.mocked(getGlobalSettingsNode).mockReturnValue(settingsParent({}, {}));
		expect(buildHeadScripts(rcWith()).consentBootstrap).toBe(consentBootstrap);
	});

	it("émet toujours le contexte de tracking, échappé pour un <script> inline", () => {
		vi.mocked(getGlobalSettingsNode).mockReturnValue(settingsParent({}, {}));
		const pageNode = makeNode({
			nodeTypes: ["jnt:page"],
			url: "/credit",
			props: { "jcr:title": "a<b" },
		});
		const scripts = buildHeadScripts(rcWith(pageNode));

		expect(scripts.trackingContext).toContain("window.__SOFINCO_TRACKING_CONTEXT__=");
		expect(scripts.trackingContext).toContain("a\\u003cb");
		expect(scripts.trackingContext).not.toContain("a<b");
	});
});

describe("escapeForInlineScript", () => {
	it("escapes <, --> and line/paragraph separators", () => {
		expect(escapeForInlineScript("a<b")).toBe("a\\u003cb");
		expect(escapeForInlineScript("x-->y")).toBe("x--\\u003ey");
		expect(escapeForInlineScript("a\u2028b\u2029c")).toBe("a\\u2028b\\u2029c");
	});
});
