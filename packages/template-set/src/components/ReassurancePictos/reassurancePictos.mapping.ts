import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { ReassurancePictosProps, ReassurancePictosItem } from "sofinco-react";
import { getChildNodesByType, imgUrl, num, str } from "#lib/jcr";
import type { TFunction } from "#lib/i18n";

const ITEM_NODE_TYPE = "sofnt:reassurancePictosItem";

/**
 * Défaut du cap `maxItems` — source of truth unique, importée par
 * `default.server.tsx` pour la preview edit mode. Aligné sur la maquette Figma
 * (4 pictos) et sur le default du CND (`maxItems = 4 autocreated`).
 */
export const DEFAULT_MAX_ITEMS = 4;

/**
 * Lit et valide le cap `maxItems` depuis le node JCR.
 *
 * Helper partagé entre `mapReassurancePictosProps` (live) et
 * `default.server.tsx` (edit mode preview) — évite la duplication du guard
 * `> 0` et garantit que preview edit et rendu live restent alignés sur la
 * même sémantique du cap.
 *
 * Une valeur `≤ 0` (théoriquement impossible via CND mais possible via
 * Groovy/API) retombe au défaut plutôt que "0 items affichés".
 */
export function readMaxItems(node: JCRNodeWrapper): number {
	const raw = num(node, "maxItems", DEFAULT_MAX_ITEMS);
	return raw > 0 ? raw : DEFAULT_MAX_ITEMS;
}

function readItem(node: JCRNodeWrapper): ReassurancePictosItem {
	return {
		id: node.getIdentifier(),
		src: imgUrl(node, "icon"),
		label: str(node, "jcr:title"),
	};
}

/**
 * Mappe le nœud JCR `sofnt:reassurancePictos` vers les props du composant
 * React `<ReassurancePictos>`.
 *
 * `ariaLabel` — cascade en 2 niveaux (contrib > fallback i18n) :
 *   1. Valeur contribuée dans le champ JCR `ariaLabel` (i18n, prioritaire).
 *      **Trimmée** pour éviter qu'un `" "` accidentel (truthy) ne devienne
 *      un landmark nommé par du whitespace — invisible aux lecteurs d'écran.
 *   2. Fallback bundle i18n `reassurancePictos.sectionLabel` si contrib
 *      vide, whitespace-only, ou absente.
 *
 * `||` (pas `??`) est intentionnel : `str()` retourne `""` (jamais `undefined`) →
 * l'OR chain déclenche le fallback y compris sur string vide.
 */
export function mapReassurancePictosProps(
	node: JCRNodeWrapper,
	t: TFunction,
): ReassurancePictosProps {
	const cap = readMaxItems(node);

	const items = getChildNodesByType(node, ITEM_NODE_TYPE).slice(0, cap).map(readItem);

	const contributedLabel = str(node, "ariaLabel").trim();

	return {
		items,
		ariaLabel: contributedLabel || t("reassurancePictos.sectionLabel"),
	};
}
