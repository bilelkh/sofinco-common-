/** `line` : barre segmentée + compteur « n/N ». `number` : pastilles numérotées reliées. */
export type StepperVariant = "line" | "number";

/**
 * Rendu du compteur « n/N » de la variante `line`. `plain` (défaut) reprend la
 * maquette socle — texte nu. `badge` le pose sur une pastille pleine, tel que le
 * demande la maquette du site vitrine B2B.
 */
export type StepperCounterVariant = "plain" | "badge";

export type StepperProps = {
	variant?: StepperVariant;
	/**
	 * Variante `line` uniquement. Laissé à `plain` par défaut : la pastille est un
	 * habillage propre au B2B, l'imposer repeindrait tous les parcours existants.
	 */
	counterVariant?: StepperCounterVariant;
	/** Étape courante, indexée à partir de 1. Bornée à [1, totalSteps]. */
	activeStep?: number;
	/**
	 * Nombre total d'étapes. Défauts repris de la maquette : 6 en `line`, 4 en `number`.
	 * La maquette fige ces deux valeurs ; le composant les ouvre car un pas figé rendrait
	 * le composant inutilisable dès qu'un parcours compte un nombre d'étapes différent.
	 */
	totalSteps?: number;
	/** Variante `number` : libellé affiché au-dessus de la pastille active *uniquement*. */
	label?: string;
	/** Variante `line` : affiche le bouton retour dans la gouttière de gauche. */
	hasButton?: boolean;
	/** Handler du bouton retour. Sans lui le bouton reste rendu mais inerte. */
	onBack?: () => void;
	/** Nom accessible du bouton retour (le bouton n'a pas de libellé visible). */
	backLabel?: string;
	/** Nom accessible du composant. */
	ariaLabel?: string;
	className?: string;
};
