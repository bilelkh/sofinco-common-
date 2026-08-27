import { useId } from "react";
import clsx from "clsx";

import type { FieldOwnProps } from "./Field.type";

type UseFieldOptions = Pick<FieldOwnProps, "hint" | "errorMessage" | "invalid"> & {
	/** `id` posé par le consommateur ; à défaut, un `useId` est dérivé. */
	id?: string;
	/** `aria-describedby` déjà fourni par le consommateur, à préserver. */
	describedBy?: string;
};

export interface FieldA11y {
	fieldId: string;
	/** `id` du `<label>`, pour les popups qui doivent s'y référer (`aria-labelledby`). */
	labelId: string;
	hintId: string;
	errorId: string;
	hasError: boolean;
	showHint: boolean;
	/** `undefined` plutôt que chaîne vide : l'attribut ne doit pas être émis à vide. */
	ariaDescribedBy: string | undefined;
}

/**
 * Câblage d'accessibilité partagé par les trois contrôles : identifiants liés
 * (`<label for>`, aide, erreur) et arbitrage aide / erreur.
 *
 * Extrait dans un hook parce que c'est la partie qu'aucun test visuel ne couvre
 * et que la moindre divergence entre `TextField`, `Textarea` et `Select` s'y
 * verrait le moins.
 */
export function useField({
	id,
	hint,
	errorMessage,
	invalid,
	describedBy,
}: UseFieldOptions): FieldA11y {
	const generatedId = useId();
	const fieldId = id ?? `field-${generatedId}`;
	const labelId = `${fieldId}-label`;
	const hintId = `${fieldId}-hint`;
	const errorId = `${fieldId}-error`;

	const hasError = Boolean(invalid) || Boolean(errorMessage);
	// L'aide cède la place au message d'erreur : deux textes concurrents sous le
	// même champ se lisent mal, et `aria-describedby` les annoncerait à la suite.
	const showHint = Boolean(hint) && !hasError;

	return {
		fieldId,
		labelId,
		hintId,
		errorId,
		hasError,
		showHint,
		// `invalid` sans message ne décrit rien : pointer sur `errorId` renverrait
		// alors vers un nœud absent du DOM.
		ariaDescribedBy:
			clsx(describedBy, showHint && hintId, errorMessage && errorId) || undefined,
	};
}
