/*
 * Tests DOM du script client des notes de bas de page.
 *
 * C'est la partie la plus corrigée du dispositif, et la seule qui soit longtemps restée
 * sans filet : mémoire du marqueur, identifiants dupliqués, diapositives recyclées, îlots
 * hydratés, renvois orphelins. Tous ces défauts ont été trouvés en recette, un par un.
 * Chaque cas ci-dessous en fige un.
 *
 * Le script est chargé COMME EN PRODUCTION (cf. `#test/inlineScript`) : on teste
 * l'artefact livré, pas une réécriture.
 */
import { afterEach, describe, expect, it } from "vitest";
import {
	bootPage,
	loadInlineScript,
	marker,
	note,
	type BootOptions,
	type ScriptHarness,
} from "#test/inlineScript";

const BOOTSTRAP = loadInlineScript("lib/footnote-bootstrap.ts");

let current: ScriptHarness | null = null;

afterEach(() => {
	current?.close();
	current = null;
});

function boot(html: string, options?: BootOptions) {
	current = bootPage([BOOTSTRAP], html, options);
	return current;
}

describe("aller vers la note", () => {
	it("défile vers la note et garde le fragment hors de l'URL", () => {
		const page = boot(`<p>Taux fixe ${marker(1)}</p>${note(1)}`);

		const prevented = page.click(".footer-link");

		expect(prevented, "le clic doit être intercepté, sinon #footer1 atterrit dans l'URL").toBe(
			true,
		);
		expect(page.scrolled[0]).toBe(page.$("#footer1"));
	});

	it("gère aussi un lien qui ne porte que son href (menu d'ancres de jContent)", () => {
		const page = boot(`<p>Voir <a href="#footer2">la note</a></p>${note(2)}`);

		expect(page.click('a[href="#footer2"]')).toBe(true);
		expect(page.scrolled[0]).toBe(page.$("#footer2"));
	});
});

describe("note repliée — le bloc doit s'ouvrir", () => {
	/*
	 * Balisage de `MentionLegal` réduit à son contrat ARIA : un bouton `aria-expanded`, un
	 * panneau `aria-controls`, et la note dedans. Replié, le bloc n'est pas démonté — il est
	 * réduit à une hauteur nulle — donc `getElementById` trouvait la note et le défilement
	 * partait quand même : le lecteur arrivait devant un bloc fermé.
	 */
	const collapsible = (n: number, expanded: boolean) =>
		`<section>` +
		`<button type="button" aria-expanded="${expanded}" aria-controls="ml">Voir les conditions</button>` +
		`<div id="ml">${note(n)}</div>` +
		`</section>`;

	/** Simule le composant : le clic sur le bouton ouvre le panneau, comme le ferait React. */
	function wireToggle(page: ReturnType<typeof boot>) {
		const toggle = page.$("button[aria-controls]") as HTMLElement;
		const opened: string[] = [];
		toggle.addEventListener("click", () => {
			opened.push(toggle.getAttribute("aria-expanded") || "");
			toggle.setAttribute("aria-expanded", "true");
		});
		return opened;
	}

	/** Attente réelle : la correction de tir est programmée à la fin de l'ouverture. */
	const afterOpening = () => new Promise((resolve) => setTimeout(resolve, 400));

	it("ouvre le bloc PAR SON BOUTON et vise SANS ATTENDRE, puis corrige le tir", async () => {
		/*
		 * Par son bouton, et jamais en écrivant dans son DOM : le bloc est un îlot React, une
		 * classe posée derrière son dos serait effacée au re-rendu et son état interne
		 * resterait « fermé ».
		 *
		 * Et le défilement part TOUT DE SUITE : différer l'appel à `reveal` jusqu'à la fin de
		 * l'ouverture fonctionnait, mais le premier clic accusait alors un temps mort que le
		 * second n'avait pas. Le rejeu n'est qu'une correction de position.
		 */
		const page = boot(`<p>Taux fixe ${marker(1)}</p>${collapsible(1, false)}`);
		const opened = wireToggle(page);

		page.click(".footer-link");

		expect(opened, "le bloc replié doit s'ouvrir").toEqual(["false"]);
		expect(page.scrolled[0], "aucun temps mort : on vise dès le clic").toBe(page.$("#footer1"));

		const immediate = page.scrolled.length;
		await afterOpening();

		expect(
			page.scrolled.length,
			"le clic rejoué re-vise une position devenue juste",
		).toBeGreaterThan(immediate);
		expect(page.scrolled.at(-1)).toBe(page.$("#footer1"));
	});

	it("abandonne la correction si le lecteur reprend la main", () => {
		/*
		 * Même règle que la poursuite de cible : dès qu'il défile, l'utilisateur est
		 * prioritaire. Lui imposer un défilement de plus 300 ms après serait pire que le
		 * défaut qu'on corrige.
		 */
		const page = boot(`<p>Taux fixe ${marker(1)}</p>${collapsible(1, false)}`);
		const opened = wireToggle(page);

		page.click(".footer-link");
		const immediate = page.scrolled.length;
		page.window.dispatchEvent(new page.window.Event("wheel") as never);

		expect(opened).toEqual(["false"]);
		return afterOpening().then(() => {
			expect(page.scrolled.length, "aucun défilement imposé après la reprise en main").toBe(
				immediate,
			);
		});
	});

	it("laisse tranquille un bloc déjà ouvert", () => {
		// Rien à ouvrir, donc aucune correction à programmer : chemin d'origine, intact.
		const page = boot(`<p>Taux fixe ${marker(1)}</p>${collapsible(1, true)}`);
		const opened = wireToggle(page);

		page.click(".footer-link");

		expect(opened, "un second clic aurait REFERMÉ le bloc").toEqual([]);
		expect(page.scrolled[0]).toBe(page.$("#footer1"));
	});

	it("n'ouvre pas un bloc qui ne contient pas la note", () => {
		const page = boot(
			`<p>Taux fixe ${marker(1)}</p>` +
				`<section><button type="button" aria-expanded="false" aria-controls="ml">Autre</button>` +
				`<div id="ml">Sans rapport</div></section>` +
				note(1),
		);
		const opened = wireToggle(page);

		page.click(".footer-link");

		expect(opened).toEqual([]);
		expect(page.scrolled[0], "aucune ouverture, donc aucun report").toBe(page.$("#footer1"));
	});

	it("déplie aussi un `<details>` natif — c'est la forme retenue par la FAQ", async () => {
		const page = boot(
			`<p>Taux fixe ${marker(2)}</p><details><summary>Q</summary>${note(2)}</details>`,
		);

		page.click(".footer-link");

		expect((page.$("details") as HTMLDetailsElement).open).toBe(true);
		expect(page.scrolled[0]).toBe(page.$("#footer2"));

		await afterOpening();

		expect(page.scrolled.at(-1)).toBe(page.$("#footer2"));
	});

	it("ne rejoue le clic QU'UNE FOIS, même si le bloc refuse de s'ouvrir", async () => {
		/*
		 * Un composant tiers peut ignorer le clic et laisser `aria-expanded="false"`. Sans
		 * garde-fou, le clic rejoué relancerait une ouverture, donc un nouveau rejeu, sans fin.
		 */
		const page = boot(`<p>Taux fixe ${marker(1)}</p>${collapsible(1, false)}`);
		const toggle = page.$("button[aria-controls]") as HTMLElement;
		let clicks = 0;
		toggle.addEventListener("click", () => clicks++); // n'ouvre rien : aria-expanded reste faux

		page.click(".footer-link");
		await afterOpening();

		expect(clicks, "une seule tentative d'ouverture").toBe(1);
		expect(page.scrolled.at(-1), "le lecteur est quand même envoyé sur la note").toBe(
			page.$("#footer1"),
		);
	});

	it("ne touche à aucun bloc en mode édition", () => {
		// Le Page Builder reste maître de son document : ouvrir un bloc, c'est déjà le modifier.
		const page = boot(`<p>Taux fixe ${marker(1)}</p>${collapsible(1, false)}`, {
			editMode: true,
		});
		const opened = wireToggle(page);

		page.click(".footer-link");

		expect(opened).toEqual([]);
	});
});

describe("retour vers le marqueur", () => {
	it("revient au marqueur RÉELLEMENT cliqué quand la note est appelée plusieurs fois", () => {
		/*
		 * Le second appel ne porte pas d'id : le dupliquer serait invalide et
		 * `getElementById` renverrait toujours le premier. C'est le défaut d'origine — la
		 * flèche ↩ ramenait systématiquement en haut de page.
		 */
		const page = boot(
			`<p id="p1">Début ${marker(1)}</p>` + `<p id="p2">Plus bas ${marker(1)}</p>` + note(1),
		);
		const second = page.$$(".footer-link")[1];

		page.click(second);
		page.click(".footer-back-link");

		expect(page.scrolled.at(-1), "retour attendu sur le second marqueur").toBe(second);
	});

	it("se rabat sur la section conteneur quand le marqueur a été détaché (carrousel)", () => {
		const page = boot(
			`<section id="carrousel"><div class="slide">${marker(3)}</div></section>${note(3)}`,
		);
		const first = page.$(".footer-link")!;

		page.click(first);
		// Autoplay : la diapositive cliquée est recyclée.
		page.$(".slide")!.remove();
		page.click(".footer-back-link");

		expect(page.scrolled.at(-1)).toBe(page.$("#carrousel"));
	});

	it("se rabat sur la section quand le marqueur est replié plutôt que détaché", () => {
		const page = boot(
			`<section id="bloc"><div data-collapsed>${marker(4)}</div></section>${note(4)}`,
		);

		page.click(".footer-link");
		page.$(".footer-link")!.setAttribute("data-collapsed", "");
		page.click(".footer-back-link");

		expect(page.scrolled.at(-1)).toBe(page.$("#bloc"));
	});

	it("restaure la position de lecture quand plus rien n'est identifiable", () => {
		const page = boot(`<div id="zone">${marker(5)}</div>${note(5)}`, { scrollY: 1234 });

		page.click(".footer-link");
		page.$("#zone")!.remove();
		page.click(".footer-back-link");

		expect(page.scrolledTo.at(-1)).toBe(1234);
	});

	it("vise le PREMIER marqueur en l'absence de tout souvenir (arrivée par URL)", () => {
		// Aucun marqueur ne porte d'identifiant : la résolution passe par `data-footer`, ce
		// qui donne le premier en ordre document — exactement ce que le navigateur retenait
		// quand l'identifiant était dupliqué, mais sans HTML invalide.
		const page = boot(`<p>Premier ${marker(6)}</p><p>Second ${marker(6)}</p>${note(6)}`);

		page.click(".footer-back-link");

		expect(page.scrolled.at(-1)).toBe(page.$$(".footer-link")[0]);
	});
});

describe("références `⁽¹⁾` en texte simple", () => {
	it("transforme une référence hors îlot en lien, avec le libellé lecteur d'écran", () => {
		const page = boot(`<p id="txt">Taux fixe ⁽¹⁾</p>${note(1)}`, { label: "note de bas de page" });

		const link = page.$("#txt .footer-link") as HTMLAnchorElement | null;
		expect(link, "la référence hors îlot doit devenir cliquable").not.toBeNull();
		expect(link!.getAttribute("href")).toBe("#footer1");
		expect(link!.getAttribute("data-footer")).toBe("footer1");
		expect(link!.querySelector(".footer-ref")!.tagName, "un vrai <sup>, pas un <span>").toBe("SUP");
		expect(link!.querySelector(".footer-ref")!.textContent).toBe("(1)");
		expect(link!.querySelector(".sr-only")!.textContent).toBe("note de bas de page");
	});

	it("fait converger le jeton brut `((1))` et la forme `⁽¹⁾` vers le même <sup>", () => {
		for (const source of ["Taux fixe ((1))", "Taux fixe ⁽¹⁾"]) {
			const page = boot(`<p id="txt">${source}</p>${note(1)}`);
			const mark = page.$("#txt .footer-ref")!;

			expect(mark.tagName).toBe("SUP");
			expect(mark.textContent).toBe("(1)");
			expect(
				page.$("#txt")!.textContent,
				"ni le jeton ni les caractères exposant ne restent",
			).not.toMatch(/\(\(1\)\)|⁽¹⁾/);
			page.close();
		}
	});

	it("émet des chiffres ASCII, jamais de caractère exposant Unicode", () => {
		/*
		 * Les caractères exposant sont répartis sur deux blocs Unicode : `¹²³` en Latin-1,
		 * mais `⁰⁴⁵⁶⁷⁸⁹` et les parenthèses `⁽⁾` en Superscripts and Subscripts — que les
		 * polices du site ne couvrent pas (mesuré : Figtree n'a ni `⁽` ni `⁾`, Cutta n'a que
		 * 3 des 12 caractères). Les émettre provoquait un repli de police sur chaque renvoi,
		 * et un décrochage visible à partir de la note 4. `<sup>` élève le texte sans
		 * dépendre d'un glyphe.
		 */
		const page = boot(`<p id="txt">A ⁽⁴⁾ B ⁽⁹⁾</p>${note(4)}${note(9)}`);

		const html = page.$("#txt")!.innerHTML;
		expect(html).not.toMatch(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁽⁾]/);
		expect(page.$$("#txt sup.footer-ref").map((s) => s.textContent)).toEqual(["(4)", "(9)"]);
	});

	it("N'ÉCRIT JAMAIS dans un <jsm-island> — c'est la règle qui protège l'hydratation", () => {
		/*
		 * Un îlot est réconcilié par React : toute modification faite avant l'hydratation
		 * provoque l'erreur #418, React jette le sous-arbre et le re-rend. Le composant
		 * clignote et le lien est perdu de toute façon.
		 */
		const page = boot(`<jsm-island><p id="dans">Taux ⁽¹⁾</p></jsm-island>${note(1)}`);

		expect(page.$("#dans .footer-link")).toBeNull();
		expect(page.$("#dans")!.textContent).toContain("⁽¹⁾");
	});

	it("laisse inerte une référence orpheline plutôt que de créer un lien mort", () => {
		const page = boot(`<p id="txt">Taux ⁽⁹⁾</p>${note(1)}`);

		expect(page.$("#txt .footer-link")).toBeNull();
		expect(page.$("#txt")!.textContent).toContain("⁽⁹⁾");
	});

	it("ne retraite pas un marqueur déjà construit par le serveur", () => {
		const page = boot(`<p id="txt">Taux ${marker(1)}</p>${note(1)}`);

		expect(page.$$("#txt .footer-link")).toHaveLength(1);
	});

	it("ne crée pas de lien dans un lien", () => {
		const page = boot(`<p id="txt"><a href="/offre">Notre offre ⁽¹⁾</a></p>${note(1)}`);

		expect(page.$("#txt .footer-link")).toBeNull();
	});

	it("ignore le contenu de <script>, <style> et <code>", () => {
		const page = boot(
			`<div id="txt"><code>((1))</code><script>var a = "⁽¹⁾";</script></div>${note(1)}`,
		);

		expect(page.$("#txt .footer-link")).toBeNull();
	});

	it("n'émet aucun identifiant, même quand la note est citée plusieurs fois", () => {
		/*
		 * Sur une page réelle du site, jusqu'à DIX renvois pointent vers la note 2. Un
		 * `id="footer2-ref"` par marqueur produisait dix éléments homonymes : l'unicité de
		 * `id` est normative en HTML, donc validation W3C et revue RGAA en échec. Le retour
		 * se résout par `data-footer`, ce qui donne le même résultat sans HTML invalide.
		 */
		const page = boot(`<p id="txt">A ⁽¹⁾ B ⁽¹⁾ C ⁽¹⁾</p>${note(1)}`);

		const links = page.$$("#txt .footer-link");
		expect(links).toHaveLength(3);
		expect(links.some((l) => l.hasAttribute("id"))).toBe(false);
		expect(links.every((l) => l.getAttribute("data-footer") === "footer1")).toBe(true);
	});

	it("se passe du libellé quand la globale est absente, sans casser le lien", () => {
		const page = boot(`<p id="txt">Taux ⁽¹⁾</p>${note(1)}`, { label: "" });

		expect(page.$("#txt .footer-link")).not.toBeNull();
		expect(page.$("#txt .sr-only")).toBeNull();
	});
});

describe("mode édition — le script ne touche à RIEN", () => {
	/*
	 * Dans le Page Builder, la page n'est pas une page : c'est l'espace de travail de
	 * jContent. Jahia y monte ses zones de sélection et ses boutons d'ajout, et conserve des
	 * références sur les nœuds. Ce script réécrit des nœuds de texte pour poser les liens de
	 * renvoi — les zones disparaissaient alors, et seul le double-clic répondait encore.
	 * Défaut constaté en ajoutant ou supprimant une mention légale, c'est-à-dire quand il y
	 * a justement des renvois à réécrire.
	 */
	const HTML = `<p id="txt">Taux ⁽¹⁾ et ${marker(9)} et ${marker(1)}</p>${note(1)}`;
	const page = () => boot(HTML, { editMode: true });

	it("laisse le document rigoureusement intact", () => {
		const edit = page();
		// Référence : la MÊME source montée sans aucun script. Comparer au HTML brut serait
		// fragile — l'analyseur normalise l'ordre et la citation des attributs.
		const untouched = bootPage([], HTML, {});

		expect(edit.document.body.innerHTML).toBe(untouched.document.body.innerHTML);
		untouched.close();
	});

	it("ne convertit aucune référence en lien", () => {
		expect(page().$("#txt .footer-ref")).toBeNull();
	});

	it("ne neutralise aucun renvoi orphelin", () => {
		const edit = page();
		const orphan = edit.$$("#txt a").find((a) => a.getAttribute("href") === "#footer9")!;

		expect(orphan.hasAttribute("data-footnote-orphan")).toBe(false);
		expect(orphan.classList.contains("footer-link")).toBe(true);
	});

	it("n'intercepte pas le clic — la sélection de Jahia doit rester maîtresse", () => {
		const edit = page();

		const prevented = edit.click('#txt a[href="#footer1"]');

		expect(prevented, "aucun preventDefault : Jahia gère le clic").toBe(false);
		expect(edit.scrolled, "aucun défilement provoqué").toHaveLength(0);
	});

	it("ne pose de tabindex sur aucun élément du contenu édité", () => {
		// `reveal` rend sa cible focalisable pour les technologies d'assistance : un attribut
		// de plus dans un module que Jahia observe.
		const edit = page();
		edit.click(".footer-back-link");
		edit.click('#txt a[href="#footer1"]');

		expect(edit.$$("[tabindex]")).toHaveLength(0);
	});
});

describe("renvois orphelins — la mention citée n'existe pas", () => {
	it("retire l'affordance de lien hors îlot, sans toucher au texte", () => {
		const page = boot(`<p id="txt">Taux ${marker(5)}</p>${note(1)}`);

		const reference = page.$("#txt a")!;
		expect(reference.getAttribute("href"), "un lien mort ne doit pas rester cliquable").toBeNull();
		expect(reference.getAttribute("data-footer")).toBeNull();
		expect(reference.classList.contains("footer-link")).toBe(false);
		// L'identifiant visé survit : c'est ce qui permet de dire QUELLE mention manque.
		expect(reference.getAttribute("data-footnote-orphan")).toBe("footer5");
		expect(
			page.$("#txt")!.textContent,
			"le lecteur doit continuer à voir qu'une mention est annoncée",
		).toContain("(5)");
	});

	it("ne touche pas un renvoi dont la mention existe", () => {
		const page = boot(`<p id="txt">Taux ${marker(1)}</p>${note(1)}`);

		const reference = page.$("#txt a")!;
		expect(reference.getAttribute("href")).toBe("#footer1");
		expect(reference.hasAttribute("data-footnote-orphan")).toBe(false);
	});

	it("ne neutralise JAMAIS dans un îlot avant l'hydratation", () => {
		/*
		 * Retirer `href` avant que React n'hydrate ferait diverger le DOM de ce qu'il rend :
		 * erreur #418, sous-arbre rejeté, composant qui clignote. Même règle absolue que la
		 * passe de références.
		 */
		const page = boot(`<jsm-island><p id="dans">Taux ${marker(5)}</p></jsm-island>${note(1)}`);

		expect(page.$("#dans a")!.getAttribute("href")).toBe("#footer5");
	});

	it("neutralise un orphelin d'îlot AU CLIC — l'interaction prouve que la page est hydratée", () => {
		const page = boot(`<jsm-island><p id="dans">Taux ${marker(5)}</p></jsm-island>${note(1)}`);

		const prevented = page.click("#dans a");

		expect(prevented, "le clic reste intercepté : pas de #footer5 dans l'URL").toBe(true);
		expect(page.scrolled, "rien à atteindre, donc aucun défilement").toHaveLength(0);
		expect(page.$("#dans a")!.getAttribute("href")).toBeNull();
		expect(page.$("#dans a")!.getAttribute("data-footnote-orphan")).toBe("footer5");
	});

	it("ne neutralise jamais le retour ↩", () => {
		// C'est un `<button>` sans href : il ne peut pas être un lien mort, et la
		// neutralisation ne doit pas s'y appliquer.
		const page = boot(note(7));

		const back = page.$(".footer-back-link")!;
		expect(back.tagName).toBe("BUTTON");
		expect(back.hasAttribute("data-footnote-orphan")).toBe(false);
	});
});
