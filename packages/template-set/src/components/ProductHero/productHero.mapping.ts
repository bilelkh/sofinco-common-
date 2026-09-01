import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { RenderContext } from "org.jahia.services.render";
import type { HeroPPProps } from "sofinco-react";
import { str, imgUrl, getChildNode } from "#lib/jcr";
import { buildSimulatorCtaFromNode } from "#lib/simulatorCta";
import { extractPromotionTracking } from "#lib/promotionTracking";
import { mapAvisClientsStickerPropsClient } from "#cms/AvisClientsSticker/avisClientsSticker.mapping";
import type { TFunction } from "#lib/i18n";
import { buildTitleProps, readTitleTag } from "../Shared/HeadingStyle/headingStyle.mapping";

export function mapProductHeroProps(
	node: JCRNodeWrapper,
	renderContext: RenderContext,
	t: TFunction,
): HeroPPProps {
	const cta = buildSimulatorCtaFromNode(node, renderContext, t, {
		ctaSection: "product-hero-cta",
	});

	const avisNode = getChildNode(node, "avisClients");
	const avisProps = avisNode ? mapAvisClientsStickerPropsClient(avisNode, t) : undefined;
	const avis = avisProps && Object.keys(avisProps).length > 0 ? avisProps : undefined;
	const headerTitle = str(node, "jcr:title");

	const rate = str(node, "rateValue");

	return {
		/*
		 * `eyebrowProps` et non `eyebrow` : le DS ne rend plus la chaine nue depuis que le
		 * sur-titre passe par <Title>. Le niveau vient de `eyebrowLevel`, propre au hero —
		 * `sofmix:headingStyle` est deja consomme par le titre principal.
		 * `visualStyle: "none"` : l'apparence est portee par le variant `eyebrow` de la charte,
		 * pas par une echelle de titre.
		 */
		eyebrowProps: {
			children: str(node, "productLabel"),
			as: readTitleTag(node, "eyebrowLevel", "p"),
			visualStyle: "none",
			variant: "eyebrow",
		},
		title: buildTitleProps(node, headerTitle, "h1"),
		/*
		 * PAS de `strLimit` ici. `description` est passé en richtext (wysiwyg) pour
		 * porter gras, exposants ⁽¹⁾ et tailles `rt-text-*` : une troncature à N
		 * caractères couperait au milieu d'une balise — donc au milieu d'un renvoi
		 * de mention légale — et servirait du HTML invalide au SSR. La longueur
		 * relève désormais de la relecture éditoriale, pas du mapping.
		 */
		description: str(node, "description"),
		cta,
		avis,
		tracking: extractPromotionTracking(node),
		offerCard: {
			infoBlock: rate
				? {
						rate,
						rateLabel: str(node, "rateLabel"),
						details: str(node, "characteristics"),
					}
				: undefined,
			imgSrc: imgUrl(node, "imageDesktop"),
			// `imgUrl` renvoie "" pour une reference absente : on coerce en undefined
			// pour que le DS n'emette pas un <source srcSet=""> vide.
			imgSrcMobile: imgUrl(node, "imageMobile") || undefined,
		},
	};
}
