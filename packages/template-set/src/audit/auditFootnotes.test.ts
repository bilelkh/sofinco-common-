/*
 * Contrôle des mentions légales — ANALYSE et chaîne complète.
 *
 * Trois niveaux :
 *   1. `auditFootnotes` est une fonction PURE, testée directement ;
 *   2. la PARITÉ DES CLÉS entre une mention déclarée et un renvoi rencontré — sans elle, le
 *      contrôle signale des anomalies qui n'existent pas ;
 *   3. la chaîne complète — on rend un arbre React comme le fait `Layout` (des composants qui
 *      produisent du texte, puis le panneau APRÈS eux) et on lit le HTML obtenu. C'est le seul
 *      moyen de figer l'hypothèse dont tout dépend : le rendu serveur est synchrone et en
 *      profondeur d'abord, donc la collecte est complète au moment où le panneau se rend.
 */
import { afterEach, describe, expect, it } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	collectFootnoteNote,
	readFootnoteCollection,
	setFootnoteLocation,
	startFootnoteCollection,
	type FootnoteCollection,
} from "#lib/footnoteCollector";
import { footnoteKey, manageFooterNote, superscriptFootnoteTokens } from "#lib/footnotes";
import { auditFootnotes, footnoteIssueMessage } from "./auditFootnotes";
import { FootnoteAudit } from "./FootnoteAudit";

const labels = { note: "Note de bas de page", back: "Retour à la référence" };

afterEach(() => startFootnoteCollection(false));

describe("analyse", () => {
	const audit = (collection: Partial<FootnoteCollection>) =>
		auditFootnotes({ references: [], notes: [], ...collection });

	it("signale un renvoi dont la mention n'existe pas", () => {
		const issues = audit({
			references: [{ key: "55", location: null }],
		});

		expect(issues).toHaveLength(1);
		expect(footnoteIssueMessage(issues[0])).toBe("La mention (55) n'existe pas");
	});

	it("signale un jeton non numérique, que le visiteur voit en clair", () => {
		const issues = audit({ references: [{ key: "abc", location: null }] });

		expect(footnoteIssueMessage(issues[0])).toBe("Le repère ((abc)) n'est pas valide");
	});

	it("signale une mention que personne ne cite", () => {
		const issues = audit({ notes: [{ key: "2", source: "sofnt:mentionLegalItem" }] });

		expect(footnoteIssueMessage(issues[0])).toBe("La mention (2) n'est citée nulle part");
	});

	it("épargne les mentions du pied de page", () => {
		/*
		 * Le pied de page est rendu à l'identique sur TOUTES les pages : son texte légal
		 * appartient au site, pas à la page en cours. Le signaler produirait le même
		 * avertissement partout et noierait les vraies alertes.
		 */
		expect(audit({ notes: [{ key: "9", source: "sofnt:footer" }] })).toEqual([]);
	});

	it("ne signale rien quand tout se correspond", () => {
		expect(
			audit({
				references: [{ key: "1", location: null }],
				notes: [{ key: "1", source: "sofnt:mentionLegalItem" }],
			}),
		).toEqual([]);
	});

	it("classe les anomalies bloquantes avant les avertissements", () => {
		const issues = audit({
			references: [{ key: "9", location: null }],
			notes: [{ key: "1", source: "sofnt:mentionLegalItem" }],
		});

		expect(issues.map((i) => i.kind)).toEqual(["orphan", "unused"]);
	});
});

describe("parité des clés — mention déclarée vs renvoi rencontré", () => {
	/*
	 * EN MODE ÉDITION, `MentionLegal/default.server.tsx` court-circuite `buildNote` pour
	 * garder les items éditables : les mentions ne passent jamais par `manageFooterNote` et
	 * ne seraient donc jamais collectées. TOUS les renvois de la page étaient alors signalés
	 * « n'existe pas » — le défaut remonté en recette, surtout visible sur le richtext.
	 *
	 * La branche d'édition les déclare désormais depuis le JCR, via `footnoteKey(anchor)`.
	 * Encore faut-il que cette clé soit exactement celle des renvois : c'est ce que fige ce
	 * test. Sans la normalisation, `(1)` et `1` produiraient deux clés distinctes.
	 */
	it("aligne `anchor` sur la clé produite par un marqueur richtext", () => {
		for (const anchor of ["1", " 1 ", "(1)"]) {
			startFootnoteCollection(true);
			collectFootnoteNote(footnoteKey(anchor), "sofnt:mentionLegal");
			manageFooterNote("<p><u>taux<sup>(1)</sup></u></p>", labels, "sofnt:seoBlock");

			expect(auditFootnotes(readFootnoteCollection()), `anchor=${anchor}`).toEqual([]);
		}
	});

	it("voit le renvoi tel que le menu « Ancres de la page » l'insère", () => {
		/*
		 * LE DÉFAUT CONSTATÉ SUR `sofnt:seoBlock`. Le plugin n'écrit PAS de jeton `((n))` : il
		 * insère directement `<a href="#footerN">texte⁽ⁿ⁾</a>` (cf. sofincoPageAnchors).
		 * Ce contenu ne traverse donc ni `addFooterNote` (pas de `<u><sup>`) ni la conversion
		 * de jetons (`superscriptFootnoteTokens` sortait aussitôt, faute de `((`). Les mentions
		 * bel et bien citées étaient annoncées « jamais citées ».
		 */
		startFootnoteCollection(true);
		collectFootnoteNote(footnoteKey("1"), "sofnt:mentionLegal");
		collectFootnoteNote(footnoteKey("2"), "sofnt:mentionLegal");

		manageFooterNote(
			'<p>… pour vous <a href="#footer1">accompagner⁽¹⁾</a> à chaque instant, ' +
				'depuis votre <a href="#footer2">espace client⁽²⁾</a>.</p>',
			labels,
			"sofnt:seoBlock",
		);

		expect(auditFootnotes(readFootnoteCollection())).toEqual([]);
	});

	it("voit un exposant `⁽ⁿ⁾` déjà présent, même sans lien ni jeton", () => {
		startFootnoteCollection(true);
		collectFootnoteNote(footnoteKey("7"), "sofnt:mentionLegal");

		superscriptFootnoteTokens("Paiement différé ⁽⁷⁾ ou fractionné");

		expect(auditFootnotes(readFootnoteCollection())).toEqual([]);
	});

	it("oublie le renvoi quand le contributeur l'efface, malgré l'ancre laissée par CKEditor", () => {
		/*
		 * En effaçant le `⁽⁵⁰⁾` visible, CKEditor laisse presque toujours l'ancre derrière
		 * lui : `<a href="#footer50"></a>`. Le contrôle continuait de signaler une anomalie
		 * que le contributeur venait de corriger — et rien, dans le richtext, ne lui permettait
		 * de comprendre pourquoi.
		 */
		startFootnoteCollection(true);
		manageFooterNote('<p>Texte corrigé <a href="#footer50"></a>.</p>', labels, "sofnt:seoBlock");

		expect(readFootnoteCollection().references).toEqual([]);
	});

	it("garde le renvoi quand l'ancre porte encore du texte — c'est un lien mort", () => {
		// Le lien pointe toujours vers la mention : si elle n'existe pas, il faut le dire.
		startFootnoteCollection(true);
		manageFooterNote(
			'<p>Voir <a href="#footer50">nos conditions</a>.</p>',
			labels,
			"sofnt:seoBlock",
		);

		expect(readFootnoteCollection().references.map((r) => r.key)).toEqual(["50"]);
	});

	it("ne prend pas le retour ↩ pour un renvoi", () => {
		// Du contenu encore en cache peut porter `href="#footerN-ref"` : c'est le retour, pas
		// un renvoi. Le compter créerait une citation fantôme.
		startFootnoteCollection(true);
		manageFooterNote('<p><a class="footer-back-link" href="#footer3-ref">↩</a></p>', labels, "x");

		expect(readFootnoteCollection().references).toEqual([]);
	});

	it("aligne `anchor` sur la clé produite par un jeton `((1))`", () => {
		startFootnoteCollection(true);
		collectFootnoteNote(footnoteKey("1"), "sofnt:mentionLegal");
		superscriptFootnoteTokens("Gérez vos dépenses ((1)).");

		expect(auditFootnotes(readFootnoteCollection())).toEqual([]);
	});
});

describe("chaîne complète — production du texte puis rendu du panneau", () => {
	/** Composant qui produit du texte contributeur, comme le ferait un composant de page. */
	const Text = ({ value }: { value: string }) =>
		createElement("p", null, superscriptFootnoteTokens(value));

	/**
	 * Composant qui rend une mention légale.
	 *
	 * PAS de `eslint-disable no-dangerously-set-innerhtml` ici, contrairement aux vues
	 * du template-set : cette règle ne lit que la forme JSX `dangerouslySetInnerHTML={…}`.
	 * En `createElement` la propriété n'est qu'une clé d'objet, invisible pour elle — le
	 * directive serait signalé mort (`reportUnusedDisableDirectives`).
	 */
	const Note = ({ html, source }: { html: string; source: string }) =>
		createElement("div", {
			dangerouslySetInnerHTML: { __html: manageFooterNote(html, labels, source) },
		});

	/** Reproduit `Layout` : les enfants d'abord, le panneau APRÈS. */
	const renderPage = (children: ReactNode[]) =>
		renderToStaticMarkup(createElement("body", null, children, createElement(FootnoteAudit)));

	/** Les anomalies telles qu'elles sont transmises au bandeau. */
	const issuesOf = (html: string) => {
		const json = /id="sof-legal-audit-data"[^>]*>([\s\S]*?)<\/script>/.exec(html);
		// Aucun déséchappement à faire : la séquence d'échappement unicode est standard
		// en JSON, `JSON.parse` la relit nativement comme un `<`.
		return json ? (JSON.parse(json[1]) as Array<Record<string, string>>) : [];
	};

	it("détecte de bout en bout un renvoi sans mention", () => {
		startFootnoteCollection(true);

		const issues = issuesOf(
			renderPage([
				createElement(Text, { key: "t", value: "Gérez vos dépenses ((55))." }),
				createElement(Note, {
					key: "n",
					source: "sofnt:mentionLegalItem",
					html: "<p><sup>(1)</sup> Mention.</p>",
				}),
			]),
		);

		expect(issues.map((i) => i.message)).toEqual([
			"La mention (55) n'existe pas",
			// La mention 1 existe, mais personne ne l'appelle.
			"La mention (1) n'est citée nulle part",
		]);
		// Sans lieu connu (aucun `str()` n'a été appelé ici), il n'y a pas de conteneur : le
		// script se rabat sur le marqueur et le rang de l'occurrence.
		expect(issues[0].targets).toEqual([]);
		expect(issues[0].marker, "cliquer mène au renvoi fautif").toBe('[data-footer="footer55"]');
	});

	it("relie un renvoi richtext `<u>…<sup>(1)</sup></u>` à sa mention", () => {
		startFootnoteCollection(true);

		const html = renderPage([
			createElement(Note, {
				key: "m",
				source: "sofnt:seoBlock",
				html: "<p>taux <u>fixe<sup>(1)</sup></u></p>",
			}),
			createElement(Note, {
				key: "n",
				source: "sofnt:mentionLegalItem",
				html: "<p><sup>(1)</sup> Mention.</p>",
			}),
		]);

		expect(html, "tout se correspond : aucun panneau").not.toContain("sof-legal-audit");
	});

	it("n'affiche RIEN quand la collecte est désarmée — le site public n'en voit rien", () => {
		startFootnoteCollection(false);

		const html = renderPage([createElement(Text, { key: "t", value: "Taux ((55))." })]);

		expect(html).not.toContain("sof-legal-audit");
	});

	it("n'émet AUCUN balisage visible dans la page éditée", () => {
		/*
		 * C'est la condition de survie dans le Page Builder. Quatre versions successives y ont
		 * cassé les zones d'ajout, pour quatre raisons différentes. La page ne reçoit plus
		 * qu'un bloc de données inerte : sans rendu, sans emprise sur la mise en page, et que
		 * Jahia ne peut ni mesurer ni sélectionner. Le bandeau, lui, est construit dans le
		 * document de jContent.
		 */
		startFootnoteCollection(true);

		const html = renderPage([createElement(Text, { key: "t", value: "Taux ((55))." })]);

		expect(html).toContain('type="application/json"');
		expect(html, "aucun élément rendu").not.toMatch(/<(div|section|details|ul|button)/);
		expect(html, "aucun gestionnaire en ligne").not.toMatch(/\son[a-z]+=/);
	});

	it("vise le COMPOSANT avant tout, pour distinguer les occurrences d'une même clé", () => {
		/*
		 * Le sélecteur du renvoi est global : `querySelector` ramènerait toujours la première
		 * occurrence de la page. Quand la même mention manquante est écrite dans plusieurs
		 * composants, toutes les lignes du panneau mèneraient au même endroit. Le composant
		 * lève l'ambiguïté, il doit donc être essayé EN PREMIER.
		 */
		startFootnoteCollection(true);
		setFootnoteLocation({
			id: "uuid-hero",
			path: "/site/hero",
			property: "subtitle",
			label: "Hero — subtitle",
		});

		const issue = issuesOf(
			renderPage([createElement(Text, { key: "t", value: "Gérez vos dépenses ((50))." })]),
		)[0] as unknown as { targets: string[]; marker: string; occurrence: number };

		expect(issue.targets[0], "le composant d'abord").toBe('[id="uuid-hero"]');
		/*
		 * AUCUN sélecteur global parmi les conteneurs : `[data-footer="footerN"]` y aurait
		 * été pris pour un conteneur, et le resserrement l'aurait renvoyé tel quel — le
		 * premier de la page, pour toutes les lignes. Le repli global relève de `nth()`,
		 * qui respecte le rang.
		 */
		expect(issue.targets, "aucun sélecteur global parmi les conteneurs").not.toContain(
			'[data-footer="footer50"]',
		);
		expect(issue.marker, "il sert à resserrer, pas à contenir").toBe('[data-footer="footer50"]');
		expect(issue.occurrence).toBe(0);
	});

	it("numérote les occurrences d'une même clé, dans l'ordre de rendu", () => {
		startFootnoteCollection(true);

		setFootnoteLocation({ id: "a", path: "/a", property: "subtitle", label: "Hero — subtitle" });
		superscriptFootnoteTokens("Gérez vos dépenses ((50))");
		setFootnoteLocation({ id: "b", path: "/b", property: "content", label: "Bloc SEO — content" });
		superscriptFootnoteTokens("Sofinco ((50)) réinvente");

		const ranks = issuesOf(renderPage([])).map(
			(issue) => (issue as unknown as { occurrence: number }).occurrence,
		);

		expect(ranks).toEqual([0, 1]);
	});

	it("échappe `<` dans les données, qu'un `</script>` refermerait", () => {
		/*
		 * Le contenu d'un `<script>` est du texte brut : un `<` non échappé pourrait refermer
		 * la balise et faire passer la suite pour du balisage. `footnoteSnippet` retire déjà
		 * les balises complètes, mais un `<` isolé lui survit — d'où cette seconde barrière.
		 */
		startFootnoteCollection(true);
		// Le libellé reprend le nom du composant, saisi par le contributeur.
		setFootnoteLocation({
			id: "a",
			path: "/a",
			property: "subtitle",
			label: "Offre < 100 € — jcr:title",
		});

		const html = renderPage([createElement(Text, { key: "t", value: "Mensualité ((55))" })]);

		const raw = /id="sof-legal-audit-data"[^>]*>([\s\S]*?)<\/script>/.exec(html)![1];
		expect(raw, "aucun `<` brut : il aurait pu refermer la balise").not.toContain("<");
		expect(raw, "la séquence d'échappement est bien présente").toContain("u003c");
		expect(issuesOf(html)[0].where, "et la donnée reste intacte à la relecture").toContain("< 100");
	});
});
