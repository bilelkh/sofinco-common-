/**
 * Masques de saisie — préréglages du DS au-dessus de `@react-input/mask`.
 *
 * Le regroupement, le placement du caret, le retour arrière sur un séparateur et
 * le collage sont l'affaire de la bibliothèque : elle s'accroche à l'`<input>`
 * par un `ref` (`useMask`) sans en prendre la valeur ni le rendu, ce qui la rend
 * compatible avec la coquille `Field` du DS. Ce module n'apporte que le
 * vocabulaire métier — un nom de masque plutôt qu'un gabarit à recopier sur
 * chaque champ.
 *
 * ⚠️ La valeur applicative ne porte JAMAIS les séparateurs : ils n'existent qu'à
 * l'écran. C'est ce qui laisse les règles de validation (`/^\d{14}$/`) et les
 * services aval (Salesforce, Jahia) travailler sur des chiffres seuls.
 */
import { format, unformat } from "@react-input/mask";

/** Gabarit + alphabet, dans le vocabulaire de `@react-input/mask`. */
export interface MaskConfig {
	/** Gabarit : chaque clé de `replacement` est un emplacement, le reste est littéral. */
	mask: string;
	/** Caractères de remplacement et expression à laquelle la frappe doit répondre. */
	replacement: Record<string, RegExp>;
}

/** Un emplacement de chiffre — le seul alphabet dont le DS ait besoin à ce jour. */
const DIGIT: Record<string, RegExp> = { _: /\d/ };

export const MASKS = {
	/** Téléphone français — 10 chiffres deux par deux : `06 12 34 56 78`. */
	phone: { mask: "__ __ __ __ __", replacement: DIGIT },
	/** Siret — 14 chiffres en 3-3-3-5 : `324 767 899 90963`. */
	siret: { mask: "___ ___ ___ _____", replacement: DIGIT },
} satisfies Record<string, MaskConfig>;

export type MaskName = keyof typeof MASKS;

/** Résout un préréglage ; un gabarit sur mesure est rendu tel quel. */
export const resolveMask = (mask: MaskName | MaskConfig): MaskConfig =>
	typeof mask === "string" ? MASKS[mask] : mask;

/**
 * Valeur NUE → texte groupé. Tolérant à l'entrée : `0612345678` comme
 * `06.12.34.56.78` rendent `06 12 34 56 78`, les caractères hors alphabet étant
 * ignorés. C'est la fonction à utiliser pour AFFICHER une valeur applicative.
 */
export const applyMask = (value: string, mask: MaskName | MaskConfig): string =>
	format(value, resolveMask(mask));

/**
 * Texte groupé → valeur nue.
 *
 * ⚠️ L'entrée doit **déjà être masquée** : `unformat` retire les caractères aux
 * positions littérales du gabarit, sans vérifier que c'en sont. Lui donner une
 * valeur nue mange des chiffres en silence — `unmask("0612345678", "phone")`
 * rend `0623568`. En pratique elle ne s'applique qu'à la valeur du DOM, que la
 * bibliothèque vient de formater.
 */
export const unmask = (maskedValue: string, mask: MaskName | MaskConfig): string =>
	unformat(maskedValue, resolveMask(mask));

/** Longueur du texte masqué, séparateurs compris. */
export const maskedLength = (mask: MaskName | MaskConfig): number => resolveMask(mask).mask.length;
