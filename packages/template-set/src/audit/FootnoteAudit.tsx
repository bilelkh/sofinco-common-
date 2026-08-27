/*
 * CONTRÔLE DES MENTIONS LÉGALES — données du panneau, en mode édition.
 *
 * Rendu APRÈS `{children}` dans `Layout`, donc après que tous les composants ont produit
 * leur texte : le rendu serveur est synchrone et en profondeur d'abord, ce qui garantit que
 * la collecte (`footnoteCollector.ts`) est complète à ce moment-là.
 *
 * CE COMPOSANT N'AFFICHE RIEN. Il n'émet qu'un `<script type="application/json">` — un nœud
 * inerte, sans rendu ni emprise sur la mise en page. Le bandeau, lui, est construit par
 * `legal-audit-panel.ts` DANS LE DOCUMENT DE jCONTENT, au-dessus du `moonstone-header` :
 * l'iframe commence sous cet en-tête, il est donc structurellement impossible de s'y
 * afficher depuis la page.
 *
 * C'est aussi ce qui met le Page Builder définitivement hors de portée : la page éditée ne
 * reçoit qu'un bloc de données que Jahia ne peut ni mesurer ni sélectionner.
 *
 * Le DIAGNOSTIC reste calculé côté serveur, à partir de ce que les composants ont réellement
 * produit — jamais par inspection du DOM. C'est ce qui lui permet de voir les renvois sous
 * toutes leurs formes, y compris ceux que le menu « Ancres de la page » insère.
 */
import { readFootnoteCollection } from "#lib/footnoteCollector";
import { readUnresolvedInsuranceVars } from "#lib/insuranceVars";
import { auditFootnotes, footnoteIssueMessage, type FootnoteIssue } from "./auditFootnotes";
import {
	auditSimulationVars,
	simulationVarIssueMessage,
	simulationVarIssueHint,
	type SimulationVarIssue,
} from "./auditSimulationVars";

/** Identifiant du bloc de données, lu par `legal-audit-panel.ts`. */
export const AUDIT_DATA_ID = "sof-legal-audit-data";

/** Aide contextuelle : le quoi faire, pas seulement le quoi. */
const HINTS: Record<FootnoteIssue["kind"], string> = {
	orphan:
		"Ce texte renvoie à une mention légale absente de la page. " +
		"Ajoutez la mention correspondante, ou supprimez le renvoi.",
	invalid:
		"Seuls les numéros sont convertis : écrivez ((1)), et non ((a)). " +
		"En l'état, le repère reste affiché tel quel aux visiteurs.",
	unused:
		"Cette mention légale n'est appelée par aucun texte de la page. " +
		"Ajoutez un renvoi ((n)) là où elle s'applique, ou supprimez-la.",
};

/**
 * Éléments à essayer, DANS L'ORDRE, quand le contributeur clique la ligne.
 *
 * Plusieurs candidats et non un seul, parce qu'aucun n'est toujours présent :
 *
 *   1. le RENVOI lui-même (`[data-footer]`) — le plus précis, mais il n'existe que si le
 *      composant a rendu un marqueur ; en mode édition beaucoup rendent une variante serveur
 *      où le renvoi n'est qu'un texte `⁽¹⁰⁰⁾`, sans aucune accroche ;
 *   2. la MENTION (`[id="footerN"]`) pour une mention non citée ;
 *   3. le COMPOSANT d'origine, que le Page Builder enveloppe d'un module portant
 *      l'identifiant puis le chemin du nœud. C'est le repli qui marche toujours — et c'est
 *      de toute façon ce que le contributeur doit ouvrir pour corriger.
 *
 * Sélecteurs d'ATTRIBUT et non `#id` : une clé normalisée par `filterHtmlId`, comme un
 * identifiant JCR, peut contenir des caractères qui casseraient un sélecteur d'identifiant.
 */
const SUPERSCRIPT_DIGITS = "⁰¹²³⁴⁵⁶⁷⁸⁹";

/**
 * Formes VISIBLES d'un renvoi, telles qu'on peut les retrouver dans le texte rendu.
 *
 * Elles permettent au bandeau de resserrer la sélection sur le texte fautif à l'intérieur du
 * composant. Sans elles, un clic sélectionne le composant entier — ce qui reste juste, mais
 * n'aide pas à trouver le renvoi dans un titre long.
 *
 * Deux formes, parce que les deux existent : l'exposant produit par la conversion, et le
 * jeton brut quand la clé n'est pas numérique.
 */
const visibleForms = (key: string): string[] => {
	const forms = [`((${key}))`];
	if (/^[0-9]+$/.test(key)) {
		let superscript = "⁽";
		for (const digit of key) superscript += SUPERSCRIPT_DIGITS.charAt(Number(digit));
		forms.unshift(superscript + "⁾");
	}
	return forms;
};

/**
 * CONTENEURS à essayer, dans l'ordre, pour situer une anomalie.
 *
 * Le COMPOSANT d'abord, et c'est le point clé : le sélecteur du renvoi (`[data-footer]`) est
 * global, donc `querySelector` ramenait toujours la PREMIÈRE occurrence de la page. Quand la
 * même mention manquante était écrite dans cinq composants, les cinq lignes du panneau
 * menaient au même endroit. Le composant, lui, identifie l'occurrence sans ambiguïté.
 *
 * Plusieurs attributs candidats : selon la version, le Page Builder enveloppe ses modules
 * d'un `id` ou d'un `path`. Ceux qui ne correspondent à rien sont simplement ignorés.
 *
 * AUCUN sélecteur global ici, et c'est essentiel. Y mettre `[data-footer="footerN"]` comme
 * repli le faisait passer pour un CONTENEUR : le resserrement constatait qu'il était
 * lui-même le marqueur et le renvoyait tel quel — le premier de la page, pour toutes les
 * lignes. Le repli global relève de `nth()`, côté script, qui lui respecte le rang.
 *
 * Sélecteurs d'ATTRIBUT et non `#id` : un identifiant JCR peut contenir des caractères qui
 * casseraient un sélecteur d'identifiant.
 */
const containerSelectors = ({ kind, key, location }: FootnoteIssue): string[] => {
	const containers: string[] = [];
	if (location) containers.push(`[id="${location.id}"]`, `[path="${location.path}"]`);
	// La mention est unique sur la page : c'est un conteneur légitime, sans ambiguïté.
	if (kind === "unused") containers.push(`[id="footer${key}"]`);
	return containers;
};

/** Renvoi à retrouver DANS le conteneur, quand il a été rendu comme marqueur. */
const markerSelector = ({ kind, key }: FootnoteIssue): string | null =>
	kind === "orphan" ? `[data-footer="footer${key}"]` : null;

/**
 * Entrée du panneau pour une variable de simulation non résolue.
 *
 * Les `needles` sont les deux formes sous lesquelles le jeton apparaît réellement dans le
 * texte rendu — c'est ce qui permet au bandeau de resserrer la sélection sur le `{{taea}}`
 * fautif à l'intérieur du composant, au lieu de sélectionner le bloc entier.
 *
 * Pas de `marker` ni de `refText` : contrairement à un renvoi de note, un jeton non résolu
 * n'est jamais rendu comme élément — il n'existe que sous forme de texte brut.
 */
const simulationVarEntry = (issue: SimulationVarIssue) => ({
	kind: issue.kind,
	message: simulationVarIssueMessage(issue),
	where: issue.location?.label ?? "",
	hint: simulationVarIssueHint(issue),
	targets: issue.location ? [`[id="${issue.location.id}"]`, `[path="${issue.location.path}"]`] : [],
	marker: null,
	needles: issue.token ? [`{{${issue.token}}}`, `{${issue.token}}`] : [],
	refText: "",
	occurrence: 0,
	withinComponent: 0,
});

export const FootnoteAudit = () => {
	const issues = auditFootnotes(readFootnoteCollection());
	const varIssues = auditSimulationVars(readUnresolvedInsuranceVars());

	/*
	 * RIEN À SIGNALER, RIEN À ÉMETTRE. Un bandeau permanent qui répète « tout va bien »
	 * devient un décor : on cesse de le lire, et le jour où il signale quelque chose,
	 * personne ne le voit. Son apparition est, à elle seule, l'information.
	 */
	if (issues.length === 0 && varIssues.length === 0) return null;

	const footnoteEntries = issues.map((issue, index) => ({
		kind: issue.kind,
		message: footnoteIssueMessage(issue),
		// Où corriger — l'information la plus actionnable de la ligne.
		where: issue.location?.label ?? "",
		hint: HINTS[issue.kind],
		targets: containerSelectors(issue),
		marker: markerSelector(issue),
		// Une mention non citée est déjà visée précisément par son id : rien à resserrer.
		needles: issue.kind === "unused" ? [] : visibleForms(issue.key),
		/*
		 * Forme ASCII rendue par `FootnoteText` dans un `<sup class="footer-ref">`. Elle sert
		 * à retrouver un renvoi INERTE — rendu dans un `<a>` ou un `<button>`, donc sans
		 * `data-footer`. Trop générique pour être cherchée dans du texte libre : elle n'est
		 * comparée qu'au contenu exact d'un `.footer-ref`.
		 */
		refText: issue.kind === "unused" ? "" : `(${issue.key})`,
		/*
		 * Rang parmi les anomalies de même clé, à l'échelle de la PAGE. Dernier recours quand
		 * le composant n'a pas pu être localisé : on vise alors la n-ième occurrence plutôt
		 * que toujours la première.
		 */
		occurrence: issues.filter((other, rank) => other.key === issue.key && rank < index).length,
		/*
		 * Rang parmi les anomalies de même clé DANS LE MÊME COMPOSANT.
		 *
		 * Un composant peut porter la même erreur dans son titre, son sous-titre, sa
		 * description et son richtext : quatre lignes, mais un seul conteneur. Sans ce rang
		 * elles mèneraient toutes au premier renvoi. Avec lui, chacune vise le sien, dans
		 * l'ordre du document.
		 */
		withinComponent: issues.filter(
			(other, rank) =>
				other.key === issue.key && other.location?.id === issue.location?.id && rank < index,
		).length,
	}));

	/*
	 * Les variables EN PREMIER. Un jeton non résolu s'affiche brut au visiteur — sur une
	 * mention d'assurance, c'est le défaut le plus grave que ce panneau puisse signaler. Et
	 * quand la cause est de portée page (simulation non activée), la corriger fait disparaître
	 * toutes les lignes suivantes : c'est donc aussi le bon ordre de traitement.
	 */
	const payload = [...varIssues.map(simulationVarEntry), ...footnoteEntries];

	/*
	 * `<` : le contenu d'un `<script>` est du texte brut, qu'un `</script>` dans une
	 * donnée refermerait prématurément. C'est la parade usuelle, et la seule nécessaire —
	 * `JSON.parse` relit `<` comme un `<`.
	 */
	const json = JSON.stringify(payload).replace(/</g, "\\u003c");

	return (
		<script
			type="application/json"
			id={AUDIT_DATA_ID}
			// eslint-disable-next-line @eslint-react/dom/no-dangerously-set-innerhtml
			dangerouslySetInnerHTML={{ __html: json }}
		/>
	);
};
