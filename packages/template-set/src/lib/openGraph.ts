import type { JCRNodeWrapper } from "org.jahia.services.content";
import { getAsBoolean, hasMixin, imgMeta, type ImageMeta } from "./jcr";
import { toAbsoluteUrl } from "./pageUrl";

/**
 * Compte X/Twitter officiel Sofinco — porté par `twitter:site` et
 * `twitter:creator`, qui conditionnent l'attribution des partages au compte.
 * Valeur reprise de la vue JSP de référence (sans son espace finale parasite).
 */
const TWITTER_ACCOUNT = "@credit_sofinco";

/**
 * Mixin fourni par le module `portal-common-sofinco` (non déclaré ici) :
 *
 * ```
 * [spmix:openGraphTags] mixin
 *   extends = jnt:page
 *   itemtype = metadata
 *   - activeFacebook (boolean)
 *   - urlImgFacebook (weakreference, picker[type='image'])
 *   - activeTwitter (boolean)
 *   - urlImgTwitter (weakreference, picker[type='image'])
 *   - activeGoogle (boolean)
 *   - urlImgGoogle (weakreference, picker[type='image'])
 * ```
 *
 * Chaque `active*` pilote l'émission d'un jeu de balises ; l'image associée est
 * facultative (les balises titre/URL/description sont émises sans elle).
 */
export const OPEN_GRAPH_TAGS_MIXIN = "spmix:openGraphTags";

export interface OpenGraphOptions {
	activeFacebook: boolean;
	imgFacebook: ImageMeta | null;
	activeTwitter: boolean;
	imgTwitter: ImageMeta | null;
	activeGoogle: boolean;
	imgGoogle: ImageMeta | null;
}

/**
 * Une balise `<meta>` prête à rendre. `content` est toujours non vide.
 *
 * La forme est assez générale pour porter aussi les balises non sociales du
 * `<head>` (`description`, `keywords`, `robots`) : `#lib/seoHead` les assemble
 * dans une seule liste que `Layout` rend d'une passe.
 */
export interface SocialMetaTag {
	key: string;
	content: string;
	/** Open Graph (Facebook) — rendu en `property="…"`. */
	property?: string;
	/** Twitter Cards — rendu en `name="…"`. */
	name?: string;
	/** Microdata schema.org (Google) — rendu en `itemprop="…"`. */
	itemProp?: string;
}

/**
 * Lit les propriétés du mixin `spmix:openGraphTags` sur la page, ou `null`
 * quand la page ne le porte pas.
 *
 * Le `isNodeType` est protégé : le mixin vient d'un module externe, il peut
 * être absent du runtime (même précaution que dans `#lib/seo`).
 */
export const readOpenGraphOptions = (
	pageNode: JCRNodeWrapper | null | undefined,
): OpenGraphOptions | null => {
	if (!pageNode) return null;
	try {
		if (!hasMixin(pageNode, OPEN_GRAPH_TAGS_MIXIN)) return null;
	} catch {
		return null;
	}
	return {
		activeFacebook: getAsBoolean(pageNode, "activeFacebook"),
		imgFacebook: imgMeta(pageNode, "urlImgFacebook"),
		activeTwitter: getAsBoolean(pageNode, "activeTwitter"),
		imgTwitter: imgMeta(pageNode, "urlImgTwitter"),
		activeGoogle: getAsBoolean(pageNode, "activeGoogle"),
		imgGoogle: imgMeta(pageNode, "urlImgGoogle"),
	};
};

/**
 * Absolutise l'URL de l'image en conservant dimensions et `alt`. Retourne `null`
 * dès que l'image est absente ou sans URL exploitable — l'appelant saute alors
 * d'un bloc toutes les balises qui en dépendent (`og:image` et ses satellites),
 * plutôt que d'émettre des dimensions orphelines.
 */
const toAbsoluteImage = (origin: string, image: ImageMeta | null): ImageMeta | null =>
	image?.url ? { ...image, url: toAbsoluteUrl(origin, image.url) } : null;

/**
 * Normalise un code langue en `og:locale` (format `language_TERRITORY`).
 *
 * La source est la `Locale` de la ressource courante (`currentResource.getLocale()`),
 * résolue dans `Layout` — surtout PAS `jcr:language` lu sur la page : cette
 * propriété vit sur le sous-nœud `j:translation_<lang>`, `hasProperty` renvoie
 * donc `false` depuis le nœud de page et la lecture est morte.
 *
 * La locale vaut en général la langue seule (`fr`) : le territoire est alors
 * déduit en majuscules (`fr` → `fr_FR`), ce qui est exact pour les
 * langues du site. Si une langue où cette règle ne tient pas est ajoutée
 * (`en` → `en_EN` au lieu de `en_GB`), remplacer cette déduction par une table
 * explicite. Une valeur déjà complète (`fr_BE`, `fr-BE`) est respectée.
 */
export const toOgLocale = (rawLanguage: string): string => {
	const value = rawLanguage.trim().replace("-", "_");
	if (!value) return "";
	const [language, territory] = value.split("_");
	if (!language) return "";
	return `${language.toLowerCase()}_${(territory || language).toUpperCase()}`;
};

/**
 * Tout ce que `buildSocialMetaTags` a besoin de savoir du contexte de rendu.
 * Résolu une seule fois par page dans `templates/Layout.tsx`, ce qui garde cette
 * fonction pure (pas de `RenderContext`, donc testable sans stub de contexte) et
 * évite de recalculer côté social ce que le `<head>` a déjà résolu.
 */
export interface SocialMetaInput {
	/** Titre déjà résolu par `#lib/seo` (`titleSEO` ou `jcr:title`). */
	title: string;
	/** Même source que la `<meta name="description">` — extraits sociaux et Google alignés. */
	description: string;
	/** URL publique absolue de la page — cf. `#lib/pageUrl.resolvePageUrl`. */
	pageUrl: string;
	/** Origine absolue, pour absolutiser les URLs d'images. */
	origin: string;
	/** Nom du site (`og:site_name`). */
	siteName: string;
	/** Locale déjà normalisée `language_TERRITORY` — cf. `toOgLocale`. */
	locale: string;
}

/**
 * Construit les balises sociales de la page à partir du mixin
 * `spmix:openGraphTags`. Retourne un tableau vide quand la page ne porte pas le
 * mixin ou qu'aucun réseau n'est activé.
 */
export const buildSocialMetaTags = (
	pageNode: JCRNodeWrapper | null | undefined,
	{ title, description, pageUrl, origin, siteName, locale }: SocialMetaInput,
): SocialMetaTag[] => {
	const options = readOpenGraphOptions(pageNode);
	if (!options || !pageNode) return [];
	if (!options.activeFacebook && !options.activeTwitter && !options.activeGoogle) return [];

	const tags: SocialMetaTag[] = [];
	const push = (tag: SocialMetaTag) => {
		if (tag.content) tags.push(tag);
	};

	if (options.activeFacebook) {
		const image = toAbsoluteImage(origin, options.imgFacebook);
		push({ key: "og:type", property: "og:type", content: "website" });
		push({ key: "og:title", property: "og:title", content: title });
		push({ key: "og:url", property: "og:url", content: pageUrl });
		push({ key: "og:description", property: "og:description", content: description });
		push({ key: "og:site_name", property: "og:site_name", content: siteName });
		push({ key: "og:locale", property: "og:locale", content: locale });
		if (image) {
			push({ key: "og:image", property: "og:image", content: image.url });
			// Dimensions déclarées : sans elles, Facebook et LinkedIn doivent d'abord
			// télécharger le fichier et affichent souvent la carte sans image au
			// premier scrape. Les nœuds `jmix:image` portent déjà `j:width`/`j:height`.
			push({
				key: "og:image:width",
				property: "og:image:width",
				content: image.width ? String(image.width) : "",
			});
			push({
				key: "og:image:height",
				property: "og:image:height",
				content: image.height ? String(image.height) : "",
			});
			push({ key: "og:image:alt", property: "og:image:alt", content: image.alt });
		}
	}

	if (options.activeTwitter) {
		const image = toAbsoluteImage(origin, options.imgTwitter);
		push({
			key: "twitter:card",
			name: "twitter:card",
			content: image ? "summary_large_image" : "summary",
		});
		push({ key: "twitter:site", name: "twitter:site", content: TWITTER_ACCOUNT });
		push({ key: "twitter:creator", name: "twitter:creator", content: TWITTER_ACCOUNT });
		push({ key: "twitter:title", name: "twitter:title", content: title });
		push({ key: "twitter:description", name: "twitter:description", content: description });
		push({ key: "twitter:url", name: "twitter:url", content: pageUrl });
		if (image) {
			push({ key: "twitter:image", name: "twitter:image", content: image.url });
			// Twitter Cards n'a pas d'équivalent width/height — seul `alt` existe.
			push({ key: "twitter:image:alt", name: "twitter:image:alt", content: image.alt });
		}
	}

	if (options.activeGoogle) {
		const image = toAbsoluteImage(origin, options.imgGoogle);
		push({ key: "itemprop:name", itemProp: "name", content: title });
		push({ key: "itemprop:description", itemProp: "description", content: description });
		push({ key: "itemprop:image", itemProp: "image", content: image?.url ?? "" });
		push({ key: "itemprop:inLanguage", itemProp: "inLanguage", content: locale });
	}

	return tags;
};
