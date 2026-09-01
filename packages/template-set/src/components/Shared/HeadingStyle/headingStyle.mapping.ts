import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { TitleProps, HeadingLevel, TitleTag } from "sofinco-react";
import { findAncestor, str } from "#lib/jcr";

/**
 * DEUX ensembles, pas un — ils ne décrivent pas la même chose.
 *
 * `LEVELS` est la liste des BALISES contribuables (`titleLevel` du CND) : tous les niveaux de
 * titre, plus `p` pour le cas « texte qui ressemble à un titre sans en être un ».
 *
 * `STYLES` est la liste des APPARENCES réellement fournies par le design system (`titleStyle`).
 * Elle s'arrête à h4 parce que `Title.module.css` s'y arrête : y admettre `h5` produirait une
 * classe inexistante. Les deux doivent rester alignés sur les choicelists du CND.
 */
const LEVELS: ReadonlySet<TitleTag> = new Set<TitleTag>(["h1", "h2", "h3", "h4", "h5", "h6", "p"]);
const STYLES: ReadonlySet<HeadingLevel> = new Set<HeadingLevel>(["h1", "h2", "h3", "h4"]);

/**
 * Type guards — TypeScript narrowing propre, sans cast redondant.
 * `raw is TitleTag` fait remonter le type dans la branche `true`.
 */
function isTitleTag(raw: string): raw is TitleTag {
	return LEVELS.has(raw as TitleTag);
}

function isHeadingLevel(raw: string): raw is HeadingLevel {
	return STYLES.has(raw as HeadingLevel);
}

/**
 * Garde-fou de typage : retourne la valeur si elle fait partie des valeurs
 * autorisées, sinon le fallback. Sécurise les imports de contenu historique
 * où une valeur inattendue aurait pu être enregistrée en JCR — et, désormais,
 * les nœuds dont le `titleStyle` porterait un `h5` hérité d'une choicelist élargie.
 */
function safeTag(raw: string, fallback: TitleTag): TitleTag {
	return isTitleTag(raw) ? raw : fallback;
}

function safeStyle(raw: string, fallback: HeadingLevel): HeadingLevel {
	return isHeadingLevel(raw) ? raw : fallback;
}

/**
 * Lit `titleLevel` (sémantique HTML) du mixin `sofmix:headingStyle`.
 * Defaults to "h2" — cohérent avec le `autocreated` du CND.
 */
export function readTitleLevel(node: JCRNodeWrapper, fallback: TitleTag = "h2"): TitleTag {
	return readTitleTag(node, "titleLevel", fallback);
}

/**
 * Lit une balise de titre depuis une propriété AUTRE que `titleLevel`.
 *
 * `sofmix:headingStyle` ne porte qu'un seul couple niveau/style, forcément consommé par le
 * titre principal. Un composant qui expose un second texte titrable — le sur-titre du
 * `sofnt:productHero`, par exemple — déclare sa propre propriété et la lit ici, en réutilisant
 * le même garde-fou plutôt qu'un cast local.
 */
export function readTitleTag(
	node: JCRNodeWrapper,
	property: string,
	fallback: TitleTag = "h2",
): TitleTag {
	return safeTag(str(node, property), fallback);
}

/**
 * Lit `titleStyle` (apparence visuelle) du mixin `sofmix:headingStyle`.
 * Defaults to "h2" — cohérent avec le `autocreated` du CND.
 */
export function readTitleStyle(node: JCRNodeWrapper, fallback: HeadingLevel = "h2"): HeadingLevel {
	return safeStyle(str(node, "titleStyle"), fallback);
}

/**
 * Niveau des titres d'ITEMS, lu sur le CONTENEUR et non sur l'item.
 *
 * Des items freres sont des pairs dans le plan de la page : leur niveau se decide une
 * fois, sur le bloc qui les porte. Voir le commentaire de `sofmix:itemHeadingLevel`
 * dans le CND partage.
 *
 * `findAncestor` N'EST PAS UN SIMPLE `getParent()` : il declare une dependance de cache
 * sur l'ancetre trouve. Sans elle, changer le niveau sur le conteneur ne purgerait pas
 * les fragments des items, qui garderaient l'ancienne balise jusqu'a leur propre
 * expiration — un ecart entre ce que le contributeur choisit et ce que la page rend.
 *
 * Fonctionne aussi bien depuis le mapping du conteneur que depuis la vue d'edition d'un
 * item isole, ou seul l'item est connu.
 *
 * @param node        l'ITEM (ou le conteneur : la remontee l'inclut)
 * @param parentType  type du conteneur portant `sofmix:itemHeadingLevel`
 * @param fallback    balise d'origine du composant, appliquee si rien n'est choisi
 */
export function readItemsTitleLevel(
	node: JCRNodeWrapper,
	parentType: string,
	fallback: TitleTag,
): TitleTag {
	const container = findAncestor(node, parentType);
	return container ? readTitleTag(container, "itemsTitleLevel", fallback) : fallback;
}

/**
 * Construit le prop `title` (`TitleProps` du DS sofinco-react) à partir d'un
 * node porteur du mixin `sofmix:headingStyle` et du texte de titre.
 *
 * @returns `undefined` quand `title` est vide — le composant React omet alors
 *          l'en-tête entier (au lieu de rendre un `<h2></h2>` vide).
 */
export function buildTitleProps(
	node: JCRNodeWrapper,
	title: string,
	fallback: TitleTag = "h2",
): TitleProps | undefined {
	if (!title) return undefined;
	return {
		children: title,
		as: readTitleLevel(node, fallback),
		// Le repli d'apparence ne peut pas être `fallback` : celui-ci porte une BALISE, qui vaut
		// parfois `p`, `h5` ou `h6` — trois valeurs qui ne désignent aucune échelle typographique.
		visualStyle: readTitleStyle(node, isHeadingLevel(fallback) ? fallback : "h2"),
	};
}
