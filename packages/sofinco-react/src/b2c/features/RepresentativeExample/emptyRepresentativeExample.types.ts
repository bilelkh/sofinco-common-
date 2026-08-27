import type { CtaProps } from "@shared/ui/Cta/Cta.type";

/**
 * Vue dégradée affichée quand l'exemple représentatif ne peut pas être calculé
 * (bridge OSGi `portal-common-sofinco` absent / exemple introuvable).
 *
 * Volontairement neutre : aucune donnée réglementée (TAEG, tableau, mentions
 * légales d'assurance) n'est rendue ici puisqu'elle ne peut pas être garantie
 * sans le bridge. On ne montre que des éléments éditoriaux + le montant
 * configuré, sans cadrer le bloc comme un « exemple représentatif ».
 */
export interface EmptyRepresentativeExampleProps {
	title: string;
	subtitle?: string;
	/** Libellé "Montant emprunté" déjà traduit. */
	amountLabel: string;
	/** Montant configuré déjà formaté en français (ex: "3 000 €"). */
	amount: string;
	cta?: CtaProps;
}
