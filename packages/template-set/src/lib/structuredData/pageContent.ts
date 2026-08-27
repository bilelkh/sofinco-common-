import type { JCRNodeWrapper } from "org.jahia.services.content";
import { findAncestor } from "#lib/jcr";
import { jcrQuery } from "#lib/jcrQuery";
import { addSubtreeCacheDependency } from "#lib/cacheDependency";

/**
 * Retrouve les blocs de contenu d'une page pour les besoins du JSON-LD.
 *
 * Le `<head>` est rendu AVANT `{children}` et les fragments de composants ont leurs
 * propres durées de cache (`sofnt:avisClient` porte `cache.expiration: 3600`) :
 * agréger les schemas pendant le rendu des descendants produirait un graphe vide ou
 * partiel dès que la page est servie depuis le cache. On interroge donc directement
 * le JCR au moment où le `<head>` se construit.
 */

/** Échappe une valeur destinée à un littéral chaîne JCR-SQL2 (quote simple doublée). */
const escapeSqlLiteral = (value: string): string => value.split("'").join("''");

/**
 * Retourne les nœuds de type `nodeType` appartenant à la page, sous-pages exclues.
 *
 * `ISDESCENDANTNODE` remonte TOUT le sous-arbre, y compris les blocs des pages
 * filles : un bloc FAQ d'une sous-page produirait sinon un `FAQPage` sur la page
 * parente, dont le contenu n'est pas visible. D'où le second filtre sur la page
 * ancêtre la plus proche.
 *
 * **Cache dep** : `addSubtreeCacheDependency(pageNode)` — le résultat d'une requête
 * n'est couvert par aucune dépendance implicite, et l'ajout d'un PREMIER bloc d'un
 * type donné doit invalider le `<head>`. `findAncestor` déclare en plus `{ node }`
 * sur chaque page traversée.
 */
export const findPageContent = (
	pageNode: JCRNodeWrapper | null | undefined,
	nodeType: string,
): JCRNodeWrapper[] => {
	if (!pageNode) return [];

	let pagePath: string;
	try {
		pagePath = pageNode.getPath();
	} catch {
		return [];
	}
	if (!pagePath) return [];

	addSubtreeCacheDependency(pageNode);

	const nodes = jcrQuery(
		`SELECT * FROM [${nodeType}] WHERE ISDESCENDANTNODE('${escapeSqlLiteral(pagePath)}')`,
	);

	return nodes.filter((node) => {
		const owner = findAncestor(node, "jnt:page");
		if (!owner) return false;
		try {
			return owner.getPath() === pagePath;
		} catch {
			return false;
		}
	});
};
