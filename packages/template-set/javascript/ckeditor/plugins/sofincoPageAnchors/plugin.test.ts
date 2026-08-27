/*
 * Premiers tests du plugin « Ancres de la page ».
 *
 * Ce fichier portait plus de mille lignes sans le moindre filet, et il ne POUVAIT pas en
 * avoir : `vitest.config` ne regardait que `src/`, et les helpers vivent dans une IIFE.
 * Les deux verrous sont levés — l'inclusion couvre `javascript/`, et le plugin publie ses
 * fonctions pures derrière un drapeau de test.
 *
 * On couvre ici ce qui a réellement cassé ou failli casser : la normalisation des ancres
 * (qui doit rester d'accord avec le serveur), la construction des identifiants, le bornage
 * de la liste, et l'empreinte qui décide de rouvrir le menu.
 *
 * `happy-dom` est nécessaire : `buildContentAnchors` s'appuie sur `DOMParser`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	PAGE_ANCHORS_API_KEYS,
	closePageAnchorsPlugin,
	loadPageAnchorsPlugin,
	type PageAnchorsApi,
} from "./loadPlugin";

let api: PageAnchorsApi;

beforeAll(() => {
	api = loadPageAnchorsPlugin();
});

// La fenêtre happy-dom porte timers et observateurs : sans fermeture, elle retient le worker
// Vitest après la fin du fichier.
afterAll(async () => {
	await closePageAnchorsPlugin();
});

describe("normalizeNumber", () => {
	/*
	 * CONTRAT INTER-MODULES : cette fonction doit répondre comme `normalizeFootnoteRef`
	 * (#lib/footnotes) sur les mêmes entrées. Le plugin insère `href="#footerN"` ; le serveur
	 * décide quel `id="footerN"` il émet. S'ils divergent, le menu propose des liens vers des
	 * cibles que la page ne rend pas — et personne ne s'en aperçoit avant la recette.
	 */
	it.each([
		["nombre nu", "1", "1"],
		["nombre parenthésé", "(1)", "1"],
		["parenthèses doublées", "((3))", "3"],
		["espaces autour", "  (10)  ", "10"],
		["balises inline", "<b>(2)</b>", "2"],
		["entités insécables", "&nbsp;(4)&nbsp;", "4"],
		["entité en majuscules", "&NBSP;(5)", "5"],
	])("ramène %s à son numéro", (_label, input, expected) => {
		expect(api.normalizeNumber(input)).toBe(expected);
	});

	it.each([
		["chaîne vide", ""],
		["espaces seuls", "   "],
		["parenthèses vides", "()"],
		["parenthèses vides doublées", "(())"],
		["entité insécable", "&nbsp;"],
		["balise vide", "<b></b>"],
		["balise ne contenant qu'un espace", "<i> </i>"],
	])("ne désigne aucune note pour %s", (_label, input) => {
		expect(api.normalizeNumber(input)).toBe("");
	});

	it("tolère null et undefined", () => {
		expect(api.normalizeNumber(null)).toBe("");
		expect(api.normalizeNumber(undefined)).toBe("");
	});
});

describe("footnoteId", () => {
	it("fait tomber `n` et `(n)` sur la même cible", () => {
		expect(api.footnoteId("1")).toBe(api.footnoteId("(1)"));
		expect(api.footnoteId("1")).toBe("footer1");
	});

	it("encode un marqueur non alphanumérique de façon déterministe", () => {
		expect(api.footnoteId("*")).toBe("footerU002A");
	});
});

describe("declaredAnchorOf", () => {
	/*
	 * Depuis que `anchor` est facultatif sur `sofnt:mentionLegalItem`, une mention peut être
	 * un texte libre. La lister proposerait un lien vers `#footer`, cible qu'aucune page ne
	 * rend — un lien mort posé par l'outil censé garantir des ancres valides.
	 */
	it.each([
		["", "champ vide"],
		["   ", "espaces"],
		["()", "parenthèses vides"],
		["&nbsp;", "entité"],
	])("écarte une mention dont l'ancre est %o (%s)", (anchor) => {
		expect(
			api.declaredAnchorOf({ isMentionLegalItem: true, anchor: { value: anchor } }),
		).toBeNull();
	});

	it("retient une mention numérotée et vise son paragraphe de note", () => {
		const declared = api.declaredAnchorOf({
			isMentionLegalItem: true,
			anchor: { value: "(2)" },
			mentionContent: { value: "<p>(2) Le crédit vous engage.</p>" },
		});

		expect(declared).toMatchObject({ fragment: "footer2", kind: "footnote", number: "2" });
		// Le numéro répété en tête du contenu est retiré de l'aperçu : « 2 · (2) Le crédit… »
		// serait illisible dans le menu.
		expect(String(declared?.preview)).toBe("Le crédit vous engage.");
	});

	it("rend une ancre de section BRUTE, sans slugification", () => {
		// `baseAnchor` est rendu tel quel par le legacy : le transformer casserait la cible.
		expect(api.declaredAnchorOf({ baseAnchor: { value: "Mon Ancre" } })).toMatchObject({
			fragment: "Mon Ancre",
			kind: "section",
		});
	});
});

describe("capAnchors", () => {
	const anchor = (i: number, source: string) => ({
		fragment: `${source}-${i}`,
		label: String(i),
		kind: "section",
		source,
	});

	it("laisse passer TOUTES les ancres déclarées, quel qu'en soit le nombre", () => {
		// Ce sont celles qu'un contributeur a posées volontairement : jamais tronquées.
		const list = Array.from({ length: 40 }, (_, i) => anchor(i, "declared"));
		const capped = api.capAnchors(list);

		expect(capped.list).toHaveLength(40);
		expect(capped.hidden).toBe(0);
	});

	it("plafonne les ancres héritées du contenu et ANNONCE le reste", () => {
		const list = Array.from({ length: 30 }, (_, i) => anchor(i, "content"));
		const capped = api.capAnchors(list);

		expect(capped.list).toHaveLength(25);
		expect(capped.hidden).toBe(5);
	});

	it("place les déclarées avant les héritées", () => {
		const capped = api.capAnchors([anchor(1, "content"), anchor(2, "declared")]);
		expect(capped.list.map((a) => a.source)).toEqual(["declared", "content"]);
	});

	/*
	 * RÉGRESSION FIGÉE : `capAnchors` écrivait autrefois le compteur dans un état de module.
	 * Plusieurs appelants ne veulent que la liste et l'écrasaient au passage ; seul l'ordre
	 * synchrone d'un appelant sauvait l'affichage. Un appel intercalé ne doit plus rien
	 * pouvoir fausser.
	 */
	it("est PURE : un appel intercalé ne fausse pas le compteur d'un autre", () => {
		const many = Array.from({ length: 30 }, (_, i) => anchor(i, "content"));
		const few = [anchor(0, "content")];

		const first = api.capAnchors(many);
		api.capAnchors(few);

		expect(first.hidden).toBe(5);
	});
});

describe("signature", () => {
	const entry = (over: Record<string, unknown> = {}) => ({
		fragment: "footer1",
		label: "1",
		kind: "footnote",
		preview: "Le crédit vous engage.",
		origin: "Mention legal item",
		source: "declared",
		...over,
	});

	it("est stable quand rien n'a changé", () => {
		expect(api.signature([entry()])).toBe(api.signature([entry()]));
	});

	it.each([
		["une suppression", []],
		["un ajout", [entry(), entry({ fragment: "footer2", label: "2" })]],
		["une correction du texte", [entry({ preview: "Texte corrigé." })]],
	])("change sur %s", (_label, list) => {
		expect(api.signature(list)).not.toBe(api.signature([entry()]));
	});

	/*
	 * Les champs sont joints par des caractères de contrôle, précisément pour qu'un
	 * déplacement de contenu d'un champ vers le suivant ne produise pas la même empreinte —
	 * ce qui ferait manquer une réouverture du menu.
	 */
	it("ne confond pas deux découpages différents des mêmes caractères", () => {
		const a = api.signature([entry({ label: "1", preview: "2" })]);
		const b = api.signature([entry({ label: "12", preview: "" })]);
		expect(a).not.toBe(b);
	});
});

describe("textFromHtml et truncate", () => {
	it("retire les balises et décode les entités courantes", () => {
		expect(api.textFromHtml("<p>Taux&nbsp;fixe &amp; co</p>")).toBe("Taux fixe & co");
	});

	it("coupe sur un mot entier et signale la coupe", () => {
		const out = api.truncate("Le crédit vous engage et doit être remboursé", 20);
		expect(out.endsWith("…")).toBe(true);
		expect(out.length).toBeLessThanOrEqual(20);
	});

	it("laisse un texte court intact", () => {
		expect(api.truncate("Court", 20)).toBe("Court");
	});
});

describe("pageContentNodes", () => {
	/*
	 * `descendants` traverse les sous-pages : sans ce filtrage, le menu proposerait les ancres
	 * du site entier. Or on insère `href="#fragment"`, qui résout toujours sur la page
	 * courante — chaque entrée hors-page serait un lien mort.
	 */
	it("écarte tout contenu vivant sous une sous-page", () => {
		const nodes = api.pageContentNodes({
			jcr: {
				nodeByPath: {
					subPages: { nodes: [{ path: "/sites/s/home/sub" }] },
					contents: {
						nodes: [
							{ path: "/sites/s/home/bloc" },
							{ path: "/sites/s/home/sub/bloc" },
							{ path: "/sites/s/home/sub/deep/bloc" },
						],
					},
				},
			},
		});

		expect(nodes.map((n) => n.path)).toEqual(["/sites/s/home/bloc"]);
	});

	it("renvoie une liste vide quand la requête n'a rien rapporté", () => {
		expect(api.pageContentNodes(null)).toEqual([]);
		expect(api.pageContentNodes({ jcr: {} })).toEqual([]);
	});
});

describe("buildContentAnchors", () => {
	const data = {
		jcr: {
			nodeByPath: {
				subPages: { nodes: [] },
				contents: {
					nodes: [
						{
							path: "/sites/s/home/seo",
							primaryNodeType: { name: "sofnt:seoBlock" },
							properties: [
								{ name: "content", value: '<h2 id="section-a">A</h2><a name="ancien"></a>' },
							],
						},
					],
				},
			},
		},
	};

	it("relève les id et les <a name> du richtext", () => {
		const found = api.buildContentAnchors(data, []);
		expect(found.map((a) => a.fragment).sort()).toEqual(["ancien", "section-a"]);
	});

	/*
	 * La déduplication traverse les deux passes : sans elle, un fragment déjà présent parmi
	 * les ancres déclarées réapparaîtrait dans « Ancres dans le contenu », donc deux fois dans
	 * le menu, dont une dans le mauvais groupe.
	 */
	it("écarte un fragment déjà porté par une ancre déclarée", () => {
		const found = api.buildContentAnchors(data, ["section-a"]);
		expect(found.map((a) => a.fragment)).toEqual(["ancien"]);
	});
});

describe("resolvePagePath", () => {
	it("retient la jnt:page la plus PROCHE, nœud courant inclus", () => {
		expect(
			api.resolvePagePath({
				jcr: {
					nodeByPath: {
						path: "/sites/s/home/produit/bloc",
						isPage: false,
						ancestors: [
							{ path: "/sites/s/home", isPage: true },
							{ path: "/sites/s/home/produit", isPage: true },
						],
					},
				},
			}),
		).toBe("/sites/s/home/produit");
	});

	it("retient le nœud lui-même quand c'est une page", () => {
		expect(
			api.resolvePagePath({
				jcr: { nodeByPath: { path: "/sites/s/home", isPage: true, ancestors: [] } },
			}),
		).toBe("/sites/s/home");
	});

	it("renvoie null quand aucune page n'est trouvée", () => {
		expect(api.resolvePagePath({ jcr: { nodeByPath: null } })).toBeNull();
	});
});

describe("surface de test publiée", () => {
	/*
	 * `PageAnchorsApi` est un miroir MANUEL de ce que publie `plugin.js` — un JS en
	 * `@ts-nocheck`, que le compilateur ne confronte jamais à l'interface. Ce test est donc le
	 * SEUL endroit où un helper renommé se signale.
	 */
	it("expose exactement les helpers déclarés par PageAnchorsApi", () => {
		for (const key of PAGE_ANCHORS_API_KEYS) {
			expect(typeof api[key], `helper manquant : ${key}`).toBe("function");
		}
	});
});

describe("filterHtmlId", () => {
	/*
	 * CONTRAT INTER-MODULES, le plus coûteux à perdre : ce filtre DOIT répondre comme
	 * `filterHtmlId` (#lib/footnotes), lui-même porté du taglib Java `Functions.filterHtmlId`.
	 * Le plugin insère `href="#footerN"` ; le serveur décide quel `id="footerN"` il émet. Une
	 * divergence d'un seul caractère produit des liens vers des cibles inexistantes, et rien
	 * ne le signale avant la recette.
	 */
	it.each([
		["chiffres", "1", "1"],
		["lettres", "abc", "abc"],
		["caractères d'id autorisés", "a-b.c:d", "a-b.c:d"],
		["espaces autour", "  7  ", "7"],
		["astérisque échappé en U+hex", "*", "U002A"],
		["accent échappé en U+hex", "é", "U00E9"],
		["espace interne échappé", "a b", "aU0020b"],
	])("%s : %o → %o", (_label, input, expected) => {
		expect(api.filterHtmlId(input)).toBe(expected);
	});

	it.each([
		["chaîne vide", ""],
		["null", null],
		["undefined", undefined],
	])("rend une chaîne vide pour %s", (_label, input) => {
		expect(api.filterHtmlId(input)).toBe("");
	});
});

describe("toSuperscript", () => {
	it.each([
		["un chiffre", "2", "⁽²⁾"],
		["deux chiffres", "10", "⁽¹⁰⁾"],
		["zéro", "0", "⁽⁰⁾"],
	])("%s : %o → %o", (_label, input, expected) => {
		expect(api.toSuperscript(input)).toBe(expected);
	});

	/*
	 * LE CAS QUI A MOTIVÉ LE GARDE. `superscriptFootnoteTokens` côté serveur refuse tout ce
	 * qui n'est pas `^[0-9]+$`. Sans le même refus ici, `charAt(Number("a"))` valait
	 * `charAt(NaN)`, donc `charAt(0)` : une ancre `(a)` faisait insérer `⁽⁰⁾`, un renvoi vers
	 * une note zéro qui n'existe pas.
	 */
	it.each([
		["lettre seule", "a", "(a)"],
		["mixte", "1a", "(1a)"],
		["astérisque", "*", "(*)"],
	])("ne convertit pas %s : %o → %o", (_label, input, expected) => {
		expect(api.toSuperscript(input)).toBe(expected);
	});

	it("ne pose aucun marqueur pour une valeur vide", () => {
		// `⁽⁾` — des parenthèses exposant vides — était le rendu précédent.
		expect(api.toSuperscript("")).toBe("");
	});
});

describe("componentLabel", () => {
	it.each([
		["sofnt:mentionLegalItem", "Mention legal item"],
		["spnt:seoLinksBlock", "Seo links block"],
		["jnt:text", "Text"],
	])("%o → %o", (input, expected) => {
		expect(api.componentLabel(input)).toBe(expected);
	});

	it("rend une chaîne vide sans type de nœud", () => {
		// `origin` est optionnel dans le menu : une étiquette « Undefined » y serait pire que rien.
		expect(api.componentLabel("")).toBe("");
	});
});

describe("stripLeadingNumber", () => {
	/*
	 * L'aperçu du menu affiche déjà le numéro à gauche. Sans ce retrait, l'entrée se lit
	 * « 2 · (2) Le crédit vous engage » — le numéro deux fois, sur une ligne déjà tronquée.
	 */
	it.each([
		["parenthésé", "(2) Le crédit vous engage.", "2", "Le crédit vous engage."],
		["suivi d'un point", "2. Le crédit vous engage.", "2", "Le crédit vous engage."],
		["suivi d'un tiret cadratin", "2 — Le crédit", "2", "Le crédit"],
		["nu", "2 Le crédit", "2", "Le crédit"],
	])("retire le numéro %s", (_label, text, number, expected) => {
		expect(api.stripLeadingNumber(text, number)).toBe(expected);
	});

	it("laisse le texte intact quand il ne commence pas par le numéro", () => {
		expect(api.stripLeadingNumber("Le crédit vous engage.", "2")).toBe("Le crédit vous engage.");
	});

	it("laisse le texte intact sans numéro", () => {
		// Cas « texte libre » : la mention n'a pas d'ancre, il n'y a rien à retirer.
		expect(api.stripLeadingNumber("Texte libre", "")).toBe("Texte libre");
	});

	it("échappe les métacaractères du numéro au lieu de les interpréter", () => {
		// Sans l'échappement des métacaractères dans `stripLeadingNumber`, un numéro « * »
		// produirait la regex `^\(?*\)?`, invalide — donc une exception levée au milieu de la
		// construction du menu, qui n'afficherait plus aucune ancre.
		expect(api.stripLeadingNumber("(*) Renvoi étoilé", "*")).toBe("Renvoi étoilé");
	});
});

describe("buildDeclaredAnchors", () => {
	const page = (nodes: Array<Record<string, unknown>>) => ({
		jcr: { nodeByPath: { subPages: { nodes: [] }, contents: { nodes } } },
	});

	const mention = (path: string, anchor: string, content?: string) => ({
		path,
		primaryNodeType: { name: "sofnt:mentionLegalItem" },
		isMentionLegalItem: true,
		anchor: { value: anchor },
		mentionContent: content ? { value: content } : undefined,
	});

	it("assemble notes et ancres de section, avec leur origine", () => {
		const anchors = api.buildDeclaredAnchors(
			page([
				mention("/sites/s/home/m1", "(1)", "<p>(1) Le crédit vous engage.</p>"),
				{
					path: "/sites/s/home/b1",
					primaryNodeType: { name: "spnt:seoLinksBlock" },
					baseAnchor: { value: "Mon Ancre" },
				},
			]),
		);

		expect(anchors).toHaveLength(2);
		expect(anchors[0]).toMatchObject({
			fragment: "footer1",
			kind: "footnote",
			number: "1",
			source: "declared",
			origin: "Mention legal item",
			preview: "Le crédit vous engage.",
		});
		expect(anchors[1]).toMatchObject({
			fragment: "Mon Ancre",
			kind: "section",
			source: "declared",
			origin: "Seo links block",
		});
	});

	/*
	 * Depuis que `anchor` est facultatif, « texte libre » est le cas nominal. Lister ces
	 * mentions proposerait un lien vers `#footer`, cible qu'aucune page ne rend.
	 */
	it("écarte les mentions sans renvoi réel", () => {
		const anchors = api.buildDeclaredAnchors(
			page([
				mention("/sites/s/home/m1", "&nbsp;"),
				mention("/sites/s/home/m2", "()"),
				mention("/sites/s/home/m3", "   "),
			]),
		);

		expect(anchors).toEqual([]);
	});

	it("dédoublonne deux nœuds qui visent le même fragment", () => {
		const anchors = api.buildDeclaredAnchors(
			page([
				mention("/sites/s/home/m1", "(3)"),
				mention("/sites/s/home/m2", "3"),
			]),
		);

		// `(3)` et `3` désignent la même note : deux entrées « 3 » dans le menu seraient
		// indiscernables, et pointeraient de toute façon sur le même `#footer3`.
		expect(anchors).toHaveLength(1);
		expect(anchors[0]).toMatchObject({ fragment: "footer3" });
	});

	it("renvoie une liste vide quand la requête n'a rien rapporté", () => {
		expect(api.buildDeclaredAnchors({ jcr: { nodeByPath: null } })).toEqual([]);
	});
});
