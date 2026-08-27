import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { SectionCarteProps } from "sofinco-react";
import { str, strList, imgUrl } from "#lib/jcr";
import { getRequiredCtaProps } from "#lib/cta";
import { readTitleLevel, readTitleStyle } from "../Shared/HeadingStyle/headingStyle.mapping";

/**
 * Construit les props React `SectionCarteProps` (DS sofinco-react) depuis le
 * node `sofnt:sectionCarte`.
 *
 * Un seul mapper client/serveur : les avantages sont une propriété
 * `items (string) multiple` (pas des child nodes), il n'y a donc pas de slot
 * <RenderChildren> à substituer en mode édition.
 *
 *  - `titleAs` / `visualStyle` viennent du mixin `sofmix:headingStyle`
 *    (défauts "h2", cohérents avec le CND).
 *  - Le CTA est obligatoire (`sofmix:cta`) : `getRequiredCtaProps` résout le
 *    label et la cible interne/externe ; le DS SectionCarte impose lui-même
 *    variant accent + ctaSection "section-carte".
 *  - `ctaTracking` est volontairement non mappé : le `Cta` du DS émet déjà
 *    automatiquement `click_cta` (cta_label / cta_section / cta_url) via
 *    `data-tracking`. Cette prop ne sert qu'à empiler un événement custom
 *    SUPPLÉMENTAIRE, et le CND n'expose aucune propriété pour l'alimenter.
 *  - Les ids des pastilles sont dérivés de l'index : `items` est une propriété
 *    JCR multi-valuée (string), sans identité stable par valeur. Sans risque
 *    ici — l'id ne sert que de `key` React sur des <li> stateless, et le
 *    composant est server-only (jamais hydraté) : un réordonnancement
 *    contributeur produit simplement un nouveau rendu SSR complet, il n'y a
 *    aucune réconciliation client. Le label ferait un moins bon id (doublons
 *    possibles → keys dupliquées).
 */
export function mapSectionCarteProps(node: JCRNodeWrapper): SectionCarteProps {
	const cta = getRequiredCtaProps(node, "section-carte", "accent");

	return {
		title: str(node, "jcr:title"),
		subtitle: str(node, "subtitle") || undefined,
		eyebrow: str(node, "eyebrow") || undefined,
		titleAs: readTitleLevel(node),
		visualStyle: readTitleStyle(node),
		imageUrl: imgUrl(node, "image"),
		imageAlt: str(node, "imageAlt"),
		contentTitle: str(node, "contentTitle"),
		contentText: str(node, "contentText"),
		items: strList(node, "items").map((label, index) => ({ id: String(index), label })),
		ctaLabel: cta.label ?? "",
		ctaUrl: cta.href ?? "",
	};
}
