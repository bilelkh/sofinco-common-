import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { HowItWorksProps } from "sofinco-react";
import type { HowItWorksPropsServer } from "./howItWorks.types";
import type { TFunction } from "#lib/i18n";
import { extractSteps } from "../HowItWorksStep/howItWorksStep.mapping";
import { mapVideoBlockProps } from "../../VideoBlock/videoBlock.mapping";
import { buildTitleProps } from "../../Shared/HeadingStyle/headingStyle.mapping";
import { getCtaProps } from "#lib/cta";
import { str, getChildNode } from "#lib/jcr";

/**
 * Champs communs aux variantes client/serveur :
 *  - `title` = TitleProps construit via `buildTitleProps` (jcr:title + mixin
 *    `sofmix:headingStyle`). `undefined` si jcr:title est vide → le composant
 *    React omet alors l'en-tête.
 *  - `subtitle` (textarea, optionnel)
 *  - `cta` = CTA optionnel construit via le mixin `sofmix:ctaOptional`.
 *    `undefined` quand `ctaType === "none"` ou qu'aucune cible n'est résolue →
 *    le composant React omet le CTA entre le parcours d'étapes et la vidéo.
 *  - `imagePosition` = côté de la colonne image en desktop. Validé
 *    défensivement plutôt que casté : la choicelist du CND contraint l'UI
 *    auteur, mais pas les imports legacy ni les seeds Groovy. Toute valeur
 *    hors `"right"` retombe sur `"left"`, qui est aussi le repli des nœuds
 *    créés avant la propriété (`autocreated` ne joue qu'à la création).
 */
function mapHowItWorksBase(node: JCRNodeWrapper): HowItWorksPropsServer {
	return {
		title: buildTitleProps(node, str(node, "jcr:title")),
		subtitle: str(node, "subtitle") || undefined,
		cta: getCtaProps(node, "how-it-works-cta", "primary") ?? undefined,
		imagePosition: str(node, "imagePosition") === "right" ? "right" : "left",
	};
}

/**
 * Extrait le bloc vidéo embarqué dans le HowItWorks.
 *
 * @param parent - Le node `sofnt:howItWorks`.
 * @param t      - Fonction i18n propagée à `mapVideoBlockProps` (label transcription).
 * @returns `undefined` si l'auteur n'a pas créé la zone vidéo, sinon les props
 *          VideoBlock **sans subtitle** (le HowItWorks fournit déjà son propre
 *          sous-titre de section ; celui du VideoBlock ferait doublon). Le
 *          `title` propre à la vidéo est **conservé** — il peut coexister avec
 *          le titre de section (ex: "Comment ça marche ?" + titre vidéo "Vidéo
 *          explicative du prêt personnel").
 */
function extractEmbeddedVideo(parent: JCRNodeWrapper, t: TFunction): HowItWorksProps["video"] {
	const videoNode = getChildNode(parent, "video");
	if (!videoNode || !videoNode.isNodeType("sofnt:videoBlock")) return undefined;

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { subtitle: _subtitle, ...rest } = mapVideoBlockProps(videoNode, t);
	return rest;
}

/**
 * Mapping client (live) : on extrait les étapes ET la vidéo optionnelle.
 * Le composant React HowItWorks rend la vidéo sous la liste d'étapes via
 * <VideoBlock {...video} /> quand le prop est présent.
 *
 * @param t - Fonction i18n (nécessaire pour la vidéo embarquée : label
 *            transcription i18n dans `mapVideoBlockProps`).
 */
export function mapHowItWorksPropsClient(node: JCRNodeWrapper, t: TFunction): HowItWorksProps {
	return {
		...mapHowItWorksBase(node),
		steps: extractSteps(node),
		video: extractEmbeddedVideo(node, t),
	};
}

/**
 * Mapping serveur (édition) : on ne mappe ni les étapes ni la vidéo —
 * c'est <RenderChildren> qui s'en charge dans `HowItWorksServer`, ce qui
 * active l'édition inline de chaque enfant (steps + videoBlock nommé "video").
 */
export function mapHowItWorksPropsServer(node: JCRNodeWrapper): HowItWorksPropsServer {
	return mapHowItWorksBase(node);
}
