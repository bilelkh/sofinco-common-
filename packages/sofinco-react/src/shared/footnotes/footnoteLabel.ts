/**
 * Libellé lecteur d'écran des renvois de note (« note de bas de page »).
 *
 * POURQUOI UNE GLOBALE, ET PAS UN CONTEXTE / UN HOOK / UNE PROP
 * ------------------------------------------------------------
 * `FootnoteText` est rendu à ~100 endroits, dont beaucoup à l'intérieur d'un `Island` :
 * un îlot s'hydrate comme sa PROPRE racine React, à partir de ses seules props
 * sérialisées. Il ne voit donc ni le contexte du serveur ni celui de la page. Une version
 * antérieure passait le libellé par un `Context` : serveur et client divergeaient et React
 * échouait sur l'erreur #418. Le faire descendre en prop supposerait de toucher les ~100
 * appels, et surtout la sérialisation de chaque îlot.
 *
 * `globalThis` est le seul canal qui traverse à la fois la frontière d'îlot ET la frontière
 * de bundle (le DS et le template-set ne partagent pas forcément une instance de module).
 *
 * L'INVARIANT D'HYDRATATION EST RESPECTÉ : la valeur lue est la MÊME des deux côtés.
 *   - serveur : `Layout.tsx` la pose en tête de rendu, donc avant tout descendant ;
 *   - client  : le script inline de `<head>` la pose avant le chargement de tout bundle,
 *               donc avant l'hydratation du premier îlot.
 * C'est déjà le canal utilisé par `footnote-bootstrap.ts` pour le même libellé — on ne
 * crée pas un mécanisme, on branche le rendu React sur celui qui existe.
 *
 * Résolution AU RENDU, jamais à l'import : à l'import, le module peut être évalué avant
 * que `Layout` n'ait posé la valeur, et elle serait alors figée pour tout le processus
 * (donc pour toutes les locales).
 */

/** Nom de la globale, partagé avec `Layout.tsx` (template-set) et le script inline. */
export const FOOTNOTE_LABEL_GLOBAL = "__SOFINCO_FOOTNOTE_LABEL__";

/**
 * Repli quand la globale est absente : rendu d'un composant hors page complète
 * (Storybook, test, rendu de fragment). Le site étant francophone par défaut, le repli
 * l'est aussi — un libellé approximatif vaut mieux qu'un renvoi muet pour le lecteur
 * d'écran, qui annoncerait sinon « lien ⁽¹⁾ » sans dire de quoi il s'agit.
 */
export const DEFAULT_FOOTNOTE_LABEL = "note de bas de page";

/** Le libellé courant, résolu au moment du rendu. */
export function footnoteLabel(): string {
	const injected = (globalThis as unknown as Record<string, unknown>)[FOOTNOTE_LABEL_GLOBAL];
	return typeof injected === "string" && injected ? injected : DEFAULT_FOOTNOTE_LABEL;
}
