/*
 * Bandeau de contrôle des mentions légales.
 *
 * Il ne vit PAS dans la page éditée mais dans le document de jContent, au niveau du titre de
 * page : l'iframe du Page Builder commence sous le `moonstone-header`, il est donc
 * structurellement impossible de s'y afficher depuis la page.
 *
 * Ces tests figent deux choses d'égale importance :
 *   1. le bandeau se construit dans le document PARENT, jamais dans la page ;
 *   2. la page éditée n'est touchée que sur clic explicite, et uniquement par un défilement
 *      instantané et un `outline` — la frontière qui a coûté quatre régressions du Page
 *      Builder avant d'être trouvée.
 */
import { afterEach, describe, expect, it } from "vitest";
import { Window } from "happy-dom";
import { bootPage, loadInlineScript, type ScriptHarness } from "#test/inlineScript";

const PANEL_SCRIPT = loadInlineScript("audit/panel-bootstrap.ts");

/** Anomalies telles que `FootnoteAudit.tsx` les émet. */
const ISSUES = [
	{
		kind: "orphan",
		message: "La mention (55) n'existe pas",
		where: "Section Hero — subtitle",
		hint: "…",
		targets: ['[id="uuid-hero"]', '[data-footer="footer55"]'],
		marker: '[data-footer="footer55"]',
		needles: ["⁽⁵⁵⁾", "((55))"],
		occurrence: 0,
		withinComponent: 0,
		refText: "(55)",
	},
	{
		kind: "unused",
		message: "La mention (1) n'est citée nulle part",
		where: "",
		hint: "…",
		targets: ['[id="footer1"]'],
		marker: null,
		needles: [],
		occurrence: 0,
		withinComponent: 0,
		refText: "(55)",
	},
	{
		kind: "invalid",
		message: "Le repère ((abc)) n'est pas valide",
		where: "Bloc SEO — content",
		hint: "…",
		targets: [],
		marker: null,
		needles: ["((abc))"],
		occurrence: 0,
		withinComponent: 0,
		refText: "(55)",
	},
];

/** Contenu de page par défaut : un renvoi marqué, une mention. */
const BODY =
	`<p id="texte">Taux <a href="#footer55" data-footer="footer55" class="footer-link">` +
	`<sup>(55)</sup></a></p><p id="footer1">Mention légale.</p>` +
	`<div id="bloc"><p>Composant sans marqueur</p></div>`;

const pageHtml = (issues: unknown[] = ISSUES, body = BODY) =>
	`${body}<script type="application/json" id="sof-legal-audit-data">${JSON.stringify(issues)}</script>`;

let current: ScriptHarness | null = null;
let jcontent: Window | null = null;

afterEach(() => {
	current?.close();
	jcontent?.close();
	current = null;
	jcontent = null;
});

/** Monte la page dans une iframe simulée, jContent jouant le document parent. */
function boot(issues: unknown[] = ISSUES, body?: string) {
	jcontent = new Window({ url: "https://sofinco.test/jcontent" });
	current = bootPage([PANEL_SCRIPT], pageHtml(issues, body), {
		topWindow: jcontent as unknown as Window,
	});
	return current;
}

/** Le bandeau vit dans le document parent, dans un Shadow DOM. */
function panel(): ShadowRoot | null {
	const host = jcontent!.document.querySelector("#sof-legal-audit");
	return host ? (host as unknown as { shadowRoot: ShadowRoot }).shadowRoot : null;
}

describe("emplacement", () => {
	it("construit le bandeau dans le document de jContent, jamais dans la page", () => {
		const view = boot();

		expect(view.$("#sof-legal-audit"), "rien n'est ajouté à la page éditée").toBeNull();
		expect(panel(), "le bandeau appartient au document parent").not.toBeNull();
	});

	it("le pose sur <html>, hors de la racine React de jContent", () => {
		// jContent monte son application dans `<body>` : y ajouter un enfant étranger
		// corromprait sa réconciliation — c'est ce qui faisait disparaître les zones d'ajout.
		boot();

		const host = jcontent!.document.querySelector("#sof-legal-audit")!;
		expect(host.parentElement!.tagName).toBe("HTML");
	});

	it("ne s'affiche pas quand il n'y a rien à signaler", () => {
		boot([]);

		expect(panel()).toBeNull();
	});

	it("ne s'affiche pas sans bloc de données — le site public n'en voit rien", () => {
		jcontent = new Window({ url: "https://sofinco.test/jcontent" });
		current = bootPage([PANEL_SCRIPT], "<p>Page sans contrôle</p>", {
			topWindow: jcontent as unknown as Window,
		});

		expect(panel()).toBeNull();
	});
});

describe("recalcul après correction", () => {
	/*
	 * Le diagnostic est produit pendant le rendu de la page. Or le Page Builder rafraîchit les
	 * modules EN PLACE : après une correction, `Layout` n'est pas re-rendu et le bloc de
	 * données reste celui d'avant. Le bandeau signalait indéfiniment une anomalie déjà
	 * réparée — défaut constaté sur `sofnt:seoBlock`.
	 *
	 * On redemande donc l'analyse au SERVEUR et on ne garde que le bloc de données ; rien
	 * n'est réinjecté dans le document édité.
	 */
	function stubFetch(page: ScriptHarness, issues: unknown[]) {
		const window = page.window as unknown as Record<string, unknown>;
		window.fetch = () =>
			Promise.resolve({
				ok: true,
				text: () => Promise.resolve(pageHtml(issues, "<p>corrigé</p>")),
			});
	}

	/** Laisse la chaîne de promesses du recalcul se dérouler. */
	const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

	it("fait disparaître l'anomalie une fois corrigée", async () => {
		const page = boot();
		expect(panel(), "le bandeau est là au départ").not.toBeNull();

		stubFetch(page, []);
		(panel()!.querySelector(".reload") as HTMLElement).click();
		await settle();

		expect(panel(), "plus rien à signaler : le bandeau disparaît").toBeNull();
	});

	it("se met à jour tout seul quand le Page Builder rafraîchit un module", async () => {
		const page = boot();
		stubFetch(page, [ISSUES[1]]);

		// Jahia remplace les nœuds du module qu'il rafraîchit.
		page.$("#texte")!.appendChild(page.document.createElement("span"));
		await new Promise((resolve) => setTimeout(resolve, 900));
		await settle();

		expect(panel()!.querySelector(".toggle")!.textContent).toContain("1 anomalie");
	});

	it("garde l'affichage précédent si le serveur ne répond pas — plutôt que de mentir", async () => {
		const page = boot();
		const window = page.window as unknown as Record<string, unknown>;
		window.fetch = () => Promise.reject(new Error("réseau"));

		(panel()!.querySelector(".reload") as HTMLElement).click();
		await settle();

		expect(panel()).not.toBeNull();
	});
});

describe("contenu et repli", () => {
	it("annonce le nombre d'anomalies et signale celles qui bloquent", () => {
		boot();

		const head = panel()!.querySelector(".toggle")!;
		expect(head.textContent).toContain("Mentions légales — 3 anomalies");
		expect(head.classList.contains("toggle--blocking"), "un renvoi orphelin est présent").toBe(
			true,
		);
	});

	it("reste neutre quand seules des mentions non citées subsistent", () => {
		boot([ISSUES[1]]);

		const head = panel()!.querySelector(".toggle")!;
		expect(head.textContent).toContain("Mentions légales — 1 anomalie");
		expect(head.classList.contains("toggle--blocking")).toBe(false);
	});

	it("est replié par défaut, et s'ouvre puis se referme au clic", () => {
		boot();
		const shadow = panel()!;
		const section = shadow.querySelector(".panel")!;
		const head = shadow.querySelector(".toggle") as HTMLElement;

		expect(section.hasAttribute("data-open"), "replié : on ouvre à la demande").toBe(false);

		head.click();
		expect(section.hasAttribute("data-open")).toBe(true);
		expect(head.getAttribute("aria-expanded")).toBe("true");

		head.click();
		expect(section.hasAttribute("data-open")).toBe(false);
	});

	it("rend le libellé en TEXTE, jamais en balisage", () => {
		// Il vient du contenu contributeur : l'interpréter ouvrirait une injection dans
		// l'interface d'édition.
		boot([{ ...ISSUES[0], where: "<img src=x onerror=alert(1)> — jcr:title" }]);

		const item = panel()!.querySelector(".item")!;
		expect(item.querySelector("img")).toBeNull();
		expect(item.querySelector(".where")!.textContent).toContain("<img src=x");
	});

	it("n'affiche plus d'extrait — le libellé porte déjà le texte du composant", () => {
		boot();

		expect(panel()!.querySelector(".context")).toBeNull();
	});
});

describe("aller à l'élément fautif", () => {
	it("resserre la sélection sur le TEXTE fautif à l'intérieur du composant", () => {
		/*
		 * Désigner le composant entier est juste, mais peu utile dans un titre long. On cherche
		 * la forme visible du renvoi et on retient le plus petit élément qui la porte.
		 */
		const issue = { ...ISSUES[0], targets: ['[id="bloc"]'], marker: null, needles: ["⁽⁵⁵⁾"] };
		const view = boot(
			[issue],
			`<div id="bloc"><h2 id="titre">Sofinco ⁽⁵⁵⁾ confiance</h2><p>Autre texte</p></div>`,
		);

		(panel()!.querySelector(".go") as HTMLElement).click();

		expect(view.revealed[0], "le titre, pas le bloc entier").toBe(view.$("#titre"));
	});

	it("se rabat sur le COMPOSANT quand le texte fautif est introuvable", () => {
		/*
		 * En mode édition, beaucoup de composants rendent une variante serveur où le renvoi
		 * n'est qu'un texte, sans accroche. Viser le composant est alors le seul repli — et de
		 * toute façon ce que le contributeur doit ouvrir pour corriger.
		 */
		const view = boot([
			{
				...ISSUES[0],
				targets: ['[id="absent"]', '[id="bloc"]'],
				marker: null,
				needles: ["introuvable"],
			},
		]);

		(panel()!.querySelector(".go") as HTMLElement).click();

		expect(view.revealed[0]).toBe(view.$("#bloc"));
	});

	it("affiche OÙ corriger", () => {
		boot();

		expect(panel()!.querySelector(".where")!.textContent).toBe("Section Hero — subtitle");
	});

	it("mène à CHAQUE occurrence, pas toujours à la première", () => {
		/*
		 * Une même mention manquante peut être écrite dans plusieurs composants. Le sélecteur
		 * du renvoi étant global, `querySelector` ramenait invariablement la première
		 * occurrence : les lignes du panneau menaient toutes au même endroit. Le composant
		 * lève l'ambiguïté ; à défaut, le rang de l'occurrence.
		 */
		const marker = (id: string) =>
			`<div id="${id}"><p>Taux <a data-footer="footer50"><sup>(50)</sup></a></p></div>`;
		const issue = (occurrence: number, container: string) => ({
			...ISSUES[0],
			targets: [`[id="${container}"]`, '[data-footer="footer50"]'],
			marker: '[data-footer="footer50"]',
			needles: ["⁽⁵⁰⁾"],
			occurrence,
		});

		const view = boot(
			[issue(0, "bloc-a"), issue(1, "bloc-b")],
			marker("bloc-a") + marker("bloc-b"),
		);
		const rows = panel()!.querySelectorAll(".go");

		(rows[0] as HTMLElement).click();
		(rows[1] as HTMLElement).click();

		expect(view.revealed[0]).toBe(view.$("#bloc-a a"));
		expect(view.revealed[1], "la seconde ligne mène au SECOND composant").toBe(view.$("#bloc-b a"));
	});

	it("distingue les CHAMPS d'un même composant, qui partagent le même conteneur", () => {
		/*
		 * Un composant peut porter la même erreur dans son titre, son sous-titre et sa
		 * description : trois lignes, un seul conteneur. Sans rang interne, les trois
		 * mèneraient au premier renvoi et le contributeur croirait avoir tout corrigé.
		 */
		const champ = (withinComponent: number) => ({
			...ISSUES[0],
			targets: ['[id="hero"]'],
			marker: null,
			needles: ["⁽⁵⁰⁾"],
			withinComponent,
		});

		const view = boot(
			[champ(0), champ(1), champ(2)],
			`<div id="hero"><h1 id="t">Titre ⁽⁵⁰⁾</h1><p id="s">Sous-titre ⁽⁵⁰⁾</p>` +
				`<p id="d">Description ⁽⁵⁰⁾</p></div>`,
		);
		const rows = panel()!.querySelectorAll(".go");

		(rows[0] as HTMLElement).click();
		(rows[1] as HTMLElement).click();
		(rows[2] as HTMLElement).click();

		expect(view.revealed.map((element) => element.id)).toEqual(["t", "s", "d"]);
	});

	it("NE DÉFILE PAS quand la cible est déjà à l'écran", () => {
		/*
		 * Chaque défilement est une occasion pour la surcouche de jContent de se
		 * désynchroniser — sélection décalée vers le haut, défaut intermittent constaté en
		 * recette. S'en abstenir quand c'est inutile supprime le risque au lieu de le gérer.
		 */
		const view = boot(
			[{ ...ISSUES[0], targets: ['[id="visible"]'], marker: null, needles: ["⁽⁵⁵⁾"] }],
			`<div id="visible" data-in-view><p>Taux ⁽⁵⁵⁾</p></div>`,
		);

		(panel()!.querySelector(".go") as HTMLElement).click();

		expect(view.scrolledTo, "rien à défiler : la cible est sous les yeux").toHaveLength(0);
		expect(view.revealed, "elle a tout de même été mesurée").toHaveLength(1);
		// Mais le repérage doit rester : c'est tout l'intérêt du clic.
		expect((view.$("#visible p") as HTMLElement).style.outline).toContain("3px");
	});

	it("distingue deux FORMES différentes du même renvoi — le cas réel du bloc SEO", () => {
		/*
		 * Un même `((50))` manquant, écrit dans le titre ET dans le richtext d'un composant.
		 * React rend le titre en `<a data-footer><sup class="footer-ref">(50)</sup></a>` ; le
		 * richtext, lui, n'est qu'un texte `⁽⁵⁰⁾`. Ne chercher que les marqueurs ne trouvait
		 * qu'UN candidat, et les deux lignes du panneau pointaient dessus.
		 */
		const issue = (occurrence: number) => ({
			...ISSUES[0],
			targets: ['[id="introuvable"]'],
			marker: '[data-footer="footer50"]',
			needles: ["⁽⁵⁰⁾", "((50))"],
			refText: "(50)",
			occurrence,
		});

		const view = boot(
			[issue(0), issue(1)],
			`<h1 id="titre">Sofinco <a data-footer="footer50"><sup class="footer-ref">(50)</sup></a></h1>` +
				`<p id="texte-riche">Accompagnement ⁽⁵⁰⁾ personnalisé</p>`,
		);
		const rows = panel()!.querySelectorAll(".go");

		(rows[0] as HTMLElement).click();
		(rows[1] as HTMLElement).click();

		expect(view.revealed[0], "le marqueur React du titre").toBe(view.$("#titre a"));
		expect(view.revealed[1], "puis l'exposant du richtext").toBe(view.$("#texte-riche"));
	});

	it("retrouve un renvoi INERTE, rendu sans data-footer dans un bouton", () => {
		// `FootnoteText inert` ne produit que la marque visuelle : ni href, ni data-footer.
		const view = boot(
			[
				{
					...ISSUES[0],
					targets: ['[id="introuvable"]'],
					marker: '[data-footer="footer50"]',
					needles: ["⁽⁵⁰⁾"],
					refText: "(50)",
					occurrence: 0,
				},
			],
			`<button id="cta">Je profite <sup class="footer-ref" aria-hidden="true">(50)</sup></button>`,
		);

		(panel()!.querySelector(".go") as HTMLElement).click();

		expect(view.revealed[0]).toBe(view.$("#cta .footer-ref"));
	});

	it("se rabat sur le rang de l'occurrence quand aucun composant n'est localisé", () => {
		/*
		 * Le cas RÉEL quand le Page Builder n'enveloppe pas ses modules avec les attributs
		 * attendus : aucun conteneur ne correspond, et seul le rang distingue les lignes.
		 */
		const html =
			`<p id="premier"><a data-footer="footer50"><sup>(50)</sup></a></p>` +
			`<p id="second"><a data-footer="footer50"><sup>(50)</sup></a></p>`;
		const issue = (occurrence: number) => ({
			...ISSUES[0],
			targets: ['[id="introuvable"]'],
			marker: '[data-footer="footer50"]',
			needles: [],
			occurrence,
		});

		const view = boot([issue(0), issue(1)], html);
		const rows = panel()!.querySelectorAll(".go");
		(rows[0] as HTMLElement).click();
		(rows[1] as HTMLElement).click();

		expect(view.revealed.map((element) => element.parentElement!.id)).toEqual([
			"premier",
			"second",
		]);
	});

	it("amène le renvoi à l'écran, INSTANTANÉMENT", () => {
		/*
		 * Une animation produit une rafale d'événements `scroll` ; jContent repositionne sa
		 * surcouche sur chacun et finit décalé — « la zone Hero perd sa position ». Un saut
		 * instantané équivaut à un déplacement de la barre de défilement.
		 */
		const view = boot();
		(panel()!.querySelector(".go") as HTMLElement).click();

		expect(view.revealed[0]).toBe(view.$('[data-footer="footer55"]'));
		expect(view.scrollToOptions[0]?.behavior).toBe("auto");
	});

	it("ne défile QUE le document — jamais par `scrollIntoView`", () => {
		/*
		 * NON-RÉGRESSION du défaut qui cassait le Page Builder.
		 *
		 * `scrollIntoView` ne fait pas défiler « la page » : il fait défiler TOUS les conteneurs
		 * à défilement au-dessus de la cible — `HeroArgs`, `ProductAdvantages`, le menu mobile —
		 * puis remonte jusqu'aux fenêtres parentes. La page étant dans une iframe, le navigateur
		 * déplaçait aussi le panneau de jContent : la page entière glissait sous les zones
		 * d'édition, qui paraissaient toutes décalées vers le haut.
		 *
		 * Une position calculée envoyée à `window.scrollTo` ne touche qu'un seul défileur —
		 * celui que jContent observe.
		 */
		const view = boot(
			[{ ...ISSUES[0], targets: ['[id="zone"]'], marker: null, needles: ["⁽⁵⁵⁾"] }],
			`<div id="zone" style="overflow-x: auto"><p>Taux ⁽⁵⁵⁾</p></div>`,
		);

		(panel()!.querySelector(".go") as HTMLElement).click();

		expect(view.scrolled, "aucun défilement délégué au navigateur").toHaveLength(0);
		expect(view.scrolledTo, "la barre du document, elle, a bougé").toHaveLength(1);
	});

	it("centre la cible sans jamais sortir des bornes du document", () => {
		/*
		 * La position est calculée, donc c'est à nous de la borner. Un renvoi situé tout en haut
		 * demanderait un défilement NÉGATIF pour être centré ; le navigateur ramènerait à 0,
		 * mais jContent, lui, reçoit la valeur qu'on lui donne.
		 *
		 * Le banc place la cible à 2000 px du haut du viewport, haute de 10, dans une fenêtre de
		 * 768 lue à `scrollY` 0 : le centrage vise 2000 + 0 − (768 − 10) / 2 = 1621.
		 */
		const view = boot();
		(panel()!.querySelector(".go") as HTMLElement).click();

		expect(view.scrolledTo[0]).toBe(1621);
	});

	it("ne demande jamais un défilement NÉGATIF, même pour un renvoi tout en haut", () => {
		/*
		 * Une cible haute de 10 px placée à 20 du bord voudrait être centrée à −359. Le
		 * navigateur ramènerait à 0, mais nous ne lui laissons pas cette latitude : la valeur
		 * transmise est aussi celle que lit tout observateur du défilement, jContent compris.
		 */
		const view = boot(
			[{ ...ISSUES[0], targets: ['[id="haut"]'], marker: null, needles: ["⁽⁵⁵⁾"] }],
			`<div id="haut"><p data-top="20">Taux ⁽⁵⁵⁾</p></div>`,
		);

		(panel()!.querySelector(".go") as HTMLElement).click();

		expect(view.scrolledTo[0]).toBe(0);
	});

	it("n'offre aucune action pour un repère invalide, qui n'a pas d'élément", () => {
		boot([ISSUES[2]]);

		expect(panel()!.querySelector(".go")).toBeNull();
		expect(panel()!.querySelector(".plain")).not.toBeNull();
	});

	it("ne touche la page que par un `outline`, qui n'occupe aucune place", () => {
		const view = boot();
		const reference = bootPage([], pageHtml());

		(panel()!.querySelector(".go") as HTMLElement).click();

		const target = view.$('[data-footer="footer55"]') as HTMLElement;
		expect(target.style.outline).toContain("3px");

		// Le surlignage retiré, la page est rigoureusement celle d'origine.
		target.removeAttribute("style");
		expect(view.document.body.innerHTML).toBe(reference.document.body.innerHTML);
		reference.close();
	});
});
