import { useEffect, useRef, useState } from "react";

import type { AutocompleteOption, AutocompleteSearch, AutocompleteStatus } from "./Autocomplete.type";

/**
 * Référence stable : `setOptions(EMPTY)` deux fois de suite est un no-op pour
 * React, là où un `[]` littéral serait un nouvel objet à chaque passage et
 * relancerait un rendu pour rien.
 */
const EMPTY: AutocompleteOption[] = [];

interface UseAutocompleteSearchOptions {
	/** Saisie brute du champ. Le découpage est fait ici, pas par l'appelant. */
	query: string;
	onSearch: AutocompleteSearch;
	minLength: number;
	debounceMs: number;
	/**
	 * Suspend la recherche sans démonter le hook — panneau fermé, ou saisie qui
	 * n'est que le libellé de l'option déjà retenue.
	 */
	enabled: boolean;
}

export interface AutocompleteSearchState {
	options: AutocompleteOption[];
	status: AutocompleteStatus;
}

/**
 * Recherche différée, annulable, à l'abri des réponses hors d'ordre.
 *
 * Trois protections se superposent, et aucune n'est redondante :
 * - le `clearTimeout` annule l'appel qui n'est pas encore parti ;
 * - l'`abort` coupe celui qui est en vol, pour ne pas laisser traîner une
 *   requête dont personne n'attend plus la réponse ;
 * - le drapeau `ignore` protège l'état du composant, car une promesse déjà
 *   résolue au moment de l'annulation appellera quand même son `then`.
 */
export function useAutocompleteSearch({
	query,
	onSearch,
	minLength,
	debounceMs,
	enabled,
}: UseAutocompleteSearchOptions): AutocompleteSearchState {
	const [options, setOptions] = useState<AutocompleteOption[]>(EMPTY);
	const [status, setStatus] = useState<AutocompleteStatus>("idle");

	/*
	 * `onSearch` est lu par référence et tenu hors des dépendances : les
	 * appelants passent une lambda écrite dans le JSX, donc une fonction neuve à
	 * chaque rendu. La mettre en dépendance relancerait une recherche à chaque
	 * rendu — et chaque recherche, en posant un état, provoque un rendu.
	 */
	const onSearchRef = useRef(onSearch);
	useEffect(() => {
		onSearchRef.current = onSearch;
	});

	const trimmed = query.trim();
	const active = enabled && trimmed.length >= minLength;

	/*
	 * Tout ce bloc pose l'état DEPUIS un effet, et c'est la seule forme possible : le
	 * résultat vient d'un appel réseau débouncé, donc d'un événement extérieur au rendu.
	 * `ignore` et l'`AbortController` garantissent qu'une réponse tardive n'écrase pas
	 * une recherche plus récente — la vraie question que pose la règle.
	 */
	/* eslint-disable @eslint-react/hooks-extra/no-direct-set-state-in-use-effect */
	useEffect(() => {
		if (!active) {
			setOptions(EMPTY);
			setStatus("idle");
			return;
		}

		let ignore = false;
		const controller = new AbortController();
		setStatus("loading");

		const timer = setTimeout(() => {
			onSearchRef.current(trimmed, controller.signal).then(
				(found) => {
					if (ignore) return;
					setOptions(found);
					setStatus("ready");
				},
				() => {
					// Une annulation n'est pas une panne : le panneau doit rester sur
					// « recherche en cours », l'appel suivant est déjà programmé.
					if (ignore || controller.signal.aborted) return;
					setOptions(EMPTY);
					setStatus("error");
				},
			);
		}, debounceMs);

		return () => {
			ignore = true;
			controller.abort();
			clearTimeout(timer);
		};
	}, [active, trimmed, debounceMs]);
	/* eslint-enable @eslint-react/hooks-extra/no-direct-set-state-in-use-effect */

	return { options, status };
}
