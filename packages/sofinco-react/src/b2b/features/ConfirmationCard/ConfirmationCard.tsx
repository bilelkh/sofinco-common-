import { useId } from "react";
import clsx from "clsx";

import { FootnoteText } from "@shared/footnotes";
import { ICONS } from "@shared/ui/svg";

import type { ConfirmationCardProps, ConfirmationReassurance } from "./confirmationCard.types";
import styles from "./confirmationCard.module.css";

/**
 * Puces du parcours partenaire — la seule maquette existante, d'où leur place ici
 * plutôt que dans l'appelant : une page de confirmation qui ne dirait rien de plus
 * n'aurait aucune configuration à écrire.
 */
export const DEFAULT_REASSURANCES: readonly ConfirmationReassurance[] = [
	{ icon: "refreshccw", label: "Réponse en 48h" },
	{ icon: "check", label: "Conseil dédié" },
	{ icon: "folder-check", label: "Votre demande est enregistrée" },
] as const;

/**
 * Carte de confirmation d'envoi de formulaire B2B — l'accusé de réception affiché
 * à la place du formulaire une fois la demande partie.
 *
 * Le visuel (enveloppe, pastille de validation, halos) est purement décoratif : il
 * est retiré de l'arbre d'accessibilité, le texte de la carte portant à lui seul
 * l'information. La carte se nomme par son titre (`aria-labelledby`), et non par un
 * `aria-label` en dur : le titre vient de Jahia, il doit rester la seule source.
 *
 * Le composant ne connaît pas son placement : c'est `FormHero` qui le fait chevaucher
 * le bandeau, exactement comme il le fait du formulaire.
 */
export const ConfirmationCard = ({
	title,
	message,
	reassurances = DEFAULT_REASSURANCES,
	className,
}: ConfirmationCardProps) => {
	const titleId = useId();

	return (
		<section className={clsx(styles["confirmation-card"], className)} aria-labelledby={titleId}>
			<div className={styles["confirmation-card__visual"]} aria-hidden="true">
				<div className={styles["confirmation-card__envelope"]}>
					<ICONS.mail />
				</div>
				<span className={styles["confirmation-card__check"]}>
					<ICONS.check />
				</span>
			</div>
			<h2 className={styles["confirmation-card__title"]} id={titleId}>
				<FootnoteText>{title}</FootnoteText>
			</h2>
			{message && (
				<p className={styles["confirmation-card__message"]}>
					<FootnoteText>{message}</FootnoteText>
				</p>
			)}
			{reassurances.length > 0 && (
				<ul className={styles["confirmation-card__reassurances"]}>
					{reassurances.map(({ icon, label }) => {
						const Icon = ICONS[icon];
						return (
							<li key={label}>
								<Icon />
								<span>
									<FootnoteText>{label}</FootnoteText>
								</span>
							</li>
						);
					})}
				</ul>
			)}
		</section>
	);
};

export default ConfirmationCard;
