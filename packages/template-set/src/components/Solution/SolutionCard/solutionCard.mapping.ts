import { buildNodeUrl } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { SolutionCardProps, SolutionItem } from "sofinco-react";
import type { SolutionCardData } from "../Solution.client";
import { getPropertyAsNode, str, strList } from "#lib/jcr";

/**
 * Socle commun de lecture d'un `sofnt:solutionCard`.
 *
 * Le meme type de noeud est consomme par DEUX parents au rendu different :
 *  - `sofnt:solutionSlider`  -> DS <SolutionCard>          (carte verticale)
 *  - `sofnt:solution`        -> DS <SolutionComplementary> (carte overlay)
 *
 * Chaque parent avait sa propre fonction `readCard` locale, avec des ecarts
 * subtils (imageMobile / imageAlt lus d'un cote, id de l'autre). On centralise
 * ici la lecture JCR pour eviter que les deux implementations ne divergent
 * davantage, et on derive ensuite les deux contrats de props.
 *
 * Les trois derives exposent le crop mobile : le DS le sert sous 600px dans les
 * deux contextes, donc une meme carte bascule a la meme largeur quel que soit
 * son parent.
 */
interface SolutionCardRaw {
	id: string;
	title: string;
	subtitle: string;
	features: string[];
	ctaLabel: string;
	ctaUrl: string;
	ctaTarget: "_self" | "_blank";
	imageUrl: string;
	imageUrlMobile?: string;
	imageAlt: string;
}

/** Lecture brute et exhaustive du noeud — source unique de verite. */
export function readSolutionCard(card: JCRNodeWrapper): SolutionCardRaw {
	const image = getPropertyAsNode(card, "image");
	const imageMobile = getPropertyAsNode(card, "imageMobile");
	const linkedNode = getPropertyAsNode(card, "j:linknode");
	const url = str(card, "j:url", "");
	const target = str(card, "j:target", "_self") as "_self" | "_blank";

	return {
		id: card.getIdentifier(),
		title: str(card, "title", ""),
		subtitle: str(card, "subtitle", ""),
		features: strList(card, "features"),
		ctaLabel: str(card, "ctaLabel", ""),
		// `#` plutot qu'une chaine vide : evite un <a href=""> qui rechargerait la page.
		ctaUrl: linkedNode ? buildNodeUrl(linkedNode) : url || "#",
		ctaTarget: target,
		imageUrl: image ? buildNodeUrl(image) : "",
		imageUrlMobile: imageMobile ? buildNodeUrl(imageMobile) : undefined,
		imageAlt: image ? image.getDisplayableName() : "",
	};
}

/**
 * Contrat du DS <SolutionCard> (contexte slider).
 * Utilise par le live du slider ET par sa vue edit `slider.server.tsx`,
 * ce qui garantit un apercu de contribution identique au rendu public.
 */
export function toSolutionSliderCardProps(card: JCRNodeWrapper): SolutionCardProps {
	const raw = readSolutionCard(card);
	return {
		image: raw.imageUrl,
		imageMobile: raw.imageUrlMobile,
		title: raw.title,
		description: raw.subtitle,
		features: raw.features,
		cta: {
			label: raw.ctaLabel,
			href: raw.ctaUrl,
			target: raw.ctaTarget,
		},
	};
}

/** Contrat `SolutionItem` attendu par le DS <SolutionSlider> en live. */
export function toSolutionItem(card: JCRNodeWrapper): SolutionItem {
	const raw = readSolutionCard(card);
	return {
		id: raw.id,
		title: raw.title,
		description: raw.subtitle,
		features: raw.features,
		ctaLabel: raw.ctaLabel,
		href: raw.ctaUrl,
		target: raw.ctaTarget,
		image: raw.imageUrl,
		imageMobile: raw.imageUrlMobile,
	};
}

/**
 * Contrat `SolutionCardData` attendu par le DS <SolutionComplementary>.
 * `imageAlt` est un ajout local au template-set (absent du contrat DS) —
 * conserve pour ne pas perdre l'accessibilite cote contribution.
 */
export function toSolutionComplementaryCardData(card: JCRNodeWrapper): SolutionCardData {
	const raw = readSolutionCard(card);
	return {
		title: raw.title,
		subtitle: raw.subtitle,
		features: raw.features,
		ctaLabel: raw.ctaLabel,
		ctaUrl: raw.ctaUrl,
		ctaTarget: raw.ctaTarget,
		imageUrl: raw.imageUrl,
		imageUrlMobile: raw.imageUrlMobile,
		imageAlt: raw.imageAlt,
	};
}
