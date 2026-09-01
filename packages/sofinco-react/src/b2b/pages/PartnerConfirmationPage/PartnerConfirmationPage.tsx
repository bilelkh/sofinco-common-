import ConfirmationCard from "@b2b/features/ConfirmationCard/ConfirmationCard";
import FormHero from "@b2b/features/FormHero/FormHero";

import type { PartnerConfirmationPageProps } from "./partnerConfirmationPage.types";
import styles from "./partnerConfirmationPage.module.css";

/**
 * Page d'accusé de réception du parcours partenaire : le même bandeau que la page
 * formulaire, où la carte de confirmation prend la place du formulaire. Elle n'est
 * qu'un assemblage — le visuel et les puces de réassurance appartiennent à
 * `ConfirmationCard`, qui sert aussi les autres formulaires B2B.
 */
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
			<ConfirmationCard title={confirmationTitle} message={confirmationMessage} />
		</FormHero>
	</div>
);

export default PartnerConfirmationPage;
