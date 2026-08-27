import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { FooterLink } from "./FooterLink";
import type { FooterLinkProps } from "./footerLink.types";

/*
 * Le maillon que rien ne couvrait. `#lib/consent-bootstrap` (côté template-set) teste son
 * délégué de clic contre un balisage écrit à la main : si `FooterLink` cessait de poser
 * `data-consent-action`, toute la suite resterait verte et le bouton « Gérer mes cookies »
 * serait mort en production — sans erreur, sans test rouge, et sans moyen pour un
 * utilisateur de revenir sur son consentement.
 *
 * Rendu serveur (`renderToString`) parce que c'est le seul rendu qui existe ici : le pied
 * de page est servi par GraalVM SANS îlot, donc jamais hydraté. Ce que ce test observe est
 * littéralement ce que reçoit le navigateur.
 */

const base: FooterLinkProps = {
	id: "consent",
	label: "Gérer mes cookies",
	href: "#gerer-mes-cookies",
	size: "small",
};

const render = (props: Partial<FooterLinkProps> = {}) =>
	renderToString(<FooterLink {...base} {...props} />);

describe("FooterLink — entrée de consentement", () => {
	it("rend un <button> porteur du contrat attendu par le délégué du <head>", () => {
		const html = render({ isConsent: true });
		expect(html).toContain("<button");
		expect(html).toContain('type="button"');
		expect(html).toContain('data-consent-action="preferences"');
		expect(html).toContain("Gérer mes cookies");
	});

	it("n'émet aucune destination : l'entrée agit, elle ne navigue pas", () => {
		const html = render({ isConsent: true });
		expect(html).not.toContain("<a ");
		expect(html).not.toContain("href=");
	});

	it("porte son propre data-tracking, sans le click_cta parasite de Cta", () => {
		const html = render({
			isConsent: true,
			tracking: { event: "click_menu_footer", menu_level_2: "Gérer mes cookies" },
		});
		expect(html).toContain("click_menu_footer");
		// Un second événement signerait le retour de `Cta`, dont les dimensions
		// `cta_section` / `cta_url` partiraient vides et fausseraient les rapports.
		expect(html).not.toContain("click_cta");
	});

	it("omet data-tracking quand aucun événement n'est fourni", () => {
		expect(render({ isConsent: true })).not.toContain("data-tracking");
	});

	it("reste un <a> pour une entrée de navigation ordinaire", () => {
		const html = render();
		expect(html).toContain('href="#gerer-mes-cookies"');
		expect(html).not.toContain("data-consent-action");
	});

	/*
	 * Régression rattrapée par la règle maison `sofinco/require-footnote-text` au moment de
	 * remplacer `Cta` par un `<button>` nu : `Cta` traitait les renvois de notes, le bouton
	 * devait reprendre ce rôle. Sans ce test, la prochaine réécriture du composant le
	 * reperdrait — un renvoi resterait visible dans le libellé, sans lien vers la mention
	 * légale, et rejoindrait au passage le nom accessible du bouton.
	 */
	it("rend le renvoi de note inerte et le rattache en description", () => {
		const html = render({ isConsent: true, label: "Gérer mes cookies ⁽¹⁾" });
		expect(html).toContain('aria-describedby="footer1"');
		expect(html).toContain('<sup class="footer-ref" aria-hidden="true">(1)</sup>');
		// Inerte : le renvoi ne doit être ni un <a> imbriqué dans le <button> — imbrication
		// invalide — ni une part du nom accessible (« Gérer mes cookies 1 »).
		expect(html).not.toContain('href="#footer1"');
	});

	/*
	 * `footerLink--medium` n'existe dans aucune feuille : la clé calculée valait la chaîne
	 * `"undefined"` et atterrissait telle quelle dans l'attribut `class`.
	 */
	it("ne pose jamais une classe « undefined » dans le DOM", () => {
		for (const size of ["small", "medium"] as const) {
			expect(render({ size }), size).not.toContain("undefined");
			expect(render({ isConsent: true, size }), `${size} + consent`).not.toContain("undefined");
		}
	});
});
