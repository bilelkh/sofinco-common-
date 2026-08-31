/*
 * Garde de feuille de styles pour la modale iovox.
 *
 * Ce que ce fichier protège n'est visible d'AUCUN autre contrôle : `tsc`, `eslint`, les
 * tests DOM et `vite build` sont tous passés au vert sur une version où la modale se
 * rendait, fermée mais visible, sur chaque page du site. happy-dom n'applique pas de
 * feuille navigateur et ne calcule aucune mise en page : un test DOM ne peut pas voir ça.
 * On assertionne donc sur le texte de la feuille elle-même — même approche que les
 * contrôles de CND du dépôt.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const CSS = readFileSync(
	fileURLToPath(new URL("./views/iovoxWebCallback.module.css", import.meta.url)),
	"utf8",
	// Les commentaires parlent de `display: none` : les retirer avant toute analyse.
).replace(/\/\*[\s\S]*?\*\//g, "");

/** Corps de chaque règle dont le sélecteur est EXACTEMENT celui demandé. */
function bodiesOf(selector: string): string[] {
	const rule = new RegExp(
		`(?:^|[{}])\\s*${selector.replace(/[.[\]]/g, "\\$&")}\\s*\\{([^}]*)\\}`,
		"g",
	);
	return [...CSS.matchAll(rule)].map((match) => match[1]);
}

describe("iovoxWebCallback.module.css", () => {
	it("ne pose AUCUN `display` sur `.dialog` fermé", () => {
		const bodies = bodiesOf(".dialog");

		// Le navigateur masque un dialog fermé par `dialog:not([open]) { display: none }`
		// dans SA feuille, et une déclaration d'auteur l'emporte sur une règle UA quelle que
		// soit la spécificité. Un `display` ici rend la modale visible sur TOUTES les pages.
		expect(bodies.length).toBeGreaterThan(0);
		for (const body of bodies) expect(body).not.toMatch(/(^|;)\s*display\s*:/);
	});

	it("porte la colonne flex sur `.dialog[open]`", () => {
		// Le plafonnement de hauteur n'a d'effet que si le dialog ouvert est bien une
		// colonne flex : sans elle, `.body` ne rétrécit pas et le formulaire est rogné.
		expect(bodiesOf(".dialog[open]").join("")).toMatch(/display\s*:\s*flex/);
	});
});
