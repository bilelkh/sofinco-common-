import { describe, it, expect } from "vitest";
import { readSeoLevel } from "./seoLevel";

/*
 * Ce garde-fou existe parce que les choicelists du maillage SEO ne sont PAS les nôtres :
 * `spnt:seoLinksBlock` et `spnt:seoLinksSubBlock` viennent de `portal-common-sofinco`, un
 * module tiers. Leur vocabulaire peut donc changer sans que ce dépôt en soit averti, et une
 * valeur inattendue ne doit jamais atteindre le DOM sous forme de balise arbitraire.
 */
describe("readSeoLevel", () => {
	it.each(["p", "h2", "h3", "h4", "h5", "h6"])(
		"accepte %o, présent dans les choicelists legacy",
		(raw) => {
			// Le repli est volontairement différent de l'entrée : s'il était retourné, le test
			// passerait quand même sur une comparaison à `raw`.
			expect(readSeoLevel(raw, "h2")).toBe(raw);
		},
	);

	/*
	 * LE CAS MÉTIER, pas un cas d'erreur. La chaîne vide est une option EXPLICITE de ces
	 * choicelists (`< '','p','h2',…`) et en est même la valeur par défaut : elle signifie
	 * « aucun niveau imposé ». Le repli reproduit alors le niveau que le composant codait en
	 * dur — c'est ce qui garantit qu'un bloc déjà publié rend exactement comme avant.
	 */
	it("retombe sur le repli quand aucun niveau n'est choisi", () => {
		expect(readSeoLevel("", "h2")).toBe("h2");
		expect(readSeoLevel("", "h3")).toBe("h3");
	});

	/*
	 * `h1` n'est offert par AUCUNE des deux choicelists legacy (le bloc s'arrête à h5, la
	 * section à h6). L'accepter laisserait poser un second `<h1>` sur une page qui en a déjà
	 * un — une régression SEO, précisément l'inverse du but de ce lot.
	 */
	it("refuse h1, absent des deux choicelists legacy", () => {
		expect(readSeoLevel("h1", "h2")).toBe("h2");
	});

	it.each([
		["balise arbitraire", "script"],
		["casse inattendue", "H3"],
		["espaces autour", " h3 "],
		["valeur tronquée", "h"],
		["niveau inexistant", "h7"],
	])("refuse une valeur %s (%o) et retombe sur le repli", (_label, raw) => {
		expect(readSeoLevel(raw, "h3")).toBe("h3");
	});

	/*
	 * Le mapping lit la propriété via `str(node, …)`, qui renvoie `""` sur une propriété
	 * absente. Mais un import de contenu historique peut laisser une valeur nulle en JCR :
	 * la fonction ne doit pas lever pour autant, sous peine de casser le rendu de toute la
	 * page pour un seul bloc mal formé.
	 */
	it.each([
		["null", null],
		["undefined", undefined],
	])("ne lève pas sur une valeur %s et retombe sur le repli", (_label, raw) => {
		expect(readSeoLevel(raw as unknown as string, "h2")).toBe("h2");
	});

	/*
	 * Les deux appelants ne passent PAS le même repli — `mapSeoMeshBlock` utilise h2 (le
	 * `as="h2"` que `Block.tsx` codait en dur) et `mapSeoMeshSection` h3 (le `<h3>` des
	 * colonnes). Le repli doit donc être restitué tel quel, jamais normalisé.
	 */
	it("restitue le repli tel qu'il est fourni, sans le normaliser", () => {
		expect(readSeoLevel("inconnu", "p")).toBe("p");
		expect(readSeoLevel("inconnu", "span")).toBe("span");
	});
});
