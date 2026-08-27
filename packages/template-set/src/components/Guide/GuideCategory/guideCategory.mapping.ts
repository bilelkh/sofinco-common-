import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { GuideCategory, GuideLink } from "sofinco-react";
import { str, imgUrl, getChildNodesByType } from "#lib/jcr";
import { readLink } from "#shared/Link/readLink";

/**
 * Props de la vue edit-mode : identiques au contrat DS, moins `links`.
 *
 * En edit mode les liens ne sont PAS mappes en props — ils sont rendus par
 * `<RenderChildren nodeTypes={["sofnt:link"]} />` pour que Jahia attache son
 * chrome d'edition a chaque `sofnt:link` (clic pour editer, supprimer,
 * reordonner). Mapper les liens en props produisait du HTML statique sans
 * chrome : le contributeur pouvait ajouter un lien mais jamais l'editer.
 *
 * Meme decoupage que le parent : `GuidePropsServer = Omit<GuideProps, "categories">`.
 */
export type GuideCategoryPropsServer = Omit<GuideCategory, "links">;

function extractCategoryLinks(node: JCRNodeWrapper): GuideLink[] {
	return getChildNodesByType(node, "sofnt:link").flatMap((linkNode) => {
		const data = readLink(linkNode);
		if (!data) return [];
		return [
			{
				id: linkNode.getIdentifier(),
				label: data.label,
				url: data.href,
			} satisfies GuideLink,
		];
	});
}

/**
 * Mapping complet (live) : lit la categorie ET ses liens, pour alimenter
 * l'arbre de props du composant DS `<Guide>`.
 */
export function mapGuideCategory(node: JCRNodeWrapper): GuideCategory {
	return {
		id: node.getIdentifier(),
		title: str(node, "jcr:title"),
		imageUrl: imgUrl(node, "image"),
		imageUrlMobile: imgUrl(node, "imageMobile"),
		imageAlt: str(node, "imageAlt"),
		links: extractCategoryLinks(node),
	};
}

/**
 * Variante edit-mode : lit tout SAUF les liens, qui sont rendus par Jahia
 * via `RenderChildren` afin de rester editables par le contributeur.
 */
export function mapGuideCategoryServer(node: JCRNodeWrapper): GuideCategoryPropsServer {
	return {
		id: node.getIdentifier(),
		title: str(node, "jcr:title"),
		imageUrl: imgUrl(node, "image"),
		imageUrlMobile: imgUrl(node, "imageMobile"),
		imageAlt: str(node, "imageAlt"),
	};
}

export function extractGuideCategories(parent: JCRNodeWrapper): GuideCategory[] {
	return getChildNodesByType(parent, "sofnt:guideCategory").map(mapGuideCategory);
}
