/** @vitest-environment happy-dom */
/*
 * Contrat de balisage entre la vue `IovoxWebCallback` et son script inline.
 *
 * Les noms de classes du CSS Module sont hachés au build : le délégué ne peut s'accrocher
 * qu'à des `id` et à un attribut de données. Ces ancres sont donc déclarées DEUX FOIS — une
 * fois dans la vue, une fois en tête du bootstrap — sans que rien ne les relie. Le docbloc
 * de la vue demande bien d'éditer les deux dans le même commit, mais rien ne l'impose : les
 * tests du délégué écrivent leur PROPRE balisage, si bien qu'un renommage d'un seul côté
 * part en production avec 1400 tests au vert.
 *
 * On lit donc les constantes DANS le source du bootstrap et on les confronte au HTML rendu
 * par la vraie vue. Le contrôle casse quel que soit le côté qui bouge.
 */
import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// La vue n'est ici qu'un porteur d'ancres : les libellés traduits ne sont pas le sujet.
vi.mock("#lib/i18n", () => ({
	useAppTranslation: () => ({ t: (key: string) => key, currentLang: "fr" }),
}));

import IovoxWebCallback from "./views/IovoxWebCallback";

// `new URL(relatif, base)` est à proscrire sous happy-dom : il remplace le `URL` global et
// la base ne reste pas un file:. On compose le chemin avec `node:path`.
const BOOTSTRAP = readFileSync(
	join(dirname(fileURLToPath(import.meta.url)), "iovox-webcallback-bootstrap.ts"),
	"utf8",
);

/** Valeur d'une constante d'ancrage déclarée en tête du bootstrap. */
function constantOf(name: string): string {
	const match = new RegExp(`const ${name} = "([^"]*)"`).exec(BOOTSTRAP);
	if (!match) throw new Error(`constante \`${name}\` introuvable dans le bootstrap iovox`);
	return match[1];
}

const DIALOG_ID = constantOf("DIALOG_ID");
const BODY_ID = constantOf("BODY_ID");
const IFRAME_ID = constantOf("IFRAME_ID");
const CLOSE_SELECTOR = constantOf("CLOSE_SELECTOR");

const view = (() => {
	const host = document.createElement("div");
	host.innerHTML = renderToStaticMarkup(createElement(IovoxWebCallback));
	return host;
})();

const dialog = view.querySelector(`#${DIALOG_ID}`);

describe("ancres partagées avec le bootstrap iovox", () => {
	it("rend le `<dialog>` que le délégué va chercher par son id", () => {
		expect(dialog?.tagName).toBe("DIALOG");
	});

	it("rend le corps redimensionnable, DANS le dialog", () => {
		// Le script y écrit une hauteur à chaque `iovox_wcb_resize` ; hors du dialog, la
		// mesure porterait sur un élément que le plafonnement de hauteur ne gouverne pas.
		expect(dialog?.querySelector(`#${BODY_ID}`)).not.toBeNull();
	});

	it("rend l'iframe SANS src, dans le corps", () => {
		const iframe = dialog?.querySelector(`#${IFRAME_ID}`);

		expect(iframe?.tagName).toBe("IFRAME");
		expect(iframe?.closest(`#${BODY_ID}`)).not.toBeNull();
		// Le src n'arrive qu'au premier clic, bâti depuis le porteur Smart Tribune : livré
		// ici, il ferait partir une requête tierce sur CHAQUE page portant le menu.
		expect(iframe?.hasAttribute("src")).toBe(false);
	});

	it("rend la sortie de secours que le délégué reconnaît", () => {
		// Seule porte quand l'iframe ne charge pas : la croix d'iovox n'existe alors pas.
		expect(dialog?.querySelector(CLOSE_SELECTOR)).not.toBeNull();
	});

	it("donne au dialog un nom accessible qui pointe sur un élément présent", () => {
		const labelledBy = dialog?.getAttribute("aria-labelledby");

		expect(labelledBy).toBeTruthy();
		expect(view.querySelector(`#${labelledBy}`)).not.toBeNull();
	});
});
