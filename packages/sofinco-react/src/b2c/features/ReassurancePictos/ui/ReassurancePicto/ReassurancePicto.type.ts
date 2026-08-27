export interface ReassurancePictosItem {
	/** Identifiant stable pour la key React (côté Jahia = UUID JCR).
	 * Obligatoire pour éviter le fallback `key={index}` — casse le reorder
	 * `orderable` (drag-drop items en jContent) et re-fetch les images à chaque render. */
	id: string | number;
	src: string;
	label: string;
}

/**
 * Props du sous-composant `<ReassurancePicto>` — `Pick` sur l'item pour ne
 * garder QUE {src, label}. Le champ `id` reste géré par le parent
 * pour la key React.
 */
export type ReassurancePictoProps = Pick<ReassurancePictosItem, "src" | "label">;
