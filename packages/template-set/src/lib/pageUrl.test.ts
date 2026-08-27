import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeNode } from "#test/jahia";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { RenderContext } from "org.jahia.services.render";

vi.mock("#lib/jcr", () => import("#test/jahia"));
// `addDirectChildrenCacheDependency` passe par `useServerContext()`, indisponible
// hors moteur Jahia — on la remplace par un espion pour pouvoir l'assertion-ner.
vi.mock("./cacheDependency", () => ({
	addDirectChildrenCacheDependency: vi.fn(),
}));

import { addDirectChildrenCacheDependency } from "./cacheDependency";
import { resolveOrigin, resolvePageUrl, resolveVanityUrl, toAbsoluteUrl } from "./pageUrl";

const vanity = (
	url: string,
	{
		active = true,
		isDefault = true,
		lang,
	}: { active?: boolean; isDefault?: boolean; lang?: string } = {},
) =>
	makeNode({
		nodeTypes: ["jnt:vanityUrl"],
		props: {
			"j:url": url,
			"j:active": active,
			"j:default": isDefault,
			...(lang === undefined ? {} : { "jcr:language": lang }),
		},
	});

/** Page portant la structure Jahia `page > vanityUrlMapping > * (jnt:vanityUrl)`. */
const pageWith = (...urls: JCRNodeWrapper[]) =>
	makeNode({
		nodeTypes: ["jnt:page"],
		path: "/sites/sofinco/credit-conso",
		url: "/sites/sofinco/credit-conso.html",
		named: { vanityUrlMapping: makeNode({ nodeTypes: ["jnt:vanityUrls"], children: urls }) },
	});

/** Page sans nœud `vanityUrlMapping` du tout. */
const pageWithoutMapping = () =>
	makeNode({
		nodeTypes: ["jnt:page"],
		path: "/sites/sofinco/credit-conso",
		url: "/sites/sofinco/credit-conso.html",
	});

const context = ({
	serverName,
	server = "http://tomcat:8080",
	current = "/fr/current.html",
}: { serverName?: string | null; server?: string; current?: string } = {}) =>
	({
		getSite: () => (serverName === null ? null : { getServerName: () => serverName ?? "" }),
		getURLGenerator: () => ({ getServer: () => server, getCurrent: () => current }),
	}) as unknown as RenderContext;

beforeEach(() => {
	vi.mocked(addDirectChildrenCacheDependency).mockClear();
});

describe("resolveVanityUrl", () => {
	it("retient la vanity par défaut active", () => {
		expect(resolveVanityUrl(pageWith(vanity("/credit-consommation")), "fr")).toBe(
			"/credit-consommation",
		);
	});

	it("ignore les vanity inactives et non-défaut", () => {
		const page = pageWith(
			vanity("/vieux", { active: false }),
			vanity("/alt", { isDefault: false }),
		);
		expect(resolveVanityUrl(page, "fr")).toBe("");
	});

	it("ignore une vanity dont l'URL est vide", () => {
		expect(resolveVanityUrl(pageWith(vanity("   ")), "fr")).toBe("");
	});

	it("préfère la vanity de la langue courante", () => {
		const page = pageWith(
			vanity("/consumer-credit", { lang: "en" }),
			vanity("/credit-consommation", { lang: "fr" }),
		);
		expect(resolveVanityUrl(page, "fr")).toBe("/credit-consommation");
	});

	it("retombe sur n'importe quelle vanity par défaut active quand aucune ne matche la langue", () => {
		const page = pageWith(vanity("/credit-consommation", { lang: "fr" }));
		expect(resolveVanityUrl(page, "de")).toBe("/credit-consommation");
	});

	it("retourne '' sans nœud vanityUrlMapping, et déclare quand même la dépendance de cache", () => {
		expect(resolveVanityUrl(pageWithoutMapping(), "fr")).toBe("");
		expect(addDirectChildrenCacheDependency).toHaveBeenCalledWith(
			expect.anything(),
			"vanityUrlMapping",
		);
	});

	it("retourne '' sans page", () => {
		expect(resolveVanityUrl(null, "fr")).toBe("");
	});

	it("retourne '' quand la lecture JCR lève", () => {
		// Proxy plutôt qu'un objet à méthode levante : le mock `#lib/jcr` lit le bag
		// de données (`__named`) sans passer par `hasNode`, c'est donc l'accès aux
		// propriétés qu'il faut piéger pour atteindre réellement le `catch`.
		const broken = new Proxy({} as JCRNodeWrapper, {
			get() {
				throw new Error("session closed");
			},
		});
		expect(resolveVanityUrl(broken, "fr")).toBe("");
	});
});

describe("resolveOrigin", () => {
	it("préfère le serverName du site à l'URLGenerator", () => {
		expect(resolveOrigin(context({ serverName: "www.sofinco.fr" }))).toBe("https://www.sofinco.fr");
	});

	it("retombe sur l'URLGenerator en local", () => {
		expect(
			resolveOrigin(context({ serverName: "localhost", server: "http://localhost:8080" })),
		).toBe("http://localhost:8080");
	});

	it("retombe sur l'URLGenerator quand le site n'a pas de serverName", () => {
		expect(resolveOrigin(context({ serverName: "", server: "http://localhost:8080" }))).toBe(
			"http://localhost:8080",
		);
	});

	it("respecte un serverName qui porte déjà un schéma, et retire le / final", () => {
		expect(resolveOrigin(context({ serverName: "https://www.sofinco.fr/" }))).toBe(
			"https://www.sofinco.fr",
		);
	});

	it("retombe sur l'URLGenerator quand getSite lève ou renvoie null", () => {
		const throwing = {
			getSite: () => {
				throw new Error("no site");
			},
			getURLGenerator: () => ({ getServer: () => "http://localhost:8080" }),
		} as unknown as RenderContext;
		expect(resolveOrigin(throwing)).toBe("http://localhost:8080");
		expect(resolveOrigin(context({ serverName: null, server: "http://localhost:8080" }))).toBe(
			"http://localhost:8080",
		);
	});

	it("retourne '' quand les deux sources lèvent", () => {
		const broken = {
			getSite: () => {
				throw new Error("no site");
			},
			getURLGenerator: () => {
				throw new Error("no url generator");
			},
		} as unknown as RenderContext;
		expect(resolveOrigin(broken)).toBe("");
	});
});

describe("toAbsoluteUrl", () => {
	it("prefixes a root-relative URL with the origin", () => {
		expect(toAbsoluteUrl("https://www.sofinco.fr", "/files/img.jpg")).toBe(
			"https://www.sofinco.fr/files/img.jpg",
		);
	});

	it("inserts the missing slash on a relative URL", () => {
		expect(toAbsoluteUrl("https://www.sofinco.fr", "files/img.jpg")).toBe(
			"https://www.sofinco.fr/files/img.jpg",
		);
	});

	it("trims a trailing slash on the origin", () => {
		expect(toAbsoluteUrl("https://www.sofinco.fr/", "/img.jpg")).toBe(
			"https://www.sofinco.fr/img.jpg",
		);
	});

	it("leaves absolute and protocol-relative URLs untouched", () => {
		expect(toAbsoluteUrl("https://www.sofinco.fr", "https://cdn.example.com/a.jpg")).toBe(
			"https://cdn.example.com/a.jpg",
		);
		expect(toAbsoluteUrl("https://www.sofinco.fr", "//cdn.example.com/a.jpg")).toBe(
			"//cdn.example.com/a.jpg",
		);
	});

	it("returns the URL as-is when there is no origin, and '' for an empty URL", () => {
		expect(toAbsoluteUrl("", "/img.jpg")).toBe("/img.jpg");
		expect(toAbsoluteUrl("https://www.sofinco.fr", "")).toBe("");
	});
});

describe("resolvePageUrl", () => {
	const origin = "https://www.sofinco.fr";

	it("préfère la vanity URL au chemin technique du nœud", () => {
		expect(
			resolvePageUrl(context(), pageWith(vanity("/credit-consommation/pret-personnel")), {
				origin,
				lang: "fr",
			}),
		).toBe("https://www.sofinco.fr/credit-consommation/pret-personnel");
	});

	it("retombe sur l'URL de nœud sans vanity", () => {
		expect(resolvePageUrl(context(), pageWithoutMapping(), { origin, lang: "fr" })).toBe(
			"https://www.sofinco.fr/sites/sofinco/credit-conso.html",
		);
	});

	it("retombe sur l'URL courante sans URL de nœud", () => {
		const node = makeNode({ nodeTypes: ["jnt:page"] });
		expect(resolvePageUrl(context(), node, { origin, lang: "fr" })).toBe(
			"https://www.sofinco.fr/fr/current.html",
		);
	});

	it("retombe sur l'URL courante sans page du tout", () => {
		expect(resolvePageUrl(context(), null, { origin, lang: "fr" })).toBe(
			"https://www.sofinco.fr/fr/current.html",
		);
	});

	it("retourne '' quand aucune source n'est exploitable", () => {
		const broken = {
			getURLGenerator: () => {
				throw new Error("no url generator");
			},
		} as unknown as RenderContext;
		expect(resolvePageUrl(broken, null, { origin, lang: "fr" })).toBe("");
	});
});
