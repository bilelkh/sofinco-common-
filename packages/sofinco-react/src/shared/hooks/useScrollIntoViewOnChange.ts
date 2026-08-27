import { useEffect, useRef, type RefObject } from "react";

/**
 * Amène l'élément référencé au centre du viewport à chaque fois que `key` change pour une
 * valeur non nulle. Ne fait rien tant que `key` vaut `null`/`undefined`.
 *
 * Le premier passage ne défile JAMAIS : au montage, la valeur observée est soit déjà
 * renseignée — et tirer la page à soi au chargement serait intrusif — soit encore nulle, et
 * il n'y a alors rien à viser. Le drapeau est consommé même quand le garde ci-dessous sort
 * en avance, sans quoi une valeur démarrant à `null` verrait sa première vraie valeur prise
 * pour l'initiale et le défilement attendu serait perdu.
 *
 * Le défilement est différé d'une frame : au moment où l'effet s'exécute, React a bien
 * modifié le DOM mais le navigateur n'a pas encore recalculé la mise en page, et
 * `scrollIntoView` viserait alors une position périmée. La frame est annulée au nettoyage —
 * sans cela, un démontage entre la programmation et son exécution laissait la callback
 * tenter un défilement sur un élément détaché.
 */
export const useScrollIntoViewOnChange = (
	ref: RefObject<HTMLElement | null>,
	key: string | number | object | null | undefined,
) => {
	const isInitialRunRef = useRef(true);

	useEffect(() => {
		const isInitialRun = isInitialRunRef.current;
		isInitialRunRef.current = false;

		if (key === null || key === undefined) return;
		if (isInitialRun) return;

		const frame = requestAnimationFrame(() => {
			ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
		});

		return () => cancelAnimationFrame(frame);
	}, [ref, key]);
};
