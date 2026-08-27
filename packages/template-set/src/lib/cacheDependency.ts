import type { JCRNodeWrapper } from "org.jahia.services.content";
import { addCacheDependency, isEditMode } from "./renderContext";

/**
 * Couche d'intention au-dessus de `addCacheDependency`.
 *
 * Pourquoi ce fichier existe : en mode LIVE, nos composants parents lisent leurs
 * enfants directement (`getChildNodesByType` / `getWrapperItems` / ...) et figent
 * les donnees dans un unique fragment `<Island>`, au lieu de les rendre via le
 * moteur Render de Jahia. Or Jahia n'enregistre automatiquement une dependance de
 * cache que pour les enfants rendus via `Render` / `RenderChildren`. Un enfant lu
 * directement laisse donc le fragment parent perime apres sa propre publication.
 * C'est l'equivalent JS du `<template:addCacheDependency>` des JSP.
 *
 * Cette couche centralise trois choses que les call-sites ne doivent plus porter :
 *   1. le court-circuit en mode edition (aucun cache de fragment => travail inutile) ;
 *   2. l'echappement des metacaracteres regex presents dans les chemins JCR ;
 *   3. le choix de granularite (noeud / enfants directs / sous-arbre).
 */

/**
 * Echappe les metacaracteres d'expression reguliere presents dans un chemin JCR.
 *
 * Indispensable : un chemin contient tres frequemment un `.` (noms de fichiers,
 * noeuds generes depuis un titre), parfois `(`, `)` ou `+`. Injecte tel quel dans
 * `flushOnPathMatchingRegexp`, un `.` matche n'importe quel caractere et elargit
 * silencieusement la portee du flush (sur-invalidation).
 */
export const escapeRegExpPath = (path: string): string =>
	path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Wrapper safe-throw pour `node.getPath()` — retourne null si indisponible. */
const safePath = (node: JCRNodeWrapper): string | null => {
	try {
		return node.getPath();
	} catch {
		return null;
	}
};

/**
 * Retourne le chemin echappe du noeud, ou null si le cache doit etre ignore
 * (mode edition ou chemin irresolvable).
 */
const cachePathOf = (node: JCRNodeWrapper): string | null => {
	if (isEditMode()) return null;
	const path = safePath(node);
	return path ? escapeRegExpPath(path) : null;
};

/**
 * Declare une dependance sur **un noeud precis** : le fragment courant est
 * invalide lorsque ce noeud est publie.
 *
 * No-op en mode edition. Idempotent, appelable plusieurs fois sans effet de bord.
 */
export function addNodeCacheDependency(node: JCRNodeWrapper): void {
	if (isEditMode()) return;
	addCacheDependency({ node });
}

/**
 * Declare une dependance sur les **enfants directs** de `parent` : le fragment
 * est invalide des qu'un enfant de premier niveau est ajoute, supprime ou
 * reordonne.
 *
 * C'est la granularite du cas general. Une dependance par noeud ne suffit pas :
 * un enfant cree *apres* la mise en cache porte un UUID que le fragment ne
 * reference pas, donc aucun flush ne se declenche — c'est le bug d'origine.
 *
 * Le regex `/[^/]+$` s'arrete volontairement au premier niveau : utiliser un
 * sous-arbre ici sur-invaliderait massivement sur les arborescences profondes.
 *
 * `relativePath` cible les enfants directs d'un sous-dossier de `parent` sans
 * exiger que ce dossier existe deja — c'est ce qui permet de couvrir la
 * *creation future* d'un noeud (ex : `contents/site-settings`).
 *
 * No-op en mode edition ou si le chemin est irresolvable.
 */
export function addDirectChildrenCacheDependency(
	parent: JCRNodeWrapper,
	relativePath?: string,
): void {
	const path = cachePathOf(parent);
	if (!path) return;
	const base = relativePath ? `${path}/${escapeRegExpPath(relativePath)}` : path;
	addCacheDependency({ flushOnPathMatchingRegexp: `${base}/[^/]+$` });
}

/**
 * Declare une dependance sur **tout le sous-arbre** de `root`, racine incluse :
 * le fragment est invalide des qu'un noeud est publie a n'importe quelle
 * profondeur sous `root` (ajout, suppression, reordonnancement compris).
 *
 * Reserve aux arbres parcourus recursivement en `node.getNodes()` brut, ou
 * l'enregistrement par noeud ne peut pas atteindre les descendants profonds
 * (ex : l'arbre de categories du ChatBot). Le `(/.*)?` final couvre la racine
 * elle-meme en plus de ses descendants.
 *
 * A n'utiliser que faute de mieux : la portee est large, donc couteuse en flush.
 * Preferer `addDirectChildrenCacheDependency` partout ailleurs.
 *
 * No-op en mode edition ou si le chemin est irresolvable.
 */
export function addSubtreeCacheDependency(root: JCRNodeWrapper): void {
	const path = cachePathOf(root);
	if (!path) return;
	addCacheDependency({ flushOnPathMatchingRegexp: `${path}(/.*)?` });
}
