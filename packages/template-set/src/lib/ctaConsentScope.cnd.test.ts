/*
 * Test de PORTÉE, pas de comportement — même famille que `footnoteFields.cnd.test.ts` :
 * il lit les définitions CND sur disque et échoue sur un invariant du modèle.
 *
 * Ce qu'il protège : `sofmix:ctaConsent` est un `jmix:dynamicFieldset`, donc le Content
 * Editor le propose comme interrupteur autonome sur TOUT type que son `extends` désigne.
 * Ses deux voisins (`ctaInternal`, `ctaExternal`) portent légitimement
 * `extends = sofmix:ctaLink` — ils servent le `ctaType` générique. Recopier cette ligne sur
 * celui-ci, par symétrie ou par copier-coller, l'offrirait sur la douzaine de types porteurs
 * d'un CTA.
 *
 * Et la conséquence n'est pas une option inerte : `resolveCtaMode` teste les mixins AVANT de
 * lire `ctaType`, donc l'activer sur un composant dont le CTA pointe vers une page REMPLACE
 * ce lien par une ancre `#gerer-mes-cookies` morte — `isConsent` n'étant posé que par le
 * mapping du pied de page, le délégué de clic du `<head>` ne reconnaît rien. Aucune erreur
 * en console, aucun test de comportement rouge : c'est précisément le genre de régression
 * qu'aucune suite ne rattrape, d'où celle-ci.
 *
 * Le formulaire Content Editor ne peut PAS tenir ce rôle : il ne s'applique ni aux imports
 * de contenu, ni aux duplications de nœuds, ni aux `addMixin` par script Groovy, et il ne
 * valide rien à l'écriture. En Jahia, seul le CND contraint le modèle.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const CTA_CND = fileURLToPath(new URL("../components/Shared/CTA/definition.cnd", import.meta.url));
const FOOTER_LINK_CND = fileURLToPath(
	new URL("../components/Footer/FooterLink/definition.cnd", import.meta.url),
);

/**
 * Rend la ligne `extends = …` qui suit la déclaration de `typeName`, ou `null` si le type
 * n'en porte pas.
 *
 * Découpage sur les déclarations `[…]` : la tranche court jusqu'au type suivant, donc
 * l'`extends` trouvé est bien celui de CE type et pas d'un voisin. Lecture textuelle
 * assumée — un vrai parseur CND n'existe qu'en Java, côté Jahia, et l'invariant à tenir
 * ici tient en une ligne.
 */
function extendsOf(source: string, typeName: string): string[] | null {
	const declarations = [...source.matchAll(/^\[([\w:]+)\]/gm)];
	const index = declarations.findIndex((match) => match[1] === typeName);
	expect(index, `${typeName} introuvable dans le CND`).toBeGreaterThanOrEqual(0);

	const start = declarations[index].index;
	const end = declarations[index + 1]?.index ?? source.length;
	const found = /^extends\s*=\s*(.+)$/m.exec(source.slice(start, end));

	return found ? found[1].split(",").map((type) => type.trim()) : null;
}

describe("portée du fieldset de consentement", () => {
	const cta = readFileSync(CTA_CND, "utf8");

	it("n'est proposé que sur sofnt:footerLink", () => {
		expect(
			extendsOf(cta, "sofmix:ctaConsent"),
			"Élargir cette portée rend le fieldset activable sur tout porteur de CTA, où il " +
				"remplacerait silencieusement un lien qui marche par une ancre morte.",
		).toEqual(["sofnt:footerLink"]);
	});

	it("cible un type qui porte réellement un CTA, sinon la choicelist du form ne s'affiche pas", () => {
		// `sofnt:footerLink > jnt:content, sofmix:cta`, et `sofmix:cta > sofmix:ctaLink` :
		// c'est ce qui rend l'option `ctaType = consent` atteignable en contribution.
		expect(readFileSync(FOOTER_LINK_CND, "utf8")).toMatch(
			/^\[sofnt:footerLink\][^\n]*\bsofmix:cta\b/m,
		);
	});

	/*
	 * L'inverse du premier test : les deux autres natures de CTA doivent, elles, RESTER
	 * larges. Les resserrer par symétrie retirerait aux contributeurs les fieldsets
	 * « lien interne » et « lien externe » sur tous les composants — une panne bien plus
	 * visible, mais que rien ne signalerait avant la recette.
	 */
	it("laisse les deux autres natures de CTA ouvertes à tout porteur de CTA", () => {
		expect(extendsOf(cta, "sofmix:ctaInternal")).toEqual(["sofmix:ctaLink"]);
		expect(extendsOf(cta, "sofmix:ctaExternal")).toEqual(["sofmix:ctaLink"]);
	});
});
