import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { JsonLdNode } from "./types";
import { getAsBoolean, getChildNodesByType, hasMixin, str } from "#lib/jcr";
import { toPlainText } from "./richText";

/**
 * `FAQPage` construit depuis les blocs `sofnt:faq` de la page.
 *
 * Sont écartés les blocs portant `sofmix:faqIntegration` : ils délèguent leur
 * contenu au widget Smart Tribune, chargé côté navigateur et absent du JCR. On ne
 * peut donc pas garantir la correspondance entre balisage et contenu visible
 * qu'exige Google — et un balisage qui ne correspond pas expose à une action
 * manuelle.
 *
 * Le test porte sur CE mixin, et non sur `sofmix:faqItems`, pour deux raisons.
 * D'abord parce que `sofmix:faqItems` est un `jmix:dynamicFieldset` SANS aucune
 * propriété : Jahia n'attache un fieldset dynamique qu'à partir du moment où l'un
 * de ses champs est renseigné, donc celui-là n'est jamais persisté et un
 * `hasMixin` dessus est toujours faux — aucune FAQ n'était balisée. Ensuite parce
 * que c'est exactement l'arbitrage que fait le rendu : `faqBlock.mapping.ts` lit
 * `hasMixin(node, "sofmix:faqIntegration")` pour choisir entre widget externe et
 * items du JCR. Les deux couches partagent donc le même critère, ce qui est la
 * condition pour que le balisage ne puisse pas diverger de l'affiché.
 *
 * Un bloc FAQ servant de retranscription vidéo se désactive via
 * `excludeFromStructuredData` ; toute la page se désactive via
 * `disableFaqSchema` (mixin `sofmix:structuredDataOptions`).
 */
export const FAQ_INTEGRATION_MIXIN = "sofmix:faqIntegration";
const FAQ_ITEM_TYPE = "sofnt:faqItem";

const readQuestions = (faqNode: JCRNodeWrapper): JsonLdNode[] => {
	if (hasMixin(faqNode, FAQ_INTEGRATION_MIXIN)) return [];
	if (getAsBoolean(faqNode, "excludeFromStructuredData")) return [];

	const questions: JsonLdNode[] = [];
	for (const item of getChildNodesByType(faqNode, FAQ_ITEM_TYPE)) {
		const name = str(item, "jcr:title").trim();
		const text = toPlainText(str(item, "answer"));
		// Une question sans réponse (ou l'inverse) est un `Question` invalide.
		if (!name || !text) continue;
		questions.push({
			"@type": "Question",
			"name": name,
			"acceptedAnswer": { "@type": "Answer", "text": text },
		});
	}
	return questions;
};

/**
 * Fusionne les items de tous les blocs éligibles en UN seul `FAQPage` : plusieurs
 * nœuds `FAQPage` dans un même document se concurrencent et Google n'en retient
 * qu'un, arbitrairement.
 */
export const buildFaqPage = (
	faqNodes: JCRNodeWrapper[],
	{ id, inLanguage }: { id: string; inLanguage: string },
): JsonLdNode | null => {
	const mainEntity = faqNodes.flatMap(readQuestions);
	if (mainEntity.length === 0) return null;

	return {
		"@type": "FAQPage",
		"@id": id,
		"inLanguage": inLanguage || undefined,
		"mainEntity": mainEntity,
	};
};
