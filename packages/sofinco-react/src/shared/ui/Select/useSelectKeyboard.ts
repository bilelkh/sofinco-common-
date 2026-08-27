import { useRef } from "react";

import type { SelectOption } from "./Select.type";

/** Fenêtre de saisie de la recherche au clavier, alignée sur le `<select>` natif. */
export const TYPEAHEAD_RESET_MS = 500;

/** Première option sélectionnable à partir de `from`, dans la direction donnée. */
export function findEnabled(options: SelectOption[], from: number, direction: 1 | -1): number {
	for (let index = from; index >= 0 && index < options.length; index += direction) {
		if (!options[index].disabled) return index;
	}
	return -1;
}

/**
 * Cœur de la recherche au clavier, écrit en fonction pure : la seule mémoire
 * est le `buffer` reçu et renvoyé. C'est ce qui la rend testable sans rendu
 * React — le hook plus bas n'ajoute que la remise à zéro différée.
 *
 * Se comporte comme un `<select>` natif : les frappes rapprochées se cumulent
 * (« pr » → « Prêt personnel »), et la même lettre répétée fait défiler les
 * options qui en débutent (« p », « p » → la suivante).
 */
export function matchTypeahead(
	buffer: string,
	options: SelectOption[],
	key: string,
	fromIndex: number,
): { index: number; buffer: string } {
	// Même lettre répétée : on cherche l'occurrence *suivante* plutôt que de
	// rester bloqué sur la première, comme le fait le contrôle natif.
	const repeated = buffer.length === 1 && buffer === key;
	const nextBuffer = repeated ? key : buffer + key;

	const needle = nextBuffer.toLowerCase();
	// Départ après l'option courante pour une lettre répétée, sur elle sinon :
	// sans ça, « pr » sauterait la ligne que « p » venait de désigner.
	const offset = repeated ? 1 : 0;
	const count = options.length;
	// `fromIndex` vaut -1 quand rien n'est sélectionné : sans cette remise à
	// zéro, le modulo ramènerait le départ sur la *dernière* option et « c »
	// désignerait « Copain » plutôt que « Charlie ».
	const start = fromIndex < 0 ? 0 : fromIndex + offset;

	for (let step = 0; step < count; step++) {
		const index = (start + step) % count;
		const option = options[index];
		if (option.disabled) continue;
		if (option.label.toLowerCase().startsWith(needle)) {
			return { index, buffer: nextBuffer };
		}
	}

	return { index: -1, buffer: nextBuffer };
}

/**
 * Enveloppe `matchTypeahead` d'un tampon persistant et de sa remise à zéro
 * après {@link TYPEAHEAD_RESET_MS} d'inactivité.
 */
export function useTypeahead(options: SelectOption[]) {
	const bufferRef = useRef("");
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	return (key: string, fromIndex: number): number => {
		if (timerRef.current) clearTimeout(timerRef.current);
		timerRef.current = setTimeout(() => {
			bufferRef.current = "";
		}, TYPEAHEAD_RESET_MS);

		const { index, buffer } = matchTypeahead(bufferRef.current, options, key, fromIndex);
		bufferRef.current = buffer;
		return index;
	};
}
