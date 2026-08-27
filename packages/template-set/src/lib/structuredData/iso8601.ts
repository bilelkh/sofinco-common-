/**
 * Conversion d'une durée en secondes vers le format ISO 8601 attendu par
 * `VideoObject.duration` (`PT1H1M30S`, `PT3M`, `PT45S`).
 *
 * La saisie contributeur est en SECONDES (`durationSeconds` sur `sofnt:videoBlock`)
 * plutôt qu'en chaîne ISO libre : un champ texte laisse passer silencieusement les
 * `PT2:30` ou `2M30S`, que Google rejette sans que personne ne le voie. Un entier
 * ne peut pas être mal formé.
 */

/**
 * Retourne la durée au format `PT[#H][#M][#S]`, ou `""` quand la valeur est nulle,
 * négative, non finie ou non entière — l'appelant omet alors la propriété plutôt
 * que d'émettre une durée invalide.
 */
export const secondsToIsoDuration = (totalSeconds: number): string => {
	if (!Number.isFinite(totalSeconds)) return "";

	const total = Math.floor(totalSeconds);
	if (total <= 0) return "";

	const hours = Math.floor(total / 3600);
	const minutes = Math.floor((total % 3600) / 60);
	const seconds = total % 60;

	// Les composantes nulles sont omises : `PT3M` et non `PT0H3M0S`. Le cas
	// `total <= 0` étant déjà écarté, au moins une composante est non nulle.
	return `PT${hours ? `${hours}H` : ""}${minutes ? `${minutes}M` : ""}${
		seconds ? `${seconds}S` : ""
	}`;
};
