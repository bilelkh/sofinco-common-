import type { ReactNode } from "react";

import type { FieldOwnProps } from "@shared/ui/Field";
import type { SelectOption } from "@shared/ui/Select/Select.type";
import type { IconKey } from "@shared/ui/svg";

/**
 * Option du panneau. Étend `SelectOption` — même forme, donc mêmes helpers
 * clavier et même rendu de ligne que `Select`, qui restent ainsi une seule
 * implémentation à faire évoluer.
 */
export interface AutocompleteOption extends SelectOption {
	/**
	 * Données de la source conservées telles quelles et rendues à
	 * `onValueChange`. C'est la porte de sortie quand `value` ne suffit pas à
	 * identifier le choix : un code postal désigne jusqu'à 14 communes, la
	 * commune retenue voyage donc ici.
	 */
	meta?: Record<string, string>;
}

/** État de la recherche en cours, tel que le panneau le rend. */
export type AutocompleteStatus = "idle" | "loading" | "ready" | "error";

/**
 * Recherche asynchrone. Reçoit la saisie déjà découpée (`trim`) et un signal
 * d'annulation : chaque nouvelle frappe interrompt la requête précédente, dont
 * la réponse n'a plus d'intérêt.
 */
export type AutocompleteSearch = (
	query: string,
	signal: AbortSignal,
) => Promise<AutocompleteOption[]>;

/** Textes des lignes d'état du panneau. Tous surchargeables, tous en français. */
export interface AutocompleteLabels {
	/** Recherche en cours. Défaut « Recherche en cours… ». */
	loading?: string;
	/** Aucune correspondance. Défaut « Aucun résultat ». */
	empty?: string;
	/** Recherche en échec (réseau, API). Défaut « La recherche est indisponible. » */
	error?: string;
	/**
	 * Saisie trop courte. `{n}` est remplacé par `minLength`.
	 * Défaut « Saisissez au moins {n} caractères. »
	 */
	minLength?: string;
	/** Nom accessible du bouton d'effacement. Défaut « Effacer le champ ». */
	clear?: string;
}

export interface AutocompleteProps extends FieldOwnProps {
	/**
	 * Source des options. Sans elle le composant n'est qu'un champ texte : c'est
	 * la recherche qui fait l'autocomplétion, il n'y a pas de liste locale.
	 */
	onSearch: AutocompleteSearch;
	/**
	 * Valeur retenue — celle qui part au serveur, pas celle qui s'affiche. Le
	 * champ montre le `label` de l'option choisie. Contrôlé : à appairer avec
	 * `onValueChange`.
	 */
	value?: string;
	/**
	 * Notifié à chaque choix, avec l'option complète : c'est par elle que
	 * transite `meta`. Une valeur vide (effacement, saisie abandonnée) est
	 * remontée avec `undefined` en second argument.
	 */
	onValueChange?: (value: string, option?: AutocompleteOption) => void;
	/**
	 * Texte affiché au premier rendu, quand `value` est déjà posée. Sans lui le
	 * champ démarrerait vide devant une valeur pourtant présente : le composant
	 * ne sait pas retrouver le libellé d'une valeur qu'il n'a pas lui-même
	 * choisie — il faudrait pour cela relancer une recherche à l'ouverture.
	 */
	defaultLabel?: string;
	/** Nombre de caractères avant le déclenchement de la recherche. Défaut 1. */
	minLength?: number;
	/**
	 * Attente avant l'appel, en ms. Défaut 250 — aligné sur la recherche du menu.
	 * Une frappe pendant ce délai annule l'appel qui n'est pas encore parti.
	 */
	debounceMs?: number;
	/**
	 * Icône décorative en tête de champ. Aucune par défaut : le champ se présente
	 * comme un `TextField` nu, la liste n'apparaissant qu'à la saisie.
	 */
	icon?: IconKey;
	/** Bouton d'effacement dès que le champ porte une valeur. Défaut `true`. */
	clearable?: boolean;
	labels?: AutocompleteLabels;
	/**
	 * `name` d'un champ caché portant la valeur dans une soumission HTML. La
	 * recherche exige JavaScript : contrairement à `Select`, ce miroir ne rend
	 * pas le champ utilisable sans lui, il ne fait que le rendre soumettable.
	 */
	name?: string;
	placeholder?: string;
	disabled?: boolean;
	required?: boolean;
	readOnly?: boolean;
	/** Champ `id`, et cible du `<label for>`. Dérivé de `useId` à défaut. */
	id?: string;
	/** Ids additionnels ajoutés à l'`aria-describedby` du champ. */
	"aria-describedby"?: string;
	/** Sortie de champ — après réalignement du texte sur l'option retenue. */
	onBlur?: () => void;
	/** Notifié à l'ouverture et à la fermeture du panneau. */
	onOpenChange?: (open: boolean) => void;
	/** Contenu libre rendu en pied de panneau (mention de source, lien d'aide…). */
	panelFooter?: ReactNode;
}
