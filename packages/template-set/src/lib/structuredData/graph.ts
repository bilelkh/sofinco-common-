import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { RenderContext } from "org.jahia.services.render";
import type { BreadcrumbItem } from "sofinco-react";
import type { JsonLdNode } from "./types";
import { getAsBoolean, getChildNode, getGlobalSettingsNode } from "#lib/jcr";
import { avisClientPath, verifiedReviewConfigRelPath } from "#lib/siteConfigs";
import { readAverageRating } from "#lib/reviews";
import { escapeForInlineScript } from "#lib/tracking";
import {
	attachAggregateRating,
	buildAggregateRating,
	readRatingThresholds,
} from "./aggregateRating";
import { buildArticle } from "./article";
import { buildBreadcrumbList } from "./breadcrumbList";
import { buildFaqPage } from "./faqPage";
import { buildLoanOrCredit } from "./loanOrCredit";
import {
	buildOrganization,
	organizationRef,
	readOrganizationSettings,
	STRUCTURED_DATA_SETTINGS_NODE,
} from "./organization";
import { findPageContent } from "./pageContent";
import { buildVideoObjects } from "./videoObject";
import { buildWebPage } from "./webPage";
import { buildWebSite, webSiteRef } from "./webSite";

/**
 * Assemblage du `@graph` JSON-LD de la page.
 *
 * Un seul `<script type="application/ld+json">` par page, contenant un `@graph`
 * plutôt que plusieurs blocs séparés : c'est ce qui permet aux nœuds de se citer
 * par `@id` (`publisher`, `provider`) au lieu de redéclarer l'entité de marque dans
 * chacun d'eux, comme le faisaient les trois blocs `Organization` du legacy.
 *
 * Ce module porte le PLOMBERIE (résolution des nœuds JCR, ordre du graphe) ; toute
 * la logique de forme vit dans les builders voisins, qui sont purs et testés
 * individuellement.
 */

const JSON_LD_CONTEXT = "https://schema.org";

/** Mixin de page portant les interrupteurs par page. Déclaré dans `settings/definitions.cnd`. */
export const STRUCTURED_DATA_OPTIONS_MIXIN = "sofmix:structuredDataOptions";

const NEWS_TYPE = "spnt:news";
const FAQ_TYPE = "sofnt:faq";
const VIDEO_TYPE = "sofnt:videoBlock";

export interface StructuredDataInput {
	renderContext: RenderContext;
	pageNode: JCRNodeWrapper | null;
	/** Origine absolue du site (`https://www.sofinco.fr`). */
	origin: string;
	/** URL publique de la page — sert d'`@id` de base et de `mainEntityOfPage`. */
	canonical: string;
	/**
	 * Fil d'Ariane DÉJÀ construit par le template, celui-là même qu'il passe à
	 * `<Breadcrumb>`. Il descend en paramètre plutôt que d'être recalculé ici pour
	 * deux raisons : `buildBreadcrumb` remonte tous les ancêtres et pose une
	 * dépendance de cache sur chacun — le refaire doublerait ce walk (cf. la raison
	 * d'être de `buildBreadcrumbLayoutProps` dans `#lib/breadcrumb`) — et un template
	 * qui ne rend pas de fil d'Ariane passe alors `[]`, ce qui garantit que le
	 * balisage ne décrit jamais une navigation absente de la page.
	 */
	breadcrumbItems: BreadcrumbItem[];
	/** Titre déjà résolu par `#lib/seo` (`titleSEO` ou `jcr:title`). */
	title: string;
	/** Description déjà résolue par `#lib/seo` (`jcr:description`). */
	description: string;
	/** Code langue de la ressource courante (`fr`). */
	language: string;
	/**
	 * Nom du site, déjà résolu par `#lib/renderContext` pour `og:site_name`. Il
	 * descend en paramètre pour la même raison que `title` et `description` : la
	 * valeur est lue une seule fois par rendu, et le nœud `WebSite` ne peut pas
	 * diverger de la balise Open Graph qui nomme le même site.
	 */
	siteName: string;
}

/**
 * Lecture protégée d'un drapeau du mixin `sofmix:structuredDataOptions`, `false`
 * quand la page ne le porte pas. Le `isNodeType` est enveloppé par précaution :
 * le mixin peut manquer du runtime tant que le module n'a pas été redéployé
 * (même garde que pour les mixins externes dans `#lib/seo` et `#lib/openGraph`).
 */
const readPageFlag = (pageNode: JCRNodeWrapper | null, property: string): boolean => {
	if (!pageNode) return false;
	try {
		if (!pageNode.isNodeType(STRUCTURED_DATA_OPTIONS_MIXIN)) return false;
		return pageNode.hasProperty(property) && pageNode.getProperty(property).getBoolean();
	} catch {
		return false;
	}
};

/**
 * Vrai quand la note client est effectivement AFFICHÉE quelque part sur la page.
 *
 * Aucune garde sur le CONTENU de la page, délibérément : la note est GLOBALE au site,
 * et l'activer sur une page produit est un choix éditorial assumé — pas une assertion
 * sur ce produit. Ce qui satisfait partout l'exigence Google (« la note balisée doit
 * être visible »), c'est le sticker du pied de page : `mandatory autocreated` sous
 * `sofnt:footer`, il rend « N avis • X,X ★ » sur chaque page du site.
 *
 * Son interrupteur global est donc le SEUL état où plus aucune page n'affiche la note,
 * et le seul où baliser exposerait à une action manuelle.
 */
const ratingIsDisplayed = (site: JCRNodeWrapper | null): boolean => {
	const settings = site ? getGlobalSettingsNode(avisClientPath, site) : null;
	return !!settings && getAsBoolean(settings, "isGlobalActive");
};

/**
 * Greffe la note client sur le graphe déjà construit, si la page l'a demandée et si
 * elle est effectivement affichée.
 *
 * Opt-in strict, et lecture GATÉE par le drapeau : `getAverageRate` sort du JCR pour
 * interroger le service Avis Vérifiés. La déclencher sur toutes les pages pour jeter le
 * résultat aussitôt paierait un aller-retour par rendu sans aucun balisage en sortie.
 *
 * Fonction séparée plutôt qu'un bloc inline dans `buildStructuredDataGraph` : les trois
 * conditions imbriquées — drapeau, visibilité, résolution du nœud de config — y
 * ajoutaient une profondeur que le reste de l'assemblage, plat, n'a pas.
 *
 * `try` local, et non délégué à celui de `#lib/seoHead` : là-haut, une levée sur la
 * résolution d'un nœud de config emporterait Organization, WebSite, WebPage et tous les
 * contenus avec elle. On dégrade au bon niveau — la page perd sa note, pas son balisage.
 * `getGlobalSettingsNode` et `getChildNode` délèguent tous deux à `hasNode`/`getNode`,
 * qui lèvent une `RepositoryException`.
 */
const attachPageRating = (
	nodes: JsonLdNode[],
	pageNode: JCRNodeWrapper | null,
	site: JCRNodeWrapper | null,
	settingsNode: JCRNodeWrapper | null,
): void => {
	if (!readPageFlag(pageNode, "enableAggregateRating")) return;
	try {
		if (!ratingIsDisplayed(site)) return;
		const reviewConfig = site ? getChildNode(site, verifiedReviewConfigRelPath) : null;
		attachAggregateRating(
			nodes,
			buildAggregateRating(readAverageRating(reviewConfig), readRatingThresholds(settingsNode)),
		);
	} catch {
		// Pas de note : le graphe reste complet.
	}
};

/**
 * Construit les nœuds du `@graph`, dans l'ordre : entité de marque, entité de site,
 * pivot de page, navigation, puis contenus de la page.
 */
export const buildStructuredDataGraph = ({
	renderContext,
	pageNode,
	origin,
	canonical,
	breadcrumbItems,
	title,
	description,
	language,
	siteName,
}: StructuredDataInput): JsonLdNode[] => {
	// Un `@graph` ne s'ancre que sur des `@id` ABSOLUS. `resolvePageUrl` peut rendre
	// `""` (ses trois replis — vanity URL, URL de nœud, URL courante — peuvent tous
	// échouer) : on produirait alors des ancres relatives (`"@id": "#article"`), un
	// `mainEntityOfPage` vide et un `organizationId("")` valant `/#organization`,
	// c'est-à-dire un graphe invalide qui prétend décrire n'importe quel domaine.
	// `buildHeadMeta` applique déjà la même règle en ne rendant pas de
	// `<link rel="canonical">` vide — mieux vaut aucun balisage qu'un balisage faux.
	if (!canonical || !origin) return [];

	const site = (() => {
		try {
			return renderContext.getSite();
		} catch {
			return null;
		}
	})();

	// Résolu dans une const et non en argument inline : le même nœud porte l'entité de
	// marque ET les seuils de publication de la note, lus par deux fonctions distinctes.
	const settingsNode = site ? getGlobalSettingsNode(STRUCTURED_DATA_SETTINGS_NODE, site) : null;
	const settings = readOrganizationSettings(settingsNode, origin);

	const nodes: JsonLdNode[] = [];
	const push = (node: JsonLdNode | null) => {
		if (node) nodes.push(node);
	};

	// `publisher` / `provider` ne peuvent renvoyer qu'à un nœud RÉELLEMENT présent
	// dans ce document : Google ne résout un `@id` qu'à l'intérieur du même graphe.
	// Tant que le nœud de settings n'est pas publié en `live`, `buildOrganization`
	// rend `null` — un renvoi inconditionnel laisserait alors `publisher` pendant et
	// ferait rejeter l'`Article` entier (« Missing field publisher.name »), soit un
	// résultat pire que le balisage legacy remplacé.
	const organization = buildOrganization(settings, { origin });
	push(organization);
	const publisher = organization ? organizationRef(origin) : undefined;

	const webSite = buildWebSite({ origin, name: siteName, inLanguage: language, publisher });
	push(webSite);

	// Le fil d'Ariane est construit AVANT le `WebPage` — qui le référence — mais poussé
	// APRÈS lui : le pivot précède ce qu'il relie, dans le graphe comme à la lecture.
	const breadcrumbId = `${canonical}#breadcrumb`;
	const breadcrumb = buildBreadcrumbList(breadcrumbItems, { origin, canonical, id: breadcrumbId });

	push(
		buildWebPage({
			canonical,
			name: title,
			description,
			inLanguage: language,
			isPartOf: webSite ? webSiteRef(origin) : undefined,
			breadcrumb: breadcrumb ? { "@id": breadcrumbId } : undefined,
		}),
	);
	push(breadcrumb);

	if (!readPageFlag(pageNode, "disableArticleSchema")) {
		// Une seule actualité par page : le modèle éditorial veut qu'un `spnt:news`
		// SOIT la page (actualité, guide), et deux `Article` dans un même document se
		// concurrenceraient pour le même `mainEntityOfPage`. Les suivants, s'il y en
		// avait, sont donc ignorés délibérément.
		push(
			buildArticle(findPageContent(pageNode, NEWS_TYPE)[0], {
				origin,
				canonical,
				id: `${canonical}#article`,
				authorName: settings?.articleAuthorName ?? "",
				inLanguage: language,
				publisher,
			}),
		);
	}

	if (!readPageFlag(pageNode, "disableFaqSchema")) {
		push(
			buildFaqPage(findPageContent(pageNode, FAQ_TYPE), {
				id: `${canonical}#faq`,
				inLanguage: language,
			}),
		);
	}

	if (!readPageFlag(pageNode, "disableVideoSchema")) {
		for (const video of buildVideoObjects(findPageContent(pageNode, VIDEO_TYPE), {
			origin,
			fallbackDescription: description,
			inLanguage: language,
			publisher,
			id: (index) => `${canonical}#video-${index + 1}`,
		})) {
			push(video);
		}
	}

	push(
		buildLoanOrCredit(pageNode, {
			name: title,
			description,
			url: canonical,
			id: `${canonical}#loan`,
			provider: publisher,
		}),
	);

	// En dernier, sur le graphe complet : le nœud qui portera la note dépend de ce que la
	// page a réellement produit.
	attachPageRating(nodes, pageNode, site, settingsNode);

	return nodes;
};

/**
 * Sérialise le graphe pour injection dans un `<script type="application/ld+json">`.
 * Retourne `""` quand il n'y a rien à émettre — l'appelant ne rend alors pas la
 * balise plutôt que d'en produire une vide. Une `Organization` seule suffit à
 * justifier le bloc (c'est l'entité de marque) ; seul un graphe entièrement vide
 * est supprimé.
 *
 * `escapeForInlineScript` (`#lib/tracking`) remplace chaque chevron ouvrant par son
 * échappement Unicode, ce qui neutralise une balise de fermeture de script saisie
 * dans une réponse de FAQ ou une retranscription. La substitution est sûre ici :
 * `JSON.stringify` ne produit de chevron qu'à l'intérieur d'une chaîne, où la forme
 * échappée est un caractère JSON valide et se relit à l'identique.
 */
export const serializeJsonLd = (nodes: JsonLdNode[]): string => {
	if (nodes.length === 0) return "";
	return escapeForInlineScript(JSON.stringify({ "@context": JSON_LD_CONTEXT, "@graph": nodes }));
};
