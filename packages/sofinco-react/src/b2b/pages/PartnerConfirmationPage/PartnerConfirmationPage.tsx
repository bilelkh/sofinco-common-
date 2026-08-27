import FormHero from "@b2b/features/FormHero/FormHero";
import { FootnoteText } from "@shared/footnotes";
import { ICONS } from "@shared/ui/svg";

import type { PartnerConfirmationPageProps } from "./partnerConfirmationPage.types";
import styles from "./partnerConfirmationPage.module.css";

const REASSURANCES = [
	{ icon: "refreshccw", label: "Réponse en 48h" },
	{ icon: "check", label: "Conseil dédié" },
	{ icon: "folder-check", label: "Votre demande est enregistrée" },
] as const;

const PartnerConfirmationPage = ({
	navbar,
	title = "Devenez Partenaire Sofinco",
	subtitle = "Proposez le financement Sofinco à vos clients. Plus de 15 000 entreprises l'ont déjà choisi.",
	confirmationTitle = "Demande envoyée",
	confirmationMessage = "Merci, nous avons bien reçu votre demande de partenariat.",
}: PartnerConfirmationPageProps) => (
	<div className={styles.page}>
		{navbar}
		<FormHero title={title} subtitle={subtitle}>
			<section className={styles.card} aria-labelledby="partner-confirmation-title">
				<div className={styles.visual} aria-hidden="true">
					<div className={styles.envelope}>
						<ICONS.mail />
					</div>
					<span className={styles.check}>
						<ICONS.check />
					</span>
				</div>
				<h2 className={styles.heading} id="partner-confirmation-title">
					<FootnoteText>{confirmationTitle}</FootnoteText>
				</h2>
				<p className={styles.message}>
					<FootnoteText>{confirmationMessage}</FootnoteText>
				</p>
				<ul className={styles.reassurances}>
					{REASSURANCES.map(({ icon, label }) => {
						const Icon = ICONS[icon];
						return (
							<li key={label}>
								<Icon />
								{/* Libellés de réassurance figés dans `REASSURANCES` ci-dessus : ils ne
								    viennent pas de Jahia et ne peuvent donc porter aucun renvoi. */}
								{/* eslint-disable-next-line sofinco/require-footnote-text */}
								<span>{label}</span>
							</li>
						);
					})}
				</ul>
			</section>
		</FormHero>
	</div>
);

export default PartnerConfirmationPage;
