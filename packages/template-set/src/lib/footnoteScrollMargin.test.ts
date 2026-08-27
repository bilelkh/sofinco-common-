/** @vitest-environment happy-dom */
/*
 * La réserve sous l'en-tête collant doit couvrir TOUTES les formes de marqueur.
 *
 * Le retour ↩ défile vers le marqueur d'où vient le lecteur. Si `scroll-margin-top` ne
 * s'applique pas à ce marqueur, le défilement est juste mais la cible atterrit DERRIÈRE
 * l'en-tête fixe : le lecteur ne voit rien. Défaut constaté sur `sofnt:seoBlock`, dont les
 * renvois richtext n'ont que leur `href` et échappaient donc au sélecteur `.footer-link`.
 *
 * Le test lit la RÈGLE RÉELLE dans `templates/global.css` et la confronte à chaque forme de
 * marqueur produite par le projet. Il ne peut donc pas dériver du CSS livré.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// `new URL(relatif, base)` est à proscrire ici : happy-dom remplace le `URL` global et la
// base ne reste pas un file:. On compose le chemin avec `node:path`, qui n'en dépend pas.
const CSS = readFileSync(
	join(dirname(fileURLToPath(import.meta.url)), "..", "templates", "global.css"),
	"utf8",
);

/*
 * Commentaires retirés AVANT toute extraction : ils documentent abondamment la règle, et
 * les laisser ferait capturer leur prose dans le sélecteur comme dans le corps de la règle.
 */
const DECLARATIONS = CSS.replace(/\/\*[\s\S]*?\*\//g, "");

/** La règle qui porte `scroll-margin-top`, sélecteurs et corps. */
const scrollMarginRule = (() => {
	const rule = /([^{}]+)\{([^{}]*scroll-margin-top[^{}]*)\}/.exec(DECLARATIONS);
	if (!rule) throw new Error("règle `scroll-margin-top` introuvable dans global.css");
	return { selector: rule[1].trim(), body: rule[2].trim() };
})();

const scrollMarginSelector = scrollMarginRule.selector;

const covers = (html: string) => {
	const host = document.createElement("div");
	host.innerHTML = html;
	return host.firstElementChild!.matches(scrollMarginSelector);
};

describe("réserve de défilement des marqueurs de note", () => {
	it("couvre le marqueur richtext construit par manageFooterNote", () => {
		expect(
			covers('<a href="#footer1" data-footer="footer1" class="footer-link"><sup>(1)</sup></a>'),
		).toBe(true);
	});

	it("couvre le marqueur rendu par FootnoteText (React)", () => {
		expect(covers('<a href="#footer2" class="footer-link" data-footer="footer2">x</a>')).toBe(true);
	});

	it("couvre un renvoi inséré depuis le menu « Ancres de la page » (href seul)", () => {
		/*
		 * LE CAS DU DÉFAUT. La fonction Lien de CKEditor ne gère que `href` : ni classe, ni
		 * `data-footer`. C'est la forme produite dans un richtext quand le contributeur
		 * entoure un jeton `((n))` d'un lien — ce que fait `sofnt:seoBlock`.
		 */
		expect(covers('<a href="#footer1">⁽¹⁾</a>')).toBe(true);
	});

	it("couvre une forme qui ne porterait que l'attribut, sans la classe", () => {
		expect(covers('<span data-footer="footer3">(3)</span>')).toBe(true);
	});

	it("n'applique PAS la réserve au retour ↩ — c'est une action, pas une cible", () => {
		expect(
			covers('<button type="button" class="footer-back-link" data-footer="footer1">↩</button>'),
		).toBe(false);
	});

	it("laisse tranquille un lien ordinaire", () => {
		expect(covers('<a href="/nos-offres">Nos offres</a>')).toBe(false);
	});

	it("s'appuie sur la variable dédiée, jamais sur --header-height", () => {
		// `--header-height` pilote aussi la hauteur des Hero, le QrCode et le tableau
		// comparatif : l'écrire depuis ici déplacerait des mises en page sans rapport.
		expect(scrollMarginRule.body).toContain("--footnote-scroll-offset");
		expect(scrollMarginRule.body).not.toContain("--header-height");
	});
});
