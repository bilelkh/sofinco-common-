import type { TitleTag } from "sofinco-react";

/**
 * Niveaux acceptés par les choicelists LEGACY du maillage SEO.
 *
 * Ces types de nœuds (`spnt:seoLinksBlock`, `spnt:seoLinksSubBlock`) viennent de
 * `portal-common-sofinco`, pas de ce dépôt : leurs choicelists ne sont pas les nôtres et
 * s'arrêtent à h5 pour le bloc, h6 pour la section. On ne les élargit donc pas ici — on se
 * contente de valider ce qu'elles peuvent réellement contenir.
 */
const SEO_LEVELS: ReadonlySet<string> = new Set(["p", "h2", "h3", "h4", "h5", "h6"]);

/**
 * Traduit une valeur de niveau legacy en balise pour `<Title>`.
 *
 * La valeur vide est un choix VALIDE dans ces choicelists (`< '','p','h2',…`) : elle signifie
 * « pas de niveau imposé ». Le legacy la rendait alors en `<p>` ; ici on retombe sur le niveau
 * que le composant codait en dur jusqu'à présent, pour ne rien changer aux blocs déjà publiés.
 *
 * @param raw      valeur brute lue en JCR (`blockTitleLevel` ou `subBlockLevel`)
 * @param fallback niveau appliqué quand rien n'est choisi — l'ancien comportement en dur
 */
export function readSeoLevel(raw: string, fallback: TitleTag): TitleTag {
	return SEO_LEVELS.has(raw) ? (raw as TitleTag) : fallback;
}
