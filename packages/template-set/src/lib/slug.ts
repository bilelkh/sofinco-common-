import { normalizeFootnoteRef } from "./footnotes";

/**
 * Slugifies a free-text value into a link-stable HTML `id` fragment.
 *
 * Bas niveau : ne décide PAS s'il y a une ancre à poser. Pour l'identifiant d'une mention
 * légale, passer par {@link anchorIdOf}, qui applique d'abord la normalisation partagée.
 */
export const slugify = (value: string): string =>
	value
		.toLowerCase()
		.trim()
		.replace(/[^\w]+/g, "-")
		.replace(/^-|-$/g, "");

/**
 * Identifiant d'ancre d'une mention légale, à partir de la valeur brute du champ `anchor`.
 *
 * PORTE UNIQUE — et c'est tout l'intérêt. Trois fonctions décidaient auparavant, chacune de
 * son côté, ce que vaut une ancre : `footnoteNumber` (y a-t-il une note ?), `footnoteKey`
 * (quel id d'atterrissage ?) et `slugify` (quel id sur le conteneur ?). Les deux premières
 * ont été réconciliées sur {@link normalizeFootnoteRef} ; la troisième ne l'était pas, et
 * elle divergeait exactement sur les entrées que la campagne de tests dénonce :
 *
 * | `anchor`    | note rendue | ancien `slugify` | `anchorIdOf` |
 * | ----------- | ----------- | ---------------- | ------------ |
 * | `&nbsp;`    | aucune      | `"nbsp"`         | `""`         |
 * | `<b></b>`   | aucune      | `"b-b"`          | `""`         |
 *
 * Un copier-coller Word laissant un `&nbsp;` dans le champ produisait donc un
 * `<div id="nbsp">` : un id fantôme dans le DOM, sans exposant ni note, et une clé React
 * tirée de la même valeur. En normalisant D'ABORD, une ancre qui ne désigne aucune note ne
 * produit plus aucun id — ce que le rendu fait déjà pour l'exposant.
 *
 * @returns le fragment d'id, ou `""` quand l'ancre ne désigne aucune note.
 */
export const anchorIdOf = (anchor: string): string => slugify(normalizeFootnoteRef(anchor));
