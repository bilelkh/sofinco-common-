/**
 * Lecture et rendu des montants portés par les libellés de catégorie du ChatBot.
 *
 * Sorti du composant parce que ce sont des fonctions de chaîne pures : isolées, elles se
 * testent sans monter le moindre arbre React — et les cas limites (libellé sans nombre,
 * intervalle, séparateurs) deviennent explicites plutôt que devinés.
 */

/**
 * Extrait un montant d'un libellé de feuille (« 5 000 € » → 5000, « Entre 10 000 € et
 * 20 000 € » → 10000). Retient la PREMIÈRE suite de chiffres et d'espaces : sur un
 * intervalle, c'est la borne basse. Renvoie `undefined` en l'absence de nombre exploitable.
 */
export function parseAmountFromLabel(label: string): number | undefined {
	const match = label.match(/[\d][\d\s]*/);
	if (!match) return undefined;

	const digits = match[0].replace(/\D/g, "");
	if (!digits) return undefined;

	const amount = Number(digits);
	return Number.isFinite(amount) && amount > 0 ? amount : undefined;
}

/** Formate un montant en euros à la française (5000 → « 5 000 € »). */
export function formatAmountEuro(amount: number): string {
	return `${amount.toLocaleString("fr-FR")} €`;
}
