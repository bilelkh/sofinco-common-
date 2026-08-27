import { buildNodeUrl } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { RenderContext } from "org.jahia.services.render";
import type { BreadcrumbLayoutProps, BreadcrumbItem, BreadcrumbTheme } from "sofinco-react";
import { str, getAsBoolean } from "#lib/jcr";
import { addCacheDependency } from "#lib/renderContext";

/**
 * Résout la page courante depuis le renderContext.
 *
 * Remonte les ancêtres jusqu'à la 1re `jnt:page` si le main resource est un
 * node de contenu (cas standard : rendu via SSR d'un composant dans une area).
 * Retourne `null` si aucune page n'est trouvable (edge case renderContext
 * cassé).
 *
 * Extrait ici pour être appelé UNE SEULE FOIS par render, puis réutilisé par
 * `buildBreadcrumb` et `getBreadcrumbStyle` (évite le double walk d'ancêtres
 * quand les 2 sont appelés côte à côte dans un template).
 */
export function resolveCurrentPage(renderContext: RenderContext): JCRNodeWrapper | null {
	let current: JCRNodeWrapper | null;
	try {
		current = renderContext.getMainResource().getNode() as JCRNodeWrapper;
	} catch {
		return null;
	}

	while (current && !current.isNodeType("jnt:page")) {
		try {
			current = current.getParent() as JCRNodeWrapper;
		} catch {
			return null;
		}
	}

	return current;
}

/**
 * Lit la valeur du mixin `sofmix:breadcrumbOptions.breadcrumbStyle` sur la page
 * courante déjà résolue. Fallback `"onLight"` si `pageNode` est `null` ou si
 * la propriété est manquante (page sans le mixin attaché, cas edge migration).
 *
 * @param pageNode - Page courante (obtenue via `resolveCurrentPage`).
 */
export function getBreadcrumbStyle(pageNode: JCRNodeWrapper | null): BreadcrumbTheme {
	if (!pageNode) return "onLight";
	const value = str(pageNode, "breadcrumbStyle");
	return value === "onDark" ? "onDark" : "onLight";
}

/**
 * Types de nodes capturés dans le fil d'Ariane.
 *  - `jnt:page`        : page Jahia standard (cliquable par défaut).
 *  - `jnt:navMenuText` : entrée menu Jahia native pour les regroupements sans
 *    page propre (toujours non-cliquable par nature).
 */
const BREADCRUMB_NODE_TYPES = ["jnt:page", "jnt:navMenuText"] as const;

/**
 * Construit la liste breadcrumb depuis la page courante jusqu'à la racine
 * du site. Ordre = root → current.
 *
 * Options par page (mixin `sofmix:breadcrumbOptions`, auto-attaché à
 * toute jnt:page) :
 *  - `hideFromBreadcrumb=true`  → la page est SKIP du fil (les enfants restent)
 *  - `breadcrumbCustomLabel`    → override de jcr:title pour le breadcrumb
 *
 * Cliquabilité :
 *  - `jnt:page`        : toujours cliquable (sauf page courante)
 *  - `jnt:navMenuText` : toujours non-cliquable (pas de destination)
 *  - Page courante     : isCurrent=true + isClickable=false (toujours)
 *
 * Pour un regroupement non-cliquable, utiliser `jnt:navMenuText` (recommandé)
 * plutôt que `jnt:page` + désactivation de lien.
 *
 * @param pageNode - Page courante (obtenue via `resolveCurrentPage`).
 *                   Signature refondue pour éviter le double walk d'ancêtres
 *                   quand appelé côte à côte avec `getBreadcrumbStyle`.
 */
export function buildBreadcrumb(pageNode: JCRNodeWrapper | null): BreadcrumbItem[] {
	if (!pageNode) return [];

	const items: BreadcrumbItem[] = [];
	let current: JCRNodeWrapper | null = pageNode;

	// Collecte les ancêtres breadcrumbables (jnt:page + jnt:navMenuText).
	while (current && !current.isNodeType("jnt:virtualsite")) {
		const node = current;
		// Cache dep sur chaque ancêtre visité : renommage / retitrage / toggle
		// `hideFromBreadcrumb` d'un parent doit invalider les descendants qui
		// affichent le breadcrumb.
		addCacheDependency({ node });
		const isBreadcrumbType = BREADCRUMB_NODE_TYPES.some((t) => node!.isNodeType(t));
		if (isBreadcrumbType) {
			const isNavMenuText = node.isNodeType("jnt:navMenuText");

			// Skip la page si le contributeur l'a masquée (jnt:navMenuText ne porte
			// pas le mixin → ne peut pas être masqué via toggle).
			const isHidden = !isNavMenuText && getAsBoolean(node, "hideFromBreadcrumb", false);

			if (!isHidden) {
				const customLabel = isNavMenuText ? "" : str(node, "breadcrumbCustomLabel");

				items.push({
					label: customLabel || str(node, "jcr:title") || node.getName(),
					// jnt:navMenuText n'a pas de destination → url vide. Ces entrées sont
					// écartées du `BreadcrumbList` JSON-LD (cf. `structuredData/breadcrumbList.ts`) :
					// un `ListItem` sans `item` est ignoré par Google.
					url: isNavMenuText ? "" : buildNodeUrl(node),
					isCurrent: false,
					// jnt:page cliquable par défaut ; jnt:navMenuText jamais.
					isClickable: !isNavMenuText,
					id: node.getIdentifier(),
				});
			}
		}
		try {
			current = node.getParent() as JCRNodeWrapper;
		} catch {
			break;
		}
	}

	items.reverse();

	if (items.length > 0) {
		items[items.length - 1].isCurrent = true;
		items[items.length - 1].isClickable = false;
	}

	return items;
}

/**
 * Contrat "template ↔ DS" — 1 seul appel pour obtenir tout ce dont un template
 * a besoin pour rendre un `<Breadcrumb>` Sofinco.
 *
 * Bénéfices :
 *  - 1 seul walk d'ancêtres JCR (vs 2 avant : buildBreadcrumb + getBreadcrumbStyle)
 *  - Templates réduits à `<Breadcrumb {...breadcrumbLayout} />` (spread propre)
 *  - Type retourné = `BreadcrumbLayoutProps` du DS (contrat partagé,
 *    autocomplete + erreurs compile-time si divergence)
 *
 * Usage typique dans un template Jahia :
 *   ```tsx
 *   const breadcrumbLayout = buildBreadcrumbLayoutProps(renderContext);
 *   if (breadcrumbLayout.items.length > 1) {
 *     <Breadcrumb {...breadcrumbLayout} />
 *   }
 *   ```
 */
export function buildBreadcrumbLayoutProps(renderContext: RenderContext): BreadcrumbLayoutProps {
	const pageNode = resolveCurrentPage(renderContext);
	return {
		items: buildBreadcrumb(pageNode),
		theme: getBreadcrumbStyle(pageNode),
	};
}
