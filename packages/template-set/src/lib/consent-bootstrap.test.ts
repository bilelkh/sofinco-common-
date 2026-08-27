/*
 * Tests DOM du délégué de consentement.
 *
 * Le script est chargé COMME EN PRODUCTION (cf. `#test/inlineScript`) : on teste
 * l'artefact livré, pas une réécriture. Il n'a qu'un rôle, mais c'est celui dont dépend
 * une obligation réglementaire — le retrait du consentement doit rester aussi simple que
 * son recueil.
 */
import { afterEach, describe, expect, it } from "vitest";
import { bootPage, loadInlineScript, type ScriptHarness } from "#test/inlineScript";

const BOOTSTRAP = loadInlineScript("lib/consent-bootstrap.ts");

let current: ScriptHarness | null = null;

afterEach(() => {
	current?.close();
	current = null;
});

function boot(html: string) {
	current = bootPage([BOOTSTRAP], html);
	return current;
}

/** File d'attente du SDK Didomi, telle que le script la voit / la crée. */
const queue = (page: ScriptHarness): Array<(sdk: unknown) => void> =>
	((page.window as unknown as Record<string, unknown>).didomiOnReady ?? []) as Array<
		(sdk: unknown) => void
	>;

/** Balisage réellement produit par `Footer` pour l'entrée marquée `isConsent`. */
const BUTTON = `<button type="button" data-consent-action="preferences">Gérer mes cookies</button>`;

describe("ouverture des préférences", () => {
	it("empile une callback dans didomiOnReady au clic sur le bouton", () => {
		const page = boot(BUTTON);

		page.click("button");

		expect(queue(page)).toHaveLength(1);
	});

	it("appelle Didomi.preferences.show quand le SDK draine la file", () => {
		const page = boot(BUTTON);
		page.click("button");

		let shown = 0;
		queue(page)[0]({ preferences: { show: () => (shown += 1) } });

		expect(shown).toBe(1);
	});

	/*
	 * Le vrai motif du `didomiOnReady.push` : le SDK est chargé en async. Un clic survenu
	 * avant sa fin de chargement doit être différé, pas perdu — et surtout pas lever une
	 * ReferenceError. Ici la file est créée par le script lui-même, donc aucun SDK n'est
	 * présent au moment du clic.
	 */
	it("survit à un clic antérieur au chargement du SDK", () => {
		const page = boot(BUTTON);

		expect(() => page.click("button")).not.toThrow();
		expect(queue(page)).toHaveLength(1);
	});

	it("conserve les callbacks déjà en file plutôt que de les écraser", () => {
		const page = boot(BUTTON);
		(page.window as unknown as Record<string, unknown>).didomiOnReady = [() => {}];

		page.click("button");

		expect(queue(page)).toHaveLength(2);
	});

	it("réagit au clic sur un descendant du bouton", () => {
		const page = boot(
			`<button type="button" data-consent-action="preferences"><span>Gérer mes cookies</span></button>`,
		);

		page.click("span");

		expect(queue(page)).toHaveLength(1);
	});

	it("ne fait rien sans SDK ni méthode show", () => {
		const page = boot(BUTTON);
		page.click("button");

		expect(() => queue(page)[0](undefined)).not.toThrow();
		expect(() => queue(page)[0]({})).not.toThrow();
		expect(() => queue(page)[0]({ preferences: {} })).not.toThrow();
	});

	/*
	 * L'élément est un `<button type="button">` : rien à annuler. Le vérifier interdit
	 * qu'un `preventDefault` réapparaisse et vienne, lui, casser un lien voisin.
	 */
	it("n'annule pas l'événement", () => {
		const page = boot(BUTTON);

		expect(page.click("button")).toBe(false);
	});
});

describe("portée du délégué", () => {
	it("ignore un clic hors de tout élément d'action", () => {
		const page = boot(`${BUTTON}<a href="/mentions-legales">Mentions</a>`);

		page.click("a");

		expect(queue(page)).toHaveLength(0);
	});

	/*
	 * L'attribut est un contrat partagé avec le design system : une valeur inconnue doit
	 * rester inerte plutôt que d'ouvrir le panneau par défaut. C'est ce qui permettra
	 * d'ajouter une seconde action sans rendre la première ambiguë.
	 */
	it("ignore une action inconnue", () => {
		const page = boot(`<button type="button" data-consent-action="autre">X</button>`);

		page.click("button");

		expect(queue(page)).toHaveLength(0);
	});

	/*
	 * Le lien voisin porte l'ancre qui servait de repère dans la version précédente. Elle
	 * ne doit plus rien déclencher : le seul contrat est désormais l'attribut.
	 */
	it("ignore un lien portant l'ancienne ancre", () => {
		const page = boot(`<a href="#gerer-mes-cookies">Gérer mes cookies</a>`);

		page.click("a");

		expect(queue(page)).toHaveLength(0);
	});
});
