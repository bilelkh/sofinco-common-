import { describe, it, expect, vi } from "vitest";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { makeNode } from "#test/jahia";

vi.mock("#lib/jcr", () => import("#test/jahia"));
vi.mock("@jahia/javascript-modules-library", () => ({
	buildNodeUrl: vi.fn((node: { getUrl(): string }) => node.getUrl()),
}));

import {
	mapReassuranceItem,
	mapReassuranceHeading,
	mapReassuranceProps,
} from "./reassurance.mapping";

const item = (
	overrides: Record<string, unknown> = {},
	named: Record<string, JCRNodeWrapper> = {},
) =>
	makeNode({
		id: "item-1",
		nodeTypes: ["sofnt:reassuranceItem"],
		props: { "jcr:title": "Sans frais de dossier", ...overrides },
		named,
	});

/*
 * `isExternal` NE VIENT PAS DE `j:linkType`.
 *
 * Le mapper le derive de `j:target === "_blank"` : cote design system, `isExternal` pilote
 * l'ouverture dans un nouvel onglet et le picto associe, pas la nature de l'URL. Une URL
 * absolue ouverte dans le meme onglet reste donc `isExternal: false` — c'est voulu.
 *
 * Les deux fixtures nomment cette distinction plutot que de la laisser implicite : la
 * precedente posait `j:linkType: "external"` SANS cible, et le test s'appelait « lien
 * externe compris » tout en attendant `isExternal: false`.
 */
const externalLink = () =>
	makeNode({
		props: {
			"j:linkType": "external",
			"j:url": "https://sofinco.fr",
			"jcr:title": "En savoir plus",
			"j:target": "_blank",
		},
	});

/** URL absolue, mais ouverte dans le meme onglet : `isExternal` doit rester faux. */
const externalUrlSameTabLink = () =>
	makeNode({
		props: {
			"j:linkType": "external",
			"j:url": "https://sofinco.fr",
			"jcr:title": "En savoir plus",
		},
	});

describe("mapReassuranceHeading", () => {
	/*
	 * `sectionHeadingProps` est OPTIONNEL côté design system, et c'est ce mapper qui décide.
	 * Sans titre, renvoyer un objet ferait rendre un `<h2>` vide plutôt que rien.
	 */
	it("renvoie undefined sans titre — le DS omet alors l'en-tête entier", () => {
		expect(mapReassuranceHeading(makeNode({ props: {} }))).toBeUndefined();
		expect(mapReassuranceHeading(makeNode({ props: { "jcr:title": "   " } }))).toBeUndefined();
	});

	it("mappe titre, sous-titre et les deux axes du mixin", () => {
		const node = makeNode({
			props: {
				"jcr:title": "Pourquoi Sofinco ?",
				"subtitle": "Trois bonnes raisons",
				"titleLevel": "h3",
				"titleStyle": "h2",
			},
		});

		expect(mapReassuranceHeading(node)).toEqual({
			title: "Pourquoi Sofinco ?",
			subtitle: "Trois bonnes raisons",
			titleAs: "h3",
			visualStyle: "h2",
		});
	});

	it("retombe sur h2 quand le mixin n'a pas encore de valeur", () => {
		// Cas d'un nœud contribué avant l'arrivée de `sofmix:sectionHeader`.
		const node = makeNode({ props: { "jcr:title": "Titre seul" } });

		expect(mapReassuranceHeading(node)).toEqual({
			title: "Titre seul",
			subtitle: undefined,
			titleAs: "h2",
			visualStyle: "h2",
		});
	});
});

describe("mapReassuranceItem", () => {
	it("mappe un item complet, lien externe compris", () => {
		const result = mapReassuranceItem(
			item(
				{ text: "Aucun frais à la souscription", icon: "picto.svg", iconAlt: "Picto" },
				{ link: externalLink() },
			),
			0,
		);

		expect(result).toMatchObject({
			id: "item-1",
			title: "Sans frais de dossier",
			text: "Aucun frais à la souscription",
			iconAlt: "Picto",
			// Repli h3 : le niveau que le composant React codait en dur.
			titleAs: "h3",
		});
		expect(result.link).toMatchObject({ href: "https://sofinco.fr", isExternal: true });
	});

	it("`isExternal` suit la cible, pas le type de lien", () => {
		const result = mapReassuranceItem(item({}, { link: externalUrlSameTabLink() }), 0);

		expect(result.link).toMatchObject({ href: "https://sofinco.fr", isExternal: false });
	});

	/*
	 * LE NIVEAU SE LIT SUR LE BLOC, PAS SUR L'ITEM.
	 *
	 * Des items freres sont des pairs dans le plan de la page. Laisser chacun choisir son
	 * niveau permettrait un item 1 en h3 et un item 2 en h5, ce qui affirme que le second
	 * est une sous-section du premier — une hierarchie fausse, invisible a l'ecran.
	 */
	it("lit le niveau sur le bloc parent", () => {
		const bloc = makeNode({
			nodeTypes: ["sofnt:reassurance"],
			props: { itemsTitleLevel: "h4" },
		});
		const node = makeNode({
			nodeTypes: ["sofnt:reassuranceItem"],
			props: { "jcr:title": "T" },
			parent: bloc,
		});

		expect(mapReassuranceItem(node, 0).titleAs).toBe("h4");
	});

	/*
	 * `p` est le choix « ce texte n'est pas un titre » : il doit traverser le garde-fou au
	 * même titre qu'un niveau de titre, sinon l'option serait offerte sans effet.
	 */
	it("accepte 'p' comme niveau de bloc", () => {
		const bloc = makeNode({ nodeTypes: ["sofnt:reassurance"], props: { itemsTitleLevel: "p" } });
		const node = makeNode({ props: { "jcr:title": "T" }, parent: bloc });

		expect(mapReassuranceItem(node, 0).titleAs).toBe("p");
	});

	/*
	 * Un niveau pose sur l'ITEM ne doit RIEN faire : c'est un reliquat possible d'un
	 * contenu migre depuis la version ou la propriete vivait la. Le laisser agir
	 * reintroduirait exactement l'incoherence que le deplacement supprime.
	 */
	it("ignore un niveau residuel pose sur l'item lui-meme", () => {
		const bloc = makeNode({ nodeTypes: ["sofnt:reassurance"], props: { itemsTitleLevel: "h4" } });
		const node = makeNode({
			props: { "jcr:title": "T", "titleLevel": "h6", "itemsTitleLevel": "h2" },
			parent: bloc,
		});

		expect(mapReassuranceItem(node, 0).titleAs).toBe("h4");
	});

	it("retombe sur h3 quand le bloc ne choisit rien", () => {
		const bloc = makeNode({ nodeTypes: ["sofnt:reassurance"], props: {} });
		const node = makeNode({ props: { "jcr:title": "T" }, parent: bloc });

		expect(mapReassuranceItem(node, 0).titleAs).toBe("h3");
	});

	it("ramène les champs optionnels absents à undefined", () => {
		const result = mapReassuranceItem(item(), 0);

		expect(result.icon).toBeUndefined();
		expect(result.text).toBeUndefined();
		expect(result.link).toBeUndefined();
	});

	/*
	 * `getIdentifier()` peut renvoyer null sur un nœud fraîchement créé, pas encore persisté.
	 * L'index sert alors de clé React — sans lui, deux items partageraient `null`.
	 */
	it("retombe sur l'index quand le nœud n'a pas encore d'identifiant", () => {
		// `makeNode` impose son propre repli d'identifiant : on surcharge l'accesseur pour
		// atteindre le cas reel, un noeud cree en edition et pas encore persiste.
		const node = makeNode({ props: { "jcr:title": "T" } });
		(node as unknown as { getIdentifier: () => string | null }).getIdentifier = () => null;

		expect(mapReassuranceItem(node, 2).id).toBe(2);
	});
});

describe("mapReassuranceProps", () => {
	it("assemble l'en-tête et les items dans l'ordre contribué", () => {
		const node = makeNode({
			props: { "jcr:title": "Pourquoi Sofinco ?", "titleLevel": "h2" },
			children: [
				item({ "jcr:title": "Premier" }),
				makeNode({
					id: "item-2",
					nodeTypes: ["sofnt:reassuranceItem"],
					props: { "jcr:title": "Second" },
				}),
			],
		});

		const result = mapReassuranceProps(node);

		expect(result.sectionHeadingProps?.title).toBe("Pourquoi Sofinco ?");
		expect(result.items.map((i) => i.title)).toEqual(["Premier", "Second"]);
	});

	it("rend un bloc sans en-tête ni item sans lever", () => {
		// Bloc tout juste déposé par un contributeur : ni titre ni enfant.
		const result = mapReassuranceProps(makeNode({ props: {} }));

		expect(result.sectionHeadingProps).toBeUndefined();
		expect(result.items).toEqual([]);
	});

	/*
	 * `getChildNodesByType` filtre sur le type : un enfant d'un autre type — un `sofnt:link`
	 * déposé par erreur, par exemple — ne doit pas se retrouver rendu comme un item.
	 */
	it("ignore les enfants qui ne sont pas des items de réassurance", () => {
		const node = makeNode({
			props: { "jcr:title": "T" },
			children: [item(), makeNode({ nodeTypes: ["sofnt:link"], props: {} })],
		});

		expect(mapReassuranceProps(node).items).toHaveLength(1);
	});
});
