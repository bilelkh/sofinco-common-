import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { ReassuranceItem, ReassuranceProps } from "sofinco-react";
import { getChildNodesByType, imgUrl, str } from "#lib/jcr";
import { readLinkChild } from "#shared/Link/readLink";
import {
	readItemsTitleLevel,
	readTitleLevel,
	readTitleStyle,
} from "#cms/Shared/HeadingStyle/headingStyle.mapping";

/**
 * Mapping du bloc `sofnt:reassurance` vers les props du design system.
 *
 * Extrait de `default.server.tsx`, où il vivait en ligne : c'était le seul composant du dépôt
 * sans fichier de mapping, ce qui le rendait intestable sans monter un faux `renderContext`.
 */

/** Un item de réassurance — `sofnt:reassuranceItem`. */
export function mapReassuranceItem(node: JCRNodeWrapper, index: number): ReassuranceItem {
	const link = readLinkChild(node);
	return {
		id: node.getIdentifier() ?? index,
		icon: imgUrl(node, "icon") || undefined,
		iconAlt: str(node, "iconAlt", ""),
		title: str(node, "jcr:title", ""),
		// Niveau lu sur le BLOC, pas sur l'item : les items sont des pairs, leur niveau
		// se decide une fois. Repli "h3" = la balise codee en dur jusqu'ici, donc un bloc
		// deja publie rend a l'identique.
		titleAs: readItemsTitleLevel(node, "sofnt:reassurance", "h3"),
		text: str(node, "text", "") || undefined,
		link: link
			? {
					href: link.href,
					label: link.label,
					isExternal: link.target === "_blank",
					iconLeft: link.iconLeft,
					iconRight: link.iconRight,
					iconVariant: link.iconVariant,
				}
			: undefined,
	};
}

/**
 * En-tête de section, depuis `sofmix:sectionHeader`.
 *
 * `undefined` quand il n'y a pas de titre : le composant omet alors l'en-tête entier plutôt que
 * de rendre un `<h2>` vide. C'est pourquoi `sectionHeadingProps` est optionnel côté DS.
 */
export function mapReassuranceHeading(
	node: JCRNodeWrapper,
): ReassuranceProps["sectionHeadingProps"] {
	/*
	 * `.trim()` avant le test, pas après : un titre compose uniquement d'espaces passe le
	 * garde `!title` alors qu'il ne designe rien. On rendrait un `<h2>   </h2>` vide, du
	 * bruit dans le plan SEO de la page pour un champ que le contributeur croit vide.
	 */
	const title = str(node, "jcr:title", "").trim();
	if (!title) return undefined;

	return {
		title,
		subtitle: str(node, "subtitle", "") || undefined,
		titleAs: readTitleLevel(node),
		visualStyle: readTitleStyle(node),
	};
}

export function mapReassuranceProps(node: JCRNodeWrapper): ReassuranceProps {
	return {
		sectionHeadingProps: mapReassuranceHeading(node),
		items: getChildNodesByType(node, "sofnt:reassuranceItem").map(mapReassuranceItem),
	};
}
