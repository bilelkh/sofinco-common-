/*
 * Contrat de rendu de `FootnoteText`.
 *
 * `footnoteSegments.test.ts` couvre le découpage ; ici on vérifie le BALISAGE émis, qui est
 * ce dont dépendent le script client (`.footer-link[data-footer]`), les lecteurs d'écran
 * (`.sr-only`) et la validité HTML (renvoi inerte dans un élément interactif).
 *
 * Écrit en `.ts` et non `.tsx` : la configuration vitest unitaire ne collecte que
 * `src/**\/*.test.ts`, d'où `createElement` plutôt que du JSX.
 */
import { afterEach, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FootnoteText } from "./FootnoteText";
import { footnoteDescribedBy, splitFootnoteText } from "./footnoteSegments";
import { DEFAULT_FOOTNOTE_LABEL, FOOTNOTE_LABEL_GLOBAL } from "./footnoteLabel";

const globals = globalThis as unknown as Record<string, unknown>;

const render = (text: string, inert = false) =>
	renderToStaticMarkup(createElement(FootnoteText, { inert, children: text }));

afterEach(() => {
	delete globals[FOOTNOTE_LABEL_GLOBAL];
});

describe("balisage du renvoi", () => {
	it("construit le lien attendu par le script client", () => {
		const html = render("Taux fixe ⁽¹⁾");

		expect(html, "aucun id : une note citée n fois en produirait n homonymes").not.toContain("id=");
		expect(html).toContain('href="#footer1"');
		expect(html).toContain('data-footer="footer1"');
		expect(html).toContain('class="footer-link"');
		expect(html).toContain('<sup class="footer-ref">(1)</sup>');
	});

	it("porte le libellé lecteur d'écran, traduit", () => {
		globals[FOOTNOTE_LABEL_GLOBAL] = "note de bas de page";

		expect(render("Taux ⁽¹⁾")).toContain('<span class="sr-only">note de bas de page</span>');
	});

	it("retombe sur un libellé par défaut hors page complète (Storybook, test)", () => {
		expect(render("Taux ⁽¹⁾")).toContain(DEFAULT_FOOTNOTE_LABEL);
	});

	it("résout le libellé AU RENDU, pas à l'import", () => {
		// Sinon la première locale rendue se figerait pour tout le processus.
		globals[FOOTNOTE_LABEL_GLOBAL] = "footnote";
		expect(render("Taux ⁽¹⁾")).toContain("footnote");

		globals[FOOTNOTE_LABEL_GLOBAL] = "note de bas de page";
		expect(render("Taux ⁽¹⁾")).toContain("note de bas de page");
	});

	it("laisse passer intact un texte sans renvoi", () => {
		expect(render("Un titre normal")).toBe("Un titre normal");
	});

	it("émet un <sup> ASCII, jamais de caractère exposant Unicode", () => {
		/*
		 * Les caractères exposant sont répartis sur DEUX blocs Unicode : `¹²³` en Latin-1
		 * Supplement (couverture quasi universelle), mais `⁰⁴⁵⁶⁷⁸⁹` et les parenthèses `⁽⁾`
		 * en Superscripts and Subscripts — que les polices sur mesure n'embarquent presque
		 * jamais. Mesuré sur ce projet : Figtree n'a ni `⁽` ni `⁾`, Cutta n'a que 3 des 12
		 * caractères. Les émettre faisait tomber les parenthèses de CHAQUE renvoi en police
		 * de repli, avec un décrochage complet à partir de la note 4 — invisible en relecture
		 * puisque les notes 1 à 3 semblaient correctes.
		 */
		const html = render("A ⁽³⁾ B ⁽⁴⁾ C ⁽¹⁰⁾");

		expect(html).not.toMatch(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁽⁾]/);
		expect(html).toContain('<sup class="footer-ref">(3)</sup>');
		expect(html).toContain('<sup class="footer-ref">(4)</sup>');
		expect(html).toContain('<sup class="footer-ref">(10)</sup>');
	});

	it("produit UN SEUL nœud texte dans le <sup>, sans séparateur d'hydratation", () => {
		// `({segment.number})` en JSX donnerait trois enfants adjacents, que React sépare par
		// des commentaires `<!-- -->` pour les redécouper à l'hydratation : le balisage servi
		// serait `(<!-- -->3<!-- -->)`, lisible mais sale et inutilement lourd.
		expect(render("Taux ⁽³⁾")).not.toContain("<!--");
	});

	it("rend le même balisage que le serveur (`manageFooterNote`)", () => {
		// Les trois chemins — richtext serveur, React, script client — doivent produire la
		// même forme, sinon deux renvois de la même page ne se ressemblent pas.
		expect(render("Taux ⁽¹⁾")).toContain("<sup");
		expect(render("Taux ⁽¹⁾")).toContain("(1)");
	});
});

describe("flux texte — inchangé, c'est ce que voient les moteurs", () => {
	it("garde la forme exposant Unicode dans la valeur texte", () => {
		// `<title>`, meta, `alt`, libellés de l'arbre jContent : aucun balisage possible. La
		// forme exposant y reste le seul recours, et son rendu visuel n'y existe pas.
		const [reference] = splitFootnoteText("Taux ⁽³⁾").filter((s) => s.kind === "reference");

		expect(reference).toMatchObject({ number: "3", visible: "⁽³⁾" });
	});

	it("s'extrait en `(3)` après normalisation, comme le ferait un moteur de recherche", () => {
		// NFKC replie `⁽³⁾` sur `(3)` : le texte indexé est identique à celui du <sup>. Le
		// passage au <sup> ne change donc RIEN au référencement.
		expect("Taux fixe⁽³⁾".normalize("NFKC")).toBe("Taux fixe(3)");
	});
});

describe("renvoi inerte (dans un <a> ou un <button>)", () => {
	it("n'émet aucun lien — un élément interactif imbriqué est invalide", () => {
		const html = render("Je profite de l'offre ⁽²⁾", true);

		expect(html).not.toContain("<a ");
		expect(html).toContain('<sup class="footer-ref" aria-hidden="true">(2)</sup>');
	});

	it("masque le renvoi aux technologies d'assistance", () => {
		/*
		 * Sans `aria-hidden`, le numéro rejoint le nom accessible du conteneur et le lecteur
		 * d'écran annonce « Je profite de l'offre 2 ». L'information est rétablie par
		 * `aria-describedby`, que posent `Cta` et `Link`.
		 */
		expect(render("Offre ⁽²⁾", true)).toContain('aria-hidden="true"');
		expect(render("Offre ⁽²⁾", true)).not.toContain("sr-only");
	});

	it("expose la note via footnoteDescribedBy, sans doublon ni attribut vide", () => {
		expect(footnoteDescribedBy("Taux ⁽¹⁾ et frais ⁽²⁾")).toBe("footer1 footer2");
		expect(footnoteDescribedBy("Voir ⁽¹⁾ puis ⁽¹⁾")).toBe("footer1");
		expect(footnoteDescribedBy("Aucun renvoi")).toBeUndefined();
		expect(footnoteDescribedBy(undefined)).toBeUndefined();
	});
});

describe("renvoi orphelin — contrat assumé", () => {
	it("construit le lien MÊME si la mention n'existe pas", () => {
		/*
		 * Contrat délibéré, pas un oubli. `FootnoteText` est une fonction PURE : sans DOM ni
		 * contexte, elle ne peut pas savoir quelles mentions la page contient — et c'est
		 * exactement cette pureté qui garantit qu'un îlot s'hydrate sans divergence. Lui
		 * faire lire le DOM la casserait (le serveur n'en a pas), et le serveur rend le
		 * titre avant les mentions.
		 *
		 * La validation a donc lieu EN AVAL, là où la page entière est visible :
		 *   - `footnote-bootstrap.ts` retire l'affordance du lien mort ;
		 *   - `footnote-audit.ts` le signale au contributeur en mode édition.
		 *
		 * Ce test fige l'intention : si quelqu'un fait un jour dépendre ce rendu d'un état
		 * externe, il doit passer par ici et se demander ce qu'il casse.
		 */
		const html = render("Taux ⁽⁹⁾");

		expect(html).toContain('href="#footer9"');
		expect(html).toContain('data-footer="footer9"');
	});

	it("laisse un jeton non numérique visible plutôt que de le convertir à moitié", () => {
		// Le contributeur voit sa faute ; le contrôle d'édition la lui signale.
		expect(render("Taux ((abc))")).toBe("Taux ((abc))");
	});
});
