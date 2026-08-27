import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { TitleProps, HeadingLevel } from "sofinco-react";
import { str } from "#lib/jcr";

const ALLOWED: ReadonlySet<HeadingLevel> = new Set<HeadingLevel>(["h1", "h2", "h3", "h4"]);

/**
 * Type guard — TypeScript narrowing propre, sans cast redondant.
 * `raw is HeadingLevel` fait remonter le type dans la branche `true`.
 */
function isHeadingLevel(raw: string): raw is HeadingLevel {
	return ALLOWED.has(raw as HeadingLevel);
}

/**
 * Garde-fou de typage : retourne la valeur si elle fait partie des niveaux
 * autorisés, sinon le fallback. Sécurise les imports de contenu historique
 * où une valeur inattendue aurait pu être enregistrée en JCR.
 */
function safeLevel(raw: string, fallback: HeadingLevel): HeadingLevel {
	return isHeadingLevel(raw) ? raw : fallback;
}

/**
 * Lit `titleLevel` (sémantique HTML) du mixin `sofmix:headingStyle`.
 * Defaults to "h2" — cohérent avec le `autocreated` du CND.
 */
export function readTitleLevel(node: JCRNodeWrapper, fallback: HeadingLevel = "h2"): HeadingLevel {
	return safeLevel(str(node, "titleLevel"), fallback);
}

/**
 * Lit `titleStyle` (apparence visuelle) du mixin `sofmix:headingStyle`.
 * Defaults to "h2" — cohérent avec le `autocreated` du CND.
 */
export function readTitleStyle(node: JCRNodeWrapper, fallback: HeadingLevel = "h2"): HeadingLevel {
	return safeLevel(str(node, "titleStyle"), fallback);
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
	fallback: HeadingLevel = "h2",
): TitleProps | undefined {
	if (!title) return undefined;
	return {
		children: title,
		as: readTitleLevel(node, fallback),
		visualStyle: readTitleStyle(node, fallback),
	};
}
